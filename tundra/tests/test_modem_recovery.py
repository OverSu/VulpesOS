# SPDX-License-Identifier: MPL-2.0
"""Check modem selection without modifying a host's subsystem policy."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    'modem_recovery', Path(__file__).resolve().parents[1]/'runtime/modem-recovery.py')
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


class ModemRecoveryTest(unittest.TestCase):
    def test_only_modem_policy_changes_and_repeated_setup_is_safe(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for identifier, name in [('subsys1', 'adsp'), ('subsys7', 'modem')]:
                device = root/identifier
                device.mkdir()
                (device/'name').write_text(name+'\n')
                (device/'restart_level').write_text('SYSTEM\n')
            recovery.configure(root)
            recovery.configure(root)
            self.assertEqual((root/'subsys1/restart_level').read_text(), 'SYSTEM\n')
            self.assertEqual((root/'subsys7/restart_level').read_text(), 'RELATED\n')

    def test_missing_modem_is_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(RuntimeError, 'Expected one'):
                recovery.configure(Path(folder))

    def test_unknown_policy_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            device = root/'subsys0'
            device.mkdir()
            (device/'name').write_text('modem\n')
            (device/'restart_level').write_text('UNKNOWN\n')
            with self.assertRaisesRegex(RuntimeError, 'Unsupported'):
                recovery.configure(root)
            self.assertEqual((device/'restart_level').read_text(), 'UNKNOWN\n')
