#!/usr/bin/env python3
"""Integration checks in real Gaia and isolated native Gecko views.

Run alongside `run-host.py --test`, preferably on a dedicated Xvfb display.
Only this test profile is used. No tests are injected by the normal launcher.
"""
import argparse
import http.client
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--restart-check", action="store_true")
parser.add_argument("--candidate", action="store_true")
args = parser.parse_args()


class Page(BaseHTTPRequestHandler):
    def do_GET(self):
        page = (
            f'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vulpes test {self.path}</title><h1>Real Gecko navigation</h1>'
            '<input id="text" autofocus><a href="/two">Next page</a>'
            '<div style="height:2000px">Scroll test</div>'
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Length", str(len(page)))
        self.end_headers()
        self.wfile.write(page)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Page)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}"
checks = {}


def expect(name, value):
    checks[name] = value
    print(name + ": " + json.dumps(value, ensure_ascii=False), flush=True)
    if value is not True:
        raise AssertionError(name + ": " + repr(value))


try:
    with Client(2857) as client:
        client.execute(
            """try {ChromeUtils.registerWindowActor('VulpesProbe', {
          child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},
          allFrames:true,safeForUntrustedWebProcess:true});} catch (_) {}"""
        )

        def evaluate(app, code):
            # Test actor evaluates under the document's content principal.
            # `web` selects the isolated native view; all others select Gaia.
            selector = """const shell=Services.wm.getMostRecentWindow('vulpes:host');
if(!shell?.document.getElementById('system')){done({missing:true});return;}
const browsers=[...shell.document.querySelectorAll('browser')];
let bc;
if (APP === 'web') bc=browsers.find(b=>b.id !== 'system')?.browsingContext;
else bc=(function find(b){
  if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://'+APP+'.localhost:8765/'))return b;
  for(const c of b.children){const result=find(c);if(result)return result;}return null;
})(shell.document.getElementById('system').browsingContext);
if(!bc) {done({missing:true});return;}
bc.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate', CODE)
  .then(value=>done({result:value}),error=>done({error:String(error),stack:error.stack}));
""".replace(
                "APP", json.dumps(app)
            ).replace(
                "CODE", json.dumps(code)
            )
            response = client.call(
                "WebDriver:ExecuteAsyncScript",
                {
                    "script": "const done=arguments[arguments.length-1];" + selector,
                    "args": [],
                    "newSandbox": True,
                    "sandbox": "system",
                    "scriptTimeout": 15000,
                },
            )["value"]
            if response.get("missing"):
                return None
            if "error" in response:
                raise AssertionError(response)
            return response.get("result")

        def wait(app, code, timeout=15):
            last = None
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    last = evaluate(app, code)
                except AssertionError as error:
                    # Navigation can replace the document while its read-only probe is pending.
                    detail = error.args[0] if error.args else None
                    if not isinstance(detail, dict) or not detail.get("error", "").startswith(
                        "AbortError: Actor 'VulpesProbe' destroyed before query"
                    ):
                        raise
                    last = None
                if last:
                    return last
                time.sleep(0.15)
            raise AssertionError(f"Timeout {app}: {last}")

        expect(
            "engine-pinned",
            client.execute("return Services.appinfo.platformVersion;")
            == json.loads(
                (
                    ROOT / ("candidate-engine.json" if args.candidate else "engine-lock.json")
                ).read_text()
            )["version"],
        )
        expect(
            "sandbox-and-fission",
            client.execute(
                "return Services.prefs.getIntPref('security.sandbox.content.level')>=6 && Services.appinfo.fissionAutostart;"
            ),
        )
        expect(
            "real-gaia-boot",
            wait(
                "system",
                "return document.body?.getAttribute('ready-state')==='fullyLoaded';",
                timeout=60,
            ),
        )
        # New profiles now start on the original Gaia lockscreen. Home's
        # lazy icon images load only after the screen becomes visible.
        evaluate("system", "ScreenManager.turnScreenOn(true);return true;")
        time.sleep(.5)
        evaluate("system", "lockScreen.unlock(true);return true;")
        wait("system", "return !lockScreen.locked;")
        expect(
            "home-icons",
            wait(
                "homescreen",
                "const icons=[...document.querySelectorAll('gaia-app-icon')];"
                "return icons.length>10 && icons.slice(0,6).every(icon=>{"
                "const image=icon.shadowRoot?.querySelector('img');"
                "return image?.complete && image.naturalWidth>0;});",
            ),
        )
        expect(
            "screen-brightness-restored",
            client.execute(
                "return Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('screen').style.filter==='brightness(1)';"
            ),
        )
        if args.restart_check:
            expect(
                "settings-survive-restart",
                evaluate(
                    "system",
                    "const r=await navigator.vulpesRequest({version:1,id:1,method:'settings.get',params:{key:'vulpes.integration.persist'}});return r.result.value==='survives-restart';",
                ),
            )
            expect(
                "blob-survives-restart",
                evaluate(
                    "homescreen",
                    "const s=(await navigator.getDataStores('icons'))[0];const v=await s.get('vulpes-integration');return await v.icon.text()==='Vulpes integration';",
                ),
            )
            raise SystemExit(0)
        expect(
            "localized-app-manifest",
            evaluate(
                "homescreen",
                "const i=[...document.querySelectorAll('gaia-app-icon')].find(e=>e.app?.origin.includes('settings.'));return await i.app.getLocalizedValue('name','fr')==='Paramètres';",
            ),
        )
        expect(
            "app-inline-script-blocked",
            evaluate(
                "homescreen",
                """window.__injectedScriptRan=false;const s=document.createElement('script');s.textContent='window.__injectedScriptRan=true';document.head.append(s);s.remove();await new Promise(r=>setTimeout(r,100));return window.__injectedScriptRan===false;""",
            ),
        )
        expect(
            "forged-settings-permission-denied",
            evaluate(
                "homescreen",
                """const r=await navigator.vulpesRequest({version:1,id:1,method:'settings.set',identity:'system',permissions:['settings.write'],params:{values:{'vulpes.test.denied':true}}});return r.error?.code==='PERMISSION_DENIED';""",
            ),
        )
        expect(
            "read-only-datastore-denied",
            evaluate(
                "homescreen",
                "const s=(await navigator.getDataStores('bookmarks_store'))[0];try{await s.put({},'vulpes-test');return false;}catch(e){return e.name==='DATASTORE_READ_ONLY';}",
            ),
        )
        expect(
            "datastore-blob-roundtrip",
            evaluate(
                "homescreen",
                """const s=(await navigator.getDataStores('icons'))[0];await s.put({icon:new Blob(['Vulpes integration'])},'vulpes-integration');const v=await s.get('vulpes-integration');return v.icon instanceof Blob && await v.icon.text()==='Vulpes integration';""",
            ),
        )

        # Start from a settled, unlocked Home even after other app suites.
        evaluate("system", "lockScreen.unlock(true);ScreenManager.turnScreenOn(true);return true;")
        time.sleep(1)
        client.execute("Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();return true;")
        wait("system", "return !!document.querySelector('.homescreen.active[transition-state=opened]');")
        time.sleep(.5)
        client.execute("const w=Services.wm.getMostRecentWindow('vulpes:host');w.focus();w.document.getElementById('system').focus();return true;")
        # Trusted X11 input verifies mouse-to-touch, not dispatched DOM events.
        evaluate(
            "homescreen",
            "window.__touchCount=0;addEventListener('touchstart',()=>window.__touchCount++);return true;",
        )
        subprocess.run(
            ["xdotool", "search", "--name", "^Vulpes", "windowraise", "windowfocus"],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        subprocess.run(
            [
                "xdotool",
                "mousemove",
                "245",
                "630",
                "mousedown",
                "1",
                "mousemove",
                "245",
                "530",
                "mousemove",
                "245",
                "430",
                "mouseup",
                "1",
            ],
            check=True,
        )
        expect(
            "trusted-touch-drag",
            wait(
                "homescreen",
                "return window.__touchCount>0 && document.querySelector('#apps-panel > .scrollable').scrollTop>0;",
            ),
        )
        # Position the real Settings icon, then physically tap it.
        pos = evaluate(
            "homescreen",
            """const e=[...document.querySelectorAll('gaia-app-icon')].find(e=>e.app?.origin.includes('settings.'));e.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,150));const b=e.getBoundingClientRect();return {x:mozInnerScreenX+b.x+b.width/2,y:mozInnerScreenY+b.y+b.height/2};""",
        )
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        expect(
            "settings-physical-tap",
            wait("settings", "return document.body?.textContent.includes('Paramètres');"),
        )
        expect(
            "version-visible-setting",
            evaluate(
                "settings",
                "const caps=await VulpesCompat.call('platform.capabilities',{});return await new Promise((resolve,reject)=>{const r=navigator.mozSettings.createLock().get('deviceinfo.os');r.onsuccess=()=>resolve(r.result['deviceinfo.os']===caps.gaia);r.onerror=()=>reject(r.error);});",
            ),
        )
        expect(
            "settings-persist-write",
            evaluate(
                "settings",
                "return await new Promise((resolve,reject)=>{const r=navigator.mozSettings.createLock().set({'vulpes.integration.persist':'survives-restart'});r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);});",
            ),
        )

        evaluate(
            "system",
            "dispatchEvent(new CustomEvent('activity-view',{detail:{source:{data:{type:'url',url:"
            + json.dumps(url + "/one")
            + "}}}}));return true;",
        )
        expect(
            "csp-protected-page-native-view",
            wait(
                "web",
                "return document.readyState==='complete' && document.title==='Vulpes test /one' && window.top===window;",
            ),
        )
        evaluate(
            "system", "document.querySelector('#tracking-notice-confirm')?.click();return true;"
        )
        expect(
            "website-no-privileged-api",
            evaluate(
                "web",
                "return typeof navigator.vulpesRequest==='undefined' && typeof navigator.mozApps==='undefined';",
            ),
        )
        for _ in range(60):
            visible = client.execute(
                "return [...Services.wm.getMostRecentWindow('vulpes:host').document.querySelectorAll('browser')].some(b=>b.id!=='system' && b.style.visibility==='visible');"
            )
            if visible:
                break
            time.sleep(0.15)
        expect("native-view-visible", visible)
        # Use a real user navigation. Script redirects before user interaction
        # can replace/skip an entry under current Gecko history heuristics.
        pos = evaluate(
            "web",
            "const r=document.querySelector('a').getBoundingClientRect();return {x:mozInnerScreenX+r.x+r.width/2,y:mozInnerScreenY+r.y+r.height/2};",
        )
        client.execute("Services.wm.getMostRecentWindow('vulpes:host').focus();return true;")
        subprocess.run(
            ["xdotool", "mousemove", str(round(pos["x"])), str(round(pos["y"])), "click", "1"],
            check=True,
        )
        expect(
            "native-navigation",
            wait(
                "web",
                "return document.readyState==='complete' && document.title==='Vulpes test /two';",
            ),
        )
        for _ in range(80):
            back_ready = client.execute(
                "return [...Services.wm.getMostRecentWindow('vulpes:host').document.querySelectorAll('browser')].some(b=>b.id!=='system' && b.canGoBack);"
            )
            if back_ready:
                break
            time.sleep(0.1)
        expect("native-history-ready", back_ready)
        client.execute(
            "const {Views}=ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs');for(const [id,e] of Views.entries)Views.request(e.actor,{contextId:id,operation:'back'});return true;"
        )
        expect("native-history-back", wait("web", "return document.title==='Vulpes test /one';"))
        expect(
            "native-screenshot-blob",
            evaluate(
                "system",
                """const f=[...document.querySelectorAll('iframe')].find(f=>f.src.startsWith('http://127.0.0.1:'));return await new Promise((resolve,reject)=>{const r=f.getScreenshot();r.onsuccess=()=>resolve(r.result instanceof Blob && r.result.size>100);r.onerror=()=>reject(r.error);});""",
            ),
        )
        # Physical keyboard typing in the isolated real page.
        pos = evaluate(
            "web",
            "const e=document.querySelector('input');e.scrollIntoView();const r=e.getBoundingClientRect();return {x:mozInnerScreenX+r.x+r.width/2,y:mozInnerScreenY+r.y+r.height/2};",
        )
        subprocess.run(
            [
                "xdotool",
                "mousemove",
                str(round(pos["x"])),
                str(round(pos["y"])),
                "click",
                "1",
                "type",
                "--clearmodifiers",
                "Vulpes",
            ],
            check=True,
        )
        expect(
            "native-keyboard-input",
            wait("web", "return document.querySelector('input').value==='Vulpes';"),
        )
        client.execute(
            "Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('home').click();return true;"
        )
        for _ in range(60):
            hidden = client.execute(
                "return [...Services.wm.getMostRecentWindow('vulpes:host').document.querySelectorAll('browser')].filter(b=>b.id!=='system').every(b=>b.style.visibility==='hidden');"
            )
            if hidden:
                break
            time.sleep(0.15)
        expect("home-hides-native-view", hidden)
        expect(
            "home-remains-usable",
            evaluate("homescreen", "return document.querySelectorAll('gaia-app-icon').length>10;"),
        )
        evaluate(
            "web",
            "location.href='http://settings.localhost:8765/vulpes-not-a-page.html';return true;",
        )
        wait(
            "web",
            "return location.hostname==='settings.localhost' && document.readyState==='complete' && typeof navigator.vulpesRequest==='function';",
        )
        expect(
            "gaia-origin-in-web-view-denied",
            evaluate(
                "web",
                "const r=await navigator.vulpesRequest({version:1,id:1,method:'settings.get',params:{key:'deviceinfo.os'}});return r.error?.code==='PERMISSION_DENIED';",
            ),
        )
        view_ids = client.execute(
            "return [...ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs').Views.entries.keys()];"
        )
        expect(
            "owner-frame-removed",
            evaluate(
                "system",
                "let count=0;for(const id of "
                + json.dumps(view_ids)
                + "){const f=navigator.vulpesFrameForContext(id);if(f){f.remove();count++;}}return count==="
                + str(len(view_ids))
                + ";",
            ),
        )
        for _ in range(40):
            removed = client.execute(
                "return ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs').Views.entries.size===0;"
            )
            if removed:
                break
            time.sleep(0.1)
        expect("view-removed-with-owner", removed)
        for name, host, path, status in [
            ("http-host-allowlist", "evil.localhost:8765", "/", 421),
            ("http-traversal-denied", "system.localhost:8765", "/%2e%2e/host/Runtime.sys.mjs", 400),
            (
                "privileged-source-not-served",
                "system.localhost:8765",
                "/_vulpes/Runtime.sys.mjs",
                404,
            ),
        ]:
            connection = http.client.HTTPConnection("127.0.0.1", 8765)
            connection.request("GET", path, headers={"Host": host})
            response = connection.getresponse()
            expect(name, response.status == status)
            response.read()
            connection.close()
        checks["system-diagnostics"] = evaluate("system", "return window.__vulpesDiagnostics;")
        checks["settings-diagnostics"] = evaluate("settings", "return window.__vulpesDiagnostics;")
        expect(
            "settings-no-uncaught-errors",
            not any(e["kind"] in ["error", "rejection"] for e in checks["settings-diagnostics"]),
        )
finally:
    server.shutdown()
    (
        ROOT / "logs" / ("host-restart-results.json" if args.restart_check else "host-results.json")
    ).write_text(json.dumps(checks, ensure_ascii=False, indent=2) + "\n")
