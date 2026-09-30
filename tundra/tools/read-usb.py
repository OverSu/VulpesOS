#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read the Tundra diagnostic protocol on an explicitly selected Linux USB device."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
from tundra import ROOT, now, save

from usb_protocol import exchange


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device',required=True,help='/dev/bus/usb/BBB/DDD, determined after manual connection')
    parser.add_argument('--stdout',action='store_true',help='Emit JSON only; do not create a report file')
    parser.add_argument('--check-invalid',action='store_true',help='Also verify rejection of an unknown command')
    args=parser.parse_args()
    if not re.fullmatch(r'/dev/bus/usb/[0-9]{3}/[0-9]{3}',args.device):parser.error('Expected an explicit usbfs device path')
    selected=Path(args.device)
    identity=None
    for entry in Path('/sys/bus/usb/devices').iterdir():
        try:
            path=Path('/dev/bus/usb')/f'{int((entry/"busnum").read_text()):03d}'/f'{int((entry/"devnum").read_text()):03d}'
            if path==selected:
                identity={key:(entry/key).read_text().strip() for key in ('idVendor','idProduct','serial')}
        except (FileNotFoundError,NotADirectoryError):continue
    if identity!={'idVendor':'1d6b','idProduct':'0104','serial':'TUNDRA-DIAG'}:
        raise SystemExit('Selected device is not the Tundra development diagnostic; no commands sent.')
    os.umask(0o077)
    results=exchange(selected,('status','version','mounts','invalid') if args.check_invalid else ('status','version','mounts'))
    if args.stdout:
        print(json.dumps(results));return
    path=ROOT/'logs/device'/('usb-'+now().replace(':','-')+'.json')
    save(path,{'recordedAt':now(),'identity':identity,'readOnly':True,'results':results})
    print(json.dumps(results,indent=2));print('Saved:',path)

if __name__=='__main__':
    try:
        main()
    except (OSError,ValueError,RuntimeError) as error:
        print('Tundra USB:',error,file=sys.stderr)
        sys.exit(1)
