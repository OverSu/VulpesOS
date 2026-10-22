import {nextKeypadTarget} from 'resource://vulpes/services/keypad-navigation.mjs';
import {KeypadText} from 'resource://vulpes/services/keypad-text.mjs';
import {InputEditor} from 'resource://vulpes/services/input-editor.mjs';

export class KeypadChild extends JSWindowActorChild {
  receiveMessage(message) {
    if (message.name === 'Vulpes:FocusBrowserToolbar') {
      if (this.document.location.hostname !== 'system.localhost') return;
      const bar = [...this.document.querySelectorAll('.chrome .urlbar')].find(element => {
        if (!element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && element.contains(this.document.elementFromPoint(
          rect.x + rect.width / 2, rect.y + rect.height / 2));
      });
      if (bar) this.select(bar);
      return;
    }
    if (message.name !== 'Vulpes:Navigate') return;
    const {key, code = '', keyCode = 0, repeat = false} = message.data;
    if (typeof key !== 'string' || key.length > 32) return;
    const document = this.document, win = this.contentWindow;
    if (key === 'F2') {
      if (!repeat) this.sendAsyncMessage('Vulpes:KeypadNotifications');
      return;
    }
    const exposed = element => {
      if (!element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return false;
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      return x >= 0 && x < win.innerWidth && y >= 0 && y < win.innerHeight &&
        element.contains(document.elementFromPoint(x, y));
    };
    this.composer ||= new KeypadText();
    if (key==='#' && !repeat) {
      this.hashHoldHandled=false;
      this.hashStartMode=this.composer.mode;
      this.hashStartReturnMode=this.composer.returnMode;
    }
    const target = document.activeElement;
    const editing = !target?.readOnly && (target?.isContentEditable || target?.localName === 'textarea' ||
      (target?.localName === 'input' && ['text','search','email','url','tel','password','number'].includes(target.type)));
    const modal = [...document.querySelectorAll('[aria-modal="true"],[data-type="confirm"],[data-type="action"]')]
      .reverse().find(exposed);
    if (!editing || modal) { this.composer.commit(); this.hint?.remove(); }
    if (modal && !this.modalAnchor && target?.localName === 'select') this.modalAnchor = target;
    if (!modal) this.modalAnchor = null;
    const browserControls = target?.closest?.('.chrome .controls');
    const inBrowserToolbar = browserControls && document.location.hostname === 'system.localhost';
    // Keep toolbar keys in Gaia; Down returns to the browser's content frame.
    if (!editing && !modal && (!inBrowserToolbar || key === 'ArrowDown')) {
      for (const frame of document.querySelectorAll('iframe')) {
        if (!frame.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
        const rect = frame.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) !== frame) continue;
        if (frame.browsingContext) {
          if (inBrowserToolbar) frame.focus();
          const browserContent = message.data.browserContent ||
            document.location.hostname === 'system.localhost' &&
            !!frame.closest('.appWindow')?.querySelector('.chrome .urlbar');
          this.sendAsyncMessage('Vulpes:KeypadRoute', {
            contextId:frame.browsingContext.id, key, code, keyCode, repeat, browserContent,
          });
          return;
        }
      }
    }
    // The Nokia's red key maps to F4; keep Gaia's own call controls.
    if (key === 'F4' || key === 'EndCall') {
      if (repeat) return;
      this.composer.commit(); this.hint?.remove();
      const hangup = [...document.querySelectorAll('#callbar-hang-up,#incoming-reject')].find(exposed);
      if (hangup && !hangup.disabled) hangup.click();
      else this.sendAsyncMessage('Vulpes:KeypadHome');
      return;
    }
    // Gaia's dial pad is touch-driven, including its own number model.
    if (!modal && document.location.hostname === 'communications.localhost' && !editing) {
      const digit = /^[0-9*#]$/.test(key) ? key : key === 'Backspace' ? 'delete' : null;
      const button = digit && document.querySelector('[role="key"][data-value="'+digit+'"]');
      if (button && exposed(button)) { this.activate(button); return; }
    }
    if (!modal && key === 'F1') {
      const button = [...document.querySelectorAll('#callbar-answer,#incoming-answer,#keypad-callbar-call-action')].find(exposed);
      if (button && !button.disabled) { button.click(); return; }
    }
    if (editing && !modal && !['Escape', 'BrowserBack', 'GoBack', 'ContextMenu', 'ArrowUp', 'ArrowDown'].includes(key)) {
      if (key==='#' && repeat && !this.hashHoldHandled &&
          Services.env.get('VULPES_DEVICE')==='beatles' && !['tel','number'].includes(target.type)) {
        this.hashHoldHandled=true;
        this.composer.setT9(this.hashStartMode!=='t9',
          this.hashStartMode==='t9' ? this.hashStartReturnMode : this.hashStartMode);
        if (this.composer.mode==='t9') this.loadT9Dictionary();
        this.showMode(target);
        return;
      }
      if (!repeat || !/^[0-9*#]$/.test(key)) this.editKey(target, key);
      return;
    }
    if (['Escape', 'BrowserBack', 'GoBack', 'Backspace'].includes(key)) {
      this.composer.commit(); this.hint?.remove();
      const addressCancel = document.querySelector('#rocketbar.active #rocketbar-cancel');
      if (addressCancel && exposed(addressCancel)) { addressCancel.click(); return; }
      const cancel = modal?.querySelector('[data-action="cancel"],button.cancel,button[data-l10n-id="cancel"]');
      if (cancel) { cancel.click(); this.modalAnchor?.focus({preventScroll:true}); return; }
      const header = [...document.querySelectorAll('gaia-header[action="back"],gaia-header[action="close"]')]
        .find(exposed);
      const back = header?.shadowRoot?.querySelector('.action-button') || header?.querySelector('.action-button') ||
        [...document.querySelectorAll('[data-action="back"],button.back,[role="button"].back')]
          .find(exposed);
      if (back) back.click();
      else this.sendAsyncMessage('Vulpes:KeypadHome');
      return;
    }
    if (key === 'ContextMenu') {
      this.sendAsyncMessage('Vulpes:KeypadCards');
      return;
    }
    if (!modal && target?.localName === 'select' && ['Enter','Accept','Select'].includes(key)) {
      target.click();
      return;
    }
    if (!modal && target?.type === 'range' && ['ArrowLeft','ArrowRight'].includes(key)) {
      key === 'ArrowLeft' ? target.stepDown() : target.stepUp();
      target.dispatchEvent(new win.Event('input', {bubbles:true}));
      target.dispatchEvent(new win.Event('change', {bubbles:true}));
      return;
    }
    this.composer.commit(); this.hint?.remove();
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!arrows.includes(key) && !['Enter', 'Accept', 'Select'].includes(key)) {
      return;
    }
    const root = modal || (inBrowserToolbar ? browserControls : document);
    const candidates = [...root.querySelectorAll('a[href],button,input,select,textarea,[contenteditable="true"],[role="button"],[role="key"],[role="tab"],[tabindex]:not([tabindex="-1"]),[data-vulpes-keypad-focus],gaia-app-icon,gaia-pin-card,gaia-switch,gaia-checkbox')];
    if (inBrowserToolbar) candidates.push(...browserControls.querySelectorAll('.urlbar'));
    for (const header of root.querySelectorAll('gaia-header'))
      candidates.push(...(header.shadowRoot?.querySelectorAll('button') || []));
    const elements = [...new Set(candidates)].filter(element => {
      const rect = element.getBoundingClientRect();
      return !element.disabled && !element.hasAttribute('disabled') && !element.readOnly && element.getAttribute('aria-disabled') !== 'true' &&
        element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) &&
        rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < win.innerWidth;
    });
    if (!elements.length) {
      if (key === 'ArrowUp' && message.data.browserContent && win.scrollY <= 0)
        this.sendAsyncMessage('Vulpes:KeypadToolbar');
      else win.scrollBy({top:key === 'ArrowUp' ? -80 : key === 'ArrowDown' ? 80 : 0});
      return;
    }
    const focused = elements.includes(document.activeElement) ? document.activeElement : null;
    const compactSelection = document.documentElement.dataset.vulpesLayout === 'compact' ?
      document.querySelector('[data-vulpes-compact-selected]') : null;
    const current = elements.indexOf(focused || compactSelection || (this.selected?.isConnected && this.selected));
    const rects = elements.map(element => {
      const rect = element.getBoundingClientRect();
      return {x:rect.x + rect.width / 2, y:rect.y + rect.height / 2};
    });
    if (!arrows.includes(key)) {
      this.activate(elements[current < 0 ? 0 : current]);
      if (modal && !modal.isConnected) this.modalAnchor?.focus({preventScroll:true});
      return;
    }
    const index = nextKeypadTarget(rects, current, key);
    if (key === 'ArrowUp' && message.data.browserContent && win.scrollY <= 0 && (current < 0 || index < 0)) {
      this.sendAsyncMessage('Vulpes:KeypadToolbar');
      return;
    }
    if (index < 0) {
      win.scrollBy({top:key === 'ArrowUp' ? -80 : key === 'ArrowDown' ? 80 : 0});
      return;
    }
    this.select(elements[index]);
  }
  select(element) {
    const document = this.document;
    if (!this.style) {
      this.style = document.createElement('style');
      this.style.textContent = '[data-vulpes-keypad-focus]{outline:2px solid #00aaff !important;outline-offset:-2px !important;}';
      document.documentElement.append(this.style);
    }
    this.composer?.commit(); this.hint?.remove();
    this.selected?.removeAttribute('data-vulpes-keypad-focus');
    this.selected = element;
    this.selected.setAttribute('data-vulpes-keypad-focus', '');
    if (!this.selected.hasAttribute('tabindex')) this.selected.setAttribute('tabindex', '-1');
    this.selected.focus({preventScroll:true});
    this.selected.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  activate(element) {
    if (element.disabled || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') return;
    if (['gaia-switch', 'gaia-checkbox'].includes(element.localName)) {
      // The component owns toggling and change events inside its shadow tree.
      // Calling the host's native click from this actor bypasses that handler.
      element.shadowRoot?.querySelector(element.localName === 'gaia-switch' ? '#switch' : '#checkbox')?.click();
      return;
    }
    if (element.getAttribute('role') === 'key' && element.hasAttribute('data-value')) {
      for (const type of ['touchstart','touchend'])
        element.dispatchEvent(new this.contentWindow.Event(type,{bubbles:true,cancelable:true}));
    } else element.click();
  }
  editKey(element, key) {
    const editor = new InputEditor(this.contentWindow);
    editor.focus(element);
    if (element.classList.contains('recipient') && ['Enter','Backspace'].includes(key)) {
      const keyCode = key === 'Enter' ? 13 : 8;
      // Gaia's recipients consume keypress, but a synthetic KeyboardEvent also
      // enters unsupported native key-binding IPC in the standalone host.
      const event = new this.contentWindow.Event('keypress', {bubbles:true,cancelable:true});
      for (const [name,value] of Object.entries({key,keyCode,which:keyCode,
        DOM_VK_BACK_SPACE:8,DOM_VK_ENTER:14,DOM_VK_TAB:9}))
        Object.defineProperty(event.wrappedJSObject,name,{value});
      if (!element.dispatchEvent(event)) { this.composer.commit(); return; }
    }
    const state = editor.state();
    const numeric = ['tel','number'].includes(state.inputType) ||
      ['tel','numeric','decimal'].includes(state.inputMode);
    if (/^[0-9*#]$/.test(key)) {
      if (this.composer.mode==='t9' && this.t9Loading && /^[2-9]$/.test(key)) {
        this.t9Queue ||= [];
        if (this.t9Queue.length<16) this.t9Queue.push(key);
        return;
      }
      const operation = this.composer.press(key, {field:element,
        text:element.isContentEditable ? element.textContent : element.value,
        start:state.selectionStart, end:state.selectionEnd, numeric});
      if (operation?.text !== undefined) {
        if (operation.replace) editor.edit({operation:'replace',offset:-operation.replace,
          length:operation.replace,text:operation.text});
        else editor.edit({operation:'key',key:operation.text});
      }
      if (operation?.mode === 't9') this.loadT9Dictionary();
      if (!numeric) this.showMode(element);
    } else {
      this.composer.commit();
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const start = key === 'ArrowLeft' ? Math.max(0, state.selectionStart - 1) :
          Math.min(state.text.length, state.selectionEnd + 1);
        editor.edit({operation:'selection', start, length:0});
      } else if (key.length === 1 || ['Backspace', 'Enter'].includes(key)) {
        editor.edit({operation:'key', key});
      }
    }
  }
  showMode(element) {
    if (!this.hint) {
      this.hint = this.document.createElement('span');
      this.hint.id = 'vulpes-keypad-mode';
      this.hint.style.cssText = 'position:fixed;right:4px;bottom:4px;z-index:2147483647;pointer-events:none;padding:2px 5px;border-radius:3px;background:#102337;color:white;font:12px sans-serif';
      this.contentWindow.addEventListener('blur', () => {
        this.composer.commit(); this.hint.remove();
      }, true);
    }
    if (this.composer.mode==='t9') {
      const french=(this.document.documentElement.lang || this.contentWindow.navigator.language || '').toLowerCase().startsWith('fr');
      this.hint.textContent=(french ? 'T9 · maintien # · * ' : 'T9 · hold # · * ')+
        (this.t9Loading ? '…' : this.composer.suggestion || '');
    } else this.hint.textContent=this.composer.mode+' · #';
    this.document.documentElement.append(this.hint);
  }
  loadT9Dictionary() {
    const win=this.contentWindow;
    const locale=(this.document.documentElement.lang || win.navigator.language || 'en').toLowerCase();
    if (this.t9Loading || this.composer.dictionary.size && this.t9Locale===locale) return;
    this.t9Loading=true;
    this.composer.dictionary=new Map();
    const choices=[locale,locale.split('-')[0]];
    if (locale==='en-us') choices.unshift('en_us');
    if (locale==='en-gb') choices.unshift('en_gb');
    if (locale==='pt-br') choices.unshift('pt_br');
    if (locale==='pt-pt') choices.unshift('pt_pt');
    const root=Services.env.get('VULPES_WORKSPACE_ROOT');
    if (!root) { this.t9Loading=false; return; }
    this.t9Field=this.document.activeElement;
    const {IOUtils}=ChromeUtils.importESModule('resource://gre/modules/IOUtils.sys.mjs');
    (async()=>{
      for (const language of choices) {
        if (!/^(?:[a-z]{2,3}(?:_[a-z]{2}|-[a-z]{2}|-latn|-cyrl)?)$/.test(language)) continue;
        try {
          const bytes=await IOUtils.read(root+'/tundra/devices/beatles/t9/'+language+'.tsv');
          this.composer.setDictionary(new TextDecoder().decode(bytes));
          if (this.composer.dictionary.size) { this.t9Locale=locale; break; }
        } catch (_) {}
      }
      this.t9Loading=false;
      if (this.hint?.isConnected) this.showMode(this.document.activeElement);
      if (this.document.activeElement===this.t9Field) {
        for (const key of this.t9Queue || []) this.editKey(this.t9Field,key);
      }
      this.t9Queue=[];
    })();
  }
}
