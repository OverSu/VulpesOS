#!/usr/bin/env python3
"""Refresh the dictionary loader in Gaia's packaged keyboard settings bundle."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'gaia/apps/keyboard/js/settings/layout_dictionary_downloader.js').read_text()
path=ROOT/'assets/webapps/keyboard.gaiamobile.org/gaia_build_defer_settings.js'
bundle=path.read_text()
start=bundle.index('(function(exports){var LayoutDictionaryDownloader=')
end=bundle.index('exports.LayoutDictionaryDownloader=LayoutDictionaryDownloader;}(window));',start)
end+=len('exports.LayoutDictionaryDownloader=LayoutDictionaryDownloader;}(window));')
out=ROOT/'overrides/keyboard.gaiamobile.org/gaia_build_defer_settings.js'
out.write_text(bundle[:start]+source+'\n'+bundle[end:])
print(out.relative_to(ROOT))
