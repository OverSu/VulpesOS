#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build an unsigned private Nokia boot trial. Never flashes or unlocks a phone."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from beatles_boot import unpack_boot, pack_boot, read_cpio, write_cpio, add_file

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/'tundra/out/beatles/gecko-156.0.1'


def digest(data):return hashlib.sha256(data).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup',type=Path,default=ROOT/'tundra/out/beatles/backups/20261017')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();out=args.output.resolve()
    if out.exists():raise ValueError('Choose a new output directory')
    backup=json.loads((args.backup/'backup.json').read_text())
    verified=json.loads((args.backup/'verification.json').read_text())
    if backup['device']!='beatles' or backup['firmware']!='40.00.17.01':raise ValueError('Unsupported firmware')
    for name in ('boot','recovery','aboot','abootbak'):
        data=(args.backup/(name+'.img')).read_bytes(); record=backup['partitions'][name]
        if len(data)!=record['bytes'] or digest(data)!=record['sha256'] or verified['partitions'][name]['sha256']!=record['sha256']:
            raise ValueError('Backup verification failed: '+name)
    original=(args.backup/'boot.img').read_bytes();parts=unpack_boot(original)
    entries=read_cpio(parts['ramdisk'])
    rc=entries['init.b2g.rc']['data']
    expected=b'service b2g /system/bin/b2g.sh\n    class main\n'
    if rc.count(expected)!=1:raise ValueError('Unexpected KaiOS service definition')
    entries['init.b2g.rc']['data']=rc.replace(expected,expected+b'    disabled\n')
    entries['init.rc']['data']+=b'\nimport /init.vulpes.rc\n'
    out.mkdir(parents=True,mode=0o700)
    sysroot=ENGINE/'sysroot/rootfs'
    compiler=[str(ENGINE/'mozbuild/clang/bin/clang'),'--target=arm-linux-gnueabihf',
        '--sysroot='+str(sysroot),'--gcc-install-dir='+str(sysroot/'usr/lib/gcc/arm-linux-gnueabihf/12'),
        '-fuse-ld=lld','-march=armv7-a','-mfpu=neon','-mfloat-abi=hard','-O2','-Wall','-Wextra','-Werror']
    subprocess.run(compiler+['-static',str(ROOT/'tundra/probes/beatles-control-client.c'),'-o',str(out/'control-client')],check=True)
    supervisor=out/'vulpes-display'
    subprocess.run(compiler+['-static',str(ROOT/'tundra/probes/beatles-display-session.c'),'-o',str(supervisor)],check=True)
    add_file(entries,'sbin/vulpes-display',supervisor.read_bytes(),0o755)
    for name in ('init.vulpes.rc','vulpes-boot.sh'):
        add_file(entries,name,(ROOT/'tundra/devices/beatles/boot'/name).read_bytes(),0o755 if name.endswith('.sh') else 0o644)
    ramdisk=write_cpio(entries);image=pack_boot(original,ramdisk)
    if len(image)>backup['partitions']['boot']['bytes']:raise ValueError('Boot partition too small')
    check=unpack_boot(image)
    if check['kernel']!=parts['kernel']:raise ValueError('Kernel changed')
    reread=read_cpio(check['ramdisk'])
    for name,value in entries.items():
        if reread[name]['data']!=value['data']:raise ValueError('Ramdisk data mismatch: '+name)
        # Only size/name size may change when serializing; owners and modes must survive.
        if any(reread[name]['fields'][i]!=value['fields'][i] for i in (0,1,2,3,4,5,7,8,9,10,12)):
            raise ValueError('Ramdisk metadata mismatch: '+name)
    name='vulpes-beatles-boot-trial-UNSIGNED.img';(out/name).write_bytes(image)
    record={'device':'beatles','firmware':'40.00.17.01','image':name,'sha256':digest(image),
        'bytes':len(image),'kernelSha256':digest(parts['kernel']),'originalBootSha256':digest(original),
        'controlClientSha256':digest((out/'control-client').read_bytes()),
        'gecko':'156.0.1','runtimePath':'/data/local/vulpes-beatles','deadlineSeconds':1800,
        'unsigned':True,'bootTested':False,'flashReady':False,'standaloneSystem':False,
        'dependencies':['Existing vendor /system and modem partitions','Prepared persistent runtime, not included in boot partition'],
        'recovery':'KaiOS fallback if runtime is missing or fails, or after 30 minutes; boot partition restoration not qualified',
        'sourceFiles':{str(p.relative_to(ROOT)):digest(p.read_bytes()) for p in [Path(__file__),ROOT/'tundra/tools/beatles_boot.py',ROOT/'tundra/probes/beatles-display-session.c',ROOT/'tundra/probes/beatles-control-client.c',ROOT/'tundra/probes/beatles-lid.h',ROOT/'tundra/probes/beatles-hall.h',ROOT/'tundra/devices/beatles/boot/init.vulpes.rc',ROOT/'tundra/devices/beatles/boot/vulpes-boot.sh']}}
    (out/'build.json').write_text(json.dumps(record,indent=2)+'\n')
    (out/'SHA256SUMS').write_text(record['sha256']+'  '+name+'\n')
    print('Built private unsigned boot trial:',out/name)
    print('Not boot-tested or flash-qualified; existing vendor system and staged runtime required.')


if __name__=='__main__':main()
