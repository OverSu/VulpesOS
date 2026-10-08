#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build a fresh ext4 userdata image. No connection to a phone or partition writes."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid
from persistent_state import FEATURES
from tundra import digest
from standalone_volume import checked_volume


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--hardware', type=Path, help='Locally supplied pinned vendor/modem images')
    parser.add_argument('--size-mib', type=int, default=8192)
    args = parser.parse_args()
    if not 5120 <= args.size_mib <= 32768:
        parser.error('Choose 5120–32768 MiB')
    spec = importlib.util.spec_from_file_location('stage', Path(__file__).with_name('stage-sargo-files.py'))
    stage = importlib.util.module_from_spec(spec); spec.loader.exec_module(stage)
    files = stage.inputs(args.prepared)
    hardware = {}
    if args.hardware:
        lock = json.loads((Path(__file__).resolve().parents[1]/'manifests/sargo-hardware.json').read_text())
        hardware = lock['images']
        for name, record in hardware.items():
            source = args.hardware/record['source']
            if source.is_symlink() or source.stat().st_size != record['bytes'] or digest(source) != record['sha256']:
                raise ValueError('Hardware image changed: '+name)
    payload_bytes = sum(p.stat().st_size for _,_,p,_ in files)
    payload_bytes += sum(record['bytes'] for record in hardware.values())
    if args.size_mib*1024**2 < payload_bytes+512*1024**2:
        raise ValueError('Insufficient space for payload and filesystem metadata')
    os.umask(0o077)
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=False)
    (out/'.incomplete').touch()
    seed = out/'seed'; seed.mkdir()
    for kind, name, source, record in files:
        target = seed/'tundra'/kind/name; target.parent.mkdir(parents=True, exist_ok=True)
        # mke2fs reads the file; a hard link avoids another multi-gigabyte copy.
        os.link(source, target)
    if hardware:
        directory = seed/'tundra/hardware'; directory.mkdir()
        for name, record in hardware.items():
            os.link(args.hardware/record['source'], directory/name)
    system = json.loads((args.prepared/'system.json').read_text())
    state = json.loads((args.prepared/'data/state.json').read_text())
    identifier = str(uuid.uuid4())
    (seed/'tundra-volume-id').write_text(identifier+'\n')
    image = out/'userdata.ext4'
    with image.open('xb') as f: f.truncate(args.size_mib*1024**2)
    subprocess.run(['mke2fs','-q','-t','ext4','-F','-b','4096','-I','256','-O',FEATURES,
                    '-U',identifier,'-L','TUNDRA_VOLUME','-d',str(seed),str(image)],check=True)
    names=['/tundra-volume-id','/tundra','/tundra/images','/tundra/data']
    names += ['/tundra/'+kind+'/'+name for kind,name,_,_ in files]
    if hardware:
        names += ['/tundra/hardware', *['/tundra/hardware/'+name for name in hardware]]
    for name in names:
        for field in ('uid','gid'):
            subprocess.run(['debugfs','-w','-R',f'set_inode_field {name} {field} 0',str(image)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    result = subprocess.run(['e2fsck','-f','-n',str(image)],capture_output=True,text=True)
    (out/'filesystem-check.txt').write_text(result.stdout+result.stderr)
    if result.returncode: raise ValueError('Standalone filesystem check failed')
    manifest={'schema':1,'device':'sargo','storage':'raw-userdata-ext4','image':image.name,
              'uuid':identifier,'bytes':image.stat().st_size,'imageSha256':digest(image),
              'systemImageSha256':system['imageSha256'],'stateUuid':state['uuid'],
              'filesystemCheckPassed':True,'flashReady':False,'hardwareImages':hardware,
              'scope':'Fresh standalone storage; flashing userdata destroys previous user data'}
    (out/'volume.json').write_text(json.dumps(manifest,indent=2)+'\n')
    checked_volume(out/'volume.json')
    (out/'.incomplete').unlink()
    print(out/'volume.json')


if __name__ == '__main__': main()
