import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {nextKeypadTarget} from '../services/keypad-navigation.mjs';

function control(localName, y, attributes={}) {
  const state={checked:false,changes:0};
  return {localName,state,isConnected:true,
    getAttribute:name=>attributes[name] ?? null,
    hasAttribute:name=>name in attributes,
    closest:()=>null,
    checkVisibility:()=>attributes.hidden === undefined,
    getBoundingClientRect:()=>({x:15,y,width:210,height:55,left:15,right:225}),
    click:()=>{throw Error('Native host click must not bypass Gaia');},
    shadowRoot:{querySelector:selector=>selector === (localName === 'gaia-switch' ? '#switch' : '#checkbox') ? {
      click:()=>{state.checked=!state.checked;state.changes++;}
    }:null},
  };
}

function fixture(elements) {
  const source=readFileSync(new URL('../host/actors/KeypadChild.sys.mjs',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('export class','class');
  const child=vm.runInNewContext(source+';new KeypadChild();',{
    JSWindowActorChild:class {},KeypadText:class {commit() {}},nextKeypadTarget,
  });
  const document={activeElement:elements.at(-1),location:{hostname:'settings.localhost'},
    documentElement:{dataset:{}},
    querySelectorAll:selector=>elements.filter(e=>selector.split(',').includes(
      e.localName === 'a' ? 'a[href]' : e.localName))};
  child.document=document;child.contentWindow={innerWidth:240,innerHeight:290,scrollBy:()=>{}};
  child.select=element=>{document.activeElement=element;child.selected=element;};
  return {child,document,key:key=>child.receiveMessage({name:'Vulpes:Navigate',data:{key}})};
}

test('Wi-Fi → geolocation → airplane mode and back includes Gaia switches above the viewport',()=>{
  const plane=control('gaia-switch',-20),gps=control('gaia-switch',40),wifi=control('a',100);
  const {document,key}=fixture([plane,gps,wifi]);
  for (const [direction,expected] of [
    ['ArrowUp',gps],['ArrowUp',plane],['ArrowDown',gps],['ArrowDown',wifi],
  ]) {key(direction);assert.equal(document.activeElement,expected);}
});

test('OK activates the Gaia shadow control exactly once',()=>{
  for (const name of ['gaia-switch','gaia-checkbox']) {
    const element=control(name,20),{key}=fixture([element]);
    key('Enter');assert.deepEqual(element.state,{checked:true,changes:1});
    key('Enter');assert.deepEqual(element.state,{checked:false,changes:2});
  }
});

test('disabled and hidden Gaia controls are skipped',()=>{
  const plane=control('gaia-switch',-20),disabled=control('gaia-switch',40,{disabled:''});
  const hidden=control('gaia-checkbox',65,{hidden:''}),wifi=control('a',100);
  const {document,key}=fixture([plane,disabled,hidden,wifi]);
  key('ArrowUp');assert.equal(document.activeElement,plane);
});

test('activation cannot toggle a disabled control or a component that has not initialized',()=>{
  for (const attributes of [{disabled:''},{'aria-disabled':'true'}]) {
    const element=control('gaia-switch',20,attributes),{child}=fixture([element]);
    child.activate(element);assert.equal(element.state.changes,0);
  }
  const element=control('gaia-switch',20),{child}=fixture([element]);
  element.shadowRoot=null;child.activate(element);assert.equal(element.state.changes,0);
});
