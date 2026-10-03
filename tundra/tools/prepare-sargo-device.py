#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Import a phone's own boot backups and storage inventory into a private workspace.

Inputs must come from collect-sargo-installation.py on that phone. This does not
format, connect to, or flash a phone. Stock Android/F2FS is not supported.
"""
import argparse
import json
import os
from pathlib import Path
import shutil

from boot_backup import verify
from sargo_workspace import boot_kernel, checked_workspace
from storage_layout import mount_table
from tundra import digest


def prepare(source, output):
    source, output = Path(source).resolve(), Path(output).absolute()
    if (source/'.incomplete').exists():
        raise ValueError('Source collection did not finish')
    if output.exists() or output.is_symlink():
        raise ValueError('Workspace exists; existing backups will not be overwritten')
    manifest = verify(source/'backup')
    layout = json.loads((source/'layout.json').read_text())
    import re
    serial = manifest.get('serialSha256', '')
    if (not re.fullmatch('[a-f0-9]{64}', serial) or layout.get('serialSha256') != serial
            or manifest.get('activeSlot') != 'a' or layout.get('activeSlot') != 'a'):
        raise ValueError('Collect a bound backup and storage inventory from the same Sargo on slot A')
    mount_table(layout)
    kernel = boot_kernel(source/'backup/boot_a.img')
    output.mkdir(mode=0o700)
    (output/'.incomplete').touch()
    (output/'backup').mkdir(mode=0o700)
    for name in ('manifest.json', *manifest['files']):
        shutil.copyfile(source/'backup'/name, output/'backup'/name)
        (output/'backup'/name).chmod(0o600)
    shutil.copyfile(source/'layout.json', output/'layout.json')
    value = {'schema': 1, 'device': 'sargo', 'activeSlot': 'a', 'serialSha256': serial,
             'kernelSha256': kernel, 'private': True, 'flashReady': False,
             'files': {name: digest(output/name) for name in ('backup/manifest.json', 'layout.json')}}
    (output/'device.json').write_text(json.dumps(value, indent=2)+'\n')
    # Verify the copied inputs before exposing a usable workspace.
    verify(output/'backup')
    for name, sha in value['files'].items():
        if digest(output/name) != sha:
            raise ValueError('Copied input changed: '+name)
    (output/'.incomplete').unlink()
    checked_workspace(output)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    print(prepare(args.inventory, args.output))
    print('Private per-phone workspace verified. No phone operation performed.')


if __name__ == '__main__':
    main()
