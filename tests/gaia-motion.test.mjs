import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const file=readFileSync(new URL('../host/gaia-theme.js',import.meta.url),'utf8');
const source=file.slice(file.indexOf('// Compact is a user preference'),
  file.indexOf('// One readable application name'));

async function fixture(reducedMotion) {
  const writes=[],listeners={},dataset={};
  const animation=(iterations,duration)=>({playState:'running',effect:{
    getTiming:()=>({iterations,duration}),updateTiming:value=>writes.push(value)}});
  const finite=animation(1,300),busy=animation(Infinity,1000);
  vm.runInNewContext(source,{
    document:{documentElement:{dataset},getAnimations:()=>[finite,busy],
      addEventListener:(name,fn)=>listeners[name]=fn},
    window:{},location:{hostname:'system.localhost'},
    addEventListener(){},requestAnimationFrame:fn=>fn(),console,
    VulpesCompat:{call:async()=>({mode:'compact',compactDefault:true,reducedMotion})},
  });
  await new Promise(resolve=>setImmediate(resolve));
  return {writes,listeners,dataset,finite,busy};
}

test('compact layout alone preserves desktop and APK animations',async()=>{
  const f=await fixture(false);
  assert.equal(f.dataset.vulpesLayout,'compact');
  assert.equal(f.dataset.vulpesMotion,'standard');
  assert.equal(f.writes.length,0);
  assert.equal(f.listeners.animationstart,undefined);
});

test('Nokia shortens finite effects while retaining loading animations',async()=>{
  const f=await fixture(true);
  assert.equal(f.dataset.vulpesMotion,'reduced');
  assert.equal(f.writes.length,1);
  assert.equal(f.writes[0].duration,1);
  f.listeners.animationstart({target:{getAnimations:()=>[f.finite,f.busy]}});
  assert.equal(f.writes.length,2);
});
