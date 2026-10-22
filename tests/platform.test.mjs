import assert from 'node:assert/strict';
import { authorizePlatform } from '../services/platform.mjs';
const app = (id, permissions = {}) => ({ id, manifest: { permissions } });
const settings = app('settings', { 'desktop-notification': {}, settings: { access: 'readwrite' } });
const gallery = app('gallery', { 'device-storage:pictures': { access: 'readwrite' } });
const camera = app('camera', { 'device-storage:pictures': { access: 'readwrite' } });
const rejects = (a, op, p = {}) =>
  assert.throws(
    () => authorizePlatform(a, op, p),
    /PERMISSION_DENIED|METHOD_NOT_SUPPORTED|QuotaExceededError/,
  );
authorizePlatform(settings, 'settings', { panel: 'wifi' });
authorizePlatform(settings, 'wifi', { operation: 'scan' });
authorizePlatform(app('system'), 'wifi', { operation: 'disconnect' });
rejects(app('costcontrol'), 'wifi');
rejects(gallery, 'wifi', { operation: 'connect' });
rejects(settings, 'wifi', { password: 'x'.repeat(4097) });
authorizePlatform(gallery, 'pick', { type: 'pictures' });
authorizePlatform(camera, 'capture');
authorizePlatform(camera, 'cameraPreview', {action:'start',camera:'back'});
authorizePlatform(camera, 'cameraPreview', {action:'frame'});
authorizePlatform(camera, 'cameraPreview', {action:'stop'});
for (const mode of ['off','auto','on','torch']) {
  authorizePlatform(camera,'cameraPreview',{action:'flash',mode});
  rejects(gallery,'cameraPreview',{action:'flash',mode});
}
assert.throws(()=>authorizePlatform(camera,'cameraPreview',{action:'flash',mode:'invalid'}), /INVALID_VALUE/);
rejects(gallery, 'cameraPreview', {action:'frame'});
rejects(settings, 'cameraPreview', {action:'start',camera:'back'});
assert.throws(() => authorizePlatform(camera, 'cameraPreview', {action:'start',camera:'../../device'}), /INVALID_VALUE/);
rejects(gallery, 'settings');
rejects(gallery, 'capture');
rejects(gallery, 'pick', { type: '../../private' });
rejects(gallery, 'notification', { owner: 'settings' });
rejects(gallery, 'sms');
for (const operation of ['calls', 'answer', 'hangup']) {
  authorizePlatform(app('system'), operation);
  authorizePlatform(app('communications'), operation);
  rejects(gallery, operation);
  rejects(settings, operation);
}
rejects(camera, 'contact');
rejects(settings, 'systemReady');
authorizePlatform(app('system'), 'systemReady');
rejects(settings, 'notification', { body: 'a'.repeat(65537) });
rejects(settings, 'execute', { command: 'id' });
console.log('PASS: shared platform permissions and notification size limits.');

for (const params of [{action:'focus',area:{left:-100,top:-100,right:100,bottom:100}},
  {action:'zoom',zoom:2},{action:'picture',size:{width:4032,height:3024}}]) {
  authorizePlatform(camera,'cameraPreview',params);
  rejects(gallery,'cameraPreview',params);
}
for (const params of [{action:'zoom',zoom:NaN},{action:'focus',area:{left:2,right:1,top:0,bottom:1}},
  {action:'picture',size:{width:-1,height:100}},{action:'execute'}])
  assert.throws(()=>authorizePlatform(camera,'cameraPreview',params),/INVALID_VALUE/);

for (const action of ['sim','smsc','calls','messages','deliveryReports']) {
  const params={action,...(action==='deliveryReports'?{enabled:true}:{})};
  authorizePlatform(settings,'mobileSettings',params);
  for (const id of ['system','communications','sms','camera','marketplace'])
    rejects(app(id),'mobileSettings',params);
}
for (const params of [{action:'enterPin',pin:'1234'},{action:'deliveryReports',enabled:'true'}])
  assert.throws(()=>authorizePlatform(settings,'mobileSettings',params),/INVALID_VALUE/);
console.log('PASS: mobile Settings queries are restricted to Settings; unsafe actions rejected.');

for(const action of ['network','dataEnabled','roaming']) {
  const params={action,...(action==='network'?{}:{enabled:false})};
  authorizePlatform(settings,'mobileSettings',params);
  rejects(app('system'),'mobileSettings',params);
}
for(const action of ['clock','setTimezone','setTime']) {
  authorizePlatform(settings,'deviceSettings',{action});
  for(const id of ['system','communications','marketplace'])rejects(app(id),'deviceSettings',{action});
}
assert.throws(()=>authorizePlatform(settings,'deviceSettings',{action:'execute'}),/INVALID_VALUE/);
assert.throws(()=>authorizePlatform(settings,'mobileSettings',{action:'roaming',enabled:1}),/INVALID_VALUE/);

for(const action of ['radioMode','setRadioMode','apns','editApn']) {
  authorizePlatform(settings,'mobileSettings',{action});
  for(const id of ['system','communications','marketplace'])rejects(app(id),'mobileSettings',{action});
}

for(const params of [{action:'calls'},{action:'forwarding'},{action:'setCallerId',mode:'default'},{action:'setCallWaiting',enabled:true},{action:'setForwarding',reason:'busy',enabled:false,number:''}]) {
  authorizePlatform(settings,'mobileSettings',params);
  for(const id of ['system','communications','marketplace'])rejects(app(id),'mobileSettings',params);
}

for(const operation of ['hotspotStatus','hotspotSave','hotspotPower']) {
  authorizePlatform(settings,'wifi',{operation});
  for(const id of ['system','communications','marketplace'])rejects(app(id),'wifi',{operation});
}

for (const id of ['system','settings']) authorizePlatform(app(id),'radioPower',{slot:0,enabled:false});
for (const id of ['communications','search','sms']) rejects(app(id),'radioPower',{slot:0,enabled:false});
for (const params of [{slot:2,enabled:true},{slot:0,enabled:1},{slot:'0',enabled:true}])
  assert.throws(()=>authorizePlatform(settings,'radioPower',params),/INVALID_VALUE/);
