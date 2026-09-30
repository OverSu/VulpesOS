#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Check the ARM64 reference in a private mount namespace, without starting services."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote


def run(*args, check=True):
    result = subprocess.run(args, check=False, capture_output=True, text=True, timeout=45)
    if check and result.returncode:
        raise RuntimeError(f'{args}: {result.stderr.strip()}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--product', type=Path, required=True)
    parser.add_argument('--inside-namespace', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('chroot and the private mount namespace require administrator privileges')
    root, product = args.root.resolve(), args.product.resolve()
    base = Path('/home/droidian/vulpes-tundra-tests')
    for path in (root, product):
        if not path.is_relative_to(base) or path == base:
            parser.error('Expected isolated device trial directories')
    if not (root.parent/(root.name+'-stage.json')).is_file():
        parser.error('Staging report missing')
    if not args.inside_namespace:
        result = subprocess.run(['unshare', '--mount', '--net', '--fork', sys.executable,
            str(Path(__file__).resolve()), '--inside-namespace', '--root', str(root),
            '--product', str(product)], check=False)
        raise SystemExit(result.returncode)
    if os.readlink('/proc/self/ns/mnt') == os.readlink('/proc/1/ns/mnt'):
        parser.error('Refusing to mount in the system namespace')
    run('mount', '--make-rprivate', '/')
    run('mount', '--bind', str(product), str(root/'opt/vulpes'))
    run('mount', '-o', 'remount,bind,ro', str(root/'opt/vulpes'))
    run('mount', '-t', 'proc', 'proc', str(root/'proc'))
    for name in ('null', 'urandom', 'random'):
        (root/'dev'/name).touch(exist_ok=True)
        run('mount', '--bind', '/dev/'+name, str(root/'dev'/name))
    for name in ('run', 'tmp'):
        run('mount', '-t', 'tmpfs', '-o', 'mode=1777,size=128m', 'tmpfs', str(root/name))
    os.chown(root/'home/vulpes', 1000, 1000)
    profile = root/'home/vulpes/render-profile'
    profile.mkdir(exist_ok=True)
    os.chown(profile, 1000, 1000)
    (root/'home/vulpes/render.png').unlink(missing_ok=True)
    run('chroot', str(root), '/sbin/ldconfig')
    compiler = '/usr/lib/aarch64-linux-gnu/glib-2.0/glib-compile-schemas'
    run('chroot', str(root), compiler, '/usr/share/glib-2.0/schemas')
    engine = json.loads((product/'engine-lock.json').read_text())['version']
    binary = f'/opt/vulpes/engines/{engine}/firefox/firefox'
    commands = {
        'python': ['/usr/bin/python3', '-c', 'import platform,ssl,json; print(json.dumps({"machine":platform.machine(),"python":platform.python_version(),"ssl":ssl.OPENSSL_VERSION}))'],
        'compositor': ['/usr/bin/phoc', '--version'],
        'gecko': [binary, '--headless', '--version'],
        'geckoRendering': [binary, '--headless', '--no-remote',
            '--profile', '/home/vulpes/render-profile', '--window-size', '360,740',
            '--screenshot', '/home/vulpes/render.png',
            'data:text/html,'+quote('<!doctype html><meta charset="utf-8"><title>Tundra runtime check</title><body style="background:#123456;color:white">Gecko runtime qualification</body>')],
        'geckoLibraries': ['/usr/bin/ldd', binary],
        'compositorLibraries': ['/usr/bin/ldd', '/usr/bin/phoc'],
    }
    results = {}
    for name, command in commands.items():
        result = run('chroot', '--userspec=1000:1000', str(root), '/usr/bin/env', '-i',
                     'HOME=/home/vulpes', 'PATH=/usr/bin:/bin:/usr/sbin:/sbin',
                     'LANG=C', *command, check=False)
        results[name] = {'command': command, 'returncode': result.returncode,
                         'stdout': result.stdout, 'stderr': result.stderr}
    report = {'scope': 'Offline non-root chroot programs; not a boot, HAL or graphical qualification',
              'engine': engine, 'uid': 1000, 'commands': results, 'sandboxQualified': False,
              'passed': all(r['returncode'] == 0 and 'not found' not in r['stdout']
                            for r in results.values())}
    screenshot = root/'home/vulpes/render.png'
    if screenshot.is_file():
        data = screenshot.read_bytes()
        report['render'] = {'sha256': hashlib.sha256(data).hexdigest(),
                            'width': int.from_bytes(data[16:20], 'big'),
                            'height': int.from_bytes(data[20:24], 'big')}
        report['passed'] &= (data.startswith(b'\x89PNG\r\n\x1a\n') and
                             report['render']['width'] == 360 and report['render']['height'] == 740)
    else:
        report['passed'] = False
    path = root.parent/'chroot-check.json'
    path.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2), flush=True)
    if not report['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
