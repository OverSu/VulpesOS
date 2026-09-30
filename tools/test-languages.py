#!/usr/bin/env python3
"""Native language select: physical clicks, keyboard, translation and restart."""
import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--restart-check", action="store_true")
args = parser.parse_args()
results = {}
with Client(2857) as client:
    engine = client.execute("return Services.appinfo.platformVersion;")
    assert (
        client.execute("return PathUtils.profileDir;").split("/")[-1].startswith("host-")
    ), "Test profile required"
    client.execute(
        "try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}"
    )

    def ev(app, code, path="/"):
        prefix = "http://" + app + ".localhost:8765" + path
        script = """const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');
if(!w?.document.getElementById('system')){done({missing:true});return;}
const bc=(function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;for(const c of b.children){const f=find(c);if(f)return f;}return null;})(w.document.getElementById('system').browsingContext);
if(!bc){done({missing:true});return;}bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',CODE).then(result=>done({result}),error=>done({error:String(error)}));""".replace(
            "PREFIX", json.dumps(prefix)
        ).replace(
            "CODE", json.dumps(code)
        )
        r = client.call(
            "WebDriver:ExecuteAsyncScript",
            {
                "script": script,
                "args": [],
                "newSandbox": True,
                "sandbox": "system",
                "scriptTimeout": 15000,
            },
        )["value"]
        if "error" in r:
            raise AssertionError(r)
        return r.get("result")

    def wait(app, code, path="/"):
        for _ in range(70):
            r = ev(app, code, path)
            if r:
                return r
            time.sleep(0.15)
        raise AssertionError("Timeout: " + app + " " + code)

    def check(name, condition):
        results[name] = condition
        print(name + ": " + json.dumps(condition, ensure_ascii=False), flush=True)
        assert condition is True, (name, condition)

    def launch(app, entry=None):
        ev(
            "system",
            'await VulpesCompat.call("apps.launch",'
            + json.dumps(
                {"manifestURL": f"http://{app}.localhost:8765/manifest.webapp", "entryPoint": entry}
            )
            + ");return true;",
        )
        wait(app, "return document.readyState==='complete';")
        wait(
            "system",
            "return [...document.querySelectorAll('.appWindow.active[transition-state=opened] iframe')].some(f=>f.src.startsWith('http://"
            + app
            + ".localhost:8765/'));",
        )
        time.sleep(0.5)

    def focus():
        client.execute(
            "const w=Services.wm.getMostRecentWindow('vulpes:host');w.focus();w.document.getElementById('system').focus();return true;"
        )
        subprocess.run(
            ["xdotool", "search", "--name", "^Vulpes", "windowraise", "windowfocus"],
            check=True,
            stdout=subprocess.DEVNULL,
        )

    def tap(app, selector, path="/"):
        pos = ev(
            app,
            "const e="
            + selector
            + ";await new Promise(r=>setTimeout(r,150));const b=e.getBoundingClientRect();return {x:mozInnerScreenX+b.x+b.width/2,y:mozInnerScreenY+b.y+b.height/2};",
            path,
        )
        focus()
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        time.sleep(0.4)

    def shot(name):
        subprocess.run(
            ["import", "-window", "root", str(ROOT / "logs" / ("feedback-" + name + ".png"))],
            check=True,
        )

    try:
        wait("system", "return document.body?.getAttribute('ready-state')==='fullyLoaded';")
        launch("settings")
        wait(
            "settings",
            "return typeof require==='function' && !!document.querySelector('#root gaia-header');",
        )
        ev(
            "settings",
            "require(['modules/settings_service'],s=>s.navigate('languages'));return true;",
        )
        wait(
            "settings",
            "return document.querySelector('select[name=\"language.current\"]')?.options.length>10;",
        )
        wait(
            "settings",
            "const r=document.querySelector('select[name=\"language.current\"]').getBoundingClientRect();return r.x>=0 && r.x<innerWidth/2;",
        )
        time.sleep(0.5)

        def state():
            return client.execute(
                "return Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('ContentSelectDropdown')?.menupopup?.state;"
            )

        def open_menu():
            tap("settings", "document.querySelector('select[name=\"language.current\"]')")
            for _ in range(30):
                if state() == "open":
                    return
                time.sleep(0.1)
            raise AssertionError("Native select did not open")

        if args.restart_check:
            check(
                "language-survives-restart",
                ev(
                    "settings",
                    "return document.documentElement.lang==='fr' && document.querySelector('select[name=\"language.current\"]').value==='fr';",
                ),
            )
        else:
            original = ev(
                "settings",
                "return document.querySelector('select[name=\"language.current\"]').value;",
            )
            open_menu()
            check(
                "native-language-menu-styled",
                client.execute(
                    "const w=Services.wm.getMostRecentWindow('vulpes:host');const item=w.document.querySelector('#ContentSelectDropdownPopup menuitem');return w.getComputedStyle(item.querySelector('.menu-highlightable-text')).display==='none' && w.getComputedStyle(item.querySelector('.menu-text')).display!=='none';"
                ),
            )
            shot("languages-native-menu")
            subprocess.run(["xdotool", "key", "Escape"], check=True)
            check(
                "language-cancel-preserves-value",
                ev(
                    "settings",
                    "return document.querySelector('select[name=\"language.current\"]').value==="
                    + json.dumps(original)
                    + ";",
                ),
            )
            open_menu()
            # Native menu keyboard selection exercises Gecko's input/change route.
            subprocess.run(["xdotool", "key", "Home", *(["Down"] * 8), "Return"], check=True)
            check(
                "language-english-applied",
                wait(
                    "settings",
                    "return document.documentElement.lang==='en-US' && document.querySelector('select[name=\"language.current\"]').value==='en-US' && document.querySelector('#languages h1').textContent.includes('Language');",
                ),
            )
            check(
                "language-english-home",
                wait("homescreen", "return document.documentElement.lang==='en-US';"),
            )
            open_menu()
            # Select French with a real pointer click on the native menu item.
            position = client.execute(
                "const w=Services.wm.getMostRecentWindow('vulpes:host');const e=[...w.document.querySelectorAll('#ContentSelectDropdownPopup menuitem')].find(e=>e.getAttribute('label').includes('Français'));e.scrollIntoView();const b=e.getBoundingClientRect();return {x:w.mozInnerScreenX+b.x+b.width/2,y:w.mozInnerScreenY+b.y+b.height/2};"
            )
            subprocess.run(
                [
                    "xdotool",
                    "mousemove",
                    str(round(position["x"])),
                    str(round(position["y"])),
                    "click",
                    "1",
                ],
                check=True,
            )
            check(
                "language-french-applied",
                wait(
                    "settings",
                    "return document.documentElement.lang==='fr' && document.querySelector('select[name=\"language.current\"]').value==='fr' && document.querySelector('#languages h1').textContent.includes('Langue');",
                ),
            )
            check(
                "language-french-home",
                wait("homescreen", "return document.documentElement.lang==='fr';"),
            )
            shot("languages-french")
    finally:
        (
            ROOT
            / "logs"
            / ("languages-restart-results.json" if args.restart_check else "languages-results.json")
        ).write_text(json.dumps(results, indent=2) + "\n")
