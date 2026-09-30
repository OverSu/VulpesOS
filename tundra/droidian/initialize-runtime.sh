#!/bin/sh
# SPDX-License-Identifier: MPL-2.0
# Run inside the staged root before starting its graphical session.
set -eu
/sbin/ldconfig
/usr/lib/aarch64-linux-gnu/glib-2.0/glib-compile-schemas /usr/share/glib-2.0/schemas
/usr/lib/aarch64-linux-gnu/gdk-pixbuf-2.0/gdk-pixbuf-query-loaders --update-cache
/usr/bin/update-mime-database /usr/share/mime
/usr/bin/python3 - <<'PY'
import gzip
from pathlib import Path
for name in ('UTF-8', 'ANSI_X3.4-1968'):
    compressed = Path('/usr/share/i18n/charmaps')/(name+'.gz')
    if compressed.is_file():
        compressed.with_suffix('').write_bytes(gzip.decompress(compressed.read_bytes()))
PY
/usr/bin/localedef --no-archive -i C -f UTF-8 C.UTF-8
test -s /usr/lib/aarch64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders.cache
