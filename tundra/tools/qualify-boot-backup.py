#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Compare raw boot backups to the installed-kernel diagnostic, without device writes."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
from boot_backup import verify
from tundra import ROOT, checked_source, digest, now, save


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', required=True, type=Path)
    args = parser.parse_args()
    backup = args.backup.resolve()
    verify(backup)
    spec = importlib.util.spec_from_file_location('collector', ROOT/'tools/collect-device-ssh.py')
    collector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(collector)
    ssh = collector.ssh_base(ROOT/'logs/device/ssh-control', '10.15.19.82', 'droidian')
    code = """import json,subprocess
def prop(key): return subprocess.check_output(['getprop',key],text=True).strip()
print(json.dumps({k:prop(k) for k in ('ro.product.device','ro.boot.slot_suffix','ro.boot.serialno')}))
"""
    device = json.loads(subprocess.check_output(ssh+[shlex.join(['python3','-c',code])], timeout=20))
    if device['ro.product.device'] != 'sargo' or device['ro.boot.slot_suffix'] != '_a' or not device['ro.boot.serialno']:
        raise ValueError('Expected the inventoried Sargo running slot A')
    build = json.loads((ROOT/'out/sargo-raw-diagnostic/build.json').read_text())
    if build.get('rawBackupManifestSha256') != digest(backup/'manifest.json'):
        raise ValueError('Diagnostic was not built from this raw backup')
    slots = {}
    with tempfile.TemporaryDirectory() as temp:
        for slot in ('a','b'):
            out = Path(temp)/slot
            result = subprocess.check_output([sys.executable,
                str(checked_source('aosp-mkbootimg')/'unpack_bootimg.py'),
                '--boot_img',str(backup/f'boot_{slot}.img'),'--out',str(out),
                '--format=mkbootimg'], text=True)
            args = shlex.split(result)
            fields = dict(zip(args[::2],args[1::2]))
            slots[slot] = {'kernelSha256':digest(out/'kernel'),
                'ramdiskSha256':digest(out/'ramdisk'),
                'header':{k:v for k,v in fields.items() if k not in ('--kernel','--ramdisk','--dtb','--cmdline')},
                'matchesDiagnosticKernel':digest(out/'kernel') == build['kernelSha256']}
            if slot == 'a':
                for key,value in slots[slot]['header'].items():
                    if build['header'].get(key) != value:
                        raise ValueError('Slot A header differs from the diagnostic: '+key)
                if build['header']['--cmdline'] != fields['--cmdline']+' rdinit=/init tundra.usb=1':
                    raise ValueError('Diagnostic command line differs from the inventoried boot')
    if not slots['a']['matchesDiagnosticKernel']:
        raise ValueError('Slot A kernel differs from the diagnostic')
    image = ROOT/'out/sargo-raw-diagnostic'/build['file']
    if digest(image) != build['imageSha256']:
        raise ValueError('Diagnostic image changed')
    report = {'recordedAt':now(),'device':'sargo','activeSlot':'a',
        'serialSha256':hashlib.sha256(device['ro.boot.serialno'].encode()).hexdigest(),
        'backupDirectory':str(backup),'backupManifestSha256':digest(backup/'manifest.json'),
        'slots':slots,'diagnosticImage':str(image.relative_to(ROOT)),
        'diagnosticImageSha256':digest(image),'diagnosticBuildSha256':digest(image.parent/'build.json'),
        'rawBackupVerified':True,'restorationTested':False,'hardwareBootTested':False,
        'flashReady':False}
    path = ROOT/'logs/device/boot-backup-qualification.json'
    save(path,report)
    validation = json.loads((ROOT/'VALIDATION.json').read_text())
    validation['deviceInventory']['rawPartitionsBackedUp'] = True
    validation['bootBackup'] = {'report':str(path.relative_to(ROOT)),
        'reportSha256':digest(path),'verified':True,'restorationTested':False}
    save(ROOT/'VALIDATION.json',validation)
    print('Six partitions verified; slot A kernel and header match the diagnostic.')
    print('Slot B has different contents and is not a qualified fallback.')
    print(path)


if __name__ == '__main__':
    main()
