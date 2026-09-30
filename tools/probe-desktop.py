#!/usr/bin/env python3
"""Evaluate diagnostics in Gaia on the test desktop, never a normal profile."""

import json, sys, time
from marionette_client import Client


def evaluate(client, app, code, path="/"):
    prefix = f"http://{app}.localhost:8765{path}"
    script = """const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');
const bc=w?.document.getElementById('system')?.browsingContext;
function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;for(const c of b.children){const f=find(c);if(f)return f;}return null;}
const target=bc&&find(bc);if(!target){done({missing:true});return;}
target.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',CODE).then(value=>done({value}),error=>done({error:String(error)}));""".replace(
        "PREFIX", json.dumps(prefix)
    ).replace(
        "CODE", json.dumps(code)
    )
    return client.call(
        "WebDriver:ExecuteAsyncScript",
        {
            "script": script,
            "args": [],
            "newSandbox": True,
            "sandbox": "system",
            "scriptTimeout": 25000,
        },
    )["value"]


def register(client):
    assert client.execute("return PathUtils.profileDir;").split("/")[-1].startswith("host-")
    client.execute(
        "try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}"
    )


if __name__ == "__main__":
    with Client(2857) as c:
        register(c)
        for _ in range(50):
            result = evaluate(c, sys.argv[1], sys.argv[2])
            if not result.get("missing"):
                break
            time.sleep(0.2)
        print(json.dumps(result, indent=2, ensure_ascii=False))
