// Shared appearance preference; external browser pages are not injected.
(() => {
  const key = 'vulpes.theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let mode = 'light', select;
  function apply(value) {
    mode = ['light', 'dark', 'system'].includes(value) ? value : 'light';
    document.documentElement.dataset.vulpesTheme =
      mode === 'system' ? (system.matches ? 'dark' : 'light') : mode;
    if (select) select.value = mode;
  }
  system.addEventListener('change', () => apply(mode));
  addEventListener('vulpes-service-event', ({detail}) => {
    if (detail.type === 'settingchange' && detail.data.key === key) apply(detail.data.value);
  });
  VulpesCompat.call('appearance.current', {}).then(apply).catch(console.error);

  if (location.hostname !== 'settings.localhost') return;
  function label() {
    const lang = document.documentElement.lang || navigator.language;
    const labels = lang.startsWith('fr') ? ['Apparence', 'Clair', 'Sombre', 'Selon le système'] :
      lang.startsWith('el') ? ['Εμφάνιση', 'Φωτεινό', 'Σκοτεινό', 'Σύμφωνα με το σύστημα'] :
      ['Appearance', 'Light', 'Dark', 'Follow system'];
    const title = document.getElementById('vulpes-theme-label');
    if (title && title.textContent !== labels[0]) title.textContent = labels[0];
    if (select) [...select.options].forEach((option, i) => {
      if (option.textContent !== labels[i + 1]) option.textContent = labels[i + 1];
    });
  }
  function insert() {
    const list = document.querySelector('#display > div > ul');
    if (!list || select?.isConnected) return;
    const row = document.createElement('li'), title = document.createElement('p');
    row.id = 'vulpes-theme-row';
    title.id = 'vulpes-theme-label';
    const wrapper = document.createElement('span');
    wrapper.className = 'button icon icon-dialog';
    select = document.createElement('select');
    select.id = 'vulpes-theme';
    select.setAttribute('aria-labelledby', title.id);
    for (const value of ['light', 'dark', 'system']) {
      const option = document.createElement('option');
      option.value = value; select.append(option);
    }
    select.value = mode;
    select.onchange = async () => {
      select.disabled = true;
      try { await navigator.mozSettings.createLock().set({[key]:select.value}); }
      catch (error) { select.value = mode; console.error(error); }
      finally { select.disabled = false; }
    };
    wrapper.append(select); row.append(title, wrapper); list.append(row); label();
  }
  addEventListener('localized', label);
  new MutationObserver(() => { insert(); label(); }).observe(document.documentElement,
    {childList:true, subtree:true, attributes:true, attributeFilter:['lang']});
  insert();
})();


// Compact is a user preference, with a keypad-device default supplied by the host.
(() => {
  const key = 'vulpes.layout';
  let mode = 'auto', compactDefault = false, select;
  function apply(value) {
    mode = ['auto', 'compact', 'standard'].includes(value) ? value : 'auto';
    const compact = mode === 'compact' || (mode === 'auto' && compactDefault);
    document.documentElement.dataset.vulpesLayout = compact ? 'compact' : 'standard';
    if (select) select.value = mode;
    // Gaia caches grid coordinates; switching layout also invalidates that cache.
    requestAnimationFrame(() => {
      const apps = window.appWindow?.apps;
      if (!apps?.icons) return;
      if (compact) {
        window.appWindow.panels.scrollLeft = 0;
        window.appWindow.updatePanelIndicator();
      }
      apps._iconSize = 0;
      apps.icons.synchronise();
      apps.refreshGridSize();
    });
  }
  addEventListener('vulpes-service-event', ({detail}) => {
    if (detail.type === 'settingchange' && detail.data.key === key) apply(detail.data.value);
  });
  VulpesCompat.call('layout.current', {}).then(value => {
    compactDefault = value.compactDefault;
    document.documentElement.dataset.vulpesMotion = value.reducedMotion ? 'reduced' : 'standard';
    if (value.reducedMotion) {
      // Preserve animationend callbacks used by Gaia, and leave busy indicators running.
      const shorten = animations => {
        for (const animation of animations) {
          const timing = animation.effect?.getTiming();
          if (timing && Number.isFinite(timing.iterations) && animation.playState !== 'finished')
            animation.effect.updateTiming({duration:1, delay:0, endDelay:0});
        }
      };
      document.addEventListener('animationstart', event => shorten(event.target.getAnimations()), true);
      shorten(document.getAnimations());
    }
    apply(value.mode);
  }).catch(console.error);

  if (location.hostname !== 'settings.localhost') return;
  function label() {
    const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
    const labels = fr ? ['Mode compact', 'Automatique', 'Activé', 'Désactivé'] :
      ['Compact mode', 'Automatic', 'On', 'Off'];
    const title = document.getElementById('vulpes-layout-label');
    if (title && title.textContent !== labels[0]) title.textContent = labels[0];
    if (select) [...select.options].forEach((option, i) => {
      if (option.textContent !== labels[i + 1]) option.textContent = labels[i + 1];
    });
  }
  function insert() {
    const list = document.querySelector('#display > div > ul');
    if (!list || select?.isConnected) return;
    const row = document.createElement('li'), title = document.createElement('p');
    row.id = 'vulpes-layout-row'; title.id = 'vulpes-layout-label';
    const wrapper = document.createElement('span');
    wrapper.className = 'button icon icon-dialog';
    select = document.createElement('select'); select.id = 'vulpes-layout';
    select.setAttribute('aria-labelledby', title.id);
    for (const value of ['auto', 'compact', 'standard']) {
      const option = document.createElement('option'); option.value = value; select.append(option);
    }
    select.value = mode;
    select.onchange = async () => {
      select.disabled = true;
      try { await navigator.mozSettings.createLock().set({[key]:select.value}); }
      catch (error) { select.value = mode; console.error(error); }
      finally { select.disabled = false; }
    };
    wrapper.append(select); row.append(title, wrapper); list.append(row); label();
  }
  addEventListener('localized', label);
  new MutationObserver(() => { insert(); label(); }).observe(document.documentElement,
    {childList:true, subtree:true, attributes:true, attributeFilter:['lang']});
  insert();
})();


// One readable application name above the compact grid, including keypad focus.
(() => {
  if (location.hostname !== 'homescreen.localhost') return;
  let heading, selected, grid;
  const nameObserver = new MutationObserver(updateName);
  function updateName() {
    if (!heading || !selected) return;
    const name = selected._subtitle?.textContent || selected.getAttribute('aria-label') || '';
    if (heading.textContent !== name) heading.textContent = name;
  }
  function choose(icon) {
    if (!icon || !grid?.contains(icon)) return;
    if (selected !== icon) {
      selected?.removeAttribute('data-vulpes-compact-selected');
      selected?.removeAttribute('data-vulpes-keypad-focus');
      selected = icon;
      selected.setAttribute('data-vulpes-compact-selected', '');
      nameObserver.disconnect();
      if (selected.shadowRoot) nameObserver.observe(selected.shadowRoot,
        {childList:true, subtree:true, characterData:true});
    }
    updateName();
  }
  function refresh() {
    const focus = grid?.querySelector('gaia-app-icon[data-vulpes-keypad-focus]');
    choose(focus || (selected?.isConnected && selected) || grid?.querySelector('gaia-app-icon'));
  }
  function init() {
    grid = document.getElementById('apps');
    if (!grid) return;
    heading = document.createElement('div');
    heading.id = 'vulpes-compact-app-name';
    heading.setAttribute('aria-live', 'polite');
    heading.setAttribute('aria-atomic', 'true');
    document.body.insertBefore(heading, document.getElementById('panels'));
    new MutationObserver(refresh).observe(grid,
      {childList:true, subtree:true, attributes:true, attributeFilter:['data-vulpes-keypad-focus']});
    for (const type of ['focus', 'pointerdown', 'pointerover']) grid.addEventListener(type, event => {
      choose(event.target.closest('gaia-app-icon'));
    }, true);
    addEventListener('localized', updateName);
    refresh();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

// Cover-screen preferences live in the shared settings store, like appearance.
(() => {
  if (location.hostname !== 'settings.localhost') return;
  VulpesCompat.call('layout.current', {}).then(async capabilities => {
    if (!capabilities.coverScreen) return;
    const defaults = {'vulpes.cover.title':'VULPES', 'vulpes.cover.titleColor':'#33a6ff',
      'vulpes.cover.batteryColor':'#33a6ff'};
    const values = {...defaults}, controls = {};
    const colors = ['#33a6ff', '#ffffff', '#4ade80', '#fbbf24', '#f472b6',
      '#ef4444', '#f97316', '#a855f7', '#22d3ee', '#14b8a6', '#9ca3af'];
    const result = await navigator.mozSettings.createLock().get('*');
    for (const key of Object.keys(defaults)) if (typeof result[key] === 'string') values[key] = result[key];
    let row, title, previewTitle, previewBattery;
    function labels() {
      const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
      if (!row) return;
      title.textContent = fr ? 'Écran extérieur' : 'Cover screen';
      const texts = fr ? ['Texte', 'Couleur du texte', 'Couleur de la batterie'] :
        ['Text', 'Text colour', 'Battery colour'];
      const names = fr ? ['Bleu', 'Blanc', 'Vert', 'Jaune', 'Rose', 'Rouge', 'Orange', 'Violet', 'Cyan', 'Turquoise', 'Gris'] :
        ['Blue', 'White', 'Green', 'Yellow', 'Pink', 'Red', 'Orange', 'Purple', 'Cyan', 'Turquoise', 'Grey'];
      Object.keys(defaults).forEach((key, index) => {
        const control = controls[key];
        control.previousElementSibling.textContent = texts[index];
        if (control.options) [...control.options].forEach((option, i) => option.textContent = names[i]);
      });
      previewBattery.textContent = fr ? 'Batterie · aperçu' : 'Battery · preview';
    }
    function preview() {
      previewTitle.textContent = controls['vulpes.cover.title'].value.trim() || 'VULPES';
      previewTitle.style.color = controls['vulpes.cover.titleColor'].value;
      previewBattery.style.color = controls['vulpes.cover.batteryColor'].value;
    }
    function insert() {
      const list = document.querySelector('#display > div > ul');
      if (!list || row?.isConnected) return;
      row = document.createElement('li'); row.id = 'vulpes-cover-settings';
      title = document.createElement('h2'); row.append(title);
      for (const key of Object.keys(defaults)) {
        const label = document.createElement('label'), caption = document.createElement('span');
        const control = document.createElement(key.endsWith('.title') ? 'input' : 'select');
        control.id = key.replaceAll('.', '-'); label.htmlFor = control.id;
        if (control.localName === 'input') {control.type = 'text'; control.maxLength = 24;}
        else for (const color of colors) {
          const option = document.createElement('option'); option.value = color; control.append(option);
        }
        control.value = values[key];
        if (control.localName === 'select' && !colors.includes(values[key])) control.value = defaults[key];
        controls[key] = control;
        let pending, writes = Promise.resolve();
        const save = () => {
          clearTimeout(pending);
          preview();
          const value = control.value.trim() || defaults[key];
          writes = writes.then(async () => {
            await navigator.mozSettings.createLock().set({[key]:value});
            values[key] = value;
          }).catch(console.error);
          return writes;
        };
        control.oninput = () => {
          preview();
          // Keypad edits emit input; closing the lid need not blur the field.
          if (control.localName === 'input') {
            clearTimeout(pending); pending = setTimeout(save, 250);
          }
        };
        control.onchange = save;
        control.onblur = save;
        label.append(caption, control); row.append(label);
      }
      const sample = document.createElement('div'); sample.className = 'vulpes-cover-preview';
      previewTitle = document.createElement('div'); previewBattery = document.createElement('div');
      sample.append(previewTitle, previewBattery); row.append(sample); list.append(row); labels(); preview();
    }
    new MutationObserver(insert).observe(document.documentElement, {childList:true, subtree:true});
    addEventListener('localized', labels); insert();
  }).catch(console.error);
})();
