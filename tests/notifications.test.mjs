import test from 'node:test';
import assert from 'node:assert/strict';
import {Notifications} from '../services/notifications.mjs';
const app={id:'sms',origin:'http://sms.localhost:8765',manifestURL:'http://sms.localhost:8765/manifest.webapp',manifest:{icons:{'284':'/sms.png'}}};
test('notification ownership, tags and persistence',()=>{
 const store=new Notifications();
 const first=store.show(app,{title:'Message',body:'Test',tag:'thread-1'});
 const second=store.show(app,{title:'Message 2',tag:'thread-1'});
 assert.equal(first.id,second.id);assert.equal(store.list().length,1);
 assert.equal(first.icon,app.origin+'/sms.png');
 const other=store.show({...app,id:'calendar'},{tag:'thread-1'});
 assert.notEqual(other.id,first.id);
 assert.throws(()=>store.remove(first.id,'calendar'),/PERMISSION_DENIED/);
 const reloaded=new Notifications(JSON.parse(JSON.stringify(store.list())));
 assert.equal(reloaded.list('sms')[0].title,'Message 2');
 reloaded.remove(first.id,'sms');assert.equal(reloaded.list('sms').length,0);
});
test('missed-call notifications open the manifest dialer entry, not Communications root',async()=>{
 const {notificationLaunch}=await import('../services/notifications.mjs');
 const phone={...app,id:'communications',manifest:{launch_path:'/',
   messages:[{notification:'/dialer/index.html#keyboard-view'}],
   entry_points:{dialer:{launch_path:'/dialer/index.html#keyboard-view'}}}};
 assert.deepEqual(notificationLaunch(phone),{manifestURL:app.manifestURL,origin:app.origin,
   url:app.origin+'/dialer/index.html#keyboard-view',entryPoint:'dialer'});
 assert.equal(notificationLaunch(app).url,app.origin+'/index.html');
 assert.throws(()=>notificationLaunch({...app,manifest:{launch_path:'https://example.org/'}}),/INVALID_NOTIFICATION_TARGET/);
});

// Exercise Gaia's original renderer: a silent notification must remain visible.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('Gaia notification sound and vibration respect per-notification flags',()=>{
 const events={sound:0,vibration:0,inserted:0};
 const node=()=>({dataset:{},classList:{add(){}},setAttribute(){},appendChild(){},querySelector(){return null;},insertBefore(){events.inserted++;}});
 const scope={window:{location:{origin:'http://system.localhost:8765'},dispatchEvent(){},setTimeout(){},Service:{query:()=>false}},
  navigator:{languages:['fr'],vibrate(){events.vibration++;}},
  SettingsListener:{observe(){}},Service:{query:()=>false,request(){}},
  document:{createElement:node,createEvent:()=>({initCustomEvent(){}}),hidden:false},
  mozIntl:{_gaia:{RelativeDate:()=>({formatElement(){}})}},
  Audio:class {play(){events.sound++;}},setTimeout(){},clearTimeout(){}};
 scope.window.navigator=scope.navigator;
 vm.runInNewContext(readFileSync(new URL('../overrides/system.gaiamobile.org/js/notification_screen.js',import.meta.url),'utf8'),scope);
 const n=scope.NotificationScreen;
 Object.assign(n,{container:{querySelector:node},getLockScreenContainer(){return null;},addUnreadNotification(){},updateToaster(){},toaster:node(),clearAllButton:{}});
 const show=mozbehavior=>n.addNotification({id:'test',manifestURL:'http://sms.localhost:8765/manifest.webapp',mozbehavior});
 show({nosound:true,novibrate:true});assert.equal(events.inserted,1);assert.equal(events.sound,0);assert.equal(events.vibration,0);
 show({nosound:true});assert.equal(events.sound,0);assert.equal(events.vibration,1);
 show({novibrate:true});assert.equal(events.sound,1);assert.equal(events.vibration,1);
 show({});assert.equal(events.sound,2);assert.equal(events.vibration,2);
});
