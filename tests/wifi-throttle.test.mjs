import test from 'node:test';
import assert from 'node:assert/strict';
import { tundraWifi } from '../host/Tundra.sys.mjs';

test('Wi-Fi bursts share one scan, cache errors, and retry after cooldown', async () => {
  const realNow = Date.now;
  let now = realNow(), starts = 0, release;
  let reply = {result:{networks:[]}};
  let gate = new Promise(resolve => {release = resolve;});
  Date.now = () => now;
  globalThis.Services = {env:{get:() => '1'}};
  globalThis.ChromeUtils = {importESModule:() => ({Subprocess:{call:async () => {
    starts++;
    let read = false;
    return {stdin:{write:async () => {},close:async () => {}},
      stdout:{readString:async () => {
        await gate;
        if (read) return null;
        read = true;
        return JSON.stringify(reply);
      }},wait:async () => ({exitCode:0})};
  }}})};
  try {
    const burst = Array.from({length:1000}, () => tundraWifi({operation:'scan'}));
    assert.equal(starts, 1);
    release();
    assert.ok((await Promise.all(burst)).every(r => r.networks.length === 0));
    await tundraWifi({operation:'scan'});
    assert.equal(starts, 1);
    now += 6000;
    reply = {error:'WIFI_UNAVAILABLE'};
    const failures = await Promise.allSettled(Array.from({length:1000}, () => tundraWifi({operation:'scan'})));
    assert.ok(failures.every(r => r.status === 'rejected'));
    assert.equal(starts, 2);
    await assert.rejects(tundraWifi({operation:'scan'}), /WIFI_UNAVAILABLE/);
    assert.equal(starts, 2);
    now += 6000;
    reply = {result:{networks:[]}};
    await tundraWifi({operation:'scan'});
    assert.equal(starts, 3);
    reply = {result:{disconnected:true}};
    await tundraWifi({operation:'disconnect'});
    reply = {result:{networks:[]}};
    await tundraWifi({operation:'scan'});
    assert.equal(starts, 5, 'disconnect invalidates the scan cache');
  } finally { Date.now = realNow; }
});

test('Gaia scans disconnected Wi-Fi every 20 seconds and stops when disabled', async () => {
  const {readFile} = await import('node:fs/promises');
  const vm = await import('node:vm');
  let timer, interval, scans = 0, cleared = 0;
  const observers = {};
  const manager = {connection:{status:'disconnected'}, getNetworks:() => {scans++;}};
  const window = {navigator:{mozSettings:{},mozWifiManager:manager,battery:{addEventListener(){}}},addEventListener(){}};
  const context = vm.createContext({window,console,
    LazyLoader:{load:async () => {}}, Service:{request:async () => {},registerState(){}},
    WifiIcon:class {start(){} update(){}}, WifiWakeLockManager:class {start(){}},
    SettingsListener:{getSettingsLock:() => ({get:() => ({})}),observe:(key,value,cb) => {observers[key]=cb;cb(value);}},
    setInterval:(cb,ms) => {timer=cb;interval=ms;return 123;},clearTimeout:id => {if(id===123) cleared++;}
  });
  vm.runInContext(await readFile(new URL('../overrides/system.gaiamobile.org/js/wifi.js',import.meta.url),'utf8'),context);
  window.Wifi.start();
  assert.equal(interval,20000);
  assert.equal(scans,0);
  timer();assert.equal(scans,1);
  manager.connection.status='connected';timer();assert.equal(scans,1);
  observers['wifi.enabled'](false);assert.equal(cleared,1);
});

test('Native Wi-Fi acknowledges unchanged settings and completes delayed radio changes', async () => {
  const {readFile} = await import('node:fs/promises');
  const vm = await import('node:vm');
  const events = {}, observers = new Map(), changes = [];
  let hardware = false, completeRadio;
  const navigator = {mozSettings:{addObserver:(key,fn)=>observers.set(key,fn)}};
  const call = async (method, params) => {
    if(method==='settings.set') {
      for(const [key,value] of Object.entries(params.values)) observers.get(key)?.({settingValue:value});
      return;
    }
    if(params.operation==='setEnabled') {
      changes.push(params.enabled);
      await new Promise(resolve=>{completeRadio=resolve;});
      hardware=params.enabled;
    }
    return {enabled:hardware,networks:[]};
  };
  const context=vm.createContext({navigator,console,Event,EventTarget,DOMException,
    window:{VulpesNativeWifi:true},location:{hostname:'system.localhost'},
    VulpesCompat:{call,request:x=>x},addEventListener:(name,fn)=>{events[name]=fn;}});
  vm.runInContext(await readFile(new URL('../host/gaia-wifi.js',import.meta.url),'utf8'),context);
  let disabled=0,enabled=0;
  navigator.mozWifiManager.ondisabled=()=>disabled++;
  navigator.mozWifiManager.onenabled=()=>enabled++;
  await events.DOMContentLoaded();
  await new Promise(setImmediate);
  assert.equal(disabled,1,'initial same-state acknowledgement releases Gaia controls');
  observers.get('wifi.enabled')({settingValue:false});
  await new Promise(setImmediate);
  assert.equal(disabled,2);
  assert.equal(changes.length,0,'no unnecessary hardware call');
  observers.get('wifi.enabled')({settingValue:true});
  await new Promise(setImmediate);
  assert.equal(navigator.mozWifiManager.enabled,false,'do not announce success before hardware');
  completeRadio();await new Promise(setImmediate);
  assert.equal(enabled,1);
  assert.equal(navigator.mozWifiManager.enabled,true);
});
