# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('flash',Path(__file__).resolve().parents[1]/'tools/flash-standalone-sargo.py')
flash=importlib.util.module_from_spec(spec);spec.loader.exec_module(flash)


class FlashTests(unittest.TestCase):
    def plan(self):
        return {'userdataBytes':8*1024**3,'partitions':{name:{'bytes':4096} for name in flash.PARTITIONS}}

    def values(self,**changes):
        values={'product':'sargo','unlocked':'yes','current-slot':'b',
                **{'partition-size:'+name:hex(64*1024**3 if name=='userdata' else 64*1024**2) for name in flash.PARTITIONS}}
        values.update(changes);return values

    def test_both_slots_accepted_for_full_install(self):
        for slot in ('a','b'):
            values=self.values(**{'current-slot':slot})
            with patch.object(flash,'getvar',side_effect=lambda _,__,name:values[name]):
                self.assertEqual(flash.preflight('fastboot','serial',self.plan())['current-slot'],slot)

    def test_wrong_model_locked_or_small_partition_rejected(self):
        for change in ({'product':'bonito'},{'unlocked':'no'},{'partition-size:userdata':'0x1000'}):
            values=self.values(**change)
            with patch.object(flash,'getvar',side_effect=lambda _,__,name:values[name]):
                with self.assertRaises(ValueError):flash.preflight('fastboot','serial',self.plan())

    def test_review_never_contacts_device(self):
        with patch.object(sys,'argv',['flash']),patch.object(flash,'package',return_value=self.plan()),patch.object(flash.subprocess,'run') as run,patch.object(flash.subprocess,'check_output') as read:
            flash.main();run.assert_not_called();read.assert_not_called()

    def test_install_requires_explicit_userdata_replacement(self):
        with patch.object(sys,'argv',['flash','--install']),patch.object(flash,'package',return_value=self.plan()),patch.object(flash.subprocess,'run') as run:
            with self.assertRaises(SystemExit):flash.main()
            run.assert_not_called()

    def test_unqualified_package_requires_experimental_flag(self):
        with patch.object(sys,'argv',['flash','--install','--erase-userdata']),patch.object(flash,'package',return_value=self.plan()),patch.object(flash.subprocess,'run') as run:
            with self.assertRaises(SystemExit):flash.main()
            run.assert_not_called()

    def test_sparse_geometry(self):
        with tempfile.TemporaryDirectory() as directory:
            image=Path(directory)/'userdata.img'
            image.write_bytes(struct.pack('<I4H4I',0xed26ff3a,1,0,28,12,4096,2097152,3,0))
            self.assertEqual(flash.sparse_size(image),8*1024**3)
            image.write_bytes(b'bad')
            with self.assertRaises(ValueError):flash.sparse_size(image)

    def test_incomplete_package_is_rejected_before_manifest_read(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory)/'.incomplete').touch()
            with self.assertRaisesRegex(ValueError,'construction is incomplete'):
                flash.package(directory)

    def test_install_writes_only_planned_partitions_after_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            argv=['flash','--package',directory,'--install','--erase-userdata','--experimental']
            with patch.object(sys,'argv',argv),patch.object(flash,'package',return_value=self.plan()), \
                 patch.object(flash.shutil,'which',return_value='fastboot'), \
                 patch.object(flash.subprocess,'check_output',return_value='test-device fastboot\n'), \
                 patch.object(flash,'preflight',return_value={'product':'sargo'}) as preflight, \
                 patch.object(flash.subprocess,'run') as run:
                flash.main()
                preflight.assert_called_once()
                commands=[call.args[0][3:] for call in run.call_args_list]
                self.assertEqual(commands[0],['erase','userdata'])
                self.assertEqual([command[:2] for command in commands[1:-1]],
                                 [['flash',partition] for partition in flash.PARTITIONS])
                self.assertEqual(commands[-1],['set_active','a'])


if __name__=='__main__':unittest.main()
