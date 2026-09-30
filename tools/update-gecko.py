#!/usr/bin/env python3
"""Download, qualify and optionally activate an isolated Gecko release."""
import argparse
from contextlib import contextmanager
import datetime
import fcntl
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ACTIVE = ROOT / "engine-lock.json"
HISTORY = ROOT / "logs/updates/last-activation.json"
RESULTS = [
    "engine-capabilities.json",
    "services-results.json",
    "host-results.json",
    "host-restart-results.json",
    "feedback-results.json",
    "feedback-restart-results.json",
    "apps-results.json",
    "apps-restart-results.json",
    "languages-results.json",
    "languages-restart-results.json",
]


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as output:
        temporary = Path(output.name)
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


def require_idle():
    for port in [8765, 2856, 2857]:
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                raise RuntimeError(
                    f"Port {port} occupé. Fermer l’émulateur et les tests avant la mise à jour."
                )


@contextmanager
def idle_host():
    # Share the launcher's lock during profile/engine changes only. Tests need
    # to acquire it themselves while qualifying the candidate.
    with (ROOT / "logs/host.lock").open("w") as guard:
        try:
            fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Un émulateur est encore actif; aucun basculement.")
        require_idle()
        yield


def validate_runtime(lock):
    runtime = (ROOT / lock["runtime"]).resolve()
    if (
        not runtime.is_relative_to((ROOT / "engines").resolve())
        or not (runtime / "firefox").is_file()
    ):
        raise RuntimeError("Moteur absent ou chemin hors du dossier engines.")
    return runtime


@contextmanager
def closed_profile(profile):
    if not profile.exists():
        yield
        return
    # Match nsProfileLock::LockWithFcntl (whole file, exclusive, nonblocking).
    # Do not follow an unexpected symlink for the native lock file.
    descriptor = os.open(profile / ".parentlock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "r+") as guard:
        try:
            fcntl.lockf(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Le profil source est encore ouvert : " + str(profile))
        for name in ["lock", "parent.lock"]:
            marker = profile / name
            if marker.is_symlink() and ":+" not in os.readlink(marker):
                raise RuntimeError("Verrou de profil ancien ou inconnu : " + str(marker))
        yield


def activate(candidate, old, report_dir):
    require_idle()
    validate_runtime(candidate)
    if json.loads(ACTIVE.read_text()) != old:
        raise RuntimeError("Le moteur actif a changé pendant les tests; basculement annulé.")
    source = ROOT / "profiles" / ("desktop-" + old["version"])
    target = ROOT / "profiles" / ("desktop-" + candidate["version"])
    if target.exists():
        raise RuntimeError("Profil cible déjà présent; conservé sans écrasement : " + str(target))
    # Firefox on Linux uses a POSIX record lock on .parentlock. A symbolic
    # `lock` marker can survive a reboot and is not proof of a live process.
    with closed_profile(source):
        temporary = Path(tempfile.mkdtemp(prefix=".upgrade-", dir=ROOT / "profiles"))
        try:
            if source.exists():
                shutil.copytree(
                    source,
                    temporary,
                    dirs_exist_ok=True,
                    symlinks=True,
                    ignore=shutil.ignore_patterns(
                        ".parentlock",
                        "parent.lock",
                        "lock",
                        "cache2",
                        "startupCache",
                        "shader-cache",
                    ),
                )
            temporary.rename(target)
        finally:
            if temporary.exists():
                shutil.rmtree(temporary)
    # Save the recovery record before the single atomic activation write.
    recovery = {
        "previous": old,
        "activated": candidate,
        "report": str(report_dir.relative_to(ROOT)),
        "oldProfile": str(source.relative_to(ROOT)),
        "newProfile": str(target.relative_to(ROOT)),
    }
    atomic_json(report_dir / "activation.json", recovery)
    atomic_json(HISTORY, recovery)
    atomic_json(ACTIVE, candidate)


def rollback():
    require_idle()
    recovery = json.loads(HISTORY.read_text())
    current = json.loads(ACTIVE.read_text())
    if current == recovery["previous"]:
        print("Ancien moteur déjà actif.")
        return
    if current != recovery["activated"]:
        raise RuntimeError(
            "Le moteur actif ne correspond pas au dernier basculement; aucun changement."
        )
    validate_runtime(recovery["previous"])
    atomic_json(ACTIVE, recovery["previous"])
    print("Retour au moteur " + recovery["previous"]["version"] + " et à son profil conservé.")
    print("Les données créées dans le nouveau profil restent dans " + recovery["newProfile"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--retest", action="store_true", help="Retester même si la version est déjà active"
    )
    parser.add_argument("--version", help="Version stable exacte; sinon dernière stable Mozilla")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--apply", action="store_true", help="Activer après tous les tests, en copiant le profil"
    )
    mode.add_argument(
        "--rollback",
        action="store_true",
        help="Revenir au moteur/profil précédents sans supprimer le nouveau",
    )
    args = parser.parse_args()
    (ROOT / "logs/updates").mkdir(parents=True, exist_ok=True)
    with (ROOT / "logs/updates/update.lock").open("w") as guard:
        try:
            fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Une mise à jour est déjà en cours.")
        if args.rollback:
            if args.version or args.retest:
                raise RuntimeError("--version/--retest ne s’appliquent pas au retour arrière.")
            with idle_host():
                rollback()
            return
        require_idle()
        for command in ["Xvfb", "xdotool", "import"]:
            if not shutil.which(command):
                raise RuntimeError("Dépendance absente : " + command)
        old = json.loads(ACTIVE.read_text())
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        report_dir = ROOT / "logs/updates" / stamp
        report_dir.mkdir()
        atomic_json(report_dir / "previous-engine.json", old)
        report = {
            "status": "running",
            "previousVersion": old["version"],
            "steps": [],
            "scope": "desktop automation; full Firefox OS parity and mobile hardware not certified",
        }

        def save():
            atomic_json(report_dir / "report.json", report)

        def step(name, script, *arguments):
            print("→ " + name, flush=True)
            record = {"name": name, "log": name + ".log", "status": "running"}
            report["steps"].append(record)
            save()
            with (report_dir / record["log"]).open("w") as log:
                result = subprocess.run(
                    [sys.executable, str(ROOT / "tools" / script), *arguments],
                    cwd=ROOT,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                )
            record.update(
                status="passed" if result.returncode == 0 else "failed", exitCode=result.returncode
            )
            save()
            if result.returncode:
                raise RuntimeError("Échec de " + name + " : " + str(report_dir / record["log"]))
            print("  OK", flush=True)

        try:
            step(
                "download",
                "fetch-engine.py",
                *(["--version", args.version] if args.version else []),
            )
            candidate = json.loads((ROOT / "candidate-engine.json").read_text())
            report["candidateVersion"] = candidate["version"]
            save()
            print(f"Gecko {old['version']} → candidat {candidate['version']}", flush=True)
            if candidate["version"] == old["version"] and not args.retest:
                report["status"] = "up-to-date"
                print(
                    "Cette version est déjà active. Utiliser --retest pour refaire les contrôles.",
                    flush=True,
                )
                return
            # Old result files must never qualify a failed or incomplete run.
            for name in RESULTS:
                path = ROOT / "logs" / name
                if path.exists():
                    shutil.copy2(path, report_dir / ("before-" + name))
                    path.unlink()
            step("capabilities", "probe-engine.py", "--candidate")
            step("services", "test-services.py", "--candidate")
            step("desktop", "check-desktop.py", "--candidate")
            for name in RESULTS:
                path = ROOT / "logs" / name
                if not path.is_file():
                    raise RuntimeError("Rapport de test absent : " + name)
                shutil.copy2(path, report_dir / name)
            candidate.update(
                gaiaBoots=True,
                gaiaPorted=False,
                qualificationReport=str((report_dir / "report.json").relative_to(ROOT)),
            )
            if args.apply and candidate["version"] != old["version"]:
                with idle_host():
                    activate(candidate, old, report_dir)
                report["status"] = "activated"
                print("Moteur activé; ancien moteur et ancien profil conservés.", flush=True)
            else:
                report["status"] = "qualified"
                print("Tests réussis. Moteur actif conservé.", flush=True)
        except BaseException as error:
            report.update(status="failed", error=str(error))
            save()
            raise
        finally:
            save()
            print("Rapport : " + str(report_dir / "report.json"), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, KeyError) as error:
        sys.exit(str(error))
    except KeyboardInterrupt:
        sys.exit("Mise à jour interrompue; consulter le rapport.")
