#!/usr/bin/env python3
"""Regression: visible Gaia errors and retained MMS composer, without real sends."""
import importlib.util,json,time
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe','tools/probe-desktop.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(app,code):
  result=p.evaluate(c,app,code,"/dialer/" if app=="communications" else "/")
  assert 'value' in result,result
  return result['value']
 def wait(app,code):
  for _ in range(100):
   if p.evaluate(c,app,code,"/dialer/" if app=="communications" else "/").get('value'):return
   time.sleep(.1)
  raise AssertionError(code)
 def visible(app,selector):
  return ev(app,'''const f=document.querySelector(SELECTOR),s=f.querySelector('section'),m=f.querySelector('menu');
  const r=s.getBoundingClientRect(),b=m.getBoundingClientRect(),v=f.getBoundingClientRect();
  return {text:s.innerText,visible:r.top>=v.top && r.bottom<=b.top && r.right<=v.right && r.height>0,
          section:r.toJSON(),menu:b.toJSON()};'''.replace('SELECTOR',json.dumps(selector)))
 wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';")
 ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://communications.localhost:8765/manifest.webapp",entryPoint:"dialer"});return true;')
 wait('communications','return !!window.CallHandler;')
 time.sleep(1.5)
 ev('communications','await new Promise(r=>LazyLoader.load("/shared/js/dialer/telephony_messages.js",r));TelephonyMessages.displayMessage("NoNetwork");return true;')
 time.sleep(.5)
 result=visible('communications','#confirmation-message');assert result['visible'] and result['text'],result
 print('PASS: original Gaia network-error text stays above its buttons.',flush=True)
 ev('communications','ConfirmDialog.hide();return true;')
 ev('system','await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
 wait('sms','return !!window.ConversationView && !!window.Compose;')
 time.sleep(1.5)
 ev('sms','''await Navigation.toPanel('thread-list');await Navigation.toPanel('composer');Compose.clear();ConversationView.recipients.length=0;
 ConversationView.recipients.add({name:'5550199',number:'5550199',source:'manual'});Compose.append('MMS draft regression');
 const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;canvas.getContext('2d').fillRect(0,0,16,16);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
 Compose.append(new Attachment(blob,{name:'regression.png',isDraft:true}));return true;''')
 wait('sms','return Compose.type==="mms";')
 for lang in ['fr','en-US']:
  ev('sms',f'document.documentElement.lang={json.dumps(lang)};document.getElementById("messages-send-button").click();return true;')
  time.sleep(.3)
  result=visible('sms','#vulpes-gaia-notice');assert result['visible'] and 'MMS' in result['text'],result
  assert ('pas encore disponible' if lang=='fr' else 'not yet available') in result['text'],result
  ev('sms','document.querySelector("#vulpes-gaia-notice button").click();return true;')
  assert ev('sms','return Compose.type==="mms" && Compose.getText()==="MMS draft regression" && Compose.getContent().some(i=>i instanceof Attachment) && Navigation.isCurrentPanel("composer");')
 print('PASS: French/English MMS notice visible; text, attachment and composer retained.',flush=True)
 ev('sms','Compose.clear();ConversationView.recipients.length=0;return true;')
 ev('system','dispatchEvent(new Event("home"));return true;')
