# SPDX-License-Identifier: MPL-2.0
import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'tools'))
import shared_ui


class SharedUiTests(unittest.TestCase):
    def test_working_documents_stay_private_and_license_text_is_retained(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            files = []
            for name, text in [('host/app.js', 'app code'),
                               ('overrides/README.md', 'private notes'),
                               ('overrides/LICENSE.md', 'upstream license')]:
                path = root/name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text)
                files.append(path)
            with patch.object(shared_ui, 'ROOT', root/'tundra'), \
                 patch.object(shared_ui, 'selected_files', return_value=files):
                payload, hashes = shared_ui.build_payload()
            with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
                self.assertEqual(set(archive.getnames()),
                                 {'opt/vulpes/host/app.js', 'opt/vulpes/overrides/LICENSE'})
                self.assertEqual(archive.extractfile('opt/vulpes/overrides/LICENSE').read(),
                                 b'upstream license')
            self.assertNotIn('overrides/README.md', hashes)

    def test_call_log_fix_is_in_incremental_phone_updates(self):
        names = {str(p.relative_to(shared_ui.ROOT.parent)) for p in shared_ui.selected_files()}
        for name in ('dialer/js/call_log.js', 'dialer/gaia_build_defer_index.js'):
            self.assertIn('assets/webapps/communications.gaiamobile.org/'+name, names)


if __name__ == '__main__':
    unittest.main()
