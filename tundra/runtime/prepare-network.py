#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Activate the Sargo WLAN driver after the read-only vendor mount exists."""
from pathlib import Path
import errno
import time


def main():
    if 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():
        raise RuntimeError('Temporary Tundra boot required')
    firmware = Path('/vendor/firmware')
    if not firmware.is_dir():
        raise RuntimeError('Vendor firmware not mounted')
    Path('/sys/module/firmware_class/parameters/path').write_text(str(firmware))
    boot = Path('/sys/kernel/boot_wlan/boot_wlan')
    if boot.exists():
        try:
            boot.write_text('1\n')
        except OSError as error:
            if error.errno != errno.EALREADY:
                raise
    # pd-mapper publishes the Qualcomm WLAN protection domain. Its firmware
    # can take a minute to start after the display HAL is ready.
    for _ in range(180):
        if Path('/sys/class/net/wlan0').exists():
            return
        time.sleep(.5)
    wlan = Path('/dev/wlan')
    if wlan.exists():
        wlan.write_text('ON\n')
    for _ in range(60):
        if Path('/sys/class/net/wlan0').exists():
            return
        time.sleep(.5)
    raise RuntimeError('Sargo WLAN driver did not expose wlan0')


if __name__ == '__main__':
    main()
