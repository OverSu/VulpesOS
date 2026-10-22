#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Check Settings keypad navigation and Gaia switch activation on a Nokia trial.

Temporarily toggles geolocation and restores its setting. Does not toggle
flight mode, send messages, make calls or flash the phone.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time

spec=importlib.util.spec_from_file_location('wifi_probe',Path(__file__).with_name('test-beatles-wifi.py'))
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
probe=bridge.probe


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if bridge.controls.shell('getprop ro.product.codename')!='beatles' or bridge.controls.shell('getprop init.svc.b2g')!='stopped':
        raise RuntimeError('Requires an active Nokia Vulpes phone trial')
    probe('system','await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
    deadline=time.monotonic()+45
    while True:
        try:ready=probe('settings','return document.readyState === "complete" && typeof require === "function";')
        except RuntimeError as error:
            if 'find(...) is null' not in str(error):raise
            ready=False
        if ready:break
        if time.monotonic()>deadline:raise TimeoutError('Settings startup')
        time.sleep(1)
    probe('settings','require(["modules/settings_service"],s=>s.navigate("root"));return true;')
    time.sleep(2)
    initial=probe('settings','return {geo:document.querySelector("gaia-switch[name=\\"geolocation.enabled\\"]").checked,plane:document.querySelector(".airplaneMode-input").checked};')
    report={'device':'beatles','path':[]}
    focus='''const e=document.activeElement;const r=e.getBoundingClientRect();return {
      id:e.querySelector('label')?.id || e.id,top:r.top,bottom:r.bottom,
      visible:r.top>=0 && r.bottom<=innerHeight};'''
    def move(key,expected):
        bridge.controls.inject(key)
        result=bridge.until('const id=document.activeElement.querySelector("label")?.id || document.activeElement.id;return id === '+json.dumps(expected)+';',app='settings',timeout=6)
        state=probe('settings',focus)
        if not state['visible']:raise AssertionError(state)
        report['path'].append({'key':key,**state})
    def geo(expected):
        value=json.dumps(expected)
        return bridge.until('return document.querySelector("gaia-switch[name=\\"geolocation.enabled\\"]").checked === '+value+' && (await navigator.mozSettings.createLock().get("geolocation.enabled"))["geolocation.enabled"] === '+value+';',app='settings',timeout=10)
    try:
        probe('settings','document.getElementById("menuItem-wifi").focus();return true;')
        move('ArrowUp','menuItem-gps')
        move('ArrowUp','menuItem-airplaneMode')
        move('ArrowDown','menuItem-gps')
        bridge.controls.inject('Enter');geo(not initial['geo'])
        bridge.controls.inject('Enter');geo(initial['geo'])
        report['okTogglesAndRestoresGeolocation']=True
        move('ArrowDown','menuItem-wifi')
        report['airplaneUnchanged']=probe('settings','return document.querySelector(".airplaneMode-input").checked === '+json.dumps(initial['plane'])+';')
        assert report['airplaneUnchanged']
    finally:
        probe('settings','await navigator.mozSettings.createLock().set({"geolocation.enabled":'+json.dumps(initial['geo'])+'});return true;')
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
