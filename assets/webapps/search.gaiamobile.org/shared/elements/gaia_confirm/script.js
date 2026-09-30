;'use strict';window.GaiaConfirm=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaConfirmBaseurl||'/shared/elements/gaia_confirm/';function eatEvent(unless,event){if(unless&&unless.indexOf(event.target)!==-1){return;}
event.preventDefault();event.stopImmediatePropagation();}
proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);var confirm=this.querySelector('gaia-buttons .confirm');var cancel=this.querySelector('gaia-buttons .cancel');if(confirm){confirm.addEventListener('click',(e)=>{eatEvent(null,e);this.dispatchEvent(new CustomEvent('confirm'));});}
if(cancel){cancel.addEventListener('click',(e)=>{eatEvent(null,e);this.dispatchEvent(new CustomEvent('cancel'));});}};var template=document.createElement('template');template.innerHTML=`<form role="dialog" class="confirm">
      <section>
        <content select="h1"></content>
        <content select="p"></content>
      </section>
      <content select="gaia-buttons">
      </content>
    </form>`;return document.registerElement('gaia-confirm',{prototype:proto});})(window);