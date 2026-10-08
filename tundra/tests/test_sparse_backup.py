# SPDX-License-Identifier: MPL-2.0
import io
from pathlib import Path
import struct
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from sparse_backup import receive


def record(offset,data):return struct.pack('<QQ',offset,len(data))+data


class BackupTests(unittest.TestCase):
    def test_holes_and_final_size_are_restored(self):
        stream=b'TUNRAW1\0'+record(2,b'abc')+record(9,b'x')+record(12,b'')
        target=io.BytesIO();receive(io.BytesIO(stream),target,12)
        # BytesIO does not extend on truncate; actual disk files do.
        self.assertEqual(target.getvalue(),b'\0\0abc\0\0\0\0x')

    def test_empty_disk_has_a_required_trailer(self):
        receive(io.BytesIO(b'TUNRAW1\0'+record(100,b'')),io.BytesIO(),100)
        with self.assertRaises(ValueError):receive(io.BytesIO(b'TUNRAW1\0'),io.BytesIO(),100)

    def test_overlapping_or_out_of_bounds_blocks_rejected(self):
        for records in (record(2,b'abc')+record(4,b'bad'),record(8,b'too long')):
            with self.assertRaises(ValueError):receive(io.BytesIO(b'TUNRAW1\0'+records),io.BytesIO(),10)

    def test_wrong_trailer_and_trailing_bytes_rejected(self):
        for stream in (b'TUNRAW1\0'+record(9,b''),b'TUNRAW1\0'+record(10,b'')+b'extra'):
            with self.assertRaises(ValueError):receive(io.BytesIO(stream),io.BytesIO(),10)

    def test_truncated_payload_rejected(self):
        with self.assertRaises(ValueError):receive(io.BytesIO(b'TUNRAW1\0'+struct.pack('<QQ',0,5)+b'four'),io.BytesIO(),10)


if __name__=='__main__':unittest.main()
