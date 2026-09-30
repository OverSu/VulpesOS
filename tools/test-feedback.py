#!/usr/bin/env python3
"""Regression checks for the September desktop feedback, in actual Gaia UI."""
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
            + ';e.scrollIntoView({block:"nearest"});await new Promise(r=>setTimeout(r,150));const b=e.getBoundingClientRect();return {x:mozInnerScreenX+b.x+b.width/2,y:mozInnerScreenY+b.y+b.height/2};',
            path,
        )
        focus()
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        time.sleep(0.4)

    def shot(name):
        focus()
        subprocess.run(
            ["import", "-window", "root", str(ROOT / "logs" / ("feedback-" + name + ".png"))],
            check=True,
        )

    try:
        wait(
            "system",
            "return document.body?.getAttribute('ready-state')==='fullyLoaded' && !!document.querySelector('#statusbar-time');",
        )
        ev("system", "ScreenManager.turnScreenOn(true);return true;")
        time.sleep(.5)
        ev("system", "lockScreen.unlock(true);return true;")
        wait("system", "return !lockScreen.locked;")
        time.sleep(.5)
        if args.restart_check:
            launch("communications", "contacts")
            check(
                "contacts-survive-restart",
                ev(
                    "communications",
                    "const c=await navigator.mozContacts.find({filterBy:['name'],filterValue:'Vulpes Regression',filterOp:'equals'});return c.length===1 && c[0].tel[0].value==='0612345678' && Object.prototype.toString.call(c[0].updated)==='[object Date]' && Number.isFinite(c[0].updated.getTime());",
                    "/contacts/",
                ),
            )
            check(
                "passcode-survives-restart",
                ev(
                    "system",
                    "await LazyLoader.load('/shared/js/passcode_helper.js');return await PasscodeHelper.check('9876');",
                ),
            )
            raise SystemExit(0)
        check(
            "clock-at-right",
            ev(
                "system",
                "const b=document.querySelector('#statusbar-time').getBoundingClientRect();return b.right>innerWidth-15 && b.left>innerWidth/2;",
            ),
        )
        check(
            "status-tray-icons",
            ev(
                "system",
                "UtilityTray.show(true);await new Promise(r=>setTimeout(r,300));return [...document.querySelectorAll('#quick-settings a')].filter(e=>e.getBoundingClientRect().width>0 && e.getBoundingClientRect().top>0).length>=4;",
            ),
        )
        ev("system", "UtilityTray.hide(true);return true;")
        launch("communications", "dialer")
        tap("communications", "document.querySelector('[data-value=\"1\"]')", "/dialer/")
        tap("communications", "document.querySelector('[data-value=\"2\"]')", "/dialer/")
        check(
            "dialpad-physical-taps",
            ev("communications", "return KeypadManager._phoneNumber.endsWith('12');", "/dialer/"),
        )
        tap("communications", "document.getElementById('option-recents')", "/dialer/")
        check(
            "dialer-recents-tab",
            wait(
                "communications",
                "return document.body.innerText.includes('Journal d’appels');",
                "/dialer/",
            ),
        )
        tap("communications", "document.getElementById('option-contacts')", "/dialer/")
        check(
            "dialer-contacts-tab",
            wait(
                "communications",
                "return document.readyState==='complete' && document.body.innerText.includes('Contacts');",
                "/contacts/",
            ),
        )
        shot("contacts")
        check(
            "contact-store-roundtrip",
            ev(
                "communications",
                """const old=await navigator.mozContacts.find({filterBy:['name'],filterValue:'Vulpes Regression',filterOp:'equals'});for(const c of old)await navigator.mozContacts.remove(c);const c=new mozContact({name:['Vulpes Regression'],givenName:['Vulpes'],familyName:['Regression'],tel:[{value:'0612345678',type:['mobile']}]});await navigator.mozContacts.save(c);window.__testContactId=c.id;const list=await navigator.mozContacts.find({filterBy:['id'],filterValue:c.id,filterOp:'equals'});return list.length===1 && list[0].name[0]==='Vulpes Regression';""",
                "/contacts/",
            ),
        )
        check(
            "contact-list-updates",
            wait(
                "communications",
                "return document.body.innerText.includes('Regression');",
                "/contacts/",
            ),
        )
        check(
            "contacts-permission-isolation",
            ev(
                "homescreen",
                "const r=await navigator.vulpesRequest({version:1,id:500,method:'contacts.request',params:{operation:'all'}});return r.error?.code==='PERMISSION_DENIED';",
            ),
        )
        launch("sms")
        check(
            "sms-empty-view",
            wait("sms", "return document.body.innerText.includes('Aucun message');"),
        )
        shot("sms")
        tap("sms", "document.querySelector('#threads-composer-link')")
        check(
            "sms-composer-ready",
            wait(
                "sms",
                "return location.hash==='#/composer' && !!document.querySelector('#messages-input');",
            ),
        )
        tap("sms", "document.querySelector('#messages-input')")
        subprocess.run(["xdotool", "type", "--clearmodifiers", "Brouillon Vulpes"], check=True)
        check(
            "sms-composer-typing",
            wait(
                "sms",
                "return document.querySelector('#messages-input').textContent.includes('Brouillon Vulpes');",
            ),
        )
        check(
            "sms-no-fake-send",
            ev(
                "sms",
                "try{await navigator.mozMobileMessage.send('0612345678','test');return false;}catch(e){return e.name==='RadioDisabledError';}",
            ),
        )
        check(
            "sms-segment-count",
            ev(
                "sms",
                "const s=await navigator.mozMobileMessage.getSegmentInfoForText('a'.repeat(161));return s.segments===2 && s.charsPerSegment===153;",
            ),
        )
        launch("settings")
        ev(
            "settings",
            "await new Promise(r=>require(['modules/settings_service'],s=>{s.navigate('root');r();}));return true;",
        )
        wait("settings", "return !!document.querySelector('#root.current');")
        time.sleep(0.5)
        tap("settings", "document.querySelector('a[href=\"#about\"]')")
        wait("settings", "return !!document.querySelector('#about.current');")
        check(
            "back-arrow-visible",
            ev(
                "settings",
                "const h=document.querySelector('#about gaia-header'),b=h.shadowRoot.querySelector('button');return getComputedStyle(h).display==='block' && getComputedStyle(b,'::before').content==='\"left\"' && b.getBoundingClientRect().width===50;",
            ),
        )
        tap("settings", "document.querySelector('a[href=\"#about-moreInfo\"]')")
        check(
            "actual-versions-in-panel",
            wait(
                "settings",
                "return document.querySelector('#about-moreInfo.current') && document.body.innerText.includes("
                + json.dumps(engine)
                + ") && document.body.innerText.includes('2.7');",
            ),
        )
        shot("versions")
        check(
            "passcode-byte-roundtrip",
            ev(
                "system",
                "await LazyLoader.load('/shared/js/passcode_helper.js');await PasscodeHelper.set('9876');const yes=await PasscodeHelper.check('9876'),no=await PasscodeHelper.check('1111');return yes && !no;",
            ),
        )
        check(
            "iac-forged-route-denied",
            ev(
                "homescreen",
                "try{await VulpesCompat.call('iac.connect',{keyword:'search'});return false;}catch(e){return e.name==='CONNECTION_DENIED';}",
            ),
        )
        launch("search")
        check(
            "firefox-newtab-ready",
            wait(
                "search",
                "return document.readyState==='complete' && !!document.querySelector('#top-sites');",
                "/newtab.html",
            ),
        )
        tap("system", "document.querySelector('.appWindow.active .urlbar-hit-area')")
        wait("system", "return document.querySelector('#rocketbar').classList.contains('active');")
        tap("system", "document.querySelector('#rocketbar-input')")
        subprocess.run(
            [
                "xdotool",
                "key",
                "ctrl+a",
                "type",
                "--clearmodifiers",
                "--delay",
                "40",
                "https://example.com",
            ],
            check=True,
        )
        check(
            "rocketbar-physical-typing",
            ev(
                "system",
                "return document.querySelector('#rocketbar-input').value==='https://example.com';",
            ),
        )
        subprocess.run(["xdotool", "key", "Return"], check=True)
        check(
            "rocketbar-submit-creates-browser",
            wait(
                "system",
                "return [...document.querySelectorAll('iframe')].some(f=>f.src==='https://example.com/');",
            ),
        )
        time.sleep(1)
        shot("browser")
        client.execute(
            "Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();return true;"
        )
        time.sleep(0.7)
        check(
            "browser-return-home",
            client.execute(
                "return [...Services.wm.getMostRecentWindow('vulpes:host').document.querySelectorAll('browser')].filter(b=>b.id!=='system').every(b=>b.style.visibility==='hidden');"
            ),
        )
        check(
            "apps-fill-height",
            ev(
                "system",
                "return !document.querySelector('#screen').classList.contains('software-button-enabled');",
            ),
        )
        print(
            "APP DIAGNOSTICS",
            json.dumps(
                {
                    a: ev(a, "return window.__vulpesDiagnostics;")
                    for a in ["system", "communications", "sms", "settings", "search"]
                },
                ensure_ascii=False,
            ),
            flush=True,
        )
    finally:
        (
            ROOT
            / "logs"
            / ("feedback-restart-results.json" if args.restart_check else "feedback-results.json")
        ).write_text(json.dumps(results, indent=2) + "\n")
