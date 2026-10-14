import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../gaia/apps/settings/js/modules/panel_cache.js',import.meta.url),'utf8');
function fixture(load) {
  let cache;
  function require(id,ok,fail) {
    if(Array.isArray(id))return load(ok,fail);
    if(id==='shared/lazy_loader')return {load:(_,done)=>done()};
    return ()=>({beforeShow(){}});
  }
  vm.runInNewContext(source,{define:factory=>cache=factory(require),navigator:{addIdleObserver(){}},
    document:{getElementById:()=>({querySelector:()=>({dataset:{path:'panels/storage/panel'}})})}});
  return cache;
}
for(const failure of ['dependency','constructor','invalid']) test('Panel cache reports '+failure+' failure without caching a broken panel',()=>{
  let broken=true;
  const expected=new Error('storage unavailable');
  const cache=fixture((ok,fail)=>{
    if(!broken)return ok(()=>({beforeShow(){}}));
    if(failure==='dependency')return fail(expected);
    ok(()=>{if(failure==='constructor')throw expected;return {};});
  });
  let calls=0;
  cache.get('mediaStorage',(panel,error)=>{calls++;assert.equal(panel,null);assert.ok(error);});
  assert.equal(calls,1);broken=false;
  cache.get('mediaStorage',(panel,error)=>{assert.equal(error,undefined);assert.equal(typeof panel.beforeShow,'function');});
});
