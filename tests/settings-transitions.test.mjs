import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../gaia/apps/settings/js/modules/page_transitions.js',import.meta.url),'utf8');
function fixture(duration='0.4s') {
  let module, timer, delay, calls=0, ready=0;
  const panel=Object.assign(new EventTarget(),{id:'wifi',className:''});
  vm.runInNewContext(source,{define:fn=>{module=fn();},CustomEvent,
    window:{scrollX:0,scrollY:0,dispatchEvent:()=>ready++,getComputedStyle:()=>({transitionDuration:duration,transitionDelay:'0s'})},
    setTimeout:(cb,ms)=>{timer=cb;delay=ms;return 1;},clearTimeout:()=>{}});
  module.oneColumn({id:'root',className:'current'},panel,()=>calls++);
  return {panel,finish:()=>timer(),state:()=>({calls,ready,delay})};
}
test('Settings reaches onShow when no transition event arrives',()=>{
  const f=fixture();assert.equal(f.state().calls,0);f.finish();
  assert.deepEqual(f.state(),{calls:1,ready:1,delay:500});
  f.panel.dispatchEvent(new Event('transitionend'));f.finish();
  assert.equal(f.state().calls,1);
});
test('normal and cancelled transitions finish exactly once',()=>{
  for(const type of ['transitionend','transitioncancel']){
    const f=fixture();f.panel.dispatchEvent(new Event(type));f.finish();
    assert.equal(f.state().calls,1);assert.equal(f.state().ready,1);
  }
});
test('disabled animations do not leave navigation pending',()=>{
  const f=fixture('0s');assert.equal(f.state().delay,100);f.finish();assert.equal(f.state().calls,1);
});
