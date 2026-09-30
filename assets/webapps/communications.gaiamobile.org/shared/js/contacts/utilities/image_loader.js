;;'use strict';if(!window.ImageLoader){var ImageLoader=function ImageLoader(pContainer,pItems){var container,items,itemsSelector,lastScrollTime,scrollLatency=100,scrollTimer,itemHeight,total,imgsLoading=0,loadImage=defaultLoadImage,self=this;init(pContainer,pItems);function init(pContainer,pItems){itemsSelector=pItems;container=document.querySelector(pContainer);attachHandlers();window.addEventListener('image-loader-resume',resuming);window.addEventListener('image-loader-pause',unload);load();}
function resuming(){window.clearTimeout(scrollTimer);attachHandlers();update();}
function onUpdate(evt){evt.stopPropagation();onScroll();}
function load(){window.clearTimeout(scrollTimer);scrollTimer=null;items=container.querySelectorAll(itemsSelector);itemHeight=items[0]?items[0].offsetHeight:1;total=items.length;window.setTimeout(update,0);}
function attachHandlers(){container.addEventListener('scroll',onScroll);document.addEventListener('onupdate',onUpdate);}
function unload(){container.removeEventListener('scroll',onScroll);document.removeEventListener('onupdate',onUpdate);window.clearTimeout(scrollTimer);scrollTimer=null;}
function setResolver(pResolver){loadImage=pResolver;}
function onScroll(){if(imgsLoading>0){window.stop();imgsLoading=0;}
lastScrollTime=Date.now();if(!scrollTimer){scrollTimer=window.setTimeout(updateFromScroll,scrollLatency);}}
function updateFromScroll(){scrollTimer=null;var deltaLatency=lastScrollTime-Date.now()+scrollLatency;if(deltaLatency>0){scrollTimer=window.setTimeout(updateFromScroll,deltaLatency);}else{update();}}
function defaultLoadImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('img[data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='true';}
return;}}
++imgsLoading;var tmp=new Image();var src=tmp.src=image.dataset.src;tmp.onload=function onload(){--imgsLoading;image.style.backgroundImage='url('+src+')';if(tmp.complete){item.dataset.visited='true';}
tmp=null;};tmp.onabort=tmp.onerror=function onerror(){--imgsLoading;item.dataset.visited='false';tmp=null;};}
function update(){if(total===0){return;}
var viewTop=container.scrollTop;var index=Math.floor(viewTop/itemHeight);var containerHeight=container.offsetHeight;for(var i=index;i>=0;i--){var item=items[i];if(item){if(item.offsetTop+itemHeight<viewTop){break;}
if(item.dataset.visited!=='true'&&item.offsetTop<=viewTop+containerHeight){loadImage(item,self);}}}
for(var j=index+1;j<total;j++){var theItem=items[j];if(!theItem){return;}
if(theItem.offsetTop>viewTop+containerHeight){return;}
if(theItem.dataset.visited!=='true'){loadImage(theItem,self);}}}
function releaseImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='false';}
return null;}
image.style.backgroundImage='none';item.dataset.visited='false';return image;}
function destroy(){unload();window.removeEventListener('image-loader-pause',unload);window.removeEventListener('image-loader-resume',resuming);container=items=itemsSelector=lastScrollTime=scrollLatency=null;scrollTimer=itemHeight=total=imgsLoading=loadImage=null;}
this.reload=load;this.unload=unload;this.setResolver=setResolver;this.defaultLoad=defaultLoadImage;this.releaseImage=releaseImage;this.destroy=destroy;};}