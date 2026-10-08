export class VulpesChild extends JSWindowActorChild {
  handleEvent(event) {
    if(['focusin','pointerdown'].includes(event.type)) {
      if(this.editing) return;
      if(!Services.cpmm.sharedData.get('vulpes:native-input')) return;
      let element=event.target;
      if(element?.isContentEditable) element=element.closest('[contenteditable=true]') || element;
      const editable=element?.isContentEditable || (['input','textarea'].includes(element?.localName) && !['button','submit','range','checkbox','radio','date','time','datetime-local','file'].includes(element.type));
      if(!editable || element.disabled || element.readOnly) {
        if(event.type==='pointerdown') this.sendAsyncMessage('Vulpes:InputFocus',null);
        return;
      }
      this.inputElement=element;
      this.sendAsyncMessage('Vulpes:InputFocus',this.inputState());
      return;
    }
    if (event.type !== 'DOMDocElementInserted') return;
    const win = this.contentWindow;
    const request = (data) =>
      new win.Promise((resolve, reject) => {
        try {
          this.sendQuery('Vulpes:Request', Cu.cloneInto(data, {})).then(
            (value) => resolve(Cu.cloneInto(value, win)),
            () => reject(new win.DOMException('The host connection closed', 'AbortError')),
          );
        } catch (_) {
          reject(new win.DOMException('Invalid message', 'DataCloneError'));
        }
      });
    Cu.exportFunction(request, win.navigator, { defineAs: 'vulpesRequest' });
    Cu.exportFunction(
      (frame, data) => {
        const native = Cu.unwaiveXrays(frame);
        if (native.ownerDocument !== this.document || native.localName !== 'iframe')
          throw new win.DOMException('Invalid view', 'SecurityError');
        const params = Cu.cloneInto(data, {});
        params.contextId = native.browsingContext.id;
        if (params.operation === 'geometry') {
          const rect = native.getBoundingClientRect();
          const samples = [
            [0.5, 0.5],
            [0.05, 0.05],
            [0.95, 0.05],
            [0.05, 0.95],
            [0.95, 0.95],
          ];
          const unobscured = samples.every(
            ([x, y]) =>
              this.document.elementFromPoint(
                rect.left + rect.width * x,
                rect.top + rect.height * y,
              ) === native,
          );
          params.geometry = {
            left: rect.left + win.mozInnerScreenX,
            top: rect.top + win.mozInnerScreenY,
            width: rect.width,
            height: rect.height,
            visible:
              unobscured &&
              native.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
          };
        }
        return request(Cu.cloneInto({ version: 1, id: 0, method: 'views.request', params }, win));
      },
      win.navigator,
      { defineAs: 'vulpesFrameRequest', allowCrossOriginArguments: true },
    );
    Cu.exportFunction(
      (id) => {
        for (const frame of this.document.querySelectorAll('iframe'))
          if (frame.browsingContext?.id === id) return frame;
        return null;
      },
      win.navigator,
      { defineAs: 'vulpesFrameForContext' },
    );
  }
  inputState() {
    const e=this.inputElement;
    const text=e.isContentEditable ? e.textContent : e.value;
    const selection=this.contentWindow.getSelection();
    let start=e.selectionStart ?? text.length, end=e.selectionEnd ?? start;
    if(e.isContentEditable && selection.rangeCount && e.contains(selection.anchorNode)) {
      const range=this.document.createRange();range.selectNodeContents(e);
      range.setEnd(selection.anchorNode,selection.anchorOffset);start=range.toString().length;
      range.setEnd(selection.focusNode,selection.focusOffset);end=range.toString().length;
      [start,end]=[Math.min(start,end),Math.max(start,end)];
    }
    return {type:e.isContentEditable?'contenteditable':e.localName,inputType:e.type || (e.classList.contains('recipient')?'tel':'text'),
      inputMode:e.inputMode || (e.classList.contains('recipient')?'tel':''),
      text:e.type==='password'?'':text,selectionStart:start,selectionEnd:end};
  }
  edit(p) {
    const e=this.inputElement,win=this.contentWindow;
    if(!e?.isConnected || this.document.hidden) throw Error('INPUT_CONTEXT_EXPIRED');
    this.editing=true;
    try {e.focus();} finally {this.editing=false;}
    // A touch can focus a new contenteditable while Gecko retains the previous
    // field's selection. execCommand follows that selection, not activeElement.
    if(e.isContentEditable) {
      const selection=win.getSelection();
      if(!e.contains(selection.anchorNode) || !e.contains(selection.focusNode)) {
        const range=this.document.createRange();
        range.selectNodeContents(e);range.collapse(false);
        selection.removeAllRanges();selection.addRange(range);
      }
    }
    if(p.operation==='key') {
      let key=typeof p.key==='object'?p.key.key:p.key;
      if(key===8 || key==='Backspace') this.document.execCommand('delete');
      else if(key===13 || key==='Enter') {
        const options={key:'Enter',code:'Enter',keyCode:13,charCode:13,which:13,bubbles:true,cancelable:true};
        const accepted=e.dispatchEvent(new win.KeyboardEvent('keydown',options)) && e.dispatchEvent(new win.KeyboardEvent('keypress',options));
        if(accepted && (e.isContentEditable || e.localName==='textarea')) this.document.execCommand('insertLineBreak');
        e.dispatchEvent(new win.KeyboardEvent('keyup',options));
      } else {
        const text=typeof key==='string'?key:String.fromCodePoint(p.charCode || key);
        if(text.length>16) throw Error('INVALID_VALUE');
        this.document.execCommand('insertText',false,text);
      }
    } else if(['selection','replace'].includes(p.operation)) {
      const state=this.inputState();
      const start=p.operation==='selection'?p.start:state.selectionStart+(p.offset||0);
      const length=p.length||0;
      if(!Number.isInteger(start)||!Number.isInteger(length)||start<0||length<0||start+length>(e.value ?? e.textContent).length) throw Error('INVALID_VALUE');
      if(e.isContentEditable) {
        const walker=this.document.createTreeWalker(e,win.NodeFilter.SHOW_TEXT);
        const points=[];let offset=0,node;
        while((node=walker.nextNode())) {points.push({node,start:offset,end:offset+node.length});offset+=node.length;}
        const point=index=>{const part=points.find(p=>index<=p.end);return part?[part.node,index-part.start]:[e,0];};
        const range=this.document.createRange();range.setStart(...point(start));range.setEnd(...point(start+length));
        win.getSelection().removeAllRanges();win.getSelection().addRange(range);
      } else e.setSelectionRange(start,start+length);
      if(p.operation==='replace') {
        if(typeof p.text!=='string'||p.text.length>4096) throw Error('INVALID_VALUE');
        this.document.execCommand('insertText',false,p.text);
      }
    } else throw Error('METHOD_NOT_SUPPORTED');
    return this.inputState();
  }
  receiveMessage(message) {
    if(message.name==='Vulpes:Edit') return this.edit(message.data);
    if (message.name === 'Vulpes:ViewState') {
      const frame = Array.from(this.document.querySelectorAll('iframe')).find(
        f => f.browsingContext?.id === message.data.contextId);
      if (!frame?.isConnected) return {visible:false};
      const win = this.contentWindow, rect = frame.getBoundingClientRect();
      const visible = !this.document.hidden && frame.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) &&
        [[.5,.5],[.05,.05],[.95,.05],[.05,.95],[.95,.95]].every(([x,y]) =>
          this.document.elementFromPoint(rect.left+rect.width*x,rect.top+rect.height*y)===frame);
      let top = Math.max(0,rect.top);
      // Gaia's status bar belongs above all app content, including native web views.
      if (this.document.location.hostname === 'system.localhost') {
        const bar=this.document.getElementById('statusbar');
        if (bar?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) {
          const r=bar.getBoundingClientRect();
          if (r.width>0 && r.bottom>top && r.top<=top) top=r.bottom;
        }
      }
      return {visible,left:Math.max(0,rect.left)+win.mozInnerScreenX,
        top:top+win.mozInnerScreenY,right:Math.min(win.innerWidth,rect.right)+win.mozInnerScreenX,
        bottom:Math.min(win.innerHeight,rect.bottom)+win.mozInnerScreenY};
    }
    if (message.name === 'Vulpes:ViewAlive') {
      return Array.from(this.document.querySelectorAll('iframe')).some(
        (frame) => frame.isConnected && frame.browsingContext?.id === message.data.contextId,
      );
    }
    if (message.name !== 'Vulpes:Event') return;
    const win = this.contentWindow;
    win.dispatchEvent(
      new win.CustomEvent('vulpes-service-event', { detail: Cu.cloneInto(message.data, win) }),
    );
  }
}
