#!/usr/bin/env python3
"""Verify welcome translations against Gaia settings in the isolated PC host."""
import importlib.util
import json
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("probe", ROOT / "tools/probe-desktop.py")
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
results = {}
with Client(2857) as client:
    probe.register(client)
    def evaluate(code):
        response = probe.evaluate(client, "search", code, "/newtab.html")
        assert "error" not in response, response
        return response.get("value")

    probe.evaluate(client, "system", 'await VulpesCompat.call("apps.launch",{manifestURL:"http://search.localhost:8765/manifest.webapp"});return true;')
    time.sleep(2)
    previous = evaluate('return (await VulpesCompat.call("settings.get",{key:"language.current"})).value;')
    try:
        for language, expected in [("fr", "fr"), ("fr-BE", "fr"), ("fr-CA", "fr"), ("en-US", "en"), ("de", "en"), ("fr", "fr")]:
            evaluate('await VulpesCompat.call("settings.set",{values:{"language.current":' + json.dumps(language) + '}});return true;')
            for attempt in range(40):
                state = evaluate('const d=document.getElementById("vulpes-local-home")?.contentDocument;return {language:d?.documentElement.lang,heading:d?.querySelector("h1")?.textContent};')
                if state and state.get("language") == expected:
                    break
                time.sleep(.1)
            assert state["language"] == expected, (language, state)
            results[language] = state
    finally:
        evaluate('await VulpesCompat.call("settings.set",{values:{"language.current":' + json.dumps(previous) + '}});return true;')
(ROOT / "logs/welcome-languages.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(results, ensure_ascii=False, indent=2))
