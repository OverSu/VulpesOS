(function () {
  'use strict';
  var copy = {
    fr: {title:'Accueil | Vulpes',heading:'Le Web vous attend.',intro:'Un nouvel onglet. À vous la suite.',label:'Rechercher sur le Web',placeholder:'Une recherche ou une adresse…',provider:'Les recherches s’ouvrent avec DuckDuckGo.',project:'Vulpes OS',news:'Nouveautés',footer:'Libre, curieux, ouvert sur le Web.',local:'Page locale · Aucun suivi',search:'Rechercher',shortcuts:'Raccourcis',offline:'Vous êtes hors ligne. Cette page reste disponible ; les recherches et les liens nécessitent une connexion.'},
    en: {title:'Home | Vulpes',heading:'The Web is yours.',intro:'A new tab. Where next?',label:'Search the Web',placeholder:'Search or enter an address…',provider:'Searches open with DuckDuckGo.',project:'Vulpes OS',news:'What’s new',footer:'Free, curious, open to the Web.',local:'Local page · No tracking',search:'Search',shortcuts:'Shortcuts',offline:'You’re offline. This page still works; searches and links need a connection.'}
  };
  var language = /^fr(?:-|$)/i.test(navigator.language || '') ? 'fr' : 'en';
  var buttons=document.querySelectorAll('[data-lang]');
  function translate(code) {
    language=code;document.documentElement.lang=code;document.title=copy[code].title;
    var nodes=document.querySelectorAll('[data-i18n]');
    for(var i=0;i<nodes.length;i++) nodes[i].textContent=copy[code][nodes[i].getAttribute('data-i18n')];
    for(var j=0;j<buttons.length;j++) buttons[j].setAttribute('aria-pressed',buttons[j].getAttribute('data-lang')===code?'true':'false');
    document.getElementById('query').placeholder=copy[code].placeholder;
    document.querySelector('[type=submit]').setAttribute('aria-label',copy[code].search);
    document.getElementById('shortcuts').setAttribute('aria-label',copy[code].shortcuts);
    var links=document.querySelectorAll('[data-site]');
    for(var k=0;k<links.length;k++) links[k].href='https://vulpes-os.org'+links[k].getAttribute('data-site')+'?lang='+code;
  }
  for(var i=0;i<buttons.length;i++) buttons[i].addEventListener('click',function(){var code=this.getAttribute('data-lang');translate(code);});
  function navigate(url) {
    // Keep external pages in Gaia's browser rather than the nested home frame.
    if (parent !== window) parent.postMessage({type:'vulpes-welcome-open',url:url}, location.origin);
    else window.location.href=url;
  }
  document.addEventListener('click',function(e){
    var link=e.target.closest('a[href]');
    if(link && /^https?:/.test(link.href)){e.preventDefault();navigate(link.href);}
  });
  document.getElementById('search').addEventListener('submit',function(e){
    e.preventDefault();
    var value=document.getElementById('query').value.replace(/^\s+|\s+$/g,'');
    if(!value){e.preventDefault();return;}
    if(/^https?:\/\/[^\s]+$/i.test(value)){e.preventDefault();navigate(value);}
    else if(/^(localhost(?::\d+)?|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#][^\s]*)?$/i.test(value)){e.preventDefault();navigate('https://'+value);}
    else navigate('https://duckduckgo.com/?q='+encodeURIComponent(value));
  });
  function network(){document.querySelector('.offline').hidden=navigator.onLine!==false;}
  window.addEventListener('online',network);window.addEventListener('offline',network);
  window.addEventListener('languagechange',function(){translate(/^fr(?:-|$)/i.test(navigator.language || '')?'fr':'en');});
  window.addEventListener('message',function(event){
    if(event.source!==parent || event.origin!==location.origin || !event.data || event.data.type!=='vulpes-welcome-language') return;
    translate(/^fr(?:-|$)/i.test(event.data.language || '')?'fr':'en');
  });
  translate(language);network();
  if(parent!==window) parent.postMessage({type:'vulpes-welcome-ready'},location.origin);
}());
