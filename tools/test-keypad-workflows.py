#!/usr/bin/env python3
"""Keypad input in real Gaia forms, isolated profile; no calls or SMS sent."""
import importlib.util,json,os,subprocess,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
state=json.loads(Path('tundra/out/beatles/gecko-156.0.1/pc-test-pids.json').read_text())
env={**os.environ,'DISPLAY':':'+state['display']}
checks=[]
with Client(2857) as c:
 assert Path(c.execute('return PathUtils.profileDir;')).name=='pc-keypad-profile'
 c.execute("try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}")
 def ev(app,code):
  host,path=('communications','/contacts/') if app=='contacts' else (app,'/')
  r=probe.evaluate(c,host,code,path);assert 'error' not in r,r
  return r.get('value')
 def wait(app,code):
  for _ in range(150):
   r=ev(app,code)
   if r:return r
   time.sleep(.1)
  raise AssertionError((app,code))
 def check(name,value):
  assert value,name
  checks.append(name);print(name+': OK',flush=True)
 def key(*keys):
  subprocess.run(['xdotool','search','--name','Vulpes — port','windowraise','windowfocus','key','--clearmodifiers','--delay','130',*keys],env=env,check=True,stdout=subprocess.DEVNULL)
  time.sleep(.15)
 def focus(app,selector):
  wait(app,'return !!document.querySelector('+json.dumps(selector)+');')
  ev(app,'const e=document.querySelector('+json.dumps(selector)+');e.setAttribute("tabindex","0");e.scrollIntoView({block:"nearest"});e.focus();return true;')
 def launch(app,entry=None):
  params={'manifestURL':'http://'+app+'.localhost:8765/manifest.webapp'}
  if entry:params['entryPoint']=entry
  ev('system','await VulpesCompat.call("apps.launch",'+json.dumps(params)+');return true;')
 wait('system','return typeof ScreenManager!=="undefined" && !!window.Service;')
 ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
 launch('communications','contacts')
 wait('contacts','return document.readyState==="complete" && !!document.getElementById("add-contact-button");')
 focus('contacts','#add-contact-button');key('Return')
 wait('contacts','return document.getElementById("givenName")?.getBoundingClientRect().height>0;')
 focus('contacts','#givenName');key('2','2','6','6','6','2','2')
 check('contact-name-multitap',wait('contacts','return document.getElementById("givenName").value==="bob";'))
 key('BackSpace');check('delete-letter',wait('contacts','return document.getElementById("givenName").value==="bo";'))
 key('numbersign','2');check('uppercase-mode',wait('contacts','return document.getElementById("givenName").value==="boA";'))
 key('numbersign','2');check('number-mode',wait('contacts','return document.getElementById("givenName").value==="boA2";'))
 key('numbersign')
 focus('contacts','#number_0');key('5','5','5','0','1','0','0')
 check('telephone-digits-remain-numeric',wait('contacts','return document.getElementById("number_0").value==="5550100";'))
 check('physical-keypad-does-not-open-software-keyboard',ev('system','return !document.querySelector(".inputWindow.active");'))
 # Leave the unsaved form; no personal data is written.
 key('Escape')
 launch('sms');wait('sms','return !!document.getElementById("threads-composer-link");')
 focus('sms','#threads-composer-link');key('Return')
 wait('sms','return typeof ConversationView!=="undefined" && Navigation.isCurrentPanel("composer") && document.activeElement.classList.contains("recipient");')
 # Wait for the original Gaia panel transition, including its final focus.
 ev('sms','await App.whenReady();await new Promise(r=>setTimeout(r,400));return true;')
 focus('sms','#messages-recipients-list [contenteditable]');key('5','5','5','0','1','0','0','Return')
 check('sms-recipient-accepted',wait('sms','return ConversationView.recipients.numbers.includes("5550100");'))
 focus('sms','#messages-input');key('2','2','6','6','6','2','2')
 check('sms-body-multitap',wait('sms','return document.getElementById("messages-input").textContent.trim()==="bob";'))
 # Clear the unsent text through the same editor.
 key('BackSpace','BackSpace','BackSpace')
 ev('sms','ConversationView.cleanFields();return true;')
 launch('settings');wait('settings','return typeof require==="function";')
 ev('settings','const s=await new Promise(r=>require(["modules/settings_service"],r));await s.navigate("display");return true;')
 focus('settings','#vulpes-layout');key('Return')
 check('select-opens-gaia-dialog',wait('settings','return !!document.getElementById("vulpes-value-selector");'))
 key('Down');check('selection-stays-in-modal',wait('settings','return !!document.activeElement.closest("#vulpes-value-selector");'))
 key('Escape');check('back-cancels-selector',wait('settings','return !document.getElementById("vulpes-value-selector");'))
 key('Escape');check('back-leaves-display-panel',wait('settings','return location.hash!=="#display";'))
 Path('logs/keypad-workflows.json').write_text(json.dumps({'checks':checks,'input':'Native XTest on desktop, shared Gaia at 240x320'},indent=2))
print(json.dumps(checks,indent=2))
