# SPDX-License-Identifier: MPL-2.0
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS=Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0,str(TOOLS))
from standalone_volume import checked_volume
spec=importlib.util.spec_from_file_location('standalone_boot',TOOLS/'build-standalone-boot.py')
boot=importlib.util.module_from_spec(spec);spec.loader.exec_module(boot)


class StandaloneBootTests(unittest.TestCase):
    def setUp(self):
        self.volume={'schema':1,'device':'sargo','storage':'raw-userdata-ext4','image':'userdata.ext4',
                     'uuid':'12345678-1234-1234-1234-123456789abc','bytes':8*1024**3,
                     'imageSha256':'a'*64,'systemImageSha256':'b'*64,'filesystemCheckPassed':True}
        self.init=b'''EXPECTED_STORAGE_HASH=old
# Use the inventoried filesystem
mount /dev/mapper/tundra-installed-ro /installed
echo TUNDRA_RESCUE_READY
exec /bin/sh /native-root.sh
'''
        self.native=b'''SYSTEM_IMAGE=/installed/tundra/images/system.ext4
LOWER=/installed/home/droidian/vulpes-tundra-tests/runtime-reference-20260925/root
mkdir -p /newroot/reference/installed
mount --move /installed /newroot/reference/installed
'''

    def test_direct_boot_has_no_legacy_storage_path(self):
        init,native,mount=boot.storage_scripts(self.init,self.native,self.volume,False)
        self.assertNotIn(b'EXPECTED_STORAGE_HASH',init)
        self.assertNotIn(b'/dev/mapper',init)
        self.assertNotIn(b'/installed',native)
        self.assertNotIn(b'/home/droidian',native)
        self.assertIn(b'/dev/mmcblk0p72',mount)
        self.assertIn(b'VOLUME_OPTIONS=rw',mount)
        self.assertNotIn(b'mkfs',mount)
        self.assertIn(b'/newroot/reference/tundra-volume',native)

    def test_container_boot_changes_only_volume_access(self):
        init,native,mount=boot.storage_scripts(self.init,self.native,self.volume,True)
        self.assertIn(b'/run/legacy-storage',init)
        self.assertIn(b'VOLUME_OPTIONS=loop,rw',mount)
        self.assertNotIn(b'/dev/mmcblk0p72',mount)
        self.assertIn(b'/volume/tundra/images',native)
        for script in (init,native,mount):
            self.assertEqual(subprocess.run(['sh','-n'],input=script,capture_output=True).returncode,0)

    def test_bundled_hardware_is_bound_read_only(self):
        volume={**self.volume,'hardwareImages':{'vendor.img':{'sha256':'a'*64,'bytes':4096},'modem.img':{'sha256':'b'*64,'bytes':4096}}}
        native=self.native+b'# Installed lower layers stay reachable\n'
        _,script,_=boot.storage_scripts(self.init,native,volume,False)
        self.assertIn(b'mount -o remount,bind,ro /newroot/reference/vendor.img',script)
        self.assertIn(b'/newroot/etc/tundra/hardware-images.json',script)
        self.assertEqual(subprocess.run(['sh','-n'],input=script,capture_output=True).returncode,0)

    def test_wrong_volume_metadata_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'volume.json'
            path.write_text(json.dumps(self.volume));checked_volume(path,False)
            for key,value in [('device','bonito'),('image','../userdata.ext4'),('bytes',1),('uuid','$(reboot)'),('storage','lvm'),('filesystemCheckPassed',False)]:
                path.write_text(json.dumps({**self.volume,key:value}))
                with self.assertRaises(ValueError):checked_volume(path,False)

    def test_boot_success_requires_current_gaia_on_raw_userdata(self):
        spec=importlib.util.spec_from_file_location('success',TOOLS.parent/'runtime/mark-boot-success.py')
        success=importlib.util.module_from_spec(spec);spec.loader.exec_module(success)
        gaia={'bootId':'current','passed':True,'checks':{'home':True}}
        mount={'source':'/dev/mmcblk0p72','fstype':'ext4'}
        self.assertTrue(success.eligible('current',gaia,mount,{'androidboot.slot_suffix':'_a'},True))
        self.assertFalse(success.eligible('new',gaia,mount,{'androidboot.slot_suffix':'_a'},True))
        self.assertFalse(success.eligible('current',gaia,{'source':'/dev/loop1','fstype':'ext4'},{'androidboot.slot_suffix':'_a'},True))
        self.assertFalse(success.eligible('current',gaia,mount,{'androidboot.slot_suffix':'_b'},True))
        self.assertFalse(success.eligible('current',gaia,mount,{'androidboot.slot_suffix':'_a'},False))

    def test_old_installer_refuses_standalone_image(self):
        spec=importlib.util.spec_from_file_location('install',TOOLS/'install-sargo.py')
        install=importlib.util.module_from_spec(spec);spec.loader.exec_module(install)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory);(path/'build.json').write_text(json.dumps({'storageMode':'raw-userdata-ext4'}))
            with self.assertRaisesRegex(ValueError,'standalone installer'):
                install.checked_build(path)


if __name__=='__main__':unittest.main()
