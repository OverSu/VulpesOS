import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../host/gaia-compat.js',import.meta.url),'utf8');
const setupSource=source.slice(source.indexOf('  let language ='),source.indexOf('  const observers ='));
const changeSource=source.match(/if \(data.key === 'language.current'\) \{[\s\S]*?\n      \}/)[0];
function setup(){
 let reply;const events=[];
 const context=vm.createContext({navigator:{language:'fr'},Event,dispatchEvent:e=>events.push(e.type),call:()=>new Promise(r=>{reply=r;})});
 vm.runInContext(setupSource,context);
 return {context,events,reply,change(value){context.data={key:'language.current',value};vm.runInContext(changeSource,context);}};
}
test('a delayed startup locale cannot undo a newer Settings language',async()=>{
 const s=setup();s.change('en-US');s.reply('fr');await new Promise(r=>setImmediate(r));
 assert.equal(s.context.navigator.language,'en-US');assert.deepEqual(s.events,['languagechange']);
});
test('initial locale still initializes a newly opened app',async()=>{
 const s=setup();s.reply('el');await new Promise(r=>setImmediate(r));
 assert.equal(s.context.navigator.language,'el');assert.deepEqual(Array.from(s.context.navigator.languages),['el']);
});
