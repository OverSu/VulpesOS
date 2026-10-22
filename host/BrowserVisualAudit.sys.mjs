// Explicit diagnostic: inspect real navigation and its rendered surfaces.
export async function auditBrowserVisual({win,evaluate,sleep,root}) {
  const {Views}=ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs');
  const result={at:Date.now(),samples:[]};
  const capture=async(context,name,rect=null)=>{
    const image=await context.currentWindowGlobal.drawSnapshot(rect,1,'white');
    const c=win.document.createElementNS('http://www.w3.org/1999/xhtml','canvas');
    c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);image.close();
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    await IOUtils.write(`${root}/logs/${name}.png`,new Uint8Array(await blob.arrayBuffer()));
  };
  try {
    win.focus();win.document.getElementById('system').focus();
    for(let n=0;n<40;n++) {
      if(await evaluate('system','return !!window.core?.appCore?.rocketbar;')) break;
      await sleep(500);
    }
    await evaluate('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;');
    await sleep(1200);
    await evaluate('system','const r=core.appCore.rocketbar;await r.activate();r.focus();return true;');
    let keyboard=false;
    for(let n=0;n<20;n++) {
      keyboard=await evaluate('system','return !!document.getElementById("vulpes-gaia-keyboard")?.offsetHeight;');
      if(keyboard) break;
      await sleep(250);
    }
    if(!keyboard) throw Error('Keyboard did not open');
    await sleep(1800);
    await evaluate('system','const r=core.appCore.rocketbar;r.setInput("Vulpes OS");r.handleInput();return true;');
    await sleep(700);
    await evaluate('keyboard','navigator.mozInputMethod.inputcontext.sendKey(13,0).catch(console.error);return true;');
    await sleep(8000);
    for(let i=0;i<3;i++) {
      await sleep(3000);
      const sample={system:await evaluate('system','const r=core.appCore.rocketbar;return {active:Service.query("getActiveApp")?.origin,bar:r.active,input:r.input.value,port:!!r._port,keyboardHidden:document.getElementById("vulpes-gaia-keyboard")?.hidden,search:r.searchWindow?.iframe?.src};'),views:[]};
      for(const [id,e] of Views.entries) {
        const b=e.browser;
        const v={id,url:b.currentURI.spec,loading:b.webProgress.isLoadingDocument,style:b.style.cssText,rect:b.getBoundingClientRect().toJSON(),contextId:b.browsingContext.id,geometry:e.geometry,active:b.docShellIsActive,renderLayers:b.renderLayers};
        try {v.page=await b.browsingContext.currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate','return {url:location.href,ready:document.readyState,text:document.body?.innerText.slice(0,1200),width:window.innerWidth,height:window.innerHeight,visibility:document.visibilityState};');await capture(b.browsingContext,`browser-page-${i}`);}catch(error){v.error=String(error);}
        sample.views.push(v);
      }
      await capture(win.browsingContext,`browser-screen-${i}`,new win.DOMRect(0,0,win.innerWidth,win.innerHeight));
      result.samples.push(sample);
      await IOUtils.writeJSON(`${root}/logs/browser-visual.json`,result);
    }
    const last=result.samples.at(-1);result.passed=!!last.system.keyboardHidden && last.views.some(v=>v.style.includes('visibility: visible') && v.page?.text?.length>0 && v.page.width>0 && v.url.startsWith('https://duckduckgo.com/'));
  }catch(error){result.error=String(error);}
  await IOUtils.writeJSON(`${root}/logs/browser-visual.json`,result);
}
