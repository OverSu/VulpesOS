#!/usr/bin/env python3
"""Exercise Gaia's transient banner in the isolated desktop host."""
import importlib.util
import json
from pathlib import Path
from marionette_client import Client
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('probe-desktop.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
with Client(2857) as client:
    probe.register(client)
    result = probe.evaluate(client, 'system', '''
await LazyLoader.load('js/system_banner.js');
const banner=new SystemBanner();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 await banner.show({id:'app-install-success',args:{appName:'Vulpes test'}});
 const shown=banner._banner.isConnected;
 await sleep(4900);
 const dismissed=!banner._banner.isConnected;
 await banner.show('app-install-success');
 await sleep(1000);
 await banner.show('app-install-success');
 await sleep(3300);
 const replacementRetained=banner._banner.isConnected;
 await sleep(1600);
 const replacementDismissed=!banner._banner.isConnected;
 await banner.show('app-install-success');
 banner._banner.click();
 await sleep(800);
 const clickDismissed=!banner._banner.isConnected;
 return {shown,dismissed,replacementRetained,replacementDismissed,clickDismissed};
} finally {await banner.hide();banner._banner?.remove();}
''')
    assert 'error' not in result, result
    checks=result['value']
    assert all(checks.values()), checks
    print(json.dumps(checks, indent=2))
