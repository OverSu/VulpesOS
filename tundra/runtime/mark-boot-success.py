#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Acknowledge slot A only after this standalone installation has started Gaia."""
import json
from pathlib import Path
import subprocess
import time


def eligible(boot_id, gaia, mount, cmdline, services_ready):
    return (cmdline.get('androidboot.slot_suffix') == '_a'
            and mount.get('source') == '/dev/mmcblk0p72'
            and mount.get('fstype') == 'ext4'
            and gaia.get('bootId') == boot_id and gaia.get('passed') is True
            and bool(gaia.get('checks')) and all(gaia['checks'].values())
            and services_ready)


def main():
    cmdline=dict(x.split('=',1) for x in Path('/proc/cmdline').read_text().split() if '=' in x)
    boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    mounts=json.loads(subprocess.check_output(['findmnt','--json','--mountpoint','/reference/tundra-volume','--output','SOURCE,FSTYPE'],text=True))['filesystems']
    if len(mounts)!=1 or mounts[0]['source']!='/dev/mmcblk0p72':
        return  # Container/RAM experiments must not mark a flashed slot successful.
    for _ in range(120):
        try:
            gaia=json.loads(Path('/opt/vulpes/logs/test.json').read_text())
            ready=subprocess.run(['systemctl','is-active','--quiet','tundra-hal','tundra-display','tundra-radio']).returncode==0
            if eligible(boot_id,gaia,mounts[0],cmdline,ready):break
        except (OSError,ValueError):pass
        time.sleep(5)
    else:raise RuntimeError('Gaia did not pass startup; slot success left unchanged')
    subprocess.run(['/usr/libexec/tundra-qbootctl','-m','a'],check=True)
    Path('/var/lib/tundra').mkdir(parents=True,exist_ok=True)
    Path('/var/lib/tundra/boot-success.json').write_text(json.dumps({'bootId':boot_id,'gaiaPassed':True,'slot':'a'})+'\n')


if __name__=='__main__':main()
