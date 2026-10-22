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

function systemKeyboard({legacy=true}={}) {
  const events=new EventTarget(), intervals=[], calls=[], states=new Map();
  const frame={style:{},hidden:true,contentWindow:{postMessage(){}},addEventListener(){}};
  const context={VulpesNativeInput:true,location:{hostname:'system.localhost'},
    VulpesCompat:{call:(method,params)=>{calls.push({method,params});return Promise.resolve();}},
    document:{documentElement:{lang:'fr'},createElement:()=>frame,body:{append(){}}},navigator:{language:'fr'},
    inputWindowManager:legacy?{}:undefined,Service:{registerState:(name,provider)=>states.set(name,provider),register:(name,provider)=>states.set(name,provider)},
    console,Event,EventTarget,CustomEvent:class extends Event {constructor(name,options={}){super(name);this.detail=options.detail;}},
    setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},
    addEventListener:events.addEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
  context.window=context;vm.runInNewContext(source,context);intervals.forEach(fn=>fn());
  const focus=value=>events.dispatchEvent(new context.CustomEvent('vulpes-service-event',{detail:{type:'input-focus',data:value}}));
  return {events,context,frame,calls,focus,states};
}
test('Gaia hide commands target the host keyboard',async()=>{
  const s=systemKeyboard();
  await s.context.inputWindowManager.hideInputWindow();
  await s.context.inputWindowManager.hideInputWindowImmediately();
  assert.equal(s.calls.length,2);
  assert.ok(s.calls.every(c=>c.method==='input.request' && c.params.operation==='hide'));
});
test('keyboardhidden follows layout completion so app switching can resume',async()=>{
  const s=systemKeyboard(), seen=[];let finish;
  s.events.addEventListener('keyboardhide',e=>{seen.push('hide');e.detail.waitUntil(new Promise(r=>finish=r));});
  s.events.addEventListener('keyboardhidden',()=>seen.push('hidden'));
  s.focus({id:1});s.focus(null);
  assert.equal(s.frame.hidden,true);assert.deepEqual(seen,['hide']);
  finish();await new Promise(r=>setImmediate(r));
  assert.deepEqual(seen,['hide','hidden']);
});
test('refocus cancels stale keyboardhidden completion',async()=>{
  const s=systemKeyboard();let finish,hidden=0;
  s.events.addEventListener('keyboardhide',e=>e.detail.waitUntil(new Promise(r=>finish=r)));
  s.events.addEventListener('keyboardhidden',()=>hidden++);
  s.focus({id:1});s.focus(null);s.focus({id:2});finish();
  await new Promise(r=>setImmediate(r));
  assert.equal(hidden,0);assert.equal(s.frame.hidden,false);
});

test('standalone host registers hide services without the legacy KeyboardManager',async()=>{
  const s=systemKeyboard({legacy:false});
  for(const name of ['hideInputWindow','hideInputWindowImmediately'])
    await s.states.get(name)[name]();
  assert.equal(s.calls.length,2);
  s.focus({id:1});assert.equal(s.states.get('getHeight').getHeight(),260);
});
