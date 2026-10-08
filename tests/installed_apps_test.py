import base64
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'tools'))
from installed_apps import InstalledApps

class StoreTests(unittest.TestCase):
    def test_persistence_removal_and_permission_boundary(self):
        with tempfile.TemporaryDirectory() as folder:
            store=InstalledApps(folder,8765)
            item=dict(id='user-'+'1'*24,manifest=dict(name='Test',type='certified',permissions={'settings':{}}),files={'index.html':base64.b64encode(b'hello').decode()})
            store.save(item)
            restored=InstalledApps(folder,8765)
            self.assertEqual(restored.read(item['id'],'index.html'),b'hello')
            self.assertEqual(restored.records()[0]['manifest']['permissions'],{})
            self.assertEqual(restored.records()[0]['manifest']['type'],'web')
            self.assertEqual(json.loads(restored.read(item['id'],'manifest.webapp'))['permissions'],{})
            self.assertEqual((Path(folder)/'.token').stat().st_mode & 0o777,0o600)
            self.assertIsNone(restored.read(item['id'],'../.token'))
            with self.assertRaises(ValueError):restored.remove('system')
            with self.assertRaises(ValueError):restored.save({**item,'id':'../escape'})
            restored.remove(item['id'])
            self.assertEqual(InstalledApps(folder,8765).records(),[])

if __name__=='__main__':unittest.main()
