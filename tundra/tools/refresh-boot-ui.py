#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Refresh shared Gaia files in a verified private RAM boot, preserving hardware."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import io
import tarfile
from ramdisk_reference import read_newc
from shared_ui import build_payload, compress_archive
from tundra import ROOT, checked_source, cpio, digest, save


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',type=Path,required=True)
    p.add_argument('--expected-sha256',required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--settings-adapters',action='store_true',help='Also replace native Settings bridges and hotspot firewall configuration')
    args=p.parse_args();os.umask(0o077)
    base=args.base.resolve();out=args.output.resolve()
    build=json.loads((base/'build.json').read_text())
    image=base/build['image']
    if digest(image)!=args.expected_sha256 or build['imageSha256']!=args.expected_sha256:
        raise ValueError('Base image hash mismatch')
    if not build.get('sourceSnapshot') or not build.get('maintenanceEnabled') or build.get('storageMode')!='raw-userdata-ext4':
        raise ValueError('Expected a private standalone build with a source snapshot')
    spec=importlib.util.spec_from_file_location('rescue',ROOT/'tools/test-rescue-boot.py')
    rescue=importlib.util.module_from_spec(spec);spec.loader.exec_module(rescue)
    rescue.verify_sources(base,build)
    payload,hashes=build_payload()
    packager=checked_source('aosp-mkbootimg')
    out.mkdir(parents=True,exist_ok=False)
    with tempfile.TemporaryDirectory(dir=out) as temporary:
        temp=Path(temporary)
        text=subprocess.check_output([sys.executable,str(packager/'unpack_bootimg.py'),'--boot_img',str(image),'--out',str(temp/'base'),'--format=mkbootimg'],text=True)
        options=shlex.split(text);fields=dict(zip(options[::2],options[1::2]))
        if fields['--header_version']!='0' or digest(temp/'base/kernel')!=build['kernelSha256']:
            raise ValueError('Unexpected boot format or kernel')
        original=read_newc((temp/'base/ramdisk').read_bytes())
        if 'shared-ui.tar' not in original or 'standalone-mount.sh' not in original:
            raise ValueError('Missing standalone UI overlay')
        files={name:{**item} for name,item in original.items()}
        files['shared-ui.tar']['data']=payload
        # Older trials stored plain tar archives. Both payloads now use XZ,
        # including native-only refreshes, with explicit BusyBox decompression.
        import lzma
        native_payload = original['native-config.tar']['data']
        if native_payload.startswith(b'\xfd7zXZ\x00'):
            native_payload = lzma.decompress(native_payload)
        files['native-config.tar']['data']=compress_archive(native_payload)
        script=files['native-root.sh']['data']
        for name in ('native-config.tar','shared-ui.tar'):
            script=script.replace(('tar -xf /'+name).encode(),('tar -xJf /'+name).encode())
            if ('tar -xJf /'+name).encode() not in script:
                raise ValueError('Unrecognized native archive reader: '+name)
        files['native-root.sh']['data']=script
        native_sources = {}
        if args.settings_adapters:
            names = ['radio-control.py','wifi-control.py','mobile-settings.py','camera-preview.py']
            native_sources = {'etc/tundra/'+name: ROOT/'runtime'/name for name in names}
            native_sources['etc/NetworkManager/conf.d/80-vulpes-hotspot.conf']=ROOT/'runtime/hotspot-firewall.conf'
            native_sources['etc/systemd/system/tundra-radio.service.d/clock.conf']=ROOT/'runtime/clock-service.conf'
            aliases={'usr/sbin/'+name:name+'-legacy' for name in ('iptables','ip6tables')}
            buffer = io.BytesIO()
            with tarfile.open(fileobj=io.BytesIO(original['native-config.tar']['data'])) as source, tarfile.open(fileobj=buffer,mode='w') as target:
                for member in source.getmembers():
                    if member.name in native_sources or member.name in aliases: continue
                    target.addfile(member,source.extractfile(member) if member.isfile() else None)
                for name,path in native_sources.items():
                    content=path.read_bytes();info=tarfile.TarInfo(name);info.mode=0o644;info.size=len(content)
                    info.uid=info.gid=0;target.addfile(info,io.BytesIO(content))
                for name,link in aliases.items():
                    info=tarfile.TarInfo(name);info.type=tarfile.SYMTYPE;info.linkname=link;info.mode=0o777
                    target.addfile(info)
            files['native-config.tar']['data']=compress_archive(buffer.getvalue())
        entries=[]
        for name,item in sorted(files.items()):
            if (stat.S_ISCHR(item['mode']) or stat.S_ISBLK(item['mode'])) and name!='dev/console':
                raise ValueError('Unrecognized device node: '+name)
            entries.append((name,item['mode'],item['data'],5 if name=='dev/console' else 0,1 if name=='dev/console' else 0))
        ramdisk=out/'initramfs.cpio.gz';ramdisk.write_bytes(cpio(entries))
        fields['--ramdisk']=str(ramdisk)
        command=[sys.executable,str(packager/'mkbootimg.py')]
        for k,v in fields.items():command.extend([k,v])
        target=out/'boot.img'
        subprocess.run(command+['-o',str(target)],check=True)
        if target.stat().st_size>67108864:raise ValueError('Boot partition size exceeded')
        subprocess.run([sys.executable,str(packager/'unpack_bootimg.py'),'--boot_img',str(target),'--out',str(temp/'verify')],check=True,stdout=subprocess.DEVNULL)
        if digest(temp/'verify/kernel')!=build['kernelSha256'] or digest(temp/'verify/ramdisk')!=digest(ramdisk):
            raise ValueError('Boot roundtrip failed')
        verified=read_newc((temp/'verify/ramdisk').read_bytes())
        if verified.keys()!=original.keys():raise ValueError('Ramdisk entry list changed')
        changed=[name for name in original if (verified[name]['mode'],verified[name]['data'])!=(original[name]['mode'],original[name]['data'])]
        permitted={'native-config.tar','shared-ui.tar','native-root.sh'}
        if set(changed)-permitted:raise ValueError('Unexpected changes: '+str(changed))
        # A native-only fix may reproduce the same shared UI archive exactly.
        # Still verify every replacement, including unchanged payloads.
        for name in permitted:
            if (verified[name]['mode'],verified[name]['data']) != (files[name]['mode'],files[name]['data']):
                raise ValueError('Replacement mismatch: '+name)
    shutil.copytree(base/'sources',out/'sources')
    for name in hashes:
        target=out/'sources'/name;target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(ROOT.parent/name,target)
    for path in (Path(__file__).resolve(),ROOT/'tools/shared_ui.py',*native_sources.values(),*([ROOT/'runtime/prepare-native.py'] if args.settings_adapters else [])):
        target=out/'sources'/path.relative_to(ROOT.parent)
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
        build['sources'][str(path.relative_to(ROOT))]=digest(path)
    shutil.copy2(base/'client-key',out/'client-key')
    build.update(image='boot.img',imageSha256=digest(out/'boot.img'),ramdiskSha256=digest(ramdisk),
                 sharedUiHashes=hashes,builtAtUnix=int(time.time()),flashReady=False,
                 baseImageSha256=args.expected_sha256,uiOnlyRefresh=not args.settings_adapters,changedRamdiskEntries=changed,
                 scope='Private RAM Settings update; kernel and storage configuration preserved')
    save(out/'build.json',build)
    rescue.verify_sources(out,build)
    print(json.dumps({'image':str(out/'boot.img'),'sha256':build['imageSha256'],
                      'changed':changed,'sharedFiles':len(hashes),'flashed':False}))


if __name__=='__main__':main()
