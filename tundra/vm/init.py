#!/usr/bin/python3
"""Guest PID 1. Start the graphical session and retain serial diagnostics."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import traceback

if os.getpid() != 1:
    raise SystemExit('This init runs only as PID 1 inside the VM.')
os.environ.update(PATH='/usr/bin', HOME='/root', LANG='C.UTF-8', LD_LIBRARY_PATH='/usr/lib/weston:/usr/lib')
children = []

def run(*args):
    subprocess.run(args, check=True)

def start(*args, env=None):
    p = subprocess.Popen(args, env=env)
    children.append(p)
    return p

def shutdown(*unused):
    print('TUNDRA_SHUTDOWN', flush=True)
    for p in reversed(children):
        if p.poll() is None: p.terminate()
    time.sleep(2)
    os.sync()
    # Kernel poweroff; this process cannot run on the host due to the PID1 guard.
    import ctypes
    ctypes.CDLL(None).reboot(0x4321FEDC)

signal.signal(signal.SIGTERM, shutdown)
try:
    Path('/dev/shm').mkdir(exist_ok=True)
    run('mount','-t','tmpfs','tmpfs','/dev/shm')
    Path('/dev/pts').mkdir(exist_ok=True)
    run('mount','-t','devpts','devpts','/dev/pts')
    for path in ('/run/user/1000','/home/vulpes','/var/log/tundra'):
        Path(path).mkdir(parents=True, exist_ok=True)
        os.chown(path,1000,1000)
    os.chmod('/run/user/1000',0o700)
    # Staged files belong to the builder; the guest grants only product state to its user.
    for base, dirs, files in os.walk('/opt/vulpes'):
        os.chown(base,1000,1000)
        for name in files: os.chown(Path(base)/name,1000,1000)
    run('ip','link','set','lo','up')
    start('/usr/lib/systemd/systemd-udevd','--resolve-names=never')
    # Coldplug must wait for the daemon's control socket, otherwise its initial
    # events can be lost and libinput sees neither keyboard nor pointer.
    for _ in range(100):
        ping = subprocess.run(['udevadm','control','--timeout=1','--ping'],
                              stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if ping.returncode == 0: break
        time.sleep(.1)
    else: raise RuntimeError('udevd did not become ready')
    run('udevadm','trigger','--action=add')
    run('udevadm','settle','--timeout=10')
    inputs = []
    for device in Path('/dev/input').glob('event*'):
        info = subprocess.check_output(['udevadm','info','--query=property',str(device)],text=True)
        inputs.append(info)
    if not any('ID_INPUT_MOUSE=1' in item for item in inputs):
        raise RuntimeError('Virtual pointer missing from udev: '+repr(inputs))
    if not any('ID_INPUT_KEYBOARD=1' in item for item in inputs):
        raise RuntimeError('Virtual keyboard missing from udev: '+repr(inputs))
    print('TUNDRA_INPUT_READY',flush=True)
    if 'tundra.usb=1' in Path('/proc/cmdline').read_text():
        run('python3','-u','/opt/tundra/usb-test.py')
    env = dict(os.environ, SEATD_VTBOUND='0')
    start('seatd','-g','video',env=env)
    for _ in range(50):
        if Path('/run/seatd.sock').exists(): break
        time.sleep(.1)
    env.update(HOME='/home/vulpes',USER='vulpes',LOGNAME='vulpes',
               XDG_RUNTIME_DIR='/run/user/1000',LIBSEAT_BACKEND='seatd',
               WAYLAND_DISPLAY='wayland-0',MOZ_ENABLE_WAYLAND='1',GDK_BACKEND='wayland',
               XDG_SESSION_TYPE='wayland',LIBGL_ALWAYS_SOFTWARE='1')
    print('TUNDRA_GRAPHICAL_START', flush=True)
    user = ['setpriv','--reuid=1000','--regid=1000','--groups=44,992']
    session = start(*user,'dbus-run-session','--','python3','-u','/opt/tundra/session.py',env=env)
    while session.poll() is None: time.sleep(1)
    print('TUNDRA_SESSION_EXIT',session.returncode,flush=True)
except Exception:
    traceback.print_exc()
    print('TUNDRA_BOOT_FAILED',flush=True)
finally:
    for name in ('weston.log','gecko.log','server.log','test.json','usb.log','usb-test.json'):
        p = Path('/var/log/tundra')/name
        if p.exists():
            print('TUNDRA_LOG_BEGIN', name, flush=True)
            print(p.read_text(errors='replace')[-18000:],flush=True)
            print('TUNDRA_LOG_END', name, flush=True)
    shutdown()
while True: time.sleep(1)
