#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Run inside a native RAM boot; accept a temporary Wi-Fi profile on stdin.

The credential stays in /run, is removed after activation, and is never included
in the JSON report. This qualifies the system path, not Gaia connection controls.
"""
import json
import ipaddress
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import uuid


def nm(*args, timeout=45):
    return subprocess.run(['nmcli', '--wait', '35', *args], capture_output=True,
                          text=True, timeout=timeout, env={**os.environ, 'LC_ALL':'C'})


def main():
    if os.getuid() or 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():
        raise RuntimeError('Run as root inside the temporary native system')
    profile = json.loads(sys.stdin.read(16384))
    ssid = profile['ssid']
    if not isinstance(ssid, str) or not 1 <= len(ssid.encode()) <= 32:
        raise ValueError('Invalid SSID')
    security = profile['keyManagement']
    if security not in ('', '--', 'wpa-psk', 'sae'):
        raise ValueError('Unsupported authentication')
    password = profile.get('psk', '')
    if not isinstance(password, str) or any(c in password for c in '\r\n\x00'):
        raise ValueError('Invalid password')
    report = {'scope':'Native WLAN scan, ephemeral connection and DNS; no Gaia controls', 'checks':{}, 'addressFamilies':{}}
    uid = str(uuid.uuid4())
    target = Path('/run/NetworkManager/system-connections/tundra-network-check.nmconnection')
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    text = f'[connection]\nid=Tundra temporary network check\nuuid={uid}\ntype=wifi\ninterface-name=wlan0\nautoconnect=false\n[wifi]\nmode=infrastructure\ncloned-mac-address=permanent\nssid='+''.join(str(b)+';' for b in ssid.encode())+'\n[ipv4]\nmethod=auto\n[ipv6]\nmethod=auto\n'
    if security in ('wpa-psk','sae'):
        escaped = password.replace('\\', '\\\\').replace('\t','\\t').replace(' ', '\\s')
        text += f'[wifi-security]\nkey-mgmt={security}\npsk={escaped}\n'
    previous = os.umask(0o077)
    try:
        rows = nm('-g','SIGNAL','device','wifi','list','ifname','wlan0','--rescan','yes')
        report['checks']['scanCompleted'] = rows.returncode == 0
        report['visibleNetworks'] = len(rows.stdout.splitlines()) if rows.returncode == 0 else 0
        report['checks']['networksFound'] = report['visibleNetworks'] > 0
        target.write_text(text)
        report['checks']['profileLoaded'] = nm('connection','load',str(target)).returncode == 0
        activated = nm('connection','up','uuid',uid)
        report['checks']['connected'] = activated.returncode == 0
        if activated.returncode:
            report['activationExitCode'] = activated.returncode
        for family in (4, 6):
            addresses = nm('--escape','no','-g',f'IP{family}.ADDRESS','device','show','wlan0')
            usable = False
            if addresses.returncode == 0:
                for line in addresses.stdout.splitlines():
                    try:
                        address = ipaddress.ip_interface(line.strip()).ip
                        usable |= not (address.is_link_local or address.is_loopback or address.is_unspecified)
                    except ValueError:
                        pass
            report['addressFamilies']['ipv'+str(family)] = usable
        report['checks']['ipAddress'] = any(report['addressFamilies'].values())
        try:
            socket.setdefaulttimeout(8)
            resolved = socket.getaddrinfo('example.org',443,type=socket.SOCK_STREAM)
            report['checks']['dns'] = bool(resolved)
            with socket.create_connection(('example.org',443),timeout=8):
                report['checks']['tcp443'] = True
        except OSError:
            report['checks'].setdefault('dns',False)
            report['checks']['tcp443'] = False
        report['connectedAtUnix'] = time.time()
    finally:
        # The active connection continues for the test; its secret is no longer
        # present in a keyfile and all NM state is destroyed at the RAM reboot.
        target.unlink(missing_ok=True)
        os.umask(previous)
    report['passed'] = all(report['checks'].values())
    print(json.dumps(report,indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
