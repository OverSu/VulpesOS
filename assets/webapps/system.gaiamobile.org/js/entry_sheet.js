;'use strict';var EntrySheet=(function invocation(){function EntrySheet(){render.apply(this,arguments);}
EntrySheet.className='entrySheet';EntrySheet.prototype.setTitle=function(title){this.titleElement.textContent=title;};EntrySheet.prototype.open=function(){setTimeout(function(){this.element.classList.add('active');}.bind(this));};EntrySheet.prototype.close=function(){this.element.addEventListener('transitionend',function onTransitionend(){this.element.removeEventListener('transitionend',onTransitionend);this.element.classList.remove('disappearing');this.element.classList.remove('active');this.container.removeChild(this.element);}.bind(this));this.element.classList.add('disappearing');};function view(){return`<div class="${EntrySheet.className}">
      <section role="region" class="skin-organic header">
        <gaia-header action="close">
          <h1 class="title">
            <bdi class="${EntrySheet.className}-title"></bdi>
          </h1>
        </gaia-header>
        <div class="throbber"></div>
      </section>
      <div class="content">
      </div>
    </div>`;}
function render(container,title,content){this.container=container;this.title=title;this.container.insertAdjacentHTML('beforeend',view.apply(this));this.header=this.container.querySelector('.'+EntrySheet.className+' gaia-header');this.titleElement=this.container.querySelector('.'+EntrySheet.className+'-title');this.throbberElement=this.container.querySelector('.'+EntrySheet.className+' .throbber');this.content=this.container.querySelector('.'+EntrySheet.className+' .content');this.element=this.container.querySelector('.'+EntrySheet.className);this.element.dataset.zIndexLevel='dialog-overlay';var self=this;if(typeof(BrowserFrame)!='undefined'&&content instanceof BrowserFrame){content.element.addEventListener('mozbrowserloadstart',function onLoadStart(){self.throbberElement.dataset.loading=true;});content.element.addEventListener('mozbrowserloadend',function onLoadEnd(){delete self.throbberElement.dataset.loading;});this.content.appendChild(content.element);}else if(content&&content.nodeType==1){this.content.appendChild(content);}
this.setTitle(this.title);this.header.addEventListener('action',function(){self.close();});}
return EntrySheet;}());