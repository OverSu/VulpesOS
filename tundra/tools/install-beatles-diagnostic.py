#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Package the Nokia display diagnostic; --install sideloads only this app."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time
import zipfile
from kaios_debug import KaiOSDebugger

ROOT = Path(__file__).resolve().parents[1]
APP_ID = 'vulpes-diagnostic-beatles'
MANIFEST = 'app://' + APP_ID + '/manifest.webapp'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--install', action='store_true')
parser.add_argument('--replace', action='store_true', help='Update only the existing Vulpes Diagnostic app')
args = parser.parse_args()
folder = ROOT / 'out/beatles/display-diagnostic'
folder.mkdir(parents=True, exist_ok=True)
archive = folder / 'application.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted((ROOT / 'devices/beatles/diagnostic-app').iterdir()):
        if p.is_file():
            z.writestr(zipfile.ZipInfo(p.name, (2026, 10, 17, 0, 0, 0)), p.read_bytes(),
                       compress_type=zipfile.ZIP_DEFLATED)
print('Diagnostic package:', archive)
if not args.install:
    raise SystemExit(0)
lines = subprocess.check_output(['adb', 'devices', '-l'], text=True).splitlines()
phones = []
for line in lines:
    fields = line.split()
    if len(fields) > 2 and fields[1] == 'device' and 'model:Nokia_2720_Flip' in fields:
        serial = fields[0]
        codename = subprocess.check_output(['adb', '-s', serial, 'shell',
                                           'getprop ro.product.codename'], text=True).strip()
        if codename == 'beatles':
            phones.append(serial)
if len(phones) != 1:
    raise SystemExit('Connect exactly one Nokia 2720 Flip (beatles) with ADB enabled.')
report = {'device': 'beatles', 'manifestURL': MANIFEST,
          'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
          'usesExistingKaiOSGecko': True, 'newGeckoPorted': False, 'flashPerformed': False}
try:
    with KaiOSDebugger(phones[0]) as client:
        actor = client.root['webappsActor']
        existing = client.request(actor, 'getAll')['apps']
        previous = next((a for a in existing if a.get('manifestURL') == MANIFEST), None)
        if previous:
            if not args.replace:
                raise RuntimeError('Diagnostic app already exists; use --replace to update it.')
            if previous.get('manifest', {}).get('name') != 'Vulpes Diagnostic':
                raise RuntimeError('Unexpected application using the diagnostic identifier')
            client.request(actor, 'close', manifestURL=MANIFEST)
        upload = client.request(actor, 'uploadPackage', bulk=False)['actor']
        data = archive.read_bytes()
        for offset in range(0, len(data), 16384):
            chunk = data[offset:offset + 16384]
            response = client.request(upload, 'chunk', chunk=chunk.decode('latin1'))
            assert response['written'] == len(chunk)
        client.request(upload, 'done')
        report['install'] = client.request(actor, 'install', appId=APP_ID, upload=upload)
        (folder / 'install-report.json').write_text(json.dumps(report, indent=2) + '\n')
        report['launch'] = client.request(actor, 'launch', manifestURL=MANIFEST)
        time.sleep(1)
        app = client.request(actor, 'getAppActor', manifestURL=MANIFEST)['actor']
        report['page'] = json.loads(client.evaluate(app['consoleActor'],
            'JSON.stringify({title:document.title,ready:document.readyState,'
            'width:innerWidth,height:innerHeight,body:document.body.innerText,'
            'userAgent:navigator.userAgent})'))
        assert report['page']['title'] == 'Vulpes — Diagnostic Nokia'
        print(json.dumps(report['page'], ensure_ascii=False, indent=2))
finally:
    (folder / 'install-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
