import {InputEditor} from 'resource://vulpes/services/input-editor.mjs';

// Web pages may edit their focused field, but receive no Gaia service bridge.
export class WebInputChild extends JSWindowActorChild {
  handleEvent(event) {
    if (!Services.cpmm.sharedData.get('vulpes:native-input') || this.editor?.editing) return;
    const contexts = Services.cpmm.sharedData.get('vulpes:host-contexts') || [];
    if (!contexts.includes(this.browsingContext.top.id)) return;
    // Standalone web views have no Firefox tabbrowser to focus their embedder.
    // Keep Gecko's picker focus checks intact by activating only a touched view.
    if (event.isTrusted && ['pointerdown','mousedown','click'].includes(event.type))
      this.sendAsyncMessage('Vulpes:WebActivate', null);
    let element = event.composedPath()[0];
    if (element?.isContentEditable) element = element.closest('[contenteditable=true]') || element;
    const editable = element?.isContentEditable || element?.localName === 'textarea' ||
      (element?.localName === 'input' && ['text','search','email','url','tel','password','number'].includes(element.type));
    if (!editable || element.disabled || element.readOnly) {
      if (event.type === 'click') this.sendAsyncMessage('Vulpes:InputFocus', null);
      return;
    }
    this.editor ||= new InputEditor(this.contentWindow);
    this.editor.focus(element);
    this.sendAsyncMessage('Vulpes:InputFocus', this.editor.state());
  }
  receiveMessage(message) {
    if (message.name !== 'Vulpes:Edit' || !this.editor) throw Error('INPUT_CONTEXT_EXPIRED');
    return this.editor.edit(message.data);
  }
}
