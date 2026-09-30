;'use strict';function ThumbnailDateGroup(item){if(!item){throw new Error('item should not be null or undefined.');}
this.thumbnails=[];this.groupID=ThumbnailDateGroup.getGroupID(item);this.date=item.date;var wrappedHtmlText=ThumbnailDateGroup.view();var dummyDiv=document.createElement('DIV');dummyDiv.innerHTML=Sanitizer.unwrapSafeHTML(wrappedHtmlText);var domNode=dummyDiv.firstElementChild;if(!domNode){throw new Error('the template is empty');}
this.htmlNode=domNode;this.container=domNode.querySelector('.thumbnail-group-container');this.header=domNode.querySelector('.thumbnail-group-header');this.localize();}
ThumbnailDateGroup.view=function(){return Sanitizer.createSafeHTML`<li role="presentation">
      <div class="thumbnail-group-header" role="heading"
           aria-level="1"></div>
      <ul class="thumbnail-group-container" role="listbox"
          data-l10n-id="videos-list" aria-multiselectable="true"></ul>
    </li>`;};ThumbnailDateGroup.getGroupID=function(item){var dateObj=new Date(item.date);var month=dateObj.getMonth()+1;return'group_'+dateObj.getFullYear()+'-'+
(month<10?'0'+month:month);};ThumbnailDateGroup.compareGroupID=function(id1,id2){return id1>id2?1:(id1<id2?-1:0);};ThumbnailDateGroup.prototype.addItem=function(item){if(!item){return;}
var _this=this;function getInsertPosition(thumbnail){if(_this.thumbnails.length===0||thumbnail.data.date>_this.thumbnails[0].data.date){return 0;}
else if(thumbnail.data.date<_this.thumbnails[_this.thumbnails.length-1].data.date){return _this.thumbnails.length;}
else{return MediaUtils.binarySearch(_this.thumbnails,thumbnail,function(a,b){return b.data.date-a.data.date;});}}
var thumbnail=new ThumbnailItem(item);var insertPosition=getInsertPosition(thumbnail);this.container.insertBefore(thumbnail.htmlNode,this.container.children[insertPosition]);this.thumbnails.splice(insertPosition,0,thumbnail);return thumbnail;};ThumbnailDateGroup.prototype.getCount=function(){return this.thumbnails.length;};ThumbnailDateGroup.prototype.removeItem=function(thumbnail){var idx=this.thumbnails.indexOf(thumbnail);if(idx<0){return;}
this.thumbnails.splice(idx,1);this.container.removeChild(thumbnail.htmlNode);};ThumbnailDateGroup.prototype.localize=function(){var date=new Date(this.date);var formatter=IntlHelper.get('date-group');this.header.textContent=formatter.format(date);this.thumbnails.forEach(function(thumbnail){thumbnail.localize();});};