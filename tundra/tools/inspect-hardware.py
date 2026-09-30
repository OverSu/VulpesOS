#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Read readiness, never dial, send messages, enter PINs or open camera nodes."""
import json
from pathlib import Path
import subprocess
import time


def command(args):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=12)
        if result.returncode:
            return None
        return result.stdout
    except (OSError, subprocess.TimeoutExpired):
        return None


def bus(*args):
    text = command(['busctl', '--system', '--json=short', *args])
    try:
        return json.loads(text)['data'] if text is not None else None
    except (ValueError, KeyError, TypeError):
        return None


def properties(interface):
    data = bus('call', 'org.ofono', '/ril_0', interface, 'GetProperties')
    if isinstance(data, list) and len(data) == 1:
        data = data[0]
    return data if isinstance(data, dict) else {}


def selected(values, names):
    # GetProperties returns identifiers too: none are copied into the report.
    return {key: values[key].get('data') for key in names
            if key in values and isinstance(values[key], dict)}


def inspect():
    native = 'tundra.rescue=1' in Path('/proc/cmdline').read_text()
    report = {'recordedAtUnix': time.time(), 'environment': 'tundra' if native else 'reference',
              'scope': 'Read-only readiness, not functional call/SMS/audio/camera qualification',
              'services': {}}
    for service in ('tundra-hal', 'tundra-wifi', 'NetworkManager', 'ofono', 'ModemManager'):
        report['services'][service] = (command(['systemctl', 'is-active', service]) or 'inactive').strip()
    modem = selected(properties('org.ofono.Modem'), ('Powered', 'Online', 'Interfaces'))
    sim = selected(properties('org.ofono.SimManager'), ('Present', 'PinRequired', 'LockedPins'))
    registration = selected(properties('org.ofono.NetworkRegistration'), ('Status', 'Technology', 'Strength'))
    interfaces = modem.get('Interfaces') or []
    report['telephony'] = {'modem': modem, 'sim': sim, 'registration': registration,
                           'voiceInterface': 'org.ofono.VoiceCallManager' in interfaces,
                           'smsInterface': 'org.ofono.MessageManager' in interfaces,
                           'outgoingOperationsPerformed': False}
    report['audio'] = {}
    # Run as the session user for access to their PulseAudio server.
    for kind in ('sinks', 'sources'):
        raw = command(['pactl', '--format=json', 'list', kind])
        try:
            items = json.loads(raw) if raw else None
            if items is None:
                short = command(['pactl', 'list', 'short', kind])
                items = [] if short is not None else None
                for line in (short or '').splitlines():
                    fields = line.split('\t')
                    if len(fields) >= 5:
                        items.append({'name': fields[1], 'state': fields[-1],
                                      'driver': fields[2]})
            if items is None:
                report['audio'][kind] = None
                continue
            report['audio'][kind] = [{key: item.get(key) for key in
                                     ('name', 'state', 'mute', 'active_port', 'driver')}
                                    for item in items]
        except (TypeError, ValueError):
            report['audio'][kind] = []
    report['camera'] = {
        'halProbeOnly': True,
        'applicationInstalled': Path('/usr/bin/droidian-camera').exists(),
        'captureTested': False,
    }
    report['battery'] = {}
    for name in ('capacity', 'status'):
        try:
            report['battery'][name] = Path('/sys/class/power_supply/battery', name).read_text().strip()
        except OSError:
            pass
    return report


if __name__ == '__main__':
    print(json.dumps(inspect(), indent=2))
