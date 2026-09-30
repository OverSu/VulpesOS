;;;;;;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bridge=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var bridge=module.exports=self['bridge']||{};bridge['client']=require('../src/client');if((typeof define)[0]!='u')define([],()=>bridge);else self['bridge']=bridge;},{"../src/client":2}],2:[function(require,module,exports){'use strict';var createPort=require('./message/port-adaptors');var Emitter=require('./emitter');var message=require('./message');var uuid=require('./utils').uuid;module.exports=Client;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Client] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Client]${type} - "${arg1}"`,...args);}}[0];var env=constructor.name
function Client(service,endpoint,timeout){if(!(this instanceof Client))return new Client(service,endpoint,timeout);if(typeof service=='object'){endpoint=service.endpoint;timeout=service.timeout;service=service.service;}
this.id=uuid();this.service=service;this.timeout=timeout;this.endpoint=endpoint||this.endpoint;if(!this.endpoint)throw error(1);this.setPort(this.endpoint);this.pending=new Set();this.receiver=message.receiver(this.id).on('_push',this.onPush.bind(this));debug('initialized',service);}
Client.prototype={connect(){debug('connect');if(this.connected)return this.connected;debug('connecting...',this.service);var mc=new MessageChannel();this.channel=mc.port1;this.channel.start();var data={clientId:this.id,service:this.service,originEnv:env};return this.connected=this.message('_connect').set('transfer',[mc.port2]).set('data',data).listen(mc.port1).send().then(response=>{debug('connected',response);var usingChannel=response.event.target===this.channel;if(usingChannel)this.setPort(this.channel);else{this.channel.close();delete this.channel;}
this.receiver.listen(this.port);}).catch(err=>{var msg=err&&err.message;if(msg=='timeout'){err=error(2,this.service);console.error(err.message);}
throw err;});},disconnect(options){if(!this.connected)return Promise.resolve();debug('disconnecting ...');var config={noRespond:options&&options.noRespond,data:this.id};this.cancelPending();return this.message('_disconnect').set(config).send().then(()=>this.onDisconnected());},method(name,...args){return this.connect().then(()=>{debug('method',name);return this.message('_method').set({recipient:this.service,data:{name:name,args:args}}).send();}).then(response=>response.value).catch(err=>{var msg=err&&err.message;if(msg=='timeout'){err=error(3,name);console.error(err.message);}
throw err;});},plugin(fn){fn(this,{'Emitter':Emitter,'uuid':uuid});return this;},message(type){debug('create message',type);var msg=message(type).set('port',this.port).set('timeout',this.timeout).on('response',()=>this.pending.delete(msg)).on('cancel',()=>this.pending.delete(msg));this.pending.add(msg);return msg;},cancelPending(){debug('cancel pending');this.pending.forEach(msg=>{msg.cancel();});this.pending.clear();},pendingResponded(){var responded=[];this.pending.forEach(msg=>responded.push(msg.responded));return Promise.all(responded);},onPush(message){debug('on push',message.data);this._emit(message.data.type,message.data.data);},onDisconnected(){delete this.connected;this.pendingResponded().then(()=>{debug('disconnected');if(this.channel)this.channel.close();this._emit('disconnected');});},setPort(endpoint){debug('set port');this.port=createPort(endpoint);},destroy:function(){return this.disconnect().then(()=>{if(this.destroyed)return;debug('destroy');this.destroyed=true;this.receiver.destroy();this._off();this.port=this.endpoint=this.receiver=null;});},_on:Emitter.prototype.on,_off:Emitter.prototype.off,_emit:Emitter.prototype.emit};Client.prototype.on=function(name,fn){this.connect().then(()=>{debug('bind on',name);Emitter.prototype.on.call(this,name,fn);this.message('_on').set('noRespond',true).set('data',{name:name,clientId:this.id}).send(this.port);});return this;};Client.prototype.off=function(name,fn){this.connect().then(()=>{Emitter.prototype.off.call(this,name,fn);this.message('_off').set('noRespond',true).set('data',{name:name,clientId:this.id}).send(this.port);});return this;};function error(id,...args){var help='Either the target endpoint is not alive or the Service is not `.listen()`ing.';return new Error({1:'an endpoint must be defined',2:`Unable to establish a connection with "${args[0]}". ${help}`,3:`Method "${args[0]}" didn't get a response. ${help}`}[id]);}},{"./emitter":3,"./message":4,"./message/port-adaptors":5,"./utils":6}],3:[function(require,module,exports){'use strict';module.exports=Emitter;var debug=0?console.log.bind(console,'[Emitter]'):()=>{};function Emitter(host){if(host)return Object.assign(host,Emitter.prototype);}
Emitter.prototype={on:function(type,callback){debug('on',type,callback);if(!this._callbacks)this._callbacks={};if(!this._callbacks[type])this._callbacks[type]=[];this._callbacks[type].push(callback);return this;},off:function(type,callback){debug('off',type,callback);if(this._callbacks){switch(arguments.length){case 0:this._callbacks={};break;case 1:delete this._callbacks[type];break;default:var typeListeners=this._callbacks[type];if(!typeListeners)return;var i=typeListeners.indexOf(callback);if(~i)typeListeners.splice(i,1);}}
return this;},emit:function(type,data){debug('emit',type,data);if(this._callbacks){var fns=this._callbacks[type]||[];fns=fns.concat(this._callbacks['*']||[]);for(var i=0;i<fns.length;i++)fns[i].call(this,data,type);}
return this;}};var p=Emitter.prototype;p['off']=p.off;p['on']=p.on;},{}],4:[function(require,module,exports){'use strict';var createPort=require('./port-adaptors');var Emitter=require('../emitter');var utils=require('../utils');var defer=utils.deferred;var uuid=utils.uuid;exports=module.exports=type=>new Message(type);exports.receiver=(id,n)=>new Receiver(id,n);exports.Receiver=Receiver;exports.Message=Message;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Message] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Message]${type} - "${arg1}"`,...args);}}[0];var TIMEOUT=1000;function Message(type){this.cancelled=false;this.listeners=[];this.deferred=defer();this.onMessage=this.onMessage.bind(this);this.onTimeout=this.onTimeout.bind(this);if(typeof type==='object')this.setupInbound(type);else this.setupOutbound(type);debug('initialized',type);}
Message.prototype={setupOutbound(type){this.id=uuid();this.type=type;this.sent=false;this.recipient='*';},setupInbound(e){debug('inbound');this.hasResponded=false;this.setSourcePort(e.source||e.target);this.event=e;Object.assign(this,e.data);},setSourcePort(endpoint){debug('set source',endpoint.constructor.name);this.sourcePort=createPort(endpoint,{ready:true});return this;},set(key,value){debug('set',key,value);if(typeof key=='object')Object.assign(this,key);else this[key]=value;return this;},serialize(){return{id:this.id,type:this.type,data:this.data,recipient:this.recipient,noRespond:this.noRespond};},preventDefault(){debug('prevent default');this.defaultPrevented=true;},send(endpoint){debug('send',this.type);if(this.sent)throw error(1);var serialized=this.serialize();var expectsResponse=!this.noRespond;this.port=endpoint?createPort(endpoint):this.port;if(!this.port)throw error(3);if(expectsResponse){this.listen(this.port);this.setResponseTimeout();}else this.deferred.resolve();this.port.postMessage(serialized,this.getTransfer());debug('sent',serialized);return this.deferred.promise;},setResponseTimeout(){if(this.timeout===false)return;var ms=this.timeout||TIMEOUT;this._timer=setTimeout(this.onTimeout,ms);},clearResponseTimeout(){clearTimeout(this._timer);},getTransfer(){return this.transfer||this.event&&this.event.ports;},onMessage(e){var valid=!!e.data.response&&e.data.id===this.id&&!this.cancelled;if(valid)this.onResponse(e);},onTimeout(){debug('response timeout',this.type);if(!this.silentTimeout)this.deferred.reject(error(4));this.teardown();},listen(thing){debug('add response listener',thing);var port=createPort(thing);port.addListener(this.onMessage);this.listeners.push(port);return this;},unlisten(){debug('remove response listeners');this.listeners.forEach(port=>port.removeListener(this.onMessage));this.listeners=[];},cancel(){this.teardown();this.cancelled=true;this.emit('cancel');},teardown(){this.clearResponseTimeout();this.unlisten();},respond(result){debug('respond',result);if(this.hasResponded)throw error(2);if(!this.sourcePort)return;if(this.noRespond)return;var self=this;this.hasResponded=true;if(result instanceof Error)reject(result);Promise.resolve(result).then(resolve,reject).catch(reject);function resolve(value){debug('resolve',value);respond({type:'resolve',value:value});}
function reject(err){var msg=err&&err.message||err;debug('reject',msg);respond({type:'reject',value:msg});}
function respond(response){self.response=response;self.sourcePort.postMessage({id:self.id,response:response},self.transfer);debug('responded with:',response);}},forward(endpoint){debug('forward');return this.set('silentTimeout',true).send(endpoint).then(result=>this.respond(result.value));},onResponse(e){debug('on response',e.data);var response=e.data.response;var type=response.type;var value=type=='reject'?response.value:response;response.event=e;this.response=response;this.teardown();this.deferred[this.response.type](value);this.emit('response',response);}};Emitter(Message.prototype);function Receiver(name){this.name=name;this.ports=new Set();this.onMessage=this.onMessage.bind(this);this['listen']=this['listen'].bind(this);this['unlisten']=this['unlisten'].bind(this);debug('receiver initialized',name);}
Receiver.prototype={listen(thing){debug('listen');var _port=createPort(thing||self,{receiver:true});if(this.ports.has(_port))return;_port.addListener(this.onMessage,this.listen);this.ports.add(_port);return this;},unlisten(){debug('unlisten');this.ports.forEach(port=>{port.removeListener(this.onMessage,this.unlisten);});},onMessage(e){if(!e.data.id)return;if(!e.data.type)return;if(!this.isRecipient(e.data.recipient))return;debug('receiver on message',e.data);var message=new Message(e);this.emit('message',message);if(message.defaultPrevented)return;try{this.emit(message.type,message);}
catch(e){message.respond(e);throw e;}},isRecipient(recipient){return recipient==this.name||recipient=='*'||this.name=='*';},destroy:function(){this.unlisten();delete this.name;return this;}};Emitter(Receiver.prototype);function error(id,...args){return new Error({1:'.send() can only be called once',2:'response already sent for this message',3:'a port must be defined',4:'timeout'}[id]);}},{"../emitter":3,"../utils":6,"./port-adaptors":5}],5:[function(require,module,exports){'use strict';var deferred=require('../utils').deferred;const MSG='message';var debug=0?function(arg1,...args){var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[PortAdaptor]${type} - "${arg1}"`,...args);}:()=>{};module.exports=function create(target,options){if(!target)throw error(1);if(isEndpoint(target))return target;var type=target.constructor.name;var CustomAdaptor=adaptors[type];debug('creating port adaptor for',type);if(CustomAdaptor)return CustomAdaptor(target,options);return new PortAdaptor(target,options);};function PortAdaptor(target){debug('PortAdaptor');this.target=target;}
var PortAdaptorProto=PortAdaptor.prototype={constructor:PortAdaptor,addListener(callback){on(this.target,MSG,callback);},removeListener(callback){off(this.target,MSG,callback);},postMessage(data,transfer){this.target.postMessage(data,transfer);}};var adaptors={'HTMLIFrameElement':function(iframe){debug('HTMLIFrameElement');var ready=windowReady(iframe);return{addListener(callback,listen){on(window,MSG,callback);},removeListener(callback,listen){off(window,MSG,callback);},postMessage(data,transfer){ready.then(()=>postMessageSync(iframe.contentWindow,data,transfer));}};},'BroadcastChannel':function(channel,options){debug('BroadcastChannel',channel.name);var receiver=options&&options.receiver;var ready=options&&options.ready;var sendReady=()=>{channel.postMessage('ready');debug('sent ready');};ready=ready||receiver?Promise.resolve():setupSender();if(receiver){sendReady();on(channel,MSG,e=>{if(e.data!='ready?')return;sendReady();});}
function setupSender(){debug('setup sender');var promise=deferred();channel.postMessage('ready?');on(channel,MSG,function fn(e){if(e.data!='ready')return;off(channel,MSG,fn);debug('BroadcastChannel: ready');promise.resolve();});return promise.promise;}
return{target:channel,addListener:PortAdaptorProto.addListener,removeListener:PortAdaptorProto.removeListener,postMessage(data,transfer){ready.then(()=>channel.postMessage(data,transfer));}};},'Window':function(win,options){debug('Window');var ready=options&&options.ready||win===parent||win===self;ready=ready?Promise.resolve():windowReady(win);return{addListener(callback,listen){on(window,MSG,callback);},removeListener(callback,listen){off(window,MSG,callback);},postMessage(data,transfer){ready.then(()=>postMessageSync(win,data,transfer));}};},'SharedWorker':function(worker){worker.port.start();return new PortAdaptor(worker.port);},'SharedWorkerGlobalScope':function(){var ports=[];return{postMessage(){},addListener(callback,listen){this.onconnect=e=>{var port=e.ports[0];ports.push(port);port.start();listen(port);};on(self,'connect',this.onconnect);},removeListener(callback,unlisten){off(self,'connect',this.onconnect);ports.forEach(port=>{port.close();unlisten(port);});}};}};var windowReady=(function(){if(typeof window=='undefined')return;var parent=window.opener||window.parent;var domReady='DOMContentLoaded';var windows=new WeakSet();if(parent!=self){on(window,domReady,function fn(){off(window,domReady,fn);postMessageSync(parent,'load');});}
on(self,'message',e=>e.data=='load'&&windows.add(e.source));return target=>{var win=target.contentWindow||target;if(windows.has(win))return Promise.resolve();if(win==window.parent)return Promise.resolve();var def=deferred();debug('waiting for Window to be ready ...');on(window,'message',function fn(e){if(e.data=='load'&&e.source==win){debug('Window ready');off(window,'message',fn);def.resolve();}});return def.promise;};})();function isEndpoint(thing){return!!(thing&&thing.addListener);}
function on(target,name,fn){target.addEventListener(name,fn);}
function off(target,name,fn){target.removeEventListener(name,fn);}
function postMessageSync(win,data,transfer){try{void win.document;}catch(_){win.postMessage(data,location.origin,transfer||[]);return;}var event={data:data,source:self};if(transfer)event.ports=transfer;win.dispatchEvent(new MessageEvent('message',event));}
function error(id){return new Error({1:'target is undefined'}[id]);}},{"../utils":6}],6:[function(require,module,exports){'use strict';exports.uuid=function(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16);});};exports.deferred=function(){var promise={};promise.promise=new Promise((resolve,reject)=>{promise.resolve=resolve;promise.reject=reject;});return promise;};},{}]},{},[1])(1)});;;;;;;;;;var _createClass=(function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};})();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function');}}
(function(){'use strict';const Client=bridge.client;const channel=new BroadcastChannel('l20n-channel');const observerConfig={attributes:true,characterData:false,childList:true,subtree:true,attributeFilter:['data-l10n-id','data-l10n-args']};const observers=new WeakMap();function initMutationObserver(view){observers.set(view,{roots:new Set(),observer:new MutationObserver(mutations=>translateMutations(view,mutations))});}
function translateRoots(view){return Promise.all([...observers.get(view).roots].map(root=>_translateFragment(view,root)));}
function observe(view,root){const obs=observers.get(view);if(obs){obs.roots.add(root);obs.observer.observe(root,observerConfig);}}
function disconnect(view,root,allRoots){const obs=observers.get(view);if(obs){obs.observer.disconnect();if(allRoots){return;}
obs.roots.delete(root);obs.roots.forEach(other=>obs.observer.observe(other,observerConfig));}}
function reconnect(view){const obs=observers.get(view);if(obs){obs.roots.forEach(root=>obs.observer.observe(root,observerConfig));}}
const reOverlay=/<|&#?\w+;/;const allowed={elements:['a','em','strong','small','s','cite','q','dfn','abbr','data','time','code','var','samp','kbd','sub','sup','i','b','u','mark','ruby','rt','rp','bdi','bdo','span','br','wbr'],attributes:{global:['title','aria-label','aria-valuetext','aria-moz-hint'],a:['download'],area:['download','alt'],input:['alt','placeholder'],menuitem:['label'],menu:['label'],optgroup:['label'],option:['label'],track:['label'],img:['alt'],textarea:['placeholder'],th:['abbr']}};function overlayElement(element,translation){const value=translation.value;if(typeof value==='string'){if(!reOverlay.test(value)){element.textContent=value;}else{const tmpl=element.ownerDocument.createElement('template');tmpl.innerHTML=value;overlay(element,tmpl.content);}}
for(let key in translation.attrs){const attrName=camelCaseToDashed(key);if(isAttrAllowed({name:attrName},element)){element.setAttribute(attrName,translation.attrs[key]);}}}
function overlay(sourceElement,translationElement){const result=translationElement.ownerDocument.createDocumentFragment();let k,attr;let childElement;while(childElement=translationElement.childNodes[0]){translationElement.removeChild(childElement);if(childElement.nodeType===childElement.TEXT_NODE){result.appendChild(childElement);continue;}
const index=getIndexOfType(childElement);const sourceChild=getNthElementOfType(sourceElement,childElement,index);if(sourceChild){overlay(sourceChild,childElement);result.appendChild(sourceChild);continue;}
if(isElementAllowed(childElement)){const sanitizedChild=childElement.ownerDocument.createElement(childElement.nodeName);overlay(sanitizedChild,childElement);result.appendChild(sanitizedChild);continue;}
result.appendChild(translationElement.ownerDocument.createTextNode(childElement.textContent));}
sourceElement.textContent='';sourceElement.appendChild(result);if(translationElement.attributes){for(k=0,attr;attr=translationElement.attributes[k];k++){if(isAttrAllowed(attr,sourceElement)){sourceElement.setAttribute(attr.name,attr.value);}}}}
function isElementAllowed(element){return allowed.elements.indexOf(element.tagName.toLowerCase())!==-1;}
function isAttrAllowed(attr,element){const attrName=attr.name.toLowerCase();const tagName=element.tagName.toLowerCase();if(allowed.attributes.global.indexOf(attrName)!==-1){return true;}
if(!allowed.attributes[tagName]){return false;}
if(allowed.attributes[tagName].indexOf(attrName)!==-1){return true;}
if(tagName==='input'&&attrName==='value'){const type=element.type.toLowerCase();if(type==='submit'||type==='button'||type==='reset'){return true;}}
return false;}
function getNthElementOfType(context,element,index){let nthOfType=0;for(let i=0,child;child=context.children[i];i++){if(child.nodeType===child.ELEMENT_NODE&&child.tagName===element.tagName){if(nthOfType===index){return child;}
nthOfType++;}}
return null;}
function getIndexOfType(element){let index=0;let child;while(child=element.previousElementSibling){if(child.tagName===element.tagName){index++;}}
return index;}
function camelCaseToDashed(string){if(string==='ariaValueText'){return'aria-valuetext';}
return string.replace(/[A-Z]/g,function(match){return'-'+match.toLowerCase();}).replace(/^-/,'');}
const reHtml=/[&<>]/g;const htmlEntities={'&':'&amp;','<':'&lt;','>':'&gt;'};function setAttributes(element,id,args){element.setAttribute('data-l10n-id',id);if(args){element.setAttribute('data-l10n-args',JSON.stringify(args));}}
function getAttributes(element){return{id:element.getAttribute('data-l10n-id'),args:JSON.parse(element.getAttribute('data-l10n-args'))};}
function getTranslatables(element){const nodes=Array.from(element.querySelectorAll('[data-l10n-id]'));if(typeof element.hasAttribute==='function'&&element.hasAttribute('data-l10n-id')){nodes.push(element);}
return nodes;}
function translateMutations(view,mutations){const targets=new Set();for(let mutation of mutations){switch(mutation.type){case'attributes':targets.add(mutation.target);break;case'childList':for(let addedNode of mutation.addedNodes){if(addedNode.nodeType===addedNode.ELEMENT_NODE){if(addedNode.childElementCount){getTranslatables(addedNode).forEach(targets.add.bind(targets));}else{if(addedNode.hasAttribute('data-l10n-id')){targets.add(addedNode);}}}}
break;}}
if(targets.size===0){return;}
translateElements(view,Array.from(targets));}
function _translateFragment(view,frag){return translateElements(view,getTranslatables(frag));}
function getElementsTranslation(view,elems){const keys=elems.map(elem=>{const id=elem.getAttribute('data-l10n-id');const args=elem.getAttribute('data-l10n-args');return args?[id,JSON.parse(args.replace(reHtml,match=>htmlEntities[match]))]:id;});return view.formatEntities(...keys);}
function translateElements(view,elements){return getElementsTranslation(view,elements).then(translations=>applyTranslations(view,elements,translations));}
function applyTranslations(view,elems,translations){disconnect(view,null,true);for(let i=0;i<elems.length;i++){overlayElement(elems[i],translations[i]);}
reconnect(view);}
if(typeof NodeList==='function'&&!NodeList.prototype[Symbol.iterator]){NodeList.prototype[Symbol.iterator]=Array.prototype[Symbol.iterator];}
function documentReady(){if(document.readyState!=='loading'){return Promise.resolve();}
return new Promise(resolve=>{document.addEventListener('readystatechange',function onrsc(){document.removeEventListener('readystatechange',onrsc);resolve();});});}
function getDirection(code){const tag=code.split('-')[0];return['ar','he','fa','ps','ur'].indexOf(tag)>=0?'rtl':'ltr';}
if(navigator.languages===undefined){navigator.languages=[navigator.language];}
function getResourceLinks(head){return Array.prototype.map.call(head.querySelectorAll('link[rel="localization"]'),el=>el.getAttribute('href'));}
function getMeta(head){let availableLangs=Object.create(null);let defaultLang=null;let appVersion=null;const metas=Array.from(head.querySelectorAll('meta[name="availableLanguages"],'+'meta[name="defaultLanguage"],'+'meta[name="appVersion"]'));for(let meta of metas){const name=meta.getAttribute('name');const content=meta.getAttribute('content').trim();switch(name){case'availableLanguages':availableLangs=getLangRevisionMap(availableLangs,content);break;case'defaultLanguage':const[lang,rev]=getLangRevisionTuple(content);defaultLang=lang;if(!(lang in availableLangs)){availableLangs[lang]=rev;}
break;case'appVersion':appVersion=content;}}
return{defaultLang,availableLangs,appVersion};}
function getLangRevisionMap(seq,str){return str.split(',').reduce((seq,cur)=>{const[lang,rev]=getLangRevisionTuple(cur);seq[lang]=rev;return seq;},seq);}
function getLangRevisionTuple(str){const[lang,rev]=str.trim().split(':');return[lang,parseInt(rev)];}
const viewProps=new WeakMap();let View=(function(){function View(client,doc){_classCallCheck(this,View);this.pseudo={'fr-x-psaccent':createPseudo(this,'fr-x-psaccent'),'ar-x-psbidi':createPseudo(this,'ar-x-psbidi')};const initialized=documentReady().then(()=>init(this,client));this._interactive=initialized.then(()=>client);this.ready=initialized.then(langs=>translateView(this,langs));initMutationObserver(this);viewProps.set(this,{doc:doc,ready:false});client.on('languageschangerequest',requestedLangs=>this.requestLanguages(requestedLangs));}
_createClass(View,[{key:'requestLanguages',value:function requestLanguages(requestedLangs,isGlobal){const method=isGlobal?client=>client.method('requestLanguages',requestedLangs):client=>changeLanguages(this,client,requestedLangs);return this._interactive.then(method);}},{key:'handleEvent',value:function handleEvent(){return this.requestLanguages(navigator.languages);}},{key:'formatEntities',value:function formatEntities(...keys){return this._interactive.then(client=>client.method('formatEntities',client.id,keys));}},{key:'formatValue',value:function formatValue(id,args){return this._interactive.then(client=>client.method('formatValues',client.id,[[id,args]])).then(values=>values[0]);}},{key:'formatValues',value:function formatValues(...keys){return this._interactive.then(client=>client.method('formatValues',client.id,keys));}},{key:'translateFragment',value:function translateFragment(frag){return _translateFragment(this,frag);}},{key:'observeRoot',value:function observeRoot(root){observe(this,root);}},{key:'disconnectRoot',value:function disconnectRoot(root){disconnect(this,root);}}]);return View;})();View.prototype.setAttributes=setAttributes;View.prototype.getAttributes=getAttributes;function createPseudo(view,code){return{getName:()=>view._interactive.then(client=>client.method('getName',code)),processString:str=>view._interactive.then(client=>client.method('processString',code,str))};}
function init(view,client){const doc=viewProps.get(view).doc;const resources=getResourceLinks(doc.head);const meta=getMeta(doc.head);view.observeRoot(doc.documentElement);return getAdditionalLanguages().then(additionalLangs=>client.method('registerView',client.id,resources,meta,additionalLangs,navigator.languages));}
function changeLanguages(view,client,requestedLangs){const doc=viewProps.get(view).doc;const meta=getMeta(doc.head);return getAdditionalLanguages().then(additionalLangs=>client.method('changeLanguages',client.id,meta,additionalLangs,requestedLangs)).then(({langs,haveChanged})=>haveChanged?translateView(view,langs):undefined);}
function getAdditionalLanguages(){if(navigator.mozApps&&navigator.mozApps.getAdditionalLanguages){return navigator.mozApps.getAdditionalLanguages().catch(()=>Object.create(null));}
return Promise.resolve(Object.create(null));}
function translateView(view,langs){const props=viewProps.get(view);const html=props.doc.documentElement;if(props.ready){return translateRoots(view).then(()=>setAllAndEmit(html,langs));}
const translated=langs[0].code===html.getAttribute('lang')?Promise.resolve():translateRoots(view).then(()=>setLangDir(html,langs));return translated.then(()=>{setLangs(html,langs);props.ready=true;});}
function setLangs(html,langs){const codes=langs.map(lang=>lang.code);html.setAttribute('langs',codes.join(' '));}
function setLangDir(html,langs){const code=langs[0].code;html.setAttribute('lang',code);html.setAttribute('dir',getDirection(code));}
function setAllAndEmit(html,langs){setLangDir(html,langs);setLangs(html,langs);html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));}
const client=new Client({service:'l20n',endpoint:channel,timeout:false});document.l10n=new View(client,document);window.addEventListener('pageshow',()=>client.connect());window.addEventListener('pagehide',()=>client.disconnect());window.addEventListener('languagechange',document.l10n);document.addEventListener('additionallanguageschange',document.l10n);navigator.mozL10n={setAttributes:document.l10n.setAttributes,getAttributes:document.l10n.getAttributes,formatValue:(...args)=>document.l10n.formatValue(...args),translateFragment:(...args)=>document.l10n.translateFragment(...args),once:cb=>document.l10n.ready.then(cb),ready:cb=>document.l10n.ready.then(()=>{document.addEventListener('DOMRetranslated',cb);cb();})};})();;;;;;;(function(global){'use strict';const helperCache=new Map();const knownObjects={datetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
return Intl.DateTimeFormat(navigator.languages,customOptions);},isAffected:function(obj,reason){if(['languagechange','moztimechange'].includes(reason)){return true;}
if(reason==='timeformatchange'){return'hour'in obj.options;}
return false;}},mozdatetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
return mozIntl.DateTimeFormat(navigator.languages,customOptions);},isAffected:function(obj,reason){if(['languagechange','moztimechange'].includes(reason)){return true;}
if(reason==='timeformatchange'){return'hour'in obj.options;}
return false;}},mozduration:{create:function(options){return mozIntl.DurationFormat(navigator.languages,options);},isAffected:function(obj,reason){return reason==='languagechange';}},number:{create:function(options){return Intl.NumberFormat(navigator.languages,options);},isAffected:function(obj,reason){return reason==='languagechange';}},collator:{create:function(options){return Intl.Collator(navigator.languages,options);},isAffected:function(obj,reason){return reason==='languagechange';}},};global.IntlHelper={define:function(name,type,options){if(!knownObjects.hasOwnProperty(type)){throw new Error('Unknown type: '+type);}
if(helperCache.has(name)){throw new Error('Intl Object with name "'+name+'" already exists');}
helperCache.set(name,{options,type,intlObject:undefined,listeners:new Set()});},get:function(name){if(!helperCache.has(name)){throw new Error('Intl Object with name "'+name+'" is not defined');}
const obj=helperCache.get(name);if(!knownObjects.hasOwnProperty(obj.type)){throw new Error('Unknown type: '+obj.type);}
if(obj.intlObject===undefined){obj.intlObject=knownObjects[obj.type].create(obj.options);}
return obj.intlObject;},observe:function(names,cb){if(typeof names==='string'){names=[names];}
for(var name of names){if(!helperCache.has(name)){throw new Error('Intl Object with name "'+name+'" is not defined');}
const obj=helperCache.get(name);obj.listeners.add(cb);}},unobserve:function(name,cb){const obj=helperCache.get(name);obj.listeners.delete(cb);},_fireObservers:function(affectedObjects,...args){const affectedCallbacks=new Set();affectedObjects.forEach(obj=>obj.listeners.forEach(cb=>affectedCallbacks.add(cb)));affectedCallbacks.forEach(cb=>{try{cb(...args);}catch(e){console.error('Error in callback: '+e.toString());console.error(e.stack);}});},handleEvent:function(evt){const affectedObjects=resetObjects(evt.type);if(evt.type==='languagechange'&&navigator.mozL10n){waitOnDOMLocalized(()=>global.IntlHelper._fireObservers(affectedObjects));}else{global.IntlHelper._fireObservers(affectedObjects);}},_resetObjectCache:function(){helperCache.clear();}};function waitOnDOMLocalized(cb){const resolver=()=>{document.removeEventListener('DOMRetranslated',resolver);window.removeEventListener('localized',resolver);cb();};document.addEventListener('DOMRetranslated',resolver,false);window.addEventListener('localized',resolver,false);}
function resetObjects(reason){const affectedObjects=new Set();helperCache.forEach((obj,name)=>{if(knownObjects[obj.type].isAffected(obj,reason)){obj.intlObject=undefined;affectedObjects.add(obj);}});return affectedObjects;}
window.addEventListener('timeformatchange',global.IntlHelper,false);window.addEventListener('languagechange',global.IntlHelper,false);window.addEventListener('moztimechange',global.IntlHelper,false);})(this);;;;;;(function(exports){'use strict';var debug=false;function log(str){if(!debug){return;}
console.log('🎶 ',str);}
var naive=false;var naiveExec=function(block){block();return Promise.resolve();};var directProtectionWindow=360;var Scheduler=function(){this._directTracking=new Map();this._ongoingTransitions=0;this._queuedTransitions=[];this._flushing=false;this._pendingMutations=[];};Scheduler.prototype={attachDirect:function(elm,evtType,block){var tracking=this._directTracking;if(!tracking.get(elm)){tracking.set(elm,{});}
var tElm=tracking.get(elm);if(!(evtType in tElm)){tElm[evtType]={rafID:null,protectionTimeout:null,blocks:[]};}
var tEvt=tElm[evtType];if(!tEvt.blocks.length){elm.addEventListener(evtType,this);}
tEvt.blocks.push(block);},detachDirect:function(elm,evtType,block){var tEvt=this._trackingFor(elm,evtType);if(!tEvt){return;}
if(tEvt.rafID){window.cancelAnimationFrame(tEvt.rafID);}
if(tEvt.protectionTimeout){clearTimeout(tEvt.protectionTimeout);tEvt.protectionTimeout=null;this._stopProtectingDirect();}
var toRemove=tEvt.blocks.indexOf(block);if(toRemove===-1){log('wrong detach block');return;}
tEvt.blocks.splice(toRemove,1);if(!tEvt.blocks.length){elm.removeEventListener(evtType,this);var tElm=this._directTracking.get(elm);delete tElm[evtType];if(Object.keys(tElm).length===0){this._directTracking.delete(elm);}}},_trackingFor:function(elm,evtType){var tracking=this._directTracking;if(!tracking.get(elm)){log('wrong detach element');return;}
var tElm=tracking.get(elm);if(!(evtType in tElm)){log('wrong detach event');return;}
return tElm[evtType];},_shouldProtectDirect:function(){var tracking=this._directTracking;for(var elm of tracking.keys()){var tElm=tracking.get(elm);for(var evtType in tElm){var tEvt=tElm[evtType];if(tEvt.protectionTimeout!==null){return true;}}}
return false;},_stopProtectingDirect:function(){this._dequeueTransitions();this._flushMutations();if(debug){console.timeEnd('protecting');}},handleEvent:function(evt){var tEvt=this._trackingFor(evt.currentTarget,evt.type);if(!tEvt){return;}
if(naive){tEvt.blocks.forEach(function(block){block(evt);});return;}
if(tEvt.protectionTimeout){clearTimeout(tEvt.protectionTimeout);}else{if(debug){console.time('protecting');}}
tEvt.protectionTimeout=setTimeout((function(){tEvt.protectionTimeout=null;this._stopProtectingDirect();}).bind(this),directProtectionWindow);if(tEvt.rafID){window.cancelAnimationFrame(tEvt.rafID);}
tEvt.rafID=window.requestAnimationFrame(function(){tEvt.blocks.forEach(function(block){var startDate;if(debug){startDate=performance.now();}
block(evt);if(debug){var blockDuration=performance.now()-startDate;if(blockDuration>16){log('Direct block took more than a frame ('+
blockDuration.toString()+'ms)');}}});});},feedback:function(block,elm,evt,timeout){return this._transition(block,true,elm,evt,timeout);},transition:function(block,elm,evt,timeout){return this._transition(block,false,elm,evt,timeout);},_transition:function(block,feedback,elm,evt,timeout){if(naive){return naiveExec(block);}
timeout=timeout||500;return new Promise((function(resolve,reject){var content=(function(){this._ongoingTransitions++;block();if(!elm||!evt){this._ongoingTransitions--;resolve();return;}
if(debug){console.time('animating');}
var finishTimeout;var done=(function(){clearTimeout(finishTimeout);elm.removeEventListener(evt,done);this._ongoingTransitions--;if(debug){console.timeEnd('animating');}
if(this._ongoingTransitions===0){setTimeout(this._flushMutations.bind(this));}
resolve();}).bind(this);elm.addEventListener(evt,done);finishTimeout=setTimeout(function(){done();log('Transition block saved by a timeout of '+timeout+' ~ '+
elm.style.transition);},timeout);}).bind(this);if(this._flushing||(this._shouldProtectDirect()&&!feedback)){this._queuedTransitions.push(content);}else{content();}}).bind(this));},_dequeueTransitions:function(){if(this._queuedTransitions.length===0){return;}
if(this._flushing||this._shouldProtectDirect()){return;}
var transitions=this._queuedTransitions;transitions.forEach(function(transition){transition();});this._queuedTransitions=[];},mutation:function(block){if(naive){return naiveExec(block);}
return new Promise((function(resolve,reject){if(this._shouldProtectDirect()||this._ongoingTransitions>0){this._pendingMutations.push({block:block,resolve:resolve});}else{Promise.resolve().then(block).then(resolve);}}).bind(this));},_flushMutations:function(){if(this._pendingMutations.length===0){return;}
if(this._shouldProtectDirect()||this._ongoingTransitions>0){return;}
this._flushing=true;var fulfilments=this._pendingMutations.map(function(obj){return obj.resolve;});var mutations=this._pendingMutations;mutations.forEach(function(mutation){mutation.block();});this._pendingMutations=[];this._flushing=false;fulfilments.forEach(function(resolve){resolve();});this._dequeueTransitions();}};exports.DomScheduler=Scheduler;if(!exports.scheduler||typeof exports.scheduler.mutation!=='function')Object.defineProperty(exports,'scheduler',{value:new Scheduler(),configurable:true,writable:true});})(window);;;;;;!(function(define){'use strict';define(function(require,exports,module){var debug=0?console.log.bind(console,'[FastList]'):function(){};var schedule=(window.scheduler&&typeof window.scheduler.mutation==="function"?window.scheduler:schedulerShim());exports=module.exports=FastList;exports.scheduler=schedule;function FastList(source){debug('initialize');this._scrollStopTimeout=null;this.source=source;this.els={itemContainer:source.itemContainer,container:source.container,list:source.list,sections:[],items:[],itemsInDOM:[]};this.geometry={topPosition:0,forward:true,busy:false,idle:true,hasScrolled:false,itemHeight:source.getItemHeight(),viewportHeight:0,maxItemCount:0,switchWindow:0};this.reorderingContext={item:null,initialY:null,identifier:null,moveUp:null,moveDown:null,};on(this.els.container,'click',this);on(window,'resize',this);if(!this.els.list)this.els.list=document.createElement('ul');if(!this.els.itemContainer)this.els.itemContainer=this.els.list;this.rendered=schedule.mutation(this.setupPhase1.bind(this));this.complete=this.rendered.then(this.setupPhase2.bind(this));}
FastList.prototype={PRERENDER_MULTIPLIER:3.5,setupPhase1:function(){debug('setup phase 1');var fragment=document.createDocumentFragment();var container=this.els.container;this.updateContainerGeometry();container.style.overflowX='hidden';container.style.overflowY='scroll';this.updateListHeight();if(!this.els.list.parentNode)container.appendChild(this.els.list);if(this.source.initialScrollTop){container.scrollTop=this.source.initialScrollTop;this.geometry.topPosition=container.scrollTop;}
this.updateSections({fragment:fragment});this.render({fragment:fragment,criticalOnly:true,skipDetail:true});this.els.itemContainer.appendChild(fragment);this.handleScroll=this.handleScroll.bind(this);schedule.attachDirect(this.els.container,'scroll',this.handleScroll);},setupPhase2:function(){return new Promise(function(resolve){setTimeout(function(){debug('setup phase 2');var fragment=document.createDocumentFragment();this.render({fragment:fragment});this.els.itemContainer.appendChild(fragment);resolve();}.bind(this),360);}.bind(this));},updateContainerGeometry:function(){var geo=this.geometry;var viewportHeight=this.getViewportHeight();var itemPerScreen=viewportHeight/geo.itemHeight;geo.viewportHeight=viewportHeight;geo.maxItemCount=Math.floor(itemPerScreen*this.PRERENDER_MULTIPLIER);geo.switchWindow=Math.floor(itemPerScreen/2);debug('maxItemCount: '+geo.maxItemCount);},getViewportHeight:function(){return this.source.getViewportHeight?this.source.getViewportHeight():this.els.container.offsetHeight;},processScrollPosition:function(instant){var position=this.els.container.scrollTop;var geo=this.geometry;if(!geo.hasScrolled){geo.topPosition=position;geo.hasScrolled=true;}
var viewportHeight=geo.viewportHeight;var previousTop=geo.topPosition;var delta=position-previousTop;geo.forward=isForward(geo.forward,delta);geo.topPosition=position;var onTop=geo.topPosition===0;var topReached=onTop&&previousTop!==0;var fullHeight=this.source.getFullHeight();var maxScrollTop=fullHeight-viewportHeight;var atBottom=geo.topPosition===maxScrollTop;if(topReached)this.emit('top-reached');if(onTop||atBottom||instant){geo.busy=false;geo.idle=true;return;}
var moved=Math.abs(delta);geo.busy=isBusy(geo.busy,moved,viewportHeight);geo.idle=isIdle(geo.idle,moved,viewportHeight);},render:function(options){debug('render');options=options||{};var changedIndex=options.changedIndex;var criticalOnly=options.criticalOnly;var skipDetail=options.skipDetail;var fragment=options.fragment;var reload=options.reload;var itemContainer=fragment||this.els.itemContainer;var itemsInDOM=this.els.itemsInDOM;var items=this.els.items;var source=this.source;var geo=this.geometry;var indices=computeIndices(this.source,this.geometry);var fullLength=source.getFullLength();var criticalStart=indices.cStart;var criticalEnd=indices.cEnd;var startIndex=indices.start;var endIndex=indices.end;var self=this;if(criticalOnly){startIndex=criticalStart;endIndex=criticalEnd;}
var recyclableItems=recycle(items,criticalStart,criticalEnd,geo.forward?endIndex:startIndex);if(fullLength){if(geo.forward){for(var i=startIndex;i<=endIndex;++i)renderItem(i);}else{for(var j=endIndex;j>=startIndex;--j)renderItem(j);}}
if(reload)cleanUpPrerenderedItems(items,source);function findItemFor(index){var item;if(recyclableItems.length>0){var recycleIndex=recyclableItems.pop();item=items[recycleIndex];delete items[recycleIndex];debug('found node to recycle',recycleIndex,recyclableItems);}else if(itemsInDOM.length<geo.maxItemCount){item=self.createItem();itemContainer.appendChild(item);itemsInDOM.push(item);}else{console.warn('missing a cell');return;}
items[index]=item;return item;}
function renderItem(i){var item=items[i];if(!item){item=findItemFor(i);self.unpopulateItemDetail(item);tryToPopulate(item,i,source,true);item.classList.toggle('new',i===changedIndex);}else if(reload){self.unpopulateItemDetail(item);source.populateItem(item,i);item.dataset.populated=true;if(item.style.display==='none'){item.style.removeProperty('display');}}
var section=source.getSectionFor(i);placeItem(item,i,section,geo,source,reload);if(skipDetail||!source.populateItemDetail)return;if(!geo.idle)return;if(item.dataset.detailPopulated==='true')return;var result=source.populateItemDetail(item,i);if(result!==false)item.dataset.detailPopulated=true;}
debugViewport(items,geo.forward,criticalStart,criticalEnd,startIndex,endIndex);},unpopulateItemDetail:function(item){var shouldUnpopulate=this.source.unpopulateItemDetail&&item.dataset.detailPopulated==='true';if(shouldUnpopulate){this.source.unpopulateItemDetail(item);item.dataset.detailPopulated=false;}},createItem:function(){var el=this.source.createItem();el.style.position='absolute';el.style.left=el.style.top=0;el.style.overflow='hidden';return el;},createSection:function(name){var el=this.source.createSection(name);el.classList.add('fl-section');return el;},reloadData:function(){return schedule.mutation(function(){this.updateSections();this.updateListHeight();this.render({reload:true});}.bind(this));},updateSections:function(options){debug('update sections');var fragment=(options&&options.fragment);var nodes=this.els.itemContainer.querySelectorAll('.fl-section');var items=fragment||document.createDocumentFragment();var source=this.source;for(var i=0;i<nodes.length;i++){var toRemove=nodes[i];toRemove.remove();}
var headerHeight=source.getSectionHeaderHeight();var sections=this.source.getSections();for(var j=0;j<sections.length;j++){var height=source.getFullSectionHeight(sections[j]);var el=this.createSection(sections[j]);el.style.height=headerHeight+height+'px';this.source.populateSection(el,sections[j],j);items.appendChild(el);}
if(!fragment)this.els.itemContainer.appendChild(items);},handleScroll:function(evt){clearTimeout(this._scrollStopTimeout);this.processScrollPosition();if(this.geometry.busy)debug('[x] ---------- faaaaassssstttt');else this.render();if(this.geometry.idle)return;var self=this;this._scrollStopTimeout=setTimeout(function(){self.processScrollPosition(true);self.render();},200);},updateListHeight:function(){this.els.list.style.height=this.source.getFullHeight()+'px';debug('updated list height',this.els.list.style.height);},get scrollTop(){return this.geometry.topPosition;},scrollInstantly:function(position){debug('scroll instantly',position);this.els.container.scrollTop=position;this.processScrollPosition(true);this.render();},insertedAtIndex:function(index){debug('inserted at index',index);if(index!==0){return;}
if(this.geometry.topPosition>this.geometry.itemHeight||this.editing){this._insertOnTop(true);return;}
var domItems=this.els.itemsInDOM;var list=this.els.itemContainer;list.classList.add('reordering');pushDown(domItems,this.geometry).then(this._insertOnTop.bind(this,false)).then(cleanInlineStyles.bind(null,domItems)).then(reveal.bind(null,list)).then(function(){list.classList.remove('reordering');});},_insertOnTop:function(keepScrollPosition){debug('insert on top',keepScrollPosition);return schedule.mutation((function(){this.els.items.unshift(null);delete this.els.items[0];this.updateSections();if(keepScrollPosition){var scrollTop=this.els.container.scrollTop;this.scrollInstantly(scrollTop+this.geometry.itemHeight);this.els.container.dispatchEvent(new CustomEvent('hidden-new-content'));}else{this.render({changedIndex:0});}
this.updateListHeight();}).bind(this));},handleEvent:function(evt){switch(evt.type){case'resize':this.updateContainerGeometry();break;case'click':if(this.editing){break;}
var li=evt.target;var index=this.els.items.indexOf(li);this.els.itemContainer.dispatchEvent(new CustomEvent('item-selected',{bubbles:true,detail:{index:index,clickEvt:evt,}}));break;}},plugin:function(fn){fn(this);return this;},emit:function(name,detail){var e=new CustomEvent(name,{bubbles:false,detail:detail});this.els.container.dispatchEvent(e);},destroy:function(){this.els.itemContainer.innerHTML='';schedule.detachDirect(this.els.container,'scroll',this.handleScroll);}};function debugViewport(items,forward,cStart,cEnd,start,end){if(!debug.name){return;}
var str='['+(forward?'v':'^')+']';for(var i=0;i<items.length;i++){if(i==start)str+='|';if(i==cStart)str+='[';if(items[i])str+='x';else str+='-';if(i==cEnd)str+=']';if(i==end)str+='|';}
debug(str);}
function computeIndices(source,geometry){debug('compute indices',geometry.topPosition);var criticalStart=source.getIndexAtPosition(geometry.topPosition);var criticalEnd=source.getIndexAtPosition(geometry.topPosition+
geometry.viewportHeight);var canPrerender=geometry.maxItemCount-
(criticalEnd-criticalStart)-1;var before=geometry.switchWindow;var after=canPrerender-before;var fullLength=source.getFullLength();var lastIndex=fullLength&&fullLength-1;var startIndex;var endIndex;var extra;if(geometry.forward){startIndex=criticalStart-before;endIndex=criticalEnd+after;}else{startIndex=criticalStart-after;endIndex=criticalEnd+before;}
if(startIndex<0){extra=-startIndex;startIndex=0;endIndex=Math.min(lastIndex,endIndex+extra);}
if(endIndex>lastIndex){extra=endIndex-lastIndex;endIndex=lastIndex;startIndex=Math.max(0,startIndex-extra);}
return{cStart:criticalStart,cEnd:criticalEnd,start:startIndex,end:endIndex};}
function recycle(items,start,end,action){debug('recycle',start,end,action);var recyclableItems=[];for(var i in items){if((i<start)||(i>end))recyclableItems.push(i);}
recyclableItems.sort(function(a,b){return Math.abs(a-action)-Math.abs(b-action);});return recyclableItems;}
function cleanUpPrerenderedItems(items,source){var fullLength=source.getFullLength();for(var i in items){if(i>=fullLength){var item=items[i];item.dataset.populated=false;item.style.display='none';}}}
function tryToPopulate(item,index,source,first){if(item.dataset.index!=index&&!first)return;var populateResult=source.populateItem(item,index);if(populateResult instanceof Promise){item.dataset.populated=false;populateResult.then(tryToPopulate.bind(null,item,index,source));return;}
if(first){item.dataset.populated=true;return;}
if(source.populateItemDetail&&item.dataset.detailPopulated!=='true'){source.populateItemDetail(item,index);item.dataset.detailPopulated=true;}
debug('revealing populated item');item.style.transition='opacity 0.2s linear';schedule.transition(function(){item.dataset.populated=true;},item,'transitionend').then(function(){debug('populated item revealed');item.style.transition='';});}
function placeItem(item,index,section,geometry,source,reload){if(item.dataset.index==index&&!reload){return;}
item.dataset.position=source.getPositionForIndex(index);item.dataset.index=index;item.dataset.section=section;var tweakedBy=item.dataset.tweakDelta;if(tweakedBy)tweakTransform(item,tweakedBy);else resetTransform(item);}
function resetTransform(item){var position=item.dataset.position;var transform='translateY('+position+'px)';style(item,'webkitTransform',transform);style(item,'transform',transform);}
function tweakTransform(item,delta){debug('tweak transform',item,delta);var position=~~item.dataset.position+~~delta;var transform='translateY('+position+'px)';style(item,'webkitTransform',transform);style(item,'transform',transform);item.dataset.tweakDelta=delta;}
function cleanInlineStyles(domItems){return schedule.mutation(function(){for(var i=0;i<domItems.length;i++){var item=domItems[i];item.style.transition='';item.style.webkitTransition='';resetTransform(item);}
domItems[0]&&domItems[0].scrollTop;});}
function pushDown(domItems,geometry){if(!domItems.length)return Promise.resolve();return schedule.transition(function(){for(var i=0;i<domItems.length;i++){var item=domItems[i];item.style.transition='transform 0.15s ease-in';item.style.webkitTransition='-webkit-transform 0.15s ease-in';tweakTransform(item,geometry.itemHeight);}},domItems[0],'transitionend');}
function reveal(list){var newEl=list.querySelector('li.new');return schedule.transition(function(){newEl.style.transition='opacity 0.25s ease-out';newEl.style.webkitTransition='opacity 0.25s ease-out';setTimeout(function(){newEl.classList.remove('new');});},newEl,'transitionend').then(function(){newEl.style.transition='';newEl.style.webkitTransition='';});}
function isBusy(wasBusy,moved,viewportHeight){if(!wasBusy&&moved>viewportHeight*2)return true;else if(wasBusy&&moved&&moved<viewportHeight/2)return false;else return wasBusy;}
function isIdle(wasIdle,moved,viewportHeight){if(!wasIdle&&moved&&moved<viewportHeight/16)return true;else if(wasIdle&&moved&&moved>viewportHeight/4)return false;else return wasIdle;}
function isForward(wasForward,delta){if(!delta)return wasForward;else return delta>0;}
function schedulerShim(){var raf=window.requestAnimationFrame;return{mutation:function(block){return Promise.resolve().then(block);},transition:function(block,el,event,timeout){block();return after(el,event,timeout||500);},feedback:function(block,el,event,timeout){block();return after(el,event,timeout||500);},attachDirect:function(el,event,fn){fn._raffed=function(e){raf(function(){fn(e);});};on(el,event,fn._raffed);},detachDirect:function(el,event,fn){off(el,event,fn._raffed);}};function after(target,event,timeout){return new Promise(function(resolve){var timer=timeout&&setTimeout(cb,timeout);on(target,event,cb);function cb(){off(target,event,cb);clearTimeout(timer);resolve();}});}}
function on(el,name,fn){el.addEventListener(name,fn);}
function off(el,name,fn){el.removeEventListener(name,fn);}
function style(el,key,value){if(el.style[key]!==value)el.style[key]=value;}});})((typeof define)[0]=='f'&&define.amd?define:(function(n,n2,w){return(typeof module)[0]=='o'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){w[n];},m.exports,m);w[n]=w[n2]=m.exports;};})('FastList','fast-list',this));;;;;;;(function(define){'use strict';define(function(require,exports,module){var debug=0?console.log.bind(console,'[poplar]'):function(){};var elements=new WeakMap();var regex={content:/>([^<]+)</g,var:/\$\{([^\}]+)\}/g,attrs:/(<[a-z\-]+ )(.+?)( ?\/>|>)/g,attr:/([a-z\-]+)="([^\"]+\$\{[^\"]+|\$[^"]+)"/g};module.exports=poplar;function poplar(html){return poplar.create(poplar.parse(html));}
poplar.parse=function(html){debug('parse',html);var formatted=html.replace(/\s*\n\s*/g,'').replace(/  +/g,'').replace(regex.attrs,function(match,start,content,end){var dynamic=[];var simple=content.replace(regex.attr,function(match,name,prop){dynamic.push(name+'='+encodeURIComponent(prop));return'';});if(!dynamic.length)return match;var dataBindAttrs=dynamic.join(' ');var tag=start+
simple+' data-poplar-attrs="'+dataBindAttrs+'"'+
end;return tag.replace(/  +/g,' ');}).replace(regex.content,function(m,content){return m.replace(regex.var,function(m,group){return'<span data-poplar-text="'+group+'"></span>';});});return elementify(formatted);};poplar.create=function(parent){debug('create');var el=parent.firstElementChild;elements.set(el,{textNodes:replaceTextPlaceholders(parent),attrs:replaceAttrPlaceholders(parent)});return el;};poplar.populate=function(el,data){debug('poplate',el,data);var bindings=elements.get(el);if(!bindings){debug('unknown element');return false;}
var textNodes=bindings.textNodes;var attrs=bindings.attrs;var i=textNodes.length;var j=attrs.length;while(i--){var node=textNodes[i].node;var newData=getProp(data,textNodes[i].key);if(node.data!==newData){node.data=newData;}}
while(j--){var item=attrs[j];var value=item.template?interpolate(item.template,data):getProp(data,item.prop);item.el.setAttribute(item.name,value);}
debug('populated');return true;};function interpolate(string,data){return string.replace(regex.var,function(match,group){return getProp(data,group);});}
function replaceTextPlaceholders(el){var placeholders=el.querySelectorAll('[data-poplar-text]');var i=placeholders.length;var result=[];while(i--){var node=document.createTextNode('');placeholders[i].parentNode.replaceChild(node,placeholders[i]);result.push({key:placeholders[i].dataset.poplarText,node:node});}
return result;}
function replaceAttrPlaceholders(el){var placeholders=el.querySelectorAll('[data-poplar-attrs]');var i=placeholders.length;var result=[];while(i--){var attrs=placeholders[i].dataset.poplarAttrs.split(' ');var j=attrs.length;while(j--){var parts=attrs[j].split('=');var value=decodeURIComponent(parts[1]);var attr={name:parts[0],el:placeholders[i]};if(isPartial(value))attr.template=value;else attr.prop=value.replace(regex.var,'$1');result.push(attr);}
placeholders[i].removeAttribute('data-poplar-attrs');}
return result;}
function isPartial(value){return!/^\$\{.+\}$/.test(value);}
function elementify(html){var div=document.createElement('div');div.innerHTML=html;return div;}
function getProp(object,path){if(!path)return;var parts=path.split('.');if(parts.length==1)return object[parts[0]];if(parts.length==2)return object[parts[0]][parts[1]];return(function getDeep(object,parts){var part=parts.shift();return parts.length?getDeep(object[part],parts):object[part];})(object,parts);}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('poplar',this));;;;;;;(function(define){'use strict';define(function(require,exports,module){var textContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');var innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');var removeAttribute=Element.prototype.removeAttribute;var setAttribute=Element.prototype.setAttribute;var noop=function(){};exports.register=function(name,props){var baseProto=getBaseProto(props.extends);var template=props.template||baseProto.templateString;var extensible=props.extensible=props.hasOwnProperty('extensible')?props.extensible:true;delete props.extends;if(template){if(extensible&&props.template){props.templateString=props.template;}
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
return target;}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));;;;;;;(function(define){define(function(require,exports,module){var component=require('gaia-component');var FastList=require('fast-list');var scheduler=FastList.scheduler;var poplar=require('poplar');require('gaia-sub-header');var isTouch='ontouchstart'in window;var touchcancel=isTouch?'touchcancel':'mousecancel';var touchstart=isTouch?'touchstart':'mousedown';var touchmove=isTouch?'touchmove':'mousemove';var touchend=isTouch?'touchend':'mouseup';var debug=0?(...args)=>console.log('[GaiaFastList]',...args):()=>{};var cachesOpen=caches.open('gfl');var keys={internal:Symbol(),first:Symbol(),img:Symbol()};var GaiaFastListProto={extensible:false,imageCacheSize:5e6,imageCacheLength:500,created(){debug('create');this.setupShadowRoot();this.caching=this.getAttribute('caching');this.offset=this.getAttribute('offset');this.picker=this.getAttribute('picker');this.bottom=this.getAttribute('bottom');this.top=this.getAttribute('top');this[keys.internal]=new Internal(this);},configure(props){debug('configure');this[keys.internal].configure(props);},setModel(value){return this[keys.internal].setModel(value);},cache(){debug('cache');if(!this.caching)return;this[keys.internal].cachedHeight=null;return this[keys.internal].updateCache();},clearCache(){debug('clear cache');this[keys.internal].clearCache();},scrollTo(y){return this[keys.internal].scrollTo(y);},destroy(){this[keys.internal].destroy();},attrs:{rendered:{get(){return this[keys.internal].rendered.promise;}},top:{get(){return this._top;},set(value){debug('set top',value);if(value==null)return;value=Number(value);if(value===this._top)return;this.setAttribute('top',value);this._top=value;}},bottom:{get(){return this._bottom;},set(value){debug('set bottom',value);if(value==null)return;value=Number(value);if(value===this._bottom)return;this.setAttribute('bottom',value);this._bottom=value;}},caching:{get(){return this._caching;},set(value){value=value||value==='';if(value===this._caching)return;if(value)this.setAttribute('caching','');else this.removeAttribute('caching');this._caching=value;}},offset:{get(){return this._offset||0;},set(value){if(value==this._offset)return;if(value)this.setAttribute('offset',value);else this.removeAttribute('offset');this._offset=Number(value);}},scrollTop:{get(){return this[keys.internal].getScrollTop();},set(value){this[keys.internal].setScrollTop(value);}},minScrollHeight:{get(){return this[keys.internal].list.style.minHeight;},set(value){this[keys.internal].list.style.minHeight=value;}},picker:{get(){return this._picker;},set(value){value=value||value==='';if(value===this._picker)return;if(value)this.setAttr('picker','');else this.removeAttr('picker');this._picker=value;}}},template:`
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
function Deferred(){this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}});})(typeof define=='function'&&define.amd?define:(function(n,w){return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('GaiaFastList',this));;;;;;;;;;var SERVICE_WORKERS=false;;;;;;;;window.View=(function(){'use strict';var debug=0?(...args)=>console.log('[View]',...args):()=>{};if(!SERVICE_WORKERS)(function(){window.ROUTES={'/api/activities/share/:filePath':'share','/api/albums/list':'getAlbums','/api/albums/info/:filePath':'getAlbum','/api/artists/list':'getArtists','/api/artists/info/:filePath':'getArtist','/api/artwork/original/:filePath':'getSongArtwork','/api/artwork/thumbnail/:filePath':'getSongThumbnail','/api/artwork/url/original/:filePath':'getSongArtworkURL','/api/artwork/url/thumbnail/:filePath':'getSongThumbnailURL','/api/audio/play':'play','/api/audio/pause':'pause','/api/audio/seek/:time':'seek','/api/audio/fastseek/start/:direction':'startFastSeek','/api/audio/fastseek/stop':'stopFastSeek','/api/audio/status':'getPlaybackStatus','/api/database/status':'getDatabaseStatus','/api/playlists/list':'getPlaylists','/api/playlists/info/:id':'getPlaylist','/api/queue/current':'currentSong','/api/queue/previous':'previousSong','/api/queue/next':'nextSong','/api/queue/album/:filePath':'queueAlbum','/api/queue/artist/:filePath':'queueArtist','/api/queue/playlist/:id/shuffle':'queuePlaylist','/api/queue/playlist/:id/song/:filePath':'queuePlaylist','/api/queue/song/:filePath':'queueSong','/api/queue/repeat/:repeat':'setRepeatSetting','/api/queue/shuffle/:shuffle':'setShuffleSetting','/api/songs/list':'getSongs','/api/songs/count':'getSongCount','/api/songs/info/:filePath':'getSong','/api/songs/rating/:rating/:filePath':'setSongRating','/api/search/:key/':'search','/api/search/:key/:query':'search'};for(var path in window.ROUTES){var method=window.ROUTES[path];window.ROUTES[path]=parseSimplePath(path);window.ROUTES[path].method=method;}})();function View(){this.client=bridge.client({service:'music-service',endpoint:window.parent,timeout:false});this.params={};var parts=window.parent.location.href.split('?');parts.shift();var query=parts.join('?');query.split('&').forEach((param)=>{var parts=param.split('=');this.params[parts[0]]=parts[1];});window.addEventListener('click',(evt)=>{var link=evt.target.closest('a');if(link){evt.preventDefault();this.client.method('navigate',link.getAttribute('href'));}});window.addEventListener('viewdestroy',()=>this.destroy());document.addEventListener('DOMRetranslated',()=>{this.title=document.title;});}
View.prototype.setupSearch=function(params){this.searchBox.addEventListener('search',(evt)=>this.search(evt.detail));this.searchResults.addEventListener('open',()=>{this.client.method('searchOpen');});this.searchResults.addEventListener('close',()=>{this.client.method('searchClose');this.list.scrollTop=this.searchBox.HEIGHT;});this.searchResults.addEventListener('resultclick',(evt)=>{var link=evt.detail;if(link){this.client.method('navigate',link.getAttribute('href'));}});this.searchResults.getItemImageSrc=(item)=>this.getThumbnail(item.name);};View.prototype.setupList=function(){this.list.minScrollHeight=`calc(100% + ${this.searchBox.HEIGHT}px)`;this.list.offset=this.searchBox.HEIGHT;this.list.configure({getItemImageSrc:(item)=>this.getThumbnail(item.name)});this.list.rendered.then(()=>document.body.hidden=false);this.list.scrollTo(this.searchBox.HEIGHT);};View.prototype.destroy=function(){Object.getOwnPropertyNames(this).forEach(prop=>this[prop]=null);debug('Destroyed');};View.prototype.render=function(){};View.prototype.onRenderDone=function(){if(window.frameElement){window.frameElement.dispatchEvent(new CustomEvent('rendered'));}
debug('Rendered');};View.prototype.fetch=SERVICE_WORKERS?function(url){return window.fetch(encodeURI(url));}:function(url){for(var path in window.ROUTES){var route=window.ROUTES[path];var match=url.match(route.regexp);if(match){return new Promise((resolve)=>{setTimeout(()=>{var args=[route.method].concat(match.splice(1));this.client.method.apply(this.client,args).then((result)=>{resolve({blob:()=>Promise.resolve(result),json:()=>Promise.resolve(result)});});});});}}
return Promise.reject();};Object.defineProperty(View.prototype,'title',{get:function(){return document.title;},set:function(value){document.title=value;window.frameElement.dispatchEvent(new CustomEvent('titlechange',{detail:document.title}));}});View.extend=function(subclass){subclass.prototype=Object.create(View.prototype,{constructor:{value:subclass,enumerable:false,writable:true,configurable:true}});return subclass;};function parseSimplePath(path){if(/\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+/g.test(path)){throw new Error('Invalid usage of named placeholders');}
var mixedPlaceHolders=/(\*\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\*)/g;if(mixedPlaceHolders.test(path.replace(/\\\*/g,''))){throw new Error('Invalid usage of named placeholders');}
try{path=path.replace(/(.|^)[*]+/g,function(m,escape){return escape==='\\'?'\\*':(escape+'(?:.*?)');});var tags=[];path=path.replace(/(.|^)\:([a-zA-Z0-9]+)/g,function(m,escape,tag){if(escape==='\\'){return':'+tag;}
tags.push(tag);return escape+'(.+?)';});return{regexp:RegExp(path+'$'),tags:tags};}
catch(ex){throw new Error('Invalid path specified');}}
return View;})();;'use strict';var PlaylistDetailView=View.extend(function PlaylistDetailView(){View.call(this);this.list=document.getElementById('list');this.list.addEventListener('click',(evt)=>{var link=evt.target.closest('a[data-file-path]');if(link){this.queuePlaylist(link.dataset.filePath);}});this.client.on('databaseChange',()=>this.update());this.update();});PlaylistDetailView.prototype.update=function(){return this.getPlaylist().then((songs)=>{this.songs=songs;return this.render();});};PlaylistDetailView.prototype.destroy=function(){this.client.destroy();View.prototype.destroy.call(this);};PlaylistDetailView.prototype.render=function(){return this.list.setModel(this.songs).then(this.onRenderDone);};PlaylistDetailView.prototype.getPlaylist=function(){var unpaddedIndex=IntlHelper.get('unpaddedIndex');return this.fetch('/api/playlists/info/'+this.params.id).then(response=>response.json()).then(songs=>{return songs.map((song,index)=>{return{index:unpaddedIndex.format(index+1),name:song.name,title:song.metadata.title,artist:song.metadata.artist};});});};PlaylistDetailView.prototype.queuePlaylist=function(filePath){this.fetch('/api/queue/playlist/'+this.params.id+'/song/'+filePath);};IntlHelper.define('unpaddedIndex','number',{style:'decimal',useGrouping:false,minimumIntegerDigits:1});window.view=new PlaylistDetailView();