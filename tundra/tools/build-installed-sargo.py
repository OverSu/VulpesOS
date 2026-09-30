#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build a diagnostic using verified /boot copies. Never writes to a device."""
import argparse
import json
from pathlib import Path
import shlex
import stat
import struct
import subprocess
import sys
import tempfile
from tundra import ROOT, checked_source, cpio, digest, linker, now, save
from boot_backup import verify as verify_backup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--boot-copies', required=True, type=Path)
    parser.add_argument('--raw-backup', type=Path,
                        help='Use the verified raw slot A header, retaining the inventoried kernel')
    args = parser.parse_args()
    copies = args.boot_copies.resolve()
    manifest = json.loads((copies/'manifest.json').read_text())
    if manifest.get('device') != 'sargo':
        raise ValueError('Expected verified sargo boot copies')
    for item in manifest['files']:
        path = copies/item['file']
        if path.parent != copies or digest(path) != item['sha256'] or path.stat().st_size != item['bytes']:
            raise ValueError('Boot copy changed: '+item['file'])
    original = copies/('boot.img-'+manifest['runningKernel'])
    folder = ROOT/'out/installed-sargo-diagnostic'
    raw_manifest_hash = None
    if args.raw_backup:
        raw = args.raw_backup.resolve()
        verify_backup(raw)
        raw_manifest_hash = digest(raw/'manifest.json')
        original = raw/'boot_a.img'
        folder = ROOT/'out/sargo-raw-diagnostic'
    folder.mkdir(parents=True, exist_ok=True)
    source = ROOT/'boot/usb-init.c'
    binary = folder/'init'
    command = ['clang','--target=aarch64-linux-gnu',f'--ld-path={linker()}',
        '-Os','-ffreestanding','-fno-builtin','-fno-stack-protector','-fno-pie',
        '-fno-unwind-tables','-fno-asynchronous-unwind-tables',
        '-Wall','-Wextra','-Werror','-nostdlib','-static','-Wl,--build-id=none',
        '-Wl,-e,_start',str(source),'-o',str(binary)]
    subprocess.run(command, check=True)
    data = binary.read_bytes()
    if data[:4] != b'\x7fELF' or struct.unpack_from('<H',data,18)[0] != 183:
        raise ValueError('Expected ARM64 init')
    entries = [(p,stat.S_IFDIR|0o755,b'',0,0) for p in ('dev','proc','sys')]
    entries += [('dev/console',stat.S_IFCHR|0o600,b'',5,1),
                ('init',stat.S_IFREG|0o755,data,0,0)]
    ramdisk = folder/'initramfs.cpio.gz'
    ramdisk.write_bytes(cpio(entries))
    image = folder/'tundra-sargo-installed-kernel-NOT-FOR-FLASHING.img'
    packager = checked_source('aosp-mkbootimg')
    with tempfile.TemporaryDirectory() as temp:
        unpack = Path(temp)/'original'
        result = subprocess.run([sys.executable,str(packager/'unpack_bootimg.py'),
            '--boot_img',str(original),'--out',str(unpack),'--format=mkbootimg'],
            check=True,capture_output=True,text=True)
        options = shlex.split(result.stdout)
        fields = dict(zip(options[::2],options[1::2]))
        if fields.get('--header_version') != '0':
            raise ValueError('This recipe expects the inventoried v0 boot')
        kernel = unpack/'kernel'
        if digest(kernel) != digest(copies/('Image.lz4-dtb-'+manifest['runningKernel'])):
            raise ValueError('Extracted kernel differs from inventoried kernel')
        fields['--ramdisk'] = str(ramdisk)
        # Preserve the board parameters; our PID 1 never mounts userdata or vendor.
        fields['--cmdline'] += ' rdinit=/init tundra.usb=1'
        build = [sys.executable,str(packager/'mkbootimg.py')]
        for key,value in fields.items():
            build += [key,value]
        subprocess.run(build+['-o',str(image)],check=True)
        if image.stat().st_size > 64*1024*1024:
            raise ValueError('Image exceeds observed boot partition size')
        verify = Path(temp)/'verify'
        result = subprocess.run([sys.executable,str(packager/'unpack_bootimg.py'),
            '--boot_img',str(image),'--out',str(verify),'--format=mkbootimg'],
            check=True,capture_output=True,text=True)
        rebuilt = shlex.split(result.stdout)
        rebuilt = dict(zip(rebuilt[::2],rebuilt[1::2]))
        for key,value in fields.items():
            if key not in ('--kernel','--ramdisk') and rebuilt.get(key) != value:
                raise ValueError('Header roundtrip mismatch: '+key)
        if digest(verify/'kernel') != digest(kernel) or digest(verify/'ramdisk') != digest(ramdisk):
            raise ValueError('Kernel/ramdisk roundtrip mismatch')
        metadata = {k:v for k,v in fields.items() if k not in ('--kernel','--ramdisk')}
        kernel_hash = digest(kernel)
    save(folder/'build.json',{
        'recordedAt':now(),'device':'sargo','kernel':manifest['runningKernel'],
        'originalBootSha256':digest(original),'bootCopiesManifestSha256':digest(copies/'manifest.json'),
        'rawBackupManifestSha256':raw_manifest_hash,
        'rawBootSlot':'a' if args.raw_backup else None,
        'kernelSha256':kernel_hash,'ramdiskSha256':digest(ramdisk),
        'initSha256':digest(binary),'sourceSha256':digest(source),
        'sharedInitSha256':digest(ROOT/'boot/init.c'),'compileCommand':command,
        'header':metadata,'file':image.name,'imageSha256':digest(image),
        'bytes':image.stat().st_size,'roundtripPassed':True,'hardwareTested':False,
        'flashReady':False,'gaiaIncluded':False,'partitionsWritten':[],
        'blockers':['Restoration not validated',
                    *([] if args.raw_backup else ['Raw partition backup not verified by this build']),
                    'Qualcomm UDC startup not tested with this ramdisk']})
    print(image)


if __name__ == '__main__':
    main()
