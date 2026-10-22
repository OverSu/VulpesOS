# SPDX-License-Identifier: MPL-2.0
import gzip
from pathlib import Path
import stat
import struct
import sys
import unittest
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
from beatles_boot import read_cpio, write_cpio, add_file, pack_boot, unpack_boot

class BootTests(unittest.TestCase):
    def archive(self):
        entries={'.':{'fields':[1,stat.S_IFDIR|0o750,1000,1001,2,17,0,0,0,0,0,2,0],'data':b''}}
        add_file(entries,'init.rc',b'on boot\n',0o640)
        entries['init.rc']['fields'][2:4]=[1000,1001]
        return entries
    def test_repack_preserves_ownership_and_modes(self):
        original=self.archive();repacked=read_cpio(write_cpio(original))
        self.assertEqual(repacked['init.rc']['data'],b'on boot\n')
        self.assertEqual(repacked['init.rc']['fields'][1:6],original['init.rc']['fields'][1:6])
        self.assertEqual(write_cpio(original),write_cpio(original))
    def test_missing_trailer_and_truncated_entry_rejected(self):
        raw=gzip.decompress(write_cpio(self.archive()))
        for end in (90,115,180):
            with self.assertRaises(ValueError):read_cpio(gzip.compress(raw[:end]))
    def test_traversal_rejected(self):
        entries=self.archive();add_file(entries,'../escape',b'unsafe')
        with self.assertRaises(ValueError):read_cpio(write_cpio(entries))
    def test_duplicate_added_file_rejected(self):
        with self.assertRaises(ValueError):add_file(self.archive(),'init.rc',b'bad')
    def image(self):
        header=bytearray(2048);header[:8]=b'ANDROID!'
        struct.pack_into('<10I',header,8,3,0x80008000,4,0x81000000,0,0,0x80000100,2048,0,0)
        return bytes(header)+b'abc'+b'\0'*2045+b'test'+b'\0'*2044+b'old signature'
    def test_changed_image_drops_original_signature_and_preserves_kernel(self):
        result=unpack_boot(pack_boot(self.image(),b'new ramdisk'))
        self.assertEqual(result['kernel'],b'abc');self.assertEqual(result['ramdisk'],b'new ramdisk')
        self.assertEqual(result['trailer'],b'')
    def test_unsupported_header_and_short_payload_rejected(self):
        with self.assertRaises(ValueError):unpack_boot(self.image()[:2500])
        image=bytearray(self.image());struct.pack_into('<I',image,40,1)
        with self.assertRaises(ValueError):unpack_boot(image)

if __name__=='__main__':unittest.main()
