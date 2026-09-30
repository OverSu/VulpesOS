#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read hardware service topology without SIM identifiers, messages or network secrets."""
import json
import subprocess
import time
from pathlib import Path


def main():
    commands={
        'services':['systemctl','is-active','NetworkManager','ModemManager','ofono','phosh'],
        'networkDevices':['nmcli','-t','-f','DEVICE,TYPE,STATE','device','status'],
        'modemObjects':['busctl','--system','tree','org.freedesktop.ModemManager1'],
        'ofonoObjects':['busctl','--system','tree','org.ofono'],
        'audioPackages':['dpkg-query','-W','-f=${binary:Package}\t${Version}\n','pulseaudio','pulseaudio-modules-droid-hidl','callaudiod','ofono-binder-plugin','modemmanager','droidian-camera'],
    }
    report={'recordedAtUnix':time.time(),'scope':'Read-only service topology; no SIM identifiers, message content or saved connection profiles','commands':{}}
    for name,command in commands.items():
        try:
            p=subprocess.run(command,capture_output=True,text=True,timeout=15)
            report['commands'][name]={'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
        except (OSError,subprocess.TimeoutExpired) as error:
            report['commands'][name]={'error':str(error)}
    report['cameraNodes']=[p.name for p in Path('/dev').glob('video*')]
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
