#!/usr/bin/env python3
"""Reject stale Android payloads and inconsistent common release metadata."""

import argparse, hashlib, io, json, re, zipfile
from project import ROOT, release_info

p = argparse.ArgumentParser()
p.add_argument("--apk", type=str)
args = p.parse_args()
r = release_info()
apk = ROOT / (args.apk or f'android/dist/vulpes-os-preview-{r["version"]}.apk')
pattern = re.compile(
    r"app://([a-zA-Z0-9_-]+)\.gaiamobile\.org|http://([a-zA-Z0-9_-]+)\.localhost:8765"
)


def translate(s):
    return pattern.sub(lambda m: f"http://{m[1] or m[2]}.localhost:18765", s)


results = {}
with zipfile.ZipFile(apk) as archive:
    metadata = json.loads(archive.read("assets/build-info.json"))
    packaged = json.loads(archive.read("assets/bridge/release.json"))
    assert metadata["version"] == r["version"], metadata
    assert metadata["geckoview"] == r["geckoview"], metadata
    assert packaged == r, (packaged, r)
    with zipfile.ZipFile(io.BytesIO(archive.read("assets/gaia.zip"))) as gaia:
        for name in [
            "platform-ui.js",
            "gaia-camera.js",
            "gaia-compat.js",
            "gaia-services.js",
            "gaia-styles.js",
            "gaia-restoration.js",
            "gaia-wifi.js",
            "desktop.css",
        ]:
            expected = translate((ROOT / "host" / name).read_text()).encode()
            actual = gaia.read("_vulpes/" + name)
            assert actual == expected, "Stale Android shared UI: " + name
            results[name] = hashlib.sha256(actual).hexdigest()
        wifi = translate((ROOT / "overrides/system.gaiamobile.org/js/wifi.js").read_text()).encode()
        assert gaia.read("system/js/wifi.js") == wifi, "Stale Android Gaia Wi-Fi timer"
        results["system/js/wifi.js"] = hashlib.sha256(wifi).hexdigest()
        for app, path in [
            ("settings", "js/panels/display/panel.js"),
            ("settings", "js/panels/wifi/panel.js"),
            ("system", "js/screen_manager.js"),
            ("system", "js/notification_screen.js"),
            ("system", "style/system/system.css"),
            ("communications", "dialer/style/call_log.css"),
        ]:
            expected = translate((ROOT / "overrides" / (app + ".gaiamobile.org") / path).read_text())
            for old, new in [("-moz-calc(", "calc("), ("-moz-box-sizing:", "box-sizing:"),
                             ("-moz-plaintext", "plaintext"), (":-moz-dir(", ":dir("),
                             ("offset-inline-start:", "inset-inline-start:"),
                             ("offset-inline-end:", "inset-inline-end:")]:
                expected = expected.replace(old, new)
            actual = gaia.read(app + "/" + path)
            assert actual == expected.encode(), "Stale Android Gaia panel: " + path
            results[app + "/" + path] = hashlib.sha256(actual).hexdigest()
        for app, path, source in [
            ("calendar", "gaia_build_defer_index.js", "overrides"),
            ("calendar", "js/bundle.js", "overrides"),
            ("gallery", "js/metadata_scripts.js", "assets/webapps"),
            ("gallery", "js/ImageEditor.js", "assets/webapps"),
        ]:
            expected = translate((ROOT / source / (app + ".gaiamobile.org") / path).read_text())
            for old, new in [("-moz-calc(", "calc("), ("-moz-box-sizing:", "box-sizing:"),
                             ("-moz-plaintext", "plaintext"), (":-moz-dir(", ":dir("),
                             ("offset-inline-start:", "inset-inline-start:"),
                             ("offset-inline-end:", "inset-inline-end:")]:
                expected = expected.replace(old, new)
            expected = expected.encode()
            actual = gaia.read(app + "/" + path)
            assert actual == expected, "Stale application workflow: " + app + "/" + path
            results[app + "/" + path] = hashlib.sha256(actual).hexdigest()
        for path in (ROOT / "overrides/search.gaiamobile.org/home").rglob("*"):
            if path.is_file():
                relative = path.relative_to(ROOT / "overrides/search.gaiamobile.org")
                assert gaia.read("search/" + relative.as_posix()) == path.read_bytes(), str(relative)
        assert b"vulpes-local-home" in gaia.read("search/newtab.html")
    assert archive.read("assets/bridge/Messages.mjs") == (ROOT / "host/Messages.sys.mjs").read_bytes()
    for name in ["platform.mjs", "settings.mjs", "datastores.mjs", "screen-power.mjs"]:
        assert (
            archive.read("assets/bridge/services/" + name)
            == (ROOT / "services" / name).read_bytes()
        ), name
assert (
    r["androidEngine"].split(".")[0]
    == r["desktopEngine"].split(".")[0]
    == r["engineAlignment"]["family"]
)
report = {
    "version": r["version"],
    "gaia": r["gaia"],
    "desktopEngine": r["desktopEngine"],
    "androidEngine": r["androidEngine"],
    "exactEngineMatch": r["desktopEngine"] == r["androidEngine"],
    "sharedFiles": results,
    "apk": str(apk),
    "scope": "Payload and metadata parity; hardware behavior requires separate integration tests.",
}
(ROOT / "logs/parity-payload.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
