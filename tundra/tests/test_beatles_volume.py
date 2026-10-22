# SPDX-License-Identifier: MPL-2.0
import sys
from pathlib import Path
import unittest
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).parents[1]/'devices/beatles'))
from stream_volume import StreamVolume


class VolumeTests(unittest.TestCase):
    def test_route_readback_and_restoration(self):
        volume=StreamVolume();state={(0,1):3,(0,2):5}
        def transaction(method,*args):
            if method==24:return [3]
            stream,device=args[0],args[-1]
            if method==17:return [state[stream,device],0]
            if method==16:state[stream,device]=args[1];return [0]
            raise AssertionError(method)
        volume.transact=transaction
        self.assertEqual(volume.request({'stream':'telephony','level':.4})['index'],2)
        self.assertEqual(state,{(0,1):2,(0,2):2})
        volume.request({'stream':'telephony','level':.8})
        volume.restore();self.assertEqual(state,{(0,1):3,(0,2):5})

    def test_invalid_request_never_touches_hardware(self):
        volume=StreamVolume();volume.transact=Mock()
        for value in (None,{}, {'stream':'shell','level':.5}, *({'stream':'content','level':n} for n in (True,-1,2,'1',float('nan'),float('inf')))):
            with self.assertRaises(ValueError):volume.request(value)
        volume.transact.assert_not_called()

    def test_readback_failure_is_reported(self):
        volume=StreamVolume();volume.transact=Mock(side_effect=[[2],[3,0],[0],[3,0]])
        with self.assertRaisesRegex(RuntimeError,'CALL_AUDIO_UNAVAILABLE'):
            volume.request({'stream':'content','level':.5})

    def test_parcel_formats(self):
        volume=StreamVolume()
        for text,expected in (("Result: Parcel(00000008 00000000   '........')\n",[8,0]),
            ("Result: Parcel(\n  0x00000000: 00000008 00000000 '........'\n)\n",[8,0])):
            with patch('stream_volume.subprocess.run',return_value=Mock(returncode=0,stdout=text)):
                self.assertEqual(volume.transact(17,3,2),expected)
