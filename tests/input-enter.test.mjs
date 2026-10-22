import test from 'node:test';
import assert from 'node:assert/strict';
import {InputEditor} from '../services/input-editor.mjs';
function setup({tag='input',form=true}={}) {
  const calls=[];
  const e={isConnected:true,isContentEditable:false,localName:tag,value:'query',type:'search',
    selectionStart:5,selectionEnd:5,focus(){},classList:{contains:()=>false},
    form:form?{requestSubmit:()=>calls.push('submit')}:null,
    dispatchEvent(){throw Error('Software Enter must not dispatch native key events');}};
  const win={getSelection:()=>({}),document:{hidden:false,execCommand:c=>calls.push(c)}};
  const editor=new InputEditor(win);editor.focus(e);
  return {editor,calls};
}
test('software Enter uses normal form validation and submission without key IPC',()=>{
  const s=setup();s.editor.edit({operation:'key',key:13});
  assert.deepEqual(s.calls,['submit']);
});
test('Enter in a standalone input does not navigate or add a newline',()=>{
  const s=setup({form:false});s.editor.edit({operation:'key',key:'Enter'});
  assert.deepEqual(s.calls,[]);
});
test('Enter in a message adds a line without submitting the form',()=>{
  const s=setup({tag:'textarea'});s.editor.edit({operation:'key',key:13});
  assert.deepEqual(s.calls,['insertLineBreak']);
});
