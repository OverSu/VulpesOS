"""Resolve generic text fonts against the fonts shipped in the native image."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('fc-match'), 'Fontconfig is needed for font resolution')
class NativeFontsTest(unittest.TestCase):
    def test_generic_and_explicit_names_resolve_to_shipped_fira(self):
        spec = importlib.util.spec_from_file_location('native_fonts', ROOT/'runtime/prepare-native.py')
        native = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(native)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'opt/vulpes/trial').mkdir(parents=True)
            (root/'opt/vulpes/trial/session.py').touch()
            native.prepare(root, network=False, hardware=False)
            fonts = root/'usr/share/fonts/opentype/vulpes'
            config = root/'fonts.conf'
            config.write_text('<fontconfig><dir>'+escape(str(fonts))+'</dir><cachedir>'+
                              escape(str(root/'cache'))+'</cachedir><include>'+
                              escape(str(root/'etc/fonts/conf.d/00-vulpes-sans.conf'))+
                              '</include></fontconfig>')
            for requested in ('sans-serif', 'FiraSans', 'Fira Sans'):
                result = subprocess.check_output(
                    ['fc-match', '-f', '%{family}\n%{file}\n', requested], text=True,
                    env={**os.environ, 'FONTCONFIG_FILE':str(config), 'LC_ALL':'C'})
                family, filename = result.strip().splitlines()
                self.assertIn('Fira Sans', family)
                self.assertEqual(Path(filename).parent, fonts)
                self.assertEqual(Path(filename).name, 'FiraSans-Regular.otf')
