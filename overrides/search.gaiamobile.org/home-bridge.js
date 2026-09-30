// The local page follows Gaia's language, independently of Gecko's locale.
let welcomeLanguage=navigator.language;
function sendWelcomeLanguage() {
  document.getElementById('vulpes-local-home')?.contentWindow.postMessage({
    type:'vulpes-welcome-language',language:welcomeLanguage
  },location.origin);
}
if(navigator.mozSettings) {
  const request=navigator.mozSettings.createLock().get('language.current');
  request.onsuccess=()=>{welcomeLanguage=request.result['language.current'] || navigator.language;sendWelcomeLanguage();};
  navigator.mozSettings.addObserver('language.current',event=>{
    welcomeLanguage=event.settingValue || navigator.language;sendWelcomeLanguage();
  });
}
// Only the bundled welcome frame may request browser navigation.
addEventListener('message', event => {
  const frame=document.getElementById('vulpes-local-home');
  if(event.source!==frame?.contentWindow || event.origin!==location.origin) return;
  if(event.data?.type==='vulpes-welcome-ready'){sendWelcomeLanguage();return;}
  if(event.data?.type!=='vulpes-welcome-open') return;
  let url;
  try { url=new URL(event.data.url); } catch (_) { return; }
  if(!['http:','https:'].includes(url.protocol)) return;
  new MozActivity({name:'view',data:{type:'url',url:url.href}});
});
