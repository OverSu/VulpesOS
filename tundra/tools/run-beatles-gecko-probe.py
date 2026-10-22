#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Run the offline Gecko probe in a previously staged private Nokia runtime."""
import argparse
import json
from pathlib import Path
import subprocess
import time
from kaios_debug import KaiOSDebugger

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out/beatles/gecko-armhf'
REMOTE = '/data/local/tmp/vulpes-gecko-armhf'


def main():
    global OUT, REMOTE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('version', 'render'))
    parser.add_argument('--engine', choices=('153.5.0esr', '156.0.1'), default='153.5.0esr')
    args = parser.parse_args()
    if args.engine == '156.0.1':
        OUT = ROOT / 'out/beatles/gecko-156.0.1'
        REMOTE = '/data/local/vulpes-beatles'
    rows = subprocess.check_output(['adb', 'devices', '-l'], text=True).splitlines()
    devices = [r.split()[0] for r in rows if len(r.split()) > 2
               and r.split()[1] == 'device' and 'model:Nokia_2720_Flip' in r.split()]
    if len(devices) != 1:
        raise RuntimeError('Exactly one connected Nokia is required')
    adb = ['adb', '-s', devices[0]]
    if subprocess.check_output(adb + ['shell', 'getprop ro.product.codename'], text=True).strip() != 'beatles':
        raise RuntimeError('Unexpected device')
    command = ['clang', '--target=armv7-linux-gnueabihf', '-march=armv7-a',
               '-marm', '-mfloat-abi=soft', '-fuse-ld=lld', '-Os', '-ffreestanding',
               '-fno-builtin', '-fno-stack-protector', '-fno-pie', '-fno-unwind-tables',
               '-fno-asynchronous-unwind-tables', '-Wall', '-Wextra', '-Werror',
               '-nostdlib', '-static', '-Wl,--build-id=none', '-Wl,-e,_start',
               str(ROOT / 'probes/armv7-gecko-launch.c'), '-o', str(OUT / 'gecko-probe-launcher')]
    if args.engine == '156.0.1':
        command += ['-DROOT="' + REMOTE + '/rootfs"', '-DGECKO="/opt/firefox/firefox"']
    subprocess.run(command, check=True)
    subprocess.run(adb + ['shell', 'mkdir -p ' + REMOTE + '/rootfs/work'], check=True, capture_output=True)
    for local, relative in ((OUT / 'gecko-probe-launcher', 'gecko-probe-launcher'),
                            (ROOT / 'devices/beatles/run-gecko-test.sh', 'probe-run.sh'),
                            (ROOT / 'devices/beatles/gecko-test.html', 'rootfs/work/test.html')):
        subprocess.run(adb + ['push', str(local), REMOTE + '/' + relative], check=True, capture_output=True)
    subprocess.run(adb + ['shell', 'chmod 755 ' + REMOTE + '/gecko-probe-launcher; rm -f '
                         + REMOTE + '/' + args.mode + '.exit'], check=True, capture_output=True)
    with KaiOSDebugger(devices[0]) as client:
        console = client.request('root', 'getProcess', id=0)['form']['consoleActor']
        script_args = [REMOTE + '/probe-run.sh', args.mode, args.engine]
        script = '''(function(){var Cc=Components.classes,Ci=Components.interfaces;
          var f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);f.initWithPath("/system/bin/sh");
          var p=Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);p.init(f);
          var args=%s;p.runAsync(args,args.length,null,false);return "started";})()''' % json.dumps(script_args)
        print(client.evaluate(console, script), flush=True)
    for _ in range(75):
        result = subprocess.check_output(adb + ['shell', 'cat ' + REMOTE + '/' + args.mode + '.exit'], text=True).strip()
        if result.isdigit():
            log = subprocess.check_output(adb + ['shell', 'cat ' + REMOTE + '/' + args.mode + '.log'], text=True)
            (OUT / (args.mode + '.log')).write_text(log)
            (OUT / (args.mode + '-result.json')).write_text(json.dumps({'exitCode': int(result),
                'mode': args.mode, 'device': 'beatles', 'engine': args.engine, 'offline': True}, indent=2) + '\n')
            print(log, flush=True)
            print('Exit:', result, flush=True)
            if result == '0' and args.mode == 'render':
                subprocess.run(adb + ['pull', REMOTE + '/rootfs/work/gecko.png', str(OUT / 'gecko.png')],
                               check=True, capture_output=True)
            raise SystemExit(int(result))
        time.sleep(1)
    raise RuntimeError('No completion marker; inspect owned diagnostic process before retrying')


if __name__ == '__main__':
    main()
