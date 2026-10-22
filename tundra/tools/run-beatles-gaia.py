#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Synchronize the shared host and run a bounded private Nokia Gaia trial."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from kaios_debug import KaiOSDebugger

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tundra/out/beatles/gecko-156.0.1'
REMOTE='/data/local/vulpes-beatles'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--interactive',action='store_true',help='Manual session, no automatic keypad actions; KaiOS returns within 30 minutes')
    parser.add_argument('--minutes',type=int,choices=(15,30),default=30,help='Manual session duration (default: 30 minutes)')
    parser.add_argument('--cover-gif',type=Path,help='Private cover animation test, eight seconds on each screen wake')
    parser.add_argument('--phone',action='store_true',help='Enable Nokia radio, Wi-Fi, SMS/call and hardware control brokers')
    parser.add_argument('--camera-probe',action='store_true',help='Run the bounded Qualcomm HAL preview probe before Gaia starts')
    parser.add_argument('--camera-preview-binary',type=Path,help='Use a private QCamera preview-dump binary for a bounded RAM-only trial')
    args=parser.parse_args()
    session_option=(('--phone-' if args.phone else '--interactive-')+str(args.minutes*60)+'s') if args.interactive else ('--phone-180s' if args.phone else '--temporary-90s' if (args.camera_probe or args.camera_preview_binary) else '--temporary-180s')
    rows=subprocess.check_output(['adb','devices','-l'],text=True).splitlines()
    devices=[r.split()[0] for r in rows if 'model:Nokia_2720_Flip' in r.split() and r.split()[1]=='device']
    if len(devices)!=1:raise RuntimeError('Exactly one connected Nokia required')
    adb=['adb','-s',devices[0]]
    if subprocess.check_output(adb+['shell','getprop ro.product.codename'],text=True).strip()!='beatles':
        raise RuntimeError('Unexpected device')
    if not args.interactive:
        lid=subprocess.check_output(adb+['shell','cat /sys/devices/soc.0/hall_sensor1.73/hall_status'],text=True).strip()
        if lid=='1' and not (args.camera_probe or args.camera_preview_binary):
            raise RuntimeError('Open the Nokia flip before running keypad qualification; no session started')
    ini=subprocess.check_output(adb+['shell','cat '+REMOTE+'/rootfs/opt/firefox/application.ini'],text=True)
    if 'Version=156.0.1' not in ini.splitlines():raise RuntimeError('Stage Gecko 156.0.1 before launching')
    subprocess.run([sys.executable,str(ROOT/'tundra/tools/sync-beatles-gaia.py'),'--serial',devices[0]],check=True)
    if args.cover_gif:
        packed=OUT/'cover-animation.rgb565'
        subprocess.run([sys.executable,str(ROOT/'tundra/tools/prepare-beatles-cover-animation.py'),str(args.cover_gif),str(packed)],check=True)
        subprocess.run(adb+['push',str(packed),REMOTE+'/rootfs/work/cover-animation.rgb565'],check=True,capture_output=True)
    else:
        subprocess.run(adb+['shell','rm -f '+REMOTE+'/rootfs/work/cover-animation.rgb565'],check=True,capture_output=True)
    sysroot=OUT/'sysroot/rootfs'
    compiler=[str(OUT/'mozbuild/clang/bin/clang'),'--target=arm-linux-gnueabihf',
        '--sysroot='+str(sysroot),'--gcc-install-dir='+str(sysroot/'usr/lib/gcc/arm-linux-gnueabihf/12'),
        '-fuse-ld=lld','-march=armv7-a','-mfpu=neon','-mfloat-abi=hard','-O2','-Wall','-Wextra','-Werror']
    subprocess.run(compiler+['-static',str(ROOT/'tundra/probes/beatles-control-client.c'),'-o',str(OUT/'control-client')],check=True)
    subprocess.run(compiler+['-static',str(ROOT/'tundra/probes/beatles-display-session.c'),'-o',str(OUT/'display-session')],check=True)
    subprocess.run(compiler+[str(ROOT/'tundra/probes/beatles-keypad.c'),'-lX11','-lXtst','-o',str(OUT/'keypad')],check=True)
    (OUT/'gaia-test.sh').write_text('exec /usr/bin/python3.11 /work/gaia-session.py\n')
    dirs=' '.join(REMOTE+'/rootfs/'+d for d in ('opt/firefox/vulpes/tests','opt/firefox/defaults/pref','work','proc','sys','dev','tmp','run'))
    subprocess.run(adb+['shell','mkdir -p '+dirs+'; chmod 1777 '+REMOTE+'/rootfs/tmp; rm -f '+REMOTE+'/display-session.done '+REMOTE+'/rootfs/work/gaia-audit.json'],capture_output=True,check=True)
    subprocess.run(adb+['shell','mkdir -p '+REMOTE+'/rootfs/opt/vulpes/tundra/devices/beatles'],capture_output=True,check=True)
    if args.camera_probe:
        subprocess.run(adb+['shell','touch '+REMOTE+'/qcamera-probe-once'],check=True,capture_output=True)
    if args.camera_preview_binary:
        if not args.camera_preview_binary.is_file():raise RuntimeError('QCamera preview probe binary not found')
        # The trial output lives below the persistent device root. Clear it
        # before each run so a failed camera launch cannot masquerade as a
        # freshly captured frame from an earlier probe.
        subprocess.run(adb+['shell','rm -f '+REMOTE+'/qcamera-preview-dump '+REMOTE+'/qcamera-preview-dump-once '+REMOTE+'/qcamera-probe.log '+REMOTE+'/rootfs/work/camera-frame.yuv '+REMOTE+'/rootfs/work/camera-photo.jpg'],check=True,capture_output=True)
        subprocess.run(adb+['push',str(args.camera_preview_binary),REMOTE+'/qcamera-preview-dump'],check=True,capture_output=True)
        subprocess.run(adb+['shell','chmod 755 '+REMOTE+'/qcamera-preview-dump; touch '+REMOTE+'/qcamera-preview-dump-once'],check=True,capture_output=True)
    subprocess.run(adb+['push',str(ROOT/'tundra/devices/beatles/t9'),REMOTE+'/rootfs/opt/vulpes/tundra/devices/beatles/'],check=True,capture_output=True,timeout=120)
    # Seed the isolated Gaia media store with small, known-good playback samples.
    media=REMOTE+'/rootfs/work/gaia-profile/vulpes-media'
    subprocess.run(adb+['shell','mkdir -p '+media+'/music '+media+'/videos'],check=True,capture_output=True)
    samples=((ROOT/'assets/webapps/uitest.gaiamobile.org/data/audio/jonobacon-freesoftwaresong2.ogg',
              media+'/music/Vulpes-test-track.ogg'),
             (ROOT/'assets/webapps/uitest.gaiamobile.org/data/video/meetthecubs.webm',
              media+'/videos/Vulpes-test-video.webm'))
    for local,remote in samples:
        subprocess.run(adb+['push',str(local),remote],check=True,capture_output=True,timeout=60)
    # Use the phone's configured zone, not the build PC's local timezone.
    zone=subprocess.check_output(adb+['shell','getprop persist.sys.timezone'],text=True).strip()
    zone_root=Path('/usr/share/zoneinfo').resolve()
    zone_path=(zone_root/zone).resolve()
    if not zone or not zone_path.is_relative_to(zone_root) or not zone_path.is_file():
        zone='UTC';zone_path=zone_root/'UTC'
    subprocess.run(adb+['push',str(zone_path),REMOTE+'/rootfs/etc/localtime'],check=True,capture_output=True)
    print('Device timezone:',zone,flush=True)
    for directory in ('host','services','adapters'):
        subprocess.run(adb+['push',str(ROOT/directory),REMOTE+'/rootfs/opt/firefox/vulpes/'],check=True,capture_output=True,timeout=120)
    subprocess.run(adb+['push',str(ROOT/'host'),REMOTE+'/rootfs/opt/vulpes/'],check=True,capture_output=True,timeout=120)
    files=((OUT/'control-client','rootfs/work/control-client'),(OUT/'display-session','display-session'),(OUT/'keypad','rootfs/work/keypad'),
        (OUT/'gaia-test.sh','rootfs/work/display-test.sh'),
        (ROOT/'tundra/devices/beatles/gaia-session.py','rootfs/work/gaia-session.py'),
        (ROOT/'tundra/devices/beatles/cover-display.py','rootfs/work/cover-display.py'),
        (ROOT/'tundra/devices/beatles/radio_control.py','rootfs/work/radio_control.py'),
        (ROOT/'tundra/devices/beatles/call_audio.py','rootfs/work/call_audio.py'),
        (ROOT/'tundra/devices/beatles/stream_volume.py','rootfs/work/stream_volume.py'),
        (ROOT/'tundra/devices/beatles/hardware_control.py','rootfs/work/hardware_control.py'),
        (ROOT/'tundra/devices/beatles/wifi_control.py','rootfs/work/wifi_control.py'),
        (ROOT/'tundra/devices/beatles/sms_pdu.py','rootfs/work/sms_pdu.py'),
        (ROOT/'tundra/devices/beatles/radio_status.py','rootfs/work/radio_status.py'),
        (ROOT/'tundra/devices/beatles/gaia-audit.sys.mjs','rootfs/opt/firefox/vulpes/tests/BeatlesAudit.sys.mjs'),
        (ROOT/'tundra/devices/beatles/xorg.conf','rootfs/etc/X11/xorg.conf'),
        (ROOT/'tests/ProbeChild.sys.mjs','rootfs/opt/firefox/vulpes/tests/ProbeChild.sys.mjs'))
    for local,remote in files:
        subprocess.run(adb+['push',str(local),REMOTE+'/'+remote],check=True,capture_output=True)
    subprocess.run(adb+['shell','chmod 755 '+REMOTE+'/display-session '+REMOTE+'/rootfs/work/keypad '+REMOTE+'/rootfs/work/control-client'],check=True,capture_output=True)
    deadline=time.monotonic()+90
    notice=0
    while True:
        try:
            with KaiOSDebugger(devices[0]) as client:
                console=client.request('root','getProcess',id=0)['form']['consoleActor']
                # A previous session may finish while we wait for the debugger.
                # Its restoration marker must not be mistaken for this trial.
                subprocess.run(adb+['shell','rm -f '+REMOTE+'/display-session.done'],check=True,capture_output=True)
                script='''(function(){var Cc=Components.classes,Ci=Components.interfaces;
          var f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);f.initWithPath(%s);
          var p=Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);p.init(f);
          p.runAsync([%s],1,null,false);return "started";})()''' % (json.dumps(REMOTE+'/display-session'),json.dumps(session_option))
                print(client.evaluate(console,script),flush=True)
            break
        except (EOFError,OSError):
            if time.monotonic()>=deadline:raise
            if time.monotonic()>=notice:
                print('Waiting for KaiOS debugger after restart...',flush=True)
                notice=time.monotonic()+15
            time.sleep(3)
    if args.interactive:
        for second in range(100):
            state=subprocess.check_output(adb+['shell','cat '+REMOTE+'/display-session.done'],text=True).strip()
            if state=='restored':raise RuntimeError('Session ended before Gaia was ready; inspect display-session.log and work/keypad.log')
            raw=subprocess.check_output(adb+['shell','cat '+REMOTE+'/rootfs/work/gaia-audit.json'],text=True).strip()
            try: audit=json.loads(raw)
            except json.JSONDecodeError: audit={}
            if audit.get('error'):raise RuntimeError(audit['error'])
            if audit.get('readyMs') and audit.get('engine')=='156.0.1':
                print(f'Gaia ready for manual testing; automatic KaiOS return within {args.minutes} minutes.',flush=True)
                print('Radio:',json.dumps(audit.get('radioAPI',{})),flush=True)
                print('Stop early: adb shell touch '+REMOTE+'/stop-session',flush=True)
                return
            if second and second%20==0:print('Waiting for Gaia...',flush=True)
            time.sleep(1)
        subprocess.run(adb+['shell','touch '+REMOTE+'/stop-session'],check=True,capture_output=True)
        raise RuntimeError('Manual session startup timed out; requested KaiOS restoration')
    for second in range(205):
        state=subprocess.check_output(adb+['shell','cat '+REMOTE+'/display-session.done'],text=True).strip()
        if state=='restored':break
        if second and second%30==0:print('Trial running:',second,'seconds',flush=True)
        time.sleep(1)
    else:raise RuntimeError('No restoration marker; inspect the watchdog before retrying')
    report=OUT/('gaia-trial-'+time.strftime('%Y%m%d-%H%M%S'))
    report.mkdir()
    for relative in ('display-session.log','qcamera-probe.log','framebuffer.ppm','rootfs/work/camera-frame.yuv','rootfs/work/camera-photo.jpg','rootfs/work/Xorg.log','rootfs/work/xorg-console.log',
        'rootfs/run/tundra-hardware/status.json','rootfs/work/radio-status.log',
        'rootfs/work/cover-display.log','rootfs/work/cover-preview.png','rootfs/work/cover-refresh.json','rootfs/work/lid-state.json',
        'rootfs/work/keypad.log','rootfs/work/gecko.log','rootfs/work/gaia-server.log',
        'rootfs/work/gaia-audit.json','rootfs/work/gaia-native.png','rootfs/work/memory-samples.jsonl'):
        subprocess.run(adb+['pull',REMOTE+'/'+relative,str(report/Path(relative).name)],capture_output=True)
    service=subprocess.check_output(adb+['shell','getprop init.svc.b2g'],text=True).strip()
    print('KaiOS service:',service,'Report:',report,flush=True)
    # Keep both outputs from the bounded Qualcomm probe. Its still-snapshot
    # YUV is NV21 1280x960; decode it for inspection and compare it with the
    # vendor JPEG without changing anything on the phone.
    raw=report/'camera-frame.yuv'
    if raw.is_file() and raw.stat().st_size == 1280*960*3//2 and shutil.which('ffmpeg'):
        source=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','nv21',
            '-video_size','1280x960','-i',str(raw),'-frames:v','1']
        subprocess.run(source+[str(report/'camera-frame.png')],check=False,capture_output=True)
        subprocess.run(source+['-q:v','3',str(report/'camera-frame-encoded.jpg')],
            check=False,capture_output=True)
    if service!='running':raise RuntimeError('KaiOS did not restart')
    if args.camera_preview_binary:
        subprocess.run(adb+['shell','rm -f '+REMOTE+'/qcamera-preview-dump '+REMOTE+'/qcamera-preview-dump-once'],capture_output=True)
    if not (report/'gaia-audit.json').is_file():raise RuntimeError('Gaia audit did not complete')
    audit=json.loads((report/'gaia-audit.json').read_text())
    summary={key:value for key,value in audit.items() if key not in ('icons','layout')}
    print(json.dumps(summary,indent=2),flush=True)
    radio=audit.get('hardware',{}).get('radio',[])
    qualification={
        'scope':'Gaia display and keypad; no SMS or call sent',
        'radioStatusAvailable':bool(radio) and all(slot.get('available') for slot in radio),
        'smsNetworkTested':False,'callsTested':False,
    }
    (report/'hardware-qualification.json').write_text(json.dumps(qualification,indent=2)+'\n')
    print('Radio status available:',qualification['radioStatusAvailable'],flush=True)
    icons=audit.get('icons',[])
    decoded=len(icons)>=4 and all(any(image.get('complete') and image.get('width',0)>0
        for image in icon.get('images',[])) for icon in icons[:4])
    if (audit.get('error') or audit.get('engine')!='156.0.1' or not audit.get('homescreen',{}).get('icons')
        or not audit.get('logoHidden') or not audit.get('smsOpened') or audit.get('keypadInput')!='2'
        or (audit.get('layout',{}).get('mode')=='compact' and audit.get('selectedAppName') is not True)
        or not all(audit.get(name) for name in ('multitap','inputModes','deleteText','smsRecipient','smsBody'))
        or (args.phone and (not audit.get('invalidSmsRejected') or not audit.get('phoneBroker',{}).get('ready')
                            or not audit.get('dialerDigits') or not audit.get('dialerClear')))
        or not audit.get('returnHome') or not decoded or not (report/'framebuffer.ppm').is_file()):
        raise RuntimeError('Gaia qualification failed; inspect the report')


if __name__=='__main__':main()
