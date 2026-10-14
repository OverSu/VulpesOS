import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../host/gaia-input.js',import.meta.url),'utf8');
function keyboard() {
  const listeners=new Map();let reply;
  const parent={postMessage(){}};
  const context={VulpesNativeInput:true,location:{hostname:'keyboard.localhost'},
    VulpesCompat:{call:()=>new Promise(resolve=>reply=resolve)},
    navigator:{},document:{readyState:'loading'},parent,console,Event,EventTarget,
    CustomEvent:class extends Event {constructor(name,options){super(name);this.detail=options.detail;}},
    addEventListener(name,fn){listeners.set(name,fn);},dispatchEvent(){}};
  context.window=context;
  vm.runInNewContext(source,context);
  return {
    ime:context.navigator.mozInputMethod,
    state:value=>listeners.get('vulpes-service-event')({detail:{type:'input-focus',data:value}}),
    reply:value=>reply(value),
    viewport:()=>listeners.get('message')({source:parent,origin:'http://system.localhost:8765',
      data:{type:'vulpes-keyboard-viewport',width:360,height:740}})
  };
}
test('an old empty snapshot cannot clear a newly focused keyboard',async()=>{
  const k=keyboard();k.viewport();k.state({id:2,text:'current'});k.reply(null);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(k.ime.inputcontext.text,'current');
});
test('an old active snapshot cannot reopen a dismissed keyboard',async()=>{
  const k=keyboard();k.viewport();k.state(null);k.reply({id:1,text:'old'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(k.ime.inputcontext,null);
});
test('focus received before viewport measurement survives a stale initial reply',async()=>{
  const k=keyboard();k.state({id:3,text:'pending'});k.reply(null);
  await new Promise(resolve=>setImmediate(resolve));
  k.viewport();
  assert.equal(k.ime.inputcontext.text,'pending');
});
