#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage a private Debian ARMhf Firefox experiment; does not contact a phone.

Extracts authenticated packages without running their installation scripts.
This is a diagnostic runtime, not an installable Debian system or Vulpes ROM.
"""
import hashlib
import argparse
import json
import lzma
import os
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'out/beatles/gecko-armhf'


def relative_sysroot_links(root):
    changed = []
    for path in root.rglob('*'):
        if not path.is_symlink():
            continue
        target = path.readlink()
        if not target.is_absolute():
            continue
        relative = os.path.relpath(root / str(target).lstrip('/'), path.parent)
        path.unlink()
        path.symlink_to(relative)
        changed.append(str(path.relative_to(root)))
    return changed


def fetch(url, path, expected=None):
    if not path.exists():
        with urllib.request.urlopen(url, timeout=60) as response:
            path.write_bytes(response.read())
    data = path.read_bytes()
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError('SHA256 mismatch: ' + str(path))
    return data


def fields(text):
    result = {}
    key = None
    for line in text.splitlines():
        if line.startswith(' ') and key:
            result[key] += '\n' + line
        elif ': ' in line:
            key, value = line.split(': ', 1)
            result[key] = value
    return result


def main():
    global ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT)
    parser.add_argument('--development', action='store_true', help='Stage ARMhf headers/libraries for cross-compilation')
    parser.add_argument('--package', action='append', default=[], help='Additional authenticated ARMhf package')
    args = parser.parse_args()
    ROOT = args.output.resolve()
    for sub in ('metadata', 'packages', 'rootfs'):
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    metadata = ROOT / 'metadata'
    keys = b''
    for key in ('archive-key-11-security', 'archive-key-12', 'archive-key-12-security', 'release-12',
                'archive-key-13', 'archive-key-13-security', 'release-13'):
        keys += fetch('https://ftp-master.debian.org/keys/' + key + '.asc', metadata / (key + '.asc'))
    keyring = metadata / 'debian.gpg'
    keyring.write_bytes(subprocess.check_output(['gpg', '--batch', '--dearmor'], input=keys))
    packages = {}
    for label, base, suite in (
        ('base', 'https://deb.debian.org/debian', 'bookworm'),
        ('security', 'https://security.debian.org/debian-security', 'bookworm-security'),
    ):
        release = metadata / (label + '-InRelease')
        data = fetch(base + '/dists/' + suite + '/InRelease', release)
        subprocess.run(['gpgv', '--keyring', str(keyring), str(release)], check=True)
        relative = 'main/binary-armhf/Packages.xz'
        section = data.decode().split('\nSHA256:\n', 1)[1]
        expected = next(line.split()[0] for line in section.splitlines()
                        if len(line.split()) == 3 and line.split()[2] == relative)
        index = fetch(base + '/dists/' + suite + '/' + relative,
                      metadata / (label + '-Packages.xz'), expected)
        for paragraph in lzma.decompress(index).decode().split('\n\n'):
            entry = fields(paragraph)
            if 'Package' in entry:
                entry['_base'] = base
                packages[entry['Package']] = entry
    # One release plus its security pocket. Only mandatory dependencies;
    # preserve the chosen closure so dependency choices can be audited.
    providers = {}
    for name, entry in packages.items():
        for provided in entry.get('Provides', '').split(','):
            virtual = provided.strip().split(' ')[0]
            providers.setdefault(virtual, name)
    selected = {}

    def choose(name):
        if name in selected:
            return
        entry = packages[name]
        selected[name] = entry
        for key in ('Pre-Depends', 'Depends'):
            for group in entry.get(key, '').split(','):
                if not group.strip():
                    continue
                alternatives = [re.split(r'[ :(]', alt.strip(), maxsplit=1)[0]
                                for alt in group.split('|')]
                candidate = next((alt if alt in packages else providers.get(alt)
                                  for alt in alternatives if alt in packages or alt in providers), None)
                if not candidate:
                    raise RuntimeError('Unresolved dependency: ' + group)
                choose(candidate)

    if args.development:
        for name in ('libgtk-3-dev', 'libdbus-glib-1-dev', 'libasound2-dev',
                     'libpulse-dev', 'libx11-xcb-dev', 'libdrm-dev', 'libgbm-dev',
                     'libxt-dev', 'libstdc++-12-dev', 'libc6-dev', 'libzstd-dev',
                     'zlib1g-dev', 'libgcc-12-dev'):
            choose(name)
    else:
        choose('firefox-esr')
        choose('fonts-dejavu-core')
    for name in args.package:
        choose(name)
    lock = {'purpose': 'ARMv7 compatibility experiment, no ROM',
            'version': selected.get('firefox-esr', {}).get('Version'), 'architecture': 'armhf',
            'packageScriptsExecuted': False, 'packages': []}
    print('Firefox:', lock['version'], 'packages:', len(selected), flush=True)
    for name, entry in sorted(selected.items()):
        url = entry['_base'] + '/' + entry['Filename']
        archive = ROOT / 'packages' / Path(entry['Filename']).name
        fetch(url, archive, entry['SHA256'])
        members = subprocess.check_output(['ar', 't', str(archive)], text=True).splitlines()
        member = next(m for m in members if m.startswith('data.tar'))
        data = subprocess.check_output(['ar', 'p', str(archive), member])
        subprocess.run(['bsdtar', '--no-same-owner', '-xf', '-', '-C', str(ROOT / 'rootfs')], input=data, check=True)
        lock['packages'].append({'name': name, 'version': entry['Version'],
                                 'sha256': entry['SHA256'], 'url': url,
                                 'depends': entry.get('Depends', '')})
        print(name, flush=True)
    if args.development:
        lock['relativeSysrootLinks'] = relative_sysroot_links(ROOT / 'rootfs')
    (ROOT / 'runtime-lock.json').write_text(json.dumps(lock, indent=2) + '\n')
    if args.development:
        return
    with tarfile.open(ROOT / 'runtime.tar.gz', 'w:gz', compresslevel=1) as archive:
        for relative in ('lib/arm-linux-gnueabihf', 'lib/ld-linux-armhf.so.3',
                         'usr/lib/arm-linux-gnueabihf', 'usr/lib/firefox-esr',
                         'etc/fonts', 'usr/share/fonts', 'usr/share/fontconfig'):
            archive.add(ROOT / 'rootfs' / relative, arcname=relative)
    with (ROOT / 'runtime.tar.gz').open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    (ROOT / 'runtime-archive.json').write_text(json.dumps({
        'sha256': digest, 'bytes': (ROOT / 'runtime.tar.gz').stat().st_size,
        'gecko': lock['version'], 'architecture': 'armhf'}, indent=2) + '\n')


if __name__ == '__main__':
    main()
