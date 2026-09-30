#!/usr/bin/env python3
"""Check reported Gaia layout, brightness, local homepage and navigation regressions."""
import sys,importlib.util,json,time
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools'))
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe','tools/probe-desktop.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
results={}
with Client(2857) as c:
 p.register(c)
 def ev(app,code,path='/'):
  r=p.evaluate(c,app,code,path);assert 'error' not in r,r;return r.get('value')
 def wait(app,code,path='/'):
  for _ in range(80):
   r=ev(app,code,path)
   if r:return r
   time.sleep(.15)
  raise AssertionError((app,code))
 def launch(app,entry=None):
  ev('system','await VulpesCompat.call("apps.launch",'+json.dumps({'manifestURL':f'http://{app}.localhost:8765/manifest.webapp',**({'entryPoint':entry} if entry else {})})+');return true;')
  wait(app,'return document.readyState==="complete" && !!window.VulpesGaiaUI;')
 wait('system','return document.body?.getAttribute("ready-state")==="fullyLoaded";')
 ev('system','lockScreen.unlock(true);ScreenManager.turnScreenOn(true);navigator.mozSettings.createLock().set({"screen.timeout":0});return true;')
 launch('communications','dialer')
 for tab in ['recents','contacts','keypad']:
  ident={'recents':'option-recents','contacts':'option-contacts','keypad':'option-keypad'}[tab]
  ev('communications',f'document.getElementById("{ident}").click();return true;')
  time.sleep(.5)
  r=ev('communications','return {scrollY,header:[...document.querySelectorAll("gaia-header")].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().top)};')
  assert r['scrollY']==0,r
  results[tab]=r
 launch('settings');wait('settings','return typeof require==="function";')
 ev('settings','require(["modules/settings_service"],s=>s.navigate("display"));return true;')
 wait('settings','return !!document.querySelector("#display.current .brightness-manual input");')
 ev('settings','const e=document.querySelector("#display .brightness-manual input");e.value="0.4";e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true;')
 results['brightness']=wait('system','return typeof ScreenManager._userBrightness==="number" && Math.abs(navigator.mozPower.screenBrightness-0.4)<.02 ? {user:ScreenManager._userBrightness,power:navigator.mozPower.screenBrightness}:null;')
 results['select']=ev('settings','const e=document.querySelector("#display select"),s=getComputedStyle(e);return {top:s.top,lineHeight:s.lineHeight,padding:s.padding,appearance:s.appearance};')
 assert results['select']['top']=='0px',results['select']
 launch('video')
 results['video']=wait('video','const e=document.querySelector("#overlay-text"),r=e?.getBoundingClientRect();return r?.width>0 ? {left:r.left,right:r.right,width:innerWidth,overflow:e.scrollWidth>e.clientWidth}:null;')
 assert results['video']['left']>=0 and results['video']['right']<=results['video']['width'] and not results['video']['overflow'],results['video']
 launch('search')
 results['browser']=wait('search','return document.querySelector("#vulpes-local-home")?.contentDocument?.querySelector("h1")?.textContent;','/newtab.html')
 assert results['browser'] in ['Le Web vous attend.', 'The Web is yours.']
 # App layouts must reserve navigation space; Home alone may overlay wallpaper.
 for w,h in [(480,844),(844,480)]:
  c.execute(f"Services.wm.getMostRecentWindow('vulpes:host').resizeTo({w},{h});")
  time.sleep(.3)
  launch('settings')
  time.sleep(.8)
  r=c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host'),s=w.document.getElementById('screen').getBoundingClientRect(),h=w.document.getElementById('home').getBoundingClientRect();return {s:s.toJSON(),h:h.toJSON(),landscape:w.innerWidth>w.innerHeight};")
  assert r['s']['right']<=r['h']['left']+1 if r['landscape'] else r['s']['bottom']<=r['h']['top']+1,r
  results['navigation-'+str(w)]=r
  c.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();")
  time.sleep(.6)
  r=c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host'),d=w.document,s=d.getElementById('screen').getBoundingClientRect();return {active:d.documentElement.hasAttribute('home-active'),width:s.width,height:s.height,innerWidth:w.innerWidth,innerHeight:w.innerHeight};")
  assert r['active'] and r['width']==r['innerWidth'] and r['height']==r['innerHeight'],r
  results['wallpaper-'+str(w)]=r
 c.execute("Services.wm.getMostRecentWindow('vulpes:host').resizeTo(480,844);")
Path('logs/feedback-preview10-checks.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
