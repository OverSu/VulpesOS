#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read the six inventoried Sargo boot partitions; never open a device for writing."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import stat
import struct
import subprocess
import tempfile

PARTITIONS = {
    'boot_a': 67108864, 'boot_b': 67108864,
    'dtbo_a': 8417280, 'dtbo_b': 8417280,
    'vbmeta_a': 65536, 'vbmeta_b': 65536,
}


def copy_exact(source, destination, size):
    digest = hashlib.sha256()
    remaining = size
    while remaining:
        chunk = source.read(min(1024 * 1024, remaining))
        if not chunk:
            raise RuntimeError('Partition read ended before its declared size')
        destination.write(chunk)
        digest.update(chunk)
        remaining -= len(chunk)
    return digest.hexdigest()


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Partition reads require sudo in your own terminal')
    account = pwd.getpwnam('droidian')
    getprop = next((p for p in ('/usr/bin/getprop', '/bin/getprop') if Path(p).exists()), None)
    if not getprop:
        raise RuntimeError('Cannot establish Android device identity')
    device = subprocess.check_output([getprop, 'ro.product.device'], text=True, timeout=10).strip()
    compatible = Path('/proc/device-tree/compatible').read_bytes().split(b'\0')
    if device != 'sargo' or b'google,b4s4-sdm670' not in compatible:
        raise RuntimeError('This recipe only supports the inventoried Sargo adaptation')
    os.umask(0o077)
    folder = Path(tempfile.mkdtemp(prefix='vulpes-boot-backup-', dir='/var/tmp'))
    report = {'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'device': device, 'rawPartitions': True, 'restorationTested': False,
              'scope': 'Boot, DTBO and vbmeta only; excludes userdata, vendor and system',
              'files': {}}
    for name, expected_size in PARTITIONS.items():
        path = (Path('/dev/disk/by-partlabel') / name).resolve(strict=True)
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        with os.fdopen(fd, 'rb') as source:
            if not stat.S_ISBLK(os.fstat(source.fileno()).st_mode):
                raise RuntimeError('Not a block device: ' + str(path))
            size = struct.unpack('Q', fcntl.ioctl(source.fileno(), 0x80081272, bytes(8)))[0]
            if size != expected_size:
                raise RuntimeError('Partition layout differs from the inventory: ' + name)
            target = folder / (name + '.img')
            with target.open('xb') as output:
                digest = copy_exact(source, output, size)
                output.flush()
                os.fsync(output.fileno())
            with target.open('rb') as saved:
                if hashlib.file_digest(saved, 'sha256').hexdigest() != digest:
                    raise RuntimeError('Backup verification failed: ' + name)
            report['files'][target.name] = {'source': str(path), 'bytes': size, 'sha256': digest}
    (folder / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    # Keep incomplete backups root-only; transfer ownership only after all six pass.
    for child in folder.iterdir():
        os.chown(child, account.pw_uid, account.pw_gid)
    os.chown(folder, account.pw_uid, account.pw_gid)
    print('Backup verified:', folder)


if __name__ == '__main__':
    main()
