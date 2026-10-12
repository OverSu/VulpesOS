#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Give the audio group access to Sargo's calibration and amplifier devices."""
import os
from pathlib import Path
import stat
import time

DEVICES = ('msm_audio_cal', 'msm_rtac', 'msm_cirrus_playback')


def prepare(root=Path('/dev')):
    for name in DEVICES:
        path = root / name
        if not stat.S_ISCHR(path.lstat().st_mode):
            raise RuntimeError('Not an audio character device: ' + name)
        os.chown(path, 0, 1005, follow_symlinks=False)
        path.chmod(0o660)


if __name__ == '__main__':
    for attempt in range(60):
        try:
            prepare()
            break
        except FileNotFoundError:
            if attempt == 59:
                raise
            time.sleep(1)
