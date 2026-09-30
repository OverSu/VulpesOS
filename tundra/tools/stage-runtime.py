#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage a private runtime reference without importing the phone's configuration."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import tarfile


def destination(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] not in ('usr', 'bin', 'sbin', 'lib', 'lib64'):
        raise ValueError('Invalid archive path: '+name)
    return str(path)


def link_target(name, target):
    absolute = posixpath.normpath(target if target.startswith('/') else
                                 posixpath.join('/', posixpath.dirname(name), target))
    return posixpath.relpath(absolute, '/'+posixpath.dirname(name))


def merged_path(name):
    return 'usr/'+name if name.split('/')[0] in ('bin', 'sbin', 'lib', 'lib64') else name


def stage(source, root):
    manifest = json.loads((source/'manifest.json').read_text())
    with (source/'runtime.tar').open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    if digest != manifest['archiveSha256']:
        raise ValueError('Runtime archive checksum mismatch')
    root.mkdir(parents=True, exist_ok=False)
    links = []
    with tarfile.open(source/'runtime.tar') as archive:
        for item in archive:
            name = destination(item.name)
            record = manifest['files']['/'+name]
            output_name = merged_path(name)
            target = root/output_name
            target.parent.mkdir(parents=True, exist_ok=True)
            if item.issym():
                if record['symlink'] != item.linkname:
                    raise ValueError('Symlink metadata mismatch: '+name)
                links.append((output_name, item.linkname))
            elif item.isfile():
                with archive.extractfile(item) as stream, target.open('xb') as output:
                    hasher = hashlib.sha256()
                    while data := stream.read(1024*1024):
                        hasher.update(data)
                        output.write(data)
                if hasher.hexdigest() != record['sha256']:
                    raise ValueError('File checksum mismatch: '+name)
                target.chmod(item.mode & 0o1777)
            else:
                raise ValueError('Unsupported archive member: '+name)
    # Extract regular files first so an archive symlink can never redirect a write.
    for name, target in links:
        path = root/name
        if path.exists() or path.is_symlink() or any(p.is_symlink() for p in path.parents):
            raise ValueError('Archive symlink conflicts with another path: '+name)
        path.symlink_to(link_target(name, target))
    for name in ('usr/bin', 'usr/sbin', 'usr/lib', 'etc/fonts', 'dev', 'proc', 'sys', 'run', 'tmp', 'var/tmp', 'var/log',
                 'opt/vulpes', 'home/vulpes', 'root'):
        (root/name).mkdir(parents=True, exist_ok=True)
    for name in ('bin', 'sbin', 'lib'):
        if not (root/name).exists():
            (root/name).symlink_to('usr/'+name)
    if not (root/'usr/bin/sh').exists() and not (root/'usr/bin/sh').is_symlink():
        (root/'usr/bin/sh').symlink_to('bash')
    config = {
        'passwd': 'root:x:0:0:root:/root:/bin/bash\nvulpes:x:1000:1000:Vulpes:/home/vulpes:/bin/bash\n',
        'group': 'root:x:0:\nvulpes:x:1000:\n',
        'shadow': 'root:!:20000:0:99999:7:::\nvulpes:!:20000:0:99999:7:::\n',
        'nsswitch.conf': 'passwd: files\ngroup: files\nshadow: files\nhosts: files dns\n',
        'hosts': '127.0.0.1 localhost\n::1 localhost\n',
        'ld.so.conf': '/usr/lib/aarch64-linux-gnu\n/usr/lib\n',
        'fonts/fonts.conf': '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>/usr/share/fonts</dir><cachedir prefix="xdg">fontconfig</cachedir><alias><family>sans-serif</family><prefer><family>Nimbus Sans</family></prefer></alias></fontconfig>\n',
        'os-release': 'NAME="Tundra runtime reference"\nID=tundra\nPRETTY_NAME="Tundra ARM64 reference (not bootable)"\n',
    }
    for name, value in config.items():
        (root/'etc'/name).write_text(value)
    (root/'etc/shadow').chmod(0o600)
    for name in ('tmp', 'var/tmp'):
        (root/name).chmod(0o1777)
    report = {'scope': 'Package runtime reference only; no init, HAL mounts or standalone boot',
              'archiveSha256': digest, 'packages': len(manifest['packages']),
              'packageFiles': len(manifest['files']), 'sourceMissingFiles': manifest['missing'],
              'hostConfigurationCopied': False, 'setuidPrograms': False}
    (root.parent/(root.name+'-stage.json')).write_text(json.dumps(report, indent=2)+'\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    if os.geteuid() == 0:
        parser.error('Stage as an unprivileged user')
    print(json.dumps(stage(args.source, args.root), indent=2))


if __name__ == '__main__':
    main()
