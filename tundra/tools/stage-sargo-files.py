#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage prepared system/data files over pinned SSH; never flash a partition.

Provide an SSH configuration with this phone's key and known_hosts. The account
must be root. --native-root selects Tundra's rescue chroot; otherwise use the
existing Linux root with its compatible ext4/LVM mount. Default: local review.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import subprocess

from persistent_state import validate_manifest
from sargo_workspace import checked_workspace
from tundra import digest

# Runs inside the real phone root. No block device is opened for writing.
RECEIVE = r'''
import hashlib,json,os,pathlib,stat,subprocess,sys,tempfile
config=json.loads(sys.argv[1]);layout=config['layout'];mount=config['mount']
def command(*args):
 return subprocess.check_output(args,text=True,timeout=15,env={**os.environ,'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LC_ALL':'C'}).strip()
cmdline=dict(x.split('=',1) for x in pathlib.Path('/proc/cmdline').read_text().split() if '=' in x)
if ' S4 ' not in pathlib.Path('/proc/device-tree/model').read_text():raise ValueError('Unsupported board model')
if b'google,b4s4-sdm670' not in pathlib.Path('/proc/device-tree/compatible').read_bytes().split(b'\0'):raise ValueError('Wrong model')
if cmdline.get('androidboot.slot_suffix')!='_a' or hashlib.sha256(cmdline.get('androidboot.serialno','').encode()).hexdigest()!=config['serialSha256']:raise ValueError('Wrong phone or slot')
device=pathlib.Path('/dev/mmcblk0p72')
if not stat.S_ISBLK(device.stat().st_mode):raise ValueError('Not a partition')
with device.open('rb') as source:
 if hashlib.sha256(source.read(1048576)).hexdigest()!=layout['firstMiBSha256']:raise ValueError('Storage identity changed')
if int(command('blockdev','--getsize64',str(device)))!=layout['size']:raise ValueError('Storage size changed')
mounted=json.loads(command('findmnt','--json','--mountpoint',mount,'--output','SOURCE,FSTYPE'))['filesystems']
if len(mounted)!=1 or mounted[0]['fstype']!='ext4' or not mounted[0]['source'].startswith('/dev/mapper/'):raise ValueError('Unsupported filesystem')
table=command('dmsetup','table',mounted[0]['source']).split()
expected=layout['table'].split();backing=pathlib.Path('/sys/class/block/mmcblk0p72/dev').read_text().strip()
if len(table)!=5 or table[:3]!=expected[:3] or table[3]!=backing or table[4]!=expected[4]:raise ValueError('Storage mapping changed')
root=pathlib.Path(mount)/'tundra'
folder=root/config['kind'];target=folder/config['name']
for p in (root,folder):
 if p.is_symlink():raise ValueError('Destination is a symbolic link')
if target.exists() or target.is_symlink():
 if config['kind']=='data':raise ValueError('Existing data retained; refusing to overwrite')
 if target.is_symlink() or not target.is_file() or target.stat().st_size!=config['bytes']:raise ValueError('Unexpected system file')
 with target.open('rb') as f:
  if hashlib.file_digest(f,'sha256').hexdigest()!=config['sha256']:raise ValueError('Existing system checksum mismatch')
 print(json.dumps({'existingSystemVerified':True}));sys.exit(0)
if config['checkOnly']:
 s=os.statvfs(mount)
 if s.f_bavail*s.f_frsize < config['requiredBytes']+1024**3:raise ValueError('Insufficient space with 1 GiB reserve')
 print(json.dumps({'ready':True}));sys.exit(0)
folder.mkdir(parents=True,exist_ok=True,mode=0o700)
os.umask(0o077)
fd,name=tempfile.mkstemp(prefix='.transfer-',dir=folder);partial=pathlib.Path(name)
try:
 count=0;sha=hashlib.sha256()
 with os.fdopen(fd,'wb') as output:
  while data:=sys.stdin.buffer.read(1048576):
   count+=len(data)
   if count>config['bytes']:raise ValueError('Oversized transfer')
   output.write(data);sha.update(data)
  output.flush();os.fsync(output.fileno())
 if count!=config['bytes'] or sha.hexdigest()!=config['sha256']:raise ValueError('Transfer checksum mismatch')
 os.link(partial,target) # Atomic create; never replace an existing data file.
 fd=os.open(folder,os.O_RDONLY);os.fsync(fd);os.close(fd)
 print(json.dumps({'staged':True,'sha256':sha.hexdigest(),'bytes':count}))
finally:
 partial.unlink(missing_ok=True)
'''


def inputs(prepared):
    prepared = Path(prepared)
    if (prepared/'.incomplete').exists():
        raise ValueError('Package preparation did not finish')
    system = json.loads((prepared/'system.json').read_text())
    if (system.get('device') != 'sargo' or system.get('image') != 'tundra-sargo-system.ext4'
            or system.get('filesystemCheckPassed') is not True):
        raise ValueError('Expected a checked system image')
    path = prepared/system['image']
    if path.is_symlink() or path.stat().st_size != system['bytes'] or digest(path) != system['imageSha256']:
        raise ValueError('System image changed')
    state = validate_manifest(prepared/'data/state.json')
    if state['systemImageSha256'] != system['imageSha256']:
        raise ValueError('State and system do not match')
    return [('images', system['imageSha256']+'.ext4', path, system),
            ('data', state['image'], prepared/'data'/state['image'], state)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', required=True, type=Path)
    parser.add_argument('--device-workspace', required=True, type=Path)
    parser.add_argument('--ssh-config', required=True, type=Path)
    parser.add_argument('--host', default='sargo')
    parser.add_argument('--native-root', action='store_true')
    parser.add_argument('--stage', action='store_true')
    args = parser.parse_args(); os.umask(0o077)
    plan, layout = checked_workspace(args.device_workspace)
    files = inputs(args.prepared)
    if not re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*', args.host):
        parser.error('Use an SSH host alias, not command-line options')
    if not args.stage:
        print('Local inputs checked. --stage transfers new files; no flash or reboot is implemented.')
        return
    ssh = ['ssh', '-F', str(args.ssh_config.resolve()), '-o', 'BatchMode=yes',
           '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', args.host]
    python = ['chroot', '/proc/1/root', '/usr/bin/python3'] if args.native_root else ['/usr/bin/python3']
    records = []
    for kind, name, path, record in files:
        config = {'kind': kind, 'name': name, 'sha256': record['imageSha256'],
                  'bytes': record['bytes'], 'layout': layout, 'serialSha256': plan['serialSha256'],
                  'mount': '/reference/installed' if args.native_root else '/', 'checkOnly': True,
                  'requiredBytes': record['bytes']}
        def command():
            return ssh+[shlex.join(python+['-c', RECEIVE, json.dumps(config)])]
        result = subprocess.run(command(), capture_output=True, text=True, timeout=180)
        if result.returncode:
            raise RuntimeError('Phone preflight failed: '+result.stderr.strip())
        status = json.loads(result.stdout)
        if not status.get('existingSystemVerified'):
            config['checkOnly'] = False
            with path.open('rb') as source:
                result = subprocess.run(command(), stdin=source, stdout=subprocess.PIPE,
                                        text=True, check=True, timeout=900)
            status = json.loads(result.stdout)
        records.append({'kind': kind, 'name': name, **status})
    report = {'files': records, 'deviceWorkspaceSha256': plan['workspaceSha256'],
              'flashCommandsSent': False, 'rebootRequested': False, 'passed': True}
    (args.prepared/'transfer.json').write_text(json.dumps(report, indent=2)+'\n')
    print('System and fresh data files verified on the matching phone. No flash or reboot sent.')


if __name__ == '__main__':
    main()
