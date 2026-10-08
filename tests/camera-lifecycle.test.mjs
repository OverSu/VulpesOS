import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {promise, resolve};
}

// Execute the shared adapter, with controllable media promises instead of a sensor.
function setup(native = false) {
  const videos = [], streams = [], requests = [], events = new EventTarget();
  const nativeRequests=[];
  let hidden = false, captureGate, playGate, labels = true;
  class Document extends EventTarget { get hidden() { return hidden; } }
  class Video {
    get srcObject() { return this.stream; }
    set srcObject(value) { this.stream = value; }
    constructor() { this.dataset = {}; this.style = {}; }
    play() { return playGate?.promise || Promise.resolve(); }
    pause() {}
    remove() { const index=videos.indexOf(this); if(index!==-1)videos.splice(index, 1); }
  }
  const document = new Document();
  Object.assign(document, {
    documentElement: {lang:'en'}, body: {append:video => videos.push(video)},
    querySelector: () => null, querySelectorAll: () => [...videos],
    createElement: tag => tag === 'canvas' ? {getContext:()=>({
      createShader:()=>({}), shaderSource(){}, compileShader(){},
      getShaderParameter:()=>false, createProgram:()=>({}),
      deleteShader(){}, deleteProgram(){}, getExtension:()=>null,
    })} : new Video(),
  });
  const navigator = {language:'en', mediaDevices: {
    async enumerateDevices() {
      return ['rear','selfie'].map(deviceId => ({kind:'videoinput', deviceId,
        label: labels ? (deviceId === 'rear' ? 'Back camera' : 'Front camera') : ''}));
    },
    async getUserMedia(constraints) {
      requests.push(constraints);
      const id = constraints.video.deviceId?.exact ||
        (constraints.video.facingMode?.ideal === 'user' ? 'selfie' : 'rear');
      const gate = captureGate;
      captureGate = null;
      if (gate) await gate.promise;
      const track = {readyState:'live', stop() { this.readyState = 'ended'; },
        getSettings: () => ({deviceId:id, width:640, height:480})};
      const stream = Object.assign(new EventTarget(), {
        getTracks: () => [track], getVideoTracks: () => [track],
      });
      streams.push(stream);
      return stream;
    },
  }};
  const context = {document, Document, navigator, HTMLMediaElement:Video, console, performance,
    location:{hostname:'camera.localhost',port:'8765'}, parent:{},
    MutationObserver:class {observe() {}},
    Event, DOMException, CustomEvent:class extends Event {constructor(type,opts){super(type);this.detail=opts.detail;}},
    setTimeout, clearTimeout, queueMicrotask, setInterval:()=>0, clearInterval(){},
    addEventListener:events.addEventListener.bind(events), dispatchEvent:events.dispatchEvent.bind(events),
    VulpesCompat:{async call(method,params) {
      if(method==='platform.capabilities')return {platform:native?'tundra':'desktop',camera:true};
      nativeRequests.push(params);
      if(params.action==='start')return {session:42,width:640,height:480,orientation:90};
    }},
  };
  context.window = context;
  vm.runInNewContext(readFileSync(new URL('../host/gaia-camera.js', import.meta.url),'utf8'), context);
  return {api:navigator.mozCameras, streams, requests, videos, nativeRequests,
    unlabelled:()=>{labels=false;},
    blockCapture:()=>captureGate=deferred(), blockPlay:()=>playGate=deferred(),
    hide:()=>{hidden=true;events.dispatchEvent(new Event('visibilitychange'));},
    show:()=>{hidden=false;events.dispatchEvent(new Event('visibilitychange'));},
  };
}

test('unlabelled device identities stay stable after front/back switches', async()=>{
  const s=setup();s.unlabelled();
  for (const [name,id] of [['back','rear'],['front','selfie'],['back','rear'],['front','selfie']]) {
    const {camera}=await s.api.getCamera(name);
    assert.equal(camera.getVideoTracks()[0].getSettings().deviceId,id);
  }
  await s.streams.at(-1).release();
});

test('native preview setup failure releases the sensor before returning an error', async()=>{
  const s=setup(true);
  await assert.rejects(s.api.getCamera('front'),/Camera shader compilation failed/);
  assert.equal(s.nativeRequests.length,2);
  assert.equal(s.nativeRequests[1].action,'stop');
  assert.equal(s.nativeRequests[1].session,42);
});

test('switch waits for asynchronous close even after release has detached the current stream', async()=>{
  const s=setup();
  const {camera}=await s.api.getCamera('back');
  const gate=deferred();let calls=0;
  camera.vulpesCameraClose=()=>{calls++;return gate.promise;};
  const release=camera.release();
  assert.equal(camera.release(),release);
  const next=s.api.getCamera('front');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.requests.length,1);
  gate.resolve();await release;
  const replacement=await next;
  assert.equal(calls,1);
  assert.equal(camera.getTracks()[0].readyState,'ended');
  assert.equal(s.videos.length,1,'only the active capture video is retained');
  await replacement.camera.release();
  assert.equal(s.videos.length,0);
});

test('failed hardware close still stops tracks and allows reopening', async()=>{
  const s=setup();const {camera}=await s.api.getCamera('back');
  camera.vulpesCameraClose=async()=>{throw Error('device disconnected');};
  await assert.rejects(camera.release(),/device disconnected/);
  assert.equal(camera.getTracks()[0].readyState,'ended');
  const next=await s.api.getCamera('front');
  assert.equal(next.camera.getTracks()[0].readyState,'live');
  await next.camera.release();
});

test('concurrent switch waits for a pending open and disposes its stale stream', async()=>{
  const s=setup(),gate=s.blockCapture();
  const first=s.api.getCamera('back');
  const rejected=assert.rejects(first,{name:'AbortError'});
  await new Promise(resolve=>setImmediate(resolve));
  const second=s.api.getCamera('front');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.requests.length,1,'second sensor must not open before first settles');
  gate.resolve();await rejected;
  const {camera}=await second;
  assert.equal(s.streams[0].getTracks()[0].readyState,'ended');
  assert.equal(camera.getVideoTracks()[0].getSettings().deviceId,'selfie');
  await camera.release();
});

test('hide/show during preview startup leaves no live abandoned stream', async()=>{
  const s=setup(),gate=s.blockPlay();
  const first=s.api.getCamera('back');
  const rejected=assert.rejects(first,{name:'AbortError'});
  await new Promise(resolve=>setImmediate(resolve));
  s.hide();s.show();
  const next=s.api.getCamera('front');
  gate.resolve();await rejected;
  const {camera}=await next;
  assert.equal(s.streams[0].getTracks()[0].readyState,'ended');
  assert.equal(camera.getTracks()[0].readyState,'live');
  await camera.release();
});
