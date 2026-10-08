#!/usr/bin/env python3
"""Regression checks for generated changelogs and publication integration."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("render_changelog", ROOT / "tools/render-changelog.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class ChangelogTests(unittest.TestCase):
    def setUp(self):
        self.source = json.loads((ROOT / "changelog.json").read_text())

    def test_no_translation_or_entry_is_lost(self):
        documents = renderer.render(self.source)
        for language, filename in renderer.OUTPUTS.items():
            for entry in self.source["entries"]:
                self.assertIn(entry["text"][language].strip(), documents[filename])
                self.assertIn('<a id="' + entry["id"] + '"></a>', documents[filename])

    def test_duplicate_ids_and_missing_translation_are_rejected(self):
        duplicate = copy.deepcopy(self.source)
        duplicate["entries"].append(duplicate["entries"][0])
        with self.assertRaises(ValueError):
            renderer.render(duplicate)
        del self.source["entries"][0]["text"]["en"]
        with self.assertRaises(KeyError):
            renderer.render(self.source)

    def test_check_mode_does_not_overwrite_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "changelog.json").write_text(json.dumps(self.source))
            (root / "CHANGELOG.md").write_text("Old content")
            self.assertEqual(len(renderer.generate(root, check=True)), 2)
            self.assertEqual((root / "CHANGELOG.md").read_text(), "Old content")
            renderer.generate(root)
            self.assertEqual(renderer.generate(root, check=True), [])

    def test_publication_renders_updates_without_touching_working_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "tools").mkdir()
            for name in ["render-changelog.py", "prepare-publication.py"]:
                shutil.copy2(ROOT / "tools" / name, root / "tools" / name)
            for name in ["LICENSE", "NOTICE", "README.md", "README.fr.md"]:
                (root / name).write_text("Publication fixture\n")
            (root / "changelog.json").write_text(json.dumps(self.source))
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            subprocess.run(["git", "add", "."], cwd=root, check=True)
            before = (root / ".git/index").read_bytes()
            self.source["entries"][0]["text"]["fr"] += "\n\nPublication integration check."
            (root / "changelog.json").write_text(json.dumps(self.source))
            command = [sys.executable, str(root / "tools/prepare-publication.py"),
                       "--index", str(root / ".git/publication-index"),
                       "--report", str(root / ".git/publication-report.json")]
            subprocess.run(command, cwd=root, check=True, capture_output=True)
            report = json.loads((root / ".git/publication-report.json").read_text())
            published = subprocess.check_output(["git", "show", report["tree"] + ":CHANGELOG.md"], cwd=root, text=True)
            self.assertIn("Publication integration check.", published)
            self.assertIn("CHANGELOG.en.md", report["manifest"])
            self.assertEqual(before, (root / ".git/index").read_bytes())


if __name__ == "__main__":
    unittest.main()
