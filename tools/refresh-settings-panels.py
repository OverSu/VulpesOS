#!/usr/bin/env python3
"""Refresh selected AMD modules inside Gaia's existing Settings panel bundles."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
modules = [
    ('panels/display/slider_handler', 'js/panels/display/panel.js'),
    ('panels/wifi/wifi_network_list', 'js/panels/wifi/panel.js'),
    ('modules/page_transitions', 'js/main.js'),
]
for name, relative in modules:
    original=ROOT/'assets/webapps/settings.gaiamobile.org'/relative
    source=ROOT/'overrides/settings.gaiamobile.org'/f'js/{name}.js'
    if not source.exists():
        source=ROOT/'gaia/apps/settings'/f'js/{name}.js'
    text=source.read_text()
    dependencies=list(dict.fromkeys(re.findall(r"require\(['\"]([^'\"]+)['\"]\)",text)))
    import json
    if 'define(function(require)' in text:
        text=text.replace('define(function(require)', 'define('+repr(name)+','+json.dumps(['require',*dependencies])+',function(require)',1)
    else:
        text=text.replace('define(function()', 'define('+repr(name)+',[],function()',1)
    bundle=original.read_text()
    start=bundle.index("define('"+name+"'")
    end=bundle.find("define('",start+8)
    if end<0:end=len(bundle)
    target=ROOT/'overrides/settings.gaiamobile.org'/relative
    target.write_text(bundle[:start]+text+'\n'+bundle[end:])
    print(target.relative_to(ROOT))
