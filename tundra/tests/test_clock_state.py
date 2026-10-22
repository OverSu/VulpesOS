import importlib.util
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('clock',Path(__file__).parents[1]/'runtime/clock-state.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ClockState(unittest.TestCase):
    def test_preserves_time_plus_powered_off_elapsed_without_setting_rtc(self):
        with tempfile.TemporaryDirectory() as d, patch.object(m,'STATE',Path(d)/'time.json'), patch.object(m,'RTC',Path(d)/'rtc'):
            m.RTC.write_text('1000')
            with patch.object(m.time,'time',return_value=1792340000): m.save()
            m.RTC.write_text('1600')
            with patch.object(m.time,'time',return_value=1792000000), patch.object(m.time,'clock_settime') as write:
                self.assertTrue(m.restore());write.assert_called_once_with(m.time.CLOCK_REALTIME,1792340600)
            self.assertEqual(m.RTC.read_text(),'1600')
            self.assertEqual(m.STATE.stat().st_mode & 0o777,0o600)
    def test_never_rewinds_valid_wall_time(self):
        with tempfile.TemporaryDirectory() as d,patch.object(m,'STATE',Path(d)/'time.json'),patch.object(m,'rtc_seconds',return_value=None):
            m.STATE.write_text(json.dumps({'epoch':1792340000,'rtc':1000}))
            with patch.object(m.time,'time',return_value=1792350000),patch.object(m.time,'clock_settime') as write:
                self.assertFalse(m.restore());write.assert_not_called()
    def test_corrupt_state_or_reset_rtc_does_not_invent_elapsed_time(self):
        with tempfile.TemporaryDirectory() as d,patch.object(m,'STATE',Path(d)/'time.json'),patch.object(m,'rtc_seconds',return_value=10),patch.object(m.time,'time',return_value=100):
            m.STATE.write_text('invalid')
            self.assertFalse(m.restore())
            m.STATE.write_text(json.dumps({'epoch':1792340000,'rtc':1000}))
            with patch.object(m.time,'clock_settime') as write:
                self.assertTrue(m.restore());write.assert_called_once_with(m.time.CLOCK_REALTIME,1792340000)
