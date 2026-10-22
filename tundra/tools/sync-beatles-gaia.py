#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Synchronize the shared Gaia payload into an idle private Nokia runtime."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import shlex
import subprocess
import tarfile

ROOT=Path(__file__).resolve().parents[2]
REMOTE='/data/local/vulpes-beatles/rootfs'
PREFIXES=('assets/','host/','services/','adapters/','overrides/','gaia/shared/','gaia/apps/')
FILES={'release.json','engine-lock.json','tools/project.py','tools/serve-gaia.py','tools/installed_apps.py'}

def managed(path):
    p=PurePosixPath(path)
    return not p.is_absolute() and '..' not in p.parts and (path in FILES or path.startswith(PREFIXES))

def changes(current, previous):
    if not isinstance(previous,dict) or any(not managed(p) for p in previous):
        raise ValueError('Invalid previous Gaia inventory')
    return sorted(p for p,digest in current.items() if previous.get(p)!=digest), sorted(set(previous)-set(current))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serial',required=True)
    args=parser.parse_args()
    adb=['adb','-s',args.serial]
    def shell(command):return subprocess.check_output(adb+['shell',command],text=True,timeout=180).strip()
    if shell('getprop ro.product.codename')!='beatles':raise ValueError('Unexpected device')
    if shell('getprop init.svc.b2g')!='running':raise ValueError('Stop Vulpes before synchronizing Gaia')
    if shell('test -d '+REMOTE+'/opt/vulpes/assets && echo ready')!='ready':raise ValueError('Stage the Nokia runtime first')
    spec=importlib.util.spec_from_file_location('package_gaia',ROOT/'tundra/tools/package-beatles-gaia.py')
    package=importlib.util.module_from_spec(spec);spec.loader.exec_module(package)
    files=package.shared_files()
    current={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    raw=shell('cat '+REMOTE+'/work/gaia-sync.json 2>/dev/null || true')
    previous=json.loads(raw).get('files',{}) if raw else {}
    changed,removed=changes(current,previous)
    out=ROOT/'tundra/out/beatles/gecko-156.0.1'
    manifest=out/'gaia-sync.json'
    manifest.write_text(json.dumps({'files':current},indent=2)+'\n')
    if changed or removed:
        archive=out/'gaia-sync.tar.gz'
        with tarfile.open(archive,'w:gz',compresslevel=1,dereference=True) as tar:
            for name in changed:tar.add(ROOT/name,arcname='opt/vulpes/'+name)
        digest=hashlib.sha256(archive.read_bytes()).hexdigest()
        remote=REMOTE+'/work/gaia-sync.tar.gz'
        subprocess.run(adb+['push',str(archive),remote],check=True,capture_output=True,timeout=300)
        if shell('/system/bin/busybox sha256sum '+remote).split()[0]!=digest:raise ValueError('Gaia transfer checksum mismatch')
        shell('/system/bin/busybox tar -xzf '+remote+' -C '+REMOTE+' && rm '+remote)
        # Only files recorded by this synchronizer may be removed; profiles stay outside its inventory.
        for start in range(0,len(removed),100):
            shell('rm -f '+' '.join(shlex.quote(REMOTE+'/opt/vulpes/'+p) for p in removed[start:start+100]))
    subprocess.run(adb+['push',str(manifest),REMOTE+'/work/gaia-sync.json.new'],check=True,capture_output=True)
    shell('mv '+REMOTE+'/work/gaia-sync.json.new '+REMOTE+'/work/gaia-sync.json')
    print(json.dumps({'files':len(current),'updated':len(changed),'removed':len(removed),'profilePreserved':True}))

if __name__=='__main__':main()
