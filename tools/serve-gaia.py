#!/usr/bin/env python3
"""Serve packaged Gaia with a distinct loopback origin for every installed app."""
import argparse
import json
import mimetypes
import os
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8765)
parser.add_argument("--legacy-apps", action="store_true")
args = parser.parse_args()
from project import build_info, validate_assets, release_info, application_manifest
from installed_apps import InstalledApps
INSTALLED = InstalledApps(ROOT / "profiles/installed-apps", args.port)

validate_assets()
info = build_info()
info["release"] = release_info()
revision, commit_time = info["revision"], str(info["timestamp"])
(ROOT / "assets/build-info.json").write_text(json.dumps(info))
APPS = ROOT / "assets/webapps"
ORIGINS = {}
REGISTRY = []
pattern = re.compile(r"app://([a-zA-Z0-9_-]+)\.gaiamobile\.org")


def translate(text):
    return pattern.sub(lambda m: f"http://{m[1]}.localhost:{args.port}", text)


manifests = sorted(APPS.glob("*/manifest.webapp"))
LEGACY_ROOTS = set()
if args.legacy_apps:
    for entry in json.loads((ROOT / "tests/legacy-apps.json").read_text()):
        directory = ROOT / "downloads/legacy-apps/apps" / entry["id"]
        manifests.append(directory / "manifest.webapp")
        LEGACY_ROOTS.add(directory.resolve())
for manifest_path in manifests:
    name = manifest_path.parent.name.removesuffix(".gaiamobile.org")
    if not re.fullmatch("[a-z0-9_-]+", name):
        continue
    origin = f"http://{name}.localhost:{args.port}"
    manifest = application_manifest(name, json.loads(translate(manifest_path.read_text())), os.environ.get("VULPES_SHOW_DEV_APPS") == "1")
    ORIGINS[urlsplit(origin).netloc] = manifest_path.parent.resolve()
    REGISTRY.append(
        {
            "id": name,
            "origin": origin,
            "manifestURL": origin + "/manifest.webapp",
            "manifest": manifest,
        }
    )
ORIGINS[f"theme.localhost:{args.port}"] = ORIGINS[f"default_theme.localhost:{args.port}"]
(ROOT / "assets/registry.json").write_text(
    json.dumps(REGISTRY + INSTALLED.records(), ensure_ascii=False, indent=2) + "\n"
)
(ROOT / "assets/settings-current-defaults.json").write_text(
    translate((ROOT / "assets/settings-defaults.json").read_text())
)


class Handler(BaseHTTPRequestHandler):
    def json_reply(self, value):
        data = json.dumps(value).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        import secrets
        if self.headers.get('Host') != f'system.localhost:{args.port}' or not secrets.compare_digest(self.headers.get('X-Vulpes-Install', ''), INSTALLED.token):
            self.send_error(403); return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 70*1024*1024: raise ValueError('INVALID_SIZE')
            data = json.loads(self.rfile.read(length))
            if self.path == '/_vulpes/packages/save': INSTALLED.save(data)
            elif self.path == '/_vulpes/packages/remove': INSTALLED.remove(data['id'])
            else: self.send_error(404); return
            self.json_reply(INSTALLED.records())
        except (ValueError, KeyError, OSError): self.send_error(400)

    def do_GET(self):
        host = self.headers.get('Host', '').lower()
        if host == f'system.localhost:{args.port}' and self.path == '/_vulpes/packages/list':
            self.json_reply(INSTALLED.records()); return
        app_id = host.removesuffix(f'.localhost:{args.port}')
        if INSTALLED.valid_id(app_id) and host == f'{app_id}.localhost:{args.port}':
            path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
            data = INSTALLED.read(app_id, path)
            if data is None: self.send_error(404); return
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "object-src 'none'; frame-ancestors http://*.localhost:"+str(args.port))
            self.end_headers(); self.wfile.write(data); return
        root = ORIGINS.get(self.headers.get("Host", "").lower())
        if root is None:
            self.send_error(421, "Unregistered application host")
            return
        path = unquote(urlsplit(self.path).path)
        if "\x00" in path or "\\" in path or ".." in Path(path).parts:
            self.send_error(400)
            return
        if path == "/_vulpes/platform-config.js":
            data = (('window.VulpesPlatform='+json.dumps('tundra' if os.environ.get('VULPES_TUNDRA')=='1' else 'desktop')+';window.VulpesNativeInput='+('true' if os.environ.get('VULPES_TUNDRA')=='1' or os.environ.get('VULPES_TEST_INPUT')=='1' else 'false')+';window.VulpesNativeTelephony=') + ('true' if os.environ.get('VULPES_TUNDRA_RADIO') == '1' or os.environ.get('VULPES_TEST_TELEPHONY') == '1' else 'false') + ';window.VulpesNativeWifi=' + ('true' if os.environ.get('VULPES_TUNDRA_WIFI') == '1' else 'false') + ';').encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if path == "/resources/gaia_commit.txt":
            data = (revision + "\n" + commit_time + "\n").encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
            return
        # Only this non-privileged compatibility layer is exposed, never host modules.
        if path in [
            "/_vulpes/" + name
            for name in ["settings-codec.js", "gaia-compat.js", "gaia-input.js", "gaia-services.js", "gaia-styles.js", "gaia-restoration.js", "gaia-wifi.js", "desktop.css", "platform-ui.js", "gaia-camera.js"]
        ]:
            file = ROOT / "host" / path.rsplit("/", 1)[1]
        else:
            file = (root / path.lstrip("/")).resolve()
            if file.is_dir():
                file = file / "index.html"
            if not file.is_relative_to(root):
                self.send_error(403)
                return
            overrides = {
                "system.gaiamobile.org": [
                    "js/launcher.js",
                    "js/gaia_scheduler.js",
                    "js/keyboard_manager.js",
                    "js/core.js",
                    "js/rocketbar.js",
                ]
            }
            if path.lstrip("/") in overrides.get(root.name, []):
                file = (
                    ROOT
                    / "gaia/apps"
                    / root.name.removesuffix(".gaiamobile.org")
                    / path.lstrip("/")
                )
            overlay_root = (ROOT / "overrides" / root.name).resolve()
            overlay = (overlay_root / path.lstrip("/")).resolve()
            if (
                path != "/manifest.webapp"
                and overlay.is_relative_to(overlay_root)
                and overlay.is_file()
            ):
                file = overlay
        if path.startswith("/shared/"):
            common = (ROOT / "overrides" / path.lstrip("/")).resolve()
            if common.is_relative_to((ROOT / "overrides/shared").resolve()) and common.is_file():
                file = common
        if not file.is_file() and path.startswith("/shared/"):
            shared = (ROOT / "gaia" / path.lstrip("/")).resolve()
            if shared.is_relative_to((ROOT / "gaia/shared").resolve()):
                file = shared
        if not file.is_file():
            self.send_error(404)
            return
        data = file.read_bytes()
        mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        if file.suffix in (".html", ".js", ".css", ".json", ".webapp", ".properties", ".svg"):
            text = translate(data.decode("utf-8"))
            if file.suffix in (".css", ".js", ".html"):
                text = (
                    text.replace("-moz-calc(", "calc(")
                    .replace("-moz-box-sizing:", "box-sizing:")
                    .replace("-moz-plaintext", "plaintext")
                    .replace(":-moz-dir(", ":dir(")
                    .replace("offset-inline-start:", "inset-inline-start:")
                    .replace("offset-inline-end:", "inset-inline-end:")
                )
            data = text.encode("utf-8")
        if root.name == "music.gaiamobile.org" and file.suffix == ".js":
            data = data.replace(b"audio.src=null;", b"audio.removeAttribute('src');")
        if file.suffix == ".html" and root in LEGACY_ROOTS:
            data = data.replace(
                b"<head>",
                b'<head><script src="/_vulpes/settings-codec.js"></script><script src="/_vulpes/gaia-compat.js"></script><script src="/_vulpes/gaia-wifi.js"></script><script src="/_vulpes/gaia-input.js"></script><script src="/_vulpes/gaia-services.js"></script>',
                1,
            )
        elif file.suffix == ".html" and not (root.name == "search.gaiamobile.org" and path.startswith("/home/")):
            data = data.replace(
                b"<head>",
                b'<head><script src="/_vulpes/platform-config.js"></script><link rel="stylesheet" href="/_vulpes/desktop.css"><script src="/_vulpes/settings-codec.js"></script><script src="/_vulpes/gaia-compat.js"></script><script src="/_vulpes/gaia-wifi.js"></script><script src="/_vulpes/gaia-input.js"></script><script src="/_vulpes/gaia-services.js"></script><script src="/_vulpes/gaia-styles.js"></script><script src="/_vulpes/gaia-restoration.js"></script><script src="/_vulpes/platform-ui.js"></script><script src="/_vulpes/gaia-camera.js"></script>',
                1,
            )
        if (
            file.suffix == ".html"
            and root.name == "communications.gaiamobile.org"
            and "/dialer/" in path
        ):
            data = data.replace(
                b"<head>", b'<head><script src="/shared/js/accessibility_helper.js"></script>', 1
            )
        self.send_response(200)
        self.send_header(
            "Content-Type", mime + ("; charset=utf-8" if mime.startswith("text/") else "")
        )
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        # Installed Gaia code may use its legacy module compiler, but must not
        # gain privileged host rights through inline or remote script injection.
        self.send_header(
            "Content-Security-Policy",
            "script-src 'self' 'unsafe-eval'; object-src 'none'; "
            "base-uri 'self'; worker-src 'self' blob:; "
            f"frame-ancestors http://*.localhost:{args.port}",
        )
        origin = self.headers.get("Origin", "")
        if urlsplit(origin).netloc in ORIGINS and origin.startswith("http://"):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *values):
        if values and str(values[1]) not in ("200", "304"):
            super().log_message(fmt, *values)


server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
print(f"Gaia: {len(REGISTRY)} applications; 127.0.0.1:{args.port}", flush=True)
server.serve_forever()
