// Content-side legacy interfaces; every operation is authorized by the host.
(() => {
  const { call, request, handlers } = window.VulpesCompat;
  document.documentElement.dataset.vulpesApp = location.hostname.split('.')[0];
  if(window.VulpesPlatform==='tundra' && location.hostname==='system.localhost') {
    Object.defineProperty(navigator,'vibrate',{value:pattern=>{
      pattern=Array.isArray(pattern)?pattern:[pattern];
      if(pattern.length>32 || pattern.some(n=>!Number.isInteger(n) || n<0 || n>10000) || pattern.reduce((a,b)=>a+b,0)>10000) return false;
      call('hardware.vibrate',{pattern}).catch(error=>console.warn('Vibration:',error.message));
      return true;
    }});
  } else if (!navigator.vibrate) Object.defineProperty(navigator, 'vibrate', { value: () => false });
  if (window.Notification && !Notification.get)
    Notification.get = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return (await Promise.all(registrations.map((r) => r.getNotifications()))).flat();
    };
  function unavailable(message) {
    window.VulpesGaiaUI?.notice(message);
  }
  addEventListener('DOMContentLoaded', () => {
    if (location.hostname === 'system.localhost' && !window.VulpesPlatform) {
      const ids = ['wifi', 'bluetooth', 'data', 'airplane-mode'];
      for (const id of ids) {
        const e = document.getElementById('quick-settings-' + id);
        if (!e) continue;
        e.setAttribute('aria-disabled', 'true');
        e.title = 'Connexion gérée par le système hôte';
        e.style.cssText += ';display:block;color:#aaa;opacity:.6';
        e.addEventListener(
          'click',
          (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            unavailable(
              'Sur ce bureau, les connexions réseau sont gérées par Linux. Aucun modem téléphonique n’est connecté.',
            );
          },
          true,
        );
      }
    }
    if (location.hostname === 'settings.localhost') {
      document.addEventListener(
        'click',
        (event) => {
          const link = event.target.closest(
            'a[href="#fxa"],a[href="#fxa-about"],a[href="#fxa-signin"],a[href="#fxa-sync"]',
          );
          if (!link) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          unavailable(
            'Les comptes Firefox et la synchronisation distante ne sont pas portés dans cette version bureau.',
          );
        },
        true,
      );
    }
    if (location.hostname === 'communications.localhost') {
      document.getElementById('keypad-callbar-call-action')?.addEventListener(
        'click',
        (event) => {
          if (navigator.mozTelephony || window.VulpesPlatform) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          unavailable(
            'Appels indisponibles : aucun modem téléphonique n’est connecté à cette version bureau.',
          );
        },
        true,
      );
    }
  });
  Object.defineProperty(navigator, 'mozAlarms', {
    value: {
      getAll: () =>
        request(
          call('alarms.request', { operation: 'getAll' }).then((list) =>
            list.map((r) => ({ ...r, date: new Date(r.date) })),
          ),
        ),
      add: (date, respectTimezone, data) =>
        request(
          call('alarms.request', {
            operation: 'add',
            date: +date,
            respectTimezone,
            data: data ?? null,
            local: [
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              date.getHours(),
              date.getMinutes(),
              date.getSeconds(),
              date.getMilliseconds(),
            ],
          }),
        ),
      remove: (id) => {
        call('alarms.request', { operation: 'remove', id }).catch(console.error);
      },
    },
  });
  addEventListener('vulpes-service-event', (event) => {
    if (event.detail.type === 'alarm') {
      const data = event.detail.data;
      handlers.get('alarm')?.({ ...data, date: new Date(data.date) });
    }
  });
  window.VulpesCompat.openAttention = (url) => {
    const target = new URL(url, location.href);
    if (
      target.origin !== location.origin ||
      target.pathname !== '/onring.html' ||
      location.hostname !== 'clock.localhost'
    )
      throw new DOMException('Unsupported attention view', 'NotSupportedError');
    const frame = document.createElement('iframe');
    frame.dataset.vulpesAttention = 'true';
    frame.src = target.href;
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10000';
    document.body.append(frame);
    call('apps.launch', { manifestURL: location.origin + '/manifest.webapp' }).catch(console.error);
    return frame.contentWindow;
  };
  if (
    location.hostname === 'clock.localhost' &&
    location.pathname === '/onring.html' &&
    window.frameElement?.dataset.vulpesAttention === 'true'
  ) {
    window.opener = parent;
    window.close = () => {
      dispatchEvent(new Event('beforeunload'));
      window.frameElement.remove();
    };
  }
  const ports = new Map();
  function portFor({ id }) {
    if (ports.has(id)) return ports.get(id);
    const port = new EventTarget();
    let listener = null,
      started = false,
      queue = [];
    const deliver = (data) => port.dispatchEvent(new MessageEvent('message', { data }));
    port.start = () => {
      started = true;
      for (const data of queue) deliver(data);
      queue = [];
    };
    Object.defineProperty(port, 'onmessage', {
      get: () => listener,
      set(fn) {
        if (listener) port.removeEventListener('message', listener);
        listener = fn;
        if (fn) port.addEventListener('message', fn);
        port.start();
      },
    });
    port.postMessage = (data) =>
      call('iac.send', { id, data }).catch((error) =>
        port.dispatchEvent(new MessageEvent('messageerror', { data: error.message })),
      );
    port.close = () => {
      ports.delete(id);
      call('iac.close', { id }).catch(console.error);
    };
    port.receive = (data) => (started ? deliver(data) : queue.push(data));
    ports.set(id, port);
    return port;
  }
  window.VulpesCompat.connect = (keyword) =>
    call('iac.connect', { keyword }).then((list) => list.map(portFor));
  addEventListener('vulpes-service-event', (event) => {
    const { type, data } = event.detail;
    if (type === 'connection')
      handlers.get('connection')?.({ keyword: data.keyword, port: portFor(data) });
    if (type === 'portmessage') portFor(data).receive(data.data);
    if (type === 'portclose') {
      const p = ports.get(data.id);
      ports.delete(data.id);
      p?.dispatchEvent(new Event('close'));
    }
  });
  function cursor(promise, convert = (value) => value) {
    let values,
      index = 0,
      ready = false;
    const c = new EventTarget();
    c.result = null;
    c.done = false;
    function next() {
      if (!ready) return;
      setTimeout(async () => {
        try {
          c.result = index < values.length ? await convert(values[index++]) : null;
          c.done = c.result === null;
          c.onsuccess?.({ target: c });
          c.dispatchEvent(new Event('success'));
        } catch (error) {
          c.error = error;
          c.onerror?.({ target: c });
          c.dispatchEvent(new Event('error'));
        }
      }, 0);
    }
    c.continue = next;
    promise.then(
      (list) => {
        values = list;
        ready = true;
        next();
      },
      (error) => {
        c.error = error;
        c.onerror?.({ target: c });
        c.dispatchEvent(new Event('error'));
      },
    );
    return c;
  }
  window.VulpesCompat.cursor = cursor;
  if (location.hostname === 'sms.localhost') {
    Object.defineProperty(navigator, 'mozMobileConnections', { value: Object.freeze([]) });
    const messages = new EventTarget();
    for (const operation of ['getThreads', 'getMessages'])
      messages[operation] = (...args) =>
        cursor(call('messages.request', { operation, args }), (value) => ({
          ...value,
          timestamp: new Date(value.timestamp),
        }));
    for (const operation of [
      'getMessage',
      'send',
      'sendMMS',
      'retrieveMMS',
      'delete',
      'markMessageRead',
      'getSmscAddress',
      'setSmscAddress',
      'getSegmentInfoForText',
    ])
      messages[operation] = (...args) => request(call('messages.request', { operation, args }));
    const dated = value => value && typeof value==='object' && 'timestamp' in value ?
      {...value,timestamp:new Date(value.timestamp)} : value;
    messages.getMessage = id => request(call('messages.request',{operation:'getMessage',args:[id]}).then(dated));
    messages.send = (recipients,body,options) => {
      const send = recipient => {
        let id, settle;
        const early = new Map();
        const terminal = new Promise((resolve,reject)=>{settle=message=>{
          if(message.delivery==='sent') resolve(dated(message));
          else reject(new DOMException('SMS transmission failed','UnknownError'));
        };});
        const listener=({detail})=>{
          if(!['sms-sent','sms-failed'].includes(detail.type)) return;
          const message=detail.data;
          if(id===message.id) settle(message);
          else if(id===undefined && early.size<100) early.set(message.id,message);
        };
        addEventListener('vulpes-service-event',listener);
        const result=call('messages.request',{operation:'send',args:[recipient,body,options]}).then(message=>{
          if(message.delivery!=='sending') return dated(message);
          id=message.id;
          if(early.has(id)) settle(early.get(id));
          early.clear();
          return terminal;
        }).finally(()=>removeEventListener('vulpes-service-event',listener));
        return request(result);
      };
      return Array.isArray(recipients) ? recipients.map(send) : send(recipients);
    };
    addEventListener('vulpes-service-event',({detail})=>{
      const type = {'sms-received':'received','sms-sending':'sending','sms-sent':'sent','sms-failed':'failed'}[detail.type];
      if (!type) return;
      const message=dated(detail.data);
      const event=Object.assign(new Event(type),{message});
      messages.dispatchEvent(event);messages['on'+type]?.(event);
    });
    Object.defineProperty(navigator, 'mozMobileMessage', { value: messages });
  }
  if (
    ['gallery', 'music', 'video', 'camera', 'ringtones'].includes(location.hostname.split('.')[0])
  ) {
    const stores = new Map();
    function storage(type) {
      if (!['pictures', 'music', 'videos'].includes(type)) return null;
      if (stores.has(type)) return stores.get(type);
      const s = new EventTarget();
      s.storageName = 'sdcard';
      s.default = true;
      s.canBeMounted = false;
      const run = (operation, params = {}) => call('media.request', { type, operation, ...params });
      for (const op of ['available', 'freeSpace', 'usedSpace']) s[op] = () => request(run(op));
      s.get = (name) =>
        request(
          run('get', { name }).then((f) => {
            const file = new File([f.blob], f.name, { type: f.type, lastModified: f.lastModified });
            Object.defineProperty(file, 'lastModifiedDate', { value: new Date(f.lastModified) });
            return file;
          }),
        );
      s.addNamed = (blob, name) => request(run('add', { blob, name }));
      s.add = (blob) =>
        s.addNamed(
          blob,
          blob.name ||
            crypto.randomUUID() + { pictures: '.jpg', music: '.mp3', videos: '.mp4' }[type],
        );
      s.delete = (name) => request(run('delete', { name }));
      s.enumerate = (name = '', options = {}) => {
        if (typeof name === 'object') {
          options = name;
          name = '';
        }
        return cursor(run('enumerate', { name, since: options.since ? +options.since : 0 }), (f) =>
          s.get(f.name),
        );
      };
      stores.set(type, s);
      return s;
    }
    navigator.getDeviceStorage = storage;
    navigator.getDeviceStorages = (type) => {
      const s = storage(type);
      return s ? [s] : [];
    };
    addEventListener('vulpes-service-event', (event) => {
      const { type, data } = event.detail;
      if (type !== 'mediachange') return;
      const s = stores.get(data.type);
      if (!s) return;
      const change = new Event('change');
      Object.assign(change, { path: data.path, reason: data.reason });
      s.dispatchEvent(change);
      s.onchange?.(change);
    });
    addEventListener('DOMContentLoaded', () => {
      const type = { gallery: 'pictures', music: 'music', video: 'videos' }[
        location.hostname.split('.')[0]
      ];
      if (!type || !['/', '/index.html'].includes(location.pathname) || window.VulpesPlatform)
        return;
      const label = document.createElement('label');
      label.className = 'vulpes-import';
      label.textContent = 'Importer';
      label.title = 'Copier des fichiers dans le profil de cet émulateur';
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = { pictures: 'image/*', music: 'audio/*', videos: 'video/*' }[type];
      input.hidden = true;
      label.append(input);
      input.addEventListener('change', async () => {
        try {
          for (const file of input.files) await storage(type).addNamed(file, file.name);
          label.title = 'Import terminé';
        } catch (error) {
          unavailable('Import impossible : ' + error.message);
        } finally {
          input.value = '';
        }
      });
      document.body.append(label);
    });
  }
  class Contact {
    constructor(data = {}) {
      this.init(data);
    }
    init(data) {
      Object.assign(this, data);
      for (const field of [
        'name',
        'givenName',
        'familyName',
        'additionalName',
        'honorificPrefix',
        'honorificSuffix',
        'nickname',
        'email',
        'tel',
        'adr',
        'org',
        'jobTitle',
        'note',
        'url',
        'category',
        'photo',
      ])
        if (!this[field]) this[field] = [];
    }
  }
  window.mozContact = Contact;
  const contacts = new EventTarget();
  function convert(value) {
    const c = new Contact(value);
    for (const key of ['published', 'updated', 'bday', 'anniversary'])
      if (c[key]) c[key] = new Date(c[key]);
    return c;
  }
  contacts.find = (options) =>
    request(
      call('contacts.request', { operation: 'find', options }).then((list) => list.map(convert)),
    );
  contacts.getAll = (options) =>
    cursor(call('contacts.request', { operation: 'all', options }), convert);
  contacts.save = (contact) =>
    request(
      call('contacts.request', { operation: 'save', contact }).then((saved) => {
        Object.assign(contact, convert(saved));
        return null;
      }),
    );
  contacts.remove = (contact) =>
    request(
      call('contacts.request', {
        operation: 'remove',
        id: typeof contact === 'string' ? contact : contact.id,
      }),
    );
  contacts.clear = () => request(call('contacts.request', { operation: 'clear' }));
  contacts.getCount = () => request(call('contacts.request', { operation: 'count' }));
  contacts.getRevision = () => request(call('contacts.request', { operation: 'revision' }));
  Object.defineProperty(navigator, 'mozContacts', { value: contacts });
  addEventListener('vulpes-service-event', (event) => {
    if (event.detail.type !== 'contactchange') return;
    const change = new Event('contactchange');
    Object.assign(change, event.detail.data);
    contacts.dispatchEvent(change);
    contacts.oncontactchange?.(change);
  });
})();
