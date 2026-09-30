#!/usr/bin/env python3
"""Reproduce first camera consent on the test emulator, without restarting afterward."""

import importlib.util
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADB = str(ROOT / "android/toolchain/sdk/platform-tools/adb")
spec = importlib.util.spec_from_file_location("probe", Path(__file__).with_name("probe-android.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def adb(*args):
    return subprocess.check_output([ADB, "-s", "emulator-5554", *args], text=True).strip()


assert adb("shell", "getprop", "ro.kernel.qemu") == "1"
adb("shell", "pm", "revoke", "org.vulpes_os.preview", "android.permission.CAMERA")
adb("shell", "am", "start", "-n", "org.vulpes_os.preview/.MainActivity")
adb("forward", "tcp:6088", "localabstract:org.vulpes_os.preview/firefox-debugger-socket")
for _ in range(60):
    if probe.run("system", 'document.body?.getAttribute("ready-state")==="fullyLoaded"').get(
        "value"
    ):
        break
    time.sleep(0.3)
else:
    raise TimeoutError("Gaia boot")
probe.run(
    "system",
    'VulpesCompat.call("apps.launch",{manifestURL:"http://camera.localhost:18765/manifest.webapp"})',
)
subprocess.run(
    ["python3", str(ROOT / "android/tools/ui-android.py"), "While using the app"],
    check=True,
    timeout=30,
)
for _ in range(60):
    state = probe.run(
        "camera",
        '({live:!!app.camera.mozCamera && app.camera.mozCamera.getVideoTracks().every(t=>t.readyState==="live"),loaded:!!app.loaded,hidden:document.hidden,busy:app.camera.isBusy,width:document.querySelector(".viewfinder video")?.videoWidth,text:document.body.innerText})',
    ).get("value", {})
    if state.get("live") and state.get("width") and state.get("loaded") and not state.get("busy"):
        break
    time.sleep(0.3)
else:
    raise AssertionError(state)
result = {"first_consent_without_restart": state, "scope": "Android 16 x86_64 emulator"}
(ROOT / "android/logs/camera-first-permission.json").write_text(
    json.dumps(result, indent=2, ensure_ascii=False) + "\n"
)
print(json.dumps(result, indent=2, ensure_ascii=False))
