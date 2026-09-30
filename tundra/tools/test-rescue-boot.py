#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Temporarily boot the private rescue image on the inventoried Sargo. Never flash."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import time
from tundra import ROOT,digest,save,now


def verify_sources(folder, build):
    base=folder/'sources' if build.get('sourceSnapshot') else ROOT.parent
    for name,sha in {**{'tundra/'+n:h for n,h in build['sources'].items()},
                     **build.get('sharedUiHashes',{})}.items():
        path=(base/name).resolve()
        path.relative_to(base.resolve())
        if digest(path)!=sha:raise ValueError('Build source changed: '+name)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--build',type=Path,required=True);p.add_argument('--boot',action='store_true');args=p.parse_args()
    spec=importlib.util.spec_from_file_location('boot',ROOT/'tools/test-sargo-boot.py');boot=importlib.util.module_from_spec(spec);spec.loader.exec_module(boot)
    plan,_=boot.checked_plan();folder=args.build.resolve();build=json.loads((folder/'build.json').read_text());image=folder/build['image']
    if build['imageSha256']!=digest(image) or build['serialSha256']!=plan['serialSha256'] or not build['roundtripPassed']:
        raise ValueError('Image or target provenance mismatch')
    verify_sources(folder,build)
    print('Private image, source and backup provenance checked.',flush=True)
    if not args.boot:return
    # The inventoried HAL can take about three minutes to shut down after SSH
    # closes. Allow that transition; identity checks still precede any boot.
    serial=boot.find_fastboot(plan['serialSha256'],300);values=boot.check_device(serial,plan['serialSha256'])
    report={'recordedAt':now(),'imageSha256':digest(image),'bootloader':values,'operation':'fastboot boot','flashCommandsSent':False}
    result=boot.fastboot(serial,'boot',str(image));report['output']=result.stdout+result.stderr
    save(folder/'boot-report.json',report)
    deadline=build['watchdogSeconds']
    message=f'Automatic return after {deadline} seconds.' if deadline else 'Persistent development boot; no automatic reboot.'
    print(f'RAM boot sent. USB SSH: 10.15.19.82:2222. {message}',flush=True)


if __name__=='__main__':main()
