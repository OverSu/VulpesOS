#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Narrow native Wi-Fi bridge. Credentials travel over a private Unix socket."""
import argparse
import configparser
import json
import os
from pathlib import Path
import re
import socket
import struct
import subprocess
import sys
import uuid

SOCKET = '/run/tundra-wifi/control.sock'
MAX_REQUEST = 16384
DEVICE = 'wlan0'
PROFILE_DIR = Path('/etc/NetworkManager/system-connections')


class WifiError(Exception):
    pass


def fields(line):
    """Decode nmcli's escaped colon-separated output, including SSIDs."""
    result, value, escaped = [], '', False
    for char in line:
        if escaped:
            value += char
            escaped = False
        elif char == '\\':
            escaped = True
        elif char == ':':
            result.append(value)
            value = ''
        else:
            value += char
    if escaped:
        value += '\\'
    return result + [value]


def nm(*args, timeout=45):
    try:
        return subprocess.run(['/usr/bin/nmcli', '--wait', '30', *args],
                              capture_output=True, text=True, timeout=timeout,
                              env={'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C'})
    except (OSError, subprocess.TimeoutExpired):
        raise WifiError('WIFI_UNAVAILABLE') from None


def networks(rescan=False):
    result = nm('-t', '--escape', 'yes', '-f', 'DBUS-PATH,SSID,SIGNAL,SECURITY,IN-USE',
                'device', 'wifi', 'list', 'ifname', DEVICE,
                '--rescan', 'yes' if rescan else 'no')
    if result.returncode:
        raise WifiError('WIFI_UNAVAILABLE')
    found = []
    for line in result.stdout.splitlines():
        parts = fields(line)
        if len(parts) != 5:
            continue
        ident, ssid, signal, security, active = parts
        if not re.fullmatch(r'/org/freedesktop/NetworkManager/AccessPoint/\d+', ident) or not ssid:
            continue
        if not signal.isdigit() or not 0 <= int(signal) <= 100:
            continue
        if not security or security == '--':
            mode = 'open'
        elif '802.1X' in security or 'EAP' in security:
            mode = 'unsupported'
        elif 'WPA3' in security and 'WPA2' not in security:
            mode = 'sae'
        elif 'WPA2' in security or 'WPA1' in security or security == 'WPA':
            mode = 'wpa-psk'
        else:
            mode = 'unsupported'
        found.append({'id': ident, 'ssid': ssid, 'signal': int(signal),
                      'security': mode, 'connected': active == '*'})
    return sorted(found, key=lambda row: -row['signal'])[:128]


def saved_profiles(profile_dir):
    result = []
    for path in profile_dir.glob('vulpes-*.nmconnection'):
        try:
            if path.is_symlink():
                continue
            parser = configparser.ConfigParser(interpolation=None)
            parser.read(path)
            uid = str(uuid.UUID(parser['connection']['uuid']))
            if path.name != 'vulpes-' + uid + '.nmconnection':
                continue
            ssid = bytes(int(b) for b in parser['wifi']['ssid'].split(';') if b).decode()
            mode = parser.get('wifi-security', 'key-mgmt', fallback='open')
            result.append({'id': uid, 'ssid': ssid, 'security': mode, 'known': True})
        except (OSError, ValueError, KeyError, configparser.Error):
            continue
    return result


def private_write(target, text):
    temporary = target.with_suffix('.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(text)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(target)


def profile_text(network, password, uid):
    ssid = network['ssid']
    if not isinstance(ssid, str) or not 1 <= len(ssid.encode()) <= 32:
        raise WifiError('WIFI_INVALID_REQUEST')
    mode = network['security']
    if mode not in ('open', 'wpa-psk', 'sae'):
        raise WifiError('WIFI_UNSUPPORTED_SECURITY')
    if not isinstance(password, str) or any(ord(c) < 32 for c in password):
        raise WifiError('WIFI_INVALID_PASSWORD')
    length = len(password.encode())
    if mode == 'wpa-psk' and not (8 <= length <= 63 or re.fullmatch(r'[0-9a-fA-F]{64}', password)):
        raise WifiError('WIFI_INVALID_PASSWORD')
    if mode == 'sae' and not 1 <= length <= 63:
        raise WifiError('WIFI_INVALID_PASSWORD')
    text = (f'[connection]\nid=Vulpes Wi-Fi\nuuid={uid}\ntype=wifi\n'
            'interface-name=wlan0\nautoconnect=true\n[wifi]\nmode=infrastructure\n'
            'cloned-mac-address=permanent\nssid=' +
            ''.join(str(b) + ';' for b in ssid.encode()) +
            '\n[ipv4]\nmethod=auto\n[ipv6]\nmethod=auto\n')
    if mode != 'open':
        escaped = password.replace('\\', '\\\\').replace(' ', '\\s')
        text += f'[wifi-security]\nkey-mgmt={mode}\npsk={escaped}\n'
    return text


def dispatch(request, profile_dir=PROFILE_DIR):
    if not isinstance(request, dict) or set(request) - {'operation', 'id', 'password', 'enabled'}:
        raise WifiError('WIFI_INVALID_REQUEST')
    operation = request.get('operation')
    saved = saved_profiles(profile_dir)
    if operation == 'known':
        return {'networks': saved}
    if operation == 'forget':
        network = next((row for row in saved if row['id'] == request.get('id')), None)
        if network is None:
            raise WifiError('WIFI_NETWORK_GONE')
        uid = network['id']
        if nm('connection', 'delete', 'uuid', uid).returncode:
            raise WifiError('WIFI_FORGET_FAILED')
        (profile_dir / ('vulpes-' + uid + '.nmconnection')).unlink(missing_ok=True)
        return {'forgotten': True}
    if operation in ('status', 'scan', 'setEnabled'):
        if operation == 'setEnabled':
            enabled = request.get('enabled')
            if type(enabled) is not bool:
                raise WifiError('WIFI_INVALID_REQUEST')
            if nm('radio', 'wifi', 'on' if enabled else 'off').returncode:
                raise WifiError('WIFI_UNAVAILABLE')
        radio = nm('radio', 'wifi')
        if radio.returncode:
            raise WifiError('WIFI_UNAVAILABLE')
        enabled = radio.stdout.strip() == 'enabled'
        found = networks(rescan=True) if enabled and operation == 'scan' else []
        for network in found:
            stored = next((row for row in saved if row['ssid'] == network['ssid'] and row['security'] == network['security']), None)
            network.update(known=stored is not None, savedId=stored['id'] if stored else None)
        return {'enabled': enabled, 'networks': found}
    if operation == 'disconnect':
        if nm('device', 'disconnect', DEVICE).returncode:
            raise WifiError('WIFI_DISCONNECT_FAILED')
        return {'disconnected': True}
    if operation != 'connect':
        raise WifiError('WIFI_INVALID_REQUEST')
    # Resolve an observed AP; clients cannot supply nmcli arguments or arbitrary SSIDs.
    network = next((row for row in networks() if row['id'] == request.get('id')), None)
    if network is None:
        raise WifiError('WIFI_NETWORK_GONE')
    stored = next((row for row in saved if row['ssid'] == network['ssid'] and row['security'] == network['security']), None)
    uid = stored['id'] if stored else str(uuid.uuid4())
    target = profile_dir / ('vulpes-' + uid + '.nmconnection')
    previous = target.read_text() if stored else None
    text = previous if stored and not request.get('password') else profile_text(network, request.get('password', ''), uid)
    profile_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = profile_dir / ('vulpes-' + uid + '.nmconnection')
    connected = False
    try:
        private_write(target, text)
        if nm('connection', 'load', str(target)).returncode:
            raise WifiError('WIFI_UNAVAILABLE')
        if nm('connection', 'up', 'uuid', uid).returncode:
            raise WifiError('WIFI_CONNECT_FAILED')
        connected = True
        return {'connected': True}
    finally:
        if not connected:
            # Never include nmcli stderr: it may contain the SSID or credentials.
            if previous is not None:
                private_write(target, previous)
                nm('connection', 'load', str(target))
            else:
                nm('connection', 'delete', 'uuid', uid)
                target.unlink(missing_ok=True)


def receive(stream, limit):
    data = bytearray()
    while b'\n' not in data:
        part = stream.recv(min(4096, limit + 1 - len(data)))
        if not part:
            raise WifiError('WIFI_INVALID_REQUEST')
        data.extend(part)
        if len(data) > limit:
            raise WifiError('WIFI_INVALID_REQUEST')
    if data.count(b'\n') != 1 or not data.endswith(b'\n'):
        raise WifiError('WIFI_INVALID_REQUEST')
    return json.loads(data)


def handle(stream):
    stream.settimeout(5)
    try:
        _, uid, _ = struct.unpack('3i', stream.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
        if uid not in (0, 32011):
            raise WifiError('PERMISSION_DENIED')
        result = {'result': dispatch(receive(stream, MAX_REQUEST))}
    except WifiError as error:
        result = {'error': str(error)}
    except Exception:
        result = {'error': 'WIFI_UNAVAILABLE'}
    try:
        stream.sendall(json.dumps(result).encode() + b'\n')
    except OSError:
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--client', action='store_true')
    args = parser.parse_args()
    if args.client:
        try:
            data = sys.stdin.buffer.read(MAX_REQUEST + 1)
            if len(data) > MAX_REQUEST:
                raise WifiError('WIFI_INVALID_REQUEST')
            with socket.socket(socket.AF_UNIX) as stream:
                stream.settimeout(90)
                stream.connect(SOCKET)
                stream.sendall(json.dumps(json.loads(data)).encode() + b'\n')
                result = receive(stream, 65536)
        except Exception:
            result = {'error': 'WIFI_UNAVAILABLE'}
        print(json.dumps(result))
        return
    if os.getuid() or 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():
        raise SystemExit('Temporary native boot required')
    os.umask(0o077)
    path = Path(SOCKET)
    path.unlink(missing_ok=True)
    with socket.socket(socket.AF_UNIX) as server:
        server.bind(SOCKET)
        os.chown(SOCKET, 0, 32011)
        path.chmod(0o660)
        server.listen(4)
        while True:
            stream, _ = server.accept()
            with stream:
                handle(stream)


if __name__ == '__main__':
    main()
