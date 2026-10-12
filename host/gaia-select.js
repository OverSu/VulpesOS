// Gaia's value-selector markup and stylesheet, without a browser-chrome popup.
(() => {
  let active;
  function close(commit) {
    if (!active) return;
    const {select, wrapper, chosen} = active;
    active = null;
    if (commit && select.isConnected && !select.disabled) {
      const before = [...select.options].map(o => o.selected).join(',');
      [...select.options].forEach((o, i) => { o.selected = chosen.has(i); });
      if (before !== [...select.options].map(o => o.selected).join(',')) {
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }
    wrapper.remove();
    // Several original panels commit modem settings on blur.
    select.blur();
  }
  function open(select) {
    if (select.disabled || select.closest('[aria-disabled="true"]')) return;
    close(false);
    if (!document.querySelector('[data-vulpes-select-style]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.dataset.vulpesSelectStyle = '';
      link.href = `${location.protocol}//system.localhost:${location.port}/shared/style/value_selector.css`;
      document.head.append(link);
    }
    const wrapper = document.createElement('div'); wrapper.className = 'value-selector';
    wrapper.id = 'vulpes-value-selector-layer';
    const form = document.createElement('form');
    form.id = 'vulpes-value-selector'; form.role = 'dialog';
    form.dataset.type = 'value-selector'; form.setAttribute('aria-modal', 'true');
    form.innerHTML = '<section><h1 id="vulpes-select-title"></h1><ol role="listbox"></ol></section><menu class="value-selector-buttons"><button type="button" data-action="cancel"></button><button type="submit" class="affirmative" data-action="confirm">OK</button></menu>';
    form.setAttribute('aria-labelledby', 'vulpes-select-title');
    const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
    form.querySelector('[data-action="cancel"]').textContent = fr ? 'Annuler' : 'Cancel';
    form.querySelector('h1').textContent = document.getElementById(select.getAttribute('aria-labelledby'))?.textContent || select.closest('li')?.querySelector('span[data-l10n-id],label,p')?.textContent || (fr ? 'Choisir une option' : 'Choose an option');
    const chosen = new Set([...select.options].flatMap((o,i) => o.selected ? [i] : []));
    const list = form.querySelector('ol');
    if (select.multiple) list.setAttribute('aria-multiselectable', 'true');
    [...select.children].forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        const heading = document.createElement('li'); heading.role = 'subheader';
        heading.textContent = child.label; list.append(heading);
      }
      for (const option of child.tagName === 'OPTGROUP' ? child.children : [child]) {
        const i = [...select.options].indexOf(option);
        if (i < 0 || option.hidden) continue;
        const li = document.createElement('li'); li.role = 'option'; li.tabIndex = 0;
        li.dataset.index = i; li.dataset.value = option.value;
        li.setAttribute('aria-selected', String(chosen.has(i)));
        const disabled = option.disabled || option.parentElement.disabled === true;
        li.setAttribute('aria-disabled', String(disabled));
        const label = document.createElement('label'), span = document.createElement('span');
        label.role = 'presentation'; span.textContent = option.textContent;
        label.append(span); li.append(label); list.append(li);
        const pick = () => {
          if (disabled) return;
          if (!select.multiple) chosen.clear();
          if (select.multiple && chosen.has(i)) chosen.delete(i); else chosen.add(i);
          list.querySelectorAll('[role="option"]').forEach(n => n.setAttribute('aria-selected', String(chosen.has(Number(n.dataset.index)))));
        };
        li.onclick = pick;
        li.onkeydown = event => { if (['Enter',' '].includes(event.key)) {event.preventDefault();pick();} };
      }
    });
    active = {select, form, wrapper, chosen};
    select.focus({preventScroll:true});
    form.onsubmit = event => {event.preventDefault();close(true);};
    form.querySelector('[data-action="cancel"]').onclick = () => close(false);
    wrapper.append(form); document.body.append(wrapper);
  }
  // Gecko's embedded native select may consume the compatibility click.
  // Open on a completed tap too, without treating a scroll or a hold as a tap.
  let gesture, recentTap;
  addEventListener('touchstart', event => {
    const select=event.target;
    if (select.tagName !== 'SELECT' || select.size > 1 || event.touches.length !== 1) {gesture=null;return;}
    const point=event.touches[0];
    gesture={select,id:point.identifier,x:point.clientX,y:point.clientY,moved:false,at:performance.now()};
  },{capture:true,passive:true});
  addEventListener('touchmove', event => {
    if (!gesture) return;
    const point=[...event.touches].find(p=>p.identifier===gesture.id);
    if (!point || event.touches.length!==1 || Math.hypot(point.clientX-gesture.x,point.clientY-gesture.y)>10) gesture.moved=true;
  },{capture:true,passive:true});
  addEventListener('touchcancel',()=>{gesture=null;},{capture:true,passive:true});
  addEventListener('touchend', event => {
    const tap=gesture;gesture=null;
    if (!tap || tap.moved || performance.now()-tap.at>600 || event.touches.length) return;
    const point=[...event.changedTouches].find(p=>p.identifier===tap.id);
    if (!point || Math.hypot(point.clientX-tap.x,point.clientY-tap.y)>10) return;
    event.preventDefault();event.stopImmediatePropagation();
    recentTap={select:tap.select,at:performance.now()};open(tap.select);
  },{capture:true,passive:false});
  // Cancel the browser-chrome popup. Mouse and keyboard activation use Gaia too.
  for (const type of ['mousedown','pointerdown']) addEventListener(type, event => {
    if (event.target.tagName === 'SELECT' && event.target.size <= 1) event.preventDefault();
  }, true);
  addEventListener('click', event => {
    if (event.target.tagName !== 'SELECT' || event.target.size > 1) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (recentTap?.select===event.target && performance.now()-recentTap.at<700) return;
    open(event.target);
  }, true);
  addEventListener('keydown', event => {
    if (active && event.key === 'Escape') {event.preventDefault();close(false);}
    else if (event.target.tagName === 'SELECT' && [' ','Enter','ArrowDown'].includes(event.key)) {
      event.preventDefault();open(event.target);
    }
  }, true);
  addEventListener('pagehide', () => close(false));
  document.addEventListener('visibilitychange', () => {if (document.hidden) close(false);});
  addEventListener('panelready', event => {
    // A late transition event for the same panel must not dismiss a menu
    // opened immediately after navigation. Leaving the panel still cancels it.
    if (active && event.detail?.current !== '#' + active.select.closest('section')?.id) close(false);
  });
})();

// Date/time pickers still belong to Gaia System. Embedded Gecko does not
// provide the retired mozInputMethod value-selector events for these inputs.
(() => {
  const systemOrigin = 'http://system.localhost:8765';
  if (location.origin === systemOrigin) {
    addEventListener('message', event => {
      if (event.data?.type === 'vulpes-keyboard-close' && event.origin === 'http://keyboard.localhost:8765') {
        const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===event.source && f.src.startsWith(event.origin+'/settings.html'));
        if(frame) {
          const keyboard=Service.query('getApp',event.origin);
          const close=()=>frame.isConnected && frame.dispatchEvent(new CustomEvent('mozbrowserclose',{bubbles:true}));
          // Closing a still-transitioning background window can send Gaia
          // Home over the application which has just replaced it.
          if(keyboard?.isActive())keyboard.element.addEventListener('_closed',close,{once:true});
          else close();
        }
        return;
      }
      const app = window.Service?.query('getActiveApp');
      if (!app || event.source !== app.iframe?.contentWindow || event.origin !== app.origin) return;
      if (event.data?.type !== 'vulpes-datetime-open' || !['date','time'].includes(event.data.inputType)) return;
      const picker = app.valueSelector;
      if (!picker) return;
      const previous = picker._im;
      const reply = value => event.source.postMessage({type:'vulpes-datetime-result', id:event.data.id, value}, event.origin);
      picker._im = {
        setValue: value => reply(value),
        removeFocus() { reply(null); picker._im = previous; }
      };
      picker.handleEvent({type:'_inputfocus', detail:{inputType:event.data.inputType,
        value:String(event.data.value || '').slice(0,32), min:event.data.min, max:event.data.max}});
    });
    return;
  }
  if (location.hostname === 'keyboard.localhost' && /settings/.test(location.pathname)) {
    window.close = () => parent.postMessage({type:'vulpes-keyboard-close'}, systemOrigin);
  }
  let pending, sequence=0;
  addEventListener('click', event => {
    const input=event.target;
    if (input.tagName !== 'INPUT' || !['date','time'].includes(input.type) || input.disabled || input.readOnly) return;
    event.preventDefault();event.stopImmediatePropagation();
    pending={input,id:++sequence};
    parent.postMessage({type:'vulpes-datetime-open',id:sequence,inputType:input.type,
      value:input.value,min:input.min,max:input.max},systemOrigin);
  },true);
  addEventListener('message', event => {
    if(event.source!==parent || event.origin!==systemOrigin || event.data?.type!=='vulpes-datetime-result' || event.data.id!==pending?.id)return;
    const {input}=pending;pending=null;
    if(event.data.value!==null && input.isConnected && !input.disabled) {
      input.value=event.data.value;
      if(input.value) {
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    input.blur();
  });
})();

// Modern native select text metrics differ from Gaia's 4rem button box.
// Keep the real select for interaction and accessibility, and paint its label
// in a regular line box so Fira's descenders are not clipped by the control.
(() => {
  const labels=new WeakMap();
  function refresh() {
    for(const select of document.querySelectorAll('.button select,.bb-button select')) {
      if(select.multiple || select.size>1)continue;
      let label=labels.get(select);
      if(!label) {
        label=document.createElement('span');label.className='vulpes-select-label';
        label.setAttribute('aria-hidden','true');select.after(label);labels.set(select,label);
        select.classList.add('vulpes-select-label-owner');
        select.addEventListener('change',refresh);
      }
      const text=select.selectedOptions[0]?.textContent || '';
      if(label.textContent!==text)label.textContent=text;
    }
  }
  let queued=false;
  new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;refresh();});}})
    .observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['selected','value']});
  addEventListener('panelready',refresh);addEventListener('localized',refresh);
  refresh();
})();
