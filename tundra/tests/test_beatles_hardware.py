# SPDX-License-Identifier: MPL-2.0
import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]/'devices/beatles'))
from hardware_control import HardwareControl

class HardwareTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        for name,value in [('backlight',170),('backlight-max',255),('vibrator',0)]:
            (self.root/name).write_text(str(value))
        self.hw=HardwareControl(self.root)
    def value(self,name):return int((self.root/name).read_text())
    def test_brightness_and_restore(self):
        self.hw.request({'operation':'screen','enabled':True,'level':.2})
        self.assertEqual(self.value('backlight'),51)
        self.hw.request({'operation':'screen','enabled':False,'level':.2})
        self.assertEqual(self.value('backlight'),0)
        self.hw.restore();self.assertEqual(self.value('backlight'),170)
    def test_vibration_sequence_cancel_and_shutdown(self):
        with patch('hardware_control.time.monotonic',return_value=10) as clock:
            self.hw.request({'operation':'vibrate','pattern':[120,80,200]})
            self.assertEqual(self.value('vibrator'),120)
            clock.return_value=10.13;self.hw.tick();self.assertEqual(self.value('vibrator'),0)
            clock.return_value=10.22;self.hw.tick();self.assertEqual(self.value('vibrator'),200)
            self.hw.request({'operation':'vibrate','pattern':[]})
            self.assertEqual(self.value('vibrator'),0);self.assertFalse(self.hw.pattern)
            self.hw.request({'operation':'vibrate','pattern':[200]});self.hw.restore()
            self.assertEqual(self.value('vibrator'),0)
    def test_invalid_requests_never_write(self):
        for request in ({'operation':'vibrate','pattern':[10001]}, {'operation':'vibrate','pattern':[True]},
            {'operation':'vibrate','pattern':[5000,5001]}, {'operation':'screen','enabled':True,'level':float('nan')},
            {'operation':'screen','enabled':1,'level':.5},{'operation':'shell'},None):
            with self.assertRaises(ValueError):self.hw.request(request)
        self.assertEqual(self.value('backlight'),170);self.assertEqual(self.value('vibrator'),0)
