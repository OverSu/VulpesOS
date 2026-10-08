#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Install a standalone Sargo package using Fastboot only (Python 3, any host OS).

Default: verify files and display the destructive installation plan.
--install --erase-userdata replaces the old OS and ALL files in userdata.
Keep a separate backup. The unlocked bootloader and device calibration remain.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys

PARTITIONS=('userdata','dtbo_a','vbmeta_a','boot_a')
NAMES={'userdata':'userdata.img','dtbo_a':'dtbo.img','vbmeta_a':'vbmeta.img','boot_a':'boot.img'}


def digest(path):
    sha=hashlib.sha256()
    with path.open('rb') as source:
        while block:=source.read(1024*1024):sha.update(block)
    return sha.hexdigest()


def sparse_size(path):
    with path.open('rb') as source:header=source.read(28)
    if len(header)!=28:raise ValueError('Truncated userdata image')
    magic,major,minor,file_header,chunk_header,block_size,blocks,chunks,crc=struct.unpack('<I4H4I',header)
    if magic!=0xed26ff3a or major!=1 or file_header!=28 or chunk_header!=12 or block_size!=4096 or not chunks:
        raise ValueError('Expected an Android sparse ext4 image')
    return block_size*blocks


def package(folder):
    folder=Path(folder).resolve()
    if (folder/'.incomplete').exists():raise ValueError('Package construction is incomplete')
    value=json.loads((folder/'package.json').read_text())
    if value.get('schema')!=1 or value.get('device')!='sargo' or value.get('storage')!='raw-userdata-ext4':
        raise ValueError('Wrong package model or storage format')
    if set(value.get('partitions',{}))!=set(PARTITIONS):raise ValueError('Unexpected partition write plan')
    for partition,record in value['partitions'].items():
        if record.get('file')!=NAMES[partition]:raise ValueError('Unexpected image filename')
        path=folder/record['file']
        if path.is_symlink() or path.stat().st_size!=record['bytes'] or digest(path)!=record['sha256']:
            raise ValueError('Image checksum or size mismatch: '+partition)
    if sparse_size(folder/'userdata.img')!=value['userdataBytes']:raise ValueError('Sparse userdata geometry changed')
    return value


def getvar(fastboot,serial,name):
    result=subprocess.run([fastboot,'-s',serial,'getvar',name],capture_output=True,text=True,check=True,timeout=15)
    for line in (result.stdout+'\n'+result.stderr).splitlines():
        match=re.fullmatch(r'(?:\(bootloader\)\s*)?'+re.escape(name)+r':\s*(.+)',line.strip())
        if match:return match[1].strip()
    raise ValueError('Missing Fastboot variable: '+name)


def preflight(fastboot,serial,value):
    info={name:getvar(fastboot,serial,name) for name in ('product','unlocked','current-slot')}
    if info['product']!='sargo' or info['unlocked']!='yes' or info['current-slot'] not in ('a','b'):
        raise ValueError('Requires an unlocked Pixel 3a (sargo), not Pixel 3a XL')
    for partition in PARTITIONS:
        size=int(getvar(fastboot,serial,'partition-size:'+partition),16)
        needed=value['userdataBytes'] if partition=='userdata' else value['partitions'][partition]['bytes']
        if needed>size:raise ValueError('Image exceeds partition: '+partition)
    return info


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package',type=Path,default=Path(__file__).resolve().parent)
    parser.add_argument('--serial')
    parser.add_argument('--install',action='store_true')
    parser.add_argument('--erase-userdata',action='store_true')
    parser.add_argument('--experimental',action='store_true')
    parser.add_argument('--reboot',action='store_true')
    args=parser.parse_args();value=package(args.package)
    print('Pixel 3a / Sargo: replace userdata, dtbo_a, vbmeta_a and boot_a; activate slot A.')
    print('ALL existing user data and the old OS in userdata will be lost. Bootloader remains unlocked.')
    print('No existing Android or Droidian installation is required.')
    if not args.install:
        print('Review only; no device command sent.');return
    if not args.erase_userdata:parser.error('--install requires --erase-userdata')
    if not value.get('flashQualified') and not args.experimental:
        parser.error('This candidate is not qualified; private tests require --experimental')
    fastboot=shutil.which('fastboot')
    if not fastboot:raise ValueError('Install Android platform-tools (fastboot) on the host computer')
    devices=subprocess.check_output([fastboot,'devices'],text=True,timeout=10).splitlines()
    serials=[line.split()[0] for line in devices if len(line.split())==2 and line.split()[1]=='fastboot']
    serial=args.serial
    if serial is None:
        if len(serials)!=1:raise ValueError('Connect exactly one Pixel or specify --serial')
        serial=serials[0]
    if serial not in serials:raise ValueError('Selected device not in Fastboot')
    info=preflight(fastboot,serial,value)
    report={'deviceSha256':hashlib.sha256(serial.encode()).hexdigest(),'preflight':info,'completed':[],'passed':False}
    path=args.package/'install-report.json'
    def save():path.write_text(json.dumps(report,indent=2)+'\n')
    save()
    subprocess.run([fastboot,'-s',serial,'erase','userdata'],check=True,timeout=300)
    report['completed'].append('erase:userdata');save()
    for partition in PARTITIONS:
        subprocess.run([fastboot,'-s',serial,'flash',partition,str((args.package/NAMES[partition]).resolve())],check=True,timeout=1200)
        report['completed'].append(partition);save()
    subprocess.run([fastboot,'-s',serial,'set_active','a'],check=True,timeout=30)
    report['passed']=True;save()
    if args.reboot:subprocess.run([fastboot,'-s',serial,'reboot'],check=True,timeout=30)
    print('Images written. Keep the bootloader unlocked. Select Start to launch Vulpes.')


if __name__=='__main__':main()
