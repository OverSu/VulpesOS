#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Explicit, bounded outgoing tests. Read the authorized recipient from stdin."""
import argparse
import json
import re
import subprocess
import sys
import time


def call(path, interface, method, *arguments):
    result = subprocess.run(['busctl', '--system', '--timeout=25', '--json=short',
                             'call', 'org.ofono', path, interface, method, *arguments],
                            capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise RuntimeError('DBus operation failed: '+interface+'.'+method)
    return json.loads(result.stdout)['data'] if result.stdout.strip() else None


def properties(path, interface):
    value = call(path, interface, 'GetProperties')
    return value[0] if isinstance(value, list) else value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dial', action='store_true')
    parser.add_argument('--sms', action='store_true')
    args = parser.parse_args()
    if not (args.dial or args.sms): parser.error('Choose an explicit outgoing operation')
    recipient = sys.stdin.readline().strip()
    if not re.fullmatch(r'\+[1-9][0-9]{7,14}', recipient): parser.error('Expected an international test number on stdin')
    report = {'recordedAtUnix': time.time(), 'call': None, 'sms': None,
              'recipientRecorded': False, 'automaticRetries': False}
    if args.dial:
        if call('/ril_0', 'org.ofono.VoiceCallManager', 'GetCalls')[0]:
            raise RuntimeError('An existing call prevents the diagnostic')
        path = None
        states = []
        try:
            path = call('/ril_0', 'org.ofono.VoiceCallManager', 'Dial', 'ss', recipient, 'default')[0]
            deadline = time.monotonic()+12
            while time.monotonic() < deadline:
                try:
                    state = properties(path, 'org.ofono.VoiceCall')['State']['data']
                except RuntimeError:
                    states.append('removed')
                    break
                if not states or states[-1] != state: states.append(state)
                if state == 'disconnected': break
                time.sleep(.5)
            report['call'] = {'requested': True, 'states': states, 'conversationAudioVerified': False}
        except RuntimeError as error:
            report['call'] = {'error': str(error), 'states': states}
        finally:
            if path:
                try:
                    call(path, 'org.ofono.VoiceCall', 'Hangup')
                    report['call']['hangupRequested'] = True
                except RuntimeError:
                    report['call']['hangupRequested'] = False
    if args.sms:
        try:
            path = call('/ril_0', 'org.ofono.MessageManager', 'SendMessage', 'ss', recipient,
                        'Test Vulpes OS / Tundra : SMS de verification depuis le Pixel 3a.')[0]
            states = []
            deadline = time.monotonic()+30
            while time.monotonic() < deadline:
                try: state = properties(path, 'org.ofono.Message')['State']['data']
                except RuntimeError:
                    states.append('object-removed')
                    break
                if not states or states[-1] != state: states.append(state)
                if state in ('sent', 'failed'): break
                time.sleep(.5)
            report['sms'] = {'submitted': True, 'states': states, 'recipientDeliveryConfirmed': False}
        except RuntimeError as error:
            report['sms'] = {'error': str(error)}
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
