#!/usr/bin/env python3
"""Exercise the October Settings regressions in the isolated Gaia test profile."""
import importlib.util
import json
import time
from pathlib import Path
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
checks={}
with Client(2857) as client:
    probe.register(client)
    def ev(app,code):
        r=probe.evaluate(client,app,code)
        assert 'error' not in r,r
        return r.get('value')
    def wait(app,code):
        for _ in range(80):
            v=ev(app,code)
            if v:return v
            time.sleep(.15)
        raise AssertionError((app,code))
    def check(name,value):
        checks[name]=value
        assert value,(name,value)
        print(name+': OK',flush=True)
    def launch(app):
        ev('system',f"await VulpesCompat.call('apps.launch',{{manifestURL:'http://{app}.localhost:8765/manifest.webapp'}});return true;")
        wait(app,"return document.readyState==='complete';")
    def panel(name,extra='{}'):
        ev('settings',f"const s=await new Promise(r=>require(['modules/settings_service'],r));s.navigate('{name}',{extra});return true;")
        wait('settings',f"return document.getElementById('{name}')?.classList.contains('current');")
    wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';")
    ev('system',"ScreenManager.turnScreenOn(true);if(Service.query('locked'))await Service.request('unlock',{forcibly:true});return true;")
    launch('settings')
    # An IME commits text through input, without a synthetic legacy keypress.
    ev('settings', "const s=await new Promise(r=>require(['modules/dialog_service'],r));if(!s._navigating)s.show('screenLock-passcode',{mode:'create'});return true;")
    wait('settings', "return document.querySelector('#screenLock-passcode input')?.type==='password';")
    check('pin-ime-input',ev('settings',"""
const p=document.querySelector('#screenLock-passcode'),i=p.querySelector('input');
i.value='12341234';i.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'12341234'}));
return p.dataset.passcodeStatus==='success' && i.type==='password' && i.inputMode==='numeric' && p.querySelectorAll('[data-dot]').length===8;
"""))
    check('pin-backspace',ev('settings',"""
const p=document.querySelector('#screenLock-passcode'),i=p.querySelector('input');
i.value='1234123';i.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
return p.dataset.passcodeStatus!=='success' && p.querySelectorAll('[data-dot]').length===7;
"""))
    ev('settings', "document.querySelector('#screenLock-passcode button[type=reset]').click();return true;")
    panel('appPermissions')
    check('permissions-list-without-retired-api',ev('settings',"""
const List=await new Promise(r=>require(['panels/app_permissions_list/app_permissions_list'],r));
const table=await (await fetch('/resources/permissions_table.json')).json();
const list=List(),ul=document.createElement('ul');list.init(ul);list.setPermissionsTable(table);
list._initExplicitPermissionsTable(await navigator.mozApps.getSelf());list._apps=[];
list._loadApps([{origin:'http://test.localhost:8765',manifestURL:'http://test.localhost:8765/manifest.webapp',manifest:{name:'Test installed app',type:'web'}}]);
return ul.querySelector('li span')?.textContent==='Test installed app';
"""))
    panel('about-legal')
    for lang,header in [('fr','Paramètres'),('en-US','Settings'),('el','Ρυθμίσεις')]:
        ev('settings',f"await navigator.mozSettings.createLock().set({{'language.current':'{lang}'}});return true;")
        wait('settings',f"return document.querySelector('#root h1')?.textContent==={json.dumps(header)};")
        wait('homescreen',f"return document.documentElement.lang==='{lang}';")
        check('language-'+lang,ev('settings',"return document.querySelector('#vulpes-credits').textContent.startsWith("+json.dumps('Vulpes OS repose' if lang=='fr' else 'Vulpes OS builds')+");"))
    ev('settings',"await navigator.mozSettings.createLock().set({'lockscreen.enabled':false});return true;")
    ev('system',"dispatchEvent(new CustomEvent('vulpes-service-event',{detail:{type:'screen-off',data:{}}}));return true;")
    time.sleep(.5)
    check('disabled-lock-stays-unlocked',ev('system',"return !Service.query('locked') && !document.querySelector('#screen').classList.contains('locked');"))
    panel('sound')
    ev('settings',"document.querySelector('.manage-tones-button').click();return true;")
    wait('ringtones',"return location.pathname==='/manage.html' && document.body?.dataset.ready==='true';")
    check('manage-tones-opens',True)
    ev('system',"dispatchEvent(new CustomEvent('home'));return true;")
    ev('system',"await navigator.mozSettings.createLock().set({'homescreen.manifestURL':'http://verticalhome.localhost:8765/manifest.webapp'});return true;")
    wait('verticalhome',"return window.app?.itemStore.ready && app.grid.getItems().length>10;")
    check('alternate-home-first-start',True)
    ev('system',"await navigator.mozSettings.createLock().set({'homescreen.manifestURL':'http://homescreen.localhost:8765/manifest.webapp','language.current':'fr','lockscreen.enabled':true});return true;")
print(json.dumps(checks,ensure_ascii=False,indent=2))
