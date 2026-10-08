#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Restore a private full-storage backup after a standalone Sargo test.

Default: verify the archive and partition backups only. --restore overwrites
userdata and the three slot-A boot partitions. Backups are device-specific.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess


def digest(path):
    sha=hashlib.sha256()
    with path.open('rb') as source:
        while block:=source.read(4*1024**2):sha.update(block)
    return sha.hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup',required=True,type=Path)
    parser.add_argument('--restore',action='store_true')
    args=parser.parse_args();folder=args.backup.resolve()
    manifest=json.loads((folder/'recovery.json').read_text())
    if manifest.get('device')!='sargo' or manifest.get('activeSlot')!='a':raise ValueError('Wrong recovery target')
    data=json.loads((folder/'userdata.json').read_text())
    if not data.get('checked') or data.get('archive')!='userdata-original.raw.gz':raise ValueError('Unverified userdata backup')
    if not data.get('sourceWasUnmounted') or manifest.get('userdataSha256')!=data['sha256'] or manifest.get('userdataBytes')!=data['bytes']:
        raise ValueError('Storage backup is not bound to this recovery kit')
    for name,record in manifest['files'].items():
        if name not in ('boot_a.img','dtbo_a.img','vbmeta_a.img'):raise ValueError('Unexpected recovery partition')
        path=folder/name
        if path.is_symlink() or path.stat().st_size!=record['bytes'] or digest(path)!=record['sha256']:raise ValueError('Partition backup changed: '+name)
    if set(manifest['files'])!={'boot_a.img','dtbo_a.img','vbmeta_a.img'}:raise ValueError('Incomplete boot backup set')
    archive=folder/data['archive'];sha=hashlib.sha256();count=0
    with gzip.open(archive,'rb') as source:
        while block:=source.read(4*1024**2):
            count+=len(block)
            if count>data['bytes']:raise ValueError('Oversized backup')
            sha.update(block)
    if count!=data['bytes'] or sha.hexdigest()!=data['sha256']:raise ValueError('Storage backup changed')
    print('Private boot and full userdata backups verified.')
    if not args.restore:
        print('No phone action. --restore replaces its current userdata.');return
    fastboot=shutil.which('fastboot')
    if not fastboot:raise ValueError('Fastboot is required')
    serials=[line.split()[0] for line in subprocess.check_output([fastboot,'devices'],text=True).splitlines() if len(line.split())==2]
    matches=[serial for serial in serials if hashlib.sha256(serial.encode()).hexdigest()==manifest['serialSha256']]
    if len(matches)!=1:raise ValueError('Original phone not present in Fastboot')
    serial=matches[0]
    # Use the standalone installer's strict Fastboot variable parser.
    import importlib.util
    spec=importlib.util.spec_from_file_location('flash',Path(__file__).with_name('flash-standalone-sargo.py'))
    flash=importlib.util.module_from_spec(spec);spec.loader.exec_module(flash)
    if flash.getvar(fastboot,serial,'product')!='sargo' or flash.getvar(fastboot,serial,'unlocked')!='yes':raise ValueError('Wrong or locked phone')
    if int(flash.getvar(fastboot,serial,'partition-size:userdata'),16)!=data['bytes']:raise ValueError('Storage geometry changed')
    raw=folder/'userdata-restore.raw'
    if raw.exists():
        if raw.stat().st_size!=data['bytes'] or digest(raw)!=data['sha256']:raise ValueError('Existing restoration file changed')
    else:
        if shutil.disk_usage(folder).free<data['bytes']+1024**3:raise ValueError('Not enough host space to decompress recovery image')
        partial=folder/'userdata-restore.partial'
        with gzip.open(archive,'rb') as source,partial.open('xb') as target:
            while block:=source.read(4*1024**2):
                if not block.strip(b'\0'):target.seek(len(block),1)
                else:target.write(block)
            target.truncate(data['bytes'])
        if digest(partial)!=data['sha256']:raise ValueError('Decompressed backup changed')
        partial.rename(raw)
    subprocess.run([fastboot,'-s',serial,'erase','userdata'],check=True,timeout=300)
    subprocess.run([fastboot,'-s',serial,'-S','256M','flash','userdata',str(raw)],check=True,timeout=7200)
    for name in ('dtbo_a.img','vbmeta_a.img','boot_a.img'):
        subprocess.run([fastboot,'-s',serial,'flash',name.removesuffix('.img'),str(folder/name)],check=True,timeout=120)
    subprocess.run([fastboot,'-s',serial,'set_active','a'],check=True,timeout=30)
    print('Original userdata and boot restored. Select Start; bootloader remains unlocked.')


if __name__=='__main__':main()
