#!/usr/bin/env python3
"""Generate the public FR/EN changelogs from changelog.json (standard library only)."""
import argparse
import json
import os
from pathlib import Path
import re
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = {"fr": "CHANGELOG.md", "en": "CHANGELOG.en.md"}


def render(source):
    if source.get("schema") != 1 or not isinstance(source.get("entries"), list):
        raise ValueError("Unsupported changelog schema")
    ids = set()
    for entry in source["entries"]:
        identifier = entry["id"]
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", identifier) or identifier in ids:
            raise ValueError("Invalid or duplicate entry id: " + identifier)
        ids.add(identifier)
    if not ids:
        raise ValueError("The changelog must not be empty")
    documents = {}
    for language, filename in OUTPUTS.items():
        preamble = source["preamble"][language].strip()
        if not preamble.startswith("# "):
            raise ValueError("Missing preamble for " + language)
        sections = [preamble]
        for entry in source["entries"]:
            body = entry["text"][language].strip()
            if not body.startswith("## "):
                raise ValueError("Missing heading: " + entry["id"] + "/" + language)
            sections.append('<a id="' + entry["id"] + '"></a>\n\n' + body)
        documents[filename] = "\n\n".join(sections) + "\n"
    return documents


def generate(root=ROOT, check=False):
    documents = render(json.loads((root / "changelog.json").read_text(encoding="utf-8")))
    changed = []
    for filename, content in documents.items():
        path = root / filename
        if path.exists() and path.read_text(encoding="utf-8") == content:
            continue
        changed.append(filename)
        if check:
            continue
        descriptor, temporary = tempfile.mkstemp(prefix=".changelog-", dir=root)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
                stream.write(content)
            os.chmod(temporary, 0o644)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated files are out of date")
    args = parser.parse_args()
    try:
        changed = generate(check=args.check)
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        parser.exit(2, "Invalid changelog: " + str(error) + "\n")
    if changed:
        print(("Out of date: " if args.check else "Generated: ") + ", ".join(changed))
    return 1 if args.check and changed else 0


if __name__ == "__main__":
    raise SystemExit(main())
