#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Report native telephony health without dialing or exposing subscriber data."""
import datetime
import json
from pathlib import Path
import re
import subprocess


FIELDS = {
    'Modem': ('Powered', 'Online', 'Emergency', 'Revision'),
    'SimManager': ('Present', 'PinRequired', 'LockedPins'),
    'NetworkRegistration': ('Status', 'Mode', 'Technology', 'Strength'),
    'RadioSettings': ('TechnologyPreference', 'AvailableTechnologies'),
    'ConnectionManager': ('Attached', 'Powered', 'RoamingAllowed'),
    'IpMultimediaSystem': ('Registered', 'VoiceCapable', 'SmsCapable'),
    'CallVolume': ('Muted', 'SpeakerVolume', 'MicrophoneVolume'),
}


def select_properties(interface, properties):
    return {key: properties[key].get('data') for key in FIELDS[interface]
            if isinstance(properties.get(key), dict) and 'data' in properties[key]}


def registration_events(text):
    """Keep RAT and denial reason; never copy cell location or raw log lines."""
    events = []
    pattern = re.compile(
        r'binder_network_poll_(voice|data)_state_cb\(\).*?slot\d+ '
        r'(registered|roaming|searching|unregistered|denied|unknown),'
        r'([^,]*),(-?\d+),(-?\d+),(-?\d+),(-?\d+)')
    for line in text.splitlines():
        match = pattern.search(line)
        if not match:
            continue
        domain, status, technology, rat, _lac, _cell, reason = match.groups()
        event = {'domain': domain, 'status': status,
                 'technology': technology, 'radioTechnology': int(rat),
                 'denialReason': int(reason)}
        if not events or event != events[-1]:
            events.append(event)
    return events[-40:]


def run(command):
    return subprocess.run(command, capture_output=True, text=True, timeout=12)


def modem_crashes(text):
    signals = []
    for line in text.splitlines():
        if 'qcrild' not in line:
            continue
        match = re.search(r'Fatal signal (\d+) \((SIG[A-Z]+)\)', line)
        if match:
            event = {'signal': int(match[1]), 'name': match[2]}
            timestamp = re.match(r'\s*(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\s', line)
            if timestamp:
                event['logTime'] = timestamp[1]
            signals.append(event)
    return {'signals': signals,
            'initialAttachTimeoutInBacktrace': 'qcril_qmi_nas_initial_attach_timeout_handler' in text}


def collect(command=run, root=Path('/')):
    report = {'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'properties': {}, 'services': {}, 'errors': {}}
    for interface in FIELDS:
        try:
            result = command(['busctl', '--system', '--timeout=8', '--json=short',
                              'call', 'org.ofono', '/ril_0',
                              'org.ofono.' + interface, 'GetProperties'])
            if result.returncode:
                report['errors'][interface] = 'unavailable'
                continue
            data = json.loads(result.stdout)['data'][0]
            report['properties'][interface] = select_properties(interface, data)
        except (OSError, subprocess.TimeoutExpired, ValueError, KeyError, IndexError, TypeError):
            report['errors'][interface] = 'unavailable'
    for service in ('ofono', 'tundra-radio', 'tundra-sms', 'tundra-audio', 'tundra-call-audio'):
        try:
            result = command(['systemctl', 'is-active', service])
            state = result.stdout.strip()
            report['services'][service] = state if state in (
                'active', 'inactive', 'failed', 'activating', 'deactivating') else 'unknown'
        except (OSError, subprocess.TimeoutExpired):
            report['services'][service] = 'unknown'
    try:
        result = command(['journalctl', '-u', 'ofono', '--since', '-10 min',
                          '--no-pager', '-n', '2000'])
        report['registrationEvents'] = registration_events(result.stdout)
        report['registrationLogAvailable'] = result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        report['registrationEvents'] = []
        report['registrationLogAvailable'] = False
    try:
        result = command(['lxc-attach', '-n', 'tundra-hal', '--', '/system/bin/logcat',
                          '-b', 'crash', '-d', '-t', '300'])
        report['qualcommCrashes'] = modem_crashes(result.stdout)
        report['qualcommCrashes']['logAvailable'] = result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        report['qualcommCrashes'] = {'logAvailable': False}
    try:
        data = json.loads((root/'run/tundra-call-audio/status.json').read_text())
        report['audio'] = {key: data[key] for key in (
            'active', 'routed', 'speaker', 'muted', 'volume', 'recordedAt') if key in data}
        report['audio']['hasError'] = bool(data.get('error'))
    except (OSError, ValueError, TypeError):
        report['audio'] = {'available': False}
    return report


if __name__ == '__main__':
    print(json.dumps(collect(), indent=2))
