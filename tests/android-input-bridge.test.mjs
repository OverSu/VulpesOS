import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../android/extension/content.js',import.meta.url),'utf8');
async function setup(enabled=true) {
  const sent=[],events=new Map();let receive;
  const page={navigator:{},dispatchEvent(){}};
  const port={postMessage:m=>sent.push(m),onMessage:{addListener:fn=>receive=fn},onDisconnect:{addListener(){}}};
  class Editor {
    constructor(){this.editing=false;}
    focus(e){this.inputElement=e;}
    state(){return {inputMode:this.inputElement.getAttribute('inputmode'),text:'',inputType:'text'};}
    edit(){return this.state();}
  }
  const context={InputEditor:Editor,browser:{runtime:{connect:()=>port}},console,
    location:{port:'18765',hostname:'sms.localhost'},document:{hidden:false},
    window:{wrappedJSObject:page,Promise,Error,Event,CustomEvent:class extends Event{constructor(name,p){super(name);this.detail=p.detail;}}},
    cloneInto:x=>x,exportFunction:(fn,obj,p)=>{obj[p.defineAs]=fn;},
    addEventListener:(name,fn)=>events.set(name,fn),setTimeout,clearTimeout};
  vm.runInNewContext(source,context);
  receive({id:sent[0].id,reply:{result:enabled}});
  await new Promise(resolve=>setImmediate(resolve));
  return {sent,events,page,receive,context};
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
