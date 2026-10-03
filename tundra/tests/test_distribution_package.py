# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import json
import lzma
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location('distribution', TOOLS/'prepare-sargo-package.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class DistributionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.content = b'Tundra'*4096 + bytes(8192)
        self.archive = self.root/'system.ext4.xz'
        self.archive.write_bytes(lzma.compress(self.content))
        self.manifest = self.root/'package.json'
        self.value = {'device': 'sargo', 'version': 'test', 'systemImage': self.archive.name,
                      'uncompressedBytes': len(self.content),
                      'systemImageSha256': hashlib.sha256(self.content).hexdigest(),
                      'filesystemCheckPassed': True, 'compressionCheckPassed': True}
        self.save()

    def save(self):
        self.value['archiveBytes'] = self.archive.stat().st_size
        self.value['archiveSha256'] = package.digest(self.archive)
        self.manifest.write_text(json.dumps(self.value))
        self.expected = package.digest(self.manifest)

    def test_manifest_and_expanded_image_verified(self):
        value = package.checked_manifest(self.manifest, self.expected)
        archive = package.checked_archive(self.root, value)
        image = self.root/'expanded.ext4'
        package.unpack(archive, image, value)
        self.assertEqual(image.read_bytes(), self.content)

    def test_wrong_manifest_or_archive_hash_rejected(self):
        with self.assertRaisesRegex(ValueError, 'manifest checksum'):
            package.checked_manifest(self.manifest, '0'*64)
        self.archive.write_bytes(b'bad')
        with self.assertRaisesRegex(ValueError, 'checksum or size'):
            package.checked_archive(self.root, self.value)

    def test_paths_links_and_wrong_device_rejected(self):
        for name in ('../system.ext4.xz', '/tmp/system.ext4.xz', 'boot.img', 'sub/system.ext4.xz'):
            self.value['systemImage'] = name
            self.save()
            with self.assertRaises(ValueError):
                package.checked_manifest(self.manifest, self.expected)
        self.value['systemImage'] = self.archive.name
        self.value['device'] = 'bonito'
        self.save()
        with self.assertRaisesRegex(ValueError, 'Only Sargo'):
            package.checked_manifest(self.manifest, self.expected)
        original = self.archive.read_bytes()
        self.archive.unlink()
        other = self.root/'outside'; other.write_bytes(original)
        self.archive.symlink_to(other)
        with self.assertRaisesRegex(ValueError, 'regular archive'):
            package.checked_archive(self.root, self.value)

    def test_truncated_and_concatenated_streams_rejected(self):
        original = self.archive.read_bytes()
        for data in (original[:-4], original+b'extra', original+original):
            self.archive.write_bytes(data)
            self.save()
            target = self.root/'partial.ext4'
            with self.assertRaises((ValueError, lzma.LZMAError)):
                package.unpack(self.archive, target, self.value)
            self.assertFalse(target.exists())

    def test_expansion_limit_and_wrong_image_digest_leave_no_partial_image(self):
        for key, value in (('uncompressedBytes', 4096), ('systemImageSha256', '0'*64)):
            bad = dict(self.value, **{key: value})
            target = self.root/'partial.ext4'
            with self.assertRaises(ValueError):
                package.unpack(self.archive, target, bad)
            self.assertFalse(target.exists())

    def test_existing_image_and_data_are_never_overwritten(self):
        target = self.root/'existing.ext4'; target.write_bytes(b'existing user data')
        with self.assertRaises(FileExistsError):
            package.unpack(self.archive, target, self.value)
        self.assertEqual(target.read_bytes(), b'existing user data')
        with patch.object(package.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'already exists'):
                package.prepare(self.manifest, self.expected, self.root, 1024)
            run.assert_not_called()

    def test_verify_only_does_not_run_device_or_filesystem_commands(self):
        with patch.object(sys, 'argv', ['prepare', '--manifest', str(self.manifest),
                                       '--manifest-sha256', self.expected]), \
                patch.object(package.subprocess, 'run') as run, \
                patch.object(package.os, 'umask'):
            package.main()
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
