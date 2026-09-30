#!/usr/bin/env python3
"""Test original Gaia call/power UI with a simulated modem in the test profile.
Start with VULPES_TEST_TELEPHONY=1 python3 tools/run-host.py --test.
No real calls, poweroff or host shutdown are performed.
"""
import sys, importlib.util, time, json
sys.path.insert(0,'tools')
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe','tools/probe-desktop.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(app,code):
  r=p.evaluate(c,app,code,"/dialer/" if app == "communications" else "/")
  if r.get('missing'):return None
  assert 'error' not in r,r
  return r.get('value')
 def wait(app,code):
  for _ in range(150):
   result=ev(app,code)
   if result:return result
   time.sleep(.2)
  raise AssertionError((app,code))
 wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';")
 ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
 time.sleep(1)
 assert ev('system','return !!navigator.mozTelephony;'), 'Set VULPES_TEST_TELEPHONY=1 for this test'
 c.execute("""const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');
 const original=Runtime.platform.request.bind(Runtime.platform);
 Runtime.testCalls=[];Runtime.testCommands=[];Runtime.testHistory=[];
 Runtime.platform.request=async (actor,app,op,params)=>{
  if(op==='capabilities')return {...await original(actor,app,op,params),callControl:true};
  if(op==='calls')return Runtime.testCalls;
  if(op==='callAudio')return {muted:false,speaker:false,volume:1};
  if(op==='callHistory')return Runtime.testHistory;
  if(op==='ackCallHistory'){Runtime.testHistory=Runtime.testHistory.filter(i=>!params.ids.includes(i.id));return null;}
  if(['answer','hangup'].includes(op)){Runtime.testCommands.push({op,params});
   if(Runtime.failCommand)throw Error('RADIO_BUSY');
   if(op==='answer')Runtime.testCalls[0].state='active';else Runtime.testCalls=[];return {};}
  return original(actor,app,op,params);
 };return true;""")
 def calls(state):
  c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.testCalls="+json.dumps([{'path':'/ril_0/voicecall01','number':'0123456789','state':state}] if state else [])+";return true;")
 calls('dialing')
 wait('callscreen','return document.body?.innerText.includes("0123456789");')
 assert wait('system','return document.querySelector(".callscreenWindow")?.classList.contains("active");')
 for state,label in [('alerting','alerting'),('active','connected'),('held','held')]:
  calls(state);wait('callscreen',f'return navigator.mozTelephony?.calls[0]?.state==={json.dumps(label)};')
 calls('active')
 wait('callscreen','return navigator.mozTelephony?.calls[0]?.state==="connected";')
 ev('callscreen','document.getElementById("callbar-hang-up").click();return true;')
 wait('system','return navigator.mozTelephony.calls.length===0;')
 wait('system','return !document.querySelector(".callscreenWindow")?.classList.contains("active");')
 calls('incoming')
 wait('callscreen','return navigator.mozTelephony?.calls[0]?.state==="incoming" && document.body?.innerText.includes("0123456789");')
 assert c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host');return w.document.getElementById('screen').getBoundingClientRect().bottom<=w.document.getElementById('home').getBoundingClientRect().top+1;"), 'Home overlaps incoming-call controls'
 ev('callscreen','document.getElementById("callbar-answer").click();return true;')
 wait('callscreen','return navigator.mozTelephony?.calls[0]?.state==="connected";')
 calls(None)
 wait('system','return !document.querySelector(".callscreenWindow")?.classList.contains("active");')
 print('PASS: original outgoing/incoming Gaia UI, answer, hangup, automatic close.',flush=True)
 # Journal is imported into the original Gaia call log and acknowledged once.
 stamp=int(time.time()*1000)
 entry={'id':str(stamp),'date':stamp,'number':'0123456789','duration':4000,'direction':'outgoing','connectedAt':stamp}
 c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.testHistory="+json.dumps([entry])+";return true;")
 ev('system','await VulpesCompat.call("apps.launch",{manifestURL:"http://communications.localhost:8765/manifest.webapp",entryPoint:"dialer"});return true;')
 wait('communications','return document.readyState==="complete" && document.getElementById("edit-mode-header") && window.Navigation?.currentView==="keypad";')
 ev('communications','document.getElementById("option-recents").click();return true;')
 wait('communications','return document.body?.innerText.includes("0123456789");')
 for _ in range(30):
  if c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');return Runtime.testHistory.length;")==0:break
  time.sleep(.2)
 else:raise AssertionError('Call history was not acknowledged')
 print('PASS: original call log imports the completed call.',flush=True)
 ev('system','dispatchEvent(new Event("home"));return true;')
 def key(edge):ev('system','dispatchEvent(new CustomEvent("vulpes-service-event",{detail:{type:"hardware-key",data:{type:'+json.dumps(edge)+'}}}));return true;')
 key('sleep-button-press');time.sleep(.15);key('sleep-button-release')
 wait('system','return navigator.mozPower.screenEnabled===false;')
 key('sleep-button-press');time.sleep(.15);key('sleep-button-release')
 wait('system','return navigator.mozPower.screenEnabled===true;')
 key('sleep-button-press');time.sleep(1)
 assert ev('system','return document.getElementById("sleep-menu").classList.contains("visible");')
 key('sleep-button-release');ev('system','dispatchEvent(new Event("home"));return true;')
 key('volume-up-button-press');time.sleep(.15);key('volume-up-button-release')
 assert ev('system','return document.getElementById("volume").classList.contains("visible");')
 ev('system','navigator.battery.level=.73;navigator.battery.charging=true;navigator.battery.dispatchEvent(new Event("levelchange"));return true;')
 assert ev('system','const i=document.getElementById("statusbar-battery");return !i.hidden && i.dataset.level==="70" && i.dataset.charging==="true";')
 print('PASS: short Power press sleeps/wakes, long press shows Gaia menu, Gaia volume and battery icons.',flush=True)
 print('No real modem operations or poweroff performed.')
 c.execute('Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit);return true;')
