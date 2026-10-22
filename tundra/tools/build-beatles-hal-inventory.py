#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build the read-only sensor HAL probe using private Nokia ABI libraries.

No flashing or device execution. Run the resulting library in a separate
Android /system/bin/true process with LD_PRELOAD, never in Gecko itself.
The constructor enumerates sensors without activating them and exits.
"""
import argparse,hashlib,json,subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--libraries',type=Path,required=True,help='Private directory containing libc.so and libdl.so pulled from this Nokia')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();source=ROOT/'tundra/probes/beatles-hal-inventory.c'
    libraries=[args.libraries/name for name in ('libc.so','libdl.so')]
    for path in libraries:
        data=path.read_bytes()
        if data[:6]!=b'\x7fELF\x01\x01' or data[18:20]!=b'\x28\x00':raise ValueError('Requires ARM32 Nokia libraries')
    args.output.parent.mkdir(exist_ok=True,parents=True)
    command=['clang','--target=armv7-linux-androideabi','-march=armv7-a','-mfloat-abi=softfp',
        '-fuse-ld=lld','-shared','-fPIC','-nostdlib','-O2','-Wall','-Wextra','-Werror',
        '-Wl,--no-undefined','-Wl,-soname,libvulpes-hal-inventory.so',str(source),
        *map(str,libraries),'-o',str(args.output)]
    subprocess.run(command,check=True)
    args.output.with_suffix('.build.json').write_text(json.dumps({'device':'beatles','abi':'Android 6 ARM32',
        'operation':'sensor enumeration only; no activation','sourceSha256':sha(source),
        'sha256':sha(args.output),'privateLibraries':{p.name:sha(p) for p in libraries},
        'command':command},indent=2)+'\n')
    print(args.output)

if __name__=='__main__':main()
