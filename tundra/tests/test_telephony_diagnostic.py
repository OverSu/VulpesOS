import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location('diagnostic', Path(__file__).resolve().parents[1]/'tools/diagnose-telephony.py')
diagnostic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(diagnostic)


class DiagnosticTests(unittest.TestCase):
    def test_qualcomm_attach_crash_is_visible_without_raw_backtrace(self):
        report = diagnostic.modem_crashes(
            'F libc: Fatal signal 7 (SIGBUS), fault addr 0x123456 in tid 101 (qcrild)\n'
            'F DEBUG: qcril_qmi_nas_initial_attach_timeout_handler(void*)\n'
            'private subscriber text\n')
        self.assertEqual(report, {'signals':[{'signal':7, 'name':'SIGBUS'}],
                                 'initialAttachTimeoutInBacktrace':True})
        self.assertNotIn('0x123456', json.dumps(report))
        self.assertNotIn('subscriber', json.dumps(report))

    def test_crash_time_distinguishes_old_events_after_a_radio_restart(self):
        report = diagnostic.modem_crashes(
            '10-08 12:37:33.483 50 101 F libc: Fatal signal 7 (SIGBUS) in tid 101 (qcrild)\n')
        self.assertEqual(report['signals'][0]['logTime'], '10-08 12:37:33.483')

    def test_subscriber_and_cell_identifiers_never_leave_report(self):
        props = {'Present': {'data': True}, 'SubscriberIdentity': {'data': 'private-imsi'},
                 'SubscriberNumbers': {'data': ['private-number']}, 'CardIdentifier': {'data': 'private-card'}}
        self.assertEqual(diagnostic.select_properties('SimManager', props), {'Present': True})
        line = 'src/binder_network.c:binder_network_poll_voice_state_cb() slot1 denied,lte,14,12345,987654321,11'
        events = diagnostic.registration_events(line+'\n'+line)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]['denialReason'], 11)
        self.assertNotIn('12345', json.dumps(events))
        self.assertNotIn('987654321', json.dumps(events))

    def test_unavailable_services_are_not_reported_as_healthy(self):
        def unavailable(command):
            raise subprocess.TimeoutExpired(command, 12)
        with tempfile.TemporaryDirectory() as folder:
            report = diagnostic.collect(unavailable, Path(folder))
        self.assertEqual(len(report['errors']), len(diagnostic.FIELDS))
        self.assertFalse(report['registrationLogAvailable'])
        self.assertEqual(report['audio'], {'available': False})

    def test_diagnostic_only_reads_fixed_interfaces(self):
        calls = []
        def command(args):
            calls.append(args)
            if args[0] == 'busctl':
                return SimpleNamespace(returncode=0, stdout='{"data":[{"Status":{"data":"denied"}}]}')
            return SimpleNamespace(returncode=0, stdout='active\n' if args[0] == 'systemctl' else '')
        with tempfile.TemporaryDirectory() as folder:
            report = diagnostic.collect(command, Path(folder))
        self.assertEqual(report['properties']['NetworkRegistration']['Status'], 'denied')
        for args in calls:
            if args[0] == 'busctl': self.assertEqual(args[-1], 'GetProperties')
            if args[0] == 'systemctl': self.assertEqual(args[1], 'is-active')


if __name__ == '__main__': unittest.main()
