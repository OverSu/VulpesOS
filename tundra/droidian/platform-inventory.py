#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read the installed display/container adaptation; exclude user data and credentials."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess


def run(args):
    result=subprocess.run(args,capture_output=True,text=True,timeout=30)
    return {'command':args,'returncode':result.returncode,'stdout':result.stdout,'stderr':result.stderr}


def main():
    device=run(['getprop','ro.product.device'])
    if device['stdout'].strip()!='sargo':
        raise RuntimeError('Expected Sargo')
    report={'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'device':'sargo','readOnly':True,'files':{},'commands':{}}
    commands={
        'kernel':['uname','-a'],
        'units':['systemctl','cat','android-mount.service','lxc@android.service',
                 'android-service@hwcomposer.service','phosh.service'],
        'compositor':['phoc','--version'],
        'packages':['dpkg-query','-W','-f','${binary:Package}\t${Version}\t${Architecture}\n'],
        'phocLibraries':['ldd','/usr/bin/phoc'],
        'eglLibraries':['ldd','/usr/lib/aarch64-linux-gnu/libEGL_libhybris.so.0'],
        'mounts':['findmnt','--json','-o','SOURCE,TARGET,FSTYPE,OPTIONS'],
    }
    for name,command in commands.items():report['commands'][name]=run(command)
    paths=['/var/lib/lxc/android/config','/var/lib/lxc/android/pre-start.sh',
           '/usr/lib/lxc-android/mount-android','/usr/lib/lxc-android/lxc-android-notify',
           '/usr/lib/lxc-android/lxc-android-stop','/usr/sbin/mount-android.sh',
           '/usr/lib/halium-wrappers/android-service.sh','/etc/phosh/phoc.ini',
           '/usr/share/phosh/phoc.ini','/etc/deviceinfo/default.yaml',
           '/etc/pam.d/phosh','/etc/pam.d/login',
           '/usr/share/doc/android-system-google-sargo/copyright',
           '/usr/share/doc/libhybris/copyright','/usr/share/doc/phoc/copyright',
           '/usr/share/doc/lxc-android/copyright']
    paths += [str(p) for p in Path('/etc/deviceinfo/devices').glob('*.yaml')]
    for path in paths:
        p=Path(path)
        try:
            data=p.read_bytes()
            report['files'][path]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),
                'text':data.decode(),'owner':run(['dpkg-query','-S',path])['stdout'].strip()}
        except (OSError,UnicodeError) as error:
            report['files'][path]={'error':str(error)}
    image=Path('/var/lib/lxc/android/android-rootfs.img')
    with image.open('rb') as stream:
        report['androidSystemImage']={'path':str(image),'bytes':image.stat().st_size,
                                     'sha256':hashlib.file_digest(stream,'sha256').hexdigest()}
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
