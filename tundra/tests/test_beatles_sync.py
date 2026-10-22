import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'tools/sync-beatles-gaia.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)

class SharedGaiaSync(unittest.TestCase):
    def test_incremental_changes_and_removal(self):
        self.assertEqual(sync.changes({'host/shell.js':'new','assets/a':'same','overrides/new.js':'new'},
                                      {'host/shell.js':'old','assets/a':'same','overrides/old.js':'old'}),
                         (['host/shell.js','overrides/new.js'],['overrides/old.js']))
    def test_profiles_and_escape_cannot_be_deleted(self):
        for path in ('profiles/user.json','../profile','host/../../profile','/data/profile','hostile/file'):
            with self.subTest(path=path),self.assertRaises(ValueError):sync.changes({}, {path:'digest'})
    def test_first_sync_and_no_change(self):
        files={'host/shell.js':'digest','release.json':'digest'}
        self.assertEqual(sync.changes(files,{}),(sorted(files),[]))
        self.assertEqual(sync.changes(files,files),([],[]))

if __name__=='__main__':unittest.main()
