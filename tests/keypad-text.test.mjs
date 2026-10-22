import assert from 'node:assert/strict';
import {test} from 'node:test';
import {KeypadText,t9KeySequence} from '../services/keypad-text.mjs';

test('cycles a letter, commits on another key and after the timeout', () => {
  const input=new KeypadText(), field={};
  assert.deepEqual(input.press('2',{field,text:'',start:0,end:0,now:0}),{text:'a',replace:0});
  assert.deepEqual(input.press('2',{field,text:'a',start:1,end:1,now:100}),{text:'b',replace:1});
  assert.deepEqual(input.press('6',{field,text:'b',start:1,end:1,now:200}),{text:'m',replace:0});
  assert.deepEqual(input.press('6',{field,text:'bm',start:2,end:2,now:1200}),{text:'m',replace:0});
});
test('never replaces a character in a different field or changed selection', () => {
  const input=new KeypadText(), first={};
  input.press('2',{field:first,text:'',start:0,end:0,now:0});
  assert.equal(input.press('2',{field:{},text:'a',start:1,end:1,now:100}).replace,0);
  input.commit();input.press('2',{field:first,text:'',start:0,end:0,now:0});
  assert.equal(input.press('2',{field:first,text:'ab',start:2,end:2,now:100}).replace,0);
});
test('telephone digits stay literal; hash changes text case, number and T9 modes', () => {
  const input=new KeypadText(), state={field:{},text:'',start:0,end:0};
  for(const key of '12*#')assert.equal(input.press(key,{...state,numeric:true}).text,key);
  assert.deepEqual(input.press('#',state),{mode:'ABC'});
  assert.equal(input.press('2',state).text,'A');
  assert.deepEqual(input.press('#',state),{mode:'123'});
  assert.equal(input.press('2',state).text,'2');
  assert.deepEqual(input.press('#',state),{mode:'abc'});
  assert.deepEqual(input.toggleT9(),{mode:'t9'});
  assert.equal(input.returnMode,'abc');
  assert.deepEqual(input.toggleT9(),{mode:'abc'});
});
test('T9 dictionaries select common English and French words and cycle alternatives',()=>{
  const input=new KeypadText(),field={};
  input.setDictionary('hello\t80\ngood\t90\nhome\t100\nbonjour\t100\n');
  assert.equal(t9KeySequence('hello'),'43556');
  assert.equal(t9KeySequence('école'),'32653');
  assert.equal(t9KeySequence('привет'),'564236');
  input.mode='t9';
  let state={field,text:'',start:0,end:0,now:0};
  let operation;
  for(const key of '4663') {
    operation=input.press(key,state);
    const next=state.text.slice(0,state.start-operation.replace)+operation.text;
    state={...state,text:next,start:next.length,end:next.length,now:state.now+100};
  }
  assert.equal(state.text,'home');
  assert.equal(input.suggestion,'home');
  operation=input.press('*',{...state,now:500});
  assert.equal(operation.text,'good');
  assert.equal(operation.replace,4);
  assert.equal(input.suggestion,'good');
});
