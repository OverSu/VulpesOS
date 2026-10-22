import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../host/gaia-mobile-settings.js',import.meta.url),'utf8').split('// Expose the single native SIM')[0];
function load(call,hooks={}) {
  const navigator={};
  vm.runInNewContext(source,{window:{VulpesNativeRadioStatus:true},location:{hostname:'system.localhost'},
    navigator,VulpesCompat:{call},EventTarget,Event,DOMException,
    document:{documentElement:{setAttribute(){},toggleAttribute(){},append(){}},createElement:()=>({})},addEventListener(type,fn){hooks.start=fn;},setInterval(fn){hooks.tick=fn;}});
  return navigator.mozMobileConnections;
}
test('Nokia Gaia radio requests preserve DOMRequest callbacks and awaitable completion',async()=>{
  const calls=[];
  const connections=load(async(method,params)=>{calls.push({method,...params});return {slot:params.slot,radioState:'disabled'};});
  let events=0;connections[1].addEventListener('radiostatechange',()=>events++);
  const request=connections[1].setRadioEnabled(false);
  let success=false;request.onsuccess=()=>success=true;
  await request;
  assert.deepEqual(calls,[{method:'platform.radioPower',slot:1,enabled:false}]);
  assert.equal(request.readyState,'done');assert.equal(request.result,null);
  assert.equal(success,true);assert.equal(events,1);assert.equal(connections[1].radioState,'disabled');
  assert.equal(connections[0].radioState,'unknown');
});
test('a modem refusal propagates without claiming a new radio state',async()=>{
  const connections=load(async()=>{throw Error('RADIO_BUSY');});
  const request=connections[0].setRadioEnabled(false);
  let failed=false;request.onerror=()=>failed=true;
  await assert.rejects(Promise.resolve(request),/RADIO_BUSY/);
  assert.equal(failed,true);assert.equal(connections[0].radioState,'unknown');
});

test('unchanged and cached modem snapshots do not cancel Gaia airplane mode',async()=>{
  const hooks={},stamp=Date.now()/1000;
  const conn=load(async(method)=>method==='platform.snapshot' ? {recordedAt:stamp,radio:[0,1].map(slot=>({slot,available:true,radioState:'enabled',sim:{present:false}}))} : {radioState:'disabled'},hooks)[0];
  let events=0;conn.addEventListener('radiostatechange',()=>events++);
  hooks.start();await new Promise(setImmediate);
  assert.equal(events,1);assert.equal(conn.radioState,'enabled');
  await hooks.tick();assert.equal(events,1);
  await new Promise(r=>setTimeout(r,5));
  await conn.setRadioEnabled(false);assert.equal(events,2);
  await hooks.tick();assert.equal(conn.radioState,'disabled');assert.equal(events,2);
});
