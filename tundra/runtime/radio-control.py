#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Small, allow-listed oFono broker used by the native Tundra session.

The Gaia process never receives access to the system D-Bus modem service.  The
root service accepts one JSON request per Unix-socket connection and invokes
only fixed oFono methods with validated values.  This keeps the diagnostic
image useful while avoiding a general purpose command bridge.
"""
import json
import importlib.util
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time

SOCKET = Path('/run/tundra-radio/radio.sock')
MODEM = '/ril_0'
NUMBER = re.compile(r'^[0-9+#*(), .-]{3,32}$')
VOICE = re.compile(r'^/ril_0/voicecall[0-9]+$')


def bus(*args):
    """Call one fixed system-bus method and return busctl's JSON data."""
    result = subprocess.run(
        ['/usr/bin/busctl', '--system', '--json=short', 'call', *args],
        capture_output=True, text=True, timeout=15, check=False,
    )
    if result.returncode:
        # Keep modem errors distinct from transport failures, without returning
        # command lines, phone numbers or subscriber identifiers to Gaia.
        detail = result.stderr.lower()
        if 'not registered' in detail or 'notregistered' in detail:
            raise RuntimeError('RADIO_NOT_REGISTERED')
        if 'in progress' in detail or 'inprogress' in detail or 'busy' in detail:
            raise RuntimeError('RADIO_BUSY')
        if 'not available' in detail or 'notavailable' in detail:
            raise RuntimeError('RADIO_NOT_READY')
        raise RuntimeError('RADIO_REQUEST_FAILED')
    # Successful void D-Bus methods (Hangup, Answer) produce no JSON in busctl.
    if not result.stdout.strip():
        return None
    try:
        payload = json.loads(result.stdout)
        return payload.get('data')
    except (ValueError, AttributeError):
        raise RuntimeError('INVALID_OFONO_REPLY')


def request(value):
    if not isinstance(value, dict) or value.get('version') != 1:
        raise ValueError('INVALID_REQUEST')
    operation = value.get('operation')
    if operation in ('incomingMessages','ackMessages','messageState'):
        spec = importlib.util.spec_from_file_location('inbox',Path(__file__).with_name('sms-inbox.py'))
        inbox = importlib.util.module_from_spec(spec);spec.loader.exec_module(inbox)
        if operation == 'messageState':
            path = value.get('path', '')
            if not isinstance(path,str) or not re.fullmatch(r'/ril_0/message[0-9a-f_]+',path):
                raise ValueError('INVALID_SMS_PATH')
            state = inbox.outgoing_state(path)
            if state is None:
                try:
                    props = bus('org.ofono',path,'org.ofono.Message','GetProperties')[0]
                    state = props.get('State',{}).get('data','unknown')
                except RuntimeError: state = 'unknown'
            return {'state':state if state in ('pending','sent','failed') else 'unknown'}
        return inbox.pending() if operation == 'incomingMessages' else inbox.acknowledge(value.get('ids'))
    if operation == 'calls':
        data = bus('org.ofono', MODEM, 'org.ofono.VoiceCallManager', 'GetCalls')
        calls = []
        for path, properties in data[0]:
            if not VOICE.fullmatch(path):
                continue
            def field(name):
                item = properties.get(name, {})
                return item.get('data') if isinstance(item, dict) else item
            state = field('State')
            if state not in ('dialing', 'alerting', 'active', 'held', 'incoming', 'waiting', 'disconnected'):
                continue
            calls.append({'path': path, 'state': state,
                          'number': str(field('LineIdentification') or '')[:80]})
        return calls
    if operation == 'status':
        return {
            'modem': bus('org.ofono', MODEM, 'org.ofono.Modem', 'GetProperties'),
            'registration': bus('org.ofono', MODEM, 'org.ofono.NetworkRegistration', 'GetProperties'),
        }
    if operation == 'dial':
        number = str(value.get('number', '')).strip()
        if not NUMBER.fullmatch(number):
            raise ValueError('INVALID_NUMBER')
        path = bus('org.ofono', MODEM, 'org.ofono.VoiceCallManager',
                   'Dial', 'ss', number, 'default')
        return {'path': path[0] if isinstance(path, list) and path else path,
                'startedAt': time.time()}
    if operation in ('hangup', 'answer'):
        path = value.get('path', '')
        if not isinstance(path, str) or not VOICE.fullmatch(path):
            raise ValueError('INVALID_CALL')
        bus('org.ofono', path, 'org.ofono.VoiceCall',
            'Hangup' if operation == 'hangup' else 'Answer')
        return {'path': path}
    if operation == 'sms':
        number = str(value.get('number', '')).strip()
        body = value.get('body', '')
        if not NUMBER.fullmatch(number) or not isinstance(body, str) or not body or len(body) > 1600:
            raise ValueError('INVALID_SMS')
        registration = bus('org.ofono', MODEM, 'org.ofono.NetworkRegistration', 'GetProperties')[0]
        if registration.get('Status',{}).get('data') not in ('registered','roaming'):
            raise RuntimeError('RADIO_NOT_REGISTERED')
        result = bus('org.ofono', MODEM, 'org.ofono.MessageManager',
                     'SendMessage', 'ss', number, body)
        return {'path': result[0] if isinstance(result, list) and result else result,
                'state':'pending', 'number': number, 'bodyLength': len(body), 'submittedAt': time.time()}
    raise ValueError('NOT_SUPPORTED')


def reply(stream, value):
    stream.write((json.dumps(value, separators=(',', ':')) + '\n').encode())
    stream.flush()


def serve():
    SOCKET.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    try:
        SOCKET.unlink()
    except FileNotFoundError:
        pass
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as server:
        server.bind(str(SOCKET))
        os.chmod(SOCKET, 0o660)
        try:
            import grp
            os.chown(SOCKET, 0, grp.getgrnam('droidian').gr_gid)
        except (KeyError, OSError):
            pass
        server.listen(8)
        while True:
            conn, _ = server.accept()
            with conn:
                conn.settimeout(20)
                line = b''
                while not line.endswith(b'\n') and len(line) < 8192:
                    chunk = conn.recv(1024)
                    if not chunk:
                        break
                    line += chunk
                try:
                    result = request(json.loads(line.decode()))
                    reply(conn.makefile('wb'), {'ok': True, 'result': result})
                except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
                    reply(conn.makefile('wb'), {'ok': False, 'error': str(error) or 'RADIO_ERROR'})


def client(envelope=False):
    raw = sys.stdin.read(8192)
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.settimeout(20)
        sock.connect(str(SOCKET))
        sock.sendall(raw.encode() + (b'' if raw.endswith('\n') else b'\n'))
        data = b''
        while not data.endswith(b'\n') and len(data) < 65536:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
    result = json.loads(data.decode())
    if envelope:
        print(json.dumps(result, separators=(',', ':')))
        return
    if not result.get('ok'):
        raise RuntimeError(result.get('error', 'RADIO_ERROR'))
    print(json.dumps(result.get('result'), separators=(',', ':')))


if __name__ == '__main__':
    if '--server' in sys.argv:
        serve()
    elif '--client' in sys.argv or '--client-envelope' in sys.argv:
        client(envelope='--client-envelope' in sys.argv)
    else:
        raise SystemExit('use --server or --client')
