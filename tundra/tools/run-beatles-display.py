#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Run a 45-second framebuffer/keypad test, then restore KaiOS automatically."""
import json
from pathlib import Path
import subprocess
import time
from kaios_debug import KaiOSDebugger

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out/beatles/gecko-156.0.1'
REMOTE = '/data/local/vulpes-beatles'


def main():
    rows = subprocess.check_output(['adb','devices','-l'],text=True).splitlines()
    devices = [r.split()[0] for r in rows if 'model:Nokia_2720_Flip' in r.split()
               and r.split()[1]=='device']
    if len(devices)!=1:
        raise RuntimeError('Exactly one connected Nokia required')
    adb = ['adb','-s',devices[0]]
    if subprocess.check_output(adb+['shell','getprop ro.product.codename'],text=True).strip()!='beatles':
        raise RuntimeError('Unexpected device')
    sysroot=OUT/'sysroot/rootfs'
    compiler=[str(OUT/'mozbuild/clang/bin/clang'),'--target=arm-linux-gnueabihf',
              '--sysroot='+str(sysroot),'--gcc-install-dir='+str(sysroot/'usr/lib/gcc/arm-linux-gnueabihf/12'),
              '-fuse-ld=lld','-march=armv7-a','-mfpu=neon','-mfloat-abi=hard',
              '-O2','-Wall','-Wextra','-Werror']
    subprocess.run(compiler+['-static',str(ROOT/'probes/beatles-display-session.c'),
                            '-o',str(OUT/'display-session')],check=True)
    subprocess.run(compiler+[str(ROOT/'probes/beatles-x11-test.c'),'-lX11',
                            '-o',str(OUT/'x11-test')],check=True)
    subprocess.run(compiler+[str(ROOT/'probes/beatles-keypad.c'),'-lX11','-lXtst',
                            '-o',str(OUT/'keypad')],check=True)
    (OUT/'display-test.sh').write_text('exec /usr/bin/python3.11 /work/display-test.py\n')
    dirs=' '.join(REMOTE+'/rootfs/'+d for d in ('work','proc','sys','dev','tmp','var/log','run'))
    subprocess.run(adb+['shell','mkdir -p '+dirs+'; chmod 1777 '+REMOTE+'/rootfs/tmp'],check=True,capture_output=True)
    files=((OUT/'display-session','display-session'),(OUT/'x11-test','rootfs/work/x11-test'),
           (OUT/'keypad','rootfs/work/keypad'),
           (OUT/'display-test.sh','rootfs/work/display-test.sh'),
           (ROOT/'devices/beatles/display-test.py','rootfs/work/display-test.py'),
           (ROOT/'devices/beatles/xorg.conf','rootfs/etc/X11/xorg.conf'))
    for local,remote in files:
        subprocess.run(adb+['push',str(local),REMOTE+'/'+remote],check=True,capture_output=True)
    subprocess.run(adb+['shell','chmod 755 '+REMOTE+'/display-session '+REMOTE+'/rootfs/work/x11-test '+REMOTE+'/rootfs/work/keypad; rm -f '
                        +REMOTE+'/display-session.done'],check=True,capture_output=True)
    with KaiOSDebugger(devices[0]) as client:
        console=client.request('root','getProcess',id=0)['form']['consoleActor']
        script='''(function(){var Cc=Components.classes,Ci=Components.interfaces;
          var f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);f.initWithPath(%s);
          var p=Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);p.init(f);
          p.runAsync(["--temporary-45s"],1,null,false);return "started";})()''' % json.dumps(REMOTE+'/display-session')
        print(client.evaluate(console,script),flush=True)
    for _ in range(65):
        state=subprocess.check_output(adb+['shell','cat '+REMOTE+'/display-session.done'],text=True).strip()
        if state=='restored':
            break
        time.sleep(1)
    else:
        raise RuntimeError('No restoration marker; inspect display-session.log and b2g service')
    for relative in ('display-session.log','rootfs/work/Xorg.log','rootfs/work/xorg-console.log',
                     'rootfs/work/x11-test.log','rootfs/work/x11-test.ppm','rootfs/work/keypad.log'):
        subprocess.run(adb+['pull',REMOTE+'/'+relative,str(OUT/Path(relative).name)],capture_output=True)
    service=subprocess.check_output(adb+['shell','getprop init.svc.b2g'],text=True).strip()
    print((OUT/'display-session.log').read_text())
    print('KaiOS service:',service)
    if service!='running':
        raise RuntimeError('KaiOS did not restart')


if __name__=='__main__':
    main()
