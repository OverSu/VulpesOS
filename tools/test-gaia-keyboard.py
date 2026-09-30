#!/usr/bin/env python3
"""Exercise Gaia's keyboard in an isolated desktop profile. Never send a message."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time

from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('probe', ROOT / 'tools/probe-desktop.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--touch-events', action='store_true')
parser.add_argument('--dpr', type=int, choices=(1, 3), default=1)
parser.add_argument('--rotation', action='store_true')
args = parser.parse_args()
if args.dpr != 1 and not args.touch_events:
    parser.error('--dpr 3 requires --touch-events')

with Client(2857) as client:
    probe.register(client)

    def evaluate(app, code):
        result = probe.evaluate(client, app, code)
        if 'value' not in result:
            raise RuntimeError(result)
        return result['value']

    def wait(app, code):
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            result=probe.evaluate(client, app, code)
            if result.get('value'):
                return
            if 'error' in result:
                raise RuntimeError(result['error'])
            time.sleep(.15)
        raise TimeoutError(code)

    def tap(app, selector):
        if app == 'keyboard':
            selector = '.keyboard-type-container[data-active] ' + selector
        rect = evaluate(app, 'return document.querySelector(' + json.dumps(selector) + ').getBoundingClientRect().toJSON();')
        point = {'x': rect['x'] + rect['width'] / 2, 'y': rect['y'] + rect['height'] / 2}
        if args.touch_events:
            script = '''const done=arguments[arguments.length-1];
const w=Services.wm.getMostRecentWindow('vulpes:host');
function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;
for(const c of b.children){const f=find(c);if(f)return f;}}
find(w.document.getElementById('system').browsingContext).currentWindowGlobal
.getActor('VulpesProbe').sendQuery('Tap',POINT).then(done,e=>done({error:String(e)}));'''
            script = script.replace('PREFIX', json.dumps('http://' + app + '.localhost:8765/')).replace('POINT', json.dumps(point))
            result = client.call('WebDriver:ExecuteAsyncScript', {
                'script': script, 'args': [], 'newSandbox': True, 'sandbox': 'system',
            })['value']
            assert result is True, result
        else:
            frame_selector = '#vulpes-gaia-keyboard' if app == 'keyboard' else 'iframe[src^="http://' + app + '.localhost:8765/"]'
            frame = evaluate('system', 'return document.querySelector(' + json.dumps(frame_selector) + ').getBoundingClientRect().toJSON();')
            subprocess.run(['xdotool', 'search', '--name', '^Vulpes', 'windowraise',
                            'windowfocus', 'mousemove', '--window', '%1',
                            str(round(frame['x'] + point['x'])), str(round(frame['y'] + point['y'])),
                            'click', '1'], env=os.environ, check=True)
        time.sleep(.35)

    def size(width, height):
        client.execute(f"const w=Services.wm.getMostRecentWindow('vulpes:host');w.document.documentElement.style.minWidth='0';w.document.documentElement.style.minHeight='0';w.resizeTo({width},{height});return true;")
        time.sleep(.6)

    wait('system', 'return document.body?.getAttribute("ready-state")==="fullyLoaded";')
    client.execute(f"Services.prefs.setCharPref('layout.css.devPixelsPerPx','{args.dpr}');return true;")
    size(360, 740)
    evaluate('system', 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;')
    time.sleep(1)
    evaluate('system', 'await VulpesCompat.call("apps.launch",{manifestURL:"http://sms.localhost:8765/manifest.webapp"});return true;')
    wait('sms', 'return !!window.Navigation;')
    evaluate('sms', 'await Navigation.toPanel("thread-list");await Navigation.toPanel("composer");return true;')
    tap('sms', '.recipient[contenteditable]')
    wait('keyboard', 'return navigator.mozInputMethod?.inputcontext?.inputType==="tel" && !!document.querySelector("button[aria-label=\\"2\\"]");')
    tap('keyboard', 'button[aria-label="2"]')
    tap('keyboard', 'button[aria-label="3"]')
    number = evaluate('sms', 'return document.querySelector(".recipient[contenteditable]").textContent;')
    assert number.strip() == '23', number
    numeric_height = evaluate('keyboard', 'return document.querySelector("button[aria-label=\\"2\\"]").getBoundingClientRect().height;')
    assert numeric_height >= 44, numeric_height
    tap('sms', '#messages-input')
    wait('keyboard', 'return navigator.mozInputMethod?.inputcontext?.inputType==="text" && !!document.querySelector("button[aria-label=\\"a\\"]");')
    tap('keyboard', 'button[aria-label="a"]')
    text = evaluate('sms', 'return document.querySelector("#messages-input").textContent;')
    assert text.lower() == 'a', text
    assert evaluate('sms', 'return document.querySelector(".recipient[contenteditable]").textContent;') == number, 'Letter changed the recipient'
    evaluate('sms', 'getSelection().setPosition(document.querySelector("#messages-input").firstChild,0);return true;')
    tap('keyboard', 'button[aria-label="b"]')
    assert evaluate('sms', 'return document.querySelector("#messages-input").textContent.toLowerCase();') == 'ba'
    tap('keyboard', 'button[data-keycode="8"]')
    assert evaluate('sms', 'return document.querySelector("#messages-input").textContent.toLowerCase();') == 'a'
    report = {'passed': True, 'sent': False, 'dpr': args.dpr,
              'recipientUnchanged': True, 'messageTyped': True, 'caretAndBackspace': True,
              'numericKeyHeight': numeric_height}
    if args.rotation:
        size(740, 360)
        wait('keyboard', 'return !app.viewManager.screenInPortraitMode();')
        report['landscape'] = evaluate('keyboard', 'return {width:innerWidth,height:innerHeight,rem:app.viewManager.getRemToPx(),font:parseFloat(getComputedStyle(document.documentElement).fontSize)};')
        assert abs(report['landscape']['font'] - report['landscape']['width'] / 64) < .05
        size(360, 740)
        wait('keyboard', 'return app.viewManager.screenInPortraitMode();')
    report['portrait'] = evaluate('keyboard', 'return {height:innerHeight,key:document.querySelector("button[aria-label=\\"a\\"]").getBoundingClientRect().height,font:parseFloat(getComputedStyle(document.documentElement).fontSize)};')
    assert report['portrait']['key'] >= 44, report
    print(json.dumps(report))
