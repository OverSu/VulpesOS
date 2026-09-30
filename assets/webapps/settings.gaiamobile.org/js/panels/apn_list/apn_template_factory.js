
define(['require'],function(require){'use strict';function apnTemplate(apnType,onItemclick,onRadioClick,item){var rawApn=item.apn;var radio=document.createElement('gaia-radio');radio.className='split';radio.checked=item.active;radio.name=apnType;var radioLabel=document.createElement('label');radioLabel.classList.add('name');if(!rawApn.carrier||rawApn.carrier==='_custom_'){radioLabel.textContent=rawApn.apn;}else{radioLabel.textContent=rawApn.carrier;}
radio.appendChild(radioLabel);var li=document.createElement('li');li.classList.add('apn-item');li.appendChild(radio);var labelClicked=false;if(typeof onRadioClick==='function'){radio.addEventListener('click',event=>{if(!labelClicked&&!radio.checked){onRadioClick(item,radio);}
labelClicked=false;event.stopPropagation();event.preventDefault();},true);}
if(typeof onItemclick==='function'){radioLabel.addEventListener('mouseup',()=>{labelClicked=true;onItemclick(item);});}
return li;}
return function ctor_apnTemplate(apnType,onItemclick,onRadioClick){return apnTemplate.bind(null,apnType,onItemclick,onRadioClick);};});