#!/usr/bin/env python3
"""Restore original Gaia density variants discarded by the 1x packaged build."""
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
URL = re.compile(r'url\([\'\"]?([^\s)\'\"]+)[\'\"]?\)')
PROPERTY = re.compile(r'background(?:-image)?\s*:[^;{}]+;')


def main():
    report = []
    for packaged in sorted((ROOT/'assets/webapps').glob('**/*.css')):
        rel = packaged.relative_to(ROOT/'assets/webapps')
        app, *parts = rel.parts
        override = ROOT/'overrides'/rel
        text = (override if override.exists() else packaged).read_text()
        def declaration(match):
            value = match[0]
            if 'image-set(' in value:
                return value
            def image(found):
                name = found[1]
                if name.startswith(('data:', 'http:', 'https:')) or '@' in name:
                    return found[0]
                target = (packaged.parent/name).resolve() if not name.startswith('/') else ROOT/'assets/webapps'/app/name.lstrip('/')
                try:
                    asset = target.relative_to(ROOT/'assets/webapps'/app)
                except ValueError:
                    return found[0]
                source = ROOT/'gaia/apps'/app.removesuffix('.gaiamobile.org')/asset
                if asset.parts[0] == 'shared':
                    source = ROOT/'gaia'/asset
                variants = []
                for density in ('1.5', '2', '2.25'):
                    candidate = source.with_name(source.stem+'@'+density+'x'+source.suffix)
                    if candidate.is_file() and candidate.suffix == '.png':
                        dest = ROOT/'overrides'/app/asset.parent/candidate.name
                        dest.parent.mkdir(parents=True,exist_ok=True)
                        shutil.copyfile(candidate,dest)
                        url = str(Path(name).with_name(candidate.name))
                        variants.append(f'url("{url}") {density}x')
                if not variants:
                    return found[0]
                report.append({'stylesheet':str(rel),'image':name,'densities':len(variants)})
                return 'image-set('+f'url("{name}") 1x, '+', '.join(variants)+')'
            return URL.sub(image,value)
        updated = PROPERTY.sub(declaration,text)
        if updated != text:
            override.parent.mkdir(parents=True,exist_ok=True)
            override.write_text(updated)
    (ROOT/'logs/density-restoration.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'{len(report)} CSS image references restored from original Gaia variants')


if __name__ == '__main__':
    main()
