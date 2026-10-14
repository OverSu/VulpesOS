import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../gaia/apps/marketplace/marketplace.js',import.meta.url),'utf8');
function element(){return Object.assign(new EventTarget(),{style:{},hidden:false,textContent:''});}
async function setup() {
  const nodes=Object.fromEntries(['catalogue','message','confirm','open','browse','install','cancel','status','title','question','permissions'].map(id=>[id,element()]));
  let poll,download=null,finish;
  const context={document:{getElementById:id=>nodes[id]},navigator:{language:'en'},console,
    addEventListener(){},setInterval:fn=>poll=fn,VulpesCompat:{call:async method=>{
      if(method==='locale.current')return 'en';
      if(method==='marketplace.poll'){const url=download;download=null;return url;}
      if(method==='marketplace.prepare')return new Promise(resolve=>finish=resolve);
    }}};
  await vm.runInNewContext(source,context);
  return {nodes,poll,setDownload:()=>download='https://vulpes-os.org/marketplace/index.php?download=1',finish:()=>finish({name:'Test',bytes:1024,token:'test'})};
}
test('closing the Android web view exposes a way back to the catalogue, not a blank frame',async()=>{
  const {nodes:n}=await setup();
  n.catalogue.dispatchEvent(new Event('mozbrowserclose'));
  assert.equal(n.message.hidden,false);assert.equal(n.catalogue.style.visibility,'hidden');
  assert.match(n.status.textContent,/reopen/);assert.equal(n.open.hidden,true);
  n.browse.onclick();
  assert.equal(n.message.hidden,true);assert.equal(n.catalogue.style.visibility,'visible');
  assert.match(n.catalogue.src,/mode=app&lang=en/);
});
test('a close notification cannot erase an installation confirmation',async()=>{
  const f=await setup();f.setDownload();const pending=f.poll();
  await new Promise(resolve=>setImmediate(resolve));
  f.nodes.catalogue.dispatchEvent(new Event('mozbrowserclose'));
  assert.match(f.nodes.status.textContent,/Checking/);
  f.finish();await pending;assert.equal(f.nodes.confirm.hidden,false);
});
