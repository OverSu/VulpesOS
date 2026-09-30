// SPDX-License-Identifier: MPL-2.0
// Runs only in the isolated Droidian trial, without a remote debugger.
import {setTimeout, setInterval, clearInterval} from 'resource://gre/modules/Timer.sys.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function run(win) {
  dump('TUNDRA_DROIDIAN_PROBE started\n');
  const interactive = Services.env.get('TUNDRA_DIAGNOSTICS') === '1';
  const root = Services.env.get('VULPES_WORKSPACE_ROOT');
  const report = {passed:false, mode:Services.env.get('TUNDRA_HEADLESS')==='1'?'headless':'wayland',
    ownCompositor:Services.env.get('TUNDRA_OWN_COMPOSITOR')==='1', checks:{}, scope:interactive?'interactive':'startup-only', engine:{
    version:Services.appinfo.platformVersion, buildID:Services.appinfo.appBuildID,
    ABI:Services.appinfo.XPCOMABI, OS:Services.appinfo.OS}};
  report.bootId = Services.env.get('TUNDRA_BOOT_ID');
  const listener={observe(message) {
    const text=message.message || String(message);
    if(text.includes('.localhost:8765') || text.includes('resource://vulpes/'))
      dump('TUNDRA_CONSOLE '+text+'\n');
  }};
  Services.console.registerListener(listener);
  if (Services.env.get('VULPES_TUNDRA') === '1') {
    let checking = false;
    const networkTimer = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const state = await IOUtils.readJSON('/run/tundra-hardware/status.json');
        if (state.wifi?.state !== 'connected') return;
        clearInterval(networkTimer);
        const response = await win.fetch('https://example.org/', {
          signal: win.AbortSignal.timeout(20000), cache: 'no-store',
        });
        const body = await response.text();
        await IOUtils.writeJSON(`${root}/logs/network-gecko.json`, {
          passed: response.ok && body.includes('Example Domain'),
          status: response.status, gecko: Services.appinfo.platformVersion,
          url: 'https://example.org/', certificateChecksDisabled: false,
        });
      } catch (error) {
        await IOUtils.writeJSON(`${root}/logs/network-gecko.json`, {passed:false,error:String(error)});
      } finally { checking = false; }
    }, 5000);
    win.addEventListener('unload', () => clearInterval(networkTimer), {once:true});
  }
  function contextState(context) {
    return context ? {id:context.id,url:context.currentWindowGlobal?.documentURI.spec,
      children:Array.from(context.children,contextState)} : null;
  }
  function hostState() {
    const browser=win.document.querySelector('browser');
    return {ready:win.hostReady,visibility:win.document.visibilityState,
      fission:Services.appinfo.fissionAutostart,
      fissionPref:Services.prefs.getBoolPref('fission.autostart',false),
      proxy:Services.prefs.getIntPref('network.proxy.type',-1),
      browser:browser ? {src:browser.getAttribute('src'),uri:browser.currentURI?.spec,
        loading:browser.webProgress?.isLoadingDocument,
        remote:browser.getAttribute('remote'),remoteType:browser.remoteType,
        context:contextState(browser.browsingContext),
        active:browser.docShellIsActive,renderLayers:browser.renderLayers} : null};
  }
  let previousState;
  const trace=setInterval(()=>{
    const state=JSON.stringify(hostState());
    if(state!==previousState) {dump('TUNDRA_HOST_STATE '+state+'\n');previousState=state;}
  },5000);
  win.fetch('http://system.localhost:8765/index.html', {signal:win.AbortSignal.timeout(10000)})
    .then(async response=>dump(`TUNDRA_HTTP ${response.status} ${(await response.text()).length}\n`))
    .catch(error=>dump('TUNDRA_HTTP_ERROR '+error+' offline='+Services.io.offline+'\n'));
  async function evaluate(app, code, message = 'Evaluate') {
    function find(context) {
      if(context.currentWindowGlobal?.documentURI.spec.startsWith(`http://${app}.localhost:8765/`)) return context;
      for(const child of context.children) {const found=find(child); if(found) return found;}
      return null;
    }
    const context=win.document.querySelector('browser')?.browsingContext;
    const child=context && find(context);
    if(!child) return null;
    return Promise.race([
      child.currentWindowGlobal.getActor('VulpesProbe').sendQuery(message,code),
      sleep(30000).then(()=>{throw new Error('Content actor did not answer within 30 seconds');})
    ]);
  }
  async function wait(app, code) {
    dump(`TUNDRA_DROIDIAN_PROBE waiting ${app}: ${code}\n`);
    let last;
    const deadline=Date.now()+90000;
    while(Date.now()<deadline) {
      try {last=await evaluate(app,code); if(last) return last;} catch(e) {last=String(e);}
      await sleep(500);
    }
    throw new Error(`${app}: timeout: ${last}`);
  }
        async function tap(app, selector) {
          if(app==='keyboard') selector='.keyboard-type-container[data-active] '+selector;
          await wait(app, `const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();return r.width>0 && r.height>0 && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));`);
          await sleep(600);
          const point = await evaluate(app, `const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};`);
          await evaluate(app,point,'Tap');
          await sleep(350);
        }
  try {
    const lock=await IOUtils.readJSON(`${root}/engine-lock.json`);
    if(report.engine.version!==lock.version || !report.engine.ABI.startsWith('aarch64'))
      throw new Error('Unexpected engine or architecture');
    ChromeUtils.registerWindowActor('VulpesProbe',{
      child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},
      allFrames:true,safeForUntrustedWebProcess:true});
    report.checks.system=await wait('system',"return document.body?.getAttribute('ready-state')==='fullyLoaded';");
    report.checks.home=await wait('homescreen',"return document.readyState==='complete' && document.body.innerText.length>0;");
    report.checks.visible=await wait('system',"return document.visibilityState==='visible';");
    report.checks.bootLogoHidden=await wait('system',"const logo=document.getElementById('os-logo');return !logo || getComputedStyle(logo).opacity==='0';");
    if (Services.env.get('TUNDRA_PERSISTENT') === '1') {
      const token = Services.uuid.generateUUID().toString();
      report.persistence = await evaluate('system', `
        const key='vulpes.tundra.persistence-proof';
        const previous=await VulpesCompat.call('settings.get',{key});
        if (!previous.found) await VulpesCompat.call('settings.set',{values:{[key]:${JSON.stringify(token)}}});
        const current=await VulpesCompat.call('settings.get',{key});
        return {restored:previous.found,value:current.value,found:current.found};
      `);
      report.checks.settingsStorage = report.persistence.found && typeof report.persistence.value === 'string';
    }
    if (interactive) {
    for(const app of ['settings','clock']) {
      await evaluate('system',`await VulpesCompat.call('apps.launch',{manifestURL:'http://${app}.localhost:8765/manifest.webapp'});return true;`);
      report.checks[app]=await wait(app,"return document.readyState==='complete' && document.body.innerText.length>20;");
      if (app === 'settings') {
        report.checks.noDebugSettings = await evaluate('settings', "return !document.getElementById('vulpes-open-settings') && !document.getElementById('vulpes-test-notification');");
      }
    }
    win.document.getElementById('home')?.click();
    report.checks.returnHome=await wait('system',"return !!document.querySelector('.appWindow.active[transition-state=opened] iframe[src*=\"homescreen.localhost\"]');");
    report.input=await evaluate('homescreen',"return {maxTouchPoints:navigator.maxTouchPoints,touchEvents:'ontouchstart' in window,coarse:matchMedia('(pointer: coarse)').matches};");
    report.nativeTouch=Services.ppmm.sharedData.get('vulpes:native-touch')===true;
    report.frameTiming=await evaluate('homescreen',`return await new Promise(resolve=>{
      const target=Array.from(document.querySelectorAll('*')).find(el=>el.scrollHeight>el.clientHeight+100 && ['auto','scroll'].includes(getComputedStyle(el).overflowY));
      const original=target?.scrollTop || 0, samples=[]; let start,previous;
      function frame(now) {
        if(start===undefined)start=now;
        if(previous!==undefined)samples.push(now-previous);
        previous=now;
        if(target)target.scrollTop=original+Math.min(300,(now-start)*.15);
        if(now-start<4000){requestAnimationFrame(frame);return;}
        if(target)target.scrollTop=original;
        samples.sort((a,b)=>a-b);
        resolve({durationMs:now-start,frames:samples.length,fps:samples.length*1000/(now-start),medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],scrollTarget:target?.id||target?.tagName||null});
      }
      requestAnimationFrame(frame);
    });`);
    report.fonts = await evaluate('homescreen', `await document.fonts.ready; return {loaded:Array.from(document.fonts,f=>({family:f.family,weight:f.weight,status:f.status})),icon:document.querySelector('gaia-app-icon')?.outerHTML,shadow:document.querySelector('gaia-app-icon')?.shadowRoot?.innerHTML,images:Array.from(document.querySelectorAll('gaia-app-icon')).slice(0,12).map(i=>{const img=i.shadowRoot?.querySelector('img');const title=i.shadowRoot?.querySelector('#subtitle');return {id:i.dataset.identifier,src:img?.src,complete:img?.complete,naturalWidth:img?.naturalWidth,width:img?.clientWidth,height:img?.clientHeight,font:title&&getComputedStyle(title).font};}),styles:Array.from(document.styleSheets,s=>s.href)};`);
    report.viewport={width:win.innerWidth,height:win.innerHeight,devicePixelRatio:win.devicePixelRatio};
    report.checks.homeIcons = await wait('homescreen', `const icons=Array.from(document.querySelectorAll('gaia-app-icon')).slice(0,12);return icons.length===12 && icons.every(i=>{const image=i.shadowRoot?.querySelector('img');return image?.complete && image.naturalWidth>0 && image.clientWidth>0;});`);
    report.checks.firaLoaded = report.fonts.loaded.some(f=>f.family==='FiraSans' && f.weight==='400' && f.status==='loaded');
    const surface=()=>{
      const button=win.document.getElementById('home'), style=win.getComputedStyle(button);
      return {home:win.document.documentElement.hasAttribute('home-active'),
        bottom:win.document.documentElement.hasAttribute('home-at-bottom'),
        background:style.backgroundImage,color:style.backgroundColor};
    };
    async function waitSurface(test) {
      for(let i=0;i<100;i++) {const s=surface();if(test(s))return s;await sleep(100);}
      throw Error('Unexpected Home surface: '+JSON.stringify(surface()));
    }
    await evaluate('homescreen', `document.querySelector('#apps-panel > .scrollable').scrollTop=0;return true;`);
    report.navigation={top:await waitSurface(s=>s.home && !s.bottom && s.background.includes('linear-gradient'))};
    win.InspectorUtils.addPseudoClassLock(win.document.getElementById('home'),':active');
    report.navigation.pressed=surface();
    win.InspectorUtils.removePseudoClassLock(win.document.getElementById('home'),':active');
    await evaluate('homescreen', `const p=document.querySelector('#apps-panel > .scrollable');p.scrollTop=p.scrollHeight;return true;`);
    report.navigation.bottom=await waitSurface(s=>s.bottom && s.background==='none' && s.color==='rgba(0, 0, 0, 0)');
    await evaluate('system', `await VulpesCompat.call('apps.launch',{manifestURL:'http://settings.localhost:8765/manifest.webapp'});return true;`);
    report.navigation.application=await waitSurface(s=>!s.home && s.background==='none' && s.color==='rgb(18, 35, 50)');
    win.document.getElementById('home').click();
    await waitSurface(s=>s.home);
    await evaluate('homescreen', `document.querySelector('#apps-panel > .scrollable').scrollTop=0;return true;`);
    report.navigation.returnHome=await waitSurface(s=>s.home && !s.bottom && s.background.includes('linear-gradient'));
    report.checks.navigation=report.navigation.top.background===report.navigation.pressed.background;
    if (Services.env.get('VULPES_TUNDRA') === '1') {
      report.hardware = await evaluate('system', "return await VulpesCompat.call('platform.snapshot', {});");
      report.capabilities = await evaluate('system', "return await VulpesCompat.call('platform.capabilities', {});");
      report.checks.nativeIdentity = report.capabilities.platform === 'tundra' && report.capabilities.adapter.device === 'sargo';
      report.checks.batteryRead = report.hardware.available && Number.isFinite(report.hardware.battery?.level);
      await evaluate('system', `await VulpesCompat.call('apps.launch',{manifestURL:'http://settings.localhost:8765/manifest.webapp'});return true;`);
      await wait('settings', "return !!document.querySelector('a[href=\"#battery\"]');");
      await evaluate('settings', "document.querySelector('a[href=\"#battery\"]').click();return true;");
      try {
        report.checks.hardwarePanel = await wait('settings', "const d=document.getElementById('vulpes-hardware-panel');return !!d?.open && d.innerText.includes('%');");
        await evaluate('settings', "document.getElementById('vulpes-hardware-panel').close();return true;");
      } catch(error) {
        report.hardwarePanelNote = String(error);
        report.checks.hardwarePanel = null;
      }
      win.document.getElementById('home').click();
      await waitSurface(s=>s.home);
    }
    } else {
      // Observe the normal boot without opening apps or moving the home screen.
      report.startup = win.vulpesStartup;
      report.input = await evaluate('homescreen', "return {maxTouchPoints:navigator.maxTouchPoints,touchEvents:'ontouchstart' in window};");
      report.nativeTouch = Services.ppmm.sharedData.get('vulpes:native-touch') === true;
      report.samples = [];
      for (let i = 0; i < 5; i++) {
        report.samples.push(await evaluate('system', `return {
          app:document.querySelector('.appWindow.active iframe')?.src,
          locked:!!window.lockScreen?.locked && document.getElementById('screen').classList.contains('locked'),
          width:innerWidth,height:innerHeight
        };`));
        await sleep(1000);
      }
      report.checks.idleStartSurface = report.samples.every(s => s?.locked || s?.app?.startsWith('http://homescreen.localhost:8765/'));
      report.checks.stableViewport = report.samples.every(s => s?.width === report.samples[0]?.width && s?.height === report.samples[0]?.height);
      report.window = {fullscreen:win.fullScreen, hidechrome:win.document.documentElement.getAttribute('hidechrome')};
      if (Services.env.get('VULPES_TUNDRA') === '1') {
        report.hardware = await evaluate('system', "return await VulpesCompat.call('platform.snapshot', {});");
        report.capabilities = await evaluate('system', "return await VulpesCompat.call('platform.capabilities', {});");
        report.checks.nativeIdentity = report.capabilities.platform === 'tundra';
        report.checks.batteryRead = report.hardware.available && Number.isFinite(report.hardware.battery?.level);
        report.checks.callScreenReady = await evaluate('system',
          "return !!navigator.mozTelephony && !!document.querySelector('.callscreenWindow') && Array.isArray(await VulpesCompat.call('platform.calls', {}));");
        try {
          const { tundraRadio } = ChromeUtils.importESModule('resource://vulpes/host/Tundra.sys.mjs');
          const state = await tundraRadio('status');
          const modem = state.modem?.[0] || {};
          const registration = state.registration?.[0] || {};
          report.radio = {powered:modem.Powered?.data, online:modem.Online?.data,
            state:registration.Status?.data, technology:registration.Technology?.data};
        } catch (error) { report.radio = {error:String(error)}; }
      }
    }
    // Fixed diagnostics can be requested again over the private maintenance SSH.
    // Markers never contain scripts or arbitrary commands.
    async function requestedUiChecks() {
    const cameraMarker = `${root}/logs/test-camera`;
    if (await IOUtils.exists(cameraMarker)) {
      await IOUtils.remove(cameraMarker);
      const cameraReport = {bootId:report.bootId, imagesRetained:false, passed:false};
      try {
        await evaluate('system', "ScreenManager.turnScreenOn(true);if(Service.query('locked'))await Service.request('unlock',{forcibly:true});return true;");
        await wait('system', "return !Service.query('locked');");
        await evaluate('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://camera.localhost:8765/manifest.webapp'});return true;");
        await wait('camera', "return !!window.app?.camera?.mozCamera && document.querySelector('video')?.videoWidth>0;");
        // Gaia remembers the selected lens; establish a known starting state.
        await evaluate('camera', "if(app.settings.cameras.selected('key')!=='back')app.settings.cameras.next();return true;");
        await wait('camera', "return app.settings.cameras.selected('key')==='back' && !!app.camera.mozCamera && !app.camera.isBusy && document.querySelector('.viewfinder video')?.videoWidth>0;");
        cameraReport.gaia = await evaluate('camera', `
          const video=document.querySelector('video');
          const camera=app.camera.mozCamera;
          window.__cameraBeforeSwitch=camera;
          const capabilities=camera.capabilities;
          let focus=null;
          if(capabilities.maxFocusAreas>0) {
            camera.setFocusAreas([{top:-150,left:-150,bottom:150,right:150}]);
            await camera.autoFocus();focus=true;
          }
          if(capabilities.zoomRatios.length>1) {
            camera.zoom=2;
            await new Promise(r=>setTimeout(r,700));
          }
          const testedZoom=camera.zoom;
          camera.zoom=1;
          const photo=await camera.takePicture();
          const bitmap=await createImageBitmap(photo);
          const picture={width:bitmap.width,height:bitmap.height};bitmap.close();
          return {width:video.videoWidth,height:video.videoHeight,native:camera.vulpesNative===true,
            picture,focus,zoom:testedZoom,focusAreas:capabilities.maxFocusAreas,
            jpegBytes:photo.size,jpegType:photo.type,errors:window.__vulpesDiagnostics};
        `);
        cameraReport.performance = await evaluate('camera', `
          const stream=app.camera.mozCamera, before=stream.vulpesTiming?.frames||0;
          const start=performance.now();await new Promise(r=>setTimeout(r,4000));
          const elapsed=performance.now()-start;
          const hud=document.querySelector('.hud');
          const button=document.querySelector('.js-camera');
          return {fps:(stream.vulpesTiming.frames-before)*1000/elapsed,
            conversionMs:stream.vulpesTiming.conversionMs/stream.vulpesTiming.frames,
            switchVisible:getComputedStyle(button).opacity!=='0' && hud.getAttribute('camera-enabled')==='true',
            flashVisible:getComputedStyle(document.querySelector('.js-flash')).visibility==='visible'};
        `);
        await evaluate('camera', "document.querySelector('.js-camera').click();return true;");
        await wait('camera', "return !!app.camera.mozCamera && app.camera.mozCamera!==window.__cameraBeforeSwitch && !app.camera.isBusy && document.querySelector('.viewfinder video')?.videoWidth>0;");
        cameraReport.switched = await evaluate('camera', `
          const photo=await app.camera.mozCamera.takePicture();
          window.__cameraBeforeHome=app.camera.mozCamera;
          return {camera:app.settings.cameras.selected('key'),jpegBytes:photo.size,
            previousStopped:window.__cameraBeforeSwitch.getTracks().every(t=>t.readyState==='ended')};
        `);
        cameraReport.roundTrips = [];
        for (let i=0; i<4; i++) {
          await evaluate('camera', "window.__switchFrom=app.camera.mozCamera;return true;");
          await tap('camera', '.js-camera');
          await wait('camera', "return !!app.camera.mozCamera && app.camera.mozCamera!==window.__switchFrom && !app.camera.isBusy && document.querySelector('.viewfinder video')?.videoWidth>0;");
          cameraReport.roundTrips.push(await evaluate('camera', `
            const camera=app.camera.mozCamera, before=camera.vulpesTiming.frames;
            await new Promise(r=>setTimeout(r,700));
            return {camera:app.settings.cameras.selected('key'),
              frames:camera.vulpesTiming.frames-before,
              previousStopped:window.__switchFrom.getTracks().every(t=>t.readyState==='ended')};
          `));
        }
        await evaluate('camera', 'window.__cameraBeforeHome=app.camera.mozCamera;return true;');
        // Test Gaia's Home action, independent of a held pointer on the shell button.
        cameraReport.beforeHome = await evaluate('system', "return {active:Service.query('getTopMostWindow')?.origin, top:Service.query('getTopMostUI')?.name, locked:Service.query('locked'), screen:ScreenManager.screenEnabled};");
        await evaluate('system', "dispatchEvent(new CustomEvent('home'));return true;");
        cameraReport.afterHome = await evaluate('system', "await new Promise(r=>setTimeout(r,1000));return {active:Service.query('getTopMostWindow')?.origin, top:Service.query('getTopMostUI')?.name, locked:Service.query('locked'), screen:ScreenManager.screenEnabled};");
        cameraReport.hidden = await wait('camera', 'return document.hidden;');
        cameraReport.stopped = await wait('camera', "return window.__cameraBeforeHome.getTracks().every(t=>t.readyState==='ended');");
        cameraReport.passed=cameraReport.gaia.native && cameraReport.gaia.picture.width*cameraReport.gaia.picture.height>10000000 && cameraReport.gaia.focus && cameraReport.gaia.zoom>1 && cameraReport.gaia.jpegBytes>1000 && cameraReport.gaia.jpegType==='image/jpeg' && cameraReport.switched.jpegBytes>1000 && cameraReport.switched.previousStopped && cameraReport.stopped && cameraReport.roundTrips.every(r=>r.frames>0 && r.previousStopped);
      } catch(error) { cameraReport.error=String(error); }
      finally { win.document.getElementById('home')?.click(); }
      await IOUtils.writeJSON(`${root}/logs/camera.json`, cameraReport);
    }
    const smsMarker = `${root}/logs/test-sms-display`;
    if (await IOUtils.exists(smsMarker)) {
      await IOUtils.remove(smsMarker);
      const smsReport = {bootId:report.bootId, passed:false, sent:false};
      try {
        await evaluate('system', "ScreenManager.turnScreenOn(true);if(Service.query('locked'))await Service.request('unlock',{forcibly:true});await VulpesCompat.call('apps.launch',{manifestURL:'http://sms.localhost:8765/manifest.webapp'});return true;");
        await wait('sms', "return !!window.Navigation && !!window.MessageManager;");
        smsReport.threads = await evaluate('sms', `
          const threads=await new Promise((resolve,reject)=>{const rows=[];const c=navigator.mozMobileMessage.getThreads();c.onsuccess=()=>{if(c.done)resolve(rows);else{rows.push(c.result);c.continue();}};c.onerror=()=>reject(c.error);});
          window.__smsReviewThreads=threads.map(t=>t.id);
          return {count:threads.length,validDates:threads.every(t=>Number.isFinite(+t.timestamp))};
        `);
        smsReport.conversations=[];
        for(let i=0;i<Math.min(smsReport.threads.count,5);i++) {
          await evaluate('sms', `await Navigation.toPanel('thread',{id:window.__smsReviewThreads[${i}]});return true;`);
          await sleep(1500);
          smsReport.conversations.push(await evaluate('sms', `
            const nodes=[...document.querySelectorAll('#messages-container .message')];
            return {bubbles:nodes.length,validDates:nodes.every(e=>Number.isFinite(+e.querySelector('time')?.dataset.time)),
              nonempty:nodes.every(e=>!!e.querySelector('.message-content-body')?.textContent),
              errorCount:window.__vulpesDiagnostics?.length||0};
          `));
        }
        smsReport.passed=smsReport.threads.validDates && smsReport.conversations.length>0 && smsReport.conversations.every(c=>c.bubbles>0 && c.validDates && c.nonempty);
      } catch(error) {smsReport.error=String(error);}
      finally {win.document.getElementById('home')?.click();}
      await IOUtils.writeJSON(`${root}/logs/sms-display.json`,smsReport);
    }
    const inputMarker = `${root}/logs/test-keyboard`;
    if (await IOUtils.exists(inputMarker)) {
      await IOUtils.remove(inputMarker);
      const inputReport = {bootId:report.bootId,recordedAt:Date.now(),passed:false,sent:false};
      try {
        await evaluate('system', 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;');
        await sleep(1500);
        await evaluate('system', `await VulpesCompat.call('apps.launch',{manifestURL:'http://sms.localhost:8765/manifest.webapp'});return true;`);
        await wait('sms', 'return document.querySelector("#threads-composer-link") && innerWidth>0;');
        await evaluate('sms', 'await Navigation.toPanel("thread-list");await Navigation.toPanel("composer");return true;');
        await wait('sms','return !!document.querySelector(".recipient[contenteditable]");');
        await tap('sms','.recipient[contenteditable]');
        await wait('keyboard', 'return navigator.mozInputMethod?.inputcontext?.inputType==="tel" && !!document.querySelector("button[aria-label=\\"2\\"]");');
        await tap('keyboard','button[aria-label="2"]');
        await tap('keyboard','button[aria-label="3"]');
        inputReport.recipientTyped = await evaluate('sms','return document.querySelector(".recipient[contenteditable]").textContent.endsWith("23");');
        const recipientBefore=await evaluate('sms','return document.querySelector(".recipient[contenteditable]").textContent;');
        await tap('sms','#messages-input');
        await wait('keyboard', 'return navigator.mozInputMethod?.inputcontext?.inputType==="text" && !!document.querySelector("button[aria-label=\\"a\\"]");');
        inputReport.keyboard = await evaluate('keyboard', `const e=document.querySelector('button[aria-label="a"]');const r=e.getBoundingClientRect();
          window.__keyTrial=[];for(const type of ['touchstart','touchend','pointerdown','click']) e.addEventListener(type,()=>__keyTrial.push(type),{once:true});
          return {width:innerWidth,height:innerHeight,key:r.toJSON(),font:getComputedStyle(document.documentElement).fontSize,portrait:app.viewManager.screenInPortraitMode(),engine:app.inputMethodManager.currentIMEngine?.constructor?.name};`);
        await tap('keyboard','button[aria-label="a"]');
        await sleep(2000);
        inputReport.context = await evaluate('keyboard', 'const c=navigator.mozInputMethod.inputcontext;return c&&{id:c.id,type:c.type,inputType:c.inputType,textLength:c.text.length};');
        inputReport.message = await evaluate('sms', 'const text=document.querySelector("#messages-input").textContent;return {length:text.length,lowercase:text.includes("a"),uppercase:text.includes("A")};');
        inputReport.messageTyped = inputReport.message.lowercase || inputReport.message.uppercase;
        inputReport.events = await evaluate('keyboard','return window.__keyTrial;');
        inputReport.recipientUnchanged=await evaluate('sms',`return document.querySelector(".recipient[contenteditable]").textContent===${JSON.stringify(recipientBefore)};`);
        inputReport.passed=inputReport.recipientTyped && inputReport.messageTyped && inputReport.recipientUnchanged && inputReport.keyboard.portrait && inputReport.keyboard.key.height>=44;
        if(!inputReport.messageTyped) {
          try {
            await evaluate('keyboard','await navigator.mozInputMethod.inputcontext.sendKey(0,97);return true;');
            inputReport.directKey = await evaluate('sms','return document.querySelector("#messages-input").textContent.length>0;');
          } catch(error) {inputReport.directKeyError=String(error);}
        }
        inputReport.fonts=await evaluate('sms',null,'RenderedFonts');
        for (const face of inputReport.fonts) delete face.samples;
      } catch(error) {inputReport.error=String(error);}
      finally {win.document.getElementById('home').click();}
      await IOUtils.writeJSON(`${root}/logs/keyboard.json`,inputReport);
    }
    const sendMarker=`${root}/logs/test-send-sms.json`;
    if(await IOUtils.exists(sendMarker)) {
      const request=await IOUtils.readJSON(sendMarker);
      await IOUtils.remove(sendMarker);
      const result={bootId:report.bootId,recordedAt:Date.now(),submitted:false,deliveryConfirmed:false};
      try {
        if(typeof request.recipient!=='string' || !/^\+[0-9]{8,15}$/.test(request.recipient)) throw Error('INVALID_TEST_RECIPIENT');
        const {tundraRadio}=ChromeUtils.importESModule('resource://vulpes/host/Tundra.sys.mjs');
        const state=await tundraRadio('status');
        if(!['registered','roaming'].includes(state.registration?.[0]?.Status?.data)) throw Error('RADIO_NOT_REGISTERED');
        await evaluate('system', 'ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});return true;');
        await sleep(1000);
        await evaluate('system', `await VulpesCompat.call('apps.launch',{manifestURL:'http://sms.localhost:8765/manifest.webapp'});return true;`);
        await wait('sms','return !!window.Navigation;');
        await evaluate('sms','await Navigation.toPanel("thread-list");await Navigation.toPanel("composer");return true;');
        await evaluate('sms','if(ConversationView.recipients.length || document.querySelector(".recipient[contenteditable]").textContent.trim() || Compose.getText())throw Error("TEST_DRAFT_PRESENT");return true;');
        await tap('sms','.recipient[contenteditable]');
        await wait('keyboard','return navigator.mozInputMethod?.inputcontext?.inputType==="tel";');
        await evaluate('keyboard',`await navigator.mozInputMethod.inputcontext.replaceSurroundingText(${JSON.stringify(request.recipient)},0,0);return true;`);
        await tap('sms','#messages-input');
        await wait('keyboard','return navigator.mozInputMethod?.inputcontext?.inputType==="text";');
        const body='Vulpes OS - test SMS '+new Date().toISOString();
        await evaluate('keyboard',`await navigator.mozInputMethod.inputcontext.replaceSurroundingText(${JSON.stringify(body)},0,0);return true;`);
        await wait('sms','return !document.querySelector("#messages-send-button").disabled;');
        await evaluate('sms',`if(!Navigation.isCurrentPanel('composer') ||
          JSON.stringify(ConversationView.recipients.numbers)!==JSON.stringify([${JSON.stringify(request.recipient)}]) ||
          Compose.getText()!==${JSON.stringify(body)})throw Error('TEST_MESSAGE_MISMATCH');
          document.querySelector('#messages-send-button').click();return true;`);
        result.submitted=await wait('sms',`return await new Promise((resolve,reject)=>{
          const cursor=navigator.mozMobileMessage.getMessages(null,true);
          cursor.onsuccess=()=>{const m=cursor.result;if(!m){resolve(false);return;}
            if(m.body===${JSON.stringify(body)}){if(m.delivery==='error'){reject(Error('MODEM_TRANSMISSION_FAILED'));return;}resolve(m.delivery==='sent');return;}cursor.continue();};
          cursor.onerror=()=>reject(cursor.error);
        });`);
      } catch(error) {result.error=String(error);}
      finally {win.document.getElementById('home').click();}
      await IOUtils.writeJSON(`${root}/logs/send-sms.json`,result);
    }
    const notificationMarker = `${root}/logs/test-notifications`;
    if (await IOUtils.exists(notificationMarker)) {
      await IOUtils.remove(notificationMarker);
      const result = {bootId:report.bootId,passed:false,silent:true};
      let id;
      try {
        await evaluate('system', `ScreenManager.turnScreenOn(true);await VulpesCompat.call('apps.launch',{manifestURL:'http://sms.localhost:8765/manifest.webapp'});return true;`);
        await wait('sms', 'return typeof Notification.get === "function";');
        await evaluate('system', 'if(!Service.query("locked"))await Service.request("lock");return true;');
        result.lockState=await evaluate('system','return {service:Service.query("locked"),direct:lockScreen.locked,preview:NotificationScreen.lockscreenPreview};');
        await wait('system', 'return Service.query("locked") && NotificationScreen.lockscreenPreview;');
        id = await evaluate('sms', `return await new Promise((resolve,reject)=>{
          const n=new Notification('Vulpes — test local',{body:'Notification de qualification',tag:'vulpes-qualification',silent:true});
          n.onshow=()=>resolve(n.id);n.onerror=()=>reject(n.error);
        });`);
        const selector = `[data-notification-id="${id}"]`;
        result.tray = await wait('system', `return !!NotificationScreen.container.querySelector(${JSON.stringify(selector)});`);
        result.lockscreen = await wait('system', `return !!NotificationScreen.getLockScreenContainer()?.querySelector(${JSON.stringify(selector)});`);
        await evaluate('sms', `const rows=await Notification.get({tag:'vulpes-qualification'});rows.forEach(n=>n.close());return true;`);
        result.removed = await wait('system', `return !NotificationScreen.container.querySelector(${JSON.stringify(selector)}) && !NotificationScreen.getLockScreenContainer()?.querySelector(${JSON.stringify(selector)});`);
        result.passed = result.tray && result.lockscreen && result.removed;
      } catch(error) { result.error=String(error); }
      finally {
        if(id) await evaluate('sms', `for(const n of await Notification.get({tag:'vulpes-qualification'})) n.close();return true;`).catch(()=>{});
        win.document.getElementById('home').click();
      }
      await IOUtils.writeJSON(`${root}/logs/notifications.json`,result);
    }
    }
    await requestedUiChecks();
    let uiCheckRunning=false;
    const uiCheckTimer=setInterval(async()=>{
      if(uiCheckRunning) return;
      uiCheckRunning=true;
      try {
        const reloadMarker=`${root}/logs/test-reload-gaia`;
        if(await IOUtils.exists(reloadMarker)) {
          await IOUtils.remove(reloadMarker);
          win.document.querySelector('browser').reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
          await wait('system', "return document.body?.getAttribute('ready-state')==='fullyLoaded';");
          await sleep(1500);
        }
        await requestedUiChecks();
      } catch(error) {dump('TUNDRA_UI_CHECK_ERROR '+error+'\n');}
      finally {uiCheckRunning=false;}
    },3000);
    win.addEventListener('unload',()=>clearInterval(uiCheckTimer),{once:true});
    const controlsMarker = `${root}/logs/test-controls`;
    if (await IOUtils.exists(controlsMarker)) {
      await IOUtils.remove(controlsMarker);
      const controls = {bootId:report.bootId};
      const press = async key => {
        await evaluate('system', `dispatchEvent(new CustomEvent('softwareButtonEvent',{detail:{type:'${key}-button-press'}})); return true;`);
        await sleep(120);
        await evaluate('system', `dispatchEvent(new CustomEvent('softwareButtonEvent',{detail:{type:'${key}-button-release'}})); return true;`);
        await sleep(1000);
      };
      const brightness = async () => (await IOUtils.readUTF8('/sys/class/backlight/panel0-backlight/brightness')).trim();
      controls.beforeBrightness = await brightness();
      try {
        await press('sleep'); controls.offBrightness = await brightness();
        await press('sleep'); controls.onBrightness = await brightness();
        await evaluate('system', `dispatchEvent(new CustomEvent('softwareButtonEvent',{detail:{type:'sleep-button-press'}}));return true;`);
        await sleep(1000);
        controls.powerMenu = await evaluate('system', `return {visible:document.getElementById('sleep-menu').classList.contains('visible'),text:document.getElementById('sleep-menu').innerText};`);
        await evaluate('system', `dispatchEvent(new CustomEvent('softwareButtonEvent',{detail:{type:'sleep-button-release'}}));dispatchEvent(new Event('home'));return true;`);
        await press('volume-up');
        controls.volume = await evaluate('system', `return {visible:document.getElementById('volume').classList.contains('visible'),channel:document.getElementById('volume').dataset.channel};`);
        await press('volume-down');
        controls.battery = await evaluate('system', `return {level:navigator.battery?.level,charging:navigator.battery?.charging,icon:document.getElementById('statusbar-battery')?.outerHTML};`);
      } catch (error) { controls.error = String(error); }
      finally { await evaluate('system', 'navigator.mozPower.screenEnabled=true; return true;'); }
      const restoration = {bootId:report.bootId};
      try {
        restoration.date = await evaluate('system', "return !!document.querySelector('#statusbar-operator')?.textContent;");
        restoration.lockIcons = await evaluate('system', "return getComputedStyle(document.querySelector('#lockscreen-area-unlock > div')).backgroundImage.includes('lockscreen_unlock.png');");
        const content = win.document.getElementById('screen').getBoundingClientRect();
        const home = win.document.getElementById('home').getBoundingClientRect();
        restoration.navigationReserved = content.bottom <= home.top + 1;
        await evaluate('system', "lockScreen.unlock(true);return true;");
        await sleep(1000);
        await evaluate('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://settings.localhost:8765/manifest.webapp'});return true;");
        await wait('settings', "return document.readyState==='complete' && typeof require==='function' && require.defined('modules/settings_panel');");
        restoration.settings = await wait('settings', "return !document.getElementById('vulpes-platform-settings') && !!document.querySelector('#root a[href=\"#wifi\"]');");
        await evaluate('settings', "require(['modules/settings_service'],s=>s.navigate('battery'));return true;");
        restoration.batteryLabel = await wait('settings', "const t=document.getElementById('battery-level')?.textContent;return !!t && /[0-9]/.test(t) && !t.includes('{{');");
        restoration.wifiAPI = await evaluate('settings', "return !!navigator.mozWifiManager;");
        await evaluate('system', "await VulpesCompat.call('settings.set',{values:{'wifi.enabled':true}});return true;");
        await wait('settings', "return navigator.mozWifiManager.enabled;");
        if (restoration.wifiAPI) {
          controls.wifiTransport = await evaluate('settings', "try {const r=await VulpesCompat.call('platform.wifi',{operation:'scan'});return {ok:true,count:r.networks.length,enabled:r.enabled};} catch(e) {return {ok:false,name:e.name,message:e.message};}");
          const networks = await evaluate('settings', "return (await navigator.mozWifiManager.getNetworks()).length;");
          restoration.wifiScan = Number.isInteger(networks);
          await evaluate('settings', "require(['modules/settings_service'],s=>s.navigate('wifi'));return true;");
          restoration.wifiPanel = await wait('settings', "return !!document.querySelector('#wifi .wifi-availableNetworks') && !document.querySelector('#wifi [data-vulpes-unavailable]');");
          restoration.wifiResults = await wait('settings', "const list=document.querySelector('#wifi .wifi-availableNetworks');return list?.dataset.state==='ready' && list.querySelectorAll('li:not([data-state])').length>0;");
          restoration.wifiNoSpinner = await evaluate('settings', "return !document.querySelector('#wifi .wifi-availableNetworks [data-vulpes-unavailable]');");
        }
        restoration.passed = Object.entries(restoration).filter(([key])=>key!=='bootId').every(([,value])=>value===true);
      } catch (error) { restoration.passed=false; restoration.error=String(error); }
      finally {
        win.document.getElementById('home').click();
        await evaluate('system', "if (lockScreen.enabled) lockScreen.lock(true);return true;");
      }
      // Exercise the original quick-settings control, not only its broker.
      try {
        const {tundraWifi}=ChromeUtils.importESModule('resource://vulpes/host/Tundra.sys.mjs');
        await evaluate('system', "lockScreen.unlock(true);ScreenManager.turnScreenOn(true);return true;");
        await sleep(1000);
        const before=(await tundraWifi({operation:'status'})).enabled;
        const toggle=async wanted=>{
          await evaluate('system', "document.getElementById('quick-settings-wifi').click();return true;");
          const deadline=Date.now()+10000;
          while(Date.now()<deadline) {
            if((await tundraWifi({operation:'status'})).enabled===wanted) return true;
            await sleep(200);
          }
          throw Error('Quick Wi-Fi control did not change radio state');
        };
        try {await toggle(!before);controls.wifiToggle=true;}
        finally {
          if((await tundraWifi({operation:'status'})).enabled!==before) await toggle(before);
        }
        win.document.getElementById('home').click();await sleep(1000);
      } catch(error) {controls.quickControlsError=String(error);}
      controls.restoration=restoration;
      const brightnessCheck = {passed:false};
      try {
        await evaluate('system', "lockScreen.unlock(true);ScreenManager.turnScreenOn(true);return true;");
        await evaluate('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://settings.localhost:8765/manifest.webapp'});return true;");
        await evaluate('settings', "require(['modules/settings_service'],s=>s.navigate('display'));return true;");
        await wait('settings', "return !!document.querySelector('#display.current .brightness-manual input');");
        const old = await evaluate('system', "return ScreenManager._userBrightness;");
        const set = async value => {
          await evaluate('settings', `const input=document.querySelector('#display .brightness-manual input');input.value=${value};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;`);
          const expected = Math.round(value * Number(await IOUtils.readUTF8('/sys/class/backlight/panel0-backlight/max_brightness')));
          const start=Date.now();
          let measured;
          do {
            await sleep(100);
            measured=Number(await IOUtils.readUTF8('/sys/class/backlight/panel0-backlight/brightness'));
            if (Math.abs(measured-expected)<=3) {brightnessCheck.lastSettleMs=Date.now()-start;return measured;}
          } while (Date.now()-start<5000);
          throw Error(`Backlight did not reach ${expected}: ${measured}`);
        };
        try {brightnessCheck.low=await set(0.35);brightnessCheck.high=await set(0.8);brightnessCheck.passed=brightnessCheck.low>0 && brightnessCheck.high>brightnessCheck.low;}
        finally {await set(Number.isFinite(old)?old:0.8);}
      } catch(error) {brightnessCheck.error=String(error);}
      finally {win.document.getElementById('home').click();}
      controls.brightness=brightnessCheck;
      await IOUtils.writeJSON(`${root}/logs/controls.json`, controls);
    }
    report.layout=await evaluate('homescreen',"return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,rootFont:getComputedStyle(document.documentElement).fontSize,bodyFont:getComputedStyle(document.body).fontFamily,zoom:visualViewport.scale,rootWidth:document.documentElement.scrollWidth};");
    report.textFonts = await evaluate('homescreen', `
      await document.fonts.ready;
      return Array.from(document.fonts, f => ({family:f.family,weight:f.weight,style:f.style,status:f.status}));
    `);
    report.checks.firaLoaded = report.textFonts.some(f => f.family === 'FiraSans' && f.weight === '400' && f.status === 'loaded');
    try {
      report.renderedFonts = {
        system: await evaluate('system', null, 'RenderedFonts'),
        homescreen: await evaluate('homescreen', null, 'RenderedFonts'),
      };
    } catch (error) { report.renderedFontsError = String(error); }


    try {
      report.graphics=Cc['@mozilla.org/gfx/info;1'].getService(Ci.nsIGfxInfo).getFeatures();
    } catch(error) {report.graphicsError=String(error);}
    await sleep(1500);
    try {
      const bitmap=await win.browsingContext.currentWindowGlobal.drawSnapshot(
        new win.DOMRect(0,0,win.innerWidth,win.innerHeight),1,'white');
      const canvas=win.document.createElementNS('http://www.w3.org/1999/xhtml','canvas');
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      await IOUtils.write(`${root}/logs/home.png`,new Uint8Array(await blob.arrayBuffer()));
      report.screenshot='home.png';
    } catch(error) {report.screenshotError=String(error);}
    report.passed = Object.values(report.checks).every(value => value === true);

  } catch(error) {
    report.error=String(error)+'\n'+error.stack;
    report.contexts=contextState(win.browsingContext);
    report.host=hostState();
    try {report.systemState=await evaluate('system',"return {ready:document.readyState,visibility:document.visibilityState,state:document.body?.getAttribute('ready-state'),text:document.body?.innerText.slice(0,1000)};");}
    catch(stateError) {report.stateError=String(stateError);}
  }
  Services.console.unregisterListener(listener);
  clearInterval(trace);
  await IOUtils.writeJSON(`${root}/logs/test.json`,report);
  dump('TUNDRA_DROIDIAN_TEST '+JSON.stringify(report)+'\n');

}
