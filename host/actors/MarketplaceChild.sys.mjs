export class VulpesMarketplaceChild extends JSWindowActorChild {
  handleEvent() {
    const scope={};
    Services.scriptloader.loadSubScript('resource://vulpes/host/marketplace-page.js',scope);
    scope.installMarketplacePage(this.contentWindow,url=>this.sendAsyncMessage('Marketplace:Download',{url}));
  }
}
