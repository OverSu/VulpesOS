# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location('stage_files', TOOLS/'stage-sargo-files.py')
stage = importlib.util.module_from_spec(spec); spec.loader.exec_module(stage)


class ReceiveTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        paths = {'/proc/device-tree/compatible': b'google,b4s4-sdm670\0',
                 '/proc/device-tree/model': b'Google Inc. MSM sdm670 S4 PVT v1.0\0',
                 '/proc/cmdline': b'androidboot.serialno=PHONE androidboot.slot_suffix=_a',
                 '/sys/class/block/mmcblk0p72/dev': b'259:40', '/dev/mmcblk0p72': bytes(1048576)}
        for name, content in paths.items():
            target = self.root/name.lstrip('/'); target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        self.mount = self.root/'installed'; self.mount.mkdir()
        self.config = {'kind': 'data', 'name': 'new.ext4', 'bytes': 4,
                       'sha256': hashlib.sha256(b'data').hexdigest(), 'requiredBytes': 4,
                       'serialSha256': hashlib.sha256(b'PHONE').hexdigest(),
                       'layout': {'firstMiBSha256': hashlib.sha256(bytes(1048576)).hexdigest(),
                                  'size': 53648801280, 'table': '0 104448000 linear 259:40 329728'},
                       'mount': str(self.mount), 'checkOnly': False}

    def run_receiver(self, data=b'data'):
        real_path = Path
        def path(name):
            name = str(name)
            return real_path(self.root/name.lstrip('/')) if name.startswith(('/proc/', '/dev/', '/sys/')) else real_path(name)
        def command(args, **kwargs):
            if args[0] == 'blockdev': return '53648801280'
            if args[0] == 'findmnt': return json.dumps({'filesystems': [{'fstype': 'ext4', 'source': '/dev/mapper/test'}]})
            if args[0] == 'dmsetup': return '0 104448000 linear 259:40 329728'
            raise AssertionError('Unexpected command: '+repr(args))
        with patch('pathlib.Path', side_effect=path), patch('stat.S_ISBLK', return_value=True), \
                patch('subprocess.check_output', side_effect=command), \
                patch('os.statvfs', return_value=SimpleNamespace(f_bavail=10*1024**3, f_frsize=1)), \
                patch.object(sys, 'argv', ['receiver', json.dumps(self.config)]), \
                patch.object(sys, 'stdin', SimpleNamespace(buffer=io.BytesIO(data))), \
                patch.object(sys, 'stdout', io.StringIO()), patch('os.umask'):
            exec(compile(stage.RECEIVE, 'receiver', 'exec'), {})

    def test_matching_phone_receives_fresh_file(self):
        self.run_receiver()
        self.assertEqual((self.mount/'tundra/data/new.ext4').read_bytes(), b'data')

    def test_existing_data_never_overwritten(self):
        target = self.mount/'tundra/data/new.ext4'; target.parent.mkdir(parents=True)
        target.write_bytes(b'personal data')
        with self.assertRaisesRegex(ValueError, 'Existing data retained'):
            self.run_receiver()
        self.assertEqual(target.read_bytes(), b'personal data')

    def test_short_and_oversized_transfers_leave_no_file(self):
        for data in (b'x', b'too long'):
            with self.assertRaises(ValueError): self.run_receiver(data)
            self.assertEqual(list((self.mount/'tundra/data').iterdir()), [])

    def test_other_phone_refused_before_writing(self):
        self.config['serialSha256'] = 'a'*64
        with self.assertRaisesRegex(ValueError, 'Wrong phone'):
            self.run_receiver()
        self.assertFalse((self.mount/'tundra').exists())

    def test_storage_identity_and_geometry_changes_refused(self):
        for key, value in (('firstMiBSha256', 'a'*64), ('table', '0 104448000 linear 259:40 4096')):
            old = self.config['layout'][key]; self.config['layout'][key] = value
            with self.assertRaises(ValueError):self.run_receiver()
            self.config['layout'][key] = old
        self.assertFalse((self.mount/'tundra').exists())

    def test_preflight_does_not_create_directories(self):
        self.config['checkOnly'] = True
        with self.assertRaises(SystemExit):self.run_receiver()
        self.assertFalse((self.mount/'tundra').exists())


if __name__ == '__main__':unittest.main()
