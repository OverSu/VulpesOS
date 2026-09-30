# SPDX-License-Identifier: MPL-2.0
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import persistent_state as state


class PersistentStateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.identifier='2a29bca9-5fcb-48a1-a287-dc975f56b353'
        self.image=self.root/(self.identifier+'.ext4')
        with self.image.open('wb') as output:output.truncate(512*1024**2)
        self.value={'schema':1,'device':'sargo','uuid':self.identifier,
                    'image':self.image.name,'bytes':512*1024**2,
                    'imageSha256':'a'*64,'systemImageSha256':'b'*64,
                    'filesystemCheckPassed':True}
        self.path=self.root/'state.json'

    def validate(self):
        self.path.write_text(json.dumps(self.value))
        with patch.object(state,'digest',return_value='a'*64):
            return state.validate_manifest(self.path)

    def test_valid_prepared_state(self):
        self.assertEqual(self.validate()['uuid'],self.identifier)

    def test_path_escape_and_shell_input_rejected(self):
        for key,value in [('image','../../root.img'),('uuid','$(command)'),('systemImageSha256','; reboot')]:
            old=self.value[key];self.value[key]=value
            with self.assertRaises(ValueError):self.validate()
            self.value[key]=old

    def test_size_change_rejected(self):
        self.image.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'changed'):self.validate()

    def test_symlink_rejected(self):
        target=self.root/'other';self.image.rename(target);self.image.symlink_to(target)
        with self.assertRaisesRegex(ValueError,'changed'):self.validate()

    def test_missing_fs_check_rejected(self):
        self.value['filesystemCheckPassed']=False
        with self.assertRaisesRegex(ValueError,'verification'):self.validate()


if __name__=='__main__':unittest.main()
