#!/usr/bin/env python3
"""Run desktop integration and restart checks on a private X11 display."""

import argparse
import importlib.util
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--candidate", action="store_true")
parser.add_argument(
    "--phase",
    action="append",
    choices=["first", "feedback", "apps", "platform", "languages", "restart"],
    help="Run only the selected phase(s)",
)
args = parser.parse_args()
for command in ["Xvfb", "xdotool", "import"]:
    if not shutil.which(command):
        sys.exit("Dépendance de test absente : " + command)
extra = ["--candidate"] if args.candidate else []
for port in [2857, 8765]:
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind(("127.0.0.1", port))
        except OSError:
            sys.exit(f"Port {port} occupé : fermer le laboratoire actuel avant les tests.")
(ROOT / "logs").mkdir(exist_ok=True)
with tempfile.TemporaryFile() as display_file, (ROOT / "logs/xvfb.log").open("w") as log:
    xserver = subprocess.Popen(
        [
            "Xvfb",
            "-displayfd",
            str(display_file.fileno()),
            "-screen",
            "0",
            "800x1000x24",
            "-nolisten",
            "tcp",
        ],
        pass_fds=(display_file.fileno(),),
        stdout=log,
        stderr=log,
    )
    try:
        import time

        for _ in range(100):
            display_file.seek(0)
            display = display_file.read().decode().strip()
            if display:
                break
            if xserver.poll() is not None:
                sys.exit("Xvfb a échoué : logs/xvfb.log")
            time.sleep(0.05)
        else:
            sys.exit("Xvfb ne répond pas")
        env = os.environ.copy()
        env.update(DISPLAY=":" + display, GDK_BACKEND="x11", MOZ_ENABLE_WAYLAND="0")
        for phase in args.phase or [
            "first",
            "feedback",
            "apps",
            "platform",
            "languages",
            "restart",
        ]:
            with (ROOT / "logs" / ("desktop-" + phase + ".log")).open("w") as output:
                host = subprocess.Popen(
                    [sys.executable, str(ROOT / "tools/run-host.py"), "--test", *extra],
                    env=env,
                    stdout=output,
                    stderr=subprocess.STDOUT,
                )
                connected = False
                try:
                    # Wait for Marionette initialization before opening the suite.
                    with Client(2857) as client:
                        connected = True
                        spec = importlib.util.spec_from_file_location("probe", ROOT / "tools/probe-desktop.py")
                        probe = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(probe)
                        probe.register(client)
                        for _ in range(600):
                            ready = probe.evaluate(client, "system", "return document.body?.getAttribute('ready-state')==='fullyLoaded';")
                            if ready.get("value"):
                                break
                            time.sleep(.1)
                        else:
                            raise RuntimeError("Gaia did not finish loading")
                        # Wake before unlocking: waking can activate the lockscreen.
                        probe.evaluate(client, "system", "ScreenManager.turnScreenOn(true);return true;")
                        time.sleep(.5)
                        probe.evaluate(client, "system", "lockScreen.unlock(true);return true;")
                        time.sleep(.5)
                    connected = True
                    # The ownership test deliberately removes Gaia's iframe.
                    # Start the UI regressions in a fresh process, preserving data.
                    if phase in ["first", "restart"]:
                        subprocess.run(
                            [
                                sys.executable,
                                str(ROOT / "tools/test-host.py"),
                                *extra,
                                *(["--restart-check"] if phase == "restart" else []),
                            ],
                            env=env,
                            check=True,
                        )
                    if phase in ["feedback", "restart"]:
                        subprocess.run(
                            [
                                sys.executable,
                                str(ROOT / "tools/test-feedback.py"),
                                *(["--restart-check"] if phase == "restart" else []),
                            ],
                            env=env,
                            check=True,
                        )
                    if phase in ["apps", "restart"]:
                        subprocess.run(
                            [
                                sys.executable,
                                str(ROOT / "tools/test-apps.py"),
                                *(["--restart-check"] if phase == "restart" else []),
                            ],
                            env=env,
                            check=True,
                        )
                    if phase == "platform":
                        subprocess.run(
                            [sys.executable, str(ROOT / "tools/test-camera.py")],
                            env=env,
                            check=True,
                        )
                        subprocess.run(
                            [sys.executable, str(ROOT / "tools/test-platform.py")],
                            env=env,
                            check=True,
                        )
                    if phase in ["languages", "restart"]:
                        subprocess.run(
                            [
                                sys.executable,
                                str(ROOT / "tools/test-languages.py"),
                                *(["--restart-check"] if phase == "restart" else []),
                            ],
                            env=env,
                            check=True,
                        )
                finally:
                    try:
                        if connected:
                            with Client(2857) as client:
                                client.call("Marionette:Quit", {"flags": ["eAttemptQuit"]})
                    finally:
                        try:
                            host.wait(timeout=15)
                        except subprocess.TimeoutExpired:
                            host.terminate()
                            host.wait(timeout=10)
            if host.returncode:
                sys.exit("Le lanceur a échoué, consulter logs/desktop-" + phase + ".log")
    finally:
        xserver.terminate()
        xserver.wait(timeout=10)
