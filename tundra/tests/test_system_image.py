# SPDX-License-Identifier: MPL-2.0
"""Exercise ownership/format safeguards without writing to a real device."""
import importlib.util
import json
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
    def test_hardware_reference_requires_services_not_just_display(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            value = {'architecture': 'arm64', 'packages': {'phoc': {}}, 'files': {}}
            path = root/'manifest.json'
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'missing packages'):
                image.validate_reference(root)
            value['packages'] = {name+':arm64': {} for name in image.HARDWARE_PACKAGES}
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'executable'):
                image.validate_reference(root)
            value['files'] = {name: {} for name in
                             ('/usr/sbin/ofonod', '/usr/sbin/NetworkManager', '/usr/bin/phoc')}
            path.write_text(json.dumps(value))
            image.validate_reference(root)
            value['architecture'] = 'amd64'
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'ARM64'):
                image.validate_reference(root)

    def test_distribution_omits_working_documents_but_keeps_component_licenses(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary); product=root/'product'; reference=root/'reference'
            (product/'component').mkdir(parents=True);reference.mkdir()
            (product/'README.md').write_text('Internal working document')
            (product/'component/LICENSE.md').write_text('Original upstream notice')
            (reference/'manifest.json').write_text(json.dumps({'packages':{
                'example':{'binary:Package':'example','Version':'1',
                           'source:Package':'example','source:Version':'1',
                           'localPath':'private/path'}}}))
            image.prepare_distribution_metadata(product,reference)
            self.assertFalse((product/'README.md').exists())
            self.assertEqual((product/'component/LICENSE').read_text(),'Original upstream notice')
            inventory=json.loads((product/'runtime-packages.json').read_text())
            self.assertEqual(inventory['packages'][0]['binary:Package'],'example')
            self.assertNotIn('localPath',inventory['packages'][0])
            self.assertTrue((product/'NOTICE').is_file())

    def test_conflicting_project_license_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary:
            product=Path(temporary)
            (product/'LICENSE').write_text('Keep this upstream notice')
            with self.assertRaisesRegex(ValueError,'existing notice'):
                image.prepare_distribution_metadata(product,Path('/unused'))
            self.assertEqual((product/'LICENSE').read_text(),'Keep this upstream notice')

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
