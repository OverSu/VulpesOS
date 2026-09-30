#!/usr/bin/python3
# SPDX-License-Identifier: MPL-2.0
"""Exercise both directions of FunctionFS through the guest's dummy USB controller."""
import json
import os
from pathlib import Path
import subprocess
import time

from usb_protocol import exchange


def main():
    if os.getpid()==1 or 'tundra.usb=1' not in Path('/proc/cmdline').read_text():
        raise SystemExit('Guest USB test requires its explicit VM kernel flag')
    for module in ('dummy_hcd','libcomposite','usb_f_fs','usbcore'):
        subprocess.run(['modprobe',module],check=True)
    log=Path('/var/log/tundra/usb.log').open('w')
    proc=subprocess.Popen(['unshare','--mount','--pid','--fork','/opt/tundra/usb-init'],stdout=log,stderr=subprocess.STDOUT)
    device=None
    for _ in range(200):
        for p in Path('/sys/bus/usb/devices').iterdir():
            try:
                if (p/'serial').read_text().strip()=='TUNDRA-DIAG' and (p/'idVendor').read_text().strip()=='1d6b':
                    device=Path('/dev/bus/usb')/f'{int((p/"busnum").read_text()):03d}'/f'{int((p/"devnum").read_text()):03d}'
                    if device.exists():break
            except (FileNotFoundError,NotADirectoryError):pass
        if device and device.exists():break
        if proc.poll() is not None:raise RuntimeError('Diagnostic process exited')
        time.sleep(.1)
    else:raise RuntimeError('USB gadget did not enumerate: '+Path('/var/log/tundra/usb.log').read_text())
    results=exchange(device,('status','version','mounts','forbidden'))
    assert 'readOnly=true' in results['status']
    assert 'Linux version' in results['version']
    assert 'configfs' in results['mounts']
    assert results['forbidden']=='ERROR unsupported command\nEND\n'
    report={'passed':True,'scope':'dummy_hcd x86_64 guest; not physical sargo USB', 'results':results}
    Path('/var/log/tundra/usb-test.json').write_text(json.dumps(report,indent=2)+'\n')
    print('TUNDRA_USB_TEST '+json.dumps(report),flush=True)

if __name__=='__main__':main()
