# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'droidian/backup-boot.py'
spec = importlib.util.spec_from_file_location('backup_boot', SOURCE)
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class BootBackupTests(unittest.TestCase):
    def test_copy_is_exact_even_with_more_input(self):
        data = b'sargo boot' * 200000
        source, destination = io.BytesIO(data + b'next partition'), io.BytesIO()
        self.assertEqual(backup.copy_exact(source, destination, len(data)),
                         hashlib.sha256(data).hexdigest())
        self.assertEqual(destination.getvalue(), data)
        self.assertEqual(source.read(), b'next partition')

    def test_short_partition_read_is_not_reported_as_success(self):
        with self.assertRaisesRegex(RuntimeError, 'before its declared size'):
            backup.copy_exact(io.BytesIO(b'incomplete'), io.BytesIO(), 1024)

    def test_no_privilege_means_no_output_or_device_access(self):
        with patch.object(backup.os, 'geteuid', return_value=32011), \
             patch.object(backup.tempfile, 'mkdtemp') as mkdir, \
             patch.object(backup.os, 'open') as open_device:
            with self.assertRaisesRegex(RuntimeError, 'require sudo'):
                backup.main()
            mkdir.assert_not_called()
            open_device.assert_not_called()

    def test_other_device_is_rejected_before_output(self):
        with patch.object(backup.os, 'geteuid', return_value=0), \
             patch.object(backup.pwd, 'getpwnam'), \
             patch.object(backup.Path, 'exists', return_value=True), \
             patch.object(backup.Path, 'read_bytes', return_value=b'google,bonito\0'), \
             patch.object(backup.subprocess, 'check_output', return_value='bonito\n'), \
             patch.object(backup.tempfile, 'mkdtemp') as mkdir:
            with self.assertRaisesRegex(RuntimeError, 'inventoried Sargo'):
                backup.main()
            mkdir.assert_not_called()
