import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SettingsService } from '../../services/settings.mjs';

const context = vm.createContext({ window: {}, Blob, Uint8Array, btoa, atob });
vm.runInContext(
  await readFile(new URL('../../host/settings-codec.js', import.meta.url), 'utf8'),
  context,
);
const { encode, decode } = context.window.VulpesSettingsCodec;
// A binary wallpaper larger than the original 1 MiB JSON ceiling, including
// every byte value. Exercise the actual service, JSON storage and observer path.
const pixels = Uint8Array.from({ length: 1200000 }, (_, i) => i % 256);
const image = new Blob([pixels], { type: 'image/png' });
let stored;
const backend = {
  get: async (key) => stored[key],
  setMany: async (entries) => {
    stored = JSON.parse(JSON.stringify(Object.fromEntries(entries)));
  },
};
const payload = JSON.parse(
  JSON.stringify(await encode({ 'wallpaper.image': image, 'wallpaper.image.valid': true })),
);
const request = { version: 1, id: 1, method: 'settings.set', params: { values: payload } };
const service = new SettingsService(backend, { maxBytes: 32 * 1024 * 1024 });
const session = service.bindSession('system', ['settings.read', 'settings.write']);
assert.equal((await session(request)).result.committed, true);
const reply = await session({
  version: 1,
  id: 2,
  method: 'settings.get',
  params: { key: 'wallpaper.image' },
});
for (const value of [
  decode(reply.result).value,
  decode(stored)['wallpaper.image'],
  decode(stored['wallpaper.image']),
]) {
  assert.ok(value instanceof Blob);
  assert.equal(value.type, image.type);
  assert.equal(value.size, image.size); // Gaia's savedBlobSize loop guard now works.
  assert.deepEqual(new Uint8Array(await value.arrayBuffer()), pixels);
}
assert.equal(
  (await service.bindSession('unprivileged', [])(request)).error.code,
  'PERMISSION_DENIED',
);
assert.equal(
  (await new SettingsService(backend).bindSession('desktop', ['settings.write'])(request)).error
    .code,
  'VALUE_TOO_LARGE',
);
assert.equal(
  JSON.stringify(
    decode(await encode({ language: 'fr', enabled: true, unset: null, list: [1, 'x'] })),
  ),
  JSON.stringify({ language: 'fr', enabled: true, unset: null, list: [1, 'x'] }),
);
await assert.rejects(
  encode(new Blob([new Uint8Array(16 * 1024 * 1024 + 1)])),
  /SETTING_BLOB_TOO_LARGE/,
);
console.log(
  'PASS: binary settings survive JSON persistence, reads and observers; limits and permissions retained.',
);
