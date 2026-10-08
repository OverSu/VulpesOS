/* Extension world: the browser provides origin/tab/frame identity, never Gaia. */
(() => {
  if (location.port !== '18765' || location.hostname.startsWith('user-')) return;
  const win = window.wrappedJSObject;
  console.info('VULPES Android bridge', location.origin);
  let port;
  let reconnect;
  function connect() {
    port = browser.runtime.connect({ name: 'gaia' });
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(onDisconnect);
  }
  const pending = new Map();
  let seq = 0;
  function request(data) {
    return new window.Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      try {
        port.postMessage({ id, request: JSON.parse(JSON.stringify(data)) });
      } catch (error) {
        pending.delete(id);
        reject(new window.Error('VULPES_HOST_CLOSED'));
      }
    });
  }
  function onMessage(message) {
    if (message.event) {
      win.dispatchEvent(
        new window.CustomEvent('vulpes-service-event', { detail: cloneInto(message.event, win) }),
      );
      return;
    }
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    callback.resolve(cloneInto(message.reply, win));
  }
  function onDisconnect() {
    for (const callback of pending.values())
      callback.reject(new window.Error('VULPES_HOST_CLOSED'));
    pending.clear();
    clearTimeout(reconnect);
    reconnect = setTimeout(() => {
      try {
        connect();
      } catch (_) {
        onDisconnect();
      }
    }, 1000);
  }
  connect();
  addEventListener('unload', () => clearTimeout(reconnect));
  exportFunction(request, win.navigator, { defineAs: 'vulpesRequest' });
  const frames = new Map();
  let nextFrame = 0;
  exportFunction(
    (frame, data) => {
      if (frame.ownerDocument !== window.document || frame.localName !== 'iframe')
        throw new window.Error('INVALID_VIEW');
      let id = [...frames].find(([, f]) => f === frame)?.[0];
      if (!id) {
        id = ++nextFrame;
        frames.set(id, frame);
      }
      const params = JSON.parse(JSON.stringify(data));
      params.contextId = id;
      return request({ version: 1, id: 0, method: 'views.request', params });
    },
    win.navigator,
    { defineAs: 'vulpesFrameRequest', allowCrossOriginArguments: true },
  );
  exportFunction((id) => frames.get(id) || null, win.navigator, {
    defineAs: 'vulpesFrameForContext',
  });
})();
