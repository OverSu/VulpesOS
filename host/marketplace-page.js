// Catalogue controls enter the same local confirmation; no privileged page API.
function installMarketplacePage(win, send) {
  if(win.location.origin==='https://ffapps.danielherr.software' && win.location.pathname.startsWith('/app/')) {
    const doc=win.document,button=doc.getElementById('install_button');
    const request=(element,url)=>element.addEventListener('click',event=>{
      if(!event.isTrusted || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey)return;
      event.preventDefault();event.stopImmediatePropagation();send(url.href);
    },true);
    if(button?.dataset.manifest==='manifest.webapp') {
      button.disabled=false;request(button,new URL('manifest.webapp',win.location.href));
    }
    for(const link of doc.querySelectorAll('a[download][href]')) {
      const url=new URL(link.href);
      if(url.origin===win.location.origin && url.pathname.endsWith('.zip'))request(link,url);
    }
    return;
  }
  if(win.location.origin!=='https://vulpes-os.org' || !win.location.pathname.startsWith('/marketplace/'))return;
  const doc=win.document;
  for(const link of doc.querySelectorAll('a[href]')) {
    const url=new URL(link.href);
    if(url.origin!=='https://vulpes-os.org' || url.pathname!=='/marketplace/index.php' || !/^\d{1,10}$/.test(url.searchParams.get('download')||''))continue;
    link.textContent=doc.documentElement.lang==='fr'?'Installer dans Vulpes':'Install in Vulpes';
    link.addEventListener('click',event=>{
      if(!event.isTrusted || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey)return;
      event.preventDefault();send(url.href);
    });
  }
}
