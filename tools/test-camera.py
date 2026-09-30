#!/usr/bin/env python3
"""Exercise the original Gaia Camera and Gallery with a simulated desktop camera."""

import importlib.util
import json
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("probe", Path(__file__).with_name("probe-desktop.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
results = {}
with Client(2857) as c:
    probe.register(c)

    def ev(app, code):
        reply = probe.evaluate(c, app, code)
        if "error" in reply:
            raise AssertionError(reply)
        return reply.get("value")

    def wait(app, code):
        for _ in range(120):
            result = ev(app, code)
            if result:
                return result
            time.sleep(0.15)
        raise TimeoutError(app + ": " + code)

    def launch(app):
        ev(
            "system",
            'await VulpesCompat.call("apps.launch",{manifestURL:"http://'
            + app
            + '.localhost:8765/manifest.webapp"});return true;',
        )
        wait(app, 'return document.readyState==="complete" && !document.hidden;')

    wait("system", 'return document.body?.getAttribute("ready-state")==="fullyLoaded";')
    c.execute(
        'const w=Services.wm.getMostRecentWindow("vulpes:host");w.focus();w.document.getElementById("system").focus();return true;'
    )
    c.execute(
        'Services.prefs.setBoolPref("media.navigator.streams.fake",true);Services.prefs.setBoolPref("media.navigator.permission.fake",true);const p=Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI("http://camera.localhost:8765"),{});Services.perms.addFromPrincipal(p,"camera",Ci.nsIPermissionManager.ALLOW_ACTION);return true;'
    )
    try:
        ev("system", 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
        launch("camera")
        ev("camera", "setTimeout(()=>location.reload(),0);return true;")
        time.sleep(2)
        wait(
            "camera",
            'return !!window.app?.loaded && !!window.app?.camera?.mozCamera && !app.camera.isBusy && !!document.querySelector(".viewfinder video")?.videoWidth;',
        )
        results["original_gaia_ui"] = ev(
            "camera",
            'return !!window.app && !!document.querySelector(".js-capture") && !document.querySelector(".vulpes-capability");',
        )
        assert results["original_gaia_ui"]
        results["preview"] = ev(
            "camera",
            'const v=document.querySelector(".viewfinder video");return {width:v.videoWidth,height:v.videoHeight};',
        )
        results["unavailable_controls"] = ev(
            "camera",
            'return [".js-flash",".mode-switch"].every(s=>document.querySelector(s).getAttribute("aria-disabled")==="true");',
        )
        assert results["unavailable_controls"]
        ev(
            "camera",
            'window.__beforeCapture=(await VulpesCompat.call("media.request",{type:"pictures",operation:"enumerate"})).map(f=>f.name);window.__streamBefore=app.camera.mozCamera;document.querySelector(".js-flash").click();document.querySelector(".mode-switch .inner").click();return true;',
        )
        assert ev(
            "camera",
            'return app.camera.mode==="picture" && app.camera.mozCamera.flashMode==="off";',
        )
        # Native touch injection targets the camera frame even on high-DPI desktops.
        point = ev("camera", 'const r=document.querySelector(".js-capture").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};')
        script = """const done=arguments[arguments.length-1];
const root=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext;
function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://camera.localhost:8765/'))return b;for(const child of b.children){const result=find(child);if(result)return result;}}
find(root).currentWindowGlobal.getActor('VulpesProbe').sendQuery('Tap',POINT).then(()=>done(true),e=>done({error:String(e)}));""".replace('POINT',json.dumps(point))
        assert c.call('WebDriver:ExecuteAsyncScript',{'script':script,'args':[],
            'newSandbox':True,'sandbox':'system','scriptTimeout':10000})['value'] is True
        photo = wait(
            "camera",
            'return (await VulpesCompat.call("media.request",{type:"pictures",operation:"enumerate"})).find(f=>!window.__beforeCapture.includes(f.name));',
        )
        assert photo["type"] == "image/jpeg" and photo["size"] > 0, photo
        results["photo"] = photo
        launch("gallery")
        results["camera_stops_when_hidden"] = wait(
            "camera", 'return window.__streamBefore.getTracks().every(t=>t.readyState==="ended");'
        )
        photo_name = json.dumps(photo["name"])
        results["gallery_indexes_photo"] = wait(
            "gallery",
            'return typeof files!=="undefined" && files.some(f=>f.name==='
            + photo_name
            + " && f.metadata.width>0 && f.metadata.thumbnail);",
        )
        assert results["gallery_indexes_photo"]
        ev(
            "gallery",
            'const e=[...document.querySelectorAll(".thumbnailImage")].find(e=>e.dataset.filename==='
            + photo_name
            + ");e.click();return true;",
        )
        results["gallery_opens_photo"] = wait(
            "gallery", 'return document.body.classList.contains("fullscreenView");'
        )
        results["gallery_import_button"] = ev(
            "gallery", 'return !!document.querySelector("gaia-header [data-vulpes-import]") && !document.querySelector(".vulpes-import");'
        )
        assert results["gallery_import_button"]
        ev("gallery", "launchCameraApp();return true;")
        wait("camera", "return !document.hidden;")
        results["camera_resumes"] = wait(
            "camera",
            'return !!app.camera.mozCamera && app.camera.mozCamera!==window.__streamBefore && app.camera.mozCamera.getVideoTracks().every(t=>t.readyState==="live") && !app.camera.isBusy;',
        )
        results["camera_errors"] = ev(
            "camera",
            'return __vulpesDiagnostics.filter(d=>d.kind==="error" || d.kind==="rejection");',
        )
        assert not results["camera_errors"], results
        launch("gallery")
    finally:
        c.execute(
            'Services.prefs.clearUserPref("media.navigator.streams.fake");Services.prefs.clearUserPref("media.navigator.permission.fake");return true;'
        )
(ROOT / "logs/camera-desktop-results.json").write_text(
    json.dumps(results, indent=2, ensure_ascii=False) + "\n"
)
print(json.dumps(results, indent=2, ensure_ascii=False))
