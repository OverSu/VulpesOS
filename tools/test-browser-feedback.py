#!/usr/bin/env python3
"""Check address-bar input and external views in an isolated desktop profile."""
import importlib.util,json,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
results={}
with Client(2857) as c:
 probe.register(c)
 c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host');w.focus();w.document.getElementById('system').focus();return true;")
 def ev(code):
  r=probe.evaluate(c,'system',"const rocketbar=core.appCore.rocketbar;"+code)
  if 'error' in r:raise AssertionError(r)
  return r.get('value')
 def wait(code):
  end=time.monotonic()+20
  while time.monotonic()<end:
   r=ev(code)
   if r:return r
   time.sleep(.15)
  raise AssertionError(code)
 ev('ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
 ev('await rocketbar.activate();rocketbar.focus();return true;')
 wait('return document.querySelector("#vulpes-gaia-keyboard")?.getBoundingClientRect().height>0;')
 ev('await VulpesCompat.call("input.request",{operation:"hide"});return true;')
 wait('return document.querySelector("#vulpes-gaia-keyboard").hidden;')
 assert ev('return document.activeElement===rocketbar.input;')
 ev('rocketbar.focus();return true;')
 results['refocus_opens_keyboard']=wait('return !document.querySelector("#vulpes-gaia-keyboard").hidden;')
 ev('rocketbar.handleCancel();await VulpesCompat.call("input.request",{operation:"hide"});return true;')
 wait('return !rocketbar.active && !rocketbar.isClosing;')
 time.sleep(.5)
 ev('await rocketbar.activate();rocketbar.focus();return true;')
 wait('return document.querySelector("#vulpes-gaia-keyboard")?.getBoundingClientRect().height>0;')
 ev('rocketbar.setInput("Vulpes OS");rocketbar.handleInput();return true;')
 reply=probe.evaluate(c,'keyboard','navigator.mozInputMethod.inputcontext.sendKey(13,0).catch(console.error);return true;')
 assert reply.get('value') is True,reply
 wait('return document.querySelector("#vulpes-gaia-keyboard").hidden && Service.query("getActiveApp")?.origin.startsWith("https://duckduckgo.com/");')
 time.sleep(8)
 results['views']=c.execute("return [...ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs').Views.entries.values()].map(e=>({url:e.browser.currentURI.spec,visible:e.browser.style.visibility,rect:e.browser.getBoundingClientRect().toJSON(),geometry:e.geometry}));")
 assert any(v['visible']=='visible' and v['rect']['height']>0 for v in results['views']),results['views']
 results['system']=ev('return {active:Service.query("getActiveApp")?.origin,searchActive:rocketbar.active,errors:__vulpesDiagnostics.slice(-5)};')
 point=ev('const r=Service.query("getActiveApp").appChrome.title.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};')
 script="const done=arguments[arguments.length-1];Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Tap',"+json.dumps(point)+").then(done,e=>done({error:String(e)}));"
 assert c.call('WebDriver:ExecuteAsyncScript',{'script':script,'args':[],'newSandbox':True,'sandbox':'system'})['value'] is True
 results['address_first_tap_keyboard']=wait('return !document.querySelector("#vulpes-gaia-keyboard").hidden && document.activeElement===rocketbar.input;')
 c.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();return true;")
 wait('return !rocketbar.active && !rocketbar.isClosing;')
 c.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();return true;")
 time.sleep(2)
 results['home_returns']=wait('return ["http://homescreen.localhost:8765","http://verticalhome.localhost:8765"].includes(Service.query("getActiveApp")?.origin);')
 results['web_views_hidden_after_home']=c.execute("return [...ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs').Views.entries.values()].every(e=>e.browser.style.visibility==='hidden');")
 assert results['web_views_hidden_after_home']
 print(json.dumps(results,indent=2))
 Path('logs/feedback-20261014-browser-video/browser-results.json').write_text(json.dumps(results,indent=2)+'\n')
