import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {authorizePlatform} from '../services/platform.mjs';
function setup(host='settings', platform='tundra') {
  const events=new EventTarget(), requests=[], timers=[];
  const state={available:true,enabled:false,address:'00:11:22:33:44:55',name:'Vulpes',
    discovering:false,discoverable:false,devices:[],pairing:[]};
  const ctx={EventTarget,Event,DOMException,console,navigator:{},document:{hidden:false},
    location:{hostname:host+'.localhost',pathname:'/index.html'},
    addEventListener:events.addEventListener.bind(events),setTimeout:fn=>timers.push(fn),
    setInterval:()=>0,clearInterval(){},VulpesPlatform:platform,VulpesCompat:{async call(method,p){
      requests.push({method,...p});
      if(p.operation==='power')state.enabled=p.enabled;
      if(p.operation==='scan')state.discovering=true;
      if(p.operation==='stopScan')state.discovering=false;
      if(p.operation==='pair')state.devices[0].paired=true;
      if(p.operation==='unpair')state.devices=[];
      return structuredClone(state);
    }}};
  ctx.window=ctx;vm.runInNewContext(readFileSync('host/gaia-bluetooth.js','utf8'),ctx);
  return {ctx,state,events,requests,timers,async ready(){events.dispatchEvent(new Event('DOMContentLoaded'));await new Promise(r=>setImmediate(r));}};
}
test('only installed trusted system apps can control Bluetooth',()=>{
  assert.throws(()=>authorizePlatform({id:'gallery',manifest:{}},'bluetooth',{}),/PERMISSION/);
  authorizePlatform({id:'settings',manifest:{}},'bluetooth',{});
  assert.throws(()=>authorizePlatform({id:'settings',manifest:{}},'bluetooth',{name:'x'.repeat(5000)}),/Quota/);
  assert.equal(setup('gallery').ctx.navigator.mozBluetooth,undefined);
  assert.equal(setup('settings','android').ctx.navigator.mozBluetooth,undefined);
});
test('Gaia receives adapter, discovery and pairing events in the expected order',async()=>{
  const s=setup();await s.ready();
  const a=s.ctx.navigator.mozBluetooth.defaultAdapter;assert.ok(a);assert.equal(a.state,'disabled');
  await a.enable();assert.equal(a.state,'enabled');
  s.state.devices=[{address:'22:33:44:55:66:77',name:'Test headset',paired:false,connected:false,uuids:[],cod:{}}];
  const h=await a.startDiscovery();let device;h.ondevicefound=e=>device=e.device;
  for(const timer of s.timers)await timer();await new Promise(r=>setImmediate(r));
  assert.equal(device.name,'Test headset');let paired=false;a.ondevicepaired=()=>paired=true;
  await a.pair(device.address);assert.equal(paired,true);assert.equal(a.getPairedDevices().length,1);
  await a.unpair(device.address);assert.equal(a.getPairedDevices().length,0);
  await a.stopDiscovery();assert.equal(a.discovering,false);
});
test('unsupported profiles reject instead of reporting a successful transfer',async()=>{
  const s=setup();await s.ready();
  await assert.rejects(s.ctx.navigator.mozBluetooth.defaultAdapter.sendFile('address',{}),{name:'NotSupportedError'});
});
test('the original pairing view receives the passkey and submits an explicit decision',async()=>{
  const s=setup('bluetooth');s.ctx.location.pathname='/onpair.html';
  let shown;
  s.ctx.Pairview={init(method,options){shown={method,options};}};
  s.state.pairing=[{id:'request-1',method:'confirmation',deviceName:'Test peer',passkey:'012345'}];
  await s.ready();
  assert.equal(shown.method,'confirmation');
  assert.equal(shown.options.handle.passkey,'012345');
  assert.equal(shown.options.deviceName,'Test peer');
  assert.equal(s.requests.some(r=>r.operation==='reply'),false);
  await shown.options.handle.accept();
  assert.equal(s.requests.find(r=>r.operation==='reply').accept,true);
  assert.equal(s.requests.find(r=>r.operation==='reply').id,'request-1');
});
