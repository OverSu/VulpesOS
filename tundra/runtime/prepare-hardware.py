#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Configure isolated oFono/PulseAudio diagnostics; no call or SMS on startup."""
from pathlib import Path
import shutil


def prepare(root, write):
    write('etc/tundra/hardware-enabled', 'sargo\n')
    shutil.copy2(Path(__file__).with_name('modem-recovery.py'),
                 root/'etc/tundra/modem-recovery.py')
    write('etc/systemd/system/tundra-hal.service.d/modem-recovery.conf', '''[Service]
ExecStartPre=/usr/bin/python3 /etc/tundra/modem-recovery.py
''')
    with (root/'etc/group').open('a') as groups:
        groups.write('audio:x:1005:droidian\ncamera:x:1006:droidian\nradio:x:1001:\nmedia:x:1013:droidian\n')
    write('etc/ofono/binder.conf', '[Settings]\nExpectSlots = slot1\n\n[slot1]\npath = /ril_0\nslot = 0\n')
    # Only the diagnostic root process may operate the modem. Gaia needs its
    # separate, permission-checked broker before telephony can be exposed.
    write('etc/dbus-1/system.d/ofono.conf', '''<!DOCTYPE busconfig PUBLIC
 "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy context="default"><deny send_destination="org.ofono"/></policy>
  <policy user="root"><allow own="org.ofono"/><allow send_destination="org.ofono"/></policy>
</busconfig>
''')
    write('etc/systemd/system/ofono.service', '''[Unit]
Description=Tundra modem diagnostic service
Requires=tundra-hal.service dbus.service
After=tundra-hal.service dbus.service
[Service]
Type=dbus
BusName=org.ofono
StateDirectory=ofono
StateDirectoryMode=0700
ExecStartPre=/usr/bin/binder-wait android.hardware.radio@1.0::IRadio/slot1
ExecStart=/usr/sbin/ofonod --nodetach
Restart=on-failure
RestartSec=5
''')
    write('etc/systemd/system/tundra-radio.service', '''[Unit]
Description=Tundra restricted oFono bridge
Requires=dbus.service ofono.service
After=dbus.service ofono.service
[Service]
Type=simple
ExecStart=/usr/bin/python3 /etc/tundra/radio-control.py --server
RuntimeDirectory=tundra-radio
RuntimeDirectoryMode=0755
Restart=on-failure
RestartSec=2
NoNewPrivileges=yes
ProtectHome=yes
ProtectSystem=strict
StateDirectory=tundra/sms
StateDirectoryMode=0700
ReadWritePaths=/run/tundra-radio /var/lib/tundra/sms
''')
    write('etc/pulse/client.conf', 'autospawn = no\n')
    write('etc/pulse/daemon.conf', 'exit-idle-time = -1\ndefault-sample-rate = 48000\n')
    write('etc/pulse/default.pa', '''.fail
load-module module-native-protocol-unix
load-module module-droid-card rate=48000 voice_virtual_stream=true
load-module module-droid-hidl
load-module module-default-device-restore
load-module module-suspend-on-idle
''')
    # Prefer AAL for the next camera integration tests. The GStreamer probe
    # requests libstagefright_ccodec.so, absent from this Android 9 image.
    # Selecting AAL alone does not prove that a preview reaches the sensor.
    write('usr/lib/droidian/device/droidian-camera.conf',
          '[General]\nblacklist=""\nbackend=aal\n')
    write('etc/systemd/system/tundra-audio.service', '''[Unit]
Description=Tundra Sargo PulseAudio HAL bridge
Requires=tundra-hal.service systemd-logind.service
After=tundra-hal.service systemd-logind.service
[Service]
User=droidian
PAMName=tundra
Environment=XDG_RUNTIME_DIR=/run/user/32011
ExecStart=/usr/bin/pulseaudio -n --daemonize=no --exit-idle-time=-1 --log-target=journal --file=/etc/pulse/default.pa
Restart=on-failure
RestartSec=5
''')
    write('etc/systemd/system/tundra-call-audio.service', '''[Unit]
Description=Tundra modem call audio routing
Requires=ofono.service tundra-audio.service
After=ofono.service tundra-audio.service
[Service]
ExecStart=/usr/bin/python3 /etc/tundra/call-audio.py
RuntimeDirectory=tundra-call-audio
Restart=on-failure
RestartSec=5
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/run/tundra-call-audio
''')
    (root/'var/lib/tundra/sms').mkdir(parents=True,exist_ok=True,mode=0o700)
    write('etc/systemd/system/tundra-sms.service', '\n'.join([
        '[Unit]','Description=Persistent incoming SMS inbox','Requires=ofono.service',
        'After=ofono.service','[Service]',
        'ExecStart=/usr/bin/python3 /etc/tundra/sms-inbox.py',
        'UMask=0077','ProtectSystem=strict','ProtectHome=yes',
        'StateDirectory=tundra/sms','StateDirectoryMode=0700',
        'ReadWritePaths=/var/lib/tundra/sms','Restart=on-failure','RestartSec=3','']))
    wants = root/'etc/systemd/system/tundra.target.wants'
    for name in ('ofono', 'tundra-audio', 'ModemManager', 'tundra-radio', 'tundra-call-audio', 'tundra-sms'):
        (wants/(name+'.service')).symlink_to('../'+name+'.service')
