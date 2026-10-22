import importlib.util,json,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('mobile',Path(__file__).parents[1]/'runtime/mobile-settings.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class NetworkClock(unittest.TestCase):
 def setUp(self):
  self.checkpoint=patch.object(m,'checkpoint_clock');self.checkpoint.start();self.addCleanup(self.checkpoint.stop)
 def test_monotonic_age_is_added_to_nitz(self):
  payload={'data':[{'UTC':{'data':1791836110},'Received':{'data':530}}]}
  with patch.object(m.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps(payload))),patch.object(m.time,'monotonic',return_value=550):
   self.assertEqual(m.network_time(),1791836130)
 def test_rejects_future_or_missing_received_timestamp(self):
  for received in (None,999999,True):
   payload={'data':[{'UTC':{'data':1791836110},'Received':{'data':received}}]}
   with patch.object(m.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps(payload))),patch.object(m.time,'monotonic',return_value=550):
    with self.assertRaisesRegex(RuntimeError,'NETWORK_TIME_UNAVAILABLE'):m.network_time()
 def test_manual_mode_persists_and_prevents_network_write(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(m,'CLOCK_CONFIG',Path(folder)/'clock.json'),patch.object(m,'network_time') as read,patch.object(m.time,'clock_settime') as write:
   self.assertTrue(m.clock_automatic());m.save_clock_automatic(False)
   self.assertFalse(m.clock_automatic());m.sync_network_clock();read.assert_not_called();write.assert_not_called()
   self.assertEqual(m.CLOCK_CONFIG.stat().st_mode & 0o777,0o600)
 def test_only_corrects_a_real_difference(self):
  with patch.object(m,'clock_automatic',return_value=True),patch.object(m,'network_time',return_value=1791836130),patch.object(m.time,'time',return_value=1791836129),patch.object(m.time,'clock_settime') as write:
   m.sync_network_clock();write.assert_not_called()
  with patch.object(m,'clock_automatic',return_value=True),patch.object(m,'network_time',return_value=1791836130),patch.object(m.time,'time',return_value=1791000000),patch.object(m.time,'clock_settime') as write:
   m.sync_network_clock();write.assert_called_once_with(m.time.CLOCK_REALTIME,1791836130)
 def test_manual_write_rejected_in_auto_mode(self):
  with patch.object(m,'clock_automatic',return_value=True),patch.object(m.subprocess,'run') as command:
   with self.assertRaisesRegex(RuntimeError,'AUTOMATIC_TIME_ENABLED'):m.device_request({'action':'setTime','milliseconds':1791836130000})
   command.assert_not_called()
if __name__=='__main__':unittest.main()
