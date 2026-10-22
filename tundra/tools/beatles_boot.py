# SPDX-License-Identifier: MPL-2.0
"""Strict Android v0/newc handling for the inventoried Nokia boot image."""
import gzip
import hashlib
from pathlib import PurePosixPath
import stat
import struct


def align(value, boundary):
    return (value + boundary - 1) // boundary * boundary


def unpack_boot(data):
    if len(data) < 1632 or data[:8] != b'ANDROID!':
        raise ValueError('Not an Android boot image')
    fields = struct.unpack_from('<10I', data, 8)
    kernel, _, ramdisk, _, second, _, _, page, dt, _ = fields
    if page not in (2048, 4096) or not kernel or not ramdisk or second or dt:
        raise ValueError('Expected Nokia v0 image without second stage or separate DT')
    offset = page + align(kernel, page)
    end = offset + align(ramdisk, page)
    if end > len(data):
        raise ValueError('Truncated boot image')
    return {'header': data[:page], 'kernel': data[page:page + kernel],
            'ramdisk': data[offset:offset + ramdisk], 'trailer': data[end:], 'page': page}


def pack_boot(original, ramdisk):
    parts = unpack_boot(original)
    header = bytearray(parts['header'])
    struct.pack_into('<I', header, 16, len(ramdisk))
    kernel = parts['kernel']
    digest = hashlib.sha1()
    for payload in (kernel, ramdisk, b''):
        digest.update(payload); digest.update(struct.pack('<I', len(payload)))
    header[576:608] = digest.digest() + b'\0' * 12
    page = parts['page']
    # The original signature cannot authenticate changed bytes. Never copy it.
    return (bytes(header) + kernel + b'\0' * (align(len(kernel), page) - len(kernel)) +
            ramdisk + b'\0' * (align(len(ramdisk), page) - len(ramdisk)))


def read_cpio(data):
    raw = gzip.decompress(data)
    result = {}; offset = 0
    while offset + 110 <= len(raw):
        header = raw[offset:offset + 110]
        if header[:6] != b'070701':raise ValueError('Expected newc archive')
        fields = [int(header[6+i*8:14+i*8], 16) for i in range(13)]
        size, namesize = fields[6], fields[11]
        if namesize < 1:raise ValueError('Empty cpio name')
        name_start = offset + 110; name_end = name_start + namesize
        start = align(name_end, 4); end = start + size
        if end > len(raw) or raw[name_end-1:name_end] != b'\0':raise ValueError('Truncated cpio entry')
        name = raw[name_start:name_end-1].decode()
        if name == 'TRAILER!!!':return result
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or name in result:raise ValueError('Unsafe cpio entry')
        result[name] = {'fields':fields, 'data':raw[start:end]}
        offset = align(end, 4)
    raise ValueError('Missing cpio trailer')


def write_cpio(entries):
    result = bytearray()
    records = list(entries.items()) + [('TRAILER!!!', {'fields':[0]*13, 'data':b''})]
    for name, entry in records:
        fields = list(entry['fields']); payload = entry['data']; encoded = name.encode() + b'\0'
        fields[6] = len(payload); fields[11] = len(encoded)
        result.extend(b'070701' + b''.join(('%08x' % x).encode() for x in fields))
        result.extend(encoded); result.extend(b'\0' * (align(len(result), 4)-len(result)))
        result.extend(payload); result.extend(b'\0' * (align(len(result), 4)-len(result)))
    result.extend(b'\0' * (align(len(result), 512)-len(result)))
    return gzip.compress(result, mtime=0)


def add_file(entries, name, data, mode=0o644):
    if name in entries:raise ValueError('Ramdisk file already exists: '+name)
    inode = max(item['fields'][0] for item in entries.values()) + 1
    entries[name] = {'fields':[inode, stat.S_IFREG | mode, 0, 0, 1, 0, len(data), 0, 0, 0, 0, 0, 0], 'data':data}
