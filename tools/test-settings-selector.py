#!/usr/bin/env python3
"""Use trusted input to open Gaia's selector, commit/cancel and reopen it."""
import importlib.util,json,time,os
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(code):
  r=p.evaluate(c,'settings',code);assert 'error' not in r,r
  return r.get('value')
 def wait(code):
  for _ in range(80):
   v=ev(code)
   if v:return v
   time.sleep(.1)
  raise AssertionError(code)
 def tap(selector, gesture=None):
  point=ev('const e=document.querySelector('+json.dumps(selector)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};')
  method=gesture or ('Tap' if os.environ.get('VULPES_DIRECT_TOUCH') and selector=='#vulpes-theme' else 'MouseClick')
  if method=='Swipe':point.update(toX=point['x']+30,toY=point['y'])
  result=c.call('WebDriver:ExecuteAsyncScript',{'script':'''const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://settings.localhost:8765/'))return b;for(const child of b.children){const found=find(child);if(found)return found;}}const bc=find(w.document.getElementById('system').browsingContext);bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery(METHOD,POINT).then(done,e=>done({error:String(e)}));'''.replace('POINT',json.dumps(point)).replace('METHOD',json.dumps(method)),'args':[],'newSandbox':True,'sandbox':'system','scriptTimeout':10000})
  assert result['value'] is True,result
  time.sleep(.3)
 p.evaluate(c,'system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
 wait('return document.readyState==="complete" && typeof require==="function";')
 previous=ev('return await VulpesCompat.call("appearance.current",{});')
 try:
  ev('const s=await new Promise(r=>require(["modules/settings_service"],r));await s.navigate("display");await navigator.mozSettings.createLock().set({"vulpes.theme":"light"});return true;')
  wait('return !!document.querySelector("#vulpes-theme");')
  time.sleep(1)
  tap('#vulpes-theme','Swipe')
  assert ev('return !document.getElementById("vulpes-value-selector");'), 'A drag must not open the selector'
  tap('#vulpes-theme')
  wait('return !!document.querySelector("#vulpes-value-selector");')
  wait('return getComputedStyle(document.querySelector("#vulpes-value-selector")).backgroundColor!=="rgba(0, 0, 0, 0)";')
  tap('#vulpes-value-selector [data-value="dark"]')
  tap('#vulpes-value-selector [data-action="confirm"]')
  wait('return document.documentElement.dataset.vulpesTheme==="dark" && !document.getElementById("vulpes-value-selector");')
  tap('#vulpes-theme');tap('#vulpes-value-selector [data-value="light"]');tap('#vulpes-value-selector [data-action="cancel"]')
  assert ev('return document.documentElement.dataset.vulpesTheme==="dark";')
  tap('#vulpes-theme');tap('#vulpes-value-selector [data-value="light"]');tap('#vulpes-value-selector [data-action="confirm"]')
  wait('return document.documentElement.dataset.vulpesTheme==="light";')
  print('PASS '+('direct touch' if os.environ.get('VULPES_DIRECT_TOUCH') else 'mouse via touch simulator')+': drag ignored, open, styled selector, dark, cancel, reopen, light')
 finally:ev('await navigator.mozSettings.createLock().set({"vulpes.theme":'+json.dumps(previous)+'});return true;')
