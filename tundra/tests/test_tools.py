# SPDX-License-Identifier: MPL-2.0
import gzip
import importlib.util
import json
from pathlib import Path
import stat
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import tundra

spec = importlib.util.spec_from_file_location("collector", tundra.ROOT / "tools/collect-device.py")
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class PackagingTests(unittest.TestCase):
    def test_cpio_roundtrip_and_reproducibility(self):
        entries = [("dev", stat.S_IFDIR | 0o755, b"", 0, 0),
                   ("dev/console", stat.S_IFCHR | 0o600, b"", 5, 1),
                   ("init", stat.S_IFREG | 0o755, b"init-payload", 0, 0)]
        a = tundra.cpio(entries)
        self.assertEqual(a, tundra.cpio(entries))
        data = gzip.decompress(a)
        cursor = 0
        decoded = {}
        while True:
            self.assertEqual(data[cursor:cursor + 6], b"070701")
            fields = [int(data[cursor + 6 + 8 * n:cursor + 14 + 8 * n], 16) for n in range(13)]
            cursor += 110
            name = data[cursor:cursor + fields[11] - 1].decode()
            cursor = (cursor + fields[11] + 3) & ~3
            payload = data[cursor:cursor + fields[6]]
            cursor = (cursor + fields[6] + 3) & ~3
            if name == "TRAILER!!!":
                break
            decoded[name] = (fields, payload)
        self.assertEqual(decoded["init"][1], b"init-payload")
        self.assertEqual(decoded["dev/console"][0][9:11], [5, 1])
        self.assertEqual(decoded["init"][0][1], stat.S_IFREG | 0o755)
        # Independent parser: GNU cpio, never extract a device node onto the host.
        p = subprocess.run(["cpio", "-it"], input=data, capture_output=True, check=True)
        self.assertIn(b"dev/console", p.stdout)
        self.assertIn(b"init", p.stdout)

    def test_cpio_rejects_escape(self):
        for name in ("/init", "../init", "dev/../../init"):
            with self.assertRaises(ValueError):
                tundra.cpio([(name, stat.S_IFREG | 0o755, b"", 0, 0)])

    def test_manifest_inheritance_and_cycle(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "main.xml").write_text('<manifest><remote name="a" fetch="https://example.org/"/><default remote="a" revision="tag"/><include name="sub.xml"/></manifest>')
            (root / "sub.xml").write_text('<manifest><project name="kernel" path="src/kernel"/></manifest>')
            self.assertEqual(tundra.flatten_manifest(root, "main.xml"),
                             [{"path": "src/kernel", "url": "https://example.org/kernel", "revision": "tag"}])
            (root / "sub.xml").write_text('<manifest><include name="main.xml"/></manifest>')
            with self.assertRaises(ValueError):
                tundra.flatten_manifest(root, "main.xml")

    def test_sargo_boot_roundtrip(self):
        folder = tundra.ROOT / "out/sargo-stage0"
        metadata_file = folder / "image.json"
        if not metadata_file.exists():
            self.skipTest("Run ./tundra prepare-sargo first")
        info = json.loads(metadata_file.read_text())
        image = folder / info["file"]
        self.assertEqual(tundra.digest(image), info["sha256"])
        self.assertFalse(info["flashReady"])
        with tempfile.TemporaryDirectory() as d:
            subprocess.run([sys.executable, str(tundra.checked_source("aosp-mkbootimg") / "unpack_bootimg.py"),
                            "--boot_img", str(image), "--out", d], check=True, capture_output=True)
            self.assertEqual((Path(d) / "ramdisk").read_bytes(), (folder / "initramfs.cpio.gz").read_bytes())
            kernel = tundra.ROOT / "downloads/aosp-sargo-kernel" / info["kernelSource"]["commit"] / "Image.lz4-dtb"
            self.assertEqual(tundra.digest(Path(d) / "kernel"), tundra.digest(kernel))
        self.assertEqual(struct.unpack_from("<H", (folder / "init").read_bytes(), 18)[0], 183)

    def test_diagnostic_refuses_host_execution(self):
        binary = tundra.ROOT / "out/qemu-x86_64/init"
        if not binary.exists():
            self.skipTest("Run ./tundra test-vm first")
        p = subprocess.run([str(binary)], capture_output=True, timeout=3)
        self.assertEqual(p.returncode, 2)
        self.assertIn(b"only run as PID 1", p.stdout)


class CollectorTests(unittest.TestCase):
    def test_reject_wrong_device(self):
        result = lambda x: {"returncode": 0, "stdout": x}
        self.assertEqual(collector.identify({"ro.product.device": result("bonito")}), "wrong-device-pixel-3a-xl")
        self.assertEqual(collector.identify({"ro.product.device": result("sargo")}), "sargo")
        self.assertEqual(collector.identify({"device-model": result("Google Pixel 3a\0")}), "sargo-model-only")
        self.assertEqual(collector.identify({"device-model": result("Qualcomm SDM670")}), "unverified")
        self.assertEqual(collector.identify({"device-model": {"returncode": 1, "stdout": "Google Pixel 3a"}}), "unverified")

    def test_collection_is_read_only_and_selects_transport(self):
        commands = []

        def capture(command):
            commands.append(command)
            value = "device" if command[-1] == "get-state" else "sargo" if command[-1] == "ro.product.device" else ""
            return {"returncode": 0, "stdout": value, "stderr": ""}

        with patch.object(sys, "argv", ["collect", "--serial", "TEST123"]), \
             patch.object(collector, "capture", side_effect=capture), \
             patch.object(collector, "save") as save, patch.object(collector.os, "umask"):
            self.assertEqual(collector.main(), 0)
        self.assertTrue(save.call_args.args[1]["readOnly"])
        self.assertFalse(save.call_args.args[1]["flashAuthorizedByThisReport"])
        for command in commands:
            self.assertEqual(command[:3], ["adb", "-s", "TEST123"])
            self.assertIn(command[3], ("get-state", "shell"))
            if command[3] == "shell":
                self.assertIn(command[4], ("getprop", "cat", "uname", "ls"))
            self.assertTrue(set(command).isdisjoint({"reboot", "root", "push", "flash", "erase", "mount", "unlock"}))

    def test_unauthorized_device_is_not_queried(self):
        with patch.object(sys, "argv", ["collect", "--serial", "TEST123"]), \
             patch.object(collector, "capture", return_value={"returncode": 1}) as capture, \
             patch.object(collector, "save") as save, patch.object(collector.os, "umask"):
            with self.assertRaises(SystemExit):
                collector.main()
        self.assertEqual(capture.call_count, 1)
        save.assert_not_called()


if __name__ == "__main__":
    unittest.main()
