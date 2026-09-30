#!/usr/bin/env python3
"""Static inventory of the preserved, actually launched Gaia profile."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
apps = root / "assets/webapps"
report = {
    "source": "assets/webapps",
    "note": "Static references, including definitions: not a count of mandatory calls.",
    "navigatorAPIs": {},
    "legacyCustomElementFiles": [],
    "apps": {},
}
for f in apps.rglob("*"):
    if f.suffix not in (".js", ".html", ".webapp") or not f.is_file():
        continue
    s = f.read_text(errors="replace")
    rel = str(f.relative_to(apps))
    for api in set(re.findall(r"navigator\.(moz\w+|getDataStores)", s)):
        info = report["navigatorAPIs"].setdefault(api, {"fileCount": 0, "examples": []})
        info["fileCount"] += 1
        if len(info["examples"]) < 3:
            info["examples"].append(rel)
    if "registerElement(" in s:
        report["legacyCustomElementFiles"].append(rel)
    if f.name == "manifest.webapp" and f.parent.parent == apps:
        try:
            d = json.loads(s)
            report["apps"][f.parent.name] = {
                "name": d.get("name"),
                "permissions": d.get("permissions", {}),
                "activities": list(d.get("activities", {})),
            }
        except ValueError:
            pass
out = root / "docs/legacy-dependencies.json"
out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
print(
    len(report["navigatorAPIs"]),
    "APIs referenced;",
    len(report["apps"]),
    "apps;",
    len(report["legacyCustomElementFiles"]),
    "files referencing Custom Elements v0",
)
