#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Package the isolated ARMhf runtime; no phone changes."""
import hashlib
import json
import posixpath
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'out/beatles/gecko-156.0.1'


def main():
    source = BUILD / 'sysroot/rootfs'
    paths = ('lib/arm-linux-gnueabihf', 'lib/ld-linux-armhf.so.3',
             'usr/lib/arm-linux-gnueabihf', 'usr/lib/xorg',
             'usr/lib/python3.11', 'usr/bin/python3.11', 'usr/bin/xkbcomp',
             'bin/dash', 'etc/fonts', 'usr/share/fonts',
             'usr/share/fontconfig', 'usr/share/X11')

    def keep(member):
        if member.name.endswith(('.a', '.o', '.pyc')) or '/__pycache__/' in member.name:
            return None
        if member.issym() and member.linkname.startswith('/'):
            member.linkname = posixpath.relpath(member.linkname.lstrip('/'),posixpath.dirname(member.name))
        member.uid = member.gid = 0
        member.uname = member.gname = 'root'
        return member

    archive = BUILD / 'graphics-runtime.tar.gz'
    with tarfile.open(archive, 'w:gz', compresslevel=1) as tar:
        for path in paths:
            tar.add(source / path, arcname=path, filter=keep)
        tar.add(ROOT / 'devices/beatles/xorg.conf', arcname='etc/X11/xorg.conf')
        link = tarfile.TarInfo('bin/sh')
        link.type = tarfile.SYMTYPE
        link.linkname = 'dash'
        tar.addfile(link)
    with archive.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    record = {'sha256': digest, 'bytes': archive.stat().st_size,
              'containsGecko': False, 'device': 'beatles'}
    (BUILD / 'graphics-runtime.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record))


if __name__ == '__main__':
    main()
