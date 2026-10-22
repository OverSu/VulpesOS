#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import time

os.umask(0o022)
for name in ('gaia-audit.json', 'gaia-native.png', 'gecko.log', 'gaia-server.log', 'memory-samples.jsonl', 'keypad-request.json', 'keypad-response.json', 'manual-request.json', 'manual-response.json'):
    Path('/work',name).unlink(missing_ok=True)
ROOT = Path('/opt/vulpes')
PROFILE = Path('/work/gaia-profile')
PROFILE.mkdir(exist_ok=True)
os.chown(PROFILE,2000,2000)
prefs = {
    'browser.shell.checkDefaultBrowser': False,
    'browser.aboutwelcome.enabled': False,
    'browser.startup.homepage_override.mstone': 'ignore',
    'browser.dom.window.dump.enabled': True,
    'datareporting.policy.dataSubmissionEnabled': False,
    'app.update.auto': False,
    'fission.autostart': False,
    'dom.ipc.processCount': 1,
    'dom.ipc.processPrelaunch.enabled': False,
    'gfx.webrender.software': True,
    'layers.acceleration.disabled': True,
    'layout.css.devPixelsPerPx': '1.0',
    'browser.cache.disk.enable': False,
    'browser.cache.memory.capacity': 8192,
}
(PROFILE/'user.js').write_text('\n'.join('user_pref(%s,%s);'%(json.dumps(k),json.dumps(v)) for k,v in prefs.items()))
os.chown(PROFILE/'user.js',2000,2000)
os.chmod(PROFILE/'user.js',0o600)
saved = PROFILE/'vulpes-settings-v1.json'
if not saved.exists():
    saved.write_text(json.dumps({'lockscreen.enabled':False,'vulpes.gaia-restoration.v1':True,'language.current':'fr'}))
    os.chown(saved,2000,2000)
shutil.copy2(ROOT/'host/bootstrap/vulpes-autoconfig.js','/opt/firefox/defaults/pref/vulpes-autoconfig.js')
config=(ROOT/'host/bootstrap/vulpes.cfg').read_text()
config+="\nChromeUtils.importESModule('resource://vulpes/tests/BeatlesAudit.sys.mjs').install();\n"
Path('/opt/firefox/vulpes.cfg').write_text(config)
os.chmod('/opt/firefox/vulpes.cfg',0o644)
for directory in ('logs','profiles'):
    (ROOT/directory).mkdir(exist_ok=True)
    os.chown(ROOT/directory,2000,2000)
for path in (ROOT/'assets').iterdir():
    if path.is_file():os.chown(path,2000,2000)


def unprivileged():
    Path('/proc/self/oom_score_adj').write_text('800')
    # Android's paranoid-network kernel requires inet even for private loopback.
    os.setgroups([3003])
    os.setgid(2000)
    os.setuid(2000)


env=os.environ.copy()
env.update(HOME='/work',TMPDIR='/tmp',DISPLAY=':0',MOZ_ENABLE_WAYLAND='0',
    VULPES_HOST_ROOT='/opt/firefox/vulpes/host',VULPES_WORKSPACE_ROOT='/opt/vulpes',
    VULPES_FULLSCREEN='1',VULPES_KEYPAD='1',VULPES_NATIVE_TOUCH='1',
    VULPES_DEVICE='beatles',VULPES_TUNDRA_STATUS='1',
    MOZ_CRASHREPORTER_DISABLE='1',FONTCONFIG_PATH='/etc/fonts')
duration=1780 if os.environ.get("VULPES_TRIAL_MANUAL")=="1" else 160
processes=[]
handles=[]
try:
    def start(command,log,drop=False):
        path=Path('/work/'+log)
        output=path.open('w');os.chmod(path,0o644);handles.append(output)
        proc=subprocess.Popen(command,env=env,stdout=output,stderr=subprocess.STDOUT,
                              preexec_fn=unprivileged if drop else None)
        processes.append(proc)
        return proc
    xorg=start(['/usr/lib/xorg/Xorg',':0','vt1','-config','/etc/X11/xorg.conf',
        '-logfile','/work/Xorg.log','-nolisten','tcp','-ac','-noreset','-novtswitch','-sharevts','-nocursor'],'xorg-console.log')
    for _ in range(100):
        if xorg.poll() is not None:raise RuntimeError('Xorg failed')
        if Path('/tmp/.X11-unix/X0').exists():break
        time.sleep(.1)
    keypad=start(['/work/keypad'],'keypad.log')
    for _ in range(120):
        if keypad.poll() is not None:raise RuntimeError('Physical keypad bridge failed; inspect keypad.log')
        if 'Nokia keypad bridge ready' in Path('/work/keypad.log').read_text():break
        time.sleep(.1)
    else:raise RuntimeError('Physical keypad bridge startup timed out')
    cover=start(['/usr/bin/python3.11','/work/cover-display.py'],'cover-display.log')
    for _ in range(50):
        if cover.poll() is not None:raise RuntimeError('External display failed; inspect cover-display.log')
        if Path('/work/cover-ready').exists():break
        time.sleep(.1)
    else:raise RuntimeError('External display startup timed out')
    server=start(['/usr/bin/python3.11',str(ROOT/'tools/serve-gaia.py')],'gaia-server.log',True)
    import socket
    for _ in range(100):
        if server.poll() is not None:raise RuntimeError('Gaia server failed')
        try:
            with socket.create_connection(('127.0.0.1',8765),timeout=.2):break
        except OSError:time.sleep(.1)
    gecko=start(['/opt/firefox/firefox','-no-remote','-purgecaches','-profile',str(PROFILE),
        '-chrome','chrome://vulpes/content/shell.xhtml'],'gecko.log',True)
    begin=time.monotonic()
    last_key_sequence=0
    last_memory_sample=0
    with Path('/work/memory-samples.jsonl').open('w') as memory:
        while gecko.poll() is None and time.monotonic()-begin<duration:
            if cover.poll() is not None:raise RuntimeError('External display stopped')
            if keypad.poll() is not None:raise RuntimeError('Physical keypad bridge stopped')
            request=Path('/work/keypad-request.json')
            if request.exists():
                command=json.loads(request.read_text())
                sequence=command.get('sequence');processed=False
                if (isinstance(sequence,int) and last_key_sequence<sequence<=64 and
                    command.get('key') in ('ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Backspace','Enter','2','Escape','EndCall','Notifications','AudioVolumeUp','AudioVolumeDown')):
                    subprocess.run(['/work/keypad','--inject-key',command['key']],env=env,check=True,timeout=5)
                    last_key_sequence=sequence;processed=True
                elif (isinstance(sequence,int) and last_key_sequence<sequence<=64 and
                      isinstance(command.get('keys'),str) and re.fullmatch(r'[0-9*#]{1,40}',command['keys'])):
                    subprocess.run(['/work/keypad','--inject-keys',command['keys']],env=env,check=True,timeout=10)
                    last_key_sequence=sequence;processed=True
                if processed:
                    reply=Path('/work/keypad-response.tmp');reply.write_text(json.dumps({'sequence':sequence}));reply.replace('/work/keypad-response.json')
            sample={'seconds':round(time.monotonic()-begin,1),'meminfo':Path('/proc/meminfo').read_text()}
            if time.monotonic()-last_memory_sample>=2:
                memory.write(json.dumps(sample)+'\n');memory.flush();last_memory_sample=time.monotonic()
            time.sleep(.1)
    print('Gecko exit:',gecko.poll(),flush=True)
finally:
    for proc in reversed(processes):
        if proc.poll() is None:proc.terminate()
    for proc in reversed(processes):
        try:proc.wait(timeout=3)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
    for handle in handles:handle.close()
