#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Export the qualified original boot backup and a standalone restoration tool.

The kit is private and specific to one phone. Keep it outside the project and
do not upload it as a release. Exporting performs no phone operations.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
from tundra import ROOT, digest


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def export(plan, output):
    output = Path(output).absolute()
    if output.exists() or output.is_symlink():
        raise ValueError('Recovery output exists; keep the existing backup')
    backup = Path(plan['backupDirectory'])
    from boot_backup import verify
    manifest = verify(backup)
    if digest(backup/'manifest.json') != plan['backupManifestSha256']:
        raise ValueError('Backup manifest changed')
    output.mkdir(mode=0o700)
    marker = output/'.incomplete'
    marker.write_text('Recovery export incomplete\n')
    shutil.copyfile(backup/'boot_a.img', output/'boot_a.img')
    (output/'boot_a.img').chmod(0o600)
    tool = ROOT/'tools/restore-sargo.py'
    shutil.copyfile(tool, output/tool.name)
    (output/tool.name).chmod(0o700)
    recovery = {'schema': 1, 'device': 'sargo', 'partition': 'boot_a', 'slot': 'a',
                'serialSha256': plan['serialSha256'], 'image': 'boot_a.img',
                'bytes': manifest['files']['boot_a.img']['bytes'],
                'imageSha256': manifest['files']['boot_a.img']['sha256'],
                'backupManifestSha256': plan['backupManifestSha256'],
                'restoreToolSha256': digest(tool), 'private': True,
                'scope': 'Original qualified boot_a only; not a userdata backup or a generic ROM'}
    (output/'recovery.json').write_text(json.dumps(recovery, indent=2)+'\n')
    load('restore_check', tool).checked_kit(output)
    marker.unlink()
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--device-workspace', type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    if args.device_workspace:
        from sargo_workspace import checked_workspace
        plan, _ = checked_workspace(args.device_workspace)
    else:
        plan = load('backup_plan', ROOT/'tools/test-sargo-boot.py').checked_backup_plan()
    print(export(plan, args.output))
    print('Keep this private kit on another disk. Its boot image belongs only to this phone.')


if __name__ == '__main__':
    main()
