;window.GaiaAppIconBaseurl='shared/elements/gaia-site-icon/';;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';window.GaiaContainer=(function(exports){const STATE_CHANGE_TIMEOUT=100;const DEFAULT_DND_TIMEOUT=300;const DND_THRESHOLD=5;const DND_MOVE_THROTTLE=50;var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){this._template=template.content.cloneNode(true);var shadow=this.createShadowRoot();shadow.appendChild(this._template);this._frozen=false;this._pendingStateChanges=[];this._children=[];this._dnd={enabled:false,delay:DEFAULT_DND_TIMEOUT,timeout:null,child:null,active:false,start:{pageX:0,pageY:0,clientX:0,clientY:0},last:{pageX:0,pageY:0,clientX:0,clientY:0,timeStamp:0},moveTimeout:null,lastMoveEventTime:0,clickCapture:false};var dndObserverCallback=(mutations)=>{if(this._dnd.enabled!==this.dragAndDrop){this._dnd.enabled=this.dragAndDrop;if(this._dnd.enabled){this.addEventListener('touchstart',this);this.addEventListener('touchmove',this);this.addEventListener('touchcancel',this);this.addEventListener('touchend',this);this.addEventListener('mousedown',this);this.addEventListener('mousemove',this);this.addEventListener('mouseup',this);this.addEventListener('click',this,true);this.addEventListener('contextmenu',this,true);}else{this.cancelDrag();this.removeEventListener('touchstart',this);this.removeEventListener('touchmove',this);this.removeEventListener('touchcancel',this);this.removeEventListener('touchend',this);this.removeEventListener('mousedown',this);this.removeEventListener('mousemove',this);this.removeEventListener('mouseup',this);this.removeEventListener('click',this,true);this.removeEventListener('contextmenu',this,true);}}};this.dndObserver=new MutationObserver(dndObserverCallback);this.dndObserver.observe(this,{attributes:true,attributeFilter:['drag-and-drop']});dndObserverCallback(null);};Object.defineProperty(proto,'children',{get:function(){return this._children.map((child)=>{return child.element;});},enumerable:true});Object.defineProperty(proto,'firstChild',{get:function(){return this._children.length?this._children[0].element:null;},enumerable:true});Object.defineProperty(proto,'lastChild',{get:function(){var length=this._children.length;return length?this._children[length-1].element:null;},enumerable:true});Object.defineProperty(proto,'dragAndDrop',{get:function(){return this.getAttribute('drag-and-drop')!==null;},enumerable:true});Object.defineProperty(proto,'dragAndDropTimeout',{get:function(){return this._dnd.delay;},set:function(timeout){if(timeout>=0){this._dnd.delay=timeout;}else{this._dnd.delay=DEFAULT_DND_TIMEOUT;}},enumerable:true});proto.realAppendChild=proto.appendChild;proto.appendChild=function(element,callback){this.insertBefore(element,null,callback);};proto.realRemoveChild=proto.removeChild;proto.removeChild=function(element,callback){var children=this._children;var childToRemove=null;for(var child of children){if(child.element===element){childToRemove=child;break;}}
if(childToRemove===null){throw'removeChild called on unknown child';}
this.changeState(childToRemove,'removed',()=>{this.realRemoveChild(childToRemove.container);this.realRemoveChild(childToRemove.master);for(var i=0,iLen=children.length;i<iLen;i++){if(children[i]===childToRemove){children.splice(i,1);break;}}
if(callback){callback();}
this.synchronise();});};proto.realReplaceChild=proto.replaceChild;proto.replaceChild=function(newElement,oldElement,callback){if(!newElement||!oldElement){throw'replaceChild called with null arguments';}
if(newElement.parentNode){newElement.parentNode.removeChild(newElement,()=>{this.replaceChild(newElement,oldElement,callback);});if(newElement.parentNode){return;}}
var children=this._children;for(var i=0,iLen=children.length;i<iLen;i++){var oldChild=children[i];if(oldChild.element===oldElement){var newChild=new GaiaContainerChild(newElement);this.realInsertBefore(newChild.container,oldChild.container);this.realInsertBefore(newChild.master,oldChild.master);this.realRemoveChild(oldChild.container);this.realRemoveChild(oldChild.master);this.children.splice(i,1,newChild);this.synchronise();if(callback){callback();}
return;}}
throw'removeChild called on unknown child';};proto.reorderChild=function(element,referenceElement,callback){if(!element){throw'reorderChild called with null element';}
var children=this._children;var child=null;var childIndex=null;var referenceChild=null;var referenceChildIndex=null;for(var i=0,iLen=children.length;i<iLen;i++){if(children[i].element===element){child=children[i];childIndex=i;}else if(children[i].element===referenceElement){referenceChild=children[i];referenceChildIndex=i;}
if(child&&(referenceChild||!referenceElement)){this.realRemoveChild(child.container);this.realRemoveChild(child.master);children.splice(childIndex,1);if(referenceChild){this.realInsertBefore(child.container,referenceChild.container);this.realInsertBefore(child.master,referenceChild.master);}else{(children.length===0)?this.realAppendChild(child.container):this.realInsertBefore(child.container,children[0].master);this.realAppendChild(child.master);}
referenceChild?children.splice(referenceChildIndex-(childIndex<referenceChildIndex)?1:0,0,child):children.splice(children.length,0,child);this.synchronise();if(callback){callback();}
return;}}
throw child?'reorderChild called on unknown reference element':'reorderChild called on unknown child';};proto.realInsertBefore=proto.insertBefore;proto.insertBefore=function(element,reference,callback){var children=this._children;var childToInsert=new GaiaContainerChild(element);var referenceIndex=-1;if(reference!==null){for(var i=0,iLen=children.length;i<iLen;i++){if(children[i].element===reference){referenceIndex=i;break;}}
if(referenceIndex===-1){throw'insertBefore called on unknown child';}}
if(referenceIndex===-1){(children.length===0)?this.realAppendChild(childToInsert.container):this.realInsertBefore(childToInsert.container,children[0].master);this.realAppendChild(childToInsert.master);children.push(childToInsert);}else{this.realInsertBefore(childToInsert.container,children[referenceIndex].container);this.realInsertBefore(childToInsert.master,children[referenceIndex].master);children.splice(referenceIndex,0,childToInsert);}
this.changeState(childToInsert,'added',callback);this.synchronise();};proto.changeState=function(child,state,callback){if(child.container.parentNode!==this){return;}
if(child.container.classList.contains(state)){return;}
if(this._frozen){this._pendingStateChanges.push(this.changeState.bind(this,child,state,callback));return;}
var animStart=(e)=>{if(!e.animationName.endsWith(state)){return;}
child.container.removeEventListener('animationstart',animStart);window.clearTimeout(child[state]);delete child[state];var self=this;child.container.addEventListener('animationend',function animEnd(){child.container.removeEventListener('animationend',animEnd);child.container.classList.remove(state);if(callback){callback();}});};child.container.addEventListener('animationstart',animStart);child.container.classList.add(state);child[state]=window.setTimeout(()=>{delete child[state];child.container.removeEventListener('animationstart',animStart);child.container.classList.remove(state);if(callback){callback();}},STATE_CHANGE_TIMEOUT);};proto.getChildOffsetRect=function(element){var children=this._children;for(var i=0,iLen=children.length;i<iLen;i++){var child=children[i];if(child.element===element){var top=child._lastMasterTop;var left=child._lastMasterLeft;var width=child._lastElementWidth;var height=child._lastElementHeight;return{top:top,left:left,width:width,height:height,right:left+width,bottom:top+height};}}
throw'getChildOffsetRect called on unknown child';};proto.getChildFromPoint=function(x,y){var children=this._children;for(var parent=this.parentElement;parent;parent=parent.parentElement){x+=parent.scrollLeft-parent.offsetLeft;y+=parent.scrollTop-parent.offsetTop;}
for(var i=0,iLen=children.length;i<iLen;i++){var child=children[i];if(x>=child._lastMasterLeft&&y>=child._lastMasterTop&&x<child._lastMasterLeft+child._lastElementWidth&&y<child._lastMasterTop+child._lastElementHeight){return child.element;}}
return null;};proto.cancelDrag=function(){if(this._dnd.timeout!==null){clearTimeout(this._dnd.timeout);this._dnd.timeout=null;}
if(this._dnd.moveTimeout!==null){clearTimeout(this._dnd.moveTimeout);this._dnd.moveTimeout=null;}
if(this._dnd.active){this._dnd.child.container.classList.remove('dragging');this._dnd.child.container.style.position='absolute';this._dnd.child.container.style.top='0';this._dnd.child.container.style.left='0';this._dnd.child.markDirty();this._dnd.child=null;this._dnd.active=false;this.synchronise();this._dnd.clickCapture=true;this.dispatchEvent(new CustomEvent('drag-finish'));}};proto.startDrag=function(){if(!this.dispatchEvent(new CustomEvent('drag-start',{cancelable:true,detail:{target:this._dnd.child.element,pageX:this._dnd.start.pageX,pageY:this._dnd.start.pageY,clientX:this._dnd.start.clientX,clientY:this._dnd.start.clientY}}))){return;}
this._dnd.active=true;this._dnd.child.container.classList.add('dragging');this._dnd.child.container.style.position='fixed';var rect=this.getBoundingClientRect();this._dnd.child.container.style.top=rect.top+'px';this._dnd.child.container.style.left=rect.left+'px';};proto.continueDrag=function(){if(!this._dnd.active){return;}
var left=this._dnd.child.master.offsetLeft+
(this._dnd.last.pageX-this._dnd.start.pageX);var top=this._dnd.child.master.offsetTop+
(this._dnd.last.pageY-this._dnd.start.pageY);this._dnd.child.container.style.transform='translate('+left+'px, '+top+'px)';if(this._dnd.moveTimeout===null){var delay=Math.max(0,DND_MOVE_THROTTLE-
(this._dnd.last.timeStamp-this._dnd.lastMoveEventTime));this._dnd.moveTimeout=setTimeout(()=>{this._dnd.moveTimeout=null;this._dnd.lastMoveEventTime=this._dnd.last.timeStamp;this.dispatchEvent(new CustomEvent('drag-move',{detail:{target:this._dnd.child.element,pageX:this._dnd.last.pageX,pageY:this._dnd.last.pageY,clientX:this._dnd.last.clientX,clientY:this._dnd.last.clientY}}));},delay);}};proto.endDrag=function(event){if(this._dnd.active){var dropTarget=this.getChildFromPoint(this._dnd.last.clientX,this._dnd.last.clientY);if(this.dispatchEvent(new CustomEvent('drag-end',{cancelable:true,detail:{target:this._dnd.child.element,dropTarget:dropTarget,pageX:this._dnd.last.pageX,pageY:this._dnd.last.pageY,clientX:this._dnd.last.clientX,clientY:this._dnd.last.clientY}}))){var children=this._children;if(dropTarget&&dropTarget!==this._dnd.child.element){var dropChild=null;var dropIndex=-1;var childIndex=-1;var insertBefore=true;for(var i=0,iLen=children.length;i<iLen;i++){if(children[i]===this._dnd.child){childIndex=i;if(!dropChild){insertBefore=false;}}
if(children[i].element===dropTarget){dropChild=children[i];dropIndex=i;}
if(dropIndex>=0&&childIndex>=0){break;}}
if(dropIndex>=0&&childIndex>=0){this.realRemoveChild(this._dnd.child.container);this.realRemoveChild(this._dnd.child.master);this.realInsertBefore(this._dnd.child.container,insertBefore?dropChild.container:dropChild.container.nextSibling);this.realInsertBefore(this._dnd.child.master,insertBefore?dropChild.master:dropChild.master.nextSibling);children.splice(dropIndex,0,children.splice(childIndex,1)[0]);this.dispatchEvent(new CustomEvent('drag-rearrange'));}}}}else if(this._dnd.timeout!==null){var handled=!this.dispatchEvent(new CustomEvent('activate',{cancelable:true,detail:{target:this._dnd.child.element}}));if(handled){event.stopImmediatePropagation();event.preventDefault();}}
this.cancelDrag();};proto.handleEvent=function(event){switch(event.type){case'touchstart':case'mousedown':if(this._dnd.active||this._dnd.timeout){this.cancelDrag();break;}
if(event instanceof MouseEvent){this._dnd.start.pageX=event.pageX;this._dnd.start.pageY=event.pageY;this._dnd.start.clientX=event.pageX;this._dnd.start.clientY=event.pageY;}else{this._dnd.start.pageX=event.touches[0].pageX;this._dnd.start.pageY=event.touches[0].pageY;this._dnd.start.clientX=event.touches[0].clientX;this._dnd.start.clientY=event.touches[0].clientY;}
this._dnd.last.pageX=this._dnd.start.pageX;this._dnd.last.pageY=this._dnd.start.pageY;this._dnd.last.clientX=this._dnd.start.clientX;this._dnd.last.clientY=this._dnd.start.clientY;this._dnd.last.timeStamp=event.timeStamp;var target=event.target;for(;target.parentNode!==this;target=target.parentNode){if(target===this||!target.parentNode){return;}}
var children=this._children;for(var child of children){if(child.container===target){this._dnd.child=child;break;}}
if(!this._dnd.child){return;}
if(this._dnd.delay>0){this._dnd.timeout=setTimeout(()=>{this._dnd.timeout=null;this.startDrag();},this._dnd.delay);}else{this.startDrag();}
break;case'touchmove':case'mousemove':var pageX,pageY,clientX,clientY;if(event instanceof MouseEvent){pageX=event.pageX;pageY=event.pageY;clientX=event.clientX;clientY=event.clientY;}else{pageX=event.touches[0].pageX;pageY=event.touches[0].pageY;clientX=event.touches[0].clientX;clientY=event.touches[0].clientY;}
if(this._dnd.timeout){if(Math.abs(pageX-this._dnd.start.pageX)>DND_THRESHOLD||Math.abs(pageY-this._dnd.start.pageY)>DND_THRESHOLD){clearTimeout(this._dnd.timeout);this._dnd.timeout=null;}}else if(this._dnd.active){event.preventDefault();this._dnd.last.pageX=pageX;this._dnd.last.pageY=pageY;this._dnd.last.clientX=clientX;this._dnd.last.clientY=clientY;this._dnd.last.timeStamp=event.timeStamp;this.continueDrag();}
break;case'touchcancel':this.cancelDrag();break;case'touchend':case'mouseup':if(this._dnd.active){event.preventDefault();event.stopImmediatePropagation();}
this.endDrag(event);break;case'click':if(this._dnd.clickCapture){this._dnd.clickCapture=false;event.preventDefault();event.stopImmediatePropagation();}
break;case'contextmenu':if(this._dnd.active||this._dnd.timeout){event.stopImmediatePropagation();event.preventDefault();}
break;}};proto.freeze=function(){this._frozen=true;};proto.thaw=function(){if(this._frozen){this._frozen=false;for(var callback of this._pendingStateChanges){callback();}
this._pendingStateChanges=[];this.synchronise();}};proto.synchronise=function(){if(this._frozen){return;}
var child;for(child of this._children){if(!this._dnd.active||child!==this._dnd.child){child.synchroniseMaster();}}
for(child of this._children){if(!this._dnd.active||child!==this._dnd.child){child.synchroniseContainer();}}};var template=document.createElement('template');template.innerHTML=`<style> :host { position: relative; display: block; }</style>`+`<content select='*'></content>`;function GaiaContainerChild(element){this._element=element;this.markDirty();}
GaiaContainerChild.prototype={get element(){return this._element;},get container(){if(!this._container){var container=document.createElement('div');container.classList.add('gaia-container-child');container.style.position='absolute';container.style.top='0';container.style.left='0';container.appendChild(this.element);this._container=container;}
return this._container;},get master(){if(!this._master){var master=document.createElement('div');master.style.visibility='hidden';this._master=master;}
return this._master;},markDirty(){this._lastElementWidth=null;this._lastElementHeight=null;this._lastElementDisplay=null;this._lastElementOrder=null;this._lastMasterTop=null;this._lastMasterLeft=null;},synchroniseMaster(){var master=this.master;var element=this.element;var style=window.getComputedStyle(element);var display=style.display;var order=style.order;var width=element.offsetWidth;var height=element.offsetHeight;if(this._lastElementWidth!==width||this._lastElementHeight!==height||this._lastElementDisplay!==display||this._lastElementOrder!==order){this._lastElementWidth=width;this._lastElementHeight=height;this._lastElementDisplay=display;this._lastElementOrder=order;master.style.width=width+'px';master.style.height=height+'px';master.style.display=display;master.style.order=order;}},synchroniseContainer(){var master=this.master;var container=this.container;var top=master.offsetTop;var left=master.offsetLeft;if(this._lastMasterTop!==top||this._lastMasterLeft!==left){this._lastMasterTop=top;this._lastMasterLeft=left;container.style.transform='translate('+left+'px, '+top+'px)';}}};exports.GaiaContainerChild=GaiaContainerChild;return document.registerElement('gaia-container',{prototype:proto});})(window);;'use strict';window.GaiaAppIcon=(function(exports){const LAUNCH_TIMEOUT=500;const PREDEFINED_ICONS={default:'default_icon.svg',unrecoverable:'app_install_unrecoverable.svg',installing:'app_installing.svg',paused:'app_install_canceled.svg',failed:'app_install_failed.svg'};const SHADOW_BLUR=1;const SHADOW_OFFSET={x:1,y:1};const SHADOW_COLOR='rgba(0, 0, 0, 0.2)';const DEFAULT_BACKGROUND_COLOR='rgb(228, 234, 238)';const CANVAS_PADDING=2*window.devicePixelRatio;const FAVICON_SCALE=0.55;var proto=Object.create(HTMLElement.prototype);var base=window.GAIA_ICONS_BASE_URL||window.COMPONENTS_BASE_URL||'bower_components/';var baseurl=window.GaiaAppIconBaseurl||base+'gaia-site-icon/';proto.createdCallback=function(){this._template=template.content.cloneNode(true);var shadow=this.createShadowRoot();shadow.appendChild(this._template);this._container=shadow.getElementById('image-container');this._titleContainer=shadow.getElementById('title-container');this._subtitle=shadow.getElementById('subtitle');this._showName=true;this._image=null;this._app=null;this._bookmark=null;this._entryPoint='';this._size=-1;this._hasIcon=false;this._hasUserSetIcon=false;this._hasPredefinedIcon=false;this._iconUrl=null;this._pendingIconUrl=null;this._pendingIconRefresh=false;this._lastState=null;this._predefinedIcons={};for(var key in PREDEFINED_ICONS){this._predefinedIcons[key]=baseurl+'images/'+PREDEFINED_ICONS[key];}
this.tabIndex=0;this.setAttribute('role','link');var activate=()=>{if(!this.dispatchEvent(new CustomEvent('activated',{cancelable:true}))){return;}
this.launch();};this.addEventListener('keydown',(e)=>{switch(e.keyCode){case 32:case 13:activate();}});this.addEventListener('click',activate);this.refresh();};Object.defineProperty(proto,'app',{get:function(){return this._app;},set:function(app){if(this._app){this._app.removeEventListener('progress',this);this._app.removeEventListener('downloaderror',this);this._app.removeEventListener('downloadsuccess',this);this._app.removeEventListener('downloadapplied',this);}
delete this.dataset.testIconUrl;this._cancelIconLoad();this._removeOldIcon();this._hasIcon=false;this._app=app;if(!app){return;}
this._bookmark=null;this._app.addEventListener('progress',this);this._app.addEventListener('downloaderror',this);this._app.addEventListener('downloadsuccess',this);this._app.addEventListener('downloadapplied',this);this._container.classList.add('initial-load');},enumerable:true});Object.defineProperty(proto,'entryPoint',{get:function(){return this._entryPoint;},set:function(entryPoint){this._entryPoint=entryPoint?entryPoint:'';this.refresh();},enumerable:true});Object.defineProperty(proto,'state',{get:function(){if(!this.app){return'unavailable';}
if(this.app.installState==='pending'&&!this.app.downloadAvailable&&!this.app.readyToApplyDownload){return'unrecoverable';}
if(this.app.downloading){return'installing';}
if(this.app.downloadError){if(this.app.downloadError.name==='DOWNLOAD_CANCELED'){return'paused';}else{return'error';}}
if(this.app.installState==='pending'){return'paused';}
return'installed';},enumberable:true});Object.defineProperty(proto,'name',{get:function(){return this._subtitle?this._subtitle.textContent:'';},enumberable:true});Object.defineProperty(proto,'size',{get:function(){return(this._size===-1)?this.clientWidth:this._size;},set:function(size){this._size=size>=0?size:-1;},enumerable:true});Object.defineProperty(proto,'bookmark',{get:function(){return this._bookmark;},set:function(bookmark){if(!this._bookmark||this._bookmark.id!==bookmark.id){this.app=null;}
this._bookmark=bookmark;},enumerable:true});Object.defineProperty(proto,'icon',{get:function(){if(window.VulpesCompat&&this.app&&this._vulpesSourceIcon)return Promise.resolve(this._vulpesSourceIcon);return new Promise((resolve,reject)=>{if(!this._hasIcon||this._hasPredefinedIcon){return reject();}
var image=this._container.querySelector('img');if(!image){return reject();}
var canvas=document.createElement('canvas');var size=this.size*window.devicePixelRatio;canvas.width=canvas.height=size;var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);try{canvas.toBlob((blob)=>{resolve(blob);});}catch(e){console.error('Failed to get canvas data for icon');reject(e);}});},set:function(blob){if(blob){this._prepareIconLoader();this._hasUserSetIcon=true;this._pendingIconUrl='user-set';this._image.src=URL.createObjectURL(blob);}else{this._pendingIconUrl=null;delete this.dataset.testIconUrl;this._cancelIconLoad();this._removeOldIcon();}},enumerable:true});Object.defineProperty(proto,'showName',{get:function(){return this._showName;},set:function(show){show=show?true:false;if(this._showName!==show){this._showName=show;this._titleContainer.classList.toggle('hidden',!show);}},enumerable:true});Object.defineProperty(proto,'isUserSet',{get:function(){return this._iconUrl==='user-set';},enumerable:true});proto._cancelIconLoad=function(){if(!this._image){return;}
this._pendingIconUrl=null;this._image.onload=null;this._image.src='';this._image=null;};proto._removeOldIcon=function(){while(this._container.children.length>1){this._container.removeChild(this._container.lastChild);}};proto.launch=function(){if(!this.app&&!this.bookmark){return;}
this.classList.add('launching');setTimeout(()=>{this.classList.remove('launching');},LAUNCH_TIMEOUT);if(this.app){window.performance.mark('appLaunch@'+this.app.origin);this.app.launch(this.entryPoint);}else{var features={name:this.bookmark.name,remote:true};if(this.bookmark.scope){features.scope=this.bookmark.scope;}
window.open(this.bookmark.url,'_samescope',Object.keys(features).map(function eachFeature(key){return encodeURIComponent(key)+'='+
encodeURIComponent(features[key]);}).join(','));}};proto._prepareIconLoader=function(){this._cancelIconLoad();this._hasPredefinedIcon=false;this._hasUserSetIcon=false;this._image=document.createElement('img');this._image.setAttribute('role','presentation');this._image.onload=()=>{this._image.onload=()=>{this._removeOldIcon();this._container.appendChild(this._image);this._container.classList.remove('initial-load');this._image=null;this._hasIcon=true;if(this._pendingIconUrl){this._iconUrl=this.dataset.testIconUrl=this._pendingIconUrl;this._pendingIconUrl=null;}
if(!this._hasPredefinedIcon){this.dispatchEvent(new CustomEvent('icon-loaded'));}
if(this._pendingIconRefresh){this._image=null;this._pendingIconRefresh=false;this.refresh();}};if(!this._hasUserSetIcon){var canvas=document.createElement('canvas');var size=this.size*window.devicePixelRatio;canvas.width=canvas.height=size;var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.shadowColor=SHADOW_COLOR;ctx.shadowBlur=SHADOW_BLUR;ctx.shadowOffsetX=SHADOW_OFFSET.x;ctx.shadowOffsetY=SHADOW_OFFSET.y;if(this.bookmark&&!this._hasPredefinedIcon){if(this._image.width<=size/2){ctx.beginPath();ctx.arc(size/2,size/2,size/2-CANVAS_PADDING,0,2*Math.PI);ctx.fillStyle=DEFAULT_BACKGROUND_COLOR;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.mozImageSmoothingEnabled=false;var iconSize=size*FAVICON_SCALE;ctx.drawImage(this._image,(size-iconSize)/2,(size-iconSize)/2,iconSize,iconSize);}else{var clipCanvas=document.createElement('canvas');clipCanvas.width=clipCanvas.height=size;var clipCtx=clipCanvas.getContext('2d',{willReadFrequently:true});clipCtx.beginPath();clipCtx.arc(size/2,size/2,size/2-CANVAS_PADDING,0,2*Math.PI);clipCtx.clip();clipCtx.drawImage(this._image,CANVAS_PADDING,CANVAS_PADDING,size-CANVAS_PADDING*2,size-CANVAS_PADDING*2);ctx.drawImage(clipCanvas,0,0);}}else{ctx.drawImage(this._image,CANVAS_PADDING,CANVAS_PADDING,size-CANVAS_PADDING*2,size-CANVAS_PADDING*2);}
canvas.toBlob(function(image,blob){if(image.onload){image.src=URL.createObjectURL(blob);}}.bind(this,this._image));}
if(this._hasUserSetIcon){this._image.onload();}};this._image.onerror=(e)=>{console.error('Failed to load icon',e);this._pendingIconUrl=null;if(this._pendingIconRefresh){this._pendingIconRefresh=false;this._image=null;this.refresh();}else if(!this._hasIcon){this._image.onerror=null;this._setPredefinedIcon('default');}else{this._image=null;}};};proto._setPredefinedIcon=function(name){this._hasPredefinedIcon=true;this._image.src=this._pendingIconUrl=this._predefinedIcons[name];};proto._localizeString=function(str){var userLang=document.documentElement.lang;if(navigator.mozL10n&&navigator.mozL10n.ctx.qps.indexOf(userLang)!==-1){return navigator.mozL10n.qps[userLang].translate(str);}
return str;};proto.updateName=function(){if(this.app){var userLang=document.documentElement.lang;var ep=this.entryPoint||undefined;this.app.getLocalizedValue('short_name',userLang,ep).then((shortName)=>{this._subtitle.textContent=this._localizeString(shortName);},()=>{this.app.getLocalizedValue('name',userLang,ep).then((name)=>{this._subtitle.textContent=this._localizeString(name);},(e)=>{var manifest=this.app.manifest||this.app.updateManifest;if(manifest){var nameObject=(manifest.entry_points&&this.entryPoint)?manifest.entry_points[this.entryPoint]:manifest;this._subtitle.textContent=this._localizeString(nameObject.short_name||nameObject.name);}else{console.error('Error retrieving app name',e);this._subtitle.textContent='';}});});}else if(this.bookmark){this._subtitle.textContent=this.bookmark.name;}else{this._subtitle.textContent='';}};proto.refresh=function(){if(!this._template){return;}
this.updateName();this._container.classList.remove('downloading');if(this.app){this.dataset.identifier=this.app.manifestURL+
(this.entryPoint?'/'+this.entryPoint:'');}else if(this.bookmark){this.dataset.identifier=this.bookmark.id;}else{delete this.dataset.identifier;}
if(this._image){this._pendingIconRefresh=true;return;}
var size=this.size*window.devicePixelRatio;if(size<1){return;}
this._prepareIconLoader();if(this.bookmark){if(!this._hasIcon){this._setPredefinedIcon('default');}
return;}
var state=this._lastState=this.state;switch(state){case'unrecoverable':this._setPredefinedIcon('unrecoverable');break;case'installing':this._setPredefinedIcon('installing');this._container.classList.add('downloading');break;case'paused':this._setPredefinedIcon('paused');break;case'error':this._setPredefinedIcon('failed');break;case'installed':var handleError=function(image,e){if(e.message!=='NO_ICON'&&e.name!=='NO_ICON'){console.error('Failed to retrieve icon',e);}if(image.onload&&!this._hasIcon){this._setPredefinedIcon('default');}else{this._image=null;}};var getImage=()=>{navigator.mozApps.mgmt.getIcon(this.app,size,this.entryPoint).then(function(image,blob){this._pendingIconUrl='app-icon';if(window.VulpesCompat){this._vulpesSourceIcon=blob;this._hasUserSetIcon=true;}if(image.onload){image.src=URL.createObjectURL(blob);}}.bind(this,this._image),handleError.bind(this,this._image));};getImage();break;}};proto.handleEvent=function(e){switch(e.type){case'progress':case'downloadsuccess':if(this.state!==this._lastState){this.refresh();}
break;case'downloaderror':case'downloadapplied':this.refresh();break;}};var template=document.createElement('template');var stylesheet=baseurl+'style.css';template.innerHTML=`<style>@import url(${stylesheet});</style>
     <div id="image-container"><div id="spinner"></div></div>
     <div id="title-container"><div dir="auto" id="subtitle"></div></div>`;return document.registerElement('gaia-app-icon',{prototype:proto});})(window);;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;window.GaiaPinCard=(function(win){'use strict';var proto=Object.create(HTMLElement.prototype);var DEFAULT_COLOR=[77,77,77];var baseurl=window.GaiaPinCardBaseurl||'/shared/elements/gaia_pin_card/';proto.createdCallback=function(test){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this.container=this._template.querySelector('.pin-card');this.bgElement=this._template.querySelector('.background');this.descElement=this._template.querySelector('.description');this.titleElement=this._template.querySelector('header');this.iconElement=this._template.querySelector('i');this._background={};shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);};Object.defineProperty(proto,'background',{get:function(){return this._background;},set:function(background){var bgSrc=background.src?'url('+background.src+')':'';this._background=background;this.bgElement.style.backgroundImage=bgSrc;this.bgElement.style.backgroundColor=background.themeColor||'#4d4d4d';var opacity=background.themeColor?'0.30':'0.15';var computedStyle=window.getComputedStyle(this.bgElement);var colorCodes;try{colorCodes=getColorCodes(computedStyle.backgroundColor);}catch(error){colorCodes=DEFAULT_COLOR;opacity=0.15;}
var rgbaColor=colorCodes.slice(1).join(',')+', '+opacity;var bgColorRgba='rgba('+rgbaColor+')';var computedWidth=computedStyle.width;var width=computedWidth==='auto'?'140px':computedWidth;var shadow='inset 0 0 0 '+width;this.bgElement.style.boxShadow=shadow+' '+bgColorRgba;}});Object.defineProperty(proto,'meta',{get:function(){return this._meta;},set:function(meta){this._meta=meta;this.renderCard();}});Object.defineProperty(proto,'title',{get:function(){return this.titleElement.textContent;},set:function(title){this.titleElement.textContent=title;}});Object.defineProperty(proto,'icon',{get:function(){return this.iconElement.style.backgroundImage;},set:function(icon){this.iconElement.style.backgroundImage=icon;}});proto.renderCard=function(){var description=getDescription(this._meta);if(description){this.descElement.appendChild(description);this.container.classList.remove('no-content');}
var background=getBackgroundBlob(this._meta);if(background){this.background={src:URL.createObjectURL(background),themeColor:this._meta['theme-color']||null};}};var template=document.createElement('template');template.innerHTML=`<article class="pin-card no-content">
      <div class="icon-container">
        <i></i>
      </div>
      <div class="background"></div>
      <div class="content">
        <header></header>
        <section class="description"></section>
      </div>
    </article>`;function getColorCodes(color){var colorCodes=/rgb\((\d+), (\d+), (\d+)\)/.exec(color);return colorCodes;}
function getDescription(meta){if(!meta['og:description']){return false;}
var desc=document.createElement('p');desc.textContent=meta['og:description'];return desc;}
function getBackgroundBlob(meta){return meta['og:image']||meta.screenshot;}
return document.registerElement('gaia-pin-card',{prototype:proto});})(window);;;(function(){var proto=Events.prototype;var slice=[].slice;function Events(obj){if(!(this instanceof Events))return new Events(obj);if(obj)return mixin(obj,proto);}
proto.on=function(name,cb){this._cbs=this._cbs||{};(this._cbs[name]||(this._cbs[name]=[])).push(cb);return this;};proto.once=function(name,cb){this.on(name,one);function one(){cb.apply(this,arguments);this.off(name,one);}};proto.off=function(name,cb){this._cbs=this._cbs||{};if(!name){this._cbs={};return;}
if(!cb){return delete this._cbs[name];}
var cbs=this._cbs[name]||[];var i;while(cbs&&~(i=cbs.indexOf(cb))){cbs.splice(i,1);}
return this;};proto.fire=proto.emit=function(options){var cbs=this._cbs=this._cbs||{};var name=options.name||options;var batch=(cbs[name]||[]).concat(cbs['*']||[]);var ctx=options.ctx||this;if(batch.length){this._fireArgs=arguments;var args=slice.call(arguments,1);while(batch.length){batch.shift().apply(ctx,args);}}
return this;};proto.firer=function(name){var self=this;return function(){var args=slice.call(arguments);args.unshift(name);self.fire.apply(self,args);};};function mixin(a,b){for(var key in b)a[key]=b[key];return a;}
if(typeof exports==='object'){module.exports=Events;}else if(typeof define==='function'&&define.amd){define(function(){return Events;});}else{window.evt=Events;}})();;;(function(define){'use strict';define(function(require,exports,module){var pointer=[{down:'touchstart',up:'touchend',move:'touchmove'},{down:'mousedown',up:'mouseup',move:'mousemove'}]['ontouchstart'in window?0:1];module.exports=function(el,options){var released=(options&&options.released)||200;var scope=(options&&options.scope)||el;var min=(options&&options.min)||300;var instant=options&&options.instant;var timeouts={};var removeReleased;el.addEventListener(pointer.down,function(e){var start=e.timeStamp;var target=e.target;var pressed=false;var last=e;if(removeReleased){removeReleased();}
if(instant){onPressed();}
else{notScrolling(e,onPressed);}
function onPressed(){classListUp(target,scope,'add','pressed');}
addEventListener(pointer.up,function fn(e){removeEventListener(pointer.up,fn,true);var duration=e.timeStamp-start;var delta=min-duration;var lag=Math.max(delta,0);timeouts.pressed=setTimeout(function(){classListUp(target,scope,'remove','pressed');classListUp(target,scope,'add','released');removeReleased=function(){clearTimeout(timeouts.released);classListUp(target,scope,'remove','released');removeReleased=null;};timeouts.released=setTimeout(removeReleased,released);},lag);},true);},true);};function notScrolling(e,fn){detectScrolling(e,function(scrolling){if(!scrolling){fn();}});}
function detectScrolling(e,fn){var period=76;var last=e;if(windowScrolling){return fn(true);}
if(!e.touches){return fn(false);}
addEventListener('touchmove',onTouchMove,true);setTimeout(detect,period);function detect(){removeEventListener('touchmove',onTouchMove,true);if(windowScrolling){return fn(true);}
var time=last.timeStamp-e.timeStamp;var distance=getDistance(e.touches[0],last.touches[0]);var speed=distance/time;var scrolling=speed>0.03;fn(scrolling);}
function onTouchMove(e){last=e;}
function getDistance(a,b){var xs=0;var ys=0;xs=b.clientX-a.clientX;xs=xs*xs;ys=b.clientY-a.clientY;ys=ys*ys;return Math.sqrt(xs+ys);}}
var windowScrolling=false;var scrollTimeout;function classListUp(el,scope,method,cls){while(el&&el.classList&&el!==scope.parentNode){el.classList[method](cls);el=el.parentNode;}}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('pressed',this));;;(function(define){'use strict';define(function(require,exports,module){var textContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');var innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');var removeAttribute=Element.prototype.removeAttribute;var setAttribute=Element.prototype.setAttribute;var noop=function(){};exports.register=function(name,props){var baseProto=getBaseProto(props.extends);var template=props.template||baseProto.templateString;var extensible=props.extensible=props.hasOwnProperty('extensible')?props.extensible:true;delete props.extends;if(template){if(extensible&&props.template){props.templateString=props.template;}
var output=processCss(template,name);props.template=document.createElement('template');props.template.innerHTML=output.template;props.lightCss=output.lightCss;props.globalCss=props.globalCss||'';props.globalCss+=output.globalCss;}
injectGlobalCss(props.globalCss);delete props.globalCss;var descriptors=mixin(props.attrs||{},base.descriptors);props._attrs=props.attrs;delete props.attrs;var proto=createProto(baseProto,props);Object.defineProperties(proto,descriptors);try{return document.registerElement(name,{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}};var base={properties:{GaiaComponent:true,attributeChanged:noop,attached:noop,detached:noop,created:noop,createdCallback:function(){if(this.dirObserver){addDirObserver();}
injectLightCss(this);this.created();},attributeChangedCallback:function(name,from,to){var prop=toCamelCase(name);if(this._attrs&&this._attrs[prop]){this[prop]=to;}
this.attributeChanged(name,from,to);},attachedCallback:function(){if(this.dirObserver){this.setInnerDirAttributes=setInnerDirAttributes.bind(null,this);document.addEventListener('dirchanged',this.setInnerDirAttributes);}
this.attached();},detachedCallback:function(){if(this.dirObserver){document.removeEventListener('dirchanged',this.setInnerDirAttributes);}
this.detached();},setupShadowRoot:function(){if(!this.template){return;}
var node=document.importNode(this.template.content,true);this.createShadowRoot().appendChild(node);if(this.dirObserver){setInnerDirAttributes(this);}
return this.shadowRoot;},setAttr:function(name,value){var internal=this.shadowRoot.firstElementChild;setAttribute.call(internal,name,value);setAttribute.call(this,name,value);},removeAttr:function(name){var internal=this.shadowRoot.firstElementChild;removeAttribute.call(internal,name);removeAttribute.call(this,name);}},descriptors:{textContent:{set:function(value){textContent.set.call(this,value);if(this.lightStyle){this.appendChild(this.lightStyle);}},get:function(){return textContent.get();}},innerHTML:{set:function(value){innerHTML.set.call(this,value);if(this.lightStyle){this.appendChild(this.lightStyle);}},get:innerHTML.get}}};var defaultPrototype=createProto(HTMLElement.prototype,base.properties);function getBaseProto(proto){if(!proto){return defaultPrototype;}
proto=proto.prototype||proto;return!proto.GaiaComponent?createProto(proto,base.properties):proto;}
function createProto(proto,props){return mixin(Object.create(proto),props);}
var hasShadowCSS=(function(){var div=document.createElement('div');try{div.querySelector(':host');div.querySelector('::content');return true;}
catch(e){return false;}})();var regex={shadowCss:/(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,':host':/(?:\:host)/g,':host()':/\:host\((.+)\)(?: \:\:content)?/g,':host-context':/\:host-context\((.+)\)([^{,]+)?/g,'::content':/(?:\:\:content)/g};function processCss(template,name){var globalCss='';var lightCss='';if(!hasShadowCSS){template=template.replace(regex.shadowCss,function(match){var hostContext=regex[':host-context'].exec(match);if(hostContext){globalCss+=match.replace(regex['::content'],'').replace(regex[':host-context'],'$1 '+name+'$2').replace(/ +/g,' ');}else{lightCss+=match.replace(regex[':host()'],name+'$1').replace(regex[':host'],name).replace(regex['::content'],name);}
return'';});}
return{template:template,lightCss:lightCss,globalCss:globalCss};}
function injectGlobalCss(css){if(!css){return;}
var style=document.createElement('style');style.innerHTML=css.trim();headReady().then(function(){document.head.appendChild(style);});}
function headReady(){return new Promise(function(resolve){if(document.head){return resolve();}
window.addEventListener('load',function fn(){window.removeEventListener('load',fn);resolve();});});}
function injectLightCss(el){if(hasShadowCSS){return;}
var stylesheet=el.querySelector('style');if(!stylesheet){stylesheet=document.createElement('style');stylesheet.setAttribute('scoped','');stylesheet.appendChild(document.createTextNode(el.lightCss));el.appendChild(stylesheet);}
el.lightStyle=stylesheet;}
function toCamelCase(string){return string.replace(/-(.)/g,function replacer(string,p1){return p1.toUpperCase();});}
var dirObserver;function setInnerDirAttributes(component){var dir=component.dir||document.dir;Array.from(component.shadowRoot.children).forEach(element=>{if(element.nodeName!=='STYLE'){element.dir=dir;}});}
function addDirObserver(){if(dirObserver){return;}
dirObserver=new MutationObserver(onChanged);dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});function onChanged(mutations){document.dispatchEvent(new Event('dirchanged'));}}
function mixin(target,source){for(var key in source){target[key]=source[key];}
return target;}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));;;(function(define){'use strict';define((require,exports,module)=>{var component=require('gaia-component');var debug=0?console.log.bind(console):()=>{};var schedule=(window.scheduler&&typeof window.scheduler.mutation==="function"?window.scheduler:null)||{mutation:block=>Promise.resolve(block()),transition:(block,el,event,timeout)=>{block();return after(el,event,timeout||500);}};module.exports=component.register('gaia-dialog',{created(){this.setupShadowRoot();this.els={inner:this.shadowRoot.querySelector('.dialog-inner'),background:this.shadowRoot.querySelector('.background'),window:this.shadowRoot.querySelector('.window')};this.shadowRoot.addEventListener('click',e=>this.onClick(e));setTimeout(()=>this.makeAccessible());},makeAccessible(){this.setAttribute('role','dialog');},onClick(e){var el=e.target.closest('[on-click]');if(!el){return;}
debug('onClick');var method=el.getAttribute('on-click');if(typeof this[method]=='function'){this[method]();}},open(options){if(this.isOpen){return;}
debug('open dialog');this.isOpen=true;return this.show().then(()=>this.animateBackgroundIn(options)).then(()=>this.animateWindowIn()).then(()=>this.dispatch('opened'));},close(options){if(!this.isOpen){return;}
debug('close dialog');this.isOpen=false;return this.animateWindowOut().then(()=>this.animateBackgroundOut()).then(()=>this.hide()).then(()=>this.dispatch('closed'));},animateBackgroundIn(options){if(options){return this.animateBackgroundInFrom(options);}
var el=this.els.background;return schedule.transition(()=>{debug('animate background in');el.classList.remove('animate-out');el.classList.add('animate-in');},el,'animationend');},animateBackgroundOut(){var el=this.els.background;return schedule.transition(()=>{debug('animate background out');el.classList.add('animate-out');el.classList.remove('animate-in');},el,'animationend').then(()=>el.style='');},animateBackgroundInFrom(pos){var el=this.els.background;var scale=Math.sqrt(window.innerWidth*window.innerHeight)/15;var duration=scale*9;return schedule.mutation(()=>{el.classList.add('circular');el.classList.remove('animate-out');el.style.transform=`translate(${pos.clientX}px, ${pos.clientY}px)`;el.style.transitionDuration=duration+'ms';el.offsetTop;}).then(()=>{return schedule.transition(()=>{debug('animate background in from',pos);el.style.transform+=` scale(${scale})`;el.style.opacity=1;},el,'transitionend',duration*1.5);});},show(){return schedule.mutation(()=>{debug('show');this.style.display='block';});},hide(){return schedule.mutation(()=>{debug('hide');this.style.display='none';});},animateWindowIn(){var el=this.els.window;return schedule.transition(()=>{debug('animate window in');el.classList.add('animate-in');el.classList.remove('animate-out');},el,'animationend');},animateWindowOut(){var el=this.els.window;return schedule.transition(()=>{debug('animate window out');el.classList.add('animate-out');el.classList.remove('animate-in');},el,'animationend');},dispatch(name){this.dispatchEvent(new CustomEvent(name));},attrs:{opened:{get:function(){return!!this.isOpen;},set:function(value){value=value===''||value;if(!value){this.close();}
else{this.open();}}}},template:`
    <div class="dialog-inner">
      <div class="background" on-click="close"></div>
      <div class="window"><content></content></div>
    </div>

    <style>

    ::content * {
      box-sizing: border-box;
      font-weight: inherit;
      font-size: inherit;
    }

    ::content p,
    ::content h1,
    ::content h2,
    ::content h3,
    ::content h4,
    ::content button,
    ::content fieldset {
      padding: 0;
      margin: 0;
      border: 0;
    }

    :host {
      display: none;
      position: fixed;
      top: 0px; left: 0px;
      width: 100%;
      height: 100%;
      z-index: 200;
      font-style: italic;
      text-align: center;

      overflow: hidden;
    }

    /** Inner
     ---------------------------------------------------------*/

    .dialog-inner {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    /** Background
     ---------------------------------------------------------*/

    .background {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      background: rgba(199,199,199,0.85);
    }

    /**
     * .circular
     */

    .background.circular {
      width: 40px;
      height: 40px;
      margin: -20px;
      border-radius: 50%;
      will-change: transform, opacity;
      transition-property: opacity, transform;
      transition-timing-function: linear;
    }

    /**
     * .animate-in
     */

    .background.animate-in {
      animation-name: gaia-dialog-fade-in;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
    }

    /**
     * .animate-out
     */

    .background.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Window
     ---------------------------------------------------------*/

    .window {
      position: relative;
      width: 90%;
      max-width: 350px;
      margin: auto;
      box-shadow: 0 1px 0 0px rgba(0,0,0,0.15);
      background: var(--color-iota);
      transition: opacity 300ms;
      opacity: 0;
    }

    .window.animate-in {
      animation-name: gaia-dialog-entrance;
      animation-duration: 300ms;
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
      animation-fill-mode: forwards;
      opacity: 1;
    }

    .window.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 150ms;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Title
     ---------------------------------------------------------*/

    ::content h1 {
      padding: 16px;
      font-size: 23px;
      line-height: 26px;
      font-weight: 200;
      font-style: italic;
      color: #858585;
    }

    ::content strong {
      font-weight: 700;
    }

    ::content small {
      font-size: 0.8em;
    }

    /** Section
     ---------------------------------------------------------*/

    ::content section {
      padding: 33px 18px;
      color: #858585;
    }

    ::content section > *:not(:last-child) {
      margin-bottom: 13px;
    }

    /** Paragraphs
     ---------------------------------------------------------*/

    ::content p {
      text-align: -moz-start;
    }

    /** Buttons
     ---------------------------------------------------------*/

    ::content button {
      position: relative;
      display: block;
      width: 100%;
      height: 50px;
      margin: 0;
      border: 0;
      padding: 0rem 16px;
      cursor: pointer;
      font: inherit;
      background: var(--color-beta);
      color: var(--color-epsilon);
      transition: all 200ms;
      transition-delay: 300ms;
      border-radius: 0;
    }

    /**
     * .primary
     */

    ::content button.primary {
      color: var(--highlight-color);
    }

    /**
     * .danger
     */

    ::content button.danger {
      color: var(--color-destructive);
    }

    /**
     * Disabled buttons
     */

    ::content button[disabled] {
      color: var(--color-zeta);
    }

    /** Button Divider Line
     ---------------------------------------------------------*/

    ::content button:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 6px;
      right: 6px;
      top: 49px;
      background: #E7E7E7;
    }

    ::content button:last-of-type:after {
      display: none;
    }

    ::content button:active {
      background-color: var(--highlight-color);
      color: #fff;
      transition: none;
    }

    ::content button:active:after {
      background: var(--highlight-color);
      transition: none;
    }

    ::content button[data-icon]:before {
      float: left;
    }

    /** Fieldset (button group)
     ---------------------------------------------------------*/

    ::content fieldset {
      overflow: hidden;
    }

    ::content fieldset button {
      position: relative;
      float: left;
      width: 50%;
    }

    ::content fieldset button:after {
      content: '';
      display: block;
      position: absolute;
      top: 6px;
      bottom: 6px;
      right: 0px;
      left: auto;
      width: 1px;
      height: calc(100% - 12px);
      background: #e7e7e7;
      transition: all 200ms;
      transition-delay: 200ms;
    }

    </style>`,globalCss:`
    @keyframes gaia-dialog-entrance {
      0% { transform: translateY(100px); }
      100% { transform: translateY(0px); }
    }

    @keyframes gaia-dialog-fade-in {
      0% { opacity: 0 }
      100% { opacity: 1 }
    }

    @keyframes gaia-dialog-fade-out {
      0% { opacity: 1 }
      100% { opacity: 0 }
    }`});function after(target,event,timeout){return new Promise(resolve=>{var timer=timeout&&setTimeout(cb,timeout);target.addEventListener(event,cb);function cb(){target.removeEventListener(event,cb);clearTimeout(timer);resolve();}});}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog',this));;;(function(define){'use strict';define(function(require,exports,module){var GaiaDialogProto=require('gaia-dialog').prototype;var component=require('gaia-component');module.exports=component.register('gaia-dialog-action',{created:function(){this.setupShadowRoot();this.els={dialog:this.shadowRoot.querySelector('gaia-dialog'),submit:this.shadowRoot.querySelector('.submit'),cancel:this.shadowRoot.querySelector('.cancel')};this.els.dialog.addEventListener('closed',GaiaDialogProto.hide.bind(this));},open:function(e){return GaiaDialogProto.show.call(this).then(()=>this.els.dialog.open(e));},close:function(){return this.els.dialog.close().then(GaiaDialogProto.hide.bind(this));},template:`
    <gaia-dialog>
      <section>
        <content select="h1"></content>
      </section>
      <content select="button"></content>
      <button on-click="close" class="cancel">Cancel</button>
    </gaia-dialog>

    <style>

    :host {
      display: none;
    }

    :host[opened],
    :host.animating {
      display: block;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    /** Button
     ---------------------------------------------------------*/

    ::content section {
      padding: 33px 16px;
    }

    ::content button {
      position: relative;
      display: block;
      width: 100%;
      height: 50px;
      margin: 0;
      border: 0;
      padding: 0rem 25px;
      font: inherit;
      background: var(--color-beta);
      color: var(--color-epsilon);
      transition: all 200ms;
      transition-delay: 300ms;
    }

    ::content button:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 6px;
      right: 6px;
      top: 49px;
      background: #E7E7E7;
    }

    ::content button:last-child:after {
      display: none;
    }

    ::content button:active {
      background-color: var(--highlight-color);
      color: #fff;
      transition: none;
    }

    ::content button:active:after {
      background: var(--highlight-color);
      transition: none;
    }

    </style>`});});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-action',this));;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
L10nError.prototype=Object.create(Error.prototype);L10nError.prototype.constructor=L10nError;var io={_load:function(type,url,callback,sync){var xhr=new XMLHttpRequest();var needParse;if(xhr.overrideMimeType){xhr.overrideMimeType(type);}
xhr.open('GET',url,!sync);if(type==='application/json'){if(sync){needParse=true;}else{xhr.responseType='json';}}
xhr.addEventListener('load',function io_onload(e){if(e.target.status===200||e.target.status===0){var res=e.target.response||e.target.responseText;callback(null,needParse?JSON.parse(res):res);}else{callback(new L10nError('Not found: '+url));}});xhr.addEventListener('error',callback);xhr.addEventListener('timeout',callback);try{xhr.send(null);}catch(e){if(e.name==='NS_ERROR_FILE_NOT_FOUND'){callback(new L10nError('Not found: '+url));}else{throw e;}}},load:function(url,callback,sync){return io._load('text/plain',url,callback,sync);},loadJSON:function(url,callback,sync){return io._load('application/json',url,callback,sync);}};function EventEmitter(){}
EventEmitter.prototype.emit=function ee_emit(){if(!this._listeners){return;}
var args=Array.prototype.slice.call(arguments);var type=args.shift();if(!this._listeners[type]){return;}
var typeListeners=this._listeners[type].slice();for(var i=0;i<typeListeners.length;i++){typeListeners[i].apply(this,args);}};EventEmitter.prototype.addEventListener=function ee_add(type,listener){if(!this._listeners){this._listeners={};}
if(!(type in this._listeners)){this._listeners[type]=[];}
this._listeners[type].push(listener);};EventEmitter.prototype.removeEventListener=function ee_rm(type,listener){if(!this._listeners){return;}
var typeListeners=this._listeners[type];var pos=typeListeners.indexOf(listener);if(pos===-1){return;}
typeListeners.splice(pos,1);};function getPluralRule(lang){var locales2rules={'af':3,'ak':4,'am':4,'ar':1,'asa':3,'az':0,'be':11,'bem':3,'bez':3,'bg':3,'bh':4,'bm':0,'bn':3,'bo':0,'br':20,'brx':3,'bs':11,'ca':3,'cgg':3,'chr':3,'cs':12,'cy':17,'da':3,'de':3,'dv':3,'dz':0,'ee':3,'el':3,'en':3,'eo':3,'es':3,'et':3,'eu':3,'fa':0,'ff':5,'fi':3,'fil':4,'fo':3,'fr':5,'fur':3,'fy':3,'ga':8,'gd':24,'gl':3,'gsw':3,'gu':3,'guw':4,'gv':23,'ha':3,'haw':3,'he':2,'hi':4,'hr':11,'hu':0,'id':0,'ig':0,'ii':0,'is':3,'it':3,'iu':7,'ja':0,'jmc':3,'jv':0,'ka':0,'kab':5,'kaj':3,'kcg':3,'kde':0,'kea':0,'kk':3,'kl':3,'km':0,'kn':0,'ko':0,'ksb':3,'ksh':21,'ku':3,'kw':7,'lag':18,'lb':3,'lg':3,'ln':4,'lo':0,'lt':10,'lv':6,'mas':3,'mg':4,'mk':16,'ml':3,'mn':3,'mo':9,'mr':3,'ms':0,'mt':15,'my':0,'nah':3,'naq':7,'nb':3,'nd':3,'ne':3,'nl':3,'nn':3,'no':3,'nr':3,'nso':4,'ny':3,'nyn':3,'om':3,'or':3,'pa':3,'pap':3,'pl':13,'ps':3,'pt':3,'rm':3,'ro':9,'rof':3,'ru':11,'rwk':3,'sah':0,'saq':3,'se':7,'seh':3,'ses':0,'sg':0,'sh':11,'shi':19,'sk':12,'sl':14,'sma':7,'smi':7,'smj':7,'smn':7,'sms':7,'sn':3,'so':3,'sq':3,'sr':11,'ss':3,'ssy':3,'st':3,'sv':3,'sw':3,'syr':3,'ta':3,'te':3,'teo':3,'th':0,'ti':4,'tig':3,'tk':3,'tl':4,'tn':3,'to':0,'tr':0,'ts':3,'tzm':22,'uk':11,'ur':3,'ve':3,'vi':0,'vun':3,'wa':4,'wae':3,'wo':0,'xh':3,'xog':3,'yo':0,'zh':0,'zu':3};function isIn(n,list){return list.indexOf(n)!==-1;}
function isBetween(n,start,end){return typeof n===typeof start&&start<=n&&n<=end;}
var pluralRules={'0':function(){return'other';},'1':function(n){if((isBetween((n%100),3,10))){return'few';}
if(n===0){return'zero';}
if((isBetween((n%100),11,99))){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'2':function(n){if(n!==0&&(n%10)===0){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'3':function(n){if(n===1){return'one';}
return'other';},'4':function(n){if((isBetween(n,0,1))){return'one';}
return'other';},'5':function(n){if((isBetween(n,0,2))&&n!==2){return'one';}
return'other';},'6':function(n){if(n===0){return'zero';}
if((n%10)===1&&(n%100)!==11){return'one';}
return'other';},'7':function(n){if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'8':function(n){if((isBetween(n,3,6))){return'few';}
if((isBetween(n,7,10))){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'9':function(n){if(n===0||n!==1&&(isBetween((n%100),1,19))){return'few';}
if(n===1){return'one';}
return'other';},'10':function(n){if((isBetween((n%10),2,9))&&!(isBetween((n%100),11,19))){return'few';}
if((n%10)===1&&!(isBetween((n%100),11,19))){return'one';}
return'other';},'11':function(n){if((isBetween((n%10),2,4))&&!(isBetween((n%100),12,14))){return'few';}
if((n%10)===0||(isBetween((n%10),5,9))||(isBetween((n%100),11,14))){return'many';}
if((n%10)===1&&(n%100)!==11){return'one';}
return'other';},'12':function(n){if((isBetween(n,2,4))){return'few';}
if(n===1){return'one';}
return'other';},'13':function(n){if((isBetween((n%10),2,4))&&!(isBetween((n%100),12,14))){return'few';}
if(n!==1&&(isBetween((n%10),0,1))||(isBetween((n%10),5,9))||(isBetween((n%100),12,14))){return'many';}
if(n===1){return'one';}
return'other';},'14':function(n){if((isBetween((n%100),3,4))){return'few';}
if((n%100)===2){return'two';}
if((n%100)===1){return'one';}
return'other';},'15':function(n){if(n===0||(isBetween((n%100),2,10))){return'few';}
if((isBetween((n%100),11,19))){return'many';}
if(n===1){return'one';}
return'other';},'16':function(n){if((n%10)===1&&n!==11){return'one';}
return'other';},'17':function(n){if(n===3){return'few';}
if(n===0){return'zero';}
if(n===6){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'18':function(n){if(n===0){return'zero';}
if((isBetween(n,0,2))&&n!==0&&n!==2){return'one';}
return'other';},'19':function(n){if((isBetween(n,2,10))){return'few';}
if((isBetween(n,0,1))){return'one';}
return'other';},'20':function(n){if((isBetween((n%10),3,4)||((n%10)===9))&&!(isBetween((n%100),10,19)||isBetween((n%100),70,79)||isBetween((n%100),90,99))){return'few';}
if((n%1000000)===0&&n!==0){return'many';}
if((n%10)===2&&!isIn((n%100),[12,72,92])){return'two';}
if((n%10)===1&&!isIn((n%100),[11,71,91])){return'one';}
return'other';},'21':function(n){if(n===0){return'zero';}
if(n===1){return'one';}
return'other';},'22':function(n){if((isBetween(n,0,1))||(isBetween(n,11,99))){return'one';}
return'other';},'23':function(n){if((isBetween((n%10),1,2))||(n%20)===0){return'one';}
return'other';},'24':function(n){if((isBetween(n,3,10)||isBetween(n,13,19))){return'few';}
if(isIn(n,[2,12])){return'two';}
if(isIn(n,[1,11])){return'one';}
return'other';}};var index=locales2rules[lang.replace(/-.*$/,'')];if(!(index in pluralRules)){return function(){return'other';};}
return pluralRules[index];}
var MAX_PLACEABLES=100;var PropertiesParser={patterns:null,entryIds:null,init:function(){this.patterns={comment:/^\s*#|^\s*$/,entity:/^([^=\s]+)\s*=\s*(.*)$/,multiline:/[^\\]\\$/,index:/\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,unicode:/\\u([0-9a-fA-F]{1,4})/g,entries:/[^\r\n]+/g,controlChars:/\\([\\\n\r\t\b\f\{\}\"\'])/g,placeables:/\{\{\s*([^\s]*?)\s*\}\}/,};},parse:function(ctx,source){if(!this.patterns){this.init();}
var ast=[];this.entryIds=Object.create(null);var entries=source.match(this.patterns.entries);if(!entries){return ast;}
for(var i=0;i<entries.length;i++){var line=entries[i];if(this.patterns.comment.test(line)){continue;}
while(this.patterns.multiline.test(line)&&i<entries.length){line=line.slice(0,-1)+entries[++i].trim();}
var entityMatch=line.match(this.patterns.entity);if(entityMatch){try{this.parseEntity(entityMatch[1],entityMatch[2],ast);}catch(e){if(ctx){ctx._emitter.emit('parseerror',e);}else{throw e;}}}}
return ast;},parseEntity:function(id,value,ast){var name,key;var pos=id.indexOf('[');if(pos!==-1){name=id.substr(0,pos);key=id.substring(pos+1,id.length-1);}else{name=id;key=null;}
var nameElements=name.split('.');if(nameElements.length>2){throw new L10nError('Error in ID: "'+name+'".'+' Nested attributes are not supported.');}
var attr;if(nameElements.length>1){name=nameElements[0];attr=nameElements[1];if(attr[0]==='$'){throw new L10nError('Attribute can\'t start with "$"',id);}}else{attr=null;}
this.setEntityValue(name,attr,key,this.unescapeString(value),ast);},setEntityValue:function(id,attr,key,rawValue,ast){var pos,v;var value=rawValue.indexOf('{{')>-1?this.parseString(rawValue):rawValue;if(attr){pos=this.entryIds[id];if(pos===undefined){v={$i:id};if(key){v[attr]={};v[attr][key]=value;}else{v[attr]=value;}
ast.push(v);this.entryIds[id]=ast.length-1;return;}
if(key){if(typeof(ast[pos][attr])==='string'){ast[pos][attr]={$x:this.parseIndex(ast[pos][attr]),$v:{}};}
ast[pos][attr].$v[key]=value;return;}
ast[pos][attr]=value;return;}
if(key){pos=this.entryIds[id];if(pos===undefined){v={};v[key]=value;ast.push({$i:id,$v:v});this.entryIds[id]=ast.length-1;return;}
if(typeof(ast[pos].$v)==='string'){ast[pos].$x=this.parseIndex(ast[pos].$v);ast[pos].$v={};}
ast[pos].$v[key]=value;return;}
ast.push({$i:id,$v:value});this.entryIds[id]=ast.length-1;},parseString:function(str){var chunks=str.split(this.patterns.placeables);var complexStr=[];var len=chunks.length;var placeablesCount=(len-1)/2;if(placeablesCount>=MAX_PLACEABLES){throw new L10nError('Too many placeables ('+placeablesCount+', max allowed is '+MAX_PLACEABLES+')');}
for(var i=0;i<chunks.length;i++){if(chunks[i].length===0){continue;}
if(i%2===1){complexStr.push({t:'idOrVar',v:chunks[i]});}else{complexStr.push(chunks[i]);}}
return complexStr;},unescapeString:function(str){if(str.lastIndexOf('\\')!==-1){str=str.replace(this.patterns.controlChars,'$1');}
return str.replace(this.patterns.unicode,function(match,token){return unescape('%u'+'0000'.slice(token.length)+token);});},parseIndex:function(str){var match=str.match(this.patterns.index);if(!match){throw new L10nError('Malformed index');}
if(match[2]){return[{t:'idOrVar',v:match[1]},match[2]];}else{return[{t:'idOrVar',v:match[1]}];}}};var KNOWN_MACROS=['plural'];var MAX_PLACEABLE_LENGTH=2500;var rePlaceables=/\{\{\s*(.+?)\s*\}\}/g;var nonLatin1=/[^\x01-\xFF]/;var FSI='\u2068';var PDI='\u2069';function createEntry(node,env){var keys=Object.keys(node);if(typeof node.$v==='string'&&keys.length===2){return node.$v;}
var attrs;for(var i=0,key;key=keys[i];i++){if(key[0]==='$'){continue;}
if(!attrs){attrs=Object.create(null);}
attrs[key]=createAttribute(node[key],env,node.$i+'.'+key);}
return{id:node.$i,value:node.$v!==undefined?node.$v:null,index:node.$x||null,attrs:attrs||null,env:env,dirty:false};}
function createAttribute(node,env,id){if(typeof node==='string'){return node;}
return{id:id,value:node.$v||(node!==undefined?node:null),index:node.$x||null,env:env,dirty:false};}
function format(args,entity){if(typeof entity==='string'){return[{},entity];}
if(entity.dirty){throw new L10nError('Cyclic reference detected: '+entity.id);}
entity.dirty=true;var rv;try{rv=resolveValue({},args,entity.env,entity.value,entity.index);}finally{entity.dirty=false;}
return rv;}
function resolveIdentifier(args,env,id){if(KNOWN_MACROS.indexOf(id)>-1){return[{},env['__'+id]];}
if(args&&args.hasOwnProperty(id)){if(typeof args[id]==='string'||(typeof args[id]==='number'&&!isNaN(args[id]))){return[{},args[id]];}else{throw new L10nError('Arg must be a string or a number: '+id);}}
if(id in env&&id!=='__proto__'){return format(args,env[id]);}
throw new L10nError('Unknown reference: '+id);}
function subPlaceable(locals,args,env,id){var res;try{res=resolveIdentifier(args,env,id);}catch(err){return[{error:err},'{{ '+id+' }}'];}
var value=res[1];if(typeof value==='number'){return res;}
if(typeof value==='string'){if(value.length>=MAX_PLACEABLE_LENGTH){throw new L10nError('Too many characters in placeable ('+
value.length+', max allowed is '+
MAX_PLACEABLE_LENGTH+')');}
if(locals.contextIsNonLatin1||value.match(nonLatin1)){res[1]=FSI+value+PDI;}
return res;}
return[{},'{{ '+id+' }}'];}
function interpolate(locals,args,env,arr){return arr.reduce(function(prev,cur){if(typeof cur==='string'){return[prev[0],prev[1]+cur];}else if(cur.t==='idOrVar'){var placeable=subPlaceable(locals,args,env,cur.v);return[prev[0],prev[1]+placeable[1]];}},[locals,'']);}
function resolveSelector(args,env,expr,index){var selectorName=index[0].v;var selector=resolveIdentifier(args,env,selectorName)[1];if(typeof selector!=='function'){return selector;}
var argValue=index[1]?resolveIdentifier(args,env,index[1])[1]:undefined;if(selector===env.__plural){if(argValue===0&&'zero'in expr){return'zero';}
if(argValue===1&&'one'in expr){return'one';}
if(argValue===2&&'two'in expr){return'two';}}
return selector(argValue);}
function resolveValue(locals,args,env,expr,index){if(!expr){return[locals,expr];}
if(typeof expr==='string'||typeof expr==='boolean'||typeof expr==='number'){return[locals,expr];}
if(Array.isArray(expr)){locals.contextIsNonLatin1=expr.some(function($_){return typeof($_)==='string'&&$_.match(nonLatin1);});return interpolate(locals,args,env,expr);}
if(index){var selector=resolveSelector(args,env,expr,index);if(expr.hasOwnProperty(selector)){return resolveValue(locals,args,env,expr[selector]);}}
if('other'in expr){return resolveValue(locals,args,env,expr.other);}
throw new L10nError('Unresolvable value');}
var Resolver={createEntry:createEntry,format:format,rePlaceables:rePlaceables};function walkContent(node,fn){if(typeof node==='string'){return fn(node);}
if(node.t==='idOrVar'){return node;}
var rv=Array.isArray(node)?[]:{};var keys=Object.keys(node);for(var i=0,key;(key=keys[i]);i++){if(key==='$i'||key==='$x'){rv[key]=node[key];}else{rv[key]=walkContent(node[key],fn);}}
return rv;}
var reAlphas=/[a-zA-Z]/g;var reVowels=/[aeiouAEIOU]/g;var ACCENTED_MAP='\u0226\u0181\u0187\u1E12\u1E16\u0191\u0193\u0126\u012A'+'\u0134\u0136\u013F\u1E3E\u0220\u01FE\u01A4\u024A\u0158'+'\u015E\u0166\u016C\u1E7C\u1E86\u1E8A\u1E8E\u1E90'+'[\\]^_`'+'\u0227\u0180\u0188\u1E13\u1E17\u0192\u0260\u0127\u012B'+'\u0135\u0137\u0140\u1E3F\u019E\u01FF\u01A5\u024B\u0159'+'\u015F\u0167\u016D\u1E7D\u1E87\u1E8B\u1E8F\u1E91';var FLIPPED_MAP='\u2200\u0510\u2183p\u018E\u025F\u05E4HI\u017F'+'\u04FC\u02E5WNO\u0500\xD2\u1D1AS\u22A5\u2229\u0245'+'\uFF2DX\u028EZ'+'[\\]\u1D65_,'+'\u0250q\u0254p\u01DD\u025F\u0183\u0265\u0131\u027E'+'\u029E\u0285\u026Fuodb\u0279s\u0287n\u028C\u028Dx\u028Ez';function makeLonger(val){return val.replace(reVowels,function(match){return match+match.toLowerCase();});}
function replaceChars(map,val){return val.replace(reAlphas,function(match){return map.charAt(match.charCodeAt(0)-65);});}
var reWords=/[^\W0-9_]+/g;function makeRTL(val){return val.replace(reWords,function(match){return'\u202e'+match+'\u202c';});}
var reExcluded=/(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;function mapContent(fn,val){if(!val){return val;}
var parts=val.split(reExcluded);var modified=parts.map(function(part){if(reExcluded.test(part)){return part;}
return fn(part);});return modified.join('');}
function Pseudo(id,name,charMap,modFn){this.id=id;this.translate=mapContent.bind(null,function(val){return replaceChars(charMap,modFn(val));});this.name=this.translate(name);}
var PSEUDO={'fr-x-psaccent':new Pseudo('fr-x-psaccent','Runtime Accented',ACCENTED_MAP,makeLonger),'ar-x-psbidi':new Pseudo('ar-x-psbidi','Runtime Bidi',FLIPPED_MAP,makeRTL)};function Locale(id,ctx){this.id=id;this.ctx=ctx;this.isReady=false;this.entries=Object.create(null);this.entries.__plural=getPluralRule(this.isPseudo()?this.ctx.defaultLocale:id);}
Locale.prototype.isPseudo=function(){return this.ctx.qps.indexOf(this.id)!==-1;};var bindingsIO={extra:function(id,ver,path,type,callback,errback){if(type==='properties'){type='text';}
navigator.mozApps.getLocalizationResource(id,ver,path,type).then(callback.bind(null,null),errback);},app:function(id,ver,path,type,callback,errback,sync){switch(type){case'properties':io.load(path,callback,sync);break;case'json':io.loadJSON(path,callback,sync);break;}},};Locale.prototype.build=function L_build(callback){var sync=!callback;var ctx=this.ctx;var self=this;var l10nLoads=ctx.resLinks.length;function onL10nLoaded(err){if(err){ctx._emitter.emit('fetcherror',err);}
if(--l10nLoads<=0){self.isReady=true;if(callback){callback();}}}
if(l10nLoads===0){onL10nLoaded();return;}
function onJSONLoaded(err,json){if(!err&&json){self.addAST(json);}
onL10nLoaded(err);}
function onPropLoaded(err,source){if(!err&&source){var ast=PropertiesParser.parse(ctx,source);self.addAST(ast);}
onL10nLoaded(err);}
var idToFetch=this.isPseudo()?ctx.defaultLocale:this.id;var appVersion=null;var source='app';if(typeof(navigator)!=='undefined'){source=navigator.mozL10n._config.localeSources[this.id]||'app';appVersion=navigator.mozL10n._config.appVersion;}
for(var i=0;i<ctx.resLinks.length;i++){var resLink=decodeURI(ctx.resLinks[i]);var path=resLink.replace('{locale}',idToFetch);var type=path.substr(path.lastIndexOf('.')+1);var cb;switch(type){case'json':cb=onJSONLoaded;break;case'properties':cb=onPropLoaded;break;}
bindingsIO[source](this.id,appVersion,path,type,cb,onL10nLoaded,sync);}};function createPseudoEntry(node,entries){return Resolver.createEntry(walkContent(node,PSEUDO[this.id].translate),entries);}
Locale.prototype.addAST=function(ast){var createEntry=this.isPseudo()?createPseudoEntry.bind(this):Resolver.createEntry;for(var i=0;i<ast.length;i++){this.entries[ast[i].$i]=createEntry(ast[i],this.entries);}};function Context(id){this.id=id;this.isReady=false;this.isLoading=false;this.defaultLocale='en-US';this.availableLocales=[];this.supportedLocales=[];this.qps=[];this.resLinks=[];this.locales={};this._emitter=new EventEmitter();this._ready=new Promise(this.once.bind(this));}
function reportMissing(id,err){this._emitter.emit('notfounderror',err);return id;}
function getWithFallback(id){var cur=0;var loc;var locale;while(loc=this.supportedLocales[cur]){locale=this.getLocale(loc);if(!locale.isReady){locale.build(null);}
var entry=locale.entries[id];if(entry===undefined){cur++;reportMissing.call(this,id,new L10nError('"'+id+'"'+' not found in '+loc+' in '+this.id,id,loc));continue;}
return entry;}
throw new L10nError('"'+id+'"'+' missing from all supported locales in '+this.id,id);}
function formatTuple(args,entity){try{return Resolver.format(args,entity);}catch(err){this._emitter.emit('resolveerror',err);var locals={error:err};return[locals,entity.id];}}
function formatValue(args,entity){if(typeof entity==='string'){return entity;}
return formatTuple.call(this,args,entity)[1];}
function formatEntity(args,entity){var entityTuple=formatTuple.call(this,args,entity);var value=entityTuple[1];var formatted={value:value,attrs:null,};if(entity.attrs){formatted.attrs=Object.create(null);}
for(var key in entity.attrs){var attrTuple=formatTuple.call(this,args,entity.attrs[key]);formatted.attrs[key]=attrTuple[1];}
return formatted;}
function formatAsync(fn,id,args){return this._ready.then(getWithFallback.bind(this,id)).then(fn.bind(this,args),reportMissing.bind(this,id));}
Context.prototype.formatValue=function(id,args){return formatAsync.call(this,formatValue,id,args);};Context.prototype.formatEntity=function(id,args){return formatAsync.call(this,formatEntity,id,args);};function legacyGet(fn,id,args){if(!this.isReady){throw new L10nError('Context not ready');}
var entry;try{entry=getWithFallback.call(this,id);}catch(err){if(err.loc){throw err;}
reportMissing.call(this,id,err);return'';}
return fn.call(this,args,entry);}
Context.prototype.get=function(id,args){return legacyGet.call(this,formatValue,id,args);};Context.prototype.getEntity=function(id,args){return legacyGet.call(this,formatEntity,id,args);};Context.prototype.getLocale=function getLocale(code){var locales=this.locales;if(locales[code]){return locales[code];}
return locales[code]=new Locale(code,this);};function negotiate(available,requested,defaultLocale){var supportedLocale;for(var i=0;i<requested.length;i++){var locale=requested[i];if(available.indexOf(locale)!==-1){supportedLocale=locale;break;}}
if(!supportedLocale||supportedLocale===defaultLocale){return[defaultLocale];}
return[supportedLocale,defaultLocale];}
function freeze(supported){var locale=this.getLocale(supported[0]);if(locale.isReady){setReady.call(this,supported);}else{locale.build(setReady.bind(this,supported));}}
function setReady(supported){this.supportedLocales=supported;this.isReady=true;this._emitter.emit('ready');}
Context.prototype.registerLocales=function(defLocale,available){if(defLocale){this.defaultLocale=defLocale;}
this.availableLocales=[this.defaultLocale];this.qps=Object.keys(PSEUDO);if(available){for(var i=0,loc;loc=available[i];i++){if(this.availableLocales.indexOf(loc)===-1){this.availableLocales.push(loc);var pos=this.qps.indexOf(loc);if(pos!==-1){this.qps.splice(pos,1);}}}}};Context.prototype.requestLocales=function requestLocales(){if(this.isLoading&&!this.isReady){throw new L10nError('Context not ready');}
this.isLoading=true;var requested=Array.prototype.slice.call(arguments);if(requested.length===0){throw new L10nError('No locales requested');}
var supported=negotiate(this.availableLocales.concat(this.qps),requested,this.defaultLocale);if(this.supportedLocales[0]!==supported[0]){freeze.call(this,supported);}};Context.prototype.addEventListener=function(type,listener){this._emitter.addEventListener(type,listener);};Context.prototype.removeEventListener=function(type,listener){this._emitter.removeEventListener(type,listener);};Context.prototype.ready=function(callback){if(this.isReady){setTimeout(callback);}
this.addEventListener('ready',callback);};Context.prototype.once=function(callback){if(this.isReady){setTimeout(callback);return;}
var callAndRemove=(function(){this.removeEventListener('ready',callAndRemove);callback();}).bind(this);this.addEventListener('ready',callAndRemove);};var allowed={elements:['a','em','strong','small','s','cite','q','dfn','abbr','data','time','code','var','samp','kbd','sub','sup','i','b','u','mark','ruby','rt','rp','bdi','bdo','span','br','wbr'],attributes:{global:['title','aria-label','aria-valuetext','aria-moz-hint'],a:['download'],area:['download','alt'],input:['alt','placeholder'],menuitem:['label'],menu:['label'],optgroup:['label'],option:['label'],track:['label'],img:['alt'],textarea:['placeholder'],th:['abbr']}};var rtlList=['ar','he','fa','ps','ar-x-psbidi','ur'];var nodeObserver=null;var pendingElements=null;var moConfig={attributes:true,characterData:false,childList:true,subtree:true,attributeFilter:['data-l10n-id','data-l10n-args']};navigator.mozL10n={ctx:null,get:function get(id,ctxdata){return navigator.mozL10n.ctx.get(id,ctxdata);},formatValue:function(id,ctxdata){return navigator.mozL10n.ctx.formatValue(id,ctxdata);},formatEntity:function(id,ctxdata){return navigator.mozL10n.ctx.formatEntity(id,ctxdata);},translateFragment:function(fragment){return translateFragment.call(navigator.mozL10n,fragment);},setAttributes:setL10nAttributes,getAttributes:getL10nAttributes,ready:function ready(callback){return navigator.mozL10n.ctx.ready(callback);},once:function once(callback){return navigator.mozL10n.ctx.once(callback);},get readyState(){return navigator.mozL10n.ctx.isReady?'complete':'loading';},language:{set code(lang){navigator.mozL10n.ctx.requestLocales(lang);},get code(){return navigator.mozL10n.ctx.supportedLocales[0];},get direction(){return getDirection(navigator.mozL10n.ctx.supportedLocales[0]);}},qps:PSEUDO,_config:{appVersion:null,localeSources:Object.create(null),isPretranslated:false,},_getInternalAPI:function(){return{Error:L10nError,Context:Context,Locale:Locale,Resolver:Resolver,getPluralRule:getPluralRule,rePlaceables:rePlaceables,translateDocument:translateDocument,onMetaInjected:onMetaInjected,PropertiesParser:PropertiesParser,walkContent:walkContent,buildLocaleList:buildLocaleList};}};function getDirection(lang){return(rtlList.indexOf(lang)>=0)?'rtl':'ltr';}
var readyStates={loading:0,interactive:1,complete:2};function whenInteractive(callback){if(readyStates[document.readyState]>=readyStates.interactive){callback();return;}
document.addEventListener('readystatechange',function l10n_onrsc(){if(readyStates[document.readyState]>=readyStates.interactive){document.removeEventListener('readystatechange',l10n_onrsc);callback();}});}
function initObserver(){nodeObserver=new MutationObserver(onMutations.bind(navigator.mozL10n));nodeObserver.observe(document,moConfig);}
function init(pretranslate){if(!pretranslate){initObserver();}
initResources.call(navigator.mozL10n);}
function initResources(){var meta={};var nodes=document.head.querySelectorAll('link[rel="localization"],'+'meta[name="availableLanguages"],'+'meta[name="defaultLanguage"],'+'meta[name="appVersion"],'+'script[type="application/l10n"]');for(var i=0,node;node=nodes[i];i++){var type=node.getAttribute('rel')||node.nodeName.toLowerCase();switch(type){case'localization':this.ctx.resLinks.push(node.getAttribute('href'));break;case'meta':onMetaInjected.call(this,node,meta);break;case'script':onScriptInjected.call(this,node);break;}}
var additionalLanguagesPromise;if(navigator.mozApps&&navigator.mozApps.getAdditionalLanguages){additionalLanguagesPromise=navigator.mozApps.getAdditionalLanguages().catch(function(e){console.error('Error while loading getAdditionalLanguages',e);});document.addEventListener('additionallanguageschange',function(evt){registerLocales.call(this,meta,evt.detail);this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);}.bind(this));}else{additionalLanguagesPromise=Promise.resolve();}
additionalLanguagesPromise.then(function(extraLangs){registerLocales.call(this,meta,extraLangs);initLocale.call(this);}.bind(this));}
function registerLocales(meta,extraLangs){var locales=buildLocaleList.call(this,meta,extraLangs);navigator.mozL10n._config.localeSources=locales[1];this.ctx.registerLocales(locales[0],Object.keys(locales[1]));}
function getMatchingLangpack(appVersion,langpacks){for(var i=0,langpack;(langpack=langpacks[i]);i++){if(langpack.target===appVersion){return langpack;}}
return null;}
function buildLocaleList(meta,extraLangs){var loc,lp;var localeSources=Object.create(null);var defaultLocale=meta.defaultLanguage||this.ctx.defaultLocale;if(meta.availableLanguages){for(loc in meta.availableLanguages){localeSources[loc]='app';}}
if(extraLangs){for(loc in extraLangs){lp=getMatchingLangpack(this._config.appVersion,extraLangs[loc]);if(!lp){continue;}
if(!(loc in localeSources)||!meta.availableLanguages[loc]||parseInt(lp.revision)>meta.availableLanguages[loc]){localeSources[loc]='extra';}}}
if(!(defaultLocale in localeSources)){localeSources[defaultLocale]='app';}
return[defaultLocale,localeSources];}
function splitAvailableLanguagesString(str){var langs={};str.split(',').forEach(function(lang){lang=lang.trim().split(':');langs[lang[0]]=parseInt(lang[1]);});return langs;}
function onMetaInjected(node,meta){switch(node.getAttribute('name')){case'availableLanguages':meta.availableLanguages=splitAvailableLanguagesString(node.getAttribute('content'));break;case'defaultLanguage':meta.defaultLanguage=node.getAttribute('content');break;case'appVersion':navigator.mozL10n._config.appVersion=node.getAttribute('content');break;}}
function onScriptInjected(node){var lang=node.getAttribute('lang');var locale=this.ctx.getLocale(lang);locale.addAST(JSON.parse(node.textContent));}
function initLocale(){this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);window.addEventListener('languagechange',function l10n_langchange(){this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);}.bind(this));}
function localizeMutations(mutations){var mutation;var targets=new Set();for(var i=0;i<mutations.length;i++){mutation=mutations[i];if(mutation.type==='childList'){var addedNode;for(var j=0;j<mutation.addedNodes.length;j++){addedNode=mutation.addedNodes[j];if(addedNode.nodeType!==Node.ELEMENT_NODE){continue;}
targets.add(addedNode);}}
if(mutation.type==='attributes'){targets.add(mutation.target);}}
targets.forEach(function(target){if(target.childElementCount){translateFragment.call(this,target);}else if(target.hasAttribute('data-l10n-id')){translateElement.call(this,target);}},this);}
function onMutations(mutations,self){self.disconnect();localizeMutations.call(this,mutations);self.observe(document,moConfig);}
function onReady(){if(!navigator.mozL10n._config.isPretranslated){translateDocument.call(this);}
navigator.mozL10n._config.isPretranslated=false;if(pendingElements){for(var i=0,element;element=pendingElements[i];i++){translateElement.call(this,element);}
pendingElements=null;}
if(!nodeObserver){initObserver();}
fireLocalizedEvent.call(this);}
function fireLocalizedEvent(){var event=new CustomEvent('localized',{'bubbles':false,'cancelable':false,'detail':{'language':this.ctx.supportedLocales[0]}});window.dispatchEvent(event);}
var reOverlay=/<|&#?\w+;/;var reHtml=/[&<>]/g;var htmlEntities={'&':'&amp;','<':'&lt;','>':'&gt;',};function translateDocument(){document.documentElement.lang=this.language.code;document.documentElement.dir=this.language.direction;translateFragment.call(this,document.documentElement);}
function translateFragment(element){if(typeof element.hasAttribute==='function'&&element.hasAttribute('data-l10n-id')){translateElement.call(this,element);}
var nodes=getTranslatableChildren(element);for(var i=0;i<nodes.length;i++){translateElement.call(this,nodes[i]);}}
function setL10nAttributes(element,id,args){element.setAttribute('data-l10n-id',id);if(args){element.setAttribute('data-l10n-args',JSON.stringify(args));}}
function getL10nAttributes(element){return{id:element.getAttribute('data-l10n-id'),args:JSON.parse(element.getAttribute('data-l10n-args'))};}
function getTranslatableChildren(element){return element?element.querySelectorAll('*[data-l10n-id]'):[];}
function camelCaseToDashed(string){if(string==='ariaValueText'){return'aria-valuetext';}
return string.replace(/[A-Z]/g,function(match){return'-'+match.toLowerCase();}).replace(/^-/,'');}
function escapeL10nArgs(match){return htmlEntities[match];}
function translateElement(element){if(!this.ctx.isReady){if(!pendingElements){pendingElements=[];}
pendingElements.push(element);return;}
var l10nId=element.getAttribute('data-l10n-id');if(!l10nId){return false;}
var l10nArgs=element.getAttribute('data-l10n-args');var entity=this.ctx.getEntity(l10nId,l10nArgs?JSON.parse(l10nArgs.replace(reHtml,escapeL10nArgs)):undefined);var value=entity.value;if(typeof value==='string'){if(!reOverlay.test(value)){element.textContent=value;}else{var translation=element.ownerDocument.createElement('template');translation.innerHTML=value;overlayElement(element,translation.content);}}
for(var key in entity.attrs){var attrName=camelCaseToDashed(key);if(isAttrAllowed({name:attrName},element)){element.setAttribute(attrName,entity.attrs[key]);}}}
function overlayElement(sourceElement,translationElement){var result=translationElement.ownerDocument.createDocumentFragment();var k,attr;var childElement;while((childElement=translationElement.childNodes[0])){translationElement.removeChild(childElement);if(childElement.nodeType===Node.TEXT_NODE){result.appendChild(childElement);continue;}
var index=getIndexOfType(childElement);var sourceChild=getNthElementOfType(sourceElement,childElement,index);if(sourceChild){overlayElement(sourceChild,childElement);result.appendChild(sourceChild);continue;}
if(isElementAllowed(childElement)){var sanitizedChild=childElement.ownerDocument.createElement(childElement.nodeName);overlayElement(sanitizedChild,childElement);result.appendChild(sanitizedChild);continue;}
result.appendChild(document.createTextNode(childElement.textContent));}
sourceElement.textContent='';sourceElement.appendChild(result);if(translationElement.attributes){for(k=0,attr;(attr=translationElement.attributes[k]);k++){if(isAttrAllowed(attr,sourceElement)){sourceElement.setAttribute(attr.name,attr.value);}}}}
function isElementAllowed(element){return allowed.elements.indexOf(element.tagName.toLowerCase())!==-1;}
function isAttrAllowed(attr,element){var attrName=attr.name.toLowerCase();var tagName=element.tagName.toLowerCase();if(allowed.attributes.global.indexOf(attrName)!==-1){return true;}
if(!allowed.attributes[tagName]){return false;}
if(allowed.attributes[tagName].indexOf(attrName)!==-1){return true;}
if(tagName==='input'&&attrName==='value'){var type=element.type.toLowerCase();if(type==='submit'||type==='button'||type==='reset'){return true;}}
return false;}
function getNthElementOfType(context,element,index){var nthOfType=0;for(var i=0,child;child=context.children[i];i++){if(child.nodeType===Node.ELEMENT_NODE&&child.tagName===element.tagName){if(nthOfType===index){return child;}
nthOfType++;}}
return null;}
function getIndexOfType(element){var index=0;var child;while((child=element.previousElementSibling)){if(child.tagName===element.tagName){index++;}}
return index;}
var DEBUG=false;navigator.mozL10n.ctx=new Context(window.document?document.URL:null);navigator.mozL10n.ctx.ready(onReady.bind(navigator.mozL10n));navigator.mozL10n.ctx.addEventListener('notfounderror',function reportMissingEntity(e){if(DEBUG||e.loc==='en-US'){console.warn(e.toString());}});if(DEBUG){navigator.mozL10n.ctx.addEventListener('fetcherror',console.error.bind(console));navigator.mozL10n.ctx.addEventListener('parseerror',console.error.bind(console));navigator.mozL10n.ctx.addEventListener('resolveerror',console.error.bind(console));}
if(window.document){navigator.mozL10n._config.isPretranslated=document.documentElement.lang===navigator.language;var forcePretranslate=!navigator.mozL10n._config.isPretranslated;whenInteractive(init.bind(navigator.mozL10n,forcePretranslate));}
document.l10n={setAttributes:navigator.mozL10n.setAttributes,getAttributes:navigator.mozL10n.getAttributes,formatValue:function(id,args){return navigator.mozL10n.formatValue(id,args);},translateFragment:function(frag){return Promise.resolve(navigator.mozL10n.translateFragment(frag));},ready:new Promise(function(resolve){navigator.mozL10n.once(resolve);}),formatValues:function(){var keys=arguments;var resp=keys.map(function(key){if(Array.isArray(key)){return navigator.mozL10n.formatValue(key[0],key[1]);}
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;'use strict';(function(exports){const SHADOW_BLUR=1;const SHADOW_OFFSET_Y=1;const SHADOW_OFFSET_X=1;const SHADOW_COLOR='rgba(0, 0, 0, 0.2)';const DEFAULT_BACKGROUND_COLOR='rgb(228, 234, 238)';const UNSCALED_CANVAS_PADDING=2;const CANVAS_PADDING=UNSCALED_CANVAS_PADDING*devicePixelRatio;function IconRenderer(icon){this._icon=icon;}
IconRenderer.TYPE={CLIP:'clip',FAVICON:'favicon',STANDARD:'standard',};IconRenderer.prototype={unscaledCanvasPadding:UNSCALED_CANVAS_PADDING*2,get _maxSize(){return this._icon.grid.layout.gridMaxIconSize;},_createCanvas:function(){const CANVAS_PADDING_BOTTOM=1*devicePixelRatio;var canvas=document.createElement('canvas');canvas.width=this._maxSize+(CANVAS_PADDING*2);canvas.height=this._maxSize+CANVAS_PADDING+CANVAS_PADDING_BOTTOM;return canvas;},_createClipCanvas:function(){var canvas=document.createElement('canvas');canvas.width=this._maxSize+(CANVAS_PADDING*2);canvas.height=this._maxSize+(CANVAS_PADDING*2);return canvas;},_decorateShadowCanvas:function(canvas){var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.shadowColor=SHADOW_COLOR;ctx.shadowBlur=SHADOW_BLUR;ctx.shadowOffsetY=SHADOW_OFFSET_Y;ctx.shadowOffsetX=SHADOW_OFFSET_X;return ctx;},clip:function(img){return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);var clipCanvas=this._createClipCanvas();var clipCtx=clipCanvas.getContext('2d',{willReadFrequently:true});clipCtx.beginPath();clipCtx.arc(clipCanvas.width/2,clipCanvas.height/2,clipCanvas.height/2,0,2*Math.PI);clipCtx.clip();clipCtx.drawImage(img,0,0,clipCanvas.width,clipCanvas.height);shadowCtx.drawImage(clipCanvas,CANVAS_PADDING,CANVAS_PADDING,this._maxSize,this._maxSize);shadowCanvas.toBlob(resolve);});},favicon:function(img){if(img.width>this._icon.grid.layout.gridIconSize/2){return this.clip(img);}
return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);var iconWidth;var iconHeight;shadowCtx.beginPath();shadowCtx.arc(shadowCanvas.width/2,shadowCanvas.height/2,shadowCanvas.height/2-CANVAS_PADDING,0,2*Math.PI,false);shadowCtx.fillStyle=DEFAULT_BACKGROUND_COLOR;shadowCtx.fill();iconWidth=iconHeight=this._maxSize*0.55;shadowCtx.shadowBlur=0;shadowCtx.shadowOffsetY=0;shadowCtx.mozImageSmoothingEnabled=false;shadowCtx.drawImage(img,(shadowCanvas.width-iconWidth)/2,(shadowCanvas.height-iconHeight)/2,iconWidth,iconHeight);shadowCanvas.toBlob(resolve);});},standard:function(img){return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);shadowCtx.drawImage(img,CANVAS_PADDING,CANVAS_PADDING,this._maxSize,this._maxSize);shadowCanvas.toBlob(resolve);});}};exports.GridIconRenderer=IconRenderer;}(window));;'use strict';(function(exports){const FETCH_XHR_TIMEOUT=10000;function fetchBlob(uri){return new Promise(function(accept,reject){var xhr=new XMLHttpRequest({mozAnon:true,mozSystem:true});xhr.open('GET',uri,true);xhr.responseType='blob';xhr.timeout=FETCH_XHR_TIMEOUT;xhr.send();xhr.onload=function(){var status=xhr.status;if(status!==0&&status!==200){reject(new Error('Got HTTP status '+status+' trying to load '+uri));return;}
accept(xhr.response);};xhr.onerror=xhr.ontimeout=function(){reject(new Error('Error while HTTP GET: ',uri));};});}
function Icon(elem,uri){this.elem=elem;this.uri=uri;}
Icon.prototype={get size(){return this._size||40;},set size(size){this._size=size||this.size;var style=this.elem.style;var sizeInRems=(this._size/10)+'rem';style.backgroundSize=style.width=style.height=sizeInRems;},render:function render(options){options=options||{};var uri=this.uri;this.size=options.size;if(!uri){return;}
fetchBlob(uri).then(function(blob){this.renderBlob(blob,options);}.bind(this));},renderBlob:function renderBlob(blob,options){options=options||{};var style=this.elem.style;this.size=options.size;var img=new Image();img.src=URL.createObjectURL(blob);var size=this.size;img.onload=()=>{var renderer=new GridIconRenderer({grid:{layout:{get gridIconSize(){return size;},get gridMaxIconSize(){return size*devicePixelRatio;}}}});var type=options.type||GridIconRenderer.TYPE.FAVICON;renderer[type](img).then((blob)=>{var url=URL.createObjectURL(blob);var imageUrl='url('+url+')';style.backgroundImage=imageUrl;if(options.onLoad){options.onLoad(blob);}});URL.revokeObjectURL(img.src);};img.onerror=()=>{if(options.onerror){options.onerror();}};}};exports.Icon=Icon;}(window));;'use strict';(function IconsHelper(exports){const ICON_CACHE_PERIOD=24*60*60*1000;const FETCH_XHR_TIMEOUT=10000;const DEBUG=false;var dataStore=null;function getDefaultIconSize(){var dpr=window.devicePixelRatio;return(dpr&&dpr>1)?142:84;}
function sizeIsNearer(size1,size2,targetSize){var delta1=Math.abs(targetSize-size1);var delta2=Math.abs(targetSize-size2);return(delta1<=delta2);}
function getIcon(uri,iconTargetSize,placeObj={},siteObj={}){var iconUrl=null;iconTargetSize=iconTargetSize*window.devicePixelRatio;if(siteObj.webManifestUrl&&siteObj.webManifest){iconUrl=getBestIconFromWebManifest(siteObj.webManifest,iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Web Manifest');}}
if(!iconUrl&&siteObj.manifest&&siteObj.manifest.icons){iconUrl=getBestIconFromWebManifest({icons:_convertToWebManifestIcons(siteObj.manifest,siteObj.origin||siteObj.manifest.origin)},iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Firefox App Manifest');}}
if(!iconUrl&&placeObj&&placeObj.icons){iconUrl=getBestIconFromMetaTags(placeObj.icons,iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Meta tags');}}
if(!iconUrl){var a=document.createElement('a');a.href=uri;iconUrl=a.origin+'/favicon.ico';if(iconTargetSize){iconUrl+='#-moz-resolution='+iconTargetSize+','+iconTargetSize;}
DEBUG&&console.log('Icon from favicon.ico');}
return new Promise(resolve=>{resolve(iconUrl);});}
function getIconBlob(uri,iconTargetSize,placeObj={},siteObj={}){return new Promise((resolve,reject)=>{getIcon(uri,iconTargetSize,placeObj,siteObj).then(iconUrl=>{getStore().then(iconStore=>{iconStore.get(iconUrl).then(iconObj=>{if(!iconObj||!iconObj.timestamp||Date.now()-iconObj.timestamp>=ICON_CACHE_PERIOD){return fetchIconBlob(iconUrl).then(iconBlob=>{var img=document.createElement('img');var icon=new Icon(img,uri);icon.renderBlob(iconBlob,{size:iconTargetSize,onLoad:function(blob){var iconObj={blob:blob,originalUrl:iconUrl.toString(),timestamp:Date.now()};resolve(iconObj);iconStore.add(iconObj,iconUrl);},onerror:function(e){reject(`Failed to fetch icon ${iconUrl}`);}});}).catch(err=>{reject(`Failed to fetch icon ${iconUrl}: ${err}`);});}
return resolve(iconObj);}).catch(err=>{reject(`Failed to get icon from dataStore: ${err}`);});}).catch(err=>{reject(`Error opening the dataStore: ${err}`);});});});}
function setElementIcon(icon,targetSize){return getIconBlob(icon.bookmark.url,targetSize,icon.bookmark,icon.bookmark).then(iconObj=>{if(iconObj.blob){icon.icon=iconObj.blob;return Promise.resolve();}else if(icon.bookmark.icon){return fetchIconBlob(icon.bookmark.icon).then(iconBlob=>{icon.icon=iconBlob;return Promise.resolve();},Promise.reject.bind(Promise));}
return Promise.reject('No icon data found');},Promise.reject.bind(Promise));}
function getBestIconFromWebManifest(webManifest,iconSize){var icons=webManifest.icons;if(!icons){return null;}
var maxSize=10000;var bestSize=maxSize;var iconURL=null;iconSize=iconSize||getDefaultIconSize();icons.forEach((potentialIcon)=>{if(!iconURL){iconURL=potentialIcon.src;}
var sizes=Array.from(potentialIcon.sizes);var nearestSize=getNearestSize(sizes,iconSize,bestSize);if(nearestSize!==bestSize&&sizeIsNearer(nearestSize,bestSize,iconSize)){iconURL=potentialIcon.src;bestSize=nearestSize;}});return iconURL?iconURL:null;}
function _convertToWebManifestIcons(manifest,origin){return Object.keys(manifest.icons).map(function(size){var url=manifest.icons[size];var sizes=[size+'x'+size];url=url.indexOf('http')>-1?url:origin+url;return{src:new URL(url),sizes:sizes};});}
function getBestIconFromMetaTags(icons,iconSize){if(!icons){return null;}
iconSize=iconSize||getDefaultIconSize();var iconURL=null;var bestSize=10000;Object.keys(icons).forEach((uri)=>{var potentialIcon=icons[uri];if(!iconURL){iconURL=uri;}
var sizes=Array.from(potentialIcon.sizes);var nearestSize=getNearestSize(sizes,iconSize,bestSize);if(nearestSize!==bestSize&&sizeIsNearer(nearestSize,bestSize,iconSize)){iconURL=uri;bestSize=nearestSize;}
if(potentialIcon.rel==='apple-touch-icon'||potentialIcon.rel==='apple-touch-icon-precomposed'){var moreInfoUrl='https://developer.mozilla.org/en-US/'+'Apps/Build/Icon_implementation_for_apps#General_icons_for_web_apps';console.warn('Warning: The apple-touch icons are being used '+'as a fallback only. They will be deprecated in '+'the future. See '+moreInfoUrl);}});return iconURL||null;}
function getNearestSize(sizes,iconSize,bestSize){var bogusSize=10000;if(!bestSize){bestSize=bogusSize;}
var nearestSize=sizes.reduce(function(nearestSize,sizeString,idx){var size=widthFromSizeString(sizeString);if(isNaN(size)){return nearestSize;}
if(sizeIsNearer(size,nearestSize,iconSize)){return size;}else{return nearestSize;}},bestSize);return nearestSize===bogusSize?-1:nearestSize;}
function widthFromSizeString(size){size=size||'';var xIndex=size.indexOf('x');if(!xIndex){return NaN;}
return parseInt(size.substr(0,xIndex));}
function getStore(){return new Promise(resolve=>{if(dataStore){return resolve(dataStore);}
navigator.getDataStores('icons').then(stores=>{dataStore=stores[0];return resolve(dataStore);});});}
function clear(){return getStore().then(iconStore=>{iconStore.clear();});}
function fetchIcon(iconUrl){return new Promise((resolve,reject)=>{fetchIconBlob(iconUrl).then((iconBlob)=>{var img=document.createElement('img');img.src=URL.createObjectURL(iconBlob);img.onload=()=>{var iconSize=Math.max(img.naturalWidth,img.naturalHeight);resolve({blob:iconBlob,url:iconUrl,size:iconSize,timestamp:Date.now()});};img.onerror=()=>{reject(new Error(`Error while loading image.`));};}).catch((e)=>{reject(new Error(`Error while loading image: ${e}`));});});}
function fetchIconBlob(iconUrl){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest({mozAnon:true,mozSystem:true});xhr.open('GET',iconUrl,true);xhr.responseType='blob';xhr.timeout=FETCH_XHR_TIMEOUT;xhr.send();xhr.onload=()=>{if(xhr.readyState===XMLHttpRequest.DONE&&xhr.status===200){var iconBlob=xhr.response;resolve(iconBlob);return;}
reject(new Error(`Got HTTP status ${xhr.status} trying to load ${iconUrl}.`));};xhr.onerror=xhr.ontimeout=()=>{reject(new Error(`Error while getting ${iconUrl}.`));};});}
exports.IconsHelper={getIcon:getIcon,getIconBlob:getIconBlob,setElementIcon:setElementIcon,getBestIconFromWebManifest:getBestIconFromWebManifest,getBestIconFromMetaTags:getBestIconFromMetaTags,fetchIcon:fetchIcon,fetchIconBlob:fetchIconBlob,get defaultIconSize(){return getDefaultIconSize();},clear:clear,getNearestSize:getNearestSize,};})(window);;'use strict';(function(exports){const SETTINGS_STORE='homescreen_settings';const SETTINGS_VERSION=0;const COLUMNS_SETTING='grid.cols';const PAGING_SETTING='grid.paging';function Settings(){this.small=false;this.scrollSnapping=false;this.firstRun=false;if(navigator.getDataStores){navigator.getDataStores(SETTINGS_STORE).then(stores=>{if(stores.length<1){return Promise.reject('Settings datastore inaccessible');}
var signalChange=()=>{this.save();window.dispatchEvent(new CustomEvent('settings-changed'));};var syncSmallSetting=(signal)=>{stores[0].get(COLUMNS_SETTING).then(cols=>{var oldSmall=this.small;this.small=cols>3;if(this.small!==oldSmall){signalChange();}});};var syncPagingSetting=()=>{stores[0].get(PAGING_SETTING).then(paging=>{var oldSnapping=this.scrollSnapping;this.scrollSnapping=paging||false;if(this.scrollSnapping!==oldSnapping){signalChange();}});};stores[0].addEventListener('change',e=>{switch(e.id){case COLUMNS_SETTING:syncSmallSetting();break;case PAGING_SETTING:syncPagingSetting();break;}});syncSmallSetting();syncPagingSetting();},e=>{console.error('Error retrieving home screen settings datastore:',e);});}else{console.error('Datastore API unavailable');}
var settingsString=localStorage.getItem('settings');if(!settingsString){this.firstRun=true;return;}
var settings=JSON.parse(settingsString);if(settings.version!==SETTINGS_VERSION){return;}
this.small=settings.small||false;this.scrollSnapping=settings.scrollSnapping||false;if(!navigator.getDataStores){console.error('Datastore API unavailable');return;}}
Settings.prototype={save:function(){localStorage.setItem('settings',JSON.stringify({version:SETTINGS_VERSION,small:this.small,scrollSnapping:this.scrollSnapping}));}};exports.Settings=Settings;}(window));;'use strict';(function(exports){const DB_NAME='home-metadata';const DB_ORDER_STORE='order';const DB_ICON_STORE='icon';const DB_VERSION=1;function AppsMetadata(){}
AppsMetadata.prototype={db:null,init:function(){return new Promise((resolve,reject)=>{var req=window.indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=this.upgradeSchema;req.onsuccess=(e)=>{this.db=e.target.result;resolve();};req.onerror=(e)=>{console.error('Error opening homescreen metadata db',e);reject(e);};});},upgradeSchema:function(e){var db=e.target.result;var fromVersion=e.oldVersion;if(fromVersion<1){var store=db.createObjectStore(DB_ORDER_STORE,{keyPath:'id'});store.createIndex('order','order',{unique:false});store=db.createObjectStore(DB_ICON_STORE,{keyPath:'id'});store.createIndex('icon','icon',{unique:false});}},set:function(data){return new Promise((resolve,reject)=>{var txn=this.db.transaction([DB_ORDER_STORE,DB_ICON_STORE],'readwrite');for(var entry of data){if(!entry.id){continue;}
if(typeof entry.order!=='undefined'){txn.objectStore(DB_ORDER_STORE).put({id:entry.id,order:entry.order});}
if(typeof entry.icon!=='undefined'){txn.objectStore(DB_ICON_STORE).put({id:entry.id,icon:entry.icon});}}
txn.oncomplete=resolve;txn.onerror=reject;});},remove:function(id){return new Promise((resolve,reject)=>{var txn=this.db.transaction([DB_ORDER_STORE,DB_ICON_STORE],'readwrite');txn.objectStore(DB_ORDER_STORE).delete(id);txn.objectStore(DB_ICON_STORE).delete(id);txn.oncomplete=resolve;txn.onerror=reject;});},getAll:function(onResult){return new Promise((resolve,reject)=>{var txn=this.db.transaction([DB_ORDER_STORE,DB_ICON_STORE],'readonly');var orderStore=txn.objectStore(DB_ORDER_STORE);var iconStore=txn.objectStore(DB_ICON_STORE);var cursor=orderStore.index('order').openCursor();var results=[];cursor.onsuccess=e=>{var cursor=e.target.result;if(cursor){var result=cursor.value;var iconRequest=iconStore.get(result.id);iconRequest.onsuccess=function(result,e){if(e.target.result){result.icon=e.target.result.icon;}
results.push(result);if(onResult){onResult(result);}}.bind(this,result);cursor.continue();}};txn.oncomplete=()=>{resolve(results);};});}};exports.AppsMetadata=AppsMetadata;}(window));;'use strict';(function(exports){function Datastore(name){this.name=name;}
Datastore.prototype={name:'',DB_VERSION:1,datastore:null,lastRevision:null,db:null,get revisionName(){return this.name+'_revision';},get idbName(){return this.name+'_mirror';},get storeName(){return this.name+'_store';},init:function(){var revisionString=localStorage.getItem(this.revisionName);if(revisionString){this.lastRevision=JSON.parse(revisionString);}
return new Promise((resolve,reject)=>{var req=window.indexedDB.open(this.idbName,this.DB_VERSION);req.onupgradeneeded=this.upgradeSchema.bind(this);req.onsuccess=(e)=>{this.db=e.target.result;resolve();if(!navigator.getDataStores){console.error('DataStore API is unavailable');return;}
navigator.getDataStores(this.name).then((stores)=>{if(stores.length<1){console.error(this.name+' inaccessible');return;}
this.datastore=stores[0];this.datastore.addEventListener('change',this.onChange.bind(this));this.synchronise();},(e)=>{console.error('Error getting datastore',e);});};req.onerror=(e)=>{console.error('Error opening datastore mirror database',e);reject(e);};});},upgradeSchema:function(e){var db=e.target.result;var fromVersion=e.oldVersion;if(fromVersion<1){var store=db.createObjectStore(this.storeName,{keyPath:'id'});store.createIndex('data','data',{unique:false});}},synchronise:function(){this._syncQueue=(this._syncQueue||Promise.resolve()).then(()=>this._synchronise());return this._syncQueue;},_synchronise:function(){return new Promise((resolve,reject)=>{var cursor=this.datastore.sync(this.lastRevision);var self=this;function cursorResolve(task){var promises=[];switch(task.operation){case'update':case'add':promises.push(self.set(task.data));break;case'remove':promises.push(self.remove(task.id));break;case'clear':promises.push(self.clear());break;case'done':self.updateRevision();resolve();return;}
promises.push(cursor.next());Promise.all(promises).then((results)=>{cursorResolve(results.pop());},reject);}
cursor.next().then(cursorResolve,reject);});},set:function(data){return new Promise((resolve,reject)=>{var txn=this.db.transaction([this.storeName],'readwrite');txn.oncomplete=function onComplete(data,resolve){resolve();document.dispatchEvent(new CustomEvent(this.name+'-set',{detail:{id:data.id}}));}.bind(this,data,resolve);txn.onerror=reject;try{txn.objectStore(this.storeName).put({id:data.id,data:data});}catch(e){console.error('Error putting data in '+this.idbName+':',e);resolve();}});},remove:function(id){return new Promise((resolve,reject)=>{var txn=this.db.transaction([this.storeName],'readwrite');txn.oncomplete=function onComplete(id,resolve){resolve();document.dispatchEvent(new CustomEvent(this.name+'-removed',{detail:{id:id}}));}.bind(this,id,resolve);txn.onerror=reject;try{txn.objectStore(this.storeName).delete(id);}catch(e){console.error('Error deleting data from '+this.idbName+':',e);resolve();}});},clear:function(){return new Promise((resolve,reject)=>{var txn=this.db.transaction([this.storeName],'readwrite');txn.oncomplete=function onComplete(resolve){resolve();document.dispatchEvent(new CustomEvent(this.name+'-cleared'));}.bind(this,resolve);txn.onerror=reject;txn.objectStore(this.storeName).clear();});},updateRevision:function(){this.lastRevision=this.datastore.revisionId;localStorage.setItem(this.revisionName,JSON.stringify(this.lastRevision));},onChange:function(e){this.synchronise().then(()=>{},(error)=>{console.error('Failed to handle '+this.name+' change',error);});},get:function(id){return new Promise((resolve,reject)=>{var txn=this.db.transaction([this.storeName],'readonly');txn.onerror=reject;txn.objectStore(this.storeName).get(id).onsuccess=(event)=>{resolve(event.target.result);};});},getAll:function(filter=()=>true){return new Promise((resolve,reject)=>{var results=[];var txn=this.db.transaction([this.storeName],'readonly');txn.onerror=reject;txn.oncomplete=()=>{resolve(results);};txn.objectStore(this.storeName).openCursor().onsuccess=(event)=>{var cursor=event.target.result;if(cursor){if(filter(cursor.value)){results.push(cursor.value);}
cursor.continue();}};});}};exports.Datastore=Datastore;}(window));;'use strict';(function(exports){function PagesStore(name){this.name=name;}
PagesStore.prototype=Object.create(Datastore.prototype);PagesStore.prototype.DB_VERSION=1;PagesStore.prototype.set=function(data){data.id=data.url;return Datastore.prototype.set.call(this,data);};PagesStore.prototype.getAll=function(){var filter=(value)=>value.data&&value.data.pinned;return Datastore.prototype.getAll.call(this,filter);};exports.PagesStore=PagesStore;}(window));;'use strict';(function(exports){const PAGES_ICON_SIZE=30;function Pages(){this.panel=document.getElementById('pages-panel');this.panels=document.getElementById('panels');this.pages=document.getElementById('pages');this.scrollable=document.querySelector('#pages-panel > .scrollable');this.bottombar=document.getElementById('bottombar');this.remove=document.getElementById('remove');this.done=document.getElementById('done');this.empty=true;this.editMode=false;this.dialogs=[];this.pages.addEventListener('click',this);this.pages.addEventListener('contextmenu',this);this.pages.addEventListener('keydown',this);window.addEventListener('resize',this);this.done.addEventListener('click',e=>{e.preventDefault();this.exitEditMode();});this.remove.addEventListener('click',e=>{e.preventDefault();this.unpinSelectedCard();});this.pagesStore=new PagesStore('places');this.pagesStore.init().then(()=>{document.addEventListener('places-set',(e)=>{var id=e.detail.id;this.pagesStore.get(id).then((page)=>{for(var child of this.pages.children){if(child.dataset.id===id){if(!page.data.pinned){this.removeCard(child);}else{this.updatePinnedPage(child,page.data);}
return;}}
if(!page.data.pinned){return;}
this.addPinnedPage(page.data);});});document.addEventListener('places-removed',(e)=>{var id=e.detail.id;for(var child of this.pages.children){if(child.dataset.id===id){this.removeCard(child);return;}}});document.addEventListener('places-cleared',()=>{this.exitEditMode();for(var child of this.pages.children){this.pages.removeChild(child);}
if(!this.empty){this.empty=true;this.panel.classList.add('empty');}});},(e)=>{console.error('Error initialising pinned pages',e);}).then(()=>{return this.pagesStore.getAll().then((pages)=>{for(var page of pages){this.addPinnedPage(page.data);}
if(this.empty){this.panel.classList.add('empty');}},(e)=>{console.error('Error getting pinned pages',e);});});}
Pages.prototype={updatePinnedPage:function(card,page){card.title=page.title;card.dataset.id=page.url;card.style.order=-Math.round(page.pinTime/1000);page.meta=page.meta||{};if(page.screenshot){page.meta.screenshot=page.screenshot;}
setTimeout(function(card,page){card.meta=page.meta;IconsHelper.getIconBlob(page.url,PAGES_ICON_SIZE,page).then((iconObj)=>{if(iconObj.blob){var iconURL=URL.createObjectURL(iconObj.blob);card.icon=`url(${iconURL})`;}}).catch((e)=>{console.error('Failed to fetch icon',e);});}.bind(this,card,page));},addPinnedPage:function(page){var pinCard=document.createElement('gaia-pin-card');pinCard.tabIndex=0;pinCard.setAttribute('role','link');this.updatePinnedPage(pinCard,page);this.pages.appendChild(pinCard);if(this.empty){this.empty=false;this.panel.classList.remove('empty');}},launchCard:function(card){var features={name:card.title,icon:card.icon,remote:true};window.open(card.dataset.id,'_blank',Object.keys(features).map(key=>encodeURIComponent(key)+'='+encodeURIComponent(features[key])).join(','));},enterEditMode:function(card){if(this.selectedCard){this.selectedCard.classList.remove('selected');}
if(card){this.selectedCard=card;card.classList.add('selected');}
this.editMode=true;document.body.classList.add('edit-mode');this.remove.classList.add('active');},exitEditMode:function(){if(!this.editMode){return;}
this.editMode=false;document.body.classList.remove('edit-mode');this.remove.classList.remove('active');if(this.selectedCard){this.selectedCard.classList.remove('selected');this.selectedCard=null;}},removeCard:function(card){if(this.selectedCard===card){this.selectedCard=null;}
this.pages.removeChild(card,()=>{if(!this.empty&&this.pages.children.length===0){this.exitEditMode();this.empty=true;this.panel.classList.add('empty');}});},unpinSelectedCard:function(){if(!this.selectedCard){return;}
var id=this.selectedCard.dataset.id;this.removeCard(this.selectedCard);this.pagesStore.get(id).then(entry=>{entry.data.pinned=false;this.pagesStore.datastore.put(entry.data,id).then(()=>{},e=>{console.error('Error unpinning page:',e);});},e=>{console.error('Error retrieving page to unpin:',e);});},handleEvent:function(e){switch(e.type){case'click':if(e.target.nodeName!=='GAIA-PIN-CARD'){break;}
if(this.editMode){this.enterEditMode(e.target);}else{this.launchCard(e.target);}
break;case'contextmenu':if(e.target.nodeName!=='GAIA-PIN-CARD'){break;}
this.enterEditMode(e.target);break;case'keydown':if(e.target.nodeName!=='GAIA-PIN-CARD'){break;}
switch(e.keyCode){case 32:case 13:this.launchCard(e.target);}
break;case'resize':this.pages.synchronise();break;}}};exports.Pages=Pages;}(window));;'use strict';(function(exports){const RESIZE_TIMEOUT=500;const DIALOG_SHOW_TIMEOUT=50;const AUTOSCROLL_DISTANCE=40;const AUTOSCROLL_DELAY=750;const AUTOSCROLL_OVERFLOW_DELAY=500;const HIDDEN_ROLES=['system','input','homescreen','theme','addon','langpack'];const BLACKLIST=[];function Apps(){window.performance.mark('navigationLoaded');this.panel=document.getElementById('apps-panel');this.meta=document.head.querySelector('meta[name="theme-color"]');this.scrollable=document.querySelector('#apps-panel > .scrollable');this.icons=document.getElementById('apps');this.remove=document.getElementById('remove');this.rename=document.getElementById('rename');this.done=document.getElementById('done');this.cancelDownload=document.getElementById('cancel-download');this.resumeDownload=document.getElementById('resume-download');this.dialogs=[this.cancelDownload,this.resumeDownload];var dialog;for(dialog of this.dialogs){dialog.hide();}
var dialogVisibilityCallback=()=>{for(var dialog of this.dialogs){if(dialog.opened){this.meta.content='white';document.body.classList.add('dialog-active');return;}}
this.meta.content='transparent';document.body.classList.remove('dialog-active');};for(dialog of this.dialogs){var observer=new MutationObserver(dialogVisibilityCallback);observer.observe(dialog,{attributes:true,attributeFilter:['style']});}
this.resizeTimeout=null;this.pageHeight=1;this.gridHeight=1;this.pendingGridHeight=1;this.iconsPerPage=0;this.iconsLeft=0;this.iconsRight=0;this.appsVisible=false;this.dragging=false;this.draggedIndex=-1;this.autoScrollInterval=null;this.autoScrollOverflowTimeout=null;this.hoverIcon=null;this.editMode=false;this.shouldEnterEditMode=false;this.selectedIcon=null;this.rename.addEventListener('click',e=>{e.preventDefault();this.renameSelectedIcon();});this.remove.addEventListener('click',e=>{e.preventDefault();this.removeSelectedIcon();});this.done.addEventListener('click',e=>{e.preventDefault();this.exitEditMode();});this._iconSize=0;this.lastWindowWidth=window.innerWidth;this.lastWindowHeight=window.innerHeight;this.icons.addEventListener('activate',this);this.icons.addEventListener('drag-start',this);this.icons.addEventListener('drag-move',this);this.icons.addEventListener('drag-end',this);this.icons.addEventListener('drag-rearrange',this);this.icons.addEventListener('drag-finish',this);navigator.mozApps.mgmt.addEventListener('install',this);navigator.mozApps.mgmt.addEventListener('uninstall',this);window.addEventListener('localized',this);window.addEventListener('online',this);window.addEventListener('resize',this);window.addEventListener('settings-changed',this);this.settings=new Settings();this.icons.classList.toggle('small',this.settings.small);this.scrollable.classList.toggle('snapping',this.settings.scrollSnapping);this.metadataLoaded=0;this.startupMetadata=[];this.iconsToRetry=[];this.pendingIcons={};this.metadata=new AppsMetadata();this.bookmarks=new Datastore('bookmarks_store');this.visualLoadComplete=false;this.icons.freeze();this.icons.classList.add('loading');Promise.all([this.metadata.init().then(this.settings.firstRun?()=>{return LazyLoader.load('js/firstrun.js').then(()=>{return FirstRun().then((results)=>{this.toggleSmall(results.small);this.startupMetadata=results.order;this.settings.small=results.small;this.settings.save();return Promise.resolve();},(e)=>{console.error('Error running first-run script',e);return Promise.resolve();});},(e)=>{console.error('Failed to load first-run script');return Promise.resolve();});}:()=>{return this.metadata.getAll(result=>{this.startupMetadata.push(result);this.metadataLoaded++;var processResult=data=>{if(this.pendingIcons[data.id]){this.addAppIcon.apply(this,this.pendingIcons[data.id]);delete this.pendingIcons[data.id];}};if(!this.visualLoadComplete){processResult(result);this.refreshGridSize();}else if((this.metadataLoaded%this.iconsPerPage)===0){this.icons.freeze();for(var entry of this.startupMetadata){processResult(entry);}
this.refreshGridSize();this.icons.thaw();}}).then(Promise.resolve(),e=>{console.error('Failed to retrieve metadata entries',e);return Promise.resolve();});},(e)=>{console.error('Failed to initialise metadata db',e);return Promise.resolve();}),new Promise((resolve,reject)=>{var request=navigator.mozApps.mgmt.getAll();request.onsuccess=(e)=>{for(var app of request.result){this.addApp(app);}
resolve();};request.onerror=(e)=>{console.error('Error calling getAll: '+request.error.name);resolve();};}),this.bookmarks.init().then(()=>{document.addEventListener('bookmarks_store-set',(e)=>{var id=e.detail.id;this.bookmarks.get(id).then((bookmark)=>{for(var child of this.icons.children){var icon=child.firstElementChild;if(icon.bookmark&&icon.bookmark.id===id){icon.bookmark=bookmark.data;icon.refresh();return;}}
this.addAppIcon(bookmark.data);this.storeAppOrder();});});document.addEventListener('bookmarks_store-removed',(e)=>{var id=e.detail.id;for(var child of this.icons.children){var icon=child.firstElementChild;if(icon.bookmark&&icon.bookmark.id===id){this.icons.removeChild(child,()=>{this.storeAppOrder();this.refreshGridSize();this.snapScrollPosition();});this.metadata.remove(id);if(this.selectedIcon===icon){this.updateSelectedIcon(null);}
return;}}});document.addEventListener('bookmarks_store-cleared',()=>{for(var child of this.icons.children){var icon=child.firstElementChild;if(icon.bookmark){this.icons.removeChild(child);}}
this.storeAppOrder();this.refreshGridSize();this.snapScrollPosition();});},(e)=>{console.error('Error initialising bookmarks',e);return Promise.resolve();}).then(()=>{return this.bookmarks.getAll().then((bookmarks)=>{for(var bookmark of bookmarks){this.addAppIcon(bookmark.data);}},(e)=>{console.error('Error getting bookmarks',e);return Promise.resolve();});})]).then(()=>{var id;var pendingIcons=this.pendingIcons;this.pendingIcons={};for(id in pendingIcons){this.addAppIcon.apply(this,pendingIcons[id]);}
if(!this.visualLoadComplete){this.onVisualLoad();}
if(!this.settings.firstRun){for(var data of this.startupMetadata){console.log('Removing unknown app metadata entry',data.id);this.metadata.remove(data.id).then(()=>{},(e)=>{console.error('Error removing unknown app metadata entry',e);});}}
this.startupMetadata=null;for(var child of this.icons.children){var icon=child.firstElementChild;this.refreshIcon(icon);}
var newIcons=false;pendingIcons=this.pendingIcons;for(id in pendingIcons){this.addAppIcon.apply(this,pendingIcons[id]);newIcons=true;}
this.pendingIcons=null;if(newIcons){this.storeAppOrder();}else{this.refreshGridSize();}
window.performance.mark('fullyLoaded');});}
Apps.prototype={get iconSize(){if(!this._iconSize){var children=this.icons.children;for(var container of children){if(container.style.display!=='none'){this._iconSize=container.firstElementChild.size;break;}}}
return this._iconSize;},toggleSmall:function(small){if(this.icons.classList.contains('small')===small){return;}
this.icons.classList.toggle('small',small);this.icons.synchronise();this.refreshGridSize();this.snapScrollPosition();},toggleScrollSnapping:function(scrollSnapping){if(this.scrollable.classList.contains('snapping')===scrollSnapping){return;}
this.scrollable.classList.toggle('snapping',scrollSnapping);this.snapScrollPosition();},onVisualLoad:function(){this.visualLoadComplete=true;this.icons.thaw();this.icons.classList.remove('loading');window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');},addApp:function(app){var manifest=app.manifest||app.updateManifest;if(!manifest){return;}
if(HIDDEN_ROLES.includes(manifest.role)||BLACKLIST.includes(app.origin)){return;}
if(manifest.entry_points){for(var entryPoint in manifest.entry_points){this.addAppIcon(app,entryPoint);}}else{this.addAppIcon(app);}},addIconContainer:function(icon,entry){var container=document.createElement('div');container.classList.add('icon-container');container.order=-1;container.appendChild(icon);if(entry!==-1&&this.startupMetadata[entry].order>=0){container.order=this.startupMetadata[entry].order;var children=this.icons.children;for(var i=0,iLen=children.length;i<iLen;i++){var child=children[i];if(child.order!==-1&&child.order<container.order){continue;}
this.icons.insertBefore(container,child);if(this.startupMetadata===null){this.iconAdded(container);}
break;}}
if(!container.parentNode){this.icons.appendChild(container);if(this.startupMetadata===null){this.iconAdded(container);}}
return container;},getIconId:function(appOrBookmark,entryPoint){if(appOrBookmark.id){return appOrBookmark.id;}else{return appOrBookmark.manifestURL+'/'+(entryPoint?entryPoint:'');}},addAppIcon:function(appOrBookmark,entryPoint){var id=this.getIconId(appOrBookmark,entryPoint);var entry=-1;if(this.startupMetadata!==null){entry=this.startupMetadata.findIndex(data=>{return data.id===id;});if(entry===-1){this.pendingIcons[id]=Array.slice(arguments);return;}}
var icon=document.createElement('gaia-app-icon');if(entryPoint){icon.entryPoint=entryPoint;}
var container=this.addIconContainer(icon,entry);if(appOrBookmark.id){icon.bookmark=appOrBookmark;this.refreshIcon(icon);}else{icon.app=appOrBookmark;var handleRoleChange=function(app,container){var manifest=app.manifest||app.updateManifest;var hidden=(manifest&&manifest.role&&HIDDEN_ROLES.includes(manifest.role));container.style.display=hidden?'none':'';};icon.app.addEventListener('downloadapplied',function(app,container){handleRoleChange(app,container);this.icons.synchronise();}.bind(this,icon.app,container));handleRoleChange(icon.app,container);}
this.iconsToRetry.push(id);icon.addEventListener('icon-loaded',function(icon,id){if(icon.isUserSet){return;}
icon.icon.then((blob)=>{var retryIndex=this.iconsToRetry.indexOf(id);if(retryIndex!==-1){this.iconsToRetry.splice(retryIndex,1);}
this.metadata.set([{id:id,icon:blob}]).then(()=>{},(e)=>{console.error('Error saving icon',e);});});}.bind(this,icon,id));icon.size=this.iconSize?this.iconSize:icon.size;if(entry!==-1){icon.icon=this.startupMetadata[entry].icon;this.startupMetadata.splice(entry,1);icon.updateName();if(window.VulpesCompat&&icon.app)icon.refresh();}else{icon.refresh();}
icon.addEventListener('activated',e=>{e.preventDefault();this.handleEvent({type:'activate',detail:{target:e.target.parentNode},preventDefault:()=>{}});});},refreshIcon:function(icon){icon.size=this.iconSize?this.iconSize:icon.size;if(icon.bookmark){IconsHelper.setElementIcon(icon,this.iconSize).then(()=>{},e=>{console.error('Error refreshing bookmark icon',e);if(!icon.isUserSet){icon.refresh();}});}else{icon.refresh();}},storeAppOrder:function(){var storedOrders=[];var children=this.icons.children;for(var i=0,iLen=children.length;i<iLen;i++){var appIcon=children[i].firstElementChild;var id=this.getIconId(appIcon.app?appIcon.app:appIcon.bookmark,appIcon.entryPoint);storedOrders.push({id:id,order:i});}
this.metadata.set(storedOrders).then(()=>{},(e)=>{console.error('Error storing app order',e);});},iconAdded:function(container){if(container.style.display==='none'){return;}
this.refreshGridSize();},refreshGridSize:function(){var children=this.icons.children;var cols=this.settings.small?4:3;var visibleChildren=0;var firstVisibleChild=-1;for(var i=0,iLen=children.length;i<iLen;i++){if(children[i].style.display!=='none'){visibleChildren++;if(firstVisibleChild===-1){firstVisibleChild=i;this.iconsLeft=this.icons.getChildOffsetRect(children[i]).left;}else if(visibleChildren===cols){this.iconsRight=this.icons.getChildOffsetRect(children[i]).right;}}}
if(visibleChildren<1){this.pendingGridHeight=this.gridHeight=0;this.pageHeight=this.scrollable.clientHeight;}else{var iconHeight=Math.round(children[firstVisibleChild].offsetHeight);var scrollHeight=this.scrollable.clientHeight;var rowsPerPage=Math.floor(scrollHeight/iconHeight);var pageHeight=rowsPerPage*iconHeight;var gridHeight;if(this.settings.scrollSnapping){gridHeight=(Math.ceil((iconHeight*Math.ceil(visibleChildren/cols))/pageHeight)*pageHeight)+(scrollHeight-pageHeight);}else{gridHeight=(Math.ceil(visibleChildren/cols)+1)*iconHeight;}
this.pageHeight=pageHeight;this.pendingGridHeight=gridHeight;this.iconsPerPage=rowsPerPage*cols;if(!this.visualLoadComplete&&Math.floor(visibleChildren/cols)*iconHeight>=scrollHeight){this.onVisualLoad();}}
this.scrollable.style.scrollSnapPointsY=`repeat(${this.pageHeight}px)`;this.icons.style.backgroundSize='100% '+(this.pageHeight*2)+'px';if(this.resizeTimeout!==null){clearTimeout(this.resizeTimeout);}
var setGridHeight=()=>{this.resizeTimeout=null;this.icons.style.height=gridHeight+'px';this.gridHeight=this.pendingGridHeight;};if(this.pendingGridHeight>this.gridHeight){setGridHeight();}else if(this.pendingGridHeight!==this.gridHeight){this.resizeTimeout=setTimeout(setGridHeight,RESIZE_TIMEOUT);}},snapScrollPosition:function(bias){bias=bias||0;var gridHeight=this.pendingGridHeight;var currentScroll=this.scrollable.scrollTop;var scrollHeight=this.scrollable.clientHeight;var destination;if(this.settings.scrollSnapping){destination=Math.min(gridHeight-scrollHeight,Math.round(currentScroll/this.pageHeight+bias)*this.pageHeight);}else{destination=Math.min(gridHeight-scrollHeight,currentScroll+(this.pageHeight*bias));}
if(Math.abs(destination-currentScroll)>1){this.scrollable.style.overflow='';this.scrollable.scrollTo({left:0,top:destination,behavior:'smooth'});if(this.autoScrollOverflowTimeout!==null){clearTimeout(this.autoScrollOverflowTimeout);this.autoScrollOverflowTimeout=null;}
if(this.dragging){document.body.classList.add('autoscroll');this.autoScrollOverflowTimeout=setTimeout(()=>{this.autoScrollOverflowTimeout=null;this.scrollable.style.overflow='hidden';document.body.classList.remove('autoscroll');this.scrollable.scrollTop=destination;},AUTOSCROLL_OVERFLOW_DELAY);}}},showActionDialog:function(dialog,args,callbacks){if(dialog.style.display!=='none'){return;}
function executeCallback(dialog,callback){callback();dialog.close();}
var actions=dialog.getElementsByClassName('action');for(var i=0,iLen=Math.min(actions.length,callbacks.length);i<iLen;i++){actions[i].onclick=executeCallback.bind(this,dialog,callbacks[i]);}
if(args){dialog.querySelector('.body').setAttribute('data-l10n-args',args);}
setTimeout(()=>{dialog.open();},DIALOG_SHOW_TIMEOUT);},getChildIndex:function(child){return this.icons.children.indexOf(child);},removeSelectedIcon:function(){if(!this.selectedIcon){return;}
if(this.selectedIcon.app){if(!this.selectedIcon.app.removable){return;}
navigator.mozApps.mgmt.uninstall(this.selectedIcon.app);}else if(this.selectedIcon.bookmark){var remove=new MozActivity({name:'remove-bookmark',data:{type:'url',url:this.selectedIcon.bookmark.id}});var icon=this.selectedIcon;remove.onsuccess=()=>{this.enterEditMode(null);};remove.onerror=()=>{this.enterEditMode(icon);};}},renameSelectedIcon:function(){if(!this.selectedIcon||!this.selectedIcon.bookmark){return;}
var rename=new MozActivity({name:'save-bookmark',data:{type:'url',url:this.selectedIcon.bookmark.id}});var icon=this.selectedIcon;rename.onsuccess=rename.onerror=()=>{this.enterEditMode(icon);};},iconIsEditable:function(icon){return(icon.bookmark||(icon.app&&icon.app.removable))?true:false;},updateSelectedIcon:function(icon){if(this.selectedIcon===icon){return;}
if(this.selectedIcon&&(!icon||this.iconIsEditable(icon))){this.selectedIcon.classList.remove('selected');this.selectedIcon.removeEventListener('touchstart',this);this.selectedIcon=null;}
var selectedRenameable=false;var selectedRemovable=false;if(icon){selectedRenameable=!!icon.bookmark;selectedRemovable=selectedRenameable||icon.app.removable;if(selectedRenameable||selectedRemovable){this.selectedIcon=icon;icon.classList.add('selected');icon.addEventListener('touchstart',this);this.rename.classList.toggle('active',selectedRenameable);this.remove.classList.toggle('active',selectedRemovable);}else if(!icon.classList.contains('uneditable')){icon.classList.add('uneditable');icon.addEventListener('animationend',function animEnd(){icon.removeEventListener('animationend',animEnd);icon.classList.remove('uneditable');});}}else{this.rename.classList.remove('active');this.remove.classList.remove('active');}},enterEditMode:function(icon){console.debug('Entering edit mode on '+(icon?icon.name:'no icon'));this.updateSelectedIcon(icon);if(this.editMode){return;}
this.editMode=true;document.body.classList.add('edit-mode');},exitEditMode:function(){if(!this.editMode){return;}
console.debug('Exiting edit mode');this.editMode=false;document.body.classList.remove('edit-mode');this.rename.classList.remove('active');this.remove.classList.remove('active');this.updateSelectedIcon(null);},handleEvent:function(e){var icon,child,id;switch(e.type){case'activate':e.preventDefault();icon=e.detail.target.firstElementChild;if(this.editMode){this.enterEditMode(icon);return;}
switch(icon.state){case'unrecoverable':navigator.mozApps.mgmt.uninstall(icon.app);break;case'installing':this.showActionDialog(this.cancelDownload,JSON.stringify({name:icon.name}),[()=>{icon.app.cancelDownload();}]);break;case'error':case'paused':this.showActionDialog(this.resumeDownload,JSON.stringify({name:icon.name}),[()=>{icon.app.download();}]);break;default:icon.launch();break;}
break;case'touchstart':this.icons.dragAndDropTimeout=0;break;case'drag-start':console.debug('Drag-start on '+
e.detail.target.firstElementChild.name);this.dragging=true;this.shouldEnterEditMode=true;document.body.classList.add('dragging');this.scrollable.style.overflow='hidden';this.draggedIndex=this.getChildIndex(e.detail.target);break;case'drag-finish':console.debug('Drag-finish');this.dragging=false;document.body.classList.remove('dragging');document.body.classList.remove('autoscroll');this.scrollable.style.overflow='';if(this.autoScrollInterval!==null){clearInterval(this.autoScrollInterval);this.autoScrollInterval=null;}
if(this.autoScrollOverflowTimeout!==null){clearTimeout(this.autoScrollOverflowTimeout);this.autoScrollOverflowTimeout=null;}
if(this.hoverIcon){this.hoverIcon.classList.remove('hover-before','hover-after');this.hoverIcon=null;}
this.icons.dragAndDropTimeout=-1;break;case'drag-end':console.debug('Drag-end, target: '+(e.detail.dropTarget?e.detail.dropTarget.firstElementChild.name:'none'));if(e.detail.dropTarget===null&&e.detail.clientX>=this.iconsLeft&&e.detail.clientX<this.iconsRight){e.preventDefault();var bottom=e.detail.clientY<this.lastWindowHeight/2;console.debug('Reordering dragged icon to '+
(bottom?'bottom':'top'));this.icons.reorderChild(e.detail.target,bottom?this.icons.firstChild:null,this.storeAppOrder.bind(this));break;}
if(e.detail.dropTarget===e.detail.target){icon=e.detail.target.firstElementChild;if(this.editMode||this.shouldEnterEditMode){e.preventDefault();this.enterEditMode(icon);}}
break;case'drag-rearrange':console.debug('Drag rearrange');this.storeAppOrder();break;case'drag-move':var inAutoscroll=false;if(e.detail.clientY>this.lastWindowHeight-AUTOSCROLL_DISTANCE){inAutoscroll=true;if(this.autoScrollInterval===null){this.autoScrollInterval=setInterval(()=>{this.shouldEnterEditMode=false;this.snapScrollPosition(1);return true;},AUTOSCROLL_DELAY);}}else if(e.detail.clientY<AUTOSCROLL_DISTANCE){inAutoscroll=true;if(this.autoScrollInterval===null){this.autoScrollInterval=setInterval(()=>{this.shouldEnterEditMode=false;this.snapScrollPosition(-1);return true;},AUTOSCROLL_DELAY);}}else{var hoverIcon=this.icons.getChildFromPoint(e.detail.clientX,e.detail.clientY);if(this.hoverIcon!==hoverIcon){if(this.hoverIcon){this.shouldEnterEditMode=false;this.hoverIcon.classList.remove('hover-before','hover-after');}
this.hoverIcon=(hoverIcon!==e.detail.target)?hoverIcon:null;if(this.hoverIcon){var offset=this.draggedIndex-
this.getChildIndex(this.hoverIcon);this.hoverIcon.classList.add((offset>=0)?'hover-before':'hover-after');}}}
if(!inAutoscroll&&this.autoScrollInterval!==null){clearInterval(this.autoScrollInterval);this.autoScrollInterval=null;}
break;case'install':var existing=false;for(child of this.icons.children){icon=child.firstElementChild;if(icon.app&&icon.app.manifestURL===e.application.manifestURL){icon.app=e.application;icon.refresh();existing=true;}}
if(existing){return;}
this.addApp(e.application);this.storeAppOrder();break;case'uninstall':var callback=()=>{this.storeAppOrder();this.refreshGridSize();this.snapScrollPosition();};for(child of this.icons.children){icon=child.firstElementChild;if(icon.app&&icon.app.manifestURL===e.application.manifestURL){id=this.getIconId(e.application,icon.entryPoint);this.metadata.remove(id).then(()=>{},(e)=>{console.error('Error removing uninstalled app',e);});this.icons.removeChild(child,callback);callback=null;if(this.selectedIcon===icon){this.updateSelectedIcon(null);}}}
break;case'localized':for(icon of this.icons.children){icon.firstElementChild.updateName();}
this.icons.synchronise();break;case'online':for(var i=0,iLen=this.iconsToRetry.length;i<iLen;i++){for(child of this.icons.children){icon=child.firstElementChild;id=this.getIconId(icon.app?icon.app:icon.bookmark,icon.entryPoint);if(id===this.iconsToRetry[i]){this.refreshIcon(icon);break;}}}
break;case'resize':if(this.lastWindowWidth===window.innerWidth&&this.lastWindowHeight===window.innerHeight){break;}
this.lastWindowWidth=window.innerWidth;this.lastWindowHeight=window.innerHeight;var oldIconSize=this.iconSize;this._iconSize=0;if(oldIconSize!==this.iconSize){for(child of this.icons.children){icon=child.firstElementChild;this.refreshIcon(icon);}}
this.icons.synchronise();this.refreshGridSize();this.snapScrollPosition();break;case'settings-changed':this.toggleSmall(this.settings.small);this.toggleScrollSnapping(this.settings.scrollSnapping);break;}}};exports.Apps=Apps;}(window));;'use strict';(function(exports){const HASH_CHANGE_DEBOUNCE=100;function AppWindow(){this.header=document.getElementById('page-indicator-header');this.indicator=document.getElementById('page-indicator');this.panels=document.getElementById('panels');this.shadow=document.getElementById('shadow');this.apps=new Apps();this.pages=new Pages();this.appsVisible=undefined;this.ignoreHashChangeTimeout=null;this.indicator.addEventListener('keypress',this);this.panels.addEventListener('scroll',this);window.addEventListener('hashchange',this,true);window.addEventListener('localized',this);document.addEventListener('visibilitychange',this);this.updatePanelIndicator();window.performance.mark('navigationInteractive');}
AppWindow.prototype={updatePanelIndicator:function(){var appsVisible=Math.abs(this.panels.scrollLeft)<=this.panels.scrollWidth/4;if(this.appsVisible!==appsVisible){this.appsVisible=appsVisible;this.header.setAttribute('data-l10n-id',appsVisible?'apps-panel':'pages-panel');this.indicator.children[0].classList.toggle('active',appsVisible);this.indicator.children[1].classList.toggle('active',!appsVisible);this.indicator.setAttribute('aria-valuenow',appsVisible?1:2);this.indicator.setAttribute('data-l10n-args',JSON.stringify({currentPage:appsVisible?1:2,totalPages:2}));this.apps.panel.setAttribute('aria-hidden',!appsVisible);this.pages.panel.setAttribute('aria-hidden',appsVisible);if(appsVisible){this.pages.scrollable.removeEventListener('scroll',this);this.apps.scrollable.addEventListener('scroll',this);}else{this.apps.scrollable.removeEventListener('scroll',this);this.pages.scrollable.addEventListener('scroll',this);}
this.updateShadowState();}},updateShadowState:function(){var position=this.appsVisible?this.apps.scrollable.scrollTop:this.pages.scrollable.scrollTop;var scrolled=position>1;if(this.shadow.classList.contains('visible')!==scrolled){this.shadow.classList.toggle('visible',scrolled);}},handleEvent:function(e){switch(e.type){case'keypress':if(!e.ctrlKey){return;}
switch(e.keyCode){case e.DOM_VK_RIGHT:this.panels.scrollTo({left:this.panels.scrollLeftMax,top:0,behavior:'smooth'});return;case e.DOM_VK_LEFT:this.panels.scrollTo({left:0,top:0,behavior:'smooth'});return;}
return;case'scroll':if(e.target===this.panels){this.updatePanelIndicator();}else{this.updateShadowState();}
return;case'hashchange':if(document.hidden||this.ignoreHashChangeTimeout!==null){return;}
e.preventDefault();e.stopImmediatePropagation();this.ignoreHashChangeTimeout=setTimeout(()=>{this.ignoreHashChangeTimeout=null;},HASH_CHANGE_DEBOUNCE);for(var dialog of this.apps.dialogs.concat(this.pages.dialogs)){if(!dialog.opened){continue;}
dialog.close();return;}
if(this.apps.editMode){this.apps.exitEditMode();return;}
if(this.pages.editMode){this.pages.exitEditMode();return;}
if(!this.appsVisible&&this.pages.scrollable.scrollTop===0){this.panels.scrollTo({left:0,top:0,behavior:'smooth'});return;}
var visiblePanel=this.appsVisible?this.apps.scrollable:this.pages.scrollable;visiblePanel.scrollTo({left:0,top:0,behavior:'smooth'});return;case'localized':this.updatePanelIndicator();return;case'visibilitychange':if(document.hidden){this.apps.exitEditMode();this.pages.exitEditMode();}
return;}}};exports.AppWindow=AppWindow;}(window));;'use strict';var appWindow=new AppWindow();