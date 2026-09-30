# SPDX-License-Identifier: MPL-2.0
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
spec=importlib.util.spec_from_file_location('install_sargo',ROOT/'tools/install-sargo.py')
install=importlib.util.module_from_spec(spec);spec.loader.exec_module(install)


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.folder=Path(self.temp.name)
        self.image=self.folder/'boot.img';self.image.write_bytes(b'boot')
        self.proof=self.folder/'proof.json';self.proof.write_text('{}')
        self.build={'image':'boot.img','imageSha256':install.digest(self.image),
                    'persistentState':{'uuid':'state'},'watchdogSeconds':None,
                    'serialSha256':'serial','systemImage':{'imageSha256':'system'}}
        self.qualification={'passed':True,'privateInstallReady':True,
          'imageSha256':self.build['imageSha256'],
          'evidenceSha256':{'proof.json':install.digest(self.proof)},
          'persistence':{'passed':True,'distinctBoots':True,'sameGaiaSetting':True,'restored':True}}
        self.save()

    def save(self):
        (self.folder/'build.json').write_text(json.dumps(self.build))
        (self.folder/'qualification.json').write_text(json.dumps(self.qualification))

    def validate(self):
        with patch.object(install,'load',return_value=SimpleNamespace(verify_sources=lambda *args:None)):
            return install.checked_build(self.folder)

    def test_qualified_image(self):
        self.assertEqual(self.validate()[2],self.image)

    def test_mutated_image_or_proof_rejected(self):
        self.image.write_bytes(b'bad')
        with self.assertRaisesRegex(ValueError,'provenance'):self.validate()
        self.image.write_bytes(b'boot');self.proof.write_text('bad')
        with self.assertRaisesRegex(ValueError,'evidence'):self.validate()

    def test_diagnostic_and_timed_images_rejected(self):
        self.build['interactiveDiagnostics']=True;self.save()
        with self.assertRaises(ValueError):self.validate()
        self.build['interactiveDiagnostics']=False;self.build['watchdogSeconds']=600;self.save()
        with self.assertRaises(ValueError):self.validate()

    def test_fake_persistence_rejected(self):
        self.qualification['persistence']['distinctBoots']=False;self.save()
        with self.assertRaisesRegex(ValueError,'round trip'):self.validate()

    def test_only_boot_a_written(self):
        with patch.object(install.subprocess,'run') as run:
            install.flash_boot_a('device',self.image)
            self.assertEqual(run.call_args.args[0],['fastboot','-s','device','flash','boot_a',str(self.image)])

    def test_default_only_reviews(self):
        boot=SimpleNamespace(checked_plan=lambda:({'serialSha256':'serial'},None))
        with patch.object(sys,'argv',['install','--build',str(self.folder)]), \
             patch.object(install,'checked_build',return_value=(self.build,self.qualification,self.image)), \
             patch.object(install,'load',return_value=boot),patch.object(install,'flash_boot_a') as flash:
            install.main();flash.assert_not_called()

    def test_restore_does_not_require_working_candidate(self):
        backup=self.folder/'boot_a.img';backup.write_bytes(b'original')
        boot=SimpleNamespace(checked_plan=lambda:({'serialSha256':'serial','backupDirectory':str(self.folder)},None),
             find_fastboot=lambda *args:'device',check_device=lambda *args:{'product':'sargo'})
        with patch.object(sys,'argv',['install','--build',str(self.folder),'--restore']), \
             patch.object(install,'load',return_value=boot), \
             patch.object(install,'checked_build',side_effect=AssertionError('Candidate cannot gate recovery')), \
             patch.object(install,'flash_boot_a') as flash:
            install.main();flash.assert_called_once_with('device',backup)


if __name__=='__main__':unittest.main()
