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
    if (message.edit) {
      try {
        const result=editor.edit(message.edit.params);
        result.inputMode=originalModes.get(editor.inputElement) ||
          (editor.inputElement.classList.contains('recipient')?'tel':'');
        port.postMessage({editReply:message.edit.id, result});
      }
      catch (error) { port.postMessage({editReply:message.edit.id, error:String(error.message)}); }
      return;
    }
    if (message.event) {
      if(message.event.type==='input-mode') {
        inputConfigurationRevision++;
        configureInput(message.event.data.enabled===true);
      }
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
    inputConfigurationRevision++;
    configureInput(false);
    for (const callback of pending.values())
      callback.reject(new window.Error('VULPES_HOST_CLOSED'));
    pending.clear();
    clearTimeout(reconnect);
    reconnect = setTimeout(() => {
      try {
        connect();
        refreshInputConfiguration();
      } catch (_) {
        onDisconnect();
      }
    }, 1000);
  }
  const editor = new InputEditor(window);
  let gaiaKeyboard = false;
  let inputConfigurationRevision = 0;
  const originalModes = new WeakMap();
  function restoreMode() {
    const field = editor.inputElement;
    if (!field || !originalModes.has(field)) return;
    const value = originalModes.get(field);
    if (value === null) field.removeAttribute('inputmode');
    else field.setAttribute('inputmode', value);
    originalModes.delete(field);
  }
  function configureInput(enabled) {
    gaiaKeyboard = enabled;
    if(!enabled) restoreMode();
    win.VulpesNativeInput = gaiaKeyboard;
    win.dispatchEvent(new window.Event('vulpes-input-configured'));
    if(enabled && !document.hidden && document.hasFocus()) reportFocus(document.activeElement);
  }
  function refreshInputConfiguration() {
    const revision = inputConfigurationRevision;
    request({version:1,id:0,method:'input.config',params:{}}).then(reply => {
      if(revision===inputConfigurationRevision) configureInput(reply.result===true);
    }).catch(error => console.error('Gaia input configuration:', error));
  }
  function reportFocus(element) {
    if (!gaiaKeyboard || editor.editing || location.hostname === 'keyboard.localhost') return false;
    if (element?.isContentEditable) element=element.closest('[contenteditable=true]') || element;
    const editable = element?.isContentEditable ||
      (['input','textarea'].includes(element?.localName) &&
      !['button','submit','range','checkbox','radio','date','time','datetime-local','file'].includes(element.type));
    if (!editable || element.disabled || element.readOnly) {
      return false;
    }
    if (element !== editor.inputElement) restoreMode();
    editor.focus(element);
    if (!originalModes.has(element)) originalModes.set(element, element.getAttribute('inputmode'));
    // Suppress Android's IME only in this editor; external web pages keep it.
    element.setAttribute('inputmode', 'none');
    const state=editor.state();
    state.inputMode=originalModes.get(element) || (element.classList.contains('recipient')?'tel':'');
    port.postMessage({inputFocus:state});
    return true;
  }
  connect();
  refreshInputConfiguration();
  for (const type of ['focusin', 'pointerdown', 'click']) addEventListener(type, event => {
    if (!gaiaKeyboard || editor.editing || location.hostname === 'keyboard.localhost') return;
    if (!reportFocus(event.target) && type === 'click' &&
        !event.target?.closest?.('[data-vulpes-keep-input]')) port.postMessage({inputFocus:null});
  }, true);
  addEventListener('visibilitychange', () => {
    if (document.hidden && gaiaKeyboard) { restoreMode(); port.postMessage({inputFocus:null}); }
    else if (gaiaKeyboard && document.hasFocus()) reportFocus(document.activeElement);
  });
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
