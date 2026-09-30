import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../host/Input.sys.mjs';
function setup() {
  const events=[];
  const input=new Input({identity:actor=>actor.app,broadcast:(...args)=>events.push(args)});
  const keyboard={app:{id:'keyboard'}}, field={app:{id:'sms'}};
  return {input,events,keyboard,field};
}
test('keyboard cannot edit a stale field or another app issue keyboard commands',async()=>{
  const {input,keyboard,field}=setup();
  input.changed(field,{text:'',id:0});
  await assert.rejects(input.request(field,{operation:'state'}),/PERMISSION_DENIED/);
  await assert.rejects(input.request(keyboard,{operation:'key',id:0}),/INPUT_CONTEXT_EXPIRED/);
  assert.equal((await input.request(keyboard,{operation:'state'})).id,1);
});
for(const action of ['hide','change']) test(`pending edit cannot update state after ${action}`,async()=>{
  const {input,keyboard,field}=setup();let reply;
  field.sendQuery=()=>new Promise(resolve=>{reply=resolve;});
  input.changed(field,{text:'first'});
  const pending=input.request(keyboard,{operation:'key',id:1});
  if(action==='hide') input.hide(); else input.changed(field,{text:'second'});
  reply({text:'first edited'});
  await assert.rejects(pending,/INPUT_CONTEXT_EXPIRED/);
  assert.equal(input.focus?.state.text,action==='hide'?undefined:'second');
});
test('current edit updates the focused field; keyboard focus does not replace it',async()=>{
  const {input,keyboard,field}=setup();
  field.sendQuery=async()=>({text:'123',selectionStart:3,selectionEnd:3});
  input.changed(field,{text:''});input.changed(keyboard,{text:'unrelated'});
  assert.equal((await input.request(keyboard,{operation:'key',id:1})).text,'123');
});
