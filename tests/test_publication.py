import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('publication',Path(__file__).resolve().parents[1]/'tools/prepare-publication.py')
pub=importlib.util.module_from_spec(spec);spec.loader.exec_module(pub)

class Publication(unittest.TestCase):
    def test_internal_documents_and_credentials_are_excluded(self):
        for name in ['docs/CHANTIER.md','docs/ROADMAP.json','tundra/docs/STATUS.md',
                     'README-internal.md','gaia/README.md','changelog.json',
                     'tundra/out/example/client-key','tundra/logs/device/storage-layout.json',
                     'android/keys/preview.keystore','android/dist/preview.apk',
                     'profiles/example/cookies.sqlite','logs/publication/forgejo-token']:
            with self.subTest(name=name):self.assertIsNone(pub.target_name(name))
    def test_sources_readmes_and_license_notices_survive(self):
        for name in ['README.md','README.fr.md','host/shell.js','tundra/boot/native-root.sh',
                     'gaia/LICENSE','NOTICE','docs/media/vulpes-logo.png']:
            self.assertEqual(pub.target_name(name),name)
        self.assertEqual(pub.target_name('gaia/vendor/LICENSE.md'),'gaia/vendor/LICENSE')
