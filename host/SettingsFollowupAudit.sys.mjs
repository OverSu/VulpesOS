// Private qualification entry point, invoked only by a test marker/profile.
export async function auditFollowup({evaluate,wait,sleep,save,tap}) {
  const report={checks:{},errors:{},mediaRetained:false};
  const launch=async app=>{
    await evaluate('system',`ScreenManager.turnScreenOn(true);if(Service.query('locked'))await Service.request('unlock',{forcibly:true});await VulpesCompat.call('apps.launch',{manifestURL:'http://${app}.localhost:8765/manifest.webapp'});return true;`);
    await wait(app,'return document.readyState==="complete" && !document.hidden;');
    await wait('system',`return Service.query('getActiveApp')?.origin==='http://${app}.localhost:8765';`);
  };
  await wait('system',`return document.body?.getAttribute('ready-state')==='fullyLoaded';`,30000);
  await sleep(1000);
  try {
    await launch('settings');await wait('settings','return typeof require==="function";');
    await evaluate('settings',`const s=await new Promise(r=>require(['modules/settings_service'],r));await s.navigate('dateTime');return true;`);
    await sleep(800);
    // Test the actual Gaia picker without changing the user's system clock.
    await evaluate('settings',`if(!navigator.mozTime){window.__testClockInstalled=true;Object.defineProperty(navigator,'mozTime',{value:{},configurable:true});}window.__dateModule=await new Promise(r=>require(['modules/date_time'],r));window.__oldMozTime=__dateModule._mozTime;window.__pickedTime=null;__dateModule._mozTime={set:d=>{window.__pickedTime=+d;return Promise.resolve();}};document.querySelector('#dateTime .time-manual').classList.remove('disabled');for(const e of document.querySelectorAll('#dateTime input'))e.disabled=false;return true;`);
    for(const type of ['date','time']) {
      await evaluate('settings',`const e=document.querySelector('#dateTime .${type}-picker');e.disabled=false;e.click();return true;`);
      await wait('system',`const p=Service.query('getActiveApp')?.valueSelector;return !!(p?.isShown && p._${type}Picker);`);
      report.checks[type+'Picker']=await evaluate('system',`const p=Service.query('getActiveApp').valueSelector;const e=p.elements.${type==='date'?'spinDate':'time'}PickerPopup;return {visible:e.checkVisibility(),height:e.getBoundingClientRect().height};`);
      await evaluate('system',`Service.query('getActiveApp').valueSelector.confirm();return true;`);
      await wait('settings','return Number.isFinite(window.__pickedTime);');
      report.checks[type+'Commit']=true;
      await evaluate('settings','window.__pickedTime=null;return true;');
    }
    await evaluate('settings',`__dateModule._mozTime=__oldMozTime;const s=await new Promise(r=>require(['modules/settings_service'],r));await s.navigate('keyboard');return true;`);
    await launch('keyboard');
    await wait('keyboard','return !!document.querySelector("#general gaia-header");');
    await evaluate('keyboard',`document.querySelector('#general gaia-header').dispatchEvent(new CustomEvent('action'));return true;`);
    await wait('system',`return Service.query('getActiveApp')?.origin==='http://settings.localhost:8765';`);
    report.checks.keyboardBack=true;
  } catch(error){report.errors.settings=String(error);}
  finally {
    await evaluate('settings','if(window.__dateModule)__dateModule._mozTime=window.__oldMozTime;if(window.__testClockInstalled)delete navigator.mozTime;return true;').catch(()=>{});
  }
  await save(report);
  try {
    await launch('camera');
    await wait('camera','return !!window.app?.camera?.mozCamera && !app.camera.isBusy;');
    await evaluate('camera',`window.__vulpesDiagnostics=[];window.__lastVideo=null;app.once('newmedia',v=>{window.__lastVideo=v;});app.settings.mode.select('video');return true;`);
    await wait('camera','return app.camera.mode==="video" && !app.camera.isBusy;');
    await tap('camera','.js-capture');
    await wait('camera','return app.camera.get("recording")==="started";');
    await sleep(3000);
    await tap('camera','.js-capture');
    await wait('camera','return !!window.__lastVideo?.blob;',20000);
    report.checks.video=await evaluate('camera',`const v=window.__lastVideo;const el=document.createElement('video');el.muted=true;el.src=URL.createObjectURL(v.blob);try{await new Promise((ok,fail)=>{el.onloadeddata=ok;el.onerror=()=>fail(Error('Recorded video cannot be decoded'));});return {bytes:v.blob.size,mime:v.blob.type,path:v.filepath,width:el.videoWidth,height:el.videoHeight,poster:v.poster.blob.size};}finally{URL.revokeObjectURL(el.src);el.remove();}`);
    report.errors.camera=await evaluate('camera','return __vulpesDiagnostics.filter(x=>x.kind==="error" || x.kind==="rejection");');
  } catch(error){report.errors.video=String(error);report.errors.camera=await evaluate('camera','return window.__vulpesDiagnostics;').catch(()=>[]);}
  finally {
    await evaluate('camera',`await app.camera.mozCamera?.vulpesFinishRecording?.();if(window.__lastVideo){await navigator.getDeviceStorage('videos').delete(__lastVideo.filepath);await navigator.getDeviceStorage('pictures').delete(__lastVideo.poster.filepath);}app.settings.mode.select('picture');return true;`).catch(()=>{});
    await evaluate('system',"dispatchEvent(new Event('home'));return true;").catch(()=>{});
  }
  report.passed=!Object.values(report.errors).some(x=>Array.isArray(x)?x.length:!!x) && !!report.checks.video;
  await save(report);return report;
}
