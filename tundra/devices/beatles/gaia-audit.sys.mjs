import {tundraRadio} from 'resource://vulpes/host/Tundra.sys.mjs';
import {setTimeout} from 'resource://gre/modules/Timer.sys.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function install() {
  Services.obs.addObserver(function opened(win) {
    win.addEventListener('load',()=>{
      if(win.location.href==='chrome://vulpes/content/shell.xhtml') run(win).catch(Cu.reportError);
    },{once:true});
  },'chrome-document-global-created');
}

async function run(win) {
  const report={engine:Services.appinfo.platformVersion,build:Services.appinfo.platformBuildID,started:Date.now()};
  const save=()=>IOUtils.writeJSON('/work/gaia-audit.json',report);
  try {
    for(let i=0;i<600&&!win.hostReady;i++)await sleep(200);
    if(!win.hostReady)throw Error('Host startup timeout');
    ChromeUtils.registerWindowActor('VulpesProbe',{
      child:{esModuleURI:'resource://vulpes/tests/ProbeChild.sys.mjs'},
      allFrames:true,safeForUntrustedWebProcess:true,
    });
    const system=win.document.getElementById('system').browsingContext;
    const find=(context,app)=>{
      if(context.currentWindowGlobal?.documentURI.spec.startsWith('http://'+app+'.localhost:8765/'))return context;
      for(const child of context.children){const result=find(child,app);if(result)return result;}
      return null;
    };
    const evaluate=(app,script)=>find(system,app).currentWindowGlobal.getActor('VulpesProbe').sendQuery('Evaluate',script);
    for(let i=0;i<300;i++) {
      if(find(system,'homescreen') && await evaluate('homescreen',"return document.querySelectorAll('gaia-app-icon').length>0;"))break;
      await sleep(200);
    }
    report.system=await evaluate('system','return {ready:!!window.applications?.ready,size:[innerWidth,innerHeight]};');
    report.homescreen=await evaluate('homescreen',"return {icons:document.querySelectorAll('gaia-app-icon').length,size:[innerWidth,innerHeight],text:document.body.innerText.slice(0,300)};");
    for(let i=0;i<60;i++) {
      report.icons=await evaluate('homescreen',"return [...document.querySelectorAll('gaia-app-icon')].map(e=>({id:e.dataset.identifier,loaded:!!e._hasIcon,pending:!!e._image,images:[...(e._container?.querySelectorAll('img') || [])].map(i=>({width:i.naturalWidth,complete:i.complete}))}));");
      report.logoHidden=await evaluate('system',"var e=document.getElementById('os-logo');return !e || !e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) || Number(getComputedStyle(e).opacity)<.05;");
      if(report.logoHidden&&report.icons.length>=4&&report.icons.slice(0,4).every(icon=>icon.images.some(image=>image.complete&&image.width>0)))break;
      await sleep(500);
    }
    report.homescreen.icons=report.icons.length;
    report.compactUI=await evaluate('homescreen',"return {height:innerHeight,singlePanel:document.getElementById('panels').scrollWidth===document.getElementById('panels').clientWidth,indicatorsHidden:getComputedStyle(document.getElementById('page-indicator-header')).display==='none',pinnedPagesHidden:getComputedStyle(document.getElementById('pages-panel')).display==='none'};");
    report.homeSearchHidden=await evaluate('system',"return getComputedStyle(document.querySelector('#homescreen > .chrome')).display==='none';");
    report.layout=await evaluate('homescreen',"return {mode:document.documentElement.dataset.vulpesLayout,icons:[...document.querySelectorAll('gaia-app-icon')].slice(0,9).map(e=>({rect:e.getBoundingClientRect().toJSON(),image:e._container?.querySelector('img')?.getBoundingClientRect().toJSON()}))};");
    report.hardware=await evaluate('system',"return await VulpesCompat.call('platform.snapshot',{});");
    report.radioAPI=await evaluate('system',"return {slots:navigator.mozMobileConnections?.length || 0,battery:navigator.battery.level,signal:!!document.getElementById('statusbar-mobile-connection'),radioUnavailable:document.documentElement.hasAttribute('data-vulpes-radio-unavailable'),cards:navigator.mozIccManager.iccIds.map(id=>navigator.mozIccManager.getIccById(id).cardState),connections:[...navigator.mozMobileConnections].map(c=>({radioState:c.radioState,registered:c.voice.connected,type:c.voice.type,signal:c.voice.relSignalStrength}))};");
    if(Services.env.get('VULPES_TUNDRA_RADIO')==='1') {
      for(let attempt=0;attempt<30;attempt++) {
        report.phoneBroker=await tundraRadio('status');
        if(report.phoneBroker.ready) {
          try {report.currentCallCount=(await tundraRadio('calls')).length;break;} catch (_) {}
        }
        await sleep(1000);
      }
      if(report.currentCallCount===undefined)throw Error('Phone broker did not become ready');
      try {report.callAudio=await tundraRadio('callAudio',{settings:{operation:'status'}});}
      catch(error) {report.callAudio={error:error.message};}
      try { await tundraRadio('sms',{number:'INVALID',body:'validation only'});report.invalidSmsRejected=false; }
      catch(error) { report.invalidSmsRejected=error.message==='INVALID_NUMBER'; }
    }
    report.readyMs=Date.now()-report.started;
    const image=await win.browsingContext.currentWindowGlobal.drawSnapshot(new win.DOMRect(0,0,win.innerWidth,win.innerHeight),1,'white');
    const canvas=win.document.createElementNS('http://www.w3.org/1999/xhtml','canvas');
    canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);image.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    await IOUtils.write('/work/gaia-native.png',new Uint8Array(await blob.arrayBuffer()));
    await save();
    if(Services.env.get("VULPES_TRIAL_MANUAL")==="1") {
      let last='';
      while(!win.closed) {
        try {
          const request=await IOUtils.readJSON('/work/manual-request.json');
          if(typeof request.id==='string' && request.id!==last) {
            last=request.id;
            let response;
            try {
              if(request.app==='screenshot') {
                const picture=await win.browsingContext.currentWindowGlobal.drawSnapshot(new win.DOMRect(0,0,win.innerWidth,win.innerHeight),1,'white');
                canvas.getContext('2d').drawImage(picture,0,0);picture.close();
                const capture=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
                await IOUtils.write('/work/manual-screen.png',new Uint8Array(await capture.arrayBuffer()));
                response={id:last,value:true};
              } else response={id:last,value:await Promise.race([
                evaluate(request.app,request.script),
                sleep(30000).then(()=>{throw Error('Manual probe timed out');})
              ])};
            } catch(error) {response={id:last,error:String(error)};}
            await IOUtils.writeJSON('/work/manual-response.json',response,{tmpPath:'/work/manual-response.tmp'});
          }
        } catch (_) {}
        await sleep(200);
      }
      return;
    }
    report.animation=await evaluate('homescreen',`return new Promise(resolve=>{let frames=0;const begin=performance.now();function tick(now){frames++;if(now-begin>=3000)resolve({frames,seconds:(now-begin)/1000,fps:frames*1000/(now-begin)});else requestAnimationFrame(tick);}requestAnimationFrame(tick);});`);
    const until=async read=>{let value;for(let i=0;i<40;i++){value=await read();if(value)return value;await sleep(250);}return value;};
    await evaluate('homescreen',"var first=document.querySelector('gaia-app-icon');first.setAttribute('tabindex','-1');first.focus();return document.activeElement===first;");
    let sequence=0;
    const key=async key=>{
      const sent=++sequence;
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:sent,key},{tmpPath:'/work/keypad-request.json.tmp'});
      for(let i=0;i<40;i++) {
        try {if((await IOUtils.readJSON('/work/keypad-response.json')).sequence===sent)return;} catch (_) {}
        await sleep(100);
      }
      throw Error('Keypad acknowledgement timed out');
    };
    report.inputPath='kernel evdev → keypad reader → XTest → GTK → host → Gaia';
    await key('ArrowRight');
    report.keypadSelection=await until(()=>evaluate('homescreen',"var id=document.querySelector('[data-vulpes-keypad-focus]')?.dataset.identifier;return id?.includes('sms.localhost') ? id : null;"));
    if(!report.keypadSelection)throw Error('Right did not select Messages');
    report.selectedAppName=await until(()=>evaluate('homescreen',"return document.getElementById('vulpes-compact-app-name')?.textContent==='Messages';"));
    await key('Enter');
    for(let i=0;i<150&&!find(system,'sms');i++)await sleep(200);
    report.smsOpened=!!find(system,'sms');
    if(report.smsOpened) {
      await until(()=>evaluate('sms',"return document.readyState==='complete' && !!document.body;"));
      await until(()=>evaluate('system',"return [...document.querySelectorAll('iframe')].some(f=>f.src.includes('sms.localhost')&&f.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));"));
      await evaluate('sms',"var input=document.createElement('input');input.id='vulpes-keypad-probe';input.type='tel';input.style='position:fixed;top:80px;left:0;z-index:99999';document.body.append(input);input.focus();return true;");
      await key('2');
      report.keypadInput=await until(()=>evaluate('sms',"return document.getElementById('vulpes-keypad-probe').value;"));
      await evaluate('sms',"var input=document.getElementById('vulpes-keypad-probe');input.value='';input.type='text';input.focus();return true;");
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'2266622'},{tmpPath:'/work/keypad-request.json.tmp'});
      report.multitap=await until(()=>evaluate('sms',"return document.getElementById('vulpes-keypad-probe').value==='bob';"));
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'#2#2'},{tmpPath:'/work/keypad-request.json.tmp'});
      report.inputModes=await until(()=>evaluate('sms',"return document.getElementById('vulpes-keypad-probe').value==='bobA2';"));
      await key('Backspace');
      report.deleteText=await until(()=>evaluate('sms',"return document.getElementById('vulpes-keypad-probe').value==='bobA';"));
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'#'},{tmpPath:'/work/keypad-request.json.tmp'});
      await until(()=>evaluate('sms',"return document.getElementById('vulpes-keypad-mode')?.textContent.startsWith('abc');"));
      await evaluate('sms',"document.getElementById('vulpes-keypad-probe').remove();document.body.focus();return true;");
      // Use the original SMS composer as well as the isolated editor probe.
      await evaluate('sms',"var button=document.getElementById('threads-composer-link');button.focus();return true;");
      await key('Enter');
      if(!await until(()=>evaluate('sms',"return typeof ConversationView!=='undefined' && Navigation.isCurrentPanel('composer') && document.activeElement.classList.contains('recipient');")))throw Error('SMS composer did not open');
      await evaluate('sms',"await App.whenReady();await new Promise(r=>setTimeout(r,400));ConversationView.recipients.focus();return true;");
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'5550100'},{tmpPath:'/work/keypad-request.json.tmp'});
      if(!await until(()=>evaluate('sms',"return document.querySelector('#messages-recipients-list [contenteditable]')?.textContent==='5550100';")))throw Error('Recipient digits did not reach the original form');
      await key('Enter');
      report.smsRecipient=await until(()=>evaluate('sms',"return ConversationView.recipients.numbers.includes('5550100');"));
      await evaluate('sms',"Compose.focus();return true;");
      await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'2266622'},{tmpPath:'/work/keypad-request.json.tmp'});
      report.smsBody=await until(()=>evaluate('sms',"return document.getElementById('messages-input').textContent.trim()==='bob';"));
      // Never send the synthetic message or retain it as a draft.
      await evaluate('sms',"ConversationView.cleanFields();return true;");
      await key('Escape');
      await until(()=>evaluate('sms',"return !Navigation.isCurrentPanel('composer');"));
      await key('Escape');
      report.returnHome=await until(()=>evaluate('system',"return [...document.querySelectorAll('iframe')].some(f=>f.src.includes('homescreen.localhost')&&f.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));"));
    }
    if(report.returnHome) {
      await evaluate('homescreen',"var icon=[...document.querySelectorAll('gaia-app-icon')].find(e=>e.dataset.identifier.includes('communications'));icon.focus();return true;");
      await key('Enter');
      report.dialerOpened=await until(()=>Promise.resolve(!!find(system,'communications')));
      if(report.dialerOpened) {
        if(!await until(()=>evaluate('communications',"return performance.getEntriesByName('contentInteractive').length>0 && document.getElementById('phone-number-view')?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});")))throw Error('Dialer keypad did not become interactive');
        await until(()=>evaluate('system',"return [...document.querySelectorAll('iframe')].some(f=>f.src.includes('communications.localhost')&&f.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));"));
        await IOUtils.writeJSON('/work/keypad-request.json',{sequence:++sequence,keys:'5550100'},{tmpPath:'/work/keypad-request.json.tmp'});
        report.dialerDigits=await until(()=>evaluate('communications',"return document.getElementById('phone-number-view')?.value==='5550100';"));
        report.dialerObserved=await evaluate('communications',"return document.getElementById('phone-number-view')?.value;");
        for(let i=0;i<7;i++){await key('Backspace');await sleep(150);}
        report.dialerClear=await until(()=>evaluate('communications',"return document.getElementById('phone-number-view')?.value==='';"));
        await key('Escape');
      }
    }
  }catch(error){report.error=String(error);report.stack=error.stack;}
  await save();
}
