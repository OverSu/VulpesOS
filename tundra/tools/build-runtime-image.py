#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Package the ARM64 runtime reference. This image has no qualified boot sequence."""
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


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def pack(tree, image):
    if not os.environ.get('FAKEROOTKEY'):
        raise RuntimeError('Ownership normalization must run under fakeroot')
    for base, dirs, files in os.walk(tree):
        os.lchown(base, 0, 0)
        for name in dirs+files:
            os.lchown(Path(base)/name, 0, 0)
    os.chown(tree/'home/vulpes', 1000, 1000)
    # Explicit feature list avoids enabling newer ext4 features on the 4.9 kernel.
    features = 'none,has_journal,ext_attr,dir_index,filetype,extent,sparse_super,large_file,uninit_bg,dir_nlink,extra_isize'
    subprocess.run(['mke2fs', '-q', '-t', 'ext4', '-F', '-b', '4096', '-I', '256',
                    '-O', features, '-L', 'TUNDRA_REF', '-d', str(tree), str(image)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'downloads/sargo-installed/runtime-reference')
    parser.add_argument('--product', type=Path, default=ROOT/'out/droidian/product')
    parser.add_argument('--output', type=Path, default=ROOT/'out/sargo-runtime-image')
    parser.add_argument('--pack', nargs=2, type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.pack:
        pack(*args.pack)
        return
    if os.geteuid() == 0:
        parser.error('Run as a regular user; fakeroot supplies image ownership')
    output = args.output.resolve()
    if output.exists():
        parser.error('Output exists; select a new directory to preserve its provenance')
    spec = importlib.util.spec_from_file_location('stage_runtime', ROOT/'tools/stage-runtime.py')
    stage = importlib.util.module_from_spec(spec); spec.loader.exec_module(stage)
    tree = output/'root'
    staged = stage.stage(args.source, tree)
    product = args.product.resolve()
    selected = ('assets', 'host', 'services', 'adapters', 'overrides', 'gaia', 'tools',
                'tests', 'engines', 'trial', 'engine-lock.json', 'release.json')
    for name in selected:
        source, target = product/name, tree/'opt/vulpes'/name
        if source.is_dir():
            shutil.copytree(source, target, symlinks=True,
                            ignore=shutil.ignore_patterns('__pycache__'), copy_function=os.link)
        else:
            os.link(source, target)
    image = output/'tundra-sargo-runtime-NOT-BOOTABLE.ext4'
    with image.open('xb') as stream:
        stream.truncate(2*1024**3)
    subprocess.run(['fakeroot', '--', sys.executable, str(Path(__file__).resolve()),
                    '--pack', str(tree), str(image)], check=True)
    check = subprocess.run(['e2fsck', '-f', '-n', str(image)], capture_output=True, text=True)
    (output/'filesystem-check.txt').write_text(check.stdout+check.stderr)
    if check.returncode:
        raise RuntimeError('Generated filesystem failed e2fsck')
    metadata = {'scope': 'Runtime and shared Gaia/Gecko files; no init/HAL configuration, NOT BOOTABLE',
                'flashReady': False, 'standaloneBootTested': False, 'staging': staged,
                'image': image.name, 'imageSha256': digest(image), 'bytes': image.stat().st_size,
                'engine': json.loads((product/'engine-lock.json').read_text()),
                'filesystemCheckPassed': True,
                'scripts': {p.name: digest(p) for p in (Path(__file__).resolve(), ROOT/'tools/stage-runtime.py')}}
    (output/'manifest.json').write_text(json.dumps(metadata, indent=2)+'\n')
    print(image, metadata['imageSha256'], flush=True)


if __name__ == '__main__':
    main()
