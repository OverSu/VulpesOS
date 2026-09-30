#!/usr/bin/env python3
"""Media, alarms and visual regressions in genuine Gaia user applications."""

import argparse
import base64
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
alarm_label = "Vulpes UI regression " + str(time.time_ns())
# A fresh filename avoids an earlier asynchronous MediaDB deletion being
# mistaken for this import. Keep the name for the restart assertions.
fixture_path = ROOT / "logs/apps-media-fixture.json"
media_fixture = (
    json.loads(fixture_path.read_text())
    if args.restart_check
    else "vulpes-regression-" + str(time.time_ns()) + ".png"
)
if not args.restart_check:
    fixture_path.write_text(json.dumps(media_fixture))
with Client(2857) as client:
    engine = client.execute("return Services.appinfo.platformVersion;")
    assert (
        client.execute("return PathUtils.profileDir;").split("/")[-1].startswith("host-")
    ), "Test profile required"
    client.execute(
        "try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}"
    )

    def ev(app, code, path="/"):
        code = code.replace("vulpes-regression.png", media_fixture)
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
        if app == "clock":
            wait(app, "return performance.getEntriesByName('fullyLoaded').length>0;")
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
        focus()
        pos = ev(
            app,
            "const e="
            + selector
            + ';e.scrollIntoView({block:"nearest"});await new Promise(r=>setTimeout(r,150));const b=e.getBoundingClientRect();return {x:mozInnerScreenX+b.x+b.width/2,y:mozInnerScreenY+b.y+b.height/2};',
            path,
        )
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        time.sleep(0.4)

    def shot(name):
        data = client.call("WebDriver:ExecuteAsyncScript", {
            "script": """const done=arguments[arguments.length-1];
const w=Services.wm.getMostRecentWindow('vulpes:host'),b=w.document.getElementById('system');
b.browsingContext.currentWindowGlobal.drawSnapshot(new DOMRect(0,0,b.clientWidth,b.clientHeight),1,'white').then(bitmap=>{
const canvas=w.document.createElementNS('http://www.w3.org/1999/xhtml','canvas');
canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);
done(canvas.toDataURL());}).catch(e=>done({error:String(e)}));""",
            "args": [], "newSandbox": True, "sandbox": "system", "scriptTimeout": 25000
        })["value"]
        if isinstance(data, str) and data.startswith("data:image/"):
            (ROOT / "logs" / ("feedback-" + name + ".png")).write_bytes(base64.b64decode(data.split(",",1)[1]))
        else:
            print("Screenshot unavailable:", data, flush=True)

    try:
        wait("system", "return document.body?.getAttribute('ready-state')==='fullyLoaded';")
        ev("system", "ScreenManager.turnScreenOn(true);return true;")
        time.sleep(.5)
        ev("system", "lockScreen.unlock(true);return true;")
        time.sleep(.5)
        wait("system", "return !document.getElementById('screen').classList.contains('locked');")
        launch("gallery")
        if args.restart_check:
            check(
                "photo-survives-restart",
                ev(
                    "gallery",
                    "const f=await navigator.getDeviceStorage('pictures').get('vulpes-regression.png');return f.size>0 && f.type==='image/png';",
                ),
            )
            check(
                "gallery-index-survives-restart",
                wait("gallery", "return !!document.querySelector('.thumbnail');"),
            )
            launch("clock")
            check(
                "alarm-survives-restart",
                ev(
                    "clock",
                    "return (await navigator.mozAlarms.getAll()).some(a=>a.data?.vulpesRegression==='persistence');",
                ),
            )
            raise SystemExit(0)
        check(
            "photo-import",
            ev(
                "gallery",
                """const c=document.createElement('canvas');c.width=128;c.height=96;const x=c.getContext('2d');x.fillStyle='#1686ae';x.fillRect(0,0,128,96);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const s=navigator.getDeviceStorage('pictures');await s.delete('vulpes-regression.png');for(let n=0;n<100 && [...document.querySelectorAll('.thumbnailImage')].some(i=>i.dataset.filename==='/sdcard/vulpes-regression.png');n++)await new Promise(r=>setTimeout(r,50));await s.addNamed(blob,'vulpes-regression.png');const f=await s.get('vulpes-regression.png');return f.size===blob.size && f.type==='image/png' && Object.prototype.toString.call(f.lastModifiedDate)==='[object Date]';""",
            ),
        )
        check(
            "gallery-thumbnail",
            wait(
                "gallery",
                "return [...document.querySelectorAll('.thumbnailImage')].some(i=>i.dataset.filename==='/sdcard/vulpes-regression.png');",
            ),
        )
        time.sleep(0.6)
        tap(
            "gallery",
            "[...document.querySelectorAll('.thumbnailImage')].find(i=>i.dataset.filename==='/sdcard/vulpes-regression.png').closest('.thumbnail')",
        )
        check(
            "gallery-open-photo",
            wait("gallery", "return document.body.classList.contains('fullscreenView');"),
        )
        shot("gallery-open")
        check(
            "media-path-traversal-denied",
            ev(
                "gallery",
                "try{await navigator.getDeviceStorage('pictures').get('../vulpes-settings-v1.json');return false;}catch(e){return e.name==='SecurityError';}",
            ),
        )
        check(
            "media-permissions-enforced",
            ev(
                "homescreen",
                "try{await VulpesCompat.call('media.request',{type:'pictures',operation:'get',name:'vulpes-regression.png'});return false;}catch(e){return e.name==='PERMISSION_DENIED';}",
            ),
        )
        launch("music")
        check(
            "music-import",
            ev(
                "music",
                "const s=navigator.getDeviceStorage('music');await s.delete('Vulpes-test.opus');const r=await fetch('http://clock.localhost:8765/shared/resources/media/alarms/ac_awake.opus');if(!r.ok)return false;await s.addNamed(await r.blob(),'Vulpes-test.opus');return true;",
            ),
        )
        tap("music", "document.querySelector('button[value=\"songs\"]')")
        time.sleep(0.5)
        if not ev("music", "return location.hash==='#/songs';"):
            tap("music", "document.querySelector('button[value=\"songs\"]')")
        check(
            "music-songs-tab",
            wait(
                "music",
                "return [...document.querySelectorAll('iframe')].some(f=>f.src.includes('/songs/'));",
            ),
        )
        check(
            "music-song-indexed",
            wait(
                "music",
                "return [...document.querySelectorAll('iframe')].some(f=>f.src.includes('/songs/') && f.contentDocument?.body?.innerText.includes('Vulpes-test'));",
            ),
        )
        check(
            "music-toolbar-styled",
            ev(
                "music",
                "const b=document.querySelector('button[value=songs]');return b.getBoundingClientRect().width>=80 && getComputedStyle(b).backgroundColor==='rgba(0, 0, 0, 0)';",
            ),
        )
        shot("music-songs")
        tap("music", "document.querySelector('.gfl-item')", "/views/songs/")
        check(
            "music-plays-audio",
            wait(
                "music",
                "const a=document.querySelector('audio');return !a.paused && a.currentTime>0;",
            ),
        )
        ev("music", "document.querySelector('audio').pause();return true;")
        launch("clock")
        tap("clock", "document.querySelector('#alarm-new')")
        check(
            "alarm-editor-opens",
            wait(
                "clock",
                "return location.hash==='#alarm-edit-panel' && !!document.querySelector('#alarm-name');",
            ),
        )
        ev(
            "clock",
            "document.querySelector('#alarm-name').value="
            + json.dumps(alarm_label)
            + ";return true;",
        )
        tap("clock", "document.querySelector('#alarm-done')")
        check(
            "alarm-saved-through-ui",
            wait(
                "clock",
                "const db=require('alarm_database');const alarm=(await db.getAll()).find(a=>a.label==="
                + json.dumps(alarm_label)
                + ");return !!alarm?.registeredAlarms.normal && document.body.innerText.includes("
                + json.dumps(alarm_label)
                + ");",
            ),
        )
        check(
            "alarm-delivery",
            ev(
                "clock",
                """const list=await navigator.mozAlarms.getAll();const saved=(await require('alarm_database').getAll()).find(a=>a.label===ALARM_LABEL);const alarm=list.find(a=>a.data?.id===saved?.id && a.data?.type==='normal');if(!alarm)return false;await navigator.mozAlarms.add(new Date(Date.now()+700),'honorTimezone',alarm.data);return true;""".replace(
                    "ALARM_LABEL", json.dumps(alarm_label)
                ),
            ),
        )
        check(
            "alarm-ring-view",
            wait(
                "clock",
                "return !!document.querySelector('iframe[data-vulpes-attention]')?.contentDocument?.querySelector('#ring-button-stop');",
            ),
        )
        shot("alarm-ring")
        check(
            "alarm-plays-audio",
            wait(
                "clock",
                "const w=document.querySelector('iframe[data-vulpes-attention]')?.contentWindow;return w?.ringView?.ringtonePlayer?._audio?.paused===false;",
            ),
        )
        tap("clock", "document.querySelector('#ring-button-stop')", "/onring.html")
        check(
            "alarm-stop-button",
            wait("clock", "return !document.querySelector('iframe[data-vulpes-attention]');"),
        )
        check(
            "alarm-no-uncaught-errors",
            ev(
                "clock",
                "return !window.__vulpesDiagnostics.some(d=>d.kind==='error'||d.kind==='rejection');",
            ),
        )
        check(
            "alarm-persistence-scheduled",
            ev(
                "clock",
                "await navigator.mozAlarms.add(new Date(Date.now()+86400000),'honorTimezone',{vulpesRegression:'persistence'});return true;",
            ),
        )
        launch("settings")
        check(
            "settings-switch-type-size",
            ev(
                "settings",
                "return [...document.querySelectorAll('#root gaia-switch label')].filter(e=>e.getBoundingClientRect().height).every(e=>parseFloat(getComputedStyle(e).fontSize)>=19);",
            ),
        )
        shot("settings-switches")
        launch("email")
        check(
            "email-field-appearance",
            wait(
                "email",
                "const e=document.querySelector('input[type=email]');return e && getComputedStyle(e).appearance==='none';",
            ),
        )
        for app in ["costcontrol", "fm"]:
            launch(app)
            check(
                app + "-desktop-capability",
                ev(
                    app,
                    "return !document.querySelector('.vulpes-capability') && document.body.innerText.length>0 && !window.__vulpesDiagnostics.some(d=>d.kind==='error'||d.kind==='rejection');",
                ),
            )
        focus()
        subprocess.run(["xdotool", "mousemove", "240", "820", "mousedown", "1"], check=True)
        time.sleep(0.85)
        subprocess.run(["xdotool", "mouseup", "1"], check=True)
        check(
            "long-home-task-manager",
            wait(
                "system",
                "return document.querySelector('#screen').classList.contains('cards-view');",
            ),
        )
        shot("task-manager")
        before = ev(
            "system", "return [...document.querySelectorAll('.appWindow iframe')].map(f=>f.src);"
        )
        tap(
            "system",
            "[...document.querySelectorAll('.close-button')].find(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<480;})",
        )
        check(
            "task-manager-closes-app",
            wait(
                "system",
                "const before="
                + json.dumps(before)
                + ";const after=[...document.querySelectorAll('.appWindow iframe')].map(f=>f.src);return before.some(url=>!after.includes(url));",
            ),
        )
        ev("system", "dispatchEvent(new CustomEvent('home'));return true;")
        time.sleep(0.5)
        check(
            "home-transparent-chrome",
            ev(
                "system",
                "return getComputedStyle(document.querySelector('#homescreen > .chrome')).backgroundColor==='rgba(0, 0, 0, 0)';",
            ),
        )
        check(
            "browser-localized-name",
            ev(
                "system",
                "const a=(await navigator.mozApps.mgmt.getAll()).find(a=>a.origin.includes('search.localhost'));return a.manifest.locales.fr.name==='Navigateur' && Object.values(a.manifest.icons).every(i=>i.includes('vulpes-browser.png'));",
            ),
        )
        shot("home-transparent")
    except Exception:
        shot("apps-failure")
        print(
            "FAILURE CLOCK",
            json.dumps(
                ev(
                    "clock",
                    "return {body:document.body.innerText,hash:location.hash,errors:window.__vulpesDiagnostics,button:document.querySelector('#alarm-new')?.getBoundingClientRect().toJSON()};",
                )
            ),
            flush=True,
        )
        raise
    finally:
        (
            ROOT
            / "logs"
            / ("apps-restart-results.json" if args.restart_check else "apps-results.json")
        ).write_text(json.dumps(results, indent=2) + "\n")
