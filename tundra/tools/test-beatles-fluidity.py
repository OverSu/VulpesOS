#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Repeatable Gaia frame-callback/scroll and system-load measurements on Nokia.

Frame callbacks measure application scheduling, not physical panel refresh.
No calls, messages, connectivity changes or flash operations.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time

spec=importlib.util.spec_from_file_location('wifi_probe',Path(__file__).with_name('test-beatles-wifi.py'))
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
probe=bridge.probe


def counters():
    rows=bridge.controls.shell('cat /proc/stat /proc/vmstat /proc/meminfo /proc/uptime').splitlines()
    result={}
    for row in rows:
        fields=row.split()
        if fields[0]=='cpu':result['cpu']=list(map(int,fields[1:9]))
        elif fields[0] in ('processes','pgmajfault','pswpin','pswpout','MemFree:','Cached:','SwapFree:'):
            result[fields[0].rstrip(':')]=int(fields[1])
    result['uptime']=float(rows[-1].split()[0])
    return result


def delta(a,b):
    cpu=[y-x for x,y in zip(a['cpu'],b['cpu'])];duration=b['uptime']-a['uptime']
    return {'seconds':duration,'cpuBusyPercent':round(100*(1-cpu[3]/sum(cpu)),2),
            'taskCreationsPerSecond':round((b['processes']-a['processes'])/duration,2),
            'majorFaultsPerSecond':round((b['pgmajfault']-a['pgmajfault'])/duration,2),
            'swapInPagesPerSecond':round((b['pswpin']-a['pswpin'])/duration,2),
            'swapFreeKiB':b['SwapFree']}


def measure(app,scroll=False):
    # Find a real scroll container; preserve its position after the benchmark.
    script='''const scroll=SCROLL;
    const candidates=[...document.querySelectorAll('body *')].filter(e=>e.clientHeight>100 && e.scrollHeight>e.clientHeight+40 && ['auto','scroll'].includes(getComputedStyle(e).overflowY) && e.checkVisibility());
    const surface=candidates.sort((a,b)=>b.clientHeight-a.clientHeight)[0];
    if(scroll && !surface)throw Error('No visible scroll surface');
    const old=surface?.scrollTop || 0,available=surface?surface.scrollHeight-surface.clientHeight:0;
    const max=Math.min(available,500);
    return await new Promise(resolve=>{const gaps=[];let previous=performance.now(),start=previous;
      function frame(now){gaps.push(now-previous);previous=now;
        if(scroll)surface.scrollTop=max*(1-Math.cos((now-start)*Math.PI/1500))/2;
        if(now-start<6000)requestAnimationFrame(frame);
        else{if(scroll)surface.scrollTop=old;const sorted=gaps.slice().sort((a,b)=>a-b);
          resolve({frames:gaps.length,seconds:(now-start)/1000,callbackFps:gaps.length*1000/(now-start),
            p50ms:sorted[Math.floor(sorted.length*.5)],p95ms:sorted[Math.floor(sorted.length*.95)],
            stallsOver50ms:gaps.filter(n=>n>50).length,scrollRange:scroll?max:0,
            surface:scroll?(surface.id || surface.tagName):null,availableScrollRange:available});}}
      requestAnimationFrame(frame);
    });'''.replace('SCROLL',json.dumps(scroll))
    a=counters();value=probe(app,script);b=counters()
    return {**value,'system':delta(a,b)}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();report={'device':'beatles','metric':'requestAnimationFrame callbacks, not panel FPS',
        'cpuMetric':'Non-idle CPU time, including I/O wait','measurements':{}}
    try:
        probe('system','dispatchEvent(new CustomEvent("home"));return true;');time.sleep(2)
        report['measurements']['homeIdle']=measure('homescreen')
        report['measurements']['homeScroll']=measure('homescreen',True)
        probe('system','await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
        deadline=time.monotonic()+45
        while True:
            try:
                ready=probe('settings','return document.readyState === "complete" && typeof require === "function" && !!document.querySelector("#root");')
            except RuntimeError as error:
                if 'find(...) is null' not in str(error):raise
                ready=False
            if ready:break
            if time.monotonic()>deadline:raise RuntimeError('Settings did not finish loading')
            time.sleep(1)
        probe('settings','document.querySelector("#wifi-status button[type=reset]")?.click();require(["modules/settings_service"],s=>s.navigate("root"));return true;')
        time.sleep(3)
        report['measurements']['settingsScroll']=measure('settings',True)
    finally:
        args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
