(async()=>{
  const frame=document.getElementById('catalogue'),message=document.getElementById('message'),dialog=document.getElementById('confirm');
  let attempt=0,busy=false,prepared=null,installed=null,language=await VulpesCompat.call('locale.current');
  const fr=()=>/^fr(?:-|$)/i.test(language);
  const text=(f,e)=>fr()?f:e;
  function labels(){document.getElementById('browse').textContent=text('Ouvrir le catalogue','Open catalogue');document.getElementById('open').textContent=text('Ouvrir','Open');document.getElementById('install').textContent=text('Installer','Install');document.getElementById('cancel').textContent=text('Annuler','Cancel');}
  function loadFailed(){status(text('Catalogue inaccessible. Vérifiez la connexion Internet, puis réessayez.','Catalogue unavailable. Check your Internet connection, then try again.'));document.getElementById('open').hidden=true;}
  frame.addEventListener('mozbrowsererror',loadFailed);
  function browse(){labels();message.hidden=true;dialog.hidden=true;frame.style.visibility='visible';frame.src='https://vulpes-os.org/marketplace/?mode=app&lang='+(fr()?'fr':'en');}
  function status(value){frame.style.visibility='hidden';message.hidden=false;document.getElementById('status').textContent=value;}
  async function prepare(url){
    if(busy)return;const current=++attempt;busy=true;prepared=null;installed=null;document.getElementById('open').hidden=true;
    status(text('Vérification de l’application…','Checking application…'));
    try {const value=await VulpesCompat.call('marketplace.prepare',{url});if(current!==attempt)return;prepared=value;
      document.getElementById('title').textContent=prepared.name;
      document.getElementById('question').textContent=text('Installer cette application archivée ?','Install this archived application?')+' ('+(prepared.bytes/1048576).toFixed(1)+' Mio)';
      document.getElementById('permissions').textContent=text('Elle sera exécutée comme une application web, sans accès aux fonctions système. Certains anciens services peuvent ne plus fonctionner.','It will run as a web application without system access. Some old services may no longer work.');
      message.hidden=true;dialog.hidden=false;
    }catch(error){if(current!==attempt)return;status(text('Installation impossible : ','Cannot install: ')+error.message);busy=false;}
  }
  dialog.addEventListener('submit',async event=>{event.preventDefault();if(!prepared)return;const token=prepared.token;prepared=null;dialog.hidden=true;status(text('Installation…','Installing…'));
    try {installed=await VulpesCompat.call('marketplace.install',{token});status(text('Application ajoutée à l’accueil.','Application added to Home.'));document.getElementById('open').hidden=false;}
    catch(error){status(text('Installation impossible : ','Cannot install: ')+error.message);}finally{busy=false;}
  });
  const cancel=()=>{attempt++;prepared=null;busy=false;VulpesCompat.call('marketplace.cancel').catch(console.error);browse();};
  document.getElementById('cancel').onclick=cancel;
  document.getElementById('browse').onclick=cancel;
  document.getElementById('open').onclick=()=>installed && VulpesCompat.call('apps.launch',{manifestURL:installed.manifestURL});
  addEventListener('languagechange',()=>{language=navigator.language;if(!busy)browse();});
  browse();
  setInterval(async()=>{if(busy)return;try{const url=await VulpesCompat.call('marketplace.poll');if(url)await prepare(url);}catch(error){console.error(error);}},750);
})();
