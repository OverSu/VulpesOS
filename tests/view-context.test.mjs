import test from 'node:test';
import assert from 'node:assert/strict';
import {Views} from '../host/Views.sys.mjs';
test('cross-site navigation replaces the allowed input context and removes stale IDs',()=>{
  const data=new Map([['vulpes:host-contexts',[1,2]],['vulpes:native-touch',false]]);let flushed=0,touch;
  globalThis.Services={ppmm:{sharedData:{get:k=>data.get(k),set:(k,v)=>data.set(k,v),flush:()=>flushed++}}};
  const entry={topContextId:2,browser:{browsingContext:{id:3,setRDMPaneMaxTouchPoints:n=>touch=n}}};
  Views.syncContext(entry);
  assert.deepEqual(data.get('vulpes:host-contexts'),[1,3]);assert.equal(entry.topContextId,3);
  assert.equal(touch,1);assert.equal(entry.browser.browsingContext.touchEventsOverride,'enabled');
  Views.syncContext(entry);assert.equal(flushed,1);
  delete globalThis.Services;
});
