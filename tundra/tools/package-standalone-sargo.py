#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Package boot, fresh userdata and boot metadata for a standalone installation.

Builds local artifacts only. A candidate is never marked flash-qualified here.
Private development credentials, if present in boot, prohibit redistribution.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
from standalone_volume import checked_volume
from tundra import ROOT,digest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',required=True,type=Path)
    parser.add_argument('--volume',required=True,type=Path)
    parser.add_argument('--dtbo',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args();os.umask(0o077)
    volume=checked_volume(args.volume);build=json.loads((args.build/'build.json').read_text())
    if build.get('storageMode')!='raw-userdata-ext4' or build.get('watchdogSeconds') is not None or build.get('localDebugger'):
        raise ValueError('Expected a persistent standalone boot without debugger or timed reboot')
    if build['standaloneVolume']!=volume or not volume.get('hardwareImages'):
        raise ValueError('Boot must match a volume with bundled vendor/modem images')
    boot=args.build/build['image']
    if digest(boot)!=build['imageSha256']:raise ValueError('Boot image changed')
    spec=importlib.util.spec_from_file_location('sources',ROOT/'tools/test-rescue-boot.py')
    sources=importlib.util.module_from_spec(spec);spec.loader.exec_module(sources);sources.verify_sources(args.build,build)
    lock=json.loads((ROOT/'manifests/sargo-hardware.json').read_text())
    if args.dtbo.stat().st_size!=lock['dtbo']['bytes'] or digest(args.dtbo)!=lock['dtbo']['sha256']:
        raise ValueError('Unqualified device-tree overlay')
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
    (out/'.incomplete').touch()
    shutil.copyfile(boot,out/'boot.img');shutil.copyfile(args.dtbo,out/'dtbo.img')
    subprocess.run(['avbtool','make_vbmeta_image','--flags','3','--padding_size','4096','--algorithm','NONE','--output',str(out/'vbmeta.img')],check=True)
    subprocess.run(['img2simg',str(args.volume.parent/volume['image']),str(out/'userdata.img')],check=True)
    # Roundtrip verifies the actual sparse payload, not only its header.
    restored=out/'userdata-roundtrip.ext4'
    subprocess.run(['simg2img',str(out/'userdata.img'),str(restored)],check=True)
    if digest(restored)!=volume['imageSha256']:raise ValueError('Sparse image roundtrip mismatch')
    restored.unlink()
    files={name:{'file':file,'bytes':(out/file).stat().st_size,'sha256':digest(out/file)}
           for name,file in [('boot_a','boot.img'),('userdata','userdata.img'),('dtbo_a','dtbo.img'),('vbmeta_a','vbmeta.img')]}
    value={'schema':1,'device':'sargo','storage':'raw-userdata-ext4','partitions':files,
           'userdataBytes':volume['bytes'],'userdataRawSha256':volume['imageSha256'],
           'volumeUuid':volume['uuid'],'systemImageSha256':volume['systemImageSha256'],
           'flashQualified':False,'containsPrivateMaintenanceKey':bool(build.get('containsPrivateTrialHostKey')),
           'redistributionReady':False,'previousOsRequired':False,
           'requirements':['Unlocked Pixel 3a (sargo)','Original device calibration partitions retained'],
           'scope':'Experimental standalone installation candidate; userdata is replaced in full'}
    (out/'package.json').write_text(json.dumps(value,indent=2)+'\n')
    shutil.copyfile(ROOT/'tools/flash-standalone-sargo.py',out/'flash-standalone-sargo.py')
    (out/'SHA256SUMS').write_text(''.join(digest(p)+'  '+p.name+'\n' for p in sorted(out.iterdir()) if p.is_file() and p.name not in ('.incomplete','SHA256SUMS')))
    (out/'.incomplete').unlink();print(out/'package.json')


if __name__=='__main__':main()
