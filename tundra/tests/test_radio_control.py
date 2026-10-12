import importlib.util
import json
import socket
import subprocess
from pathlib import Path
import unittest
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('radio_control', ROOT / 'runtime/radio-control.py')
radio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(radio)


class RadioControlTests(unittest.TestCase):
    def test_message_state_accepts_modem_hex_case_but_not_other_objects(self):
        inbox = SimpleNamespace(outgoing_state=lambda path: 'sent')
        spec = SimpleNamespace(loader=SimpleNamespace(exec_module=lambda module: None))
        with patch.object(radio.importlib.util, 'spec_from_file_location', return_value=spec), \
                patch.object(radio.importlib.util, 'module_from_spec', return_value=inbox):
            for path in ['/ril_0/message_18DE1E64E8B16EA9E5E57366556C971B822E2614',
                         '/ril_0/message_ab12']:
                self.assertEqual(radio.request({'version':1, 'operation':'messageState',
                                                'path':path}), {'state':'sent'})
            for path in ['/ril_0/voicecall01', '/ril_0/message_Z', '/ril_0/message_1/other']:
                with self.assertRaisesRegex(ValueError, 'INVALID_SMS_PATH'):
                    radio.request({'version':1, 'operation':'messageState', 'path':path})

    def test_slow_settings_transaction_does_not_block_call_controls(self):
        import threading
        started, release = threading.Event(), threading.Event()
        worker = radio.SettingsWorker()
        settings_server, settings_client = socket.socketpair()
        voice_server, voice_client = socket.socketpair()
        def request(value):
            if value['operation'] == 'mobileSettings':
                started.set()
                if not release.wait(2): raise RuntimeError('test settings timeout')
                return {'saved':True}
            return {'calls':[]}
        try:
            with patch.object(radio,'request',side_effect=request), settings_client, voice_server, voice_client:
                settings_client.sendall(b'{"version":1,"operation":"mobileSettings","action":"editApn"}\n')
                self.assertTrue(radio.handle_connection(settings_server,worker))
                self.assertTrue(started.wait(1))
                voice_client.sendall(b'{"version":1,"operation":"calls"}\n')
                self.assertFalse(radio.handle_connection(voice_server,worker))
                voice_client.settimeout(1)
                self.assertEqual(json.loads(voice_client.recv(4096))['result'],{'calls':[]})
                release.set()
                settings_client.settimeout(1)
                self.assertTrue(json.loads(settings_client.recv(4096))['result']['saved'])
        finally:
            release.set(); worker.close(); settings_server.close()

    def test_stale_queued_settings_are_not_applied(self):
        worker=radio.SettingsWorker()
        server, client=socket.socketpair()
        worker.slots.acquire()
        try:
            with client, patch.object(radio.time,'monotonic',return_value=20), patch.object(radio,'request') as request:
                worker.run(server,{'operation':'mobileSettings'},0)
                self.assertEqual(json.loads(client.recv(4096)),{'ok':False,'error':'RADIO_BUSY'})
                request.assert_not_called()
        finally:worker.close()

    def test_full_settings_queue_is_bounded(self):
        worker=radio.SettingsWorker()
        server, client=socket.socketpair()
        try:
            for _ in range(8):self.assertTrue(worker.slots.acquire(blocking=False))
            with server, client:
                client.sendall(b'{"version":1,"operation":"mobileSettings","action":"sim"}\n')
                self.assertFalse(radio.handle_connection(server,worker))
                self.assertEqual(json.loads(client.recv(4096)),{'ok':False,'error':'RADIO_BUSY'})
        finally:
            for _ in range(8):worker.slots.release()
            worker.close()

    def test_closed_client_does_not_crash_broker_or_repeat_sms(self):
        server, client = socket.socketpair()
        with server:
            client.sendall(b'{"version":1,"operation":"sms"}\n')
            client.close()
            with patch.object(radio, 'request', return_value={'state':'pending'}) as request:
                radio.handle_connection(server)
                request.assert_called_once()

    def test_incomplete_request_cannot_dial(self):
        server, client = socket.socketpair()
        with server, client:
            client.sendall(b'{"version":1,"operation":"dial"}')
            client.shutdown(socket.SHUT_WR)
            with patch.object(radio, 'request') as request:
                radio.handle_connection(server)
                request.assert_not_called()

    def test_modem_timeout_does_not_disclose_sms_arguments(self):
        server, client = socket.socketpair()
        with server, client:
            client.sendall(b'{"version":1,"operation":"sms"}\n')
            error = subprocess.TimeoutExpired(['busctl', 'private-number', 'private-body'], 15)
            with patch.object(radio, 'request', side_effect=error):
                radio.handle_connection(server)
            response = json.loads(client.recv(4096))
            self.assertEqual(response, {'ok':False, 'error':'RADIO_TIMEOUT'})

    def test_slow_client_timeout_does_not_escape_handler(self):
        from unittest.mock import Mock
        conn = Mock()
        conn.recv.side_effect = socket.timeout()
        with patch.object(radio, 'request') as request:
            radio.handle_connection(conn)
        request.assert_not_called()
        conn.sendall.assert_not_called()

    def test_void_dbus_success_is_not_an_invalid_reply(self):
        with patch.object(radio.subprocess, 'run', return_value=SimpleNamespace(
                returncode=0, stdout='', stderr='')):
            self.assertIsNone(radio.bus('org.ofono', '/ril_0/voicecall01', 'org.ofono.VoiceCall', 'Hangup'))

    def test_calls_returns_only_public_call_fields(self):
        payload = [[['/ril_0/voicecall01', {
            'State': {'type': 's', 'data': 'active'},
            'LineIdentification': {'type': 's', 'data': '+12025550123'},
            'PrivateModemData': {'type': 's', 'data': 'secret'},
        }]]]
        with patch.object(radio, 'bus', return_value=payload):
            self.assertEqual(radio.request({'version': 1, 'operation': 'calls'}), [
                {'path': '/ril_0/voicecall01', 'state': 'active', 'number': '+12025550123'}])
        with patch.object(radio, 'bus', return_value=[[]]):
            self.assertEqual(radio.request({'version': 1, 'operation': 'calls'}), [])

    def test_answer_and_hangup_target_only_the_selected_call(self):
        for operation, method in [('answer', 'Answer'), ('hangup', 'Hangup')]:
            with patch.object(radio, 'bus', return_value=[]) as bus:
                radio.request({'version': 1, 'operation': operation, 'path': '/ril_0/voicecall01'})
                bus.assert_called_once_with('org.ofono', '/ril_0/voicecall01', 'org.ofono.VoiceCall', method)
            with self.assertRaises(ValueError):
                radio.request({'version': 1, 'operation': operation, 'path': '/private'})

    def test_modem_rejections_are_not_reported_as_transport_failures(self):
        for detail, expected in [
            ('Call failed: Not registered', 'RADIO_NOT_REGISTERED'),
            ('org.ofono.Error.InProgress', 'RADIO_BUSY'),
            ('Call failed: Not available', 'RADIO_NOT_READY'),
            ('private modem response', 'RADIO_REQUEST_FAILED'),
        ]:
            with self.subTest(detail=detail), patch.object(radio.subprocess, 'run',
                    return_value=SimpleNamespace(returncode=1, stderr=detail)):
                with self.assertRaisesRegex(RuntimeError, '^'+expected+'$'):
                    radio.bus('org.ofono', '/ril_0', 'org.ofono.Modem', 'GetProperties')

    def test_dial_is_allowlisted_and_validated(self):
        with patch.object(radio, 'bus', return_value=['/ril_0/voicecall01']) as bus:
            result = radio.request({'version': 1, 'operation': 'dial', 'number': '+12025550123'})
        self.assertEqual(result['path'], '/ril_0/voicecall01')
        bus.assert_called_once_with(
            'org.ofono', '/ril_0', 'org.ofono.VoiceCallManager', 'Dial', 'ss', '+12025550123', 'default'
        )

    def test_sms_does_not_accept_arbitrary_dbus_values(self):
        with self.assertRaises(ValueError):
            radio.request({'version': 1, 'operation': 'sms', 'number': 'x', 'body': 'hello'})
        with self.assertRaises(ValueError):
            radio.request({'version': 1, 'operation': 'sms', 'number': '+12025550123', 'body': ''})

    def test_sms_refuses_unregistered_network_before_submission(self):
        for state in ('searching', 'denied', 'unregistered'):
            with self.subTest(state=state), patch.object(radio, 'bus',
                    return_value=[{'Status': {'data': state}}]) as bus:
                with self.assertRaisesRegex(RuntimeError, '^RADIO_NOT_REGISTERED$'):
                    radio.request({'version': 1, 'operation': 'sms',
                                   'number': '+12025550123', 'body': 'test'})
                self.assertEqual(bus.call_count, 1)

    def test_modem_queue_is_not_delivery_confirmation(self):
        for state in ('registered', 'roaming'):
            with self.subTest(state=state), patch.object(radio, 'bus', side_effect=[
                    [{'Status': {'data': state}}], ['/ril_0/messageabc']]):
                result = radio.request({'version': 1, 'operation': 'sms',
                                        'number': '+12025550123', 'body': 'test'})
                self.assertEqual(result['state'], 'pending')
                self.assertEqual(result['path'], '/ril_0/messageabc')

    def test_hangup_only_accepts_owned_voice_paths(self):
        with self.assertRaises(ValueError):
            radio.request({'version': 1, 'operation': 'hangup', 'path': '/org/freedesktop/secret'})


if __name__ == '__main__':
    unittest.main()
