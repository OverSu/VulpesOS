# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hardware', ROOT/'runtime/hardware-status.py')
hardware = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardware)
spec = importlib.util.spec_from_file_location('native', ROOT/'runtime/prepare-native.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class HardwareTests(unittest.TestCase):
    def test_battery_absent_invalid_and_real_charge(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.assertIsNone(hardware.battery_state(root))
            (root/'capacity').write_text('72')
            (root/'status').write_text('Discharging')
            self.assertEqual(hardware.battery_state(root),
                             {'level': .72, 'charging': False, 'status': 'Discharging'})
            (root/'status').write_text('Full')
            self.assertTrue(hardware.battery_state(root)['charging'])
            (root/'capacity').write_text('101')
            self.assertIsNone(hardware.battery_state(root))

    def test_wifi_reports_missing_and_real_device_states_without_identifiers(self):
        for code, state, available in [(20,'unavailable',False), (30,'disconnected',True),
                                        (100,'connected',True), (120,'failed',True)]:
            with patch.object(hardware.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=f'{code} (label)')) as run:
                self.assertEqual(hardware.wifi_state(), {'available': available, 'state': state})
                self.assertEqual(run.call_args.args[0][2], 'GENERAL.STATE')
        with patch.object(hardware.subprocess, 'run', side_effect=FileNotFoundError):
            self.assertFalse(hardware.wifi_state()['available'])

    def test_native_network_configuration_preserves_rescue_and_has_no_connections(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/'opt/vulpes/trial').mkdir(parents=True)
            (root/'opt/vulpes/trial/session.py').touch()
            (root/'usr/sbin').mkdir(parents=True)
            (root/'usr/sbin/NetworkManager').touch()
            native.prepare(root)
            config = (root/'etc/NetworkManager/NetworkManager.conf').read_text()
            self.assertIn('unmanaged-devices=*,except:interface-name:wlan0', config)
            self.assertIn('auth-polkit=root-only', config)
            self.assertIn('enabled=false', config)
            self.assertFalse((root/'etc/NetworkManager/system-connections').exists())
            self.assertIn('VULPES_TUNDRA=1', (root/'etc/systemd/system/tundra-display.service').read_text())


if __name__ == '__main__':
    unittest.main()
