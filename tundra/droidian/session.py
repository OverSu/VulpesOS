#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Run an isolated Vulpes window inside the existing Droidian Wayland session."""
import argparse
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def drop_capabilities():
    """The compositor may inherit hardware capabilities; Gaia must not keep them."""
    import ctypes
    libc=ctypes.CDLL(None,use_errno=True)
    if libc.prctl(47,4,0,0,0):  # PR_CAP_AMBIENT, PR_CAP_AMBIENT_CLEAR_ALL
        raise OSError(ctypes.get_errno(),'clear ambient capabilities')
    class Header(ctypes.Structure):
        _fields_=[('version',ctypes.c_uint32),('pid',ctypes.c_int)]
    class Data(ctypes.Structure):
        _fields_=[('effective',ctypes.c_uint32),('permitted',ctypes.c_uint32),('inheritable',ctypes.c_uint32)]
    if libc.capset(ctypes.byref(Header(0x20080522,0)),(Data*2)()):
        raise OSError(ctypes.get_errno(),'drop process capabilities')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hybris-egl', action='store_true', help='Use the hash-pinned local libhybris EGL correction')
    parser.add_argument('--software', action='store_true', help='Use software WebRender for EGL driver diagnostics')
    parser.add_argument('--headless', action='store_true', help='Test Gecko/Gaia without the locked physical display')
    parser.add_argument('--no-forkserver', action='store_true', help='Diagnose process creation on the old device kernel')
    parser.add_argument('--trace-navigation', action='store_true', help='Write detailed Gecko navigation logs for this trial')
    parser.add_argument('--own-compositor', action='store_true', help='Run inside the dedicated temporary Tundra compositor, without Phosh services')
    parser.add_argument('--diagnostics', action='store_true', help='Open apps and scroll Gaia for the interactive qualification suite')
    args = parser.parse_args()
    if os.getuid() == 0:
        raise RuntimeError('Run as the graphical session user, never root')
    drop_capabilities()
    trials = str(Path.home()/'vulpes-tundra-tests').encode()+b'/'
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            command = (proc/'cmdline').read_bytes().split(b'\0')
        except OSError:
            continue
        if command and command[0].startswith(trials) and b'/product/engines/' in command[0]:
            raise RuntimeError(f'A previous trial engine is still present: PID {proc.name}')
    logs = ROOT/'logs'
    logs.mkdir(exist_ok=True)
    guard = (logs/'session.lock').open('w')
    fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with socket.socket() as check:
        check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        check.bind(('127.0.0.1', 8765))
    env = {k:v for k,v in os.environ.items() if not k.startswith('MOZ_DISABLE_')}
    for key in ('MOZ_HEADLESS', 'MOZ_MARIONETTE', 'B2G_HOMESCREEN'):
        env.pop(key, None)
    runtime_dir = Path(f'/run/user/{os.getuid()}')
    display = 'tundra-0' if args.own_compositor else 'wayland-0'
    if not (runtime_dir/display).is_socket():
        raise RuntimeError('Existing Wayland session not found')
    env.update(XDG_RUNTIME_DIR=str(runtime_dir), WAYLAND_DISPLAY=display,
               DBUS_SESSION_BUS_ADDRESS=env.get('DBUS_SESSION_BUS_ADDRESS',f'unix:path={runtime_dir}/bus'),
               MOZ_ENABLE_WAYLAND='1', EGL_PLATFORM='wayland', GDK_GL='gles',
               VULPES_FULLSCREEN='1', VULPES_NATIVE_TOUCH='1',
               VULPES_WORKSPACE_ROOT=str(ROOT))
    if args.hybris_egl:
        import hashlib
        graphics = ROOT/'trial/graphics'
        manifest = json.loads((graphics/'manifest.json').read_text())
        vendor = Path(manifest['vendorLibrary'])
        adapter = graphics/'libEGL_vulpes_hybris.so'
        for path, expected in [(vendor,manifest['vendorSha256']), (adapter,manifest['adapterSha256'])]:
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise RuntimeError('EGL adapter/library changed; requalify before use: '+str(path))
        descriptor = graphics/'vulpes-egl.json'
        descriptor.write_text(json.dumps({'file_format_version':'1.0.0','ICD':{'library_path':str(adapter)}}))
        env['__EGL_VENDOR_LIBRARY_FILENAMES'] = str(descriptor)
    env['TUNDRA_DIAGNOSTICS'] = '1' if args.diagnostics else '0'
    env['TUNDRA_BOOT_ID'] = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    env['TUNDRA_HEADLESS'] = '1' if args.headless else '0'
    env['TUNDRA_OWN_COMPOSITOR'] = '1' if args.own_compositor else '0'
    if args.trace_navigation:
        env.update(MOZ_LOG='sync,timestamp,nsDocShell:5,DocumentChannel:5,ProcessIsolation:5,nsHttp:5',
                   MOZ_LOG_FILE=str(logs/'navigation.log'))
    if args.headless:
        env.update(MOZ_HEADLESS='1', VULPES_FULLSCREEN='0')
    inhibitor = None
    if not args.headless and not args.own_compositor:
        from gi.repository import Gio, GLib
        bus = Gio.DBusConnection.new_for_address_sync(env['DBUS_SESSION_BUS_ADDRESS'],
            Gio.DBusConnectionFlags.AUTHENTICATION_CLIENT | Gio.DBusConnectionFlags.MESSAGE_BUS_CONNECTION,
            None, None)
        locked = bus.call_sync('org.gnome.ScreenSaver', '/org/gnome/ScreenSaver',
            'org.gnome.ScreenSaver', 'GetActive', None, GLib.VariantType.new('(b)'),
            Gio.DBusCallFlags.NONE, 5000, None).unpack()[0]
        if locked:
            raise RuntimeError('Unlock the phone before starting the visible trial')
        cookie = bus.call_sync('org.gnome.SessionManager', '/org/gnome/SessionManager',
            'org.gnome.SessionManager', 'Inhibit',
            GLib.Variant('(susu)', ('org.vulpes.TundraTrial', 0, 'Essai graphique Vulpes', 8)),
            GLib.VariantType.new('(u)'), Gio.DBusCallFlags.NONE, 5000, None).unpack()[0]
        # The session manager releases this temporary idle inhibitor when our
        # bus connection closes, including after a crash. Manual lock still works.
        inhibitor = bus
    sys.path.insert(0, str(ROOT/'tools'))
    spec = importlib.util.spec_from_file_location('host', ROOT/'tools/run-host.py')
    host = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(host)
    lock = json.loads((ROOT/'engine-lock.json').read_text())
    runtime = host.prepare(lock, test=True)
    import shutil
    shutil.copy2(ROOT/'trial/probe.sys.mjs', runtime/'vulpes/tests/DroidianProbe.sys.mjs')
    with (runtime/'vulpes.cfg').open('a') as cfg:
        cfg.write('''
Services.obs.addObserver({observe(win) {
  win.addEventListener('load', () => {
    if(win.document.documentElement.getAttribute('windowtype') === 'vulpes:host')
      ChromeUtils.importESModule('resource://vulpes/tests/DroidianProbe.sys.mjs').run(win)
        .catch(e => dump('TUNDRA_PROBE_ERROR '+e+'\\n'));
  }, {once:true});
}}, 'domwindowopened');
''')
    env['VULPES_HOST_ROOT'] = str(runtime/'vulpes/host')
    profile = ROOT/'profiles/droidian-trial'
    profile.mkdir(parents=True, exist_ok=True)
    prefs = {'browser.shell.checkDefaultBrowser':False,
             'font.default.x-western':'sans-serif',
             'dom.w3c_touch_events.legacy_apis.enabled':True,
             'font.name.sans-serif.x-western':'Fira Sans',
             'browser.dom.window.dump.enabled':True,
             'browser.startup.homepage_override.mstone':'ignore',
             'browser.aboutwelcome.enabled':False,
             'datareporting.policy.dataSubmissionEnabled':False,
             'toolkit.telemetry.enabled':False, 'app.update.auto':False,
             'marionette.enabled':env.get('TUNDRA_LOCAL_DEBUGGER')=='1',
             'marionette.port':2858,'marionette.host':'127.0.0.1',
             # Write both states: prefs.js retains values between trials.
             'gfx.webrender.software':args.software,
             'layers.acceleration.disabled':args.software,
             'gfx.webrender.allow-partial-present-buffer-age':False,
             'dom.ipc.forkserver.enable':not args.no_forkserver}
    if args.software:
        prefs.update({'gfx.webrender.software':True, 'layers.acceleration.disabled':True,
                      'media.ffmpeg.vaapi.enabled':False})
    (profile/'user.js').write_text('\n'.join(
        f'user_pref({json.dumps(k)}, {json.dumps(v)});' for k,v in prefs.items())+'\n')
    (logs/'session.pid').write_text(str(os.getpid())+'\n')
    def stop(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    processes = []
    try:
        with (logs/'server.log').open('w') as output:
            server = subprocess.Popen([sys.executable, '-u', str(ROOT/'tools/serve-gaia.py')],
                                      stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        processes.append(server)
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError('Gaia server exited: see logs/server.log')
            try:
                with socket.create_connection(('127.0.0.1',8765), timeout=.2):
                    break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Gaia server startup timeout')
        with (logs/'gecko.log').open('w') as output:
            debug_args=['--remote-allow-system-access','-marionette','-new-window','about:blank'] if env.get('TUNDRA_LOCAL_DEBUGGER')=='1' else []
            firefox = subprocess.Popen([str(runtime/'firefox'), *debug_args, '-purgecaches', '-no-remote',
                '-profile', str(profile), '-chrome', 'chrome://vulpes/content/shell.xhtml'],
                env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        processes.append(firefox)
        result = firefox.wait()
        if result:
            raise RuntimeError(f'Gecko exited with {result}: see logs/gecko.log')
    finally:
        remaining = []
        for process in reversed(processes):
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        remaining.append(process.pid)
        (logs/'stop.json').write_text(json.dumps({'unreapedProcesses':remaining})+'\n')
        (logs/'session.pid').unlink(missing_ok=True)
        if inhibitor:
            inhibitor.close_sync(None)
        if remaining:
            raise RuntimeError(f'Kernel has not released trial processes: {remaining}')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
