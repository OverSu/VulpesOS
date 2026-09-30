#!/bin/sh
# SPDX-License-Identifier: MPL-2.0
# Called by rescue PID 1 only after the read-only storage check succeeds.
set -eu
# BUILD_TIME_FLOOR
# RUNTIME_CONFIG_OVERLAY
# A kernel fallback date must not precede the build; RTC is not modified.
if [ "$(date +%s)" -lt "${BUILD_EPOCH:-0}" ]; then date -s "@$BUILD_EPOCH"; fi
trap 'echo TUNDRA_NATIVE_SETUP_FAILED; while :; do /bin/busybox sleep 5; done' EXIT
LOWER=/installed/home/droidian/vulpes-tundra-tests/runtime-reference-20260925/root
if [ -n "${SYSTEM_IMAGE:-}" ]; then
    test "$(sha256sum "$SYSTEM_IMAGE" | cut -d' ' -f1)" = "$SYSTEM_IMAGE_SHA"
    mkdir -p /run/tundra-system
    mount -t ext4 -o loop,ro,noload "$SYSTEM_IMAGE" /run/tundra-system
    LOWER=/run/tundra-system
fi
test -f "$LOWER/etc/systemd/system/tundra.target"
UPPER=/run/native-upper
WORK=/run/native-work
if [ -n "${STATE_IMAGE:-}" ]; then
    test -f "$STATE_IMAGE" && test ! -L "$STATE_IMAGE"
    test "$(stat -c %s "$STATE_IMAGE")" = "$STATE_BYTES"
    blkid "$STATE_IMAGE" | grep -F "UUID=\"$STATE_UUID\"" >/dev/null
    repaired=0
    e2fsck -p "$STATE_IMAGE" || repaired=$?
    test "$repaired" -le 1
    mkdir -p /run/tundra-state
    mount -t ext4 -o loop,rw,nosuid,nodev "$STATE_IMAGE" /run/tundra-state
    # A data layer belongs to one immutable system image. Refuse accidental reuse.
    test "$(cat /run/tundra-state/system.sha256)" = "$SYSTEM_IMAGE_SHA"
    UPPER=/run/tundra-state/upper
    WORK=/run/tundra-state/work
fi
mkdir -p "$UPPER" "$WORK" /newroot
chmod 755 "$UPPER"
mount -t overlay overlay -o "lowerdir=$LOWER,upperdir=$UPPER,workdir=$WORK" /newroot
if [ -z "${SYSTEM_IMAGE:-}" ] || [ "${APPLY_NATIVE_CONFIG:-0}" = 1 ]; then
    # Only the selected upper layer is edited; the system image stays read-only.
    if [ -n "${STATE_IMAGE:-}" ]; then
        mkdir -p /run/tundra-identity
        for identity in machine-id passwd group shadow gshadow; do
            if [ -s "/newroot/etc/$identity" ]; then
                cp -p "/newroot/etc/$identity" "/run/tundra-identity/$identity"
            fi
        done
    fi
    rm -f /newroot/etc/tundra/hardware-enabled /newroot/etc/systemd/system/tundra.target.wants/ofono.service /newroot/etc/systemd/system/tundra.target.wants/tundra-audio.service /newroot/etc/tundra/network-enabled /newroot/etc/systemd/system/tundra.target.wants/NetworkManager.service /newroot/etc/systemd/system/tundra.target.wants/tundra-wifi.service
    tar -xf /native-config.tar -C /newroot
    if [ -d /run/tundra-identity ]; then
        for identity in /run/tundra-identity/*; do
            [ -f "$identity" ] && cp -p "$identity" /newroot/etc/
        done
        chmod 644 /newroot/etc/machine-id
    fi
fi
if [ -f /shared-ui.tar ]; then tar -xf /shared-ui.tar -C /newroot; fi
# A previous successful session must never count as proof of this boot.
for log in test.json home.png session.pid gecko.log server.log compositor.log network-gecko.json wifi-ui.json; do
    rm -f "/newroot/opt/vulpes/logs/$log"
done
mkdir -p /newroot/reference /newroot/run /newroot/root/.ssh
if [ -z "${SYSTEM_IMAGE:-}" ]; then
    : > /newroot/reference/android-rootfs.img
    mount --bind /installed/var/lib/lxc/android/android-rootfs.img /newroot/reference/android-rootfs.img
else
    test -s /newroot/reference/android-rootfs.img
fi
# Installed lower layers stay reachable for the overlay/loop driver until reboot.
mkdir -p /newroot/reference/installed
mount --move /installed /newroot/reference/installed
# Keep a minimal, already tested rescue environment in RAM. Its SSH account
# does not depend on PAM/NSS/shell configuration in the experimental root.
mkdir -p /run/rescue-root
(cd / && tar -c bin sbin lib etc root) | (cd /run/rescue-root && tar -x)
mkdir -p /run/rescue-root/dev /run/rescue-root/proc /run/rescue-root/run
mount --rbind /dev /run/rescue-root/dev
mount --bind /proc /run/rescue-root/proc
kill "$(cat /run/dropbear.pid)"
chroot /run/rescue-root /sbin/dropbear -E -s -j -k -p 10.15.19.82:2222 -r /etc/tundra-hostkey -P /run/dropbear.pid
for fs in dev proc sys run; do mount --move "/$fs" "/newroot/$fs"; done
# A static watchdog survives switch_root without needing the old /bin or /proc.
exec switch_root /newroot /sbin/init --unit=tundra.target
