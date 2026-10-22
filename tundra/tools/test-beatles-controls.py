#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Qualify Nokia controls in an already running manual Gaia diagnostic session.

Injects one volume-up/down pair, dims briefly and vibrates for 500 ms.
Restores Gaia settings afterwards. Does not call, send SMS, reboot or flash.
"""
import argparse,json,subprocess,tempfile,time,uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE='/data/local/vulpes-beatles/rootfs/work/'

def shell(command):
    return subprocess.check_output(['adb','shell',command],text=True,timeout=10).strip()

def publish(name,value):
    with tempfile.NamedTemporaryFile(mode='w') as f:
        json.dump(value,f);f.flush()
        subprocess.run(['adb','push',f.name,BASE+name+'.tmp'],capture_output=True,check=True)
    shell('mv '+BASE+name+'.tmp '+BASE+name)

def probe(script):
    identifier=uuid.uuid4().hex
    publish('manual-request.json',{'id':identifier,'app':'system','script':script})
    deadline=time.monotonic()+20
    while time.monotonic()<deadline:
        try:response=json.loads(shell('cat '+BASE+'manual-response.json'))
        except json.JSONDecodeError:response={}
        if response.get('id')==identifier:
            if 'error' in response:raise RuntimeError(response['error'])
            return response['value']
        time.sleep(.1)
    raise TimeoutError('Manual diagnostic did not answer')

def inject(key):
    try:sequence=json.loads(shell('cat '+BASE+'keypad-response.json')).get('sequence',0)+1
    except json.JSONDecodeError:sequence=1
    if sequence>64:raise RuntimeError('Start a fresh manual session')
    publish('keypad-request.json',{'sequence':sequence,'key':key})
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        try:reply=json.loads(shell('cat '+BASE+'keypad-response.json'))
        except json.JSONDecodeError:reply={}
        if reply.get('sequence')==sequence:return
        time.sleep(.1)
    raise TimeoutError('Physical input bridge did not acknowledge')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if shell('getprop ro.product.codename')!='beatles' or shell('getprop init.svc.b2g')!='stopped':
        raise RuntimeError('Requires the Nokia manual Gaia trial')
    # Gaia adjusts media volume inside an app, but notification volume on Home.
    probe('dispatchEvent(new CustomEvent("home"));return true;')
    time.sleep(1)
    report={};initial=int(shell('cat /sys/class/leds/lcd-backlight/brightness'))
    volume=probe('return (await navigator.mozSettings.createLock().get("audio.volume.notification"))["audio.volume.notification"];')
    try:
        probe('window.__controlCleanup?.(); window.__controlProof={events:[],hud:[]}; const buttons=e=>__controlProof.events.push(e.detail.type); const hud=()=>setTimeout(()=>__controlProof.hud.push(getComputedStyle(document.getElementById("volume")).display),100); addEventListener("softwareButtonEvent",buttons); for(const event of ["volumeup","volumedown"])addEventListener(event,hud); window.__controlCleanup=()=>{removeEventListener("softwareButtonEvent",buttons); for(const event of ["volumeup","volumedown"])removeEventListener(event,hud);}; return true;')
        # Establish a middle volume so both buttons can change it.
        probe('return await navigator.mozSettings.createLock().set({"audio.volume.notification":7});')
        def settle(expected):
            deadline=time.monotonic()+15
            while time.monotonic()<deadline:
                gaia=probe('return (await navigator.mozSettings.createLock().get("audio.volume.notification"))["audio.volume.notification"];')
                native=shell('service call media.audio_policy 17 i32 5 i32 2')
                if gaia==expected and ('%08x 00000000'%expected) in native:return gaia,native
                time.sleep(.2)
            raise AssertionError({'expected':expected,'gaia':gaia,'native':native})
        settle(7)
        inject('AudioVolumeUp')
        report['volumeUp'],report['nativeUp']=settle(8)
        inject('AudioVolumeDown')
        report['volumeDown'],report['nativeDown']=settle(7)
        report['ui']=probe('return window.__controlProof;')
        probe('return await VulpesCompat.call("desktop.screen",{name:"screenBrightness",value:.2});')
        report['backlight20percent']=int(shell('cat /sys/class/leds/lcd-backlight/brightness'))
        with ThreadPoolExecutor(max_workers=1) as pool:
            future=pool.submit(probe,'return await VulpesCompat.call("hardware.vibrate",{pattern:[500]});')
            samples=[];deadline=time.monotonic()+15;completed_at=None
            while time.monotonic()<deadline:
                samples.append(int(shell('cat /sys/class/timed_output/vibrator/enable')));time.sleep(.05)
                if future.done():
                    if completed_at is None:completed_at=time.monotonic()
                    if time.monotonic()-completed_at>1:break
            future.result()
        report['vibration']={'positiveSample':any(n>0 for n in samples),'final':samples[-1]}
    finally:
        probe('return await VulpesCompat.call("hardware.vibrate",{pattern:[]});')
        probe('return await VulpesCompat.call("desktop.screen",{name:"screenBrightness",value:'+str(initial/255)+'});')
        probe('return await navigator.mozSettings.createLock().set({"audio.volume.notification":'+str(volume)+'});')
        probe('window.__controlCleanup?.();delete window.__controlCleanup;delete window.__controlProof;return true;')
        report['restoredBacklight']=int(shell('cat /sys/class/leds/lcd-backlight/brightness'))
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')
    assert report['volumeUp']==8 and report['volumeDown']==7,report
    assert '00000008 00000000' in report['nativeUp'] and '00000007 00000000' in report['nativeDown'],report
    assert 'block' in report['ui']['hud'],report
    assert report['backlight20percent']==51 and report['restoredBacklight']==initial,report
    assert report['vibration']['positiveSample'] and report['vibration']['final']==0,report
    print('Gaia volume HUD, native audio indexes, backlight and bounded vibration: OK')

if __name__=='__main__':main()
