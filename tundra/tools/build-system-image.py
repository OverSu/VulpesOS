#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Assemble a private Sargo system image, including its Android HAL reference."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
ANDROID_SHA = '132d0e18c6a6a111293447e940267f35aa2b14fa00a872ef160b20dc2014d886'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def pack(root, image):
    if not os.environ.get('FAKEROOTKEY'):
        raise RuntimeError('Image ownership must be prepared under fakeroot')
    for directory, dirs, files in os.walk(root):
        for path in [Path(directory), *[Path(directory)/n for n in dirs+files]]:
            os.lchown(path, 0, 0)
    # The trial session refreshes its local Gecko host files before starting.
    for base in (root/'opt/vulpes', root/'home/droidian'):
        for directory, dirs, files in os.walk(base):
            for path in [Path(directory), *[Path(directory)/n for n in dirs+files]]:
                os.lchown(path, 32011, 32011)
    features = 'none,has_journal,ext_attr,dir_index,filetype,extent,sparse_super,large_file,uninit_bg,dir_nlink,extra_isize'
    subprocess.run(['mke2fs', '-q', '-t', 'ext4', '-F', '-b', '4096', '-I', '256',
                    '-O', features, '-L', 'TUNDRA_SYSTEM', '-d', str(root), str(image)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--reference', type=Path, default=ROOT/'downloads/sargo-installed/runtime-reference-20260925')
    parser.add_argument('--product', type=Path, default=ROOT/'out/droidian/product')
    parser.add_argument('--pack', nargs=2, type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.pack:
        pack(*args.pack)
        return
    if os.geteuid() == 0:
        parser.error('Build as a regular user')
    android = ROOT/'downloads/sargo-installed/android-rootfs.img'
    if digest(android) != ANDROID_SHA:
        raise ValueError('Android HAL reference changed')
    lock = json.loads((args.product/'engine-lock.json').read_text())
    current = json.loads((PROJECT/'engine-lock.json').read_text())
    if lock.get('architecture') != 'aarch64' or lock['version'] != current['version']:
        raise ValueError('Prepare the matching ARM64 engine first')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    root = output/'root'
    staging = module('stage', ROOT/'tools/stage-runtime.py').stage(args.reference, root)
    product = root/'opt/vulpes'
    # Read UI/services from the common checkout, and only the engine/EGL adapter
    # from the checked ARM64 product. Never copy profiles or phone configuration.
    for name in ('assets', 'host', 'services', 'adapters', 'overrides', 'gaia/shared', 'gaia/apps/system'):
        shutil.copytree(PROJECT/name, product/name, symlinks=True,
                        ignore=shutil.ignore_patterns('__pycache__', 'test', 'tests'))
    for name in ('tools', 'tests', 'logs', 'profiles'):
        (product/name).mkdir(exist_ok=True)
    for name in ('serve-gaia.py', 'project.py', 'run-host.py'):
        shutil.copy2(PROJECT/'tools'/name, product/'tools'/name)
    shutil.copy2(PROJECT/'tests/ProbeChild.sys.mjs', product/'tests/ProbeChild.sys.mjs')
    shutil.copy2(PROJECT/'release.json', product/'release.json')
    shutil.copy2(args.product/'engine-lock.json', product/'engine-lock.json')
    shutil.copytree(args.product/'engines', product/'engines', symlinks=True)
    shutil.copytree(ROOT/'droidian', product/'trial', ignore=shutil.ignore_patterns('__pycache__'))
    for name in ('libEGL_vulpes_hybris.so', 'manifest.json'):
        shutil.copy2(args.product/'trial/graphics'/name, product/'trial/graphics'/name)
    for name in ('home/droidian', 'etc/dbus-1', 'reference'):
        (root/name).mkdir(parents=True, exist_ok=True)
    shutil.copy2(android, root/'reference/android-rootfs.img')
    module('native', ROOT/'runtime/prepare-native.py').prepare(root)
    shutil.copy2(ROOT/'droidian/initialize-runtime.sh', root/'etc/tundra/initialize-runtime.sh')
    # Caches are architecture dependent; generate them with the target binaries.
    (root/'etc/systemd/system/tundra-initialize.service').write_text('''[Unit]
Description=Initialize Tundra runtime caches
Before=tundra-hal.service tundra-display.service
[Service]
Type=oneshot
ExecStart=/bin/sh /etc/tundra/initialize-runtime.sh
RemainAfterExit=yes
''')
    for service in ('tundra-hal', 'tundra-display'):
        folder = root/f'etc/systemd/system/{service}.service.d'
        folder.mkdir(exist_ok=True)
        (folder/'initialize.conf').write_text('[Unit]\nRequires=tundra-initialize.service\nAfter=tundra-initialize.service\n')
    image = output/'tundra-sargo-system.ext4'
    with image.open('xb') as stream:
        stream.truncate(3*1024**3)
    subprocess.run(['fakeroot', '--', sys.executable, str(Path(__file__).resolve()),
                    '--output', str(output), '--pack', str(root), str(image)], check=True)
    check = subprocess.run(['e2fsck', '-f', '-n', str(image)], capture_output=True, text=True)
    (output/'filesystem-check.txt').write_text(check.stdout+check.stderr)
    if check.returncode:
        raise RuntimeError('System image failed filesystem verification')
    manifest = {'schema': 1, 'device': 'sargo', 'image': image.name,
                'imageSha256': digest(image), 'bytes': image.stat().st_size,
                'androidSha256': ANDROID_SHA, 'engine': lock,
                'release': json.loads((product/'release.json').read_text()),
                'staging': staging, 'filesystemCheckPassed': True,
                'flashReady': False, 'hardwareBootTested': False,
                'scope': 'Self-contained userspace; vendor/firmware partitions still required; RAM boot candidate',
                'sourceHashes': {str(p.relative_to(PROJECT)): digest(p) for p in
                    [Path(__file__).resolve(), ROOT/'tools/stage-runtime.py',
                     *sorted((ROOT/'runtime').glob('*.py'))]}}
    (output/'system.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(image, manifest['imageSha256'], flush=True)


if __name__ == '__main__':
    main()
