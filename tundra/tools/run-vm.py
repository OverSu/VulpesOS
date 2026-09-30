#!/usr/bin/env python3
"""Boot Tundra's graphical guest; no NIC, no host shares, disposable disk overlay."""
import argparse
import fcntl
import json
import hashlib
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'out/graphical-vm'
LOG=ROOT/'logs'

def qmp(path, command, arguments=None):
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(5)
        sock.connect(str(path))
        stream=sock.makefile('rwb',buffering=0)
        json.loads(stream.readline())
        stream.write(b'{"execute":"qmp_capabilities"}\n')
        while 'return' not in json.loads(stream.readline()): pass
        stream.write((json.dumps({'execute':command,'arguments':arguments or {}})+'\n').encode())
        while True:
            result=json.loads(stream.readline())
            if 'error' in result: raise RuntimeError(result)
            if 'return' in result: return result['return']

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--test',action='store_true',help='Headless real DRM display, guest tests and screenshot')
    parser.add_argument('--usb-test',action='store_true',help='Also test read-only FunctionFS on dummy_hcd inside the VM')
    parser.add_argument('--show',action='store_true',help='Show the QEMU window while running the automated test')
    parser.add_argument('--memory',type=int,default=3072)
    args=parser.parse_args()
    for name in ('root.ext4','vmlinuz','initramfs.cpio.gz','build.json'):
        if not (OUT/name).is_file(): raise SystemExit('Build first: python3 tundra/tools/build-vm.py')
    LOG.mkdir(exist_ok=True)
    label='graphical-vm' if args.test else 'graphical-vm-session'
    with (LOG/'graphical-vm.lock').open('w') as guard, tempfile.TemporaryDirectory(prefix='tundra-qmp-') as temp:
        fcntl.flock(guard,fcntl.LOCK_EX|fcntl.LOCK_NB)
        qmp_path=Path(temp)/'qmp.sock'
        serial=LOG/(label+'.log')
        serial.write_text('')
        command=['qemu-system-x86_64','-enable-kvm','-cpu','host','-smp','2','-m',str(args.memory),
                 '-kernel',str(OUT/'vmlinuz'),'-initrd',str(OUT/'initramfs.cpio.gz'),
                 '-append','console=ttyS0 rdinit=/init panic=-1'+(' tundra.test=1' if args.test else '')+(' tundra.usb=1' if args.usb_test else ''),
                 '-drive',f'file={OUT}/root.ext4,format=raw,if=virtio,snapshot=on',
                 '-net','none','-device','virtio-vga,xres=600,yres=960','-vga','none',
                 '-device','virtio-keyboard-pci','-device','virtio-tablet-pci',
                 '-display','none' if args.test and not args.show else 'gtk,zoom-to-fit=off',
                 '-serial',f'file:{serial}','-qmp',f'unix:{qmp_path},server=on,wait=off','-no-reboot']
        captured=False
        clicked=False
        print(f'Tundra VM — {args.memory} MiB RAM, disque de session jetable, réseau local uniquement.',flush=True)
        proc=subprocess.Popen(command)
        deadline=time.monotonic()+240 if args.test else float('inf')
        try:
            while proc.poll() is None:
                log=serial.read_text(errors='replace')
                if 'TUNDRA_POINTER_HOME' in log and not clicked:
                    qmp(qmp_path,'screendump',{'filename':str(LOG/(label+'-clock.ppm'))})
                    qmp(qmp_path,'input-send-event',{'events':[
                        {'type':'abs','data':{'axis':'x','value':16384}},
                        {'type':'abs','data':{'axis':'y','value':32085}}]})
                    time.sleep(.5)
                    qmp(qmp_path,'input-send-event',{'events':[{'type':'btn','data':{'button':'left','down':True}}]})
                    time.sleep(.1)
                    qmp(qmp_path,'input-send-event',{'events':[{'type':'btn','data':{'button':'left','down':False}}]})
                    clicked=True
                if 'TUNDRA_GUI_READY' in log and not captured:
                    qmp(qmp_path,'screendump',{'filename':str(LOG/(label+'.ppm'))})
                    captured=True
                    print('Gaia guest checks passed; screenshot captured.',flush=True)
                if time.monotonic()>deadline:
                    try: qmp(qmp_path,'screendump',{'filename':str(LOG/(label+'-failed.ppm'))})
                    except Exception: pass
                    raise TimeoutError(f'Guest did not finish; see {serial}')
                time.sleep(1)
        finally:
            if proc.poll() is None:
                proc.terminate()
                try: proc.wait(timeout=10)
                except subprocess.TimeoutExpired: proc.kill(); proc.wait()
        text=serial.read_text(errors='replace')
        reports=[line.removeprefix('TUNDRA_GUI_TEST ') for line in text.splitlines() if line.startswith('TUNDRA_GUI_TEST ')]
        decoded=[json.loads(item) for item in reports]
        report=next((item for item in decoded if 'uid' in item), decoded[-1] if decoded else {'passed':False,'error':'No guest test result'})
        usb_reports=[json.loads(line.removeprefix('TUNDRA_USB_TEST ')) for line in text.splitlines() if line.startswith('TUNDRA_USB_TEST ')]
        if args.usb_test:
            report['usb']=usb_reports[-1] if usb_reports else {'passed':False,'error':'No USB result'}
            report['passed']=report['passed'] and report['usb']['passed']
        report['buildManifestSha256']=hashlib.sha256((OUT/'build.json').read_bytes()).hexdigest()
        report.update(screenshot=captured, qemuExit=proc.returncode, scope='x86_64 VM only; no Pixel/HAL test')
        (LOG/(label+'-test.json')).write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))
        if args.test and not (report['passed'] and captured and proc.returncode==0): raise SystemExit(1)

if __name__=='__main__': main()
