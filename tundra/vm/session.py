#!/usr/bin/python3
"""A non-root Wayland session using the shared, unmodified Vulpes host."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import shutil
import subprocess
import sys
import time

root = Path('/opt/vulpes')
sys.path.insert(0,str(root/'tools'))
spec = importlib.util.spec_from_file_location('host',root/'tools/run-host.py')
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)
lock = json.loads((root/'engine-lock.json').read_text())
test='tundra.test=1' in Path('/proc/cmdline').read_text()
shutil.copy2('/opt/tundra/probe.sys.mjs',root/'tests/TundraProbe.sys.mjs')
runtime = host.prepare(lock, test=True)
with (runtime/'vulpes.cfg').open('a') as cfg:
    cfg.write('''
Services.obs.addObserver({observe(win) {
      win.addEventListener("load", () => {
        if(win.document.documentElement.getAttribute("windowtype")==="vulpes:host")
          ChromeUtils.importESModule("resource://vulpes/tests/TundraProbe.sys.mjs").run(win).catch(e=>dump("TUNDRA_PROBE_ERROR "+e+"\\n"));
      },{once:true});
    }}, "domwindowopened");
''')
logs = Path('/var/log/tundra')
processes = []

def start(args, log, **kwargs):
    p = subprocess.Popen(args,stdout=(logs/log).open('w'),stderr=subprocess.STDOUT,**kwargs)
    processes.append(p)
    return p

try:
    weston = start(['weston','--backend=drm','--renderer=pixman','--shell=kiosk-shell.so',
                    '--config=/opt/tundra/weston.ini','--idle-time=0','--socket=wayland-0',
                    ],'weston.log')
    for _ in range(150):
        if weston.poll() is not None: raise RuntimeError('Weston exited')
        if Path(os.environ['XDG_RUNTIME_DIR'],'wayland-0').exists(): break
        time.sleep(.1)
    else: raise RuntimeError('Wayland socket missing')
    server = start(['python3','-u',str(root/'tools/serve-gaia.py')],'server.log')
    for _ in range(100):
        if server.poll() is not None: raise RuntimeError('Gaia server exited')
        try:
            with socket.create_connection(('127.0.0.1',8765),timeout=.2): break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('Gaia server did not start')
    profile = root/'profiles/tundra-vm'
    profile.mkdir(parents=True,exist_ok=True)
    prefs = {'browser.shell.checkDefaultBrowser':False,'browser.dom.window.dump.enabled':True,
             'browser.startup.homepage_override.mstone':'ignore','browser.aboutwelcome.enabled':False,
             'font.default.x-western':'sans-serif','font.name.sans-serif.x-western':'Fira Sans',
             'marionette.enabled':False,
             'datareporting.policy.dataSubmissionEnabled':False,'toolkit.telemetry.enabled':False,
             'app.update.auto':False,
             # Pixman/virtio has no reliable Wayland frame clock while idle.
             'widget.wayland.vsync.enabled':False}
    (profile/'user.js').write_text('\n'.join(f'user_pref({json.dumps(k)}, {json.dumps(v)});' for k,v in prefs.items())+'\n')
    env = dict(os.environ,VULPES_FULLSCREEN='1',TUNDRA_TEST='1' if test else '0',VULPES_HOST_ROOT=str(runtime/'vulpes/host'),VULPES_WORKSPACE_ROOT=str(root))
    firefox = start([str(runtime/'firefox'),'-no-remote','-profile',str(profile),
                     '-chrome','chrome://vulpes/content/shell.xhtml'],'gecko.log',env=env)
    forwarded=False
    for _ in range(1800):
        if firefox.poll() is not None: raise RuntimeError('Gecko exited before checks completed')
        if not forwarded and 'TUNDRA_POINTER_HOME' in (logs/'gecko.log').read_text(errors='replace'):
            print('TUNDRA_POINTER_HOME',flush=True);forwarded=True
        if (logs/'test.json').exists(): break
        time.sleep(.1)
    else: raise RuntimeError('Guest test timeout')
    report=json.loads((logs/'test.json').read_text())
    report['uid']=os.getuid()
    report['checks']['nonRoot']=os.getuid()!=0
    report['passed']=report['passed'] and report['checks']['nonRoot']
    (logs/'test.json').write_text(json.dumps(report,indent=2)+'\n')
    print('TUNDRA_GUI_TEST '+json.dumps(report),flush=True)
    if not report['passed']: raise RuntimeError('Guest checks failed')
    print('TUNDRA_GUI_READY',flush=True)
    if 'tundra.test=1' in Path('/proc/cmdline').read_text():
        time.sleep(20) # Host captures the actual virtio display before shutdown.
    else:
        while firefox.poll() is None and weston.poll() is None: time.sleep(1)
finally:
    for p in reversed(processes):
        if p.poll() is None:
            p.terminate()
            try: p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill(); p.wait()
