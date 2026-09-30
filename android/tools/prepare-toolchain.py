#!/usr/bin/env python3
"""Install the locked Linux x86_64 Android build tools in the ignored toolchain/."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "toolchain"


def fetch(name, entry):
    path = TOOLS / "downloads" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    algorithm = "sha256" if "sha256" in entry else "sha1"
    if not path.exists():
        partial = path.with_suffix(path.suffix + ".partial")
        with urllib.request.urlopen(entry["url"], timeout=60) as source, partial.open("wb") as out:
            shutil.copyfileobj(source, out)
        partial.replace(path)
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, algorithm).hexdigest()
    if digest != entry[algorithm]:
        raise RuntimeError(f"Checksum mismatch; archive left unextracted: {path}")
    return path


def extract(archive, member_root, target):
    if target.exists():
        raise RuntimeError(f"Incomplete installation left untouched: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".install-", dir=TOOLS) as temporary:
        stage = Path(temporary)
        if archive.name.endswith(".tar.gz"):
            with tarfile.open(archive) as package:
                package.extractall(stage, filter="data")
        else:
            with zipfile.ZipFile(archive) as package:
                for info in package.infolist():
                    path = stage / info.filename
                    if not path.resolve().is_relative_to(stage) or "\\" in info.filename:
                        raise RuntimeError("Unsafe toolchain archive entry")
                    if (info.external_attr >> 16) & 0o170000 == 0o120000:
                        raise RuntimeError("Symlink in toolchain ZIP archive")
                    package.extract(info, stage)
                    mode = (info.external_attr >> 16) & 0o777
                    if mode and path.is_file():
                        path.chmod(mode)
        (stage / member_root).rename(target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="Check installed tools without downloading"
    )
    args = parser.parse_args()
    if platform.system() != "Linux" or platform.machine() not in ("x86_64", "amd64"):
        raise RuntimeError("This bootstrap currently supports Linux x86_64 only")
    lock = json.loads((ROOT / "toolchain-lock.json").read_text())
    jdk = TOOLS / "jdk-21.0.12.1+1"
    gradle = TOOLS / "gradle-9.5.0"
    sdk = TOOLS / "sdk"
    installs = [
        ("jdk.tar.gz", "jdk-21.0.12.1+1", jdk, jdk / "bin/java"),
        ("gradle-9.5.zip", "gradle-9.5.0", gradle, gradle / "bin/gradle"),
        (
            "commandlinetools.zip",
            "cmdline-tools",
            sdk / "cmdline-tools/latest",
            sdk / "cmdline-tools/latest/bin/sdkmanager",
        ),
    ]
    missing = [
        str(executable.relative_to(ROOT))
        for _, _, _, executable in installs
        if not executable.is_file()
    ]
    packages = [sdk / "platforms/android-37.1/android.jar", sdk / "build-tools/37.0.0/apksigner"]
    if args.check:
        missing += [str(path.relative_to(ROOT)) for path in packages if not path.is_file()]
        if missing:
            raise RuntimeError("Missing tools: " + ", ".join(missing))
    else:
        TOOLS.mkdir(exist_ok=True)
        for name, member, target, executable in installs:
            if not executable.is_file():
                extract(fetch(name, lock["archives"][name]), member, target)
        if not all(path.is_file() for path in packages):
            env = {**os.environ, "JAVA_HOME": str(jdk)}
            manager = sdk / "cmdline-tools/latest/bin/sdkmanager"
            # sdkmanager asks the user to review any licenses not already accepted.
            subprocess.run(
                [str(manager), "--sdk_root=" + str(sdk), *lock["sdk"]], env=env, check=True
            )
    print("Android build tools available in", TOOLS)


if __name__ == "__main__":
    main()
