#!/usr/bin/env python3
"""Prepare and run the independent Gaia desktop on a pinned Mozilla runtime."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
from project import validate_assets


def prepare(lock, test=False):
    runtime = ROOT / lock["runtime"]
    if not (runtime / "firefox").is_file():
        raise RuntimeError(
            "Moteur absent. Exécuter ./setup.sh pour installer le moteur verrouillé."
        )
    validate_assets()
    for name in ["host", "services", "adapters"] + (["tests"] if test else []):
        shutil.copytree(ROOT / name, runtime / "vulpes" / name, dirs_exist_ok=True)
    (runtime / "defaults/pref").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "host/bootstrap/vulpes.cfg", runtime / "vulpes.cfg")
    shutil.copy2(
        ROOT / "host/bootstrap/vulpes-autoconfig.js", runtime / "defaults/pref/vulpes-autoconfig.js"
    )
    return runtime


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", action="store_true")
    parser.add_argument(
        "--legacy-apps", action="store_true", help="Trois paquets archivés, profil séparé"
    )
    parser.add_argument(
        "--test", action="store_true", help="Marionette 2857, profil de test et fenêtre auxiliaire"
    )
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    lock = json.loads(
        (ROOT / ("candidate-engine.json" if args.candidate else "engine-lock.json")).read_text()
    )
    (ROOT / "logs").mkdir(exist_ok=True)
    # One host owns the loopback origins/registry. Never attach silently to an
    # unknown HTTP listener or to another application's profile.
    with (ROOT / "logs/host.lock").open("w") as guard:
        try:
            fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError(
                "Un hôte Gecko actuel est déjà ouvert. Fermer sa fenêtre avant de relancer."
            )
        if args.legacy_apps:
            subprocess.run([sys.executable, str(ROOT / "tools/prepare-legacy-apps.py")], check=True)
        runtime = prepare(lock, args.test)
        if args.prepare_only:
            print("Adaptateur synchronisé :", runtime)
            return
        probe = socket.socket()
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind(("127.0.0.1", 8765))
        except OSError:
            raise RuntimeError("Port Gaia 8765 déjà occupé. Fermer le précédent hôte/serveur Gaia.")
        finally:
            probe.close()
        profile = (
            ROOT
            / "profiles"
            / (
                ("host-" if args.test else "desktop-")
                + ("legacy-" if args.legacy_apps else "")
                + lock["version"]
            )
        )
        profile.mkdir(parents=True, exist_ok=True)
        prefs = {
            "browser.shell.checkDefaultBrowser": False,
            "browser.dom.window.dump.enabled": True,
            "browser.startup.homepage_override.mstone": "ignore",
            "browser.aboutwelcome.enabled": False,
            "font.default.x-western": "sans-serif",
            "font.name.sans-serif.x-western": "Fira Sans",
            "marionette.enabled": args.test,
            "datareporting.policy.dataSubmissionEnabled": False,
        }
        if args.test:
            prefs["marionette.port"] = 2857
        (profile / "user.js").write_text(
            "\n".join(f"user_pref({json.dumps(k)}, {json.dumps(v)});" for k, v in prefs.items())
            + "\n"
        )
        env = os.environ.copy()
        for name in list(env):
            if name.startswith("MOZ_DISABLE_") or name in (
                "B2G_HOMESCREEN",
                "MOZ_MARIONETTE",
                "MOZ_HEADLESS",
            ):
                env.pop(name)
        env.update(VULPES_HOST_ROOT=str(runtime / "vulpes/host"), VULPES_WORKSPACE_ROOT=str(ROOT))
        command = [
            str(runtime / "firefox"),
            "-no-remote",
            "-purgecaches",
            "-profile",
            str(profile),
            "-chrome",
            "chrome://vulpes/content/shell.xhtml",
        ]
        if args.test:
            command += ["-marionette", "--remote-allow-system-access", "-new-window", "about:blank"]
        proc = None
        with (ROOT / "logs/gaia-server.log").open("w") as output:
            server = subprocess.Popen(
                [
                    sys.executable,
                    str(ROOT / "tools/serve-gaia.py"),
                    *(["--legacy-apps"] if args.legacy_apps else []),
                ],
                stdout=output,
                stderr=subprocess.STDOUT,
            )
            try:
                for _ in range(900):
                    if server.poll() is not None:
                        raise RuntimeError("Échec du serveur Gaia : logs/gaia-server.log")
                    try:
                        with socket.create_connection(("127.0.0.1", 8765), timeout=0.2):
                            break
                    except OSError:
                        time.sleep(0.05)
                else:
                    raise RuntimeError("Le serveur Gaia ne répond pas.")
                print(f'Vulpes / Gecko {lock["version"]} — profil {profile}', flush=True)
                proc = subprocess.Popen(command, env=env)
                result = proc.wait()
                if result:
                    raise RuntimeError(f"Gecko a quitté avec le code {result}")
            finally:
                if proc and proc.poll() is None:
                    proc.terminate()
                    try:
                        proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        proc.wait()
                server.terminate()
                server.wait(timeout=10)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except (RuntimeError, OSError) as error:
        sys.exit(str(error))
