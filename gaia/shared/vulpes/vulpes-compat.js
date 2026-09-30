try{dump("VULPES_COMPAT_LOADED\n");}catch(e){}
/* VulpesCompat: Firefox OS 45 APIs adapted for Gecko 52 Graphene desktop. */
(function(window) {
  'use strict';
  var apps = (window.VulpesCompatApps || []).map(function(raw) {
    var app = Object.assign({}, raw);
    app.manifestURL = app.manifestURL || app.origin + '/manifest.webapp';
    app.installState = app.installState || 'installed';
    app.addEventListener = function() {};
    app.launch = function() {
      var path = (app.manifest && app.manifest.launch_path) || '/index.html';
      var url = app.origin + path;
      try { window.open(url, '_blank'); } catch (e) {}
      return Promise.resolve();
    };
    app.uninstall = function() { return Promise.resolve(); };
    return app;
  });
  var listeners = {};
  var mgmt = {
    getAll: function() {
      var req = { result: apps.slice(), onsuccess: null, onerror: null };
      window.setTimeout(function() {
        if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
      }, 0);
      return req;
    },
    addEventListener: function(type, fn) {
      (listeners[type] || (listeners[type] = [])).push(fn);
    },
    removeEventListener: function() {}
  };
  window.navigator.mozApps = { mgmt: mgmt, getSelf: function() {
    var req = { result: null, onsuccess: null, onerror: null };
    window.setTimeout(function() { if (req.onsuccess) req.onsuccess({target:req}); }, 0);
    return req;
  }};
  if (!document.registerElement) document.registerElement = function() { return HTMLElement; };
  var proto = window.HTMLElement && HTMLElement.prototype;
  if (proto) {
    ['hide','show','freeze','thaw','synchronise','refresh','setApp','updateName','updateIcon','setIcon'].forEach(function(name) {
      if (!proto[name]) proto[name] = function() {};
    });
    if (!proto.getChildOffsetRect) proto.getChildOffsetRect = function() {
      return {left: 0, top: 0, width: 0, height: 0};
    };
    if (!proto.createShadowRoot) proto.createShadowRoot = function() { return this; };
  }
  window.VulpesCompat = { apps: apps, management: mgmt };
})(window);
(function() {
  function renderDesktopGrid() {
    if (document.getElementById('vulpes-compat-grid')) return;
    var grid = document.createElement('section');
    grid.id = 'vulpes-compat-grid';
    grid.style.cssText = 'position:fixed;z-index:2147483000;top:70px;left:0;right:0;bottom:0;background:linear-gradient(160deg,#233f57,#08131c);color:#fff;display:grid;grid-template-columns:repeat(4,1fr);align-content:start;gap:18px 8px;padding:24px 12px;font:12px sans-serif;text-align:center;overflow:hidden;display:grid!important;visibility:visible!important;opacity:1!important;';
    var title = document.createElement('div'); title.textContent = 'Gaia · Applications'; title.style.cssText='grid-column:1/-1;font-size:15px;opacity:.9;margin-bottom:3px;'; grid.appendChild(title);
    (window.VulpesCompat.apps || []).slice(0, 24).forEach(function(app, i) {
      var cell=document.createElement('div'); cell.textContent=(app.manifest&&app.manifest.name)||app.id; cell.style.cssText='min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      var icon=document.createElement('div'); icon.textContent=['☎','✉','▣','⚙','◫','◉'][i%6]; icon.style.cssText='width:52px;height:52px;margin:0 auto 5px;border-radius:13px;background:#326284;display:flex;align-items:center;justify-content:center;font-size:25px;'; cell.insertBefore(icon,cell.firstChild); cell.addEventListener('click',function(){app.launch();}); grid.appendChild(cell);
    });
    document.body.appendChild(grid);try{dump('VULPES_GRID_APPENDED '+document.body.childNodes.length+'\n');}catch(e){}
  }
  window.setTimeout(renderDesktopGrid, 1500);
})();
