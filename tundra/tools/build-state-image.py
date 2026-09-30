#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Create a new private data image; never formats a phone partition."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import uuid
from persistent_state import FEATURES, digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--system-image', type=Path, required=True)
    parser.add_argument('--size-mib', type=int, default=2048)
    args = parser.parse_args()
    if args.size_mib < 512 or args.size_mib > 8192:
        parser.error('Choose 512–8192 MiB')
    system = json.loads(args.system_image.read_text())
    base = args.system_image.parent/system['image']
    if system.get('device') != 'sargo' or not system.get('filesystemCheckPassed') or digest(base) != system['imageSha256']:
        raise ValueError('System image provenance mismatch')
    os.umask(0o077)
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    seed = out/'seed'
    seed.mkdir()
    (seed/'system.sha256').write_text(system['imageSha256']+'\n')
    for directory in ('upper','work'):
        (seed/directory).mkdir(mode=0o755 if directory == 'upper' else 0o700)
    (seed/'upper').chmod(0o755)
    identifier = str(uuid.uuid4())
    image = out/(identifier+'.ext4')
    with image.open('xb') as stream:
        stream.truncate(args.size_mib*1024**2)
    subprocess.run(['mke2fs','-q','-t','ext4','-F','-b','4096','-I','256','-O',FEATURES,
                    '-U',identifier,'-L','TUNDRA_DATA','-d',str(seed),str(image)],check=True)
    # Root owns the overlay metadata, regardless of the build account's UID.
    for name in ('/system.sha256','/upper','/work'):
        for field in ('uid','gid'):
            subprocess.run(['debugfs','-w','-R',f'set_inode_field {name} {field} 0',str(image)],
                           check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    check = subprocess.run(['e2fsck','-f','-n',str(image)],text=True,capture_output=True)
    (out/'filesystem-check.txt').write_text(check.stdout+check.stderr)
    if check.returncode:raise RuntimeError('Data image failed filesystem verification')
    manifest = {'schema':1,'device':'sargo','uuid':identifier,'image':image.name,
                'imageSha256':digest(image),'bytes':image.stat().st_size,
                'systemImageSha256':system['imageSha256'],'filesystemCheckPassed':True,
                'scope':'Private persistent overlay; containing filesystem retained; no partition formatting'}
    (out/'state.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(out/'state.json')


if __name__ == '__main__':main()
