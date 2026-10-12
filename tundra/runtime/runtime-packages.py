#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage pinned package payloads missing from the original ARM64 reference."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

PACKAGES = (
    ('pulseaudio-module-bluetooth_14.2-2+droidian4+git20250504201345.dc4fdb8.next.production_arm64.deb',
     'https://production.repo.droidian.org/pool/main/p/pulseaudio',
     'f0a6fa15835f1e22a5708dc46356bd30bb492d57655f769aaf4df78b6838f4f3'),
    ('libsbc1_2.1-1+b2_arm64.deb', 's/sbc',
     '62dd7210ff6500e3ee4976d865826d603127787f588c4c4a8f93556104c95634'),
    ('libdw1t64_0.196-1_arm64.deb', 'e/elfutils', 'a82634454de2b28d73374f693e4ab6c1c2634fa53b0139312c5f439c294dad2b'),
    ('libelf1t64_0.196-1_arm64.deb', 'e/elfutils', 'ead8a1244824d982ce51fb82be4904312d5dc44ddc157e589def58c257738476'),
    ('bluez_5.87-4_arm64.deb', 'b/bluez', 'fe733034dbdfa6146fc94112ad8ca0fce71d8e01d22a59ddb49ef2df3777d6b5'),
    ('ca-certificates_20260816_all.deb', 'c/ca-certificates', '1cb8b73c74c47677b329fad4095fb9370227d4b8f1969372411478a4586c46cf'),
    ('mobile-broadband-provider-info_20251101-1_all.deb', 'm/mobile-broadband-provider-info', 'c34e6bad952a320078fa91faf29a6c754d57963e7280998a01ccb058e60b87cc'),
    ('audiosystem-passthrough_1.3.0-1+droidian1+git20240519112654.f49813c.next.production_arm64.deb',
     'https://production.repo.droidian.org/pool/main/a/audiosystem-passthrough',
     'bb4dc41ee66b3b00e8fbd3e0bb8559ab0b98675836219efef7b02958c47b815d'),
)


# Existing libelf 0.194-4 files in the inventoried runtime; reject other replacements.
REPLACES = {'usr/lib/aarch64-linux-gnu/libelf-0.194.so': 'ade23632ea253cb4ecfe95d5436bfeb3d40ae2003c5fe10bf1ac1c5b30bdf2e2', 'usr/share/doc/libelf1t64/changelog.Debian.gz': 'ffb0ea69fdbf6f32053059985048676931fd7d5c4458f8ca4bc54750cf4b1b31', 'usr/share/doc/libelf1t64/changelog.gz': '2e8e0af5c39ab744ac6934fe07419b5fd5504a50cd2f42110dd04315c548a708', 'usr/share/doc/libelf1t64/copyright': '2409860c86675ab33f8ad22480608faf849cbc2559d6478f708c23c508a1dbf2', 'usr/share/locale/de/LC_MESSAGES/elfutils.mo': 'f72328e130e63f231acb8e1a56ce5f4f3e91d0fc290db95d7ba4e4b2448d4d93', 'usr/share/locale/en@boldquot/LC_MESSAGES/elfutils.mo': '90158a24e3f85aaacc64085ef2644ba19075cb847c754341c9f245aaa69e94c6', 'usr/share/locale/en@quot/LC_MESSAGES/elfutils.mo': '33c6cda39c2145463dfdb2eb849922dbf6ccf51a9e4bfa8fd757744712d9abfa', 'usr/share/locale/es/LC_MESSAGES/elfutils.mo': '1ebff7e5583759b3f08eb5caaf18dd1a6ed6eb5ec71a02502ed8e21b134ad54f', 'usr/share/locale/ja/LC_MESSAGES/elfutils.mo': '764ed859f3aebd861da0b73c69da4d72d0f252952bb3be1c9c66360258a1661c', 'usr/share/locale/pl/LC_MESSAGES/elfutils.mo': '8abb000f43024994a9ec3032b52eb10858e004b81bc61c7ceea96f7467d13fdd', 'usr/share/locale/uk/LC_MESSAGES/elfutils.mo': 'ce0d747f478ee91a1cdef66bfd1e230a3ff1e787358f4c6e1ffb6513df713117'}

def stage(root, cache=None):
    cache = cache or Path(__file__).resolve().parents[1]/'downloads/native-packages-20261008'
    cache.mkdir(parents=True, exist_ok=True)
    records = []
    for name, directory, sha in PACKAGES:
        base = directory if directory.startswith('https://') else 'https://deb.debian.org/debian/pool/main/'+directory
        url = base+'/'+name
        package = cache/name
        if not package.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != sha:
                raise ValueError('Package checksum mismatch: '+name)
            package.write_bytes(data)
        if hashlib.sha256(package.read_bytes()).hexdigest() != sha:
            raise ValueError('Package checksum mismatch: '+name)
        members = subprocess.check_output(['ar', 't', str(package)], text=True).splitlines()
        member = next(m for m in members if m.startswith('data.tar'))
        payload = subprocess.check_output(['ar', 'p', str(package), member])
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)
            with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
                archive.extractall(source, filter='data')
            if name.startswith('ca-certificates'):
                certificates = sorted((source/'usr/share/ca-certificates/mozilla').glob('*.crt'))
                if len(certificates) < 50:
                    raise ValueError('Incomplete CA bundle')
                target = root/'etc/ssl/certs/ca-certificates.crt'
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(b'\n'.join(p.read_bytes() for p in certificates)+b'\n')
                target.chmod(0o644)
                cert_link = root/'usr/lib/ssl/cert.pem'
                cert_link.parent.mkdir(parents=True, exist_ok=True)
                if not cert_link.exists() and not cert_link.is_symlink():
                    cert_link.symlink_to('../../../etc/ssl/certs/ca-certificates.crt')
                selected = [source/'usr/share/doc/ca-certificates/copyright']
            else:
                selected = [p for p in (source/'usr').rglob('*') if p.is_file() or p.is_symlink()]
            # The packet-capture utility is not used by the runtime. Keep it in
            # the pinned package cache rather than enlarging the boot ramdisk.
            excluded = ['usr/bin/btmon'] if name.startswith('bluez_') else []
            selected = [p for p in selected if str(p.relative_to(source)) not in excluded]
            for path in selected:
                target = root/path.relative_to(source)
                target.parent.mkdir(parents=True, exist_ok=True)
                if path.is_symlink():
                    if target.exists() or target.is_symlink():
                        if not target.is_symlink():
                            raise ValueError('Conflicting package link: '+str(target))
                        # The reference runtime ships the compatibility link
                        # for libelf 0.194.  The pinned 0.196 package keeps the
                        # same ABI name but points it at the newer SONAME.
                        # Replace that one known compatibility link while
                        # retaining the strict conflict checks for everything
                        # else.
                        if target.readlink() != path.readlink():
                            if str(target.relative_to(root)) != 'usr/lib/aarch64-linux-gnu/libelf.so.1':
                                raise ValueError('Conflicting package link: '+str(target))
                            target.unlink()
                            target.symlink_to(path.readlink())
                    else:
                        target.symlink_to(path.readlink())
                else:
                    if target.exists() and target.read_bytes() != path.read_bytes():
                        expected = REPLACES.get(str(path.relative_to(source)))
                        if not expected or hashlib.sha256(target.read_bytes()).hexdigest() != expected:
                            raise ValueError('Conflicting package file: '+str(target))
                    shutil.copyfile(path, target)
                    target.chmod(path.stat().st_mode & 0o777)
        records.append({'file': name, 'url': url, 'sha256': sha, 'excluded': excluded})
    record = root/'usr/share/vulpes/runtime-packages.json'
    record.parent.mkdir(parents=True, exist_ok=True)
    record.write_text(json.dumps(records, indent=2)+'\n')
    return records
