#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Install the common product and generated session configuration in a staged root."""
import argparse
import os
from pathlib import Path
import shutil


def prepare(root, product, uid):
    if not (root.parent/(root.name+'-stage.json')).is_file():
        raise ValueError('Expected a staged runtime reference')
    target = root/'opt/vulpes'
    for name in ('assets','host','services','adapters','overrides','gaia','tools',
                 'tests','engines','trial','engine-lock.json','release.json'):
        source, destination = product/name, target/name
        if source.is_dir():
            shutil.copytree(source,destination,dirs_exist_ok=True,symlinks=True,
                            ignore=shutil.ignore_patterns('__pycache__'))
        else:
            shutil.copy2(source,destination)
    (target/'logs').mkdir(exist_ok=True)
    (root/'home/droidian').mkdir(exist_ok=True)
    (root/'etc/passwd').write_text(f'root:x:0:0:root:/root:/bin/bash\ndroidian:x:{uid}:{uid}:Vulpes trial:/home/droidian:/bin/bash\n')
    (root/'etc/group').write_text(f'root:x:0:\ndroidian:x:{uid}:\n')
    for name in ('system','vendor'):
        path=root/name
        if not path.is_symlink() and not path.exists():path.symlink_to('android/'+name)
    # D-Bus uses /usr/share/dbus-1/*.conf. Do not alias those files into /etc:
    # the packaged defaults include the optional /etc override themselves.
    (root/'etc/dbus-1').mkdir(exist_ok=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,required=True)
    parser.add_argument('--product',type=Path,required=True)
    args=parser.parse_args()
    if os.getuid()==0:parser.error('Prepare as the unprivileged trial user')
    prepare(args.root.resolve(),args.product.resolve(),os.getuid())


if __name__=='__main__':main()
