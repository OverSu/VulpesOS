# SPDX-License-Identifier: MPL-2.0
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
spec=importlib.util.spec_from_file_location('native_launch',ROOT/'tools/run-sargo-native.py')
launch=importlib.util.module_from_spec(spec);spec.loader.exec_module(launch)


class QualifiedLaunchTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.folder=self.root/'out/build'
        self.folder.mkdir(parents=True)
        (self.folder/'proof.json').write_text('{"passed":true}')
        (self.folder/'build.json').write_text(json.dumps({'imageSha256':'image-hash'}))
        self.report={'passed':True,'flashReady':False,'imageSha256':'image-hash',
                     'evidenceSha256':{'proof.json':launch.digest(self.folder/'proof.json')}}
        self.write_report()
        self.root_patch=patch.object(launch,'ROOT',self.root);self.root_patch.start();self.addCleanup(self.root_patch.stop)

    def write_report(self):
        report=self.folder/'qualification.json';report.write_text(json.dumps(self.report))
        (self.root/'out/sargo-native-qualified.json').write_text(json.dumps({
            'directory':'out/build','qualificationSha256':launch.digest(report)}))

    def test_local_verification_does_not_request_boot(self):
        with patch.object(launch.subprocess,'run') as run:
            self.assertEqual(launch.qualified_build(),self.folder)
        self.assertNotIn('--boot',run.call_args.args[0])

    def test_modified_evidence_stops_before_device_tool(self):
        (self.folder/'proof.json').write_text('changed')
        with patch.object(launch.subprocess,'run') as run:
            with self.assertRaisesRegex(ValueError,'evidence changed'):launch.qualified_build()
            run.assert_not_called()

    def test_failed_qualification_stops_before_device_tool(self):
        self.report['passed']=False;self.write_report()
        with patch.object(launch.subprocess,'run') as run:
            with self.assertRaisesRegex(ValueError,'qualified native'):launch.qualified_build()
            run.assert_not_called()

    def test_interactive_diagnostics_cannot_be_the_normal_launcher(self):
        (self.folder/'build.json').write_text(json.dumps({
            'imageSha256':'image-hash', 'interactiveDiagnostics':True}))
        with patch.object(launch.subprocess,'run') as run:
            with self.assertRaisesRegex(ValueError,'Interactive diagnostic'):
                launch.qualified_build()
            run.assert_not_called()

    def test_pointer_cannot_escape_output_directory(self):
        (self.root/'out/sargo-native-qualified.json').write_text(json.dumps({'directory':'../outside'}))
        with patch.object(launch.subprocess,'run') as run:
            with self.assertRaises(ValueError):launch.qualified_build()
            run.assert_not_called()


if __name__=='__main__':unittest.main()
