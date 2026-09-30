#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Sargo key events and fixed backlight/volume controls; no general command API."""
import json
import os
from pathlib import Path
import selectors
import socket
import struct
import subprocess
import sys
import time
import uuid

SOCKET = Path('/run/tundra-buttons/control.sock')
EVENTS = SOCKET.with_name('events.json')
BACKLIGHT = Path('/sys/class/backlight/panel0-backlight')
KEYS = {116: 'sleep', 115: 'volume-up', 114: 'volume-down'}
INPUT = struct.Struct('@llHHi')

def key_event(kind, code, value):
    if kind != 1 or code not in KEYS or value not in (0, 1):
        return None
    return KEYS[code] + '-button-' + ('press' if value else 'release')

VIBRATOR = Path('/sys/class/leds/vibrator')

# This kernel routes DRV2624 start/stop through LED brightness. The legacy
# activate/duration attributes do not reliably stop the physical motor.
class Vibration:
    def __init__(self):
        self.steps = []
        self.deadline = None

    def start(self, pattern):
        if (not isinstance(pattern, list) or len(pattern) > 32 or
            any(type(n) is not int or not 0 <= n <= 10000 for n in pattern) or
            sum(pattern) > 10000):
            raise ValueError('INVALID_VIBRATION')
        self.steps = list(enumerate(pattern))
        self.deadline = None
        (VIBRATOR/'brightness').write_text('0')
        self.advance(time.monotonic())

    def advance(self, now):
        if self.deadline is not None and now < self.deadline:
            return
        self.deadline = None
        while self.steps:
            index, duration = self.steps.pop(0)
            if not duration:
                continue
            if index % 2 == 0:
                (VIBRATOR/'brightness').write_text('255')
            else:
                (VIBRATOR/'brightness').write_text('0')
            self.deadline = now + duration / 1000
            return
        (VIBRATOR/'brightness').write_text('0')

vibration = Vibration()

def control(p):
    if p.get('operation') == 'screen':
        enabled, level = p.get('enabled'), p.get('level')
        if type(enabled) is not bool or type(level) not in (int, float) or not 0 <= level <= 1:
            raise ValueError('INVALID_SCREEN')
        maximum = int((BACKLIGHT/'max_brightness').read_text())
        (BACKLIGHT/'brightness').write_text(str(max(1, round(maximum * level)) if enabled else 0))
    elif p.get('operation') == 'vibrate':
        vibration.start(p.get('pattern'))
    elif p.get('operation') == 'volume':
        level = p.get('level')
        if type(level) not in (int, float) or not 0 <= level <= 1:
            raise ValueError('INVALID_VOLUME')
        env = {**os.environ, 'XDG_RUNTIME_DIR': '/run/user/32011',
               'PULSE_SERVER': 'unix:/run/user/32011/pulse/native'}
        subprocess.run(['/usr/bin/pactl',
                        'set-sink-volume', '@DEFAULT_SINK@', str(round(level*100))+'%'],
                       env=env, user=32011, group=32011, extra_groups=[], check=True, timeout=3, capture_output=True)
    elif p.get('operation') == 'power' and p.get('action') in ('reboot', 'poweroff'):
        subprocess.run(['/usr/bin/systemctl', '--no-block', p['action']], check=True, timeout=3, capture_output=True)
    else:
        raise ValueError('NOT_SUPPORTED')
    return True

def serve():
    SOCKET.parent.mkdir(parents=True, exist_ok=True)
    SOCKET.unlink(missing_ok=True)
    state = {'session': str(uuid.uuid4()), 'sequence': 0, 'events': []}
    def publish():
        state['recordedAt'] = time.time()
        temporary = EVENTS.with_suffix('.tmp')
        temporary.write_text(json.dumps(state))
        temporary.chmod(0o644)
        temporary.replace(EVENTS)
    publish()
    with selectors.DefaultSelector() as selector, socket.socket(socket.AF_UNIX) as server:
        server.bind(str(SOCKET)); SOCKET.chmod(0o660)
        import grp
        os.chown(SOCKET, 0, grp.getgrnam('droidian').gr_gid)
        server.listen(8); selector.register(server, selectors.EVENT_READ)
        for device in Path('/sys/class/input').glob('event*'):
            if (device/'device/name').read_text().strip() not in ('qpnp_pon', 'gpio-keys'):
                continue
            fd = os.open('/dev/input/'+device.name, os.O_RDONLY | os.O_NONBLOCK)
            selector.register(fd, selectors.EVENT_READ)
        while True:
            timeout = max(0, min(1, vibration.deadline - time.monotonic())) if vibration.deadline is not None else 1
            for key, _ in selector.select(timeout):
                if key.fileobj is server:
                    conn, _ = server.accept()
                    with conn:
                        conn.settimeout(2)
                        try:
                            raw = conn.makefile('rb').readline(1024)
                            result = control(json.loads(raw))
                            reply = {'ok': True, 'result': result}
                        except Exception:
                            reply = {'ok': False, 'error': 'HARDWARE_REQUEST_FAILED'}
                        conn.sendall((json.dumps(reply)+'\n').encode())
                else:
                    data = os.read(key.fd, INPUT.size*64)
                    for offset in range(0, len(data), INPUT.size):
                        _, _, kind, code, value = INPUT.unpack_from(data, offset)
                        event = key_event(kind, code, value)
                        if event:
                            # Always allow a physical press to recover a black display,
                            # even if Gaia has stopped responding.
                            if code == 116 and value == 1 and int((BACKLIGHT/'brightness').read_text()) == 0:
                                control({'operation':'screen', 'enabled':True, 'level':0.5})
                            state['sequence'] += 1
                            state['events'].append({'id':state['sequence'], 'type':event})
                            state['events'] = state['events'][-64:]
            if vibration.deadline is not None:
                vibration.advance(time.monotonic())
            publish()

def client():
    raw = sys.stdin.read(1024)
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(5); sock.connect(str(SOCKET))
        sock.sendall(raw.encode()+b'\n')
        print(sock.makefile('r').readline(2048).strip())

if __name__ == '__main__':
    if '--stop-vibration' in sys.argv:
        (VIBRATOR/'brightness').write_text('0')
    elif '--client' in sys.argv:
        client()
    else:
        try:
            (VIBRATOR/'brightness').write_text('0')
            serve()
        finally:
            (VIBRATOR/'brightness').write_text('0')
