import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function camera() {
  const workers = [];
  const context = {setTimeout, clearTimeout, Subprocess: {async call() {
    let finish;
    const done = new Promise(resolve => { finish = resolve; });
    const worker = {closed:false, writes:[],
      stdin:{async close() {worker.closed=true;finish();}, async write(text) {worker.writes.push(text);}},
      wait:()=>done, kill:()=>finish()};
    workers.push(worker); return worker;
  }}};
  const source = readFileSync(new URL('../host/NativeCamera.sys.mjs', import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('export class NativeCamera','globalThis.NativeCamera = class NativeCamera');
  vm.runInNewContext(source,context);
  const service = new context.NativeCamera();
  service.packet = async () => ({ready:true,format:'nv21',width:640,height:480});
  return {service,workers};
}

test('a delayed stop or frame from the old camera cannot close its replacement',async()=>{
  const {service,workers}=camera(), actor={};
  const old=await service.request(actor,{action:'start',camera:'back'});
  const next=await service.request(actor,{action:'start',camera:'front'});
  assert.notEqual(old.session,next.session);assert.equal(workers[0].closed,true);
  await service.request(actor,{action:'stop',session:old.session});
  assert.equal(workers[1].closed,false);
  await assert.rejects(service.request(actor,{action:'frame',session:old.session}),/CAMERA_NOT_OPEN/);
  assert.equal(workers[1].closed,false);
  await service.request(actor,{action:'frame',session:next.session});
  assert.deepEqual(workers[1].writes,['frame\n']);
  await service.request(actor,{action:'stop',session:next.session});
  assert.equal(workers[1].closed,true);
});

test('a different actor cannot stop or use the current camera',async()=>{
  const {service,workers}=camera(), owner={}, other={};
  const meta=await service.request(owner,{action:'start'});
  await service.request(other,{action:'stop',session:meta.session});
  await assert.rejects(service.request(other,{action:'frame',session:meta.session}),/CAMERA_NOT_OPEN/);
  await assert.rejects(service.request(other,{action:'start'}),/CAMERA_BUSY/);
  assert.equal(workers[0].closed,false);
  await service.request(owner,{action:'stop',session:meta.session});
});
