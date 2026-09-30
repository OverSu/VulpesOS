#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Resolve the upstream Gonk reference manifest; no source checkout or build."""
import argparse
import concurrent.futures
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

from tundra import ROOT, checked_source, flatten_manifest, locked, now, save


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=("sargo", "emulator-10"), default="sargo")
    parser.add_argument("--jobs", type=int, default=4)
    args = parser.parse_args()
    if not 1 <= args.jobs <= 8:
        parser.error("Use 1 to 8 network workers")
    folder = checked_source("capyloon-manifests")
    projects = flatten_manifest(folder, args.target + ".xml")
    destination = ROOT / "out" / args.target
    report_file = destination / "resolved-reference.json"
    manifest_file = destination / "reference-pinned.xml"
    # Never leave an earlier, apparently valid manifest after a failed resolution.
    manifest_file.unlink(missing_ok=True)
    prior = json.loads(report_file.read_text()) if report_file.exists() else {}
    cache = {(x["url"], x["revision"]): x for x in prior.get("projects", []) if x.get("commit")}

    def resolve(project):
        item = dict(project)
        key = (item["url"], item["revision"])
        if key in cache:
            return dict(item, commit=cache[key]["commit"])
        ref = item["revision"]
        if re.fullmatch(r"[0-9a-f]{40}", ref or ""):
            # Already pinned upstream; the object will be checked when fetched.
            return dict(item, commit=ref, verification="upstream-pin; object not fetched")
        patterns = [ref, ref + "^{}"] if ref.startswith("refs/") else ["refs/heads/" + ref, "refs/tags/" + ref, "refs/tags/" + ref + "^{}"]
        try:
            p = subprocess.run(["git", "ls-remote", item["url"], *patterns],
                               env=dict(os.environ, GIT_TERMINAL_PROMPT="0"),
                               capture_output=True, text=True, timeout=45, check=True)
            refs = [line.split() for line in p.stdout.splitlines()]
            if not refs:
                raise ValueError("Upstream revision does not exist")
            commit = next((sha for sha, name in refs if name.endswith("^{}")), refs[0][0])
            if not re.fullmatch(r"[0-9a-f]{40}", commit):
                raise ValueError("Invalid upstream object ID")
            return dict(item, commit=commit)
        except (ValueError, subprocess.SubprocessError) as error:
            detail = getattr(error, "stderr", None) or str(error)
            return dict(item, error=detail[-1500:])

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(resolve, project) for project in projects]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            save(report_file, {"recordedAt": now(), "complete": False,
                               "manifestCommit": locked("capyloon-manifests")["commit"],
                               "projects": results})
            if len(results) % 25 == 0:
                print(f"Resolved {len(results)}/{len(projects)} references", flush=True)
    results.sort(key=lambda x: x["path"])
    errors = [x for x in results if "error" in x]
    save(report_file, {"recordedAt": now(), "complete": not errors,
                       "manifestCommit": locked("capyloon-manifests")["commit"],
                       "target": args.target, "referenceOnly": True, "projects": results})
    if errors:
        for item in errors:
            print(f"Unavailable: {item['path']}: {item['error']}")
        return 1
    root = ET.Element("manifest")
    revisions = {x["path"]: x["commit"] for x in results}

    def expand(name):
        for element in ET.parse(folder / name).getroot():
            if element.tag == "include":
                expand(element.attrib["name"])
            else:
                element = copy.deepcopy(element)
                if element.tag == "project":
                    element.set("revision", revisions[element.get("path", element.attrib["name"])])
                root.append(element)

    expand(args.target + ".xml")
    ET.indent(root)
    ET.ElementTree(root).write(manifest_file, encoding="utf-8", xml_declaration=True)
    print(f"Pinned reference manifest: {manifest_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
