#!/usr/bin/env python3
"""Launch genuine user apps in the explicitly enabled test profile and record diagnostics."""
import json
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
with Client(2857) as c:
    assert "/host-" in c.execute("return PathUtils.profileDir;")
    c.execute(
        "try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}"
    )

    def ev(app, code, path="/"):
        s = """const done=arguments[arguments.length-1];const root=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext;
const bc=(function f(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;for(const child of b.children){const r=f(child);if(r)return r;}})(root);
if(!bc){done(null);return;}bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',CODE).then(done,e=>done({error:String(e)}));""".replace(
            "PREFIX", json.dumps("http://" + app + ".localhost:8765" + path)
        ).replace(
            "CODE", json.dumps(code)
        )
        return c.call(
            "WebDriver:ExecuteAsyncScript",
            {
                "script": s,
                "args": [],
                "newSandbox": True,
                "sandbox": "system",
                "scriptTimeout": 15000,
            },
        )["value"]

    results = {}
    for app, entry in [
        ("communications", "dialer"),
        ("communications", "contacts"),
        ("sms", None),
        ("email", None),
        ("gallery", None),
        ("music", None),
        ("video", None),
        ("clock", None),
        ("costcontrol", None),
        ("camera", None),
        ("calendar", None),
        ("settings", None),
        ("search", None),
        ("fm", None),
    ]:
        params = {
            "manifestURL": f"http://{app}.localhost:8765/manifest.webapp",
            "entryPoint": entry,
        }
        ev(
            "system",
            'await VulpesCompat.call("apps.launch",' + json.dumps(params) + ");return true;",
        )
        path = "/" + entry + "/" if entry else "/"
        for _ in range(100):
            if ev(app, "return document.readyState==='complete';", path):
                break
            time.sleep(0.1)
        time.sleep(1)
        result = ev(
            app,
            "return {url:location.href,text:document.body?.innerText.slice(0,1800),diagnostics:window.__vulpesDiagnostics};",
            path,
        )
        results[app + ("/" + entry if entry else "")] = result
        print(app, json.dumps(result, ensure_ascii=False), flush=True)
    (ROOT / "logs/app-audit.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
