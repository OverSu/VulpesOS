// Restore Gaia views without claiming unavailable host APIs are implemented.
(() => {
  const app = location.hostname.split('.')[0];
  const fr = () => (document.documentElement.lang || navigator.language).startsWith('fr');
  const label = (a, b) => fr() ? a : b;
  const labels = new Map();
  function localize(node, french, english, attribute) {
    labels.set(node, {french, english, attribute});
    translate();
  }
  function translate() {
    for (const [node, entry] of labels) {
      const value = label(entry.french, entry.english);
      if (entry.attribute) {
        if (node.getAttribute(entry.attribute) !== value) node.setAttribute(entry.attribute, value);
      } else if (node.textContent !== value) node.textContent = value;
    }
  }
  addEventListener('localized', translate);
  new MutationObserver(translate).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});

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
      // Android reserves the edge swipe for its own shade. A tap on Gaia's
      // status bar provides access without competing with that system gesture.
      if (window.VulpesPlatform === 'android') {
        document.getElementById('statusbar')?.addEventListener('click', () => {
          if (!window.Service?.query('locked')) window.UtilityTray?.show(true);
        });
      }

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
          localize(button, 'Carte SIM', 'SIM card');
          error.className = 'error-message';localize(error, 'Cette fonction n’est pas encore disponible sur cette plateforme.', 'This feature is not available on this platform yet.');
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
          span.removeAttribute('data-l10n-id');localize(span, 'Fichier de contacts', 'Contact file');
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

    if (app === 'sms') {
      let mmsAvailable=false;
      VulpesCompat.call('platform.capabilities',{}).then(c=>{mmsAvailable=c.mms===true;}).catch(()=>{});
      // Keep the composer intact until a real MMS transport is available.
      document.addEventListener('click', event => {
        if (mmsAvailable || !event.target.closest('#messages-send-button') || window.Compose?.type !== 'mms') return;
        event.preventDefault(); event.stopImmediatePropagation();
        notice(label('L’envoi de MMS n’est pas encore disponible dans cette version. Votre message et ses pièces jointes sont conservés.',
          'MMS sending is not yet available in this version. Your message and attachments have been kept.'));
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
        localize(action, 'Importer des fichiers', 'Import files', 'aria-label');
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
      carrier: !window.VulpesMobileSettings,
      call: !window.VulpesMobileSettings,
      messaging: !navigator.mozMobileConnections?.length,
      'sim-manager': !navigator.mozIccManager,
      simpin: true,
      'wifi-manageCertificates': true,
      'wifi-selectCertificateFile': true,
      hotspot: !window.VulpesWifiSettings,
      downloads: capabilities.platform === 'android',
      'wifi-manageNetworks': !navigator.mozWifiManager,
      'messaging-details': !navigator.mozMobileConnections?.length,
      'operator-settings': !window.VulpesMobileSettings,
      'carrier-detail': !window.VulpesMobileSettings,
      'apn-settings': !window.VulpesMobileSettings,
      'apn-list': !window.VulpesMobileSettings,
      'apn-editor': !window.VulpesMobileSettings,
      'call-forwarding': !window.VulpesMobileSettings,
      'call-cbSettings': true,
      'call-fdnSettings': true,
      'call-fdnList': true,
      'developer-service-workers': true,
      'developer-hud': true,
      'accessibility-screenreader': true,
      crashReports: true,
      improveBrowserOS: true,
      'improveBrowserOS-sendFeedback': true,
      'improveBrowserOS-chooseFeedback': true,
      'full-developer-mode': true,
      findmydevice: true,
      fxa: true,
      fxsync: true,
      addons: true,
      mediaStorage: !navigator.getDeviceStorages,
      applicationStorage: !navigator.getDeviceStorage,
      usbStorage: true,
    };
    function preservePanel(panel) {
      const content = panel.querySelector(':scope > div') || panel;
      if (content.querySelector('[data-vulpes-unavailable]')) return;
      const explanation = document.createElement('p');
      explanation.className = 'explanation'; explanation.dataset.vulpesUnavailable = '';
      explanation.setAttribute('role', 'status'); localize(explanation, 'Cette fonction n’est pas encore disponible sur cette plateforme.', 'This feature is not available on this platform yet.');
      const header=content===panel ? panel.querySelector(':scope > gaia-header') : null;
      if(header)header.after(explanation);else content.prepend(explanation);
      const serviceNotes = {
        fxa: ['La connexion intégrée au compte Mozilla doit être portée vers l’authentification actuelle. Ouvrir le site du compte ne connecte pas encore Vulpes.', 'Integrated Mozilla account sign-in needs the current authentication protocol. Opening the account website does not sign Vulpes in.'],
        fxsync: ['La synchronisation nécessite la connexion au compte Mozilla et un adaptateur pour les données Vulpes. Elle n’est pas encore raccordée.', 'Sync requires Mozilla account sign-in and an adapter for Vulpes data. It is not connected yet.'],
        findmydevice: ['La localisation distante nécessite un service Vulpes sécurisé et associé à votre compte. Aucun appareil n’est actuellement suivi.', 'Remote device location requires a secure Vulpes service linked to your account. No device is currently tracked.'],
        addons: ['Ce panneau gérait les extensions des applications Firefox OS, pas les extensions du navigateur Firefox. Leur moteur d’exécution reste à porter.', 'This panel managed Firefox OS app add-ons, not Firefox browser extensions. Their runtime still needs to be ported.'],
        usbStorage: ['Le transfert de fichiers USB n’est pas encore raccordé. La connexion USB de maintenance reste disponible.', 'USB file transfer is not connected yet. The maintenance USB connection remains available.']
      };
      if(serviceNotes[panel.id]) localize(explanation,...serviceNotes[panel.id]);
      if (panel.id === 'wifi-manageCertificates' || panel.id === 'wifi-selectCertificateFile') localize(explanation, 'Les certificats Wi-Fi et les réseaux WPA-Enterprise ne sont pas encore pris en charge par cet adaptateur.', 'Wi-Fi certificates and WPA-Enterprise networks are not supported by this adapter yet.');
      if (panel.id === 'call' && window.VulpesNativeTelephony) {
        localize(explanation, 'Les appels fonctionnent. Le renvoi, le double appel et le masquage du numéro ne sont pas encore configurables ici.', 'Calling is available. Call forwarding, call waiting and caller ID cannot be configured here yet.');
        for (const item of content.querySelectorAll('li[hidden]')) item.hidden = false;
      }
      if(panel.id==='improveBrowserOS') {
        const list=content.querySelector('ul');
        for(const child of [...content.children]) if(child!==list && child!==explanation)child.hidden=true;
        const anchor=list.querySelector('a');anchor.href='https://nnsprod.com/git/oversu/VulpesOS/issues';
        const title=anchor.querySelector('span');title.removeAttribute('data-l10n-id');
        localize(title,'Signaler un problème ou proposer une idée','Report a problem or suggest an idea');
        localize(explanation,'Les retours sont recueillis sur le dépôt Vulpes OS. Aucun rapport n’est envoyé automatiquement.','Feedback is collected on the Vulpes OS repository. No report is sent automatically.');
        anchor.addEventListener('click',event=>{event.preventDefault();new MozActivity({name:'view',data:{type:'url',url:anchor.href}});});
        return;
      }
      for (const control of content.querySelectorAll('button,input,select,gaia-switch,gaia-checkbox,gaia-radio')) {
        control.disabled = true; control.setAttribute('disabled', '');
      }
      for (const anchor of content.querySelectorAll('a')) {
        const href=anchor.getAttribute('href');
        if(href && href!=='#' && href.startsWith('#') && unsupported[href.slice(1)]) continue;
        anchor.setAttribute('aria-disabled', 'true');
        anchor.addEventListener('click', event => {event.preventDefault();event.stopImmediatePropagation();}, true);
      }
    }
    // The panel's original markup is still loaded by SettingsService. Only the
    // unavailable controller is replaced, so it cannot dereference a missing API.
    const install = setInterval(() => {
      if (typeof window.require !== 'function' || !require.defined?.('modules/settings_panel') || !require.defined?.('modules/panel_cache')) return;
      clearInterval(install);
      require(['modules/panel_cache', 'modules/settings_panel', 'modules/dialog_panel'], (cache, SettingsPanel, DialogPanel) => {
        const original = cache.get.bind(cache), panels = new Map();
        cache.get = (id, callback) => {
          const dialog = window.VulpesWifiSettings?.dialogs[id];
          const native = window.VulpesMobileSettings?.panels[id] || window.VulpesWifiSettings?.panels[id];
          if(dialog) {
            if(!panels.has(id))panels.set(id,DialogPanel(dialog()));
            callback?.(panels.get(id));return;
          }
          if(native) {
            if(!panels.has(id))panels.set(id,SettingsPanel(native()));
            callback?.(panels.get(id));return;
          }
          if (!unsupported[id]) return original(id, callback);
          if (!panels.has(id)) panels.set(id, SettingsPanel({onInit:preservePanel, onBeforeShow:preservePanel}));
          callback?.(panels.get(id));
        };
      });
    }, 100);
    function restore() {
      batteryText();
      if (window.VulpesMobileSettings) {
        const panel = document.querySelector('#messaging > div');
        if (panel && !panel.querySelector('[data-vulpes-message-limit]')) {
          const p = document.createElement('p'); p.className = 'explanation'; p.dataset.vulpesMessageLimit = '';
          localize(p, 'Les accusés de réception SMS sont reliés au modem. Les autres options grisées ne sont pas encore prises en charge.', 'SMS delivery reports are connected to the modem. The other greyed-out options are not supported yet.'); panel.prepend(p);
        }
        if (panel) VulpesMobileSettings.messaging(panel);
        for (const control of panel?.querySelectorAll('gaia-switch,select') || []) {
          if (control.dataset.vulpesSupported === 'true') continue;
          if (!control.hasAttribute('disabled')) control.setAttribute('disabled','');
          if (control.disabled !== true) control.disabled = true;
        }
      }
      const clockPanel=document.getElementById('dateTime');
      if(clockPanel?.querySelector('.date-picker') && !navigator.mozTime) {
        for(const control of clockPanel.querySelectorAll('.date-picker,.time-picker,.timezone-picker select')) if(!control.disabled)control.disabled=true;
        if(!clockPanel.querySelector('[data-vulpes-clock-host]')) {
          const row=document.createElement('p');row.className='explanation';row.dataset.vulpesClockHost='';
          localize(row,'La date et le fuseau horaire sont gérés par le système hôte. Le format de l’heure reste réglable ici.', 'Date and timezone are managed by the host system. The time format can still be changed here.');
          clockPanel.querySelector(':scope > div').prepend(row);
        }
      }
      for(const id of ['mediaStorage','applicationStorage']) {
        const content=document.querySelector('#'+id+' > div');
        if(content && !content.querySelector('[data-vulpes-storage-scope]')) {
          const p=document.createElement('p');p.className='explanation';p.dataset.vulpesStorageScope='';
          localize(p,'Espace utilisé par Vulpes et espace libre sur le volume hôte. Les données des autres applications du système ne sont pas incluses.', 'Vulpes storage usage and free space on the host volume. Other host applications are not included.');
          content.prepend(p);
        }
      }
      const root = document.querySelector('#root');
      if (root) for (const id of ['wifi','bluetooth','carrier','call','messaging','sim-manager','simpin',
        'findmydevice','addons','mediaStorage','applicationStorage']) {
        const li = root.querySelector('a[href="#' + id + '"]')?.closest('li');
        if (li?.hidden) li.hidden = false;
        if (li?.hasAttribute('aria-disabled')) li.removeAttribute('aria-disabled');
        const anchor = li?.querySelector('a');
        if (anchor?.hasAttribute('aria-disabled')) anchor.removeAttribute('aria-disabled');
      }
      if (capabilities.platform === 'android' && root && !document.getElementById('vulpes-android-settings')) {
        const ul = document.createElement('ul'), li = document.createElement('li'), a = document.createElement('a');
        a.id = 'vulpes-android-settings'; a.className = 'menu-item'; a.href = '#';
        localize(a, 'Paramètres Android', 'Android settings');
        a.onclick = event => {event.preventDefault();VulpesCompat.call('platform.settings',{panel:'root'}).catch(() => notice(unavailable()));};
        li.append(a); ul.append(li); root.querySelector(':scope > div')?.append(ul);
      }

      if (capabilities.platform === 'android') {
        const keyboard=document.querySelector('#keyboard > div');
        if(keyboard && !document.getElementById('vulpes-keyboard-mode')) {
          const ul=document.createElement('ul'),li=document.createElement('li'),control=document.createElement('gaia-switch'),title=document.createElement('label');
          control.id='vulpes-keyboard-mode';
          localize(title,'Clavier Gaia (expérimental)','Gaia keyboard (experimental)');
          control.append(title);li.append(control);ul.append(li);keyboard.prepend(ul);
          VulpesCompat.call('input.config',{}).then(enabled=>{control.checked=enabled;});
          control.addEventListener('change',()=>navigator.mozSettings.createLock().set({'keyboard.gaia.enabled':control.checked}).catch(console.error));
        }
      }
      if (capabilities.platform === 'android') {
        const homescreens = document.querySelector('#homescreens > div');
        if (homescreens && !document.getElementById('vulpes-default-home')) {
          const ul = document.createElement('ul'), li = document.createElement('li'), a = document.createElement('a');
          a.id = 'vulpes-default-home'; a.className = 'menu-item'; a.href = '#';
          localize(a, 'Accueil Android par défaut', 'Default Android home');
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
        localize(p, 'Vulpes OS repose sur Gaia et Gecko de Mozilla et le travail de leurs contributeurs. Capyloon fait partie des projets qui inspirent cette continuité. Les licences et attributions d’origine sont conservées.',
          'Vulpes OS builds on Mozilla Gaia and Gecko and the work of their contributors. Capyloon is among the projects inspiring this continuation. Original licenses and attributions are retained.');
        legal.append(p);
      }
    }
    new MutationObserver(restore).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden','aria-disabled','disabled']});
    restore();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => ready().catch(console.error), {once:true});
  else ready().catch(console.error);
})();
