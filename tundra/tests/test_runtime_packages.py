"""Check the pinned Bluetooth libraries and native TLS trust store offline."""
import importlib.util
import json
from pathlib import Path
import ssl
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('packages', ROOT/'runtime/runtime-packages.py')
packages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packages)
CACHE = ROOT/'downloads/native-packages-20261008'


class RuntimePackages(unittest.TestCase):
    def test_corrupt_archive_is_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            cache = base/'cache'
            cache.mkdir()
            (cache/packages.PACKAGES[0][0]).write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                packages.stage(base/'root', cache)
            self.assertFalse((base/'root').exists())

    @unittest.skipUnless(all((CACHE/name).exists() for name, _, _ in packages.PACKAGES),
                         'Pinned package cache is not installed')
    def test_staged_payload_is_repeatable_and_certificates_are_usable(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            first = packages.stage(root, CACHE)
            self.assertEqual(packages.stage(root, CACHE), first)
            self.assertEqual(json.loads((root/'usr/share/vulpes/runtime-packages.json').read_text()), first)
            self.assertTrue((root/'usr/libexec/bluetooth/bluetoothd').is_file())
            context = ssl.create_default_context(cafile=str(root/'etc/ssl/certs/ca-certificates.crt'))
            self.assertGreater(context.cert_store_stats()['x509_ca'], 50)
            self.assertTrue((root/'usr/lib/ssl/cert.pem').is_file())
            target = root/'usr/libexec/bluetooth/bluetoothd'
            target.write_bytes(b'unknown local binary')
            with self.assertRaisesRegex(ValueError, 'Conflicting package file'):
                packages.stage(root, CACHE)
            self.assertEqual(target.read_bytes(), b'unknown local binary')


if __name__ == '__main__':
    unittest.main()
