// Explicit, private regression marker only. Captures stay in memory and are discarded.
export async function auditTickets({win,evaluate,wait,tap,sleep,root}) {
  const report={recordedAt:new Date().toISOString(),results:{}};
  const step=async(name,run)=>{
    try{report.results[name]={value:await run()};}
    catch(error){report.results[name]={error:String(error),stack:error.stack};}
    await IOUtils.writeJSON(root+'/logs/ticket-regressions.json',report);
  };
  const ev=(app,code)=>evaluate(app,code);
  const launch=async app=>{
    await ev('system',`await VulpesCompat.call('apps.launch',{manifestURL:'http://${app}.localhost:8765/manifest.webapp'});return true;`);
    await wait(app,"return document.readyState==='complete';",15000);
    await sleep(600);
  };
  win.focus();win.document.getElementById('system').focus();
  await step('unlock',()=>ev('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;'));
  await step('cameraOpen',async()=>{
    await launch('camera');
    await wait('camera','return !!app.camera.mozCamera && !app.camera.isBusy;',15000);
    return ev('camera','const c=app.camera.mozCamera;return {mode:app.camera.mode,flash:c.capabilities.flashModes,photo:c.getPictureSize(),frames:c.vulpesTiming};');
  });
  await step('cameraFlash',()=>ev('camera',`const c=app.camera.mozCamera;
    if(!c.capabilities.flashModes.includes('torch'))return {supported:false};
    try{return await c.vulpesCameraControl({action:'flash',mode:'torch'});}
    finally{await new Promise(r=>setTimeout(r,200));await c.vulpesCameraControl({action:'flash',mode:'off'});}`));
  await step('cameraPicture',()=>ev('camera',`const b=await app.camera.mozCamera.takePicture(),i=await createImageBitmap(b);
    const r={width:i.width,height:i.height,bytes:b.size};i.close();return r;`));
  for(const lens of ['front','back']) await step('cameraSwitch-'+lens,async()=>{
    await ev('camera',`window.__ticketOldCamera=app.camera.mozCamera;if(app.settings.cameras.selected('key')!==${JSON.stringify(lens)})app.settings.cameras.next();else window.__ticketOldCamera=null;return true;`);
    await wait('camera','return !!app.camera.mozCamera && app.camera.mozCamera!==window.__ticketOldCamera && !app.camera.isBusy;',15000);
    return ev('camera',`const c=app.camera.mozCamera, before=c.vulpesTiming.frames;
      await new Promise(r=>setTimeout(r,1000));return {selected:app.settings.cameras.selected('key'),frames:c.vulpesTiming.frames-before,flash:c.capabilities.flashModes};`);
  });
  const principal=Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI('http://camera.localhost:8765'),{});
  const previous=Services.perms.testExactPermissionFromPrincipal(principal,'microphone');
  await step('cameraVideo',async()=>{
    try{
      Services.perms.addFromPrincipal(principal,'microphone',Ci.nsIPermissionManager.ALLOW_ACTION,Ci.nsIPermissionManager.EXPIRE_SESSION);
      await ev('camera','window.__ticketVideo=null;app.once("newmedia",v=>{window.__ticketVideo=v;});app.settings.mode.select("video");return true;');
      await wait('camera','return app.camera.mode==="video" && !!app.camera.mozCamera && !app.camera.isBusy;',15000);
      await tap('camera','.js-capture',10000);
      await wait('camera','return app.camera.get("recording")==="started";',15000);
      await sleep(2200);await tap('camera','.js-capture',10000);
      await wait('camera','return !!window.__ticketVideo?.blob;',20000);
      return await ev('camera',`const v=__ticketVideo,el=document.createElement('video');el.muted=true;el.src=URL.createObjectURL(v.blob);
        try{await Promise.race([new Promise((ok,no)=>{el.onloadeddata=ok;el.onerror=()=>no(Error('Decode failed'));}),new Promise((_,no)=>setTimeout(()=>no(Error('Decode timeout')),7000))]);
        return {bytes:v.blob.size,type:v.blob.type,width:el.videoWidth,height:el.videoHeight,poster:v.poster.blob.size};}
        catch(error){return {decodeError:String(error),mediaError:el.error?.code,bytes:v.blob.size,type:v.blob.type,header:Array.from(new Uint8Array(await v.blob.slice(0,32).arrayBuffer())),poster:v.poster?.blob?.size};}
        finally{URL.revokeObjectURL(el.src);el.remove();}`);
    }finally{
      await ev('camera','app.camera.stopRecording();await app.camera.mozCamera?.vulpesFinishRecording?.();if(window.__ticketVideo){await navigator.getDeviceStorage("videos").delete(__ticketVideo.filepath);await navigator.getDeviceStorage("pictures").delete(__ticketVideo.poster.filepath);}app.settings.mode.select("picture");return true;').catch(()=>{});
      if(previous===Ci.nsIPermissionManager.UNKNOWN_ACTION)Services.perms.removeFromPrincipal(principal,'microphone');
      else Services.perms.addFromPrincipal(principal,'microphone',previous);
    }
  });
  await step('emailCaret',async()=>{
    await launch('email');
    await tap('email','input:not([type=hidden])',10000);
    return ev('email',`const e=document.activeElement;return {field:e.localName,focus:document.hasFocus(),caret:getComputedStyle(e).caretColor};`);
  });
  await step('galleryShare',async()=>{
    await launch('gallery');
    await wait('gallery','return typeof share==="function";',10000);
    try {
      await ev('gallery',`const c=document.createElement('canvas');c.width=80;c.height=80;
        c.getContext('2d').fillRect(0,0,80,80);
        share([await new Promise(r=>c.toBlob(r,'image/png'))],'vulpes-share-test.png');return true;`);
      await wait('system','return document.querySelector("#action-menu-form")?.classList.contains("visible");',10000);
      return await ev('system',`return [...document.querySelectorAll('#action-menu button[data-manifest]')].map(e=>e.dataset.manifest);`);
    } finally {
      await ev('system','document.querySelector("#action-menu button[data-action=cancel]")?.click();return true;');
    }
  });
  await step('home',()=>ev('system','dispatchEvent(new CustomEvent("home"));return true;'));
}
