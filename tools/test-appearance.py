#!/usr/bin/env python3
"""Check shared appearance changes in an isolated desktop Gaia profile."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client

spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('probe-desktop.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
checks = []
with Client(2857) as client:
    probe.register(client)
    def ev(app, code):
        result = probe.evaluate(client, app, code)
        assert 'error' not in result, result
        return result.get('value')
    def wait(app, code):
        for _ in range(80):
            result = ev(app, code)
            if result:
                return result
            time.sleep(.15)
        raise AssertionError((app, code))
    def check(name, result):
        assert result, name
        checks.append(name)
        print(name + ': OK', flush=True)
    def theme(mode):
        ev('settings', f'await navigator.mozSettings.createLock().set({{"vulpes.theme":{json.dumps(mode)}}});return true;')
    ev('system', 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
    ev('system', 'await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
    wait('settings', 'return document.readyState==="complete";')
    previous = ev('settings', 'return await VulpesCompat.call("appearance.current",{});')
    try:
        ev('settings', 'const s=await new Promise(r=>require(["modules/settings_service"],r));s.navigate("display");return true;')
        wait('settings', 'return !!document.querySelector("#vulpes-theme");')
        theme('light')
        wait('homescreen', 'return document.documentElement.dataset.vulpesTheme==="light";')
        home = ev('homescreen', 'return [getComputedStyle(document.documentElement).backgroundColor,getComputedStyle(document.body).backgroundColor,getComputedStyle(document.body).backgroundImage];')
        # Exercise the actual Settings selector rather than only the broker.
        ev('settings', 'const s=document.getElementById("vulpes-theme");s.value="dark";s.dispatchEvent(new Event("change",{bubbles:true}));return true;')
        for app in ['settings', 'homescreen', 'system']:
            check('dark-live-' + app, wait(app, 'return document.documentElement.dataset.vulpesTheme==="dark";'))
        check('home-background-preserved', ev('homescreen', 'return [getComputedStyle(document.documentElement).backgroundColor,getComputedStyle(document.body).backgroundColor,getComputedStyle(document.body).backgroundImage];') == home)
        check('readable-display-header', ev('settings', 'const h=document.querySelector("#display gaia-header");return getComputedStyle(h.shadowRoot.querySelector(".inner")).backgroundColor==="rgb(37, 52, 66)" && getComputedStyle(h.querySelector("h1")).color==="rgb(241, 245, 249)";'))
        check('selector-label-does-not-overlap', ev('settings', 'const label=document.querySelector("#vulpes-theme-label"),l=label.getBoundingClientRect(),s=document.querySelector("#vulpes-theme").getBoundingClientRect();return parseFloat(getComputedStyle(label).height)>0 && l.bottom<=s.top && s.bottom<=document.querySelector("#vulpes-theme-row").getBoundingClientRect().bottom;'))
        ev('system', 'await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
        wait('sms', 'return document.readyState==="complete";')
        old_time = ev('sms', 'setTimeout(()=>location.reload(),50);return performance.timeOrigin;')
        check('reloaded-app-reads-saved-theme', wait('sms', f'return performance.timeOrigin!=={old_time} && document.documentElement.dataset.vulpesTheme==="dark";'))
        theme('system')
        check('system-preference', wait('sms', 'return document.documentElement.dataset.vulpesTheme===(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");'))
        theme('light')
        check('return-to-light', wait('sms', 'return document.documentElement.dataset.vulpesTheme==="light";'))
    finally:
        theme(previous or 'light')
print(json.dumps({'checks':checks}, ensure_ascii=False, indent=2))
