# SPDX-License-Identifier: MPL-2.0
"""Private, portable inputs for one Sargo. No shared device inventory paths."""
import hashlib
import json
from pathlib import Path
import re
import struct

from boot_backup import verify
from storage_layout import mount_table
from tundra import digest

# The system/HAL has only been exercised with this kernel and boot geometry.
KERNEL_SHA256 = 'e214e5e363bcf4db6387668ba723299e75009bc128fb0088f706cfb311db0080'


def boot_kernel(path):
    with Path(path).open('rb') as stream:
        header = stream.read(608)
        if len(header) != 608 or header[:8] != b'ANDROID!':
            raise ValueError('Expected an Android boot image')
        fields = struct.unpack_from('<10I', header, 8)
        size, address, ramdisk_size, ramdisk_address, second_size, _, tags, page, version, _ = fields
        if (version != 0 or page != 4096 or address != 0x8000
                or ramdisk_address != 0x1000000 or tags != 0x100 or second_size
                or not 0 < size < 64*1024**2 or not 0 < ramdisk_size < 64*1024**2):
            raise ValueError('Boot geometry is not supported by this Sargo adaptation')
        ramdisk_offset = page + ((size+page-1)//page)*page
        if ramdisk_offset+ramdisk_size > Path(path).stat().st_size:
            raise ValueError('Boot payload exceeds the backup')
        stream.seek(page)
        kernel = stream.read(size)
        if len(kernel) != size:
            raise ValueError('Truncated kernel')
        result = hashlib.sha256(kernel).hexdigest()
        if result != KERNEL_SHA256:
            raise ValueError('Kernel has not been qualified with this system/HAL')
        return result


def checked_workspace(folder):
    folder = Path(folder).resolve()
    if (folder/'.incomplete').exists():
        raise ValueError('Device workspace preparation did not finish')
    value = json.loads((folder/'device.json').read_text())
    if (value.get('schema') != 1 or value.get('device') != 'sargo'
            or value.get('activeSlot') != 'a'
            or not re.fullmatch(r'[a-f0-9]{64}', str(value.get('serialSha256', '')))):
        raise ValueError('Expected a Sargo slot A workspace with a device identity')
    for name, sha in value.get('files', {}).items():
        path = folder/name
        if (name not in ('backup/manifest.json', 'layout.json') or path.is_symlink()
                or not path.resolve().is_relative_to(folder) or digest(path) != sha):
            raise ValueError('Workspace input changed: '+name)
    if set(value.get('files', {})) != {'backup/manifest.json', 'layout.json'}:
        raise ValueError('Workspace is missing its backup or storage inventory')
    backup = verify(folder/'backup')
    layout = json.loads((folder/'layout.json').read_text())
    for record in (backup, layout):
        if record.get('serialSha256') != value['serialSha256'] or record.get('activeSlot') != 'a':
            raise ValueError('Storage and boot backup must belong to the same phone on slot A')
    mount_table(layout)
    kernel = boot_kernel(folder/'backup/boot_a.img')
    if kernel != value.get('kernelSha256'):
        raise ValueError('Workspace kernel checksum changed')
    plan = {'device': 'sargo', 'activeSlot': 'a', 'serialSha256': value['serialSha256'],
            'backupDirectory': str(folder/'backup'),
            'backupManifestSha256': value['files']['backup/manifest.json'],
            'workspaceSha256': digest(folder/'device.json')}
    return plan, layout
