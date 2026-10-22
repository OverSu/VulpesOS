#!/usr/bin/env python3
"""Exercise one-click input, native web selectors and URL sharing without sending."""
import importlib.util
import json
from pathlib import Path
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from marionette_client import Client

spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
class Page(BaseHTTPRequestHandler):
    def do_GET(self):
        data=b'''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Web controls test</title>
<style>input,select,[contenteditable]{font:20px sans-serif;display:block;margin:20px;height:40px;width:240px}</style>
<input id="text"><select id="select"><option value="one">One</option><option value="two">Two</option></select>
<div id="editor" contenteditable><span>Editable</span></div><div id="shadow"></div>
<script>document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<input id="inside" style="height:40px">';</script>'''
        self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Page)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
checks={}
try:
 with Client(2857) as c:
    for _ in range(120):
        if c.execute("return !!Services.wm.getMostRecentWindow('vulpes:host')?.document.getElementById('system');"):break
        time.sleep(.25)
    probe.register(c)
    c.execute("const w=Services.wm.getMostRecentWindow('vulpes:host');w.focus();w.document.getElementById('system').focus();return true;")
    def query(app,kind,data):
        selector="""const w=Services.wm.getMostRecentWindow('vulpes:host');let bc;
if(APP==='web')bc=[...w.document.querySelectorAll('browser')].find(b=>b.id!=='system' && b.style.visibility==='visible')?.browsingContext;
else {function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://'+APP+'.localhost:8765/'))return b;for(const child of b.children){const v=find(child);if(v)return v;}}bc=find(w.document.getElementById('system').browsingContext);}
if(!bc){done({missing:true});return;}
bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery(KIND,DATA).then(value=>done({value}),error=>done({error:String(error)}));"""
        script='const done=arguments[arguments.length-1];'+selector.replace('APP',json.dumps(app)).replace('KIND',json.dumps(kind)).replace('DATA',json.dumps(data))
        r=c.call('WebDriver:ExecuteAsyncScript',{'script':script,'args':[],'sandbox':'system','newSandbox':True})['value']
        if r.get('missing'):return None
        assert 'value' in r,r
        return r['value']
    def ev(app,code):return query(app,'Evaluate',code)
    def wait(app,code):
        for _ in range(80):
            result=ev(app,code)
            if result:return result
            time.sleep(.15)
        raise AssertionError(code)
    def click(app,expression):
        r=ev(app,'return ('+expression+').getBoundingClientRect().toJSON();')
        query(app,'MouseClick',{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2})
        time.sleep(.5)
    wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';")
    ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("activities.cancel",{});core.appCore.rocketbar.handleCancel();dispatchEvent(new CustomEvent("home"));return true;')
    time.sleep(1)
    click('system','document.querySelector("#rocketbar")')
    checks['home-first-click']=bool(wait('system','return core.appCore.rocketbar.active && !document.querySelector("#vulpes-gaia-keyboard")?.hidden;'))
    ev('system','core.appCore.rocketbar.handleCancel();return true;');time.sleep(.5)
    ev('system',"new MozActivity({name:'view',data:{type:'url',url:"+json.dumps(url)+"}});return true;")
    time.sleep(2)
    wait('web','return !!document.querySelector("#text");')
    click('web','document.querySelector("#text")')
    checks['web-input-first-click']=bool(wait('system','return !document.querySelector("#vulpes-gaia-keyboard")?.hidden;'))
    ev('keyboard',"await navigator.mozInputMethod.inputcontext.sendKey('a',0);return true;")
    checks['web-input-edits']=ev('web','return document.querySelector("#text").value==="a";')
    click('web','document.querySelector("#select")')
    time.sleep(.3)
    checks['web-select-opens']=c.execute("return Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('ContentSelectDropdownPopup')?.state==='open';")
    print(json.dumps(checks),flush=True)
    if checks['web-select-opens']:
        c.execute("const p=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('ContentSelectDropdownPopup');p.querySelectorAll('menuitem')[1].doCommand();p.hidePopup();return true;")
        checks['web-select-changes']=bool(wait('web','return document.querySelector("#select").value==="two";'))
    click('web','document.querySelector("#editor span")')
    ev('keyboard',"await navigator.mozInputMethod.inputcontext.sendKey('b',0);return true;")
    checks['nested-contenteditable']=ev('web','return document.querySelector("#editor").textContent.includes("b");')
    click('web','document.querySelector("#shadow").shadowRoot.querySelector("input")')
    ev('keyboard',"await navigator.mozInputMethod.inputcontext.sendKey('c',0);return true;")
    checks['shadow-input']=ev('web','return document.querySelector("#shadow").shadowRoot.querySelector("input").value==="c";')
    ev('system','Service.query("getActiveApp").appChrome.overflowMenu.show();return true;')
    time.sleep(.3)
    click('system','Service.query("getActiveApp").appChrome.shareButton')
    checks['share-choices']=wait('system','return document.querySelector("#action-menu")?.checkVisibility() && document.querySelectorAll("#action-menu-list button[data-value]").length===2;')
    click('system','document.querySelector("#action-menu-list button")')
    time.sleep(1)
    checks['share-url-to-sms']=bool(wait('sms','return document.querySelector("#messages-input")?.textContent.includes('+json.dumps(url)+');'))
    print(json.dumps(checks,indent=2),flush=True)
    assert all(checks.values()),checks
    ev('system','await VulpesCompat.call("activities.cancel",{});dispatchEvent(new CustomEvent("home"));return true;')
finally:server.shutdown()
