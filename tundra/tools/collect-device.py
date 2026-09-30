#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read-only sargo inventory. Never reboot, root, unlock, mount, push or flash."""
import argparse
import os
import re
import subprocess
import sys

from tundra import ROOT, now, save

PROPERTIES = (
    "ro.product.device", "ro.product.vendor.device", "ro.product.name",
    "ro.build.fingerprint", "ro.vendor.build.fingerprint", "ro.build.version.release",
    "ro.build.version.security_patch", "ro.boot.slot_suffix", "ro.boot.bootloader",
    "ro.boot.verifiedbootstate", "ro.boot.flash.locked", "ro.boot.hardware",
)
READS = {
    "os-release": ["cat", "/etc/os-release"],
    "kernel": ["uname", "-a"],
    "device-model": ["cat", "/proc/device-tree/model"],
    "device-compatible": ["cat", "/proc/device-tree/compatible"],
    "deviceinfo": ["cat", "/etc/deviceinfo"],
    "system-image": ["cat", "/etc/system-image/channel.ini"],
    "partitions": ["cat", "/proc/partitions"],
    "partition-links": ["ls", "-l", "/dev/disk/by-partlabel"],
    "android-partition-links": ["ls", "-l", "/dev/block/by-name"],
    "mounts": ["cat", "/proc/mounts"],
}


def capture(command):
    try:
        p = subprocess.run(command, capture_output=True, text=True, timeout=15)
        return {"returncode": p.returncode, "stdout": p.stdout[:65536], "stderr": p.stderr[:4096]}
    except subprocess.TimeoutExpired:
        return {"returncode": None, "error": "timeout"}


def identify(records):
    values = []
    for prop in ("ro.product.device", "ro.product.vendor.device"):
        result = records.get(prop, {})
        if result.get("returncode") == 0:
            values.append(result.get("stdout", "").strip())
    if "bonito" in values:
        return "wrong-device-pixel-3a-xl"
    if "sargo" in values:
        return "sargo"
    # Ubuntu Touch may have no getprop executable. Do not infer from SDM670 alone.
    result = records.get("device-model", {})
    model = result.get("stdout", "").replace("\0", "").strip() if result.get("returncode") == 0 else ""
    if model == "Google Pixel 3a":
        return "sargo-model-only"
    return "unverified"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="Explicit adb/fastboot transport serial")
    parser.add_argument("--transport", choices=("adb", "fastboot"), default="adb")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.:-]+", args.serial) or args.serial.startswith("-"):
        parser.error("Invalid device serial")
    os.umask(0o077)
    base = [args.transport, "-s", args.serial]
    records = {}
    if args.transport == "adb":
        state = capture(base + ["get-state"])
        if state.get("returncode") != 0 or state.get("stdout", "").strip() != "device":
            sys.exit("Selected device is not available/authorized; no device changes made")
        for prop in PROPERTIES:
            records[prop] = capture(base + ["shell", "getprop", prop])
        for name, command in READS.items():
            records[name] = capture(base + ["shell", *command])
        identity = identify(records)
    else:
        for name in ("product", "current-slot", "unlocked", "secure", "version-bootloader", "version-baseband"):
            records[name] = capture(base + ["getvar", name])
        product = records["product"]
        text = product.get("stdout", "") + product.get("stderr", "")
        identity = "sargo" if product.get("returncode") == 0 and re.search(r"\bproduct:\s*sargo\b", text) else "unverified"
    path = ROOT / "logs/device" / (now().replace(":", "-") + ".json")
    save(path, {"recordedAt": now(), "transport": args.transport, "identity": identity,
                "readOnly": True, "flashAuthorizedByThisReport": False, "records": records})
    print(f"Inventory: {path}\nIdentity: {identity}; firmware/partitions still require review.")
    return 0 if identity.startswith("sargo") else 2


if __name__ == "__main__":
    sys.exit(main())
