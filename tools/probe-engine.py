#!/usr/bin/env python3
"""Audit the official engine in isolation. This does not launch Gaia."""
import argparse
import json
import os
import subprocess
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
(ROOT / "logs").mkdir(exist_ok=True)
(ROOT / "profiles").mkdir(exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument("--candidate", action="store_true")
args = parser.parse_args()
lock = json.loads(
    (ROOT / ("candidate-engine.json" if args.candidate else "engine-lock.json")).read_text()
)
runtime = ROOT / lock["runtime"]
profile = ROOT / "profiles" / ("probe-" + lock["version"])
profile.mkdir(parents=True, exist_ok=True)
prefs = {
    "marionette.port": 2856,
    "browser.shell.checkDefaultBrowser": False,
    "browser.startup.homepage_override.mstone": "ignore",
    "datareporting.policy.dataSubmissionEnabled": False,
    "toolkit.telemetry.reportingpolicy.firstRun": False,
    "browser.aboutwelcome.enabled": False,
}
(profile / "user.js").write_text(
    "".join("user_pref(" + json.dumps(k) + "," + json.dumps(v) + ");\n" for k, v in prefs.items())
)
env = os.environ.copy()
for name in list(env):
    if name.startswith("MOZ_DISABLE_") or name == "B2G_HOMESCREEN":
        env.pop(name)
with (ROOT / "logs/engine-probe.log").open("w") as log:
    proc = subprocess.Popen(
        [
            str(runtime / "firefox"),
            "-no-remote",
            "-headless",
            "-marionette",
            "--remote-allow-system-access",
            "-profile",
            str(profile),
            "about:blank",
        ],
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
try:
    with Client() as client:
        result = client.execute(
            """
const w=Services.wm.getMostRecentWindow('navigator:browser');
const f=w.document.createElementNS('http://www.w3.org/1999/xhtml','iframe');
const b=w.document.createXULElement('browser');
const contracts={};
for(const name of ['@mozilla.org/AppsService;1','@mozilla.org/settingsService;1','@mozilla.org/network/protocol;1?name=app'])contracts[name]=name in Components.classes;
const methods={};
for(const name of ['setVisible','getScreenshot','sendTouchEvent','setInputMethodActive','getCanGoBack'])methods[name]=typeof f[name];
const modules={};
for(const name of ['Downloads','Services','AppConstants']){try{ChromeUtils.importESModule('resource://gre/modules/'+name+'.sys.mjs');modules[name]=true;}catch(e){modules[name]=false;}}
return {version:Services.appinfo.platformVersion,build:Services.appinfo.platformBuildID,
 updatesDisabled:!Services.policies.isAllowed('appUpdate'),contracts,modules,iframeMethods:methods,
 registerElement:typeof w.document.registerElement,customElements:typeof w.customElements,
 xulBrowser:{loadURI:typeof b.loadURI,tag:b.localName},fission:Services.appinfo.fissionAutostart,
 contentSandboxLevel:Services.prefs.getIntPref('security.sandbox.content.level'),gaiaPorted:false};
"""
        )
        assert result["version"] == lock["version"], result
        assert result["updatesDisabled"] is True, result
        assert result["contentSandboxLevel"] > 0, result
        (ROOT / "logs/engine-capabilities.json").write_text(json.dumps(result, indent=2) + "\n")
        (ROOT / "logs" / ("engine-capabilities-" + lock["version"] + ".json")).write_text(
            json.dumps(result, indent=2) + "\n"
        )
        print(json.dumps(result, indent=2), flush=True)
        client.call("Marionette:Quit", {"flags": ["eAttemptQuit"]})
finally:
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.terminate()
        proc.wait(timeout=10)
