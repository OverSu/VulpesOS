#!/usr/bin/env python3
"""Run service contracts in the pinned engine, then restart and check persistence."""
import argparse
import functools
import json
import os
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
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
profile = ROOT / "profiles" / ("contracts-" + lock["version"])
profile.mkdir(exist_ok=True)
(profile / "user.js").write_text(
    """user_pref("marionette.port",2856);
user_pref("browser.shell.checkDefaultBrowser",false);
user_pref("browser.aboutwelcome.enabled",false);
user_pref("datareporting.policy.dataSubmissionEnabled",false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun",false);
"""
)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        # Only test modules are served, never profiles, downloads or engine files.
        target = Path(self.translate_path(self.path)).resolve()
        if not any(
            target.is_relative_to(ROOT / name) for name in ["tests", "services", "adapters"]
        ):
            self.send_error(404)
            return
        return super().do_GET()


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/tests/contracts.html" % server.server_port
results = {}
try:
    for phase in ["first", "restart"]:
        env = os.environ.copy()
        for key in list(env):
            if key.startswith("MOZ_DISABLE_") or key == "B2G_HOMESCREEN":
                env.pop(key)
        with (ROOT / "logs" / ("contracts-" + phase + ".log")).open("w") as log:
            proc = subprocess.Popen(
                [
                    str(ROOT / lock["runtime"] / "firefox"),
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
                actual = client.execute("return Services.appinfo.platformVersion;")
                assert actual == lock["version"], actual
                client.call("Marionette:SetContext", {"value": "content"})
                client.call(
                    "WebDriver:Navigate",
                    {"url": url + ("?restart=1" if phase == "restart" else "")},
                )
                for _ in range(300):
                    raw = client.execute(
                        'return document.getElementById("result")?.textContent || "";'
                    )
                    result = json.loads(raw) if raw.startswith("{") else None
                    if result:
                        break
                    time.sleep(0.1)
                else:
                    page = client.execute(
                        "return {url:location.href,ready:document.readyState,text:document.body?.innerText};"
                    )
                    client.call("Marionette:SetContext", {"value": "chrome"})
                    errors = client.execute(
                        "return Services.console.getMessageArray().map(e=>e.message).slice(-20);"
                    )
                    raise AssertionError(
                        "Service tests did not complete: " + repr({"page": page, "errors": errors})
                    )
                results[phase] = result
                assert all(v is True for v in result.values()), result
                client.call("Marionette:Quit", {"flags": ["eAttemptQuit"]})
        finally:
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.terminate()
                proc.wait(timeout=10)
    results["engine"] = lock["version"]
    (ROOT / "logs/services-results.json").write_text(json.dumps(results, indent=2) + "\n")
    (ROOT / "logs" / ("services-results-" + lock["version"] + ".json")).write_text(
        json.dumps(results, indent=2) + "\n"
    )
    print(json.dumps(results, indent=2))
finally:
    server.shutdown()
    server.server_close()
