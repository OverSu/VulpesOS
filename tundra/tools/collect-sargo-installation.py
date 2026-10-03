#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Run as root on Sargo to collect boot backups and its existing ext4 layout.

Only regular output files are written. No partition, slot, filesystem, service
or network configuration is changed. Transfer the private output to your PC.
"""
import argparse
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import struct

from boot_backup import SIZES, verify


def identity(proc=Path('/proc')):
    compatible = (proc/'device-tree/compatible').read_bytes().split(b'\0')
    model = (proc/'device-tree/model').read_text().strip('\0')
    if b'google,b4s4-sdm670' not in compatible or ' S4 ' not in model:
        raise ValueError('Expected the Sargo device tree')
    cmdline = dict(x.split('=', 1) for x in (proc/'cmdline').read_text().split() if '=' in x)
    serial = cmdline.get('androidboot.serialno', '')
    if not serial or cmdline.get('androidboot.slot_suffix') != '_a':
        raise ValueError('Expected a device serial and active slot A')
    return {'serialSha256': hashlib.sha256(serial.encode()).hexdigest(), 'activeSlot': 'a'}


def collect(mountpoint, output):
    if os.geteuid() != 0:
        raise ValueError('Raw partition backup requires root on the phone')
    device = identity()
    spec = importlib.util.spec_from_file_location('storage', Path(__file__).with_name('inventory-storage.py'))
    storage = importlib.util.module_from_spec(spec); spec.loader.exec_module(storage)
    layout = {**storage.inventory(mountpoint), **device}
    output = Path(output).absolute()
    output.mkdir(mode=0o700)
    (output/'.incomplete').touch()
    backup = output/'backup'; backup.mkdir(mode=0o700)
    manifest = {'device': 'sargo', 'rawPartitions': True, **device,
                'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'files': {}, 'scope': 'Boot, DTBO and vbmeta only; not a backup of user data'}
    for name, size in SIZES.items():
        path = (Path('/dev/disk/by-partlabel')/name.removesuffix('.img')).resolve(strict=True)
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        with os.fdopen(fd, 'rb', buffering=0) as source:
            if not stat.S_ISBLK(os.fstat(source.fileno()).st_mode):
                raise ValueError('Expected a partition block device')
            actual = struct.unpack('Q', fcntl.ioctl(source.fileno(), 0x80081272, bytes(8)))[0]
            if actual != size:
                raise ValueError('Unexpected partition size: '+name)
            sha = hashlib.sha256(); left = size
            with (backup/name).open('xb') as target:
                while left:
                    block = source.read(min(left, 1024*1024))
                    if not block:
                        raise ValueError('Truncated partition read: '+name)
                    target.write(block); sha.update(block); left -= len(block)
                target.flush(); os.fsync(target.fileno())
            manifest['files'][name] = {'bytes': size, 'sha256': sha.hexdigest()}
    if identity() != device or storage.inventory(mountpoint) != {k:v for k,v in layout.items() if k not in device}:
        raise ValueError('Device identity or storage changed during collection')
    (backup/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    (output/'layout.json').write_text(json.dumps(layout, indent=2)+'\n')
    verify(backup)
    (output/'.incomplete').unlink()
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mountpoint', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args(); os.umask(0o077)
    print(collect(args.mountpoint, args.output))
