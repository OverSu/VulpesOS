#!/usr/bin/env python3
"""Exercise real Gaia hotspot dialogs in the isolated PC profile with a fake radio.

This tests UI behavior only. Native hotspot qualification is a separate test.
"""
import importlib.util,json,time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
with Client(2857) as client:
    probe.register(client)
    def ev(code):
        result=probe.evaluate(client,'settings',code)
        if 'error' in result:raise AssertionError(result['error'])
        return result.get('value')
    def wait(code):
        for _ in range(100):
            if ev(code):return
            time.sleep(.1)
        state=ev("const d=await new Promise(r=>require(['modules/dialog_service'],r));const p=document.getElementById('hotspot-wifiSettings');return {navigating:d._navigating,pending:d._pendingRequests.length,hidden:p.hidden,current:Array.from(document.querySelectorAll('section.current'),p=>p.id),transition:getComputedStyle(p).transition,visibility:getComputedStyle(p).visibility,notes:Array.from(p.querySelectorAll('[role=status]'),p=>p.textContent)};")
        raise AssertionError((code,state))
    for _ in range(100):
        ready=probe.evaluate(client,'system','return document.body?.getAttribute("ready-state")==="fullyLoaded";')
        if ready.get('value'):break
        time.sleep(.2)
    probe.evaluate(client,'system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
    wait('return !!document.querySelector("#root.current") && typeof require==="function";')
    ev('location.reload();return true;');time.sleep(.7)
    wait('return !!document.querySelector("#root.current") && typeof require==="function";')
    ev('''window.__hotspotOriginalCall=VulpesCompat.call;
      window.__hotspotFake={enabled:false,configured:false,ssid:'Vulpes OS',security:'wpa2-psk',password:''};
      window.__hotspotWrites=[];window.__hotspotFail=false;
      VulpesCompat.call=async(method,p)=>{
        if(method!=='platform.wifi')return __hotspotOriginalCall(method,p);
        if(p.operation==='hotspotSave'){
          if(__hotspotFail)throw Error('HOTSPOT_SAVE_FAILED');
          __hotspotWrites.push('save');Object.assign(__hotspotFake,{configured:true,ssid:p.ssid,security:p.security,password:p.password});
        } else if(p.operation==='hotspotPower'){__hotspotWrites.push(p.enabled?'on':'off');__hotspotFake.enabled=p.enabled;}
        return {...__hotspotFake};
      };
      window.VulpesNativeWifi=true;
      const script=document.createElement('script');script.src='/_vulpes/gaia-wifi.js';document.head.append(script);return true;''')
    try:
        wait('return !!window.VulpesWifiSettings;')
        ev("require(['modules/settings_service'],s=>s.navigate('hotspot'));return true;")
        wait("return !!document.querySelector('#hotspot.current #tethering-wifi-enabled:not([disabled])');")
        def open_dialog():
            ev("document.querySelector('#hotspot-settings-section a').click();return true;")
            wait("return document.querySelector('#hotspot-wifiSettings').classList.contains('current');")
        def closed():
            wait("const d=await new Promise(r=>require(['modules/dialog_service'],r));return !d._navigating && !document.querySelector('#hotspot-wifiSettings').classList.contains('current') && !document.querySelector('#tethering-wifi-enabled').disabled;")
        open_dialog()
        ev("document.querySelector('#hotspot-wifiSettings button[type=reset]').click();return true;");closed()
        open_dialog()
        ev("const p=document.querySelector('#hotspot-wifiSettings');p.querySelector('input[type=text]').value='UI test';p.querySelector('input[name=password]').value='short';p.querySelector('button[type=submit]').click();return true;")
        time.sleep(.3)
        assert ev("return document.querySelector('#hotspot-wifiSettings').classList.contains('current') && __hotspotWrites.length===0;")
        ev("window.__hotspotFail=true;const p=document.querySelector('#hotspot-wifiSettings');p.querySelector('input[name=password]').value='testpassword';p.querySelector('button[type=submit]').click();return true;")
        wait("return !!document.querySelector('#hotspot-wifiSettings [role=status]').textContent;")
        state=ev("const p=document.getElementById('hotspot-wifiSettings');return {preserved:p.querySelector('input[name=password]').value==='testpassword',writes:__hotspotWrites,current:p.classList.contains('current'),message:p.querySelector('[role=status]').textContent,disabled:p.querySelector('button[type=submit]').disabled};")
        assert state['preserved'] and not state['writes'],state
        ev("window.__hotspotFail=false;document.querySelector('#hotspot-wifiSettings button[type=submit]').click();return true;");closed()
        assert ev("return __hotspotFake.configured && __hotspotWrites.join(',')==='save';")
        for enabled in (True,False):
            ev("const c=document.querySelector('#tethering-wifi-enabled');c.checked="+json.dumps(enabled)+";c.dispatchEvent(new Event('change',{bubbles:true}));return true;")
            wait("return !document.querySelector('#tethering-wifi-enabled').disabled && __hotspotFake.enabled==="+json.dumps(enabled)+';')
        assert ev("return __hotspotWrites.join(',')==='save,on,off';")
        print('PASS: Gaia hotspot cancel/reopen, invalid input, failed save retention, retry, start/stop. Fake radio only.')
    finally:
        ev("VulpesCompat.call=__hotspotOriginalCall;location.reload();return true;")
