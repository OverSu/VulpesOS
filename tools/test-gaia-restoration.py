#!/usr/bin/env python3
"""Check original Gaia panels and navigation in the isolated desktop profile."""
import importlib.util,json,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
results={}
with Client(2857) as c:
 p.register(c)
 def ev(app,code):
  r=p.evaluate(c,app,code,'/contacts/' if app=='communications' else '/')
  if r.get('missing'):return None
  assert 'error' not in r,r
  return r.get('value')
 def wait(app,code):
  for _ in range(100):
   r=ev(app,code)
   if r:return r
   time.sleep(.15)
  raise AssertionError((app,code))
 def launch(app,entry=None):
  ev('system','await VulpesCompat.call("apps.launch",'+json.dumps({'manifestURL':f'http://{app}.localhost:8765/manifest.webapp',**({'entryPoint':entry} if entry else {})})+');return true;')
  wait(app,'return document.readyState==="complete" && !!window.VulpesGaiaUI;')
 wait('system','return document.body?.getAttribute("ready-state")==="fullyLoaded";')
 results['lockscreen_original_icons']=wait('system','return getComputedStyle(document.querySelector("#lockscreen-area-unlock > div")).backgroundImage.includes("lockscreen_unlock.png");')
 ev('system','lockScreen.unlock(true);return true;')
 wait('system','return !document.querySelector("#screen").classList.contains("locked");')
 results['tray_date']=wait('system','return document.querySelector("#statusbar-operator")?.textContent;')
 launch('settings')
 time.sleep(.8)
 results['navigation_reserved']=c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host'),s=w.document.getElementById('screen').getBoundingClientRect(),h=w.document.getElementById('home').getBoundingClientRect();return s.bottom<=h.top+1;")
 assert results['navigation_reserved']
 results['no_provisional_root']=ev('settings','return !document.getElementById("vulpes-platform-settings") && !document.querySelector(".vulpes-import");')
 assert results['no_provisional_root']
 results['restored_menus']=wait('settings','return ["wifi","bluetooth","carrier","call","messaging","sim-manager","simpin","findmydevice","addons","mediaStorage","applicationStorage"].every(id=>{const a=document.querySelector("#root a[href=\\"#"+id+"\\"]");return a && !a.closest("li").hidden;});')
 ev('settings','document.querySelector("a[href=\\"#battery\\"]").click();return true;')
 wait('settings','return !!document.querySelector("#battery-level");')
 ev('settings','navigator.battery.level=.63;navigator.battery.dispatchEvent(new Event("levelchange"));return true;')
 results['battery_interpolation']=wait('settings','return document.querySelector("#battery-level").textContent.includes("63") && !document.querySelector("#battery-level").textContent.includes("{{");')
 ev('settings','require(["modules/settings_service"],s=>s.navigate("wifi"));return true;')
 results['wifi_original_unavailable']=wait('settings','return !!document.querySelector("#wifi .wifi-availableNetworks") && document.querySelector("#wifi [data-vulpes-unavailable]")?.textContent;')
 launch('communications','contacts')
 wait('communications','return !!document.getElementById("settings-button") && !!document.getElementById("add-contact-button");')
 ev('communications','document.getElementById("settings-button").click();return true;')
 wait('communications','return !!document.querySelector("#importContacts button");')
 ev('communications','document.querySelector("#importContacts button").click();return true;')
 results['contact_import_original']=wait('communications','return document.getElementById("import-sd-option")?.querySelector("button")?.disabled===false && !!document.getElementById("import-sim-option-unavailable");')
 results['contact_errors']=ev('communications','return __vulpesDiagnostics.filter(x=>/TypeError|ReferenceError/.test(x.message));')
 assert not results['contact_errors'],results['contact_errors']
 launch('gallery')
 results['media_import_header']=wait('gallery','return !!document.querySelector("gaia-header [data-vulpes-import]") && !document.querySelector(".vulpes-import");')
 ev('system','await VulpesCompat.call("apps.launch",{manifestURL:"http://homescreen.localhost:8765/manifest.webapp"});return true;')
Path('logs/gaia-restoration-tests.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(results,indent=2,ensure_ascii=False))
