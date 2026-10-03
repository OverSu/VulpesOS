#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Restore boot_a from a private recovery kit. Runs without the Vulpes checkout.

By default this only verifies local files. --restore writes the saved boot_a
to the matching unlocked Sargo on slot A. It never erases userdata, changes
slots or reboots automatically. This does not restore or back up user data.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

BOOT_SIZE = 67108864


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def checked_kit(folder):
    folder = Path(folder)
    path = folder/'recovery.json'
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 65536:
        raise ValueError('Expected a regular recovery manifest')
    manifest = json.loads(path.read_text())
    if (manifest.get('schema') != 1 or manifest.get('device') != 'sargo'
            or manifest.get('partition') != 'boot_a' or manifest.get('slot') != 'a'
            or manifest.get('image') != 'boot_a.img' or manifest.get('bytes') != BOOT_SIZE):
        raise ValueError('Expected a Sargo slot A recovery kit')
    for key in ('serialSha256', 'imageSha256', 'backupManifestSha256'):
        if not re.fullmatch(r'[a-f0-9]{64}', str(manifest.get(key, ''))):
            raise ValueError('Missing recovery checksum: '+key)
    image = folder/'boot_a.img'
    if image.is_symlink() or not image.is_file() or image.stat().st_size != BOOT_SIZE:
        raise ValueError('Saved boot_a is missing or has the wrong size')
    if digest(image) != manifest['imageSha256']:
        raise ValueError('Saved boot_a checksum mismatch')
    with image.open('rb') as stream:
        if stream.read(8) != b'ANDROID!':
            raise ValueError('Saved boot_a has no Android boot header')
    return manifest, image


def getvar(serial, name):
    result = subprocess.run(['fastboot', '-s', serial, 'getvar', name],
                            capture_output=True, text=True, check=True, timeout=15)
    for line in (result.stdout+'\n'+result.stderr).splitlines():
        match = re.fullmatch(r'(?:\(bootloader\)\s*)?'+re.escape(name)+r':\s*(.+)', line.strip())
        if match:
            return match[1].strip()
    raise ValueError('Fastboot did not return '+name)


def checked_device(manifest):
    output = subprocess.check_output(['fastboot', 'devices'], text=True, timeout=10)
    matches = []
    for line in output.splitlines():
        fields = line.split()
        if (len(fields) == 2 and fields[1] == 'fastboot'
                and hashlib.sha256(fields[0].encode()).hexdigest() == manifest['serialSha256']):
            matches.append(fields[0])
    if len(matches) != 1:
        raise ValueError('The phone belonging to this backup is not uniquely present in Fastboot')
    serial = matches[0]
    values = {name: getvar(serial, name) for name in
              ('product', 'unlocked', 'current-slot', 'partition-size:boot_a')}
    if (values['product'] != 'sargo' or values['unlocked'] != 'yes'
            or values['current-slot'] != 'a'
            or int(values['partition-size:boot_a'], 16) != BOOT_SIZE):
        raise ValueError('Expected the matching unlocked Sargo on slot A with a 64 MiB boot partition')
    return serial


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kit', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--restore', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    if (args.kit/'.incomplete').exists():
        raise ValueError('Recovery kit export did not finish')
    manifest, image = checked_kit(args.kit)
    print('Saved boot_a verified:', manifest['imageSha256'])
    if not args.restore:
        print('Local verification only. No phone command sent.')
        return
    serial = checked_device(manifest)
    # Verify again after connecting, before allowing the only write command.
    current, image = checked_kit(args.kit)
    if current != manifest:
        raise ValueError('Recovery kit changed during device verification')
    report = {'operation': 'restore', 'partition': 'boot_a',
              'imageSha256': manifest['imageSha256'], 'completed': False}
    path = args.kit/'restore-report.json'
    path.write_text(json.dumps(report, indent=2)+'\n')
    subprocess.run(['fastboot', '-s', serial, 'flash', 'boot_a', str(image.resolve())],
                   check=True, timeout=90)
    report['completed'] = True
    path.write_text(json.dumps(report, indent=2)+'\n')
    print('Saved boot_a restored. Select Start on the phone. No userdata erase or slot change sent.')


if __name__ == '__main__':
    main()
