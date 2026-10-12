import base64,contextlib,importlib.util,json,tempfile,unittest,subprocess,sys,shutil
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('mms_control',ROOT/'tundra/runtime/mms-control.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MMS(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=m.ROOT;m.ROOT=Path(self.tmp.name)
 def tearDown(self):m.ROOT=self.old;self.tmp.cleanup()
 def test_reject_paths_and_oversize(self):
  value={'recipients':['+15550199'],'parts':[{'id':'../secret','type':'text/plain','data':'AA=='}]}
  with self.assertRaises(ValueError):m.validate_send(value)
  value['parts'][0]['id']='text.txt';value['parts'][0]['data']=base64.b64encode(b'x'*(m.LIMIT+1)).decode()
  with self.assertRaises(ValueError):m.validate_send(value)
 def test_queue_acceptance_is_not_delivery(self):
  with patch.object(m,'codec',return_value={'data':'AA==','transaction':'t'}):
   r=m.request({'version':1,'operation':'send','recipients':['+15550199'],'parts':[{'id':'text.txt','type':'text/plain','data':'AA=='}]})
  self.assertEqual(m.request({'version':1,'operation':'state','path':r['path']})['state'],'pending')
 def test_operator_acceptance_required(self):
  row={'direction':'outgoing','encoded':{'data':'AA==','transaction':'t'}}
  with patch.object(m,'bearer',return_value=contextlib.nullcontext({'url':'http://mmsc.invalid'})),patch.object(m,'transfer',return_value=b'confirmation'),patch.object(m,'codec',return_value={'accepted':False}):
   with self.assertRaisesRegex(ValueError,'MMS_REJECTED'):m.process(row)
 def test_ack_does_not_delete_outgoing_or_unread_queue(self):
  m.save(m.ROOT/'queue.json',[{'id':'o','direction':'outgoing','state':'pending'},{'id':'i','direction':'incoming','state':'received','message':{'receipt':'i'}}])
  m.request({'version':1,'operation':'ack','ids':['o','i']});r=m.records()
  self.assertEqual(r[0]['state'],'pending');self.assertEqual(r[1]['state'],'stored');self.assertNotIn('message',r[1])
 def test_incoming_network_error_keeps_notification_retryable(self):
  m.save(m.ROOT/'queue.json',[{'id':'i','direction':'incoming','state':'pending','notification':{}}])
  with patch.object(m,'process',side_effect=ValueError('MMS_DATA_UNAVAILABLE')):self.assertTrue(m.process_once())
  row=m.records()[0];self.assertEqual(row['state'],'pending');self.assertGreater(row['retryAt'],0)
  self.assertFalse(m.process_once())
 def test_outgoing_transport_error_is_never_retried_automatically(self):
  m.save(m.ROOT/'queue.json',[{'id':'o','direction':'outgoing','state':'pending'}])
  with patch.object(m,'process',side_effect=ValueError('MMS_TRANSPORT_ERROR')):m.process_once()
  self.assertEqual(m.records()[0]['state'],'failed');self.assertFalse(m.process_once())
 def test_retrieval_ack_retry_survives_gaia_acknowledgement(self):
  m.save(m.ROOT/'queue.json',[{'id':'i','direction':'incoming','state':'received','ackPending':True,'notification':{},'message':{}}])
  m.request({'version':1,'operation':'ack','ids':['i']})
  with patch.object(m,'process',return_value={'ackPending':False}):m.process_once()
  row=m.records()[0];self.assertEqual(row['state'],'stored');self.assertFalse(row['ackPending'])
 def test_connection_failure_closes_http_socket(self):
  from unittest.mock import Mock
  sock=Mock();sock.connect.side_effect=OSError('network unavailable')
  with patch.object(m.socket,'socket',return_value=sock):
   with self.assertRaises(OSError):m.transfer({'proxy':True,'url':'http://mmsc.invalid','host':'192.0.2.1','port':8080,'interface':'test0','address':'192.0.2.2'},'http://mmsc.invalid',b'body')
  sock.close.assert_called_once()
 @unittest.skipUnless(shutil.which('dbus-run-session') and importlib.util.find_spec('dbus') and importlib.util.find_spec('gi'),'D-Bus/GLib integration dependencies unavailable')
 def test_private_bus_cleanup_does_not_exit_the_daemon(self):
  script='''
import os,sys,importlib.util
os.environ['DBUS_SYSTEM_BUS_ADDRESS']=os.environ['DBUS_SESSION_BUS_ADDRESS']
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib
DBusGMainLoop(set_as_default=True)
s=importlib.util.spec_from_file_location('mms',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
loop=GLib.MainLoop()
def close_bearer():
 try:
  with m.bearer():pass
 except Exception:pass
 GLib.timeout_add(100,alive)
 return False
def alive():
 print('daemon-survived');loop.quit();return False
GLib.idle_add(close_bearer);loop.run()
'''
  r=subprocess.run(['dbus-run-session',sys.executable,'-c',script,str(ROOT/'tundra/runtime/mms-control.py')],capture_output=True,text=True,timeout=5)
  self.assertEqual(r.returncode,0,r.stderr);self.assertIn('daemon-survived',r.stdout)
if __name__=='__main__':unittest.main()
