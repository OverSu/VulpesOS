// Runs only on our remote catalogue. It exposes no privileged API to the page.
function installMarketplacePage(win, send) {
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
