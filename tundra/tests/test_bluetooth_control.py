import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('bluetooth',Path(__file__).resolve().parents[1]/'runtime/bluetooth-control.py')
bt=importlib.util.module_from_spec(spec);spec.loader.exec_module(bt)

class Bluetooth(unittest.TestCase):
    def test_reject_arbitrary_path_command_and_non_boolean_power(self):
        for value in [dict(operation='exec',command='id'),dict(operation='pair',address='/org/bluez/hci0'),
                      dict(operation='power',enabled='false'),dict(operation='rename',name='\nName')]:
            with self.assertRaises(ValueError):bt.validate(dict(version=1,**value))
    def test_valid_pair_and_name(self):
        self.assertEqual(bt.validate(dict(version=1,operation='pair',address='AA:BB:CC:DD:EE:FF')),'pair')
        self.assertEqual(bt.validate(dict(version=1,operation='rename',name='Vulpes OS')),'rename')
    def test_cod_for_gaia_and_no_manufactured_connection(self):
        value=bt.device_record(dict(Address='AA:BB:CC:DD:EE:FF',Class=0x240404,Paired=True))
        self.assertEqual(value['cod']['majorDeviceClass'],4)
        self.assertEqual(value['cod']['minorDeviceClass'],1)
        self.assertTrue(value['paired']);self.assertFalse(value['connected'])

if __name__=='__main__':unittest.main()
