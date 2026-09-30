import importlib.util
from pathlib import Path
import unittest
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('radio_control', ROOT / 'runtime/radio-control.py')
radio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(radio)


class RadioControlTests(unittest.TestCase):
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
