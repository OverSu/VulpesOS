#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build a raw-userdata Tundra boot, or its nondestructive container test variant."""
import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
from ramdisk_reference import read_newc
from standalone_volume import checked_volume
from tundra import ROOT, checked_source, cpio, digest


def storage_scripts(init, native, volume, trial):
    start = init.index(b'# Use the inventoried filesystem')
    end = init.index(b'echo TUNDRA_RESCUE_READY', start)
    legacy = init[start:end]
    # The container test keeps the old mount solely as a carrier for the image.
    if trial:
        legacy += b'mkdir -p /run/legacy-storage\nmount --move /installed /run/legacy-storage\n'
    else:
        legacy = b'# Standalone boot does not open the previous operating system.\n'
    init = init[:start]+legacy+init[end:]
    init = init.replace(b'exec /bin/sh /native-root.sh', b'exec /bin/sh /standalone-mount.sh')
    native = native.replace(b'LOWER=/installed/home/droidian/vulpes-tundra-tests/runtime-reference-20260925/root',
                            b': "${SYSTEM_IMAGE:?A bundled system image is required}"\nLOWER=/run/tundra-system')
    native = native.replace(b'/installed', b'/volume')
    native = native.replace(b'/reference/volume', b'/reference/tundra-volume')
    if volume.get('hardwareImages'):
        lines = ['mkdir -p /newroot/reference']
        for name in ('vendor.img', 'modem.img'):
            lines += ['test -s /volume/tundra/hardware/'+name,
                      ': > /newroot/reference/'+name,
                      'mount --bind /volume/tundra/hardware/'+name+' /newroot/reference/'+name,
                      'mount -o remount,bind,ro /newroot/reference/'+name]
        config = json.dumps({'images':volume['hardwareImages']}, separators=(',',':'))
        lines += ['mkdir -p /newroot/etc/tundra',
                  'printf \'%s\\n\' '+shlex.quote(config)+' > /newroot/etc/tundra/hardware-images.json']
        native = native.replace(b'# Installed lower layers', ('\n'.join(lines)+'\n# Installed lower layers').encode())
    if not trial:
        if b'/dev/mapper' in init or b'EXPECTED_STORAGE_HASH' in init:
            # The old expected hash assignment is unnecessary in the raw image.
            init = b'\n'.join(line for line in init.split(b'\n') if not line.startswith(b'EXPECTED_STORAGE_HASH='))
        if b'/dev/mapper' in init or b'/installed/' in native:
            raise ValueError('Legacy storage leaked into standalone boot')
    device = '/run/legacy-storage/tundra/standalone/'+volume['uuid']+'.ext4' if trial else '/dev/mmcblk0p72'
    config = 'VOLUME_DEVICE='+shlex.quote(device)+'\nVOLUME_UUID='+shlex.quote(volume['uuid'])+'\nVOLUME_OPTIONS='+('loop,rw' if trial else 'rw')+'\n'
    mount = (ROOT/'boot/standalone-mount.sh').read_bytes().replace(b'# VOLUME_CONFIGURATION', config.encode())
    return init, native, mount


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--volume', type=Path, required=True)
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--device-workspace', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--container-trial', action='store_true')
    parser.add_argument('--no-deadline', action='store_true')
    parser.add_argument('--boot-control', type=Path, help='Pinned ARM64 qbootctl binary')
    parser.add_argument('--no-maintenance', action='store_true', help='Exclude private USB SSH credentials and server')
    parser.add_argument('--local-debugger', action='store_true', help='Private RAM tests: loopback Marionette, never a public image')
    args = parser.parse_args(); os.umask(0o077)
    if args.local_debugger and args.no_maintenance: parser.error('Local debugger requires a private maintenance image')
    volume = checked_volume(args.volume)
    if args.no_deadline and not args.container_trial and not args.boot_control:
        parser.error('Persistent standalone images require --boot-control')
    if args.boot_control and digest(args.boot_control) != 'dcb00e4c4f038071a5d9979263128325e16b848903371f6c00d49cf3e25c34d9':
        raise ValueError('Unqualified boot-control binary')
    if args.boot_control and digest(args.boot_control.with_name('copyright')) != '8969e659aff7ed5bb3249341764c2bd048d5abe7400076f01485650e727e8c42':
        raise ValueError('Boot-control license notice missing or changed')
    system = json.loads((args.prepared/'system.json').read_text())
    state = json.loads((args.prepared/'data/state.json').read_text())
    if volume['systemImageSha256'] != system['imageSha256'] or volume['stateUuid'] != state['uuid']:
        raise ValueError('Volume does not contain this system/data pair')
    command = [sys.executable,str(ROOT/'tools/build-rescue-boot.py'), '--output',str(args.output),
               '--device-workspace',str(args.device_workspace),'--layout',str(args.device_workspace/'layout.json'),
               '--native','--runtime-config','--network','--hardware',
               '--system-image',str(args.prepared/'system.json'),'--state',str(args.prepared/'data/state.json')]
    if args.no_deadline: command.append('--no-deadline')
    if args.local_debugger: command.append('--local-debugger')
    subprocess.run(command,check=True)
    out = args.output.resolve(); build = json.loads((out/'build.json').read_text())
    ramdisk = out/'initramfs.cpio.gz'; files = read_newc(ramdisk.read_bytes())
    init,native,mount = storage_scripts(files['init']['data'],files['native-root.sh']['data'],volume,args.container_trial)
    if args.boot_control:
        files['sbin/tundra-qbootctl']={'mode':stat.S_IFREG|0o755,'data':args.boot_control.read_bytes()}
        files['qbootctl-copyright']={'mode':stat.S_IFREG|0o644,'data':args.boot_control.with_name('copyright').read_bytes()}
        files['standalone-boot-success.py']={'mode':stat.S_IFREG|0o755,'data':(ROOT/'runtime/mark-boot-success.py').read_bytes()}
        unit=b'[Unit]\nDescription=Acknowledge a healthy standalone Vulpes boot\nAfter=tundra-display.service\n[Service]\nType=oneshot\nTimeoutStartSec=650\nExecStart=/usr/bin/python3 /usr/libexec/tundra-mark-boot-success.py\n'
        files['standalone-boot-success.service']={'mode':stat.S_IFREG|0o644,'data':unit}
        setup=b"""mkdir -p /newroot/usr/libexec /newroot/etc/systemd/system/tundra.target.wants
mkdir -p /newroot/usr/share/doc/qbootctl
cp /qbootctl-copyright /newroot/usr/share/doc/qbootctl/copyright
cp /sbin/tundra-qbootctl /newroot/usr/libexec/tundra-qbootctl
cp /standalone-boot-success.py /newroot/usr/libexec/tundra-mark-boot-success.py
cp /standalone-boot-success.service /newroot/etc/systemd/system/tundra-boot-success.service
ln -sf ../tundra-boot-success.service /newroot/etc/systemd/system/tundra.target.wants/tundra-boot-success.service
"""
        native=native.replace(b'# Installed lower layers',setup+b'# Installed lower layers')
    if args.no_maintenance:
        init=b'\n'.join(line for line in init.split(b'\n') if not line.startswith(b'/sbin/dropbear '))
        init=init.replace(b'TUNDRA_USB_SSH_READY',b'TUNDRA_USB_READY')
        start=native.index(b'# Keep a minimal, already tested rescue environment')
        end=native.index(b'for fs in dev proc sys run;',start)
        native=native[:start]+b'# Public boot: no USB maintenance account or shared SSH key.\n'+native[end:]
        for name in ('etc/tundra-hostkey','root/.ssh/authorized_keys','sbin/dropbear'):
            files.pop(name,None)
    files['init']['data']=init; files['native-root.sh']['data']=native
    files['standalone-mount.sh']={'mode':stat.S_IFREG|0o755,'data':mount}
    files['volume']={'mode':stat.S_IFDIR|0o755,'data':b''}
    entries=[]
    for name, item in sorted(files.items()):
        entries.append((name,item['mode'],item['data'],5 if name=='dev/console' else 0,1 if name=='dev/console' else 0))
    ramdisk.write_bytes(cpio(entries))
    packager=checked_source('aosp-mkbootimg'); original=out/build['image']
    with tempfile.TemporaryDirectory() as temp:
        unpack=Path(temp)/'unpack'
        text=subprocess.check_output([sys.executable,str(packager/'unpack_bootimg.py'),'--boot_img',str(original),'--out',str(unpack),'--format=mkbootimg'],text=True)
        options=shlex.split(text); fields=dict(zip(options[::2],options[1::2]));fields['--ramdisk']=str(ramdisk)
        image=out/'boot.img'; command=[sys.executable,str(packager/'mkbootimg.py')]
        for key,value in fields.items():command.extend([key,value])
        subprocess.run(command+['-o',str(image)],check=True)
        verify=Path(temp)/'verify'
        subprocess.run([sys.executable,str(packager/'unpack_bootimg.py'),'--boot_img',str(image),'--out',str(verify)],check=True,stdout=subprocess.DEVNULL)
        if digest(verify/'kernel')!=build['kernelSha256'] or digest(verify/'ramdisk')!=digest(ramdisk):
            raise ValueError('Standalone boot roundtrip failed')
    original.unlink()
    for path in (Path(__file__).resolve(),ROOT/'tools/standalone_volume.py',ROOT/'boot/standalone-mount.sh',ROOT/'runtime/mark-boot-success.py'):
        relative=str(path.relative_to(ROOT)); target=out/'sources/tundra'/relative
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);build['sources'][relative]=digest(path)
    build.update(image='boot.img',imageSha256=digest(image),ramdiskSha256=digest(ramdisk),
                 storageMode='container-test' if args.container_trial else 'raw-userdata-ext4',
                 standaloneVolume=volume,flashReady=False,bootControlSha256=digest(args.boot_control) if args.boot_control else None,
                 containsPrivateTrialHostKey=not args.no_maintenance,maintenanceEnabled=not args.no_maintenance,
                 scope='Standalone Tundra boot candidate; hardware qualification required')
    (out/'build.json').write_text(json.dumps(build,indent=2)+'\n')
    print(image)


if __name__=='__main__':main()
