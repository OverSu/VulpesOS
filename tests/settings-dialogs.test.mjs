import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const load=name=>readFile(new URL('../gaia/apps/settings/js/modules/'+name+'.js',import.meta.url),'utf8');
const serviceSource=await load('dialog_service');
const managerSource=await load('dialog_manager');
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function serviceFixture() {
  let service;const opens=[],closes=[];let rejectClose=false;
  const panel=Object.assign(new EventTarget(),{classList:{remove(){}},hidden:false});
  const factory=()=>({panel,cleanup(){}});
  const manager={open(dialog,options){const d=defer();opens.push({options,...d});return d.promise;},close(dialog,type){closes.push(type);return rejectClose?Promise.reject(Error('invalid')):Promise.resolve('value');}};
  vm.runInNewContext(serviceSource,{Promise,CustomEvent,document:{getElementById:()=>panel,querySelector:()=>null},define:fn=>{service=fn(name=>name==='settings'?{currentPanel:'#root'}:name==='modules/defer'?defer:name==='modules/dialog_manager'?manager:factory);}});
  return {service,opens,closes,panel,reject:value=>{rejectClose=value;}};
}
test('early cancel waits for opening and queued reopen runs after closure',async()=>{
  const f=serviceFixture();const first=f.service.show('one');const second=f.service.show('two');
  f.opens[0].options.onWrapCancel();f.opens[0].options.onWrapCancel();
  await settle();assert.equal(f.closes.length,0);assert.equal(f.opens.length,1);
  f.opens[0].resolve();assert.equal((await first).type,'cancel');await settle();
  assert.equal(f.closes.length,1);assert.equal(f.opens.length,2);
  f.opens[1].resolve();f.opens[1].options.onWrapCancel();await second;assert.equal(f.service._navigating,false);
});
test('failed validation preserves dialog and permits a later submit',async()=>{
  const f=serviceFixture();let failures=0;f.panel.addEventListener('dialogvalidationfailed',()=>failures++);
  const shown=f.service.show('one');f.opens[0].resolve();await settle();
  f.reject(true);f.opens[0].options.onWrapSubmit();await settle();
  assert.equal(failures,1);assert.equal(f.service._navigating,true);
  f.reject(false);f.opens[0].options.onWrapSubmit();assert.equal((await shown).type,'submit');assert.equal(f.service._navigating,false);
});
function transitionFixture(duration='0.4s') {
  let manager,next=0;const timers=new Map();const classes=new Set();
  const panel=Object.assign(new EventTarget(),{hidden:true,classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}}});
  vm.runInNewContext(managerSource,{Promise,document:{querySelector:()=>({})},window:{getComputedStyle:()=>({transitionDuration:duration,transitionDelay:'0s'})},
    setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id),define:fn=>{manager=fn(()=>({}));}});
  return {manager,panel,classes,timers,step(){const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();return timer.ms;}};
}
test('missing visibility transition and disabled animations both complete',async()=>{
  for(const duration of ['0.4s','0s']) {
    const f=transitionFixture(duration);const opened=f.manager._transit('open',{panel:f.panel},{});
    assert.equal(f.panel.hidden,false);assert.equal(f.step(),150);assert(f.classes.has('current'));
    assert.equal(f.step(),duration==='0s'?100:500);await opened;
    const closed=f.manager._transit('close',{panel:f.panel},{});f.step();f.step();await closed;
    assert.equal(f.panel.hidden,true);assert.equal(f.timers.size,0);
  }
});
test('cancelled visibility transition resolves once and removes fallback',async()=>{
  const f=transitionFixture();const p=f.manager._transit('close',{panel:f.panel},{});f.step();
  const e=new Event('transitioncancel');Object.defineProperty(e,'propertyName',{value:'visibility'});f.panel.dispatchEvent(e);await p;
  assert.equal(f.panel.hidden,true);assert.equal(f.timers.size,0);
});
