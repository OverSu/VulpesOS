#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Operate only the last isolated trial, using the existing authenticated SSH master."""
import argparse
import importlib.util
import json
from pathlib import Path
import shlex
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['status', 'collect', 'capture', 'restart', 'stop'])
    parser.add_argument('--hybris-egl', action='store_true')
    parser.add_argument('--software', action='store_true')
    parser.add_argument('--headless', action='store_true')
    parser.add_argument('--no-forkserver', action='store_true')
    parser.add_argument('--trace-navigation', action='store_true')
    parser.add_argument('--control-socket', type=Path, default=ROOT/'logs/device/ssh-control')
    args = parser.parse_args()
    if not args.control_socket.is_socket():
        parser.error('SSH session unavailable. Reopen the authenticated master described in docs/SARGO.md.')
    spec = importlib.util.spec_from_file_location('collector', ROOT/'tools/collect-device-ssh.py')
    collector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(collector)
    base = collector.ssh_base(args.control_socket.resolve(), '10.15.19.82', 'droidian')
    master = subprocess.run(base[:-1]+['-O', 'check', base[-1]], capture_output=True)
    if master.returncode:
        parser.error('SSH master disconnected. Reopen it before operating the trial.')
    deployment = json.loads((ROOT/'logs/device/droidian-deployment.json').read_text())
    remote = deployment['directory']
    def run(code, *extra, **kwargs):
        return subprocess.run(base+[shlex.join(['python3','-c',code,remote,*extra])],
                              check=True, timeout=180, **kwargs)
    if args.action in ('stop', 'restart'):
        run(r'''import os,pathlib,signal,sys,time
p=pathlib.Path(sys.argv[1]); product=p/'product'; pidfile=product/'logs/session.pid'
if pidfile.exists():
 pid=int(pidfile.read_text()); proc=pathlib.Path('/proc')/str(pid)
 if proc.exists():
  command=(proc/'cmdline').read_bytes().split(b'\0')
  if str(product/'trial/session.py').encode() not in command: raise RuntimeError('PID no longer belongs to trial')
  os.kill(pid,signal.SIGTERM)
  for _ in range(1500):
   if not pidfile.exists(): break
   time.sleep(.1)
  else: raise RuntimeError('Session did not stop; left untouched')
''')
    if args.action == 'restart':
        for name in ('session.py', 'probe.sys.mjs'):
            run("import pathlib,sys; (pathlib.Path(sys.argv[1])/'product/trial'/sys.argv[2]).write_bytes(sys.stdin.buffer.read())",
                name, input=(ROOT/'droidian'/name).read_bytes())
        if args.hybris_egl:
            subprocess.run(['python3',str(ROOT/'tools/build-droidian-graphics.py')],check=True)
            for name in ('libEGL_vulpes_hybris.so','manifest.json'):
                run("import pathlib,sys;p=pathlib.Path(sys.argv[1])/'product/trial/graphics';p.mkdir(exist_ok=True);(p/sys.argv[2]).write_bytes(sys.stdin.buffer.read())",
                    name,input=(ROOT/'out/droidian-graphics'/name).read_bytes())
        run('''import pathlib,shutil,subprocess,sys,time
p=pathlib.Path(sys.argv[1]); product=p/'product'; logs=product/'logs'
backup=logs/('attempt-'+str(time.time_ns())); backup.mkdir()
for name in ('gecko.log','server.log','test.json','home.png'):
 f=logs/name
 if f.exists(): shutil.move(f,backup/name)
for f in logs.glob('navigation.log*'): shutil.move(f,backup/f.name)
if (p/'session.log').exists(): shutil.move(p/'session.log',backup/'session.log')
with (p/'session.log').open('a') as output:
 proc=subprocess.Popen(['python3',str(product/'trial/session.py'),*sys.argv[2:]],
    stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
print('Started trial supervisor',proc.pid)
''', *(['--software'] if args.software else []), *(['--headless'] if args.headless else []),
             *(['--no-forkserver'] if args.no_forkserver else []),
             *(['--trace-navigation'] if args.trace_navigation else []),
             *(['--hybris-egl'] if args.hybris_egl else []))
    if args.action == 'capture':
        result=run('''import os,pathlib,subprocess,sys,time
p=pathlib.Path(sys.argv[1])/'product/logs'; shot=p/('physical-'+str(time.time_ns())+'.png')
env=dict(os.environ,DBUS_SESSION_BUS_ADDRESS='unix:path=/run/user/'+str(os.getuid())+'/bus')
result=subprocess.run(['gdbus','call','--session','--dest','org.gnome.Shell.Screenshot',
 '--object-path','/org/gnome/Shell/Screenshot','--method',
 'org.gnome.Shell.Screenshot.Screenshot','false','false',str(shot)],
 env=env,capture_output=True,text=True,check=True,timeout=15)
if not result.stdout.startswith('(true,'): raise RuntimeError(result.stdout)
sys.stdout.buffer.write(shot.read_bytes())
''',capture_output=True)
        target=ROOT/'logs/device/droidian-trial/physical-display.png'
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(result.stdout)
        print(target)
    if args.action == 'status':
        run('''import pathlib,sys
p=pathlib.Path(sys.argv[1])
for name in ('session.log','product/logs/gecko.log','product/logs/test.json'):
 f=p/name; print(name, f.read_text(errors='replace')[-12000:] if f.exists() else 'pending')
''')
    if args.action == 'collect':
        target=ROOT/'logs/device/droidian-trial'
        target.mkdir(exist_ok=True)
        for name in ('gecko.log','server.log','test.json','home.png'):
            result=run("import pathlib,sys; f=pathlib.Path(sys.argv[1])/'product/logs'/sys.argv[2]; sys.stdout.buffer.write(f.read_bytes() if f.exists() else b'')",
                       name,capture_output=True)
            if result.stdout:
                (target/name).write_bytes(result.stdout)
            else:
                (target/name).unlink(missing_ok=True)
        result=run(r'''import json,pathlib,platform,sys
p=pathlib.Path(sys.argv[1]); product=p/'product'; logs=product/'logs'
report={'kernel':platform.release(),'architecture':platform.machine(),'attempts':{},'processes':[]}
for folder in sorted(logs.glob('attempt-*')):
 report['attempts'][folder.name]={f.name:f.read_text(errors='replace')[-80000:]
   for f in folder.iterdir() if f.name in ('gecko.log','test.json')}
for proc in pathlib.Path('/proc').glob('[0-9]*'):
 try:
  cmd=(proc/'cmdline').read_bytes().split(b'\0')
  if cmd and str(product/'engines').encode() in cmd[0]:
   status={k:v.strip() for k,v in (line.split(':',1) for line in (proc/'status').read_text().splitlines() if ':' in line)
     if k in ('Name','State','VmRSS','Seccomp','NoNewPrivs')}
   report['processes'].append({'pid':proc.name,'status':status,'wchan':(proc/'wchan').read_text()})
 except OSError: pass
print(json.dumps(report,indent=2))
''',capture_output=True)
        (target/'diagnostics.json').write_bytes(result.stdout)
        print(target)


if __name__ == '__main__':
    main()
