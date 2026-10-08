import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(composer) {
  let click, assimilated=false;
  const calls=[];
  const recipients={numbers:[]};
  const context={console,location:{hostname:'sms.localhost',pathname:'/index.html'},
    document:{readyState:'complete',addEventListener:(name,handler)=>{if(name==='click')click=handler;}},
    VulpesCompat:{call:async(method,params)=>{calls.push({method,params});}},
    VulpesPlatform:'android',Navigation:{isCurrentPanel:()=>composer},
    ConversationView:{recipients,activeThread:{participants:['5550123']},assimilateRecipients(){assimilated=true;recipients.numbers=['5550199'];}},
    Compose:{type:'sms',getText:()=> 'Message à confirmer'},
  };
  context.window=context;
  vm.runInNewContext(readFileSync('host/gaia-restoration.js','utf8'),context);
  return {calls,context,send(){
    click({target:{closest:()=>true},preventDefault(){},stopImmediatePropagation(){}});
    assert.equal(assimilated,true);
  }};
}
test('Android handoff commits the typed recipient before opening its SMS app',()=>{
  const s=setup(true);s.send();
  assert.equal(s.calls[0].method,'platform.sms');
  assert.equal(s.calls[0].params.number,'5550199');
  assert.equal(s.calls[0].params.body,'Message à confirmer');
});
test('Android reply uses the conversation participants and preserves the draft',()=>{
  const s=setup(false);s.send();
  assert.equal(s.calls[0].params.number,'5550123');
  assert.equal(s.context.Compose.getText(),'Message à confirmer');
});
test('empty Android messages are not handed off',()=>{
  const s=setup(true);s.context.Compose.getText=()=>'';s.send();
  assert.equal(s.calls.length,0);
});
