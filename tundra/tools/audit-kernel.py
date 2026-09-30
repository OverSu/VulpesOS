#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Inspect the embedded configuration of our pinned sargo kernel, without a phone."""
import json
from pathlib import Path
import subprocess
import zlib
from tundra import ROOT, digest, now, save


def inspect(path):
    # The AOSP artifact appends device trees to an LZ4 stream. lz4 reports trailing
    # data, so validate the embedded gzip/config payload rather than its exit code.
    result = subprocess.run(['lz4','-dc',str(path)],capture_output=True,check=False)
    start=result.stdout.find(b'IKCFG_ST')
    if start<0: raise ValueError('Kernel has no embedded IKCONFIG signature')
    stream=zlib.decompressobj(31)
    raw=stream.decompress(result.stdout[start+8:])
    if not stream.eof or not stream.unused_data.startswith(b'IKCFG_ED'):
        raise ValueError('Invalid compressed kernel config or terminator')
    config=raw.decode()
    if not config.startswith('#\n# Automatically generated file; DO NOT EDIT.'):
        raise ValueError('Unexpected kernel config format')
    values={}
    for line in config.splitlines():
        if line.startswith('CONFIG_'):
            key,value=line.split('=',1);values[key]=value
        elif line.startswith('# CONFIG_') and line.endswith(' is not set'):
            values[line.split()[1]]='n'
    keys=['CONFIG_ARM64','CONFIG_DEVTMPFS','CONFIG_CONFIGFS_FS','CONFIG_USB_DWC3',
          'CONFIG_USB_DWC3_MSM','CONFIG_USB_CONFIGFS','CONFIG_USB_CONFIGFS_ACM',
          'CONFIG_USB_CONFIGFS_F_FS','CONFIG_PSTORE','CONFIG_PSTORE_RAM','CONFIG_PSTORE_CONSOLE']
    return config,{key:values.get(key,'absent') for key in keys}


def main():
    # Source layout is owned by the common tooling.
    from tundra import locked
    commit=locked('aosp-sargo-kernel')['commit']
    path=ROOT/'downloads/aosp-sargo-kernel'/commit/'Image.lz4-dtb'
    config,features=inspect(path)
    folder=ROOT/'out/sargo';folder.mkdir(parents=True,exist_ok=True)
    (folder/'kernel.config').write_text(config)
    report={'recordedAt':now(),'kernelSha256':digest(path),'sourceCommit':commit,
            'features':features,'hardwareTested':False,
            'usbDiagnosticReady':False,
            'conclusions':['USB FunctionFS is compiled in; an actual userspace service is still needed.',
                           'USB ACM is not compiled in; a generic ttyGS0 console will not work with this prebuilt.',
                           'devtmpfs is not compiled in; Android uevent/device-node handling must be provided.',
                           'pstore support does not prove reserved RAM works on this phone.']}
    save(folder/'kernel-audit.json',report)
    print(json.dumps(report,indent=2))

if __name__=='__main__': main()
