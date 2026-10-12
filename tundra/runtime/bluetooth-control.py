#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""BlueZ broker. The persistent bus owns discovery and the pairing agent."""
import json
import os
from pathlib import Path
import re
import socket
import sys
import threading
import time
import uuid

SOCKET = Path('/run/tundra-bluetooth/control.sock')
LIMIT = 65536


def validate(value):
    if not isinstance(value, dict) or value.get('version') != 1:
        raise ValueError('BLUETOOTH_INVALID_REQUEST')
    op = value.get('operation')
    if op not in ('status', 'power', 'discoverable', 'rename', 'scan', 'stopScan',
                  'pair', 'unpair', 'connect', 'disconnect', 'reply', 'cancelPair'):
        raise ValueError('BLUETOOTH_INVALID_REQUEST')
    if op in ('pair', 'unpair', 'connect', 'disconnect', 'cancelPair') and not re.fullmatch(
            r'(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}', str(value.get('address', ''))):
        raise ValueError('BLUETOOTH_INVALID_ADDRESS')
    if op in ('power', 'discoverable') and not isinstance(value.get('enabled'), bool):
        raise ValueError('BLUETOOTH_INVALID_REQUEST')
    if op == 'rename' and (not isinstance(value.get('name'), str) or
                          not 1 <= len(value['name'].encode()) <= 248 or
                          any(ord(c) < 32 for c in value['name'])):
        raise ValueError('BLUETOOTH_INVALID_NAME')
    if op == 'reply' and (not isinstance(value.get('accept'), bool) or
                         not isinstance(value.get('id'), str) or len(value['id']) > 40):
        raise ValueError('BLUETOOTH_INVALID_REQUEST')
    return op


def device_record(props):
    cod = int(props.get('Class', 0))
    return dict(address=str(props['Address']), name=str(props.get('Alias', props['Address'])),
                paired=bool(props.get('Paired')), connected=bool(props.get('Connected')),
                uuids=[str(u) for u in props.get('UUIDs', [])],
                cod=dict(majorDeviceClass=(cod >> 8) & 31, minorDeviceClass=(cod >> 2) & 63,
                         majorServiceClass=(cod >> 13) & 2047))


def serve():
    import dbus
    import dbus.service
    from dbus.mainloop.glib import DBusGMainLoop
    from gi.repository import GLib
    DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus(private=True)
    pending = {}
    discovery = {'owned': False, 'expires': 0}

    def interface(path, name):
        return dbus.Interface(bus.get_object('org.bluez', path), name)

    def objects():
        return interface('/', 'org.freedesktop.DBus.ObjectManager').GetManagedObjects()

    def adapter():
        for path, interfaces in objects().items():
            if 'org.bluez.Adapter1' in interfaces:
                return str(path), interfaces['org.bluez.Adapter1']
        raise ValueError('BLUETOOTH_UNAVAILABLE')

    def snapshot():
        path, props = adapter()
        return dict(available=True, address=str(props['Address']), name=str(props.get('Alias', 'Vulpes OS')),
                    enabled=bool(props['Powered']), discoverable=bool(props['Discoverable']),
                    discovering=bool(props['Discovering']),
                    devices=[device_record(i['org.bluez.Device1']) for p, i in objects().items()
                             if 'org.bluez.Device1' in i and str(i['org.bluez.Device1']['Adapter']) == path],
                    pairing=[p['info'] for p in pending.values()])

    def remote(address):
        path, _ = adapter()
        for p, interfaces in objects().items():
            props = interfaces.get('org.bluez.Device1', {})
            if str(props.get('Address', '')).upper() == address.upper() and str(props.get('Adapter')) == path:
                return str(p), props
        raise ValueError('BLUETOOTH_DEVICE_GONE')

    class Rejected(dbus.DBusException):
        _dbus_error_name = 'org.bluez.Error.Rejected'

    def drop(identity, error=True):
        row = pending.pop(identity, None)
        if row and error and row['fail']:
            row['fail'](Rejected('Pairing rejected or expired'))
        return False

    def prompt(path, method, ok=None, fail=None, passkey=''):
        # One original Gaia pairing panel at a time, never auto-accept a peer.
        for identity in list(pending):
            drop(identity)
        props = interface(path, 'org.freedesktop.DBus.Properties').GetAll('org.bluez.Device1')
        identity = str(uuid.uuid4())
        pending[identity] = dict(ok=ok, fail=fail, path=str(path),
            info=dict(id=identity, method=method, address=str(props['Address']),
                      deviceName=str(props.get('Alias', props['Address'])), passkey=str(passkey)))
        GLib.timeout_add_seconds(90, drop, identity)

    def check_sender(sender):
        if sender != bus.get_name_owner('org.bluez'):
            raise Rejected('Only BlueZ may request pairing')

    def clear_pending():
        for identity in list(pending):drop(identity)

    class Agent(dbus.service.Object):
        @dbus.service.method('org.bluez.Agent1', in_signature='ou', out_signature='', sender_keyword='sender', async_callbacks=('ok', 'fail'))
        def RequestConfirmation(self, device, passkey, ok, fail, sender=None):
            check_sender(sender)
            prompt(device, 'confirmation', ok, fail, f'{int(passkey):06d}')

        @dbus.service.method('org.bluez.Agent1', in_signature='o', out_signature='s', sender_keyword='sender', async_callbacks=('ok', 'fail'))
        def RequestPinCode(self, device, ok, fail, sender=None):
            check_sender(sender)
            prompt(device, 'enterpincode', ok, fail)

        @dbus.service.method('org.bluez.Agent1', in_signature='o', out_signature='u', sender_keyword='sender', async_callbacks=('ok', 'fail'))
        def RequestPasskey(self, device, ok, fail, sender=None):
            check_sender(sender)
            prompt(device, 'enterpasskey', ok, fail)

        @dbus.service.method('org.bluez.Agent1', in_signature='o', out_signature='', sender_keyword='sender', async_callbacks=('ok', 'fail'))
        def RequestAuthorization(self, device, ok, fail, sender=None):
            check_sender(sender)
            prompt(device, 'consent', ok, fail)

        @dbus.service.method('org.bluez.Agent1', in_signature='os', out_signature='', sender_keyword='sender', async_callbacks=('ok', 'fail'))
        def AuthorizeService(self, device, service, ok, fail, sender=None):
            check_sender(sender)
            props = interface(device, 'org.freedesktop.DBus.Properties').GetAll('org.bluez.Device1')
            if props.get('Trusted') and props.get('Paired'):
                ok()
            else:
                prompt(device, 'consent', ok, fail)

        @dbus.service.method('org.bluez.Agent1', in_signature='ouq', out_signature='', sender_keyword='sender')
        def DisplayPasskey(self, device, passkey, entered, sender=None):
            check_sender(sender)
            prompt(device, 'displaypasskey', passkey=f'{int(passkey):06d}')

        @dbus.service.method('org.bluez.Agent1', in_signature='os', out_signature='', sender_keyword='sender')
        def DisplayPinCode(self, device, pincode, sender=None):
            check_sender(sender)
            prompt(device, 'displaypasskey', passkey=pincode)

        @dbus.service.method('org.bluez.Agent1', in_signature='', out_signature='', sender_keyword='sender')
        def Cancel(self, sender=None):
            check_sender(sender)
            for identity in list(pending):
                drop(identity)

        @dbus.service.method('org.bluez.Agent1', in_signature='', out_signature='', sender_keyword='sender')
        def Release(self, sender=None):
            check_sender(sender)
            clear_pending()

    agent = Agent(bus, '/org/vulpes/BluetoothAgent')
    manager = interface('/org/bluez', 'org.bluez.AgentManager1')
    manager.RegisterAgent('/org/vulpes/BluetoothAgent', 'KeyboardDisplay')
    manager.RequestDefaultAgent('/org/vulpes/BluetoothAgent')

    def stop_scan():
        if discovery['owned']:
            try:
                path, _ = adapter()
                interface(path, 'org.bluez.Adapter1').StopDiscovery()
            finally:
                discovery['owned'] = False

    def expire_scan():
        if discovery['owned'] and time.monotonic() >= discovery['expires']:
            try:
                stop_scan()
            except Exception:
                pass
        return True
    GLib.timeout_add_seconds(5, expire_scan)

    def dispatch(value, finish):
        try:
            op = validate(value)
            path, props = adapter()
            prop = interface(path, 'org.freedesktop.DBus.Properties')
            if op == 'power':
                if not value['enabled']:
                    stop_scan()
                prop.Set('org.bluez.Adapter1', 'Powered', dbus.Boolean(value['enabled'], variant_level=1))
                if not value['enabled']:
                    clear_pending()
            elif op == 'discoverable':
                prop.Set('org.bluez.Adapter1', 'Pairable', dbus.Boolean(value['enabled'], variant_level=1))
                prop.Set('org.bluez.Adapter1', 'Discoverable', dbus.Boolean(value['enabled'], variant_level=1))
            elif op == 'rename':
                prop.Set('org.bluez.Adapter1', 'Alias', dbus.String(value['name'], variant_level=1))
            elif op == 'scan':
                if not discovery['owned']:
                    interface(path, 'org.bluez.Adapter1').StartDiscovery()
                    discovery['owned'] = True
                discovery['expires'] = time.monotonic() + 60
            elif op == 'stopScan':
                stop_scan()
            elif op == 'reply':
                row = pending.get(value['id'])
                if row is None:
                    raise ValueError('BLUETOOTH_PAIRING_EXPIRED')
                method = row['info']['method']
                code = value.get('code', '')
                if value['accept'] and method in ('enterpincode', 'enterpasskey'):
                    valid = isinstance(code, str) and 1 <= len(code) <= 16 and code.isascii() and code.isprintable()
                    if method == 'enterpasskey':
                        valid = isinstance(code, str) and re.fullmatch(r'[0-9]{1,6}', code)
                    if not valid:
                        raise ValueError('BLUETOOTH_INVALID_PIN')
                pending.pop(value['id'])
                if not value['accept'] and row['fail']:
                    row['fail'](Rejected('Rejected by user'))
                elif row['ok']:
                    if method == 'enterpincode': row['ok'](dbus.String(code))
                    elif method == 'enterpasskey': row['ok'](dbus.UInt32(int(code)))
                    else: row['ok']()
            elif op in ('pair', 'unpair', 'connect', 'disconnect', 'cancelPair'):
                device, dp = remote(value['address'])
                obj = interface(device, 'org.bluez.Device1')
                if op == 'unpair':
                    interface(path, 'org.bluez.Adapter1').RemoveDevice(dbus.ObjectPath(device))
                elif op == 'cancelPair':
                    obj.CancelPairing()
                elif op in ('connect', 'disconnect'):
                    if not dp.get('Paired'):
                        raise ValueError('BLUETOOTH_NOT_PAIRED')
                    getattr(obj, 'Connect' if op == 'connect' else 'Disconnect')(
                        reply_handler=lambda: finish(True), error_handler=lambda e: finish(error(e)), timeout=60)
                    return False
                else:
                    stop_scan()
                    def paired():
                        # Trust follows an explicit successful Pair initiated from Gaia.
                        try:
                            interface(device, 'org.freedesktop.DBus.Properties').Set(
                                'org.bluez.Device1', 'Trusted', dbus.Boolean(True, variant_level=1))
                            for identity, row in list(pending.items()):
                                if row['path']==device:drop(identity,False)
                            finish(True)
                        except Exception as exc:finish(error(exc))
                    obj.Pair(reply_handler=paired, error_handler=lambda e: finish(error(e)), timeout=95)
                    return False
            finish(snapshot())
        except Exception as e:
            finish(error(e))
        return False

    def error(exc):
        name = str(exc).split(':', 1)[0]
        if hasattr(exc, 'get_dbus_name'):
            name = exc.get_dbus_name().rsplit('.', 1)[-1]
        return {'error': name if re.fullmatch(r'[A-Za-z_]+', name) else 'BLUETOOTH_FAILED'}

    slots = threading.BoundedSemaphore(8)
    def connection(sock):
        try:
            with sock:
                sock.settimeout(110)
                data = b''
                while not data.endswith(b'\n') and len(data) <= 4096:
                    chunk = sock.recv(4097-len(data))
                    if not chunk: break
                    data += chunk
                if len(data) > 4096: raise ValueError('BLUETOOTH_INVALID_REQUEST')
                value = json.loads(data)
                validate(value)
                done = threading.Event(); reply = []
                def finish(result):
                    reply.append(result); done.set()
                GLib.idle_add(dispatch, value, finish)
                if not done.wait(100): raise ValueError('BLUETOOTH_TIMEOUT')
                result = reply[0]
                sock.sendall(json.dumps(result if isinstance(result, dict) and 'error' in result else {'result':result}).encode()+b'\n')
        except (OSError, ValueError):
            pass
        finally:
            slots.release()

    def listen():
        import pwd
        SOCKET.parent.mkdir(parents=True, exist_ok=True)
        SOCKET.unlink(missing_ok=True)
        with socket.socket(socket.AF_UNIX) as server:
            server.bind(str(SOCKET)); os.chmod(SOCKET, 0o660)
            os.chown(SOCKET, 0, pwd.getpwnam('droidian').pw_gid)
            server.listen(8)
            while True:
                sock, _ = server.accept()
                if not slots.acquire(blocking=False): sock.close(); continue
                threading.Thread(target=connection, args=(sock,), daemon=True).start()
    threading.Thread(target=listen, daemon=True).start()
    GLib.MainLoop().run()


def client():
    data = sys.stdin.read(4097)
    if len(data) > 4096: raise ValueError('BLUETOOTH_INVALID_REQUEST')
    validate(json.loads(data))
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(110); sock.connect(str(SOCKET)); sock.sendall(data.encode()+b'\n')
        result = b''
        while not result.endswith(b'\n') and len(result) <= LIMIT:
            chunk = sock.recv(65536)
            if not chunk: break
            result += chunk
        if len(result) > LIMIT: raise ValueError('BLUETOOTH_INVALID_REPLY')
        print(result.decode())

if __name__ == '__main__':
    client() if '--client' in sys.argv else serve()
