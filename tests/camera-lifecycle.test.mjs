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
function setup(native = false, platformName = 'desktop') {
  const videos = [], streams = [], requests = [], events = new EventTarget();
  const nativeRequests=[], wakeLocks=[];
  let hidden = false, captureGate, playGate, labels = true, requireStopped = false;
  const failures=[];
  class Document extends EventTarget { get hidden() { return hidden; } }
  class Video {
    get srcObject() { return this.stream; }
    set srcObject(value) {
      if(requireStopped && value===null && this.stream?.getTracks().some(t=>t.readyState!=="ended"))
        throw Error("Capture producer is still live");
      this.stream = value;
    }
    constructor() { this.dataset = {}; this.style = {}; this.parentNode={append:canvas=>{canvas.isConnected=true;}}; }
    play() { return playGate?.promise || Promise.resolve(); }
    pause() {}
    remove() { const index=videos.indexOf(this); if(index!==-1)videos.splice(index, 1); }
  }
  const document = new Document();
  Object.assign(document, {
    documentElement: {lang:'en'}, body: {append:video => videos.push(video)},
    querySelector: () => null, querySelectorAll: () => [...videos],
    createElement: tag => tag === 'canvas' ? {style:{},dataset:{},
      remove(){this.isConnected=false;},
      captureStream(){throw Error('Native preview must not recapture the canvas');},
      getContext:()=>new Proxy({
        getShaderParameter:()=>native==='working',getProgramParameter:()=>true,
      },{get(target,name){return target[name] || (()=>({}));}}),
    } : new Video(),
  });
  const navigator = {requestWakeLock(topic){const lock={topic,released:false,unlock(){this.released=true;}};wakeLocks.push(lock);return lock;},language:'en', mediaDevices: {
    async enumerateDevices() {
      return ['rear','selfie'].map(deviceId => ({kind:'videoinput', deviceId,
        label: labels ? (deviceId === 'rear' ? 'Back camera' : 'Front camera') : ''}));
    },
    async getUserMedia(constraints) {
      requests.push(constraints);
      if(failures.length) throw failures.shift();
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
    Event, DOMException, MediaStream:class extends EventTarget {getTracks(){return [];}getVideoTracks(){return [];}}, CustomEvent:class extends Event {constructor(type,opts){super(type);this.detail=opts.detail;}},
    setTimeout, clearTimeout, queueMicrotask, setInterval:()=>0, clearInterval(){},
    addEventListener:events.addEventListener.bind(events), dispatchEvent:events.dispatchEvent.bind(events),
    VulpesCompat:{async call(method,params) {
      if(method==='platform.capabilities')return {platform:native?'tundra':platformName,camera:true};
      nativeRequests.push(params);
      if(params.action==='start')return {session:nativeRequests.length,width:640,height:480,orientation:90,focusModes:['fixed'],zoomRatios:[1],pictureSizes:[{width:640,height:480}]};
      if(params.action==='frame')return {sequence:nativeRequests.length,data:new ArrayBuffer(640*480*3/2)};
    }},
  };
  context.window = context;
  vm.runInNewContext(readFileSync(new URL('../host/gaia-camera.js', import.meta.url),'utf8'), context);
  return {api:navigator.mozCameras, streams, requests, videos, nativeRequests, wakeLocks,
    viewfinder:()=>{const video=new Video();videos.push(video);return video;},
    failCapture:error=>failures.push(error),
    unlabelled:()=>{labels=false;},
    requireStoppedBeforeDetach:()=>{requireStopped=true;},
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
  assert.equal(s.nativeRequests[1].session,1);
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


test('release stops capture tracks before detaching the preview video',async()=>{
  const s=setup();s.requireStoppedBeforeDetach();
  const {camera}=await s.api.getCamera('back');
  await camera.release();
  assert.equal(camera.getTracks()[0].readyState,'ended');
  const next=await s.api.getCamera('front');
  await next.camera.release();
});


test('release announces stopped before the next camera starts',async()=>{
 const s=setup(), {camera}=await s.api.getCamera('back');
 const states=[];camera.addEventListener('previewstatechange',e=>states.push(e.newState));
 await camera.release();await camera.release();
 assert.deepEqual(states,['stopped']);
});

test('Gaia viewfinder recomputes a viewport that was hidden at initialization',()=>{
  let view;
  const window={innerWidth:0,innerHeight:0};
  vm.runInNewContext(readFileSync(new URL('../gaia/apps/camera/js/views/viewfinder.js',import.meta.url),'utf8'),{
    window,define(factory){const module={};factory(name=>name==='view'?{extend:value=>value}:name==='debug'?()=>()=>{}:{},{},module);view=module.exports;},
  });
  const sizes=[];
  const instance=Object.assign({},view,{updatePreviewMetrics(){sizes.push([this.container.width,this.container.height]);}});
  instance.getSize();instance.updatePreview({width:480,height:640},0,false);
  assert.equal(sizes.length,0,'hidden window must not produce a zero-size video');
  window.innerWidth=360;window.innerHeight=666;
  instance.updatePreview({width:480,height:640},0,false);
  window.innerWidth=696;window.innerHeight=330;
  instance.updatePreview({width:480,height:640},0,false);
  assert.deepEqual(sizes,[[360,666],[696,330]]);
});


test('native preview uses one canvas, releases its worker and never recaptures video',async()=>{
  const s=setup('working');
  const {camera:first}=await s.api.getCamera('back');
  const canvas=first.vulpesPreviewCanvas;
  assert.ok(first.vulpesTiming.frames>0);
  assert.equal(first.vulpesClosed,false);
  await first.release();
  assert.equal(first.vulpesClosed,true);
  const {camera:second}=await s.api.getCamera('front');
  assert.equal(second.vulpesPreviewCanvas,canvas);
  assert.equal(second.vulpesClosed,false);
  await second.release();
  assert.equal(s.nativeRequests.filter(r=>r.action==='stop').length,2);
  assert.equal(s.wakeLocks.length,2);
  assert.ok(s.wakeLocks.every(lock=>lock.topic==='screen' && lock.released));
});


test('native preview attaches inside Gaia and detaches on camera release',async()=>{
  const s=setup('working'),video=s.viewfinder();
  const {camera}=await s.api.getCamera('front');
  video.mozSrcObject=camera;
  await video.play();
  assert.equal(video.mozSrcObject,camera);
  assert.equal(video.srcObject,undefined,'do not create a native video decoder');
  assert.equal(camera.vulpesPreviewCanvas.isConnected,true);
  assert.equal(video.style.display,'none');
  await camera.release();
  assert.equal(camera.vulpesPreviewCanvas.isConnected,false);
  assert.equal(video.style.display,'');
  assert.equal(camera.vulpesClosed,true);
});

 test('Android waits for a busy camera without changing the selected sensor', async()=>{
  const s=setup(false,'android');
  await s.api.getCamera('back');
  s.failCapture(new DOMException('closing','NotReadableError'));
  const {camera}=await s.api.getCamera('front');
  assert.equal(camera.getVideoTracks()[0].getSettings().deviceId,'selfie');
  assert.equal(s.requests.length,3);
  assert.equal(s.requests[1].video.deviceId.exact,s.requests[2].video.deviceId.exact);
  await camera.release();
 });
 test('Android does not retry camera permission refusal',async()=>{
  const s=setup(false,'android');s.failCapture(new DOMException('denied','NotAllowedError'));
  await assert.rejects(s.api.getCamera('back'),{name:'NotAllowedError'});
  assert.equal(s.requests.length,1);
 });
 test('Android stops camera retry when the app becomes hidden',async()=>{
  const s=setup(false,'android');s.failCapture(new DOMException('closing','NotReadableError'));
  const pending=s.api.getCamera('front');
  const checked=assert.rejects(pending,{name:'AbortError'});
  await new Promise(resolve=>setImmediate(resolve));s.hide();await checked;
  assert.equal(s.requests.length,1);
 });
