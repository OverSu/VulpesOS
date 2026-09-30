#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Review, install or restore a qualified private Sargo boot image.

The system and data files must already be staged and tested on the inventoried
phone. Only boot_a can be written. No userdata formatting, slot switch or erase.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
from tundra import ROOT, digest, now, save


def load(name, path):
    spec=importlib.util.spec_from_file_location(name,path)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value)
    return value


def checked_build(folder):
    folder=Path(folder).resolve()
    build=json.loads((folder/'build.json').read_text())
    if build.get('localDebugger'):raise ValueError('Diagnostic debugger image cannot be flashed')
    qualification=json.loads((folder/'qualification.json').read_text())
    if (not qualification.get('passed') or not qualification.get('privateInstallReady')
            or not build.get('persistentState') or build.get('watchdogSeconds') is not None
            or build.get('interactiveDiagnostics')):
        raise ValueError('Expected a qualified persistent image without interactive tests or a deadline')
    image=(folder/build['image']).resolve();image.relative_to(folder)
    if digest(image)!=build['imageSha256'] or qualification.get('imageSha256')!=build['imageSha256']:
        raise ValueError('Boot image provenance mismatch')
    evidence=qualification.get('evidenceSha256')
    if not evidence:raise ValueError('Qualification evidence missing')
    for name,expected in evidence.items():
        path=(folder/name).resolve();path.relative_to(folder)
        if digest(path)!=expected:raise ValueError('Qualification evidence changed: '+name)
    persistence=qualification.get('persistence',{})
    if not (persistence.get('passed') and persistence.get('distinctBoots')
            and persistence.get('sameGaiaSetting') and persistence.get('restored')):
        raise ValueError('A real persistence round trip is required')
    load('rescue_check',ROOT/'tools/test-rescue-boot.py').verify_sources(folder,build)
    return build,qualification,image


def flash_boot_a(serial, image):
    # Keep the write surface separate from the RAM boot tools.
    subprocess.run(['fastboot','-s',serial,'flash','boot_a',str(image)],check=True,timeout=90)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',type=Path,required=True)
    action=parser.add_mutually_exclusive_group()
    action.add_argument('--flash',action='store_true',help='Install this boot image in boot_a; does not reboot automatically')
    action.add_argument('--restore',action='store_true',help='Restore the verified original boot_a backup; retain Tundra data')
    args=parser.parse_args();os.umask(0o077)
    boot=load('sargo_boot',ROOT/'tools/test-sargo-boot.py')
    plan,_=boot.checked_plan()
    if args.restore:
        # Recovery must still work if the candidate or its proof was damaged.
        image=Path(plan['backupDirectory'])/'boot_a.img'
        build={'serialSha256':plan['serialSha256']}
    else:
        build,qualification,image=checked_build(args.build)
        if plan['serialSha256']!=build['serialSha256']:raise ValueError('Build targets another phone')
    print('Private Sargo installation plan')
    print('Boot image:',image)
    if not args.restore:
        print('System file: /tundra/images/'+build['systemImage']['imageSha256']+'.ext4')
        print('Data file: /tundra/data/'+build['persistentState']['uuid']+'.ext4')
    print('Only boot_a may be written. Existing files, userdata and slot B are retained.')
    if not (args.flash or args.restore):
        print('Review only. Use --flash or --restore explicitly with the inventoried phone in Fastboot.')
        return
    serial=boot.find_fastboot(build['serialSha256'],15)
    identity=boot.check_device(serial,build['serialSha256'])
    report={'recordedAt':now(),'operation':'restore' if args.restore else 'install',
            'partition':'boot_a','imageSha256':digest(image),'identity':identity,
            'erasesSent':False,'slotChanged':False,'completed':False}
    path=args.build/('restore-report.json' if args.restore else 'install-report.json')
    save(path,report)
    flash_boot_a(serial,image)
    report['completed']=True;save(path,report)
    print('boot_a written. Select Start in Fastboot to boot. No other partition was flashed.')
    if not args.restore:
        print('After Gaia passes startup checks, finalize the A/B success flag:')
        print('  python3 tundra/tools/finalize-sargo-slot.py --build '+str(args.build)+' --mark-successful')
        print('Do not repeat test reboots before this step: the bootloader has a limited retry count.')


if __name__=='__main__':main()
