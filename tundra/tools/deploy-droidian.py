#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Copy a checked trial into a new user directory, then open its Wayland window."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shlex
import subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--control-socket', type=Path, required=True)
    parser.add_argument('--host', default='10.15.19.82')
    parser.add_argument('--user', default='droidian')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('collector', ROOT/'tools/collect-device-ssh.py')
    collector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(collector)
    base = collector.ssh_base(args.control_socket.resolve(), args.host, args.user)
    subprocess.run(base[:-1]+['-O','check',base[-1]], check=True)
    def run(command, **kwargs):
        return subprocess.run(base+[shlex.join(command)], check=True, **kwargs)
    identity = run(['getprop','ro.product.device'], capture_output=True, text=True).stdout.strip()
    if identity != 'sargo':
        raise RuntimeError('Expected the previously inventoried sargo device')
    archive = ROOT/'out/droidian/vulpes-droidian.tar.gz'
    metadata = json.loads(archive.with_suffix('.json').read_text())
    with archive.open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest() != metadata['sha256']:
            raise RuntimeError('Local archive hash differs from its manifest')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    remote = run(['python3','-c',
        "from pathlib import Path; p=Path.home()/'vulpes-tundra-tests'/"+repr(stamp)+
        "; p.mkdir(parents=True,exist_ok=False); print(p)"],
        capture_output=True,text=True).stdout.strip()
    with archive.open('rb') as stream:
        run(['python3','-c',
             "import sys,shutil; f=open(sys.argv[1],'xb'); shutil.copyfileobj(sys.stdin.buffer,f); f.close()",
             remote+'/payload.tar.gz'], stdin=stream, timeout=300)
    code = '''import hashlib,json,pathlib,subprocess,sys,tarfile
p=pathlib.Path(sys.argv[1]); archive=p/'payload.tar.gz'
with archive.open('rb') as stream: digest=hashlib.file_digest(stream,'sha256').hexdigest()
if digest != sys.argv[2]: raise RuntimeError('Transfer hash mismatch')
product=p/'product'; product.mkdir()
with tarfile.open(archive) as package: package.extractall(product,filter='data')
log=(p/'session.log').open('w')
proc=subprocess.Popen(['python3',str(product/'trial/session.py')],stdin=subprocess.DEVNULL,
                      stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'directory':str(p),'pid':proc.pid,'sha256':digest}))
'''
    result = json.loads(run(['python3','-c',code,remote,metadata['sha256']],
                           capture_output=True,text=True,timeout=900).stdout)
    result['engine'] = metadata['engine']
    result['createdAt'] = stamp
    path = ROOT/'logs/device/droidian-deployment.json'
    path.write_text(json.dumps(result,indent=2)+'\n')
    path.chmod(0o600)
    print(json.dumps(result,indent=2))


if __name__ == '__main__':
    main()
