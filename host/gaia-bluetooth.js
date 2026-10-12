// Gaia Bluetooth v2, backed by the host's permission-checked BlueZ broker.
(() => {
  const app = location.hostname.split('.')[0];
  if (!(window.VulpesPlatform === 'tundra' || window.VulpesTestBluetooth) ||
      !['system', 'settings', 'bluetooth'].includes(app)) return;
  const {call} = VulpesCompat;
  const manager = Object.assign(new EventTarget(), {defaultAdapter:null});
  const adapter = Object.assign(new EventTarget(), {
    state:'disabled', address:'', name:'', discoverable:false, discovering:false,
    pairingReqs:new EventTarget(),
  });
  const devices = new Map();
  let discovery = null, seen = new Set(), pending = false, timer, closed = false;
  let currentPairing = null, initialized = false;
  const emit = (target, type, values={}) => {
    const event = Object.assign(new Event(type), values);
    target.dispatchEvent(event); target['on'+type]?.(event);
  };
  function change(target, fields) {
    const attrs = Object.keys(fields).filter(k=>JSON.stringify(target[k])!==JSON.stringify(fields[k]));
    Object.assign(target, fields);
    if (attrs.length) emit(target, 'attributechanged', {attrs});
  }
  function apply(state) {
    if (!state?.available) return;
    for (const row of state.devices) {
      let device = devices.get(row.address);
      const oldPaired = device?.paired;
      if (!device) {
        device = new EventTarget(); devices.set(row.address, device);
      }
      change(device, {...row, connectionStatus:row.connected?'connected':'disconnected'});
      if (oldPaired !== undefined && oldPaired !== row.paired)
        emit(adapter, row.paired?'devicepaired':'deviceunpaired', {device,address:row.address});
      if (discovery && state.discovering && !seen.has(row.address)) {
        seen.add(row.address); emit(discovery, 'devicefound', {device});
      }
    }
    for (const [address, device] of devices) {
      if (!state.devices.some(d=>d.address===address)) {
        if (device.paired) emit(adapter,'deviceunpaired',{address,device});
        devices.delete(address);
      }
    }
    change(adapter, {state:state.enabled?'enabled':'disabled',address:state.address,
      name:state.name,discoverable:state.discoverable,discovering:state.discovering});
    if (!manager.defaultAdapter) {
      manager.defaultAdapter=adapter; emit(manager,'attributechanged',{attrs:['defaultAdapter']});
    }
    currentPairing = state.pairing?.[0] || null;
    if (app==='bluetooth' && location.pathname==='/onpair.html') showPairing();
  }
  async function command(operation, params={}) {
    const value=await call('platform.bluetooth',{operation,...params});
    if (value?.available) apply(value);
    return value;
  }
  async function refresh() {
    if (pending || closed) return;
    pending=true;
    try {apply(await command('status'));}
    catch(error) {console.warn('Bluetooth:',error.message);}
    finally {pending=false;}
  }
  adapter.enable=()=>command('power',{enabled:true});
  adapter.disable=()=>command('power',{enabled:false});
  adapter.setName=name=>command('rename',{name});
  adapter.setDiscoverable=enabled=>command('discoverable',{enabled});
  adapter.startDiscovery=async()=>{
    await command('scan');
    discovery=new EventTarget(); seen=new Set();
    const handle=discovery;
    // Gaia installs its discovery listeners after this promise resolves.
    setTimeout(()=>refresh(),0);
    return handle;
  };
  adapter.stopDiscovery=async()=>{await command('stopScan');discovery=null;};
  adapter.getPairedDevices=()=>[...devices.values()].filter(d=>d.paired);
  adapter.getConnectedDevices=async profile=>{
    await refresh();
    const uuid=Number(profile).toString(16).padStart(8,'0')+'-0000-1000-8000-00805f9b34fb';
    return [...devices.values()].filter(d=>d.connected && d.uuids.includes(uuid));
  };
  for (const op of ['pair','unpair','connect','disconnect'])
    adapter[op]=async value=>{
      await command(op,{address:typeof value==='string'?value:value.address});
      await refresh();
    };
  const unsupported=()=>Promise.reject(new DOMException('Bluetooth profile is unavailable','NotSupportedError'));
  for (const name of ['sendFile','stopSendingFile','confirmReceivingFile','connectSco','disconnectSco',
      'sendMediaMetaData','sendMediaPlayStatus']) adapter[name]=unsupported;
  adapter.isScoConnected=()=>Promise.resolve(false);
  manager.getAdapters=()=>Promise.resolve(manager.defaultAdapter?[adapter]:[]);
  Object.defineProperty(navigator,'mozBluetooth',{value:manager});

  let shown = null;
  function showPairing() {
    if (!initialized || !window.Pairview) return;
    const item=currentPairing;
    if (!item) {if(shown) window.close();return;}
    if (shown===item.id) return;
    shown=item.id;
    const reply=(accept,code)=>command('reply',{id:item.id,accept,code});
    Pairview.init(item.method==='enterpasskey'?'enterpincode':item.method,{
      deviceName:item.deviceName,handle:{passkey:item.passkey,
        accept:()=>reply(true),reject:()=>reply(false),setPinCode:code=>reply(true,code)},
    });
  }
  addEventListener('DOMContentLoaded',async()=>{
    initialized=true;
    await refresh(); showPairing();
    if(app==='system') {
      navigator.mozSettings.addObserver('bluetooth.enabled',event=>{
        const enabled=event.settingValue===true;
        if((adapter.state==='enabled')!==enabled)
          command('power',{enabled}).catch(()=>call('settings.set',{values:{'bluetooth.enabled':adapter.state==='enabled'}}));
      });
      await call('settings.set',{values:{'bluetooth.enabled':adapter.state==='enabled'}});
    }
    timer=setInterval(()=>{if(app==='system'||!document.hidden||discovery)refresh();},1500);
  },{once:true});
  addEventListener('pagehide',()=>{
    closed=true;clearInterval(timer);
    if(discovery)command('stopScan').catch(()=>{});
  },{once:true});
})();
