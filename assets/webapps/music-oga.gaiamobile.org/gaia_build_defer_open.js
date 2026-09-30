;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var MimeMapper={_typeToExtensionMap:{'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/bmp':'bmp','audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/webm':'webm','audio/3gpp':'3gp','audio/amr':'amr','video/mp4':'mp4','video/mpeg':'mpg','video/ogg':'ogg','video/webm':'webm','video/3gpp':'3gp','video/3gpp2':'3g2','application/pdf':'pdf','application/vcard':'vcf','text/vcard':'vcf','text/x-vcard':'vcf'},_extensionToTypeMap:{'jpg':'image/jpeg','jpeg':'image/jpeg','jpe':'image/jpeg','png':'image/png','gif':'image/gif','bmp':'image/bmp','mp3':'audio/mpeg','m4a':'audio/mp4','m4b':'audio/mp4','m4p':'audio/mp4','m4r':'audio/mp4','aac':'audio/aac','opus':'audio/ogg','amr':'audio/amr','mp4':'video/mp4','mpeg':'video/mpeg','mpg':'video/mpeg','ogv':'video/ogg','ogx':'video/ogg','webm':'video/webm','3gp':'video/3gpp','3g2':'video/3gpp2','ogg':'video/ogg','pdf':'application/pdf','vcf':'text/vcard'},_parseExtension:function(filename){var array=filename.split('.');return array.length>1?array.pop():'';},isSupportedType:function(mimetype){return(mimetype in this._typeToExtensionMap);},isSupportedExtension:function(extension){return(extension in this._extensionToTypeMap);},isFilenameMatchesType:function(filename,mimetype){var extension=this._parseExtension(filename);var guessedType=this.guessTypeFromExtension(extension);return(guessedType==mimetype);},guessExtensionFromType:function(mimetype){return this._typeToExtensionMap[mimetype];},guessTypeFromExtension:function(extension){return this._extensionToTypeMap[extension];},guessTypeFromFileProperties:function(filename,mimetype){var extension=this._parseExtension(filename);var type=this.isSupportedType(mimetype)?mimetype:this.guessTypeFromExtension(extension);return type||'';},ensureFilenameMatchesType:function(filename,mimetype){if(!this.isFilenameMatchesType(filename,mimetype)){var guessedExt=this.guessExtensionFromType(mimetype);if(guessedExt){filename+='.'+guessedExt;}}
return filename;}};;this.asyncStorage=(function(){'use strict';var DBNAME='asyncStorage';var DBVERSION=1;var STORENAME='keyvaluepairs';var db=null;function withDatabase(f){if(db){f();}else{var openreq=indexedDB.open(DBNAME,DBVERSION);openreq.onerror=function withStoreOnError(){console.error('asyncStorage: can\'t open database:',openreq.error.name);};openreq.onupgradeneeded=function withStoreOnUpgradeNeeded(){openreq.result.createObjectStore(STORENAME);};openreq.onsuccess=function withStoreOnSuccess(){db=openreq.result;f();};}}
function withStore(type,callback,oncomplete){withDatabase(function(){var transaction=db.transaction(STORENAME,type);if(oncomplete){transaction.oncomplete=oncomplete;}
callback(transaction.objectStore(STORENAME));});}
function getItem(key,callback){var req;withStore('readonly',function getItemBody(store){req=store.get(key);req.onerror=function getItemOnError(){console.error('Error in asyncStorage.getItem(): ',req.error.name);};},function onComplete(){var value=req.result;if(value===undefined){value=null;}
callback(value);});}
function setItem(key,value,callback){withStore('readwrite',function setItemBody(store){var req=store.put(value,key);req.onerror=function setItemOnError(){console.error('Error in asyncStorage.setItem(): ',req.error.name);};},callback);}
function removeItem(key,callback){withStore('readwrite',function removeItemBody(store){var req=store.delete(key);req.onerror=function removeItemOnError(){console.error('Error in asyncStorage.removeItem(): ',req.error.name);};},callback);}
function clear(callback){withStore('readwrite',function clearBody(store){var req=store.clear();req.onerror=function clearOnError(){console.error('Error in asyncStorage.clear(): ',req.error.name);};},callback);}
function length(callback){var req;withStore('readonly',function lengthBody(store){req=store.count();req.onerror=function lengthOnError(){console.error('Error in asyncStorage.length(): ',req.error.name);};},function onComplete(){callback(req.result);});}
function key(n,callback){if(n<0){callback(null);return;}
var req;withStore('readonly',function keyBody(store){var advanced=false;req=store.openCursor();req.onsuccess=function keyOnSuccess(){var cursor=req.result;if(!cursor){return;}
if(n===0||advanced){return;}
advanced=true;cursor.advance(n);};req.onerror=function keyOnError(){console.error('Error in asyncStorage.key(): ',req.error.name);};},function onComplete(){var cursor=req.result;callback(cursor?cursor.key:null);});}
return{getItem:getItem,setItem:setItem,removeItem:removeItem,clear:clear,length:length,key:key};}());;(function(exports){'use strict';var ImageUtils=exports.ImageUtils={};const JPEG='image/jpeg';const PNG='image/png';const GIF='image/gif';const BMP='image/bmp';ImageUtils.JPEG=JPEG;ImageUtils.PNG=PNG;ImageUtils.GIF=GIF;ImageUtils.BMP=BMP;ImageUtils.getSizeAndType=function getSizeAndType(imageBlob){if(!(imageBlob instanceof Blob)){console.log('not blob');return Promise.reject(new TypeError('argument is not a Blob'));}
return new Promise(function(resolve,reject){if(imageBlob.size<=16){reject('corrupt image file');return;}
var bytesToRead=32*1024;if(imageBlob.type===PNG||imageBlob.type===GIF||imageBlob.type===BMP){bytesToRead=512;}
findSizeAndType(imageBlob,bytesToRead,success,tryagain);function success(data){resolve(data);}
function tryagain(data){if(data.type===JPEG){findSizeAndType(imageBlob,imageBlob.size,success,failure);}
else{reject(data.error);}}
function failure(data){reject(data.error);}});function findSizeAndType(imageBlob,amountToRead,success,failure){var slice=imageBlob.slice(0,Math.min(amountToRead,imageBlob.size));var reader=new FileReader();reader.readAsArrayBuffer(slice);reader.onloadend=function(){parseImageData(reader.result);};function parseImageData(buffer){var header=new Uint8Array(buffer,0,16);var view=new DataView(buffer);if(header[0]===0x89&&header[1]===0x50&&header[2]===0x4e&&header[3]===0x47&&header[4]===0x0d&&header[5]===0x0a&&header[6]===0x1A&&header[7]===0x0a&&header[12]===0x49&&header[13]===0x48&&header[14]===0x44&&header[15]===0x52)
{try{success({type:PNG,width:view.getUint32(16,false),height:view.getUint32(20,false)});}
catch(ex){failure({error:ex.toString()});}}
else if(header[0]===0x47&&header[1]===0x49&&header[2]===0x46&&header[3]===0x38&&(header[4]===0x37||header[4]===0x39)&&header[5]===0x61)
{try{success({type:GIF,width:view.getUint16(6,true),height:view.getUint16(8,true)});}
catch(ex){failure({error:ex.toString()});}}
else if(header[0]===0x42&&header[1]===0x4D&&view.getUint32(2,true)===imageBlob.size)
{try{var width,height;if(view.getUint16(14,true)===12){width=view.getUint16(18,true);height=view.getUint16(20,true);}
else{width=view.getUint32(18,true);height=view.getUint32(22,true);}
success({type:BMP,width:width,height:height});}
catch(ex){failure({error:ex.toString()});}}
else if(header[0]===0xFF&&header[1]===0xD8){var value={type:JPEG};try{var offset=2;for(;;){if(view.getUint8(offset)!==0xFF){failure({error:'corrupt JPEG file'});}
var segmentType=view.getUint8(offset+1);var segmentSize=view.getUint16(offset+2)+2;if((segmentType>=0xC0&&segmentType<=0xC3)||(segmentType>=0xC5&&segmentType<=0xC7)||(segmentType>=0xC9&&segmentType<=0xCB)||(segmentType>=0xCD&&segmentType<=0xCF))
{value.height=view.getUint16(offset+5,false);value.width=view.getUint16(offset+7,false);success(value);break;}
offset+=segmentSize;if(offset+9>view.byteLength){value.error='corrupt JPEG file';failure(value);break;}}}
catch(ex){failure({error:ex.toString()});}}
else{failure({error:'unknown image type'});}}}};ImageUtils.resizeAndCropToCover=function(inputImageBlob,outputWidth,outputHeight,outputType,encoderOptions)
{if(!outputWidth||!isFinite(outputWidth)||outputWidth<=0||!outputHeight||!isFinite(outputHeight)||outputHeight<=0){return Promise.reject(new TypeError('invalid output dimensions'));}
outputWidth=Math.round(outputWidth);outputHeight=Math.round(outputHeight);return ImageUtils.getSizeAndType(inputImageBlob).then(function resolve(data){var inputWidth=data.width;var inputHeight=data.height;if(inputWidth===outputWidth&&inputHeight===outputHeight){return inputImageBlob;}
return resize(data);},function reject(error){return resize({});});function resize(data){var inputType=data.type;var inputWidth=data.width;var inputHeight=data.height;if(outputType&&outputType!==JPEG&&outputType!==PNG){console.warn('Ignoring unsupported outputType',outputType);outputType=undefined;}
if(!outputType){if(inputType===JPEG||inputType===PNG){outputType=inputType;}
else{outputType=PNG;}}
var url=URL.createObjectURL(inputImageBlob);var mediaFragment;if(inputType===JPEG&&inputWidth>outputWidth&&inputHeight>outputHeight){var reduction=Math.max(outputWidth/inputWidth,outputHeight/inputHeight);mediaFragment=ImageUtils.Downsample.sizeNoMoreThan(reduction);}
else{mediaFragment='';}
return new Promise(function(resolve,reject){var offscreenImage=new Image();offscreenImage.src=url+mediaFragment;offscreenImage.onerror=function(e){cleanupImage();reject('failed to decode image');};offscreenImage.onload=function(){var actualWidth=offscreenImage.width;var actualHeight=offscreenImage.height;var widthScale=outputWidth/actualWidth;var heightScale=outputHeight/actualHeight;var scale=Math.max(widthScale,heightScale);var cropWidth=Math.round(outputWidth/scale);var cropHeight=Math.round(outputHeight/scale);var cropLeft=Math.floor((actualWidth-cropWidth)/2);var cropTop=Math.floor((actualHeight-cropHeight)/2);var canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;var context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(offscreenImage,cropLeft,cropTop,cropWidth,cropHeight,0,0,outputWidth,outputHeight);cleanupImage();canvas.toBlob(function(blob){canvas.width=0;resolve(blob);},outputType,encoderOptions);};function cleanupImage(){offscreenImage.onerror=offscreenImage.onload='';offscreenImage.onload=offscreenImage.onerror=null;offscreenImage.removeAttribute('src');URL.revokeObjectURL(url);}});}};(function(exports){'use strict';function round(x){return Math.round(x*100)/100;}
function MozSampleSize(n,scale){return Object.freeze({dimensionScale:round(scale),areaScale:round(scale*scale),toString:function(){return'#-moz-samplesize='+n;},scale:function(x){return Math.ceil(x*scale);}});}
var NONE=Object.freeze({dimensionScale:1,areaScale:1,toString:function(){return'';},scale:function(x){return x;}});var fragments=[NONE,MozSampleSize(2,1/2),MozSampleSize(3,3/8),MozSampleSize(4,1/4),MozSampleSize(8,1/8)];function sizeAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.dimensionScale<=scale){return f;}}
return fragments[fragments.length-1];}
function sizeNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.dimensionScale>=scale){return f;}}
return NONE;}
function areaAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.areaScale<=scale){return f;}}
return fragments[fragments.length-1];}
function areaNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.areaScale>=scale){return f;}}
return NONE;}
exports.Downsample={sizeAtLeast:sizeAtLeast,sizeNoMoreThan:sizeNoMoreThan,areaAtLeast:areaAtLeast,areaNoMoreThan:areaNoMoreThan,NONE:NONE,MAX_SIZE_REDUCTION:1/fragments[fragments.length-1].dimensionScale,MAX_AREA_REDUCTION:1/fragments[fragments.length-1].areaScale};}(exports.ImageUtils));})(window);;(function(exports){'use strict';var FontSizeUtils={_cachedContexts:{},_getCachedContext:function(fontSize,fontFamily,fontStyle){fontStyle=fontStyle||'italic';var cache=this._cachedContexts;var ctx=cache[fontSize]&&cache[fontSize][fontFamily]?cache[fontSize][fontFamily][fontStyle]:null;if(!ctx){var canvas=document.createElement('canvas');canvas.setAttribute('moz-opaque','true');canvas.setAttribute('width','1');canvas.setAttribute('height','1');ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font=fontStyle+' '+fontSize+'px '+fontFamily;if(!cache[fontSize]){cache[fontSize]={};}
if(!cache[fontSize][fontFamily]){cache[fontSize][fontFamily]={};}
cache[fontSize][fontFamily][fontStyle]=ctx;}
return ctx;},resetCache:function(){this._cachedContexts={};},getFontWidth:function(string,fontSize,fontFamily,fontStyle){var ctx=this._getCachedContext(fontSize,fontFamily,fontStyle);return ctx.measureText(string).width;},getMaxFontSizeInfo:function(string,allowedSizes,fontFamily,maxWidth){var fontSize;var resultWidth;var i=allowedSizes.length-1;do{fontSize=allowedSizes[i];resultWidth=this.getFontWidth(string,fontSize,fontFamily);i--;}while(resultWidth>maxWidth&&i>=0);return{fontSize:fontSize,overflow:resultWidth>maxWidth,textWidth:resultWidth};},_overflowCountCache:-1,getOverflowCount:function(string,fontSize,fontFamily,maxWidth){var substring;var resultWidth;var overflowCount=-1;if(string.length>this._overflowCountCache){substring=string.substr(0,string.length-this._overflowCountCache);resultWidth=this.getFontWidth(substring,fontSize,fontFamily);if(resultWidth>maxWidth){overflowCount=this._overflowCountCache;}}
do{overflowCount++;substring=string.substr(0,string.length-overflowCount);resultWidth=this.getFontWidth(substring,fontSize,fontFamily);}while(substring.length>0&&resultWidth>maxWidth);this._overflowCountCache=overflowCount;return overflowCount;},getContentWidth:function(style){var width=parseInt(style.width,10);if(style.boxSizing==='border-box'){width-=(parseInt(style.paddingRight,10)+
parseInt(style.paddingLeft,10));}
return width;},getStyleProperties:function(element){var style=window.getComputedStyle(element);var contentWidth=this.getContentWidth(style);if(isNaN(contentWidth)){contentWidth=0;}
return{fontFamily:style.fontFamily,contentWidth:contentWidth,paddingRight:parseInt(style.paddingRight,10),paddingLeft:parseInt(style.paddingLeft,10),offsetLeft:element.offsetLeft};},getWindowWidth:function(){return window.innerWidth;}};exports.FontSizeUtils=FontSizeUtils;}(this));;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;'use strict';var BlobView=(function(){function fail(msg){throw Error(msg);}
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
return s;}};return{get:BlobView.get,getFromArrayBuffer:BlobView.getFromArrayBuffer};}());'use strict';var MetadataFormats=(function(){var formats=[{file:'js/metadata/forward_lock.js',get module(){return ForwardLockMetadata;},match:function(header){return header.getBinaryText(0,9)==='LOCKED 1 ';}},{file:'js/metadata/id3v2.js',get module(){return ID3v2Metadata;},match:function(header){return header.getBinaryText(0,3)==='ID3';}},{file:'js/metadata/ogg.js',get module(){return OggMetadata;},match:function(header){return header.getBinaryText(0,4)==='OggS';}},{file:'js/metadata/flac.js',get module(){return FLACMetadata;},match:function(header){return header.getBinaryText(0,4)==='fLaC';}},{file:'js/metadata/mp4.js',get module(){return MP4Metadata;},match:function(header){return header.getBinaryText(4,4)==='ftyp';}},{file:'js/metadata/id3v1.js',get module(){return ID3v1Metadata;},match:function(header){return(header.getUint16(0,false)&0xFFFE)===0xFFFA;}}];function MetadataParser(formatInfo){this._formatInfo=formatInfo;}
MetadataParser.prototype={parse:function(header){var info=this._formatInfo;return LazyLoader.load(info.file).then(()=>{return info.module.parse(header);});}};function findParser(header){for(var i=0;i<formats.length;i++){if(formats[i].match(header)){return new MetadataParser(formats[i]);}}
return null;}
return{findParser:findParser};})();'use strict';var AudioMetadata=(function(){function parse(blob){var filename=blob.name;if(filename){if(filename.slice(0,5)==='DCIM/'&&filename.slice(-4).toLowerCase()==='.3gp'){return Promise.reject('skipping 3gp video file');}}
if(blob.size<128){return Promise.reject('file is empty or too small');}
return new Promise(function(resolve,reject){var headersize=Math.min(64*1024,blob.size);BlobView.get(blob,0,headersize,function(header,error){if(error){reject(error);return;}
try{var parser=MetadataFormats.findParser(header);var promise;if(parser){promise=parser.parse(header);}else{promise=checkPlayability(blob);}
resolve(promise.then(function(metadata){return addDefaultMetadata(metadata||{},filename);}));}catch(e){console.error('AudioMetadata.parse:',e,e.stack);reject(e);}});});}
function addDefaultMetadata(metadata,filename){if(!metadata.artist){metadata.artist='';}
if(!metadata.album){metadata.album='';}
if(!metadata.title){if(filename){var p1=filename.lastIndexOf('/');var p2=filename.lastIndexOf('.');if(p2<=p1){p2=filename.length;}
metadata.title=filename.substring(p1+1,p2);}else{metadata.title='';}}
metadata.rated=metadata.played=0;return metadata;}
function checkPlayability(blob){var player=new Audio();player.mozAudioChannelType='content';var canplay=blob.type&&player.canPlayType(blob.type);if(canplay==='probably'){return Promise.resolve();}else{return new Promise(function(resolve,reject){var url=URL.createObjectURL(blob);player.src=url;const CANPLAY_TIMEOUT=3000;var timeoutId=setTimeout(()=>{console.error('No oncanplay or error events seen yet.','Assuming file is corrupt:',blob.name);player.onerror();},CANPLAY_TIMEOUT);player.onerror=function(){clearTimeout(timeoutId);URL.revokeObjectURL(url);player.removeAttribute('src');player.load();reject('Unplayable music file');};player.oncanplay=function(){clearTimeout(timeoutId);URL.revokeObjectURL(url);player.removeAttribute('src');player.load();resolve();};});}}
return{parse:parse};})();;'use strict';var AlbumArtCache=(function(){var THUMBNAIL_WIDTH=300;var THUMBNAIL_HEIGHT=300;var L1Cache={'thumbnail':{},'fullsize':{}};function getFullSizeURL(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){return Promise.resolve(noPlaceholder?null:getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);if(cacheKey&&cacheKey in L1Cache.fullsize){return Promise.resolve(L1Cache.fullsize[cacheKey]);}
return getAlbumArtBlob(fileinfo).then(function(blob){return makeAndCacheURL(cacheKey,blob,'fullsize');});}
function getFullSizeBlob(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){if(noPlaceholder){return Promise.resolve(null);}
return getBlobFromURL(getDefaultCoverURL(fileinfo));}
return getAlbumArtBlob(fileinfo);}
function getThumbnailURL(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){return Promise.resolve(noPlaceholder?null:getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);if(cacheKey&&cacheKey in L1Cache.thumbnail){return Promise.resolve(L1Cache.thumbnail[cacheKey]);}
return checkL2Cache(cacheKey).then(function(cachedBlob){return cachedBlob||createThumbnail(cacheKey,fileinfo);}).then(function(blob){return makeAndCacheURL(cacheKey,blob,'thumbnail');});}
function getThumbnailBlob(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){if(noPlaceholder){return Promise.resolve(null);}
return getBlobFromURL(getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);return checkL2Cache(cacheKey).then(function(cachedBlob){return cachedBlob||createThumbnail(cacheKey,fileinfo);});}
function getDefaultCoverURL(fileinfo){var metadata=fileinfo.metadata;var infoForHash=(!metadata.album&&!metadata.artist)?metadata.title:metadata.album+metadata.artist;var hashedNumber=(Math.abs(hash(infoForHash))%10)+1;return'/style/images/AlbumArt'+hashedNumber+'_small.png';}
function hash(str){var hashCode=0;if(str.length===0){return hashCode;}
for(var i=0;i<str.length;i++){var c=str.charCodeAt(i);hashCode=((hashCode<<5)-hashCode)+c;hashCode=hashCode&hashCode;}
return hashCode;}
function makeCacheKey(fileinfo){var metadata=fileinfo.metadata;if(metadata.picture.filename){return'external.'+metadata.picture.filename;}else if(metadata.picture.flavor==='embedded'){var album=metadata.album;var artist=metadata.artist;var size=metadata.picture.end-metadata.picture.start;if(album||artist){return'thumbnail.'+album+'.'+artist+'.'+size;}else{return'thumbnail.'+(fileinfo.name||fileinfo.blob.name);}}
return null;}
function checkL2Cache(cacheKey){if(!cacheKey){return Promise.resolve(null);}else{return new Promise(function(resolve,reject){asyncStorage.getItem(cacheKey,function(blob){resolve(blob);});});}}
function makeAndCacheURL(cacheKey,blob,type){var url=URL.createObjectURL(blob);if(cacheKey){L1Cache[type][cacheKey]=url;}
return url;}
function createThumbnail(cacheKey,fileinfo){return getAlbumArtBlob(fileinfo).then(function(blob){return ImageUtils.resizeAndCropToCover(blob,THUMBNAIL_WIDTH,THUMBNAIL_HEIGHT);}).then(function(thumbnailBlob){if(cacheKey){asyncStorage.setItem(cacheKey,thumbnailBlob);}
return thumbnailBlob;});}
function getAlbumArtBlob(fileinfo){var picture=fileinfo.metadata.picture;if(picture.blob){return Promise.resolve(picture.blob);}else if(picture.filename){return LazyLoader.load('/js/metadata/album_art.js').then(()=>{return new Promise((resolve,reject)=>{var getreq=AlbumArt.pictureStorage.get(picture.filename);getreq.onsuccess=function(){resolve(this.result);};getreq.onerror=function(){reject(this.error);};});});}else if(picture.start){return getSongBlob(fileinfo).then((blob)=>{return blob.slice(picture.start,picture.end,picture.type);});}else{var err=new Error('unknown picture flavor: '+picture.flavor);console.error(err);return Promise.reject(err);}}
function getSongBlob(fileinfo){if(fileinfo.blob){return Promise.resolve(fileinfo.blob);}else{return Database.getFile(fileinfo);}}
function getBlobFromURL(url){return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.responseType='blob';xhr.onload=function(){resolve(xhr.response);};xhr.onerror=function(){reject(null);};xhr.send();});}
return{getFullSizeURL:getFullSizeURL,getFullSizeBlob:getFullSizeBlob,getThumbnailURL:getThumbnailURL,getThumbnailBlob:getThumbnailBlob};})();;'use strict';function formatTime(secs){if(isNaN(secs)){return;}
secs=Math.floor(secs);var formatedTime;var seconds=secs%60;var minutes=Math.floor(secs/60)%60;var hours=Math.floor(secs/3600);if(hours===0){formatedTime=(minutes<10?'0'+minutes:minutes)+':'+
(seconds<10?'0'+seconds:seconds);}else{formatedTime=(hours<10?'0'+hours:hours)+':'+
(minutes<10?'0'+minutes:minutes)+':'+
(seconds<10?'0'+seconds:seconds);}
return formatedTime;}
function createListElement(option,data,index,highlight){var li=document.createElement('li');li.className='list-item';li.setAttribute('role','presentation');var a=document.createElement('a');a.dataset.index=index;a.dataset.option=option;a.setAttribute('role','option');var titleBdi;li.appendChild(a);function highlightText(result,text){var textContent=result.textContent;var textLowerCased=textContent.toLocaleLowerCase();var index=Normalizer.toAscii(textLowerCased).indexOf(text);if(index>=0){var innerHTML=Sanitizer.createSafeHTML`
                      ${textContent.substring(0, index)}
                      <span class="search-highlight">
                      ${textContent.substring(index, index + text.length)}
                      </span>
                      ${textContent.substring(index + text.length)}`;result.innerHTML=Sanitizer.unwrapSafeHTML(innerHTML);}}
switch(option){case'playlist':titleBdi=document.createElement('bdi');titleBdi.className='list-playlist-title';if(data.metadata.l10nId){titleBdi.textContent=navigator.mozL10n.get(data.metadata.l10nId);titleBdi.dataset.l10nId=data.metadata.l10nId;}else{titleBdi.textContent=data.metadata.title||navigator.mozL10n.get('unknownTitle');titleBdi.dataset.l10nId=data.metadata.title?'':'unknownTitle';}
a.dataset.keyRange='all';a.dataset.option=data.option;a.appendChild(titleBdi);if(index===0){var shuffleIcon=document.createElement('div');shuffleIcon.className='list-playlist-icon';shuffleIcon.dataset.icon='shuffle';shuffleIcon.setAttribute('data-l10n-id','shuffle-toggle');a.appendChild(shuffleIcon);}
break;case'artist':case'album':case'title':var artistBdi;var albumImg;albumImg=document.createElement('img');albumImg.className='list-album-art';li.appendChild(albumImg);LazyLoader.load('js/metadata/album_art_cache.js').then(()=>{return AlbumArtCache.getThumbnailURL(data);}).then((url)=>{showImage(albumImg,url);});if(option==='artist'){artistBdi=document.createElement('bdi');artistBdi.className='list-single-title';artistBdi.textContent=data.metadata.artist||navigator.mozL10n.get('unknownArtist');artistBdi.dataset.l10nId=data.metadata.artist?'':'unknownArtist';if(highlight){highlightText(artistBdi,highlight);}
a.appendChild(artistBdi);}else{var albumOrTitleBdi=document.createElement('bdi');artistBdi=document.createElement('bdi');albumOrTitleBdi.className='list-main-title';artistBdi.className='list-sub-title';if(option==='album'){albumOrTitleBdi.textContent=data.metadata.album||navigator.mozL10n.get('unknownAlbum');albumOrTitleBdi.dataset.l10nId=data.metadata.album?'':'unknownAlbum';}else{albumOrTitleBdi.textContent=data.metadata.title||navigator.mozL10n.get('unknownTitle');albumOrTitleBdi.dataset.l10nId=data.metadata.title?'':'unknownTitle';}
artistBdi.textContent=data.metadata.artist||navigator.mozL10n.get('unknownArtist');artistBdi.dataset.l10nId=data.metadata.artist?'':'unknownArtist';if(highlight){highlightText(albumOrTitleBdi,highlight);}
a.appendChild(albumOrTitleBdi);a.appendChild(artistBdi);}
a.dataset.keyRange=data.metadata[option];a.dataset.option=option;break;case'song':case'song-index':var songTitle=data.metadata.title||navigator.mozL10n.get('unknownTitle');var indexBdi=document.createElement('bdi');indexBdi.className='list-song-index';if(option==='song-index'){indexBdi.textContent=index+1;}else{var trackNum=data.metadata.tracknum;if(data.metadata.discnum&&data.multidisc){trackNum=data.metadata.discnum+'.'+
(trackNum<10?'0'+trackNum:trackNum);}
indexBdi.textContent=trackNum;}
titleBdi=document.createElement('bdi');titleBdi.className='list-song-title';titleBdi.textContent=songTitle;titleBdi.dataset.l10nId=data.metadata.title?'':'unknownTitle';var lengthBdi=document.createElement('bdi');lengthBdi.className='list-song-length';a.appendChild(indexBdi);a.appendChild(titleBdi);a.appendChild(lengthBdi);break;}
return li;}
function showImage(image,url,option){image.classList.remove(option);image.src='';if(option==='fadeIn'){image.style.opacity=0;}
image.addEventListener('load',handler);function handler(evt){evt.target.removeEventListener('load',handler);image.classList.add(option);}
image.src=url;};'use strict';var PlaybackQueue=(function(){var SETTINGS_OPTION_KEY='settings_option_key';var Repeat={OFF:0,LIST:1,SONG:2,next:function(val){return(val+1)%3;}};function posmod(a,b){var r=a%b;return r<0?r+b:r;}
function fillIndices(length){var indices=new Array(length);for(var i=0;i<length;i++){indices[i]=i;}
return indices;}
function shuffle(list){for(var i=list.length-1;i>=1;i--){var j=Math.floor(Math.random()*(i+1));if(j<i){var tmp=list[j];list[j]=list[i];list[i]=tmp;}}}
function BaseQueue(){this._index=null;}
BaseQueue.prototype={_init:function(index){if(this.length===0){throw Error('cannot have an empty queue');}
this._index=index||0;this._shuffle(playbackSettings.shuffle,index!==undefined);},_shuffle:function(enabled,keepIndex=true){this._shuffleTime=Date.now();if(!enabled){if(keepIndex){this._index=this.index;}
delete this._shuffledList;return;}
this._shuffledList=fillIndices(this.length);var oldIndex=null;if(keepIndex){oldIndex=this._shuffledList.splice(this._index,1)[0];this._index=0;}
shuffle(this._shuffledList);if(keepIndex){this._shuffledList.unshift(oldIndex);}},next:function(automatic=false){return this.advance(1,automatic);},previous:function(){this.advance(-1);},advance:function(offset,automatic=false){var next;var justShuffled=false;if(this._shuffleTime<shuffleTime){this._shuffle(playbackSettings.shuffle);justShuffled=true;}
switch(PlaybackQueue.repeat){case Repeat.OFF:next=Math.max(this._index+offset,0);break;case Repeat.LIST:next=posmod(this._index+offset,this.length);var cycled=next!==this._index+offset;if(playbackSettings.shuffle&&cycled&&!justShuffled){this._shuffle(true);}
break;case Repeat.SONG:next=automatic?this._index:Math.max(this._index+offset,0);break;default:throw new Error('unexpected repeat status: '+this.repeat);}
if(next>=this.length){this._index=null;return false;}
this._index=next;return true;},get index(){return this._shuffledList?this._shuffledList[this._index]:this._index;},get rawIndex(){return this._index;}};function StaticQueue(fileinfos,index){this._fileinfos=fileinfos;this._init(index);}
StaticQueue.prototype=new BaseQueue();Object.defineProperty(StaticQueue.prototype,'length',{get:function(){return this._fileinfos.length;}});StaticQueue.prototype.current=function(){return Promise.resolve(this._fileinfos[this.index]);};function DynamicQueue(query,index){this._query=query;this._init(index);}
DynamicQueue.prototype=new BaseQueue();Object.defineProperty(DynamicQueue.prototype,'length',{get:function(){return this._query.count;}});DynamicQueue.prototype.current=function(){var query=this._query;return new Promise((resolve,reject)=>{var handle=Database.advancedEnumerate(query.key,query.range,query.direction,this.index,(record)=>{Database.cancelEnumeration(handle);resolve(record);});});};var playbackSettings=null;var shuffleTime=0;function loadSettings(){return new Promise((resolve,reject)=>{asyncStorage.getItem(SETTINGS_OPTION_KEY,(settings)=>{if(settings){playbackSettings=settings;}else{playbackSettings={repeat:Repeat.OFF,shuffle:false};}
resolve();});});}
function saveSettings(){return new Promise((resolve,reject)=>{asyncStorage.setItem(SETTINGS_OPTION_KEY,playbackSettings,()=>{resolve();});});}
return{StaticQueue:StaticQueue,DynamicQueue:DynamicQueue,Repeat:Repeat,loadSettings:loadSettings,get repeat(){return playbackSettings.repeat;},set repeat(val){playbackSettings.repeat=val;saveSettings();return val;},get shuffle(){return playbackSettings.shuffle;},set shuffle(val){playbackSettings.shuffle=val;shuffleTime=Date.now();saveSettings();return val;},};})();;'use strict';var TYPE_LIST='list';var TYPE_SINGLE='single';var PLAYSTATUS_STOPPED='STOPPED';var PLAYSTATUS_PLAYING='PLAYING';var PLAYSTATUS_PAUSED='PAUSED';var PLAYSTATUS_FWD_SEEK='FWD_SEEK';var PLAYSTATUS_REV_SEEK='REV_SEEK';var INTERRUPT_BEGIN='mozinterruptbegin';var PlayerView={_repeatModes:['off','list','song'],get view(){return document.getElementById('views-player');},get audio(){return document.getElementById('player-audio');},get foreCoverImage(){return document.querySelector('.cover-image.visible');},get backCoverImage(){return document.querySelector('.cover-image:not(.visible)');},get playStatus(){return this._playStatus;},set playStatus(val){this._playStatus=val;},get isQueued(){return Boolean(this.queue&&this.queue.length);},init:function pv_init(type=TYPE_LIST,autoplay=true){this.artist=document.getElementById('player-cover-artist');this.album=document.getElementById('player-cover-album');this.artistText=document.querySelector('#player-cover-artist bdi');this.albumText=document.querySelector('#player-cover-album bdi');this.timeoutID;this.cover=document.getElementById('player-cover');this.coverImageURL=null;this.shareButton=document.getElementById('player-cover-share');this.repeatButton=document.getElementById('player-album-repeat');this.shuffleButton=document.getElementById('player-album-shuffle');this.ratings=document.getElementById('player-album-rating').children;this.seekSlider=document.getElementById('player-seek');this.seekRegion=document.getElementById('player-seek-bar');this.seekBar=document.getElementById('player-seek-bar-progress');this.seekIndicator=document.getElementById('player-seek-bar-indicator');this.seekElapsed=document.getElementById('player-seek-elapsed');this.seekRemaining=document.getElementById('player-seek-remaining');this.playControl=document.getElementById('player-controls-play');this.previousControl=document.getElementById('player-controls-previous');this.nextControl=document.getElementById('player-controls-next');this.banner=document.getElementById('info-banner');this.isTouching=false;this.isFastSeeking=false;this.playStatus=PLAYSTATUS_STOPPED;this.pausedPosition=null;this.handle=null;this.currentFileInfo=null;this.playingBlob=null;this.setSeekBar(0,0);this.intervalID=null;this.view.addEventListener('click',this);this.view.addEventListener('contextmenu',this);this.seekRegion.addEventListener('touchstart',this);this.seekRegion.addEventListener('touchmove',this);this.seekRegion.addEventListener('touchend',this);this.seekSlider.addEventListener('keypress',this);this.previousControl.addEventListener('touchend',this);this.nextControl.addEventListener('touchend',this);this.audio.addEventListener('play',this);this.audio.addEventListener('pause',this);this.audio.addEventListener('playing',this);this.audio.addEventListener('durationchange',this);this.audio.addEventListener('timeupdate',this);this.audio.addEventListener('ended',this);this.audio.addEventListener('mozinterruptbegin',this);this.audio.addEventListener('mozinterruptend',this);window.addEventListener('visibilitychange',this);window.addEventListener('storage',this._handleInterpageMessage.bind(this));navigator.mozL10n.ready(this.updateL10n.bind(this));this.type=type;this.autoplay=autoplay;if(this.type===TYPE_SINGLE){this.shuffleButton.disabled=true;this.repeatButton.disabled=true;this.previousControl.disabled=true;this.nextControl.disabled=true;}},checkSCOStatus:function pv_checkSCOStatus(){if(typeof MusicComms!=='undefined'&&MusicComms.enabled){var SCOStatus=MusicComms.isSCOEnabled;this.playControl.disabled=this.previousControl.disabled=this.nextControl.disabled=SCOStatus;this.seekRegion.parentNode.classList.toggle('disabled',SCOStatus);this.banner.classList.toggle('visible',SCOStatus);}},clean:function pv_clean(){if(this.handle){Database.cancelEnumeration(this.handle);}
this.queue=null;this.playingBlob=null;this.coverImageURL=null;this.foreCoverImage.style.backgroundImage='';},activate:function pv_activate(queue){this.queue=queue;this.shuffleButton.disabled=(this.queue.length<2);this.setRepeat(PlaybackQueue.repeat);this.setShuffle(PlaybackQueue.shuffle);},showInfo:function pv_showInfo(){this.cover.classList.add('slideOut');if(this.timeoutID){window.clearTimeout(this.timeoutID);}
this.timeoutID=window.setTimeout(function pv_hideInfo(){this.cover.classList.remove('slideOut');}.bind(this),5000);},setInfo:function pv_setInfo(fileinfo){this.currentFileInfo=fileinfo;var metadata=fileinfo.metadata;if(typeof ModeManager!=='undefined'){ModeManager.playerTitle=metadata.title;ModeManager.updateTitle();if(metadata.locked||this.type===TYPE_SINGLE){this.shareButton.classList.add('hidden');this.artist.classList.add('hidden-cover-share');this.album.classList.add('hidden-cover-share');}else{this.shareButton.classList.remove('hidden');this.artist.classList.remove('hidden-cover-share');this.album.classList.remove('hidden-cover-share');}}else{var titleBar=document.querySelector('#title-text bdi');titleBar.textContent=metadata.title||navigator.mozL10n.get('unknownTitle');titleBar.dataset.l10nId=metadata.title?'':'unknownTitle';}
this.artistText.textContent=metadata.artist||navigator.mozL10n.get('unknownArtist');this.artistText.dataset.l10nId=metadata.artist?'':'unknownArtist';this.albumText.textContent=metadata.album||navigator.mozL10n.get('unknownAlbum');this.albumText.dataset.l10nId=metadata.album?'':'unknownAlbum';this.setCoverImage(fileinfo);},setCoverImage:function pv_setCoverImage(fileinfo){LazyLoader.load('js/metadata/album_art_cache.js').then(()=>{return AlbumArtCache.getFullSizeURL(fileinfo);}).then((url)=>{if(this.coverImageURL!==url){this.coverImageURL=url;var back=this.backCoverImage,fore=this.foreCoverImage;back.style.backgroundImage='url('+url+')';back.classList.add('visible');fore.classList.remove('visible');}});},getRepeat:function pv_getRepeat(){return this._repeatModes.indexOf(this.repeatButton.value);},setRepeat:function pv_setRepeat(value){this.repeatButton.value=this._repeatModes[value];this.repeatButton.setAttribute('data-l10n-id','repeat-'+this._repeatModes[value]);},setShuffle:function pv_setShuffle(value){this.shuffleButton.classList.toggle('shuffle-on',value);this.shuffleButton.setAttribute('aria-pressed',value);},setRatings:function pv_setRatings(rated){for(var i=0;i<5;i++){var rating=this.ratings[i];if(i===rated-1){rating.setAttribute('aria-checked',true);}else{rating.setAttribute('aria-checked',false);}
if(i<rated){rating.classList.add('star-on');}else{rating.classList.remove('star-on');}}},setAudioSrc:function pv_setAudioSrc(file){var url=URL.createObjectURL(file);this.playingBlob=file;this.audio.removeAttribute('src');this.audio.load();this.audio.mozAudioChannelType='content';this.audio.src=url;this.audio.load();this.audio.play();this.audio.onloadeddata=function(evt){URL.revokeObjectURL(url);};this.audio.onerror=(function(evt){if(this.onerror){this.onerror(evt);}}).bind(this);this.setSeekBar(0,0);},updateRemoteMetadata:function pv_updateRemoteMetadata(){if(typeof MusicComms==='undefined'||this.queue.length===0){return;}
var metadata=this.currentFileInfo.metadata;var notifyMetadata={title:metadata.title||navigator.mozL10n.get('unknownTitle'),artist:metadata.artist||navigator.mozL10n.get('unknownArtist'),album:metadata.album||navigator.mozL10n.get('unknownAlbum'),duration:this.audio.duration*1000,mediaNumber:this.rawIndex+1,totalMediaCount:this.queue.length};if(this.audio.currentTime===0){LazyLoader.load('js/metadata/album_art_cache.js').then(()=>{return AlbumArtCache.getThumbnailBlob(this.currentFileInfo);}).then((blob)=>{notifyMetadata.picture=blob;MusicComms.notifyMetadataChanged(notifyMetadata);});}else{MusicComms.notifyMetadataChanged(notifyMetadata);}},updateRemotePlayStatus:function pv_updateRemotePlayStatus(){if(typeof MusicComms==='undefined'){return;}
var position=this.pausedPosition?this.pausedPosition:this.audio.currentTime;var info={playStatus:this.playStatus,duration:this.audio.duration*1000,position:position*1000};this.pausedPosition=(this.playStatus===PLAYSTATUS_PLAYING)?null:this.audio.currentTime;MusicComms.notifyStatusChanged(info);},PLAYER_IS_OCCUPIED_BY:'music-player-is-occupied-by',_handleInterpageMessage:function(evt){if(evt.key===this.PLAYER_IS_OCCUPIED_BY){if(evt.newValue&&evt.newValue!==location.href){this.pause();}}},_sendInterpageMessage:function(){window.localStorage.setItem(this.PLAYER_IS_OCCUPIED_BY,location.href);},_clearInterpageMessage:function(){var whoIsPlaying=window.localStorage.getItem(this.PLAYER_IS_OCCUPIED_BY);if(whoIsPlaying&&whoIsPlaying===window.location.href){window.localStorage.removeItem(this.PLAYER_IS_OCCUPIED_BY);}},start:function pv_start(autoplay=true){this.checkSCOStatus();this._sendInterpageMessage();this.showInfo();this.queue.current().then((songData)=>{this.setInfo(songData);if(songData.blob){return songData.blob;}
this.setRatings(songData.metadata.rated);Database.incrementPlayCount(songData);return Database.getFile(songData,true);}).then((file)=>{this.setAudioSrc(file);if(!autoplay||!this.autoplay||MusicComms.isSCOEnabled){this.pause();}}).catch(function(msg){console.error(msg);});},play:function pv_play(targetIndex){this.checkSCOStatus();this._sendInterpageMessage();this.showInfo();if(this.audio.duration>20&&this.audio.duration-this.audio.currentTime<1){this.next(true);}else{this.audio.play();}},pause:function pv_pause(){this.checkSCOStatus();this._clearInterpageMessage();this.audio.pause();},stop:function pv_stop(){this.pause();this.audio.removeAttribute('src');this.audio.load();this.clean();if(typeof ModeManager!=='undefined'){ModeManager.playerTitle=null;if(ModeManager.currentMode===MODE_PLAYER){ModeManager.pop();}else{ModeManager.updateTitle();ModeManager.updatePlayerIcon();}}
this.playStatus=PLAYSTATUS_STOPPED;this.updateRemotePlayStatus();},next:function pv_next(isAutomatic){if(this.type===TYPE_SINGLE){this.start(false);}else if(this.queue.next(isAutomatic)){this.start();}else{this.stop();}},previous:function pv_previous(){if(this.audio.currentTime<=3){this.queue.previous();}
this.start();},startFastSeeking:function pv_startFastSeeking(direction){this.isTouching=this.isFastSeeking=true;var offset=direction*2;this.prevPlayStatus=this.playStatus;this.playStatus=direction?PLAYSTATUS_FWD_SEEK:PLAYSTATUS_REV_SEEK;this.updateRemotePlayStatus();this.intervalID=window.setInterval(function(){this.seekAudio(this.audio.currentTime+offset);}.bind(this),15);},stopFastSeeking:function pv_stopFastSeeking(){this.isTouching=this.isFastSeeking=false;if(this.intervalID){window.clearInterval(this.intervalID);}
this.playStatus=this.prevPlayStatus;this.prevPlayStatus=null;this.updateRemotePlayStatus();},updateSeekBar:function pv_updateSeekBar(){if(this.isTouching){return;}
if(typeof ModeManager==='undefined'||ModeManager.currentMode===MODE_PLAYER){this.seekAudio();}},seekAudio:function pv_seekAudio(seekTime){if(seekTime!==undefined){this.audio.currentTime=Math.floor(seekTime);}
this.setSeekBar(this.audio.duration,this.audio.currentTime);},setSeekBar:function pv_setSeekBar(endTime,currentTime){if(this.seekBar.max!=endTime){navigator.mozL10n.setAttributes(this.seekSlider,'playbackSeekBar',{'duration':formatTime(endTime)});}
this.seekBar.max=isFinite(endTime)?endTime:0;this.seekBar.value=currentTime;var formattedCurrentTime=formatTime(currentTime);this.seekSlider.setAttribute('aria-valuetext',formattedCurrentTime);this.seekSlider.setAttribute('aria-valuemax',this.seekBar.max);this.seekSlider.setAttribute('aria-valuenow',currentTime);var ratio=(isFinite(endTime)&&endTime!==0)?(currentTime/endTime):0;var x=(ratio*this.seekBar.offsetWidth-
this.seekIndicator.offsetWidth/2);if(this.isLTR){x=x+'px';}else{if(x<0){x=Math.abs(x)+'px';}else{x='-'+x+'px';}}
this.seekIndicator.style.transform='translateX('+x+')';this.seekElapsed.textContent=formattedCurrentTime;var remainingTime=endTime-currentTime;this.seekRemaining.textContent=(remainingTime>0)?'-'+formatTime(remainingTime):'---:--';},share:function pv_shareFile(){var songData=this.currentFileInfo;if(songData.metadata.locked){return;}
LazyLoader.load('js/metadata/album_art_cache.js').then(()=>{return Promise.all([Database.getFile(songData),AlbumArtCache.getThumbnailBlob(songData)]);}).then(function([file,pictureBlob]){var filename=songData.name,name=filename.substring(filename.lastIndexOf('/')+1);var activityData={type:'audio/*',number:1,blobs:[file],filenames:[name],filepaths:[filename],metadata:[{title:songData.metadata.title,artist:songData.metadata.artist,album:songData.metadata.album,picture:pictureBlob}]};if(PlayerView.playStatus!==PLAYSTATUS_PLAYING){var a=new MozActivity({name:'share',data:activityData});a.onerror=function(e){console.warn('share activity error:',a.error.name);};}
else{(function(){var hack_activity_property='_hack_hack_shut_up';var hack_setting_property='music._hack.pause_please';navigator.mozSettings.addObserver(hack_setting_property,observer);activityData[hack_activity_property]=hack_setting_property;var a=new MozActivity({name:'share',data:activityData});a.onerror=a.onsuccess=cleanup;function observer(e){PlayerView.pause();}
function cleanup(){navigator.mozSettings.removeObserver(hack_setting_property,observer);if(PlayerView.playStatus===PLAYSTATUS_PAUSED){PlayerView.play();}}}());}});},handleEvent:function pv_handleEvent(evt){var target=evt.target;if(!target){return;}
switch(evt.type){case'click':switch(target.id){case'player-cover':case'player-cover-image-1':case'player-cover-image-2':this.showInfo();break;case'player-controls-play':if(this.playControl.classList.contains('is-pause')){this.play();}else{this.pause();}
break;case'player-album-repeat':this.showInfo();var repeat=PlaybackQueue.Repeat.next(this.getRepeat());PlaybackQueue.repeat=repeat;this.setRepeat(repeat);break;case'player-album-shuffle':this.showInfo();var shuffle=!target.classList.contains('shuffle-on');PlaybackQueue.shuffle=shuffle;this.setShuffle(shuffle);break;case'player-cover-share':this.share();break;}
if(target.dataset.rating){this.showInfo();var songData=this.currentFileInfo;var targetRating=parseInt(target.dataset.rating,10);var newRating=(targetRating===songData.metadata.rated)?targetRating-1:targetRating;Database.setSongRating(songData,newRating);this.setRatings(newRating);}
break;case'play':this.playControl.classList.remove('is-pause');this.playStatus=PLAYSTATUS_PLAYING;this.playControl.setAttribute('data-l10n-id','playbackPause');this.updateRemotePlayStatus();break;case'pause':this.playControl.classList.add('is-pause');this.playStatus=PLAYSTATUS_PAUSED;this.playControl.setAttribute('data-l10n-id','playbackPlay');this.updateRemotePlayStatus();break;case'touchstart':case'touchmove':if(evt.type==='touchstart'){this.isTouching=true;this.seekIndicator.classList.add('highlight');}
if(this.isTouching&&this.audio.duration>0){var touch=evt.touches[0];var x=(touch.clientX-target.offsetLeft)/target.offsetWidth;if(x<0){x=0;}
if(x>1){x=1;}
if(this.isLTR){this.seekTime=x*this.seekBar.max;}else{this.seekTime=this.audio.duration-x*this.seekBar.max;}
this.setSeekBar(this.audio.duration,this.seekTime);}
break;case'touchend':if(this.isFastSeeking){this.stopFastSeeking();}else if(target.id==='player-seek-bar'){this.seekIndicator.classList.remove('highlight');if(this.audio.duration>0&&this.isTouching){this.seekAudio(this.seekTime);this.seekTime=0;}
this.isTouching=false;}else if(target.id==='player-controls-previous'){this.previous();}else if(target.id==='player-controls-next'){this.next();}
break;case'keypress':var step=Math.max(this.audio.duration/20,2);if(evt.keyCode==evt.DOM_VK_DOWN){this.seekAudio(this.audio.currentTime-step);}else if(evt.keyCode==evt.DOM_VK_UP){this.seekAudio(this.audio.currentTime+step);}
break;case'contextmenu':if(target.id==='player-controls-next'){this.startFastSeeking(1);}else if(target.id==='player-controls-previous'){this.startFastSeeking(-1);}
break;case'durationchange':case'timeupdate':this.updateSeekBar();if(evt.type==='durationchange'||this.audio.currentTime===0){this.updateRemoteMetadata();}
break;case'ended':this.next(true);break;case'visibilitychange':if(document.hidden){this.audio.removeEventListener('timeupdate',this);}else{this.audio.addEventListener('timeupdate',this);this.updateSeekBar();}
break;case'mozinterruptbegin':this.playStatus=INTERRUPT_BEGIN;this.updateRemotePlayStatus();break;case'mozinterruptend':this.playStatus=PLAYSTATUS_PLAYING;this.updateRemotePlayStatus();break;default:return;}},updateL10n:function pv_updateL10n(){this.isLTR=navigator.mozL10n.language.direction==='ltr'?true:false;}};;'use strict';navigator.mozL10n.once(function onLocalizationInit(){navigator.mozSetMessageHandler('activity',handleOpenActivity);});function handleOpenActivity(request){var data=request.source.data;var blob=request.source.data.blob;var header=document.getElementById('header');var saveButton=document.getElementById('title-save');var banner=document.getElementById('banner');var message=document.getElementById('message');var storage;var saved=false;if(data.allowSave&&data.filename&&checkFilename()){saveButton.hidden=false;saveButton.disabled=true;header.runFontFit();getStorageIfAvailable('music',blob.size,function(ds){storage=ds;saveButton.disabled=false;});}
playBlob(blob);function playBlob(blob){PlayerView.init(TYPE_SINGLE);PlayerView.stop();PlaybackQueue.loadSettings().then(()=>{return AudioMetadata.parse(blob);}).then((metadata)=>{var fileinfo={metadata:metadata,name:blob.name,blob:blob};PlayerView.activate(new PlaybackQueue.StaticQueue([fileinfo]));PlayerView.start();}).catch((e)=>{console.error(e);alert(navigator.mozL10n.get('audioinvalid'));done();});}
header.addEventListener('action',done);saveButton.addEventListener('click',save);window.addEventListener('visibilitychange',function onVisibilityChanged(){if(document.hidden){done();}});function done(){PlayerView.stop();request.postResult({saved:saved});}
function save(){saveButton.hidden=true;document.getElementById('title-text').textContent=document.getElementById('title-text').textContent;getUnusedFilename(storage,data.filename,function(filename){var savereq=storage.addNamed(blob,filename);savereq.onsuccess=function(){saved=filename;showBanner(navigator.mozL10n.get('saved',{title:document.getElementById('title-text').textContent}));};savereq.onerror=function(e){console.error('Error saving',filename,e);};});}
function checkFilename(){var dotIdx=data.filename.lastIndexOf('.'),ext;if(dotIdx>-1){ext=data.filename.substr(dotIdx+1);if(ext==='ogg'){return true;}else{return MimeMapper.guessTypeFromExtension(ext)===blob.type;}}else{return false;}}
function showBanner(msg){message.textContent=msg;banner.hidden=false;setTimeout(function(){banner.hidden=true;},3000);}}