// Expose the single native SIM to the original Gaia Settings controllers.
// Other applications retain their existing telephony/message adapters.
(() => {
  if (location.hostname !== 'settings.localhost' || !window.VulpesNativeTelephony) return;
  const {call} = VulpesCompat;
  const read = action => call('platform.mobileSettings', {action});
  const unavailable = () => Promise.reject(new DOMException('Not supported by this adapter', 'NotSupportedError'));
  const icc = Object.assign(new EventTarget(), {cardState:'unknown', iccInfo:null});
  const conn = Object.assign(new EventTarget(), {iccId:null, radioState:'unknown', supportedNetworkTypes:[], voice:{type:null}, data:{type:null}});
  const manager = Object.assign(new EventTarget(), {iccIds:[], getIccById:id => id && id === conn.iccId ? icc : null});
  let fixedDialing, pinEnabled;
  icc.getCardLock = async name => {
    await VulpesMobileSettings.ready;
    const enabled = name === 'fdn' ? fixedDialing : name === 'pin' ? pinEnabled : undefined;
    if (typeof enabled !== 'boolean') return unavailable();
    return {enabled};
  };
  // Fixed-dialling changes, PIN operations and SIM contacts are not ported.
  icc.getServiceState = () => Promise.resolve(false);
  for (const method of ['unlockCardLock','setCardLock','getCardLockRetryCount','readContacts','updateContact']) icc[method] = unavailable;
  // Supplementary services can fail independently of reading the SIM itself.
  // Do not pretend a modem query is a successful preference change.
  conn.getCallingLineIdRestriction = unavailable;
  conn.setCallingLineIdRestriction = unavailable;
  conn.getCallWaitingOption = () => read('calls').then(value => {
    if (!['enabled','disabled'].includes(value.VoiceCallWaiting)) throw Error('RADIO_NOT_READY');
    return value.VoiceCallWaiting === 'enabled';
  });
  conn.setCallWaitingOption = unavailable;
  conn.getVoicePrivacyMode = unavailable; conn.setVoicePrivacyMode = unavailable;
  Object.defineProperty(navigator,'mozMobileConnections',{value:[conn]});
  Object.defineProperty(navigator,'mozIccManager',{value:manager});
  Object.defineProperty(navigator,'mozMobileMessage',{value:{getSmscAddress:() => read('smsc').then(v=>({address:v.address || ''}))}});
  async function refresh() {
    const state = await read('sim');
    const previous = conn.iccId;
    conn.radioState = state.radioEnabled ? 'enabled' : 'disabled';
    conn.dispatchEvent(new Event('radiostatechange'));
    conn.iccId = state.present ? state.id : null;
    fixedDialing = state.fixedDialing; pinEnabled = state.pinEnabled;
    manager.iccIds = conn.iccId ? [conn.iccId] : [];
    icc.cardState = !state.present ? 'absent' : state.pin === 'none' ? 'ready' : state.pin === 'pin' ? 'pinRequired' : state.pin === 'puk' ? 'pukRequired' : 'unknown';
    icc.iccInfo = {iccid:conn.iccId, spn:state.operator, msisdn:state.numbers?.[0] || '', iccType:'sim', isDisplaySpnRequired:true};
    if (previous !== conn.iccId) manager.dispatchEvent(Object.assign(new Event(conn.iccId ? 'iccdetected' : 'iccundetected'),{iccId:conn.iccId || previous}));
    icc.dispatchEvent(new Event('cardstatechange')); icc.dispatchEvent(new Event('iccinfochange'));
  }
  let messageState, changing = false;
  async function messaging(panel) {
    const control=panel.querySelector('[name="ril.sms.requestStatusReport.enabled"]');
    if (!control || control.dataset.vulpesBound) return;
    control.dataset.vulpesBound='true'; control.disabled=true;
    control.addEventListener('change', async event => {
      event.stopImmediatePropagation();
      const desired=control.checked;
      if (changing || typeof messageState !== 'boolean') return;
      changing=true;control.disabled=true;
      try {
        const result=await call('platform.mobileSettings',{action:'deliveryReports',enabled:desired});
        messageState=result.deliveryReports;
        await navigator.mozSettings.createLock().set({'ril.sms.requestStatusReport.enabled':messageState});
      } catch(error) {window.VulpesGaiaUI?.notice('SMS: '+error.message);}
      finally {control.checked=messageState;changing=false;control.disabled=false;}
    },true);
    try {
      const state=await read('messages');
      if (typeof state.deliveryReports !== 'boolean') return;
      messageState=state.deliveryReports;
      control.checked=messageState;
      await navigator.mozSettings.createLock().set({'ril.sms.requestStatusReport.enabled':messageState});
      control.disabled=false;control.closest('li').removeAttribute('aria-disabled');
      control.dataset.vulpesSupported='true';
    } catch(error) {console.warn('Message settings:',error.message);}
  }
  function carrierPanel() {
    let panel, state, pending=false;
    const controls = () => [panel.querySelector('#menuItem-enableDataCall gaia-switch'), panel.querySelector('#menuItem-enableDataRoaming gaia-switch')];
    async function sync() {
      if(typeof state?.enabled==='boolean' && typeof state?.roaming==='boolean')
        await navigator.mozSettings.createLock().set({'ril.data.enabled':state.enabled,'ril.data.roaming_enabled':state.roaming});
    }
    function render() {
      const [data,roaming]=controls();
      for(const [control,key] of [[data,'enabled'],[roaming,'roaming']]) {
        control.disabled=pending || typeof state?.[key]!=='boolean';
        control.checked=state?.[key]===true;
        control.closest('li').setAttribute('aria-disabled',String(control.disabled));
      }
      panel.querySelector('.carrier-info').hidden=false;
      panel.querySelector('.carrier-advancedSettings').hidden=false;
      panel.querySelector('#dataNetwork-desc').textContent=[state?.operator,(state?.technology||'').toUpperCase(),state?.status].filter(Boolean).join(' · ');
    }
    return {
      onInit(element) {
        panel=element;
        for(const [control,action] of [[controls()[0],'dataEnabled'],[controls()[1],'roaming']]) {
          control.addEventListener('change',async event=>{
            event.stopImmediatePropagation();if(pending)return;
            const enabled=control.checked;pending=true;render();
            try {state=await call('platform.mobileSettings',{action,enabled});await sync();}
            catch(error) {window.VulpesGaiaUI?.notice(error.message);}
            finally {pending=false;render();}
          },true);
        }
      },
      async onBeforeShow() {
        pending=true;render();
        try {state=await read('network');await sync();}
        catch(error) {window.VulpesGaiaUI?.notice(error.message);}
        finally {pending=false;render();}
      }
    };
  }
  const fr = () => document.documentElement.lang.toLowerCase().startsWith('fr');
  const text = (f,e) => fr()?f:e;
  const navigate = (id,options={}) => require(['modules/settings_service'],service=>service.navigate(id,options));
  function explain(panel,key,message) {
    let row=panel.querySelector('[data-vulpes-note="'+key+'"]');
    if(!row) {row=document.createElement('p');row.className='explanation';row.dataset.vulpesNote=key;(panel.querySelector(':scope > div')||panel).prepend(row);}
    row.textContent=message;
  }
  function failure(error) {
    const messages={
      APN_IN_USE:text('Désactivez les données mobiles avant de modifier ce profil actif.','Turn off mobile data before editing this active profile.'),
      APN_WRITE_FAILED:text('Enregistrement impossible. Le profil précédent a été restauré.','Could not save. The previous profile was restored.'),
      APN_ROLLBACK_FAILED:text('Le profil n’a pas pu être restauré. Vérifiez ses paramètres avant de réactiver les données.','The profile could not be restored. Check its settings before re-enabling data.'),
      RADIO_READBACK_FAILED:text('Le réseau n’a pas confirmé le réglage. Son état va être relu.','The network did not confirm the setting. Its state will be read again.'),
      INVALID_REQUEST:text('Vérifiez les valeurs saisies.','Check the values you entered.')
    };
    window.VulpesGaiaUI?.notice(messages[error.message]||text('Le service réseau n’a pas pu appliquer ce réglage.','The network service could not apply this setting.'));
  }
  function callPanel() {
    let panel,waiting,caller,state,pending=false;
    const modes={default:'CLIR_DEFAULT',enabled:'CLIR_INVOCATION',disabled:'CLIR_SUPPRESSION'};
    function render() {
      waiting.disabled=pending || !['enabled','disabled'].includes(state?.VoiceCallWaiting);
      waiting.checked=state?.VoiceCallWaiting==='enabled';
      waiting.closest('li').dataset.state=waiting.disabled?'unknown':waiting.checked?'on':'off';
      caller.disabled=pending || !Object.hasOwn(modes,state?.HideCallerId);
      caller.value=modes[state?.HideCallerId]||'';
      for(const c of [waiting,caller])c.closest('li').setAttribute('aria-disabled',String(c.disabled));
      explain(panel,'call-state',pending?text('Interrogation du réseau… Cela peut prendre plusieurs secondes.','Querying the network… This may take several seconds.'):text('Le double appel et la présentation du numéro utilisent les réglages de votre opérateur.','Call waiting and caller ID use your carrier’s settings.'));
    }
    async function update(params) {
      if(pending)return;
      pending=true;render();
      try {state=await call('platform.mobileSettings',params);}
      catch(error) {state=null;failure(error);try {state=await read('calls');}catch(_) {}}
      finally {pending=false;render();}
    }
    return {onInit(element){
      panel=element;waiting=panel.querySelector('#menuItem-callWaiting gaia-switch');caller=panel.querySelector('#ril-callerId');caller.removeAttribute('data-setting');
      for(const id of ['menuItem-callWaiting','menuItem-callerId','menuItem-callForwarding','menuItem-callFdn','menuItem-callBarring'])panel.querySelector('#'+id).hidden=false;
      waiting.addEventListener('change',()=>update({action:'setCallWaiting',enabled:waiting.checked}));
      caller.addEventListener('change',()=>update({action:'setCallerId',mode:Object.keys(modes).find(key=>modes[key]===caller.value)}));
      for(const [id,target] of [['menuItem-callForwarding','call-forwarding'],['menuItem-callFdn','call-fdnSettings'],['menuItem-callBarring','call-cbSettings']]) {
        const a=panel.querySelector('#'+id+' a');a.removeAttribute('data-href');a.href='#'+target;
        a.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();navigate(target);},true);
      }
      const voicemail=panel.querySelector('.menuItem-voicemail');voicemail.setAttribute('aria-disabled','true');
      voicemail.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
      document.l10n.setAttributes(panel.querySelector('#voiceMail-desc'),'unavailable');
      explain(panel,'call-limits',text('Le numéro de messagerie vocale, les numéros autorisés et le blocage des appels ne sont pas encore raccordés.','Voicemail number, fixed dialling and call barring are not connected yet.'));
      render();
    },onBeforeShow(){void update({action:'calls'});}};
  }
  function forwardingPanel() {
    let panel,state,pending=false;
    const rows={
      unconditional:['cfu','call-cf-unconditional-settings','.callForwardingUnconditional'],
      busy:['cfmb','call-cf-mobile-busy-settings','.callForwardingMobileBusy'],
      noReply:['cfnrep','call-cf-no-reply-settings','.callForwardingNoReply'],
      notReachable:['cfnrea','call-cf-not-reachable-settings','.callForwardingNotReachable']
    };
    function render() {
      for(const [reason,[id,,selector]] of Object.entries(rows)) {
        const known=typeof state?.[reason]==='string';
        panel.querySelector(selector).setAttribute('aria-disabled',String(pending||!known));
        const node=panel.querySelector('#'+id+'-desc');
        document.l10n.setAttributes(node,pending?'callSettingsQuery':!known?'callSettingsQueryError':state[reason]?'callForwardingForwardingVoiceToNumber':'callForwardingNotForwarding',state?.[reason]?{number:state[reason]}:{});
      }
    }
    async function load() {
      if(pending)return;
      pending=true;render();
      try {state=await read('forwarding');}catch(error){state=null;failure(error);}
      finally {pending=false;render();}
    }
    return {onInit(element){
      panel=element;
      for(const [reason,[,dialog,selector]] of Object.entries(rows))panel.querySelector(selector).addEventListener('click',async event=>{
        event.preventDefault();event.stopImmediatePropagation();
        if(pending || typeof state?.[reason]!=='string')return;
        const service=await new Promise(resolve=>require(['modules/dialog_service'],resolve));
        const result=await service.show(dialog,{number:state[reason],enabled:!!state[reason]});
        if(result.type!=='submit')return;
        const enabled=!!result.value.enabled;
        const number=enabled?String(result.value.number||'').replace(/[\s()-]/g,''):'';
        pending=true;render();
        try {state=await call('platform.mobileSettings',{action:'setForwarding',reason,enabled,number});}
        catch(error){failure(error);try{state=await read('forwarding');}catch(_){state=null;}}
        finally {pending=false;render();}
      });
    },onBeforeShow(){void load();}};
  }

  function operatorPanel() {
    let panel,select,pending=false,state;
    return {
      onInit(element) {
        panel=element;select=panel.querySelector('.preferred-network-type select');
        // Operator scanning/registration has a different service and remains
        // unavailable; it must not be confused with the radio mode selector.
        panel.querySelector('.auto-select gaia-switch').disabled=true;
        panel.querySelector('.search-btn').disabled=true;
        select.addEventListener('change',async()=>{
          if(pending || !state)return;
          const mode=select.value;pending=true;select.disabled=true;
          try {state=await call('platform.mobileSettings',{action:'setRadioMode',mode});}
          catch(error){failure(error);}
          finally {select.value=state.mode;pending=false;select.disabled=false;}
        });
      },
      async onBeforeShow() {
        select.disabled=true;
        explain(panel,'operator',text('Le type de réseau est réglable. La recherche et la sélection manuelle d’opérateur ne sont pas encore raccordées.','Network type can be changed. Operator scanning and manual selection are not connected yet.'));
        try {
          const [radio,network]=await Promise.all([read('radioMode'),read('network')]);state=radio;
          select.replaceChildren();
          const names={any:text('Automatique','Automatic'),gsm:'2G (GSM)',umts:'3G (UMTS)',lte:'4G (LTE)'};
          for(const mode of radio.available)select.add(new Option(names[mode]||mode,mode));
          select.value=radio.mode;select.disabled=!radio.available.includes(radio.mode);
          panel.querySelector('.auto-select gaia-switch').checked=network.mode==='auto';
        } catch(error){failure(error);}
      }
    };
  }
  function apnSettingsPanel() {
    return {onInit(panel){
      for(const anchor of panel.querySelectorAll('[data-apn-type]')) {
        const supported=['default','mms'].includes(anchor.dataset.apnType);
        if(!supported)anchor.setAttribute('aria-disabled','true');
        anchor.addEventListener('click',event=>{
          event.preventDefault();event.stopImmediatePropagation();
          if(supported)navigate('apn-list',{type:anchor.dataset.apnType});
        });
      }
      panel.querySelector('.reset-apn').disabled=true;
    },onBeforeShow(panel){
      explain(panel,'apn',text('Modifiez les profils Internet et MMS existants. Les profils IMS restent gérés par le modem. L’ajout, la suppression et la réinitialisation ne sont pas encore disponibles.','Edit existing Internet and MMS profiles. IMS profiles remain managed by the modem. Adding, deleting and resetting profiles are not available yet.'));
    }};
  }
  function apnListPanel() {
    let panel,type='default';
    return {onInit(element){panel=element;panel.querySelector('.add-apn').disabled=true;panel.querySelector('gaia-header').dataset.href='#apn-settings';},
      async onBeforeShow(element,options={}) {
        type=options.type==='mms'?'mms':'default';
        document.l10n.setAttributes(panel.querySelector('h1'),type==='mms'?'messageSettings-header':'dataSettings-header');
        const list=panel.querySelector('.apn-list');list.replaceChildren();
        try {
          const profiles=(await read('apns')).filter(p=>p.type===type);
          const template=await new Promise(resolve=>require(['panels/apn_list/apn_template_factory'],factory=>resolve(factory(type,item=>navigate('apn-editor',{profileId:item.id,type}),()=>{}))));
          for(const profile of profiles) {
            const li=template({id:profile.id,apn:{apn:profile.fields.apn},active:profile.active});
            // This mark reflects an active data context; changing the profile
            // does not activate/deactivate a bearer implicitly.
            const radio=li.querySelector('gaia-radio');radio.setAttribute('aria-readonly','true');
            list.append(li);
          }
          explain(panel,'list',profiles.length?text('Touchez le nom du profil pour le modifier.','Tap a profile name to edit it.'):text('Aucun profil fourni par le modem.','The modem returned no profile.'));
        }catch(error){failure(error);}
      }
    };
  }
  function apnEditorPanel() {
    let panel,profile,pending=false,dirty=new Set();
    const selectors={apn:'.apn',user:'.user',password:'.password',protocol:'.protocol',authtype:'.authtype',mmsc:'.mmsc',mmsproxy:'.mmsproxy'};
    const protocols={ip:'IP',ipv6:'IPV6',dual:'IPV4V6'};
    const auth={none:'none',pap:'pap',chap:'chap',any:'papOrChap'};
    function editable() {
      for(const [key,selector] of Object.entries(selectors))panel.querySelector(selector).disabled=pending || !profile || (['mmsc','mmsproxy'].includes(key)&&profile.type!=='mms');
      panel.querySelector('.ok').disabled=pending || !profile;
    }
    function render() {
      editable();
      for(const [key,selector] of Object.entries(selectors)) {
        const input=panel.querySelector(selector);
        input.disabled=pending || !profile || (['mmsc','mmsproxy'].includes(key)&&profile.type!=='mms');
        const value=profile?.fields[key]||'';
        input.value=key==='password'?'':key==='protocol'?protocols[value]||'notDefined':key==='authtype'?auth[value]||'notDefined':value;
        if(key==='password')input.placeholder=profile?.hasPassword?text('Inchangé','Unchanged'):'';
      }
      panel.querySelector('.ok').disabled=pending || !profile;
    }
    return {onInit(element){
      panel=element;
      for(const input of panel.querySelectorAll('input,select,button'))input.disabled=true;
      for(const [key,selector] of Object.entries(selectors))for(const event of ['input','change'])panel.querySelector(selector).addEventListener(event,()=>dirty.add(key));
      panel.querySelector('.ok').addEventListener('click',async()=>{
        if(pending||!profile)return;
        const fields={};
        for(const key of dirty) {
          const value=panel.querySelector(selectors[key]).value;
          fields[key]=key==='protocol'?Object.keys(protocols).find(k=>protocols[k]===value):key==='authtype'?Object.keys(auth).find(k=>auth[k]===value):value;
          if(fields[key]===undefined){failure({message:'INVALID_REQUEST'});return;}
        }
        if(!dirty.size){navigate('apn-list',{type:profile.type});return;}
        pending=true;editable();
        try {
          profile=await call('platform.mobileSettings',{action:'editApn',id:profile.id,fields});
          dirty.clear();navigate('apn-list',{type:profile.type});
        }catch(error){failure(error);}
        finally {pending=false;editable();}
      });
      panel.querySelector('gaia-header').addEventListener('action',event=>{event.stopImmediatePropagation();if(!pending)navigate('apn-list',{type:profile?.type||'default'});},true);
    },async onBeforeShow(element,options={}) {
      profile=null;dirty.clear();render();
      explain(panel,'fields',text('Les champs grisés ne sont pas gérés par ce modem. Le champ mot de passe vide conserve le secret existant tant que vous ne le modifiez pas.','Greyed-out fields are not handled by this modem. An untouched password field keeps the existing secret.'));
      try {profile=(await read('apns')).find(p=>p.id===options.profileId);if(!profile)throw Error('APN_NOT_FOUND');render();}
      catch(error){failure(error);}
    },onHide(){panel.querySelector('.password').value='';dirty.clear();}};
  }

  let clockState, clockUpdating=false;
  Object.defineProperty(navigator,'mozTime',{value:{set:async date=>{
    try {
      await call('platform.deviceSettings',{action:'setTime',milliseconds:+date});
      dispatchEvent(new Event('moztimechange'));
    } catch(error) {window.VulpesGaiaUI?.notice(error.message);}
  }}});
  async function clock() {
    clockState=await call('platform.deviceSettings',{action:'clock'});
    clockUpdating=true;
    try {await navigator.mozSettings.createLock().set({
      'time.timezone':clockState.timezone, 'time.timezone.user-selected':clockState.timezone,
      'time.clock.automatic-update.available':clockState.automaticAvailable,
      'time.clock.automatic-update.enabled':clockState.automatic,
      'time.timezone.automatic-update.available':false
    });} finally {clockUpdating=false;}
    return clockState;
  }
  navigator.mozSettings.addObserver('time.clock.automatic-update.enabled',async event=>{
    if(clockUpdating || !clockState || event.settingValue===clockState.automatic)return;
    try {
      clockState=await call('platform.deviceSettings',{action:'setAutomatic',enabled:event.settingValue});
      await call('settings.clockChanged',{});
      dispatchEvent(new Event('moztimechange'));
    } catch(error) {
      window.VulpesGaiaUI?.notice(error.message);
      await clock();
    }
  });
  navigator.mozSettings.addObserver('time.timezone',async event=>{
    if(clockUpdating || !clockState || event.settingValue===clockState.timezone)return;
    try {
      clockState=await call('platform.deviceSettings',{action:'setTimezone',timezone:event.settingValue});
      await call('settings.clockChanged',{});
      dispatchEvent(new Event('moztimechange'));
    } catch(error) {
      window.VulpesGaiaUI?.notice(error.message);
      await navigator.mozSettings.createLock().set({'time.timezone':clockState.timezone});
    }
  });
  clock().catch(error=>console.warn('Clock settings:',error.message));
  window.VulpesMobileSettings = {ready:refresh(), refresh, messaging, clock, panels:{call:callPanel,'call-forwarding':forwardingPanel,carrier:carrierPanel,'operator-settings':operatorPanel,'apn-settings':apnSettingsPanel,'apn-list':apnListPanel,'apn-editor':apnEditorPanel}};
  VulpesMobileSettings.ready.catch(error=>console.warn('SIM settings:',error.message));
})();
