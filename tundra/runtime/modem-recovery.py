#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Keep a Sargo modem fault from immediately restarting the whole phone."""
from pathlib import Path
import time


def configure(devices=Path('/sys/bus/msm_subsys/devices')):
    matches = [p.parent for p in devices.glob('*/name')
               if p.read_text().strip() == 'modem']
    if len(matches) != 1:
        raise RuntimeError('Expected one Sargo modem subsystem')
    level = matches[0]/'restart_level'
    previous = level.read_text().strip()
    if previous not in ('SYSTEM', 'RELATED'):
        raise RuntimeError('Unsupported modem restart policy: '+previous)
    # This kernel supports coupled subsystem recovery. Firmware failures and
    # unsuccessful recovery remain visible in the kernel log; do not suppress
    # its watchdog or crash accounting.
    if previous != 'RELATED':
        level.write_text('RELATED\n')
    if level.read_text().strip() != 'RELATED':
        raise RuntimeError('Modem restart policy was not applied')
    print('Sargo modem recovery: '+previous+' -> RELATED', flush=True)


if __name__ == '__main__':
    for attempt in range(30):
        try:
            configure()
            break
        except (FileNotFoundError, RuntimeError):
            if attempt == 29:
                raise
            time.sleep(1)
