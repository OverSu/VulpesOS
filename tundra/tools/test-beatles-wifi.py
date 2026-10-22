#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Qualify Nokia Wi-Fi in an active manual trial using its saved network.

Briefly disconnects Wi-Fi, restores it in finally, and checks HTTPS access.
Does not read passwords, delete saved networks, call, send SMS or flash.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time
import uuid

spec=importlib.util.spec_from_file_location('controls',Path(__file__).with_name('test-beatles-controls.py'))
controls=importlib.util.module_from_spec(spec);spec.loader.exec_module(controls)


def probe(app,script):
    ident=uuid.uuid4().hex
    controls.publish('manual-request.json',{'id':ident,'app':app,'script':script})
    deadline=time.monotonic()+38
    while time.monotonic()<deadline:
        try:reply=json.loads(controls.shell('cat '+controls.BASE+'manual-response.json'))
        except json.JSONDecodeError:reply={}
        if reply.get('id')==ident:
            if 'error' in reply:raise RuntimeError(reply['error'])
            return reply['value']
        time.sleep(.2)
    raise TimeoutError('Gaia diagnostic did not answer')


def until(script,app='system',timeout=40):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        value=probe(app,script)
        if value:return value
        time.sleep(1)
    raise TimeoutError('Wi-Fi condition not reached: '+script)


def power(enabled):
    probe('system','await navigator.mozSettings.createLock().set({"wifi.enabled":'+json.dumps(enabled)+'});return true;')
    until('return (await VulpesCompat.call("platform.wifi",{operation:"status"})).enabled === '+json.dumps(enabled)+';')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if controls.shell('getprop ro.product.codename')!='beatles' or controls.shell('getprop init.svc.b2g')!='stopped':
        raise RuntimeError('Requires an active Nokia Vulpes phone trial')
    initial=probe('system','return await VulpesCompat.call("platform.wifi",{operation:"status"});')
    if not initial.get('enabled') or initial.get('state')!='connected':
        raise RuntimeError('Connect a saved Wi-Fi network before qualification')
    report={'device':'beatles','date':time.strftime('%Y-%m-%d'),'initiallyConnected':True}
    try:
        report['networksFound']=probe('system','return (await VulpesCompat.call("platform.wifi",{operation:"scan"})).networks.length;')
        power(False)
        flags=int(controls.shell('cat /sys/class/net/wlan0/flags'),16)
        if flags&1:raise AssertionError('wlan0 remains up')
        report['gaiaSwitchDisablesInterface']=True
        power(True)
        until('return (await VulpesCompat.call("platform.wifi",{operation:"status"})).state === "connected";')
        report['savedNetworkReconnects']=True
        until('return navigator.mozWifiManager.connection.status === "connected";')
        report['gaiaFollowsReconnect']=True
        report['associateSavedNetwork']=probe('system','const m=navigator.mozWifiManager;const rows=await m.getNetworks();const n=rows.find(n=>n.connected && n.known);if(!n)throw Error("No saved association");await m.associate(n);return true;')
        until('return !!(await VulpesCompat.call("platform.wifi",{operation:"status"})).connectionInformation?.ipAddress;')
        report['httpsAfterReconnect']=probe('system','const r=await fetch("https://example.com/?vulpes-wifi-test="+Date.now(),{mode:"no-cors",cache:"no-store",signal:AbortSignal.timeout(15000)});return r.type==="opaque";')
    finally:
        power(True)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
