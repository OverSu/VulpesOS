#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build the separate GPL-3.0 Nuntium codec helper from locked Go modules."""
import hashlib,json,os,shutil,subprocess
from pathlib import Path


def stage(root):
    project=Path(__file__).resolve().parents[2]
    source=project/'tundra/mms-codec'
    out=project/'tundra/out/mms-codec-build';out.mkdir(parents=True,exist_ok=True)
    binary=out/'tundra-mms-codec'
    env={**os.environ,'GOMODCACHE':str(project/'tundra/downloads/go-modules'),
         'GOCACHE':str(project/'tundra/out/go-cache'),'GOOS':'linux','GOARCH':'arm64','CGO_ENABLED':'0'}
    subprocess.run(['go','build','-mod=readonly','-trimpath','-ldflags=-s -w','-buildvcs=false','-o',str(binary),'.'],cwd=source,env=env,check=True)
    target=root/'usr/libexec/tundra-mms-codec';target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(binary,target)
    doc=root/'usr/share/doc/tundra-mms-codec';doc.mkdir(parents=True,exist_ok=True)
    for name in ['main.go','go.mod','go.sum','COPYING']:shutil.copy2(source/name,doc/name)
    (doc/'provenance.json').write_text(json.dumps({'license':'GPL-3.0-only',
      'source':'https://gitlab.com/ubports/development/core/nuntium',
      'revision':'d051757417a42872abb99c7583a8a4af6e3108f5',
      'sha256':hashlib.sha256(binary.read_bytes()).hexdigest()},indent=2)+'\n')
    return target
