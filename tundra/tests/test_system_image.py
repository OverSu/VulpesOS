# SPDX-License-Identifier: MPL-2.0
"""Exercise ownership/format safeguards without writing to a real device."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('system_image', ROOT/'tools/build-system-image.py')
image = importlib.util.module_from_spec(spec)
spec.loader.exec_module(image)


class SystemImageTests(unittest.TestCase):
    def test_pack_refuses_real_ownership_changes_outside_fakeroot(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(image.os, 'lchown') as chown:
            with self.assertRaisesRegex(RuntimeError, 'fakeroot'):
                image.pack(Path('/not-a-real-root'), Path('/not-a-real-image'))
            chown.assert_not_called()

    def test_pack_keeps_system_owned_by_root_and_session_owned_by_app_user(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)/'root'
            for name in ('opt/vulpes/host', 'home/droidian', 'etc'):
                (root/name).mkdir(parents=True)
            config = root/'etc/os-release'; config.touch()
            app = root/'opt/vulpes/host/shell.js'; app.touch()
            owners = {}
            with patch.dict(os.environ, {'FAKEROOTKEY': 'test'}), \
                 patch.object(image.os, 'lchown', side_effect=lambda p,u,g: owners.update({p:(u,g)})), \
                 patch.object(image.subprocess, 'run') as run:
                image.pack(root, Path(temporary)/'system.ext4')
            self.assertEqual(owners[config], (0,0))
            self.assertEqual(owners[app], (32011,32011))
            args = run.call_args.args[0]
            features = args[args.index('-O')+1]
            self.assertTrue(features.startswith('none,'))
            self.assertNotIn('orphan_file', features)
            self.assertIn('TUNDRA_SYSTEM', args)


if __name__ == '__main__':
    unittest.main()
