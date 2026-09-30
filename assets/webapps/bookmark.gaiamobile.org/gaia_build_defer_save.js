;'use strict';var rscheme=/^(?:[a-z\u00a1-\uffff0-9-+]+)(?::(?:\/\/)?)/i;var UrlHelper={a:null,getUrlFromInput:function urlHelper_getUrlFromInput(input){this.a=this.a||document.createElement('a');this.a.href=input;return this.a.href;},_getScheme:function(input){return(rscheme.exec(input)||[])[0];},hasScheme:function(input){return!!this._getScheme(input);},isURL:function urlHelper_isURL(input){return!UrlHelper.isNotURL(input);},isNotURL:function urlHelper_isNotURL(input){var case1Reg=/^(\?)|(\?.+\s)/;var case2Reg=/[\?\.\s\:]/;var case3Reg=/^(data|view-source)\:/;var str=input.trim();if(case1Reg.test(str)||!case2Reg.test(str)||this._getScheme(str)===str){return true;}
if(case3Reg.test(str)){return false;}
if(!this.hasScheme(str)){str='http://'+str;}
if(!this.urlValidate){this.urlValidate=document.createElement('input');this.urlValidate.setAttribute('type','url');}
this.urlValidate.setAttribute('value',str);return!this.urlValidate.validity.valid;},resolveUrl:function urlHelper_resolveURL(url,baseUrl){if(!url){return null;}
try{return new URL(url,baseUrl).href;}catch(e){return null;}},getHostname:function urlHelper_getHostname(url){try{return new URL(url).hostname;}catch(e){return null;}}};;'use strict';(function(exports){var datastore;var DATASTORE_NAME='bookmarks_store';var readyState;var listeners=Object.create(null);function init(){return new Promise(function doInit(resolve,reject){if(readyState==='initialized'){resolve();return;}
if(readyState==='initializing'){document.addEventListener('ds-initialized',function oninitalized(){document.removeEventListener('ds-initialized',oninitalized);resolve();});return;}
readyState='initializing';if(!navigator.getDataStores){console.error('Bookmark store: DataStore API is not working');reject({name:'NO_DATASTORE'});readyState='failed';return;}
navigator.getDataStores(DATASTORE_NAME).then(function(ds){if(ds.length<1){console.error('Bookmark store: Cannot get access to the Store');reject({name:'NO_ACCESS_TO_DATASTORE'});readyState='failed';return;}
datastore=ds[0];datastore.addEventListener('change',onchangeHandler);readyState='initialized';document.dispatchEvent(new CustomEvent('ds-initialized'));resolve();},reject);});}
function doGetAll(resolve,reject){var result=Object.create(null);var cursor=datastore.sync();function cursorResolve(task){switch(task.operation){case'update':case'add':result[task.data.id]=task.data;break;case'remove':delete result[task.data.id];break;case'clear':result=Object.create(null);break;case'done':resolve(result);return;}
cursor.next().then(cursorResolve,reject);}
cursor.next().then(cursorResolve,reject);}
function get(id){return new Promise(function doGet(resolve,reject){init().then(function onInitialized(){datastore.get(id).then(resolve,reject);},reject);});}
function getAll(){return new Promise(function doGet(resolve,reject){init().then(doGetAll.bind(null,resolve,reject),reject);});}
function onchangeHandler(event){var operation=event.operation;var callbacks=listeners[operation];callbacks&&callbacks.forEach(function iterCallback(callback){datastore.get(event.id).then(function got(result){callback.method.call(callback.context||this,{type:operation,target:result||event});});});}
function addEventListener(type,callback){var context;if(!(type in listeners)){listeners[type]=[];}
var cb=callback;if(typeof cb==='object'){context=cb;cb=cb.handleEvent;}
if(cb){listeners[type].push({method:cb,context:context});init();}}
function removeEventListener(type,callback){if(!(type in listeners)){return false;}
var callbacks=listeners[type];var length=callbacks.length;for(var i=0;i<length;i++){var thisCallback=callback;if(typeof thisCallback==='object'){thisCallback=callback.handleEvent;}
if(callbacks[i]&&callbacks[i].method===thisCallback){callbacks.splice(i,1);return true;}}
return false;}
function add(data){return new Promise(function doAdd(resolve,reject){init().then(function onInitialized(){var id=data.url;Object.defineProperty(data,'id',{enumerable:true,configurable:false,writable:false,value:id});datastore.add(data,id).then(function add_success(){resolve(true);},function add_error(){datastore.put(data,id).then(function put_success(){resolve();},reject);});},reject);});}
function getRevisionId(){return new Promise(function doGet(resolve,reject){init().then(function onInitialized(){resolve(datastore.revisionId);},reject);});}
function put(data){return new Promise(function doAdd(resolve,reject){init().then(function onInitialized(){datastore.put(data,data.id).then(function success(){resolve();},reject);},reject);});}
function remove(id){return new Promise(function doRemove(resolve,reject){init().then(function onInitialized(){datastore.remove(id).then(resolve,reject);},reject);});}
function clear(){return new Promise(function doClear(resolve,reject){init().then(function onInitialized(){datastore.clear().then(resolve,reject);},reject);});}
exports.BookmarksDatabase={get:get,getAll:getAll,getRevisionId:getRevisionId,addEventListener:addEventListener,removeEventListener:removeEventListener,add:add,put:put,remove:remove,clear:clear};}(window));;'use strict';(function WebManifestHelper(exports){var getManifest=function(url){return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest({mozSystem:true});xhr.open('get',url,true);xhr.responseType='json';xhr.setRequestHeader('Accept','application/manifest+json');xhr.onload=function(){var status=xhr.status;var webManifest;if(status==200){if(!xhr.response){reject(new Error('Empty JSON response to '+url+', '+'possibly syntax error'));}
webManifest=processRawManifest(xhr.response||{},url);resolve(webManifest);}else{reject(status);}};xhr.onerror=function(e){console.error('Unable to get web manifest');reject(e.target.status);};xhr.send();});};var processRawManifest=function(webManifest,manifestURL){if(!manifestURL){throw new Error('WebManifestHelper.processRawManifest:'+' no manifestURL given');}
if('icons'in webManifest){webManifest.icons=processIcons(webManifest,manifestURL||'');}
return webManifest;};const onlyDecimals=/^\d+$/,anyRegEx=new RegExp('any','i');var processIcons=function(manifest,baseURL){const obj={objectName:'manifest',object:manifest,property:'icons',expectedType:'array'},icons=[];var value=extractValue(obj);if(Array.isArray(value)){var processableIcons=value.filter(icon=>icon&&Object.prototype.hasOwnProperty.call(icon,'src')&&icon.src!=='');for(var potentialIcon of processableIcons){var src=processSrcMember(potentialIcon,baseURL);if(src!==undefined){var icon={src:src,type:processTypeMember(potentialIcon),sizes:processSizesMember(potentialIcon),density:processDensityMember(potentialIcon)};icons.push(icon);}}}
return icons;function processTypeMember(icon){const obj={objectName:'icon',object:icon,property:'type',expectedType:'string'};var value=extractValue(obj),isParsable=(typeof value==='string'&&value.length>0);return(value===''||!isParsable)?undefined:value;}
function processDensityMember(icon){const hasDensity=Object.prototype.hasOwnProperty.call(icon,'density'),rawValue=(hasDensity)?icon.density:undefined,value=parseFloat(rawValue),result=(Number.isNaN(value)||value===+Infinity||value<=0)?1.0:value;return result;}
function processSrcMember(icon,baseURL){const obj={objectName:'icon',object:icon,property:'src',expectedType:'string'},value=extractValue(obj);var url;if(typeof value==='string'&&value.trim()!==''){try{url=new URL(value,baseURL).href;}catch(e){}}
return url;}
function processSizesMember(icon){const sizes=[],obj={objectName:'icon',object:icon,property:'sizes',expectedType:'string'};var value=extractValue(obj);value=(value)?value.trim():value;if(value){var validSizes=value.split(/\s+/).filter(isValidSizeValue);validSizes.forEach((size)=>sizes.push(size));}
return sizes;function isValidSizeValue(size){if(anyRegEx.test(size)){return true;}
size=size.toLowerCase();if(!size.contains('x')||size.indexOf('x')!==size.lastIndexOf('x')){return false;}
const width=size.substring(0,size.indexOf('x'));const height=size.substring(size.indexOf('x')+1,size.length);const isValid=!(height.startsWith('0')||width.startsWith('0')||!onlyDecimals.test(width+height));return isValid;}}};function extractValue(obj){var value=obj.object[obj.property];const type=(Array.isArray(value))?'array':typeof value;if(type!==obj.expectedType){if(type!=='undefined'){var msg='Expected the '+obj.objectName+'s '+obj.property+' member to be a '+obj.expectedType;console.warn(msg);}
value=undefined;}
return value;}
exports.WebManifestHelper={getManifest:getManifest,processRawManifest:processRawManifest};})(window);;'use strict';(function IconsHelper(exports){const ICON_CACHE_PERIOD=24*60*60*1000;const FETCH_XHR_TIMEOUT=10000;const DEBUG=false;var dataStore=null;function getDefaultIconSize(){var dpr=window.devicePixelRatio;return(dpr&&dpr>1)?142:84;}
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
exports.IconsHelper={getIcon:getIcon,getIconBlob:getIconBlob,setElementIcon:setElementIcon,getBestIconFromWebManifest:getBestIconFromWebManifest,getBestIconFromMetaTags:getBestIconFromMetaTags,fetchIcon:fetchIcon,fetchIconBlob:fetchIconBlob,get defaultIconSize(){return getDefaultIconSize();},clear:clear,getNearestSize:getNearestSize,};})(window);;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;'use strict';(function(exports){const SHADOW_BLUR=1;const SHADOW_OFFSET_Y=1;const SHADOW_OFFSET_X=1;const SHADOW_COLOR='rgba(0, 0, 0, 0.2)';const DEFAULT_BACKGROUND_COLOR='rgb(228, 234, 238)';const UNSCALED_CANVAS_PADDING=2;const CANVAS_PADDING=UNSCALED_CANVAS_PADDING*devicePixelRatio;function IconRenderer(icon){this._icon=icon;}
IconRenderer.TYPE={CLIP:'clip',FAVICON:'favicon',STANDARD:'standard',};IconRenderer.prototype={unscaledCanvasPadding:UNSCALED_CANVAS_PADDING*2,get _maxSize(){return this._icon.grid.layout.gridMaxIconSize;},_createCanvas:function(){const CANVAS_PADDING_BOTTOM=1*devicePixelRatio;var canvas=document.createElement('canvas');canvas.width=this._maxSize+(CANVAS_PADDING*2);canvas.height=this._maxSize+CANVAS_PADDING+CANVAS_PADDING_BOTTOM;return canvas;},_createClipCanvas:function(){var canvas=document.createElement('canvas');canvas.width=this._maxSize+(CANVAS_PADDING*2);canvas.height=this._maxSize+(CANVAS_PADDING*2);return canvas;},_decorateShadowCanvas:function(canvas){var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.shadowColor=SHADOW_COLOR;ctx.shadowBlur=SHADOW_BLUR;ctx.shadowOffsetY=SHADOW_OFFSET_Y;ctx.shadowOffsetX=SHADOW_OFFSET_X;return ctx;},clip:function(img){return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);var clipCanvas=this._createClipCanvas();var clipCtx=clipCanvas.getContext('2d',{willReadFrequently:true});clipCtx.beginPath();clipCtx.arc(clipCanvas.width/2,clipCanvas.height/2,clipCanvas.height/2,0,2*Math.PI);clipCtx.clip();clipCtx.drawImage(img,0,0,clipCanvas.width,clipCanvas.height);shadowCtx.drawImage(clipCanvas,CANVAS_PADDING,CANVAS_PADDING,this._maxSize,this._maxSize);shadowCanvas.toBlob(resolve);});},favicon:function(img){if(img.width>this._icon.grid.layout.gridIconSize/2){return this.clip(img);}
return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);var iconWidth;var iconHeight;shadowCtx.beginPath();shadowCtx.arc(shadowCanvas.width/2,shadowCanvas.height/2,shadowCanvas.height/2-CANVAS_PADDING,0,2*Math.PI,false);shadowCtx.fillStyle=DEFAULT_BACKGROUND_COLOR;shadowCtx.fill();iconWidth=iconHeight=this._maxSize*0.55;shadowCtx.shadowBlur=0;shadowCtx.shadowOffsetY=0;shadowCtx.mozImageSmoothingEnabled=false;shadowCtx.drawImage(img,(shadowCanvas.width-iconWidth)/2,(shadowCanvas.height-iconHeight)/2,iconWidth,iconHeight);shadowCanvas.toBlob(resolve);});},standard:function(img){return new Promise((resolve)=>{var shadowCanvas=this._createCanvas();var shadowCtx=this._decorateShadowCanvas(shadowCanvas);shadowCtx.drawImage(img,CANVAS_PADDING,CANVAS_PADDING,this._maxSize,this._maxSize);shadowCanvas.toBlob(resolve);});}};exports.GridIconRenderer=IconRenderer;}(window));;'use strict';(function(exports){const FETCH_XHR_TIMEOUT=10000;function fetchBlob(uri){return new Promise(function(accept,reject){var xhr=new XMLHttpRequest({mozAnon:true,mozSystem:true});xhr.open('GET',uri,true);xhr.responseType='blob';xhr.timeout=FETCH_XHR_TIMEOUT;xhr.send();xhr.onload=function(){var status=xhr.status;if(status!==0&&status!==200){reject(new Error('Got HTTP status '+status+' trying to load '+uri));return;}
accept(xhr.response);};xhr.onerror=xhr.ontimeout=function(){reject(new Error('Error while HTTP GET: ',uri));};});}
function Icon(elem,uri){this.elem=elem;this.uri=uri;}
Icon.prototype={get size(){return this._size||40;},set size(size){this._size=size||this.size;var style=this.elem.style;var sizeInRems=(this._size/10)+'rem';style.backgroundSize=style.width=style.height=sizeInRems;},render:function render(options){options=options||{};var uri=this.uri;this.size=options.size;if(!uri){return;}
fetchBlob(uri).then(function(blob){this.renderBlob(blob,options);}.bind(this));},renderBlob:function renderBlob(blob,options){options=options||{};var style=this.elem.style;this.size=options.size;var img=new Image();img.src=URL.createObjectURL(blob);var size=this.size;img.onload=()=>{var renderer=new GridIconRenderer({grid:{layout:{get gridIconSize(){return size;},get gridMaxIconSize(){return size*devicePixelRatio;}}}});var type=options.type||GridIconRenderer.TYPE.FAVICON;renderer[type](img).then((blob)=>{var url=URL.createObjectURL(blob);var imageUrl='url('+url+')';style.backgroundImage=imageUrl;if(options.onLoad){options.onLoad(blob);}});URL.revokeObjectURL(img.src);};img.onerror=()=>{if(options.onerror){options.onerror();}};}};exports.Icon=Icon;}(window));;'use strict';var BookmarkEditor={BOOKMARK_ICON_SIZE:60,APP_ICON_SIZE:60,init:function bookmarkEditor_show(options){this.data=options.data;this.onsaved=options.onsaved;this.oncancelled=options.oncancelled;var mode='add';BookmarksDatabase.get(this.data.url).then((function got(bookmark){if(bookmark){this.data=bookmark;mode='put';}
this._init(mode);}).bind(this),this._init.bind(this,mode));},_init:function bookmarkEditor_init(mode){this.mode=document.body.dataset.mode=mode;this.bookmarkTitle=document.getElementById('bookmark-title');this.bookmarkURL=document.getElementById('bookmark-url');this.bookmarkIcon=document.getElementById('bookmark-icon');this.header=document.getElementById('header');this.saveButton=document.getElementById('done-button');this.appInstallationSection=document.getElementById('app-installation');this.appIcon=document.getElementById('app-icon');this.appIconPlaceholder=document.getElementById('app-icon-placeholder');this.appNameText=document.getElementById('app-name');this.installAppButton=document.getElementById('install-app-button');this.header.addEventListener('action',this.close.bind(this));this.saveListener=this.save.bind(this);this.saveButton.addEventListener('click',this.saveListener);this.bookmarkTitle.value=this.data.name||'';this.bookmarkURL.textContent=this.data.url;this._renderIcon();if(this.data.manifestURL){this.manifestURL=this.data.manifestURL;this._fetchManifest(this.manifestURL);}
this._checkDoneButton();this.form=document.getElementById('bookmark-form');this.form.addEventListener('input',this._checkDoneButton.bind(this));this.form.addEventListener('submit',this._submit.bind(this));var touchstart='ontouchstart'in window?'touchstart':'mousedown';this.clearButton=document.getElementById('bookmark-title-clear');this.clearButton.addEventListener(touchstart,this._clearTitle.bind(this));if(mode==='put'){this._onEditMode();this.saveButton.setAttribute('data-l10n-id','done-action');}else{this.saveButton.setAttribute('data-l10n-id','add-action');}
window.dispatchEvent(new CustomEvent('lazyload',{detail:document.body}));},_renderIcon:function renderIcon(){var icon=new Icon(this.bookmarkIcon,this.data.icon);icon.render({'size':this.BOOKMARK_ICON_SIZE});},_renderAppIcon:function renderAppIcon(manifest,size){var iconURL=window.IconsHelper.getBestIconFromWebManifest(manifest,size);if(!iconURL){return;}
this.appIconListener=this._handleAppIconLoad.bind(this);this.appIcon.addEventListener('load',this.appIconListener);this.appIcon.setAttribute('src',iconURL);},_handleAppIconLoad:function _handleAppIconLoad(){this.appIconPlaceholder.classList.add('hidden');this.appIcon.classList.remove('hidden');this.appIcon.removeEventListener('load',this.appIconListener);},_fetchManifest:function bookmarkEditor_fetchManifest(manifestURL){var manifestPromise=window.WebManifestHelper.getManifest(manifestURL);manifestPromise.then((function(manifestData){if(manifestData){this.installAppButtonListener=this._installApp.bind(this);this.installAppButton.addEventListener('click',this.installAppButtonListener);this.appNameText.textContent=manifestData.short_name||manifestData.name;this.appInstallationSection.classList.remove('hidden');this._renderAppIcon(manifestData,manifestURL,this.APP_ICON_SIZE);}}).bind(this)).catch(function(error){console.error('Unable to get web manifest: '+error);});return manifestPromise;},_onEditMode:function bookmarkEditor_onEditMode(){this.saveButton.disabled=true;},close:function bookmarkEditor_close(){this.oncancelled();},_submit:function(event){event.preventDefault();if(!this.saveButton.disabled){this.save();}},_clearTitle:function bookmarkEditor_clearTitle(event){event.preventDefault();this.bookmarkTitle.value='';this._checkDoneButton();},_checkDoneButton:function bookmarkEditor_checkDoneButton(){var title=this.bookmarkTitle.value.trim();this.saveButton.disabled=title==='';},_installApp:function bookmarkEditor_installApp(){window.navigator.mozApps.install(this.manifestURL);},save:function bookmarkEditor_save(evt){this.saveButton.removeEventListener('click',this.saveListener);if(this.installAppButtonListener){this.installAppButton.removeEventListener('click',this.installAppButtonListener);}
var url=this.data.url.trim();if(UrlHelper.isNotURL(url)){this.oncancelled();return;}
this.data.name=this.bookmarkTitle.value;this.data.url=url;BookmarksDatabase[this.mode](this.data).then(this.onsaved.bind(this),this.close.bind(this));}};;'use strict';window.utils=window.utils||{};window.utils.status=(function(){var DISPLAYED_TIME=1500;var section,content;var timeoutID;function clearHideTimeout(){if(timeoutID===null){return;}
window.clearTimeout(timeoutID);timeoutID=null;}
function show(message,duration){clearHideTimeout();content.innerHTML='';if(typeof message==='string'){content.textContent=message;}else{try{content.appendChild(message);}catch(ex){console.error('DOMException: '+ex.message);}}
section.classList.remove('hidden');section.classList.add('onviewport');timeoutID=window.setTimeout(hide,duration||DISPLAYED_TIME);}
function animationEnd(evt){var eventName='status-showed';if(evt.animationName==='hide'){clearHideTimeout();section.classList.add('hidden');eventName='status-hidden';}
window.dispatchEvent(new CustomEvent(eventName));}
function hide(){section.classList.remove('onviewport');}
function destroy(){section.removeEventListener('animationend',animationEnd);document.body.removeChild(section);clearHideTimeout();section=content=null;}
function getPath(){return'/js/components/';}
function initialize(){if(section){return;}
section=document.createElement('section');var link=document.createElement('link');link.type='text/css';link.rel='stylesheet';link.href=getPath()+'status-behavior.css';document.head.appendChild(link);section.setAttribute('role','status');section.classList.add('hidden');content=document.createElement('p');section.appendChild(content);section.addEventListener('animationend',animationEnd);setTimeout(function append(){document.body.appendChild(section);});}
if(document.readyState==='complete'){initialize();}else{document.addEventListener('DOMContentLoaded',function loaded(){document.removeEventListener('DOMContentLoaded',loaded);initialize();});}
return{init:initialize,show:show,hide:hide,destroy:destroy,setDuration:function setDuration(time){DISPLAYED_TIME=time||DISPLAYED_TIME;}};})();;'use strict';var ActivityHandler={'save-bookmark':function ah_save(activity){BookmarkEditor.init({data:activity.source.data,onsaved:function onsaved(saved){window.addEventListener('status-hidden',function hidden(){window.removeEventListener('status-hidden',hidden);activity.postResult(saved?'saved':'updated');});var msg=saved?'added-to-home-screen-message':'updated-pinned-site';navigator.mozL10n.formatValue(msg).then(msg=>utils.status.show(msg));},oncancelled:function oncancelled(){activity.postError('cancelled');}});},'remove-bookmark':function ah_remove(activity){BookmarkRemover.init({id:activity.source.data.url,onremoved:function onremoved(){activity.postResult('removed');},oncancelled:function oncancelled(e){activity.postError(e);}});}};navigator.mozSetMessageHandler('activity',function onActivity(activity){var name=activity.source.name;switch(name){case'save-bookmark':case'remove-bookmark':if(activity.source.data.type==='url'){ActivityHandler[name](activity);}else{activity.postError('type not supported');}
break;default:activity.postError('name not supported');}});