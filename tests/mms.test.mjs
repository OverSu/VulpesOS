import test from 'node:test';
import assert from 'node:assert/strict';
import {Messages} from '../host/Messages.sys.mjs';
import {mmsPayload,receivedMms} from '../services/mms.mjs';
const app={manifest:{permissions:{sms:{}}}};
const part={id:'photo.jpg',location:'photo.jpg',content:{__vulpesBlobV1:true,type:'image/jpeg',base64:'/9j/2Q=='}};
const payload={receivers:['+15550199'],subject:'Photo',smil:'',attachments:[part]};
function store(){let rows=[];return {run:async(_,op,args)=>op==='get'?{value:structuredClone(rows)}:(rows=structuredClone(args[0]))};}
test('MMS remains pending until MMSC acceptance and keeps attachments',async()=>{
 const events=[];let status={state:'pending'};
 const mms={validate:mmsPayload,send:async p=>{assert.deepEqual(p,payload);return {path:'id',state:'pending'};},status:async()=>status};
 const s=new Messages(store(),null,(t,m)=>events.push([t,m]),null,mms);
 const message=await s.request(app,{operation:'sendMMS',args:[payload]});assert.equal(message.delivery,'sending');
 await s.refreshOutgoing();assert.equal(events.length,1);
 status={state:'sent'};await s.refreshOutgoing();assert.equal(events.at(-1)[0],'sent');
 assert.deepEqual(events.at(-1)[1].attachments,[part]);
 assert.deepEqual((await s.request(app,{operation:'getThreads'}))[0].participants,payload.receivers);
});
test('bearer failure retains failed MMS bubble without a sent event',async()=>{
 const events=[];const s=new Messages(store(),null,t=>events.push(t),null,{validate:mmsPayload,send:async()=>({path:'id'}),status:async()=>({state:'failed',error:'MMS_DATA_UNAVAILABLE'})});
 await s.request(app,{operation:'sendMMS',args:[payload]});await s.refreshOutgoing();
 const m=(await s.request(app,{operation:'getMessages'}))[0];assert.equal(m.delivery,'error');assert.equal(m.error,'MMS_DATA_UNAVAILABLE');assert.deepEqual(m.attachments,[part]);assert.deepEqual(events,['sending','failed']);
});
test('incoming MMS is deduplicated and preserves native attachment blobs',async()=>{
 const row=receivedMms({receipt:'push-1',type:'mms',sender:'+15550199',receivers:[],parts:[{id:'photo.jpg',type:'image/jpeg',data:'/9j/2Q=='},{id:'text.txt',type:'text/plain',data:btoa('Hello')}]});
 const s=new Messages(store());const a=await s.receive(row),b=await s.receive(row);
 assert.equal(a.id,b.id);assert.equal(a.body,'Hello');assert.equal(a.type,'mms');assert.equal(a.attachments[0].content.base64,part.content.base64);
 assert.equal((await s.request(app,{operation:'getThreads'}))[0].lastMessageType,'mms');
});
test('reject invalid recipients, missing blobs and oversized MMS',()=>{
 assert.throws(()=>mmsPayload({...payload,receivers:['file:///etc/passwd']}));
 assert.throws(()=>mmsPayload({...payload,attachments:[{content:{}}]}));
 assert.throws(()=>mmsPayload({...payload,attachments:[{...part,content:{...part.content,base64:'A'.repeat(900000)}}]}));
});
