# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location('ssh_inventory', TOOLS/'collect-device-ssh.py')
inventory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory)


class SSHInventoryTests(unittest.TestCase):
    def test_model_and_compatible_do_not_confuse_sargo_and_bonito(self):
        self.assertEqual(inventory.identify('Google Pixel 3a\0', ''), 'sargo')
        self.assertEqual(inventory.identify('', 'google,sargo\0qcom,sdm670\0'), 'sargo')
        self.assertEqual(inventory.identify('Google Pixel 3a XL', 'google,sargo'), 'wrong-device-pixel-3a-xl')
        self.assertEqual(inventory.identify('Qualcomm SDM670', ''), 'unverified')
        self.assertEqual(inventory.identify('Google Inc. MSM sdm670 S4 PVT v1.0',
                                          'google,b4s4-sdm670\0qcom,sdm670\0', 'sargo\n'), 'sargo')
        self.assertEqual(inventory.identify('Google Pixel 3a', '', 'bonito'), 'wrong-device-pixel-3a-xl')

    def test_remote_argument_is_quoted_and_fallback_connection_disabled(self):
        base = inventory.ssh_base('/tmp/test-control', '10.15.19.82', 'droidian')
        self.assertIn('ProxyCommand=false', base)
        result = subprocess.CompletedProcess([], 0, '', '')
        with patch.object(inventory.subprocess, 'run', return_value=result) as run:
            inventory.capture(base, ['dpkg-query', '-f', '${Version}\n'])
        self.assertEqual(run.call_args.args[0][-1], "dpkg-query -f '${Version}\n'")
        self.assertNotIn('shell', run.call_args.kwargs)

    def test_read_commands_have_no_privileged_or_mutating_entrypoints(self):
        allowed = {'id', 'cat', 'uname', 'lsblk', 'ls', 'systemctl', 'dpkg-query', 'getprop'}
        for command in inventory.READS.values():
            self.assertIn(command[0], allowed)
            if command[0] == 'systemctl':
                self.assertEqual(command[1], 'list-units')
