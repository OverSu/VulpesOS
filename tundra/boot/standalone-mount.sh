#!/bin/busybox sh
# SPDX-License-Identifier: MPL-2.0
# Mount only the prepared Tundra volume. Never format or guess an old filesystem.
set -eu
# VOLUME_CONFIGURATION
mkdir -p /volume
blkid "$VOLUME_DEVICE" | grep -F "UUID=\"$VOLUME_UUID\"" >/dev/null
repaired=0
e2fsck -p "$VOLUME_DEVICE" || repaired=$?
test "$repaired" -le 1
mount -t ext4 -o "$VOLUME_OPTIONS" "$VOLUME_DEVICE" /volume
test "$(cat /volume/tundra-volume-id)" = "$VOLUME_UUID"
echo TUNDRA_STANDALONE_VOLUME_READY
exec /bin/sh /native-root.sh
