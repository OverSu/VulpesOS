# SPDX-License-Identifier: MPL-2.0
"""Connect the Sargo Bluetooth HAL to BlueZ; pairing stays user initiated."""

def prepare(root, write):
    write('etc/dbus-1/system.d/tundra-bluetooth.conf', '''<!DOCTYPE busconfig PUBLIC
 "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig><policy user="root"><allow own="org.bluez"/><allow send_destination="org.bluez"/></policy></busconfig>
''')
    write('etc/bluetooth/main.conf', '[General]\nName=Vulpes OS\nDiscoverableTimeout=120\n[Policy]\nAutoEnable=false\n')
    write('etc/systemd/system/tundra-bluebinder.service', '''[Unit]
Description=Sargo Bluetooth HAL bridge
Requires=tundra-hal.service
After=tundra-hal.service
Before=bluetooth.service
[Service]
Type=notify
ExecStartPre=/usr/bin/binder-wait android.hardware.bluetooth@1.0::IBluetoothHci/default
ExecStart=/usr/sbin/bluebinder
Restart=on-failure
RestartSec=5
TimeoutStartSec=60
NoNewPrivileges=yes
ProtectHome=yes
ProtectSystem=strict
PrivateTmp=yes
''')
    write('etc/systemd/system/bluetooth.service.d/tundra.conf', '''[Unit]
Requires=tundra-bluebinder.service dbus.service
After=tundra-bluebinder.service dbus.service
''')
    wants = root/'etc/systemd/system/tundra.target.wants'
    wants.mkdir(parents=True, exist_ok=True)
    (wants/'bluetooth.service').symlink_to('/usr/lib/systemd/system/bluetooth.service')
