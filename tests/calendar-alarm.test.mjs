import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

async function moveAlarm(failure) {
  const request = {};
  const source = readFileSync(new URL('../gaia/apps/calendar/js/store/alarm.js', import.meta.url), 'utf8');
  let Alarm;
  const modules = {
    './abstract': function Abstract() {},
    'common/calc': {dateToTransport: d => ({utc: +d}), dateFromTransport: d => new Date(d.utc), HOUR: 3600000},
    'common/create_dom_promise': request => request,
    core: {db: {transaction: () => ({objectStore: () => ({index: () => ({openCursor: () => request})})})}},
    'common/debug': () => () => {},
    'common/promise': {denodeifyAll: () => {}},
    'common/object': {forEach: () => {}},
  };
  vm.runInNewContext(source, {
    define(factory) {const module = {};factory(id => modules[id], {}, module);Alarm = module.exports;},
    navigator: {mozAlarms: {add: () => failure ? Promise.reject(failure) : Promise.resolve({type: 'success', target: {result: 42}})}},
    Date, Promise,
  });
  const result = new Promise((resolve, reject) => Alarm.prototype._moveAlarms.call(
    {_alarmAddThresholdHours: 48}, new Date(), true,
    (error, value) => error ? reject(error) : resolve(value)));
  const date = Date.now() + 3600000;
  request.onsuccess({target: {result: {key: date, value: {eventId: 'test', trigger: {utc: date}},
    update() {}, continue() {request.onsuccess({target: {result: null}});}}}});
  return result;
}
test('a successfully scheduled reminder resolves the Node-style callback', async () => {
  const result = await moveAlarm();
  assert.equal(result[0].target.result, 42);
});
test('a rejected reminder reaches the caller instead of leaving it pending', async () => {
  const failure = Error('Alarm quota exceeded');
  await assert.rejects(moveAlarm(failure), error => error === failure);
});

function notificationController(record, failure) {
  const stats = {locks:0, unlocks:0, persist:0, notifications:0, errors:0};
  const co = {wrap: fn => (...args) => new Promise((resolve,reject) => {
    const iterator = fn(...args);
    function step(method, value) {
      let next;
      try {next = iterator[method](value);} catch(error) {reject(error);return;}
      if(next.done) resolve(next.value);
      else Promise.resolve(next.value).then(v=>step('next',v),e=>step('throw',e));
    }
    step('next');
  })};
  const stores = {
    Alarm: {get: async()=>record, persist:async()=>stats.persist++},
    Event: {get:async()=>({remote:{title:'Test',id:'test'}})},
    Busytime: {get:async()=>({start:{utc:Date.now()},_id:'busy'})},
  };
  const modules = {
    'common/calc': {dateFromTransport:d=>new Date(d.utc)}, 'ext/co':co,
    core: {storeFactory:{get:name=>stores[name]},db:{transaction:()=>({})}},
    'common/debug':()=>()=>{}, message_handler:{},
    notification:{sendNotification:async()=>{stats.notifications++;if(failure)throw failure;}},
  };
  const exports = {};
  vm.runInNewContext(readFileSync(new URL('../gaia/apps/calendar/js/controllers/notifications.js',import.meta.url),'utf8'),{
    define:factory=>factory(id=>modules[id],exports),Date,Promise,
    navigator:{languages:['fr'],requestWakeLock:()=>{stats.locks++;return {unlock:()=>stats.unlocks++};}},
    mozIntl:{_gaia:{RelativeDate:()=>({format:async()=> 'now'})}},
    console:{error:()=>stats.errors++},
  });
  return {stats, onAlarm:()=>exports.onAlarm({_id:'queued-alarm'})};
}
test('queued reminders for deleted events do not dereference a missing alarm',async()=>{
  const {stats,onAlarm}=notificationController(undefined);
  await onAlarm();
  assert.equal(stats.locks,0);assert.equal(stats.notifications,0);assert.equal(stats.persist,0);
});
test('a failed notification releases the wake lock without marking the reminder delivered',async()=>{
  const {stats,onAlarm}=notificationController({_id:'alarm'},Error('Permission denied'));
  await onAlarm();
  assert.equal(stats.notifications,1);assert.equal(stats.unlocks,1);
  assert.equal(stats.persist,0);assert.equal(stats.errors,1);
});
test('a successful reminder is persisted once and releases its wake lock',async()=>{
  const {stats,onAlarm}=notificationController({_id:'alarm'});
  await onAlarm();
  assert.equal(stats.notifications,1);assert.equal(stats.persist,1);assert.equal(stats.unlocks,1);
});
