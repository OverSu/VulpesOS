;'use strict';function ThumbnailItem(videoData){if(!videoData){throw new Error('videoData should not be null or undefined.');}
this.posterNode=null;this.unwatchedNode=null;this.detailNode=null;this.titleNode=null;this.htmlNode=null;this.tapListeners=[];this.data=videoData;var _this=this;render();function convertToDOM(wrappedHTML){var dummyDiv=document.createElement('div');dummyDiv.innerHTML=Sanitizer.unwrapSafeHTML(wrappedHTML);var domNode=dummyDiv.firstElementChild;if(!domNode){throw new Error('the template does not contain any element');}
_this.htmlNode=domNode;_this.posterNode=domNode.querySelector('.img');_this.detailNode=domNode.querySelector('.details');_this.titleNode=domNode.querySelector('.title');_this.unwatchedNode=domNode.querySelector('.unwatched');_this.sizeNode=domNode.querySelector('.size-text');}
function render(){var duration='';if(isFinite(_this.data.metadata.duration)){duration=MediaUtils.formatDuration(_this.data.metadata.duration);}
var videoType='';if(_this.data.type){var pos=_this.data.type.indexOf('/');videoType=(pos>-1?_this.data.type.slice(pos+1):_this.data.type);}
var wrappedHtmlText=ThumbnailItem.view({'title':_this.data.metadata.title,'durationText':duration,'typeText':videoType});convertToDOM(wrappedHtmlText);_this.updatePoster(_this.data.metadata.bookmark||_this.data.metadata.poster);_this.setWatched(_this.data.metadata.watched);if(_this.detailNode){_this.detailNode.dataset.title=_this.data.metadata.title;}
_this.htmlNode.addEventListener('click',dispatchClick);_this.localize();}
function dispatchClick(){_this.tapListeners.forEach(function(listener){if(listener.handleEvent){listener.handleEvent(_this.data);}else if((typeof listener)==='function'){listener(_this.data);}});}}
ThumbnailItem.titleMaxLines=2;ThumbnailItem.view=function({title,durationText,typeText}){return Sanitizer.createSafeHTML`<li class="thumbnail" role="option">
      <div class="inner">
        <div class="unwatched"></div>
        <img class="img" role="presentation"></img>
        <div class="details">
          <span class="title">${title}</span>
          <span class="duration-text after line-break">${durationText}</span>
          <span class="size-type-group">
            <span class="size-text after"></span>
            <span class="type-text after">${typeText}</span>
          </span>
        </div>
      </div>
    </li>`;};ThumbnailItem.prototype.addTapListener=function(listener){if(!listener){return;}
this.tapListeners[this.tapListeners.length]=listener;};ThumbnailItem.prototype.removeTapListener=function(listener){if(!listener){return;}
var idx=this.tapListeners.indexOf(listener);if(idx>-1){this.tapListeners.splice(idx,1);}};ThumbnailItem.prototype.setWatched=function(watched){if(!this.unwatchedNode){return;}
this.unwatchedNode.hidden=watched;};ThumbnailItem.prototype.updatePoster=function(imageblob){if(!this.posterNode){return;}
if(this.posterNode.dataset.uri){URL.revokeObjectURL(this.posterNode.dataset.uri);}
if(imageblob){this.posterNode.classList.remove('default');var imageUri=URL.createObjectURL(imageblob);this.posterNode.dataset.uri=imageUri;this.posterNode.src=imageUri;}else{this.posterNode.classList.add('default');this.posterNode.dataset.uri='';this.posterNode.src='style/images/default_thumbnail.png';}};ThumbnailItem.prototype.updateTitleText=function(){this.titleNode.textContent=VideoUtils.getTruncated(this.data.metadata.title,{node:this.titleNode,maxLine:ThumbnailItem.titleMaxLines});};ThumbnailItem.prototype.localize=function(){if(this.sizeNode&&isFinite(this.data.size)){MediaUtils.getLocalizedSizeTokens(this.data.size).then((args)=>{document.l10n.setAttributes(this.sizeNode,'fileSize',args);});}};