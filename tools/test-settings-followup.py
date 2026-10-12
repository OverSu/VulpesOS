#!/usr/bin/env python3
import json,sys
from pathlib import Path
from marionette_client import Client
ROOT=Path(__file__).resolve().parents[1]
with Client(2857) as c:
 c.socket.settimeout(180)
 c.call("WebDriver:SetTimeouts",{"script":150000})
 c.execute('Services.prefs.setBoolPref("media.navigator.streams.fake",true);Services.prefs.setBoolPref("media.navigator.permission.fake",true);const p=Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI("http://camera.localhost:8765"),{});for(const kind of ["camera","microphone"])Services.perms.addFromPrincipal(p,kind,Ci.nsIPermissionManager.ALLOW_ACTION);return true;')
 # The actor evaluation is the same mechanism used by the phone's private probe.
 source=(ROOT/'host/SettingsFollowupAudit.sys.mjs').read_text().replace('export async function','async function',1)
 script='''const done=arguments[arguments.length-1];
try{ChromeUtils.registerWindowActor('VulpesProbe',{child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},allFrames:true,safeForUntrustedWebProcess:true});}catch(_){}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(app,code){const root=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext;function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://'+app+'.localhost:8765/'))return b;for(const c of b.children){const f=find(c);if(f)return f;}}const b=find(root);if(!b)throw Error('Missing '+app);return b.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',code);}
async function wait(app,code,timeout=15000){const end=Date.now()+timeout;let error;while(Date.now()<end){try{if(await evaluate(app,code))return true;}catch(e){error=e;}await sleep(150);}throw Error('Timeout '+app+' '+code+' '+(error||''));}
''' + '''
async function tap(app,selector){const point=await evaluate(app,`const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};`);const root=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext;function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith('http://'+app+'.localhost:8765/'))return b;for(const c of b.children){const f=find(c);if(f)return f;}}await find(root).currentWindowGlobal.getActor('VulpesProbe').sendQuery('MouseClick',point);}
''' + source+'''\nauditFollowup({evaluate,wait,sleep,tap,save:async data=>{await IOUtils.writeJSON(PathUtils.join(PathUtils.profileDir,'followup.json'),data);}}).then(done,e=>done({error:String(e)}));'''
 try:
  result=c.call('WebDriver:ExecuteAsyncScript',{'script':script,'args':[],'newSandbox':True,'sandbox':'system','scriptTimeout':150000})['value']
  print(json.dumps(result,indent=2))
  (ROOT/'logs/settings-followup-20261012/desktop-followup.json').write_text(json.dumps(result,indent=2)+'\n')
  if not result.get('passed'):sys.exit(1)
 finally:c.execute('Services.prefs.clearUserPref("media.navigator.streams.fake");Services.prefs.clearUserPref("media.navigator.permission.fake");return true;')
