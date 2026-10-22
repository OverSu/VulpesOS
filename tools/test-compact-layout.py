#!/usr/bin/env python3
"""Exercise the shared layout selector and Gaia grid in an isolated host profile."""
import base64
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
    profile = client.execute('return PathUtils.profileDir;')
    assert Path(profile).name.startswith(('host-', 'pc-keypad-')), 'Test profile required'
    client.execute("try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}")
    def ev(app, code):
        result = probe.evaluate(client, app, code)
        assert 'error' not in result, result
        return result.get('value')
    def wait(app, code):
        for _ in range(100):
            value = ev(app, code)
            if value: return value
            time.sleep(.1)
        raise AssertionError((app, code))
    def check(name, result):
        assert result, name
        checks.append(name)
        print(name + ': OK', flush=True)
    def reload_home():
        before = ev('homescreen', 'setTimeout(()=>location.reload(),50);return performance.timeOrigin;')
        wait('homescreen', f'return performance.timeOrigin!=={before} && !!window.appWindow?.apps && !!document.documentElement.dataset.vulpesLayout;')
    previous = ev('homescreen', 'return await VulpesCompat.call("layout.current",{});')
    env = client.execute("return Services.env.get('VULPES_KEYPAD');")
    try:
        ev('system', 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
        wait('settings', 'return typeof require==="function";')
        ev('settings', 'const s=await new Promise(r=>require(["modules/settings_service"],r));await s.navigate("display");return true;')
        wait('settings', 'return !!document.getElementById("vulpes-layout");')
        def choose(mode):
            ev('settings', f'const s=document.getElementById("vulpes-layout");s.value={json.dumps(mode)};s.dispatchEvent(new Event("change",{{bubbles:true}}));return true;')
            wait('settings', f'return !document.getElementById("vulpes-layout").disabled && (await VulpesCompat.call("layout.current",{{}})).mode==={json.dumps(mode)};')
        choose('compact')
        check('selector-applies-to-home-live', wait('homescreen', 'return document.documentElement.dataset.vulpesLayout==="compact";'))
        check('selector-applies-to-system-live', wait('system', 'return document.documentElement.dataset.vulpesLayout==="compact";'))
        ev('system', 'window.dispatchEvent(new CustomEvent("home"));return true;')
        geometry = wait('homescreen', '''const icons=[...document.querySelectorAll('gaia-app-icon')].slice(0,9);
if(icons.length!==9)return false;
const rects=icons.map(e=>e.getBoundingClientRect());
if(rects[0].top!==rects[2].top || rects[3].top<=rects[0].bottom)return false;
return rects.map(r=>r.toJSON());''')
        check('three-columns-without-overlapping-rows', bool(geometry))
        check('single-panel-no-indicators', ev('homescreen', 'return ["pages-panel","page-indicator-header"].every(id=>getComputedStyle(document.getElementById(id)).display==="none") && document.getElementById("panels").scrollWidth===document.getElementById("panels").clientWidth;'))
        check('home-search-hidden', ev('system', 'return getComputedStyle(document.querySelector("#homescreen > .chrome")).display==="none";'))
        check('home-reclaims-search-space', ev('homescreen', 'return innerHeight>280;'))
        check('motion-policy-follows-device-not-layout', ev('system', 'return document.documentElement.dataset.vulpesMotion === ((await VulpesCompat.call("layout.current",{})).reducedMotion ? "reduced" : "standard");'))
        check('icons-48-css-pixels', ev('homescreen', 'return [...document.querySelectorAll("gaia-app-icon")].slice(0,9).every(e=>e._container.querySelector("img")?.getBoundingClientRect().width===48);'))
        check('compact-labels-outside-icon-frame', ev('homescreen', 'return [...document.querySelectorAll("gaia-app-icon")].slice(0,9).every(e=>e.getBoundingClientRect().height===52 && getComputedStyle(e.shadowRoot.getElementById("title-container")).clipPath!=="none");'))
        ev('homescreen', 'const icon=[...document.querySelectorAll("gaia-app-icon")].find(e=>e.dataset.identifier.includes("settings.localhost"));icon.setAttribute("tabindex","-1");icon.focus();icon.setAttribute("data-vulpes-keypad-focus", "");return true;')
        check('settings-name-in-heading', wait('homescreen', 'return document.getElementById("vulpes-compact-app-name").textContent==="Paramètres";'))
        check('heading-fits-settings-name', ev('homescreen', 'const h=document.getElementById("vulpes-compact-app-name");return h.scrollWidth===h.clientWidth && h.scrollHeight===h.clientHeight && parseFloat(getComputedStyle(h).fontSize)===20;'))
        choose('standard')
        check('user-can-disable-compact', wait('homescreen', 'return document.documentElement.dataset.vulpesLayout==="standard";'))
        check('classic-search-restored', wait('system', 'return getComputedStyle(document.querySelector("#homescreen > .chrome")).display!=="none";'))
        check('classic-second-panel-restored', ev('homescreen', 'return getComputedStyle(document.getElementById("pages-panel")).display!=="none";'))
        check('classic-labels-restored-heading-hidden', ev('homescreen', 'return getComputedStyle(document.getElementById("vulpes-compact-app-name")).display==="none" && getComputedStyle(document.querySelector("gaia-app-icon").shadowRoot.getElementById("title-container")).clipPath==="none";'))
        choose('compact');reload_home()
        check('saved-choice-survives-reload', ev('homescreen', 'return document.documentElement.dataset.vulpesLayout==="compact";'))
        client.execute("Services.env.set('VULPES_KEYPAD','');")
        choose('auto');reload_home()
        check('automatic-touch-device-is-standard', ev('homescreen', 'return document.documentElement.dataset.vulpesLayout==="standard";'))
        choose('compact')
        check('touch-device-can-opt-in', wait('homescreen', 'return document.documentElement.dataset.vulpesLayout==="compact";'))
        client.execute("Services.env.set('VULPES_KEYPAD','1');")
        choose('auto');reload_home()
        check('automatic-keypad-device-is-compact', ev('homescreen', 'return document.documentElement.dataset.vulpesLayout==="compact";'))
        ev('system', 'window.dispatchEvent(new CustomEvent("home"));return true;')
        wait('homescreen', 'return [...document.querySelectorAll("gaia-app-icon")].filter(e=>e._container?.querySelector("img")?.naturalWidth>0).length>=9 && getComputedStyle(document.querySelector("#apps")).visibility==="visible";')
        ev('homescreen', 'const icon=[...document.querySelectorAll("gaia-app-icon")].find(e=>e.dataset.identifier.includes("settings.localhost"));icon.setAttribute("tabindex","-1");icon.focus();icon.setAttribute("data-vulpes-keypad-focus", "");return true;')
        wait('homescreen', 'return document.getElementById("vulpes-compact-app-name").textContent==="Paramètres";')
        time.sleep(.5)
        for handle in client.call('WebDriver:GetWindowHandles'):
            client.call('WebDriver:SwitchToWindow', {'handle':handle})
            if client.execute('return window.location.href;') == 'chrome://vulpes/content/shell.xhtml': break
        Path('logs/compact-layout.png').write_bytes(base64.b64decode(client.call('WebDriver:TakeScreenshot', {'full':False})['value']))
        Path('logs/compact-layout.json').write_text(json.dumps({'checks':checks,'geometry':geometry}, indent=2))
    finally:
        client.execute('Services.env.set("VULPES_KEYPAD",'+json.dumps(env)+');')
        ev('settings', 'await navigator.mozSettings.createLock().set({"vulpes.layout":'+json.dumps(previous['mode'])+'});return true;')
print(json.dumps({'checks':checks}, indent=2))
