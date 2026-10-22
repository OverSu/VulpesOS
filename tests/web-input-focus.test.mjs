import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../host/actors/WebInputParent.sys.mjs',import.meta.url),'utf8');
function setup({visible=true,bundled=false,foreground=true}={}) {
  const top={},calls=[];
  const browser={browsingContext:top,ownerDocument:{hasFocus:()=>foreground},focus:()=>calls.push('focus')};
  const Runtime={identity:()=>bundled?{id:'system'}:null,inputIdentity:()=>visible?{id:'system'}:null,input:{changed:()=>calls.push('input'),cleanup(){}}};
  const Actor=vm.runInNewContext(source.replace(/^import .*;\n/gm,'').replace('export class','class')+';WebInputParent',{
    JSWindowActorParent:class{},Runtime,Views:{entries:new Map([[1,{browser}]])}
  });
  const actor=new Actor();actor.browsingContext={top};
  return {actor,calls};
}
test('a visible web view receives focus without giving the page Gaia permissions',()=>{
  const {actor,calls}=setup();actor.receiveMessage({name:'Vulpes:WebActivate'});assert.deepEqual(calls,['focus']);
  assert.throws(()=>actor.receiveMessage({name:'Vulpes:Request'}),/METHOD_NOT_SUPPORTED/);
});
for(const flags of [{visible:false},{bundled:true},{foreground:false}])test('hidden, bundled and background pages cannot steal focus '+JSON.stringify(flags),()=>{
  const {actor,calls}=setup(flags);actor.receiveMessage({name:'Vulpes:WebActivate'});assert.deepEqual(calls,[]);
});
