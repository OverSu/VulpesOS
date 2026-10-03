# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0, str(TOOLS))
import boot_backup
import sargo_workspace as workspace


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS/(name+'.py'))
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


prepare = load('prepare-sargo-device')
collect = load('collect-sargo-installation')


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source = self.root/'inventory'; (self.source/'backup').mkdir(parents=True)
        sizes = {name: 16384 for name in boot_backup.SIZES}
        patcher = patch.object(boot_backup, 'SIZES', sizes); patcher.start(); self.addCleanup(patcher.stop)
        kernel = b'test kernel'
        patcher = patch.object(workspace, 'KERNEL_SHA256', hashlib.sha256(kernel).hexdigest())
        patcher.start(); self.addCleanup(patcher.stop)
        boot = bytearray(16384); boot[:8] = b'ANDROID!'
        struct.pack_into('<10I', boot, 8, len(kernel), 0x8000, 1, 0x1000000, 0, 0, 0x100, 4096, 0, 0)
        boot[4096:4096+len(kernel)] = kernel
        manifest = {'device': 'sargo', 'rawPartitions': True, 'serialSha256': 'a'*64,
                    'activeSlot': 'a', 'files': {}}
        for name, size in sizes.items():
            path = self.source/'backup'/name; path.write_bytes(boot if name=='boot_a.img' else bytes(size))
            manifest['files'][name] = {'bytes': size, 'sha256': workspace.digest(path)}
        (self.source/'backup/manifest.json').write_text(json.dumps(manifest))
        self.layout = {'schema': 2, 'device': '/dev/mmcblk0p72', 'partitionLabel': 'userdata',
                       'filesystem': 'ext4', 'backingDevice': '259:40',
                       'table': '0 104448000 linear 259:40 329728', 'size': 53648801280,
                       'firstMiBSha256': 'b'*64, 'serialSha256': 'a'*64, 'activeSlot': 'a'}
        self.save_layout()

    def save_layout(self):
        (self.source/'layout.json').write_text(json.dumps(self.layout))

    def test_private_workspace_is_portable_without_shared_inventory(self):
        output = prepare.prepare(self.source, self.root/'workspace')
        moved = self.root/'moved'; output.rename(moved)
        plan, layout = workspace.checked_workspace(moved)
        self.assertEqual(plan['backupDirectory'], str(moved/'backup'))
        self.assertEqual(plan['serialSha256'], 'a'*64)
        self.assertEqual(layout, self.layout)

    def test_different_phone_storage_is_rejected_before_output(self):
        self.layout['serialSha256'] = 'c'*64; self.save_layout()
        with self.assertRaisesRegex(ValueError, 'same Sargo'):
            prepare.prepare(self.source, self.root/'workspace')
        self.assertFalse((self.root/'workspace').exists())

    def test_other_filesystem_and_slot_are_rejected(self):
        for name, value in (('filesystem', 'f2fs'), ('activeSlot', 'b')):
            old = self.layout[name]; self.layout[name] = value; self.save_layout()
            with self.assertRaises(ValueError):
                prepare.prepare(self.source, self.root/'workspace')
            self.layout[name] = old

    def test_unknown_kernel_is_rejected(self):
        with patch.object(workspace, 'KERNEL_SHA256', '0'*64):
            with self.assertRaisesRegex(ValueError, 'not been qualified'):
                prepare.prepare(self.source, self.root/'workspace')

    def test_corruption_and_missing_workspace_record_rejected(self):
        output = prepare.prepare(self.source, self.root/'workspace')
        (output/'layout.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'input changed'):
            workspace.checked_workspace(output)

    def test_existing_and_incomplete_directories_rejected(self):
        with self.assertRaisesRegex(ValueError, 'exists'):
            prepare.prepare(self.source, self.source)
        (self.source/'.incomplete').touch()
        with self.assertRaisesRegex(ValueError, 'did not finish'):
            prepare.prepare(self.source, self.root/'workspace')

    def test_collector_does_not_expose_serial_in_identity(self):
        proc = self.root/'proc'; (proc/'device-tree').mkdir(parents=True)
        (proc/'device-tree/compatible').write_bytes(b'google,b4s4-sdm670\0')
        (proc/'device-tree/model').write_text('Google Inc. MSM sdm670 S4 PVT v1.0\0')
        (proc/'cmdline').write_text('androidboot.serialno=PRIVATE androidboot.slot_suffix=_a')
        result = collect.identity(proc)
        self.assertEqual(result['serialSha256'], hashlib.sha256(b'PRIVATE').hexdigest())
        self.assertNotIn('PRIVATE', json.dumps(result))
        (proc/'cmdline').write_text('androidboot.serialno=PRIVATE androidboot.slot_suffix=_b')
        with self.assertRaises(ValueError):
            collect.identity(proc)
        (proc/'cmdline').write_text('androidboot.serialno=PRIVATE androidboot.slot_suffix=_a')
        (proc/'device-tree/model').write_text('Google Inc. MSM sdm670 B4 PVT v1.0\0')
        with self.assertRaisesRegex(ValueError, 'device tree'):
            collect.identity(proc)


if __name__ == '__main__':
    unittest.main()
