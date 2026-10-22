# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import unittest
import tempfile
import struct
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('cover',Path(__file__).parents[1]/'devices/beatles/cover-display.py')
cover=importlib.util.module_from_spec(spec);spec.loader.exec_module(cover)

class CoverTests(unittest.TestCase):
    def test_animation_timing_padding_and_loop(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'animation'
            first=b'\x00\xf8'*(240*240);second=b'\x1f\x00'*(240*240)
            path.write_bytes(b'VULPANM1'+struct.pack('<I',2)+struct.pack('<I',50)+first+struct.pack('<I',100)+second)
            animation=cover.Animation(path)
            try:
                self.assertEqual(animation.frame(0,480),(first,.05,0))
                self.assertEqual(animation.frame(.05,480),(second,.1,1))
                self.assertEqual(animation.frame(.15,480),(first,.05,0))
                padded,_,_=animation.frame(0,484)
                self.assertEqual(len(padded),240*484)
                self.assertEqual(padded[480:484],bytes(4))
            finally:animation.close()

    def test_animation_rejects_invalid_and_truncated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'animation'
            for data in (b'',b'WRONGHDR'+struct.pack('<I',1),b'VULPANM1'+struct.pack('<I',241),
                         b'VULPANM1'+struct.pack('<II',1,1)+bytes(240*240*2)):
                path.write_bytes(data)
                with self.assertRaises(ValueError):cover.Animation(path)

    def test_unknown_and_stale_are_not_full_battery_or_registered_network(self):
        self.assertEqual(cover.labels({},100),('—','—'))
        self.assertEqual(cover.labels({'recordedAt':1,'battery':{'level':1}},100),('—','—'))
    def test_live_values_and_absent_second_sim(self):
        state={'recordedAt':100,'battery':{'level':.73},'radio':[
            {'available':False},{'available':True,'operator':{'longName':'Orange F'}}]}
        self.assertEqual(cover.labels(state,105),('73 %','Orange F'))
    def test_custom_title_and_colors(self):
        title,ink,battery=cover.preferences({'vulpes.cover.title':'  Mon Nokia  ',
            'vulpes.cover.titleColor':'#FF0000','vulpes.cover.batteryColor':'#00ff00'})
        self.assertEqual(title,'Mon Nokia');self.assertEqual(ink,(1,0,0));self.assertEqual(battery,(0,1,0))

    def test_invalid_preferences_and_long_title_are_safe(self):
        title,ink,battery=cover.preferences({'vulpes.cover.title':['invalid'],
            'vulpes.cover.titleColor':'url(file:///x)','vulpes.cover.batteryColor':None})
        self.assertEqual(title,'VULPES');self.assertEqual(ink,battery)
        self.assertEqual(cover.preferences({'vulpes.cover.title':'A'*30+'\n'})[0],'A'*24)
        self.assertEqual(cover.preferences({'vulpes.cover.title':'\n'})[0],'VULPES')

    def test_invalid_battery(self):
        self.assertEqual(cover.labels({'recordedAt':100,'battery':{'level':2}},100),('—','—'))

    def test_rejected_refresh_can_recover_without_stopping_gaia(self):
        with patch.object(cover.fcntl,'ioctl',side_effect=[PermissionError(1,'panel asleep'),0]):
            self.assertEqual(cover.present(3,bytearray(160)),{'ok':False,'errno':1})
            self.assertEqual(cover.present(3,bytearray(160)),{'ok':True})

if __name__=='__main__':unittest.main()
