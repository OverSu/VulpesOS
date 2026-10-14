#!/usr/bin/env python3
"""Regression checks for storage navigation and unavailable-feature contrast."""
import importlib.util,json,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
with Client(2857) as c:
 p.register(c)
 def ev(code):
  for _ in range(80):
   reply=p.evaluate(c,'settings',code)
   if not reply.get('missing'):break
   time.sleep(.1)
  if 'value' not in reply:raise RuntimeError(reply)
  return reply['value']
 def wait(code):
  for _ in range(80):
   if ev(code):return
   time.sleep(.1)
  raise TimeoutError(code)
 p.evaluate(c,'system','if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
 ev('location.reload();return true;');time.sleep(.6)
 wait('return document.querySelector("section.current")?.id==="root" && require.defined("modules/settings_service");')
 for panel in ['mediaStorage','root','applicationStorage','root','usbStorage','root']:
  ev('await new Promise(resolve=>require(["modules/settings_service"],s=>s.navigate('+json.dumps(panel)+',{},resolve)));return true;')
  wait('return document.querySelector("section.current")?.id==='+json.dumps(panel)+';')
 errors=ev('return window.__vulpesDiagnostics;')
 assert not errors,errors
 # A failed dependency must not leave the navigation lock set.
 ev('const cache=require("modules/panel_cache"),get=cache.get;cache.get=function(id,cb){cache.get=get;cb(null,new Error("test dependency failure"));};await new Promise(resolve=>require("modules/settings_service").navigate("mediaStorage",{},resolve));return true;')
 time.sleep(.3)
 ev('await new Promise(resolve=>require("modules/settings_service").navigate("applicationStorage",{},resolve));return true;')
 wait('return document.querySelector("section.current")?.id==="applicationStorage";')
 ratios={}
 for theme in ['light','dark']:
  ev('document.documentElement.dataset.vulpesTheme='+json.dumps(theme)+';VulpesGaiaUI.notice("This feature is not available on this platform yet.");return true;')
  time.sleep(.2)
  colors=ev('const p=document.querySelector("#vulpes-gaia-notice p");return [getComputedStyle(p).color,getComputedStyle(p).backgroundColor];')
  def luminance(css):
   rgb=[float(v)/255 for v in css.removeprefix('rgb(').removesuffix(')').split(',')]
   linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
   return sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))
  a,b=sorted(map(luminance,colors));ratio=(b+.05)/(a+.05);assert ratio>=4.5,(theme,colors,ratio)
  ratios[theme]=round(ratio,2)
  ev('document.querySelector("#vulpes-gaia-notice").requestSubmit();return true;')
 ev('require("modules/settings_service").navigate("root");return true;')
 print(json.dumps({'storagePanels':3,'returnNavigation':True,'failureRecovery':True,'contrast':ratios}))
