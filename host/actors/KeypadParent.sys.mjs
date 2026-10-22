import {Runtime} from 'resource://vulpes/host/Runtime.sys.mjs';
import {Views} from 'resource://vulpes/host/Views.sys.mjs';

export class KeypadParent extends JSWindowActorParent {
  receiveMessage(message) {
    if (Services.env.get('VULPES_KEYPAD') !== '1') return;
    if (message.name === 'Vulpes:KeypadNotifications') {
      Runtime.broadcast('keypad-notifications', {}, 'system');
      return;
    }
    if (message.name === 'Vulpes:KeypadToolbar') {
      const shell = this.browsingContext.top.embedderElement?.ownerDocument;
      const system = shell?.getElementById('system')?.browsingContext;
      const belongsToHost = this.browsingContext.top === system ||
        [...Views.entries.values()].some(entry => entry.browser.browsingContext === this.browsingContext.top);
      if (belongsToHost) {
        system?.currentWindowGlobal?.getActor('Keypad')
          .sendAsyncMessage('Vulpes:FocusBrowserToolbar', {});
      }
      return;
    }
    if (message.name === 'Vulpes:KeypadRoute') {
      const child = BrowsingContext.get(message.data.contextId);
      let ancestor = child?.parent;
      while (ancestor && ancestor !== this.browsingContext) ancestor = ancestor.parent;
      if (ancestor !== this.browsingContext) return;
      const view = Views.entries.get(child.id);
      const destination = view && view.browser.style.visibility === 'visible' ? view.browser.browsingContext : child;
      const page = destination.currentWindowGlobal;
      // Gecko error pages can autofocus a retry button far below the viewport.
      // Up must still offer an immediate way to edit the failed address.
      if (message.data.key === 'ArrowUp' &&
          /^about:(neterror|certerror|httpsonlyerror)\?/.test(page?.documentURI.spec || '')) {
        this.receiveMessage({name:'Vulpes:KeypadToolbar'});
        return;
      }
      page?.getActor('Keypad').sendAsyncMessage('Vulpes:Navigate', message.data);
      return;
    }
    if (!['Vulpes:KeypadHome', 'Vulpes:KeypadCards'].includes(message.name)) return;
    Views.hideAll();
    Runtime.broadcast(message.name === 'Vulpes:KeypadCards' ? 'holdhome' : 'home', {}, 'system');
  }
}
