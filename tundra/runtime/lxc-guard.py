#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Restrict the legacy HAL to character devices before creating its container.

Sargo's 4.9 kernel rejects LXC's cgroup2 device BPF program. A separate v1
devices controller is required; LXC's usual rules alone do not enforce it.
"""
import errno
import os
from pathlib import Path
import subprocess
import sys


def main():
    if 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():
        raise RuntimeError('Temporary boot flag missing')
    controller=Path('/run/tundra-device-controller')
    controller.mkdir(exist_ok=True)
    if not (controller/'devices.deny').exists():
        subprocess.run(['mount','-t','cgroup','-o','devices','devices',str(controller)],check=True)
    group=controller/'hal'
    group.mkdir(exist_ok=True)
    (group/'devices.deny').write_text('b *:* rwm')
    (group/'cgroup.procs').write_text(str(os.getpid()))
    # Test the actual open, not devices.list: this kernel lists a default allow
    # rule even when the blacklist is active. No bytes are written or read.
    try:
        descriptor=os.open('/dev/mmcblk0',os.O_RDONLY)
    except OSError as error:
        if error.errno!=errno.EPERM:raise
    else:
        os.close(descriptor)
        raise RuntimeError('Block device restriction was not enforced')
    with open('/dev/null','wb'):pass
    os.execv('/usr/bin/lxc-start',['lxc-start']+sys.argv[1:])


if __name__=='__main__':main()
