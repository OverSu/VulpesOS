#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Normalize guest ownership under fakeroot, then create ext4 without host root."""
import os
from pathlib import Path
import subprocess
import sys
if not os.environ.get('FAKEROOTKEY'):
    raise SystemExit('Run through fakeroot; never chown the staging tree as real root.')
root=Path(sys.argv[1])
for base, dirs, files in os.walk(root):
    os.lchown(base,0,0)
    for name in dirs+files: os.lchown(Path(base)/name,0,0)
subprocess.run(['mke2fs','-q','-t','ext4','-F','-d',str(root),sys.argv[2]],check=True)
