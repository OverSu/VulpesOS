#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Verify a Sargo system archive and prepare fresh local installation files.

This tool never connects to a phone. The result is a userspace image and a new
data image, not a flashable ROM. A device-specific boot/recovery qualification
is still required. Get the manifest checksum through a trusted release channel.
"""
import argparse
import hashlib
import json
import lzma
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from persistent_state import digest, validate_manifest

CHUNK = 1024 * 1024
TOOLS = Path(__file__).resolve().parent


def sha256(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-f0-9]{64}', value):
        raise ValueError('Expected a SHA256 checksum')
    return value


def checked_manifest(path, expected):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > CHUNK:
        raise ValueError('Expected a regular package manifest smaller than 1 MiB')
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != sha256(expected):
        raise ValueError('Package manifest checksum mismatch')
    package = json.loads(data)
    if package.get('device') != 'sargo':
        raise ValueError('Only Sargo system packages are supported')
    name = package.get('systemImage', '')
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*\.ext4\.xz', name):
        raise ValueError('Archive must be a plain .ext4.xz filename')
    if not isinstance(package.get('version'), str) or not package['version'].strip():
        raise ValueError('Missing package version')
    for key in ('archiveSha256', 'systemImageSha256'):
        sha256(package.get(key))
    for key, maximum in (('archiveBytes', 2 * 1024**3), ('uncompressedBytes', 8 * 1024**3)):
        size = package.get(key)
        if type(size) is not int or not 0 < size <= maximum:
            raise ValueError('Invalid '+key)
    if package['uncompressedBytes'] % 4096:
        raise ValueError('System image size must be aligned to 4096 bytes')
    for key in ('filesystemCheckPassed', 'compressionCheckPassed'):
        if package.get(key) is not True:
            raise ValueError('Package has not passed '+key)
    return package


def checked_archive(folder, package):
    archive = Path(folder)/package['systemImage']
    if archive.is_symlink() or not archive.is_file():
        raise ValueError('Expected a regular archive beside the manifest')
    if archive.stat().st_size != package['archiveBytes'] or digest(archive) != package['archiveSha256']:
        raise ValueError('System archive checksum or size mismatch')
    return archive


def unpack(archive, image, package):
    """Bound both memory and output; reject trailing data and truncated streams."""
    decoder = lzma.LZMADecompressor(format=lzma.FORMAT_XZ, memlimit=128 * CHUNK)
    compressed = hashlib.sha256()
    expanded = hashlib.sha256()
    total = count = 0
    created = False
    try:
        with Path(archive).open('rb') as source, Path(image).open('xb') as target:
            created = True
            while chunk := source.read(CHUNK):
                if decoder.eof:
                    raise ValueError('Trailing data after XZ stream')
                compressed.update(chunk)
                count += len(chunk)
                if count > package['archiveBytes']:
                    raise ValueError('Archive exceeds declared size')
                while True:
                    block = decoder.decompress(chunk, max_length=CHUNK)
                    chunk = b''
                    total += len(block)
                    if total > package['uncompressedBytes']:
                        raise ValueError('System image exceeds declared size')
                    expanded.update(block)
                    target.write(block)
                    if decoder.eof or decoder.needs_input:
                        break
                if decoder.unused_data:
                    raise ValueError('Trailing data after XZ stream')
            if not decoder.eof:
                raise ValueError('Truncated XZ stream')
            if (count != package['archiveBytes'] or total != package['uncompressedBytes']
                    or compressed.hexdigest() != package['archiveSha256']
                    or expanded.hexdigest() != package['systemImageSha256']):
                raise ValueError('Expanded image or archive checksum mismatch')
            target.flush()
            os.fsync(target.fileno())
    except BaseException:
        if created:
            Path(image).unlink()
        raise


def prepare(manifest, expected, output, size_mib):
    if type(size_mib) is not int or not 512 <= size_mib <= 8192:
        raise ValueError('Choose 512–8192 MiB for fresh data')
    package = checked_manifest(manifest, expected)
    archive = checked_archive(Path(manifest).parent, package)
    output = Path(output).absolute()
    if output.exists() or output.is_symlink():
        raise ValueError('Output already exists; existing installation data must not be overwritten')
    if not output.parent.is_dir():
        raise ValueError('Create the output parent directory first')
    for tool in ('e2fsck', 'mke2fs', 'debugfs'):
        if not shutil.which(tool):
            raise ValueError('Missing required program: '+tool)
    required = package['uncompressedBytes'] + size_mib * CHUNK + 256 * CHUNK
    if shutil.disk_usage(output.parent).free < required:
        raise ValueError('Insufficient local disk space for system, data and reserve')
    output.mkdir(mode=0o700)
    marker = output/'.incomplete'
    marker.write_text('Preparation did not finish. Do not use these files.\n')
    image = output/'tundra-sargo-system.ext4'
    unpack(archive, image, package)
    check = subprocess.run(['e2fsck', '-f', '-n', str(image)],
                           capture_output=True, text=True, timeout=300)
    (output/'filesystem-check.txt').write_text(check.stdout+check.stderr)
    if check.returncode:
        raise ValueError('System filesystem check failed; no data image created')
    system = {'schema': 1, 'device': 'sargo', 'image': image.name,
              'imageSha256': package['systemImageSha256'], 'bytes': image.stat().st_size,
              'filesystemCheckPassed': True, 'flashReady': False,
              'packageVersion': package['version'], 'packageManifestSha256': expected}
    system_path = output/'system.json'
    system_path.write_text(json.dumps(system, indent=2)+'\n')
    subprocess.run([sys.executable, str(TOOLS/'build-state-image.py'), '--output', str(output/'data'),
                    '--system-image', str(system_path), '--size-mib', str(size_mib)],
                   check=True, timeout=300)
    state = validate_manifest(output/'data/state.json')
    if state['systemImageSha256'] != system['imageSha256']:
        raise ValueError('Data image belongs to another system image')
    report = {'schema': 1, 'device': 'sargo', 'version': package['version'],
              'packageManifestSha256': expected, 'systemImageSha256': system['imageSha256'],
              'stateUuid': state['uuid'], 'localPreparationPassed': True,
              'phoneTouched': False, 'flashReady': False,
              'remaining': ['Per-phone storage and boot backup inventory',
                            'Device-specific boot image and recovery qualification',
                            'Transfer, two RAM boots and persistence check before installation'],
              'supportedStorage': 'Sargo userdata with an inventoried single linear ext4 extent; not stock Android/F2FS'}
    (output/'preparation.json').write_text(json.dumps(report, indent=2)+'\n')
    marker.unlink()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--prepare', type=Path, metavar='NEW_DIRECTORY',
                        help='Expand and check the system; create separate fresh data locally')
    parser.add_argument('--data-mib', type=int, default=1024)
    args = parser.parse_args()
    os.umask(0o077)
    if args.prepare:
        report = prepare(args.manifest, args.manifest_sha256, args.prepare, args.data_mib)
        print(json.dumps(report, indent=2))
    else:
        package = checked_manifest(args.manifest, args.manifest_sha256)
        checked_archive(args.manifest.parent, package)
        print('Manifest and compressed archive verified. No extraction or phone operation performed.')
    print('Not a flashable ROM. Never fastboot flash this ext4 file to userdata.')


if __name__ == '__main__':
    main()
