#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Compare local backup hashes with read-only hashes computed on the Nokia."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from kaios_debug import KaiOSDebugger


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    args = parser.parse_args()
    report = json.loads((args.folder / 'backup.json').read_text())
    lines = subprocess.check_output(['adb', 'devices', '-l'], text=True).splitlines()
    serials = [line.split()[0] for line in lines if len(line.split()) > 2
               and line.split()[1] == 'device' and 'model:Nokia_2720_Flip' in line.split()]
    if len(serials) != 1:
        raise RuntimeError('Exactly one connected Nokia 2720 Flip is required')
    codename = subprocess.check_output(['adb', '-s', serials[0], 'shell',
                                       'getprop ro.product.codename'], text=True).strip()
    if codename != 'beatles' or report['device'] != codename:
        raise RuntimeError('Device mismatch')
    results = {}
    with KaiOSDebugger(serials[0]) as client:
        console = client.request('root', 'getProcess', id=0)['form']['consoleActor']
        for name in ('boot', 'recovery', 'aboot', 'abootbak'):
            entry = report['partitions'][name]
            path = args.folder / (name + '.img')
            if path.stat().st_size != entry['bytes']:
                raise RuntimeError('Backup size mismatch: ' + name)
            with path.open('rb') as stream:
                local = hashlib.file_digest(stream, 'sha256').hexdigest()
            expression = '''(function(){
              var Cc=Components.classes,Ci=Components.interfaces;
              var f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              f.initWithPath(%s);
              var s=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
              s.init(f,1,0,0);
              try {
                var h=Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
                h.init(h.SHA256);h.updateFromStream(s,%d);
                var raw=h.finish(false),hex="";
                for(var i=0;i<raw.length;i++)hex+=("0"+raw.charCodeAt(i).toString(16)).slice(-2);
                return hex;
              } finally {s.close();}
            })()''' % (json.dumps('/dev/block/bootdevice/by-name/' + name), entry['bytes'])
            remote = client.evaluate(console, expression)
            if not (remote == local == entry['sha256']):
                raise RuntimeError('Partition hash mismatch: ' + name)
            results[name] = {'bytes': entry['bytes'], 'sha256': local, 'matchesDevice': True}
            print(name + ': local and device SHA256 match', flush=True)
    (args.folder / 'verification.json').write_text(json.dumps({
        'device': codename, 'method': 'device nsICryptoHash, read-only block stream',
        'restorationTested': False, 'partitions': results}, indent=2) + '\n')


if __name__ == '__main__':
    main()
