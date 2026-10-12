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
