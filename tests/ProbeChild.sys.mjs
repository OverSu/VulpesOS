// Test-only actor, registered by tools/inspect-host.py through Marionette.
export class VulpesProbeChild extends JSWindowActorChild {
  async receiveMessage(message) {
    if (message.name === 'MouseClick') {
      const {x,y}=message.data, win=this.contentWindow;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x<0 || y<0 ||
          x>=win.innerWidth || y>=win.innerHeight) throw Error('INVALID_TEST_POINT');
      const {setTimeout}=ChromeUtils.importESModule('resource://gre/modules/Timer.sys.mjs');
      for (const type of ['mousemove','mousedown','mouseup']) {
        win.synthesizeMouseEvent(type,x,y,{button:0,clickCount:1},{isAsyncEnabled:false});
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      return true;
    }
    if (message.name === 'Tap') {
      const {x,y}=message.data, win=this.contentWindow;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x<0 || y<0 ||
          x>=win.innerWidth || y>=win.innerHeight) throw Error('INVALID_TEST_POINT');
      const points=[{identifier:0,offsetX:x,offsetY:y,radiiX:1,radiiY:1}];
      win.synthesizeTouchEvent('touchstart',points,0,{isAsyncEnabled:false});
      const {setTimeout}=ChromeUtils.importESModule('resource://gre/modules/Timer.sys.mjs');
      await new Promise(resolve=>setTimeout(resolve,80));
      win.synthesizeTouchEvent('touchend',points,0,{isAsyncEnabled:false});
      return true;
    }
    if (message.name === 'RenderedFonts') {
      const document = this.contentWindow.document;
      await document.fonts.ready;
      const result = [];
      function collect(root) {
        const range = document.createRange();
        range.selectNodeContents(root);
        for (const face of InspectorUtils.getUsedFontFaces(range, 3, true)) {
          result.push({
            scope: root.host?.tagName || 'document',
            name: face.name,
            family: face.CSSFamilyName,
            generic: face.CSSGeneric,
            uri: face.URI,
            fallback: face.fromSystemFallback,
            samples: face.ranges.map(r => r.toString().slice(0, 80)),
          });
        }
        for (const node of root.querySelectorAll('*')) {
          if (node.shadowRoot) collect(node.shadowRoot);
        }
      }
      collect(document.body);
      return result;
    }
    if (message.name === 'TouchState') {
      const actor = this.manager.getActor('VulpesTouch');
      return {
        top: this.browsingContext.top.id,
        contexts: Services.cpmm.sharedData.get('vulpes:host-contexts'),
        enabled: actor.simulator?.enabled,
        native: Services.cpmm.sharedData.get('vulpes:native-touch') === true,
        input:Services.cpmm.sharedData.get('vulpes:native-input'),
      };
    }
    if (message.name !== 'Evaluate') throw new Error('Unknown probe command');
    const sandbox = Cu.Sandbox(this.contentWindow, {
      sandboxPrototype: this.contentWindow,
      wantXrays: false,
    });
    return await Cu.evalInSandbox('(async () => {' + message.data + '})()', sandbox);
  }
}
