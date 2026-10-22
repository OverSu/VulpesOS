#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Verify/stage the private Nokia runtime. Does not install a boot image."""
import argparse
import hashlib
import json
from pathlib import Path
import shlex
import posixpath
import subprocess
import tarfile
from kaios_debug import KaiOSDebugger

REMOTE='/data/local/vulpes-beatles'


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def check(folder):
    build=json.loads((folder/'build.json').read_text())
    runtime=json.loads((folder/'runtime.json').read_text())
    if build['device']!='beatles' or runtime['runtimePath']!=REMOTE:raise ValueError('Unexpected device/runtime')
    if digest(folder/build['image'])!=build['sha256']:raise ValueError('Boot image checksum mismatch')
    order=['graphics-runtime.tar.gz','engine-runtime.tar.gz','gaia-shared.tar.gz','trial-overlay.tar.gz']
    if runtime['archivesInExtractionOrder']!=order:raise ValueError('Unexpected extraction order')
    for name in order:
        record=runtime['archives'][name];path=folder/name
        if path.stat().st_size!=record['bytes'] or digest(path)!=record['sha256']:raise ValueError('Archive mismatch: '+name)
        with tarfile.open(path) as archive:
            for item in archive:
                p=Path(item.name)
                if p.is_absolute() or '..' in p.parts or item.isdev():raise ValueError('Unsafe archive member')
                if item.issym() or item.islnk():
                    target=posixpath.normpath(posixpath.join(posixpath.dirname(item.name) if item.issym() else '',item.linkname))
                    if target.startswith(('/', '../')) or target=='..':raise ValueError('Archive link escapes runtime')
                if any(part in ('gaia-profile','profiles','logs') for part in p.parts):raise ValueError('Profile/log included in runtime')
    return build,runtime


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',type=Path,required=True)
    parser.add_argument('--check',action='store_true',help='Validate local artifacts only')
    parser.add_argument('--update',action='store_true',help='Update an existing runtime, preserving its profile')
    args=parser.parse_args();folder=args.build.resolve();build,runtime=check(folder)
    if args.check:print('Boot and runtime checksums/archive layout: OK');return
    lines=subprocess.check_output(['adb','devices','-l'],text=True).splitlines()
    serials=[r.split()[0] for r in lines if 'model:Nokia_2720_Flip' in r.split() and r.split()[1]=='device']
    if len(serials)!=1:raise ValueError('Exactly one connected Nokia required')
    adb=['adb','-s',serials[0]]
    def shell(command):return subprocess.check_output(adb+['shell',command],text=True,timeout=900).strip()
    if shell('getprop ro.product.codename')!='beatles' or shell('getprop ro.build.version.incremental')!=build['firmware']:
        raise ValueError('Unsupported phone/firmware')
    if shell('getprop init.svc.b2g')!='running':raise ValueError('Stop the existing Vulpes trial first')
    exists=shell('test -d '+REMOTE+' && echo EXISTS')=='EXISTS'
    if exists and not args.update:raise ValueError('Runtime exists; use --update to preserve and update it')
    if not exists:
        with KaiOSDebugger(serials[0]) as client:
            console=client.request('root','getProcess',id=0)['form']['consoleActor']
            # ADB stages this private diagnostic tree; no persistent root service is installed.
            js='''(function(){var f=Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsIFile);f.initWithPath(%s);if(f.exists())throw Error('Already exists');f.create(1,493);f.permissions=493;var exe=Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsIFile);exe.initWithPath('/system/bin/chown');var process=Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);process.init(exe);var args=['2000:2000',f.path];process.run(true,args,args.length);return process.exitValue===0;})()''' % json.dumps(REMOTE)
            if client.evaluate(console,js) is not True:raise ValueError('Cannot prepare runtime directory')
    if shell('mkdir -p '+REMOTE+'/rootfs && rm -f '+REMOTE+'/runtime-ready && echo READY')!='READY':
        raise ValueError('Cannot prepare runtime')
    for name in runtime['archivesInExtractionOrder']:
        remote=REMOTE+'/'+name;print('Staging '+name,flush=True)
        subprocess.run(adb+['push',str(folder/name),remote],check=True,capture_output=True,timeout=900)
        if shell('/system/bin/busybox sha256sum '+shlex.quote(remote)).split()[0]!=runtime['archives'][name]['sha256']:
            raise ValueError('Phone transfer checksum mismatch')
        if not shell('/system/bin/busybox tar -xzf '+shlex.quote(remote)+' -C '+REMOTE+'/rootfs && echo EXTRACTED').endswith('EXTRACTED'):
            raise ValueError('Runtime extraction failed')
        shell('rm '+shlex.quote(remote))
    version=shell('cat '+REMOTE+'/rootfs/opt/firefox/application.ini')
    if 'Version=156.0.1' not in version.splitlines():raise ValueError('Wrong staged engine')
    shell('touch '+REMOTE+'/runtime-ready')
    print('Private runtime staged. Boot partition unchanged; image still requires a qualified boot route.')


if __name__=='__main__':main()
