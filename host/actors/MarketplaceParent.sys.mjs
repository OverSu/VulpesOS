import { Runtime } from 'resource://vulpes/host/Runtime.sys.mjs';
import { Views } from 'resource://vulpes/host/Views.sys.mjs';
import { packageURL } from 'resource://vulpes/services/packages.mjs';
export class VulpesMarketplaceParent extends JSWindowActorParent {
  receiveMessage(message) {
    if(message.name!=='Marketplace:Download' || this.manager.documentPrincipal.originNoSuffix!=='https://vulpes-os.org')return;
    const view=[...Views.entries.values()].find(v=>v.browser.browsingContext.top.id===this.browsingContext.top.id);
    if(!view || !Runtime.identity(view.actor))return;
    Runtime.marketplaceDownload=packageURL(message.data.url);
    const app=Runtime.apps.find(a=>a.id==='marketplace');
    Runtime.broadcast('launch',{manifestURL:app.manifestURL,origin:app.origin,url:app.origin+'/index.html',timestamp:Date.now()},'system');
  }
}
