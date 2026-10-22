// Opt-in hardware regression checks; never run during a normal boot.
export async function auditMediaFeedback({win, evaluate, wait, tap, sleep, save}) {
  const {Views}=ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs');
  const report={passed:false,checks:{},errors:{}};
  const assert=(value,message)=>{if(!value)throw Error(message);};
  const system=code=>evaluate('system','const rocketbar=core.appCore.rocketbar;'+code);
  const principal=Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI('http://camera.localhost:8765'),{});
  const previous=Services.perms.testExactPermissionFromPrincipal(principal,'microphone');
  try {
    win.focus();win.document.getElementById("system").focus();
    await system('ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;');
    await system('await rocketbar.activate();rocketbar.focus();return true;');
    await wait('system','return document.querySelector("#vulpes-gaia-keyboard")?.getBoundingClientRect().height>0;');
    await system('await VulpesCompat.call("input.request",{operation:"hide"});return true;');
    await wait('system','return document.querySelector("#vulpes-gaia-keyboard").hidden;');
    await system('rocketbar.focus();return true;');
    report.checks.refocusKeyboard=!!await wait('system','return !document.querySelector("#vulpes-gaia-keyboard").hidden;');
    await system('rocketbar.handleCancel();await VulpesCompat.call("input.request",{operation:"hide"});return true;');
    await wait('system','return !core.appCore.rocketbar.active && !core.appCore.rocketbar.isClosing;');
    await sleep(500);
    await system('dispatchEvent(new CustomEvent("activity-view",{detail:{source:{data:{type:"url",url:"https://duckduckgo.com/?q=vulpes"}}}}));return true;');
    await sleep(10000);
    report.views=[...Views.entries.values()].map(e=>({url:e.browser.currentURI.spec,visible:e.browser.style.visibility,rect:e.browser.getBoundingClientRect().toJSON()}));
    assert(report.views.some(v=>v.visible==='visible' && v.rect.height>0 && v.url.startsWith('https://duckduckgo.com/')),'DuckDuckGo view hidden');
    report.checks.searchVisible=true;
    const point=await system('const r=Service.query("getActiveApp").appChrome.title.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};');
    await evaluate('system',point,'Tap');
    report.checks.addressFirstTap=!!await wait('system','return !document.querySelector("#vulpes-gaia-keyboard").hidden && document.activeElement===core.appCore.rocketbar.input;');
    win.document.getElementById('home').click();
    await wait('system','return !core.appCore.rocketbar.active && !core.appCore.rocketbar.isClosing;');
    win.document.getElementById('home').click();
    await wait('system','return ["http://homescreen.localhost:8765","http://verticalhome.localhost:8765"].includes(Service.query("getActiveApp")?.origin);');
    await sleep(1000);
    assert([...Views.entries.values()].every(e=>e.browser.style.visibility==='hidden'),'External view covers Home');
    report.checks.homeReturns=true;
  } catch(error){report.errors.browser=String(error);}
  await save(report);
  try {
    Services.perms.removeFromPrincipal(principal,'microphone');
    await system('await VulpesCompat.call("apps.launch",{manifestURL:"http://camera.localhost:8765/manifest.webapp"});return true;');
    await wait('camera','return !!window.app?.camera?.mozCamera && !app.camera.isBusy;');
    await evaluate('camera','window.__lastVideo=null;app.once("newmedia",v=>{window.__lastVideo=v;});app.settings.mode.select("video");return true;');
    await wait('camera','return app.camera.mode==="video" && !app.camera.isBusy;');
    await sleep(500);
    await tap('camera','.js-capture');
    await wait('system','return document.getElementById("permission-screen").classList.contains("visible");',20000);
    report.permission=await system('const p=document.getElementById("permission-screen"),r=document.getElementById("permission-yes").getBoundingClientRect();return {type:p.dataset.type,button:r.toJSON(),height:innerHeight};');
    const bounds=win.document.getElementById('system').getBoundingClientRect();
    assert(report.permission.button.bottom<=bounds.height+1,'Permission button extends under the Home bar');
    await tap('system','#permission-yes');
    report.checks.gaiaPermission=true;
    await wait('camera','return app.camera.get("recording")==="started";',20000);
    await sleep(3000);
    await tap('camera','.js-capture');
    await wait('camera','return !!window.__lastVideo?.blob;',30000);
    report.video=await evaluate('camera',`const v=__lastVideo,el=document.createElement('video');el.muted=true;el.src=URL.createObjectURL(v.blob);try{await Promise.race([new Promise((ok,no)=>{el.onloadeddata=ok;el.onerror=()=>no(Error('Decode failed'));}),new Promise((_,no)=>setTimeout(()=>no(Error('Decode timeout')),10000))]);return {native:!!app.camera.mozCamera.vulpesNative,bytes:v.blob.size,type:v.blob.type,width:el.videoWidth,height:el.videoHeight,poster:v.poster.blob.size};}finally{URL.revokeObjectURL(el.src);el.remove();}`);
    assert(report.video.bytes>0 && report.video.width>0 && report.video.poster>0,'Invalid recording');
    report.checks.videoDecoded=true;
  } catch(error){report.errors.video=String(error);}
  finally {
    await system('if(document.getElementById("permission-screen").classList.contains("visible"))document.getElementById("permission-no").click();return true;').catch(()=>{});
    await evaluate('camera','app.camera.stopRecording();await app.camera.mozCamera?.vulpesFinishRecording?.();if(window.__lastVideo){await navigator.getDeviceStorage("videos").delete(__lastVideo.filepath);await navigator.getDeviceStorage("pictures").delete(__lastVideo.poster.filepath);}app.settings.mode.select("picture");return true;').catch(()=>{});
    if(previous===Ci.nsIPermissionManager.UNKNOWN_ACTION)Services.perms.removeFromPrincipal(principal,'microphone');
    else Services.perms.addFromPrincipal(principal,'microphone',previous);
    win.document.getElementById('home').click();
  }
  report.passed=Object.keys(report.errors).length===0;
  await save(report);return report;
}
