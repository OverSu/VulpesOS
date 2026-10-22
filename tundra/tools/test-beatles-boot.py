#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Inspect Nokia Fastboot, optionally boot a verified image in RAM. Never flashes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',type=Path,required=True)
    parser.add_argument('--boot',action='store_true')
    args=parser.parse_args();folder=args.build.resolve()
    build=json.loads((folder/'build.json').read_text());image=folder/build['image']
    if build['device']!='beatles' or hashlib.sha256(image.read_bytes()).hexdigest()!=build['sha256']:
        raise ValueError('Unexpected build/image')
    rows=subprocess.check_output(['fastboot','devices'],text=True,timeout=10).splitlines()
    devices=[r.split()[0] for r in rows if len(r.split())==2 and r.split()[1]=='fastboot']
    if len(devices)!=1:raise RuntimeError('Exactly one device in Fastboot is required; no reboot, unlock or write attempted')
    base=['fastboot','-s',devices[0]]
    report={'timestamp':time.time(),'bootSent':False,'flashed':False}
    def query(*command):
        r=subprocess.run(base+list(command),capture_output=True,text=True,timeout=15)
        value=r.stdout+r.stderr;report[' '.join(command)]={'code':r.returncode,'output':value};return r.returncode,value
    _,product=query('getvar','product');_,info=query('oem','device-info')
    output=folder/'bootloader-inspection.json';output.write_text(json.dumps(report,indent=2)+'\n')
    if not args.boot:print('Inspection saved:',output);return
    if not re.search(r'(?im)\bproduct:\s*(?:beatles|Nokia_2720_Flip)\s*$',product):
        raise RuntimeError('Bootloader product not positively identified as Nokia beatles')
    if not re.search(r'(?im)\bDevice unlocked:\s*true\s*$',info):
        raise RuntimeError('Unlocked bootloader not confirmed; automatic unlock is deliberately not supported')
    result=subprocess.run(base+['boot',str(image)],capture_output=True,text=True,timeout=90)
    report['bootSent']=result.returncode==0;report['bootResult']={'code':result.returncode,'output':result.stdout+result.stderr}
    output.write_text(json.dumps(report,indent=2)+'\n')
    if result.returncode:raise RuntimeError('RAM boot rejected; inspect '+str(output))
    print('Image accepted for RAM boot. Gaia startup still needs validation; no partition written.')


if __name__=='__main__':main()
