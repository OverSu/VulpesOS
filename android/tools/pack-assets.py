#!/usr/bin/env python3
"""Snapshot the same Gaia assets/overlays as the desktop, without changing them."""
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
import sys
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from project import build_info, validate_assets, release_info

validate_assets()
OUT = ROOT / "android/app/src/main/assets"
OUT.mkdir(parents=True, exist_ok=True)
PORT = 18765
pattern = re.compile(
    r"app://([a-zA-Z0-9_-]+)\.gaiamobile\.org|http://([a-zA-Z0-9_-]+)\.localhost:8765"
)


def translate(text):
    return pattern.sub(lambda m: f"http://{m[1] or m[2]}.localhost:{PORT}", text)


APPS = ROOT / "assets/webapps"
registry = []
for manifest in sorted(APPS.glob("*/manifest.webapp")):
    name = manifest.parent.name.removesuffix(".gaiamobile.org")
    if not re.fullmatch("[a-z0-9_-]+", name):
        continue
    origin = f"http://{name}.localhost:{PORT}"
    registry.append(
        dict(
            id=name,
            origin=origin,
            manifestURL=origin + "/manifest.webapp",
            manifest=json.loads(translate(manifest.read_text())),
        )
    )
info = build_info()
release = release_info()
revision = info["revision"]
commit_time = str(info["timestamp"])
source_overrides = {
    "system": [
        "js/launcher.js",
        "js/gaia_scheduler.js",
        "js/keyboard_manager.js",
        "js/core.js",
        "js/rocketbar.js",
    ]
}
textsuffix = {".html", ".js", ".css", ".json", ".webapp", ".properties", ".svg"}
head = b'<head><script src="/_vulpes/platform-config.js"></script><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link rel="stylesheet" href="/_vulpes/desktop.css"><link rel="stylesheet" href="/_vulpes/android.css"><script src="/_vulpes/settings-codec.js"></script><script src="/_vulpes/gaia-compat.js"></script><script src="/_vulpes/gaia-wifi.js"></script><script src="/_vulpes/gaia-services.js"></script><script src="/_vulpes/gaia-styles.js"></script><script src="/_vulpes/android-ui.js"></script><script src="/_vulpes/gaia-restoration.js"></script><script src="/_vulpes/platform-ui.js"></script><script src="/_vulpes/gaia-camera.js"></script>'
if "--bridge-only" not in sys.argv or not (OUT / "gaia.zip").exists():
    with zipfile.ZipFile(OUT / "gaia.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        hashes = {}

        def put(name, data):
            z.writestr(name, data)
            hashes[name] = hashlib.sha256(data).hexdigest()

        for app in registry:
            folder = APPS / (app["id"] + ".gaiamobile.org")
            files = {p.relative_to(folder).as_posix(): p for p in folder.rglob("*") if p.is_file()}
            common = ROOT / "overrides/shared"
            if common.is_dir():
                for source in common.rglob("*"):
                    if source.is_file():
                        files["shared/" + source.relative_to(common).as_posix()] = source
            overlay = ROOT / "overrides" / folder.name
            if overlay.exists():
                files.update(
                    {
                        p.relative_to(overlay).as_posix(): p
                        for p in overlay.rglob("*")
                        if p.is_file() and p.name != "manifest.webapp"
                    }
                )
            for name in source_overrides.get(app["id"], []):
                files[name] = ROOT / "gaia/apps" / app["id"] / name
            for name, p in files.items():
                data = p.read_bytes()
                if p.suffix in textsuffix:
                    text = translate(data.decode("utf8"))
                    if p.suffix in {".html", ".css", ".js"}:
                        for a, b in [
                            ("-moz-calc(", "calc("),
                            ("-moz-box-sizing:", "box-sizing:"),
                            ("-moz-plaintext", "plaintext"),
                            (":-moz-dir(", ":dir("),
                            ("offset-inline-start:", "inset-inline-start:"),
                            ("offset-inline-end:", "inset-inline-end:"),
                        ]:
                            text = text.replace(a, b)
                    # Clearing a media URL with null requests the literal /null path.
                    if app["id"] == "music" and p.suffix == ".js":
                        text = text.replace("audio.src=null;", "audio.removeAttribute('src');")
                    if name == "resources/gaia_commit.txt":
                        text = revision + "\n" + commit_time + "\n"
                    data = text.encode()
                if p.suffix == ".html" and not (app["id"] == "search" and name.startswith("home/")):
                    data = data.replace(b"<head>", head, 1)
                    if app["id"] == "communications" and name.startswith("dialer/"):
                        data = data.replace(
                            b"<head>",
                            b'<head><script src="/shared/js/accessibility_helper.js"></script>',
                            1,
                        )
                put(app["id"] + "/" + name, data)
        for p in (ROOT / "gaia/shared").rglob("*"):
            if p.is_file():
                data = p.read_bytes()
                if p.suffix in textsuffix:
                    data = translate(data.decode("utf8")).encode()
                put("_shared/" + p.relative_to(ROOT / "gaia/shared").as_posix(), data)
        put("_vulpes/platform-config.js", b'window.VulpesPlatform="android";')
        for name in ["gaia-compat.js", "gaia-services.js", "gaia-styles.js", "gaia-restoration.js", "gaia-wifi.js", "desktop.css", "platform-ui.js", "gaia-camera.js"]:
            text = (
                (ROOT / "host" / name)
                .read_text()
            )
            put("_vulpes/" + name, translate(text).encode())
        put("_vulpes/settings-codec.js", (ROOT / "android/ui/settings-codec.js").read_bytes())
        put("_vulpes/android-ui.js", (ROOT / "android/ui/android-ui.js").read_bytes())
        put(
            "_vulpes/android.css",
            b'html,body{overscroll-behavior:none} html[data-vulpes-app="system"] #keyboard-frame{display:none!important} html[data-vulpes-app="system"] #screen{height:100%!important} input,textarea{touch-action:manipulation}',
        )
    (OUT / "payload-checksums.json").write_text(json.dumps(hashes, sort_keys=True))
ext = OUT / "bridge"
shutil.copytree(ROOT / "android/extension", ext, dirs_exist_ok=True)
for folder in ["services", "adapters"]:
    shutil.copytree(ROOT / folder, ext / folder, dirs_exist_ok=True)
for name in ["Connections", "Contacts", "Messages"]:
    text = (
        (ROOT / "host" / f"{name}.sys.mjs")
        .read_text()
        .replace("Services.uuid.generateUUID().toString()", "crypto.randomUUID()")
    )
    (ext / f"{name}.mjs").write_text(text)
shutil.copy2(ROOT / "host/Alarms.sys.mjs", ext / "Alarms.mjs")
(ext / "release.json").write_text(json.dumps(release))
(ext / "registry.json").write_text(json.dumps(registry, ensure_ascii=False))
settings = json.loads(translate((ROOT / "assets/settings-defaults.json").read_text()))
wallpaper = ROOT / "gaia/apps/default_theme/wallpapers/Illus_Flow2_Blue@2x.jpg"
if not wallpaper.is_file():
    raise RuntimeError("Default wallpaper is missing: " + str(wallpaper))
settings["wallpaper.image"] = (
    "data:image/jpeg;base64," + base64.b64encode(wallpaper.read_bytes()).decode()
)
settings.update(
    {
        "ftu.manifestURL": "",
        "lockscreen.enabled": True,
        "screen.timeout": 0,
        "language.current": "fr",
        "software-button.enabled": False,
        "metrics.selectedMetrics.level": "None",
        "ftu.pingEnabled": False,
        "search.suggestions.enabled": False,
        "search.marketplace.url": "",
        "gaia.system.checkForUpdates": False,
        "deviceinfo.os": release["gaia"],
        "deviceinfo.software": "Vulpes OS " + release["version"],
        "deviceinfo.product_model": "Vulpes Android Preview",
        "deviceinfo.product_device": "android",
        "deviceinfo.platform_version": release["androidEngine"],
        "deviceinfo.platform_build_id": release["androidEngineBuildID"],
    }
)
(ext / "defaults.json").write_text(json.dumps(settings, ensure_ascii=False))
(OUT / "build-info.json").write_text(
    json.dumps(
        {
            "revision": revision,
            "geckoview": release["geckoview"],
            "version": release["version"],
            "minSdk": 26,
            "targetSdk": 37,
        }
    )
)
print(
    f'Packaged {len(registry)} Gaia apps, {round((OUT/"gaia.zip").stat().st_size/1024/1024,1)} MiB'
)
