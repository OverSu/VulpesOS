#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage the locally built ARMv7 Gecko in the Nokia's disposable runtime."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out/beatles/gecko-156.0.1'
REMOTE = '/data/local/vulpes-beatles'


def main():
    packages = list((OUT / 'obj-armv7/dist').glob('firefox-156.0.1.*.tar.*'))
    if len(packages) != 1:
        raise RuntimeError('Run build-beatles-gecko.sh package first; expected one release archive')
    destination = OUT / 'engine-runtime.tar.gz'
    with tarfile.open(packages[0]) as source:
        application = source.extractfile('firefox/application.ini').read().decode()
        platform = source.extractfile('firefox/platform.ini').read().decode()
        executable = source.extractfile('firefox/firefox').read(20)
        if 'Version=156.0.1' not in application.splitlines():
            raise RuntimeError('Unexpected Gecko version')
        if executable[:6] != b'\x7fELF\x01\x01' or int.from_bytes(executable[18:20], 'little') != 40:
            raise RuntimeError('Expected a 32-bit little-endian ARM executable')
        with tarfile.open(destination, 'w:gz', compresslevel=1) as target:
            for member in source:
                if member.name != 'firefox' and not member.name.startswith('firefox/'):
                    raise RuntimeError('Unexpected archive layout')
                member.name = 'opt/' + member.name
                if member.islnk():
                    member.linkname = 'opt/' + member.linkname
                target.addfile(member, source.extractfile(member) if member.isfile() else None)
    with destination.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows = subprocess.check_output(['adb', 'devices', '-l'], text=True).splitlines()
    devices = [r.split()[0] for r in rows if 'model:Nokia_2720_Flip' in r.split() and r.split()[1] == 'device']
    if len(devices) != 1:
        raise RuntimeError('Exactly one connected Nokia required')
    adb = ['adb', '-s', devices[0]]
    def shell(command):
        return subprocess.check_output(adb + ['shell', command], text=True).strip()
    if shell('getprop ro.product.codename') != 'beatles' or shell('getprop init.svc.b2g') != 'running':
        raise RuntimeError('Expected beatles running KaiOS before staging')
    print('Uploading Gecko 156.0.1 ARMv7:', destination.stat().st_size, 'bytes', flush=True)
    subprocess.run(adb + ['push', str(destination), REMOTE + '/engine-runtime.tar.gz'],
                   check=True, capture_output=True, timeout=900)
    actual = shell('/system/bin/busybox sha256sum ' + REMOTE + '/engine-runtime.tar.gz').split()[0]
    if actual != digest:
        raise RuntimeError('Phone archive hash mismatch')
    result = shell('/system/bin/busybox tar -xzf ' + REMOTE + '/engine-runtime.tar.gz -C ' +
                   REMOTE + '/rootfs && echo EXTRACTED')
    if not result.endswith('EXTRACTED'):
        raise RuntimeError('Engine extraction failed: ' + result)
    if shell('cat ' + REMOTE + '/rootfs/opt/firefox/application.ini').splitlines() != application.strip().splitlines():
        raise RuntimeError('Staged application.ini mismatch')
    shell('rm ' + REMOTE + '/engine-runtime.tar.gz')
    record = {'version': '156.0.1', 'architecture': 'armv7', 'device': 'beatles',
              'archiveSha256': digest, 'archiveBytes': destination.stat().st_size,
              'source': json.loads((OUT / 'source.json').read_text()),
              'applicationIni': application, 'platformIni': platform,
              'phoneArchiveHashVerified': True, 'flashed': False}
    (OUT / 'engine-staging.json').write_text(json.dumps(record, indent=2) + '\n')
    print('Gecko staged and verified. No system partition changed.', flush=True)


if __name__ == '__main__':
    main()
