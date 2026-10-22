import assert from 'node:assert/strict';
import {test} from 'node:test';
import {radioState} from '../services/radio-state.mjs';
test('radio status is bounded and excludes identity and raw data',()=>{
  const result=radioState([{slot:0,available:true,radioState:'enabled',signal:75,
    sim:{present:true,cardState:'ready',imsi:'private'},operator:{longName:'Network'},
    voice:{state:'registered',connected:true,type:'lte',cell:'private'},raw:'private'}]);
  assert.equal(result[0].voice.type,'lte');assert.equal(result[0].signal,75);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.equal(radioState(Array.from({length:20},(_,slot)=>({slot}))).length,4);
});
test('unavailable adapters never carry forward a previous SIM or registration',()=>{
  assert.deepEqual(radioState([{slot:0,available:false,sim:{present:true},voice:{connected:true}}]),
    [{slot:0,available:false,radioState:'unknown'}]);
  assert.deepEqual(radioState(null),[]);
});
