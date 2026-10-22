import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {test} from 'node:test';
import {KeypadText,t9KeySequence} from '../services/keypad-text.mjs';

const root=new URL('../',import.meta.url);
const sourceDirectory=new URL('gaia/apps/keyboard/js/imes/latin/dictionaries/',root);
const outputDirectory=new URL('tundra/devices/beatles/t9/',root);
const sources=readdirSync(sourceDirectory).filter(name=>name.endsWith('_wordlist.xml'))
  .map(name=>name.replace('_wordlist.xml','').toLowerCase()).sort();
const outputs=readdirSync(outputDirectory).filter(name=>name.endsWith('.tsv'))
  .map(name=>name.replace('.tsv','')).sort();

test('Nokia offline T9 includes every bundled Gaia Latin keyboard dictionary locale',()=>{
  assert.equal(sources.length,42);
  assert.deepEqual(outputs,sources);
});

test('T9 key maps cover Latin accents, Greek, Cyrillic and extended Latin scripts',()=>{
  assert.equal(t9KeySequence('café'),'2233');
  assert.equal(t9KeySequence('привет'),'564236');
  assert.equal(t9KeySequence('καλημέρα'),'52545372');
  assert.equal(t9KeySequence('straße'),'7872773');
  assert.equal(t9KeySequence('łódź'),'5639');
});

test('generated English dictionary ranks home above other 4663 words and cycles them',()=>{
  const input=new KeypadText();
  input.setDictionary(readFileSync(new URL('en_us.tsv',outputDirectory),'utf8'));
  const candidates=input.dictionary.get('4663');
  assert.ok(candidates?.length>1);
  assert.equal(candidates[0].word,'good');
  input.mode='t9';
  const field={};let text='',state={field,text,start:0,end:0,now:0};
  for(const key of '4663') {
    const operation=input.press(key,state);
    text=text.slice(0,state.start-operation.replace)+operation.text;
    state={field,text,start:text.length,end:text.length,now:state.now+100};
  }
  assert.equal(text,candidates[0].word);
  const operation=input.press('*',{...state,now:500});
  assert.equal(operation.replace,text.length);
  assert.equal(candidates.some(entry=>entry.word===operation.text),true);
});
