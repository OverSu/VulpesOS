#!/usr/bin/env python3
"""Download a checked engine archive into an isolated installation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def read_url(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read()


def install(lock, offline=False):
    version = lock["version"]
    archive = ROOT / "downloads" / Path(lock["archive"]).name
    target = ROOT / "engines" / version
    if target.exists():
        metadata_path = target / "engine.json"
        if not metadata_path.is_file() or not (target / "firefox/firefox").is_file():
            raise RuntimeError(f"Incomplete engine installation left untouched: {target}")
        existing = json.loads(metadata_path.read_text())
        if existing.get("version") != version or existing.get("sha512") != lock["sha512"]:
            raise RuntimeError(f"Existing engine metadata differs from the lock: {target}")
        return
    if not archive.exists():
        if offline:
            raise RuntimeError(f"Cached archive missing: {archive}")
        partial = archive.with_suffix(archive.suffix + ".partial")
        with (
            urllib.request.urlopen(lock["archive"], timeout=60) as response,
            partial.open("wb") as out,
        ):
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        partial.replace(archive)
    with archive.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha512").hexdigest()
    if digest != lock["sha512"]:
        raise RuntimeError(f"SHA512 mismatch; archive not extracted: {archive}")
    with tempfile.TemporaryDirectory(prefix=".fetch-", dir=ROOT / "engines") as temporary:
        stage = Path(temporary)
        with tarfile.open(archive) as package:
            package.extractall(stage, filter="data")
        if not (stage / "firefox/firefox").is_file():
            raise RuntimeError("Firefox executable missing from the archive")
        distribution = stage / "firefox/distribution"
        distribution.mkdir(exist_ok=True)
        policies = {"policies": {"DisableAppUpdate": True, "DontCheckDefaultBrowser": True}}
        (distribution / "policies.json").write_text(json.dumps(policies, indent=2) + "\n")
        (stage / "engine.json").write_text(json.dumps(lock, indent=2) + "\n")
        stage.rename(target)


def main():
    parser = argparse.ArgumentParser()
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument(
        "--locked",
        action="store_true",
        help="Install engine-lock.json without changing the candidate",
    )
    choice.add_argument(
        "--version", help="Exact candidate release; otherwise fetch the latest stable release"
    )
    parser.add_argument(
        "--offline", action="store_true", help="With --locked, use the local archive cache only"
    )
    args = parser.parse_args()
    if args.offline and not args.locked:
        parser.error("--offline requires --locked")
    for name in ["downloads", "engines"]:
        (ROOT / name).mkdir(exist_ok=True)
    if args.locked:
        lock = json.loads((ROOT / "engine-lock.json").read_text())
    else:
        version = args.version
        if not version:
            metadata = json.loads(
                read_url("https://product-details.mozilla.org/1.0/firefox_versions.json")
            )
            version = metadata["LATEST_FIREFOX_VERSION"]
            (ROOT / "downloads/firefox_versions.json").write_text(
                json.dumps(metadata, indent=2) + "\n"
            )
        if not re.fullmatch(r"\d+\.\d+(?:\.\d+)?(?:esr)?", version):
            raise RuntimeError("Unsupported release identifier")
        base = "https://archive.mozilla.org/pub/firefox/releases/" + version + "/"
        relative = f"linux-x86_64/en-US/firefox-{version}.tar.xz"
        sums = read_url(base + "SHA512SUMS").decode()
        (ROOT / "downloads" / ("SHA512SUMS-" + version)).write_text(sums)
        expected = next(
            (
                line.split()[0]
                for line in sums.splitlines()
                if len(line.split()) == 2 and line.split()[1].lstrip("*") == relative
            ),
            None,
        )
        if not expected:
            raise RuntimeError("Archive not listed in official SHA512SUMS")
        lock = {
            "version": version,
            "runtime": f"engines/{version}/firefox",
            "archive": base + relative,
            "sha512": expected,
            "checksumSource": base + "SHA512SUMS",
            "channel": "release",
            "sourceArchive": base + f"source/firefox-{version}.source.tar.xz",
            "localChanges": ["distribution/policies.json: pin engine; no automatic update"],
            "gaiaPorted": False,
        }
    if not re.fullmatch(r"\d+\.\d+(?:\.\d+)?(?:esr)?", lock["version"]):
        raise RuntimeError("Unsupported release identifier in lock")
    if lock["runtime"] != f'engines/{lock["version"]}/firefox':
        raise RuntimeError("Runtime path does not match the locked version")
    install(lock, args.offline)
    if not args.locked:
        with tempfile.NamedTemporaryFile("w", dir=ROOT, delete=False) as output:
            json.dump(lock, output, indent=2)
            output.write("\n")
            temporary = output.name
        os.replace(temporary, ROOT / "candidate-engine.json")
    print(json.dumps(lock, indent=2), flush=True)


if __name__ == "__main__":
    main()
