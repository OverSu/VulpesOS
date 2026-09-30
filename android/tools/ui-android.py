#!/usr/bin/env python3
"""Read or tap a labeled Android accessibility node on the connected test device."""
import re,sys,subprocess,xml.etree.ElementTree as E
from pathlib import Path
adb=str(Path(__file__).resolve().parents[1]/'toolchain/sdk/platform-tools/adb')
subprocess.run([adb,'shell','uiautomator','dump','/sdcard/vulpes-ui.xml'],stdout=subprocess.DEVNULL,check=True)
nodes=list(E.fromstring(subprocess.check_output([adb,'shell','cat','/sdcard/vulpes-ui.xml'],text=True)).iter('node'))
if len(sys.argv)>1:
 needle=sys.argv[1]
 for n in nodes:
  if needle in (n.get('text'),n.get('content-desc'),n.get('resource-id')):
   x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
   subprocess.run([adb,'shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True);print('Tapped:',needle);break
 else:raise SystemExit('Node not found: '+needle)
else:
 for n in nodes:
  if n.get('text') or n.get('clickable')=='true':print(n.get('text'),n.get('content-desc'),n.get('resource-id'),n.get('bounds'))
