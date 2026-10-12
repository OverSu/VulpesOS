#!/usr/bin/env python3
"""Check touch send and attachment selection on the isolated desktop, with a fake modem."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('probe',ROOT/'tools/probe-desktop.py')
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
with Client(2857) as c:
    probe.register(c)
    c.execute("Services.prefs.setCharPref('layout.css.devPixelsPerPx','1');const w=Services.wm.getMostRecentWindow('vulpes:host');w.resizeTo(360,720);return true;")
    time.sleep(.5)
    def ev(app,code):
        value=probe.evaluate(c,app,code)
        if 'value' not in value:raise RuntimeError(value)
        return value['value']
    def wait(app,code):
        for _ in range(80):
            if probe.evaluate(c,app,code).get('value'):return
            time.sleep(.1)
        raise AssertionError(code)
    def tap(app,selector):
        rect=ev(app,'return document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON();')
        point={'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}
        script='''const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');
function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;for(const child of b.children){const f=find(child);if(f)return f;}}
find(w.document.getElementById('system').browsingContext).currentWindowGlobal.getActor('VulpesProbe').sendQuery('Tap',POINT).then(done,e=>done({error:String(e)}));'''
        result=c.call('WebDriver:ExecuteAsyncScript',{'script':script.replace('PREFIX',json.dumps('http://'+app+'.localhost:8765/')).replace('POINT',json.dumps(point)),'args':[],'newSandbox':True,'sandbox':'system'})['value']
        assert result is True,result
        time.sleep(.35)
    ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("activities.cancel",{});dispatchEvent(new CustomEvent("home"));await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
    wait('sms',"return typeof Navigation?.toPanel==='function';")
    c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');Runtime.messages.__saved=[Runtime.messages.radio,Runtime.messages.radioStatus];Runtime.messages.__count=0;Runtime.messages.radio=async()=>{Runtime.messages.__count++;return {state:'sent'};};Runtime.messages.radioStatus=null;return true;")
    try:
        ev('sms','await Navigation.toPanel("thread-list");await Navigation.toPanel("composer");Compose.clear();ConversationView.recipients.length=0;ConversationView.recipients.add({name:"5550199",number:"5550199",source:"manual"});Compose.append("One touch send regression");return true;')
        tap('sms','#messages-input')
        wait('system','return document.querySelector("#vulpes-gaia-keyboard")?.getBoundingClientRect().height>100;')
        tap('sms','#messages-send-button')
        wait('sms','return [...document.querySelectorAll(".message-content-body")].some(e=>e.textContent==="One touch send regression");')
        count=c.execute("return ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs').Runtime.messages.__count;")
        assert count==1,count
        assert ev('system','return document.querySelector("#vulpes-gaia-keyboard")?.getBoundingClientRect().height>100;'),'Keyboard closed after send'
        tap('sms','#messages-attach-button')
        wait('system','return document.querySelector("#action-menu")?.checkVisibility() && document.querySelectorAll("#action-menu-list button").length>=4;')
        labels=ev('system','return [...document.querySelectorAll("#action-menu-list button")].map(e=>e.textContent);')
        tap('system','#action-menu-list button')
        wait('gallery','return location.hash==="#pick";')
        report={'singleTapSend':True,'modemSubmissions':count,'keyboardRetained':True,'attachmentChoices':labels,'originalGalleryPicker':True}
        print(json.dumps(report,ensure_ascii=False))
    finally:
        ev('system','await VulpesCompat.call("activities.cancel",{});dispatchEvent(new CustomEvent("home"));return true;')
        ev('sms','const ids=await new Promise(resolve=>{const a=[];const c=navigator.mozMobileMessage.getMessages({numbers:["5550199"]});c.onsuccess=()=>{if(c.done)resolve(a);else{a.push(c.result.id);c.continue();}};});if(ids.length)await navigator.mozMobileMessage.delete(ids);return true;')
        c.execute("const {Runtime}=ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');[Runtime.messages.radio,Runtime.messages.radioStatus]=Runtime.messages.__saved;delete Runtime.messages.__saved;delete Runtime.messages.__count;return true;")
