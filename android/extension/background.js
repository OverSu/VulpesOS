import { authorizePlatform } from './services/platform.mjs';
import { SettingsService } from './services/settings.mjs';
import { DataStoreService } from './services/datastores.mjs';
import { DataStoresIndexedDB } from './adapters/datastores-indexeddb.mjs';
import { Contacts } from './Contacts.mjs';
import { Messages } from './Messages.mjs';
import { Connections } from './Connections.mjs';
import { Alarms } from './Alarms.mjs';
const peers = new Set();
let apps, values, settings, dataStores, contacts, messages, connections, alarms, storage;
const identity = (peer) => peer.app;
function notify(peer, type, data) {
  try {
    peer.port.postMessage({ event: { type, data } });
  } catch (_) {
    peers.delete(peer);
  }
}
function grants(app) {
  const access = app.manifest.permissions?.settings?.access || '';
  return [
    access.includes('read') && 'settings.read',
    access.includes('write') && 'settings.write',
  ].filter(Boolean);
}
function broadcast(type, data, target) {
  for (const peer of peers) {
    if (target && peer.app.id !== target) continue;
    if (type === 'settingchange' && !grants(peer.app).includes('settings.read')) continue;
    if (
      type === 'contactchange' &&
      !peer.app.manifest.permissions?.contacts?.access?.includes('read')
    )
      continue;
    if (
      type === 'datastorechange' &&
      !dataStores.list(peer.app, data.name).some((s) => s.owner === data.owner)
    )
      continue;
    if (
      type === 'mediachange' &&
      !peer.app.manifest.permissions?.['device-storage:' + data.type]?.access?.includes('read')
    )
      continue;
    notify(peer, type, data);
  }
}
function launch(target, entryPoint, path) {
  path ||=
    target.manifest.entry_points?.[entryPoint]?.launch_path ||
    target.manifest.launch_path ||
    '/index.html';
  const url = new URL(path, target.origin);
  if (url.origin !== target.origin) throw Error('INVALID_URL');
  broadcast(
    'launch',
    {
      manifestURL: target.manifestURL,
      origin: target.origin,
      url: url.href,
      entryPoint,
      timestamp: Date.now(),
    },
    'system',
  );
}
const ready = (async () => {
  apps = await (await fetch('registry.json')).json();
  const defaults = await (await fetch('defaults.json')).json();
  const saved = await browser.storage.local.get('settings');
  values = { ...defaults, ...saved.settings };
  if (!values['vulpes.gaia-restoration.v1']) {
    values['lockscreen.enabled'] = true;
    values['vulpes.gaia-restoration.v1'] = true;
    await browser.storage.local.set({settings:values});
  }
  // Preview 1 serialized wallpaper Blobs as {}. Repair that one invalid value
  // on upgrade, retaining all other user settings and valid custom wallpapers.
  const wallpaper = values['wallpaper.image'];
  if (wallpaper && typeof wallpaper === 'object' && !Object.keys(wallpaper).length) {
    values['wallpaper.image'] = defaults['wallpaper.image'];
    values['wallpaper.image.valid'] = false;
    await browser.storage.local.set({ settings: values });
  }
  let writes = Promise.resolve();
  settings = new SettingsService(
    {
      get: async (key) => values[key],
      setMany(entries) {
        const write = writes.then(async () => {
          const next = { ...values, ...Object.fromEntries(entries) };
          await browser.storage.local.set({ settings: next });
          values = next;
          for (const [key, value] of entries) broadcast('settingchange', { key, value });
        });
        writes = write.catch(() => {});
        return write;
      },
    },
    { maxBytes: 32 * 1024 * 1024 },
  ); // Allows the bounded base64 image envelope on high-DPI Android screens.
  storage = new DataStoresIndexedDB(indexedDB, IDBKeyRange, () => crypto.randomUUID());
  contacts = new Contacts(storage, (data) => broadcast('contactchange', data));
  await contacts.init();
  messages = new Messages(storage);
  dataStores = new DataStoreService(apps, storage, (data) => broadcast('datastorechange', data));
  connections = new Connections(identity, notify);
  alarms = new Alarms(
    identity,
    (id) => {
      const app = apps.find((a) => a.id === id);
      if (app) launch(app, undefined, app.manifest.messages?.find((m) => m.alarm)?.alarm);
    },
    {
      load: async () => (await browser.storage.local.get('alarms')).alarms,
      save: (state) => browser.storage.local.set({ alarms: state }),
    },
    (callback, delay) => setInterval(callback, delay),
  );
  await alarms.init();
  console.info('VULPES Android services ready');
})();
// Java owns this port. Web pages have no access to native messaging.
let native;
let systemReady = false;
let pendingNotification;
function deliverNotification() {
  if (!systemReady || !pendingNotification) return;
  const data = pendingNotification;
  pendingNotification = null;
  const target = apps.find((a) => a.id === data.owner);
  if (target) {
    launch(target);
    broadcast('notification-click', data, target.id);
  }
}
function connectNative() {
  native = browser.runtime.connectNative('vulpes');
  native.onDisconnect.addListener(() => setTimeout(connectNative, 1000));
  native.onMessage.addListener(async (message) => {
    await ready;
    if (['home', 'holdhome'].includes(message.type)) broadcast(message.type, {}, 'system');
    if (message.type === 'android-resume') await refreshAndroid().catch(console.warn);
    if (message.type === 'notification-click') {
      pendingNotification = message.data;
      deliverNotification();
    }
  });
}
connectNative();
async function android(type, params = {}) {
  const reply = await browser.runtime.sendNativeMessage('vulpes', {
    type: 'android.' + type,
    params,
  });
  const result = typeof reply === 'string' ? JSON.parse(reply).result : reply;
  if (result?.error) throw Error(result.error);
  return result;
}
async function refreshAndroid() {
  const snapshot = await android('snapshot');
  for (const [key, value] of Object.entries(snapshot)) {
    if (values[key] === value) continue;
    values[key] = value;
    broadcast('settingchange', { key, value });
  }
  return snapshot;
}
ready.then(refreshAndroid).catch(console.warn);
async function handle(peer, request) {
  const app = peer.app;
  if (
    !request ||
    request.version !== 1 ||
    !Number.isSafeInteger(request.id) ||
    request.id < 0 ||
    typeof request.method !== 'string'
  )
    throw Error('INVALID_REQUEST');
  const { params = {} } = request;
  let method = request.method;
  if (method.startsWith('platform.')) {
    authorizePlatform(app, method.slice(9), params);
    method = 'android.' + method.slice(9);
  }
  if (method === 'android.capabilities') {
    const release = await (await fetch('release.json')).json();
    const device = app.id === 'settings' ? await android('snapshot') : {};
    return {
      platform: 'android',
      platformName: device['deviceinfo.firmware_revision'] || 'Android',
      model: device['deviceinfo.product_model'],
      adapter: { version: release.adapters?.android, device: 'android' },
      version: release.version,
      gaia: release.gaia,
      gecko: release.androidEngine,
      camera: true,
      media: true,
      contacts: true,
      notifications: true,
      dial: true,
      sms: true,
      alarms: true,
    };
  }
  if (method === 'android.systemReady') {
    if (app.id !== 'system') throw Error('PERMISSION_DENIED');
    systemReady = true;
    deliverNotification();
    return null;
  }
  if (method === 'android.notification') {
    if (!app.manifest.permissions?.['desktop-notification']) throw Error('PERMISSION_DENIED');
    if (JSON.stringify(params).length > 65536) throw Error('QuotaExceededError');
    return android('notification', { ...params, owner: app.id });
  }
  if (method === 'android.settings' || method === 'android.snapshot') {
    if (!['settings', 'system', 'costcontrol'].includes(app.id)) throw Error('PERMISSION_DENIED');
    return method === 'android.snapshot' ? refreshAndroid() : android('settings', params);
  }
  if (method === 'android.capture') {
    if (app.id !== 'camera') throw Error('PERMISSION_DENIED');
    const names = await android('capture');
    for (const path of names)
      broadcast('mediachange', { type: 'pictures', path, reason: 'modified' });
    return names;
  }
  if (method === 'android.pick') {
    const access = app.manifest.permissions?.['device-storage:' + params.type]?.access || '';
    if (!access.includes('write')) throw Error('PERMISSION_DENIED');
    const names = await android('pick', params);
    for (const path of names)
      broadcast('mediachange', { type: params.type, path, reason: 'modified' });
    return names;
  }
  if (method === 'android.alarms') {
    if (app.id !== 'clock') throw Error('PERMISSION_DENIED');
    return android('alarms');
  }
  if (method === 'android.contact') {
    if (!app.manifest.permissions?.contacts?.access?.includes('write'))
      throw Error('PERMISSION_DENIED');
    const contact = await android('contact');
    return contacts.request(app, { operation: 'save', contact });
  }
  if (method === 'android.sms') {
    if (app.id !== 'sms') throw Error('PERMISSION_DENIED');
    return android('sms', params);
  }
  if (method === 'android.dial') {
    if (app.id !== 'communications') throw Error('PERMISSION_DENIED');
    return android('dial', params);
  }
  if (method === 'settings.set' && params.values && typeof params.values === 'object') {
    const validation = await new SettingsService(
      { setMany: async () => {} },
      { maxBytes: 32 * 1024 * 1024 },
    ).bindSession(
      app.id,
      grants(app),
    )(request);
    if (validation.error) throw Error(validation.error.code);
    for (const [key, value] of Object.entries(params.values)) {
      if (app.id === 'settings' && ['screen.brightness', 'audio.volume.content'].includes(key))
        await android('set', { key, value });
      const panel = {
        'wifi.enabled': 'wifi',
        'bluetooth.enabled': 'bluetooth',
        'airplaneMode.enabled': 'airplane-mode',
        'geolocation.enabled': 'geolocation',
        'ril.data.enabled': 'data',
      }[key];
      if (panel) {
        // UI clicks open the native panel. Gaia startup writes must not open Android activities.
        // Android controls these values; never persist a fictitious toggle state.
        delete params.values[key];
      }
    }
    if (!Object.keys(params.values).length) return null;
  }
  if (method === 'settings.snapshot') {
    if (!grants(app).includes('settings.read')) throw Error('PERMISSION_DENIED');
    return { ...values };
  }
  if (method.startsWith('settings.')) {
    const reply = await settings.bindSession(app.id, grants(app))(request);
    if (reply.error) throw Error(reply.error.code);
    return reply.result;
  }
  if (method === 'apps.self') {
    console.info('VULPES app ready', app.id);
    return app;
  }
  const manage =
    app.manifest.permissions?.['webapps-manage'] ||
    app.manifest.permissions?.['homescreen-webapps-manage'];
  if (method === 'apps.list') {
    if (!manage) throw Error('PERMISSION_DENIED');
    return apps;
  }
  if (method === 'apps.launch') {
    const target = apps.find((a) => a.manifestURL === params.manifestURL);
    if (!target || (!manage && app.id !== target.id)) throw Error('PERMISSION_DENIED');
    launch(target, params.entryPoint);
    return null;
  }
  if (method === 'datastores.list') return dataStores.list(app, params.name);
  if (method === 'datastores.run') return dataStores.run(app, params);
  if (method === 'contacts.request') return contacts.request(app, params);
  if (method === 'messages.request') return messages.request(app, params);
  if (method === 'alarms.request') return alarms.request(peer, app, params);
  if (method === 'iac.subscribe') {
    connections.subscribe(peer);
    return null;
  }
  if (method === 'iac.connect') return connections.connect(peer, params.keyword, apps);
  if (method === 'iac.send') return connections.send(peer, params);
  if (method === 'iac.close') {
    connections.close(peer, params.id);
    return null;
  }
  if (method === 'activities.start') {
    if (params.name === 'record' && params.data?.type === 'photos') {
      if (app.id === 'gallery') {
        const camera = apps.find((a) => a.id === 'camera');
        if (!camera) throw Error('ACTIVITY_NOT_SUPPORTED');
        launch(camera);
        return null;
      }
      if (!app.manifest.permissions?.['device-storage:pictures']?.access?.includes('write'))
        throw Error('PERMISSION_DENIED');
      const names = await android('capture');
      for (const path of names)
        broadcast('mediachange', { type: 'pictures', path, reason: 'modified' });
      return { filenames: names };
    }
    if (params.name !== 'view' || params.data?.type !== 'url')
      throw Error('ACTIVITY_NOT_SUPPORTED');
    return openWeb(params.data.url);
  }
  if (method === 'views.request') {
    if (!app.manifest.permissions?.browser && !app.manifest.permissions?.['embed-apps'])
      throw Error('PERMISSION_DENIED');
    if (params.operation === 'open') {
      await openWeb(params.url);
      notify(peer, 'view', {
        contextId: params.contextId,
        type: 'loadend',
        detail: { backgroundColor: 'white' },
      });
      return null;
    }
    if (['geometry', 'cancelTouch', 'close'].includes(params.operation)) return null;
    if (['canGoBack', 'canGoForward'].includes(params.operation)) return false;
    throw Error('NotSupportedError');
  }
  if (method === 'desktop.idle') {
    if (!app.manifest.permissions?.idle) throw Error('PERMISSION_DENIED');
    return null;
  }
  if (method === 'desktop.homeScroll') {
    if (app.id !== 'homescreen' || typeof params?.bottom !== 'boolean') throw Error('PERMISSION_DENIED');
    return browser.runtime.sendNativeMessage('vulpes', { type: 'homeScroll', bottom: params.bottom });
  }
  if (method === 'desktop.navigation') {
    if (app.id !== 'system' || typeof params?.home !== 'boolean') throw Error('PERMISSION_DENIED');
    return browser.runtime.sendNativeMessage('vulpes', { type: 'navigation', home: params.home });
  }
  if (method === 'desktop.screen') {
    if (!app.manifest.permissions?.power) throw Error('PERMISSION_DENIED');
    return null;
  }
  if (method === 'desktop.wakelock') return null; // Android Activity owns the visible screen.
  if (method === 'media.request') return media(app, params);
  throw Error('METHOD_NOT_SUPPORTED');
}
async function openWeb(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname.endsWith('.localhost'))
    throw Error('URL_SCHEME_DENIED');
  return browser.runtime.sendNativeMessage('vulpes', { type: 'open', url: parsed.href });
}
async function media(app, p) {
  const access = app.manifest.permissions?.['device-storage:' + p.type]?.access || '';
  if (
    !['pictures', 'videos', 'music'].includes(p.type) ||
    !access.includes(['add', 'delete'].includes(p.operation) ? 'write' : 'read')
  )
    throw Error('PERMISSION_DENIED');
  const result = await android('media', p);
  if (['add', 'delete'].includes(p.operation))
    broadcast('mediachange', {
      type: p.type,
      path: result,
      reason: p.operation === 'add' ? 'modified' : 'deleted',
    });
  return result;
}
browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'gaia') return;
  let peer;
  const attached = ready.then(() => {
    const url = new URL(port.sender.url);
    const app = apps.find((a) => a.origin === url.origin);
    if (!app) throw Error('PERMISSION_DENIED');
    peer = {
      port,
      app,
      manager: { documentURI: { spec: url.href } },
      sendAsyncMessage: (_, event) => notify(peer, event.type, event.data),
    };
    peers.add(peer);
  });
  port.onMessage.addListener(async (message) => {
    let reply;
    try {
      await attached;
      reply = { result: await handle(peer, message.request) };
    } catch (e) {
      reply = { error: { code: e.message || 'HOST_ERROR' } };
      console.warn('VULPES RPC', message.request?.method, e.message);
    }
    try {
      port.postMessage({ id: message.id, reply });
    } catch (_) {}
  });
  port.onDisconnect.addListener(() => {
    attached
      .then(() => {
        peers.delete(peer);
        if (peer.app.id === 'system' && ![...peers].some((p) => p.app.id === 'system'))
          systemReady = false;
        connections.cleanup(peer);
        alarms.cleanup(peer);
      })
      .catch(() => {});
  });
});
