# SPDX-License-Identifier: MPL-2.0
import ctypes
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import usb_protocol as usb

# Captured through sysfs from the actual Sargo diagnostic, high-speed config 1.
SARGO = bytes.fromhex('12011002000000406b1d04010904010203010902200001010080fa0904000002ff0000040705810200020007050102000200')


class USBTransportTests(unittest.TestCase):
    def test_pixel_remapped_endpoint(self):
        self.assertEqual(usb.parse_endpoints(SARGO,1),{'interface':0,'in':0x81,'out':0x01})

    def test_original_endpoint_and_different_interface(self):
        descriptors=bytearray(SARGO)
        descriptors[-5]=2
        descriptors[29]=4
        self.assertEqual(usb.parse_endpoints(descriptors,1),{'interface':4,'in':0x81,'out':0x02})

    def test_invalid_and_ambiguous_descriptors_rejected(self):
        both_in=bytearray(SARGO);both_in[-5]=0x82
        interrupt=bytearray(SARGO);interrupt[-4]=3
        for data in (b'',b'\0\2',SARGO[:-1],both_in,interrupt,SARGO+SARGO[27:]):
            with self.subTest(data=data):
                with self.assertRaises(ValueError):
                    usb.parse_endpoints(data,1)
        with self.assertRaises(ValueError):
            usb.parse_endpoints(SARGO,2)

    def test_transfer_uses_discovered_addresses_and_claims_interface(self):
        layout={'interface':4,'out':1,'in':0x81}
        endpoints=[]
        response=b'TUNDRA_USB_STATUS protocol=1 readOnly=true\nEND\n'
        def ioctl(fd,code,pointer):
            request=ctypes.cast(pointer,ctypes.POINTER(usb.Bulk)).contents
            endpoints.append(request.ep)
            if len(endpoints)==1:
                self.assertEqual(request.ep,1)
                self.assertEqual(ctypes.string_at(request.data,request.length),b'status\n')
                return request.length
            self.assertEqual(request.ep,0x81)
            ctypes.memmove(request.data,response,len(response))
            return len(response)
        with tempfile.TemporaryFile() as stream, \
             patch.object(usb,'device_layout',return_value=layout), \
             patch.object(usb.Path,'open',return_value=stream), \
             patch.object(usb.fcntl,'ioctl') as claim, \
             patch.object(usb.ctypes,'CDLL',return_value=SimpleNamespace(ioctl=Mock(side_effect=ioctl))):
            self.assertEqual(usb.exchange('/dev/bus/usb/003/011',('status',)),{'status':response.decode()})
            self.assertEqual(claim.call_args.args[2],usb.struct.pack('I',4))
        self.assertEqual(endpoints,[1,0x81])

    def test_invalid_command_rejected_before_device_access(self):
        with patch.object(usb,'device_layout') as layout:
            with self.assertRaises(ValueError):
                usb.exchange('/dev/bus/usb/003/011',('status\nversion',))
            layout.assert_not_called()
