// Reuse Gecko's own responsive-design touch implementation. No application
// gets privileged input methods; only physical mouse events are transformed.
export class VulpesTouchChild extends JSWindowActorChild {
  handleEvent() {
    if (Services.cpmm.sharedData.get('vulpes:native-touch')) return;
    const allowed = Services.cpmm.sharedData.get('vulpes:host-contexts') || [];
    if (!allowed.includes(this.browsingContext.top.id) || this.simulator) return;
    const { require } = ChromeUtils.importESModule(
      'resource://devtools/shared/loader/Loader.sys.mjs',
    );
    const { TouchSimulator } = require('devtools/server/actors/emulation/touch-simulator');
    this.simulator = new TouchSimulator({ chromeEventHandler: this.contentWindow, emit() {} });
    this.simulator.start();
    this.contentWindow.addEventListener('contextmenu', (event) => event.preventDefault(), true);
  }
  receiveMessage(message) {
    if (message.name !== 'Vulpes:CancelTouch') throw new Error('METHOD_NOT_SUPPORTED');
    this.contentWindow.synthesizeTouchEvent('touchcancel', message.data, 0, {
      isAsyncEnabled: true,
    });
    return true;
  }
  didDestroy() {
    try {
      this.simulator?.stop();
    } catch (_) {}
  }
}
