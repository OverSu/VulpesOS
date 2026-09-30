#!/usr/bin/env python3
"""Inspect a test host. Requires its explicitly enabled Marionette port."""
import argparse
import json
import sys
from marionette_client import Client

parser = argparse.ArgumentParser()
parser.add_argument("--app", default="system")
args = parser.parse_args()
with Client(2857) as client:
    client.execute(
        """
try {ChromeUtils.registerWindowActor('VulpesProbe', {child: {esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'}, allFrames:true,safeForUntrustedWebProcess:true});} catch(e) {}
"""
    )
    script = (
        sys.stdin.read()
        or """return {url:location.href, title:document.title, text:document.body?.innerText.slice(0,500),
      api:typeof navigator.vulpesRequest, frames:Array.from(document.querySelectorAll('iframe'),f=>({src:f.src,id:f.id})),
      booted:!!window.app, appsReady:!!window.applications?.ready};"""
    )
    result = client.call(
        "WebDriver:ExecuteAsyncScript",
        {
            "script": """
const done=arguments[arguments.length-1];
const browser=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system');
const deadline=Date.now()+10000;
(function inspect(){
const context=
(function find(bc){if(bc.currentWindowGlobal?.documentURI.spec.startsWith("http://"""
            + args.app
            + """.localhost:8765/"))return bc;for(const c of bc.children){const found=find(c);if(found)return found;}return null;})(browser.browsingContext);
if(!context){if(Date.now()<deadline){setTimeout(inspect,100);return;}done({error:'Application is not open'});return;}
context.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate', """
            + json.dumps(script)
            + """).then(v=>done({result:v}),e=>done({error:String(e),stack:e.stack}));
})();
""",
            "args": [],
            "newSandbox": True,
            "sandbox": "system",
            "scriptTimeout": 15000,
        },
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
