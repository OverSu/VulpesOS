#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Connect to a private RAM trial using only its pinned development key."""
import argparse
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
from tundra import digest, save, now


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',type=Path,required=True)
    parser.add_argument('--stream',action='store_true',help='Keep a diagnostic command open until interrupted')
    parser.add_argument('--collect',action='store_true',help='Collect boot, services and Gaia reports, excluding credentials')
    parser.add_argument('command',nargs=argparse.REMAINDER,help='Command in the minimal rescue root; use chroot /proc/1/root for the native system')
    args=parser.parse_args();folder=args.build.resolve();os.umask(0o077)
    build=json.loads((folder/'build.json').read_text())
    if digest(folder/build['image'])!=build['imageSha256']:
        raise ValueError('Trial image changed')
    if not (folder/'boot-report.json').is_file():
        raise ValueError('This image has not been sent with the checked boot tool')
    ssh=['ssh','-F','/dev/null','-o','BatchMode=yes','-o','IdentitiesOnly=yes',
         '-o','ConnectTimeout=5','-o','ServerAliveInterval=5','-o','ServerAliveCountMax=6',
         '-o','StrictHostKeyChecking=yes','-o','HostKeyAlgorithms=+ssh-rsa',
         '-o','UserKnownHostsFile='+str(folder/'known_hosts'),'-i',str(folder/'client-key'),
         '-p','2222','root@10.15.19.82']
    if args.collect:
        commands={
            'pid1':'cat /proc/1/cmdline',
            'mounts':'cat /proc/1/mounts',
            'bootLog':'cat /proc/1/root/run/boot.log',
            'identity':'cat /proc/1/root/etc/os-release',
            'services':'chroot /proc/1/root /usr/bin/systemctl --failed --no-pager',
            'journal':'chroot /proc/1/root /usr/bin/journalctl -b -u tundra-hal -u tundra-display --no-pager -n 200',
            'lxc':'cat /proc/1/root/run/tundra/lxc.log',
            'gaia':'cat /proc/1/root/opt/vulpes/logs/test.json',
            'gecko':'tail -100 /proc/1/root/opt/vulpes/logs/gecko.log',
        }
        report={'recordedAt':now(),'imageSha256':build['imageSha256'],'readOnlyCollection':True,'checks':{}}
        for name,command in commands.items():
            result=subprocess.run(ssh+[command],capture_output=True,text=True,timeout=30)
            report['checks'][name]={'returncode':result.returncode,'stdout':result.stdout,'stderr':result.stderr}
        output=folder/('collection-'+now().replace(':','-')+'.json');save(output,report);print(output)
        return
    if not args.command:parser.error('Use --collect or provide a command')
    result=subprocess.run(ssh+[shlex.join(args.command)],timeout=None if args.stream else 60)
    sys.exit(result.returncode)


if __name__=='__main__':main()
