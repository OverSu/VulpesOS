#!/usr/bin/env python3
"""Update changed source modules in the existing Gaia Camera bundle."""
import json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'overrides/camera.gaiamobile.org/js/main.js'
dcf=ROOT/'overrides/camera.gaiamobile.org/js/lib/dcf.js'
dcf.parent.mkdir(parents=True,exist_ok=True)
dcf.write_text((ROOT/'gaia/apps/camera/js/lib/dcf.js').read_text())
for name in ['lib/storage','controllers/storage','controllers/activity']:
    source=(ROOT/'gaia/apps/camera/js'/f'{name}.js').read_text()
    deps=list(dict.fromkeys(re.findall(r"require\(['\"]([^'\"]+)['\"]\)",source)))
    source=source.replace('define(function(require, exports, module)', 'define('+json.dumps(name)+','+json.dumps(['require','exports','module',*deps])+',function(require, exports, module)',1)
    start,end=json.loads(subprocess.check_output(['/usr/bin/node',str(ROOT/'tools/amd-module-range.cjs'),str(TARGET),name],text=True))
    bundle=TARGET.read_text();TARGET.write_text(bundle[:start]+source[source.index('define('):].rstrip()+'\n'+bundle[end:])
subprocess.run(['/usr/bin/node','--check',str(TARGET)],check=True)
