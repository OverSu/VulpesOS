import base64
import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location('slot_finalize', Path(__file__).resolve().parents[1]/'tools/finalize-sargo-slot.py')
slot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(slot)


def snapshot(success=False, corrupt=False, change_b=False):
    data=bytearray(256)
    struct.pack_into('<Q',data,48,(1<<50)|(slot.SUCCESS if success else 0))
    if corrupt:data[32]=1
    if change_b:data[128+54]|=0x40
    copy={'table':base64.b64encode(data).decode(),'partitions':{
        'boot_a':{'index':1,'attributes':struct.unpack_from('<Q',data,48)[0]},
        'boot_b':{'index':2,'attributes':0}}}
    return {'primary':copy,'secondary':copy}


class SlotFinalizationTests(unittest.TestCase):
    def test_accepts_only_success_bit_and_is_idempotent(self):
        self.assertEqual(slot.verify_transition(snapshot(),snapshot(True)),['boot_a'])
        self.assertEqual(slot.verify_transition(snapshot(True),snapshot(True)),[])

    def test_rejects_partition_extent_or_other_slot_change(self):
        for after in (snapshot(True,corrupt=True),snapshot(True,change_b=True),snapshot()):
            with self.assertRaises(ValueError):slot.verify_transition(snapshot(),after)
