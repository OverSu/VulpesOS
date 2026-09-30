#!/usr/bin/env python3
"""Fetch three pinned historical packages and extract byte-identical test copies."""
import hashlib
import json
from pathlib import Path
import stat
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "tests/legacy-apps.json").read_text())
BASE = ROOT / "downloads/legacy-apps"
BASE.mkdir(parents=True, exist_ok=True)
(BASE / "apps").mkdir(exist_ok=True)
for app in CATALOG:
    archive = BASE / app["archive"]
    if not archive.exists():
        with urllib.request.urlopen(app["url"], timeout=30) as response:
            data = response.read(10 * 1024 * 1024 + 1)
        if len(data) > 10 * 1024 * 1024:
            raise RuntimeError("Archive too large")
        if hashlib.sha256(data).hexdigest() != app["sha256"]:
            raise RuntimeError("Archive checksum mismatch: " + app["id"])
        archive.write_bytes(data)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != app["sha256"]:
        raise RuntimeError("Archive checksum mismatch: " + app["id"])
    destination = BASE / "apps" / app["id"]
    with zipfile.ZipFile(archive) as package:
        if sum(info.file_size for info in package.infolist()) > 50 * 1024 * 1024:
            raise RuntimeError("Extracted package too large")
        manifest = json.loads(package.read("manifest.webapp"))
        if manifest.get("type", "web") not in ("web", "privileged"):
            raise RuntimeError("Only web and reviewed privileged packages are allowed")
        for info in package.infolist():
            name = Path(info.filename)
            if (
                name.is_absolute()
                or ".." in name.parts
                or "\\" in info.filename
                or stat.S_ISLNK(info.external_attr >> 16)
            ):
                raise RuntimeError("Unsafe archive entry: " + info.filename)
        if not destination.exists():
            with tempfile.TemporaryDirectory(dir=BASE / "apps") as temporary:
                stage = Path(temporary) / "package"
                stage.mkdir()
                package.extractall(stage)
                stage.rename(destination)
        for info in package.infolist():
            if not info.is_dir() and (destination / info.filename).read_bytes() != package.read(
                info
            ):
                raise RuntimeError("Extracted app was modified: " + app["id"] + "/" + info.filename)
    print(app["id"] + ": archive SHA256 and extracted files verified", flush=True)
