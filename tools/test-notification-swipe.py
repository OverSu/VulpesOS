#!/usr/bin/env python3
"""Dismiss a synthetic Gaia notification with touch events in the test profile."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
with Client(2857) as c:
    probe.register(c)
    def ev(code):
        r=probe.evaluate(c,'system',code)
        assert 'value' in r,r
        return r['value']
    for _ in range(80):
        if probe.evaluate(c,'system','return document.body?.getAttribute("ready-state")==="fullyLoaded";').get('value'):break
        time.sleep(.2)
    ev('ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});dispatchEvent(new Event("home"));return true;')
    try:
        ev('NotificationScreen.addNotification({id:"vulpes-swipe-test",title:"Gesture test",body:"Temporary test notification",timestamp:Date.now()});NotificationScreen.closeToast();UtilityTray.show(true);return true;')
        time.sleep(.5)
        point=ev('const e=document.querySelector("#notifications-container [data-notification-id=\\"vulpes-swipe-test\\"]"),r=e.getBoundingClientRect();return {x:r.x+r.width*.2,y:r.y+r.height*.5,toX:r.x+r.width*.92,toY:r.y+r.height*.5};')
        code='''const done=arguments[arguments.length-1];const w=Services.wm.getMostRecentWindow('vulpes:host');w.document.getElementById('system').browsingContext.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Swipe',POINT).then(done,e=>done({error:String(e)}));'''.replace('POINT',json.dumps(point))
        result=c.call('WebDriver:ExecuteAsyncScript',{'script':code,'args':[],'newSandbox':True,'sandbox':'system'})['value']
        assert result is True,result
        time.sleep(1)
        result=ev('return {dismissed:!document.querySelector("#notifications-container [data-notification-id=\\"vulpes-swipe-test\\"]"),rootStable:scrollX===0&&scrollY===0&&visualViewport.offsetLeft===0&&visualViewport.offsetTop===0,lockGesture:getComputedStyle(document.getElementById("lockscreen")).touchAction};')
        assert result['dismissed'] and result['rootStable'],result
        print(json.dumps(result))
    finally:
        ev('NotificationScreen.removeNotification("vulpes-swipe-test");UtilityTray.hide(true);return true;')
