# SPDX-License-Identifier: MPL-2.0
"""Read verified newc ramdisks, resolving hardlinks without extracting secrets."""
import gzip
from pathlib import PurePosixPath
import stat
import subprocess
import re
import os


def read_newc(data):
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    entries, payloads, offset = {}, {}, 0
    while offset + 110 <= len(data):
        header = data[offset:offset+110]
        if header[:6] != b'070701':
            raise ValueError('Expected newc ramdisk')
        fields = [int(header[6+i*8:14+i*8],16) for i in range(13)]
        inode, mode, uid, gid, links, mtime, size, major, minor, rmajor, rminor, namesize, check = fields
        name = data[offset+110:offset+110+namesize-1].decode()
        start = (offset+110+namesize+3)&~3
        offset = (start+size+3)&~3
        if name == 'TRAILER!!!':
            break
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or offset > len(data):
            raise ValueError('Invalid ramdisk entry')
        if name == '.':
            continue
        key = (major,minor,inode)
        payload = data[start:start+size]
        entries[str(path)] = {'mode':mode,'data':payload,'key':key,'links':links}
        if stat.S_ISREG(mode) and payload:
            payloads[key] = payload
    for entry in entries.values():
        if stat.S_ISREG(entry['mode']) and entry['links'] > 1 and not entry['data']:
            entry['data'] = payloads.get(entry['key'],b'')
    return entries


def resolve(entries, name):
    import posixpath
    seen = set()
    while stat.S_ISLNK(entries[name]['mode']):
        if name in seen:
            raise ValueError('Cyclic ramdisk link')
        seen.add(name)
        link = entries[name]['data'].decode()
        name = posixpath.normpath(link.lstrip('/') if link.startswith('/') else posixpath.join(posixpath.dirname(name),link))
        if name.startswith('../'):
            raise ValueError('Link escapes ramdisk')
    return entries[name]['data']


def select_helpers(entries, scratch, extra=()):
    """Copy only explicit programs and their ELF dependencies, never /etc or /root."""
    selected = {}
    queue = ['bin/busybox','sbin/dropbear','sbin/dmsetup','lib/aarch64-linux-gnu/libnss_files.so.2', *extra]
    while queue:
        name = queue.pop()
        if name in selected:
            continue
        content = resolve(entries,name)
        selected[name] = content
        probe = scratch/'elf';probe.write_bytes(content)
        info = subprocess.check_output(['readelf','-ld',str(probe)],text=True,env={**os.environ, 'LC_ALL':'C'})
        interpreter = re.search(r'Requesting program interpreter: ([^\]]+)',info)
        if interpreter:
            queue.append(interpreter.group(1).lstrip('/'))
        for library in re.findall(r'\(NEEDED\).*\[([^\]]+)\]',info):
            found = next((base+library for base in ('lib/aarch64-linux-gnu/','usr/lib/aarch64-linux-gnu/','lib/','usr/lib/') if base+library in entries),None)
            if found is None:
                raise ValueError('Missing ramdisk library: '+library)
            queue.append(found)
    return selected
