// Legacy <style scoped> using native CSS @scope. Resolve imports before scoping
// so rules cannot leak into unrelated Gaia elements while a stylesheet loads.
(() => {
  // Generic sans-serif resolved to Noto on desktop and Fira on Sargo. Use the
  // bundled Gaia face in text rules, without changing icon font declarations.
  function textFonts() {
    const visit = sheet => {
      let rules;
      try { rules = sheet.cssRules; } catch (_) { return; }
      for (const rule of rules) {
        if (rule.styleSheet) visit(rule.styleSheet);
        if (rule.cssRules) visit(rule);
        const style = rule.style;
        if (!style?.fontFamily || /gaia-icons|fontawesome/i.test(style.fontFamily)) continue;
        const families = style.fontFamily.split(',').map(s=>s.trim());
        if (families[0] === 'FiraSans' || families[0] === '"FiraSans"') continue;
        const updated = families.map(f => /^(sans-serif|["']?Fira Sans["']?)$/i.test(f) ? 'FiraSans' : f).join(', ');
        if (updated !== style.fontFamily) style.setProperty('font-family', updated, style.getPropertyPriority('font-family'));
      }
    };
    const walk = root => {
      observeFonts(root);
      for (const sheet of root.styleSheets || []) visit(sheet);
      for (const sheet of root.adoptedStyleSheets || []) visit(sheet);
      for (const element of root.querySelectorAll('*')) {
        if (element.shadowRoot) walk(element.shadowRoot);
      }
    };
    walk(document);
  }
  let fontsScheduled = false;
  function scheduleFonts() {
    if (fontsScheduled) return;
    fontsScheduled = true;
    requestAnimationFrame(() => { fontsScheduled = false; textFonts(); });
  }
  addEventListener('load', event => { if (event.target === document || event.target?.localName === 'link') scheduleFonts(); }, true);
  const observedRoots = new WeakSet();
  function observeFonts(root) {
    if (observedRoots.has(root)) return;
    observedRoots.add(root);
    new MutationObserver(records => {
      if (records.some(r => r.target.localName === 'style' || r.addedNodes.length)) scheduleFonts();
    }).observe(root,{childList:true,subtree:true});
    root.addEventListener('load', scheduleFonts, true);
  }
  observeFonts(document);
  const pending = new WeakSet();
  let sequence = 0;
  async function expand(css, base, seen = new Set()) {
    css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (all, q, url) =>
      url.startsWith('data:') ? all : 'url(' + JSON.stringify(new URL(url, base).href) + ')',
    );
    // Work on the rewritten imports to preserve relative URLs from each file.
    for (const match of [
      ...css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s);]+)["']?\s*\)?\s*;/g),
    ]) {
      const url = new URL(match[1], base).href;
      if (seen.has(url)) {
        css = css.replace(match[0], '');
        continue;
      }
      seen.add(url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Scoped stylesheet: ' + url);
      css = css.replace(match[0], await expand(await response.text(), url, seen));
    }
    return css;
  }
  // ComponentUtils used to copy a scoped sheet into its shadow tree. A scope
  // rooted on the light-DOM host cannot match inside a modern shadow root.
  window.VulpesCompat.componentStyle = async function (owner, base) {
    owner.style.visibility = 'hidden';
    try {
      const url = new URL(base + 'style.css', document.baseURI).href;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Component stylesheet: ' + url);
      const text = await expand(await response.text(), url);
      const light = document.createElement('style');
      light.setAttribute('scoped', '');
      light.textContent = text;
      owner.append(light);
      if (owner.shadowRoot) {
        const shadow = document.createElement('style');
        const tag = new RegExp('(?<![\\w-])' + owner.localName + '(?![\\w-])', 'g');
        shadow.textContent = text.replace(tag, ':host');
        owner.shadowRoot.append(shadow);
      }
      scheduleFonts();
    } finally {
      owner.style.visibility = '';
    }
  };
  function scan(root) {
    for (const style of root.querySelectorAll('style[scoped]')) {
      if (pending.has(style)) continue;
      pending.add(style);
      const owner = style.parentElement;
      if (!owner) continue;
      const css = style.textContent;
      style.type = 'text/vulpes-scoped';
      const id = owner.getAttribute('data-vulpes-scope') || 's' + ++sequence;
      owner.setAttribute('data-vulpes-scope', id);
      expand(css, document.baseURI)
        .then((text) => {
          // @scope excludes implicit matching of its root; explicitly target
          // the component itself as well as its light DOM descendants.
          const tag = new RegExp('(?<![\\w-])' + owner.localName + '(?![\\w-])', 'g');
          // Only a custom element's type selector names the scope root. A div
          // scope still contains ordinary div descendants (notably Lockscreen).
          if (owner.localName.includes('-')) text = text.replace(tag, ':scope');
          text = text.replace(/\.-(?:host|content)(?![\w-])/g, (match) => ':scope' + match);
          style.textContent = '@scope ([data-vulpes-scope="' + id + '"]) {' + text + '}';
          style.removeAttribute('scoped');
          style.type = 'text/css';
        })
        .catch(console.error);
    }
  }
  new MutationObserver(() => scan(document)).observe(document, { childList: true, subtree: true });
})();
