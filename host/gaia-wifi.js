// Tundra's NetworkManager broker, exposed through Gaia's legacy Wi-Fi interface.
(() => {
  if (!window.VulpesNativeWifi || !['system','settings'].includes(location.hostname.split('.')[0])) return;
  const {call, request} = VulpesCompat;
  const manager = Object.assign(new EventTarget(), {
    enabled:false, connection:{status:'disconnected',network:null},
    connectionInformation:null, macAddress:'',
  });
  let networks = [];
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
    manager.connectionInformation = network ? {relSignalStrength:network.relSignalStrength} : null;
    if (changed) emit('statuschange', manager.connection);
    emit('connectioninfoupdate', manager.connectionInformation || {});
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
    networks = result.networks.map(n => ({ssid:n.ssid, relSignalStrength:n.signal,
      security:n.security === 'open' ? [] : [n.security === 'wpa-psk' ? 'WPA-PSK' : n.security === 'sae' ? 'SAE' : 'WPA-EAP'],
      known:n.known === true, connected:n.connected, vulpesId:n.id, savedId:n.savedId}));
    update(networks.find(n => n.connected) || null);
    return networks;
  }
  manager.getNetworks = () => request(scan());
  manager.getKnownNetworks = () => request(call('platform.wifi',{operation:'known'}).then(r=>r.networks.map(n=>({ssid:n.ssid,security:n.security==='open'?[]:['WPA-PSK'],known:true,savedId:n.id}))));
  manager.associate = network => request((async () => {
    if (network.security.length && network.security[0] !== 'WPA-PSK') throw Error('WIFI_UNSUPPORTED_SECURITY');
    await call('platform.wifi',{operation:'connect',id:network.vulpesId,password:network.psk || ''});
    await scan(); return network;
  })());
  manager.forget = network => request(call('platform.wifi',{operation:'forget',id:network.savedId}).then(()=>scan()));
  const unsupported = () => request(Promise.reject(new DOMException('Not supported by this adapter','NotSupportedError')));
  manager.wps = unsupported;
  manager.setPowerSavingMode = unsupported;
  Object.defineProperty(navigator,'mozWifiManager',{value:manager});
  addEventListener('DOMContentLoaded', async () => {
    try {
      const state = await call('platform.wifi',{operation:'status'});
      power(state.enabled);
      if (location.hostname.startsWith('system.')) {
        let queue=Promise.resolve();
        navigator.mozSettings.addObserver('wifi.enabled', event => {
          const enabled=event.settingValue===true;
          queue=queue.then(async () => {
            if(manager.enabled===enabled) {power(enabled,true);return;}
            try {
              const result=await call('platform.wifi',{operation:'setEnabled',enabled});
              power(result.enabled,true);
            } catch(error) {
              await call('settings.set',{values:{'wifi.enabled':manager.enabled}});
              console.warn('Wi-Fi radio change failed',error);
            }
          });
        });
        await call('settings.set',{values:{'wifi.enabled':state.enabled}});
      } else {
        navigator.mozSettings.addObserver('wifi.enabled', () => {
          call('platform.wifi',{operation:'status'}).then(s=>power(s.enabled)).catch(console.warn);
        });
      }
      // Settings may receive the preference before the radio operation completes.
      // Refresh while visible so its panel also follows hardware power changes.
      if(location.hostname.startsWith('settings.')) {
        let pending=false;
        const refresh=setInterval(async()=>{
          if(document.hidden || pending) return;
          pending=true;
          try {power((await call('platform.wifi',{operation:'status'})).enabled);}
          catch(error) {console.warn('Wi-Fi status refresh failed',error);}
          finally {pending=false;}
        },2000);
        addEventListener('pagehide',()=>clearInterval(refresh),{once:true});
      }
      if(manager.enabled) await scan();
    } catch(error) { console.warn('Wi-Fi initialization failed',error); }
  }, {once:true});
})();
