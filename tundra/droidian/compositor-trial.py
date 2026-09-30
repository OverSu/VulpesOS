#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Bounded replacement of the display session; restore Phosh when the trial ends."""
import argparse
import json
import os
from pathlib import Path
import pwd
import shlex
import signal
import subprocess
import time

UNIT = 'tundra-display-trial.service'
DROPIN = Path('/run/systemd/system/android-service@hwcomposer.service.d/20-phosh.conf')
SERVICE = Path('/run/systemd/system')/UNIT
CONFIG = Path('/run/tundra-phoc-trial.ini')


def command(*args,check=True):
    return subprocess.run(args,check=check,capture_output=True,text=True,timeout=45)


def restore(result):
    """Attempt every restoration step even if an earlier command times out."""
    errors = []
    def attempt(*args):
        try:
            return command(*args, check=False)
        except (OSError, subprocess.SubprocessError) as error:
            errors.append({'command': list(args), 'error': str(error)})
            return None
    attempt('systemctl', 'stop', UNIT)
    journal = attempt('journalctl', '-u', UNIT, '--no-pager', '-n', '300')
    result['journal'] = journal.stdout if journal else ''
    for path in (SERVICE, DROPIN, CONFIG):
        try:
            path.unlink(missing_ok=True)
        except OSError as error:
            errors.append({'path': str(path), 'error': str(error)})
    attempt('systemctl', 'daemon-reload')
    attempt('systemctl', 'reset-failed', UNIT)
    attempt('systemctl', 'start', 'phosh.service')
    status = attempt('systemctl', 'is-active', 'phosh.service')
    result['restoredPhosh'] = status is not None and status.returncode == 0
    if errors:
        result['cleanupErrors'] = errors


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--product',type=Path,required=True)
    parser.add_argument('--seconds',type=int,default=180)
    parser.add_argument('--root',type=Path,help='Run Phoc and Gaia from this separate runtime tree; borrow installed Android HAL services')
    args=parser.parse_args()
    if os.geteuid()!=0:
        raise RuntimeError('The display service switch requires administrator privileges')
    product=args.product.resolve()
    expected=Path('/home/droidian/vulpes-tundra-tests')
    if not product.is_relative_to(expected) or not (product/'trial/session.py').is_file():
        raise ValueError('Expected an existing isolated trial product')
    if command('getprop','ro.product.device').stdout.strip()!='sargo':
        raise ValueError('Expected Sargo')
    if not 30<=args.seconds<=600:
        raise ValueError('Trial duration must be between 30 and 600 seconds')
    if any(p.exists() for p in (DROPIN,SERVICE,CONFIG)):
        raise RuntimeError('Previous runtime configuration present; restore it before another trial')
    if command('systemctl','is-active','phosh.service',check=False).returncode:
        raise RuntimeError('Phosh must be active as the known return session')
    account=pwd.getpwnam('droidian')
    root = args.root.resolve() if args.root else None
    if root:
        if not root.is_relative_to(expected) or not (root/'usr/bin/phoc').is_file():
            raise ValueError('Expected a staged ARM64 runtime under the trial directory')
        if not (root/'opt/vulpes/trial/session.py').is_file():
            raise ValueError('Common product must be staged under /opt/vulpes in the trial root')
        (root/'opt/vulpes/logs').mkdir(exist_ok=True)
        os.chown(root/'opt/vulpes/logs',account.pw_uid,account.pw_gid)
    child=shlex.join(['/usr/bin/python3',str(Path('/opt/vulpes') if root else product)+'/trial/session.py','--own-compositor','--hybris-egl'])
    result={'scope':'Own compositor on installed Droidian; not an independent root filesystem',
            'startedAt':time.time(),'seconds':args.seconds,'restoredPhosh':False}
    if root:
        result.update(scope='Phoc and Gaia in a separate ARM64 root; Android HAL and logind borrowed from installed Droidian',runtimeRoot=str(root))
    def interrupted(signum,frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,interrupted)
    try:
        DROPIN.parent.mkdir(exist_ok=True)
        DROPIN.write_text('[Unit]\nBindsTo=\n')
        CONFIG.write_text('[output:HWCOMPOSER-1]\nscale=3\n')
        isolation = f'''RootDirectory={root}
MountAPIVFS=yes
PrivateNetwork=yes
BindPaths=/dev /run/user/{account.pw_uid}
BindReadOnlyPaths=/android/system /android/vendor /run/udev /run/dbus /run/systemd/sessions /run/systemd/seats /run/systemd/users /sys {CONFIG}
''' if root else ''
        SERVICE.write_text(f'''[Unit]
Description=Temporary Vulpes display qualification
Requires=android-service@hwcomposer.service
After=android-service@hwcomposer.service systemd-user-sessions.service
Conflicts=phosh.service
[Service]
User=droidian
PAMName=login
WorkingDirectory=/home/droidian
Environment=XDG_RUNTIME_DIR=/run/user/{account.pw_uid}
Environment=XDG_SESSION_TYPE=wayland
Environment=XDG_CURRENT_DESKTOP=Vulpes
Environment=LANG=C.UTF-8
Environment=WLR_BACKENDS=hwcomposer,libinput
Environment=EGL_PLATFORM=hwcomposer
Environment=WLR_HWC_SKIP_VERSION_CHECK=1
{isolation}ExecStart={'/usr/bin/dbus-run-session -- ' if root else ''}/usr/bin/phoc --no-xwayland --socket=tundra-0 -C {CONFIG} -E {json.dumps(child)}
{'' if root else 'ExecStartPost=+chvt 7'}
TTYPath=/dev/tty7
TTYReset=yes
TTYVHangup=yes
StandardInput=tty-fail
StandardOutput={'append:'+str(root/'opt/vulpes/logs/compositor.log') if root else 'journal'}
StandardError=inherit
KillMode=control-group
TimeoutStopSec=20
RuntimeMaxSec={args.seconds+30}
''')
        for p in (DROPIN,CONFIG,SERVICE):p.chmod(0o644)
        command('systemctl','daemon-reload')
        command('systemctl','stop','phosh.service')
        command('systemctl','start',UNIT)
        if root:
            command('chvt','7')
        print('Own compositor started; Phosh will be restored automatically.',flush=True)
        deadline=time.monotonic()+args.seconds
        while time.monotonic()<deadline:
            if command('systemctl','is-active',UNIT,check=False).returncode:
                raise RuntimeError('Dedicated compositor stopped unexpectedly')
            time.sleep(2)
    except Exception as e:
        result['error']=str(e)
        raise
    finally:
        restore(result)
        result['finishedAt']=time.time()
        report=(root/'opt/vulpes' if root else product)/'logs/compositor-trial.json'
        report.parent.mkdir(exist_ok=True)
        report.write_text(json.dumps(result,indent=2)+'\n')
        os.chown(report,account.pw_uid,account.pw_gid)
        print('Restored Phosh:',result['restoredPhosh'],flush=True)


if __name__=='__main__':
    main()
