#!/usr/bin/env python3
"""Run archived app observations and restart in an isolated profile/display."""
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
(ROOT / "logs").mkdir(exist_ok=True)
for port in [8765, 2857]:
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind(("127.0.0.1", port))
        except OSError:
            sys.exit("Fermer Vulpes avant ces tests (port " + str(port) + " occupé).")
with tempfile.TemporaryFile() as display_file, (ROOT / "logs/legacy-xvfb.log").open("w") as log:
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
        for _ in range(100):
            display_file.seek(0)
            display = display_file.read().decode().strip()
            if display:
                break
            time.sleep(0.05)
        else:
            raise RuntimeError("Xvfb failed")
        env = os.environ.copy()
        env.update(DISPLAY=":" + display, GDK_BACKEND="x11", MOZ_ENABLE_WAYLAND="0")
        for phase in ["first", "restart"]:
            with (ROOT / "logs" / ("legacy-host-" + phase + ".log")).open("w") as output:
                host = subprocess.Popen(
                    [sys.executable, str(ROOT / "tools/run-host.py"), "--test", "--legacy-apps"],
                    env=env,
                    stdout=output,
                    stderr=subprocess.STDOUT,
                )
                connected = False
                try:
                    with Client(2857):
                        pass
                    connected = True
                    subprocess.run(
                        [
                            sys.executable,
                            str(ROOT / "tools/test-legacy-apps.py"),
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
                    raise RuntimeError("Host failed, see logs/legacy-host-" + phase + ".log")
    finally:
        xserver.terminate()
        xserver.wait(timeout=10)
