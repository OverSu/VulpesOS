#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Cross-compile the local, version-pinned GLVND adapter; no system installation."""
import json
from pathlib import Path
import subprocess
from tundra import ROOT, digest, linker, now, save


def main():
    source = ROOT/'droidian/graphics/egl-config.c'
    folder = ROOT/'out/droidian-graphics'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder/'libEGL_vulpes_hybris.so'
    command = ['clang','--target=aarch64-linux-gnu',f'--ld-path={linker()}',
               '-ffreestanding','-fPIC','-shared','-nostdlib','-Os',
               '-Wall','-Wextra','-Werror','-I/usr/include',str(source),'-o',str(target)]
    subprocess.run(command, check=True)
    manifest = json.loads((ROOT/'droidian/graphics/vendor.json').read_text())
    manifest.update(adapterSha256=digest(target),sourceSha256=digest(source))
    save(folder/'manifest.json',manifest)
    save(folder/'build.json',{'recordedAt':now(),'command':command,
        'compiler':subprocess.check_output(['clang','--version'],text=True).splitlines()[0],
        'headers':{p:digest(Path('/usr/include')/p) for p in
            ['glvnd/libeglabi.h','glvnd/GLdispatchABI.h','EGL/egl.h','EGL/eglext.h','EGL/eglplatform.h','KHR/khrplatform.h']},
        'adapterSha256':digest(target)})
    print(target)


if __name__ == '__main__':
    main()
