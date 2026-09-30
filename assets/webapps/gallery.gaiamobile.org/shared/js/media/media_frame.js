;'use strict';function MediaFrame(container,includeVideo,maxImageSize){this.clear();if(typeof container==='string'){container=document.getElementById(container);}
this.container=container;this.maximumImageSize=maxImageSize||0;this.image=new Image();this.image.className='image-view';this.image.style.opacity=0;this.image.onload=function(){this.style.opacity=1;};this.image.style.transformOrigin='center center';this.image.style.backgroundImage='none';this.image.style.backgroundSize='contain';this.image.style.backgroundRepeat='no-repeat';this.image.style.backgroundColor='#222';this.container.appendChild(this.image);if(includeVideo!==false){this.video=new VideoPlayer(container);this.video.hide();}
container.classList.add('media-frame-container');MediaFrame.instancesToLocalize.set(container,this);}
MediaFrame.instancesToLocalize=new WeakMap();function localize(){for(var container of document.querySelectorAll('.media-frame-container')){var instance=MediaFrame.instancesToLocalize.get(container);if(instance){instance.localize();}}}
document.addEventListener('DOMRetranslated',localize);MediaFrame.computeMaxImageDecodeSize=function(mem){if(!mem){return 0;}
else if(mem<256){return 2*1024*1024;}
else if(mem<512){var screensize=screen.width*window.devicePixelRatio*screen.height*window.devicePixelRatio;if(mem<325&&screensize>480*800){return 2.5*1024*1024;}
return 3*1024*1024;}
else if(mem<1024){return 5*1024*1024;}
else{return(mem/1024)*10*1024*1024;}};if(navigator.getFeature){MediaFrame.pendingPromise=navigator.getFeature('hardware.memory');MediaFrame.pendingPromise.then(function resolve(mem){delete MediaFrame.pendingPromise;MediaFrame.maxImageDecodeSize=MediaFrame.computeMaxImageDecodeSize(mem);},function reject(err){delete MediaFrame.pendingPromise;MediaFrame.maxImageDecodeSize=0;});}
MediaFrame.prototype.displayImage=function displayImage(blob,width,height,preview,rotation,mirrored)
{var self=this;if(MediaFrame.pendingPromise){MediaFrame.pendingPromise.then(function resolve(){self.displayImage(blob,width,height,preview,rotation,mirrored);});return;}
this.clear();this.imageblob=blob;this.fullSampleSize=computeFullSampleSize(blob,width,height);this.fullsizeWidth=this.fullSampleSize.scale(width);this.fullsizeHeight=this.fullSampleSize.scale(height);this.tinyPreviewURL=null;this.imageurl=URL.createObjectURL(blob);this.fullImageURL=this.imageurl+this.fullSampleSize;this.rotation=rotation||0;this.mirrored=mirrored||false;this.displayingImage=true;this.localize();function isValidPreview(preview){if(!preview){return false;}
if(!preview.width||!preview.height){return false;}
if(!preview.start&&!preview.filename){return false;}
if(Math.abs(width/height-preview.width/preview.height)>0.01){return false;}
return true;}
function isBigEnoughPreview(preview){if(!preview){return false;}
if(self.minimumPreviewWidth&&self.minimumPreviewHeight){return Math.max(preview.width,preview.height)>=Math.max(self.minimumPreviewWidth,self.minimumPreviewHeight)&&Math.min(preview.width,preview.height)>=Math.min(self.minimumPreviewWidth,self.minimumPreviewHeight);}
var screenWidth=window.innerWidth*window.devicePixelRatio;var screenHeight=window.innerHeight*window.devicePixelRatio;return((preview.width>=screenWidth||preview.height>=screenHeight)&&(preview.width>=screenHeight||preview.height>=screenWidth));}
var isValid=isValidPreview(preview);var isBigEnough=isBigEnoughPreview(preview);if(isValid&&isBigEnough){if(preview.start){gotPreview(blob.slice(preview.start,preview.end,'image/jpeg'),preview.width,preview.height);}
else{var storage=navigator.getDeviceStorage('pictures');var getreq=storage.get(preview.filename);getreq.onsuccess=function(){gotPreview(getreq.result,preview.width,preview.height);};getreq.onerror=function(){noPreview();};}}
else if(isValid){this.tinyPreviewURL=URL.createObjectURL(blob.slice(preview.start,preview.end,'image/jpeg'));noPreview(this.tinyPreviewURL);}
else{noPreview();}
function gotPreview(previewblob,previewWidth,previewHeight){self.previewurl=URL.createObjectURL(previewblob);self.previewImageURL=self.previewurl;self.previewWidth=previewWidth;self.previewHeight=previewHeight;self.displayingPreview=true;self._displayImage(self.previewImageURL,self.previewWidth,self.previewHeight);}
function noPreview(bgURL){self.previewurl=null;var previewSampleSize=computePreviewSampleSize(blob,width,height);if(previewSampleSize!==Downsample.NONE){self.previewImageURL=self.imageurl+previewSampleSize;self.previewWidth=previewSampleSize.scale(width);self.previewHeight=previewSampleSize.scale(height);self.displayingPreview=true;self._displayImage(self.previewImageURL,self.previewWidth,self.previewHeight,bgURL);}
else{self.previewImageURL=null;self.displayingPreview=false;self._displayImage(self.fullImageURL,self.fullsizeWidth,self.fullsizeHeight);}}
function computeFullSampleSize(blob,width,height){if(blob.type!=='image/jpeg'){return Downsample.NONE;}
var max=MediaFrame.maxImageDecodeSize||0;if(self.maximumImageSize&&(max===0||self.maximumImageSize<max)){max=self.maximumImageSize;}
if(!max||width*height<=max){return Downsample.NONE;}
return Downsample.areaAtLeast(max/(width*height));}
function computePreviewSampleSize(blob,width,height){if(blob.type!=='image/jpeg'){return Downsample.NONE;}
var screenWidth=window.innerWidth*window.devicePixelRatio;var screenHeight=window.innerHeight*window.devicePixelRatio;var portraitScale=Math.min(screenWidth/width,screenHeight/height);var landscapeScale=Math.min(screenHeight/width,screenWidth/height);var scale=Math.max(portraitScale,landscapeScale);return Downsample.sizeNoMoreThan(scale);}};MediaFrame.prototype._displayImage=function(url,width,height,bg){this.image.style.width=width+'px';this.image.style.height=height+'px';if(bg){this.image.style.backgroundImage='url('+bg+')';requestAnimationFrame(()=>{this.image.src=url;});}
else{this.image.style.backgroundImage='none';this.image.src=url;}
if(this.rotation===0||this.rotation===180){this.itemWidth=width;this.itemHeight=height;}else{this.itemWidth=height;this.itemHeight=width;}
this.computeFit();this.setPosition();var temp=this.image.clientLeft;};MediaFrame.prototype.localize=function localize(){if(!this.displayingImage){return;}
var portrait=this.fullsizeWidth<this.fullsizeHeight;if(this.rotation==90||this.rotation==270){portrait=!portrait;}
var timestamp=this.imageblob.lastModifiedDate;var orientationL10nId=portrait?'orientationPortrait':'orientationLandscape';document.l10n.formatValue(orientationL10nId).then((orientationText)=>{if(timestamp){if(!this.dtf){this.dtf=Intl.DateTimeFormat(navigator.languages,{hour12:navigator.mozHour12,hour:'numeric',minute:'numeric',day:'numeric',month:'numeric',year:'numeric'});}
var ts=this.dtf.format(new Date(timestamp));document.l10n.setAttributes(this.image,'imageDescription',{orientation:orientationText,timestamp:ts});}else{document.l10n.setAttributes(this.image,'imageDescriptionNoTimestamp',{orientation:orientationText});}});};MediaFrame.prototype._switchToFullSizeImage=function _switchToFull(){if(!this.displayingImage||!this.displayingPreview){return;}
this.displayingPreview=false;this._displayImage(this.fullImageURL,this.fullsizeWidth,this.fullsizeHeight,this.previewImageURL);};MediaFrame.prototype._switchToPreviewImage=function _switchToPreview(){if(!this.displayingImage||this.displayingPreview||!this.previewImageURL){return;}
this.displayingPreview=true;this._displayImage(this.previewImageURL,this.previewWidth,this.previewHeight);};MediaFrame.prototype.displayVideo=function displayVideo(videoblob,posterblob,aspectRatio,rotation)
{if(!this.video){return;}
this.clear();this.displayingVideo=true;this.videoblob=videoblob;this.posterblob=posterblob;this.videourl=URL.createObjectURL(videoblob);this.posterurl=URL.createObjectURL(posterblob);this.video.load(this.videourl,this.posterurl,aspectRatio,rotation||0,videoblob.lastModifiedDate);this.video.show();};MediaFrame.prototype.clear=function clear(){this.displayingImage=false;this.displayingPreview=false;this.displayingVideo=false;this.itemWidth=this.itemHeight=null;this.imageblob=null;this.videoblob=null;this.posterblob=null;this.fullSampleSize=null;this.fullImageURL=null;this.previewImageURL=null;this.fullsizeWidth=this.fullsizeHeight=null;this.previewWidth=this.previewHeight=null;this.fit=null;if(this.imageurl){URL.revokeObjectURL(this.imageurl);}
this.imageurl=null;if(this.previewurl){URL.revokeObjectURL(this.previewurl);}
this.previewurl=null;if(this.tinyPreviewURL){URL.revokeObjectURL(this.tinyPreviewURL);}
this.tinyPreviewURL=null;if(this.image){this.image.style.opacity=0;this.image.style.backgroundImage='none';this.image.src='';this.image.removeAttribute('aria-label');}
if(this.video){this.video.reset();this.video.hide();if(this.videourl){URL.revokeObjectURL(this.videourl);}
this.videourl=null;if(this.posterurl){URL.revokeObjectURL(this.posterurl);}
this.posterurl=null;}};MediaFrame.prototype.setPosition=function setPosition(){if(!this.fit||!this.displayingImage){return;}
var dx=this.fit.left,dy=this.fit.top;switch(this.rotation){case 0:case 180:dx+=(this.fit.width-this.itemWidth)/2;dy+=(this.fit.height-this.itemHeight)/2;break;case 90:case 270:dx+=(this.fit.width-this.itemHeight)/2;dy+=(this.fit.height-this.itemWidth)/2;break;}
var sx=this.mirrored?-this.fit.scale:this.fit.scale;var sy=this.fit.scale;var transform='translate('+dx+'px, '+dy+'px) '+'scale('+sx+','+sy+')'+'rotate('+this.rotation+'deg) ';this.image.style.transform=transform;};MediaFrame.prototype.computeFit=function computeFit(){if(!this.displayingImage){return;}
this.viewportWidth=this.container.offsetWidth;this.viewportHeight=this.container.offsetHeight;var scalex=this.viewportWidth/this.itemWidth;var scaley=this.viewportHeight/this.itemHeight;var scale=Math.min(Math.min(scalex,scaley),1);var width=Math.floor(this.itemWidth*scale);var height=Math.floor(this.itemHeight*scale);this.fit={width:width,height:height,left:Math.floor((this.viewportWidth-width)/2),top:Math.floor((this.viewportHeight-height)/2),scale:scale,baseScale:scale};};MediaFrame.prototype.reset=function reset(){if(this.displayingImage&&!this.displayingPreview&&this.previewImageURL){this._switchToPreviewImage();return;}
this.computeFit();this.setPosition();if(this.displayingVideo){this.video.setPlayerSize();}};MediaFrame.prototype.resize=function resize(){var oldWidth=this.viewportWidth;var oldHeight=this.viewportHeight;var newWidth=this.container.offsetWidth;var newHeight=this.container.offsetHeight;var oldfit=this.fit;if(!oldfit){return;}
this.computeFit();var newfit=this.fit;if(Math.abs(oldfit.scale-oldfit.baseScale)<0.01||newfit.baseScale>oldfit.scale){this.reset();return;}
oldfit.left+=(newWidth-oldWidth)/2;oldfit.top+=(newHeight-oldHeight)/2;oldfit.baseScale=newfit.baseScale;this.fit=oldfit;this.setPosition();};MediaFrame.prototype.zoom=function zoom(scale,fixedX,fixedY,time){if(!this.displayingImage){return;}
if(this.displayingPreview){this._switchToFullSizeImage();}
if(this.fit.scale*scale>1){scale=1/(this.fit.scale);}
else if(this.fit.scale*scale<this.fit.baseScale){scale=this.fit.baseScale/this.fit.scale;}
this.fit.scale=this.fit.scale*scale;this.fit.width=Math.floor(this.itemWidth*this.fit.scale);this.fit.height=Math.floor(this.itemHeight*this.fit.scale);var photoX=fixedX-this.fit.left;var photoY=fixedY-this.fit.top;photoX=Math.floor(photoX*scale);photoY=Math.floor(photoY*scale);this.fit.left=fixedX-photoX;this.fit.top=fixedY-photoY;if(this.fit.width<=this.viewportWidth){this.fit.left=(this.viewportWidth-this.fit.width)/2;}
else{if(this.fit.left>0){this.fit.left=0;}
if(this.fit.left+this.fit.width<this.viewportWidth){this.fit.left=this.viewportWidth-this.fit.width;}}
if(this.fit.height<=this.viewportHeight){this.fit.top=(this.viewportHeight-this.fit.height)/2;}
else{if(this.fit.top>0){this.fit.top=0;}
if(this.fit.top+this.fit.height<this.viewportHeight){this.fit.top=this.viewportHeight-this.fit.height;}}
if(time){var transition='transform '+time+'ms ease';this.image.style.transition=transition;var self=this;this.image.addEventListener('transitionend',function done(){self.image.removeEventListener('transitionend',done);self.image.style.transition='';});}
this.setPosition();};MediaFrame.prototype.pan=function(dx,dy){if(!this.displayingImage){return dx;}
if(this.fit.height>this.viewportHeight){this.fit.top+=dy;if(this.fit.top>0){this.fit.top=0;}
if(this.fit.top+this.fit.height<this.viewportHeight){this.fit.top=this.viewportHeight-this.fit.height;}}
var extra=0;if(this.fit.width<=this.viewportWidth){extra=dx;}
else{this.fit.left+=dx;if(this.fit.left>0){extra=this.fit.left;this.fit.left=0;}
if(this.fit.left+this.fit.width<this.viewportWidth){extra=this.fit.left+this.fit.width-this.viewportWidth;this.fit.left=this.viewportWidth-this.fit.width;}}
this.setPosition();return extra;};MediaFrame.prototype.setMinimumPreviewSize=function(w,h){this.minimumPreviewWidth=w;this.minimumPreviewHeight=h;};