#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Verify or boot the locally qualified Sargo development image in RAM."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from tundra import ROOT, digest


def qualified_build():
    pointer=json.loads((ROOT/'out/sargo-native-qualified.json').read_text())
    folder=(ROOT/pointer['directory']).resolve()
    folder.relative_to((ROOT/'out').resolve())
    report=folder/'qualification.json'
    if digest(report)!=pointer['qualificationSha256']:
        raise ValueError('Qualification report changed')
    qualification=json.loads(report.read_text())
    if not qualification['passed']:
        raise ValueError('Expected a qualified native boot')
    build=json.loads((folder/'build.json').read_text())
    if build.get('interactiveDiagnostics'):
        raise ValueError('Interactive diagnostic images must be launched explicitly with test-rescue-boot.py')
    if qualification['imageSha256']!=build['imageSha256']:
        raise ValueError('Image differs from the qualified build')
    for name,expected in qualification['evidenceSha256'].items():
        evidence=(folder/name).resolve();evidence.relative_to(folder)
        if digest(evidence)!=expected:
            raise ValueError('Qualification evidence changed: '+name)
    subprocess.run([sys.executable,str(ROOT/'tools/test-rescue-boot.py'),'--build',str(folder)],check=True)
    return folder


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--boot',action='store_true',help='Boot the connected inventoried Sargo, already in Fastboot')
    mode.add_argument('--collect',action='store_true',help='Collect the currently running RAM trial')
    parser.add_argument('--reboot-from-droidian',action='store_true',help='Use the existing authenticated SSH master to request Fastboot first')
    args=parser.parse_args()
    if args.reboot_from_droidian and not args.boot:
        parser.error('--reboot-from-droidian requires --boot')
    folder=qualified_build()
    print('Vulpes / Tundra Sargo — Gaia 2.7, Gecko 156.0.1',flush=True)
    build=json.loads((folder/'build.json').read_text())
    if build.get('persistentState'):
        installed = folder/'installation-validation.json'
        if installed.is_file() and json.loads(installed.read_text()).get('passed'):
            print('Cette image est installée dans boot_a : un démarrage normal lance Vulpes.',flush=True)
            print('Cet outil vérifie le candidat ou lance un essai RAM avec --boot ; il ne flashe pas.',flush=True)
        else:
            print('Essai du noyau par Fastboot ; données Tundra persistantes. Aucun flash.',flush=True)
        if build['watchdogSeconds'] is None and not installed.is_file():
            print('Pas de redémarrage automatique. Sans installation, un reboot revient au système conservé.',flush=True)
    else:
        print('Essai en RAM de 10 minutes, puis retour à Droidian. Aucun flash.',flush=True)
    if args.reboot_from_droidian:
        spec=importlib.util.spec_from_file_location('boot',ROOT/'tools/test-sargo-boot.py')
        boot=importlib.util.module_from_spec(spec);spec.loader.exec_module(boot)
        plan,_=boot.checked_plan();boot.reboot_from_droidian(plan)
    if args.boot:
        subprocess.run([sys.executable,str(ROOT/'tools/test-rescue-boot.py'),'--build',str(folder),'--boot'],check=True)
    elif args.collect:
        subprocess.run([sys.executable,str(ROOT/'tools/rescue-ssh.py'),'--build',str(folder),'--collect'],check=True)
    else:
        print('Vérification locale terminée. Utiliser --boot pour démarrer depuis Fastboot.')


if __name__=='__main__':
    try:main()
    except (OSError,ValueError,RuntimeError,subprocess.CalledProcessError) as error:
        sys.exit(str(error))
