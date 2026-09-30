#!/usr/bin/env python3
"""Check the native navigation surface follows Gaia's active application."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client
from project import ROOT

spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
with Client(2857) as c:
    probe.register(c)
    def state():
        return c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host'),d=w.document,b=d.getElementById('home');return {home:d.documentElement.hasAttribute('home-active'),bottom:d.documentElement.hasAttribute('home-at-bottom'),height:w.innerHeight,screen:d.getElementById('screen').clientHeight,bar:b.clientHeight,background:w.getComputedStyle(b).backgroundImage,color:w.getComputedStyle(b).backgroundColor};")
    def wait(home):
        for _ in range(100):
            s=state()
            if s['home']==home and s['screen']==s['height']-(0 if home else s['bar']):return s
            time.sleep(.15)
        raise AssertionError(s)
    c.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();")
    home=wait(True);assert 'linear-gradient' in home['background'],home
    c.execute("const b=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home');InspectorUtils.addPseudoClassLock(b,':active');")
    pressed=state();assert pressed['background']==home['background'] and pressed['color']==home['color'],pressed
    c.execute("InspectorUtils.removePseudoClassLock(Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home'),':active');")
    probe.evaluate(c,'homescreen',"const p=document.querySelector('#apps-panel > .scrollable');p.scrollTop=p.scrollHeight;return true;")
    for _ in range(100):
        bottom=state()
        if bottom['bottom']:break
        time.sleep(.1)
    assert bottom['background']=='none' and bottom['color']=='rgba(0, 0, 0, 0)',bottom
    result=probe.evaluate(c,'system','await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
    assert result.get('value'),result
    app=wait(False);assert app['background']=='none' and app['color']=='rgb(18, 35, 50)',app
    denied=probe.evaluate(c,'settings','try {await VulpesCompat.call("desktop.navigation",{home:true});return false;} catch(e) {return true;}')
    assert denied.get('value'),denied
    deniedScroll=probe.evaluate(c,'settings','try {await VulpesCompat.call("desktop.homeScroll",{bottom:true});return false;} catch(e) {return true;}')
    assert deniedScroll.get('value'),deniedScroll
    c.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();")
    wait(True)
    probe.evaluate(c,'homescreen',"document.querySelector('#apps-panel > .scrollable').scrollTop=0;return true;")
    for _ in range(100):
        top=state()
        if not top['bottom']:break
        time.sleep(.1)
    assert 'linear-gradient' in top['background'],top
    iconRecovery=probe.evaluate(c,'homescreen', '''
const source=document.querySelectorAll('gaia-app-icon')[1],box=document.createElement('div');
box.style.cssText='display:none;position:fixed;top:0;left:0;width:100px';
document.body.append(box);
const icon=document.createElement('gaia-app-icon');icon.style.width='100px';box.append(icon);icon.size=icon.clientWidth;icon.app=source.app;
try {
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const initial=icon.size;
  box.style.display='block';
  for(let i=0;i<100;i++){
    const image=icon.shadowRoot?.querySelector('img');
    if(image?.complete && image.naturalWidth>0)return {initial,width:icon.size,naturalWidth:image.naturalWidth};
    await new Promise(r=>setTimeout(r,50));
  }
  return {initial,width:icon.size,failed:true};
} finally {box.remove();}
''')
    assert iconRecovery.get('value',{}).get('initial')==0 and iconRecovery['value'].get('naturalWidth',0)>0,iconRecovery
    report={'passed':True,'home':home,'pressed':pressed,'bottom':bottom,'application':app,'returnHome':top,'nonSystemCallerDenied':True,'nonHomeScrollCallerDenied':True,'zeroWidthIconRecovery':iconRecovery['value']}
    (ROOT/'logs/home-surface-test.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
