#!/usr/bin/env python3
"""Build a separate publication index; never change the working index or push."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = {'adapters','android','assets','contracts','gaia','host','overrides','services','tests','tools','tundra'}
ROOT_FILES = {'.gitignore','.nvmrc','.prettierignore','.prettierrc.json','LICENSE','NOTICE',
              'README.md','README.fr.md','engine-lock.json','package.json','package-lock.json',
              'pyproject.toml','requirements-dev.txt','release.json','run.sh','setup.sh'}
INTERNAL = {'changelog.json','VALIDATION.json','candidate-engine.json',
            'tools/export-changelog.py','tools/sync-forgejo-changelog.py','tests/test_changelog.py',
            'tools/check-checkout.py'}
MEDIA = {'docs/media/vulpes-logo.png','docs/media/vulpes-desktop.png','docs/media/vulpes-gecko.png'}
PRIVATE_PARTS = {'.git','.ssh','profiles','logs','out','downloads','engines','toolchain','keys','.gradle','node_modules','__pycache__'}

def target_name(name):
    p=Path(name)
    if name in INTERNAL or any(x in PRIVATE_PARTS for x in p.parts):return None
    if name in MEDIA:return name
    if p.parts[0] not in SOURCE_DIRS and name not in ROOT_FILES:return None
    if 'docs' in p.parts or p.name=='VALIDATION.json':return None
    if p.suffix.lower()=='.md' and name not in {'README.md','README.fr.md'}:
        # License notices are retained verbatim, without publishing internal Markdown.
        if p.name.lower() in {'license.md','copying.md','notice.md'}:return str(p.with_suffix(''))
        return None
    if p.name.lower() in {'roadmap','todo','roadmap.txt','todo.txt'}:return None
    if name.startswith(('android/app/build/','android/build/','android/dist/','android/app/src/main/assets/','tundra/sources/')):return None
    if p.suffix.lower() in {'.apk','.img','.ext4','.keystore','.jks','.p12','.pfx','.pyc'}:return None
    if p.name in {'local.properties','client-key','known_hosts','authorized_keys','id_rsa','id_ed25519'}:return None
    return name

def select():
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
    selected={}
    for name in sorted(set(paths)-{''}):
        dest=target_name(name)
        if dest is None:continue
        p=ROOT/name
        if p.is_symlink() and not p.resolve().is_relative_to(ROOT):raise ValueError('External symlink: '+name)
        if not p.is_file():raise ValueError('Missing publication file: '+name)
        if dest in selected:raise ValueError('Duplicate destination: '+dest)
        selected[dest]=name
    if not {'LICENSE','NOTICE','README.md','README.fr.md'}<=selected.keys():raise ValueError('Missing publication metadata')
    return selected

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index',type=Path,required=True)
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args()
    index=args.index.resolve();normal=Path(subprocess.check_output(['git','rev-parse','--git-path','index'],cwd=ROOT,text=True).strip()).resolve()
    if index==normal:raise ValueError('Refusing to replace working index')
    selected=select();env=dict(os.environ,GIT_INDEX_FILE=str(index))
    index.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['git','read-tree','--empty'],cwd=ROOT,env=env,check=True)
    ordinary=[name for name in selected.values() if not (ROOT/name).is_symlink()]
    encoded=''.join(json.dumps(name,ensure_ascii=False)+'\n' for name in ordinary).encode()
    hashes=subprocess.check_output(['git','hash-object','-w','--no-filters','--stdin-paths'],input=encoded,cwd=ROOT).decode().splitlines()
    if len(hashes)!=len(ordinary):raise ValueError('Blob count mismatch')
    blobs=dict(zip(ordinary,hashes))
    entries=[];manifest={};warnings=[]
    for dest,source in selected.items():
        p=ROOT/source;data=os.readlink(p).encode() if p.is_symlink() else p.read_bytes()
        if re.search(rb'-----BEGIN (?:OPENSSH|RSA|EC|DSA)? ?PRIVATE KEY-----',data):warnings.append(source)
        blob=blobs.get(source) or subprocess.check_output(['git','hash-object','-w','--stdin'],input=data,cwd=ROOT).decode().strip()
        mode='120000' if p.is_symlink() else ('100755' if p.stat().st_mode&0o111 else '100644')
        entries.append((mode+' '+blob+'\t'+dest+'\0').encode())
        manifest[dest]={'source':source,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
    if warnings:raise ValueError('Private-key material requires review: '+', '.join(warnings))
    subprocess.run(['git','update-index','-z','--index-info'],input=b''.join(entries),cwd=ROOT,env=env,check=True)
    tree=subprocess.check_output(['git','write-tree'],cwd=ROOT,env=env,text=True).strip()
    report={'tree':tree,'files':len(manifest),'bytes':sum(v['bytes'] for v in manifest.values()),'markdown':[x for x in manifest if x.lower().endswith('.md')],'manifest':manifest}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='manifest'},indent=2))

if __name__=='__main__':main()
