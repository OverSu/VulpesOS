// Restore Gaia views without claiming unavailable host APIs are implemented.
(() => {
  const app = location.hostname.split('.')[0];
  const fr = () => (document.documentElement.lang || navigator.language).startsWith('fr');
  const label = (a, b) => fr() ? a : b;
  function notice(message) {
    document.getElementById('vulpes-gaia-notice')?.remove();
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = '/shared/style/confirm.css';
    if (!document.querySelector('link[href="/shared/style/confirm.css"]')) document.head.append(link);
    // Original Gaia confirmation building block and stylesheet.
    const form = document.createElement('form');
    form.id = 'vulpes-gaia-notice';
    form.setAttribute('role', 'dialog'); form.dataset.type = 'confirm';
    form.setAttribute('aria-modal', 'true');
    const section = document.createElement('section'), p = document.createElement('p');
    p.textContent = message; section.append(p);
    const menu = document.createElement('menu'), close = document.createElement('button');
    close.type = 'submit'; close.textContent = label('Fermer', 'Close');
    menu.append(close); form.append(section, menu);
    const previous = document.activeElement;
    form.onsubmit = event => { event.preventDefault(); form.remove(); previous?.focus(); };
    form.onkeydown = event => { if (event.key === 'Escape') { event.preventDefault(); form.requestSubmit(); } };
    document.body.append(form); close.focus();
  }
  const unavailable = () => label('Cette fonction n’est pas encore disponible sur cette plateforme.',
    'This feature is not available on this platform yet.');
  window.VulpesGaiaUI = {notice};
  async function ready() {
    if (app === 'system') {
      // OperatorIcon also owns the date. It must exist even without a modem.
      const startDate = async () => {
        if (!window.BaseIcon || !window.Service || !window.LazyLoader) return false;
        if (document.getElementById('statusbar-operator')) return true;
        await LazyLoader.load(['js/operator_icon.js']);
        const date = new OperatorIcon({mobileConnections:[]});
        date.start();
        setInterval(() => date.update(), 30000);
        for (const name of ['localized', 'moztimechange', 'visibilitychange'])
          addEventListener(name, () => date.update());
        return true;
      };
      const timer = setInterval(() => startDate().then(done => {if(done) clearInterval(timer);}).catch(console.error), 500);
    }
    if (app === 'communications' && location.pathname.startsWith('/contacts')) {
      const restoreImport = () => {
        const list = document.getElementById('import-options');
        if (list && !navigator.mozIccManager && !list.querySelector('[id^="import-sim-option-"]')) {
          // Same structure as SimDomGenerator.generateImportDOM; no fictitious SIM.
          const li = document.createElement('li'), button = document.createElement('button'), error = document.createElement('p');
          li.id = 'import-sim-option-unavailable';li.setAttribute('role','presentation');
          button.className = 'icon icon-sim';button.setAttribute('role','option');button.disabled = true;
          button.textContent = label('Carte SIM', 'SIM card');
          error.className = 'error-message';error.textContent = unavailable();
          li.append(button,error);list.prepend(li);
        }
        const item = document.getElementById('import-sd-option');
        if (!item) return;
        const button = item.querySelector('button');
        if(button?.hasAttribute('disabled')) button.removeAttribute('disabled');
        if(item.getAttribute('aria-disabled') === 'true') item.setAttribute('aria-disabled','false');
        if(item.classList.contains('disabled')) item.classList.remove('disabled');
        const span = item.querySelector('span');
        if(span && span.dataset.l10nId === 'importMemoryCard') {
          span.removeAttribute('data-l10n-id');span.textContent = label('Fichier de contacts', 'Contact file');
        }
        const error = item.querySelector('p');
        if(error && !error.hidden) error.hidden = true;
      };
      new MutationObserver(restoreImport).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled','class']});
      restoreImport();
      // Reuse Gaia's import-from-storage action instead of a floating button.
      document.addEventListener('click', event => {
        if (!event.target.closest('#import-sd-option')) return;
        event.preventDefault(); event.stopImmediatePropagation();
        VulpesCompat.call('platform.contact', {}).catch(error => {
          if (error.name !== 'AbortError' && error.message !== 'AbortError') notice(unavailable());
        });
      }, true);
    }

    if (app === 'sms' && window.VulpesPlatform === 'android') {
      document.addEventListener('click', event => {
        if (!event.target.closest('#messages-send-button')) return;
        event.preventDefault(); event.stopImmediatePropagation();
        // Android owns final confirmation and delivery. Do not fabricate a sent SMS.
        const view = window.ConversationView;
        view?.assimilateRecipients();
        const numbers = window.Navigation?.isCurrentPanel('composer') ?
          view?.recipients?.numbers : view?.activeThread?.participants;
        const body = window.Compose?.getText?.() || '';
        if (!numbers?.length || !body) return;
        if (window.Compose.type !== 'sms') { notice(unavailable()); return; }
        VulpesCompat.call('platform.sms', {
          number:numbers.join(';'), body
        }).catch(() => notice(unavailable()));
      }, true);
    }
    const mediaType = {gallery:'pictures', music:'music', video:'videos'}[app];
    if (mediaType && ['/', '/index.html'].includes(location.pathname)) {
      const addImport = () => {
        const header = document.querySelector('gaia-header');
        if (!header || header.querySelector('[data-vulpes-import]')) return;
        const action = document.createElement('button');
        action.dataset.vulpesImport = ''; action.dataset.icon = 'add';
        action.setAttribute('aria-label', label('Importer des fichiers', 'Import files'));
        action.onclick = () => VulpesCompat.call('platform.pick',{type:mediaType}).catch(error => {
          if (error.name !== 'AbortError' && error.message !== 'AbortError') notice(unavailable());
        });
        header.append(action);
      };
      new MutationObserver(addImport).observe(document.body,{childList:true,subtree:true});
      addImport();
    }
    if (app !== 'settings') return;
    const capabilities = await VulpesCompat.call('platform.capabilities', {});
    async function batteryText() {
      const level = navigator.battery?.level;
      const known = Number.isFinite(level);
      for (const [selector, id] of [['#battery-desc', 'battery-level-percent'], ['#battery-level', 'battery-current-level']]) {
        const node = document.querySelector(selector);
        if (!node) continue;
        const value = known && document.l10n ? await document.l10n.formatValue(id, {level:Math.round(level * 100)}) : label('Indisponible', 'Unavailable');
        node.removeAttribute('data-l10n-id'); node.removeAttribute('data-l10n-args');
        if (node.textContent !== value) node.textContent = value;
        if (node.hidden) node.hidden = false;
      }
    }
    navigator.battery?.addEventListener('levelchange', batteryText);
    addEventListener('localized', batteryText);
    document.addEventListener('panelready', batteryText);
    batteryText();

    const unsupported = {
      wifi: !navigator.mozWifiManager,
      bluetooth: !navigator.mozBluetooth,
      carrier: !navigator.mozMobileConnections,
      call: !navigator.mozMobileConnections,
      messaging: !navigator.mozMobileConnections,
      'sim-manager': !navigator.mozIccManager,
      simpin: !navigator.mozIccManager,
      hotspot: !navigator.mozWifiManager,
      findmydevice: true,
      fxa: true,
      fxsync: true,
      addons: true,
      mediaStorage: !navigator.getDeviceStorages,
      applicationStorage: !navigator.getDeviceStorage,
      usbStorage: !navigator.getDeviceStorages,
    };
    function preservePanel(panel) {
      const content = panel.querySelector(':scope > div');
      if (!content || content.querySelector('[data-vulpes-unavailable]')) return;
      const explanation = document.createElement('p');
      explanation.className = 'explanation'; explanation.dataset.vulpesUnavailable = '';
      explanation.setAttribute('role', 'status'); explanation.textContent = unavailable();
      content.prepend(explanation);
      for (const control of content.querySelectorAll('button,input,select,gaia-switch,gaia-checkbox,gaia-radio')) {
        control.disabled = true; control.setAttribute('disabled', '');
      }
      for (const anchor of content.querySelectorAll('a')) {
        anchor.setAttribute('aria-disabled', 'true');
        anchor.addEventListener('click', event => {event.preventDefault();event.stopImmediatePropagation();}, true);
      }
    }
    // The panel's original markup is still loaded by SettingsService. Only the
    // unavailable controller is replaced, so it cannot dereference a missing API.
    const install = setInterval(() => {
      if (typeof window.require !== 'function' || !require.defined?.('modules/settings_panel') || !require.defined?.('modules/panel_cache')) return;
      clearInterval(install);
      require(['modules/panel_cache', 'modules/settings_panel'], (cache, SettingsPanel) => {
        const original = cache.get.bind(cache), panels = new Map();
        cache.get = (id, callback) => {
          if (!unsupported[id]) return original(id, callback);
          if (!panels.has(id)) panels.set(id, SettingsPanel({onInit:preservePanel, onBeforeShow:preservePanel}));
          callback?.(panels.get(id));
        };
      });
    }, 100);
    function restore() {
      batteryText();
      const root = document.querySelector('#root');
      if (root) for (const id of ['wifi','bluetooth','carrier','call','messaging','sim-manager','simpin',
        'findmydevice','addons','mediaStorage','applicationStorage']) {
        const li = root.querySelector('a[href="#' + id + '"]')?.closest('li');
        if (li?.hidden) li.hidden = false;
      }
      if (capabilities.platform === 'android' && root && !document.getElementById('vulpes-android-settings')) {
        const ul = document.createElement('ul'), li = document.createElement('li'), a = document.createElement('a');
        a.id = 'vulpes-android-settings'; a.className = 'menu-item'; a.href = '#';
        a.textContent = label('Paramètres Android', 'Android settings');
        a.onclick = event => {event.preventDefault();VulpesCompat.call('platform.settings',{panel:'root'}).catch(() => notice(unavailable()));};
        li.append(a); ul.append(li); root.querySelector(':scope > div')?.append(ul);
      }

      if (capabilities.platform === 'android') {
        const homescreens = document.querySelector('#homescreens > div');
        if (homescreens && !document.getElementById('vulpes-default-home')) {
          const ul = document.createElement('ul'), li = document.createElement('li'), a = document.createElement('a');
          a.id = 'vulpes-default-home'; a.className = 'menu-item'; a.href = '#';
          a.textContent = label('Accueil Android par défaut', 'Default Android home');
          a.onclick = event => {event.preventDefault();VulpesCompat.call('platform.settings',{panel:'home'}).catch(() => notice(unavailable()));};
          li.append(a);ul.append(li);homescreens.append(ul);
        }
      }
      if (window.VulpesNativeWifi) {
        // WPS remains unavailable; radio power uses the native broker.
        for (const selector of ['#wifi .wps-column', '#wifi .wps-column a']) {
          const n = document.querySelector(selector);
          if(n) {if(n.getAttribute('aria-disabled') !== 'true') n.setAttribute('aria-disabled','true'); if(n.tagName === 'GAIA-SWITCH' && !n.hasAttribute('disabled')) n.setAttribute('disabled','');}
        }
      }
      const legal = document.querySelector('#about-legal > div');
      if (legal && !document.getElementById('vulpes-credits')) {
        const p = document.createElement('p'); p.id = 'vulpes-credits'; p.className = 'explanation';
        p.textContent = label('Vulpes OS repose sur Gaia et Gecko de Mozilla et le travail de leurs contributeurs. Capyloon fait partie des projets qui inspirent cette continuité. Les licences et attributions d’origine sont conservées.',
          'Vulpes OS builds on Mozilla Gaia and Gecko and the work of their contributors. Capyloon is among the projects inspiring this continuation. Original licenses and attributions are retained.');
        legal.append(p);
      }
    }
    new MutationObserver(restore).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden']});
    restore();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => ready().catch(console.error), {once:true});
  else ready().catch(console.error);
})();
