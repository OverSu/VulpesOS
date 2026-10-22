import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    'package_beatles', ROOT / 'tundra/tools/package-beatles-build.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class BeatlesT9Package(unittest.TestCase):
    def test_all_offline_lexicons_are_included_at_runtime_path(self):
        files = {}
        package.add_beatles_t9(files)
        self.assertEqual(len(files), 42)
        self.assertEqual(
            set(files),
            {f'opt/vulpes/tundra/devices/beatles/t9/{locale}.tsv'
             for locale in (path.stem for path in
                            (ROOT / 'tundra/devices/beatles/t9').glob('*.tsv'))})
        self.assertTrue(all(path.is_file() for path in files.values()))


if __name__ == '__main__':
    unittest.main()
