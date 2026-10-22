#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Check core Gaia panels at Nokia size without calling, sending or saving data.

These are programmatic UI checks, not a physical keypad qualification.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time

spec=importlib.util.spec_from_file_location('wifi',Path(__file__).with_name('test-beatles-wifi.py'))
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
probe=bridge.probe

def wait(app,script,seconds=40):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        try:value=probe(app,script)
        except RuntimeError as error:
            if 'find(...) is null' not in str(error):raise
            value=None
        if value:return value
        time.sleep(.3)
    raise AssertionError((app,script))

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if bridge.controls.shell('getprop ro.product.codename')!='beatles' or bridge.controls.shell('getprop init.svc.b2g')!='stopped':
        raise RuntimeError('Requires an active Nokia phone trial')
    report={'device':'beatles','input':'programmatic DOM; no physical keys','checks':{}}
    cases=[('contacts','communications','contacts','#add-contact-button','/contacts/'),
           ('dialer','communications','dialer','#keypad-callbar-call-action','/dialer/'),
           ('sms','sms',None,'#threads-composer-link','/'),
           ('settings','settings',None,'#menuItem-wifi','/')]
    try:
        for label,app,entry,selector,path in cases:
            params={'manifestURL':'http://'+app+'.localhost:8765/manifest.webapp'}
            if entry:params['entryPoint']=entry
            probe('system','await VulpesCompat.call("apps.launch",'+json.dumps(params)+');return true;')
            wait(app,'return location.pathname.startsWith('+json.dumps(path)+') && document.readyState === "complete" && !!document.querySelector('+json.dumps(selector)+');')
            time.sleep(1)
            report['checks'][label]=probe(app,'''const e=document.querySelector(SELECTOR),r=e.getBoundingClientRect();return {
              ready:true,width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
              overflowX:getComputedStyle(document.documentElement).overflowX,scrollX,
              control:{x:r.x,y:r.y,width:r.width,height:r.height,visible:e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})}};'''.replace('SELECTOR',json.dumps(selector)))
            if label=='contacts':
                probe(app,'document.querySelector("#add-contact-button").click();return true;')
                wait(app,'return document.querySelector("#givenName")?.getBoundingClientRect().height>0;')
                report['checks'][label]['newContactForm']=True
            if label=='sms':
                probe(app,'document.querySelector("#threads-composer-link").click();return true;')
                wait(app,'return document.querySelector("#messages-recipients-list [contenteditable]")?.getBoundingClientRect().height>0;')
                report['checks'][label]['recipientComposer']=True
            # Close only the app just launched, discarding empty unsaved forms.
            probe('system','const a=Service.query("getActiveApp");if(a?.manifestURL!=='+json.dumps(params['manifestURL'])+')throw Error("Unexpected active app");a.kill();return true;')
            time.sleep(.5)
        for value in report['checks'].values():
            assert value['width']==240 and value['scrollX']==0,value
            # Gaia Settings keeps inactive panels offscreen behind an overflow clip.
            assert value['documentWidth']<=242 or value['overflowX'] in ('hidden','clip'),value
            control=value['control']
            assert control['width']>0 and control['visible'],value
            assert control['x']>=-1 and control['x']+control['width']<=241,value
        print(json.dumps(report,indent=2))
    finally:
        probe('system','dispatchEvent(new CustomEvent("home"));return true;')
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
