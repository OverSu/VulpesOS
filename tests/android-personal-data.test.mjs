import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Contacts} from '../host/Contacts.sys.mjs';
import {Messages} from '../host/Messages.sys.mjs';
const source=readFileSync('android/extension/personal-data.mjs','utf8')
  .replace("'./Contacts.mjs'",JSON.stringify(new URL('../host/Contacts.sys.mjs',import.meta.url).href))
  .replace("'./Messages.mjs'",JSON.stringify(new URL('../host/Messages.sys.mjs',import.meta.url).href));
const {AndroidPersonalData,authorizePersonal,smsFromAndroid}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app={id:'communications',manifest:{permissions:{contacts:{access:'readwrite'}}}};
const smsApp={id:'sms',manifest:{permissions:{sms:{},contacts:{access:'readonly'}}}};
async function setup(){
 const data=new Map([['vulpes-private-contacts',{revision:1,contacts:[{id:'local-1',name:['Local']}]}],['vulpes-private-messages',[{id:100,threadId:200,timestamp:1,body:'Local',delivery:'sent',receiver:'5550100',type:'sms',read:true}]]]);
 const storage={run:async(name,op,args)=>{if(op==='get')return {value:structuredClone(data.get(name))};data.set(name,structuredClone(args[0]));}};
 const contacts=new Contacts(storage,()=>{});await contacts.init();
 const calls=[];let allowed=true;
 const service=new AndroidPersonalData(async p=>{calls.push(p);if(p.operation==='status')return {contacts:allowed,sms:allowed};return {rows:p.kind==='contacts'?[{_id:1,display_name:'Android',tel:[{value:'5550199'}]}]:[{_id:1,thread_id:2,address:'5550199',body:'Android SMS',date:2,type:1,read:0,status:-1}],next:null};},contacts,new Messages(storage),storage);
 return {service,data,calls,revoke(){allowed=false;}};
}
test('native contact reads preserve the local address book and search phone numbers',async()=>{
 const s=await setup();const rows=await s.service.contactRequest(app,{operation:'all'});
 assert.deepEqual(rows.map(r=>r.id),['local-1','android:1']);
 assert.equal((await s.service.contactRequest(app,{operation:'find',options:{filterBy:['tel'],filterOp:'match',filterValue:'0199'}}))[0].id,'android:1');
 assert.equal(s.data.get('vulpes-private-contacts').contacts.length,1);
 s.revoke();assert.equal((await s.service.contactRequest(app,{operation:'all'})).length,1);
});
test('native messages and threads remain distinct from local IDs and are not copied to storage',async()=>{
 const s=await setup();const rows=await s.service.messageRequest(smsApp,{operation:'getThreads'});
 assert.deepEqual(rows.map(r=>r.id),[-2,200]);
 const [sms]=await s.service.messageRequest(smsApp,{operation:'getMessages',args:[{threadId:-2}]});assert.equal(sms.id,-1);assert.equal(sms.body,'Android SMS');
 assert.equal(s.data.get('vulpes-private-messages').length,1);
 s.revoke();assert.equal((await s.service.messageRequest(smsApp,{operation:'getThreads'})).length,1);
});
test('Android writes never fall through to the local store or report false success',async()=>{
 const s=await setup();
 for(const params of [{operation:'save',contact:{id:'android:1'}},{operation:'remove',id:'android:1'},{operation:'clear'}]) await assert.rejects(s.service.contactRequest(app,params),/READ_ONLY/);
 for(const params of [{operation:'delete',args:[[100,-1]]},{operation:'markMessageRead',args:[-1,true]}])await assert.rejects(s.service.messageRequest(smsApp,params),/READ_ONLY/);
 assert.equal(s.data.get('vulpes-private-messages').length,1);
});
test('untrusted installed apps cannot reuse the Android permission granted to Gaia',async()=>{
 const s=await setup();
 assert.equal((await s.service.contactRequest({...app,installed:true},{operation:'all'})).length,1);
 assert.equal((await s.service.messageRequest({...smsApp,installed:true},{operation:'getMessages'})).length,1);
 assert.equal(s.calls.length,0);
 assert.throws(()=>authorizePersonal({...app,installed:true},'contacts','page'),/PERMISSION/);
 assert.throws(()=>authorizePersonal(smsApp,'calls','page'),/PERMISSION/);
 assert.throws(()=>authorizePersonal(app,'contacts','permission'),/PERMISSION/);
 assert.doesNotThrow(()=>authorizePersonal({id:'settings'},'sms','permission'));
});
test('provider errors and stalled page cursors are surfaced, not presented as an empty book',async()=>{
 const s=await setup();let n=0;
 s.service.native=async p=>p.operation==='status'?{contacts:true}:{rows:[],next:++n===1?1:1};
 await assert.rejects(s.service.rows('contacts'),/INVALID_CURSOR/);
 s.service.native=async()=>{throw Error('denied');};await assert.rejects(s.service.rows('contacts'),/denied/);
});
test('SMS mapping does not turn pending or failed sends into delivered messages',()=>{
 for(const [type,delivery] of [[1,'received'],[2,'sent'],[4,'sending'],[5,'error'],[6,'sending']])assert.equal(smsFromAndroid({_id:1,thread_id:1,type}).delivery,delivery);
 assert.throws(()=>smsFromAndroid({_id:Infinity,thread_id:1}),/INVALID_ANDROID_ID/);
});
