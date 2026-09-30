#!/bin/busybox sh
# SPDX-License-Identifier: MPL-2.0
# Temporary RAM-only boot. Installed data is never mounted writable.
export PATH=/bin:/sbin
/bin/busybox --install -s /bin
mount -t proc proc /proc
ln -s /proc/mounts /etc/mtab
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mkdir -p /dev/pts /run /sys/kernel/config
mount -t devpts devpts /dev/pts
mount -t tmpfs tmpfs /run
exec >>/run/boot.log 2>&1
# This runs before USB/storage setup, so a later failure still returns to Droidian.
(sleep 480; echo 'Tundra trial deadline reached'; reboot -f) &
echo TUNDRA_RESCUE_STARTED
case "$(cat /proc/cmdline)" in *tundra.rescue=1*) ;; *) reboot -f;; esac
mdev -s
chmod 666 /dev/null /dev/zero /dev/random /dev/urandom /dev/ptmx
mount -t configfs configfs /sys/kernel/config
G=/sys/kernel/config/usb_gadget/tundra
mkdir -p "$G"
echo 0x1d6b > "$G/idVendor"
echo 0x0104 > "$G/idProduct"
mkdir -p "$G/strings/0x409" "$G/configs/c.1/strings/0x409" "$G/functions/rndis.usb0"
echo TUNDRA-TRIAL > "$G/strings/0x409/serialnumber"
echo 'Tundra development' > "$G/strings/0x409/manufacturer"
echo 'Temporary runtime trial' > "$G/strings/0x409/product"
echo 250 > "$G/configs/c.1/MaxPower"
ln -s "$G/functions/rndis.usb0" "$G/configs/c.1/rndis"
for i in $(seq 1 100); do
  UDC=$(ls /sys/class/udc | head -n1)
  [ -n "$UDC" ] && break
  sleep 0.1
done
echo "$UDC" > "$G/UDC"
ip link set lo up
for iface in rndis0 usb0; do
  if [ -d "/sys/class/net/$iface" ]; then
    ip addr add 10.15.19.82/24 dev "$iface"
    ip link set "$iface" up
    break
  fi
done
/sbin/dropbear -E -s -j -k -p 10.15.19.82:2222 -r /etc/tundra-hostkey -P /run/dropbear.pid
echo TUNDRA_USB_SSH_READY
# No LVM activation, fsck, journal replay, resizing, or writes to a block device.
if [ -b /dev/mmcblk0p72 ] && [ "$(dd if=/dev/mmcblk0p72 bs=1048576 count=1 2>/dev/null | sha256sum | cut -d' ' -f1)" = "$EXPECTED_STORAGE_HASH" ]; then
  mkdir -p /dev/mapper /installed
  /sbin/dmsetup create tundra-installed-ro --readonly --table '0 104448000 linear /dev/mmcblk0p72 329728'
  /sbin/dmsetup mknodes
  mount -t ext4 -o ro,noload /dev/mapper/tundra-installed-ro /installed
fi
echo TUNDRA_RESCUE_READY
while :; do sleep 5; done
