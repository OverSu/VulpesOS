#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Publish read-only hardware state. No SSIDs, IP addresses or modem identifiers."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time


def battery_state(root=Path('/sys/class/power_supply/battery')):
    try:
        level = int((root/'capacity').read_text().strip())
        status = (root/'status').read_text().strip()
        if not 0 <= level <= 100 or status not in ('Charging', 'Discharging', 'Full', 'Not charging'):
            return None
        return {'level': level/100, 'charging': status in ('Charging', 'Full'), 'status': status}
    except (OSError, ValueError):
        return None


def wifi_state():
    try:
        result = subprocess.run(['nmcli', '-g', 'GENERAL.STATE', 'device', 'show', 'wlan0'],
                                capture_output=True, text=True, timeout=3,
                                env={**os.environ, 'LC_ALL': 'C'})
        if result.returncode:
            return {'available': False, 'state': 'unavailable'}
        state = int(result.stdout.split()[0])
        names = {10:'unmanaged', 20:'unavailable', 30:'disconnected', 40:'connecting',
                 50:'connecting', 60:'authentication', 70:'connecting', 80:'connecting',
                 90:'connecting', 100:'connected', 110:'disconnecting', 120:'failed'}
        return {'available': state >= 30, 'state': names.get(state, 'unknown')}
    except (OSError, ValueError, IndexError, subprocess.TimeoutExpired):
        return {'available': False, 'state': 'unavailable'}


def snapshot():
    # Do not D-Bus-activate NetworkManager from an otherwise display-only boot.
    wifi = wifi_state() if Path('/etc/tundra/network-enabled').is_file() else {
        'available': False, 'state': 'unavailable'}
    return {'schema': 1, 'recordedAt': time.time(), 'battery': battery_state(), 'wifi': wifi}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if args.once:
        print(json.dumps(snapshot()))
        return
    output = Path('/run/tundra-hardware/status.json')
    output.parent.mkdir(mode=0o755, exist_ok=True)
    while True:
        temporary = output.with_suffix('.tmp')
        temporary.write_text(json.dumps(snapshot())+'\n')
        temporary.chmod(0o644)
        temporary.replace(output)
        time.sleep(5)


if __name__ == '__main__':
    main()
