#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Preserve wall time across boots when Qualcomm's RTC has no Unix epoch."""
import json
from pathlib import Path
import time

STATE = Path('/var/lib/tundra/clock/last-time.json')
RTC = Path('/sys/class/rtc/rtc0/since_epoch')


def rtc_seconds():
    try:
        return int(RTC.read_text().strip())
    except (OSError, ValueError):
        return None


def valid_epoch(value):
    return type(value) in (int, float) and 946684800 <= value <= 4102444800


def restore():
    try:
        saved = json.loads(STATE.read_text())
        epoch, previous = saved['epoch'], saved.get('rtc')
        if not valid_epoch(epoch):
            return False
        current = rtc_seconds()
        # A reset/replaced RTC is not evidence of time elapsed while powered off.
        if type(previous) is int and current is not None and 0 <= current - previous <= 366*86400:
            epoch += current - previous
        if valid_epoch(epoch) and time.time() < epoch:
            time.clock_settime(time.CLOCK_REALTIME, epoch)
            return True
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return False


def save():
    epoch = time.time()
    if not valid_epoch(epoch):
        return
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE.with_suffix('.tmp')
    temporary.write_text(json.dumps({'epoch': epoch, 'rtc': rtc_seconds()}) + '\n')
    temporary.chmod(0o600)
    temporary.replace(STATE)


if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['--restore']:
        restore()
    elif sys.argv[1:] == ['--save']:
        save()
    else:
        raise SystemExit('Use --restore or --save')
