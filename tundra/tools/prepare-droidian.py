#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Stage the common Gaia host and a checked ARM64 engine for a Droidian trial."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tarfile
import subprocess
import sys

TUNDRA = Path(__file__).resolve().parents[1]
PROJECT = TUNDRA.parent
STAGE = TUNDRA / 'out/droidian/product'


def main():
    STAGE.mkdir(parents=True, exist_ok=True)
    for name in ('downloads', 'engines'):
        (STAGE/name).mkdir(exist_ok=True)
    spec = importlib.util.spec_from_file_location('fetch', PROJECT/'tools/fetch-engine.py')
    fetch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fetch)
    fetch.ROOT = STAGE
    lock = json.loads((PROJECT/'engine-lock.json').read_text())
    # Desktop qualification does not qualify an ARM64 runtime on Droidian.
    for field in ('qualificationReport', 'gaiaBoots'):
        lock.pop(field, None)
    version = lock['version']
    base = f'https://archive.mozilla.org/pub/firefox/releases/{version}/'
    relative = f'linux-aarch64/en-US/firefox-{version}.tar.xz'
    sums = fetch.read_url(base+'SHA512SUMS').decode()
    expected = next(line.split()[0] for line in sums.splitlines()
                    if len(line.split()) == 2 and line.split()[1] == relative)
    lock.update(archive=base+relative, sha512=expected,
                checksumSource=base+'SHA512SUMS', architecture='aarch64')
    (STAGE/'downloads/SHA512SUMS').write_text(sums)
    fetch.install(lock)
    (STAGE/'engines'/version/'engine.json').write_text(json.dumps(lock, indent=2)+'\n')
    for name in ('assets', 'host', 'services', 'adapters', 'overrides',
                 'gaia/shared', 'gaia/apps/system'):
        target = STAGE/name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(PROJECT/name, target,
                        ignore=shutil.ignore_patterns('__pycache__', 'test', 'tests'))
    for name in ('tools', 'tests'):
        (STAGE/name).mkdir(exist_ok=True)
    for name in ('serve-gaia.py', 'project.py', 'run-host.py'):
        shutil.copy2(PROJECT/'tools'/name, STAGE/'tools'/name)
    shutil.copy2(PROJECT/'tests/ProbeChild.sys.mjs', STAGE/'tests/ProbeChild.sys.mjs')
    shutil.copy2(PROJECT/'release.json', STAGE/'release.json')
    (STAGE/'engine-lock.json').write_text(json.dumps(lock, indent=2)+'\n')
    if (STAGE/'trial').exists():
        shutil.rmtree(STAGE/'trial')
    shutil.copytree(TUNDRA/'droidian', STAGE/'trial',
                    ignore=shutil.ignore_patterns('__pycache__'))
    subprocess.run([sys.executable,str(TUNDRA/'tools/build-droidian-graphics.py')],check=True)
    for name in ('libEGL_vulpes_hybris.so','manifest.json'):
        shutil.copy2(TUNDRA/'out/droidian-graphics'/name,STAGE/'trial/graphics'/name)
    archive = STAGE.parent/'vulpes-droidian.tar.gz'
    with tarfile.open(archive, 'w:gz', compresslevel=1) as tar:
        for item in sorted(STAGE.iterdir()):
            if item.name != 'downloads':
                tar.add(item, arcname=item.name)
    with archive.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    (archive.with_suffix('.json')).write_text(json.dumps({
        'archive': archive.name, 'sha256': digest, 'engine': lock,
        'scope': 'Unprivileged trial on the existing Droidian Wayland session; no boot image.'
    }, indent=2)+'\n')
    print(archive, digest, flush=True)


if __name__ == '__main__':
    main()
