import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {nextKeypadTarget} from '../services/keypad-navigation.mjs';

function actor(name, globals={}) {
  const source=readFileSync(new URL(`../host/actors/${name}.sys.mjs`,import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('export class','class');
  return vm.runInNewContext(source+`; new ${name}();`,{
    JSWindowActorChild:class {}, JSWindowActorParent:class {},
    KeypadText:class {commit() {}}, nextKeypadTarget, ...globals});
}

test('Up from an empty page returns to the browser toolbar, but other apps do not',()=>{
  const messages=[],scrolls=[];
  const child=actor('KeypadChild');
  child.document={activeElement:{localName:'body'},location:{hostname:'example.org'},
    querySelectorAll:()=>[],documentElement:{dataset:{}}};
  child.contentWindow={scrollY:0,scrollBy:v=>scrolls.push(v)};
  child.sendAsyncMessage=name=>messages.push(name);
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'ArrowUp',browserContent:true}});
  assert.deepEqual(messages,['Vulpes:KeypadToolbar']);
  messages.length=0;
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'ArrowUp'}});
  assert.deepEqual(messages,[]);
  child.contentWindow.scrollY=80;
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'ArrowUp',browserContent:true}});
  assert.deepEqual(messages,[]);
  assert.equal(scrolls.at(-1).top,-80);
});

test('external browser views receive keys through their owned placeholder only',()=>{
  const messages=[];
  const root={},child={id:8,parent:root,currentWindowGlobal:{getActor:()=>({sendAsyncMessage:()=>{throw Error('Placeholder used');}})}};
  const view={browser:{style:{visibility:'visible'},browsingContext:{currentWindowGlobal:{
    getActor:()=>({sendAsyncMessage:(name,data)=>messages.push({name,data})})}}}};
  const parent=actor('KeypadParent',{Services:{env:{get:()=> '1'}},
    BrowsingContext:{get:()=>child},Views:{entries:new Map([[8,view]])}});
  parent.browsingContext=root;
  parent.receiveMessage({name:'Vulpes:KeypadRoute',data:{contextId:8,key:'ArrowDown',browserContent:true}});
  assert.equal(messages[0].name,'Vulpes:Navigate');
  assert.equal(messages[0].data.browserContent,true);
  parent.browsingContext={};
  parent.receiveMessage({name:'Vulpes:KeypadRoute',data:{contextId:8,key:'ArrowDown'}});
  assert.equal(messages.length,1);
});

test('toolbar focus does not select a bar hidden behind the lockscreen or a dialog',()=>{
  let selected=0;
  const bar={checkVisibility:()=>true,getBoundingClientRect:()=>({x:0,y:20,width:200,height:40}),contains:()=>false};
  const child=actor('KeypadChild');
  child.document={location:{hostname:'system.localhost'},querySelectorAll:()=>[bar],elementFromPoint:()=>({})};
  child.select=()=>selected++;
  child.receiveMessage({name:'Vulpes:FocusBrowserToolbar'});
  assert.equal(selected,0);
  bar.contains=()=>true;
  child.receiveMessage({name:'Vulpes:FocusBrowserToolbar'});
  assert.equal(selected,1);
});

test('Down leaves the toolbar and routes to its page instead of retaining toolbar focus',()=>{
  let focused=false;
  const messages=[];
  const frame={checkVisibility:()=>true,getBoundingClientRect:()=>({x:0,y:70,width:240,height:200}),
    browsingContext:{id:9},focus:()=>focused=true,closest:()=>({querySelector:()=>({})})};
  const child=actor('KeypadChild');
  child.document={location:{hostname:'system.localhost'},activeElement:{closest:()=>({})},
    querySelectorAll:selector=>selector==='iframe'?[frame]:[],elementFromPoint:()=>frame};
  child.contentWindow={innerWidth:240,innerHeight:320};
  child.sendAsyncMessage=(name,data)=>messages.push({name,data});
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'ArrowDown'}});
  assert.equal(focused,true);
  assert.equal(messages[0].name,'Vulpes:KeypadRoute');
  assert.equal(messages[0].data.browserContent,true);
  assert.equal(messages[0].data.contextId,9);
});

test('Up escapes a Gecko error page even when its retry button is offscreen',()=>{
  const messages=[];
  const root={currentWindowGlobal:{getActor:()=>({sendAsyncMessage:name=>messages.push(name)})}};
  root.top=root;
  root.embedderElement={ownerDocument:{getElementById:()=>({browsingContext:root})}};
  const child={id:9,parent:root};
  const view={browser:{style:{visibility:'visible'},browsingContext:{currentWindowGlobal:{
    documentURI:{spec:'about:neterror?e=dnsNotFound&u=https://example.invalid/'},
    getActor:()=>{throw Error('Error-page controls must not trap Up');}}}}};
  const parent=actor('KeypadParent',{Services:{env:{get:()=> '1'}},
    BrowsingContext:{get:()=>child},Views:{entries:new Map([[9,view]])}});
  parent.browsingContext=root;
  parent.receiveMessage({name:'Vulpes:KeypadRoute',data:{contextId:9,key:'ArrowUp',browserContent:true}});
  assert.deepEqual(messages,['Vulpes:FocusBrowserToolbar']);
});
