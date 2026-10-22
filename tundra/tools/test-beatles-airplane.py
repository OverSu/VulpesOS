#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Cycle Gaia airplane mode and verify Nokia modem state, then restore settings.

Requires an idle manual Nokia trial. Does not call, send messages or flash.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time

spec=importlib.util.spec_from_file_location('wifi',Path(__file__).with_name('test-beatles-wifi.py'))
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
probe=lambda code:bridge.probe('system',code)

def state():
    return probe('''const s=await navigator.mozSettings.createLock().get('*');
const h=await VulpesCompat.call('platform.snapshot',{});
return {airplane:s['airplaneMode.enabled'],status:s['airplaneMode.status'],wifi:s['wifi.enabled'],nativeWifi:h.wifi.enabled,wifiState:h.wifi.state,
        radios:h.radio.map(r=>({slot:r.slot,state:r.radioState,registered:!!r.voice?.connected,type:r.voice?.type})),
        gaia:[...navigator.mozMobileConnections].map(c=>c.radioState)};''')

def wait(predicate,seconds=45):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        value=state()
        if predicate(value):return value
        time.sleep(1)
    raise AssertionError(value)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if bridge.controls.shell('getprop ro.product.codename')!='beatles' or bridge.controls.shell('getprop init.svc.b2g')!='stopped':
        raise RuntimeError('Requires an active Nokia phone trial')
    if probe('return (await VulpesCompat.call("platform.calls",{})).length;'):
        raise RuntimeError('An active call prevents qualification')
    initial=state()
    if initial['airplane'] or not all(r['state']=='enabled' for r in initial['radios']):
        raise RuntimeError('Begin with both radios enabled and airplane mode off')
    report={'initial':initial}
    try:
        probe('await navigator.mozSettings.createLock().set({"airplaneMode.enabled":true});return true;')
        report['disabled']=wait(lambda s:s['status']=='enabled' and s['nativeWifi'] is False and all(r['state']=='disabled' for r in s['radios']) and all(r=='disabled' for r in s['gaia']))
        probe('await navigator.mozSettings.createLock().set({"airplaneMode.enabled":false});return true;')
        report['enabled']=wait(lambda s:s['status']=='disabled' and s['nativeWifi']==initial['nativeWifi'] and all(r['state']=='enabled' for r in s['radios']) and all(r=='enabled' for r in s['gaia']))
        if initial['radios'][0]['registered']:
            report['networkReturn']=wait(lambda s:s['radios'][0]['registered'],90)
        print('Gaia airplane mode, modem power readback and network return: OK')
    finally:
        try:
            probe('await navigator.mozSettings.createLock().set({"airplaneMode.enabled":false});return true;')
            # Also recover the modem if Gaia's transition was interrupted.
            for radio in initial['radios']:
                probe('return await VulpesCompat.call("platform.radioPower",'+json.dumps({'slot':radio['slot'],'enabled':True})+');')
            probe('await navigator.mozSettings.createLock().set({"wifi.enabled":'+json.dumps(initial['wifi'])+'});return true;')
            report['restored']=wait(lambda s:s['nativeWifi']==initial['nativeWifi'] and all(r['state']=='enabled' for r in s['radios']) and all(r=='enabled' for r in s['gaia']))
        finally:
            args.output.parent.mkdir(parents=True,exist_ok=True)
            args.output.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
