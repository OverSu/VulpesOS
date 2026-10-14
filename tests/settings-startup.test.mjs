import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../gaia/apps/settings/js/startup.js',import.meta.url),'utf8');
const bootstrap=source.slice(source.lastIndexOf('(function() {'));
test('Settings waits for deferred components before loading AMD modules',()=>{
  let starts=0;
  const document=Object.assign(new EventTarget(),{readyState:'interactive'});
  vm.runInNewContext(bootstrap,{document,AppStarter:()=>({start:()=>starts++})});
  assert.equal(starts,0);
  document.dispatchEvent(new Event('DOMContentLoaded'));assert.equal(starts,1);
  document.dispatchEvent(new Event('DOMContentLoaded'));assert.equal(starts,1);
});
test('Settings starts immediately when loaded after the document',()=>{
  let starts=0;
  vm.runInNewContext(bootstrap,{document:{readyState:'complete'},AppStarter:()=>({start:()=>starts++})});
  assert.equal(starts,1);
});
