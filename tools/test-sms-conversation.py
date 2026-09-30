#!/usr/bin/env python3
"""Render sent and received bubbles through original Gaia on an isolated test profile."""
import sys,importlib.util,json,time
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',root/'tools/probe-desktop.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(app,code):
  r=p.evaluate(c,app,code)
  if 'error' in r:raise RuntimeError(r)
  return r.get('value')
 ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
 c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.messages.__saved=[Runtime.messages.radio,Runtime.messages.radioStatus];Runtime.messages.radio=async()=>({state:'sent'});Runtime.messages.radioStatus=null;return true;")
 try:
  ev('sms','await Navigation.toPanel("composer");Compose.clear();ConversationView.recipients.length=0;ConversationView.recipients.add({name:"5550199",number:"5550199",source:"manual"});Compose.append("Outgoing conversation regression");ConversationView.sendMessage({serviceId:0});return true;')
  time.sleep(2)
  report=ev('sms','return {hash:location.hash,panel:Navigation.currentPanel,messages:[...document.querySelectorAll(".message")].map(e=>({id:e.id,text:e.querySelector(".message-content-body")?.textContent,time:e.querySelector("time")?.dataset.time})),errors:window.__vulpesDiagnostics};')
  assert len(report['messages'])>=1 and not report['errors'], report
  outgoing=report
  c.call('WebDriver:ExecuteAsyncScript',{'script':"const done=arguments[arguments.length-1];const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.messages.receive({receipt:'pc-conversation-regression',sender:'5550199',body:'Incoming conversation regression',timestamp:Date.now()}).then(m=>{Runtime.broadcast('sms-received',m,'sms');done(true);});",'args':[],'newSandbox':True,'sandbox':'system','scriptTimeout':10000})
  time.sleep(2)
  report=ev('sms','return {hash:location.hash,messages:[...document.querySelectorAll(".message")].map(e=>({id:e.id,text:e.querySelector(".message-content-body")?.textContent,time:e.querySelector("time")?.dataset.time})),errors:window.__vulpesDiagnostics};')
  assert any(m.get('text')=='Outgoing conversation regression' for m in report['messages']),report
  assert any(m.get('text')=='Incoming conversation regression' for m in report['messages']),report
  assert all(m['time'].isdigit() for m in report['messages']),report
  assert not report['errors'],report
  result={'outgoingVisible':True,'incomingVisible':True,'numericBubbleDates':True,'errors':report['errors']}
  (root/'logs/sms-conversation-pc.json').write_text(json.dumps(result,indent=2)+'\n')
  print(json.dumps(result,indent=2))
 finally:
  ev('sms', 'const ids=await new Promise(resolve=>{const a=[];const c=navigator.mozMobileMessage.getMessages({numbers:["5550199"]});c.onsuccess=()=>{if(c.done)resolve(a);else{a.push(c.result.id);c.continue();}};});if(ids.length)await navigator.mozMobileMessage.delete(ids);return true;')
  c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');[Runtime.messages.radio,Runtime.messages.radioStatus]=Runtime.messages.__saved;delete Runtime.messages.__saved;return true;")
