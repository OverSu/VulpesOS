#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Route modem calls through the Droid audio HAL; never dial or record audio.

Profile/parking sequence: mer-hybris/pulseaudio-modules-droid README.
Only the physical earpiece is selected automatically, never the loudspeaker.
"""
import importlib.util
import json
import os
import re
import socket
import struct
import sys
from pathlib import Path
import subprocess
import time


def names(items):
    return set(items) if isinstance(items, dict) else {p['name'] for p in items}


def parse_devices(text):
    """Read pactl's C-locale listing, including PulseAudio versions before JSON."""
    devices, current, section = [], None, None
    scalar = {'Name':'name', 'Owner Module':'owner_module', 'Active Profile':'active_profile',
              'Active Port':'active_port', 'Mute':'mute'}
    for line in text.splitlines():
        header = re.fullmatch(r'(?:Card|Sink|Source|Sink Input) #(\d+)', line)
        if header:
            current = {'index':int(header[1]), 'ports':{}, 'profiles':{}, 'properties':{}}
            devices.append(current); section = None
        elif current is not None and line.startswith('\t') and not line.startswith('\t\t'):
            key, separator, value = line.strip().partition(':')
            section = key.lower() if key in ('Ports', 'Profiles', 'Properties') else None
            if key in scalar and separator:
                value = value.strip()
                if key == 'Owner Module': value = int(value)
                elif key == 'Mute': value = value == 'yes'
                current[scalar[key]] = value
        elif current is not None and line.startswith('\t\t') and not line.startswith('\t\t\t'):
            value = line.strip()
            if section in ('ports', 'profiles') and ':' in value:
                current[section][value.split(':', 1)[0]] = {}
            elif section == 'properties' and ' = ' in value:
                key, value = value.split(' = ', 1)
                current['properties'][key] = value.strip('"')
    return devices


def pactl(*args):
    result = subprocess.run(
        ['/usr/bin/pactl', *args], capture_output=True, text=True, timeout=5,
        user=32011, group=32011, extra_groups=[],
        env={**os.environ, 'XDG_RUNTIME_DIR':'/run/user/32011',
             'PULSE_SERVER':'unix:/run/user/32011/pulse/native', 'LC_ALL':'C'})
    if result.returncode:
        raise RuntimeError('CALL_AUDIO_COMMAND_FAILED')
    return result.stdout


class CallAudio:
    def __init__(self, command=pactl):
        self.command = command
        self.saved = None
        self.active = False
        self.speaker = False
        self.muted = False
        self.volume = 0.6

    def devices(self, kind):
        return parse_devices(self.command('list', kind))

    def enter(self):
        if self.active:
            return
        if self.saved is not None:
            self.leave()
        card = next((c for c in self.devices('cards')
                     if c['name'] == 'droid_card.primary' and 'voicecall' in names(c['profiles'])), None)
        if card is None:
            raise RuntimeError('CALL_AUDIO_CARD_UNAVAILABLE')
        sinks = self.devices('sinks')
        sink = next((s for s in sinks if s.get('owner_module') == card['owner_module'] and
                     'output-earpiece' in names(s['ports']) and 'output-parking' in names(s['ports'])), None)
        source = next((s for s in self.devices('sources') if s['name'] == 'source.droid'), None)
        if sink is None or source is None:
            raise RuntimeError('CALL_AUDIO_EARPIECE_UNAVAILABLE')
        self.saved = {'card':card['name'], 'profile':card['active_profile'],
                      'sink':sink['name'], 'port':sink['active_port'], 'sinkMute':sink['mute'],
                      'source':source['name'], 'sourceMute':source['mute']}
        try:
            self.command('set-card-profile', card['name'], 'voicecall')
            self.command('set-sink-port', sink['name'], 'output-parking')
            self.command('set-sink-port', sink['name'], 'output-earpiece')
            self.command('set-sink-mute', sink['name'], '0')
            self.command('set-source-mute', source['name'], '0')
            # voice_virtual_stream creates this HAL volume-control stream.
            for stream in self.devices('sink-inputs'):
                if stream.get('properties', {}).get('media.role') == 'phone':
                    self.command('set-sink-input-volume', str(stream['index']), str(round(self.volume * 100)) + '%')
            self.active = True
        except Exception:
            self.leave()
            raise

    def control(self, request):
        if not isinstance(request, dict) or set(request) - {'operation', 'speaker', 'muted', 'volume'}:
            raise ValueError('INVALID_AUDIO_REQUEST')
        if request.get('operation') == 'status':
            return {'active': self.active, 'speaker': self.speaker, 'muted': self.muted, 'volume': self.volume}
        if request.get('operation') != 'set' or not self.active:
            raise ValueError('CALL_AUDIO_NOT_ACTIVE')
        for key in ('speaker', 'muted'):
            if key in request and type(request[key]) is not bool:
                raise ValueError('INVALID_AUDIO_REQUEST')
        if 'volume' in request and (type(request['volume']) not in (int, float) or not 0 <= request['volume'] <= 1):
            raise ValueError('INVALID_AUDIO_REQUEST')
        if 'speaker' in request:
            port = 'output-speaker' if request['speaker'] else 'output-earpiece'
            sink = next((s for s in self.devices('sinks') if s['name'] == self.saved['sink']), None)
            if not sink or port not in names(sink['ports']):
                raise RuntimeError('CALL_AUDIO_PORT_UNAVAILABLE')
            self.command('set-sink-port', sink['name'], 'output-parking')
            self.command('set-sink-port', sink['name'], port)
            self.speaker = request['speaker']
        if 'muted' in request:
            self.command('set-source-mute', self.saved['source'], str(int(request['muted'])))
            self.muted = request['muted']
        if 'volume' in request:
            streams = [s for s in self.devices('sink-inputs') if s.get('properties', {}).get('media.role') == 'phone']
            if not streams:
                raise RuntimeError('CALL_AUDIO_VOLUME_UNAVAILABLE')
            for stream in streams:
                self.command('set-sink-input-volume', str(stream['index']), str(round(request['volume'] * 100)) + '%')
            self.volume = request['volume']
        return self.control({'operation': 'status'})

    def leave(self):
        if self.saved is None:
            return
        self.active = False
        state = self.saved
        self.command('set-card-profile', state['card'], state['profile'])
        self.command('set-sink-port', state['sink'], 'output-parking')
        self.command('set-sink-port', state['sink'], state['port'])
        self.command('set-sink-mute', state['sink'], str(int(state['sinkMute'])))
        self.command('set-source-mute', state['source'], str(int(state['sourceMute'])))
        self.saved = None
        self.speaker = False
        self.muted = False

    def update(self, calls):
        if any(c['state'] in ('dialing', 'alerting', 'active', 'held') for c in calls):
            self.enter()
        else:
            self.leave()


def main():
    spec = importlib.util.spec_from_file_location('radio', Path(__file__).with_name('radio-control.py'))
    radio = importlib.util.module_from_spec(spec); spec.loader.exec_module(radio)
    route = CallAudio()
    target = Path('/run/tundra-call-audio/status.json')
    path = target.with_name('control.sock')
    path.unlink(missing_ok=True)
    with socket.socket(socket.AF_UNIX) as server:
        server.bind(str(path))
        os.chown(path, 0, 32011)
        path.chmod(0o660)
        server.listen(4)
        server.settimeout(0.3)
        next_poll = 0
        while True:
            if time.monotonic() >= next_poll:
                try:
                    route.update(radio.request({'version':1, 'operation':'calls'}))
                    state = {**route.control({'operation':'status'}), 'error':None}
                except Exception as error:
                    state = {'active':route.active, 'error':str(error)}
                state.update(routed=route.active, recordedAt=time.time())
                tmp = target.with_suffix('.tmp'); tmp.write_text(json.dumps(state)); tmp.replace(target)
                next_poll = time.monotonic() + 1
            try:
                conn, _ = server.accept()
            except socket.timeout:
                continue
            with conn:
                conn.settimeout(2)
                try:
                    _, uid, _ = struct.unpack('3i', conn.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
                    if uid not in (0, 32011):
                        raise ValueError('PERMISSION_DENIED')
                    line = conn.makefile('rb').readline(1024)
                    if not line.endswith(b'\n'):
                        raise ValueError('INVALID_AUDIO_REQUEST')
                    result = {'result':route.control(json.loads(line))}
                except Exception as error:
                    result = {'error':str(error)}
                try:
                    conn.sendall((json.dumps(result)+'\n').encode())
                except OSError:
                    pass


def client():
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(8)
        sock.connect('/run/tundra-call-audio/control.sock')
        sock.sendall(sys.stdin.buffer.read(1024).rstrip(b'\n') + b'\n')
        print(sock.makefile('r').readline(4096))


if __name__ == '__main__':
    client() if '--client' in sys.argv else main()
