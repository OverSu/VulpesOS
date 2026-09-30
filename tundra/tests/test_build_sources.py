# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
spec=importlib.util.spec_from_file_location('rescue_test',ROOT/'tools/test-rescue-boot.py')
rescue=importlib.util.module_from_spec(spec);spec.loader.exec_module(rescue)


class SourceSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.folder=Path(self.temp.name)
        self.source=self.folder/'sources/tundra/boot/init.sh'
        self.source.parent.mkdir(parents=True)
        self.source.write_text('immutable boot source')
        self.build={'sourceSnapshot':True,'sources':{'boot/init.sh':rescue.digest(self.source)}}

    def test_snapshot_does_not_depend_on_current_checkout(self):
        rescue.verify_sources(self.folder,self.build)

    def test_tampering_with_saved_source_is_rejected(self):
        self.source.write_text('changed')
        with self.assertRaisesRegex(ValueError,'source changed'):
            rescue.verify_sources(self.folder,self.build)

    def test_path_cannot_escape_snapshot(self):
        self.build['sources']={'../../outside':'hash'}
        with self.assertRaises(ValueError):rescue.verify_sources(self.folder,self.build)


if __name__=='__main__':unittest.main()
