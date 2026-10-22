#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Export shared Gaia and its host for the private Nokia experiment."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from project import SOURCE_OVERRIDES, validate_assets


def shared_files():
    validate_assets()
    files = set()
    for directory in ('assets','host','services','adapters','overrides','gaia/shared'):
        files.update(p for p in (ROOT/directory).rglob('*') if p.is_file())
    for app, paths in SOURCE_OVERRIDES.items():
        files.update(ROOT/'gaia/apps'/app/path for path in paths)
    files.update(ROOT/path for path in ('release.json','engine-lock.json','tools/project.py',
        'tools/serve-gaia.py','tools/installed_apps.py'))
    return sorted(p for p in files if '__pycache__' not in p.parts and p.suffix!='.pyc')


def main():
    out = ROOT/'tundra/out/beatles/gecko-156.0.1'
    files = shared_files()
    records = {}
    with tarfile.open(out/'gaia-shared.tar.gz','w:gz',compresslevel=1,dereference=True) as archive:
        for path in sorted(files):
            if '__pycache__' in path.parts or path.suffix=='.pyc':continue
            relative=str(path.relative_to(ROOT))
            archive.add(path,arcname='opt/vulpes/'+relative)
            records[relative]=hashlib.sha256(path.read_bytes()).hexdigest()
    with (out/'gaia-shared.tar.gz').open('rb') as stream:
        digest=hashlib.file_digest(stream,'sha256').hexdigest()
    record={'device':'beatles','gaiaSource':'shared workspace',
            'sha256':digest,'bytes':(out/'gaia-shared.tar.gz').stat().st_size,'files':records}
    (out/'gaia-shared.json').write_text(json.dumps(record,indent=2)+'\n')
    print('Shared Gaia files:',len(records),'Archive bytes:',record['bytes'])


if __name__=='__main__':main()
