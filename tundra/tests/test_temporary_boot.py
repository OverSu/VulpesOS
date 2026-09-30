# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0,str(TOOLS))
import boot_backup
spec = importlib.util.spec_from_file_location('temporary_boot',TOOLS/'test-sargo-boot.py')
boot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boot)


class TemporaryBootTests(unittest.TestCase):
    def test_different_phone_rejected_without_fastboot_queries(self):
        with patch.object(boot,'getvar') as getvar:
            with self.assertRaisesRegex(ValueError,'differs from the inventoried'):
                boot.check_device('OTHER',hashlib.sha256(b'EXPECTED').hexdigest())
            getvar.assert_not_called()

    def test_locked_phone_and_slot_b_rejected(self):
        expected = hashlib.sha256(b'SARGO').hexdigest()
        for field,value in [('unlocked','no'),('current-slot','b'),('product','bonito'),('partition-size:boot_a','0x1000')]:
            values = {'product':'sargo','unlocked':'yes','current-slot':'a','partition-size:boot_a':'0x4000000'}
            values[field] = value
            with patch.object(boot,'getvar',side_effect=lambda serial,name:values[name]):
                with self.assertRaises(ValueError):
                    boot.check_device('SARGO',expected)

    def test_mutating_fastboot_commands_are_not_implemented(self):
        with patch.object(boot.subprocess,'run') as run:
            for args in [('flash','boot_a','image.img'),('erase','userdata'),('set_active','b'),('flashing','unlock')]:
                with self.assertRaises(ValueError):
                    boot.fastboot('SARGO',*args)
            run.assert_not_called()

    def test_fastboot_variable_formats(self):
        for line in ['(bootloader) current-slot: a','current-slot: a']:
            result = subprocess.CompletedProcess([],0,'',line+'\nFinished. Total time: 0.001s\n')
            with patch.object(boot,'fastboot',return_value=result):
                self.assertEqual(boot.getvar('SARGO','current-slot'),'a')

    def test_default_mode_cannot_reboot_or_boot(self):
        with patch.object(sys,'argv',['test-sargo-boot.py']), \
             patch.object(boot,'checked_plan',return_value=({},Path('image.img'))), \
             patch.object(boot,'reboot_from_droidian') as reboot, \
             patch.object(boot,'fastboot') as fastboot, \
             patch.object(boot,'find_fastboot') as find, \
             patch.object(boot.os,'umask'), patch('sys.stdout',new_callable=io.StringIO):
            boot.main()
            reboot.assert_not_called()
            fastboot.assert_not_called()
            find.assert_not_called()

    def test_collect_resumes_without_reboot_or_fastboot(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);logs=root/'logs/device';logs.mkdir(parents=True)
            (root/'VALIDATION.json').write_text(json.dumps({'rawSlotADiagnostic':{}}))
            image=root/'image.img';image.write_bytes(b'diagnostic')
            sha=hashlib.sha256(image.read_bytes()).hexdigest()
            previous={'operation':'fastboot boot','fastbootOutput':'Booting OKAY',
                      'imageSha256':sha,'serialSha256':'phone'}
            (logs/'temporary-boot-original.json').write_text(json.dumps(previous))
            plan={'diagnosticImageSha256':sha,'serialSha256':'phone'}
            response={'status':'TUNDRA_USB_STATUS protocol=1 readOnly=true\nEND\n',
                      'version':'Linux version 4.9-124-google-sargo\nEND\n',
                      'mounts':'proc /proc proc ro 0 0\nEND\n',
                      'invalid':'ERROR unsupported command\nEND\n'}
            with patch.object(sys,'argv',['test-sargo-boot.py','--collect']), \
                 patch.object(boot,'ROOT',root), \
                 patch.object(boot,'checked_plan',return_value=(plan,image)), \
                 patch.object(boot,'find_diagnostic',return_value=Path('/dev/bus/usb/003/011')), \
                 patch.object(boot,'device_layout',return_value={'interface':0,'in':129,'out':1}), \
                 patch.object(boot,'exchange',return_value=response), \
                 patch.object(boot,'reboot_from_droidian') as reboot, \
                 patch.object(boot,'fastboot') as fastboot, \
                 patch.object(boot.os,'umask'),patch('sys.stdout',new_callable=io.StringIO):
                boot.main()
                reboot.assert_not_called()
                fastboot.assert_not_called()
            reports=[json.loads(p.read_text()) for p in logs.glob('temporary-boot-*.json') if p.name!='temporary-boot-original.json']
            self.assertEqual(len(reports),1)
            self.assertTrue(reports[0]['passed'])
            self.assertEqual(reports[0]['operation'],'usb collect')
            self.assertEqual(reports[0]['previousBoot']['report'],'logs/device/temporary-boot-original.json')
            validation=json.loads((root/'VALIDATION.json').read_text())
            self.assertTrue(validation['rawSlotADiagnostic']['hardwareTested'])
            self.assertFalse(validation['sargoHardwareDiagnostic']['gaiaIncluded'])


class RawBackupTests(unittest.TestCase):
    def test_corruption_missing_file_and_unexpected_file_rejected(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(boot_backup,'SIZES',{'boot_a.img':4}):
            folder=Path(temp);part=folder/'boot_a.img';part.write_bytes(b'boot')
            m={'device':'sargo','rawPartitions':True,'files':{'boot_a.img':{'bytes':4,'sha256':hashlib.sha256(b'boot').hexdigest()}}}
            manifest=folder/'manifest.json';manifest.write_text(json.dumps(m))
            self.assertEqual(boot_backup.verify(folder),m)
            part.write_bytes(b'bad!')
            with self.assertRaisesRegex(ValueError,'checksum'):
                boot_backup.verify(folder)
            part.unlink()
            with self.assertRaisesRegex(ValueError,'file or size'):
                boot_backup.verify(folder)
            m['files']['../escape']={};manifest.write_text(json.dumps(m))
            with self.assertRaisesRegex(ValueError,'exactly'):
                boot_backup.verify(folder)
