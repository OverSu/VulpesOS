import { SettingsService } from '../services/settings.mjs';
import { IndexedDBStorage } from '../adapters/indexeddb.mjs';

const results = {};
let storage;
try {
  storage = await IndexedDBStorage.open('vulpes-contract-tests');
  const service = new SettingsService(storage);
  const writer = service.bindSession('settings', ['settings.read', 'settings.write']);
  const reader = service.bindSession('homescreen', ['settings.read']);
  const web = service.bindSession('untrusted-web', []);
  let id = 0;
  const req = (method, params) => ({ version: 1, id: ++id, method, params });
  if (new URL(location.href).searchParams.has('restart')) {
    const result = await reader(req('settings.get', { key: 'language.current' }));
    results.survives_engine_restart = result.result.value === 'fr';
  } else {
    await writer(req('settings.set', { values: { 'language.current': 'en' } }));
    const set = await writer(
      req('settings.set', {
        values: { 'language.current': 'fr', 'deviceinfo.software': 'Vulpes next lab' },
      }),
    );
    results.write_commits = set.result.committed === true;
    const read = await reader(req('settings.get', { key: 'language.current' }));
    results.read_back = read.result.value === 'fr';
    const denied = await reader({
      ...req('settings.set', { values: { 'language.current': 'de' } }),
      identity: 'settings',
      permissions: ['settings.write'],
    });
    results.payload_cannot_escalate = denied.error.code === 'PERMISSION_DENIED';
    const webResult = await web(req('settings.get', { key: 'language.current' }));
    results.untrusted_session_denied = webResult.error.code === 'PERMISSION_DENIED';
    const wrongVersion = await writer({
      ...req('settings.get', { key: 'language.current' }),
      version: 999,
    });
    results.version_rejected = wrongVersion.error.code === 'API_VERSION_UNSUPPORTED';
    const invalid = await writer(
      req('settings.set', { values: { 'language.current': 'de', invalid: NaN } }),
    );
    results.invalid_batch_rejected = invalid.error.code === 'INVALID_VALUE';
    results.batch_left_unchanged =
      (await reader(req('settings.get', { key: 'language.current' }))).result.value === 'fr';
    results.unknown_method_rejected =
      (await writer(req('os.execute', { command: 'anything' }))).error.code ===
      'METHOD_NOT_SUPPORTED';
    results.missing_value_explicit =
      (await reader(req('settings.get', { key: 'missing.test.key' }))).result.found === false;
  }
} catch (e) {
  results.failure = String(e);
} finally {
  if (storage) storage.close();
}
window.testResults = results;
document.getElementById('result').textContent = JSON.stringify(results, null, 2);
