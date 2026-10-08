# SPDX-License-Identifier: MPL-2.0
"""Validate the fresh userdata filesystem used by standalone Sargo images."""
import json
from pathlib import Path
import re
import uuid
from tundra import digest


def checked_volume(path, verify_image=True):
    path = Path(path)
    value = json.loads(path.read_text())
    if (value.get('schema') != 1 or value.get('device') != 'sargo'
            or value.get('storage') != 'raw-userdata-ext4'
            or value.get('image') != 'userdata.ext4'
            or value.get('filesystemCheckPassed') is not True):
        raise ValueError('Expected a checked standalone Sargo volume')
    identifier = value.get('uuid')
    if not isinstance(identifier, str) or str(uuid.UUID(identifier)) != identifier:
        raise ValueError('Invalid volume UUID')
    for key in ('imageSha256', 'systemImageSha256'):
        if not re.fullmatch(r'[a-f0-9]{64}', value.get(key, '')):
            raise ValueError('Invalid '+key)
    if type(value.get('bytes')) is not int or not 5*1024**3 <= value['bytes'] <= 32*1024**3:
        raise ValueError('Invalid standalone filesystem size')
    hardware = value.get('hardwareImages', {})
    if hardware:
        lock = json.loads((Path(__file__).resolve().parents[1]/'manifests/sargo-hardware.json').read_text())
        if hardware != lock['images']:
            raise ValueError('Unqualified standalone hardware images')
    if verify_image:
        image = path.parent/value['image']
        if image.is_symlink() or image.stat().st_size != value['bytes'] or digest(image) != value['imageSha256']:
            raise ValueError('Standalone volume changed')
    return value
