import {Views} from 'resource://vulpes/host/Views.sys.mjs';
import {Runtime} from 'resource://vulpes/host/Runtime.sys.mjs';

export class WebInputParent extends JSWindowActorParent {
  receiveMessage(message) {
    if (message.name === 'Vulpes:WebActivate') {
      if (Runtime.identity(this) || !Runtime.inputIdentity(this)) return;
      for (const entry of Views.entries.values()) {
        if (entry.browser.browsingContext === this.browsingContext.top &&
            entry.browser.ownerDocument.hasFocus()) {
          entry.browser.focus();
          break;
        }
      }
      return;
    }
    if (message.name !== 'Vulpes:InputFocus') throw Error('METHOD_NOT_SUPPORTED');
    if (Runtime.identity(this)) return; // Bundled apps already use VulpesChild.
    Runtime.input.changed(this, message.data);
  }
  didDestroy() { Runtime.input.cleanup(this); }
}
