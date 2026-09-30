import { Runtime } from 'resource://vulpes/host/Runtime.sys.mjs';
export class VulpesParent extends JSWindowActorParent {
  receiveMessage(message) {
    if(message.name==='Vulpes:InputFocus') {Runtime.input.changed(this,message.data);return;}
    if (message.name !== 'Vulpes:Request') throw new Error('Unknown host message');
    return Runtime.request(this, message.data);
  }
  didDestroy() {
    Runtime.cleanup(this);
  }
}
