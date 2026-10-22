#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build a Linux ARMv7 EABI diagnostic; never connects to a device."""
import hashlib
import json
from pathlib import Path
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'probes/armv7-smoke.c'
folder = ROOT / 'out/beatles/armv7-smoke'
folder.mkdir(parents=True, exist_ok=True)
binary = folder / 'vulpes-armv7-probe'
command = ['clang', '--target=armv7-linux-gnueabihf', '-march=armv7-a',
           '-marm', '-mfloat-abi=soft', '-fuse-ld=lld', '-Os',
           '-ffreestanding', '-fno-builtin', '-fno-stack-protector',
           '-fno-pie', '-fno-unwind-tables', '-fno-asynchronous-unwind-tables',
           '-Wall', '-Wextra', '-Werror', '-nostdlib', '-static',
           '-Wl,--build-id=none', '-Wl,-e,_start', str(source), '-o', str(binary)]
subprocess.run(command, check=True)
data = binary.read_bytes()
assert data[:6] == b'\x7fELF\x01\x01'
assert struct.unpack_from('<H', data, 18)[0] == 40  # EM_ARM
headers = subprocess.check_output(['readelf', '-l', str(binary)], text=True)
assert 'INTERP' not in headers
metadata = {
    'kind': 'native-userspace-diagnostic', 'architecture': 'armv7',
    'containsGecko': False, 'bootImage': False, 'flashReady': False,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
    'compiler': subprocess.check_output(['clang', '--version'], text=True),
    'command': command,
}
(folder / 'build.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(binary)
print(metadata['sha256'])
