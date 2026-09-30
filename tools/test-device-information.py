#!/usr/bin/env python3
"""Check the shared Information panel in a real Gecko test host."""
import importlib.util
import json
from pathlib import Path
import time
from marionette_client import Client
from project import ROOT, release_info

spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('probe-desktop.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
release = release_info()

with Client(2857) as client:
    probe.register(client)
    def evaluate(app, code):
        response = probe.evaluate(client, app, code)
        if 'error' in response:
            raise AssertionError(response)
        return response.get('value')
    def wait(app, code):
        for _ in range(100):
            value = evaluate(app, code)
            if value:
                return value
            time.sleep(.15)
        raise TimeoutError(code)
    wait('system', 'return !!window.VulpesCompat;')
    evaluate('system', 'await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;')
    wait('settings', 'return document.readyState === "complete";')
    evaluate('settings', """document.querySelector('#root a[href="#about"]').click();return true;""")
    wait('settings', 'return !!document.querySelector("#about.current #vulpes-system-info");')
    rows = evaluate('settings', 'return Object.fromEntries(Array.from(document.querySelectorAll("#vulpes-system-info > li"),li=>[li.dataset.component, {label:li.querySelector("span").textContent,value:li.querySelector("small").textContent}]));')
    assert rows['vulpes']['value'] == release['version'], rows
    assert rows['gaia']['value'] == release['gaia'], rows
    assert rows['gecko']['value'] == client.execute('return Services.appinfo.platformVersion;'), rows
    assert rows['adapter']['value'] == release['adapters']['desktop']+'-desktop', rows
    assert 'tundra' not in rows, rows
    assert rows['model']['label'] == 'Modèle', rows
    assert evaluate('settings', """return ['deviceinfo.product_model','deviceinfo.software'].every(key=>getComputedStyle(document.querySelector('#about [data-name="'+key+'"]').closest('li')).display==='none');""")
    evaluate('settings', 'document.documentElement.lang="en-US";return true;')
    wait('settings', 'return document.querySelector("[data-component=model] span").textContent==="Model";')
    assert evaluate('settings', 'return document.querySelector("[data-component=adapter] span").textContent;') == 'Vulpes adapter'
    evaluate('settings', 'document.documentElement.lang="fr";return true;')
    wait('settings', 'return document.querySelector("[data-component=model] span").textContent==="Modèle";')
    report = {'passed':True,'rows':rows,'localization':['fr','en-US'],'duplicateLegacyRowsHidden':True}
    (ROOT/'logs/device-information-test.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(report,indent=2,ensure_ascii=False))
