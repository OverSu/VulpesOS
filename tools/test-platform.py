#!/usr/bin/env python3
"""Exercise shared platform calls in Gaia with a simulated desktop webcam."""

import importlib.util, json, time
from pathlib import Path
from marionette_client import Client
from project import release_info

spec = importlib.util.spec_from_file_location("probe", Path(__file__).with_name("probe-desktop.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
ROOT = Path(__file__).resolve().parents[1]
results = {}
product_version = release_info()["version"]
with Client(2857) as c:
    probe.register(c)

    def ev(app, code):
        result = probe.evaluate(c, app, code)
        if "error" in result:
            raise AssertionError(result)
        return result.get("value")

    def wait(app, code):
        for _ in range(100):
            result = ev(app, code)
            if result:
                return result
            time.sleep(0.15)
        raise TimeoutError(app + ": " + code)

    def launch(app):
        ev(
            "system",
            f'await VulpesCompat.call("apps.launch",{{manifestURL:"http://{app}.localhost:8765/manifest.webapp"}});return true;',
        )
        wait(app, 'return document.readyState==="complete" && !!window.VulpesCompat;')

    wait(
        "system",
        'return document.readyState==="complete" && !!document.querySelector(".appWindow.active iframe");',
    )
    results["capabilities"] = ev(
        "system", 'return await VulpesCompat.call("platform.capabilities",{});'
    )
    assert results["capabilities"]["version"] == product_version
    launch("gallery")
    results["permission_boundary"] = ev(
        "gallery",
        'try{await VulpesCompat.call("platform.settings",{panel:"root"});return false;}catch(e){return e.message==="PERMISSION_DENIED";}',
    )
    assert results["permission_boundary"]
    launch("settings")
    c.execute(
        'const p=Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI("http://settings.localhost:8765"),{});Services.perms.addFromPrincipal(p,"desktop-notification",Ci.nsIPermissionManager.ALLOW_ACTION);return true;'
    )
    results["notification_id"] = ev(
        "settings",
        'return await VulpesCompat.call("platform.notification",{operation:"show",title:"Vulpes — test",body:"Desktop notification",tag:"parity-test"});',
    )
    assert isinstance(results["notification_id"], int), results
    results["notification_list"] = ev(
        "settings", 'return await VulpesCompat.call("platform.notification",{operation:"list"});'
    )
    assert any(n["id"] == results["notification_id"] for n in results["notification_list"])
    ev(
        "settings",
        f'await VulpesCompat.call("platform.notification",{{operation:"close",id:{results["notification_id"]}}});return true;',
    )
    ev("settings", "document.querySelector('a[href=\"#about\"]').click();return true;")
    results["settings_version"] = wait(
        "settings", 'return document.getElementById("vulpes-system-info")?.textContent;'
    )
    assert product_version in results["settings_version"]
(ROOT / "logs/platform-desktop-results.json").write_text(
    json.dumps(results, indent=2, ensure_ascii=False) + "\n"
)
print(json.dumps(results, indent=2, ensure_ascii=False))
