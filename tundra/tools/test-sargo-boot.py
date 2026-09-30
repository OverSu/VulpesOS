#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Check or temporarily boot the qualified Sargo USB diagnostic. Never flash."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time
from boot_backup import verify
from tundra import ROOT, digest, now, save
from usb_protocol import exchange, device_layout


def checked_plan():
    path = ROOT/'logs/device/boot-backup-qualification.json'
    validation = json.loads((ROOT/'VALIDATION.json').read_text())
    if validation.get('bootBackup', {}).get('reportSha256') != digest(path):
        raise ValueError('Backup qualification report changed')
    plan = json.loads(path.read_text())
    backup = Path(plan['backupDirectory'])
    verify(backup)
    if digest(backup/'manifest.json') != plan['backupManifestSha256']:
        raise ValueError('Backup manifest changed; requalify')
    image = ROOT/plan['diagnosticImage']
    if digest(image) != plan['diagnosticImageSha256'] or digest(image.parent/'build.json') != plan['diagnosticBuildSha256']:
        raise ValueError('Diagnostic image/build changed; requalify')
    build = json.loads((image.parent/'build.json').read_text())
    if build['sourceSha256'] != digest(ROOT/'boot/usb-init.c') or build['sharedInitSha256'] != digest(ROOT/'boot/init.c'):
        raise ValueError('Diagnostic sources changed; rebuild and requalify')
    if not build['roundtripPassed'] or build.get('rawBootSlot') != 'a' or build['gaiaIncluded']:
        raise ValueError('Expected the roundtrip-checked USB-only slot A diagnostic')
    return plan, image


def fastboot(serial, *args):
    # Whitelist the complete command shape: no flash, erase, slot or unlock path.
    if not (len(args) == 2 and args[0] in ('getvar', 'boot')):
        raise ValueError('Only getvar and temporary boot are implemented')
    return subprocess.run(['fastboot','-s',serial,*args], capture_output=True,
                          text=True, check=True, timeout=45)


def getvar(serial, name):
    result = fastboot(serial, 'getvar', name)
    for line in (result.stdout+'\n'+result.stderr).splitlines():
        match = re.fullmatch(r'(?:\(bootloader\)\s*)?'+re.escape(name)+r':\s*(.+)',line.strip())
        if match:
            return match[1].strip()
    raise RuntimeError('Fastboot did not return '+name)


def check_device(serial, expected_hash):
    if hashlib.sha256(serial.encode()).hexdigest() != expected_hash:
        raise ValueError('Fastboot device differs from the inventoried phone')
    values = {name:getvar(serial,name) for name in ('product','unlocked','current-slot','partition-size:boot_a')}
    if values['product'] != 'sargo' or values['unlocked'] != 'yes' or values['current-slot'] != 'a':
        raise ValueError('Expected unlocked Sargo on slot A; device left untouched')
    if int(values['partition-size:boot_a'],16) != 67108864:
        raise ValueError('Boot partition size differs from inventory')
    return values


def reboot_from_droidian(plan):
    if not sys.stdin.isatty():
        raise RuntimeError('Run in your terminal to enter the phone sudo password')
    spec = importlib.util.spec_from_file_location('collector', ROOT/'tools/collect-device-ssh.py')
    collector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(collector)
    ssh = collector.ssh_base(ROOT/'logs/device/ssh-control', '10.15.19.82', 'droidian')
    serial = subprocess.check_output(ssh+[shlex.join(['getprop','ro.boot.serialno'])],text=True,timeout=10).strip()
    if hashlib.sha256(serial.encode()).hexdigest() != plan['serialSha256']:
        raise ValueError('SSH identity changed; refusing reboot')
    print('Rebooting the inventoried phone into Fastboot. Enter its sudo password if requested.',flush=True)
    result = subprocess.run(ssh[:-1]+['-t',ssh[-1],
        shlex.join(['sudo','/usr/bin/systemctl','reboot','--reboot-argument=bootloader'])])
    # The SSH transport can disappear as shutdown completes. Fastboot must still identify the phone.
    if result.returncode not in (0,255):
        raise RuntimeError('Phone reboot request failed')


def find_fastboot(expected_hash, timeout):
    deadline = time.monotonic()+timeout
    while True:
        output = subprocess.check_output(['fastboot','devices'],text=True,timeout=5)
        for line in output.splitlines():
            fields = line.split()
            if len(fields) >= 2 and fields[1] == 'fastboot' and hashlib.sha256(fields[0].encode()).hexdigest() == expected_hash:
                return fields[0]
        if time.monotonic() >= deadline:
            raise RuntimeError('Inventoried phone not present in Fastboot; no boot command sent')
        time.sleep(1)


def find_diagnostic():
    matches = []
    for p in Path('/sys/bus/usb/devices').iterdir():
        try:
            if [(p/key).read_text().strip() for key in ('idVendor','idProduct','serial')] == ['1d6b','0104','TUNDRA-DIAG']:
                matches.append(Path('/dev/bus/usb')/f'{int((p/"busnum").read_text()):03d}'/f'{int((p/"devnum").read_text()):03d}')
        except (OSError,ValueError):
            continue
    if len(matches) > 1:
        raise RuntimeError('Multiple USB diagnostics present; select a device manually')
    return matches[0] if matches else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--boot',action='store_true',help='Download and boot the diagnostic in RAM')
    mode.add_argument('--collect',action='store_true',help='Resume USB checks on the already running diagnostic; no reboot')
    parser.add_argument('--reboot-from-droidian',action='store_true',help='Request sudo reboot through the existing SSH master')
    args = parser.parse_args()
    if args.reboot_from_droidian and not args.boot:
        parser.error('--reboot-from-droidian requires --boot')
    os.umask(0o077)
    plan,image = checked_plan()
    print('Backup hashes, image and source provenance: OK',flush=True)
    print('This diagnostic has no graphical interface.',flush=True)
    if not args.boot and not args.collect:
        print('Local checks only; no device operation performed.')
        return
    if args.reboot_from_droidian:
        reboot_from_droidian(plan)
    previous = None
    values = None
    if args.collect:
        for candidate in sorted((ROOT/'logs/device').glob('temporary-boot-*.json'),reverse=True):
            old = json.loads(candidate.read_text())
            if (old.get('operation') == 'fastboot boot' and old.get('fastbootOutput')
                    and old.get('imageSha256') == plan['diagnosticImageSha256']
                    and old.get('serialSha256') == plan['serialSha256']):
                previous = {'report':str(candidate.relative_to(ROOT)), 'sha256':digest(candidate)}
                break
        if not previous:
            raise RuntimeError('No previous boot report matches this image and phone')
        if not find_diagnostic():
            raise RuntimeError('Diagnostic USB is no longer present; no reboot requested')
    else:
        serial = find_fastboot(plan['serialSha256'],60 if args.reboot_from_droidian else 0)
        values = check_device(serial,plan['serialSha256'])
        if find_diagnostic():
            raise RuntimeError('A diagnostic is already connected; use --collect to resume its checks')
    report = {'recordedAt':now(),'serialSha256':plan['serialSha256'],
        'imageSha256':digest(image),'bootloader':values,'operation':'usb collect' if args.collect else 'fastboot boot',
        'previousBoot':previous,
        'flashCommandsSent':False,'passed':False,'gaiaIncluded':False}
    path = ROOT/'logs/device'/('temporary-boot-'+now().replace(':','-')+'.json')
    save(path,report)
    try:
        if not args.collect:
            print('Booting diagnostic in RAM; waiting up to 90 seconds for its USB interface.',flush=True)
            result = fastboot(serial,'boot',str(image))
            report['fastbootOutput'] = result.stdout+result.stderr
        deadline = time.monotonic()+90
        device = None
        while time.monotonic() < deadline:
            device = find_diagnostic()
            if device:
                break
            time.sleep(1)
        if not device:
            raise RuntimeError('Diagnostic USB not detected; hardware boot remains unvalidated')
        report['usbDevice'] = str(device)
        report['usbLayout'] = device_layout(device)
        layout = report['usbLayout']
        print(f"USB interface {layout['interface']}: OUT 0x{layout['out']:02x}, IN 0x{layout['in']:02x}",flush=True)
        try:
            report['usb'] = exchange(device,('status','version','mounts','invalid'))
        except PermissionError:
            if not sys.stdin.isatty():
                raise RuntimeError('USB access denied; rerun this script with --collect in your terminal (PC sudo required)')
            print('Linux USB access needs the PC sudo password. Only the diagnostic reader runs as root.',flush=True)
            report['usb'] = json.loads(subprocess.check_output(['sudo',sys.executable,
                str(ROOT/'tools/read-usb.py'),'--device',str(device),'--stdout','--check-invalid'],text=True))
        if report['usb']['status'] != 'TUNDRA_USB_STATUS protocol=1 readOnly=true\nEND\n':
            raise RuntimeError('Unexpected diagnostic status')
        if '4.9-124-google-sargo' not in report['usb']['version'] or report['usb']['invalid'] != 'ERROR unsupported command\nEND\n':
            raise RuntimeError('Unexpected kernel or command handling')
        if any(line.startswith('/dev/') for line in report['usb']['mounts'].splitlines()):
            raise RuntimeError('Unexpected block device mount')
        report['passed'] = True
        print('ARM64 diagnostic and read-only USB protocol validated on Sargo.',flush=True)
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        save(path,report)
        if report['passed']:
            validation = json.loads((ROOT/'VALIDATION.json').read_text())
            validation['phase'] = 'pixel-diagnostic-boot-validated'
            validation['sargoHardwareDiagnostic'] = {
                'report':str(path.relative_to(ROOT)), 'reportSha256':digest(path),
                'imageSha256':report['imageSha256'], 'passed':True,
                'scope':'Temporary ARM64 init and USB on Sargo; no graphical system',
                'gaiaIncluded':False, 'flashReady':False}
            validation['rawSlotADiagnostic']['hardwareTested'] = True
            save(ROOT/'VALIDATION.json',validation)
        print('Report:',path,flush=True)
        if report['passed']:
            print('Return to Fastboot using the phone buttons, then select Start to boot Droidian.',flush=True)
        else:
            print('You can retry --collect without rebooting while the diagnostic remains connected.',flush=True)


if __name__ == '__main__':
    try:
        main()
    except (OSError,ValueError,RuntimeError,subprocess.SubprocessError) as error:
        print('Tundra boot test:',error,file=sys.stderr)
        sys.exit(1)
