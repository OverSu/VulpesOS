import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScreenPower} from '../services/screen-power.mjs';

test('wake and brightness commands cannot apply a stale disabled state', async () => {
  const written = [];
  let release;
  const pending = new Promise(resolve => {release=resolve;});
  const state = {screenEnabled:false, screenBrightness:0};
  const power = new ScreenPower(state, async next => {
    if (!written.length) await pending;
    written.push({...next});
  });
  const wake = power.set('screenEnabled',true);
  const brightness = power.set('screenBrightness',0.5);
  await Promise.resolve();
  assert.equal(written.length,0);
  release();
  await Promise.all([wake,brightness]);
  assert.deepEqual(written,[{screenEnabled:true,screenBrightness:0},{screenEnabled:true,screenBrightness:0.5}]);
});

test('hardware failure preserves committed state and allows the next request', async () => {
  const state = {screenEnabled:true,screenBrightness:1};
  let fail = true;
  const power = new ScreenPower(state,async () => {if(fail)throw Error('offline');});
  await assert.rejects(power.set('screenEnabled',false),/offline/);
  assert.equal(state.screenEnabled,true);
  fail=false;
  await power.set('screenBrightness',0.5);
  assert.deepEqual(state,{screenEnabled:true,screenBrightness:0.5});
});


test('brightness bursts coalesce without crossing an off/on boundary', async () => {
  const state = {screenEnabled:true, screenBrightness:1};
  const written = [];
  let release;
  const gate = new Promise(resolve => {release=resolve;});
  const power = new ScreenPower(state, async next => {
    if (!written.length) await gate;
    written.push({...next});
  });
  const first = power.set('screenBrightness',0.99);
  await Promise.resolve();
  const burst = Array.from({length:100},(_,i)=>power.set('screenBrightness',i/100));
  const off = power.set('screenEnabled',false);
  const dark = power.set('screenBrightness',0.35);
  const on = power.set('screenEnabled',true);
  const last = power.set('screenBrightness',0.8);
  release();
  await Promise.all([first,...burst,off,dark,on,last]);
  assert.equal(written.length,6);
  assert.deepEqual(written.map(s=>[s.screenEnabled,s.screenBrightness]),[
    [true,.99],[true,.99],[false,.99],[false,.35],[true,.35],[true,.8]
  ]);
});
