;'use strict';window.utils=window.utils||{};window.utils.status=(function(){var DISPLAYED_TIME=1500;var section,content;var timeoutID;function clearHideTimeout(){if(timeoutID===null){return;}
window.clearTimeout(timeoutID);timeoutID=null;}
function show(message,duration){clearHideTimeout();content.innerHTML='';if(typeof message==='string'){content.textContent=message;}else{try{content.appendChild(message);}catch(ex){console.error('DOMException: '+ex.message);}}
section.classList.remove('hidden');section.classList.add('onviewport');timeoutID=window.setTimeout(hide,duration||DISPLAYED_TIME);}
function animationEnd(evt){var eventName='status-showed';if(evt.animationName==='hide'){clearHideTimeout();section.classList.add('hidden');eventName='status-hidden';}
window.dispatchEvent(new CustomEvent(eventName));}
function hide(){section.classList.remove('onviewport');}
function destroy(){section.removeEventListener('animationend',animationEnd);document.body.removeChild(section);clearHideTimeout();section=content=null;}
function getPath(){return'/js/components/';}
function initialize(){if(section){return;}
section=document.createElement('section');var link=document.createElement('link');link.type='text/css';link.rel='stylesheet';link.href=getPath()+'status-behavior.css';document.head.appendChild(link);section.setAttribute('role','status');section.classList.add('hidden');content=document.createElement('p');section.appendChild(content);section.addEventListener('animationend',animationEnd);setTimeout(function append(){document.body.appendChild(section);});}
if(document.readyState==='complete'){initialize();}else{document.addEventListener('DOMContentLoaded',function loaded(){document.removeEventListener('DOMContentLoaded',loaded);initialize();});}
return{init:initialize,show:show,hide:hide,destroy:destroy,setDuration:function setDuration(time){DISPLAYED_TIME=time||DISPLAYED_TIME;}};})();