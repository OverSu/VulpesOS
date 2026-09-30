import { setInterval } from 'resource://gre/modules/Timer.sys.mjs';
import {Input} from 'resource://vulpes/host/Input.sys.mjs';
import { ScreenPower } from 'resource://vulpes/services/screen-power.mjs';
import { SettingsService } from 'resource://vulpes/services/settings.mjs';
import { DataStoreService } from 'resource://vulpes/services/datastores.mjs';
import { DataStoresIndexedDB } from 'resource://vulpes/adapters/datastores-indexeddb.mjs';
import { Views } from 'resource://vulpes/host/Views.sys.mjs';
import { Connections } from 'resource://vulpes/host/Connections.sys.mjs';
import { Contacts } from 'resource://vulpes/host/Contacts.sys.mjs';
import { Messages } from 'resource://vulpes/host/Messages.sys.mjs';
import { Alarms } from 'resource://vulpes/host/Alarms.sys.mjs';
import { Platform } from 'resource://vulpes/host/Platform.sys.mjs';
import { Media } from 'resource://vulpes/host/Media.sys.mjs';
import { tundraCallAudio, tundraHardware, tundraRadio } from 'resource://vulpes/host/Tundra.sys.mjs';
Cu.importGlobalProperties(['indexedDB']);

// This is the only privileged owner of application identity and settings data.
// Application messages are never allowed to supply their own permissions.
export const Runtime = {
  apps: [],
  actors: new Set(),
  windows: new Map(),
  power: {
    screenEnabled: true,
    screenBrightness: 1,
    keyLightEnabled: false,
    cpuSleepAllowed: true,
  },
  wakeLocks: new Map(),
  idleListeners: new Map(),
  cleanup(actor) {
    this.input?.cleanup(actor);
    this.platform?.nativeCamera.cleanup(actor);
    this.connections?.cleanup(actor);
    this.alarms?.cleanup(actor);
    Views.cleanup(actor);
    this.actors.delete(actor);
    this.wakeLocks.delete(actor);
    const idle = Cc['@mozilla.org/widget/useridleservice;1'].getService(Ci.nsIUserIdleService);
    for (const { observer, time } of this.idleListeners.get(actor)?.values() || [])
      idle.removeIdleObserver(observer, time);
    this.idleListeners.delete(actor);
  },
  async init() {
    this.input = new Input(this);
    const root = Services.env.get('VULPES_WORKSPACE_ROOT');
    this.apps = await IOUtils.readJSON(PathUtils.join(root, 'assets', 'registry.json'));
    // Installed Gaia audio apps must be able to ring when an alarm fires. This
    // permission is scoped to their origins in this profile, never web pages.
    for (const app of this.apps)
      if (Object.keys(app.manifest.permissions || {}).some((p) => p.startsWith('audio-channel-'))) {
        const principal = Services.scriptSecurityManager.createContentPrincipal(
          Services.io.newURI(app.origin),
          {},
        );
        Services.perms.addFromPrincipal(
          principal,
          'autoplay-media',
          Ci.nsIPermissionManager.ALLOW_ACTION,
        );
      }
    const defaults = await IOUtils.readJSON(
      PathUtils.join(root, 'assets', 'settings-current-defaults.json'),
    );
    const build = await IOUtils.readJSON(PathUtils.join(root, 'assets', 'build-info.json'));
    this.release = build.release;
    const path = PathUtils.join(PathUtils.profileDir, 'vulpes-settings-v1.json');
    const saved = (await IOUtils.exists(path)) ? await IOUtils.readJSON(path) : {};
    this.values = {
      ...defaults,
      'ftu.manifestURL': '',
      'lockscreen.enabled': true,
      'screen.timeout': 0,
      'language.current': 'fr',
      ...saved,
      'software-button.enabled': false, // The desktop shell already provides Home.
      'deviceinfo.os': this.release.gaia,
      'deviceinfo.previous_os': '2.7',
      'deviceinfo.software': 'Vulpes OS ' + this.release.version,
      'deviceinfo.product_model': 'Project Vulpes desktop',
      'deviceinfo.product_device': 'desktop',
      'deviceinfo.product_manufacturer': 'Project Vulpes',
      'deviceinfo.hardware': Services.appinfo.OS,
      'deviceinfo.firmware_revision': 'Desktop — sans firmware téléphone',
      'deviceinfo.build_number': build.revision.slice(0, 12) + (build.dirty ? '+local' : ''),
      'deviceinfo.platform_version': Services.appinfo.platformVersion,
      'deviceinfo.platform_build_id': Services.appinfo.platformBuildID,
    };
    if (!saved['vulpes.gaia-restoration.v1']) {
      this.values['lockscreen.enabled'] = true;
      this.values['vulpes.gaia-restoration.v1'] = true;
    }
    Services.prefs.setStringPref('intl.accept_languages', this.values['language.current']);
    this.writeQueue = Promise.resolve();
    this.settings = new SettingsService({
      get: async (key) => this.values[key],
      setMany: (entries) => {
        const write = this.writeQueue.then(async () => {
          const values = { ...this.values, ...Object.fromEntries(entries) };
          await IOUtils.writeJSON(path, values, { tmpPath: path + '.tmp' });
          this.values = values;
          if (entries.some(([key]) => key === 'language.current'))
            Services.prefs.setStringPref('intl.accept_languages', values['language.current']);
          if (Services.env.get('VULPES_TUNDRA') === '1') {
            const volume = entries.find(([key, value]) => /^audio\.volume\.(content|notification|alarm|telephony|bt_sco)$/.test(key) && Number.isFinite(value));
            if (volume) {
              const maximum = /\.(telephony|bt_sco)$/.test(volume[0]) ? 5 : 15;
              const level = Math.max(0,Math.min(1,volume[1]/maximum));
              const control = maximum === 5 ? tundraCallAudio({operation:'set',volume:level}) : tundraHardware({operation:'volume',level});
              await control.catch(error => console.error(error.message));
            }
          }
          for (const [key, value] of entries) this.broadcast('settingchange', { key, value });
        });
        this.writeQueue = write.catch(() => {});
        return write;
      },
    });
    const storage = new DataStoresIndexedDB(indexedDB, IDBKeyRange, () =>
      Services.uuid.generateUUID().toString(),
    );
    this.connections = new Connections(
      (actor) => this.identity(actor),
      (actor, type, data) => actor.sendAsyncMessage('Vulpes:Event', { type, data }),
    );
    this.contacts = new Contacts(storage, (data) => this.broadcast('contactchange', data));
    await this.contacts.init();
    this.messages = new Messages(
      storage,
      Services.env.get('VULPES_TUNDRA_RADIO') === '1'
        ? ({ number, body }) => tundraRadio('sms', { number, body })
        : null,
      (type, message) => this.broadcast('sms-' + type, message, 'sms'),
      path => tundraRadio('messageState', {path}),
    );
    this.media = new Media((data) => this.broadcast('mediachange', data));
    this.platform = new Platform(this);
    await this.platform.init();
    if (Services.env.get('VULPES_TUNDRA') === '1') {
      Object.assign(this.values, {
        'deviceinfo.product_model': 'Google Pixel 3a',
        'deviceinfo.product_device': 'sargo',
        'deviceinfo.product_manufacturer': 'Google',
        'deviceinfo.hardware': 'Tundra / Sargo',
        'deviceinfo.firmware_revision': 'Android 9 / API 28 (vendor)',
      });
    }
    const alarmPath = PathUtils.join(PathUtils.profileDir, 'vulpes-alarms-v1.json');
    this.alarms = new Alarms(
      (actor) => this.identity(actor),
      (id) => {
        const app = this.apps.find((a) => a.id === id);
        if (!app) return;
        const path = app.manifest.messages?.find((m) => m.alarm)?.alarm;
        if (!path) return;
        this.broadcast(
          'launch',
          {
            manifestURL: app.manifestURL,
            origin: app.origin,
            url: app.origin + path,
            timestamp: Date.now(),
          },
          'system',
        );
      },
      {
        load: async () => ((await IOUtils.exists(alarmPath)) ? IOUtils.readJSON(alarmPath) : null),
        save: (state) => IOUtils.writeJSON(alarmPath, state, { tmpPath: alarmPath + '.tmp' }),
      },
      setInterval,
    );
    await this.alarms.init();
    this.dataStores = new DataStoreService(this.apps, storage, (data) =>
      this.broadcast('datastorechange', data),
    );
  },
  identity(actor) {
    const origin = actor.manager.documentPrincipal.originNoSuffix;
    const top = actor.browsingContext.top.embedderElement;
    if (
      !top ||
      top.id !== 'system' ||
      top.ownerDocument.documentURI !== 'chrome://vulpes/content/shell.xhtml'
    )
      return null;
    return this.apps.find((app) => app.origin === origin) || null;
  },
  grants(app) {
    const access = app.manifest.permissions?.settings?.access || '';
    return [
      access.includes('read') && 'settings.read',
      access.includes('write') && 'settings.write',
    ].filter(Boolean);
  },
  async request(actor, request) {
    const app = this.identity(actor);
    if (!app) return { error: { code: 'PERMISSION_DENIED' } };
    if (!request || request.version !== 1 || !Number.isSafeInteger(request.id) || request.id < 0) {
      return { error: { code: 'INVALID_REQUEST' } };
    }
    this.actors.add(actor);
    const { method, params } = request;
    if (typeof method !== 'string') return { error: { code: 'INVALID_REQUEST' } };
    if(method==='hardware.vibrate') {
      if(app.id!=='system' || Services.env.get('VULPES_TUNDRA')!=='1') return {error:{code:'NOT_SUPPORTED'}};
      const pattern=params?.pattern;
      if(!Array.isArray(pattern) || pattern.length>32 || pattern.some(n=>!Number.isInteger(n) || n<0 || n>10000) || pattern.reduce((a,b)=>a+b,0)>10000)
        return {error:{code:'INVALID_VALUE'}};
      try {await tundraHardware({operation:'vibrate',pattern});return {result:true};}
      catch(error) {return {error:{code:error.message}};}
    }
    if(method==='input.request') {
      try {return {result:await this.input.request(actor,params)};}
      catch(error) {return {error:{code:error.message}};}
    }
    if (method.startsWith('platform.')) {
      try {
        return { result: await this.platform.request(actor, app, method.slice(9), params || {}) };
      } catch (error) {
        return { error: { code: error.message || 'PLATFORM_ERROR' } };
      }
    }
    if (method?.startsWith('iac.')) {
      try {
        if (method === 'iac.subscribe') {
          this.connections.subscribe(actor);
          return { result: null };
        }
        if (method === 'iac.connect')
          return { result: this.connections.connect(actor, params.keyword, this.apps) };
        if (method === 'iac.send') return { result: this.connections.send(actor, params) };
        if (method === 'iac.close') {
          this.connections.close(actor, params.id);
          return { result: null };
        }
      } catch (error) {
        return { error: { code: error.message } };
      }
    }
    if (method === 'contacts.request') {
      try {
        return { result: await this.contacts.request(app, params) };
      } catch (error) {
        return { error: { code: error.message || 'CONTACTS_ERROR' } };
      }
    }
    if (method === 'alarms.request') {
      try {
        return { result: await this.alarms.request(actor, app, params) };
      } catch (error) {
        return { error: { code: error.message || 'ALARMS_ERROR' } };
      }
    }
    if (method === 'media.request') {
      try {
        return { result: await this.media.request(app, params) };
      } catch (error) {
        return { error: { code: error.message || 'MEDIA_ERROR' } };
      }
    }
    if (method === 'messages.request') {
      try {
        return { result: await this.messages.request(app, params) };
      } catch (error) {
        return { error: { code: error.message || 'MESSAGES_ERROR' } };
      }
    }
    if (typeof method !== 'string') return { error: { code: 'INVALID_REQUEST' } };
    if (method === 'activities.start') {
      if (params?.name === 'record' && params.data?.type === 'photos') {
        // Gallery's Photo button opens the shared Gaia UI; it expects no result file.
        if (app.id === 'gallery') {
          const camera = this.apps.find((a) => a.id === 'camera');
          if (!camera) return { error: { code: 'ACTIVITY_NOT_SUPPORTED' } };
          this.broadcast(
            'launch',
            {
              manifestURL: camera.manifestURL,
              origin: camera.origin,
              url: camera.origin + (camera.manifest.launch_path || '/index.html'),
              timestamp: Date.now(),
            },
            'system',
          );
          return { result: null };
        }
        try {
          return { result: await this.platform.capture(actor, app) };
        } catch (error) {
          return { error: { code: error.message } };
        }
      }
      if (params?.name !== 'view' || params?.data?.type !== 'url')
        return { error: { code: 'ACTIVITY_NOT_SUPPORTED' } };
      let uri;
      try {
        uri = Services.io.newURI(params.data.url);
      } catch (_) {
        return { error: { code: 'INVALID_URL' } };
      }
      if (!['http', 'https'].includes(uri.scheme)) return { error: { code: 'URL_SCHEME_DENIED' } };
      this.broadcast(
        'activity-view',
        { source: { name: 'view', data: { type: 'url', url: uri.spec } } },
        'system',
      );
      return { result: null };
    }
    if (method === 'views.request') {
      if (!app.manifest.permissions?.browser && !app.manifest.permissions?.['embed-apps'])
        return { error: { code: 'PERMISSION_DENIED' } };
      try {
        return { result: await Views.request(actor, params) };
      } catch (error) {
        return { error: { code: error.message || 'VIEW_ERROR' } };
      }
    }
    if (method === 'settings.snapshot')
      return this.grants(app).includes('settings.read')
        ? { result: { ...this.values } }
        : { error: { code: 'PERMISSION_DENIED' } };
    if (method.startsWith('settings.'))
      return this.settings.bindSession(app.id, this.grants(app))(request);
    if (method === 'desktop.idle') {
      if (!app.manifest.permissions?.idle) return { error: { code: 'PERMISSION_DENIED' } };
      const { token, time, add } = params || {};
      if (
        typeof token !== 'string' ||
        token.length > 80 ||
        !Number.isInteger(time) ||
        time < 1 ||
        time > 3600 ||
        typeof add !== 'boolean'
      )
        return { error: { code: 'INVALID_VALUE' } };
      let listeners = this.idleListeners.get(actor);
      if (!listeners) {
        listeners = new Map();
        this.idleListeners.set(actor, listeners);
      }
      const idle = Cc['@mozilla.org/widget/useridleservice;1'].getService(Ci.nsIUserIdleService);
      const previous = listeners.get(token);
      if (previous) {
        idle.removeIdleObserver(previous.observer, previous.time);
        listeners.delete(token);
      }
      if (add) {
        if (listeners.size >= 16) return { error: { code: 'QUOTA_EXCEEDED' } };
        const observer = {
          observe(subject, topic) {
            actor.sendAsyncMessage('Vulpes:Event', {
              type: 'idle',
              data: { token, idle: topic === 'idle' },
            });
          },
        };
        idle.addIdleObserver(observer, time);
        listeners.set(token, { observer, time });
      }
      return { result: null };
    }
    if (method === 'desktop.homeScroll') {
      if (app.id !== 'homescreen' || typeof params?.bottom !== 'boolean')
        return { error: { code: 'PERMISSION_DENIED' } };
      actor.browsingContext.top.embedderElement.ownerDocument.defaultView.setHomeScrollBottom(
        params.bottom,
      );
      return { result: null };
    }
    if (method === 'desktop.navigation') {
      if (app.id !== 'system' || typeof params?.home !== 'boolean')
        return { error: { code: 'PERMISSION_DENIED' } };
      actor.browsingContext.top.embedderElement.ownerDocument.defaultView.setHomeSurface(
        params.home,
      );
      return { result: null };
    }
    if (method === 'desktop.screen') {
      if (!app.manifest.permissions?.power) return { error: { code: 'PERMISSION_DENIED' } };
      const { name, value } = params || {};
      if (
        !Object.hasOwn(this.power, name) ||
        (name === 'screenBrightness'
          ? !Number.isFinite(value) || value < 0 || value > 1
          : typeof value !== 'boolean')
      )
        return { error: { code: 'INVALID_VALUE' } };
      this.screenPower ||= new ScreenPower(this.power, async (next, changed) => {
        if (Services.env.get('VULPES_TUNDRA') === '1' && ['screenEnabled','screenBrightness'].includes(changed))
          await tundraHardware({operation:'screen', enabled:next.screenEnabled, level:next.screenBrightness});
      });
      await this.screenPower.set(name, value);
      const screen =
        actor.browsingContext.top.embedderElement.ownerDocument.getElementById('screen');
      screen.style.filter = Services.env.get('VULPES_TUNDRA') === '1' ? '' : `brightness(${this.power.screenEnabled ? this.power.screenBrightness : 0})`;
      screen.inert = !this.power.screenEnabled;
      return { result: { ...this.power } };
    }
    if (method === 'desktop.wakelock') {
      const { topic, token, acquire } = params || {};
      if (
        !['screen', 'cpu', 'high-priority'].includes(topic) ||
        typeof token !== 'string' ||
        token.length > 80 ||
        typeof acquire !== 'boolean'
      )
        return { error: { code: 'INVALID_VALUE' } };
      let locks = this.wakeLocks.get(actor);
      if (!locks) {
        locks = new Map();
        this.wakeLocks.set(actor, locks);
      }
      if (acquire) locks.set(token, topic);
      else locks.delete(token);
      this.broadcast(
        'wakelockchange',
        {
          topic,
          state: Array.from(this.wakeLocks.values()).some((map) =>
            Array.from(map.values()).includes(topic),
          )
            ? 'locked-foreground'
            : 'unlocked',
        },
        'system',
      );
      return { result: null };
    }
    if (method === 'datastores.list') return { result: this.dataStores.list(app, params?.name) };
    if (method === 'datastores.run') {
      try {
        return { result: await this.dataStores.run(app, params) };
      } catch (error) {
        return { error: { code: error.message || 'DATASTORE_ERROR' } };
      }
    }
    const manage =
      app.manifest.permissions?.['webapps-manage'] ||
      app.manifest.permissions?.['homescreen-webapps-manage'];
    if (method === 'apps.self') return { result: app };
    if (method === 'apps.list')
      return manage ? { result: this.apps } : { error: { code: 'PERMISSION_DENIED' } };
    if (method === 'apps.launch') {
      const target = this.apps.find((a) => a.manifestURL === params?.manifestURL);
      if (!target || (!manage && app.id !== target.id))
        return { error: { code: 'PERMISSION_DENIED' } };
      const path =
        target.manifest.entry_points?.[params?.entryPoint]?.launch_path ||
        target.manifest.launch_path ||
        '/index.html';
      this.broadcast(
        'launch',
        {
          manifestURL: target.manifestURL,
          origin: target.origin,
          url: target.origin + path,
          entryPoint: params?.entryPoint,
          timestamp: Date.now(),
        },
        'system',
      );
      return { result: null };
    }
    return { error: { code: 'METHOD_NOT_SUPPORTED' } };
  },
  broadcast(type, data, target) {
    for (const actor of this.actors) {
      try {
        const app = this.identity(actor);
        if (!app || (target && app.id !== target)) continue;
        if (type === 'settingchange' && !this.grants(app).includes('settings.read')) continue;
        if (
          type === 'mediachange' &&
          !app.manifest.permissions?.['device-storage:' + data.type]?.access?.includes('read')
        )
          continue;
        if (
          type === 'contactchange' &&
          !app.manifest.permissions?.contacts?.access?.includes('read')
        )
          continue;
        if (
          type === 'datastorechange' &&
          !this.dataStores.list(app, data.name).some((s) => s.owner === data.owner)
        )
          continue;
        actor.sendAsyncMessage('Vulpes:Event', { type, data });
      } catch (_) {
        this.actors.delete(actor);
      }
    }
  },
};
