import test from 'node:test';
import assert from 'node:assert/strict';
import { tundraSnapshot, tundraCapabilities, tundraRadio, tundraCallAudio } from '../host/Tundra.sys.mjs';

test('Tundra rejects missing/stale status and preserves the real battery value', async () => {
  globalThis.IOUtils = {
    readJSON: async () => {
      throw Error('missing');
    },
  };
  assert.equal((await tundraSnapshot()).available, false);
  let data = {
    schema: 1,
    recordedAt: Date.now() / 1000 - 30,
    battery: { level: 0.73, charging: false },
  };
  IOUtils.readJSON = async () => data;
  assert.equal((await tundraSnapshot()).available, false);
  data.recordedAt = Date.now() / 1000;
  assert.equal((await tundraSnapshot()).battery.level, 0.73);
  data.battery.level = 2;
  assert.equal((await tundraSnapshot()).battery, null);
});

test('native capabilities report the camera adapter and gate modem/Wi-Fi services', () => {
  globalThis.Services = { appinfo: { platformVersion: '156.0.1' } };
  const caps = tundraCapabilities({ version: '2.7-preview.7', gaia: '2.7.0' });
  assert.equal(caps.platform, 'tundra');
  assert.equal(caps.gecko, '156.0.1');
  assert.equal(caps.camera, true);
  for (const name of ['sms', 'dial', 'wifiControl']) assert.equal(caps[name], false);
});

test('call audio collects split replies and rejects oversized output', async () => {
  let chunks = ['{"res', 'ult":{"active":true}}', null], killed = false;
  globalThis.ChromeUtils = {importESModule: () => ({Subprocess: {call: async () => ({
    stdin:{write:async()=>{},close:async()=>{}},
    stdout:{readString:async()=>chunks.shift()},
    wait:async()=>({exitCode:0}),kill:()=>{killed=true;},
  })}})};
  assert.deepEqual(await tundraCallAudio({operation:'status'}),{active:true});
  chunks=['x'.repeat(4097)];
  await assert.rejects(tundraCallAudio({operation:'status'}),/CALL_AUDIO_INVALID_REPLY/);
  assert.equal(killed,true);
});

test('radio preserves modem errors and separates a broken transport', async () => {
  globalThis.Services = {env: {get: key => key==='VULPES_TUNDRA_RADIO'?'1':''}};
  let response = {ok:false, error:'RADIO_NOT_REGISTERED'}, exitCode = 0;
  globalThis.ChromeUtils = {importESModule: () => ({Subprocess: {call: async () => {
    let read = false;
    return {stdin:{write:async () => {}, close:async () => {}},
      stdout:{readString:async () => read ? null : (read = true, JSON.stringify(response))},
      wait:async () => ({exitCode})};
  }}})};
  await assert.rejects(tundraRadio('status'), /RADIO_NOT_REGISTERED/);
  response = {ok:true, result:{online:true}};
  assert.deepEqual(await tundraRadio('status'), {online:true});
  response = {ok:false, error:'sensitive backend detail'};
  await assert.rejects(tundraRadio('status'), /RADIO_REQUEST_FAILED/);
  exitCode = 1;
  await assert.rejects(tundraRadio('status'), /RADIO_UNAVAILABLE/);
});

test('Nokia uses its private broker and parameters cannot replace the authorized operation', async () => {
  globalThis.Services={env:{get:key=>key==='VULPES_DEVICE'?'beatles':key==='VULPES_TUNDRA_RADIO'?'1':''}};
  let command,envelope;
  globalThis.ChromeUtils={importESModule:()=>({Subprocess:{call:async options=>{
    command=options;let read=false;
    return {stdin:{write:async text=>{envelope=JSON.parse(text);},close:async()=>{}},
      stdout:{readString:async()=>read?null:(read=true,'{"ok":true,"result":[]}')},
      wait:async()=>({exitCode:0})};
  }}})};
  await tundraRadio('calls',{operation:'sms',version:99});
  assert.equal(command.command,'/work/control-client');
  assert.deepEqual(command.arguments,['--radio']);
  assert.deepEqual(envelope,{operation:'calls',version:1});
  await tundraCallAudio({operation:'status'});
  assert.deepEqual(envelope,{settings:{operation:'status'},version:1,operation:'callAudio'});
});

test('direct socket transport preserves authorization envelopes and masks modem details',async()=>{
 globalThis.Services={env:{get:key=>['VULPES_TUNDRA_RADIO','VULPES_SOCKET_CONTROL'].includes(key)?'1':''}};
 let request,reply={ok:true,result:[]};
 globalThis.ChromeUtils={importESModule:()=>({unixControl:async(kind,params)=>{request={kind,params};return reply;}})};
 assert.deepEqual(await tundraRadio('calls',{operation:'sms',version:99}),[]);
 assert.deepEqual(request,{kind:'radio',params:{operation:'calls',version:1}});
 reply={ok:false,error:'RADIO_NOT_REGISTERED'};
 await assert.rejects(tundraRadio('calls'),/RADIO_NOT_REGISTERED/);
 reply={ok:false,error:'private backend detail'};
 await assert.rejects(tundraRadio('calls'),/RADIO_REQUEST_FAILED/);
 reply={result:{active:false}};
 assert.deepEqual(await tundraCallAudio({operation:'status'}),{active:false});
});
