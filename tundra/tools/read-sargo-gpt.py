#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read and validate both GPT copies on the inventoried 64 GB Sargo; no writes."""
import base64,json,struct,zlib
from pathlib import Path

def read_gpt():
    result={}
    with open('/dev/mmcblk0','rb',buffering=0) as disk:
        for name,lba in [('primary',1),('secondary',122142719)]:
            disk.seek(lba*512);h=disk.read(512)
            assert h[:8]==b'EFI PART'
            length,crc=struct.unpack_from('<II',h,12)
            assert 92<=length<=512
            check=bytearray(h[:length]);check[16:20]=b'\0'*4
            assert zlib.crc32(check)==crc
            current,other,first,last=struct.unpack_from('<QQQQ',h,24)
            assert current==lba and {current,other}=={1,122142719}
            entries,count,size,crc=struct.unpack_from('<QIII',h,72)
            assert count==72 and size==128
            disk.seek(entries*512);table=disk.read(count*size)
            assert len(table)==count*size and zlib.crc32(table)==crc
            parts={}
            for i in range(count):
                e=table[i*size:(i+1)*size]
                label=e[56:128].decode('utf-16le').rstrip('\0')
                if label:parts[label]={'index':i+1,'attributes':struct.unpack_from('<Q',e,48)[0]}
            result[name]={'headerLba':lba,'entriesLba':entries,'header':base64.b64encode(h).decode(),'table':base64.b64encode(table).decode(),'partitions':parts}
    assert result['primary']['table']==result['secondary']['table']
    result['bootId']=Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    return result
print(json.dumps(read_gpt()))
