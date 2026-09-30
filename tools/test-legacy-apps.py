#!/usr/bin/env python3
"""Observe original archived apps in real Gaia; failures stay visible in the report."""
import argparse
import json
import subprocess
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument("--restart-check", action="store_true")
args = p.parse_args()
results = {"engine": None, "restart": args.restart_check, "apps": {}}
with Client(2857) as client:
    profile = client.execute("return PathUtils.profileDir;")
    assert "/host-legacy-" in profile, profile
    results["engine"] = client.execute("return Services.appinfo.platformVersion;")
    client.execute(
        "try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}"
    )

    def ev(app, code):
        script = """const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');
const b=w?.document.getElementById('system');if(!b){done(null);return;}
const bc=(function f(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;for(const c of b.children){const found=f(c);if(found)return found;}return null;})(b.browsingContext);
if(!bc){done(null);return;}bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',CODE).then(v=>done({value:v}),e=>done({error:String(e)}));""".replace(
            "PREFIX", json.dumps("http://" + app + ".localhost:8765/")
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
        if r and "error" in r:
            raise RuntimeError(r["error"])
        return r.get("value") if r else None

    def wait(app, code, timeout=30):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            r = ev(app, code)
            if r:
                return r
            time.sleep(0.2)
        raise RuntimeError("Timeout: " + app + " " + code)

    def focus():
        client.execute(
            "const w=Services.wm.getMostRecentWindow('vulpes:host');w.focus();w.document.getElementById('system').focus();return true;"
        )
        subprocess.run(
            ["xdotool", "search", "--name", "^Vulpes", "windowraise", "windowfocus"],
            check=True,
            stdout=subprocess.DEVNULL,
        )

    def point(app, selector):
        return ev(
            app,
            "const e=document.querySelector("
            + json.dumps(selector)
            + ');e.scrollIntoView({block:"center"});const b=e.getBoundingClientRect();return {x:mozInnerScreenX+b.x+b.width/2,y:mozInnerScreenY+b.y+b.height/2};',
        )

    def tap(app, selector):
        pos = point(app, selector)
        focus()
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        time.sleep(0.3)

    def shot(app):
        focus()
        subprocess.run(
            [
                "import",
                "-window",
                "root",
                str(
                    ROOT
                    / "logs"
                    / ("archive-" + app + ("-restart" if args.restart_check else "") + ".png")
                ),
            ],
            check=True,
        )

    wait("system", "return document.body?.getAttribute('ready-state')==='fullyLoaded';", 60)
    for app in json.loads((ROOT / "tests/legacy-apps.json").read_text()):
        name = app["id"]
        r = {}
        results["apps"][name] = r
        try:
            ev(
                "system",
                'await VulpesCompat.call("apps.launch",'
                + json.dumps({"manifestURL": "http://" + name + ".localhost:8765/manifest.webapp"})
                + ");return true;",
            )
            wait(name, "return document.readyState==='complete';")
            wait(
                "system",
                "return [...document.querySelectorAll('.appWindow.active[transition-state=opened] iframe')].some(f=>f.src.startsWith('http://"
                + name
                + ".localhost:8765/'));",
            )
            time.sleep(1)
            r["loaded"] = True
            r["text"] = ev(name, "return document.body.innerText.slice(0,1800);")
            if name == "legacy-2048-for-firefox-os":
                wait(name, "return document.querySelectorAll('.tile').length>0;")
                r["initialState"] = ev(
                    name, "return JSON.parse(localStorage.getItem('gameState'));"
                )
                if args.restart_check:
                    expected = json.loads((ROOT / "logs/legacy-game-state.json").read_text())
                    r["stateSurvivesRestart"] = r["initialState"] == expected
                else:
                    tap(name, ".game-container")
                    focus()
                    subprocess.run(
                        [
                            "xdotool",
                            "key",
                            "--delay",
                            "150",
                            "Left",
                            "Up",
                            "Right",
                            "Down",
                            "Left",
                            "Up",
                        ],
                        check=True,
                    )
                    time.sleep(0.4)
                    r["keyboardState"] = ev(
                        name, "return JSON.parse(localStorage.getItem('gameState'));"
                    )
                    pos = point(name, ".game-container")
                    focus()
                    subprocess.run(
                        [
                            "xdotool",
                            "mousemove",
                            str(round(pos["x"] + 80)),
                            str(round(pos["y"])),
                            "mousedown",
                            "1",
                        ],
                        check=True,
                    )
                    for i in range(1, 11):
                        subprocess.run(
                            [
                                "xdotool",
                                "mousemove",
                                str(round(pos["x"] + 80 - i * 16)),
                                str(round(pos["y"])),
                            ],
                            check=True,
                        )
                        time.sleep(0.025)
                    subprocess.run(["xdotool", "mouseup", "1"], check=True)
                    time.sleep(0.4)
                    r["swipeState"] = ev(
                        name, "return JSON.parse(localStorage.getItem('gameState'));"
                    )
                    r["keyboardChangesGame"] = r["initialState"] != r["keyboardState"]
                    r["swipeChangesGame"] = r["keyboardState"] != r["swipeState"]
                    (ROOT / "logs/legacy-game-state.json").write_text(json.dumps(r["swipeState"]))
                r["layout"] = ev(
                    name,
                    "const b=document.querySelector('.game-container').getBoundingClientRect();return {width:innerWidth,board:{left:b.left,right:b.right,width:b.width},fits:b.left>=0&&b.right<=innerWidth};",
                )
            elif name == "legacy-calculator-2":
                for key in ["C", "1", "2", "+", "3", "="]:
                    tap(name, 'input[value="' + key + '"]')
                r["display"] = ev(
                    name, "return document.querySelector('#display div').textContent;"
                )
                r["twelvePlusThree"] = r["display"].strip() == "15"
            else:
                wait(name, "return !!document.querySelector('a[href=\"#/podcast/new\"]');")
                r["uiReady"] = True
                r["text"] = ev(name, "return document.body.innerText;")
                r["legacyXhr"] = ev(
                    name,
                    "const x=new XMLHttpRequest({mozSystem:true});x.open('GET','/');x.responseType='moz-chunked-arraybuffer';return {mozSystem:typeof x.mozSystem,chunkedType:x.responseType};",
                )
                tap(name, 'a[href="#/podcast/new"]')
                wait(name, "return !!document.querySelector('input');")
                r["addForm"] = ev(
                    name,
                    "return {text:document.body.innerText,inputs:[...document.querySelectorAll('input')].map(e=>({type:e.type,placeholder:e.placeholder})),buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,type:e.type}))};",
                )
                if not args.restart_check:
                    ev(
                        name,
                        "window.__archiveRequests=[];const original=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...args){const item={method,url:String(url)};window.__archiveRequests.push(item);this.addEventListener('loadend',()=>{item.status=this.status;item.finished=true;});return original.call(this,method,url,...args);};return true;",
                    )
                    tap(name, "input")
                    subprocess.run(
                        [
                            "xdotool",
                            "key",
                            "ctrl+a",
                            "type",
                            "--clearmodifiers",
                            "--delay",
                            "15",
                            "https://atp.fm/episodes?format=rss",
                        ],
                        check=True,
                    )
                    tap(name, "button")
                    try:
                        wait(name, "return window.__archiveRequests.some(r=>r.finished);", 20)
                    except RuntimeError:
                        r["requestTimedOut"] = True
                    r["feedRequests"] = ev(name, "return window.__archiveRequests;")
                    r["afterAdd"] = ev(name, "return document.body.innerText;")
                else:
                    r["afterRestart"] = ev(name, "return document.body.innerText;")
            shot(name)
        except Exception as e:
            r["failure"] = str(e)
            try:
                shot(name)
            except Exception:
                pass
        r["diagnostics"] = ev(name, "return window.__vulpesDiagnostics || [];")
        r["engineConsole"] = client.execute(
            "return Services.console.getMessageArray().map(e=>e.message).filter(m=>m.includes("
            + json.dumps(name)
            + ")).slice(-20);"
        )
        print(name, json.dumps(r, ensure_ascii=False), flush=True)
    (
        ROOT
        / "logs"
        / ("legacy-apps-restart-results.json" if args.restart_check else "legacy-apps-results.json")
    ).write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
