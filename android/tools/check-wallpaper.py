#!/usr/bin/env python3
"""Observe real Gaia wallpaper events over an ADB-forwarded debug connection."""
import json
import sys
import time
from rdp import RDP


def evaluate(source):
    r = RDP()
    try:
        result = r.eval(source)
        if result.get("hasException"):
            raise RuntimeError(result)
        return result.get("result")
    finally:
        r.s.close()


duration = int(sys.argv[1]) if len(sys.argv) > 1 else 30
evaluate(
    """window.__wallpaperProbe={changes:0,settings:0,start:Date.now()};
addEventListener('wallpaperchange',()=>__wallpaperProbe.changes++);
navigator.mozSettings.addObserver('wallpaper.image',()=>__wallpaperProbe.settings++);
navigator.mozSettings.createLock().get('wallpaper.image').onsuccess=e=>{
 const v=e.target.result['wallpaper.image'];
 __wallpaperProbe.image={blob:v instanceof Blob,size:v.size,type:v.type};
}; 'probe-started';"""
)
time.sleep(duration)
result = json.loads(
    evaluate(
        """JSON.stringify({...__wallpaperProbe,
 elapsed:Date.now()-__wallpaperProbe.start,ready:applications.ready,
 background:document.getElementById('screen').style.backgroundImage})"""
    )
)
print(json.dumps(result, indent=2))
assert result["ready"], "Gaia not ready"
assert result.get("image", {}).get("blob"), "Wallpaper was not restored as a Blob"
assert result["image"]["size"] > 0, "Empty wallpaper"
assert (
    result["changes"] == 0 and result["settings"] == 0
), "Wallpaper is still changing without user action"
assert "blob:" in result["background"], "Wallpaper missing from the screen"
