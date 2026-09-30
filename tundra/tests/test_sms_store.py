import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('sms_store',Path(__file__).resolve().parents[1]/'runtime/sms-inbox.py')
store=importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)

class SmsStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        transaction=store.transaction
        self.override=patch.object(store,'transaction',lambda change,**kw: transaction(change,root=self.root,**kw))
        self.override.start()
    def tearDown(self):
        self.override.stop()
        self.temp.cleanup()
    def test_terminal_state_survives_message_removal(self):
        store.record_outgoing('/ril_0/messageabc','sent')
        self.assertEqual(store.outgoing_state('/ril_0/messageabc'),'sent')
        store.record_outgoing('/ril_0/messageabc','pending')
        self.assertEqual(store.outgoing_state('/ril_0/messageabc'),'sent')
        self.assertEqual((self.root/'outgoing.json').stat().st_mode & 0o777,0o600)
    def test_outgoing_does_not_overwrite_unacknowledged_incoming(self):
        store.transaction(lambda rows:rows.append({'receipt':'receipt'}))
        store.record_outgoing('/ril_0/messageabc','failed')
        self.assertEqual(store.pending(),[{'receipt':'receipt'}])
        store.acknowledge(['receipt'])
        self.assertEqual(store.pending(),[])
        self.assertEqual(store.outgoing_state('/ril_0/messageabc'),'failed')
    def test_latest_terminal_state_replaces_same_path(self):
        store.record_outgoing('/ril_0/messageabc','failed')
        store.record_outgoing('/ril_0/messageabc','sent')
        rows=json.loads((self.root/'outgoing.json').read_text())
        self.assertEqual(len(rows),1)
        self.assertNotIn('body',rows[0])
        self.assertNotIn('number',rows[0])

if __name__=='__main__': unittest.main()
