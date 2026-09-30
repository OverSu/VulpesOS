;'use strict';var GestureDetector=(function(){function GD(e,options){this.element=e;this.options=options||{};this.options.panThreshold=this.options.panThreshold||GD.PAN_THRESHOLD;this.state=initialState;this.timers={};}
GD.prototype.startDetecting=function(){var self=this;eventtypes.forEach(function(t){self.element.addEventListener(t,self);});};GD.prototype.stopDetecting=function(){var self=this;eventtypes.forEach(function(t){self.element.removeEventListener(t,self);});};GD.prototype.handleEvent=function(e){var handler=this.state[e.type];if(!handler){return;}
if(e.changedTouches){for(var i=0;i<e.changedTouches.length;i++){handler(this,e,e.changedTouches[i]);handler=this.state[e.type];if(!handler){return;}}}
else{handler(this,e);}};GD.prototype.startTimer=function(type,time){this.clearTimer(type);var self=this;this.timers[type]=setTimeout(function(){self.timers[type]=null;var handler=self.state[type];if(handler){handler(self,type);}},time);};GD.prototype.clearTimer=function(type){if(this.timers[type]){clearTimeout(this.timers[type]);this.timers[type]=null;}};GD.prototype.switchTo=function(state,event,touch){this.state=state;if(state.init){state.init(this,event,touch);}};GD.prototype.emitEvent=function(type,detail){if(!this.target){console.error('Attempt to emit event with no target');return;}
var event=this.element.ownerDocument.createEvent('CustomEvent');event.initCustomEvent(type,true,true,detail);this.target.dispatchEvent(event);};GD.HOLD_INTERVAL=1000;GD.PAN_THRESHOLD=20;GD.DOUBLE_TAP_DISTANCE=50;GD.DOUBLE_TAP_TIME=500;GD.VELOCITY_SMOOTHING=0.5;GD.SCALE_THRESHOLD=20;GD.ROTATE_THRESHOLD=22.5;GD.THRESHOLD_SMOOTHING=0.9;var abs=Math.abs,floor=Math.floor,sqrt=Math.sqrt,atan2=Math.atan2;var PI=Math.PI;var eventtypes=['touchstart','touchmove','touchend'];function eventTime(e){var ts=e.timeStamp;if(ts>2*Date.now()){return Math.floor(ts/1000);}else{return ts;}}
function coordinates(e,t){return Object.freeze({screenX:t.screenX,screenY:t.screenY,clientX:t.clientX,clientY:t.clientY,timeStamp:eventTime(e)});}
function midpoints(e,t1,t2){return Object.freeze({screenX:floor((t1.screenX+t2.screenX)/2),screenY:floor((t1.screenY+t2.screenY)/2),clientX:floor((t1.clientX+t2.clientX)/2),clientY:floor((t1.clientY+t2.clientY)/2),timeStamp:eventTime(e)});}
function between(c1,c2){var r=GD.THRESHOLD_SMOOTHING;return Object.freeze({screenX:floor(c1.screenX+r*(c2.screenX-c1.screenX)),screenY:floor(c1.screenY+r*(c2.screenY-c1.screenY)),clientX:floor(c1.clientX+r*(c2.clientX-c1.clientX)),clientY:floor(c1.clientY+r*(c2.clientY-c1.clientY)),timeStamp:floor(c1.timeStamp+r*(c2.timeStamp-c1.timeStamp))});}
function touchDistance(t1,t2){var dx=t2.screenX-t1.screenX;var dy=t2.screenY-t1.screenY;return sqrt(dx*dx+dy*dy);}
function touchDirection(t1,t2){return atan2(t2.screenY-t1.screenY,t2.screenX-t1.screenX)*180/PI;}
function touchRotation(d1,d2){var angle=d2-d1;if(angle>180){angle-=360;}else if(angle<=-180){angle+=360;}
return angle;}
function isDoubleTap(lastTap,thisTap){var dx=abs(thisTap.screenX-lastTap.screenX);var dy=abs(thisTap.screenY-lastTap.screenY);var dt=thisTap.timeStamp-lastTap.timeStamp;return(dx<GD.DOUBLE_TAP_DISTANCE&&dy<GD.DOUBLE_TAP_DISTANCE&&dt<GD.DOUBLE_TAP_TIME);}
var initialState={name:'initialState',init:function(d,e,t){d.target=null;d.start=d.last=null;d.touch1=d.touch2=null;d.vx=d.vy=null;d.startDistance=d.lastDistance=null;d.startDirection=d.lastDirection=null;d.lastMidpoint=null;d.scaled=d.rotated=null;if(e&&t&&e.type==='touchstart'){initialState.touchstart(d,e,t);}},touchstart:function(d,e,t){d.switchTo(touchStartedState,e,t);}};var touchStartedState={name:'touchStartedState',init:function(d,e,t){d.target=e.target;d.touch1=t.identifier;d.start=d.last=coordinates(e,t);if(d.options.holdEvents){d.startTimer('holdtimeout',GD.HOLD_INTERVAL);}},touchstart:function(d,e,t){d.clearTimer('holdtimeout');if(e.touches.length>1){d.switchTo(transformState,e,t);}
else{console.warn('Ignoring missing touchend event. See bug 1162771.');d.switchTo(initialState,e,t);}},touchmove:function(d,e,t){if(t.identifier!==d.touch1){return;}
if(abs(t.screenX-d.start.screenX)>d.options.panThreshold||abs(t.screenY-d.start.screenY)>d.options.panThreshold){d.clearTimer('holdtimeout');d.switchTo(panStartedState,e,t);}},touchend:function(d,e,t){if(t.identifier!==d.touch1){return;}
if(d.lastTap&&isDoubleTap(d.lastTap,d.start)){d.emitEvent('tap',d.start);d.emitEvent('dbltap',d.start);d.lastTap=null;}
else{d.emitEvent('tap',d.start);d.lastTap=coordinates(e,t);}
d.clearTimer('holdtimeout');d.switchTo(initialState);},holdtimeout:function(d){d.switchTo(holdState);}};var panStartedState={name:'panStartedState',init:function(d,e,t){d.start=d.last=between(d.start,coordinates(e,t));if(e.type==='touchmove'){panStartedState.touchmove(d,e,t);}},touchmove:function(d,e,t){if(t.identifier!==d.touch1){return;}
var current=coordinates(e,t);d.emitEvent('pan',{absolute:{dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY},relative:{dx:current.screenX-d.last.screenX,dy:current.screenY-d.last.screenY},position:current});var dt=current.timeStamp-d.last.timeStamp;var vx=(current.screenX-d.last.screenX)/dt;var vy=(current.screenY-d.last.screenY)/dt;if(d.vx==null){d.vx=vx;d.vy=vy;}
else{d.vx=d.vx*GD.VELOCITY_SMOOTHING+
vx*(1-GD.VELOCITY_SMOOTHING);d.vy=d.vy*GD.VELOCITY_SMOOTHING+
vy*(1-GD.VELOCITY_SMOOTHING);}
d.last=current;},touchend:function(d,e,t){if(t.identifier!==d.touch1){return;}
var current=coordinates(e,t);var dx=current.screenX-d.start.screenX;var dy=current.screenY-d.start.screenY;var angle=atan2(dy,dx)*180/PI;if(angle<0){angle+=360;}
var direction;if(angle>=315||angle<45){direction='right';}else if(angle>=45&&angle<135){direction='down';}else if(angle>=135&&angle<225){direction='left';}else if(angle>=225&&angle<315){direction='up';}
d.emitEvent('swipe',{start:d.start,end:current,dx:dx,dy:dy,dt:e.timeStamp-d.start.timeStamp,vx:d.vx,vy:d.vy,direction:direction,angle:angle});d.switchTo(initialState);}};var holdState={name:'holdState',init:function(d){d.emitEvent('holdstart',d.start);},touchmove:function(d,e,t){var current=coordinates(e,t);d.emitEvent('holdmove',{absolute:{dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY},relative:{dx:current.screenX-d.last.screenX,dy:current.screenY-d.last.screenY},position:current});d.last=current;},touchend:function(d,e,t){var current=coordinates(e,t);d.emitEvent('holdend',{start:d.start,end:current,dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY});d.switchTo(initialState);}};var transformState={name:'transformState',init:function(d,e,t){d.touch2=t.identifier;var t1=e.touches.identifiedTouch(d.touch1);var t2=e.touches.identifiedTouch(d.touch2);d.startDistance=d.lastDistance=touchDistance(t1,t2);d.startDirection=d.lastDirection=touchDirection(t1,t2);d.scaled=d.rotated=false;},touchmove:function(d,e,t){if(t.identifier!==d.touch1&&t.identifier!==d.touch2){return;}
var t1=e.touches.identifiedTouch(d.touch1);var t2=e.touches.identifiedTouch(d.touch2);var midpoint=midpoints(e,t1,t2);var distance=touchDistance(t1,t2);var direction=touchDirection(t1,t2);var rotation=touchRotation(d.startDirection,direction);if(!d.scaled){if(abs(distance-d.startDistance)>GD.SCALE_THRESHOLD){d.scaled=true;d.startDistance=d.lastDistance=floor(d.startDistance+
GD.THRESHOLD_SMOOTHING*(distance-d.startDistance));}else{distance=d.startDistance;}}
if(!d.rotated){if(abs(rotation)>GD.ROTATE_THRESHOLD){d.rotated=true;}else{direction=d.startDirection;}}
if(d.scaled||d.rotated){d.emitEvent('transform',{absolute:{scale:distance/d.startDistance,rotate:touchRotation(d.startDirection,direction)},relative:{scale:distance/d.lastDistance,rotate:touchRotation(d.lastDirection,direction)},midpoint:midpoint});d.lastDistance=distance;d.lastDirection=direction;d.lastMidpoint=midpoint;}},touchend:function(d,e,t){if(t.identifier===d.touch2){d.touch2=null;}else if(t.identifier===d.touch1){d.touch1=d.touch2;d.touch2=null;}else{return;}
if(d.scaled||d.rotated){d.emitEvent('transformend',{absolute:{scale:d.lastDistance/d.startDistance,rotate:touchRotation(d.startDirection,d.lastDirection)},relative:{scale:1,rotate:0},midpoint:d.lastMidpoint});}
d.switchTo(afterTransformState);}};var afterTransformState={name:'afterTransformState',touchstart:function(d,e,t){d.switchTo(transformState,e,t);},touchend:function(d,e,t){if(t.identifier===d.touch1){d.switchTo(initialState);}}};return GD;}());;(function(exports){'use strict';function round(x){return Math.round(x*100)/100;}
function MozSampleSize(n,scale){return Object.freeze({dimensionScale:round(scale),areaScale:round(scale*scale),toString:function(){return'#-moz-samplesize='+n;},scale:function(x){return Math.ceil(x*scale);}});}
var NONE=Object.freeze({dimensionScale:1,areaScale:1,toString:function(){return'';},scale:function(x){return x;}});var fragments=[NONE,MozSampleSize(2,1/2),MozSampleSize(3,3/8),MozSampleSize(4,1/4),MozSampleSize(8,1/8)];function sizeAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.dimensionScale<=scale){return f;}}
return fragments[fragments.length-1];}
function sizeNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.dimensionScale>=scale){return f;}}
return NONE;}
function areaAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.areaScale<=scale){return f;}}
return fragments[fragments.length-1];}
function areaNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.areaScale>=scale){return f;}}
return NONE;}
exports.Downsample={sizeAtLeast:sizeAtLeast,sizeNoMoreThan:sizeNoMoreThan,areaAtLeast:areaAtLeast,areaNoMoreThan:areaNoMoreThan,NONE:NONE,MAX_SIZE_REDUCTION:1/fragments[fragments.length-1].dimensionScale,MAX_AREA_REDUCTION:1/fragments[fragments.length-1].areaScale};}(window));;'use strict';function MediaFrame(container,includeVideo,maxImageSize){this.clear();if(typeof container==='string'){container=document.getElementById(container);}
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
this.setPosition();return extra;};MediaFrame.prototype.setMinimumPreviewSize=function(w,h){this.minimumPreviewWidth=w;this.minimumPreviewHeight=h;};;'use strict';var BlobView=(function(){function fail(msg){throw Error(msg);}
var decoderCache={};function getDecoder(encoding){if(encoding in decoderCache){return decoderCache[encoding];}
var decoder=decoderCache[encoding]=new TextDecoder(encoding);return decoder;}
function BlobView(blob,sliceOffset,sliceLength,slice,viewOffset,viewLength,littleEndian)
{this.blob=blob;this.sliceOffset=sliceOffset;this.sliceLength=sliceLength;this.slice=slice;this.viewOffset=viewOffset;this.viewLength=viewLength;this.littleEndian=littleEndian;this.view=new DataView(slice,viewOffset,viewLength);this.buffer=slice;this.byteLength=viewLength;this.byteOffset=viewOffset;this.index=0;}
BlobView.get=function(blob,offset,length,callback,littleEndian){if(offset<0){fail('negative offset');}
if(length<0){fail('negative length');}
if(offset>blob.size){fail('offset larger than blob size');}
if(offset+length>blob.size){length=blob.size-offset;}
var slice=blob.slice(offset,offset+length);var reader=new FileReader();reader.readAsArrayBuffer(slice);reader.onloadend=function(){var result=null;if(reader.result){result=new BlobView(blob,offset,length,reader.result,0,length,littleEndian||false);}
callback(result,reader.error);};};BlobView.getFromArrayBuffer=function(buffer,offset,length,littleEndian){return new BlobView(null,offset,length,buffer,offset,length,littleEndian);};BlobView.prototype={constructor:BlobView,getMore:function(offset,length,callback){if(!this.blob){fail('no blob backing this BlobView');}
if(offset>=this.sliceOffset&&offset+length<=this.sliceOffset+this.sliceLength){callback(new BlobView(this.blob,this.sliceOffset,this.sliceLength,this.slice,offset-this.sliceOffset,length,this.littleEndian));}
else{BlobView.get(this.blob,offset,length,callback,this.littleEndian);}},littleEndian:function(){this.littleEndian=true;},bigEndian:function(){this.littleEndian=false;},getUint8:function(offset){return this.view.getUint8(offset);},getInt8:function(offset){return this.view.getInt8(offset);},getUint16:function(offset,le){return this.view.getUint16(offset,le!==undefined?le:this.littleEndian);},getInt16:function(offset,le){return this.view.getInt16(offset,le!==undefined?le:this.littleEndian);},getUint32:function(offset,le){return this.view.getUint32(offset,le!==undefined?le:this.littleEndian);},getInt32:function(offset,le){return this.view.getInt32(offset,le!==undefined?le:this.littleEndian);},getFloat32:function(offset,le){return this.view.getFloat32(offset,le!==undefined?le:this.littleEndian);},getFloat64:function(offset,le){return this.view.getFloat64(offset,le!==undefined?le:this.littleEndian);},readByte:function(){return this.view.getInt8(this.index++);},readUnsignedByte:function(){return this.view.getUint8(this.index++);},readShort:function(le){var val=this.view.getInt16(this.index,le!==undefined?le:this.littleEndian);this.index+=2;return val;},readUnsignedShort:function(le){var val=this.view.getUint16(this.index,le!==undefined?le:this.littleEndian);this.index+=2;return val;},readInt:function(le){var val=this.view.getInt32(this.index,le!==undefined?le:this.littleEndian);this.index+=4;return val;},readUnsignedInt:function(le){var val=this.view.getUint32(this.index,le!==undefined?le:this.littleEndian);this.index+=4;return val;},readFloat:function(le){var val=this.view.getFloat32(this.index,le!==undefined?le:this.littleEndian);this.index+=4;return val;},readDouble:function(le){var val=this.view.getFloat64(this.index,le!==undefined?le:this.littleEndian);this.index+=8;return val;},tell:function(){return this.index;},remaining:function(){return this.byteLength-this.index;},seek:function(index){if(index<0){fail('negative index');}
if(index>this.byteLength){fail('index greater than buffer size');}
this.index=index;},advance:function(n){var index=this.index+n;if(index<0){fail('advance past beginning of buffer');}
if(index>this.byteLength){fail('advance past end of buffer');}
this.index=index;},getUnsignedByteArray:function(offset,n){return new Uint8Array(this.buffer,offset+this.viewOffset,n);},readUnsignedByteArray:function(n){var val=new Uint8Array(this.buffer,this.index+this.viewOffset,n);this.index+=n;return val;},getBit:function(offset,bit){var byte=this.view.getUint8(offset);return(byte&(1<<bit))!==0;},getUint24:function(offset,le){var b1,b2,b3;if(le!==undefined?le:this.littleEndian){b1=this.view.getUint8(offset);b2=this.view.getUint8(offset+1);b3=this.view.getUint8(offset+2);}
else{b3=this.view.getUint8(offset);b2=this.view.getUint8(offset+1);b1=this.view.getUint8(offset+2);}
return(b3<<16)+(b2<<8)+b1;},readUint24:function(le){var value=this.getUint24(this.index,le);this.index+=3;return value;},getBinaryText:function(offset,len){var bytes=new Uint8Array(this.buffer,offset+this.viewOffset,len);return String.fromCharCode.apply(String,bytes);},readBinaryText:function(len){var s=this.getBinaryText(this.index,len);this.index+=len;return s;},getLatin1Text:function(offset,len){var bytes=new Uint8Array(this.buffer,offset+this.viewOffset,len);return getDecoder('latin1').decode(bytes);},readLatin1Text:function(len){var s=this.getLatin1Text(this.index,len);this.index+=len;return s;},getUTF8Text:function(offset,len){var bytes=new Uint8Array(this.buffer,offset+this.viewOffset,len);return getDecoder('utf-8').decode(bytes);},readUTF8Text:function(len){var s=this.getUTF8Text(this.index,len);this.index+=len;return s;},getUTF16Text:function(offset,len,le){if(len%2){fail('len must be a multiple of two');}
var bytes=new Uint8Array(this.buffer,offset+this.viewOffset,len);if(le===null||le===undefined){var BOM=(bytes[0]<<8)+bytes[1];if(BOM===0xFEFF){bytes=bytes.subarray(2);le=false;}else if(BOM===0xFFFE){bytes=bytes.subarray(2);le=true;}else{le=true;}}
var encoding=le?'utf-16le':'utf-16be';return getDecoder(encoding).decode(bytes);},readUTF16Text:function(len,le){var s=this.getUTF16Text(this.index,len,le);this.index+=len;return s;},getID3Uint28BE:function(offset){var b1=this.view.getUint8(offset)&0x7f;var b2=this.view.getUint8(offset+1)&0x7f;var b3=this.view.getUint8(offset+2)&0x7f;var b4=this.view.getUint8(offset+3)&0x7f;return(b1<<21)|(b2<<14)|(b3<<7)|b4;},readID3Uint28BE:function(){var value=this.getID3Uint28BE(this.index);this.index+=4;return value;},readNullTerminatedLatin1Text:function(size,advance_by_size=false){var bytes=new Uint8Array(this.buffer,this.viewOffset+this.index,size);var nil=bytes.indexOf(0);if(nil!==-1){bytes=bytes.subarray(0,nil);}
var s=getDecoder('latin1').decode(bytes);if(nil===-1||advance_by_size){this.index+=size;}else{this.index+=nil+1;}
return s;},readNullTerminatedUTF8Text:function(size,advance_by_size=false){var bytes=new Uint8Array(this.buffer,this.viewOffset+this.index,size);var nil=bytes.indexOf(0);if(nil!==-1){bytes=bytes.subarray(0,nil);}
var s=getDecoder('utf-8').decode(bytes);if(nil===-1||advance_by_size){this.index+=size;}else{this.index+=nil+1;}
return s;},readNullTerminatedUTF16Text:function(size,le,advance_by_size=false){if(size%2){fail('size must be a multiple of two');}
for(var len=0;len<size;len+=2){if(this.getUint16(this.index+len,le)===0){break;}}
var s=this.getUTF16Text(this.index,len,le);if(len===size||advance_by_size){this.index+=size;}else{this.index+=len+2;}
return s;}};return{get:BlobView.get,getFromArrayBuffer:BlobView.getFromArrayBuffer};}());;'use strict';var MimeMapper={_typeToExtensionMap:{'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/bmp':'bmp','audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/webm':'webm','audio/3gpp':'3gp','audio/amr':'amr','video/mp4':'mp4','video/mpeg':'mpg','video/ogg':'ogg','video/webm':'webm','video/3gpp':'3gp','video/3gpp2':'3g2','application/pdf':'pdf','application/vcard':'vcf','text/vcard':'vcf','text/x-vcard':'vcf'},_extensionToTypeMap:{'jpg':'image/jpeg','jpeg':'image/jpeg','jpe':'image/jpeg','png':'image/png','gif':'image/gif','bmp':'image/bmp','mp3':'audio/mpeg','m4a':'audio/mp4','m4b':'audio/mp4','m4p':'audio/mp4','m4r':'audio/mp4','aac':'audio/aac','opus':'audio/ogg','amr':'audio/amr','mp4':'video/mp4','mpeg':'video/mpeg','mpg':'video/mpeg','ogv':'video/ogg','ogx':'video/ogg','webm':'video/webm','3gp':'video/3gpp','3g2':'video/3gpp2','ogg':'video/ogg','pdf':'application/pdf','vcf':'text/vcard'},_parseExtension:function(filename){var array=filename.split('.');return array.length>1?array.pop():'';},isSupportedType:function(mimetype){return(mimetype in this._typeToExtensionMap);},isSupportedExtension:function(extension){return(extension in this._extensionToTypeMap);},isFilenameMatchesType:function(filename,mimetype){var extension=this._parseExtension(filename);var guessedType=this.guessTypeFromExtension(extension);return(guessedType==mimetype);},guessExtensionFromType:function(mimetype){return this._typeToExtensionMap[mimetype];},guessTypeFromExtension:function(extension){return this._extensionToTypeMap[extension];},guessTypeFromFileProperties:function(filename,mimetype){var extension=this._parseExtension(filename);var type=this.isSupportedType(mimetype)?mimetype:this.guessTypeFromExtension(extension);return type||'';},ensureFilenameMatchesType:function(filename,mimetype){if(!this.isFilenameMatchesType(filename,mimetype)){var guessedExt=this.guessExtensionFromType(mimetype);if(guessedExt){filename+='.'+guessedExt;}}
return filename;}};;'use strict';function parseJPEGMetadata(file,metadataCallback,metadataError){var metadata={};var TIFFHeaderOffset=0;BlobView.get(file,0,Math.min(16*1024,file.size),function(data){if(data.byteLength<2||data.getUint8(0)!==0xFF||data.getUint8(1)!==0xD8){metadataError('Not a JPEG file');return;}
getSegment(data,2,segmentHandler);});function getSegment(data,offset,callback){try{var header=data.getUint8(offset);if(header!==0xFF){metadataError('Malformed JPEG file: bad segment header');return;}
var type=data.getUint8(offset+1);var size=data.getUint16(offset+2)+2;var start=data.sliceOffset+data.viewOffset+offset;var isLast=(start+size>=file.size);var length=isLast?size:size+4;data.getMore(start,length,function(data){callback(type,size,data,isLast);});}
catch(e){metadataError(e.toString()+'\n'+e.stack);}}
function segmentHandler(type,size,data,isLastSegment){try{switch(type){case 0xC0:case 0xC1:case 0xC2:case 0xC3:metadata.height=data.getUint16(5);metadata.width=data.getUint16(7);if(type===0xC2){metadata.progressive=true;}
metadataCallback(metadata);break;case 0xE1:parseAPP1(data);default:if(isLastSegment){metadataError('unexpected end of JPEG file');return;}
getSegment(data,size,segmentHandler);}}
catch(e){metadataError(e.toString()+'\n'+e.stack);}}
function parseAPP1(data){if(data.getUint32(4,false)===0x45786966){var exif=parseEXIFData(data);if(exif.THUMBNAIL&&exif.THUMBNAILLENGTH){var start=data.sliceOffset+data.viewOffset+TIFFHeaderOffset+
exif.THUMBNAIL;metadata.preview={start:start,end:start+exif.THUMBNAILLENGTH};}
switch(exif.ORIENTATION){case 2:metadata.rotation=0;metadata.mirrored=true;break;case 3:metadata.rotation=180;metadata.mirrored=false;break;case 4:metadata.rotation=180;metadata.mirrored=true;break;case 5:metadata.rotation=90;metadata.mirrored=true;break;case 6:metadata.rotation=90;metadata.mirrored=false;break;case 7:metadata.rotation=270;metadata.mirrored=true;break;case 8:metadata.rotation=270;metadata.mirrored=false;break;default:metadata.rotation=0;metadata.mirrored=false;break;}}}
function parseEXIFData(data){var exif={};var byteorder=data.getUint8(10);if(byteorder===0x4D){byteorder=false;}else if(byteorder===0x49){byteorder=true;}else{throw Error('invalid byteorder in EXIF segment');}
TIFFHeaderOffset=10;if(data.getUint16(12,byteorder)!==42){throw Error('bad magic number in EXIF segment');}
var offset=data.getUint32(14,byteorder);parseIFD(data,offset+TIFFHeaderOffset,byteorder,exif,true);var ifd0entries=data.getUint16(offset+TIFFHeaderOffset,byteorder);var ifd1=data.getUint32(offset+12+12*ifd0entries,byteorder);if(ifd1!==0){parseIFD(data,ifd1+TIFFHeaderOffset,byteorder,exif,true);}
return exif;}
function parseIFD(data,offset,byteorder,exif,onlyParseOne){var numentries=data.getUint16(offset,byteorder);for(var i=0;i<numentries;i++){parseEntry(data,offset+2+12*i,byteorder,exif);}
if(onlyParseOne){return;}
var next=data.getUint32(offset+2+12*numentries,byteorder);if(next!==0&&next<file.size){parseIFD(data,next+TIFFHeaderOffset,byteorder,exif);}}
var typesize=[0,1,1,2,4,8,1,1,2,4,8,4,8];var tagnames={'274':'ORIENTATION','513':'THUMBNAIL','514':'THUMBNAILLENGTH'};function parseEntry(data,offset,byteorder,exif){var tag=data.getUint16(offset,byteorder);var tagname=tagnames[tag];if(!tagname||exif[tagname]){return;}
var type=data.getUint16(offset+2,byteorder);var count=data.getUint32(offset+4,byteorder);var total=count*typesize[type];var valueOffset=total<=4?offset+8:data.getUint32(offset+8,byteorder)+TIFFHeaderOffset;exif[tagname]=parseValue(data,valueOffset,type,count,byteorder);}
function parseValue(data,offset,type,count,byteorder){var i;if(type===2){var codes=[];for(i=0;i<count-1;i++){codes[i]=data.getUint8(offset+i);}
return String.fromCharCode.apply(String,codes);}else{if(count==1){return parseOneValue(data,offset,type,byteorder);}else{var values=[];var size=typesize[type];for(i=0;i<count;i++){values[i]=parseOneValue(data,offset+size*i,type,byteorder);}
return values;}}}
function parseOneValue(data,offset,type,byteorder){switch(type){case 1:case 7:return data.getUint8(offset);case 2:return null;case 3:return data.getUint16(offset,byteorder);case 4:return data.getUint32(offset,byteorder);case 5:return data.getUint32(offset,byteorder)/data.getUint32(offset+4,byteorder);case 6:return data.getInt8(offset);case 8:return data.getInt16(offset,byteorder);case 9:return data.getInt32(offset,byteorder);case 10:return data.getInt32(offset,byteorder)/data.getInt32(offset+4,byteorder);case 11:return data.getFloat32(offset,byteorder);case 12:return data.getFloat64(offset,byteorder);}
return null;}};function getImageSize(blob,callback,error){'use strict';BlobView.get(blob,0,Math.min(1024,blob.size),function(data){if(data.byteLength<=8){error('corrupt image file');return;}
var magic=data.getBinaryText(0,8);if(magic.substring(0,4)==='GIF8'){try{callback({type:'gif',width:data.getUint16(6,true),height:data.getUint16(8,true)});}
catch(e){error(e.toString());}}
else if(magic.substring(0,8)==='\x89PNG\r\n\x1A\n'){try{callback({type:'png',width:data.getUint32(16,false),height:data.getUint32(20,false)});}
catch(e){error(e.toString());}}
else if(magic.substring(0,2)==='BM'&&data.getUint32(2,true)===blob.size){try{var width,height;if(data.getUint16(14,true)===12){width=data.getUint16(18,true);height=data.getUint16(20,true);}
else{width=data.getUint32(18,true);height=data.getUint32(22,true);}
callback({type:'bmp',width:width,height:height});}
catch(e){error(e.toString());}}
else if(magic.substring(0,2)==='\xFF\xD8'){parseJPEGMetadata(blob,function(metadata){if(metadata.progressive){delete metadata.progressive;metadata.type='pjpeg';}
else{metadata.type='jpeg';}
callback(metadata);},error);}
else{error('unknown image type');}});};'use strict';function getStorageIfAvailable(kind,size,success,error){var storage=navigator.getDeviceStorage(kind);storage.available().onsuccess=function(e){if(e.target.result!=='available'){if(error){error(e.target.result);}}
else{storage.freeSpace().onsuccess=function(e){if(e.target.result<size){if(error){error(e.target.result);}}
else{success(storage);}};}};};'use strict';function getUnusedFilename(storage,name,callback){var getreq=storage.get(name);getreq.onerror=function(){callback(name);};getreq.onsuccess=function(){var version=0;var p=name.lastIndexOf('/');var dir=name.substring(0,p+1);var file=name.substring(p+1);p=file.lastIndexOf('.');if(p===-1){p=file.length;}
var ext=file.substring(p);var base=file.substring(0,p);var parts=base.match(/^(.*)_(\d{1,2})$/);if(parts){base=parts[1];version=parseInt(parts[2]);}
var newname=dir+base+'_'+(version+1)+ext;getUnusedFilename(storage,newname,callback);};};'use strict';(function(exports){var ShrinkingUI=function(foregroundElement,backgroundElement){this.elements.foregroundElement=foregroundElement;this.elements.backgroundElement=backgroundElement;};ShrinkingUI.prototype={DEBUG:false,THRESHOLD:50,SUSPEND_INTERVAL:100,state:{shrinking:false,ending:false,tilting:false,overThreshold:false,toward:'TOP',touch:{initY:-1,prevY:-1},slideTransitionCb:null,tiltTransitionCb:null},elements:{},configs:{degreeLandscape:'2.7deg',degreePortrait:'0.65deg',overDegreeLandscape:'2.9deg',overDegreePortrait:'0.9deg'},tip:null,cover:null};ShrinkingUI.prototype.debug=function su_debug(msg,optObject){if(this.DEBUG){var output='[DEBUG] ShrinkingUI: '+msg;if(optObject){output+=JSON.stringify(optObject);}
dump(output);}};ShrinkingUI.prototype.start=function su_start(){window.addEventListener('shrinking-receiving',this);this.startTilt();};ShrinkingUI.prototype.stop=function su_stop(){if(this.isActive()){this.stopTilt();}
window.removeEventListener('shrinking-receiving',this);};ShrinkingUI.prototype.handleEvent=function su_handleEvent(evt){switch(evt.type){case'shrinking-receiving':this._receivingEffects();break;case'touchstart':this._handleSendingStart(evt);break;case'touchmove':this._handleSendingSlide(evt);break;case'touchend':this._handleSendingOut(evt);break;}};ShrinkingUI.prototype.respondToHierarchyEvent=function su_respondToHierarchyEvent(evt){if(this['_handle_'+evt.type]){return this['_handle_'+evt.type](evt);}
return true;};ShrinkingUI.prototype._handle_holdhome=function su__handle_holdhome(evt){return this.isActive();};ShrinkingUI.prototype._handle_home=function su__handle_home(evt){return this.isActive();};ShrinkingUI.prototype.startTilt=function su_startTilt(){if(this.isActive()){return;}
if(!this.elements.backgroundElement||!this.elements.foregroundElement){return;}
this.state.shrinking=true;this.state.tilting=true;var afterTilt=()=>{this.elements.foregroundElement.classList.add('hidden');this.state.tilting=false;};this._setTip();this._setState(true);screen.mozLockOrientation(screen.mozOrientation);this._shrinkingTilt(afterTilt);};ShrinkingUI.prototype._setTip=function su_setTip(){var backgroundElement=this.elements.backgroundElement;if(!this.tip){this.tip=this._slidingTip();backgroundElement.appendChild(this.tip);}
this.tip.classList.remove('hide');};ShrinkingUI.prototype.stopTilt=function su_stopTilt(){if(!this.state.shrinking||this.state.ending){return;}
if(this.state.tilting){this.state.tilting=false;}
this.state.shrinking=false;this.state.ending=true;var afterTiltBack=(()=>{this.elements.foregroundElement.classList.remove('hidden');this._cleanEffects().then(()=>{this.state.ending=false;});});this.tip.remove();this.tip=null;this._shrinkingTiltBack(true,afterTiltBack);};ShrinkingUI.prototype.isActive=function su_isActive(){if(this.state.shrinking||this.state.tilting||this.state.ending){return true;}
return false;};ShrinkingUI.prototype._setState=function su_shrinking(state){var foregroundElement=this.elements.foregroundElement;foregroundElement.setAttribute('data-shrinking-state',state.toString());this.debug('Setting shrink state to: '+state);};ShrinkingUI.prototype._updateSlideTransition=function su_updateSlideTransition(cb){if(this.tip&&this.state.slideTransitionCb){this.elements.foregroundElement.style.transitionDuration='0s';this.tip.removeEventListener('transitionend',this.state.slideTransitionCb);}
this.state.slideTransitionCb=cb;};ShrinkingUI.prototype._updateTiltTransition=function su_updateTiltTransition(cb){var foregroundElement=this.elements.foregroundElement;if(foregroundElement&&this.state.tiltTransitionCb){foregroundElement.removeEventListener('transitionend',this.state.tiltTransitionCb);}
this.state.tiltTransitionCb=cb;};ShrinkingUI.prototype._receivingEffects=function su_receivingEffects(){var foregroundElement=this.elements.foregroundElement;foregroundElement.style.opacity='0';var afterTop=(function(){foregroundElement.style.opacity='';foregroundElement.style.transition='transform 0.5s ease';this._sendingSlideTo('BOTTOM',(function doTiltBack(){this._shrinkingTiltBack(false,this._cleanEffects);}).bind(this));}).bind(this);var afterTilt=(function(){foregroundElement.style.transition='transform 0.05s ease';this._sendingSlideTo('TOP',afterTop);}).bind(this);this._shrinkingTilt(afterTilt);};ShrinkingUI.prototype._sendingSlideTo=function su_sendingSlideTo(y,callback){var foregroundElement=this.elements.foregroundElement;var cbDone=(function on_cbDone(evt){foregroundElement.removeEventListener('transitionend',cbDone);this.elements.foregroundElement.style.transitionDuration='0s';if('undefined'!==typeof callback){callback();}}).bind(this);if('TOP'===y){foregroundElement.style.transitionDuration='0.3s';y=foregroundElement.parentElement.clientHeight;}else if('BOTTOM'===y){if(this.state.touch.prevY<=0){cbDone();}else{foregroundElement.style.transitionDuration='0.3s';}
y=0;}else if(y<0){y=0;}
foregroundElement.addEventListener('transitionend',cbDone);this._updateTiltTransition(cbDone);foregroundElement.style.transform='rotateX('+this._getTiltingDegree()+') '+'translateY(-'+y+'px)';};ShrinkingUI.prototype._slidingCover=function slidingCover(){var cover=document.createElement('div');cover.id='shrinking-cover';cover.style.width='100%';cover.style.height='100%';cover.style.position='relative';cover.style.zIndex='2';cover.addEventListener('touchstart',this);cover.addEventListener('touchmove',this);cover.addEventListener('touchend',this);return cover;};ShrinkingUI.prototype._slidingTip=function slidingTip(){var tip=document.createElement('div');var tipArrow=document.createElement('div');var tipText=document.createElement('div');tip.id='shrinking-tip';tipArrow.id='shrinking-tip-arrow';tipText.id='shrinking-text';tipArrow.textContent='\u00A0';tipText.setAttribute('data-l10n-id','shrinking-tip');tip.appendChild(tipText);tip.appendChild(tipArrow);return tip;};ShrinkingUI.prototype._disableSlidingCover=function su_disableSlidingCover(){this.cover.removeEventListener('touchstart',this);this.cover.removeEventListener('touchmove',this);this.cover.removeEventListener('touchend',this);};ShrinkingUI.prototype._shrinkingTilt=function su_shrinkingTilt(cb){var foregroundElement=this.elements.foregroundElement;var backgroundElement=this.elements.backgroundElement;if(null===this.cover){this.cover=this._slidingCover();var anchor=foregroundElement.firstElementChild;foregroundElement.insertBefore(this.cover,anchor);}
backgroundElement.classList.add('shrinking-wrapper');foregroundElement.style.transition='transform 0.5s ease';var bounceBack=(function on_bounceBack(evt){if(evt.target!==foregroundElement){return;}
foregroundElement.removeEventListener('transitionend',bounceBack);foregroundElement.addEventListener('transitionend',bounceBackEnd);this._updateTiltTransition(bounceBackEnd);foregroundElement.style.transition='transform ease';foregroundElement.style.transform='rotateX('+this._getTiltingDegree()+') ';}).bind(this);var bounceBackEnd=(function on_bounceBackEnd(evt){if(evt.target!==foregroundElement){return;}
foregroundElement.removeEventListener('transitionend',bounceBackEnd);foregroundElement.style.transition='transform 0.5s ease 0s';if(cb){cb();}}).bind(this);foregroundElement.addEventListener('transitionend',bounceBack);this._updateTiltTransition(bounceBack);foregroundElement.style.transformOrigin='50% 100% 0';foregroundElement.style.transform='rotateX('+this._getOverTiltingDegree()+')';};ShrinkingUI.prototype._shrinkingTiltBack=function su_shrinkingTiltBack(instant,callback){var foregroundElement=this.elements.foregroundElement;if(!instant){var tsEnd=(function _tsEnd(evt){foregroundElement.removeEventListener('transitionend',tsEnd);if(callback){callback();}}).bind(this);foregroundElement.style.transition='transform 0.3s ease';foregroundElement.addEventListener('transitionend',tsEnd);this._updateTiltTransition(tsEnd);foregroundElement.style.transform='rotateX(0.0deg)';}else{foregroundElement.style.transition='';foregroundElement.style.transform='rotateX(0.0deg)';if(callback){callback();}}};ShrinkingUI.prototype._handleSendingStart=function su_handleSendingStart(evt){this.state.touch.initY=evt.touches[0].pageY;this.debug('_handleSendingStart(): ',this.isActive());evt.stopImmediatePropagation();var tsEnd=(function _tsEnd(){this.tip.removeEventListener('transitionend',tsEnd);}).bind(this);this.tip.classList.add('hide');this.tip.addEventListener('transitionend',tsEnd);this._updateSlideTransition(tsEnd);return false;};ShrinkingUI.prototype._handleSendingSlide=function su_handleSendingSlide(evt){var pgy=evt.touches[0].pageY;var slideY=this.state.touch.initY-pgy;if('undefined'===typeof this.state.touch.initY){this.state.touch.initY=slideY;}
if('undefined'===typeof this.state.touch.prevY){this.state.touch.prevY=slideY;}
this.state.toward=(this.state.touch.prevY<slideY)?'TOP':'BOTTOM';this._sendingSlideTo(slideY);this.state.touch.prevY=slideY;this.state.overThreshold=(slideY>this.THRESHOLD)?true:false;};ShrinkingUI.prototype._handleSendingOut=function su_handleSendingOut(evt){this.debug('_handleSendingOut(): ',this.isActive());if(this.state.overThreshold&&'TOP'===this.state.toward){this._sendingSlideTo('TOP',(function(){this._disableSlidingCover();window.dispatchEvent(new CustomEvent('shrinking-sent'));}).bind(this));}else{this._sendingSlideTo('BOTTOM',(function resumeSending(){this._setTip();}).bind(this));}};ShrinkingUI.prototype._cleanEffects=function su_cleanEffects(){var foregroundElement=this.elements.foregroundElement;var backgroundElement=this.elements.backgroundElement;return new Promise((resolve,rejected)=>{this.debug('_cleanEffects(): ',this.isActive());this._disableSlidingCover();foregroundElement.style.transition='';foregroundElement.style.transform='';foregroundElement.style.transformOrigin='50% 50% 0';this._setState(false);this._updateTiltTransition(null);this._updateSlideTransition(null);backgroundElement.classList.remove('shrinking-wrapper');this.cover.remove();this.cover=null;resolve();});};ShrinkingUI.prototype._getTiltingDegree=function su_getTiltingDegree(){return(window.OrientationManager?window.OrientationManager.fetchCurrentOrientation().indexOf('landscape')!==-1:window.innerHeight<window.innerWidth)?this.configs.degreeLandscape:this.configs.degreePortrait;};ShrinkingUI.prototype._getOverTiltingDegree=function su_getOverTiltingDegree(){return(window.OrientationManager?window.OrientationManager.fetchCurrentOrientation().indexOf('landscape')!==-1:window.innerHeight<window.innerWidth)?this.configs.overDegreeLandscape:this.configs.overDegreePortrait;};exports.ShrinkingUI=ShrinkingUI;})(window);;var CONFIG_MAX_IMAGE_PIXEL_SIZE=5242880;var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE=5242880;var CONFIG_MAX_PICK_PIXEL_SIZE=0;var CONFIG_MAX_EDIT_PIXEL_SIZE=0;var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH=0;var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT=0;;'use strict';var NFC={shrinkingUI:null,peer:null,share:function share(f,options){if(navigator.mozNfc){if(window.ShrinkingUI&&options){NFC.shrinkingUI=new window.ShrinkingUI(options.foregroundElement,options.backgroundElement);window.addEventListener('shrinking-sent',NFC.sendFile.bind(NFC,f));navigator.mozNfc.onpeerfound=function(evt){if(!evt.peer){return;}
NFC.peer=evt.peer;NFC.shrinkingUI.start();evt.preventDefault();};navigator.mozNfc.onpeerlost=function(){NFC.peer=null;NFC.shrinkingUI.stop();};}else{navigator.mozNfc.onpeerready=function(event){NFC.peer=event.peer;NFC.sendFile(f);};}}},sendFile:function(f){if(!NFC.peer){return;}
if(typeof f==='function'){var promise=f();promise.then(function(file){NFC.peer.sendFile(file);if(NFC.shrinkingUI){NFC.shrinkingUI.stop();}});}
else{NFC.peer.sendFile(f);if(NFC.shrinkingUI){NFC.shrinkingUI.stop();}}},unshare:function unshare(){if(navigator.mozNfc){NFC.peer=null;navigator.mozNfc.onpeerready=null;navigator.mozNfc.onpeerfound=null;navigator.mozNfc.onpeerlost=null;if(NFC.shrinkingUI){NFC.shrinkingUI.stop();NFC.shrinkingUI=null;window.removeEventListener('shrinking-sent',NFC.sendFile);}}}};;'use strict';(function init(){var activity;var activityData;var blob;var frame;var saved=false;var storage;var title;navigator.mozSetMessageHandler('activity',handleOpenActivity);function $(id){return document.getElementById(id);}
function open(blob){if(activityData.allowSave&&activityData.filename&&checkFilename()){getStorageIfAvailable('pictures',blob.size,function(ds){storage=ds;showSaveButton();});}
getImageSize(blob,success,error);function success(metadata){var pixels=metadata.width*metadata.height;var imagesizelimit=CONFIG_MAX_IMAGE_PIXEL_SIZE;if(blob.type==='image/jpeg'){imagesizelimit*=Downsample.MAX_AREA_REDUCTION;}
var filesizelimit=2*CONFIG_MAX_IMAGE_PIXEL_SIZE;if(pixels>imagesizelimit||blob.size>filesizelimit){displayError('imagetoobig');return;}
if(!metadata.preview||pixels<512*1024){frame.displayImage(blob,metadata.width,metadata.height,null,metadata.rotation,metadata.mirrored);}
else{parseJPEGMetadata(blob.slice(metadata.preview.start,metadata.preview.end,'image/jpeg'),function success(previewmetadata){metadata.preview.width=previewmetadata.width;metadata.preview.height=previewmetadata.height;frame.displayImage(blob,metadata.width,metadata.height,metadata.preview,metadata.rotation,metadata.mirrored);},function error(){frame.displayImage(blob,metadata.width,metadata.height,null,metadata.rotation,metadata.mirrored);});}}
function error(msg){displayError('imageinvalid');}}
function handleOpenActivity(request){activity=request;activityData=activity.source.data;if(!frame){$('header').addEventListener('action',done);$('save').addEventListener('click',save);frame=new MediaFrame($('frame'),false,CONFIG_MAX_IMAGE_PIXEL_SIZE);if(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH){frame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);}
var gestureDetector=new GestureDetector(frame.container);gestureDetector.startDetecting();frame.container.addEventListener('dbltap',handleDoubleTap);frame.container.addEventListener('transform',handleTransform);frame.container.addEventListener('pan',handlePan);frame.container.addEventListener('swipe',handleSwipe);window.addEventListener('resize',frame.resize.bind(frame));if(activityData.exitWhenHidden){window.addEventListener('visibilitychange',function(){if(document.hidden){done();}});}
frame.onerror=function invalid(){displayError('imageinvalid');};}
title=baseName(activityData.filename||'');$('filename').textContent=title;blob=activityData.blob;open(blob);NFC.share(blob,{foregroundElement:$('open'),backgroundElement:document.body});}
function checkFilename(){if(activityData.filename.indexOf('.gallery/')!=-1){return false;}
else{var dotIdx=activityData.filename.lastIndexOf('.');if(dotIdx>-1){var ext=activityData.filename.substr(dotIdx+1);return MimeMapper.guessTypeFromExtension(ext)===blob.type;}else{return false;}}}
function displayError(msgid){document.l10n.formatValue(msgid).then(function(val){alert(val);done();});}
function done(){activity.postResult({saved:saved});activity=null;NFC.unshare();}
function handleDoubleTap(e){var scale;if(frame.fit.scale>frame.fit.baseScale){scale=frame.fit.baseScale/frame.fit.scale;}else{scale=2;}
frame.zoom(scale,e.detail.clientX,e.detail.clientY,200);}
function handleTransform(e){frame.zoom(e.detail.relative.scale,e.detail.midpoint.clientX,e.detail.midpoint.clientY);}
function handlePan(e){frame.pan(e.detail.relative.dx,e.detail.relative.dy);}
function handleSwipe(e){var direction=e.detail.direction;var velocity=e.detail.vy;if(direction==='down'&&velocity>2){done();}}
function save(){hideSaveButton();getUnusedFilename(storage,activityData.filename,function(filename){var savereq=storage.addNamed(blob,filename);savereq.onsuccess=function(){saved=filename;showBanner('saved',title);};savereq.onerror=function(e){console.error('Error saving',filename,e);};});}
function showSaveButton(){$('save').classList.remove('hidden');$('filename').textContent=$('filename').textContent;}
function hideSaveButton(){$('save').classList.add('hidden');$('filename').textContent=$('filename').textContent;}
function showBanner(msg,title){document.l10n.setAttributes($('message'),msg,{filename:title});$('banner').hidden=false;setTimeout(function(){$('banner').hidden=true;},3000);}
function baseName(filename){return filename.substring(filename.lastIndexOf('/')+1);}})();;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
function getCanvasContext(font){debug('get canvas context',font);var cached=cache[font];if(cached){return cached;}
var canvas=document.createElement('canvas');canvas.setAttribute('moz-opaque','true');canvas.setAttribute('width','1px');canvas.setAttribute('height','1px');debug('created canvas',canvas);var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font=font;return cache[font]=ctx;}
function trim(text){return text.replace(/\s+/g,' ').trim();}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('font-fit',this));},{}],2:[function(require,module,exports){;(function(define){'use strict';define(function(require,exports,module){var textContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');var innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');var removeAttribute=Element.prototype.removeAttribute;var setAttribute=Element.prototype.setAttribute;var noop=function(){};exports.register=function(name,props){var baseProto=getBaseProto(props.extends);var template=props.template||baseProto.templateString;var extensible=props.extensible=props.hasOwnProperty('extensible')?props.extensible:true;delete props.extends;if(template){if(extensible&&props.template){props.templateString=props.template;}
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
return target;}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));},{}],3:[function(require,module,exports){(function(define){'use strict';define(function(require,exports,module){var base=window.GAIA_ICONS_BASE_URL||window.COMPONENTS_BASE_URL||'bower_components/';if(!document.documentElement){window.addEventListener('load',load);}else{load();}
function load(){if(isLoaded()){return;}
var link=document.createElement('link');link.rel='stylesheet';link.type='text/css';link.href=base+'gaia-icons/gaia-icons.css';document.head.appendChild(link);exports.loaded=true;}
function isLoaded(){return exports.loaded||document.querySelector('link[href*=gaia-icons]')||document.documentElement.classList.contains('gaia-icons-loaded');}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));},{}],4:[function(require,module,exports){;(function(define){'use strict';define(function(require,exports,module){var component=require('gaia-component');var fontFit=require('font-fit');require('gaia-icons');var debug=0?console.log.bind(console):function(){};const KNOWN_ACTIONS={menu:'menu',back:'back',close:'close'};const TITLE_FONT='italic 300 24px FiraSans';const TITLE_PADDING=10;const MINIMUM_FONT_SIZE_CENTERED=20;const MINIMUM_FONT_SIZE_UNCENTERED=16;const MAXIMUM_FONT_SIZE=23;module.exports=component.register('gaia-header',{extensible:false,dirObserver:true,created:function(){debug('created');this.setupShadowRoot();this.els={actionButton:this.shadowRoot.querySelector('.action-button'),titles:this.getElementsByTagName('h1')};this.els.actionButton.addEventListener('click',e=>this.onActionButtonClick(e));this.observer=new MutationObserver(this.onMutation.bind(this));this.ignoreDir=this.hasAttribute('ignore-dir');this.titleEnd=this.getAttribute('title-end');this.titleStart=this.getAttribute('title-start');this.noFontFit=this.getAttribute('no-font-fit');this.notFlush=this.hasAttribute('not-flush');this.action=this.getAttribute('action');this.unresolved={};this.pending={};this._resizeThrottlingId=null;this.onResize=this.onResize.bind(this);},attached:function(){debug('attached');this.runFontFitSoon();this.observerStart();window.addEventListener('resize',this.onResize);},detached:function(){debug('detached');window.removeEventListener('resize',this.onResize);this.observerStop();this.clearPending();},clearPending:function(){for(var key in this.pending){this.pending[key].clear();delete this.pending[key];}
window.cancelAnimationFrame(this._resizeThrottlingId);this._resizeThrottlingId=null;},runFontFit:function(){debug('run font-fit');if(this.noFontFit){return Promise.resolve();}
var titles=this.els.titles;var space=this.getTitleSpace();var styles=[].map.call(titles,el=>this.getTitleStyle(el,space));return this.setTitleStylesSoon(styles);},runFontFitSoon:function(){debug('run font-fit soon');if(this.pending.runFontFitSoon){return;}
this.pending.runFontFitSoon=this.nextTick(()=>{delete this.pending.runFontFitSoon;this.runFontFit();});},getTitleStyle:function(el,space){debug('get el style',el,space);var text=el.textContent;var styleId=space.start+text+space.end+'#'+space.value;if(!text||!text.trim()){return debug('exit: no text');}
if(getStyleId(el)===styleId){return debug('exit: no change');}
var marginStart=this.getTitleMarginStart();var textSpace=space.value-Math.abs(marginStart);var fontFitResult=this.fontFit(text,textSpace,{min:MINIMUM_FONT_SIZE_CENTERED});var overflowing=fontFitResult.overflowing;var padding={start:0,end:0};if(overflowing){debug('title overflowing');padding.start=!space.start?TITLE_PADDING:0;padding.end=!space.end?TITLE_PADDING:0;textSpace=space.value-padding.start-padding.end;fontFitResult=this.fontFit(text,textSpace);marginStart=0;}
return{id:styleId,fontSize:fontFitResult.fontSize,marginStart:marginStart,overflowing:overflowing,padding:padding};},setTitleStylesSoon:function(styles){debug('set title styles soon',styles);var key='setStyleTitlesSoon';this._titleStyles=styles;if(this.unresolved[key]){return this.unresolved[key];}
this.unresolved[key]=new Promise((resolve)=>{this.pending[key]=this.nextTick(()=>{var styles=this._titleStyles;var els=this.els.titles;[].forEach.call(els,(el,i)=>{if(!styles[i]){return debug('exit');}
this.setTitleStyle(el,styles[i]);});delete this._titleStyles;delete this.unresolved[key];delete this.pending[key];resolve();});});},setTitleStyle:function(el,style){debug('set title style',style);this.observerStop();if(this.ignoreDir){el.style.marginLeft=style.marginStart+'px';el.style.paddingLeft=style.padding.start+'px';el.style.paddingRight=style.padding.end+'px';}else{el.style.marginInlineStart=style.marginStart+'px';el.style.paddingInlineStart=style.padding.start+'px';el.style.paddingInlineEnd=style.padding.end+'px';}
el.style.fontSize=style.fontSize+'px';setStyleId(el,style.id);this.observerStart();},fontFit:function(text,space,opts={}){debug('font fit:',text,space,opts);var fontFitArgs={font:TITLE_FONT,min:opts.min||MINIMUM_FONT_SIZE_UNCENTERED,max:MAXIMUM_FONT_SIZE,text:text,space:space};return fontFit(fontFitArgs);},observerStart:function(){if(this.observing){return;}
this.observer.observe(this,{childList:true,attributes:true,subtree:true});this.observing=true;debug('observer started');},observerStop:function(){if(!this.observing){return;}
this.observer.disconnect();this.observing=false;debug('observer stopped');},onResize:function(e){debug('onResize',this._resizeThrottlingId);if(this._resizeThrottlingId!==null){return;}
this._resizeThrottlingId=window.requestAnimationFrame(()=>{this._resizeThrottlingId=null;this.runFontFitSoon();});},onMutation:function(mutations){debug('on mutation',mutations);if(!this.pending.runFontFitSoon){this.runFontFit();}},getTitleSpace:function(){var start=this.titleStart;var end=this.titleEnd;var space=this.getWidth()-start-end;var result={value:space,start:start,end:end};debug('get title space',result);return result;},getWidth:function(){var value=this.notFlush?this.clientWidth:window.innerWidth;debug('get width',value);return value;},triggerAction:function(){if(this.action){this.els.actionButton.click();}},onActionButtonClick:function(){debug('action button click');var config={detail:{type:this.action}};var e=new CustomEvent('action',config);setTimeout(()=>this.dispatchEvent(e));},getTitleMarginStart:function(){var start=this.titleStart;var end=this.titleEnd;var marginStart=end-start;debug('get title margin start',marginStart);return marginStart;},getButtonsBeforeTitle:function(){var children=this.children;var l=children.length;var els=[];for(var i=0;i<l;i++){var el=children[i];if(el.tagName==='H1'){break;}
if(!contributesToLayout(el)){continue;}
els.push(el);}
if(this.action){els.push(this.els.actionButton);}
return els;},getButtonsAfterTitle:function(){var children=this.children;var els=[];for(var i=children.length-1;i>=0;i--){var el=children[i];if(el.tagName==='H1'){break;}
if(!contributesToLayout(el)){continue;}
els.push(el);}
return els;},sumButtonWidths:function(buttons){var defaultWidth=50;var sum=buttons.reduce((prev,button)=>{var isStandardButton=button===this.els.actionButton;var width=isStandardButton?defaultWidth:button.clientWidth;return prev+width;},0);debug('sum button widths',buttons,sum);return sum;},attrs:{action:{get:function(){return this._action;},set:function(value){var action=KNOWN_ACTIONS[value];if(action===this._action){return;}
this.setAttr('action',action);this._action=action;}},titleStart:{get:function(){debug('get title-start');if('_titleStart'in this){return this._titleStart;}
var buttons=this.getButtonsBeforeTitle();var value=this.sumButtonWidths(buttons);debug('get title-start',buttons,value);return value;},set:function(value){debug('set title-start',value);value=parseInt(value,10);if(value===this._titleStart||isNaN(value)){return;}
this.setAttr('title-start',value);this._titleStart=value;debug('set');}},titleEnd:{get:function(){debug('get title-end');if('_titleEnd'in this){return this._titleEnd;}
var buttons=this.getButtonsAfterTitle();return this.sumButtonWidths(buttons);},set:function(value){debug('set title-end',value);value=parseInt(value,10);if(value===this._titleEnd||isNaN(value)){return;}
this.setAttr('title-end',value);this._titleEnd=value;}},noFontFit:{get:function(){return this._noFontFit||false;},set:function(value){debug('set no-font-fit',value);value=!!(value||value==='');if(value===this.noFontFit){return;}
this._noFontFit=value;if(value){this.setAttr('no-font-fit','');}
else{this.removeAttr('no-font-fit');}}},ignoreDir:{get:function(){return this._ignoreDir||false;},set:function(value){debug('set ignore-dir',value);value=!!(value||value==='');if(value===this.ignoreDir){return;}
this._ignoreDir=value;this.dirObserver=!value;if(value){this.setAttr('ignore-dir','');}
else{this.removeAttr('ignore-dir');}}}},template:`<div class="inner">
    <button class="action-button">
      <content select="[l10n-action]"></content>
    </button>
    <content></content>
  </div>

  <style>

  :host {
    display: block;
    -moz-user-select: none;

    --gaia-header-button-color:
      var(--header-button-color,
      var(--header-color,
      var(--link-color,
      inherit)));
  }

  /**
   * [hidden]
   */

  :host[hidden] {
    display: none;
  }

  /** Reset
   ---------------------------------------------------------*/

  ::-moz-focus-inner { border: 0; }

  /** Inner
   ---------------------------------------------------------*/

  .inner {
    display: flex;
    min-height: 50px;
    -moz-user-select: none;

    background:
      var(--header-background,
      var(--background,
      #fff));
  }

  /** Action Button
   ---------------------------------------------------------*/

  /**
   * 1. Hidden by default
   */

  .action-button {
    position: relative;

    display: none; /* 1 */
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;

    align-items: center;
    background: none;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [action=back]
   * [action=menu]
   * [action=close]
   *
   * 1. For icon vertical-alignment
   */

  [action=back] .action-button,
  [action=menu] .action-button,
  [action=close] .action-button {
    display: flex; /* 1 */
  }

  /**
   * :active
   */

  .action-button:active {
    transition: none;
    opacity: 0.2;
  }

  /** Action Button Icon
   ---------------------------------------------------------*/

  .action-button:before {
    font-family: 'gaia-icons';
    font-style: normal;
    text-rendering: optimizeLegibility;
    font-weight: 500;
  }

  [action=close] .action-button:before { content: 'close' }
  [action=menu] .action-button:before { content: 'menu' }

  [action=back]:-moz-dir(ltr) .action-button:before { content: 'left' }
  [action=back]:-moz-dir(rtl) .action-button:before { content: 'right' }

  /** Action Button Icon
   ---------------------------------------------------------*/

  /**
   * 1. To enable vertical alignment.
   */

  .action-button:before {
    display: block;
  }

  /** Action Button Text
   ---------------------------------------------------------*/

  /**
   * To provide custom localized content for
   * the action-button, we allow the user
   * to provide an element with the class
   * .l10n-action. This node is then
   * pulled inside the real action-button.
   *
   * Example:
   *
   *   <gaia-header action="back">
   *     <span l10n-action aria-label="Back">Localized text</span>
   *     <h1>title</h1>
   *   </gaia-header>
   */

  ::content [l10n-action] {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    font-size: 0;
  }

  /** Title
   ---------------------------------------------------------*/

  /**
   * 1. Vertically center text. We can't use flexbox
   *    here as it breaks text-overflow ellipsis
   *    without an inner div.
   */

  ::content h1 {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    line-height: 50px; /* 1 */
    font-weight: 300;
    font-style: italic;
    font-size: 24px;

    color:
      var(--header-title-color,
      var(--header-color,
      var(--title-color,
      var(--text-color,
      inherit))));
  }

  /**
   * [ignore-dir]
   *
   * When the <gaia-header> component has an [ignore-dir] attribute, header
   * direction is forced to LTR but we still want the <h1> text to be reversed
   * so that strings like '1 selected' become 'selected 1'.
   *
   * When we're happy for <gaia-header> to be fully RTL responsive we won't need
   * these rules anymore, but this depends on all Gaia apps being ready.
   *
   * This should be safe to remove when bug 1179459 lands.
   */

  :host[ignore-dir] {
    direction: ltr;
  }

  :host[ignore-dir]:-moz-dir(rtl) h1 {
    direction: rtl;
  }

  /** Buttons
   ---------------------------------------------------------*/

  ::content a,
  ::content button {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    width: auto;
    height: auto;
    min-width: 50px;
    margin: 0;
    padding: 0 10px;
    outline: 0;
    border: 0;

    font-size: 14px;
    line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    text-align: center;
    background: none;
    border-radius: 0;
    font-style: italic;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color: var(--gaia-header-button-color);
  }

  /**
   * :active
   */

  ::content a:active,
  ::content button:active {
    transition: none;
    opacity: 0.2;
  }

  /**
   * [hidden]
   */

  ::content a[hidden],
  ::content button[hidden] {
    display: none;
  }

  /**
   * [disabled]
   */

  ::content a[disabled],
  ::content button[disabled] {
    pointer-events: none;
    color: var(--header-disabled-button-color);
  }

  /** Icon Buttons
   ---------------------------------------------------------*/

  /**
   * Icons are a different color to text
   */

  ::content .icon,
  ::content [data-icon] {
    color:
      var(--header-icon-color,
      var(--gaia-header-button-color));
  }

  /**
   * If users want their action button
   * to be in the component's light-dom
   * they can add an .action class
   * to make it look like the
   * shadow action button.
   */

  ::content .action {
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [data-icon]:empty
   *
   * Icon buttons with no textContent,
   * should always be 50px.
   *
   * This is to prevent buttons being
   * larger than they should be before
   * icon-font has loaded.
   */

  ::content [data-icon]:empty {
    width: 50px;
  }

  </style>`,nextTick:nextTick});function contributesToLayout(el){return el.localName!=='style'&&!el.hasAttribute('l10n-action');}
function setStyleId(el,id){el._styleId=id;}
function getStyleId(el){return el._styleId;}
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});