import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../android/extension/content.js',import.meta.url),'utf8');
async function setup(enabled=true,{defer=false,activeElement}={}) {
  const sent=[],events=new Map(),timers=[];let receive,disconnect;
  const page={navigator:{},dispatchEvent(){}};
  const port={postMessage:m=>sent.push(m),onMessage:{addListener:fn=>receive=fn},onDisconnect:{addListener:fn=>disconnect=fn}};
  class Editor {
    constructor(){this.editing=false;}
    focus(e){this.inputElement=e;}
    state(){return {inputMode:this.inputElement.getAttribute('inputmode'),text:'',inputType:'text'};}
    edit(){return this.state();}
  }
  const context={InputEditor:Editor,browser:{runtime:{connect:()=>port}},console,
    location:{port:'18765',hostname:'sms.localhost'},document:{hidden:false,activeElement,hasFocus:()=>true},
    window:{wrappedJSObject:page,Promise,Error,Event,CustomEvent:class extends Event{constructor(name,p){super(name);this.detail=p.detail;}}},
    cloneInto:x=>x,exportFunction:(fn,obj,p)=>{obj[p.defineAs]=fn;},
    addEventListener:(name,fn)=>events.set(name,fn),setTimeout:fn=>timers.push(fn),clearTimeout(){}};
  vm.runInNewContext(source,context);
  if(!defer) receive({id:sent[0].id,reply:{result:enabled}});
  await new Promise(resolve=>setImmediate(resolve));
  return {sent,events,page,receive,context,timers,disconnect};
}
function field(mode='numeric') {
  const attrs=new Map([['inputmode',mode]]);
  return {localName:'input',type:'text',classList:{contains:()=>false},
    getAttribute:key=>attrs.get(key)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
}
test('Android bridge keeps the intended keypad mode after editing, while suppressing the Android IME',async()=>{
  const s=await setup(),e=field();
  s.events.get('focusin')({target:e});
  assert.equal(e.getAttribute('inputmode'),'none');
  assert.equal(s.sent.at(-1).inputFocus.inputMode,'numeric');
  s.receive({edit:{id:3,params:{operation:'key',key:1}}});
  assert.equal(s.sent.at(-1).editReply,3);
  assert.equal(s.sent.at(-1).result.inputMode,'numeric');
  s.receive({event:{type:'input-mode',data:{enabled:false}}});
  assert.equal(e.getAttribute('inputmode'),'numeric');
  assert.equal(s.page.VulpesNativeInput,false);
});
test('Android keyboard remains the default and hidden Gaia restores the editor mode',async()=>{
  const s=await setup(false),e=field();
  s.events.get('focusin')({target:e});
  assert.equal(e.getAttribute('inputmode'),'numeric');
  assert.equal(s.sent.length,1);
  s.receive({event:{type:'input-mode',data:{enabled:true}}});
  s.events.get('focusin')({target:e});
  s.context.document.hidden=true;s.events.get('visibilitychange')();
  assert.equal(e.getAttribute('inputmode'),'numeric');
  assert.equal(s.sent.at(-1).inputFocus,null);
});

test('a field focused before the preference arrives activates Gaia without another tap',async()=>{
  const e=field(),s=await setup(true,{defer:true,activeElement:e});
  s.events.get('focusin')({target:e});
  assert.equal(s.sent.length,1);
  s.receive({id:s.sent[0].id,reply:{result:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(e.getAttribute('inputmode'),'none');
  assert.equal(s.sent.at(-1).inputFocus.inputMode,'numeric');
});

test('an old preference reply cannot undo a newer keyboard toggle',async()=>{
  const e=field(),s=await setup(false,{defer:true,activeElement:e});
  s.receive({event:{type:'input-mode',data:{enabled:true}}});
  s.receive({id:s.sent[0].id,reply:{result:false}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.page.VulpesNativeInput,true);
  assert.equal(e.getAttribute('inputmode'),'none');
});

test('returning to an app restores its focused Gaia editor',async()=>{
  const e=field(),s=await setup(true,{activeElement:e});
  s.context.document.hidden=true;s.events.get('visibilitychange')();
  assert.equal(s.sent.at(-1).inputFocus,null);
  s.context.document.hidden=false;s.events.get('visibilitychange')();
  assert.equal(s.sent.at(-1).inputFocus.inputMode,'numeric');
  assert.equal(e.getAttribute('inputmode'),'none');
});

test('bridge reconnection rereads the preference and restores the active editor',async()=>{
  const e=field(),s=await setup(true,{activeElement:e});
  s.disconnect();
  assert.equal(e.getAttribute('inputmode'),'numeric');
  assert.equal(s.page.VulpesNativeInput,false);
  s.timers.at(-1)();
  const request=s.sent.at(-1);
  assert.equal(request.request.method,'input.config');
  s.receive({id:request.id,reply:{result:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(e.getAttribute('inputmode'),'none');
  assert.equal(s.sent.at(-1).inputFocus.inputMode,'numeric');
});

test('a background app cannot reclaim the keyboard when Android resumes',async()=>{
  const e=field(),s=await setup(true,{activeElement:e});
  s.context.document.hidden=true;s.events.get('visibilitychange')();
  s.context.document.hidden=false;s.context.document.hasFocus=()=>false;
  s.events.get('visibilitychange')();
  assert.equal(s.sent.at(-1).inputFocus,null);
  assert.equal(e.getAttribute('inputmode'),'numeric');
});
