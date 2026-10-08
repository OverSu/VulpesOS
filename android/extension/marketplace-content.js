installMarketplacePage(window,url=>browser.runtime.sendMessage({marketplaceDownload:url}).catch(console.error));
