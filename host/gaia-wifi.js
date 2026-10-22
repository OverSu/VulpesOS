// Tundra's native Wi-Fi broker, exposed through Gaia's legacy Wi-Fi interface.
(() => {
  if (!window.VulpesNativeWifi || !['system','settings'].includes(location.hostname.split('.')[0])) return;
  const {call, request} = VulpesCompat;
  const manager = Object.assign(new EventTarget(), {
    enabled:false, connection:{status:'disconnected',network:null},
    connectionInformation:null, macAddress:'',
  });
  let networks = [], connectionInfo = {};
  const securityTypes = value => value === 'open' ? [] :
    [['wpa-psk','sae'].includes(value) ? 'WPA-PSK' : 'WPA-EAP'];
  function emit(type, values = {}) {
    const event = Object.assign(new Event(type), values);
    manager.dispatchEvent(event); manager['on' + type]?.(event);
  }
  function power(enabled, acknowledge = false) {
    if (manager.enabled === enabled && !acknowledge) return;
    manager.enabled = enabled;
    emit(enabled ? 'enabled' : 'disabled');
    if (!enabled) update(null);
  }
  function update(network) {
    const status = network ? 'connected' : 'disconnected';
    const changed = manager.connection.status !== status || manager.connection.network?.ssid !== network?.ssid;
    manager.connection = {status, network};
    manager.connectionInformation = network ? {...connectionInfo,relSignalStrength:network.relSignalStrength} : null;
    if (changed) emit('statuschange', manager.connection);
    // Gaia's signal listeners require the associated network. A scan while
    // disconnected must not announce connection information for a missing AP.
    if (network) emit('connectioninfoupdate', {network, ...manager.connectionInformation});
  }
  function applyState(state) {
    power(state.enabled === true);
    manager.macAddress=state.macAddress || manager.macAddress;
    if (state.state) {
      connectionInfo=state.connectionInformation || {};
      const network=state.state==='connected' && state.network;
      update(network ? {
        ...networks.find(n=>n.ssid===network.ssid),ssid:network.ssid,
        security:securityTypes(network.security),
        relSignalStrength:network.signal,savedId:network.savedId,connected:true
      } : null);
    }
  }
  let scanPending;
  function scan() {
    if (scanPending) return scanPending;
    scanPending = scanNetworks().finally(() => {scanPending = null;});
    return scanPending;
  }
  async function scanNetworks() {
    const result = await call('platform.wifi',{operation:'scan'});
    power(result.enabled !== false);
    manager.macAddress=result.macAddress || manager.macAddress;
    connectionInfo=result.connectionInformation || {};
    networks = result.networks.map(n => ({ssid:n.ssid, relSignalStrength:n.signal,
      security:securityTypes(n.security),
      known:n.known === true, connected:n.connected, vulpesId:n.id, savedId:n.savedId}));
    update(networks.find(n => n.connected) || null);
    return networks;
  }
  manager.getNetworks = () => request(scan());
  let knownPending;
  manager.getKnownNetworks = () => {
    if (!knownPending) knownPending = call('platform.wifi',{operation:'known'}).then(r=>r.networks.map(n=>({ssid:n.ssid,security:securityTypes(n.security),relSignalStrength:0,known:true,savedId:n.id}))).finally(()=>{knownPending=null;});
    return request(knownPending);
  };
  manager.associate = network => request((async () => {
    const security=(network.security || []).filter(Boolean);
    if (security.length && security[0] !== 'WPA-PSK') throw Error('WIFI_UNSUPPORTED_SECURITY');
    await call('platform.wifi',network.hidden ? {operation:'connectHidden',ssid:network.ssid,security:security.length?'wpa-psk':'open',password:network.psk || ''} : {operation:'connect',id:network.vulpesId,password:network.psk || ''});
    await scan(); return network;
  })());
  manager.forget = network => request(call('platform.wifi',{operation:'forget',id:network.savedId}).then(()=>scan()));
  const unsupported = () => request(Promise.reject(new DOMException('Not supported by this adapter','NotSupportedError')));
  manager.wps = unsupported;
  manager.setPowerSavingMode = unsupported;
  Object.defineProperty(navigator,'mozWifiManager',{value:manager});
  if(location.hostname.startsWith('settings.')) {
    const wifi = value => call('platform.wifi',value);
    const french = () => (document.documentElement.lang || navigator.language || '').startsWith('fr');
    const message = (fr,en) => french() ? fr : en;
    const note = panel => {
      const p=document.createElement('p');p.className='explanation';p.setAttribute('role','status');
      panel.querySelector(':scope > div').prepend(p);return p;
    };
    function hotspotPanel() {
      let panel,toggle,link,status,state,busy=false;
      function render() {
        toggle.checked=state?.enabled===true;toggle.disabled=busy || !state;
        link.setAttribute('aria-disabled',String(busy || !state || state.enabled));
        panel.querySelector('#wifi-hotspot-msg').textContent=state?.enabled ? state.ssid : '';
      }
      async function refresh() {
        busy=true;render();
        try {state=await wifi({operation:'hotspotStatus'});status.textContent='';
          await call('settings.set',{values:{'tethering.wifi.enabled':state.enabled}});
        } catch(error) {state=null;status.textContent=message('Impossible de lire le point d’accès Wi-Fi.','Cannot read Wi-Fi hotspot status.');}
        finally {busy=false;render();}
      }
      return {
        onInit(element) {
          panel=element;toggle=panel.querySelector('#tethering-wifi-enabled');link=panel.querySelector('#hotspot-settings-section a');status=note(panel);
          const usb=panel.querySelector('#tethering-usb-enabled');usb.disabled=true;
          const explanation=document.createElement('p');explanation.className='explanation';
          explanation.textContent=message('Le partage par USB n’est pas encore disponible.','USB tethering is not available yet.');usb.closest('ul').append(explanation);
          link.addEventListener('click',event=>{
            event.preventDefault();event.stopImmediatePropagation();if(busy || !state || state.enabled)return;
            require(['modules/dialog_service'],DialogService=>DialogService.show('hotspot-wifiSettings',{state}).then(refresh));
          });
          toggle.addEventListener('change',async()=>{
            if(busy || !state)return;
            if(!state.configured) {toggle.checked=false;status.textContent=message('Configurez d’abord le nom et le mot de passe du point d’accès.','Configure the hotspot name and password first.');return;}
            const enabled=toggle.checked;busy=true;render();
            status.textContent=message('Modification du partage Wi-Fi…','Changing Wi-Fi sharing…');
            try {
              if(enabled && (await call('settings.get',{key:'airplaneMode.status'})).value==='enabled')throw Error('AIRPLANE_MODE');
              state=await wifi({operation:'hotspotPower',enabled});
              await call('settings.set',{values:{'tethering.wifi.enabled':state.enabled}});status.textContent='';
            } catch(error) {
              try {state=await wifi({operation:'hotspotStatus'});}catch {state=null;}
              status.textContent=error.message==='AIRPLANE_MODE' ? message('Désactivez le mode avion avant de partager la connexion.','Turn off airplane mode before sharing the connection.') : message('Le changement a échoué. Vérifiez la connexion réseau.','The change failed. Check the network connection.');
            } finally {busy=false;render();}
          });
        },onBeforeShow:refresh
      };
    }
    function hotspotDialog() {
      let panel,ssid,security,password,show,status,busy=false;
      function visibility() {
        const hidden=security.value==='open';
        panel.querySelector('.password').hidden=hidden;panel.querySelector('.password-description').hidden=hidden;
      }
      return {
        onInit(element) {
          panel=element;ssid=panel.querySelector('input[type=text]');security=panel.querySelector('select');password=panel.querySelector('input[name=password]');show=panel.querySelector('gaia-checkbox');status=note(panel);
          // These credentials belong to NetworkManager, not the global settings database.
          for(const control of [ssid,security,password])control.removeAttribute('data-setting');
          security.replaceChildren(new Option('WPA2','wpa2-psk'),new Option(message('Ouvert','Open'),'open'));
          security.addEventListener('change',visibility);
          show.addEventListener('change',()=>{password.type=show.checked?'text':'password';});
        },
        onBeforeShow(element,options) {
          const state=options.state;ssid.value=state.ssid;security.value=state.security;password.value=state.password;
          password.type='password';show.checked=false;status.textContent='';visibility();
        },
        async onSubmit() {
          if(busy)throw Error('HOTSPOT_BUSY');
          const values={operation:'hotspotSave',ssid:ssid.value,security:security.value,password:password.value};
          if(!values.ssid || new TextEncoder().encode(values.ssid).length>32 || (values.security!=='open' && (new TextEncoder().encode(values.password).length<8 || new TextEncoder().encode(values.password).length>63))) {
            status.textContent=message('Nom : 1 à 32 octets. Mot de passe WPA2 : 8 à 63 octets.','Name: 1–32 bytes. WPA2 password: 8–63 bytes.');throw Error('HOTSPOT_INVALID');
          }
          busy=true;const controls=panel.querySelectorAll('input,select,button,gaia-checkbox');controls.forEach(c=>c.disabled=true);
          try {await wifi(values);return {};}
          catch(error) {status.textContent=message('Impossible d’enregistrer le point d’accès.','Cannot save the hotspot.');throw error;}
          finally {busy=false;controls.forEach(c=>c.disabled=false);}
        },
        onCancel() {if(busy)throw Error('HOTSPOT_BUSY');},
        onHide() {password.value='';}
      };
    }
    window.VulpesWifiSettings={panels:{hotspot:hotspotPanel},dialogs:{'hotspot-wifiSettings':hotspotDialog}};
  }
  addEventListener('DOMContentLoaded', async () => {
    try {
      const state = await call('platform.wifi',{operation:'status'});
      applyState(state);
      if (location.hostname.startsWith('system.')) {
        let queue=Promise.resolve();
        navigator.mozSettings.addObserver('wifi.enabled', event => {
          const enabled=event.settingValue===true;
          queue=queue.then(async () => {
            if(manager.enabled===enabled) {power(enabled,true);return;}
            try {
              const result=await call('platform.wifi',{operation:'setEnabled',enabled});
              power(result.enabled,true);
              applyState(result);
              if(result.enabled) await scan();
              if(!result.enabled)await call('settings.set',{values:{'tethering.wifi.enabled':false}});
            } catch(error) {
              await call('settings.set',{values:{'wifi.enabled':manager.enabled}});
              console.warn('Wi-Fi radio change failed',error);
            }
          });
        });
        await call('settings.set',{values:{'wifi.enabled':state.enabled}});
      } else {
        navigator.mozSettings.addObserver('wifi.enabled', () => {
          call('platform.wifi',{operation:'status'}).then(applyState).catch(console.warn);
        });
      }
      // Settings follows delayed power changes. Adapters with live association
      // state also refresh System, so reconnects update the status-bar icon.
      if(location.hostname.startsWith('settings.') || state.state) {
        let pending=false;
        const refresh=setInterval(async()=>{
          if((location.hostname.startsWith('settings.') && document.hidden) || pending) return;
          pending=true;
          try {applyState(await call('platform.wifi',{operation:'status'}));}
          catch(error) {console.warn('Wi-Fi status refresh failed',error);}
          finally {pending=false;}
        },location.hostname.startsWith('settings.') ? 2000 : 5000);
        addEventListener('pagehide',()=>clearInterval(refresh),{once:true});
      }
      if(manager.enabled) await scan();
    } catch(error) { console.warn('Wi-Fi initialization failed',error); }
  }, {once:true});
})();
