# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('mobile',Path(__file__).resolve().parents[1]/'runtime/mobile-settings.py')
mobile=importlib.util.module_from_spec(spec);spec.loader.exec_module(mobile)

class MobileSettingsTests(unittest.TestCase):
 def test_sim_result_excludes_subscriber_identity_and_pin_counters(self):
  with patch.object(mobile,'properties',return_value={'Present':True,'CardIdentifier':'test-card','SubscriberIdentity':'secret','Retries':{'pin':3},'PinRequired':'none','ServiceProviderName':'Test','FixedDialing':False}):
   result=mobile.request({'version':1,'operation':'mobileSettings','action':'sim'})
  self.assertEqual(result['id'],'test-card')
  self.assertNotIn('secret',str(result));self.assertNotIn('Retries',result)
 def test_only_read_queries_allowed(self):
  for value in ({'action':'setPin'},{'action':'sim','command':'anything'},{'action':'calls','value':True}):
   with self.assertRaises(ValueError):mobile.request(value)
 def test_smsc_has_no_message_content(self):
  with patch.object(mobile,'properties',return_value={'ServiceCenterAddress':'test-center','Messages':['private']}):
   self.assertEqual(mobile.request({'action':'smsc'}),{'address':'test-center','deliveryReports':None})
 def test_call_query_cannot_report_unknown_as_disabled(self):
  with patch.object(mobile,'properties',return_value={}):
   self.assertIsNone(mobile.request({'action':'calls'})['VoiceCallWaiting'])
 def test_report_setting_validates_boolean_and_reads_back_modem(self):
  from types import SimpleNamespace
  with self.assertRaises(ValueError):mobile.request({'action':'deliveryReports','enabled':'true'})
  with patch.object(mobile.subprocess,'run',return_value=SimpleNamespace(returncode=0)) as run, patch.object(mobile,'properties',return_value={'UseDeliveryReports':True}):
   self.assertEqual(mobile.request({'action':'deliveryReports','enabled':True}),{'deliveryReports':True})
   self.assertEqual(run.call_args.args[0][-4:],['sv','UseDeliveryReports','b','true'])
  with patch.object(mobile.subprocess,'run',return_value=SimpleNamespace(returncode=0)), patch.object(mobile,'properties',return_value={'UseDeliveryReports':False}):
   with self.assertRaises(RuntimeError):mobile.request({'action':'deliveryReports','enabled':True})
 def test_data_write_requires_modem_readback(self):
  with patch.object(mobile,'set_property') as setter, patch.object(mobile,'properties',return_value={'Powered':False}):
   with self.assertRaisesRegex(RuntimeError,'RADIO_REQUEST_FAILED'):
    mobile.request({'action':'dataEnabled','enabled':True})
   setter.assert_called_once_with('ConnectionManager','Powered','b',True)
 def test_clock_rejects_path_and_type_injection_before_execution(self):
  with patch.object(mobile.subprocess,'run') as command:
   for value in ({'action':'setTimezone','timezone':'../../etc/passwd'}, {'action':'setTimezone','timezone':'/etc/passwd'},
                 {'action':'setTime','milliseconds':True}, {'action':'setTime','milliseconds':float('nan')},
                 {'action':'clock','timezone':'UTC'}, {'action':'setTime','milliseconds':0}):
    with self.assertRaises(ValueError):mobile.device_request(value)
   command.assert_not_called()
 def test_clock_returns_actual_service_state(self):
  from types import SimpleNamespace
  with patch.object(mobile.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='Timezone=Europe/Paris\nNTP=no\nCanNTP=no\n')), patch.object(mobile,'clock_automatic',return_value=False):
   self.assertEqual(mobile.device_request({'action':'clock'}), {'timezone':'Europe/Paris','automatic':False,'automaticAvailable':True})
 def test_apn_read_never_returns_password_or_ims_context(self):
  import json
  from types import SimpleNamespace
  props=lambda kind:{'Type':{'data':kind},'Password':{'data':'private-secret'},'AccessPointName':{'data':'example'},'Active':{'data':False}}
  payload={'data':[[['/ril_0/context1',props('internet')],['/ril_0/context3',props('ims')]]]}
  with patch.object(mobile.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps(payload))):
   rows=mobile.request({'action':'apns'})
   self.assertEqual(len(rows),1);self.assertTrue(rows[0]['hasPassword'])
   self.assertNotIn('private-secret',str(rows))
 def test_apn_edit_reads_back_and_rolls_back_failed_write(self):
  path='/ril_0/context1';original={'Type':'internet','Active':False,'AccessPointName':'example','Username':'old'}
  state=dict(original)
  def write(path,name,value):state[name]=value
  with patch.object(mobile,'contexts',side_effect=lambda:{path:dict(state)}),patch.object(mobile,'set_context',side_effect=write):
   result=mobile.request({'action':'editApn','id':path,'fields':{'apn':'new.example','user':'new'}})
   self.assertEqual(result['fields']['apn'],'new.example');self.assertEqual(state['Username'],'new')
  state=dict(original)
  def fail(path,name,value):
   state[name]=value
   if name=='Username' and value=='new':raise RuntimeError('APN_WRITE_FAILED')
  with patch.object(mobile,'contexts',side_effect=lambda:{path:dict(state)}),patch.object(mobile,'set_context',side_effect=fail):
   with self.assertRaisesRegex(RuntimeError,'APN_WRITE_FAILED'):
    mobile.request({'action':'editApn','id':path,'fields':{'apn':'new.example','user':'new'}})
   self.assertEqual(state,original)
 def test_apn_failed_rollback_is_not_reported_as_restored(self):
  original={'/ril_0/context1':{'Type':'internet','Active':False,'AccessPointName':'example'}}
  with patch.object(mobile,'contexts',side_effect=[original,RuntimeError('RADIO_NOT_READY')]),patch.object(mobile,'set_context',side_effect=RuntimeError('APN_WRITE_FAILED')):
   with self.assertRaisesRegex(RuntimeError,'APN_ROLLBACK_FAILED'):
    mobile.request({'action':'editApn','id':'/ril_0/context1','fields':{'apn':'new.example'}})
 def test_apn_rejects_in_use_profiles_unknown_fields_and_injection(self):
  with patch.object(mobile,'contexts',return_value={'/ril_0/context1':{'Type':'internet','Active':True,'AccessPointName':'example'}}),patch.object(mobile,'set_context') as write:
   with self.assertRaisesRegex(RuntimeError,'APN_IN_USE'):mobile.request({'action':'editApn','id':'/ril_0/context1','fields':{'apn':'new.example'}})
   for fields in ({'command':'id'},{'apn':'bad\nname'},{'protocol':'evil'},{'mmsc':'file:///etc/passwd'},{'password':'x'*513}):
    with self.assertRaises(ValueError):mobile.request({'action':'editApn','id':'/ril_0/context1','fields':fields})
   with self.assertRaises(ValueError):mobile.request({'action':'editApn','id':'/ril_0/voicecall1','fields':{'apn':'new'}})
   write.assert_not_called()
 def test_radio_modes_match_real_modem_capabilities(self):
  state={'TechnologyPreference':'lte','AvailableTechnologies':['gsm','umts','lte']}
  def write(interface,name,signature,value):state[name]=value
  with patch.object(mobile,'properties',side_effect=lambda _:dict(state)),patch.object(mobile,'set_property',side_effect=write):
   self.assertEqual(mobile.request({'action':'setRadioMode','mode':'any'})['mode'],'any')
   with self.assertRaises(ValueError):mobile.request({'action':'setRadioMode','mode':'nr'})
 def test_supplementary_settings_validate_and_confirm_network_state(self):
  state={'HideCallerId':'default','VoiceCallWaiting':'enabled'}
  def write(interface,name,signature,value,**kwargs):state[name]=value
  with patch.object(mobile,'set_property',side_effect=write) as setter,patch.object(mobile,'properties',side_effect=lambda *a,**k:dict(state)):
   self.assertEqual(mobile.request({'action':'setCallWaiting','enabled':False})['VoiceCallWaiting'],'disabled')
   self.assertEqual(mobile.request({'action':'setCallerId','mode':'enabled'})['HideCallerId'],'enabled')
   setter.assert_called_with('CallSettings','HideCallerId','s','enabled',timeout=20)
  with patch.object(mobile,'set_property'),patch.object(mobile,'properties',return_value={'HideCallerId':'unknown'}):
   with self.assertRaisesRegex(RuntimeError,'RADIO_READBACK_FAILED'):mobile.request({'action':'setCallerId','mode':'default'})
  with patch.object(mobile,'set_property') as setter:
   for value in ({'action':'setCallWaiting','enabled':'true'},{'action':'setCallerId','mode':'secret'},{'action':'calls','number':'1'}):
    with self.assertRaises(ValueError):mobile.request(value)
   setter.assert_not_called()
 def test_forwarding_only_changes_requested_rule_and_checks_readback(self):
  state={'VoiceUnconditional':'','VoiceBusy':'123','VoiceNoReply':'','VoiceNotReachable':''}
  def write(interface,name,signature,value,**kwargs):state[name]=value
  with patch.object(mobile,'set_property',side_effect=write),patch.object(mobile,'properties',side_effect=lambda *a,**k:dict(state)):
   result=mobile.request({'action':'setForwarding','reason':'noReply','enabled':True,'number':'+33123456789'})
   self.assertEqual(result['noReply'],'+33123456789');self.assertEqual(result['busy'],'123')
   result=mobile.request({'action':'setForwarding','reason':'noReply','enabled':False,'number':''})
   self.assertEqual(result['noReply'],'');self.assertEqual(result['busy'],'123')
  with patch.object(mobile,'set_property') as setter:
   for value in ({'reason':'all','enabled':False,'number':''},{'reason':'busy','enabled':True,'number':'*123#'},{'reason':'busy','enabled':False,'number':'123'}):
    with self.assertRaises(ValueError):mobile.request({'action':'setForwarding',**value})
   setter.assert_not_called()
if __name__=='__main__':unittest.main()
