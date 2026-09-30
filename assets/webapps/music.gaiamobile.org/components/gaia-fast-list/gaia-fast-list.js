;;;;;;;;(function(define){define(function(require,exports,module){var component=require('gaia-component');var FastList=require('fast-list');var scheduler=FastList.scheduler;var poplar=require('poplar');require('gaia-sub-header');var isTouch='ontouchstart'in window;var touchcancel=isTouch?'touchcancel':'mousecancel';var touchstart=isTouch?'touchstart':'mousedown';var touchmove=isTouch?'touchmove':'mousemove';var touchend=isTouch?'touchend':'mouseup';var debug=0?(...args)=>console.log('[GaiaFastList]',...args):()=>{};var cachesOpen=caches.open('gfl');var keys={internal:Symbol(),first:Symbol(),img:Symbol()};var GaiaFastListProto={extensible:false,imageCacheSize:5e6,imageCacheLength:500,created(){debug('create');this.setupShadowRoot();this.caching=this.getAttribute('caching');this.offset=this.getAttribute('offset');this.picker=this.getAttribute('picker');this.bottom=this.getAttribute('bottom');this.top=this.getAttribute('top');this[keys.internal]=new Internal(this);},configure(props){debug('configure');this[keys.internal].configure(props);},setModel(value){return this[keys.internal].setModel(value);},cache(){debug('cache');if(!this.caching)return;this[keys.internal].cachedHeight=null;return this[keys.internal].updateCache();},clearCache(){debug('clear cache');this[keys.internal].clearCache();},scrollTo(y){return this[keys.internal].scrollTo(y);},destroy(){this[keys.internal].destroy();},attrs:{rendered:{get(){return this[keys.internal].rendered.promise;}},top:{get(){return this._top;},set(value){debug('set top',value);if(value==null)return;value=Number(value);if(value===this._top)return;this.setAttribute('top',value);this._top=value;}},bottom:{get(){return this._bottom;},set(value){debug('set bottom',value);if(value==null)return;value=Number(value);if(value===this._bottom)return;this.setAttribute('bottom',value);this._bottom=value;}},caching:{get(){return this._caching;},set(value){value=value||value==='';if(value===this._caching)return;if(value)this.setAttribute('caching','');else this.removeAttribute('caching');this._caching=value;}},offset:{get(){return this._offset||0;},set(value){if(value==this._offset)return;if(value)this.setAttribute('offset',value);else this.removeAttribute('offset');this._offset=Number(value);}},scrollTop:{get(){return this[keys.internal].getScrollTop();},set(value){this[keys.internal].setScrollTop(value);}},minScrollHeight:{get(){return this[keys.internal].list.style.minHeight;},set(value){this[keys.internal].list.style.minHeight=value;}},picker:{get(){return this._picker;},set(value){value=value||value==='';if(value===this._picker)return;if(value)this.setAttr('picker','');else this.removeAttr('picker');this._picker=value;}}},template:`
    <div class="inner">
      <div class="picker"><content select="[picker-item]"></content></div>
      <div class="overlay"><div class="text">X</div><div class="icon">search</div></div>
      <div class="fast-list">
        <ul><content></content></ul>
      </div>
    </div>

    <style>
      :host {
        display: block;
        height: 100%;

        color: var(--text-color-minus);
        overflow: hidden;
        text-align: match-parent;
      }

      .inner {
        position: relative;
        height: 100%;
      }

      .fast-list {
        position: absolute;
        left: 0; right: 0;
        top: 0; bottom: 0;

        padding: 0 17px;
      }

      [picker] .fast-list {
        offset-inline-end: 26px; /* picker width */
        padding-inline-end: 12px;
      }

      .fast-list ul {
        position: relative;

        padding: 0;
        margin: 0;

        list-style: none;
      }

      ::content .gfl-header {
        position: sticky;
        top: -20px;
        z-index: 100;

        margin: 0 !important;
        padding-top: 20px;
        padding-bottom: 1px;
        margin-bottom: -1px !important;
        width: calc(100% + 1px);
      }

      ::content .gfl-item {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        z-index: 10;

        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 60px;
        padding: 0 9px;
        overflow: hidden;
        box-sizing: border-box;

        list-style-type: none;
        text-decoration: none;
        border-top: solid 1px var(--border-color, #e7e7e7);
        background: var(--background);
        -moz-user-select: none;
      }

      ::content .gfl-item.first {
        border-top-color: transparent;
      }

      ::content .gfl-item[unread=true],
      ::content .gfl-item[unread=false] {
        -moz-padding-start: 18px;
      }

      ::content .gfl-item[unread=true]:before,
      ::content .gfl-item[unread=false]:before {
        content: '';
        position: absolute;
        offset-inline-start: 0;
        top: 50%;

        display: block;
        width: 8px;
        height: 8px;
        margin-top: -4px;
        background-color: var(--highlight-color);
        border-radius: 50%;
      }

      ::content .gfl-item[unread=false]:before {
        visibility: hidden;
      }

      ::content .image {
        position: absolute;
        top: 8px;
        offset-inline-end: 7px;

        width: 44px;
        height: 44px;
      }

      ::content .image.round,
      ::content .image.round > img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
      }

      ::content .gfl-item .image.round {
        top: 8.5px;
        offset-inline-end: 0;
        background: var(--border-color);
      }

      ::content .gfl-item img {
        position: absolute;
        left: 0; top: 0;

        width: 44px;
        height: 44px;

        opacity: 0;
      }

      ::content .cached .gfl-item img {
        display: none;
      }

      ::content h3,
      ::content p {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      ::content :-moz-dir(ltr) .image ~ h3,
      ::content :-moz-dir(ltr) .image ~ p {
        padding-right: 52px;
      }

      ::content :-moz-dir(rtl) .image ~ h3,
      ::content :-moz-dir(rtl) .image ~ p {
        padding-left: 52px;
      }

      ::content :-moz-dir(ltr) .image.round ~ h3,
      ::content :-moz-dir(ltr) .image.round ~ p {
        padding-right: 42px;
      }

      ::content :-moz-dir(rtl) .image.round ~ h3,
      ::content :-moz-dir(rtl) .image.round ~ p {
        padding-left: 42px;
      }

      ::content h3 {
        margin: 0;

        font-size: 20px;
        font-weight: 400;
        font-style: normal;
        color: var(--text-color);
      }

      ::content p {
        margin: 0;
        font-size: 15px;
        line-height: 1.35em;
      }

      ::content a {
        color: inherit;
      }

      .picker {
        display: none;
      }

      [picker] .picker {
        position: absolute;
        right: 0;
        top: 0;

        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 35px;
        height: 100%;
        padding: 2px 0;
      }

      ::content [picker-item] {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        min-height: 0;
        text-decoration: none;
        text-align: center;
        color: inherit;
      }

      ::content [picker-item][data-icon] {
        font-size: 0; /* hide icon text-label */
      }

      ::content [picker-item]:before {
        font-size: 19px;
        -moz-user-select: none;
      }

      .picker a {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;

        text-decoration: none;
        text-align: center;
        font-size: 13px;
        color: inherit;

        text-transform: uppercase;
        -moz-user-select: none;
      }

      .overlay {
        position: absolute;
        left: 50%; top: 50%;
        z-index: 200;

        display: none;
        width: 1.8em;
        height: 1.8em;
        margin: -1em 0 0 -1em;

        font-size: 70px;
        text-align: center;
        line-height: 1.8;
        font-weight: 300;
        border-radius: 50%;

        color: #fff;
        background: var(--background-minus);
        pointer-events: none;
        opacity: 0;
        transition: opacity 400ms;
        text-transform: uppercase;
      }

      [picker] .overlay {
        display: block;
      }

      .overlay.visible {
        opacity: 1;
        transition: opacity 100ms;
      }

      .overlay > .icon {
        position: absolute;
        left: 0; top: 0; bottom: 0; right: 0;
        font-family: "gaia-icons";
        font-weight: 500;
        text-transform: none;
        text-rendering: optimizeLegibility;
      }
    </style>`,FastList:FastList};function Internal(el){var shadow=el.shadowRoot;this.el=el;this.renderedCache=this.renderCache();this.listCreated=new Deferred();this.rendered=new Deferred();this.images={list:[],hash:{},bytes:0};this.els={list:shadow.querySelector('ul'),picker:shadow.querySelector('.picker'),overlay:shadow.querySelector('.overlay'),overlayIcon:shadow.querySelector('.overlay > .icon'),overlayText:shadow.querySelector('.overlay > .text'),container:shadow.querySelector('.fast-list'),listContent:shadow.querySelector('.fast-list content'),pickerItems:[]};this.container=this.els.container;this.list=this.els.list;this.itemContainer=el;this.configureTemplates();this.setupPicker();addEventListener('pagehide',()=>this.emptyImageCache());debug('initialized');}
Internal.prototype={headerHeight:40,itemHeight:60,setModel(model){debug('set model');if(!model)return Promise.reject(new Error('model undefined'));this.sections=this.sectionize(model);this.model=model;return!this.fastList?this.createList():this.reloadData();},createList(){return this.renderedCache.then(()=>{debug('create list');this.fastList=new this.el.FastList(this);return this.fastList.rendered;}).then(()=>{this.rendered.resolve();this.els.list.style.transform='';this.removeCachedRender();return this.fastList.complete;}).then(()=>{this.updateFastGradient();this.listCreated.resolve();});},reloadData(){return this.listCreated.promise.then(()=>{debug('reload data');this.emptyImageCache();return this.fastList.reloadData();}).then(()=>this.updateFastGradient());},sectionize(items){debug('sectionize');var sectioned=!!this.getSectionName;var count=0;var result={};for(var i=0,l=items.length;i<l;i++){var item=items[i];var section=sectioned&&this.getSectionName(item);if(!section){if(i===0)item[keys.first]=true;else if(item[keys.first])delete item[keys.first];continue;}
if(!result[section]){result[section]=[];item[keys.first]=true;}else if(item[keys.first]){delete item[keys.first];}
result[section].push(item);count++;}
this.hasSections=!!count;return this.hasSections&&result;},configure(props){Object.assign(this,props);},configureTemplates(){var templateHeader=this.el.querySelector('template[header]');var templateItem=this.el.querySelector('template[item]');var noTemplates=!templateItem&&!templateHeader;if(noTemplates)templateItem=this.el.querySelector('template');if(templateHeader){this.templateHeader=templateHeader.innerHTML;templateHeader.remove();}
if(templateItem){this.templateItem=templateItem.innerHTML;templateItem.remove();}},createItem(){debug('create item');this.parsedItem=this.parsedItem||poplar.parse(this.templateItem);var el=poplar.create(this.parsedItem.cloneNode(true));el[keys.img]=el.querySelector('img');el.classList.add('gfl-item');return el;},createSection(name){this.parsedSection=this.parsedSection||poplar.parse(this.templateHeader);var header=poplar.create(this.parsedSection.cloneNode(true));var section=document.createElement('div');header.classList.add('gfl-header');section.appendChild(header);section.classList.add('gfl-section');section.id=`gfl-section-${name}`;return section;},populateItem(el,i){var record=this.getRecordAt(i);poplar.populate(el,record);el.classList.toggle('first',!!record[keys.first]);},populateItemDetail(el,i){if(!this.getItemImageSrc)return;debug('populate item detail',i);var img=el[keys.img];if(!img)return;var record=this.getRecordAt(i);var cached=this.getCachedImage(i);if(cached){load(cached);return;}
Promise.resolve(this.getItemImageSrc(record,i)).then(result=>{if(!result)return;if(el.dataset.index!=i)return debug('item recycled');var image={src:normalizeImageSrc(result),bytes:result.size||result.length};this.cacheImage(image,i);load(image);}).catch(e=>{throw e;});function load(image){debug('load image',image);img.src=image.src;img.onload=()=>{debug('image loaded',i);img.raf=requestAnimationFrame(()=>{img.raf=null;img.style.transition='opacity 500ms';img.style.opacity=1;});};}},unpopulateItemDetail(el,i){if(!this.getItemImageSrc)return;debug('unpopulate item detail');var img=el[keys.img];if(!img)return;img.style.transition='none';img.style.opacity=0;debug('raf',img.raf);if(img.raf)cancelAnimationFrame(img.raf);img.onload=img.raf=null;},cacheImage(image,index){if(!this.el.imageCacheLength)return;if(!this.el.imageCacheSize)return;if(this.images.hash[index])return;this.images.hash[index]=image;this.images.list.push(index);this.images.bytes+=image.bytes;this.checkImageCacheLimit();debug('image cached',image,this.images.bytes);return image;},getCachedImage(index){debug('get cached image',index);return this.images.hash[index];},checkImageCacheLimit(){var cachedImages=this.images.list.length;var exceeded=this.images.bytes>this.el.imageCacheSize||cachedImages>this.el.imageCacheLength;if(!exceeded)return;debug('image cache limit exceeded',exceeded);var itemCount=this.fastList.geometry.maxItemCount;var toDiscard=(cachedImages-itemCount)/2;if(toDiscard<=0)return;debug('discarding: ',toDiscard);while(toDiscard-->0){this.discardOldestImage();debug('bytes used',this.images.bytes);}
this.checkImageCacheLimit();},discardOldestImage(){debug('discard oldest image');if(!this.images.list.length)return false;var index=this.images.list.shift();var image=this.images.hash[index];if(image.bytes){URL.revokeObjectURL(image.src);this.images.bytes-=image.bytes;debug('revoked url',image.src);}
delete this.images.hash[index];return true;},emptyImageCache(){while(this.images.list.length)this.discardOldestImage();},populateSection(el,section){var title=el.firstChild;poplar.populate(title,{section:section});},getViewportHeight(){debug('get viewport height');var bottom=this.el.bottom;var top=this.el.top;if(top!=null&&bottom!=null){return parent.innerHeight-top-bottom;}
return parseInt(this.el.style.height)||this.el.clientHeight;},getSections(){return Object.keys(this.sections||{});},getSectionHeaderHeight(){return this.hasSections?this.headerHeight:0;},getFullSectionHeight(key){return this.sections[key].length*this.getItemHeight();},getFullSectionLength(key){return this.sections[key].length;},getRecordAt(index){return this.model[index];},getSectionName:undefined,getSectionFor(index){var item=this.getRecordAt(index);return this.getSectionName&&this.getSectionName(item);},eachSection(fn){var sections=this.getSections();var result;if(sections.length){for(var key in this.sections){result=fn(key,this.sections[key]);if(result!==undefined){return result;}}}else{return fn(null,this.model);}},getIndexAtPosition(pos){var sections=this.sections||[this.model];var headerHeight=this.getSectionHeaderHeight();var itemHeight=this.getItemHeight();var fullLength=this.getFullLength();var lastIndex=fullLength-1;var index=0;if(!fullLength)return index;for(var name in sections){var items=sections[name];var sectionHeight=items.length*itemHeight;pos-=headerHeight;if(pos>sectionHeight){pos-=sectionHeight;index+=items.length;continue;}
for(var i=0;i<items.length;i++){pos-=itemHeight;if(pos<=0||index===fullLength-1)break;else index++;}}
index=Math.min(index,lastIndex);return index;},getPositionForIndex(index){var sections=this.sections||[this.model];var headerHeight=this.getSectionHeaderHeight();var itemHeight=this.itemHeight;var top=this.el.offset;var length;for(var name in sections){length=sections[name].length;top+=headerHeight;if(index<length){top+=index*itemHeight;break;}
index-=length;top+=length*itemHeight;}
return top;},jumpToId(id){debug('jump to id',id);if(!id)return;var children=this.els.listContent.getDistributedNodes();var found=false;var offset=0;for(var i=0,l=children.length;i<l;i++){var child=children[i];if(!child.tagName)continue;if(child.id===id){debug('found section',child);found=true;break;}
if(child.tagName=='STYLE')continue;if(child.classList.contains('.gfl-item'))continue;var height=child.style.height||child.offsetHeight;offset+=parseInt(height);}
if(found)this.el.scrollTop=offset;},getFullLength(){return this.model.length;},getItemHeight(){return this.itemHeight;},getFullHeight(){debug('get full height',this.cachedHeight);var height=this.cachedHeight;if(height!=null)return height;var headers=this.getSections().length*this.getSectionHeaderHeight();var items=this.getFullLength()*this.getItemHeight();return headers+items+this.el.offset;},insertAtIndex(index,record,toSection){this._cachedLength=null;return this.eachSection(function(key,items){if(index<items.length||key===toSection){return items.splice(index,0,record);}
index-=items.length;});},replaceAtIndex(index,record){return this.eachSection(function(key,items){if(index<items.length)return items.splice(index,1,record);index-=items.length;});},removeAtIndex(index){this._cachedLength=null;return this.eachSection(function(key,items){if(index<items.length)return items.splice(index,1)[0];index-=items.length;});},setScrollTop(value){debug('set scroll top',value);if(this.fastList){this.fastList.scrollInstantly(value);}else{this.els.list.style.transform=`translateY(${-value}px)`;this.initialScrollTop=value;}},scrollTo(y){return this.listCreated.promise.then(()=>{setTimeout(()=>{debug('scroll to',y);this.els.container.scrollTo({left:0,top:y,behavior:'smooth'});});});},getScrollTop(){debug('get scroll top');return this.fastList?this.fastList.scrollTop:this.initialScrollTop;},updateFastGradient(){var viewportHeight=this.getViewportHeight();var fullHeight=this.getFullHeight();var style=this.els.list.style;if(fullHeight<=viewportHeight){style.backgroundImage='';return;}
var headerHeight=this.getSectionHeaderHeight();var itemHeight=this.getItemHeight();var offset=this.el.offset;style.backgroundImage=`linear-gradient(
        to bottom,
        var(--background),
        var(--background) 100%),
      linear-gradient(
        to bottom,
        transparent,
        transparent 20%,
        var(--border-color) 48%,
        var(--border-color) 52%,
        transparent 80%,
        transparent 100%)`;style.backgroundRepeat='no-repeat, repeat-y';style.backgroundPosition=`0 0, center ${headerHeight}px`;style.backgroundSize=`100% ${offset}px, 98% ${itemHeight}px`;},cacheKey:'gflCacheKey',getCache(){return cachesOpen.then(cache=>{debug('get cache',this.cacheKey);return cache.match(new Request(this.cacheKey)).then(res=>res&&res.json());});},setCache(data){return cachesOpen.then(cache=>{debug('set cache',data);var req=new Request(this.cacheKey);var res=new Response(JSON.stringify(data));return cache.put(req,res);});},clearCache(){return cachesOpen.then(cache=>{debug('clear cache');return cache.delete(this.cacheKey);});},updateCache(){if(!this.el.caching)return Promise.resolve();debug('update cache');var fullHeight=this.getFullHeight();var maxViewportHeight=Math.max(window.innerWidth,window.innerHeight);var length=Math.ceil(maxViewportHeight/this.getItemHeight());var fullLength=this.getFullLength();var html='';if(length>fullLength)length=fullLength;for(var i=0;i<length;i++){var el=this.createItem();el.dataset.position=this.getPositionForIndex(i);this.populateItem(el,i);html+=el.outerHTML;}
var sections=this.el.querySelectorAll('.gfl-section');var height=0;for(var j=0,l=sections.length;j<l;j++){html+=sections[j].outerHTML;height+=~~sections[j].style.height;if(height>=maxViewportHeight)break;}
debug('cached html',html);return this.setCache({height:fullHeight,html:html});},renderCache(){if(!this.el.caching)return Promise.resolve();debug('render cache');return this.getCache().then(result=>{debug('got cache');if(!result)return;var height=result.height;var html=result.html;this.els.cached=document.createElement('div');this.els.cached.className='cached';this.els.cached.innerHTML=html;var items=this.els.cached.querySelectorAll('.gfl-item');[].forEach.call(items,(el,i)=>{el.style.transform=`translateY(${el.dataset.position}px)`;});this.el.appendChild(this.els.cached);this.cachedHeight=height;this.rendered.resolve();});},removeCachedRender(){if(!this.els.cached)return;this.els.cached.remove();delete this.els.cached;},setupPicker(){if(!this.el.picker)return;debug('setup picker');this.picker=new Picker(this.els.picker);this.onPickingStarted=this.onPickingStarted.bind(this);this.onPickingEnded=this.onPickingEnded.bind(this);this.onPicked=this.onPicked.bind(this);this.picker.addEventListener('started',this.onPickingStarted);this.picker.addEventListener('ended',this.onPickingEnded);this.picker.addEventListener('picked',this.onPicked);},teardownPicker(){if(!this.picker)return;debug('teardown picker');this.picker.removeEventListener('picked',this.onPicked);this.picker.destroy();delete this.onPicked;delete this.onPickingEnded;delete this.onPickingStarted;delete this.picker;},onPicked(){debug('on picked');var link=this.picker.selected;this.setOverlayContent(link.dataset.icon,link.textContent);},onPickingStarted(){debug('on picking started');this.els.overlay.classList.add('visible');},onPickingEnded(){debug('on picking ended');var link=this.picker.selected;var id=link.hash.substr(1);this.jumpToId(id);this.els.overlay.classList.remove('visible');},setOverlayContent(icon,text){var letterNode=this.els.overlayText;var iconNode=this.els.overlayIcon;if(icon){iconNode.firstChild.data=icon;letterNode.style.visibility='hidden';iconNode.style.visibility='visible';}else{letterNode.firstChild.data=text;iconNode.style.visibility='hidden';letterNode.style.visibility='visible';}},destroy(){debug('detached');this.teardownPicker();if(this.fastList){this.fastList.destroy();delete this.fastList;}},templateHeader:'<gaia-sub-header>${section}</gaia-sub-header>',templateItem:'<a href="${link}"><div class="text"><h3>${title}</h3>'+'<p>${body}</p></div><div class="image"><img src="${image}"/></div></a>'};function Picker(el){this.el=el;this.els={content:this.el.querySelector('content'),items:[]};this.onTouchStart=this.onTouchStart.bind(this);this.onTouchMove=this.onTouchMove.bind(this);this.onTouchEnd=this.onTouchEnd.bind(this);this.onClick=this.onClick.bind(this);this.el.addEventListener(touchstart,this.onTouchStart);this.el.addEventListener('click',this.onClick,true);this.render();debug('created picker');}
Picker.prototype={render(){var letters='abcdefghijklmnopqrstuvwxyz#';var length=letters.length;for(var i=0;i<length;i++){var letter=letters[i];var el=document.createElement('a');el.textContent=letters[i];el.href=`#gfl-section-${letter}`;this.el.appendChild(el);this.els.items.push(el);}},addEventListener(name,fn){this.el.addEventListener(name,fn);},removeEventListener(name,fn){this.el.removeEventListener(name,fn);},onTouchStart(e){debug('touch start');e.stopPropagation();e.preventDefault();this.height=this.el.clientHeight;this.els.allItems=this.getAllItems();this.itemHeight=this.height/this.els.allItems.length;this.offset=this.els.allItems[0].getBoundingClientRect().top;scheduler.attachDirect(window,touchmove,this.onTouchMove);addEventListener(touchcancel,this.onTouchEnd);addEventListener(touchend,this.onTouchEnd);this.update(e);this.emit('started');},onTouchMove(e){debug('touch move');e.stopPropagation();e.preventDefault();var fast=(e.timeStamp-this.lastUpdate)<50;if(!fast)this.update(e);},onTouchEnd(e){debug('touch end');e.stopPropagation();e.preventDefault();scheduler.detachDirect(window,touchmove,this.onTouchMove);removeEventListener(touchend,this.onTouchEnd);removeEventListener(touchend,this.onTouchEnd);this.update(e);this.emit('ended');},onClick(e){e.preventDefault();e.stopPropagation();},update(e){debug('update',this.offset);var allItems=this.els.allItems;var pageY=e.changedTouches?e.changedTouches[0].pageY:e.pageY;var y=pageY-this.offset;var index=Math.floor(y/this.itemHeight);index=Math.max(0,Math.min(allItems.length-1,index));if(index===this.selectedIndex)return;this.selectedIndex=index;this.selected=allItems[index];this.lastUpdate=e.timeStamp;this.emit('picked');},getAllItems(){var light=[].slice.call(this.els.content.getDistributedNodes());var shadow=this.els.items;return light.concat(shadow);},emit(name){this.el.dispatchEvent(new CustomEvent(name,{bubbles:false}));},destroy(){this.els.items.forEach(el=>el.remove());this.el.removeEventListener(touchstart,this.onTouchStart);this.el.removeEventListener('click',this.onClick,true);}};module.exports=component.register('gaia-fast-list',GaiaFastListProto);module.exports.Internal=Internal;function normalizeImageSrc(src){if(typeof src=='string')return src;else if(src instanceof Blob)return URL.createObjectURL(src);else throw new Error('invalid image src');}
function Deferred(){this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}});})(typeof define=='function'&&define.amd?define:(function(n,w){return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('GaiaFastList',this));