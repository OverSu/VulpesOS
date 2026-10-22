#!/usr/bin/env python3
"""Check compact Gaia Phone with a simulated modem, in the desktop test profile."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('probe',ROOT/'tools/probe-desktop.py')
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
with Client(2857) as client:
    probe.register(client)
    def ev(app,code):
        result=probe.evaluate(client,app,code,'/dialer/' if app=='communications' else '/')
        if 'error' in result:raise RuntimeError(result['error'])
        return result.get('value')
    def wait(app,code):
        for _ in range(100):
            result=ev(app,code)
            if result:return result
            time.sleep(.2)
        raise AssertionError((app,code))
    assert client.execute("return Services.env.get('VULPES_KEYPAD')==='1' && Services.env.get('VULPES_TEST_TELEPHONY')==='1';")
    client.execute("""const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');
      Runtime.compactOriginal=Runtime.platform.request.bind(Runtime.platform);
      Runtime.compactCalls=[];Runtime.compactDials=0;
      Runtime.platform.request=async(actor,app,op,params)=>{
        if(op==='calls')return Runtime.compactCalls;
        if(op==='dial'){
          Runtime.compactDials++;
          const {setTimeout}=ChromeUtils.importESModule('resource://gre/modules/Timer.sys.mjs');
          await new Promise(resolve=>setTimeout(resolve,700));
          Runtime.compactCalls=[{path:'/test/compact/1',number:params.number,state:'dialing'}];
          return {path:'/test/compact/1'};
        }
        if(op==='hangup'){Runtime.compactCalls=[];return {};}
        if(op==='callAudio')return {muted:false,speaker:false};
        return Runtime.compactOriginal(actor,app,op,params);
      };return true;""")
    try:
        ev('system','dispatchEvent(new CustomEvent("home"));return true;')
        wait('homescreen','return !!document.querySelector("gaia-app-icon");')
        ev('homescreen','document.querySelector("gaia-app-icon").click();return true;')
        wait('communications','return !!window.KeypadManager && document.readyState==="complete";')
        ev('communications','setTimeout(()=>location.reload(),50);return true;');time.sleep(1)
        wait('communications','return document.readyState==="complete" && !!window.CallHandler && !!window.VulpesPlatformDial;')
        ev('communications','dispatchEvent(new Event("resize"));return true;')
        layout=ev('communications','''const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
          return {size:[innerWidth,innerHeight],bar:rect('keypad-callbar'),tabs:rect('option-recents'),
            keys:[...document.querySelectorAll('.keypad-key')].map(e=>({rect:e.getBoundingClientRect().toJSON(),overflow:e.scrollHeight>e.clientHeight || e.scrollWidth>e.clientWidth})),
            hidden:document.getElementById('views').classList.contains('hide-toolbar')};''')
        assert layout['size'][0]==240 and not layout['hidden'],layout
        assert layout['bar']['bottom']<=layout['tabs']['top']+1,layout
        assert all(not k['overflow'] and k['rect']['bottom']<=layout['bar']['top']+1 for k in layout['keys']),layout
        ev('communications','KeypadManager.updatePhoneNumber("5550100","begin",false);document.getElementById("keypad-callbar-call-action").click();document.getElementById("keypad-callbar-call-action").click();return true;')
        wait('callscreen','return navigator.mozTelephony.calls[0]?.state==="dialing";')
        assert client.execute("return ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs').Runtime.compactDials;")==1
        client.execute("""const w=Services.wm.getMostRecentWindow('vulpes:host');
          const root=w.document.getElementById('system').browsingContext;
          function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://callscreen.localhost:'))return b;for(const c of b.children){const f=find(c);if(f)return f;}return null;}
          find(root).currentWindowGlobal.getActor('Keypad').sendAsyncMessage('Vulpes:Navigate',{key:'F4',repeat:false});return true;""")
        wait('system','return navigator.mozTelephony.calls.length===0;')
        result={'dialPadFits':True,'tabsRemainAfterResize':True,'repeatedPressSingleCall':True,'originalCallScreen':True,'redKeyHangup':True}
        (ROOT/'logs/compact-phone.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result,indent=2))
    finally:
        client.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.compactCalls=[];Runtime.platform.request=Runtime.compactOriginal;return true;")
