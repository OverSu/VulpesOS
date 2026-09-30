#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Generate native trial configuration inside an already staged runtime tree."""
import argparse
import runpy
from pathlib import Path
import shutil


def prepare(root, network=None, hardware=None, diagnostics=False):
    if hardware is None:
        hardware = (root/'usr/sbin/ofonod').is_file()
    if network is None:
        network = (root/'usr/sbin/NetworkManager').is_file()
    if hardware and not network:
        raise ValueError('Hardware diagnostics require the isolated NV/network setup')
    if not (root/'opt/vulpes/trial/session.py').is_file():raise ValueError('Stage the common product first')
    def write(name,text,mode=0o644):
        p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);p.chmod(mode)
    fonts = Path(__file__).resolve().parents[2]/'gaia/shared/elements/vulpes-fonts'
    destination = root/'usr/share/fonts/opentype/vulpes'
    destination.mkdir(parents=True, exist_ok=True)
    for source in sorted(fonts.glob('*.otf')):
        shutil.copyfile(source, destination/source.name)
        (destination/source.name).chmod(0o644)
    for name in ('LICENSE-OFL', 'NOTICE', 'provenance.json'):
        shutil.copyfile(fonts/name, destination/name)
    write('etc/fonts/conf.d/00-vulpes-sans.conf', '''<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <alias binding="strong"><family>sans-serif</family><prefer><family>Fira Sans</family></prefer></alias>
  <alias binding="strong"><family>FiraSans</family><prefer><family>Fira Sans</family></prefer></alias>
</fontconfig>
''')
    write('etc/systemd/system/tundra-display.service.d/fonts.conf', '''[Service]
ExecStartPre=+/usr/bin/fc-cache -f /usr/share/fonts/opentype/vulpes
''')
    write('etc/os-release','NAME="Tundra"\nID=tundra\nPRETTY_NAME="Tundra Sargo development trial"\n')
    write('etc/hostname','vulpes-sargo\n')
    write('etc/shells','/bin/sh\n/bin/bash\n/usr/bin/bash\n')
    write('etc/pam.d/tundra','auth required pam_permit.so\naccount required pam_permit.so\nsession required pam_systemd.so\n')
    write('etc/pam.d/other','auth required pam_deny.so\naccount required pam_deny.so\npassword required pam_deny.so\nsession required pam_deny.so\n')
    write('etc/pam.d/common-account','account required pam_unix.so\n')
    write('etc/pam.d/common-session-noninteractive','session required pam_unix.so\n')
    write('etc/systemd/logind.conf','[Login]\nHandlePowerKey=ignore\nIdleAction=ignore\n')
    write('etc/systemd/journald.conf','[Journal]\nStorage=volatile\nRuntimeMaxUse=32M\n')
    write('etc/passwd','root:x:0:0:root:/root:/bin/bash\ndroidian:x:32011:32011:Vulpes trial:/home/droidian:/bin/bash\nsystem:x:1000:1000:Android HAL:/:/usr/sbin/nologin\n')
    write('etc/group','root:x:0:\ndroidian:x:32011:\nsystem:x:1000:droidian\ngraphics:x:1003:droidian\nandroid_input:x:1004:droidian\nvideo:x:44:droidian\nrender:x:105:droidian\ninput:x:104:droidian\nnetdev:x:988:\n')
    write('etc/shadow','root:!:20000:0:99999:7:::\ndroidian:!:20000:0:99999:7:::\nsystem:!:20000:0:99999:7:::\n',0o600)
    write('etc/tundra/phoc.ini','[output:HWCOMPOSER-1]\nscale=3\n')
    write('etc/udev/rules.d/90-tundra-display.rules','KERNEL=="kgsl*", GROUP="graphics", MODE="0660"\nKERNEL=="ion", GROUP="graphics", MODE="0660"\nKERNEL=="event*", GROUP="input", MODE="0660"\nKERNEL=="*binder", MODE="0666"\n')
    # The Android camera subdevices are not generic V4L capture devices. The
    # desktop v4l_id probe opens them before their HAL and crashes this kernel.
    (root/'etc/udev/rules.d/60-persistent-v4l.rules').symlink_to('/dev/null')
    write('etc/systemd/system/tundra.target','''[Unit]
Description=Tundra temporary hardware trial
Requires=basic.target tundra-display.service
After=basic.target tundra-display.service
AllowIsolate=yes
''')
    # systemd does not consistently honor a --unit argument passed through
    # switch_root on the Android-derived initramfs. Make the trial target the
    # normal boot target as well, so the display starts without an SSH nudge.
    default_target = root/'etc/systemd/system/default.target'
    if default_target.exists() or default_target.is_symlink():
        default_target.unlink()
    default_target.symlink_to('tundra.target')
    write('etc/systemd/system/tundra-hal.service','''[Unit]
Description=Curated Android display HAL
After=systemd-udev-trigger.service
[Service]
Type=simple
ExecStartPre=/usr/bin/python3 /etc/tundra/setup-hal.py
ExecStart=/usr/bin/python3 /etc/tundra/lxc-guard.py -F -n tundra-hal -f /etc/tundra/lxc.conf -o /run/tundra/lxc.log -l DEBUG
KillMode=control-group
TimeoutStopSec=15
''')
    write('etc/systemd/system/tundra-display.service','''[Unit]
Description=Gaia and Gecko on the Sargo display
Requires=tundra-hal.service dbus.service systemd-logind.service
After=tundra-hal.service dbus.service systemd-logind.service systemd-user-sessions.service
Wants=systemd-user-sessions.service
[Service]
User=droidian
PAMName=tundra
WorkingDirectory=/home/droidian
Environment=XDG_RUNTIME_DIR=/run/user/32011
Environment=XDG_SESSION_TYPE=wayland
Environment=XDG_CURRENT_DESKTOP=Vulpes
Environment=LANG=C.UTF-8
Environment=VULPES_TUNDRA=1
Environment=VULPES_TUNDRA_RADIO=1
Environment=WLR_BACKENDS=hwcomposer,libinput
Environment=EGL_PLATFORM=hwcomposer
Environment=WLR_HWC_SKIP_VERSION_CHECK=1
ExecStartPre=+/usr/bin/python3 /etc/tundra/wait-hal.py
ExecStartPre=+chvt 7
ExecStart=/usr/bin/dbus-run-session -- /usr/bin/phoc --no-xwayland --socket=tundra-0 -C /etc/tundra/phoc.ini -E "/usr/bin/python3 /opt/vulpes/trial/session.py --own-compositor --hybris-egl"
TTYPath=/dev/tty7
TTYReset=yes
TTYVHangup=yes
StandardInput=tty-fail
StandardOutput=journal
StandardError=inherit
KillMode=control-group
TimeoutStartSec=90
TimeoutStopSec=15
''')
    if diagnostics:
        display = root/'etc/systemd/system/tundra-display.service'
        display.write_text(display.read_text().replace('--own-compositor --hybris-egl',
                                                      '--own-compositor --hybris-egl --diagnostics'))
    write('etc/tundra/wait-hal.py','''import subprocess,time
for _ in range(120):
    p=subprocess.run(['/usr/bin/lxc-attach','-n','tundra-hal','--','/system/bin/getprop','init.svc.vendor.hwcomposer-2-2'],capture_output=True,text=True)
    if p.stdout.strip()=='running':break
    time.sleep(.5)
else:raise RuntimeError('Display HAL did not start')
''')
    write('etc/tundra/lxc.conf','''lxc.rootfs.path = /android
lxc.uts.name = tundra-hal
lxc.net.0.type = empty
lxc.arch = aarch64
lxc.init.cmd = /init
lxc.apparmor.profile = unconfined
lxc.autodev = 0
lxc.cap.drop = mac_admin mac_override sys_boot
lxc.cgroup.devices.deny = b *:* rwm
lxc.cgroup2.devices.deny = b *:* rwm
lxc.cgroup2.memory.max = 536870912
lxc.mount.entry = tmpfs dev tmpfs nosuid 0 0
lxc.mount.entry = /dev/__properties__ dev/__properties__ none bind,create=dir 0 0
lxc.mount.entry = /dev/socket dev/socket none bind,create=dir 0 0
lxc.mount.entry = proc proc proc nodev,noexec,nosuid 0 0
lxc.mount.entry = sys sys sysfs nodev,noexec,nosuid 0 0
lxc.mount.entry = /android/data data none bind 0 0
lxc.mount.entry = /mnt mnt none rbind 0 0
''')
    for name in ('hal_policy.py','setup-hal.py','lxc-guard.py','hardware-status.py','prepare-network.py','wifi-control.py','radio-control.py','sms-inbox.py','call-audio.py','camera-preview.py','buttons.py'):
        shutil.copy2(Path(__file__).parent/name,root/'etc/tundra'/name)
    write('etc/systemd/system/tundra-hardware.service', '''[Unit]
Description=Tundra read-only battery and network state
After=systemd-udev-trigger.service
[Service]
ExecStart=/usr/bin/python3 /etc/tundra/hardware-status.py
RuntimeDirectory=tundra-hardware
RuntimeDirectoryMode=0755
Restart=on-failure
RestartSec=5
NoNewPrivileges=yes
''')
    wants = root/'etc/systemd/system/tundra.target.wants'
    wants.mkdir(exist_ok=True)
    (wants/'tundra-hardware.service').symlink_to('../tundra-hardware.service')
    write('etc/systemd/system/tundra-buttons.service', '''[Unit]
Description=Sargo physical keys, backlight and audio volume
After=systemd-udev-trigger.service
[Service]
ExecStartPre=/usr/bin/python3 /etc/tundra/buttons.py --stop-vibration
ExecStart=/usr/bin/python3 /etc/tundra/buttons.py
ExecStopPost=/usr/bin/python3 /etc/tundra/buttons.py --stop-vibration
RuntimeDirectory=tundra-buttons
RuntimeDirectoryMode=0755
Restart=on-failure
RestartSec=2
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/run/tundra-buttons /sys/class/backlight -/sys/class/leds/vibrator
NoNewPrivileges=yes
''')
    (wants/'tundra-buttons.service').symlink_to('../tundra-buttons.service')
    # Older immutable images may not contain the networking packages yet.
    if network:
        write('etc/tundra/network-enabled', 'sargo\n')
        display = root/'etc/systemd/system/tundra-display.service'
        display.write_text(display.read_text().replace('Environment=VULPES_TUNDRA=1',
                          'Environment=VULPES_TUNDRA=1\nEnvironment=VULPES_TUNDRA_WIFI=1'))
        with (root/'etc/tundra/lxc.conf').open('a') as config:
            config.write('lxc.mount.entry = /run/tundra/nv-block dev/block none bind,create=dir 0 0\n')
        write('etc/NetworkManager/NetworkManager.conf', '''[main]
plugins=keyfile
dhcp=internal
dns=default
auth-polkit=root-only
[keyfile]
unmanaged-devices=*,except:interface-name:wlan0
[device]
wifi.scan-rand-mac-address=no
[connection]
wifi.cloned-mac-address=permanent
[connectivity]
enabled=false
''')
        write('etc/systemd/system/tundra-network.service', '''[Unit]
Description=Sargo Wi-Fi driver
Requires=tundra-hal.service
After=tundra-hal.service
Before=NetworkManager.service
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /etc/tundra/prepare-network.py
TimeoutStartSec=180
RemainAfterExit=yes
''')
        write('etc/systemd/system/NetworkManager.service.d/tundra.conf', '''[Unit]
Requires=tundra-network.service
After=tundra-network.service
''')
        # Wi-Fi profiles live in the private persistent root overlay.
        (wants/'NetworkManager.service').symlink_to('/usr/lib/systemd/system/NetworkManager.service')
        (root/'etc/systemd/system/dbus-fi.w1.wpa_supplicant1.service').symlink_to('/usr/lib/systemd/system/wpa_supplicant.service')
        (root/'etc/NetworkManager/system-connections').mkdir(parents=True, exist_ok=True)
        write('etc/systemd/system/tundra-wifi.service', '''[Unit]
Description=Vulpes native Wi-Fi control
Requires=NetworkManager.service
After=NetworkManager.service
[Service]
ExecStart=/usr/bin/python3 /etc/tundra/wifi-control.py
Group=droidian
RuntimeDirectory=tundra-wifi
RuntimeDirectoryMode=0750
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/run /etc/NetworkManager/system-connections
Restart=on-failure
RestartSec=5
''')
        (wants/'tundra-wifi.service').symlink_to('../tundra-wifi.service')
    if hardware:
        runpy.run_path(str(Path(__file__).with_name('prepare-hardware.py')))['prepare'](root, write)
    # Generate the initial machine identity locally. Persistent boots retain it.
    write('etc/machine-id', '')
    for directory in [root/'etc', *[p for p in (root/'etc').rglob('*') if p.is_dir()]]:
        directory.chmod(0o755)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);a=p.parse_args();prepare(a.root.resolve())
