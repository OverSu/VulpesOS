# SPDX-License-Identifier: MPL-2.0
"""Describe the dedicated ext4 data file used by a private Sargo installation."""
import hashlib
import json
import re
import uuid
from pathlib import Path

FEATURES = 'none,has_journal,ext_attr,dir_index,filetype,extent,sparse_super,large_file,uninit_bg,dir_nlink,extra_isize'


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def validate_manifest(path):
    path = Path(path).resolve()
    value = json.loads(path.read_text())
    if value.get('schema') != 1 or value.get('device') != 'sargo':
        raise ValueError('Expected a Sargo data-image manifest')
    identifier = value.get('uuid')
    if not isinstance(identifier, str) or str(uuid.UUID(identifier)) != identifier:
        raise ValueError('Invalid data filesystem UUID')
    if value.get('image') != identifier+'.ext4':
        raise ValueError('Data image filename does not match its UUID')
    size = value.get('bytes')
    if type(size) is not int or not 512*1024**2 <= size <= 8*1024**3 or size % 4096:
        raise ValueError('Invalid data image size')
    for name in ('imageSha256', 'systemImageSha256'):
        if not re.fullmatch('[a-f0-9]{64}', str(value.get(name, ''))):
            raise ValueError('Invalid '+name)
    image = path.parent/value['image']
    if image.is_symlink() or image.stat().st_size != size or digest(image) != value['imageSha256']:
        raise ValueError('Initial data image changed')
    if value.get('filesystemCheckPassed') is not True:
        raise ValueError('Data filesystem has not passed verification')
    return value
