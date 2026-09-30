// Shared Gaia integration: the host adapter supplies hardware capabilities.
(() => {
  const { call } = VulpesCompat;
  const app = location.hostname.split('.')[0];
  const android = window.VulpesPlatform === 'android';
  const host = android ? 'Android' : 'Linux';
  const capabilities = call('platform.capabilities', {});
  const labels = new Map();
  const fr = () => (document.documentElement.lang || navigator.language).startsWith('fr');
  function text(node, french, english) {
    labels.set(node, [french, english]);
    node.textContent = fr() ? french : english;
    return node;
  }
  function translate() {
    for (const [node, pair] of labels) node.textContent = pair[fr() ? 0 : 1];
  }
  new MutationObserver(translate).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  addEventListener('localized', translate);
  function failure(error) {
    if (error.name === 'AbortError' || error.message === 'AbortError') return;
    const messages = {
      NOT_SUPPORTED: [
        'Cette fonction n’est pas disponible sur cet appareil.',
        'This feature is not available on this device.',
      ],
      PANEL_UNAVAILABLE: [
        'Ce panneau n’est pas installé sur ce bureau.',
        'This settings panel is not installed on this desktop.',
      ],
      NOTIFICATIONS_DENIED: [
        'Autorisez les notifications de Vulpes dans les paramètres du système.',
        'Allow Vulpes notifications in system settings.',
      ],
      MEDIA_TOO_LARGE_32_MIB: [
        'Choisissez un fichier de moins de 32 Mio.',
        'Choose a file smaller than 32 MiB.',
      ],
      PICKER_BUSY: ['Terminez la sélection déjà ouverte.', 'Finish the current selection first.'],
      WIFI_UNAVAILABLE: [
        'Le service Wi-Fi est indisponible. Réessayez dans quelques instants.',
        'Wi-Fi is unavailable. Try again shortly.',
      ],
      WIFI_NETWORK_GONE: [
        'Ce réseau n’est plus visible. Actualisez la liste.',
        'This network is no longer visible. Refresh the list.',
      ],
      WIFI_UNSUPPORTED_SECURITY: [
        'Ce mode de sécurité Wi-Fi n’est pas encore pris en charge.',
        'This Wi-Fi security mode is not supported yet.',
      ],
      WIFI_INVALID_PASSWORD: ['Vérifiez le mot de passe Wi-Fi.', 'Check the Wi-Fi password.'],
      WIFI_CONNECT_FAILED: [
        'Connexion impossible. Vérifiez le mot de passe et la portée du réseau.',
        'Connection failed. Check the password and network range.',
      ],
      WIFI_DISCONNECT_FAILED: ['La déconnexion a échoué.', 'Disconnection failed.'],
      RADIO_UNAVAILABLE: [
        'Le service téléphonique est indisponible. Réessayez dans quelques instants.',
        'The phone service is unavailable. Try again shortly.',
      ],
      RADIO_NOT_REGISTERED: ['Le téléphone n’est pas connecté au réseau mobile.',
        'The phone is not registered on a mobile network.'],
      RADIO_NOT_READY: ['Le modem n’est pas encore prêt. Réessayez dans quelques instants.',
        'The modem is not ready yet. Try again shortly.'],
      RADIO_BUSY: ['Une opération téléphonique est déjà en cours.',
        'A phone operation is already in progress.'],
      RADIO_REQUEST_FAILED: ['Le modem a refusé la demande. Vérifiez la SIM et le réseau mobile.',
        'The modem rejected the request. Check the SIM and mobile network.'],
      INVALID_NUMBER: ['Numéro invalide.', 'Invalid phone number.'],
      INVALID_SMS: ['SMS invalide ou trop long.', 'Invalid or oversized SMS.'],
      MULTIPLE_RECIPIENTS_UNSUPPORTED: [
        'Un seul destinataire est pris en charge dans cette Preview.',
        'This Preview supports one recipient at a time.',
      ],
    };
    const message = messages[error.message]?.[fr() ? 0 : 1] ||
      (fr() ? 'Action impossible : ' : 'Unable to complete: ') + error.message;
    window.VulpesGaiaUI.notice(message);
  }

  const run = async (operation, params = {}) => {
    try { return await call('platform.' + operation, params); }
    catch (error) { failure(error); }
  };
  function button(id, french, english, action) {
    const b = text(document.createElement('button'), french, english);
    b.id = id;
    b.className = 'vulpes-platform-button';
    b.onclick = async () => {
      b.disabled = true;
      try {
        await action();
      } catch (e) {
        failure(e);
      } finally {
        b.disabled = false;
      }
    };
    return b;
  }
  // The system app owns the call screen so Home or closing the dialer cannot
  // remove the only hang-up control. States always come from the host modem.
  function syncCallHistory() {
    let stopped = false;
    addEventListener('pagehide', () => { stopped = true; }, {once:true});
    const refresh = async () => {
      try {
        const db = window.CallLogDBManager;
        if (db && window.CallLog && (!window.CallLog._initialized || window.CallLog.sticky)) {
          const entries = await call('platform.callHistory', {});
          for (const item of entries) {
            const entry = {date:item.date, duration:item.duration, number:item.number,
              type:item.direction === 'incoming' ? 'incoming':'dialing',
              status:item.direction === 'incoming' && item.connectedAt !== null ? 'connected':null,
              serviceId:0, emergency:false, voicemail:false};
            // An import interrupted after its DB commit must not duplicate a call.
            const exists = await new Promise((resolve, reject) => {
              db._newTxn('readonly', db._dbGroupsStore, (error, txn, store) => {
                if (error) return reject(Error(error));
                const r = store.get(db._getGroupId(entry));
                r.onsuccess = () => resolve(r.result?.calls?.some(c => c.date === entry.date));
                r.onerror = () => reject(r.error);
              });
            });
            if (!exists) await new Promise((resolve, reject) => db.add(entry, group => {
              if (typeof group === 'string') return reject(Error(group));
              if (window.CallLog.sticky) window.CallLog.appendGroup(group);
              resolve();
            }));
            await call('platform.ackCallHistory', {ids:[item.id]});
          }
        }
      } catch (error) { console.warn('Call history:', error.message); }
      if (!stopped) setTimeout(refresh, 1500);
    };
    refresh();
  }
  if (app === 'system') addEventListener('homescreenopened', () => run('systemReady'));
  window.addEventListener('click', event => {
    if (app !== 'communications' || !event.target.closest?.('#keypad-callbar-call-action')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const number = document.getElementById('phone-number-view')?.value;
    if (number) run('dial', {number});
  }, true);
  async function initialize() {
    const caps = await capabilities;
    // Native calls use Gaia's CallscreenWindow and mozTelephony adapter.
    if (app === 'communications' && location.pathname.startsWith('/dialer') && caps.callControl) syncCallHistory();
    if (app === 'homescreen') {
      // The host can attach Gaia before its first non-zero layout. Retry the
      // icon loader once that size becomes available (desktop, Tundra and APK).
      const watched = new WeakSet();
      const icons = new ResizeObserver((entries) => {
        for (const { target: icon, contentRect } of entries) {
          if (contentRect.width > 0 && icon.size === 0 && typeof icon.refresh === 'function') {
            icon.size = -1;
            icon.refresh();
          }
        }
      });
      const watchIcons = () => {
        for (const icon of document.querySelectorAll('gaia-app-icon')) {
          if (watched.has(icon)) continue;
          watched.add(icon);
          icons.observe(icon);
        }
      };
      new MutationObserver(watchIcons).observe(document.body, { childList: true, subtree: true });
      watchIcons();
      let previous,
        scheduled = false;
      const update = () => {
        scheduled = false;
        const panel = document.querySelector('[aria-hidden="false"] > .scrollable');
        if (!panel || !panel.clientHeight) return;
        const bottom = panel.scrollHeight - panel.clientHeight - panel.scrollTop <= 2;
        if (bottom === previous) return;
        previous = bottom;
        call('desktop.homeScroll', { bottom }).catch(console.error);
      };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(update);
      };
      document.addEventListener('scroll', schedule, { capture: true, passive: true });
      addEventListener('resize', schedule);
      document.addEventListener('visibilitychange', schedule);
      new MutationObserver(schedule).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['aria-hidden'],
      });
      const resize = new ResizeObserver(schedule);
      for (const panel of document.querySelectorAll('.scrollable, #apps, #pages'))
        resize.observe(panel);
      schedule();
    }
    if (app === 'system') {
      let previous;
      const navigation = () => {
        const active = document.querySelector('.appWindow.active');
        const home = !!active?.querySelector('iframe[src*="homescreen.localhost"]') &&
          !document.querySelector('#screen.locked, .attentionWindow.active');
        if (home === previous) return;
        previous = home;
        call('desktop.navigation', { home }).catch(console.error);
      };
      new MutationObserver(navigation).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
      });
      navigation();
    }
    if (app === 'settings') {
      const add = () => {
        const about = document.querySelector('#about > div');
        if (about && !document.getElementById('vulpes-system-info')) {
          const list = document.createElement('ul');
          list.id = 'vulpes-system-info';
          const row = (key, french, english, value, englishValue = value) => {
            const item = document.createElement('li');
            item.dataset.component = key;
            item.append(
              text(document.createElement('span'), french, english),
              text(
                document.createElement('small'),
                value || 'Non renseigné',
                englishValue || 'Not specified',
              ),
            );
            list.append(item);
          };
          row('vulpes', 'Vulpes OS', 'Vulpes OS', caps.version);
          row('gaia', 'Gaia', 'Gaia', caps.gaia);
          row('gecko', 'Gecko', 'Gecko', caps.gecko);
          if (caps.platform === 'tundra') row('tundra', 'Tundra', 'Tundra', caps.tundra);
          else row('platform', 'Plateforme', 'Platform', caps.platformName || host);
          row(
            'model',
            'Modèle',
            'Model',
            caps.model || (android ? 'Android' : 'Ordinateur'),
            caps.model || (android ? 'Android' : 'Computer'),
          );
          const adapter = caps.adapter;
          const version =
            adapter?.version && adapter.version + (adapter.device ? '-' + adapter.device : '');
          row(
            'adapter',
            caps.platform === 'tundra' ? 'Adaptation matérielle' : 'Adaptateur Vulpes',
            caps.platform === 'tundra' ? 'Hardware adaptation' : 'Vulpes adapter',
            version,
          );
          // Keep the legacy nodes for Gaia's panel controller, without duplicate rows.
          for (const key of ['deviceinfo.product_model', 'deviceinfo.software']) {
            const old = about.querySelector('[data-name="' + key + '"]')?.closest('li');
            if (old) old.style.display = 'none';
          }
          const brand = about.querySelector('.vulpes-brand');
          if (brand) brand.after(list);
          else about.prepend(list);
        }

      };
      new MutationObserver(add).observe(document.body, { childList: true, subtree: true });
      add();
    }
  }
  const loaded =
    document.readyState === 'loading'
      ? new Promise((resolve) => addEventListener('DOMContentLoaded', resolve, { once: true }))
      : Promise.resolve();
  loaded.then(initialize).catch(failure);
})();

// Legacy Gaia apps live in cross-origin frames. Their manifest-authorized
// notifications use the platform bridge; external browser pages keep Gecko's API.
(() => {
  const { call } = VulpesCompat;
  let permission = 'default';
  const instances = new Map();
  class VulpesNotification extends EventTarget {
    constructor(title, options = {}) {
      super();
      Object.assign(this, {
        title: String(title),
        body: options.body || '',
        tag: options.tag || '',
        data: options.data || null,
      });
      call('platform.notification', {
        operation: 'show',
        title: this.title,
        body: this.body,
        tag: this.tag,
        data: this.data,
        icon: options.icon || '', lang: options.lang || '', dir: options.dir || 'auto',
        silent: options.silent === true,
      }).then(
        (id) => {
          this.id = id;
          instances.set(id, this);
          if (this.closed) this.close();
          else this.emit('show');
        },
        (error) => {
          this.error = error;
          this.emit('error');
        },
      );
    }
    emit(type) {
      const event = new Event(type);
      this.dispatchEvent(event);
      this['on' + type]?.(event);
    }
    close() {
      this.closed = true;
      if (this.id != null)
        call('platform.notification', { operation: 'close', id: this.id })
          .then(() => {
            instances.delete(this.id);
            this.emit('close');
          })
          .catch(console.warn);
    }
    static get permission() {
      return permission;
    }
    static async requestPermission(callback) {
      permission = await call('platform.notification', { operation: 'permission' });
      callback?.(permission);
      return permission;
    }
    static async get(filter = {}) {
      const rows = await call('platform.notification', { operation: 'list' });
      return rows
        .filter((row) => !filter.tag || row.tag === filter.tag)
        .map((row) => {
          if (instances.has(row.id)) return instances.get(row.id);
          const n = new EventTarget();
          Object.setPrototypeOf(n, VulpesNotification.prototype);
          Object.assign(n, row);
          instances.set(row.id, n);
          return n;
        });
    }
  }
  Object.defineProperty(window, 'Notification', { value: VulpesNotification, configurable: true });
  call('apps.self', {})
    .then((app) =>
      app.manifest.permissions?.['desktop-notification']
        ? call('platform.notification', { operation: 'query' })
        : 'denied',
    )
    .then(
      (value) => (permission = value),
      () => {},
    );
  addEventListener('vulpes-service-event', ({ detail }) => {
    if (detail.type === 'notification-close') {
      instances.get(detail.data.id)?.emit('close');instances.delete(detail.data.id);
    }
    if (detail.type === 'notification-click') {
      instances.get(detail.data.id)?.emit('click');
      instances.delete(detail.data.id);
    }
  });
})();

// Route the native tray through Gaia's original toast, lockscreen and sound logic.
if (location.hostname === 'system.localhost' && window.VulpesPlatform === 'tundra') {
  const deliver = detail => dispatchEvent(new CustomEvent('mozChromeNotificationEvent',{detail}));
  addEventListener('vulpes-service-event',({detail})=>{
    if (detail.type==='gaia-notification') deliver(detail.data);
  });
  addEventListener('mozContentNotificationEvent',event=>{
    VulpesCompat.call('platform.notificationEvent',event.detail).catch(console.error);
  });
  const restore = setInterval(async()=>{
    if (!window.NotificationScreen?.container) return;
    clearInterval(restore);
    try {
      for (const row of await VulpesCompat.call('platform.notificationEvent',{type:'resend'}))
        deliver({...row,mozbehavior:{...row.mozbehavior,noscreen:true,nosound:true,novibrate:true}});
    } catch(error) {console.error(error);}
  },500);
}
