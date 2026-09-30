;;'use strict';function debug(...args){if(!DEBUG){return;}
if(!debug.startTime){debug.startTime=Date.now();}
args.unshift('[Locked Content]',Date.now()-debug.startTime);console.log.apply(console,args);}
function $(id){return document.getElementById(id);}
function _(id,args){return navigator.mozL10n.get(id,args);}
function showDialog(options){function close(e){document.body.removeChild(dialog);e.preventDefault();e.stopPropagation();}
var cancelButton;var okButton;var dialog=document.createElement('form');dialog.setAttribute('role','dialog');dialog.dataset.type='confirm';var section=document.createElement('section');dialog.appendChild(section);if(options.title){var title=document.createElement('h1');title.textContent=options.title;section.appendChild(title);}
var msg=document.createElement('p');msg.textContent=options.message;section.appendChild(msg);if(options.details){var details=document.createElement('p');var small=document.createElement('small');small.textContent=options.details;details.appendChild(small);section.appendChild(details);}
var menu=document.createElement('menu');dialog.appendChild(menu);if(options.cancelCallback){cancelButton=document.createElement('button');menu.appendChild(cancelButton);cancelButton.textContent=options.cancelText||_('cancel');cancelButton.onclick=function(e){close(e);options.cancelCallback();};}
if(options.okCallback){okButton=document.createElement('button');menu.appendChild(okButton);okButton.textContent=options.okText||_('ok');if(options.danger){okButton.classList.add('danger');}
else if(!options.cancelCallback){okButton.classList.add('recommend');}
okButton.onclick=function(e){close(e);options.okCallback();};}
if(okButton&&!cancelButton){okButton.classList.add('full');}
if(cancelButton&&!okButton){cancelButton.classList.add('full');}
document.body.appendChild(dialog);}