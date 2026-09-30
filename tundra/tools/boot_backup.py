# SPDX-License-Identifier: MPL-2.0
"""Validate the inventoried Sargo partition set before any boot experiment."""
import json
from pathlib import Path
from tundra import digest

SIZES = {'boot_a.img': 67108864, 'boot_b.img': 67108864,
         'dtbo_a.img': 8417280, 'dtbo_b.img': 8417280,
         'vbmeta_a.img': 65536, 'vbmeta_b.img': 65536}


def verify(folder):
    folder = Path(folder).resolve()
    manifest = json.loads((folder / 'manifest.json').read_text())
    if manifest.get('device') != 'sargo' or manifest.get('rawPartitions') is not True:
        raise ValueError('Expected a raw Sargo partition backup')
    if set(manifest.get('files', {})) != set(SIZES):
        raise ValueError('Expected exactly boot, DTBO and vbmeta for both slots')
    for name, size in SIZES.items():
        path = folder / name
        record = manifest['files'][name]
        if path.is_symlink() or not path.is_file() or path.stat().st_size != size or record['bytes'] != size:
            raise ValueError('Unexpected partition file or size: ' + name)
        if digest(path) != record['sha256']:
            raise ValueError('Partition checksum mismatch: ' + name)
    return manifest
