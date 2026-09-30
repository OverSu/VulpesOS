// SPDX-License-Identifier: MPL-2.0
// Guest-only smoke test. Never opens a Firefox browser/debugger window.
import { setTimeout } from 'resource://gre/modules/Timer.sys.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function run(win) {
  const report = {passed:false, checks:{}, engine:{
    version:Services.appinfo.platformVersion, buildID:Services.appinfo.appBuildID,
    OS:Services.appinfo.OS}};
  const test = Services.env.get('TUNDRA_TEST') === '1';
  if(test) {
    report.pointerEvents=[];
    for(const type of ['mousemove','mousedown','mouseup','click']) {
      win.addEventListener(type,event=>{
        report.pointerEvents.push({type,x:event.clientX,y:event.clientY,
          target:event.target.id,trusted:event.isTrusted});
        if(report.pointerEvents.length>20) report.pointerEvents.shift();
      },true);
    }
  }
  async function evaluate(app, code) {
    const prefix = `http://${app}.localhost:8765/`;
    function find(c) {
      if(c.currentWindowGlobal?.documentURI.spec.startsWith(prefix)) return c;
      for(const child of c.children) { const found=find(child); if(found) return found; }
      return null;
    }
    const context = win.document.querySelector('browser')?.browsingContext;
    const child = context && find(context);
    if(!child) return null;
    return child.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',code);
  }
  async function wait(app, code) {
    let last;
    for(let attempt=0;attempt<120;attempt++) {
      try { last=await evaluate(app,code); if(last) return last; }
      catch(error) {last=String(error);}
      await sleep(500);
    }
    throw new Error(`${app}: timed out: ${code}: ${last}`);
  }
  try {
    const lock=await IOUtils.readJSON('/opt/vulpes/engine-lock.json');
    if(report.engine.version!==lock.version) throw new Error('Wrong Gecko version');
    ChromeUtils.registerWindowActor('VulpesProbe',{
      child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},
      allFrames:true,safeForUntrustedWebProcess:true});
    report.checks.system=await wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';");
    report.checks.home=await wait('homescreen',"return document.readyState==='complete' && document.body.innerText.length>0;");
    report.checks.bootLogoHidden=await wait('system',"const logo=document.getElementById('os-logo');return !logo || getComputedStyle(logo).opacity==='0';");
    report.checks.visible=await wait('system',"return document.visibilityState==='visible';");
    if(test) {
      for(const app of ['settings','clock']) {
        await evaluate('system',`await VulpesCompat.call('apps.launch',{manifestURL:'http://${app}.localhost:8765/manifest.webapp',entryPoint:null});return true;`);
        await wait(app,"return document.readyState==='complete' && document.body.innerText.length>20;");
        report.checks[app]=await wait('system',`return [...document.querySelectorAll('.appWindow.active[transition-state=opened] iframe')].some(f=>f.src.startsWith('http://${app}.localhost:8765/'));`);
      }
      // This signal requests a real host QMP input, not a synthetic DOM click.
      dump('TUNDRA_POINTER_HOME\n');
      report.checks.pointerHome=await wait('system',`return !!document.querySelector('.appWindow.active[transition-state=opened] iframe[src*="homescreen.localhost"]');`);
      await sleep(2000);
    }
    report.passed=true;
  } catch(error) {
    report.host={visibility:win.document.visibilityState,active:win.document.querySelector('browser')?.docShellIsActive,layers:win.document.querySelector('browser')?.renderLayers};
    report.error=String(error)+'\n'+error.stack;
    try {report.state=await evaluate('system',"return {visibility:document.visibilityState,logo:document.getElementById('os-logo')?.className,apps:[...document.querySelectorAll('.appWindow')].map(e=>({id:e.id,state:e.getAttribute('transition-state')}))};");} catch(_) {}
  }
  await IOUtils.writeJSON('/var/log/tundra/test.json',report);
  dump('TUNDRA_GUI_TEST '+JSON.stringify(report)+'\n');
  if(test && report.passed) setTimeout(()=>Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit),15000);
}
