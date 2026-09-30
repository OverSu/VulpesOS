#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Mark the installed Sargo slot successful after current-boot health checks.

Uses Debian's Qualcomm boot-control utility. Never switches slots or writes a
boot image. GPT metadata is backed up before its success bits are updated.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_URL = 'https://deb.debian.org/debian/pool/main/q/qbootctl/qbootctl_0.2.2-1_arm64.deb'
PACKAGE_SHA = '76b9be97107f14a79641bc274a00010aade3362b5099df5ae8b85603cbb6eb22'
SUCCESS = 1 << 54


def verify_transition(before, after):
    changed = []
    for copy in ('primary', 'secondary'):
        if 'header' in before[copy]:
            headers = [bytearray(base64.b64decode(v[copy]['header'])) for v in (before, after)]
            for h in headers:
                h[16:20] = b'\0'*4
                h[88:92] = b'\0'*4
            if headers[0] != headers[1]:
                raise ValueError('GPT header fields changed')
        a = base64.b64decode(before[copy]['table'])
        b = base64.b64decode(after[copy]['table'])
        if len(a) != len(b):
            raise ValueError('Partition table length changed')
        expected = bytearray(a)
        for label, part in before[copy]['partitions'].items():
            offset = (part['index'] - 1) * 128
            if a[offset:offset+128] == b[offset:offset+128]:
                continue
            if not label.endswith('_a') or label[:-1]+'b' not in before[copy]['partitions']:
                raise ValueError('Unexpected partition changed: '+label)
            expected[offset+54] |= 0x40
            if copy == 'primary': changed.append(label)
        if bytes(expected) != b:
            raise ValueError('A field other than a success bit changed')
    if not after['primary']['partitions']['boot_a']['attributes'] & SUCCESS:
        raise ValueError('Slot A was not marked successful')
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--mark-successful', action='store_true')
    args = parser.parse_args()
    folder = args.build.resolve()
    build = json.loads((folder/'build.json').read_text())
    install = json.loads((folder/'install-report.json').read_text())
    if not install['completed'] or install['imageSha256'] != build['imageSha256']:
        raise ValueError('A successful installation report is required')
    ssh = ['ssh', '-F', '/dev/null', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
           '-o', 'ConnectTimeout=5', '-o', 'StrictHostKeyChecking=yes',
           '-o', 'HostKeyAlgorithms=+ssh-rsa', '-o', 'UserKnownHostsFile='+str(folder/'known_hosts'),
           '-i', str(folder/'client-key'), '-p', '2222', 'root@10.15.19.82']
    def remote(command, data=None):
        return subprocess.run(ssh+[command], input=data, capture_output=True,
                              check=True, timeout=45).stdout
    config = {'serialSha256':build['serialSha256'], 'imageSha256':build['imageSha256'],
              'bytes':(folder/build['image']).stat().st_size}
    inspect = (ROOT/'tools/read-sargo-gpt.py').read_text()
    health = '''
from pathlib import Path
import hashlib,json,subprocess
cmdline = dict(x.split('=',1) for x in Path('/proc/cmdline').read_text().split() if '=' in x)
assert cmdline.get('androidboot.slot_suffix') == '_a'
assert hashlib.sha256(cmdline['androidboot.serialno'].encode()).hexdigest() == config['serialSha256']
with open('/dev/disk/by-partlabel/boot_a','rb') as f:
    assert hashlib.sha256(f.read(config['bytes'])).hexdigest() == config['imageSha256']
gaia = json.loads(Path('/opt/vulpes/logs/test.json').read_text())
assert gaia['passed'] and all(gaia['checks'].values())
assert gaia['bootId'] == Path('/proc/sys/kernel/random/boot_id').read_text().strip()
for units in [('tundra-hal','tundra-display','tundra-radio')]:
    subprocess.run(['systemctl','is-active','--quiet',*units],check=True)
assert not subprocess.check_output(['systemctl','--failed','--no-legend','--no-pager']).strip()
'''
    def snapshot():
        code = 'config='+repr(config)+'\n'+health+'\n'+inspect
        return json.loads(remote('chroot /proc/1/root /usr/bin/python3 -', code.encode()))
    before = snapshot()
    attr = before['primary']['partitions']['boot_a']['attributes']
    if not attr & (1 << 50) or attr & (1 << 55):
        raise ValueError('Slot A must be active and bootable')
    print('Installed image, current Gaia boot, services and mirrored GPT checked.')
    if not args.mark_successful:
        print('Review only. Successful:', bool(attr & SUCCESS)); return
    from datetime import datetime, timezone
    evidence = folder/('slot-finalization-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    evidence.mkdir(mode=0o700)
    (evidence/'gpt-before.json').write_text(json.dumps(before,indent=2)+'\n')
    if not attr & SUCCESS:
        package = urllib.request.urlopen(PACKAGE_URL, timeout=30).read()
        if hashlib.sha256(package).hexdigest() != PACKAGE_SHA:
            raise ValueError('qbootctl package hash mismatch')
        with tempfile.TemporaryDirectory() as directory:
            deb = Path(directory)/'qbootctl.deb'; deb.write_bytes(package)
            data = subprocess.check_output(['ar','p',str(deb),'data.tar.xz'])
            with tarfile.open(fileobj=io.BytesIO(data),mode='r:xz') as archive:
                binary = archive.extractfile('./usr/bin/qbootctl').read()
        remote('cat > /proc/1/root/run/tundra-qbootctl && chmod 700 /proc/1/root/run/tundra-qbootctl', binary)
        try:
            output = remote('chroot /proc/1/root /run/tundra-qbootctl -m a')
            (evidence/'qbootctl.txt').write_bytes(output)
        finally:
            remote('rm -f /proc/1/root/run/tundra-qbootctl')
    after = snapshot()
    (evidence/'gpt-after.json').write_text(json.dumps(after,indent=2)+'\n')
    changed = verify_transition(before, after)
    (evidence/'result.json').write_text(json.dumps({'passed':True,'bootId':after['bootId'],
        'imageSha256':build['imageSha256'],'packageSha256':PACKAGE_SHA,
        'metadataChanged':changed,'partitionsFlashed':[]},indent=2)+'\n')
    print('Slot A marked successful; metadata checked:', evidence)


if __name__ == '__main__': main()
