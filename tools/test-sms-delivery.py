#!/usr/bin/env python3
"""Verify Gaia request completion against simulated terminal modem events on --test desktop."""
import sys,importlib.util,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',ROOT/'tools/probe-desktop.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(app,code):
  r=p.evaluate(c,app,code)
  if 'error' in r:raise RuntimeError(r)
  return r.get('value')
 ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
 for _ in range(50):
  if ev('sms','return !!navigator.mozMobileMessage;'):break
  time.sleep(.2)
 c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.messages.__saved=[Runtime.messages.radio,Runtime.messages.radioStatus];Runtime.messages.radio=async()=>({path:'/ril_0/messageabc',state:'pending'});Runtime.messages.radioStatus=async()=>({state:'pending'});return true;")
 result={}
 try:
  for terminal in ['sent','failed']:
   ev('sms', '''window.__terminal=[];window.__id=null;window.__requestState='waiting';
    navigator.mozMobileMessage.addEventListener('sending',e=>window.__id=e.message.id,{once:true});
    const r=navigator.mozMobileMessage.send('111','Vulpes isolated queued test');
    r.onsuccess=()=>{window.__requestState='success';};r.onerror=()=>{window.__requestState='error';};return true;''')
   time.sleep(.4)
   assert ev('sms','return window.__requestState;')=='waiting'
   code="const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.messages.radioStatus=async()=>({state:"+json.dumps(terminal)+"});Runtime.messages.refreshOutgoing();return true;"
   c.execute(code)
   for _ in range(30):
    state=ev('sms','return window.__requestState;')
    if state!='waiting':break
    time.sleep(.1)
   assert state==('success' if terminal=='sent' else 'error'),state
   result[terminal]={'pendingRequestStayedOpen':True,'finalRequestState':state}
   ev('sms','await new Promise(resolve=>{const r=navigator.mozMobileMessage.delete(window.__id);r.onsuccess=r.onerror=resolve;});return true;')
  (ROOT/'logs/sms-pending-pc-ui.json').write_text(json.dumps(result,indent=2)+'\n')
  print(json.dumps(result,indent=2))
 finally:
  c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');[Runtime.messages.radio,Runtime.messages.radioStatus]=Runtime.messages.__saved;delete Runtime.messages.__saved;return true;")
