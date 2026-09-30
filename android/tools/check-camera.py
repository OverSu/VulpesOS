#!/usr/bin/env python3
"""Exercise Gaia Photo/Gallery on an Android emulator with its virtual sensor."""

import importlib.util
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("probe", Path(__file__).with_name("probe-android.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
ADB = str(ROOT / "android/toolchain/sdk/platform-tools/adb")


def adb(*args):
    return subprocess.check_output([ADB, "-s", "emulator-5554", *args], text=True).strip()


assert (
    adb("shell", "getprop", "ro.kernel.qemu") == "1"
), "Use a virtual sensor, not a personal camera."


def ev(app, code):
    reply = probe.run(app, code)
    if "error" in reply:
        raise AssertionError(reply)
    return reply.get("value")


def wait(app, code):
    for _ in range(60):
        value = ev(app, code)
        if value:
            return value
        time.sleep(0.3)
    raise TimeoutError(app + ": " + code)


def launch(app):
    ev(
        "system",
        'VulpesCompat.call("apps.launch",{manifestURL:"http://'
        + app
        + '.localhost:18765/manifest.webapp"})',
    )
    wait(app, 'document.readyState==="complete" && !document.hidden')


result = {"scope": "Android 16 x86_64 emulator, virtual camera; physical phones untested."}
wait("system", 'document.body?.getAttribute("ready-state")==="fullyLoaded"')
ev("system", "(ScreenManager.turnScreenOn(true),true)")
time.sleep(.5)
ev("system", "(lockScreen.unlock(true),true)")
wait("system", "!lockScreen.locked")
time.sleep(.5)
launch("camera")
wait(
    "camera",
    '!!app.loaded && !!app.camera.mozCamera && !app.camera.isBusy && !!document.querySelector(".viewfinder video")?.videoWidth',
)
result["preview"] = ev(
    "camera",
    '(()=>{const v=document.querySelector(".viewfinder video");return {width:v.videoWidth,height:v.videoHeight,cameras:navigator.mozCameras.getListOfCameras()}})()',
)
result["original_gaia_ui"] = ev(
    "camera",
    '!!document.querySelector(".js-capture") && !document.querySelector(".vulpes-capability")',
)
assert result["original_gaia_ui"]
ev(
    "camera",
    '(async()=>{window.__beforeCapture=(await VulpesCompat.call("media.request",{type:"pictures",operation:"enumerate"})).map(f=>f.name);window.__streamBefore=app.camera.mozCamera;return true})()',
)
point = ev(
    "camera",
    '(()=>{const r=document.querySelector(".js-capture").getBoundingClientRect();return {x:(mozInnerScreenX+r.x+r.width/2)*devicePixelRatio,y:(mozInnerScreenY+r.y+r.height/2)*devicePixelRatio}})()',
)
adb("shell", "input", "tap", str(round(point["x"])), str(round(point["y"])))
photo = wait(
    "camera",
    '(async()=>(await VulpesCompat.call("media.request",{type:"pictures",operation:"enumerate"})).find(f=>!__beforeCapture.includes(f.name)))()',
)
assert photo["size"] > 0 and photo["type"] == "image/jpeg"
result["photo"] = photo
launch("gallery")
result["camera_stops_when_hidden"] = wait(
    "camera", '__streamBefore.getTracks().every(t=>t.readyState==="ended")'
)
name = json.dumps(photo["name"])
result["gallery_indexes_photo"] = wait(
    "gallery",
    'typeof files!=="undefined" && files.some(f=>f.name==='
    + name
    + " && f.metadata.width>0 && f.metadata.thumbnail)",
)
ev(
    "gallery",
    '(()=>{const e=[...document.querySelectorAll(".thumbnailImage")].find(e=>e.dataset.filename==='
    + name
    + ");e.click();return true})()",
)
result["gallery_opens_photo"] = wait(
    "gallery", 'document.body.classList.contains("fullscreenView")'
)
result["gallery_import_button"] = ev(
    "gallery", '!!document.querySelector("gaia-header [data-vulpes-import]") && !document.querySelector(".vulpes-import")'
)
assert result["gallery_import_button"]
ev("gallery", "(launchCameraApp(),true)")
wait("camera", "!document.hidden")
result["camera_resumes"] = wait(
    "camera",
    '!!app.camera.mozCamera && app.camera.mozCamera!==__streamBefore && app.camera.mozCamera.getVideoTracks().every(t=>t.readyState==="live") && !app.camera.isBusy',
)
ev("camera", "(window.__streamBefore=app.camera.mozCamera,true)")
adb("shell", "input", "keyevent", "KEYCODE_HOME")
result["camera_stops_in_android_background"] = wait(
    "camera", '__streamBefore.getTracks().every(t=>t.readyState==="ended")'
)
adb("shell", "am", "start", "-n", "org.vulpes_os.preview/.MainActivity")
result["camera_resumes_from_android_background"] = wait(
    "camera",
    '!document.hidden && !!app.camera.mozCamera && app.camera.mozCamera!==__streamBefore && app.camera.mozCamera.getVideoTracks().every(t=>t.readyState==="live") && !app.camera.isBusy',
)
result["unavailable_controls"] = ev(
    "camera",
    '[".js-flash",".mode-switch"].every(s=>document.querySelector(s).getAttribute("aria-disabled")==="true")',
)
assert result["unavailable_controls"]
result["errors"] = ev(
    "camera", '__vulpesDiagnostics.filter(d=>d.kind==="error" || d.kind==="rejection")'
)
assert not result["errors"], result
launch("gallery")
(ROOT / "android/logs/camera-results.json").write_text(
    json.dumps(result, indent=2, ensure_ascii=False) + "\n"
)
print(json.dumps(result, indent=2, ensure_ascii=False))
