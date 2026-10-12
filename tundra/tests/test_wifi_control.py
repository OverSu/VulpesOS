# SPDX-License-Identifier: MPL-2.0
import importlib.util
import json
from pathlib import Path
import socket
import stat
import struct
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('wifi', Path(__file__).resolve().parents[1]/'runtime/wifi-control.py')
wifi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wifi)
AP = {'id': '/org/freedesktop/NetworkManager/AccessPoint/7',
      'ssid': 'Test: réseau\\', 'security': 'wpa-psk', 'signal': 75}


class WifiTests(unittest.TestCase):
    def test_nmcli_escaped_names_and_enterprise(self):
        raw = AP['id'] + r':Test\: réseau\\:75:WPA2:*' + '\n'
        raw += '/org/freedesktop/NetworkManager/AccessPoint/8:Enterprise:60:WPA2 802.1X:\n'
        with patch.object(wifi, 'nm', return_value=SimpleNamespace(returncode=0, stdout=raw)):
            result = wifi.networks()
        self.assertEqual(result[0]['ssid'], AP['ssid'])
        self.assertTrue(result[0]['connected'])
        self.assertEqual(result[1]['security'], 'unsupported')

    def test_connection_information_uses_validated_address_and_actual_bitrate(self):
        def nm(*args, **kwargs):
            value='invalid\n192.0.2.4/24\n' if args[1]=='IP4.ADDRESS' else '/org/freedesktop/NetworkManager/Devices/4\n'
            return SimpleNamespace(returncode=0,stdout=value)
        with patch.object(wifi,'nm',side_effect=nm), patch.object(wifi.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='{"data":[351000]}')):
            self.assertEqual(wifi.connection_info(),{'ipAddress':'192.0.2.4','linkSpeed':351})
        with patch.object(wifi,'nm',return_value=SimpleNamespace(returncode=0,stdout='/invalid/path')), patch.object(wifi.subprocess,'run') as run:
            self.assertEqual(wifi.connection_info(),{})
            run.assert_not_called()

    def test_secret_persists_only_after_success(self):
        for fail in (False, True):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                commands = []
                def nm(*args, **kwargs):
                    commands.append(args)
                    if args[:2] == ('connection', 'load'):
                        file = Path(args[2])
                        self.assertEqual(stat.S_IMODE(file.stat().st_mode), 0o600)
                        self.assertIn('psk=testpassword', file.read_text())
                    return SimpleNamespace(returncode=int(fail and args[:2] == ('connection', 'up')))
                with patch.object(wifi, 'networks', return_value=[AP]), patch.object(wifi, 'nm', side_effect=nm):
                    request = {'operation':'connect', 'id':AP['id'], 'password':'testpassword'}
                    if fail:
                        with self.assertRaisesRegex(wifi.WifiError, 'WIFI_CONNECT_FAILED'):
                            wifi.dispatch(request, root)
                    else:
                        self.assertTrue(wifi.dispatch(request, root)['connected'])
                files=list(root.iterdir())
                self.assertEqual(len(files), 0 if fail else 1)
                if not fail:
                    self.assertIn('autoconnect=true', files[0].read_text())
                    self.assertEqual(wifi.saved_profiles(root)[0]['ssid'], AP['ssid'])
                self.assertNotIn('testpassword', repr(commands))

    def test_remember_reconnect_failed_password_and_forget(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with patch.object(wifi, 'networks', return_value=[AP]), patch.object(wifi, 'nm', return_value=SimpleNamespace(returncode=0)):
                wifi.dispatch({'operation':'connect','id':AP['id'],'password':'firstpassword'},root)
                stored = wifi.dispatch({'operation':'known'},root)['networks'][0]
                self.assertNotIn('password', stored)
                wifi.dispatch({'operation':'connect','id':AP['id']},root)
                target = next(root.iterdir())
                before = target.read_text()
                def failing(*args, **kwargs):
                    return SimpleNamespace(returncode=int(args[:2]==('connection','up')))
                with patch.object(wifi, 'nm', side_effect=failing):
                    with self.assertRaises(wifi.WifiError):
                        wifi.dispatch({'operation':'connect','id':AP['id'],'password':'wrongpassword'},root)
                self.assertEqual(target.read_text(),before)
                wifi.dispatch({'operation':'forget','id':stored['id']},root)
                self.assertEqual(list(root.iterdir()),[])

    def test_rejects_commands_injection_and_unobserved_networks(self):
        with patch.object(wifi, 'nm') as command:
            for request in ({'operation':'execute'}, {'operation':'scan','command':'id'}, []):
                with self.assertRaises(wifi.WifiError):
                    wifi.dispatch(request)
            command.assert_not_called()
        with patch.object(wifi, 'networks', return_value=[]):
            with self.assertRaisesRegex(wifi.WifiError, 'WIFI_NETWORK_GONE'):
                wifi.dispatch({'operation':'connect','id':'/tmp/hostile'})
        for password in ('short', 'testpass\n[connection]', 'x'*100):
            with self.assertRaises(wifi.WifiError):
                wifi.profile_text(AP, password, 'test')

    def test_hidden_network_uses_encoded_ssid_and_private_profile(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(wifi,'nm',return_value=SimpleNamespace(returncode=0)):
            root=Path(folder)
            wifi.dispatch({'operation':'connectHidden','ssid':'Hidden; réseau','security':'wpa-psk','password':'testpassword'},root)
            saved=next(root.iterdir())
            self.assertIn('hidden=true',saved.read_text())
            self.assertEqual(stat.S_IMODE(saved.stat().st_mode),0o600)
            self.assertEqual(wifi.saved_profiles(root)[0]['ssid'],'Hidden; réseau')
        for ssid in ('','x'*33,'é'*17):
            with tempfile.TemporaryDirectory() as folder, self.assertRaises(wifi.WifiError):
                wifi.dispatch({'operation':'connectHidden','ssid':ssid,'security':'open'},Path(folder))

    def test_socket_round_trip_and_limits(self):
        a, b = socket.socketpair()
        with a, b, patch.object(wifi, 'dispatch', return_value={'networks':[]}) as dispatch:
            # Peer credential enforcement is independent of the CI user's uid.
            class Peer:
                def getsockopt(self, *args): return struct.pack('3i', 123, 32011, 32011)
                def __getattr__(self, name): return getattr(b, name)
            thread = threading.Thread(target=wifi.handle, args=(Peer(),))
            thread.start()
            a.sendall(b'{"operation":"scan"}\n')
            self.assertEqual(wifi.receive(a, 65536), {'result':{'networks':[]}})
            thread.join(2)
            self.assertFalse(thread.is_alive())
            dispatch.assert_called_once_with({'operation':'scan'})
        a, b = socket.socketpair()
        with a, b:
            a.sendall(b'12345\n')
            with self.assertRaises(wifi.WifiError): wifi.receive(b, 4)

    def test_unauthorized_peer_never_dispatches(self):
        class Peer:
            def settimeout(self, _): pass
            def getsockopt(self, *args): return struct.pack('3i', 123, 65534, 65534)
            def sendall(self, data): self.reply = json.loads(data)
        peer = Peer()
        with patch.object(wifi, 'dispatch') as dispatch:
            wifi.handle(peer)
            dispatch.assert_not_called()
        self.assertEqual(peer.reply, {'error':'PERMISSION_DENIED'})


if __name__ == '__main__': unittest.main()
