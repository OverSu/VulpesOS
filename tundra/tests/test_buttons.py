import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
s=importlib.util.spec_from_file_location('buttons',Path(__file__).resolve().parents[1]/'runtime/buttons.py')
b=importlib.util.module_from_spec(s);s.loader.exec_module(b)
class Buttons(unittest.TestCase):
 def test_only_physical_control_edges(self):
  self.assertEqual(b.key_event(1,116,1),'sleep-button-press')
  self.assertEqual(b.key_event(1,115,0),'volume-up-button-release')
  for event in [(3,116,1),(1,30,1),(1,116,2)]:self.assertIsNone(b.key_event(*event))
 def test_backlight_validation_and_wake(self):
  with tempfile.TemporaryDirectory() as d,patch.object(b,'BACKLIGHT',Path(d)):
   (Path(d)/'max_brightness').write_text('1023')
   b.control({'operation':'screen','enabled':False,'level':.5})
   self.assertEqual((Path(d)/'brightness').read_text(),'0')
   b.control({'operation':'screen','enabled':True,'level':.5})
   self.assertEqual((Path(d)/'brightness').read_text(),'512')
   for p in [{'operation':'screen','enabled':True,'level':-1},{'operation':'volume','level':float('nan')},{'operation':'exec','command':'true'}]:
    with self.assertRaises(ValueError):b.control(p)

 def test_vibration_pattern_progresses_without_blocking_and_can_be_cancelled(self):
  with tempfile.TemporaryDirectory() as d,patch.object(b,'VIBRATOR',Path(d)),patch.object(b.time,'monotonic',return_value=10):
   v=b.Vibration();v.start([200,100,300])
   self.assertEqual((Path(d)/'brightness').read_text(),'255')
   self.assertEqual(v.deadline,10.2)
   v.advance(10.1);self.assertEqual((Path(d)/'brightness').read_text(),'255')
   v.advance(10.2);self.assertEqual((Path(d)/'brightness').read_text(),'0')
   v.advance(10.31);self.assertEqual((Path(d)/'brightness').read_text(),'255')
   v.advance(10.62);self.assertEqual((Path(d)/'brightness').read_text(),'0')
   v.start([200]);v.start([]);self.assertIsNone(v.deadline);self.assertEqual((Path(d)/'brightness').read_text(),'0')
   for pattern in [None,[-1],[True],[10001],[5000,5001],[1]*33]:
    with self.assertRaises(ValueError):v.start(pattern)
