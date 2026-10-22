import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function actor(name, globals) {
  const source=readFileSync(new URL(`../host/actors/${name}.sys.mjs`,import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('export class','class');
  return vm.runInNewContext(source+`; new ${name}();`,globals);
}

test('notification key reaches the system even while an application edits text',()=>{
  const messages=[];
  const child=actor('KeypadChild',{JSWindowActorChild:class {}});
  child.document={activeElement:{localName:'input',type:'text'}};
  child.sendAsyncMessage=name=>messages.push(name);
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'F2'}});
  child.receiveMessage({name:'Vulpes:Navigate',data:{key:'F2',repeat:true}});
  assert.deepEqual(messages,['Vulpes:KeypadNotifications']);
});

test('notification shortcut only applies to keypad hosts and preserves the foreground view',()=>{
  let enabled=false;
  const messages=[];
  const parent=actor('KeypadParent',{JSWindowActorParent:class {},
    Services:{env:{get:()=>enabled?'1':'0'}},
    Runtime:{broadcast:(...args)=>messages.push(args)},
    Views:{hideAll:()=>{throw Error('Must preserve foreground application');}}});
  parent.receiveMessage({name:'Vulpes:KeypadNotifications'});
  assert.equal(messages.length,0);
  enabled=true;
  parent.receiveMessage({name:'Vulpes:KeypadNotifications'});
  assert.equal(messages.length,1);
  assert.equal(messages[0][0],'keypad-notifications');
  assert.equal(messages[0][2],'system');
});
