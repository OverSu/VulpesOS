// SPDX-License-Identifier: MPL-2.0
// Settings navigation and bounded readback tests, enabled by a private marker.
export async function auditSettings({evaluate,wait,sleep,save}) {
  const context=new Set(['wifi-status','wifi-auth','wifi-joinHidden','wifi-wps','wifi-enterCertificateNickname','call-cf-not-reachable-settings','call-cf-no-reply-settings','call-cf-mobile-busy-settings','call-cf-unconditional-settings','call-voiceMailSettings','hotspot-wifiSettings','screenLock-passcode','apn-editor','apn-list','appPermissions-details','addon-details','homescreen-details','frame','simpin-dialog','call-fdnList-add','call-barring-passcode-change','settings-alert-dialog','settings-confirm-dialog','settings-prompt-dialog','ums-partial-warning','template-messaging','full-developer-mode-warning','full-developer-mode-final-warning']);
  await evaluate('system','ScreenManager.turnScreenOn(true);if(Service.query("locked"))await Service.request("unlock",{forcibly:true});await VulpesCompat.call("apps.launch",{manifestURL:"http://settings.localhost:8765/manifest.webapp"});return true;');
  await wait('settings','return document.readyState==="complete" && typeof require==="function";');
  const ids=await evaluate('settings','return Array.from(document.querySelectorAll("section[id]"),e=>e.id);');
  const report={scope:'navigation only; no destructive actions, SIM PIN attempts or subscriptions',panels:{}};
  for(const id of ids) {
    if(context.has(id)){report.panels[id]={contextRequired:true};continue;}
    try {
      await evaluate('settings',`window.__vulpesDiagnostics=[];require(['modules/settings_service'],s=>s.navigate(${JSON.stringify(id)},${JSON.stringify(id==='messaging-details'?{cardIndex:0}:{})}));return true;`);
      await wait('settings',`return document.querySelector('section.current')?.id===${JSON.stringify(id)};`,25000);
      // Slow carrier queries continue after the panel appears. Wait for those
      // controls before leaving, rather than flooding the radio worker while
      // sweeping every panel in a few milliseconds.
      if(id==='call')await wait('settings',"return !document.querySelector('#ril-callerId').disabled;",30000);
      if(id==='call-forwarding')await wait('settings',"return !!document.querySelector('#call-forwarding .callForwardingUnconditional[aria-disabled=false]');",30000);
      await sleep(450);
      report.panels[id]=await evaluate('settings',`const p=document.getElementById(${JSON.stringify(id)});return {opened:true,title:p.querySelector('h1')?.textContent,unavailable:!!p.querySelector('[data-vulpes-unavailable]'),links:Array.from(p.querySelectorAll('a[href^="#"]'),e=>e.getAttribute('href')),controls:Array.from(p.querySelectorAll('input,select,gaia-switch,gaia-checkbox'),e=>({name:e.name||e.id||e.getAttribute('name'),disabled:!!e.disabled,hidden:!e.checkVisibility()})),errors:window.__vulpesDiagnostics};`);
    } catch(error) {
      report.panels[id]={opened:false,error:String(error),errors:await evaluate('settings','return window.__vulpesDiagnostics;')};
      await evaluate('settings','location.reload();return true;');await sleep(1500);
      await wait('settings','return document.readyState==="complete" && typeof require==="function";');
    }
    await save(report);
  }
  report.dialogs={};
  for(const [id,method,options] of [
    ['settings-confirm-dialog','confirm',{}],['settings-prompt-dialog','prompt',{}],['settings-alert-dialog','alert',{}],
    ['wifi-auth','show',{network:{ssid:'Audit — not connected',security:['WPA-PSK']},security:'WPA-PSK',sl:3}],
    ['wifi-status','show',{network:{ssid:'Audit — not connected',security:[]},security:'',sl:3}],
    ['wifi-joinHidden','show',{}],['screenLock-passcode','show',{mode:'create'}]
  ]) {
    try {
      await evaluate('settings',`window.__dialogResult=null;window.__vulpesDiagnostics=[];require(['modules/dialog_service'],d=>d.${method}(${JSON.stringify(method==='show'?id:'cancel')},${JSON.stringify(options)}).then(r=>window.__dialogResult=r,e=>window.__dialogResult={error:String(e)}));return true;`);
      await wait('settings',`return document.getElementById(${JSON.stringify(id)}).classList.contains('current');`,3000);
      await evaluate('settings',`const p=document.getElementById(${JSON.stringify(id)});const button=p.querySelector('button[type=reset]')||p.querySelector('button[type=submit]');if(button)button.click();else p.querySelector('gaia-header')?.dispatchEvent(new CustomEvent('action'));return true;`);
      await wait('settings',`return !!window.__dialogResult;`,3000);
      report.dialogs[id]=await evaluate('settings',`return {result:window.__dialogResult,errors:window.__vulpesDiagnostics,closed:!document.getElementById(${JSON.stringify(id)}).classList.contains('current')};`);
    } catch(error) {
      report.dialogs[id]={error:String(error),errors:await evaluate('settings','return window.__vulpesDiagnostics;')};
      await evaluate('settings','location.reload();return true;');await sleep(1500);
      await wait('settings','return document.readyState==="complete" && typeof require==="function";');
    }
    await save(report);
  }
  report.effects={};
  for(const [name,code] of Object.entries({
    storage:'return await VulpesCompat.call("storage.stats",{});',
    modemReadback:'const read=await VulpesCompat.call("platform.mobileSettings",{action:"network"});if(typeof read.enabled!=="boolean")throw Error("Unknown data state");const after=await VulpesCompat.call("platform.mobileSettings",{action:"dataEnabled",enabled:read.enabled});return {same:read.enabled===after.enabled,registered:after.status,technology:after.technology};',
    clockReadback:'const read=await VulpesCompat.call("platform.deviceSettings",{action:"clock"});const after=await VulpesCompat.call("platform.deviceSettings",{action:"setTimezone",timezone:read.timezone});return {same:read.timezone===after.timezone,timezone:after.timezone,automaticAvailable:after.automaticAvailable};'
  })) {
    try {report.effects[name]=await evaluate('settings',code);}
    catch(error){report.effects[name]={error:String(error)};}
  }
  report.networkUi={};
  try {
    await evaluate('settings',"window.__vulpesDiagnostics=[];require(['modules/settings_service'],s=>s.navigate('operator-settings'));return true;");
    await wait('settings',"return document.querySelector('#operator-settings.current select:not([disabled])')?.options.length>0;",7000);
    report.networkUi.radio=await evaluate('settings',"const s=document.querySelector('#operator-settings select');s.dispatchEvent(new Event('change',{bubbles:true}));return {mode:s.value,choices:Array.from(s.options,o=>o.value)};");
    await wait('settings',"return !document.querySelector('#operator-settings select').disabled;",7000);
    report.networkUi.radio.same=await evaluate('settings',`return document.querySelector('#operator-settings select').value===${JSON.stringify(report.networkUi.radio.mode)};`);
    for(const type of ['default','mms']) {
      await evaluate('settings',`require(['modules/settings_service'],s=>s.navigate('apn-settings'));return true;`);
      await wait('settings',"return !!document.querySelector('#apn-settings.current [data-apn-type]');",4000);
      await evaluate('settings',`document.querySelector('#apn-settings [data-apn-type=${type}]').click();return true;`);
      await wait('settings',"return !!document.querySelector('#apn-list.current label.name');",7000);
      await evaluate('settings',"document.querySelector('#apn-list label.name').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return true;");
      await wait('settings',"return !!document.querySelector('#apn-editor.current .apn:not([disabled])');",7000);
      report.networkUi[type]=await evaluate('settings',"const p=document.querySelector('#apn-editor');return {opened:true,apnPopulated:!!p.querySelector('.apn').value,passwordBlank:p.querySelector('.password').value==='',protocol:p.querySelector('.protocol').value,authentication:p.querySelector('.authtype').value,mmscEditable:!p.querySelector('.mmsc').disabled};");
      // Submit the current APN unchanged, through Gaia. Never change operator
      // credentials, activate a bearer or expose any APN/user/password in logs.
      await evaluate('settings',"const p=document.querySelector('#apn-editor');p.querySelector('.apn').dispatchEvent(new Event('input',{bubbles:true}));p.querySelector('.ok').click();return true;");
      await wait('settings',"return !!document.querySelector('#apn-list.current label.name');",7000);
      report.networkUi[type].savedUnchanged=true;
    }
    report.networkUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');
  } catch(error) {report.networkUi.error=String(error);report.networkUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');}
  report.supplementaryUi={};
  try {
    await evaluate('settings',"window.__vulpesDiagnostics=[];require(['modules/settings_service'],s=>s.navigate('call'));return true;");
    await wait('settings',"return !!document.querySelector('#call.current #ril-callerId:not([disabled])');",30000);
    report.supplementaryUi.calls=await evaluate('settings',"return {waitingEnabled:!document.querySelector('#menuItem-callWaiting gaia-switch').disabled,callerEnabled:!document.querySelector('#ril-callerId').disabled};");
    await evaluate('settings',"document.querySelector('#ril-callerId').dispatchEvent(new Event('change',{bubbles:true}));return true;");
    await wait('settings',"return !document.querySelector('#ril-callerId').disabled;",50000);
    report.supplementaryUi.callerSavedUnchanged=true;
    await evaluate('settings',"require(['modules/settings_service'],s=>s.navigate('call-forwarding'));return true;");
    await wait('settings',"return !!document.querySelector('#call-forwarding.current .callForwardingUnconditional[aria-disabled=false]');",30000);
    report.supplementaryUi.dialogs={};
    for(const [selector,id] of [
      ['.callForwardingUnconditional','call-cf-unconditional-settings'],['.callForwardingMobileBusy','call-cf-mobile-busy-settings'],
      ['.callForwardingNoReply','call-cf-no-reply-settings'],['.callForwardingNotReachable','call-cf-not-reachable-settings']
    ]) {
      await evaluate('settings',`document.querySelector('#call-forwarding ${selector}').click();return true;`);
      await wait('settings',`return document.getElementById('${id}').classList.contains('current');`,4000);
      await evaluate('settings',`document.querySelector('#${id} button[type=reset]').click();return true;`);
      await wait('settings',"return document.getElementById('call-forwarding').classList.contains('current');",4000);
      report.supplementaryUi.dialogs[id]={opened:true,cancelled:true};
    }
    report.supplementaryUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');
  } catch(error) {report.supplementaryUi.error=String(error);report.supplementaryUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');}
  report.hotspotUi={};
  try {
    await evaluate('settings',"window.__vulpesDiagnostics=[];require(['modules/settings_service'],s=>s.navigate('hotspot'));return true;");
    await wait('settings',"return !!document.querySelector('#hotspot.current #tethering-wifi-enabled:not([disabled])');",10000);
    await evaluate('settings',"document.querySelector('#hotspot-settings-section a').click();return true;");
    await wait('settings',"return document.getElementById('hotspot-wifiSettings').classList.contains('current');",4000);
    report.hotspotUi=await evaluate('settings',"const p=document.getElementById('hotspot-wifiSettings');return {opened:true,securityChoices:p.querySelector('select').options.length,passwordMasked:p.querySelector('input[name=password]').type==='password'};");
    await evaluate('settings',"document.querySelector('#hotspot-wifiSettings button[type=reset]').click();return true;");
    await wait('settings',"return document.getElementById('hotspot').classList.contains('current') && !document.getElementById('hotspot-wifiSettings').classList.contains('current') && !document.querySelector('#tethering-wifi-enabled').disabled;",4000);
    report.hotspotUi.cancelled=true;
    const unconfigured=await evaluate('settings',"const s=await VulpesCompat.call('platform.wifi',{operation:'hotspotStatus'});return !s.configured && !s.enabled;");
    if(unconfigured) {
      await evaluate('settings',"document.querySelector('#hotspot-settings-section a').click();return true;");
      await wait('settings',"return document.getElementById('hotspot-wifiSettings').classList.contains('current');",4000);
      await evaluate('settings',"const p=document.getElementById('hotspot-wifiSettings');p.querySelector('input[type=text]').value='Vulpes-qualification';p.querySelector('select').value='wpa2-psk';p.querySelector('input[name=password]').value=crypto.randomUUID();p.querySelector('button[type=submit]').click();return true;");
      await wait('settings',"return !!document.querySelector('#hotspot.current #tethering-wifi-enabled:not([disabled])') && !document.getElementById('hotspot-wifiSettings').classList.contains('current');",10000);
      report.hotspotUi.configuredByAudit=true;
      for(const enabled of [true,false]) {
        await evaluate('settings',`const c=document.querySelector('#tethering-wifi-enabled');c.checked=${enabled};c.dispatchEvent(new Event('change',{bubbles:true}));return true;`);
        await wait('settings',`const c=document.querySelector('#tethering-wifi-enabled');return !c.disabled && c.checked===${enabled};`,90000);
        const actual=await evaluate('settings',"return (await VulpesCompat.call('platform.wifi',{operation:'hotspotStatus'})).enabled;");
        if(actual!==enabled)throw Error('Hotspot UI/readback mismatch');
        report.hotspotUi[enabled?'started':'stopped']=true;
      }
    }
    report.hotspotUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');
  } catch(error) {report.hotspotUi.error=String(error);report.hotspotUi.errors=await evaluate('settings','return window.__vulpesDiagnostics;');report.hotspotUi.formState=await evaluate('settings',"const p=document.getElementById('hotspot-wifiSettings');return {current:p.classList.contains('current'),message:p.querySelector('[role=status]')?.textContent,submitDisabled:p.querySelector('button[type=submit]')?.disabled};");}
  report.scope='panel navigation plus storage read and idempotent data/timezone/radio/APN write/readback; temporary hotspot start/stop when initially unconfigured; no destructive actions, PIN attempts or subscriptions';
  await evaluate('settings','require(["modules/settings_service"],s=>s.navigate("root"));return true;');
  return report;
}
