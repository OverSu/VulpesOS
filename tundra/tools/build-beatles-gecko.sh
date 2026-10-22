#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
set -euo pipefail

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
build="$root/out/beatles/gecko-156.0.1"
sysroot="$build/sysroot/rootfs"
export MOZBUILD_STATE_PATH="$build/mozbuild"
python=${VULPES_BUILD_PYTHON:-/home/archiviste/.local/bin/python3.12}
jobs=${VULPES_BUILD_JOBS:-4}
[[ "$jobs" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid VULPES_BUILD_JOBS" >&2; exit 2; }
rust=$(rustup which --toolchain 1.97.1 rustc)
export PATH="$(dirname "$rust"):$MOZBUILD_STATE_PATH/clang/bin:$MOZBUILD_STATE_PATH/node/bin:/usr/bin:/bin:$PATH"
export MOZCONFIG="$build/mozconfig"
export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=none

test "$(cat "$build/src/browser/config/version.txt")" = 156.0.1
test -f "$sysroot/usr/include/gtk-3.0/gtk/gtk.h"
test -x "$MOZBUILD_STATE_PATH/clang/bin/clang"
config_tmp=$(mktemp "$build/mozconfig.XXXXXX")
trap 'rm -f -- "$config_tmp"' EXIT
cat > "$config_tmp" <<EOF
mk_add_options MOZ_OBJDIR=$build/obj-armv7
mk_add_options MOZ_MAKE_FLAGS=-j$jobs
ac_add_options --enable-application=browser
ac_add_options --target=armv7-unknown-linux-gnueabihf
ac_add_options --disable-bootstrap
ac_add_options --disable-debug
ac_add_options --disable-debug-symbols
ac_add_options --disable-tests
ac_add_options --disable-crashreporter
ac_add_options --disable-updater
ac_add_options --enable-optimize=-O2
ac_add_options --with-libclang-path=$MOZBUILD_STATE_PATH/clang/lib
export CC="$MOZBUILD_STATE_PATH/clang/bin/clang --target=armv7-linux-gnueabihf --sysroot=$sysroot --gcc-install-dir=$sysroot/usr/lib/gcc/arm-linux-gnueabihf/12"
export CXX="$MOZBUILD_STATE_PATH/clang/bin/clang++ --target=armv7-linux-gnueabihf --sysroot=$sysroot --gcc-install-dir=$sysroot/usr/lib/gcc/arm-linux-gnueabihf/12"
export HOST_CC=$MOZBUILD_STATE_PATH/clang/bin/clang
export HOST_CXX=$MOZBUILD_STATE_PATH/clang/bin/clang++
export WASM_CC="$MOZBUILD_STATE_PATH/clang/bin/clang --sysroot=$MOZBUILD_STATE_PATH/sysroot-wasm32-wasi"
export WASM_CXX="$MOZBUILD_STATE_PATH/clang/bin/clang++ --sysroot=$MOZBUILD_STATE_PATH/sysroot-wasm32-wasi"
export CFLAGS="-march=armv7-a -mfpu=neon -mfloat-abi=hard"
export CXXFLAGS="-march=armv7-a -mfpu=neon -mfloat-abi=hard"
export PKG_CONFIG=/usr/bin/pkg-config
export PKG_CONFIG_SYSROOT_DIR=$sysroot
export PKG_CONFIG_LIBDIR=$sysroot/usr/lib/arm-linux-gnueabihf/pkgconfig:$sysroot/usr/share/pkgconfig
export RUSTC=$rust
export CARGO=$(rustup which --toolchain 1.97.1 cargo)
export CBINDGEN=$MOZBUILD_STATE_PATH/cbindgen/cbindgen
export NODEJS=$MOZBUILD_STATE_PATH/node/bin/node
EOF
if ! cmp -s "$config_tmp" "$MOZCONFIG"; then
  cp "$config_tmp" "$MOZCONFIG"
fi
rm -f -- "$config_tmp"
trap - EXIT
cd "$build/src"
exec "$python" mach "${@:-build}"
