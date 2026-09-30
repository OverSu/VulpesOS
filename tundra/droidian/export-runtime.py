#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Export package-owned runtime files for an offline ARM64 chroot experiment.

This is a reference snapshot, not a Debian installation or a bootable rootfs.
Package scripts and host configuration are deliberately not imported.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile

ROOT_PACKAGES = '''bash coreutils util-linux libc-bin python3 systemd systemd-sysv
udev dbus dbus-user-session libpam-systemd kbd phoc libhybris lxc lxc-android
halium-wrappers libgtk-3-0t64 libasound2t64 libdbus-glib-1-2 libxt6t64 libnss3
librsvg2-common shared-mime-info locales'''.split()


def installed_packages():
    fields = ['binary:Package', 'Version', 'Architecture', 'db:Status-Abbrev',
              'Depends', 'Pre-Depends', 'Provides', 'source:Package', 'source:Version']
    output = subprocess.check_output(['dpkg-query', '-W', '-f',
        '\t'.join('${'+f+'}' for f in fields)+'\n'], text=True)
    return {p[0]: dict(zip(fields, p)) for line in output.splitlines()
            if len(p := line.split('\t')) == len(fields) and p[3].startswith('ii')}


def dependency(token):
    match = re.fullmatch(r'\s*([a-z0-9+.-]+)(?::([a-z0-9-]+))?'
                         r'\s*(?:\((<<|<=|=|>=|>>)\s*([^ )]+)\))?\s*', token)
    if not match:
        raise ValueError('Unsupported dependency: '+token)
    return match.groups()


def closure(packages, roots):
    providers = {}
    for name, package in sorted(packages.items()):
        base = name.split(':')[0]
        providers.setdefault(base, []).append((name, package['Version']))
        for token in package['Provides'].split(','):
            if token.strip():
                virtual, _, _, version = dependency(token)
                providers.setdefault(virtual, []).append((name, version))

    def resolve(expression):
        for alternative in expression.split('|'):
            name, arch, op, version = dependency(alternative)
            candidates = sorted(providers.get(name, []),
                                key=lambda item: item[0].split(':')[0] != name)
            for candidate, provided_version in candidates:
                if arch not in (None, 'any', 'native', packages[candidate]['Architecture']):
                    continue
                if op and (not provided_version or subprocess.run(
                        ['dpkg', '--compare-versions', provided_version, op, version],
                        check=False).returncode):
                    continue
                return candidate
        raise ValueError('No installed provider: '+expression)

    pending = [resolve(root) for root in roots]
    result = {}
    while pending:
        name = pending.pop()
        if name in result:
            continue
        package = dict(packages[name])
        deps = [resolve(expr) for key in ('Pre-Depends', 'Depends')
                for expr in package[key].split(',') if expr.strip()]
        package['resolvedDependencies'] = deps
        result[name] = package
        pending.extend(deps)
    return dict(sorted(result.items()))


def allowed(path):
    parts = PurePosixPath(path).parts
    return (len(parts) > 2 and parts[0] == '/' and '..' not in parts
            and parts[1] in ('usr', 'bin', 'sbin', 'lib', 'lib64')
            and parts[1:3] != ('usr', 'local'))


def export(output, packages):
    output.mkdir(parents=True, exist_ok=False)
    files = {}
    for name in packages:
        for path in subprocess.check_output(['dpkg-query', '-L', name], text=True).splitlines():
            if allowed(path):
                files.setdefault(path, []).append(name)
    manifest = {'scope': __doc__, 'architecture': 'arm64', 'roots': ROOT_PACKAGES,
                'packages': packages, 'files': {}, 'missing': []}
    with tarfile.open(output/'runtime.tar', 'w') as tar:
        for path, owners in sorted(files.items()):
            source = Path(path)
            if not source.exists() and not source.is_symlink():
                manifest['missing'].append(path)
                continue
            if source.is_dir() and not source.is_symlink():
                continue
            info = tar.gettarinfo(path, arcname=path.lstrip('/'))
            if not info.isfile() and not info.issym():
                raise ValueError('Unexpected package file type: '+path)
            info.uid = info.gid = 0
            info.uname = info.gname = 'root'
            info.mode &= ~0o6000  # No setuid/setgid programs in this reference snapshot.
            record = {'packages': owners, 'mode': info.mode}
            if info.isfile():
                with source.open('rb') as stream:
                    record['sha256'] = hashlib.file_digest(stream, 'sha256').hexdigest()
                    stream.seek(0)
                    tar.addfile(info, stream)
            else:
                record['symlink'] = info.linkname
                tar.addfile(info)
            manifest['files'][path] = record
    with (output/'runtime.tar').open('rb') as stream:
        manifest['archiveSha256'] = hashlib.file_digest(stream, 'sha256').hexdigest()
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps({'packages': len(packages), 'files': len(manifest['files']),
                      'missing': manifest['missing'], 'archiveSha256': manifest['archiveSha256']}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--with-network', action='store_true',
                        help='Include NetworkManager and wpa_supplicant, without saved connections')
    parser.add_argument('--with-hardware', action='store_true',
                        help='Include oFono, PulseAudio and gst-droid, without personal configuration')
    args = parser.parse_args()
    if os.geteuid() == 0:
        parser.error('Run as the unprivileged device user')
    if subprocess.check_output(['dpkg', '--print-architecture'], text=True).strip() != 'arm64':
        parser.error('Expected the ARM64 reference device')
    if args.with_network:
        ROOT_PACKAGES.extend(['network-manager', 'wpasupplicant'])
    if args.with_hardware:
        ROOT_PACKAGES.extend(['ofono', 'pulseaudio', 'pulseaudio-utils',
                              'pulseaudio-modules-droid-jb2q', 'pulseaudio-modules-droid-hidl',
                              'gstreamer1.0-droid', 'bluebinder', 'libgbinder-radio',
                              'libgbinder-tools',
                              'libofonobinderpluginext', 'ofono-binder-plugin',
                              'ofono-configs-binder-common', 'ofono-scripts', 'ofono2mm',
                              'pulseaudio-config-droid', 'droidian-camera',
                              'qt5-cameraplugin-aal', 'libhybris'])
    packages = closure(installed_packages(), ROOT_PACKAGES)
    export(args.output, packages)


if __name__ == '__main__':
    main()
