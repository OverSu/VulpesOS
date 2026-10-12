import {InputEditor} from 'resource://vulpes/services/input-editor.mjs';
export class VulpesChild extends JSWindowActorChild {
  handleEvent(event) {
    if(['focusin','pointerdown','click'].includes(event.type)) {
      if(this._editor?.editing) return;
      if(!Services.cpmm.sharedData.get('vulpes:native-input')) return;
      let element=event.target;
      if(element?.isContentEditable) element=element.closest('[contenteditable=true]') || element;
      const editable=element?.isContentEditable || (['input','textarea'].includes(element?.localName) && !['button','submit','range','checkbox','radio','date','time','datetime-local','file'].includes(element.type));
      if(!editable || element.disabled || element.readOnly) {
        // Dismissing on pointerdown moves buttons before pointerup and loses
        // the click. Composer actions may also explicitly retain the editor.
        if(event.type==='click' && !element?.closest?.('[data-vulpes-keep-input]'))
          this.sendAsyncMessage('Vulpes:InputFocus',null);
        return;
      }
      this.editor.focus(element);
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
  get editor() { return this._editor ||= new InputEditor(this.contentWindow); }
  inputState() { return this.editor.state(); }
  edit(params) { return this.editor.edit(params); }
  receiveMessage(message) {
    if(message.name==='Vulpes:Edit') return this.edit(message.data);
    if (message.name === 'Vulpes:ViewState') {
      const frame = Array.from(this.document.querySelectorAll('iframe')).find(
        f => f.browsingContext?.id === message.data.contextId);
      if (!frame?.isConnected) return {visible:false};
      const win = this.contentWindow, rect = frame.getBoundingClientRect();
      // App chrome (the status bar and browser controls) legitimately covers
      // the corners of a mozbrowser iframe. Requiring every corner to hit the
      // iframe hid the external browser completely, leaving a white page for
      // sites such as YouTube. The centre plus one side sample is sufficient
      // to prove that the content viewport is visible.
      const samples = [[.5,.5],[.05,.5],[.95,.5],[.5,.05],[.5,.95]];
      const hits = samples.reduce((count,[x,y]) => count +
        (this.document.elementFromPoint(rect.left+rect.width*x,rect.top+rect.height*y)===frame ? 1 : 0), 0);
      const visible = !this.document.hidden && frame.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) &&
        hits >= 2;
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
