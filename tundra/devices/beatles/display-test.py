#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
import os
from pathlib import Path
import subprocess
import time

os.umask(0o022)
with Path('/work/xorg-console.log').open('w') as log:
    server = subprocess.Popen(['/usr/lib/xorg/Xorg', ':0', 'vt1',
        '-config', '/etc/X11/xorg.conf', '-logfile', '/work/Xorg.log',
        '-nolisten', 'tcp', '-ac', '-noreset', '-novtswitch', '-sharevts'],
        stdout=log, stderr=subprocess.STDOUT)
    try:
        for attempt in range(40):
            if server.poll() is not None:
                raise RuntimeError('Xorg exited: ' + str(server.returncode))
            if Path('/tmp/.X11-unix/X0').exists():
                break
            time.sleep(0.1)
        with Path('/work/keypad.log').open('w') as keys, Path('/work/x11-test.log').open('w') as client_log:
            keypad = subprocess.Popen(['/work/keypad'], stdout=keys, stderr=subprocess.STDOUT)
            try:
                client = subprocess.Popen(['/work/x11-test'], stdout=client_log, stderr=subprocess.STDOUT)
                time.sleep(2)
                subprocess.run(['/work/keypad','--self-test'],check=True)
                print('X11 client exit:', client.wait(timeout=28), flush=True)
            finally:
                keypad.terminate()
                keypad.wait(timeout=2)
    finally:
        server.terminate()
        try:
            server.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
