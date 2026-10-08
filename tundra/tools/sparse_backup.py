# SPDX-License-Identifier: MPL-2.0
"""Decode the read-only TUNRAW1 stream; reject truncation and overlapping blocks."""
import struct


def exact(stream, length):
    data=bytearray()
    while len(data)<length:
        block=stream.read(length-len(data))
        if not block:raise ValueError('Truncated backup stream')
        data.extend(block)
    return bytes(data)


def receive(stream, target, expected_size):
    if exact(stream,8)!=b'TUNRAW1\0':raise ValueError('Unexpected backup protocol')
    end=0
    while True:
        offset,length=struct.unpack('<QQ',exact(stream,16))
        if not length:
            if offset!=expected_size or stream.read(1):raise ValueError('Backup size or trailer mismatch')
            target.truncate(expected_size)
            return
        if offset<end or length>65536 or offset+length>expected_size:raise ValueError('Invalid backup extent')
        target.seek(offset);target.write(exact(stream,length));end=offset+length
