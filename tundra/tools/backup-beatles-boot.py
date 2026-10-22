#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read boot/recovery via the KaiOS debugger. Never writes phone partitions."""
import argparse
import base64
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import subprocess
from kaios_debug import KaiOSDebugger

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path,
                    default=ROOT / 'out/beatles/backups' / date.today().strftime('%Y%m%d'))
folder = parser.parse_args().output
folder.mkdir(parents=True, exist_ok=True)
os.chmod(folder, 0o700)
lines = subprocess.check_output(['adb', 'devices', '-l'], text=True).splitlines()
serials = [line.split()[0] for line in lines
           if len(line.split()) > 2 and line.split()[1] == 'device'
           and 'model:Nokia_2720_Flip' in line.split()]
assert len(serials) == 1
adb = ['adb', '-s', serials[0]]
assert subprocess.check_output(adb + ['shell', 'getprop ro.product.codename'], text=True).strip() == 'beatles'
firmware = subprocess.check_output(adb + ['shell', 'getprop ro.build.version.incremental'], text=True).strip()
if firmware != '40.00.17.01':
    raise RuntimeError('Partition map only qualified for firmware 40.00.17.01')
parts = subprocess.check_output(adb + ['shell', 'cat /proc/partitions'], text=True)
sizes = {r.split()[3]: int(r.split()[2]) * 1024 for r in parts.splitlines() if len(r.split()) == 4 and r.split()[0].isdigit()}
selected = {'boot': 'mmcblk0p27', 'recovery': 'mmcblk0p28', 'aboot': 'mmcblk0p9', 'abootbak': 'mmcblk0p10'}
report = {'device': 'beatles', 'firmware': firmware, 'method': 'read-only XPCOM file stream through enabled debugger',
          'stockFirmwareClaimed': False, 'restorationTested': False, 'partitions': {}}
with KaiOSDebugger(serials[0]) as client:
    console = client.request('root', 'getProcess', id=0)['form']['consoleActor']
    for name, block in selected.items():
        output = folder / (name + '.img')
        if output.exists():
            raise RuntimeError('Backup already exists: ' + str(output))
        target = '/dev/block/bootdevice/by-name/' + name
        resolved = subprocess.check_output(adb + ['shell', 'readlink ' + target], text=True).strip()
        assert resolved == '/dev/block/' + block
        partial = output.with_suffix('.img.partial')
        assert not partial.exists()
        digest = hashlib.sha256()
        count = 0
        setup = '''(function(){var f=Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);f.initWithPath(%s);var s=Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);s.init(f,1,0,0);var b=Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);b.setInputStream(s);window.__vulpesBootBackup=b;return "opened-read-only";})()''' % json.dumps(target)
        assert client.evaluate(console, setup) == 'opened-read-only'
        try:
            with partial.open('xb') as stream:
                os.chmod(partial, 0o600)
                while count < sizes[block]:
                    length = min(131072, sizes[block] - count)
                    encoded = client.evaluate(console, 'btoa(window.__vulpesBootBackup.readBytes(' + str(length) + '))')
                    data = base64.b64decode(encoded, validate=True)
                    assert len(data) == length
                    stream.write(data)
                    digest.update(data)
                    count += length
        finally:
            client.evaluate(console, '(function(){window.__vulpesBootBackup.close();delete window.__vulpesBootBackup;return true;})()')
        assert count == sizes[block]
        partial.rename(output)
        report['partitions'][name] = {'bytes': count, 'sha256': digest.hexdigest(), 'device': target}
        (folder / 'backup.json').write_text(json.dumps(report, indent=2) + '\n')
        print(name, count, digest.hexdigest(), flush=True)
print('Read-only backups complete. Restoration is not yet qualified.')
