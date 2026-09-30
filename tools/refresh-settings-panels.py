#!/usr/bin/env python3
"""Refresh selected AMD modules inside Gaia's existing Settings panel bundles."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
for panel, module in [('display','slider_handler'),('wifi','wifi_network_list')]:
    name=f'panels/{panel}/{module}'
    relative=f'js/panels/{panel}/panel.js'
    original=ROOT/'assets/webapps/settings.gaiamobile.org'/relative
    source=ROOT/'overrides/settings.gaiamobile.org'/f'js/{name}.js'
    text=source.read_text()
    dependencies=list(dict.fromkeys(re.findall(r"require\(['\"]([^'\"]+)['\"]\)",text)))
    import json
    text=text.replace('define(function(require)', 'define('+repr(name)+','+json.dumps(['require',*dependencies])+',function(require)',1)
    bundle=original.read_text()
    start=bundle.index("define('"+name+"'")
    end=bundle.find("define('",start+8)
    if end<0:end=len(bundle)
    target=ROOT/'overrides/settings.gaiamobile.org'/relative
    target.write_text(bundle[:start]+text+'\n'+bundle[end:])
    print(target.relative_to(ROOT))
