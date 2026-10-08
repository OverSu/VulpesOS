// Gaia compatibility API. The host checks permissions for each request.
(() => {
  'use strict';
  let sequence = 0;
  window.__vulpesDiagnostics = [];
  function record(kind, values) {
    window.__vulpesDiagnostics.push({
      kind,
      message: values.map((v) => String(v) + (v?.stack ? '\n' + v.stack : '')).join(' '),
    });
    if (window.__vulpesDiagnostics.length > 100) window.__vulpesDiagnostics.shift();
  }
  for (const kind of ['error', 'warn']) {
    const original = console[kind].bind(console);
    console[kind] = (...values) => {
      record(kind, values);
      original(...values);
    };
  }
  addEventListener('unhandledrejection', (event) => record('rejection', [event.reason]));
  addEventListener('error', (event) =>
    record('error', [event.message, event.filename, event.lineno]),
  );
  // Binary settings use the same persistence format on every host.
  const battery = Object.assign(new EventTarget(), {level:NaN, charging:false, chargingTime:Infinity, dischargingTime:Infinity});
  Object.defineProperty(navigator, 'battery', {value:battery});
  async function refreshBattery() {
    try {
      const state = await call('platform.snapshot', {});
      const next = state.battery;
      if (next && Number.isFinite(next.level) && next.level >= 0 && next.level <= 1) {
        const oldLevel = battery.level, oldCharging = battery.charging;
        battery.level = next.level; battery.charging = !!next.charging;
        if (oldLevel !== battery.level) battery.dispatchEvent(new Event('levelchange'));
        if (oldCharging !== battery.charging) battery.dispatchEvent(new Event('chargingchange'));
      }
    } catch (_) { /* An unknown battery is not an empty battery. */ }
  }
  if (['system.localhost', 'settings.localhost', 'camera.localhost'].includes(location.hostname)) {
    addEventListener('DOMContentLoaded', () => { refreshBattery(); setInterval(refreshBattery, 5000); }, {once:true});
  }

  if (['system','communications','callscreen'].includes(location.hostname.split('.')[0]) && window.VulpesNativeTelephony) {
    // Callscreen only needs the SIM count and CDMA classification here. SIM
    // provisioning and registration remain unavailable until their own API exists.
    if (location.hostname === 'callscreen.localhost') {
      window.close = () => call('platform.callScreenClosed',{}).catch(console.error);
      Object.defineProperty(navigator,'mozIccManager',{value:Object.assign(new EventTarget(),{iccIds:[],getIccById:()=>null})});
      Object.defineProperty(navigator,'mozMobileConnections',{value:[{voice:{type:null}}]});
    }
    const telephony = Object.assign(new EventTarget(), {calls:[]});
    const audioState = {muted:false,speaker:false};
    let audioQueue = Promise.resolve();
    for (const [property,key] of [['muted','muted'],['speakerEnabled','speaker']]) {
      Object.defineProperty(telephony,property,{
        get:()=>audioState[key],
        set:value=>{
          const desired = !!value, previous=audioState[key];
          if(desired===previous) return;
          audioState[key]=desired;
          audioQueue = audioQueue.then(()=>call('platform.callAudio',{operation:'set',[key]:desired}))
            .then(state=>Object.assign(audioState,state))
            .catch(error=>{audioState[key]=previous;console.error('Call audio:',error);window.VulpesGaiaUI?.notice(error.message);});
        }
      });
    }
    const unsupported = () => Promise.reject(new DOMException('Not available on this adapter', 'NotSupportedError'));
    telephony.conferenceGroup = Object.assign(new EventTarget(), {calls:[], state:'', add:unsupported, remove:unsupported, hangUp:unsupported});
    telephony.ready = Promise.resolve();
    telephony.dial = number => call('platform.dial',{number});
    telephony.dialEmergency = unsupported;
    telephony.sendTones = unsupported;
    telephony.startTone = unsupported;
    telephony.stopTone = () => {};
    Object.defineProperty(telephony,'active',{get:()=>telephony.calls.find(c=>['connected','dialing','alerting'].includes(c.state)) || null});
    Object.defineProperty(navigator,'mozTelephony',{value:telephony});
    let stopped = false;
    addEventListener('pagehide',()=>{stopped=true;},{once:true});
    const emit = (target,type,extra={}) => {
      const event = Object.assign(new Event(type),extra);
      target.dispatchEvent(event);
      try { target['on'+type]?.(event); } catch (error) { console.error('Telephony event:',error); }
    };
    async function refreshCalls() {
      try {
        const current = await call('platform.calls',{});
        if (location.hostname === 'callscreen.localhost') Object.assign(audioState,await call('platform.callAudio',{operation:'status'}));
        const live = current.filter(c=>c.state!=='disconnected');
        const old = telephony.calls;
        let changed = false;
        const changes = [];
        telephony.calls = live.map(item=>{
          let c = old.find(c=>c.path===item.path);
          const state = ({active:'connected',waiting:'incoming'})[item.state] || item.state;
          if (!c) {
            changed = true;
            c = Object.assign(new EventTarget(),{path:item.path,id:{number:item.number}, serviceId:0,
              state, emergency:false, group:null, switchable:false, mergeable:false,
              answer:()=>call('platform.answer',{path:item.path}), hangUp:()=>call('platform.hangup',{path:item.path}),
              hold:unsupported,resume:unsupported});
          } else if (c.state !== state) { c.state=state;changes.push(c); }
          return c;
        });
        for (const c of old) if (!telephony.calls.includes(c)) {c.state='disconnected';changes.push(c);changed=true;}
        for (const c of changes) {emit(c,'statechange',{call:c});emit(c,c.state,{call:c});}
        if (changed) {
          if (location.hostname === 'system.localhost' && live.some(c => ['incoming','waiting'].includes(c.state))) window.Service?.request('turnScreenOn');
          emit(telephony,'callschanged');
        }
      } catch (_) { /* Keep live calls on transport failure. */ }
      if (!stopped) setTimeout(refreshCalls, 500);
    }
    addEventListener('load', refreshCalls, {once:true});
    if (location.hostname === 'callscreen.localhost') addEventListener('load',()=>{
      // Keep Gaia's controls, but do not advertise unimplemented audio/conference operations.
      const disable = () => {
        for (const id of ['on-hold','merge','keypad-visibility','place-new-call']) {
          const node = document.getElementById(id);
          if (node && !node.disabled) node.disabled=true;
        }
      };
      new MutationObserver(disable).observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled']});
      disable();
    },{once:true});
  }

  // Legacy contact lookup needs formatting normalization, not an inferred country code.
  Object.defineProperty(navigator, 'mozPhoneNumberService', {value:{
    normalize: number => String(number || '').normalize('NFKC').replace(/[^0-9+*#]/g, '')
  }});
  const settingsCodec = window.VulpesSettingsCodec;
  async function call(method, params) {
    if (!navigator.vulpesRequest) return Promise.reject(new Error('VULPES_HOST_UNAVAILABLE'));
    if (settingsCodec && (method === 'settings.set' ||
        (window.VulpesPlatform === 'android' && ['media.request', 'activities.finish', 'contacts.request'].includes(method))))
      params = await settingsCodec.encode(params);
    return navigator.vulpesRequest({ version: 1, id: ++sequence, method, params }).then((reply) => {
      if (reply.error) throw new DOMException(reply.error.code, reply.error.code);
      return settingsCodec &&
        ['settings.get', 'settings.snapshot', 'media.request', 'activities.start', 'contacts.request'].includes(method)
        ? settingsCodec.decode(reply.result)
        : reply.result;
    });
  }
  function request(promise) {
    const r = new EventTarget();
    r.result = null;
    r.error = null;
    r.readyState = 'pending';
    r.then = promise.then.bind(promise);
    promise.then(
      (value) => {
        r.result = value;
        finish('success');
      },
      (error) => {
        r.error = error;
        finish('error');
      },
    );
    function finish(type) {
      r.readyState = 'done';
      const event = new Event(type);
      r.dispatchEvent(event);
      r['on' + type]?.call(r, { type, target: r });
    }
    return r;
  }
  let language = navigator.language;
  function setLanguage(value) {
    if (typeof value !== 'string' || !/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(value)) return;
    const changed = language !== value;
    language = value;
    if (changed) dispatchEvent(new Event('languagechange'));
  }
  Object.defineProperty(navigator, 'language', {get:() => language});
  Object.defineProperty(navigator, 'languages', {get:() => Object.freeze([language])});
  call('locale.current').then(setLanguage).catch(() => {});
  const observers = new Map();
  const settings = new EventTarget();
  settings.createLock = () => ({
    get: (key) =>
      request(
        key === '*'
          ? call('settings.snapshot', {})
          : call('settings.get', { key }).then((value) => ({ [key]: value.value })),
      ),
    set: (values) => {
      // Legacy passcode fields are byte sequences. Keep v1 JSON transport and
      // preserve each byte; Gaia accepts numeric arrays when reading them.
      const encoded = { ...values };
      for (const key of [
        'lockscreen.passcode-lock.digest.salt',
        'lockscreen.passcode-lock.digest.value',
      ]) {
        if (encoded[key] instanceof Uint8Array) encoded[key] = Array.from(encoded[key]);
      }
      return request(call('settings.set', { values: encoded }).then(() => null));
    },
  });
  settings.addObserver = (key, fn) => {
    if (!observers.has(key)) observers.set(key, new Set());
    observers.get(key).add(fn);
  };
  settings.removeObserver = (key, fn) => observers.get(key)?.delete(fn);
  Object.defineProperty(navigator, 'mozSettings', { value: settings });
  addEventListener('vulpes-service-event', (event) => {
    const { type, data } = event.detail;
    if (type === 'settingchange') {
      if (data.key === 'language.current') setLanguage(data.value);
      const change = {
        settingName: data.key,
        settingValue: settingsCodec ? settingsCodec.decode(data.value) : data.value,
      };
      observers.get(data.key)?.forEach((fn) => fn(change));
      settings.onsettingchange?.(change);
    }
    if (type === 'callscreen-closed') document.querySelector('iframe[name="call_screen"]')?.dispatchEvent(new CustomEvent('mozbrowserclose',{bubbles:true}));
    if (type === 'hardware-key') dispatchEvent(new CustomEvent('softwareButtonEvent', {detail:data}));
    if (type === 'activity-launch') dispatchEvent(new CustomEvent('open-app', {detail:{...data,showApp:true,onlyShowApp:false}}));
    if (type === 'launch') dispatchEvent(new CustomEvent('webapps-launch', { detail: data }));
    if (type === 'screen-off') {
      dispatchEvent(new CustomEvent('secure-killapps'));
      window.Service?.request('lock').catch(console.error);
    }
    if (type === 'screen-on') window.ScreenManager?.turnScreenOn(true);
    if (type === 'home' || type === 'holdhome') {
      call('activities.cancel', {}).catch(console.error);
      dispatchEvent(new CustomEvent(type));
    }
    if (type === 'activity-view') dispatchEvent(new CustomEvent('activity-view', { detail: data }));
  });
  function application(record) {
    // DOMApplication never exposed the registry's internal id. Gaia uses `id`
    // to distinguish a bookmark from an installed application.
    const { id, ...publicRecord } = record;
    const app = Object.assign(new EventTarget(), publicRecord, {
      installState: 'installed',
      removable: record.removable === true,
      installTime: 0,
      updateTime: 0,
      downloadAvailable: false,
      downloading: false,
      readyToApplyDownload: false,
    });
    app.launch = (entryPoint) =>
      request(call('apps.launch', { manifestURL: app.manifestURL, entryPoint }));
    app.getLocalizedValue = (property, language, entry) => {
      const manifest = app.manifest.entry_points?.[entry] || app.manifest;
      const locales = manifest.locales || {};
      const locale = locales[language] || locales[language?.split('-')[0]] || {};
      const value = locale[property] ?? manifest[property];
      return value === undefined
        ? Promise.reject(new Error('NoSuchProperty'))
        : Promise.resolve(value);
    };
    app.connect = (keyword) => window.VulpesCompat.connect(keyword);
    return app;
  }
  const mgmt = new EventTarget();
  mgmt.getAll = () => request(call('apps.list').then((apps) => apps.map(application)));
  mgmt.uninstall = app => request(call('apps.uninstall',{id:new URL(app.origin).hostname.split('.')[0]}));
  addEventListener('vulpes-service-event',event=>{
    const {type,data}=event.detail;
    if(!['apps-installed','apps-uninstalled'].includes(type))return;
    const name=type==='apps-installed'?'install':'uninstall';
    const change=new Event(name);Object.defineProperty(change,'application',{value:application(data)});
    mgmt.dispatchEvent(change);if(typeof mgmt['on'+name]==='function')mgmt['on'+name](change);
  });
  mgmt.getNotInstalled = () => request(Promise.resolve([]));
  mgmt.getIcon = async (app, size, entry) => {
    const manifest = app.manifest.entry_points?.[entry] || app.manifest;
    const sizes = Object.keys(manifest.icons || {})
      .map(Number)
      .sort((a, b) => a - b);
    const chosen = sizes.find((s) => s >= size) || sizes.at(-1);
    if (!chosen) throw new Error('NO_ICON');
    const response = await fetch(new URL(manifest.icons[chosen], app.origin));
    if (!response.ok) throw new Error('ICON_LOAD_ERROR');
    return response.blob();
  };
  Object.defineProperty(navigator, 'mozApps', {
    value: {
      mgmt,
      getSelf: () => request(call('apps.self').then(application)),
      getInstalled: () => request(call('apps.self').then((app) => [application(app)])),
      getAdditionalLanguages: () => Promise.resolve({}),
    },
  });
  const dataStores = new Map();
  navigator.getDataStores = (name) =>
    call('datastores.list', { name }).then((list) =>
      list.map((info) => {
        const key = info.name + '\n' + info.owner;
        if (dataStores.has(key)) return dataStores.get(key);
        const store = Object.assign(new EventTarget(), info);
        const run = (operation, args) => call('datastores.run', { ...info, operation, args });
        store.get = (...ids) => run('get', ids);
        store.put = (value, id) => run('put', [value, id]);
        store.add = (value, id) => run('add', [value, id]);
        store.remove = (id) => run('remove', [id]);
        store.clear = () => run('clear', []);
        store.getLength = () => run('length', []);
        store.sync = () => {
          let queue,
            closed = false;
          const snapshot = run('snapshot', []).then((result) => {
            store.revisionId = result.revisionId;
            queue = [{ operation: 'clear', revisionId: result.revisionId }].concat(
              result.entries.map((entry) => ({
                operation: 'add',
                id: entry.id,
                data: entry.data,
                revisionId: result.revisionId,
              })),
              [{ operation: 'done', revisionId: result.revisionId }],
            );
          });
          return {
            next: () =>
              snapshot.then(() =>
                !closed && queue.length
                  ? queue.shift()
                  : { operation: 'done', revisionId: store.revisionId },
              ),
            close: () => {
              closed = true;
            },
          };
        };
        dataStores.set(key, store);
        return store;
      }),
    );
  addEventListener('vulpes-service-event', (event) => {
    if (event.detail.type !== 'datastorechange') return;
    const data = event.detail.data,
      store = dataStores.get(data.name + '\n' + data.owner);
    if (!store) return;
    store.revisionId = data.revisionId;
    const change = new Event('change');
    for (const name of ['id', 'operation', 'revisionId'])
      Object.defineProperty(change, name, { value: data[name] });
    store.dispatchEvent(change);
    store.onchange?.(change);
  });
  // Capability absence is explicit; do not invent modem or hardware state.
  const handlers = new Map();
  navigator.mozSetMessageHandler = (name, fn) => {
    handlers.set(name, fn);
    if (name === 'activity') call('activities.subscribe', {}).catch(console.error);
    if (name === 'connection') call('iac.subscribe', {}).catch(console.error);
    if (name === 'alarm') call('alarms.request', { operation: 'subscribe' }).catch(console.error);
  };
  addEventListener('vulpes-service-event', ({detail}) => {
    if (detail.type !== 'activity') return;
    const {id,source} = detail.data;
    setTimeout(() => handlers.get('activity')?.({source,
      postResult: result => call('activities.finish',{id,result}).catch(console.error),
      postError: error => call('activities.finish',{id,error:String(error)}).catch(console.error)
    }),0);
  });
  navigator.mozHasPendingMessage = name => name === 'activity' && (new URLSearchParams(location.search).has('activity') || /\/(pick|share)\.html$/.test(location.pathname));
  navigator.mozSetMessageHandlerPromise = (promise) => promise;
  window.VulpesCompat = { call, request, handlers };
  window.MozActivity = function (source) {
    return request(call('activities.start', source));
  };
  const idleObservers = new Map();
  navigator.addIdleObserver = (observer) => {
    if (idleObservers.has(observer)) return;
    const token = crypto.randomUUID();
    idleObservers.set(observer, token);
    call('desktop.idle', { token, time: observer.time, add: true }).catch((error) => {
      idleObservers.delete(observer);
      console.error(error);
    });
  };
  navigator.removeIdleObserver = (observer) => {
    const token = idleObservers.get(observer);
    if (!token) return;
    idleObservers.delete(observer);
    call('desktop.idle', { token, time: observer.time, add: false }).catch(console.error);
  };
  addEventListener('vulpes-service-event', (event) => {
    if (event.detail.type !== 'idle') return;
    for (const [observer, token] of idleObservers) {
      if (token === event.detail.data.token)
        observer[event.detail.data.idle ? 'onidle' : 'onactive']?.();
    }
  });
  navigator.requestWakeLock = (topic) => {
    const token = crypto.randomUUID();
    let unlocked = false;
    const acquired = call('desktop.wakelock', { topic, token, acquire: true });
    return {
      topic,
      unlock() {
        if (unlocked) throw new DOMException('Lock already released', 'InvalidStateError');
        unlocked = true;
        acquired
          .then(() => call('desktop.wakelock', { topic, token, acquire: false }))
          .catch(console.error);
      },
    };
  };
  if (location.hostname === 'system.localhost') {
    // Virtual screen of the desktop host, not the physical monitor's power API.
    const listeners = new Set(),
      locks = new Map();
    const power = {
      powerOff: () => call('platform.power', {action:'poweroff'}).catch(console.error),
      reboot: () => call('platform.power', {action:'reboot'}).catch(console.error),
      addWakeLockListener: (fn) => listeners.add(fn),
      removeWakeLockListener: (fn) => listeners.delete(fn),
      getWakeLockState: (topic) => locks.get(topic) || 'unlocked',
    };
    for (const [name, initial] of Object.entries({
      screenEnabled: true,
      screenBrightness: 1,
      keyLightEnabled: false,
      cpuSleepAllowed: true,
    })) {
      let value = initial;
      Object.defineProperty(power, name, {
        get: () => value,
        set(next) {
          if (name === 'screenBrightness') {
            next = Number(next);
            if (!Number.isFinite(next) || next < 0 || next > 1) return;
          }
          value = next;
          call('desktop.screen', { name, value: next }).catch(console.error);
        },
      });
    }
    Object.defineProperty(navigator, 'mozPower', { value: power });
    addEventListener('vulpes-service-event', (event) => {
      if (event.detail.type !== 'wakelockchange') return;
      const { topic, state } = event.detail.data;
      locks.set(topic, state);
      for (const listener of listeners) listener.callback(topic, state);
    });
  }
  window.addEventListener(
    'load',
    () =>
      dispatchEvent(
        new CustomEvent('mozChromeEvent', { detail: { type: 'webapps-registry-ready' } }),
      ),
    { once: true },
  );

  // App frames remain ordinary cross-origin, sandboxed browsing contexts.
  // History, captures and external sites use the narrowly scoped native adapter.
  const frames = new WeakSet();
  const webViews = new Map();
  const nativeSource = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  async function viewCall(frame, params) {
    const reply = await navigator.vulpesFrameRequest(frame, params);
    if (reply.error) throw new Error(reply.error.code);
    return reply.result;
  }
  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    get() {
      return webViews.get(this)?.url || nativeSource.get.call(this);
    },
    set(value) {
      const url = new URL(value, location.href);
      const external =
        ['http:', 'https:'].includes(url.protocol) &&
        !(url.hostname.endsWith('.localhost') && url.port === location.port);
      if (this.hasAttribute('mozbrowser') && external) {
        const entry = webViews.get(this) || { opened: false, busy: false };
        entry.url = url.href;
        entry.dirty = true;
        webViews.set(this, entry);
        if (!entry.opened) nativeSource.set.call(this, 'about:blank');
      } else nativeSource.set.call(this, value);
    },
  });
  setInterval(() => {
    for (const [frame, entry] of webViews) {
      if (entry.opened && !frame.isConnected) {
        webViews.delete(frame);
        continue;
      }
      if (!frame.isConnected || entry.busy) continue;
      entry.busy = true;
      (async () => {
        if (entry.dirty) {
          await viewCall(frame, { operation: 'open', url: entry.url });
          entry.dirty = false;
          entry.opened = true;
        }
        await viewCall(frame, { operation: 'geometry' });
      })()
        .catch((error) => {
          if (!entry.failed) console.error('External view:', error);
          entry.failed = true;
        })
        .finally(() => {
          entry.busy = false;
        });
    }
  }, 120);
  addEventListener('vulpes-service-event', (event) => {
    if (event.detail.type !== 'view') return;
    const data = event.detail.data;
    // The child adapter attaches the originating frame itself, not a caller's id.
    const frame = navigator.vulpesFrameForContext(data.contextId);
    if (!frame || !webViews.has(frame)) return;
    if (data.type === 'locationchange') webViews.get(frame).url = data.detail.url;
    frame.dispatchEvent(
      new CustomEvent('mozbrowser' + data.type, { bubbles: true, detail: data.detail }),
    );
  });
  function wire(frame) {
    if (frames.has(frame)) return;
    frames.add(frame);
    // Set delegation before navigation; a MutationObserver runs too late on Android.
    if (location.hostname === 'system.localhost')
      frame.setAttribute('allow', 'camera http://camera.localhost:' + location.port);
    frame.addEventListener('load', () => {
      if (!frame.hasAttribute('mozbrowser')) return;
      if (webViews.has(frame)) return;
      frame.dispatchEvent(
        new CustomEvent('mozbrowserloadend', { bubbles: true, detail: { background: false } }),
      );
      frame.dispatchEvent(new CustomEvent('mozbrowserfirstpaint', { bubbles: true }));
      frame.dispatchEvent(new CustomEvent('mozbrowserdocumentfirstpaint', { bubbles: true }));
      frame.dispatchEvent(
        new CustomEvent('mozbrowservisibilitychange', {
          bubbles: true,
          detail: { visible: !frame.hidden },
        }),
      );
    });
  }
  const iframe = HTMLIFrameElement.prototype;
  function forwardInput(frame, input) {
    const target=new URL(frame.src,location.href);
    if(location.hostname!=='system.localhost' || !/^http:\/\/[a-z0-9_-]+\.localhost:\d+$/.test(target.origin))
      throw new DOMException('Input forwarding is limited to Gaia applications','SecurityError');
    frame.contentWindow?.postMessage({type:'vulpes-forward-input',input},target.origin);
  }
  iframe.sendTouchEvent = function (type, ids=[], xs=[], ys=[], rx=[], ry=[], rotation=[], force=[]) {
    if(type==='touchcancel') {viewCall(this,{operation:'cancelTouch'}).catch(console.error);return;}
    if(!['touchstart','touchmove','touchend'].includes(type)) throw new TypeError('Invalid touch type');
    const rect=this.getBoundingClientRect();
    forwardInput(this,{type,points:ids.slice(0,10).map((id,i)=>({id,x:xs[i]-rect.x,y:ys[i]-rect.y,
      rx:rx[i],ry:ry[i],rotation:rotation[i],force:force[i]}))});
  };
  iframe.sendMouseEvent = function(type,x,y) {
    if(!['mousemove','mousedown','mouseup'].includes(type)) throw new TypeError('Invalid mouse type');
    const rect=this.getBoundingClientRect();forwardInput(this,{type,x:x-rect.x,y:y-rect.y});
  };
  // These are ordinary, untrusted DOM events. Forwarding never grants a user
  // activation or permission to an external Web page.
  const forwardedTouches=new Map();
  addEventListener('message',event=>{
    if(event.source!==parent || event.origin!=='http://system.localhost:'+location.port ||
       event.data?.type!=='vulpes-forward-input') return;
    const input=event.data.input;
    if(['mousemove','mousedown','mouseup'].includes(input?.type)) {
      if(!Number.isFinite(input.x)||!Number.isFinite(input.y)) return;
      const target=document.elementFromPoint(input.x,input.y);
      const props={bubbles:true,cancelable:true,clientX:input.x,clientY:input.y,button:0};
      target?.dispatchEvent(new MouseEvent(input.type,props));
      if(input.type==='mouseup') target?.dispatchEvent(new MouseEvent('click',props));
      return;
    }
    if(!['touchstart','touchmove','touchend'].includes(input?.type)||!Array.isArray(input.points)||input.points.length>10) return;
    const changed=[];
    for(const p of input.points) {
      if(![p.id,p.x,p.y].every(Number.isFinite)) return;
      const target=forwardedTouches.get(p.id)?.target || document.elementFromPoint(p.x,p.y);
      if(!target) continue;
      const touch=new Touch({identifier:p.id,target,clientX:p.x,clientY:p.y,pageX:p.x+scrollX,pageY:p.y+scrollY,
        radiusX:p.rx||1,radiusY:p.ry||1,rotationAngle:p.rotation||0,force:p.force||0});
      changed.push(touch);
      if(input.type==='touchend') forwardedTouches.delete(p.id);else forwardedTouches.set(p.id,touch);
    }
    const active=[...forwardedTouches.values()];
    for(const target of new Set(changed.map(t=>t.target))) target.dispatchEvent(new TouchEvent(input.type,{
      bubbles:true,cancelable:true,touches:active,targetTouches:active.filter(t=>t.target===target),
      changedTouches:changed.filter(t=>t.target===target)}));
  });
  iframe.setVisible = function (value) {
    this.hidden = !value;
    if (location.hostname === 'system.localhost' &&
        this.src.startsWith('http://camera.localhost:' + location.port + '/'))
      this.contentWindow?.postMessage(
        { type: 'vulpes-camera-visibility', visible: !!value },
        'http://camera.localhost:' + location.port,
      );
  };
  iframe.getVisible = function () {
    return request(Promise.resolve(!this.hidden));
  };
  iframe.setActive = function (value) {
    this.inert = !value;
  };
  iframe.getActive = function () {
    return !this.inert;
  };
  for (const [name, operation] of Object.entries({
    goBack: 'back',
    goForward: 'forward',
    reload: 'reload',
    stop: 'stop',
  })) {
    iframe[name] = function () {
      return viewCall(this, { operation }).catch(console.error);
    };
  }
  const paints = new WeakMap();
  iframe.addNextPaintListener = function (callback) {
    let callbacks = paints.get(this);
    if (!callbacks) {
      callbacks = new Map();
      paints.set(this, callbacks);
    }
    if (callbacks.has(callback)) return;
    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame((time) => {
        callbacks.delete(callback);
        callback(time);
      });
      callbacks.set(callback, second);
    });
    callbacks.set(callback, first);
  };
  iframe.removeNextPaintListener = function (callback) {
    const callbacks = paints.get(this);
    if (callbacks?.has(callback)) {
      cancelAnimationFrame(callbacks.get(callback));
      callbacks.delete(callback);
    }
  };
  for (const [name, operation] of Object.entries({
    getCanGoBack: 'canGoBack',
    getCanGoForward: 'canGoForward',
  })) {
    iframe[name] = function () {
      return request(viewCall(this, { operation }));
    };
  }
  iframe.getScreenshot = function () {
    return request(viewCall(this, { operation: 'capture' }));
  };
  for (const name of ['setInputMethodActive', 'getWebManifest']) {
    iframe[name] = function () {
      return request(
        Promise.reject(new DOMException(name + ' is not ported yet', 'NotSupportedError')),
      );
    };
  }

  // v0 custom-element lifecycle compatibility, implemented on v1. Kept in one
  // module so Gaia components can subsequently migrate individually.
  const nativeCreate = document.createElement.bind(document);
  const initialize = (element) => {
    if (!element.__vulpesCreated) {
      element.__vulpesCreated = true;
      element.createdCallback?.();
      if (element.attributeChangedCallback)
        new MutationObserver((records) => {
          for (const record of records) {
            const value = element.getAttribute(record.attributeName);
            if (record.oldValue !== value)
              element.attributeChangedCallback(record.attributeName, record.oldValue, value);
          }
        }).observe(element, { attributes: true, attributeOldValue: true });
    }
    return element;
  };
  const registered = new Set();
  document.registerElement = (name, options) => {
    if (options.extends)
      throw new DOMException(
        'Customized built-in requires component migration',
        'NotSupportedError',
      );
    const prototype = options.prototype;
    class GaiaElement extends HTMLElement {
      connectedCallback() {
        initialize(this);
        this.attachedCallback?.();
      }
      disconnectedCallback() {
        this.detachedCallback?.();
      }
    }
    Object.setPrototypeOf(GaiaElement.prototype, prototype);
    customElements.define(name, GaiaElement);
    registered.add(name);
    function LegacyGaiaElement() {
      return initialize(nativeCreate(name));
    }
    LegacyGaiaElement.prototype = GaiaElement.prototype;
    return LegacyGaiaElement;
  };
  document.createElement = function (name, options) {
    const element = nativeCreate(name, options);
    if (name.toLowerCase() === 'iframe') wire(element);
    return registered.has(name) ? initialize(element) : element;
  };
  // v0 created callbacks ran for detached fragments too. Gaia reads component
  // state immediately after parsing its templates, before attaching them.
  const innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    ...innerHTML,
    set(value) {
      innerHTML.set.call(this, value);
      for (const element of this.querySelectorAll('*')) {
        if (registered.has(element.localName)) initialize(element);
      }
    },
  });
  HTMLElement.prototype.createShadowRoot = function () {
    const host = this,
      root = this.attachShadow({ mode: 'open' });
    const nativeHTML = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'innerHTML');
    const distribute = () => {
      const points = Array.from(root.querySelectorAll('content'));
      let index = 0;
      for (const point of points) {
        if (!point.querySelector('slot')) {
          const slot = nativeCreate('slot');
          slot.name =
            !point.getAttribute('select') || point.getAttribute('select') === '*'
              ? ''
              : 'gaia-slot-' + index;
          point.style.display = 'contents';
          point.append(slot);
          point.getDistributedNodes = () => slot.assignedNodes();
        }
        index++;
      }
      for (const child of Object.getOwnPropertyDescriptor(Element.prototype, 'children').get.call(
        host,
      )) {
        const point = points.find(
          (p) => !p.getAttribute('select') || child.matches(p.getAttribute('select')),
        );
        if (point) child.slot = point.querySelector('slot').name;
      }
    };
    Object.defineProperty(root, 'innerHTML', {
      get() {
        return nativeHTML.get.call(root);
      },
      set(value) {
        nativeHTML.set.call(root, value);
        let index = 0;
        for (const point of root.querySelectorAll('content')) {
          const slot = nativeCreate('slot');
          slot.name =
            !point.getAttribute('select') || point.getAttribute('select') === '*'
              ? ''
              : 'gaia-slot-' + index;
          index++;
          point.style.display = 'contents';
          point.append(slot);
          point.getDistributedNodes = () => slot.assignedNodes();
        }
        distribute();
      },
    });
    root.appendChild = function (node) {
      const value = Node.prototype.appendChild.call(root, node);
      distribute();
      return value;
    };
    new MutationObserver(distribute).observe(host, { childList: true });
    new MutationObserver(distribute).observe(root, { childList: true, subtree: true });
    return root;
  };
  for (const name of [
    'slice',
    'forEach',
    'map',
    'filter',
    'indexOf',
    'some',
    'every',
    'reduce',
    'reduceRight',
  ]) {
    if (!Array[name]) Array[name] = (array, ...args) => Array.prototype[name].call(array, ...args);
  }
  if (!String.prototype.contains) String.prototype.contains = String.prototype.includes;
  window.addEventListener('error', (event) =>
    console.error('VULPES GAIA', event.message, event.filename, event.lineno),
  );
})();
