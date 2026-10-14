import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(app,path,call){
 const events=new Map(),notices=[];
 const context={console,URL,Map,Set,Number,JSON,Date,Promise,queueMicrotask,setTimeout,clearTimeout,setInterval,clearInterval,
  location:{hostname:app+'.localhost',pathname:path},navigator:{language:'en'},localStorage:{removeItem(){}},
  document:{hidden:false,documentElement:{lang:'en'},readyState:'complete',addEventListener:(type,fn)=>events.set('document-'+type,fn),querySelectorAll(){return[];}},
  MutationObserver:class{observe(){}},addEventListener:(type,fn)=>events.set(type,fn),
  VulpesCompat:{call},VulpesGaiaUI:{notice:value=>notices.push(value)}};
 context.window=context;vm.runInNewContext(readFileSync('android/ui/android-ui.js','utf8'),context);
 return {context,events,notices};
}
test('native call rows use Gaia grouping and expose details without changing the local DB',async()=>{
 const s=setup('communications','/dialer/index.html',async(_method,p)=>p.operation==='status'?{calls:true}:[
  {_id:1,date:1000,number:'5550199',duration:42,type:2},
  {_id:2,date:2000,number:'5550199',duration:0,type:2}]);
 let localReads=0;
 s.context.CallLogDBManager={getGroupList(){localReads++;},getGroup(){localReads++;},getGroupAtPosition(){localReads++;},
  _getGroupId:r=>[0,r.number,r.type],_getGroupObject:g=>({...g,id:g.id.join('-'),type:g.id[2]})};
 const db=s.context.CallLogDBManager;
 const rows=await new Promise(resolve=>db.getGroupList(resolve,'lastEntryDate',true,false));
 assert.equal(rows.length,1);assert.equal(rows[0].retryCount,2);assert.equal(rows[0].calls[1].duration,42000);
 assert.equal((await db.getGroup('5550199',1000,'dialing')).calls.length,2);assert.equal(localReads,0);
 const streamed=[];
 await new Promise(resolve=>db.getGroupList(c=>{if(!c.value)return resolve();streamed.push(c.value);c.continue();},'lastEntryDate',true,true));
 assert.equal(streamed.length,1);
});
test('SMS provider change refreshes the open conversation without reloading or touching the draft',async()=>{
 const inserted=[];
 const s=setup('sms','/index.html',async()=>[{id:-1,threadId:-2,body:'Received',timestamp:1000}]);
 s.context.Navigation={isCurrentPanel:name=>name==='thread'};
 s.context.ConversationView={activeThread:{id:-2},appendMessage:async message=>inserted.push(message)};
 s.context.Compose={getText:()=> 'Unsent draft'};
 s.context.document.getElementById=()=>null;
 s.context.location.reload=()=>{throw Error('draft lost');};
 s.events.get('vulpes-service-event')({detail:{type:'android-data-changed',data:{kind:'sms'}}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(inserted.length,1);assert.equal(inserted[0].body,'Received');
 assert.equal(s.context.Compose.getText(),'Unsent draft');
});

test('hidden call log refreshes contact names when shown after Android access changes',()=>{
 const s=setup('communications','/dialer/index.html',async()=>({}));
 let updates=0;
 s.context.CallLog={sticky:{},_contactCache:true,updateListWithContactInfo(){updates++;}};
 s.context.document.hidden=true;
 s.events.get('vulpes-service-event')({detail:{type:'android-data-changed',data:{kind:'contacts'}}});
 assert.equal(updates,0);
 s.context.document.hidden=false;
 s.events.get('visibilitychange')();
 assert.equal(updates,1);
 assert.equal(s.context.CallLog._contactCache,false);
});

test('Android contact HTML caches are disabled before Gaia can apply stale names',async()=>{
 const s=setup('communications','/contacts/index.html',async()=>({}));
 try {
   let writes=0;
   s.context.Cache={get enabled(){return true;},get active(){return true;},set firstChunk(value){writes++;},apply:async()=> 'stale names'};
   assert.equal(s.context.Cache.enabled,false);
   assert.equal(s.context.Cache.active,false);
   s.context.Cache.firstChunk={cache:'Android names'};
   assert.equal(writes,0);
   await assert.rejects(s.context.Cache.apply());
 } finally{s.events.get('pagehide')();}
});

test('revoked native contact details close when the hidden app becomes visible',async()=>{
 const s=setup('communications','/contacts/index.html',async()=>[]);
 try {
   let closed=0;
   s.context.MainNavigation={currentView:()=> 'view-contact-details'};
   s.context.Contacts={goBack(){closed++;}};
   s.events.get('document-click')({target:{closest:()=>({dataset:{uuid:'android:1'}})}});
   s.context.document.hidden=true;
   s.events.get('vulpes-service-event')({detail:{type:'android-data-changed',data:{kind:'contacts'}}});
   assert.equal(closed,0);
   s.context.document.hidden=false;
   s.events.get('visibilitychange')();
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(closed,1);
 } finally{s.events.get('pagehide')();}
});
