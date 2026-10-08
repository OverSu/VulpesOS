import test from 'node:test';
import assert from 'node:assert/strict';
import {Contacts} from '../host/Contacts.sys.mjs';

let serial=0;
globalThis.Services={uuid:{generateUUID:()=>({toString:()=>`test-${++serial}`})}};
const writer={manifest:{permissions:{contacts:{access:'readwrite'}}}};
const reader={manifest:{permissions:{contacts:{access:'readonly'}}}};

async function addressBook() {
  let stored;
  const events=[];
  const storage={async run(_store,operation,args) {
    if(operation==='get') return {value:structuredClone(stored)};
    stored=structuredClone(args[0]);
  }};
  const contacts=new Contacts(storage,event=>events.push(event));
  await contacts.init();
  return {contacts,events,storage};
}

test('contact edits, photo, date and favourite survive reopening the store',async()=>{
  const {contacts,events,storage}=await addressBook();
  const first=await contacts.request(writer,{operation:'save',contact:{
    givenName:['Élodie'],familyName:['Test'],tel:[{value:'+33 6 00 00 00 00'}],
    photo:[new Blob(['portrait'],{type:'image/jpeg'})],bday:new Date('1995-08-19T00:00:00Z'),
  }});
  const edited=await contacts.request(writer,{operation:'save',contact:{...first,familyName:['Modifiée'],category:['favorite']}});
  assert.equal(edited.id,first.id);
  assert.equal(edited.published,first.published);
  const reopened=new Contacts(storage,()=>{});await reopened.init();
  const [row]=await reopened.request(reader,{operation:'find',options:{filterBy:['id'],filterOp:'equals',filterValue:first.id}});
  assert.deepEqual(row.familyName,['Modifiée']);
  assert.deepEqual(row.category,['favorite']);
  assert.equal(await row.photo[0].text(),'portrait');
  assert.equal(row.bday.toISOString(),'1995-08-19T00:00:00.000Z');
  assert.deepEqual(events.map(e=>e.reason),['create','update']);
  await contacts.request(writer,{operation:'remove',id:first.id});
  assert.equal(await contacts.request(reader,{operation:'count'}),0);
});

test('a failed write emits no contactchange and does not poison later saves',async()=>{
  const {contacts,events,storage}=await addressBook();
  const run=storage.run;
  storage.run=async()=>{throw Error('disk full');};
  await assert.rejects(contacts.request(writer,{operation:'save',contact:{name:['First']}}),/disk full/);
  assert.equal(events.length,0);
  assert.equal(await contacts.request(reader,{operation:'count'}),0);
  storage.run=run;
  await contacts.request(writer,{operation:'save',contact:{name:['Second']}});
  assert.equal(await contacts.request(reader,{operation:'count'}),1);
});

test('read-only callers cannot change the address book',async()=>{
  const {contacts}=await addressBook();
  for(const operation of ['save','remove','clear'])
    await assert.rejects(contacts.request(reader,{operation,contact:{name:['Denied']},id:'anything'}),/PERMISSION_DENIED/);
  await assert.rejects(contacts.request({manifest:{}},{operation:'find'}),/PERMISSION_DENIED/);
});
