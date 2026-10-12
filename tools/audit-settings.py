#!/usr/bin/env python3
"""Read-only Settings panel audit in an isolated desktop test profile."""
import argparse,importlib.util,json,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
a=argparse.ArgumentParser();a.add_argument('--output',type=Path,required=True);args=a.parse_args()
contextual={'wifi-joinHidden','wifi-wps','call-cf-not-reachable-settings','call-cf-no-reply-settings','call-cf-mobile-busy-settings','call-cf-unconditional-settings','call-voiceMailSettings','hotspot-wifiSettings','screenLock-passcode','wifi-status','wifi-auth','wifi-enterCertificateNickname','apn-editor','apn-list','appPermissions-details','addon-details','homescreen-details','frame','simpin-dialog','call-fdnList-add','call-barring-passcode-change','settings-alert-dialog','settings-confirm-dialog','settings-prompt-dialog','ums-partial-warning','template-messaging','full-developer-mode-warning','full-developer-mode-final-warning'}
with Client(2857) as c:
 p.register(c)
 def ev(code):
  v=p.evaluate(c,'settings',code)
  if 'error' in v:raise RuntimeError(v['error'])
  return v.get('value')
 def ready():
  for _ in range(100):
   if ev('return !!document.querySelector("#root.current") && typeof require==="function";'):return
   time.sleep(.15)
  raise RuntimeError('Settings root did not load')
 p.evaluate(c,'system','if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
 ev('location.reload();return true;');time.sleep(.7);ready()
 ids=ev('return Array.from(document.querySelectorAll("section[id]"),e=>e.id);')
 report={'scope':'panel navigation only; no hardware writes or destructive actions','panels':{}}
 for id in ids:
  if id in contextual:
   report['panels'][id]={'contextRequired':True};continue
  ev('window.__vulpesDiagnostics=[];require(["modules/settings_service"],s=>s.navigate('+json.dumps(id)+','+json.dumps({'cardIndex':0} if id=='messaging-details' else {})+'));return true;')
  opened=False
  for _ in range(25):
   time.sleep(.15)
   if ev('return document.querySelector("section.current")?.id;')==id:opened=True;break
   errors=ev('return window.__vulpesDiagnostics;')
   if any(e['kind']=='rejection' for e in errors or []):break
  time.sleep(.35)
  result=ev('const p=document.getElementById('+json.dumps(id)+');return {title:p.querySelector("h1")?.textContent,unavailable:!!p.querySelector("[data-vulpes-unavailable]"),links:Array.from(p.querySelectorAll("a[href^=\\"#\\"]"),e=>e.getAttribute("href")),controls:Array.from(p.querySelectorAll("input,select,gaia-switch"),e=>({name:e.name||e.id||e.getAttribute("name"),disabled:e.disabled,hidden:!e.checkVisibility()})),errors:window.__vulpesDiagnostics};')
  result['opened']=opened;report['panels'][id]=result
  args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
  print(id,'OPEN' if opened else 'FAILED',json.dumps(result['errors'],ensure_ascii=False),flush=True)
  if not opened:
   ev('location.reload();return true;');time.sleep(.7);ready()
 print('Recorded',len(report['panels']),'panels',flush=True)
 ev('require(["modules/settings_service"],s=>s.navigate("root"));return true;')
