"""Paths and metadata shared by the desktop and Android build tools."""

import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def validate_assets():
    """Require the checked-in Gaia payload instead of a private profile copy."""
    apps = ROOT / "assets/webapps"
    required = [
        ROOT / "assets/settings-defaults.json",
        apps / "system.gaiamobile.org/index.html",
        apps / "homescreen.gaiamobile.org/index.html",
        apps / "default_theme.gaiamobile.org/manifest.webapp",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError("Incomplete checkout; missing Gaia files: " + ", ".join(missing))
    manifests = sorted(apps.glob("*/manifest.webapp"))
    if not manifests:
        raise RuntimeError("No installed Gaia manifests in assets/webapps")
    for manifest in manifests:
        json.loads(manifest.read_text())
    json.loads((ROOT / "assets/settings-defaults.json").read_text())
    return len(manifests)


def build_info():
    """Read this checkout's revision; archives without .git report it as unknown."""
    unknown = {"revision": "unknown", "timestamp": 0, "dirty": None}
    if not (ROOT / ".git").exists():
        return unknown
    try:
        revision, timestamp = (
            subprocess.check_output(
                ["git", "show", "-s", "--format=%H%n%ct", "HEAD"],
                cwd=ROOT,
                text=True,
                stderr=subprocess.DEVNULL,
            )
            .strip()
            .splitlines()
        )
        changes = subprocess.check_output(
            ["git", "status", "--porcelain", "--untracked-files=normal"],
            cwd=ROOT,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError, ValueError):
        return unknown
    return {"revision": revision, "timestamp": int(timestamp), "dirty": bool(changes)}


def release_info():
    """One product revision, with independently verified platform engine packages."""
    release = json.loads((ROOT / "release.json").read_text())
    release.setdefault("version", f'{release["gaia"]}-{release["channel"]}.{release["revision"]}')
    release["desktopEngine"] = json.loads((ROOT / "engine-lock.json").read_text())["version"]
    engine, build_id = release["geckoview"].rsplit(".", 1)
    release["androidEngine"] = engine
    release["androidEngineBuildID"] = build_id
    if not release["androidVersionCode"] > 4:
        raise ValueError("Android versionCode must preserve upgrades from Preview 4")
    return release


def application_manifest(app_id, manifest, include_development=False):
    """Keep development providers installed but hide their launcher entries."""
    # Runtime exports omit dev_apps sources; keep the same policy in every package.
    development = app_id in ('contacts-ds-provider1', 'contacts-ds-provider2', 'contacts-manager', 'ds-test', 'geoloc', 'in_app_pay_test', 'l20n-app', 'marketplace-dev.allizom.org', 'marketplace.allizom.org', 'membuster', 'mobile-wallet', 'mochitest', 'music-oga', 'nfc-api-test', 'share-receiver', 'template', 'test-agent', 'test-container', 'test-iac-publisher', 'test-iac-subscriber', 'test-ime', 'test-keyboard-app', 'test-otasp', 'test-receiver-1', 'test-receiver-2', 'test-receiver-inline', 'test-sensors', 'test-wappush', 'testpermission', 'theme-test-1', 'theme-test-2', 'theme-test-3', 'uitest', 'uitest-privileged', 'upnp-test', 'test-startup-limit')
    if development and not include_development:
        manifest = {**manifest, "role": "system"}
    return manifest
