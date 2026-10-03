# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
spec = importlib.util.spec_from_file_location('recovery', TOOLS/'restore-sargo.py')
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.image = self.root/'boot_a.img'
        self.image.write_bytes(b'ANDROID!'+bytes(4088))
        self.size = patch.object(recovery, 'BOOT_SIZE', 4096)
        self.size.start(); self.addCleanup(self.size.stop)
        self.manifest = {'schema': 1, 'device': 'sargo', 'partition': 'boot_a', 'slot': 'a',
                         'image': 'boot_a.img', 'bytes': 4096,
                         'serialSha256': hashlib.sha256(b'PHONE').hexdigest(),
                         'imageSha256': recovery.digest(self.image), 'backupManifestSha256': 'a'*64}
        self.save()

    def save(self):
        (self.root/'recovery.json').write_text(json.dumps(self.manifest))

    def test_local_review_does_not_require_checkout_or_phone(self):
        with patch.object(sys, 'argv', ['restore', '--kit', str(self.root)]), \
                patch.object(recovery.subprocess, 'run') as run, \
                patch.object(recovery.subprocess, 'check_output') as output, \
                patch.object(recovery.os, 'umask'):
            recovery.main()
            run.assert_not_called(); output.assert_not_called()

    def test_corrupted_backup_rejected(self):
        self.image.write_bytes(b'ANDROID!'+b'x'*4088)
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            recovery.checked_kit(self.root)

    def test_incomplete_export_cannot_restore(self):
        (self.root/'.incomplete').touch()
        with patch.object(sys, 'argv', ['restore', '--kit', str(self.root), '--restore']), \
                patch.object(recovery, 'checked_device') as device:
            with self.assertRaisesRegex(ValueError, 'did not finish'):
                recovery.main()
            device.assert_not_called()

    def test_missing_header_even_with_matching_hash_rejected(self):
        self.image.write_bytes(bytes(4096))
        self.manifest['imageSha256'] = recovery.digest(self.image); self.save()
        with self.assertRaisesRegex(ValueError, 'boot header'):
            recovery.checked_kit(self.root)

    def test_other_slot_and_path_are_rejected(self):
        for key, value in (('partition', 'userdata'), ('slot', 'b'), ('image', '../boot_a.img')):
            original = self.manifest[key]
            self.manifest[key] = value; self.save()
            with self.assertRaises(ValueError):
                recovery.checked_kit(self.root)
            self.manifest[key] = original

    def test_wrong_phone_never_gets_a_write(self):
        with patch.object(recovery.subprocess, 'check_output', return_value='OTHER fastboot\n'), \
                patch.object(recovery.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'not uniquely present'):
                recovery.checked_device(self.manifest)
            run.assert_not_called()

    def test_locked_slot_b_wrong_product_and_wrong_partition_size_rejected(self):
        original = {'product': 'sargo', 'unlocked': 'yes', 'current-slot': 'a',
                    'partition-size:boot_a': '0x1000'}
        for name, value in (('product', 'bonito'), ('unlocked', 'no'),
                            ('current-slot', 'b'), ('partition-size:boot_a', '0x2000')):
            values = dict(original, **{name: value})
            with patch.object(recovery.subprocess, 'check_output', return_value='PHONE fastboot\n'), \
                    patch.object(recovery, 'getvar', side_effect=lambda serial, key: values[key]):
                with self.assertRaises(ValueError):
                    recovery.checked_device(self.manifest)

    def test_restore_only_writes_boot_a_without_reboot(self):
        with patch.object(sys, 'argv', ['restore', '--kit', str(self.root), '--restore']), \
                patch.object(recovery, 'checked_device', return_value='PHONE'), \
                patch.object(recovery.subprocess, 'run') as run, \
                patch.object(recovery.os, 'umask'):
            recovery.main()
            run.assert_called_once_with(['fastboot', '-s', 'PHONE', 'flash', 'boot_a',
                                         str(self.image.resolve())], check=True, timeout=90)
        self.assertTrue(json.loads((self.root/'restore-report.json').read_text())['completed'])

    def test_flash_failure_is_recorded_as_incomplete(self):
        with patch.object(sys, 'argv', ['restore', '--kit', str(self.root), '--restore']), \
                patch.object(recovery, 'checked_device', return_value='PHONE'), \
                patch.object(recovery.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'fastboot')), \
                patch.object(recovery.os, 'umask'):
            with self.assertRaises(subprocess.CalledProcessError):
                recovery.main()
        self.assertFalse(json.loads((self.root/'restore-report.json').read_text())['completed'])


if __name__ == '__main__':
    unittest.main()
