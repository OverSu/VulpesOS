#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Smoke-test Droidian's Qt AAL camera backend without saving an image.

The old gst-droid probe is not a valid Sargo test: it loads the obsolete
Stagefright codec library before it reaches the Android camera provider.  The
shipping camera application uses QtMultimedia's AAL plugin instead.  This
check reports configuration and process startup only. A process can remain
alive while the camera backend is blocked; that does not validate the sensor.
"""
import configparser
import json
import os
from pathlib import Path
import subprocess
import time


def main():
    config_path = Path('/usr/lib/droidian/device/droidian-camera.conf')
    config = configparser.ConfigParser()
    config.read(config_path)
    backend = config.get('General', 'backend', fallback='').strip().lower()
    env = os.environ.copy()
    env.setdefault('QT_QPA_PLATFORM', 'offscreen')
    env.setdefault('XDG_RUNTIME_DIR', '/run/user/32011')
    env.setdefault('HOME', '/home/droidian')
    started = time.monotonic()
    try:
        result = subprocess.run(
            ['/usr/bin/droidian-camera'], env=env, capture_output=True,
            text=True, timeout=8)
        exit_code = result.returncode
    except subprocess.TimeoutExpired as error:
        # Timeout is deliberately not treated as successful initialization.
        result = error
        exit_code = 124
    stderr = getattr(result, 'stderr', '') or ''
    stdout = getattr(result, 'stdout', '') or ''
    if isinstance(stderr, bytes):
        stderr = stderr.decode(errors='replace')
    if isinstance(stdout, bytes):
        stdout = stdout.decode(errors='replace')
    print(json.dumps({
        'recordedAtUnix': time.time(),
        'backendConfig': str(config_path),
        'backend': backend,
        'applicationInstalled': Path('/usr/bin/droidian-camera').exists(),
        'processStayedAlive': exit_code == 124,
        'initializationVerified': False,
        'previewVerified': False,
        'captureTested': False,
        'recordingRetained': False,
        'stagefrightWarning': 'libstagefright_ccodec.so' in stderr,
        'exitCode': exit_code,
        'seconds': round(time.monotonic() - started, 2),
        'stderrTail': stderr[-1000:],
        'stdoutTail': stdout[-1000:],
    }, indent=2))


if __name__ == '__main__':
    main()
