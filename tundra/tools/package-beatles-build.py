#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Assemble private boot/runtime artifacts without including phone profiles."""
import argparse
import hashlib
import io
import json
import subprocess
from pathlib import Path
import tarfile

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/'tundra/out/beatles/gecko-156.0.1'


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def add_beatles_t9(files):
    dictionaries=sorted((ROOT/'tundra/devices/beatles/t9').glob('*.tsv'))
    if len(dictionaries)!=42:
        raise ValueError('Expected the 42 bundled Gaia T9 lexicons')
    for path in dictionaries:
        files['opt/vulpes/tundra/devices/beatles/t9/'+path.name]=path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build',type=Path,required=True)
    args=parser.parse_args();out=args.build.resolve()
    record=json.loads((out/'build.json').read_text())
    if record['device']!='beatles' or digest(out/record['image'])!=record['sha256']:raise ValueError('Boot build mismatch')
    if (out/'runtime.json').exists():raise ValueError('Runtime already packaged')
    engine=json.loads((ENGINE/'engine-staging.json').read_text())
    graphics=json.loads((ENGINE/'graphics-runtime.json').read_text())
    gaia=json.loads((ENGINE/'gaia-shared.json').read_text())
    sources={'engine-runtime.tar.gz':engine['archiveSha256'],
             'graphics-runtime.tar.gz':graphics['sha256'],'gaia-shared.tar.gz':gaia['sha256']}
    for name,expected in sources.items():
        path=ENGINE/name
        if digest(path)!=expected:raise ValueError('Input archive changed: '+name)
        # Use copy-on-write when available; future rebuilds must not mutate this artifact.
        subprocess.run(["cp","--reflink=auto",str(path),str(out/name)],check=True)
    files={}
    for directory in ('host','services','adapters'):
        for p in sorted((ROOT/directory).rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts:
                files['opt/firefox/vulpes/'+str(p.relative_to(ROOT))]=p
                if directory=='host':
                    files['opt/vulpes/'+str(p.relative_to(ROOT))]=p
    files['opt/firefox/vulpes/tests/BeatlesAudit.sys.mjs']=ROOT/'tundra/devices/beatles/gaia-audit.sys.mjs'
    files['opt/firefox/vulpes/tests/ProbeChild.sys.mjs']=ROOT/'tests/ProbeChild.sys.mjs'
    files['opt/vulpes/assets/webapps/settings.gaiamobile.org/js/modules/wifi_utils.js']=ROOT/'assets/webapps/settings.gaiamobile.org/js/modules/wifi_utils.js'
    add_beatles_t9(files)
    for name in ('gaia-session.py','cover-display.py','radio_control.py','radio_status.py','call_audio.py','stream_volume.py','hardware_control.py','wifi_control.py','sms_pdu.py'):
        files['work/'+name]=ROOT/'tundra/devices/beatles'/name
    if digest(out/'control-client')!=record['controlClientSha256']:raise ValueError('Control relay build mismatch')
    files['work/control-client']=out/'control-client'
    files['work/keypad']=ENGINE/'keypad'
    files['etc/localtime']=Path('/usr/share/zoneinfo/UTC')
    directories={'work':0o1777,'tmp':0o1777,'proc':0o755,'sys':0o755,'dev':0o755,'run':0o755}
    archive=out/'trial-overlay.tar.gz'
    with tarfile.open(archive,'w:gz',compresslevel=1) as tar:
        for name,mode in directories.items():
            item=tarfile.TarInfo(name);item.type=tarfile.DIRTYPE;item.mode=mode;tar.addfile(item)
        for name,path in files.items():
            content=path.read_bytes();item=tarfile.TarInfo(name);item.size=len(content)
            item.mode=0o755 if name in ('work/keypad','work/control-client') else 0o644
            tar.addfile(item,io.BytesIO(content))
        content=b'exec /usr/bin/python3.11 /work/gaia-session.py\n'
        item=tarfile.TarInfo('work/display-test.sh');item.mode=0o644;item.size=len(content);tar.addfile(item,io.BytesIO(content))
    sources[archive.name]=digest(archive)
    result={'device':'beatles','engine':'156.0.1','runtimePath':record['runtimePath'],
        'archivesInExtractionOrder':['graphics-runtime.tar.gz','engine-runtime.tar.gz','gaia-shared.tar.gz','trial-overlay.tar.gz'],
        'archives':{name:{'sha256':sha,'bytes':(out/name).stat().st_size} for name,sha in sources.items()},
        'sourceFiles':{name:digest(path) for name,path in files.items()},
        'containsPhoneUserData':False,'privateDiagnosticBuild':True,'flashReady':False,
        'defaultTimezone':'UTC; staging may use the phone timezone',
        'requiresExistingVendorSystem':True}
    (out/'runtime.json').write_text(json.dumps(result,indent=2)+'\n')
    with (out/'SHA256SUMS').open('a') as f:
        for name,sha in sources.items():f.write(sha+'  '+name+'\n')
    print('Runtime archives assembled; no contacts, messages or device profile copied.')


if __name__=='__main__':main()
