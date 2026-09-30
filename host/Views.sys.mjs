// The desktop-only adapter for external web pages. A web page is loaded as a
// real top-level browser, never by removing CSP or frame-ancestors protection.
export const Views = {
  entries: new Map(),
  remove(id, entry) {
    const contextId = entry.topContextId;
    try {
      entry.browser.removeProgressListener(entry.listener);
    } catch (_) {} // Teardown may have detached its loader.
    entry.browser.remove();
    this.entries.delete(id);
    Services.ppmm.sharedData.set(
      'vulpes:host-contexts',
      (Services.ppmm.sharedData.get('vulpes:host-contexts') || []).filter((id) => id !== contextId),
    );
    Services.ppmm.sharedData.flush();
  },
  prune() {
    for (const [id, entry] of this.entries) {
      if (!BrowsingContext.get(id)?.parent) {
        this.remove(id, entry);
        continue;
      }
      // A detached iframe's BrowsingContext can outlive its DOM element.
      // Ask the trusted child actor about actual ownership, not just the BC tree.
      if (entry.checking) continue;
      entry.checking = true;
      entry.actor
        .sendQuery('Vulpes:ViewAlive', { contextId: id })
        .then(
          (alive) => {
            if (!alive && this.entries.get(id) === entry) this.remove(id, entry);
          },
          () => {
            if (this.entries.get(id) === entry) this.remove(id, entry);
          },
        )
        .finally(() => {
          entry.checking = false;
        });
    }
  },
  cleanup(actor) {
    for (const [id, entry] of this.entries)
      if (entry.actor === actor) {
        this.remove(id, entry);
      }
  },
  async request(actor, { contextId, operation, url, geometry }) {
    const context = BrowsingContext.get(contextId);
    if (!context || context.parent !== actor.browsingContext) throw new Error('INVALID_VIEW_OWNER');
    let entry = this.entries.get(contextId);
    if (entry && entry.actor !== actor) throw new Error('INVALID_VIEW_OWNER');
    if (operation === 'cancelTouch') {
      const target = entry ? entry.browser.browsingContext : context;
      return target.currentWindowGlobal
        .getActor('VulpesTouch')
        .sendQuery('Vulpes:CancelTouch', [
          { identifier: 0, offsetX: 0, offsetY: 0, radiiX: 1, radiiY: 1 },
        ]);
    }
    if (operation === 'capture') {
      const target = entry ? entry.browser.browsingContext : context;
      const image = await target.currentWindowGlobal.drawSnapshot(null, 1, 'white');
      const doc = actor.browsingContext.top.embedderElement.ownerDocument;
      const canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      image.close();
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }
    if (operation === 'open') {
      const uri = Services.io.newURI(url);
      if (!['http', 'https'].includes(uri.scheme)) throw new Error('URL_SCHEME_DENIED');
      if (!entry) {
        const shell = actor.browsingContext.top.embedderElement.ownerDocument.defaultView;
        const browser = shell.document.createXULElement('browser');
        browser.setAttribute('type', 'content');
        browser.setAttribute('remote', 'true');
        browser.setAttribute('remoteType', 'web');
        browser.setAttribute('maychangeremoteness', 'true');
        browser.style.cssText =
          'display:block;position:absolute;background:white;visibility:hidden';
        shell.document.getElementById('screen').append(browser);
        if (!Services.ppmm.sharedData.get('vulpes:native-touch')) {
          browser.browsingContext.inRDMPane = true;
          browser.browsingContext.setRDMPaneMaxTouchPoints(1);
          browser.browsingContext.touchEventsOverride = 'enabled';
        }
        const contexts = Services.ppmm.sharedData.get('vulpes:host-contexts') || [];
        Services.ppmm.sharedData.set(
          'vulpes:host-contexts',
          contexts.concat(browser.browsingContext.id),
        );
        Services.ppmm.sharedData.flush();
        const emit = (type, detail = {}) => {
          try {
            actor.sendAsyncMessage('Vulpes:Event', {
              type: 'view',
              data: { contextId, type, detail },
            });
          } catch (_) {}
        };
        const listener = {
          QueryInterface: ChromeUtils.generateQI([
            'nsIWebProgressListener',
            'nsISupportsWeakReference',
          ]),
          onLocationChange(progress, request, location) {
            if (!progress.isTopLevel) return;
            if (location.spec === 'about:blank') return; // Initial, uncommitted context.
            emit('locationchange', {
              url: location.spec,
              canGoBack: browser.canGoBack,
              canGoForward: browser.canGoForward,
            });
          },
          onStateChange(progress, request, flags, status) {
            if (!progress.isTopLevel || !(flags & Ci.nsIWebProgressListener.STATE_IS_WINDOW))
              return;
            if (flags & Ci.nsIWebProgressListener.STATE_START) emit('loadstart');
            if (flags & Ci.nsIWebProgressListener.STATE_STOP) {
              emit('loadend', { backgroundColor: 'rgb(255, 255, 255)' });
              emit('titlechange', browser.contentTitle || browser.currentURI.spec);
              if (!Components.isSuccessCode(status)) emit('error', { type: 'other', status });
            }
          },
          onProgressChange() {},
          onStatusChange() {},
          onSecurityChange() {},
          onContentBlockingEvent() {},
        };
        browser.addProgressListener(listener);
        entry = {
          actor,
          browser,
          listener,
          context,
          url,
          topContextId: browser.browsingContext.id,
        };
        this.entries.set(contextId, entry);
      }
      entry.url = url;
      entry.browser.loadURI(uri, {
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      });
      return null;
    }
    if (!entry) throw new Error('VIEW_NOT_FOUND');
    const browser = entry.browser;
    if (operation === 'geometry') {
      const { left, top, width, height, visible } = geometry || {};
      if (![left, top, width, height].every(Number.isFinite)) throw new Error('INVALID_GEOMETRY');
      const shell = browser.ownerDocument.defaultView,
        screen = shell.document.getElementById('screen');
      const bounds = screen.getBoundingClientRect();
      const x = left - shell.mozInnerScreenX - bounds.left;
      const y = top - shell.mozInnerScreenY - bounds.top;
      const right = Math.min(480, x + width),
        bottom = Math.min(800, y + height);
      const clippedX = Math.max(0, x),
        clippedY = Math.max(0, y);
      Object.assign(browser.style, {
        left: clippedX + 'px',
        top: clippedY + 'px',
        width: Math.max(0, right - clippedX) + 'px',
        height: Math.max(0, bottom - clippedY) + 'px',
        visibility: visible && right > clippedX && bottom > clippedY ? 'visible' : 'hidden',
      });
      return null;
    }
    if (operation === 'back') {
      if (browser.canGoBack) browser.goBack();
      return null;
    }
    if (operation === 'forward') {
      if (browser.canGoForward) browser.goForward();
      return null;
    }
    if (operation === 'reload') {
      browser.reload();
      return null;
    }
    if (operation === 'stop') {
      browser.stop();
      return null;
    }
    if (operation === 'canGoBack') return browser.canGoBack;
    if (operation === 'canGoForward') return browser.canGoForward;
    if (operation === 'close') {
      this.remove(contextId, entry);
      return null;
    }
    throw new Error('METHOD_NOT_SUPPORTED');
  },
};
