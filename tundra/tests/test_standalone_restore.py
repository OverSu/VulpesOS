# SPDX-License-Identifier: MPL-2.0
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('restore', Path(__file__).resolve().parents[1]/'tools/restore-standalone-sargo.py')
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


class RestoreTests(unittest.TestCase):
    def make_backup(self, folder):
        payload = b'original userdata\0' * 100
        sha = hashlib.sha256(payload).hexdigest()
        data = {'archive': 'userdata-original.raw.gz', 'bytes': len(payload),
                'sha256': sha, 'checked': True, 'sourceWasUnmounted': True}
        (folder/data['archive']).write_bytes(gzip.compress(payload))
        (folder/'userdata.json').write_text(json.dumps(data))
        files = {}
        for name in ('boot_a.img', 'dtbo_a.img', 'vbmeta_a.img'):
            content = name.encode()
            (folder/name).write_bytes(content)
            files[name] = {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
        manifest = {'device': 'sargo', 'activeSlot': 'a', 'files': files,
                    'userdataSha256': sha, 'userdataBytes': len(payload)}
        (folder/'recovery.json').write_text(json.dumps(manifest))
        return manifest

    def test_review_verifies_backup_without_phone_commands(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.make_backup(folder)
            with patch.object(sys, 'argv', ['restore', '--backup', directory]), \
                 patch.object(restore.subprocess, 'run') as run, \
                 patch.object(restore.subprocess, 'check_output') as read:
                restore.main()
                run.assert_not_called()
                read.assert_not_called()

    def test_unbound_userdata_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            manifest = self.make_backup(folder)
            manifest['userdataSha256'] = '0' * 64
            (folder/'recovery.json').write_text(json.dumps(manifest))
            with patch.object(sys, 'argv', ['restore', '--backup', directory]), \
                 patch.object(restore.subprocess, 'run') as run:
                with self.assertRaisesRegex(ValueError, 'not bound'):
                    restore.main()
                run.assert_not_called()

    def test_altered_userdata_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.make_backup(folder)
            (folder/'userdata-original.raw.gz').write_bytes(gzip.compress(b'changed'))
            with patch.object(sys, 'argv', ['restore', '--backup', directory]):
                with self.assertRaisesRegex(ValueError, 'Storage backup changed'):
                    restore.main()


if __name__ == '__main__':
    unittest.main()
