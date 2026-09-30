import assert from 'node:assert/strict';
import { Alarms } from '../host/Alarms.sys.mjs';

let saved;
const storage = {
  load: async () => saved && structuredClone(saved),
  save: async (state) => {
    saved = structuredClone(state);
  },
};
const app = {
  id: 'clock',
  origin: 'http://clock.localhost:8765',
  manifest: { permissions: { alarms: {} }, messages: [{ alarm: '/onring.html' }] },
};
const events = [];
const actor = {
  manager: { documentURI: { spec: app.origin + '/onring.html' } },
  sendAsyncMessage: (_name, event) => events.push(event),
};
const launched = [];
const create = async () => {
  const alarms = new Alarms(
    () => app,
    (id) => launched.push(id),
    storage,
    () => 1,
  );
  await alarms.init();
  return alarms;
};
let alarms = await create();
const date = Date.now() + 60_000;
const request = {
  operation: 'add',
  date,
  respectTimezone: 'honorTimezone',
  data: { label: 'Wake up' },
  local: [2026, 8, 23, 9, 0, 0, 0],
};
const id = await alarms.request(actor, app, request);
alarms = await create();
assert.equal((await alarms.request(actor, app, { operation: 'getAll' }))[0].id, id);
assert.throws(() => alarms.request(actor, { ...app, manifest: {} }, request), /PERMISSION_DENIED/);
await alarms.request(actor, app, { operation: 'subscribe' });
alarms.state.records[0].date = Date.now() - 100;
await alarms.tick();
assert.equal(events[0].data.id, id);
assert.equal(saved.pending.length, 0);
assert.equal(saved.records.length, 0);
assert.equal(launched.length, 0);
const pending = await alarms.request(actor, app, { ...request, date: Date.now() - 100 });
alarms.cleanup(actor);
await alarms.tick();
assert.deepEqual(launched, ['clock']);
alarms = await create();
await alarms.request(actor, app, { operation: 'subscribe' });
assert.equal(events.at(-1).data.id, pending);
assert.equal(saved.pending.length, 0);
console.log(
  'PASS: shared alarms persist, enforce permissions and deliver queued events after restart.',
);
