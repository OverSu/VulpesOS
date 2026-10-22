#!/system/bin/sh
BASE=/data/local/tmp/vulpes-gecko-armhf
case "$2" in 156.0.1) BASE=/data/local/vulpes-beatles;; ""|153.5.0esr) ;; *) exit 2;; esac
MODE="$1"
case "$MODE" in version|render) ;; *) exit 2;; esac
[ "$MODE" != render ] || /system/bin/busybox rm -f "$BASE/rootfs/work/gecko.png"
/system/bin/busybox mkdir -p "$BASE/rootfs/proc" "$BASE/rootfs/dev/shm" "$BASE/rootfs/work/profile" "$BASE/rootfs/tmp"
/system/bin/busybox chown -R 2000:2000 "$BASE/rootfs/work" "$BASE/rootfs/tmp"
/system/bin/busybox timeout -t 60 -s KILL "$BASE/gecko-probe-launcher" "$MODE" > "$BASE/$MODE.log" 2>&1
CODE=$?
# Only the disposable runtime's processes; KaiOS and ADB use another root.
for PROC in /proc/[0-9]*; do
  [ "$(/system/bin/busybox readlink "$PROC/root")" != "$BASE/rootfs" ] || kill -KILL "${PROC##*/}"
done
echo "$CODE" > "$BASE/$MODE.exit"
/system/bin/busybox chmod 644 "$BASE/$MODE.log" "$BASE/$MODE.exit"
