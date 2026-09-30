#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Tundra source inventory and stage-zero builds. Does not flash devices."""
import argparse
import base64
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import stat
import struct
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES = (
    "capyloon-b2g", "capyloon-manifests", "capyloon-gonk-misc",
    "b2gos-sargo", "ubports-sargo", "aosp-mkbootimg",
)


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def save(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    temp.replace(path)


def run(argv, **kwargs):
    return subprocess.run([str(x) for x in argv], check=True, **kwargs)


def output(argv, **kwargs):
    return run(argv, capture_output=True, text=True, **kwargs).stdout.strip()


def locked(name):
    lock = json.loads((ROOT / "manifests/sources.lock.json").read_text())
    return next(x for x in lock["sources"] if x["name"] == name)


def checked_source(name):
    entry = locked(name)
    path = ROOT / "sources" / name
    if output(["git", "-C", path, "rev-parse", "HEAD"]) != entry["commit"]:
        raise ValueError(f"Wrong revision: {path}")
    if output(["git", "-C", path, "status", "--porcelain"]):
        raise ValueError(f"Modified upstream reference: {path}; preserve changes separately")
    return path


def fetch(args):
    for name in args.names or DEFAULT_SOURCES:
        entry = locked(name)
        path = ROOT / "sources" / name
        if not path.exists():
            run(["git", "init", "--quiet", path])
            run(["git", "-C", path, "remote", "add", "origin", entry["url"]])
        if output(["git", "-C", path, "status", "--porcelain"]):
            raise ValueError(f"Working tree has changes: {path}")
        if output(["git", "-C", path, "remote", "get-url", "origin"]) != entry["url"]:
            raise ValueError(f"Unexpected source URL: {path}")
        run(["git", "-C", path, "fetch", "--depth=1", "origin", entry["commit"]], timeout=600)
        run(["git", "-C", path, "checkout", "--quiet", "--detach", entry["commit"]])
        checked_source(name)
        print(f"{name}: {entry['commit']}", flush=True)


def inventory(_args):
    info = {
        "recordedAt": now(), "platform": platform.platform(),
        "cpuCount": os.cpu_count(), "diskFreeBytes": shutil.disk_usage(ROOT).free,
        "memory": Path("/proc/meminfo").read_text(),
        "kvmAccessible": os.access("/dev/kvm", os.R_OK | os.W_OK),
        "tools": {x: shutil.which(x) for x in (
            "git", "repo", "python3", "gcc", "clang", "ld.lld", "rustc",
            "make", "ninja", "cpio", "lz4", "qemu-system-x86_64",
            "qemu-system-aarch64", "adb", "fastboot", "docker",
        )},
        "sharedVulpes": str(ROOT.parent),
        "sourceLockSha256": digest(ROOT / "manifests/sources.lock.json"),
        "sourcesPresent": {},
        "hardwareConnected": "not probed; no device access during preparation",
    }
    for source in json.loads((ROOT / "manifests/sources.lock.json").read_text())["sources"]:
        path = ROOT / "sources" / source["name"]
        info["sourcesPresent"][source["name"]] = path.exists()
    save(ROOT / "logs/inventory.json", info)
    print(json.dumps({k: v for k, v in info.items() if k != "memory"}, indent=2))


def flatten_manifest(folder, filename):
    """Expand includes without executing upstream scripts or fetching projects."""
    elements = []
    active = set()

    def visit(name):
        target = (folder / name).resolve()
        if not target.is_relative_to(folder.resolve()) or target in active:
            raise ValueError(f"Invalid manifest include: {name}")
        active.add(target)
        for item in ET.parse(target).getroot():
            if item.tag == "include":
                visit(item.attrib["name"])
            else:
                elements.append(item)
        active.remove(target)

    visit(filename)
    remotes = {x.attrib["name"]: x.attrib["fetch"] for x in elements if x.tag == "remote"}
    defaults = {}
    for item in elements:
        if item.tag == "default":
            defaults.update(item.attrib)
    projects = []
    for item in elements:
        if item.tag != "project":
            continue
        attrs = item.attrib
        remote = attrs.get("remote", defaults.get("remote"))
        projects.append({
            "path": attrs.get("path", attrs["name"]),
            "url": remotes[remote].rstrip("/") + "/" + attrs["name"],
            "revision": attrs.get("revision", defaults.get("revision")),
        })
    return projects


def audit(_args):
    folder = checked_source("capyloon-manifests")
    projects = flatten_manifest(folder, "sargo.xml")
    paths = [x["path"] for x in projects]
    if len(paths) != len(set(paths)):
        raise ValueError("Duplicate project paths in upstream manifest")
    report = {
        "recordedAt": now(), "manifestCommit": locked("capyloon-manifests")["commit"],
        "projectCount": len(projects), "projects": projects,
        "warning": "Expanded inventory only: upstream branch refs are NOT a resolved full build lock.",
        "geckoReferenceMilestone": json.loads((ROOT / "manifests/engine-reference.json").read_text())["milestone"],
        "vulpesEngine": json.loads((ROOT.parent / "release.json").read_text()),
        "firmwareFamilies": {"capyloon": "Android 10 QQ3A.200805.001", "ubportsPublished": "Android 9 PQ3B.190801.002"},
        "automaticFlashAllowed": False,
    }
    save(ROOT / "out/sargo/source-audit.json", report)
    print(f"{len(projects)} upstream projects inventoried. No repo sync or flash performed.")


def cpio(entries):
    """Create deterministic newc, including device nodes, without root privileges."""
    result = bytearray()
    for ino, (name, mode, data, major, minor) in enumerate(entries + [("TRAILER!!!", 0, b"", 0, 0)], 1):
        if name.startswith("/") or ".." in Path(name).parts:
            raise ValueError("Unsafe archive path")
        filename = name.encode() + b"\0"
        fields = (ino, mode, 0, 0, 2 if stat.S_ISDIR(mode) else 1, 0,
                  len(data), 0, 0, major, minor, len(filename), 0)
        result.extend(b"070701" + b"".join(f"{v:08x}".encode() for v in fields))
        result.extend(filename)
        result.extend(b"\0" * (-len(result) % 4))
        result.extend(data)
        result.extend(b"\0" * (-len(result) % 4))
    result.extend(b"\0" * (-len(result) % 512))
    return gzip.compress(bytes(result), mtime=0)


def linker():
    explicit = os.environ.get("TUNDRA_LD")
    if explicit:
        return Path(explicit).resolve()
    if shutil.which("ld.lld"):
        return Path(shutil.which("ld.lld"))
    for path in sorted((Path.home() / ".rustup/toolchains").glob("*/lib/rustlib/x86_64-unknown-linux-gnu/bin/rust-lld")):
        alias = ROOT / "out/toolchain/ld.lld"
        alias.parent.mkdir(parents=True, exist_ok=True)
        if alias.is_symlink():
            alias.unlink()
        alias.symlink_to(path)
        return alias
    raise ValueError("Need ld.lld, or TUNDRA_LD pointing to an LLVM linker")


def build_init(arch):
    folder = ROOT / "out" / ("qemu-x86_64" if arch == "x86_64" else "sargo-stage0")
    folder.mkdir(parents=True, exist_ok=True)
    common = ["-Os", "-ffreestanding", "-fno-builtin", "-fno-stack-protector",
              "-fno-pie", "-fno-unwind-tables", "-fno-asynchronous-unwind-tables",
              "-Wall", "-Wextra", "-Werror", "-nostdlib", "-static"]
    if arch == "x86_64":
        cmd = ["gcc", *common, "-no-pie", "-mgeneral-regs-only", "-Wl,--build-id=none",
               "-Wl,-e,_start", ROOT / "boot/init.c", "-o", folder / "init"]
    else:
        ld = linker()
        flavor = ["-Wl,-flavor,gnu"] if ld.name == "rust-lld" else []
        cmd = ["clang", "--target=aarch64-linux-gnu", *common,
               f"--ld-path={ld}", *flavor, "-Wl,--build-id=none", "-Wl,-e,_start",
               ROOT / "boot/init.c", "-o", folder / "init"]
    run(cmd)
    binary = (folder / "init").read_bytes()
    expected = 62 if arch == "x86_64" else 183
    if binary[:4] != b"\x7fELF" or struct.unpack_from("<H", binary, 18)[0] != expected:
        raise ValueError("Wrong ELF architecture")
    entries = [(p, stat.S_IFDIR | 0o755, b"", 0, 0) for p in ("dev", "proc", "sys")]
    entries += [("dev/console", stat.S_IFCHR | 0o600, b"", 5, 1),
                ("init", stat.S_IFREG | 0o755, binary, 0, 0)]
    (folder / "initramfs.cpio.gz").write_bytes(cpio(entries))
    save(folder / "build.json", {
        "recordedAt": now(), "architecture": arch, "kind": "stage-zero-diagnostic",
        "sourceSha256": digest(ROOT / "boot/init.c"), "compilerCommand": [str(x) for x in cmd],
        "compilerVersion": output([cmd[0], "--version"]),
        "initSha256": digest(folder / "init"),
        "ramdiskSha256": digest(folder / "initramfs.cpio.gz"),
        "geckoIncluded": False, "gaiaIncluded": False, "flashReady": False,
    })
    return folder


def vm(args):
    folder = build_init("x86_64")
    kernel = Path(args.kernel).resolve()
    if not kernel.is_file():
        raise ValueError(f"Missing kernel: {kernel}")
    cmd = ["qemu-system-x86_64", "-machine", "q35", "-m", "512M", "-smp", "1",
           "-accel", "kvm" if os.access("/dev/kvm", os.R_OK | os.W_OK) else "tcg",
           "-kernel", kernel, "-initrd", folder / "initramfs.cpio.gz",
           "-append", "console=ttyS0 rdinit=/init panic=-1 tundra.selftest=1",
           "-nodefaults", "-no-user-config", "-display", "none", "-serial", "stdio", "-no-reboot"]
    log = ROOT / "logs/qemu-stage0.log"
    passed = False
    timed_out = False
    with log.open("w") as stream:
        try:
            result = subprocess.run([str(x) for x in cmd], stdout=stream, stderr=subprocess.STDOUT, timeout=60)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = None
            timed_out = True
    text = log.read_text()
    passed = code == 0 and "TUNDRA_STAGE0_OK" in text and "TUNDRA_STAGE0_POWEROFF" in text and "TUNDRA_STAGE0_FAILED" not in text
    save(folder / "validation.json", {
        "recordedAt": now(), "passed": passed, "returncode": code, "timedOut": timed_out,
        "command": [str(x) for x in cmd], "kernelSha256": digest(kernel),
        "ramdiskSha256": digest(folder / "initramfs.cpio.gz"),
        "scope": "x86_64 diagnostic init only; no Pixel hardware, HAL, Gecko or Gaia",
        "log": str(log),
    })
    print("\n".join(x for x in text.splitlines() if "TUNDRA" in x))
    if not passed:
        raise ValueError(f"VM boot failed. See {log}")


def kernel_files():
    source = locked("aosp-sargo-kernel")
    folder = ROOT / "downloads" / source["name"] / source["commit"]
    folder.mkdir(parents=True, exist_ok=True)
    url = f"{source['url']}/+/{source['commit']}/?format=JSON"
    tree = json.loads(urllib.request.urlopen(url, timeout=60).read()[4:])
    records = []
    for name in ("Image.lz4-dtb", "dtbo.img"):
        entry = next(x for x in tree["entries"] if x["name"] == name)
        path = folder / name
        if not path.exists():
            request = f"{source['url']}/+/{source['commit']}/{name}?format=TEXT"
            data = base64.b64decode(urllib.request.urlopen(request, timeout=180).read(), validate=True)
            if hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() != entry["id"]:
                raise ValueError("Git object hash mismatch")
            path.write_bytes(data)
        data = path.read_bytes()
        if hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() != entry["id"]:
            raise ValueError(f"Corrupt prebuilt: {path}")
        records.append({"file": name, "gitBlob": entry["id"], "sha256": digest(path)})
    save(folder / "provenance.json", {"source": source, "files": records, "recordedAt": now()})
    return folder


def sargo(_args):
    folder = build_init("aarch64")
    kernel = kernel_files()
    packager = checked_source("aosp-mkbootimg") / "mkbootimg.py"
    board = json.loads((ROOT / "devices/sargo/device.json").read_text())
    boot = board["diagnosticBoot"]
    image = folder / "tundra-sargo-stage0-NOT-FOR-FLASHING.img"
    cmd = [sys.executable, packager, "--kernel", kernel / "Image.lz4-dtb",
           "--ramdisk", folder / "initramfs.cpio.gz", "--header_version", str(boot["headerVersion"]),
           "--pagesize", str(boot["pageSize"]), "--base", boot["base"],
           "--kernel_offset", boot["kernelOffset"], "--ramdisk_offset", boot["ramdiskOffset"],
           "--tags_offset", boot["tagsOffset"], "--cmdline", boot["cmdline"], "-o", image]
    run(cmd)
    header = image.read_bytes()[:1648]
    fields = struct.unpack_from("<10I", header, 8)
    if header[:8] != b"ANDROID!" or fields[7] != boot["pageSize"] or fields[8] != boot["headerVersion"]:
        raise ValueError("Unexpected Android boot header")
    if image.stat().st_size > boot["partitionSizeBytes"]:
        raise ValueError("Image exceeds reference boot partition")
    report = {
        "recordedAt": now(), "file": image.name, "sha256": digest(image),
        "bytes": image.stat().st_size, "headerVersion": fields[8], "pageSize": fields[7],
        "kernelSize": fields[0], "ramdiskSize": fields[2], "kernelSource": locked("aosp-sargo-kernel"),
        "initSourceSha256": digest(ROOT / "boot/init.c"),
        "initSha256": digest(folder / "init"),
        "ramdiskSha256": digest(folder / "initramfs.cpio.gz"),
        "kernelPrebuilt": True, "initBuiltFromSource": True, "structuralChecksPassed": True,
        "flashReady": False, "hardwareTested": False, "geckoIncluded": False, "gaiaIncluded": False,
        "blockers": ["Installed firmware/DTBO/slot layout not inventoried",
                     "No USB debug/recovery channel in this ramdisk",
                     "No hardware or ARM64 VM boot test",
                     "No graphics host, HAL integration, Gecko or Gaia"],
        "command": [str(x) for x in cmd],
    }
    save(folder / "image.json", report)
    (folder / "SHA256SUMS").write_text(f"{report['sha256']}  {image.name}\n")
    print(f"Packaged diagnostic image: {image}\nNOT ready for a device boot or flash; see image.json.")


def status(_args):
    vm_report = ROOT / "out/qemu-x86_64/validation.json"
    image_report = ROOT / "out/sargo-stage0/image.json"
    boot_source = digest(ROOT / "boot/init.c")
    vm_valid = False
    if vm_report.exists():
        info = json.loads(vm_report.read_text())
        folder = vm_report.parent
        build = json.loads((folder / "build.json").read_text())
        vm_valid = bool(info["passed"] and info["ramdiskSha256"] == digest(folder / "initramfs.cpio.gz")
                        and build["sourceSha256"] == boot_source)
    image_valid = False
    if image_report.exists():
        info = json.loads(image_report.read_text())
        build = json.loads((image_report.parent / "build.json").read_text())
        image_valid = (info["sha256"] == digest(image_report.parent / info["file"])
                       and info.get("initSourceSha256") == build["sourceSha256"] == boot_source
                       and info.get("initSha256") == digest(image_report.parent / "init")
                       and info.get("ramdiskSha256") == digest(image_report.parent / "initramfs.cpio.gz"))
    graphical = ROOT / "logs/graphical-vm-test.json"
    build_file = ROOT / "out/graphical-vm/build.json"
    gui = json.loads(graphical.read_text()) if graphical.exists() else {}
    gui_valid = bool(gui.get("passed") and gui.get("screenshot") and build_file.exists()
                     and gui.get("buildManifestSha256") == digest(build_file))
    inventory_file = ROOT / "logs/device/inventory-summary.json"
    inventory = json.loads(inventory_file.read_text()) if inventory_file.exists() else {}
    inventory_report = ROOT / inventory.get("report", "logs/device/missing")
    inventoried = bool(inventory.get("identity") == "sargo" and inventory_report.is_file()
                      and inventory.get("reportSha256") == digest(inventory_report))
    validation = json.loads((ROOT / 'VALIDATION.json').read_text())
    installed_diagnostic = validation.get('installedKernelDiagnostic', {})
    installed_image = ROOT / installed_diagnostic.get('image', 'out/missing')
    installed_image_valid = bool(installed_image.is_file() and
        installed_diagnostic.get('imageSha256') == digest(installed_image))
    trial = validation.get('droidianTrial', {})
    trial_report = ROOT / trial.get('report', 'logs/device/missing')
    trial_recorded = bool(trial_report.is_file() and trial.get('reportSha256') == digest(trial_report))
    backup = validation.get('bootBackup', {})
    backup_report = ROOT / backup.get('report', 'logs/device/missing')
    backup_verified = bool(backup.get('verified') and backup_report.is_file()
                           and backup.get('reportSha256') == digest(backup_report))
    raw_diagnostic = validation.get('rawSlotADiagnostic', {})
    raw_image = ROOT / raw_diagnostic.get('image', 'out/missing')
    raw_image_valid = bool(raw_image.is_file() and raw_diagnostic.get('imageSha256') == digest(raw_image))
    hardware = validation.get('sargoHardwareDiagnostic', {})
    hardware_report = ROOT / hardware.get('report', 'logs/device/missing')
    hardware_passed = bool(raw_image_valid and hardware.get('passed')
        and hardware.get('imageSha256') == raw_diagnostic.get('imageSha256')
        and hardware_report.is_file() and hardware.get('reportSha256') == digest(hardware_report))
    def checked_report(name):
        item = validation.get(name, {})
        report = ROOT/item.get('report', 'logs/device/missing')
        return bool(item.get('passed') and report.is_file() and
                    item.get('reportSha256') == digest(report))
    own_session = checked_report('ownCompositorTrial')
    runtime_reference = checked_report('runtimeReference')
    print(json.dumps({
        "project": "Tundra", "phase": validation.get('phase'),
        "diagnosticVmX86Passed": vm_valid,
        "graphicalVmPassed": gui_valid,
        "geckoOnTundraVm": gui.get("engine") if gui_valid else None,
        "gaiaOnTundraVm": gui_valid,
        "usbVirtualControllerPassed": gui_valid and gui.get("usb", {}).get("passed", False),
        "sargoDiagnosticImageIntegrity": image_valid,
        "installedKernelDiagnosticIntegrity": installed_image_valid,
        "rawBootBackupQualificationRecorded": backup_verified,
        "rawSlotADiagnosticIntegrity": raw_image_valid,
        "sargoInventoried": inventoried,
        "installedSystem": inventory.get("os") if inventoried else None,
        "droidianTrialEngine": trial.get('engineVersion') if trial_recorded else None,
        "droidianTrialGaiaPassed": trial_recorded and trial.get('gaiaPassed', False),
        "droidianPhysicalDisplayValidated": trial_recorded and trial.get('physicalDisplayValidated', False),
        "droidianRenderer": trial.get('renderer') if trial_recorded else None,
        "droidianPhysicalTouchValidated": trial_recorded and trial.get('touchValidated', False),
        "sargoHardwareTested": hardware_passed,
        "sargoHardwareTestScope": hardware.get('scope') if hardware_passed else None,
        "ownCompositorOnDroidianPassed": own_session,
        "arm64RuntimeChrootPassed": runtime_reference,
        "sargoGeckoBoot": False,
        "flashReady": False,
        "next": ("Integrate explicit HAL mounts and the boot sequence into the separate ARM64 runtime; see docs/ROOTFS-SARGO.md"
                 if own_session and runtime_reference else
                 "Inventory the HAL/container boot dependencies for an independent graphical rootfs"
                 if hardware_passed else
                 "Run the temporary USB diagnostic from raw slot A using tools/test-sargo-boot.py; see docs/SARGO.md"
                 if backup_verified and raw_image_valid else
                 "Back up raw boot partitions using tools/backup-sargo.py; qualify physical touch, audio, camera and suspend/resume; see docs/SARGO.md"
                 if trial_recorded else "Qualify restoration and adapt diagnostic to the installed Droidian v0 boot; see docs/SARGO-INVENTORY-2026-09-24.md"
                 if inventoried else "Read-only Pixel inventory and recovery plan before a temporary diagnostic boot; see docs/SARGO.md"),
    }, indent=2))


def main():
    (ROOT / "logs").mkdir(exist_ok=True)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("inventory").set_defaults(function=inventory)
    commands.add_parser("status").set_defaults(function=status)
    p = commands.add_parser("fetch", help="Fetch pinned references; never execute their scripts")
    p.add_argument("names", nargs="*")
    p.set_defaults(function=fetch)
    commands.add_parser("audit").set_defaults(function=audit)
    p = commands.add_parser("test-vm", help="Boot diagnostic init in isolated, diskless QEMU")
    p.add_argument("--kernel", default="/boot/vmlinuz-linux")
    p.set_defaults(function=vm)
    commands.add_parser("prepare-sargo", help="Package stage-zero diagnostic; NOT a flashable Vulpes release").set_defaults(function=sargo)
    args = parser.parse_args()
    args.function(args)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, StopIteration) as error:
        sys.exit(f"Tundra: {error}")
