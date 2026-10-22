#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Check browser address entry with the Nokia keypad in a manual Gaia session.

Uses a local HTTP response and a reserved .invalid hostname, without relying
on Internet access. Does not send messages, call, reboot or flash the phone.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('controls', Path(__file__).with_name('test-beatles-controls.py'))
controls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(controls)
probe, inject = controls.probe, controls.inject


def until(script, timeout=15):
    deadline = time.monotonic()+timeout
    while time.monotonic() < deadline:
        result = probe(script)
        if result:
            return result
        time.sleep(.2)
    raise TimeoutError(script)


def address():
    # Up scrolls a long page first; once at the top it returns to the toolbar.
    for _ in range(8):
        if probe('return document.activeElement.classList.contains("urlbar");'):
            break
        inject('ArrowUp')
        time.sleep(.35)
    until('return document.activeElement.classList.contains("urlbar");')
    inject('Enter')
    until('return document.activeElement.id === "rocketbar-input";')


def navigate(url):
    probe('const e=document.querySelector("#rocketbar-input");e.value='+json.dumps(url)+';e.dispatchEvent(new Event("input",{bubbles:true}));return true;')
    inject('Enter')
    until('return !document.querySelector("#rocketbar").classList.contains("active") && [...document.querySelectorAll("iframe")].some(f=>f.dataset.url==='+json.dumps(url)+');')
    time.sleep(3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = {'device':'beatles','internetAccessRequired':False}
    try:
        probe('await VulpesCompat.call("apps.launch",{manifestURL:"http://search.localhost:8765/manifest.webapp"});return true;')
        until('return [...document.querySelectorAll(".urlbar")].some(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) && e.getBoundingClientRect().width>0);')
        address()
        report['addressFocusFromWelcome'] = True
        probe('const e=document.querySelector("#rocketbar-input");e.value="";e.dispatchEvent(new Event("input",{bubbles:true}));return true;')
        inject('2')
        until('return document.querySelector("#rocketbar-input").value === "a";')
        report['multitapInput'] = True
        inject('Escape')
        until('return !document.querySelector("#rocketbar").classList.contains("active");')
        report['cancelAddress'] = True
        address()
        # The Gaia server returns an HTTP 421 document for an unregistered host.
        # This exercises the top-level web view without a network dependency.
        navigate('http://127.0.0.1:8765/')
        address()
        report['addressFocusFromWebView'] = True
        inject('Escape')
        until('return !document.querySelector("#rocketbar").classList.contains("active");')
        inject('ArrowUp')
        until('return document.activeElement.classList.contains("urlbar");')
        inject('ArrowDown')
        until('return document.activeElement.localName === "iframe";')
        report['toolbarToPage'] = True
        address()
        navigate('https://vulpes-keypad-test.invalid/')
        address()
        report['addressFocusFromNetworkError'] = True
        # Leave the real welcome page open for the user.
        navigate('http://search.localhost:8765/home/index.html')
        address()
        probe('const e=document.querySelector("#rocketbar-input");e.select();return true;')
        report['readyForManualAddressEntry'] = True
    finally:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    main()
