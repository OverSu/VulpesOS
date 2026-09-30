#!/usr/bin/env python3
"""Exercise a locked installation using a small local archive, without network access."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest


class LockedEngineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "tools").mkdir()
        (self.root / "downloads").mkdir()
        shutil.copy2(
            Path(__file__).with_name("fetch-engine.py"), self.root / "tools/fetch-engine.py"
        )
        self.archive = self.root / "downloads/firefox-1.0.tar.xz"
        with tarfile.open(self.archive, "w:xz") as package:
            content = b"#!/bin/sh\nexit 0\n"
            member = tarfile.TarInfo("firefox/firefox")
            member.mode = 0o755
            member.size = len(content)
            package.addfile(member, io.BytesIO(content))
        self.lock = {
            "version": "1.0",
            "runtime": "engines/1.0/firefox",
            "archive": "https://example.invalid/firefox-1.0.tar.xz",
            "sha512": hashlib.sha512(self.archive.read_bytes()).hexdigest(),
        }
        (self.root / "engine-lock.json").write_text(json.dumps(self.lock))
        (self.root / "candidate-engine.json").write_text("existing candidate\n")

    def run_installer(self):
        return subprocess.run(
            [sys.executable, "tools/fetch-engine.py", "--locked", "--offline"],
            cwd=self.root,
            capture_output=True,
            text=True,
        )

    def test_install_and_repeat_preserve_candidate_and_runtime(self):
        self.assertEqual(self.run_installer().returncode, 0)
        binary = self.root / "engines/1.0/firefox/firefox"
        self.assertTrue(binary.is_file())
        self.assertTrue(binary.stat().st_mode & 0o111)
        before = binary.stat().st_mtime_ns
        self.assertEqual(self.run_installer().returncode, 0)
        self.assertEqual(binary.stat().st_mtime_ns, before)
        self.assertEqual((self.root / "candidate-engine.json").read_text(), "existing candidate\n")

    def test_wrong_checksum_never_extracts(self):
        self.archive.write_bytes(b"invalid")
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SHA512 mismatch", result.stderr)
        self.assertFalse((self.root / "engines/1.0").exists())

    def test_missing_offline_archive_fails_without_downloading(self):
        self.archive.unlink()
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Cached archive missing", result.stderr)

    def test_incomplete_engine_is_preserved(self):
        target = self.root / "engines/1.0"
        target.mkdir(parents=True)
        sentinel = target / "keep.txt"
        sentinel.write_text("local work")
        self.assertNotEqual(self.run_installer().returncode, 0)
        self.assertEqual(sentinel.read_text(), "local work")


if __name__ == "__main__":
    unittest.main()
