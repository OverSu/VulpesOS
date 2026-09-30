#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Compile a read-only FunctionFS diagnostic. Does not access a phone."""
import json
from pathlib import Path
import stat
import struct
import subprocess
import sys
from tundra import ROOT, cpio, linker, digest, now, save, kernel_files, checked_source


def main():
    folder=ROOT/'out/usb-diagnostic';folder.mkdir(parents=True,exist_ok=True)
    common=['-Os','-ffreestanding','-fno-builtin','-fno-stack-protector','-fno-pie',
            '-fno-unwind-tables','-fno-asynchronous-unwind-tables','-Wall','-Wextra','-Werror','-nostdlib','-static']
    builds={}
    for arch in ('x86_64','aarch64'):
        out=folder/arch;out.mkdir(exist_ok=True)
        cmd=(['gcc','-no-pie','-mgeneral-regs-only'] if arch=='x86_64' else ['clang','--target=aarch64-linux-gnu',f'--ld-path={linker()}'])
        cmd += common+['-Wl,--build-id=none','-Wl,-e,_start',str(ROOT/'boot/usb-init.c'),'-o',str(out/'init')]
        subprocess.run(cmd,check=True)
        data=(out/'init').read_bytes()
        assert struct.unpack_from('<H',data,18)[0]==(62 if arch=='x86_64' else 183)
        entries=[(p,stat.S_IFDIR|0o755,b'',0,0) for p in ('dev','proc','sys')]
        entries += [('dev/console',stat.S_IFCHR|0o600,b'',5,1),('init',stat.S_IFREG|0o755,data,0,0)]
        (out/'initramfs.cpio.gz').write_bytes(cpio(entries))
        builds[arch]={'initSha256':digest(out/'init'),'ramdiskSha256':digest(out/'initramfs.cpio.gz'),'command':cmd}
    kernel=kernel_files();board=json.loads((ROOT/'devices/sargo/device.json').read_text())['diagnosticBoot']
    image=folder/'tundra-sargo-usb-NOT-FOR-FLASHING.img'
    cmd=[sys.executable,str(checked_source('aosp-mkbootimg')/'mkbootimg.py'),
         '--kernel',str(kernel/'Image.lz4-dtb'),'--ramdisk',str(folder/'aarch64/initramfs.cpio.gz'),
         '--header_version',str(board['headerVersion']),'--pagesize',str(board['pageSize']),
         '--base',board['base'],'--kernel_offset',board['kernelOffset'],'--ramdisk_offset',board['ramdiskOffset'],
         '--tags_offset',board['tagsOffset'],'--cmdline',board['cmdline']+' tundra.usb=1','-o',str(image)]
    subprocess.run(cmd,check=True)
    if image.stat().st_size>board['partitionSizeBytes']:raise ValueError('Image too large')
    save(folder/'build.json',{'recordedAt':now(),'sourceSha256':digest(ROOT/'boot/usb-init.c'),
         'architectures':builds,'sharedInitSha256':digest(ROOT/'boot/init.c'),'file':image.name,'imageSha256':digest(image),'bytes':image.stat().st_size,
         'hardwareTested':False,'flashReady':False,'protocol':'read-only FunctionFS, not ADB',
         'blockers':['Real firmware/slot/recovery inventory missing','Sargo UDC initialization not tested','No Gecko or Gaia in this diagnostic']})
    print(image)

if __name__=='__main__':main()
