import { authorizePlatform } from 'resource://vulpes/services/platform.mjs';
import {
  tundraCapabilities,
  tundraCallAudio,
  tundraHardware,
  tundraRadio,
  tundraSnapshot,
  tundraWifi,
} from 'resource://vulpes/host/Tundra.sys.mjs';
import {Notifications, notificationLaunch} from 'resource://vulpes/services/notifications.mjs';
import {CallJournal} from 'resource://vulpes/services/call-journal.mjs';
import {NativeCamera} from 'resource://vulpes/host/NativeCamera.sys.mjs';
import {setTimeout} from 'resource://gre/modules/Timer.sys.mjs';
Cu.importGlobalProperties(['File']);

// Fixed desktop commands only: app requests cannot supply executable paths or arguments.
const PANELS = {
  root: ['kcm_about-distro', ''],
  wifi: ['kcm_networkmanagement', 'wifi'],
  bluetooth: ['kcm_bluetooth', 'bluetooth'],
  data: ['kcm_networkmanagement', 'network'],
  'airplane-mode': ['kcm_networkmanagement', 'network'],
  geolocation: ['kcm_regionandlang', 'privacy'],
  sound: ['kcm_pulseaudio', 'sound'],
  dateTime: ['kcm_clock', 'datetime'],
  screenLock: ['kcm_screenlocker', 'privacy'],
  battery: ['kcm_powerdevilprofilesconfig', 'power'],
  storage: ['kcm_about-distro', 'info-overview'],
  apps: ['kcm_componentchooser', 'applications'],
  notifications: ['kcm_notifications', 'notifications'],
};
function file(path) {
  const f = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
  f.initWithPath(path);
  return f;
}
function installed(path) {
  return file(path).exists();
}
export class Platform {
  constructor(runtime) {
    this.runtime = runtime;
    this.notifications = new Map();
    this.nextId = 1;
    this.cameraWindow = null;
    this.nativeCamera = new NativeCamera();
    this.picking = false;
  }
  async init() {
    this.radioQueue = Promise.resolve();
    this.notificationPath = PathUtils.join(PathUtils.profileDir,'vulpes-notifications.json');
    let notifications = [];
    try { notifications = await IOUtils.readJSON(this.notificationPath); } catch (_) {}
    this.gaiaNotifications = new Notifications(notifications);
    this.notificationQueue = Promise.resolve();
    this.journalPath = PathUtils.join(PathUtils.profileDir, 'vulpes-call-journal.json');
    let state = {};
    try { state = await IOUtils.readJSON(this.journalPath); } catch (_) {}
    this.journal = new CallJournal(state);
    // oFono paths are reusable across boots. Do not merge an old interrupted
    // session with a new call carrying the same object path.
    this.journal.update([]);
    if (Services.env.get('VULPES_TUNDRA_RADIO') === '1') {
      const poll = async () => {
        try { await this.radio('calls'); } catch (_) {}
        setTimeout(poll, 500);
      };
      poll();
      const inbox = async()=>{
        try { await this.runtime.messages.refreshOutgoing(); }
        catch(error) {console.error('SMS outgoing:',error.message);}
        try {
          const rows=await tundraRadio('incomingMessages');
          const app=this.runtime.apps.find(a=>a.id==='sms');
          for (const row of rows) {
            const message=await this.runtime.messages.receive(row);
            await this.gaiaNotification(app,{operation:'show',title:message.sender,
              body:message.body,tag:'sms-'+message.id,data:{threadId:message.threadId}});
            this.runtime.broadcast('sms-received',message,'sms');
            await tundraRadio('ackMessages',{ids:[row.receipt]});
          }
        } catch(error) {console.error('SMS inbox:',error.message);}
        setTimeout(inbox,2000);
      };
      inbox();
    }
  }
  radio(operation, params = {}) {
    const work = this.radioQueue.then(async () => {
      if (operation === 'callHistory') return this.journal.completed.slice();
      const before = JSON.stringify(this.journal.snapshot());
      if (operation === 'ackCallHistory') this.journal.acknowledge(params.ids);
      else {
        const result = await tundraRadio(operation, params);
        if (operation === 'dial') this.journal.start({path:result.path,number:params.number,state:'dialing'}, Date.now(), 'outgoing');
        if (operation === 'calls') {
          const previous = new Set(this.journal.completed.map(c=>c.id));
          this.journal.update(result); this.lastCalls = result; this.lastCallsAt = Date.now();
          for (const call of this.journal.completed) if (!previous.has(call.id) && call.direction==='incoming' && call.connectedAt===null) {
            const app = this.runtime.apps.find(a=>a.id==='communications');
            if (app) await this.gaiaNotification(app,{operation:'show',
              title:String(this.runtime.values['language.current']).startsWith('fr')?'Appel manqué':'Missed call',
              body:call.number,tag:'missed-call-'+call.id,data:{callId:call.id}});
          }
        }
        if (JSON.stringify(this.journal.snapshot()) !== before) await IOUtils.writeJSON(this.journalPath, this.journal.snapshot(), {tmpPath:this.journalPath+'.tmp', permissions:0o600});
        return result;
      }
      await IOUtils.writeJSON(this.journalPath, this.journal.snapshot(), {tmpPath:this.journalPath+'.tmp', permissions:0o600});
      return null;
    });
    this.radioQueue = work.catch(() => {});
    return work;
  }
  window(actor) {
    return actor.browsingContext.top.embedderElement.ownerDocument.defaultView;
  }
  async mediaPermission(browser, request) {
    const find = (context) => {
      if (context.currentWindowGlobal?.outerWindowId === request.windowID)
        return context.currentWindowGlobal;
      for (const child of context.children) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    const global = find(browser.browsingContext);
    if (!global) return;
    const actor = global.getActor('WebRTC');
    const deny = () =>
      actor.sendAsyncMessage('webrtc:Deny', { callID: request.callID, windowID: request.windowID });
    const app = this.runtime.apps.find((a) => a.id === 'camera');
    if (
      global.documentPrincipal.origin !== app?.origin ||
      !request.secure ||
      request.sharingScreen ||
      request.sharingAudio ||
      request.audioInputDevices?.length ||
      !request.videoInputDevices?.length
    ) {
      deny();
      return;
    }
    const principal = global.documentPrincipal;
    let permission = Services.perms.testExactPermissionFromPrincipal(principal, 'camera');
    if (permission === Ci.nsIPermissionManager.UNKNOWN_ACTION) {
      const allowed = Services.prompt.confirm(
        browser.ownerDocument.defaultView,
        'Vulpes — Photo',
        'Autoriser Photo à utiliser la webcam ? / Allow Camera to use your webcam?',
      );
      permission = allowed
        ? Ci.nsIPermissionManager.ALLOW_ACTION
        : Ci.nsIPermissionManager.DENY_ACTION;
      Services.perms.addFromPrincipal(principal, 'camera', permission);
    }
    if (permission !== Ci.nsIPermissionManager.ALLOW_ACTION) {
      deny();
      return;
    }
    if (!(await actor.checkOSPermission(true, false, false))) {
      deny();
      return;
    }
    // Gecko consumes this one-shot grant when allocating the real device.
    // Use its top-level principal, as Firefox's WebRTC permission handler does.
    const topPrincipal = browser.browsingContext.currentWindowGlobal.documentPrincipal;
    Services.perms.addFromPrincipal(
      topPrincipal,
      'MediaManagerVideo',
      Ci.nsIPermissionManager.ALLOW_ACTION,
      Ci.nsIPermissionManager.EXPIRE_SESSION,
    );
    const device = request.videoInputDevices[0];
    actor.activateDevicePerm(request.windowID, device.mediaSource, device.rawId);
    actor.sendAsyncMessage('webrtc:Allow', {
      callID: request.callID,
      windowID: request.windowID,
      devices: [request.videoInputDevices[0].deviceIndex],
    });
  }
  async request(actor, app, operation, params) {
    authorizePlatform(app, operation, params);
    if (operation === 'notificationEvent') return this.gaiaNotificationEvent(params);
    if (operation === 'callScreenClosed') {
      this.runtime.broadcast('callscreen-closed', {}, 'system');
      return null;
    }
    if (Services.env.get('VULPES_TUNDRA') === '1') {
      if (operation === 'capabilities') return tundraCapabilities(this.runtime.release);
      if (operation === 'cameraPreview') return this.nativeCamera.request(actor, params);
      if (operation === 'snapshot') return tundraSnapshot();
      if (operation === 'power') return tundraHardware({operation:'power', action:params.action});
      if (operation === 'wifi') return tundraWifi(params);
      if (['callHistory','ackCallHistory'].includes(operation)) return this.radio(operation, params);
      if (operation === 'dial') return this.radio('dial', params);
      if (operation === 'hangup') return tundraRadio('hangup', params);
      if (operation === 'calls') return Date.now() - this.lastCallsAt < 1500 ? this.lastCalls : this.radio('calls');
      if (operation === 'answer') return tundraRadio('answer', params);
      if (operation === 'callAudio') return tundraCallAudio(params);
      if (operation === 'sms') return tundraRadio('sms', params);
      if (operation === 'notification') return this.gaiaNotification(app,params);
      if (['settings', 'capture', 'alarms', 'notification'].includes(operation))
        throw Error('NOT_SUPPORTED');
    }
    if (operation === 'capabilities')
      return {
        platform: 'desktop',
        platformName: Services.appinfo.OS,
        adapter: { version: this.runtime.release.adapters?.desktop, device: 'desktop' },
        version: this.runtime.release.version,
        gaia: this.runtime.release.gaia,
        gecko: Services.appinfo.platformVersion,
        camera: true,
        media: true,
        contacts: true,
        notifications: true,
        dial: false,
        sms: false,
        alarms: installed('/usr/bin/gnome-clocks'),
      };
    if (operation === 'systemReady') return null;
    if (operation === 'settings') return this.settings(params.panel);
    if (operation === 'snapshot')
      return {
        'deviceinfo.platform_version': Services.appinfo.platformVersion,
        'deviceinfo.software': 'Vulpes OS ' + this.runtime.release.version,
      };
    if (operation === 'notification') return this.notification(actor, app, params);
    if (operation === 'pick') return this.pick(actor, app, params.type);
    if (operation === 'capture') return this.capture(actor, app);
    if (operation === 'contact') return this.contact(actor, app);
    if (operation === 'alarms') return this.execute('/usr/bin/gnome-clocks', []);
    throw Error('NOT_SUPPORTED');
  }
  execute(path, args) {
    if (!installed(path)) throw Error('PANEL_UNAVAILABLE');
    const process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
    process.init(file(path));
    process.runwAsync(args, args.length);
    return null;
  }
  settings(panel) {
    if (!Object.hasOwn(PANELS, panel)) throw Error('PANEL_UNAVAILABLE');
    // No generic Linux location switch exists; do not open an unrelated control.
    if (panel === 'geolocation') throw Error('NOT_SUPPORTED');
    if (installed('/usr/bin/systemsettings'))
      return this.execute('/usr/bin/systemsettings', panel === 'root' ? [] : [PANELS[panel][0]]);
    if (installed('/usr/bin/gnome-control-center'))
      return this.execute(
        '/usr/bin/gnome-control-center',
        panel === 'root' ? [] : [PANELS[panel][1]],
      );
    throw Error('PANEL_UNAVAILABLE');
  }
  async select(actor, kind, multiple = false) {
    if (this.picking) throw Error('PICKER_BUSY');
    this.picking = true;
    try {
      const picker = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
      picker.init(
        this.window(actor).browsingContext,
        'Vulpes — Import',
        multiple ? Ci.nsIFilePicker.modeOpenMultiple : Ci.nsIFilePicker.modeOpen,
      );
      const filter = {
        pictures: Ci.nsIFilePicker.filterImages,
        music: Ci.nsIFilePicker.filterAudio,
        videos: Ci.nsIFilePicker.filterVideo,
      }[kind];
      if (filter) picker.appendFilters(filter);
      else picker.appendFilter('vCard', '*.vcf');
      if ((await new Promise((resolve) => picker.open(resolve))) !== Ci.nsIFilePicker.returnOK)
        throw Error('AbortError');
      return multiple
        ? Array.from(picker.files, (entry) => entry.QueryInterface(Ci.nsIFile))
        : [picker.file];
    } finally {
      this.picking = false;
    }
  }
  async pick(actor, app, type) {
    const files = await this.select(actor, type, true);
    const names = [];
    for (const item of files) {
      if (item.fileSize > 32 * 1024 * 1024) throw Error('MEDIA_TOO_LARGE_32_MIB');
      const blob = await File.createFromFileName(item.path);
      const name =
        Services.uuid.generateUUID().toString().replace(/[{}]/g, '') + '/' + item.leafName;
      names.push(await this.runtime.media.request(app, { operation: 'add', type, name, blob }));
    }
    return names;
  }
  async contact(actor, app) {
    const [item] = await this.select(actor, 'contact');
    if (item.fileSize > 1024 * 1024) throw Error('QuotaExceededError');
    const raw = await IOUtils.readUTF8(item.path);
    const lines = raw.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const decode = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
    const value = { name: [], tel: [], email: [] };
    let inside = false;
    for (const line of lines) {
      if (line.toUpperCase() === 'BEGIN:VCARD') {
        inside = true;
        continue;
      }
      if (line.toUpperCase() === 'END:VCARD') break;
      if (!inside) continue;
      const i = line.indexOf(':');
      if (i < 0) continue;
      const key = line.slice(0, i).split(';')[0].toUpperCase(),
        v = decode(line.slice(i + 1));
      if (key === 'FN') value.name = [v];
      if (key === 'TEL') value.tel.push({ value: v.replace(/^tel:/, ''), type: ['other'] });
      if (key === 'EMAIL') value.email.push({ value: v, type: ['other'] });
    }
    if (!value.name.length && !value.tel.length && !value.email.length)
      throw Error('InvalidModificationError');
    return this.runtime.contacts.request(app, { operation: 'save', contact: value });
  }
  async capture(actor, app) {
    if (!app.manifest.permissions?.['device-storage:pictures']?.access?.includes('write'))
      throw Error('PERMISSION_DENIED');
    if (this.cameraWindow && !this.cameraWindow.closed) {
      this.cameraWindow.focus();
      throw Error('PICKER_BUSY');
    }
    return new Promise((resolve, reject) => {
      const options = {
        finish: async (blob) => {
          try {
            const name = 'Photo-' + Date.now() + '.jpg';
            const path = await this.runtime.media.request(app, {
              type: 'pictures',
              operation: 'add',
              name,
              blob,
            });
            resolve([path]);
          } catch (e) {
            reject(e);
            throw e;
          }
        },
        cancel: () => reject(Error('AbortError')),
      };
      this.cameraWindow = this.window(actor).openDialog(
        'chrome://vulpes/content/camera.xhtml',
        'vulpes-camera',
        'chrome,dialog=no,resizable,width=660,height=600',
        options,
      );
    });
  }
  saveNotifications() {
    const rows = this.gaiaNotifications.list();
    const work = this.notificationQueue.then(()=>IOUtils.writeJSON(this.notificationPath,rows,
      {tmpPath:this.notificationPath+'.tmp',permissions:0o600}));
    this.notificationQueue = work.catch(()=>{});
    return work;
  }
  async gaiaNotification(app, p) {
    const principal = Services.scriptSecurityManager.createContentPrincipal(Services.io.newURI(app.origin),{});
    const denied = Services.perms.testExactPermissionFromPrincipal(principal,'desktop-notification') === Ci.nsIPermissionManager.DENY_ACTION;
    // Bundled certified Gaia apps retain their install-time manifest permission.
    const permission = !denied && app.manifest.type === 'certified' ? 'granted' : 'denied';
    if (['query','permission'].includes(p.operation)) return permission;
    if (p.operation === 'list') return this.gaiaNotifications.list(app.id);
    if (p.operation === 'close') {
      const row = this.gaiaNotifications.remove(p.id,app.id);
      await this.saveNotifications();
      this.runtime.broadcast('gaia-notification',{type:'desktop-notification-close',id:row.id},'system');
      return null;
    }
    if (p.operation !== 'show') throw Error('METHOD_NOT_SUPPORTED');
    if (permission !== 'granted') throw Error('NOTIFICATIONS_DENIED');
    const row = this.gaiaNotifications.show(app,p);
    await this.saveNotifications();
    this.runtime.broadcast('gaia-notification',row,'system');
    return row.id;
  }
  async gaiaNotificationEvent(p) {
    if (p.type === 'resend') return this.gaiaNotifications.list();
    if (!['desktop-notification-click','desktop-notification-close','desktop-notification-show'].includes(p.type)) throw Error('INVALID_VALUE');
    const row = this.gaiaNotifications.rows.get(String(p.id));
    if (!row) return null;
    if (p.type === 'desktop-notification-show') return null;
    if (p.type === 'desktop-notification-click') {
      const app = this.runtime.apps.find(app=>app.id===row.owner);
      if (app) {
        this.runtime.broadcast('launch',{...notificationLaunch(app),timestamp:Date.now()},'system');
        this.runtime.broadcast('notification-click',row,app.id);
      }
    } else this.runtime.broadcast('notification-close',row,row.owner);
    this.gaiaNotifications.remove(row.id);
    await this.saveNotifications();
    this.runtime.broadcast('gaia-notification',{type:'desktop-notification-close',id:row.id},'system');
    return null;
  }
  notification(actor, app, p) {
    const principal = Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI(app.origin),
      {},
    );
    const permission = () => {
      const value = Services.perms.testExactPermissionFromPrincipal(
        principal,
        'desktop-notification',
      );
      return value === Ci.nsIPermissionManager.ALLOW_ACTION
        ? 'granted'
        : value === Ci.nsIPermissionManager.DENY_ACTION
          ? 'denied'
          : 'default';
    };
    if (p.operation === 'query') return permission();
    if (p.operation === 'permission') {
      if (permission() === 'granted') return 'granted';
      const allowed = Services.prompt.confirm(
        this.window(actor),
        'Vulpes OS',
        `Autoriser les notifications de ${app.manifest.name || app.id} ? / Allow notifications?`,
      );
      Services.perms.addFromPrincipal(
        principal,
        'desktop-notification',
        allowed ? Ci.nsIPermissionManager.ALLOW_ACTION : Ci.nsIPermissionManager.DENY_ACTION,
      );
      return allowed ? 'granted' : 'denied';
    }
    if (p.operation === 'list')
      return [...this.notifications.values()].filter((n) => n.owner === app.id);
    const alerts = Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService);
    if (p.operation === 'close') {
      const n = this.notifications.get(p.id);
      if (!n || n.owner !== app.id) throw Error('PERMISSION_DENIED');
      alerts.closeAlert('vulpes-' + n.id);
      this.notifications.delete(n.id);
      return null;
    }
    if (p.operation !== 'show') throw Error('METHOD_NOT_SUPPORTED');
    if (permission() !== 'granted') throw Error('NOTIFICATIONS_DENIED');
    const old =
      p.tag && [...this.notifications.values()].find((n) => n.owner === app.id && n.tag === p.tag);
    const id = old?.id || this.nextId++;
    const data = { ...p, owner: app.id, id };
    const alert = Cc['@mozilla.org/alert-notification;1'].createInstance(Ci.nsIAlertNotification);
    alert.init(
      'vulpes-' + id,
      '',
      p.title || 'Vulpes OS',
      p.body || '',
      true,
      String(id),
      'auto',
      '',
      '',
      principal,
      false,
      false,
      false,
      [],
    );
    const hostWindow = this.window(actor);
    const observer = {
      observe: (_, topic) => {
        if (topic === 'alertclickcallback') {
          if (hostWindow.closed) return;
          hostWindow.focus();
          this.runtime.broadcast(
            'launch',
            {
              manifestURL: app.manifestURL,
              origin: app.origin,
              url: app.origin + (app.manifest.launch_path || '/index.html'),
              timestamp: Date.now(),
            },
            'system',
          );
          this.runtime.broadcast('notification-click', data, app.id);
        }
        if (topic === 'alertfinished' && this.notifications.get(id) === data)
          this.notifications.delete(id);
      },
    };
    this.notifications.set(id, data);
    try {
      alerts.showAlert(alert, observer);
    } catch (error) {
      this.notifications.delete(id);
      throw error;
    }
    return id;
  }
}
