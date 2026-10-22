import test from 'node:test';
import assert from 'node:assert/strict';
import {requestMediaPermission} from '../services/media-permission.mjs';

function windowMock() {
  const win = new EventTarget();
  win.CustomEvent = CustomEvent;
  return win;
}
const request = {id:'test-request',kind:'microphone',origin:'http://camera.localhost:8765',manifestURL:'http://camera.localhost:8765/manifest.webapp'};

test('the original Gaia media panel receives the app identity and matching decision', async () => {
  const win=windowMock();let prompt;
  win.addEventListener('mozChromeEvent', event => {prompt=event.detail;});
  const pending=requestMediaPermission(win,request);
  assert.equal(prompt.manifestURL,request.manifestURL);
  assert.deepEqual(prompt.permissions,{'audio-capture':[]});
  assert.equal(prompt.type,'permission-prompt');
  win.dispatchEvent(new CustomEvent('mozContentEvent',{detail:{id:request.id,type:'permission-allow',remember:true}}));
  assert.deepEqual(await pending,{allowed:true,remember:true});
});

test('foreign or unrelated responses cannot grant media access', async () => {
  const win=windowMock();let settled=false;
  const pending=requestMediaPermission(win,request).then(result=>{settled=true;return result;});
  for (const detail of [{id:'other',type:'permission-allow'},{id:request.id,type:'unrelated'}])
    win.dispatchEvent(new CustomEvent('mozContentEvent',{detail}));
  await Promise.resolve();assert.equal(settled,false);
  win.dispatchEvent(new CustomEvent('mozContentEvent',{detail:{id:request.id,type:'permission-deny'}}));
  assert.deepEqual(await pending,{allowed:false,remember:false});
});

test('leaving the system document cancels the pending request', async () => {
  const win=windowMock();const pending=requestMediaPermission(win,request);
  win.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(await pending,{allowed:false,remember:false});
});
