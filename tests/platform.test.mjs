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
