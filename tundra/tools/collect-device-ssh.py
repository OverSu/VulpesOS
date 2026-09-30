#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read a Linux phone inventory through an already authenticated SSH master."""
import argparse
import ipaddress
import os
from pathlib import Path
import re
import shlex
import subprocess

from tundra import ROOT, now, save

READS = {
    'identity': ['id'],
    'os-release': ['cat', '/etc/os-release'],
    'kernel': ['uname', '-a'],
    'cmdline': ['cat', '/proc/cmdline'],
    'partitions': ['lsblk', '-b', '-J', '-o', 'NAME,TYPE,SIZE,FSTYPE,PARTLABEL,MOUNTPOINTS'],
    'partition-links': ['ls', '-l', '/dev/disk/by-partlabel', '/dev/block/by-name'],
    'mounts': ['cat', '/proc/mounts'],
    'fstab': ['cat', '/etc/fstab'],
    'deviceinfo': ['ls', '-la', '/etc/deviceinfo'],
    'boot-files': ['ls', '-l', '/boot'],
    'devices': ['ls', '-l', '/dev/dri', '/dev/input', '/dev/video0', '/dev/binder'],
    'services': ['systemctl', 'list-units', '--type=service', '--state=running', '--no-pager', '--plain'],
    'packages': ['dpkg-query', '-W', '-f', '${binary:Package}\t${Version}\n'],
    'android-properties': ['getprop'],
}


def identify(model, compatible, android_device=''):
    model = model.replace('\0', '').strip()
    tokens = compatible.strip().split('\0')
    android_device = android_device.strip()
    if model == 'Google Pixel 3a XL' or 'google,bonito' in tokens or android_device == 'bonito':
        return 'wrong-device-pixel-3a-xl'
    if model == 'Google Pixel 3a' or 'google,sargo' in tokens or android_device == 'sargo':
        return 'sargo'
    return 'unverified'


def ssh_base(socket, host, user):
    # ProxyCommand=false prevents a new connection if the master disappears.
    return ['ssh', '-F', '/dev/null', '-S', str(socket),
            '-o', 'BatchMode=yes', '-o', 'ProxyCommand=false',
            '-o', 'ForwardAgent=no', '-o', 'ClearAllForwardings=yes',
            f'{user}@{host}']


def capture(base, command):
    try:
        result = subprocess.run(base + [shlex.join(command)], capture_output=True,
                                text=True, errors='replace', timeout=20)
        output = result.stdout
        if command == READS['packages']:
            output = '\n'.join(line for line in output.splitlines() if re.search(
                r'android|droidian|hybris|halium|linux-|phosh|phoc|wayland|mesa|firmware|modem|pulse|pipewire',
                line, re.I))
        return {'command': command, 'returncode': result.returncode,
                'stdout': output[:65536], 'stderr': result.stderr[:4096],
                'truncated': len(output) > 65536}
    except subprocess.TimeoutExpired:
        return {'command': command, 'returncode': None, 'error': 'timeout'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--control-socket', type=Path, required=True)
    parser.add_argument('--host', default='10.15.19.82')
    parser.add_argument('--user', default='droidian')
    args = parser.parse_args()
    ipaddress.ip_address(args.host)
    if not re.fullmatch(r'[a-z_][a-z0-9_-]*', args.user):
        parser.error('Invalid SSH user')
    socket = args.control_socket.resolve()
    if not socket.is_socket():
        parser.error('Open the authenticated SSH master in your terminal first')
    os.umask(0o077)
    base = ssh_base(socket, args.host, args.user)
    subprocess.run(base[:-1] + ['-O', 'check', base[-1]], check=True)
    records = {name: capture(base, ['cat', path]) for name, path in (
        ('model', '/proc/device-tree/model'),
        ('compatible', '/proc/device-tree/compatible'))}
    records['android-device'] = capture(base, ['getprop', 'ro.product.device'])
    value = lambda name: records[name].get('stdout', '') if records[name].get('returncode') == 0 else ''
    identity = identify(value('model'), value('compatible'), value('android-device'))
    if identity == 'sargo':
        for name, command in READS.items():
            records[name] = capture(base, command)
    path = ROOT/'logs/device'/('ssh-'+now().replace(':', '-')+'.json')
    save(path, {'recordedAt': now(), 'transport': 'ssh-existing-master',
                'identity': identity, 'readOnly': True,
                'flashAuthorizedByThisReport': False, 'records': records})
    print(f'Inventory: {path}\nIdentity: {identity}')
    return 0 if identity == 'sargo' else 2


if __name__ == '__main__':
    raise SystemExit(main())
