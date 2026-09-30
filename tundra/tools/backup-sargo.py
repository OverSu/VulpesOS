#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Back up boot partitions through the existing SSH master; sudo stays in the user's terminal."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    if not sys.stdin.isatty():
        raise RuntimeError('Run in your terminal: sudo may ask for the phone password there')
    socket = ROOT / 'logs/device/ssh-control'
    spec = importlib.util.spec_from_file_location('collector', ROOT / 'tools/collect-device-ssh.py')
    collector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(collector)
    base = collector.ssh_base(socket, '10.15.19.82', 'droidian')
    subprocess.run(base[:-1] + ['-O', 'check', base[-1]], check=True)
    source = (ROOT / 'droidian/backup-boot.py').read_bytes()
    sha = hashlib.sha256(source).hexdigest()
    remote = '/home/droidian/vulpes-tundra-tests/backup-boot-' + sha[:16] + '.py'
    subprocess.run(base + [shlex.join(['python3', '-c',
        'import pathlib,sys;pathlib.Path(sys.argv[1]).write_bytes(sys.stdin.buffer.read())', remote])],
        input=source, check=True)
    # Password entry goes directly to the terminal, never to logs or the assistant.
    subprocess.run(base[:-1] + ['-t', base[-1], shlex.join(['sudo', '/usr/bin/python3', '-I', remote])], check=True)
    listing = subprocess.check_output(base + [shlex.join(['python3', '-c',
        "import pathlib;print('\\n'.join(str(p) for p in sorted(pathlib.Path('/var/tmp').glob('vulpes-boot-backup-*/manifest.json')) if p.is_file()))"])], text=True)
    os.umask(0o077)
    destination = ROOT.parents[2] / 'backups/tundra/sargo/raw-boot'
    for entry in listing.splitlines():
        folder = Path(entry).parent
        if folder.parent != Path('/var/tmp') or not folder.name.startswith('vulpes-boot-backup-'):
            raise RuntimeError('Unexpected remote backup path')
        read = lambda p: subprocess.check_output(base + [shlex.join(['cat', str(p)])], timeout=120)
        manifest_bytes = read(folder / 'manifest.json')
        manifest = json.loads(manifest_bytes)
        expected = {'boot_a.img', 'boot_b.img', 'dtbo_a.img', 'dtbo_b.img', 'vbmeta_a.img', 'vbmeta_b.img'}
        if manifest.get('device') != 'sargo' or set(manifest.get('files', {})) != expected:
            raise RuntimeError('Invalid backup manifest')
        local = destination / folder.name
        local.mkdir(parents=True, exist_ok=True)
        for name, info in manifest['files'].items():
            target = local / name
            data = target.read_bytes() if target.exists() else read(folder / name)
            if len(data) != info['bytes'] or hashlib.sha256(data).hexdigest() != info['sha256']:
                raise RuntimeError('Backup checksum mismatch: ' + name)
            if not target.exists():
                with target.open('xb') as output:
                    output.write(data)
        (local / 'manifest.json').write_bytes(manifest_bytes)
        print('Verified on PC:', local)


if __name__ == '__main__':
    main()
