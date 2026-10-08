#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Mount the inventoried Sargo HAL read-only, with disposable init/data overlays."""
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import hal_policy
from hal_policy import filter_rc, is_init_script


def run(*args):subprocess.run(args,check=True)
def directory(p):Path(p).mkdir(parents=True,exist_ok=True)
def overlay(lower,target,label):
    upper='/run/tundra/'+label+'-upper';work='/run/tundra/'+label+'-work'
    for p in (upper,work,target):directory(p)
    run('mount','-t','overlay','overlay','-o',f'lowerdir={lower},upperdir={upper},workdir={work}',target)


def main():
    if os.getuid()!=0:raise RuntimeError('HAL mounts require root')
    # This service only runs in the temporary boot assembled by rescue-init.
    if 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():raise RuntimeError('Temporary boot flag missing')
    directory('/var/lib/lxc')
    if Path('/run/tundra/hal-ready').is_file():return
    network = Path('/etc/tundra/network-enabled').is_file()
    if network:
        # Never let the experimental modem firmware write the installed NV.
        # rmt_storage opens these paths as files; no block device is exposed.
        destination = Path('/run/tundra/nv-block/bootdevice/by-name')
        destination.mkdir(parents=True, exist_ok=True, mode=0o700)
        partitions = {'modemst1': (46,2097152), 'modemst2': (47,2097152),
                      'fsg': (12,2097152), 'fsc': (42,131072)}
        for name, (number, size) in partitions.items():
            device = 'mmcblk0p'+str(number)
            sectors = int(Path('/sys/class/block',device,'size').read_text())
            if sectors*512 != size:
                raise RuntimeError('Unexpected NV partition size: '+name)
            with open('/dev/'+device,'rb',buffering=0) as source:
                data = source.read(size)
            if len(data) != size:raise RuntimeError('Incomplete NV read: '+name)
            target = destination/name
            target.write_bytes(data)
            target.chmod(0o600)
        hal_policy.SERVICES = hal_policy.SERVICES | hal_policy.NETWORK_SERVICES
    if Path('/etc/tundra/hardware-enabled').is_file():
        hal_policy.SERVICES = hal_policy.SERVICES | hal_policy.HARDWARE_SERVICES
    for p in ('/run/tundra/android-original','/run/tundra/vendor-original','/dev/__properties__','/dev/socket','/mnt/vendor/persist'):
        directory(p)
    image=Path('/reference/android-rootfs.img')
    with image.open('rb') as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
    if sha!='132d0e18c6a6a111293447e940267f35aa2b14fa00a872ef160b20dc2014d886':raise RuntimeError('Android reference changed')
    run('mount','-t','ext4','-o','loop,ro,noload',str(image),'/run/tundra/android-original')
    hardware = Path('/etc/tundra/hardware-images.json')
    bundled = json.loads(hardware.read_text())['images'] if hardware.exists() else None
    if bundled:
        if set(bundled) != {'vendor.img', 'modem.img'}:
            raise RuntimeError('Expected both standalone hardware images')
        for name, record in bundled.items():
            path = Path('/reference')/name
            with path.open('rb') as source:
                if path.stat().st_size != record['bytes'] or hashlib.file_digest(source, 'sha256').hexdigest() != record['sha256']:
                    raise RuntimeError('Standalone hardware image changed: '+name)
        run('mount','-t','ext4','-o','loop,ro,noload','/reference/vendor.img','/run/tundra/vendor-original')
    else:
        run('mount','-t','ext4','-o','ro,noload','/dev/mmcblk0p70','/run/tundra/vendor-original')
    run('mount','-t','ext4','-o','ro,noload','/dev/mmcblk0p48','/mnt/vendor/persist')
    overlay('/run/tundra/android-original','/android','android')
    overlay('/run/tundra/vendor-original','/android/vendor','vendor')
    if network:
        # IPA firmware is not initialized in the minimal HAL. Enabling its WLAN
        # offload dereferences a null ipahal context when the interface comes up.
        config = Path('/android/vendor/firmware/wlan/qca_cld/WCNSS_qcom_cfg.ini')
        text, count = re.subn(r'^gIPAConfig=.*$', 'gIPAConfig=0', config.read_text(), flags=re.M)
        if count != 1:raise RuntimeError('Expected exactly one Sargo WLAN IPA setting')
        config.write_text(text)  # vendor overlay upper is tmpfs, never the partition
    directory('/android/vendor/firmware_mnt')
    if bundled:
        run('mount','-t','vfat','-o','loop,ro','/reference/modem.img','/android/vendor/firmware_mnt')
    else:
        run('mount','-t','vfat','-o','ro','/dev/mmcblk0p21','/android/vendor/firmware_mnt')
    report={}
    for p in sorted(Path('/android').rglob('*.rc')):
        if not p.is_file() or p.is_symlink() or not is_init_script(p):continue
        text=p.read_text();filtered,record=filter_rc(text);record['sourceSha256']=hashlib.sha256(text.encode()).hexdigest()
        p.write_text(filtered);report[str(p)]=record
    (Path('/run/tundra')/'hal-policy-report.json').write_text(json.dumps(report,indent=2))
    # The container cannot open block devices. Its data and metadata live in RAM.
    for p in ('/android/data','/android/metadata'):
        run('mount','-t','tmpfs','-o','mode=0771','tmpfs',p)
    for p in ('/system','/vendor'):
        path=Path(p)
        if not path.is_symlink():
            if path.exists():path.rmdir()
            path.symlink_to('/android'+p)
    Path('/run/tundra/hal-ready').touch()


if __name__=='__main__':main()
