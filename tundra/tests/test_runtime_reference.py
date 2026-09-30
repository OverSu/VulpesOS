# SPDX-License-Identifier: MPL-2.0
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


stage = load('stage_runtime', 'tools/stage-runtime.py')
export = load('export_runtime', 'droidian/export-runtime.py')
display = load('compositor_trial', 'droidian/compositor-trial.py')


class ReferenceTests(unittest.TestCase):
    def test_snapshot_excludes_configuration_and_private_trees(self):
        for path in ('/etc/shadow', '/home/droidian/.ssh/id_ed25519',
                     '/var/lib/NetworkManager/secret', '/usr/local/private', '/usr/../etc/shadow'):
            self.assertFalse(export.allowed(path), path)
        self.assertTrue(export.allowed('/usr/share/doc/phoc/copyright'))

    def test_dependency_alternative_and_versioned_virtual_provider(self):
        def package(version, depends='', provides=''):
            return {'Version': version, 'Architecture': 'arm64', 'Depends': depends,
                    'Pre-Depends': '', 'Provides': provides}
        packages = {'app': package('1', 'missing | interface (>= 2)'),
                    'old': package('1', provides='interface (= 1)'),
                    'new': package('3', provides='interface (= 3)')}
        def compare(args, **kwargs):
            self.assertEqual(args[:2], ['dpkg', '--compare-versions'])
            self.assertEqual(args[3:], ['>=', '2'])
            return subprocess.CompletedProcess(args, 0 if args[2] == '3' else 1)
        with patch.object(export.subprocess, 'run', side_effect=compare):
            self.assertEqual(set(export.closure(packages, ['app'])), {'app', 'new'})

    def test_unresolved_dependency_is_not_silently_dropped(self):
        with self.assertRaisesRegex(ValueError, 'No installed provider'):
            export.closure({}, ['missing'])

    def test_legacy_lib_files_share_the_runtime_loader_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)/'source'; source.mkdir()
            data = b'reference library'; name = 'lib/example.so'
            with tarfile.open(source/'runtime.tar', 'w') as tar:
                info = tarfile.TarInfo(name); info.size = len(data); info.mode = 0o6755
                tar.addfile(info, io.BytesIO(data))
            manifest = {'archiveSha256': hashlib.sha256((source/'runtime.tar').read_bytes()).hexdigest(),
                        'files': {'/'+name: {'sha256': hashlib.sha256(data).hexdigest()}},
                        'packages': {'example': {}}, 'missing': []}
            (source/'manifest.json').write_text(json.dumps(manifest))
            root = Path(temporary)/'root'; stage.stage(source, root)
            self.assertTrue((root/'lib').is_symlink())
            self.assertEqual((root/'lib/example.so').read_bytes(), data)
            self.assertEqual((root/'lib/example.so').stat().st_mode & 0o6000, 0)
            self.assertFalse((root/'etc/machine-id').exists())

    def test_archive_paths_cannot_escape_root(self):
        for path in ('/usr/bin/x', 'usr/../../etc/shadow', 'etc/shadow'):
            with self.assertRaises(ValueError):
                stage.destination(path)

    def test_gaia_child_drops_all_process_capabilities(self):
        path = ROOT/'droidian/session.py'
        code = "import runpy; runpy.run_path("+repr(str(path))+")[\"drop_capabilities\"](); print(open('/proc/self/status').read())"
        result = subprocess.check_output(['python3', '-c', code], text=True)
        values = dict(line.split(':', 1) for line in result.splitlines() if ':' in line)
        for key in ('CapInh', 'CapPrm', 'CapEff', 'CapAmb'):
            self.assertEqual(int(values[key].strip(), 16), 0, key)

    def test_display_restore_continues_after_stop_timeout(self):
        calls = []
        def command(*args, **kwargs):
            calls.append(args)
            if args[:2] == ('systemctl', 'stop'):
                raise subprocess.TimeoutExpired(args, 45)
            return subprocess.CompletedProcess(args, 0, '', '')
        with tempfile.TemporaryDirectory() as temporary:
            p = Path(temporary)
            with patch.object(display, 'SERVICE', p/'service'), \
                 patch.object(display, 'DROPIN', p/'dropin'), \
                 patch.object(display, 'CONFIG', p/'config'), \
                 patch.object(display, 'command', side_effect=command):
                report = {}; display.restore(report)
            self.assertIn(('systemctl', 'start', 'phosh.service'), calls)
            self.assertTrue(report['restoredPhosh'])
            self.assertEqual(len(report['cleanupErrors']), 1)
