#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Play a quiet test tone and measure microphone PCM; retain no recording."""
import json
import math
import struct
import subprocess
import time


def main():
    report = {'recordedAtUnix': time.time(), 'recordingRetained': False,
              'scope': 'Physical PulseAudio endpoints, not in-call audio'}
    # Use a per-stream volume; leave the user's sink volume and mute unchanged.
    tone = b''.join(struct.pack('<h', int(16000*math.sin(2*math.pi*440*i/48000)))
                    for i in range(48000))
    played = subprocess.run(['paplay', '--raw', '--rate=48000', '--channels=1',
                             '--format=s16le', '--volume=6554',
                             '--device=sink.primary_output'], input=tone,
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=10)
    report['playback'] = {'exitCode': played.returncode, 'device': 'sink.primary_output',
                          'audibilityConfirmed': False}
    recording = subprocess.Popen(['parec', '--raw', '--rate=48000', '--channels=1',
                                   '--format=s16le', '--device=source.droid'],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        try: data, error = recording.communicate(timeout=3)
        except subprocess.TimeoutExpired:
            recording.terminate()
            data, error = recording.communicate(timeout=3)
    finally:
        if recording.poll() is None:
            recording.kill()
            recording.wait()
    samples = struct.unpack('<'+'h'*(len(data)//2), data[:len(data)//2*2])
    report['microphone'] = {'device': 'source.droid', 'sampleCount': len(samples),
                             'rms': round(math.sqrt(sum(x*x for x in samples)/len(samples)), 2) if samples else None,
                             'peak': max(map(abs, samples), default=None),
                             'nonSilent': any(samples)}
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
