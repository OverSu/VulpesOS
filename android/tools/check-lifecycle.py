#!/usr/bin/env python3
"""Exercise Android background/resume and renderer termination on a test device."""
import importlib.util,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'android/tools'))
spec=importlib.util.spec_from_file_location('probe',ROOT/'android/tools/probe-android.py');probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
from rdp import RDP
ADB=str(ROOT/'android/toolchain/sdk/platform-tools/adb')
def adb(*args):return subprocess.check_output([ADB,*args],text=True).strip()
def wait_app():
 end=time.monotonic()+30
 while time.monotonic()<end:
  try:
   result=probe.run('system','({ready:document.readyState,marker:window.__lifecycleMarker,frames:[...document.querySelectorAll("iframe")].map(f=>f.src)})')
   if result.get('value',{}).get('ready')=='complete':return result['value']
  except (Exception,):pass
  time.sleep(.5)
 raise TimeoutError('Gaia did not recover')
report={}
adb('shell','am','start','-n','org.vulpes_os.preview/.MainActivity')
wait_app();probe.run('system','window.__lifecycleMarker="lifecycle-20260924"')
cycles=[]
for i in range(10):
 adb('shell','input','keyevent','KEYCODE_HOME')
 adb('shell','am','start','-a','android.settings.SETTINGS')
 time.sleep(.5)
 adb('shell','am','start','-n','org.vulpes_os.preview/.MainActivity')
 state=wait_app();cycles.append(state['marker']=='lifecycle-20260924')
 print('Resume cycle',i+1,cycles[-1],flush=True)
assert all(cycles),cycles
report['ten_switches_preserve_document']=cycles
r=RDP();tab=next(t for t in r.call('root','listTabs')['tabs'] if 'system.localhost' in t.get('url',''));target=r.call(tab['actor'],'getTarget')['frame'];r.s.close()
pid=str(target['processID']);name=adb('shell','ps','-p',pid,'-o','NAME')
assert 'org.vulpes_os.preview:tab' in name,name
adb('shell','input','keyevent','KEYCODE_HOME');adb('shell','run-as','org.vulpes_os.preview','kill','-9',pid)
time.sleep(.5);adb('shell','am','start','-n','org.vulpes_os.preview/.MainActivity')
state=wait_app();assert state.get('marker') is None,state
for _ in range(30):
 try:
  home=probe.run('homescreen','({icons:document.querySelectorAll("gaia-app-icon").length,ready:document.readyState})')['value']
  if home['icons']>10:break
 except Exception:pass
 time.sleep(.5)
assert home['icons']>10,home
report['renderer_killed_in_background_recovers']=home
report['snapshot']=probe.run('system','VulpesCompat.call("android.snapshot",{})')['value']
report['scope']='Android 16 x86_64 emulator; not a physical-device validation.'
(ROOT/'android/logs/integration/lifecycle.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
