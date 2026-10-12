#!/usr/bin/env python3
"""Refresh selected AMD modules inside Gaia's existing Settings panel bundles."""
from pathlib import Path
import re
import json
import subprocess
import shutil
ROOT=Path(__file__).resolve().parents[1]
modules = [
    ('panels/wifi_status/panel', 'js/panels/wifi_status/panel.js'),
    ('panels/display/slider_handler', 'js/panels/display/panel.js'),
    ('panels/wifi/wifi_network_list', 'js/panels/wifi/panel.js'),
    ('modules/page_transitions', 'js/main.js'),
    ('modules/settings_service', 'js/main.js'),
    ('modules/dialog_service', 'js/modules/dialog_service.js'),
    ('modules/dialog_manager', 'js/modules/dialog_service.js'),
    ('modules/date_time', 'js/modules/date_time.js'),
    ('panels/downloads/download_api_manager', 'js/panels/downloads/panel.js'),
    ('panels/help/support', 'js/panels/help/panel.js'),
]
names=list(dict.fromkeys(name for name,relative in modules))
base=ROOT/'assets/webapps/settings.gaiamobile.org'
for script in (base/'js').rglob('*.js'):
    if script.is_symlink(): continue
    bundle=script.read_text()
    for name in names:
        pair=(name,str(script.relative_to(base)))
        if pair not in modules and re.search(r"define\(\s*['\"]"+re.escape(name)+r"['\"]",bundle):
            modules.append(pair)
for name, relative in modules:
    original=ROOT/'assets/webapps/settings.gaiamobile.org'/relative
    source=ROOT/'overrides/settings.gaiamobile.org'/f'js/{name}.js'
    if not source.exists():
        source=ROOT/'gaia/apps/settings'/f'js/{name}.js'
    if name.startswith('modules/') or source == ROOT/'overrides/settings.gaiamobile.org'/relative:
        source=ROOT/'gaia/apps/settings'/f'js/{name}.js'
    text=source.read_text()
    dependencies=list(dict.fromkeys(re.findall(r"require\(['\"]([^'\"]+)['\"]\)",text)))
    import json
    if 'define(function(require)' in text:
        text=text.replace('define(function(require)', 'define('+repr(name)+','+json.dumps(['require',*dependencies])+',function(require)',1)
    else:
        text=text.replace('define(function()', 'define('+repr(name)+',[],function()',1)
    target=ROOT/'overrides/settings.gaiamobile.org'/relative
    bundle=(target if target.exists() else original).read_text()
    if not re.search(r"define\(\s*['\"]"+re.escape(name)+r"['\"]",bundle):
        raise ValueError('AMD module missing from target: '+name+' / '+relative)
    node='/usr/bin/node' if Path('/usr/bin/node').exists() else shutil.which('node')
    selected=target if target.exists() else original
    start,end=json.loads(subprocess.check_output([node,str(ROOT/'tools/amd-module-range.cjs'),str(selected),name],text=True))
    target=ROOT/'overrides/settings.gaiamobile.org'/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    definition=text[text.index('define('):].rstrip()
    target.write_text(bundle[:start]+definition+'\n'+bundle[end:])
    print(target.relative_to(ROOT))
