#!/usr/bin/env python3
"""Review files eligible for publication without changing the Git index."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = [
    "profiles/",
    "engines/",
    "downloads/",
    "logs/",
    "node_modules/",
    ".venv/",
    "android/toolchain/",
    "android/keys/",
    "android/.gradle/",
    "android/build/",
    "android/app/build/",
    "android/app/src/main/assets/",
    "android/dist/",
    "android/logs/",
]
GENERATED = {
    "assets/registry.json",
    "assets/build-info.json",
    "assets/settings-current-defaults.json",
    "assets/webapps/webapps.json",
    "android/local.properties",
}


def publication_files():
    output = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    )
    return sorted(set(output.decode().split("\0")) - {""})


def audit():
    files = publication_files()
    errors = []
    size = 0
    for name in files:
        path = ROOT / name
        if name in GENERATED or any(name.startswith(prefix) for prefix in EXCLUDED):
            errors.append("Generated/private file eligible for publication: " + name)
        if path.suffix.lower() in {".keystore", ".jks", ".p12", ".pfx"} or path.name in {
            ".env",
            "id_rsa",
            "id_ed25519",
        }:
            errors.append("Possible credential file: " + name)
        if path.is_symlink() and not path.resolve().is_relative_to(ROOT):
            errors.append("Symlink outside the repository: " + name)
        if not path.exists():
            errors.append("Tracked file missing: " + name)
            continue
        if path.is_file():
            size += path.stat().st_size
        if (
            name.startswith(("tools/", "host/", "services/", "adapters/", "android/tools/"))
            and path.suffix in {".py", ".js", ".mjs", ".sh"}
            and path.name != Path(__file__).name
        ):
            text = path.read_text()
            if (
                "/mnt/BIGDATATWO/" in text
                or "/home/archiviste/" in text
                or "versions/2.7-gecko52/" in text
            ):
                errors.append("Private workspace dependency: " + name)
    ignored_probes = [
        "android/keys/preview.keystore",
        "android/local.properties",
        "profiles/example/cookies.sqlite",
        "android/dist/example.apk",
        "logs/example.log",
    ]
    for name in ignored_probes:
        result = subprocess.run(["git", "check-ignore", "-q", name], cwd=ROOT)
        if result.returncode != 0:
            errors.append("Missing ignore rule: " + name)
    report = {
        "eligibleFiles": len(files),
        "sizeMiB": round(size / 1024**2, 1),
        "errors": errors,
        "scope": "Working tree paths and first-party code; not a full history secret scan.",
    }
    print(json.dumps(report, indent=2))
    return bool(errors)


if __name__ == "__main__":
    sys.exit(audit())
