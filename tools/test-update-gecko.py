#!/usr/bin/env python3
"""Exercise activation/rollback and fail-closed qualification without a real engine."""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "updater", Path(__file__).with_name("update-gecko.py")
)
u = importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.old = {"version": "1.0", "runtime": "engines/1.0/firefox"}
        self.new = {"version": "2.0", "runtime": "engines/2.0/firefox"}
        for lock in [self.old, self.new]:
            binary = self.root / lock["runtime"] / "firefox"
            binary.parent.mkdir(parents=True)
            binary.touch()
        (self.root / "profiles/desktop-1.0").mkdir(parents=True)
        (self.root / "profiles/desktop-1.0/settings.json").write_text("user data")
        (self.root / "profiles/desktop-1.0/cache2").mkdir()
        self.report = self.root / "logs/updates/test"
        self.report.mkdir(parents=True)
        for name, value in [
            ("ROOT", self.root),
            ("ACTIVE", self.root / "engine-lock.json"),
            ("HISTORY", self.root / "logs/updates/last-activation.json"),
        ]:
            patcher = patch.object(u, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        idle = patch.object(u, "require_idle")
        idle.start()
        self.addCleanup(idle.stop)
        u.atomic_json(u.ACTIVE, self.old)

    def test_activate_then_rollback_preserves_both_profiles(self):
        u.activate(self.new, self.old, self.report)
        self.assertEqual(json.loads(u.ACTIVE.read_text()), self.new)
        self.assertEqual(
            (self.root / "profiles/desktop-2.0/settings.json").read_text(), "user data"
        )
        self.assertFalse((self.root / "profiles/desktop-2.0/cache2").exists())
        (self.root / "profiles/desktop-2.0/settings.json").write_text("new data")
        u.rollback()
        self.assertEqual(json.loads(u.ACTIVE.read_text()), self.old)
        self.assertEqual(
            (self.root / "profiles/desktop-1.0/settings.json").read_text(), "user data"
        )
        self.assertEqual((self.root / "profiles/desktop-2.0/settings.json").read_text(), "new data")

    def test_stale_reboot_marker_does_not_block_copy(self):
        source = self.root / "profiles/desktop-1.0"
        (source / "lock").symlink_to("127.0.0.1:+99999999")
        u.activate(self.new, self.old, self.report)
        self.assertTrue((source / "lock").is_symlink())
        self.assertFalse((self.root / "profiles/desktop-2.0/lock").is_symlink())
        self.assertEqual(json.loads(u.ACTIVE.read_text()), self.new)

    def test_live_native_profile_lock_prevents_copy(self):
        lock = self.root / "profiles/desktop-1.0/.parentlock"
        code = "import fcntl,sys; f=open(sys.argv[1],'w'); fcntl.lockf(f,fcntl.LOCK_EX); print('locked',flush=True); sys.stdin.read()"
        child = subprocess.Popen(
            [sys.executable, "-c", code, str(lock)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
        )
        try:
            self.assertEqual(child.stdout.readline().strip(), "locked")
            with self.assertRaises(RuntimeError):
                u.activate(self.new, self.old, self.report)
            self.assertEqual(json.loads(u.ACTIVE.read_text()), self.old)
            self.assertFalse((self.root / "profiles/desktop-2.0").exists())
        finally:
            child.communicate(timeout=5)

    def test_existing_destination_is_never_overwritten(self):
        (self.root / "profiles/desktop-2.0").mkdir()
        with self.assertRaises(RuntimeError):
            u.activate(self.new, self.old, self.report)
        self.assertEqual(json.loads(u.ACTIVE.read_text()), self.old)

    def test_changed_active_lock_is_not_overwritten(self):
        u.atomic_json(u.ACTIVE, {"version": "other"})
        with self.assertRaises(RuntimeError):
            u.activate(self.new, self.old, self.report)
        self.assertEqual(json.loads(u.ACTIVE.read_text()), {"version": "other"})

    def test_failed_check_cannot_promote_or_reuse_stale_result(self):
        (self.root / "logs/engine-capabilities.json").write_text('{"old":true}')

        def run(command, **kwargs):
            if command[1].endswith("fetch-engine.py"):
                u.atomic_json(self.root / "candidate-engine.json", self.new)
                return type("Result", (), {"returncode": 0})()
            return type("Result", (), {"returncode": 1})()

        with (
            patch("sys.argv", ["update-gecko.py", "--apply"]),
            patch.object(u.shutil, "which", return_value="/tool"),
            patch.object(u.subprocess, "run", side_effect=run),
        ):
            with self.assertRaises(RuntimeError):
                u.main()
        self.assertEqual(json.loads(u.ACTIVE.read_text()), self.old)
        self.assertFalse((self.root / "logs/engine-capabilities.json").exists())
        reports = list((self.root / "logs/updates").glob("*/report.json"))
        self.assertEqual(json.loads(reports[0].read_text())["status"], "failed")


if __name__ == "__main__":
    unittest.main()
