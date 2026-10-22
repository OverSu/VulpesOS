#!/system/bin/sh
# SPDX-License-Identifier: MPL-2.0
# A missing runtime or failed launch must return to the installed KaiOS UI.
BASE=/data/local/vulpes-beatles
fallback() {
    /system/bin/start b2g
    exit 0
}
count=0
while [ "$count" -lt 120 ]; do
    [ -f "$BASE/disable-boot" ] && fallback
    [ -f "$BASE/runtime-ready" ] && [ -x "$BASE/rootfs/opt/firefox/firefox" ] &&
      [ -e /dev/graphics/fb0 ] && [ -S /dev/socket/rilproxy ] && break
    count=$((count + 1))
    sleep 1
done
[ "$count" -lt 120 ] || fallback
rm -f "$BASE/display-session.done" "$BASE/rootfs/work/gaia-audit.json"
/sbin/vulpes-display --phone-1800s || fallback
# The supervisor has a 30-minute hard deadline. Check startup independently.
count=0
while [ "$count" -lt 150 ]; do
    [ -f "$BASE/display-session.done" ] && fallback
    if [ -s "$BASE/rootfs/work/gaia-audit.json" ]; then
        /system/bin/busybox grep -q '"readyMs"' "$BASE/rootfs/work/gaia-audit.json" && exit 0
    fi
    count=$((count + 1))
    sleep 1
done
touch "$BASE/stop-session"
fallback
