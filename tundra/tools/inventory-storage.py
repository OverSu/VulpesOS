#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Inventory an existing Sargo ext4/LVM mount without changing any storage."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

from storage_layout import mount_table


def command(*args):
    return subprocess.check_output(args, text=True, timeout=15,
        env={**os.environ, 'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C'}).strip()


def inventory(mountpoint):
    device = Path('/dev/mmcblk0p72')
    if not stat.S_ISBLK(device.stat().st_mode):
        raise ValueError('Sargo userdata block device is missing')
    label = command('blkid', '-s', 'PARTLABEL', '-o', 'value', str(device))
    if label != 'userdata':
        raise ValueError('Unexpected partition label')
    mounted = json.loads(command('findmnt', '--json', '--mountpoint', mountpoint,
                                 '--output', 'SOURCE,FSTYPE'))['filesystems']
    if len(mounted) != 1 or mounted[0]['fstype'] != 'ext4':
        raise ValueError('Expected one existing ext4 mount')
    source = mounted[0]['source']
    if not source.startswith('/dev/mapper/'):
        raise ValueError('Only the existing single-extent LVM layout is supported')
    table = command('dmsetup', 'table', source)
    with device.open('rb', buffering=0) as stream:
        first = stream.read(1048576)
    if len(first) != 1048576:
        raise ValueError('Cannot read userdata identity')
    layout = {
        'schema': 2, 'device': str(device), 'partitionLabel': label,
        'filesystem': mounted[0]['fstype'], 'table': table,
        'backingDevice': Path('/sys/class/block/mmcblk0p72/dev').read_text().strip(),
        'size': int(command('blockdev', '--getsize64', str(device))),
        'firstMiBSha256': hashlib.sha256(first).hexdigest(),
    }
    mount_table(layout)
    return layout


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mountpoint', required=True,
                        help='Existing root mount, or /reference/installed under Tundra')
    args = parser.parse_args()
    print(json.dumps(inventory(args.mountpoint), indent=2))
