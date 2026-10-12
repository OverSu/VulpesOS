import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../services/input.mjs';
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

test('a composer button retains input and other buttons dismiss only after click',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {runInNewContext}=await import('node:vm');
  const source=await readFile(new URL('../host/actors/VulpesChild.sys.mjs',import.meta.url),'utf8');
  const events=[];
  const Actor=runInNewContext(source.replace(/^import .*;\n/, '').replace('export class','class')+';VulpesChild',{
    JSWindowActorChild:class{},Services:{cpmm:{sharedData:{get:()=>true}}}
  });
  const actor=new Actor();actor.sendAsyncMessage=(...args)=>events.push(args);
  const button={localName:'button',closest:()=>null};
  actor.handleEvent({type:'pointerdown',target:button});assert.equal(events.length,0);
  actor.handleEvent({type:'click',target:button});assert.equal(events.length,1);assert.equal(events[0][1],null);
  button.closest=()=>button;
  actor.handleEvent({type:'pointerdown',target:button});actor.handleEvent({type:'click',target:button});
  assert.equal(events.length,1,'send keeps the composer focused');
});
