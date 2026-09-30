import test from 'node:test';
import assert from 'node:assert/strict';
import {Messages} from '../host/Messages.sys.mjs';
const app={manifest:{permissions:{sms:{}}}};
function store(initial=[]) {
  let records=structuredClone(initial);
  return {run:async (_store,op,args)=>{if(op==='get')return {value:structuredClone(records)};records=structuredClone(args[0]);}};
}
test('concurrent sends keep both records and numeric stable thread IDs',async()=>{
  const service=new Messages(store(),async()=>({path:'/ril_0/message1'}));
  const send=body=>service.request(app,{operation:'send',args:['+33100000000',body]});
  const [a,b]=await Promise.all([send('one'),send('two')]);
  assert.ok(Number.isSafeInteger(a.id));assert.ok(Number.isSafeInteger(a.threadId));
  assert.notEqual(a.id,b.id);assert.equal(a.threadId,b.threadId);
  const rows=await service.request(app,{operation:'getMessages',args:[{threadId:a.threadId}]});
  assert.equal(rows.length,2);
});
test('legacy modem-path IDs migrate once without losing message bodies',async()=>{
  const service=new Messages(store([{id:'/ril_0/message1',threadId:'+33100000000',type:'sms',receiver:'+33100000000',body:'old',timestamp:1}]));
  const a=await service.request(app,{operation:'getMessages'});
  const b=await service.request(app,{operation:'getMessages'});
  assert.deepEqual(a,b);assert.equal(a[0].body,'old');assert.ok(Number.isSafeInteger(a[0].threadId));
});
test('radio rejection never creates a sent message',async()=>{
  const service=new Messages(store(),async()=>{throw Error('RADIO_NOT_REGISTERED');});
  await assert.rejects(service.request(app,{operation:'send',args:['+33100000000','test']}),/RADIO_NOT_REGISTERED/);
  const failed=await service.request(app,{operation:'getMessages'});
  assert.equal(failed.length,1);assert.equal(failed[0].delivery,'error');
  assert.equal(failed[0].body,'test');
  assert.equal((await service.request(app,{operation:'getThreads'})).length,1);
});
test('SMS filters isolate unread messages, recipients and date ranges',async()=>{
  const service=new Messages(store([
    {id:1,threadId:10,sender:'111',timestamp:1000,read:false,delivery:'received'},
    {id:2,threadId:10,sender:'111',timestamp:2000,read:true,delivery:'received'},
    {id:3,threadId:20,receiver:'222',timestamp:3000,read:true,delivery:'sent'},
  ]));
  const list=async(filter,reverse=false)=>(await service.request(app,{operation:'getMessages',args:[filter,reverse]})).map(m=>m.id);
  assert.deepEqual(await list({threadId:10,read:false}),[1]);
  assert.deepEqual(await list({numbers:['222']}),[3]);
  assert.deepEqual(await list({numbers:['333']}),[]);
  assert.deepEqual(await list({startDate:new Date(2000),endDate:new Date(3000)},true),[3,2]);
  assert.deepEqual(await list({delivery:'received'}),[1,2]);
  await service.request(app,{operation:'markMessageRead',args:[1,true]});
  assert.deepEqual(await list({read:false}),[]);
  assert.equal((await service.request(app,{operation:'getThreads'}))[1].unreadCount,0);
  assert.deepEqual(await service.request(app,{operation:'delete',args:[[1,2,999]]}),[true,true,false]);
  assert.deepEqual((await service.request(app,{operation:'getThreads'})).map(t=>t.id),[20]);
});
test('incoming retries persist once and share the outgoing conversation',async()=>{
  const database=store();
  const service=new Messages(database,async()=>({path:'/ril_0/message1'}));
  const sent=await service.request(app,{operation:'send',args:['111','out']});
  const incoming={receipt:'receipt-1',sender:'111',body:'in',timestamp:10000};
  const [a,b]=await Promise.all([service.receive(incoming),service.receive(incoming)]);
  assert.equal(a.id,b.id);assert.equal(a.threadId,sent.threadId);
  assert.equal(a.read,false);assert.equal(a.delivery,'received');
  const restarted=new Messages(database);
  assert.equal((await restarted.receive(incoming)).id,a.id);
  assert.equal((await restarted.request(app,{operation:'getMessages'})).length,2);
});
test('failed inbox persistence is retryable without poisoning the queue',async()=>{
  let fail=true;const database=store(),run=database.run;
  database.run=async(...args)=>{if(args[1]==='put' && fail){fail=false;throw Error('DISK_FULL');}return run(...args);};
  const service=new Messages(database);
  const incoming={receipt:'receipt-2',sender:'222',body:'test',timestamp:1000};
  await assert.rejects(service.receive(incoming),/DISK_FULL/);
  await service.receive(incoming);
  assert.equal((await service.request(app,{operation:'getMessages'})).length,1);
});

test('failed send remains in conversation and emits sending then failed, never sent',async()=>{
  const events=[];
  const service=new Messages(store(),async()=>{throw Error('RADIO_NOT_REGISTERED');},(type,m)=>events.push([type,m.delivery]));
  await assert.rejects(service.request(app,{operation:'send',args:['111','keep me']}));
  assert.deepEqual(events,[['sending','sending'],['failed','error']]);
});
test('queued modem messages remain pending until a terminal state arrives',async()=>{
  const events=[];let state='pending';const database=store();
  const service=new Messages(database,async()=>({path:'/ril_0/message_123',state:'pending'}),
    (type,m)=>events.push([type,m.delivery]),async()=>({state}));
  const message=await service.request(app,{operation:'send',args:['111','queued']});
  assert.equal(message.delivery,'sending');
  await service.refreshOutgoing();assert.deepEqual(events,[['sending','sending']]);
  state='failed';await service.refreshOutgoing();
  assert.deepEqual(events,[['sending','sending'],['failed','error']]);
  await service.refreshOutgoing();assert.equal(events.length,2);
  assert.equal((await service.request(app,{operation:'getMessages'}))[0].delivery,'error');
});
test('pending transmission status survives a host restart',async()=>{
  const database=store();
  const first=new Messages(database,async()=>({path:'/ril_0/message_123',state:'pending'}));
  await first.request(app,{operation:'send',args:['111','queued']});
  const events=[];
  const restarted=new Messages(database,null,(type)=>events.push(type),async()=>({state:'sent'}));
  await restarted.refreshOutgoing();
  assert.deepEqual(events,['sent']);
  assert.equal((await restarted.request(app,{operation:'getMessages'}))[0].delivery,'sent');
});
