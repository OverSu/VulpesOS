;;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bridge=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var bridge=module.exports=self['bridge']||{};bridge['client']=require('../src/client');if((typeof define)[0]!='u')define([],()=>bridge);else self['bridge']=bridge;},{"../src/client":2}],2:[function(require,module,exports){'use strict';var createPort=require('./message/port-adaptors');var Emitter=require('./emitter');var message=require('./message');var uuid=require('./utils').uuid;module.exports=Client;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Client] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Client]${type} - "${arg1}"`,...args);}}[0];var env=constructor.name
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
function error(id){return new Error({1:'target is undefined'}[id]);}},{"../utils":6}],6:[function(require,module,exports){'use strict';exports.uuid=function(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16);});};exports.deferred=function(){var promise={};promise.promise=new Promise((resolve,reject)=>{promise.resolve=resolve;promise.reject=reject;});return promise;};},{}]},{},[1])(1)});;;;;;var _createClass=(function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};})();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function');}}
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
const client=new Client({service:'l20n',endpoint:channel,timeout:false});document.l10n=new View(client,document);window.addEventListener('pageshow',()=>client.connect());window.addEventListener('pagehide',()=>client.disconnect());window.addEventListener('languagechange',document.l10n);document.addEventListener('additionallanguageschange',document.l10n);navigator.mozL10n={setAttributes:document.l10n.setAttributes,getAttributes:document.l10n.getAttributes,formatValue:(...args)=>document.l10n.formatValue(...args),translateFragment:(...args)=>document.l10n.translateFragment(...args),once:cb=>document.l10n.ready.then(cb),ready:cb=>document.l10n.ready.then(()=>{document.addEventListener('DOMRetranslated',cb);cb();})};})();;(function(global){'use strict';global.mozIntl={formatList:function(list){return navigator.mozL10n.formatValue('listSeparator_middle').then(sep=>list.join(sep));},DateTimeFormat:function(locales,options){const resolvedOptions=Object.assign({},options);if(resolvedOptions.dayperiod){if(resolvedOptions.hour===undefined){resolvedOptions.hour='numeric';}}
if(resolvedOptions.hour!==undefined&&resolvedOptions.hour12===undefined){resolvedOptions.hour12=navigator.mozHour12;}
if(resolvedOptions.dayperiod===undefined&&resolvedOptions.hour12===true){resolvedOptions.dayperiod=true;}
var intlFormat=new Intl.DateTimeFormat(locales,resolvedOptions);resolvedOptions.locale=intlFormat.resolvedOptions().locale;resolvedOptions.hour12=intlFormat.resolvedOptions().hour12;var hourFormatter;if(resolvedOptions.dayperiod!==undefined&&resolvedOptions.hour12===true){hourFormatter=Intl.DateTimeFormat(locales,{hour:'numeric',hour12:false});}
return{resolvedOptions(){return resolvedOptions;},format:function(date,tokenFormats){var dayPeriod;var string=intlFormat.format(date);if(resolvedOptions.dayperiod===false&&resolvedOptions.hour12===true){dayPeriod=getDayPeriodTokenForDate(date,hourFormatter);string=string.replace(dayPeriod,'').trim();}else if(resolvedOptions.dayperiod===true&&options.hour===undefined){dayPeriod=getDayPeriodTokenForDate(date,hourFormatter);const hour=date.toLocaleString(navigator.languages,{hour12:true,hour:'numeric'}).replace(dayPeriod,'').trim();string=string.replace(hour,'').trim();}
for(var token in tokenFormats){if(token==='dayperiod'&&resolvedOptions.hour12===false){continue;}
const localOptions={[token]:resolvedOptions[token],};var formatter=global.mozIntl.DateTimeFormat(navigator.languages,localOptions);var tokenString=formatter.format(date);string=string.replace(tokenString,tokenFormats[token]);}
return string;},};},calendarInfo:function(token){switch(token){case'firstDayOfTheWeek':return navigator.mozL10n.formatValue('firstDayOfTheWeek').then(firstDayOfTheWeek=>parseInt(firstDayOfTheWeek)%7);default:throw new Error('Unknown token: '+token);}},DurationFormat:function(locales=navigator.languages,options={}){const resolvedOptions=Object.assign({locale:locales[0],maxUnit:'hour',minUnit:'second',},options);const numFormatter=Intl.NumberFormat(locales,{style:'decimal',useGrouping:false,minimumIntegerDigits:2});const maxUnitIdx=getDurationUnitIdx(resolvedOptions.maxUnit,0);const minUnitIdx=getDurationUnitIdx(resolvedOptions.minUnit,durationFormatOrder.length-1);return navigator.mozL10n.formatValue('durationPattern').then(fmt=>({resolvedOptions:function(){return resolvedOptions;},format:function(input){const minValue=durationFormatElements[resolvedOptions.minUnit].value;input=Math.round(input/minValue)*minValue;const duration=splitIntoTimeUnits(input,maxUnitIdx,minUnitIdx);var string=trimDurationPattern(fmt,resolvedOptions.maxUnit,resolvedOptions.minUnit);for(var unit in duration){const token=durationFormatElements[unit].token;string=string.replace(token,numFormatter.format(duration[unit]));}
if(input<0){return'-'+string;}
return string;}}));},RelativeTimeFormat:function(locales,options){return{resolvedOptions:function(){return options;},format:function(x){const{unit,value}=relativeTimeFormatId(x,options);return navigator.mozL10n.formatValue(unit,{value});},};},UnitFormat:function(locales,options){const unitGroup=getUnitFormatGroupName(options.unit);if(unitGroup===undefined){throw new RangeError(`invalid value ${options.unit} for option unit`);}
if(!unitFormatGroups[unitGroup].styles.includes(options.style)){throw new RangeError(`invalid value ${options.style} for option style`);}
const unit=`${unitGroup}-${options.unit}-${options.style}`;return{format:function(x){return document.l10n.formatValue(unit,{value:x});},};},_gaia:{relativePart:function(milliseconds){const units=computeTimeUnits(milliseconds);const unit=getBestMatchUnit(units);return{unit:unit+'s',value:Math.abs(units[unit])};},RelativeDate:function(locales,options){const style=options&&options.style||'long';const maxFormatter=Intl.DateTimeFormat(locales,{year:'numeric',month:'numeric',day:'numeric'});const relativeFmtOptions={unit:'bestFit',style:style,minUnit:'minute',};return{format:function(time,maxDiff){maxDiff=maxDiff||86400*10;const secDiff=(Date.now()-time)/1000;if(isNaN(secDiff)){return navigator.mozL10n.formatValue('incorrectDate');}
if(secDiff>maxDiff){return Promise.resolve(maxFormatter.format(time));}
const{unit,value}=relativeTimeFormatId(time,relativeFmtOptions);return navigator.mozL10n.formatValue(unit,{value});},formatElement:function(element,time,maxDiff){maxDiff=maxDiff||86400*10;const secDiff=(Date.now()-time)/1000;if(isNaN(secDiff)){element.setAttribute('data-l10n-id','incorrectDate');}
element.removeAttribute('data-l10n-id');if(secDiff>maxDiff){element.textContent=maxFormatter.format(time);}
const{unit,value}=relativeTimeFormatId(time,relativeFmtOptions);navigator.mozL10n.setAttributes(element,unit,{value});},};},getFormattedUnit:function(type,style,v){if(!unitFormatData.hasOwnProperty(type)){throw new RangeError(`invalid type ${type}`);}
if(!unitFormatGroups[type].styles.includes(style)){throw new RangeError(`invalid style ${style} for type ${type}`);}
var units=unitFormatData[type];var scale=0;for(let i=1;i<units.length;i++){if(v<units[i].value*unitFormatGroups[type].rounding){scale=i-1;break;}else if(i===units.length-1){scale=i;}}
var value=Math.round(v/units[scale].value*100)/100;return global.mozIntl.UnitFormat(navigator.languages,{unit:units[scale].name,style:style}).format(value);},}};const durationFormatOrder=['hour','minute','second','millisecond'];const durationFormatElements={'hour':{value:3600000,token:'hh'},'minute':{value:60000,token:'mm'},'second':{value:1000,token:'ss'},'millisecond':{value:10,token:'SS'}};const unitFormatData={'duration':[{'name':'second','value':1},{'name':'minute','value':60},{'name':'hour','value':60*60},{'name':'day','value':24*60*60},{'name':'month','value':30*24*60*60},],'digital':[{'name':'byte','value':1},{'name':'kilobyte','value':1024},{'name':'megabyte','value':1024*1024},{'name':'gigabyte','value':1024*1024*1024},{'name':'terabyte','value':1024*1024*1024*1024},],};const unitFormatGroups={'duration':{'units':['second','minute','hour','day','month'],'styles':['narrow'],'rounding':1},'digital':{'units':['byte','kilobyte','megabyte','gigabyte','terabyte'],'styles':['short'],'rounding':0.8}};function getDurationUnitIdx(name,defaultValue){if(!name){return defaultValue;}
const pos=durationFormatOrder.indexOf(name);if(pos===-1){throw new Error('Unknown unit type: '+name);}
return pos;}
function splitIntoTimeUnits(v,maxUnitIdx,minUnitIdx){const units={};var input=Math.abs(v);for(var i=maxUnitIdx;i<=minUnitIdx;i++){const key=durationFormatOrder[i];const{value}=durationFormatElements[key];units[key]=i==minUnitIdx?Math.round(input/value):Math.floor(input/value);input-=units[key]*value;}
return units;}
function trimDurationPattern(string,maxUnit,minUnit){const maxToken=durationFormatElements[maxUnit].token;const minToken=durationFormatElements[minUnit].token;string=string.substring(string.indexOf(maxToken),string.indexOf(minToken)+minToken.length);return string;}
function getDayPeriodTokenForDate(date,hourFormatter){const hourToken=hourFormatter.format(date);const newDate=new Date(date);newDate.setHours(parseInt(hourToken));return new Intl.DateTimeFormat(navigator.language, {hour:'numeric', hour12:true}).formatToParts(newDate).find(part => part.type === 'dayPeriod').value;}
function computeTimeUnits(v){const units={};const millisecond=Math.round(v);const second=Math.round(millisecond/1000);const minute=Math.round(second/60);const hour=Math.round(minute/60);const day=Math.round(hour/24);const rawYear=day*400/146097;units.millisecond=millisecond;units.second=second;units.minute=minute;units.hour=hour;units.day=day;units.week=Math.round(day/7);units.month=Math.round(rawYear*12);units.quarter=Math.round(rawYear*4);units.year=Math.round(rawYear);return units;}
function getBestMatchUnit(units){if(Math.abs(units.minute)<45){return'minute';}
if(Math.abs(units.hour)<22){return'hour';}
if(Math.abs(units.day)<7){return'day';}
if(Math.abs(units.week)<4){return'week';}
if(Math.abs(units.month)<11){return'month';}
return'year';}
function relativeTimeFormatId(x,options){const ms=x-Date.now();const units=computeTimeUnits(ms);const unit=options.unit==='bestFit'?getBestMatchUnit(units):options.unit;const v=units[unit];const tl=v<0?'-ago':'-until';const style=options.style||'long';const entry=unit+'s'+tl+'-'+style;return{unit:entry,value:Math.abs(v)};}
function getUnitFormatGroupName(unitName){for(let groupName in unitFormatGroups){if(unitFormatGroups[groupName].units.includes(unitName)){return groupName;}}
return undefined;}})(this);;;;(function(global){'use strict';const helperCache=new Map();const knownObjects={datetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
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
window.addEventListener('timeformatchange',global.IntlHelper,false);window.addEventListener('languagechange',global.IntlHelper,false);window.addEventListener('moztimechange',global.IntlHelper,false);})(this);;(function(window){'use strict';const HIDE_OVERLAY_TIMEOUT=5000;const REPEAT_VALUES=['off','list','song'];const SHUFFLE_VALUES=['off','on'];var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style>
  [data-icon]:before { /* Copied from /components/gaia-icons/gaia-icons.css */
    font-family: "gaia-icons";
    content: attr(data-icon);
    display: inline-block;
    font-weight: 500;
    font-style: normal;
    text-decoration: inherit;
    text-transform: none;
    text-rendering: optimizeLegibility;
    font-size: 30px;
    -webkit-font-smoothing: antialiased;
  }
  #container {
    background-color: #000;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    -moz-user-select: none;
  }
  #container > img {
    background-color: #000;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  #container > img[data-layer="front"] {
    opacity: 0;
    visibility: hidden;
    transition: opacity 150ms linear, visibility 0s linear 150ms;
  }
  #container > img[data-layer="front"].active {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #container button {
    background: none;
    border: none;
    border-radius: 0;
    color: #fff;
    flex: 0 0 auto;
    margin: 0 1rem;
    width: 6rem;
    transition: background 200ms ease;
  }
  #container button:hover {
    background: transparent;
  }
  #container button:active {
    background: #00caf2;
    transition-duration: 0s;
  }
  #container button:disabled,
  #container button[data-value="off"] {
    opacity: 0.3;
  }
  #container button:disabled:active {
    background: transparent;
  }
  #container button[data-icon="repeat"][data-value="song"]:before {
    content: 'repeat-once'
  }
  #caption,
  #controls {
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-flow: row nowrap;
    position: absolute;
    left: 0;
    width: 100%;
    height: 5rem;
    visibility: hidden;
    transition: transform 300ms ease-in-out, visibility 0s linear 300ms;
  }
  #caption {
    top: 0;
    transform: translateY(-5rem);
  }
  #controls {
    bottom: 0;
    transform: translateY(5rem);
  }
  .show-overlay > #caption,
  .show-overlay > #controls {
    transform: translateY(0);
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #caption-text {
    position: relative;
    flex: 0 0 auto;
    width: calc(100% - 8rem);
  }
  #artist,
  #album {
    color: #fff;
    font-weight: normal;
    text-shadow: 0 0.1rem rgba(0, 0, 0, 0.5);
    text-indent: 3rem;
    position: relative;
    margin: 0;
    width: 100%;
    height: 2.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #artist {
    font-size: 1.9rem;
    line-height: 3rem;
  }
  #album {
    font-size: 1.7rem;
    line-height: 2.5rem;
  }
  #rating {
    flex: 1 0 auto;
  }
</style>
<div id="container">
  <img data-layer="back">
  <img data-layer="front" class="active">
  <div id="caption">
    <div id="caption-text">
      <h1 id="artist"></h1>
      <h2 id="album"></h2>
    </div>
    <button type="button"
        data-action="share"
        data-icon="share"
        data-l10n-id="share-song">
    </button>
  </div>
  <div id="controls">
    <button type="button"
        data-action="repeat"
        data-icon="repeat"
        data-l10n-id="repeat-off">
    </button>
    <music-rating id="rating"></music-rating>
    <button type="button"
        data-action="shuffle"
        data-icon="shuffle"
        data-l10n-id="shuffle-toggle">
    </button>
  </div>
</div>`;var $=shadowRoot.querySelector.bind(shadowRoot);this.els={container:$('#container'),backImage:$('img[data-layer="back"]'),frontImage:$('img[data-layer="front"]'),caption:$('#caption'),controls:$('#controls'),artist:$('#artist'),album:$('#album'),share:$('[data-action="share"]'),repeat:$('[data-action="repeat"]'),shuffle:$('[data-action="shuffle"]'),rating:$('#rating')};var onImageLoad=(evt)=>{const image=evt.target;window.requestAnimationFrame(()=>{var newActiveImage=image.closest('img:not(.active)');if(!newActiveImage){return;}
var oldActiveImage=this.els.container.querySelector('img.active');newActiveImage.classList.add('active');oldActiveImage.classList.remove('active');});};[].forEach.call(this.els.container.querySelectorAll('img'),(img)=>{img.addEventListener('load',onImageLoad);});this.els.container.addEventListener('transitionend',(evt)=>{if(!evt.target.matches('img:not(.active)')){return;}
var oldActiveImage=evt.target;oldActiveImage.src=null;});this.els.container.addEventListener('click',(evt)=>{var button=evt.target.closest('button');if(!button){if(evt.target.closest('#rating')){this.overlayVisible=true;return;}
this.overlayVisible=!this.overlayVisible;return;}
var action=button.dataset.action;switch(action){case'repeat':this.nextRepeat();break;case'shuffle':this.nextShuffle();break;}
this.overlayVisible=true;this.dispatchEvent(new CustomEvent(action));});this.els.rating.addEventListener('change',(evt)=>{this.dispatchEvent(new CustomEvent('ratingchange',{detail:evt.detail}));});this.onDOMRetranslated=()=>{document.l10n.translateFragment(shadowRoot);};this.repeat=this.getAttribute('repeat');this.shuffle=this.getAttribute('shuffle');this.overlayVisible=true;};proto.attachedCallback=function(){document.addEventListener('DOMRetranslated',this.onDOMRetranslated);this.onDOMRetranslated();};proto.detachedCallback=function(){document.removeEventListener('DOMRetranslated',this.onDOMRetranslated);};proto.attributeChangedCallback=function(attr,oldVal,newVal){switch(attr){case'artist':this.els.artist.textContent=newVal;break;case'album':this.els.album.textContent=newVal;break;case'repeat':this.els.repeat.dataset.value=REPEAT_VALUES.indexOf(newVal)!==-1?newVal:REPEAT_VALUES[0];break;case'shuffle':this.els.shuffle.dataset.value=SHUFFLE_VALUES.indexOf(newVal)!==-1?newVal:SHUFFLE_VALUES[0];break;case'src':this.els.container.querySelector('img:not(.active)').src=newVal;break;}};proto.nextRepeat=function(){this.repeat=REPEAT_VALUES[REPEAT_VALUES.indexOf(this.repeat)+1];};proto.nextShuffle=function(){this.shuffle=SHUFFLE_VALUES[SHUFFLE_VALUES.indexOf(this.shuffle)+1];};['artist','album','src'].forEach(function(prop){Object.defineProperty(proto,prop,{get:function(){return this.getAttribute(prop);},set:function(value){this.setAttribute(prop,value||'');}});});Object.defineProperty(proto,'repeat',{get:function(){return this.getAttribute('repeat')||REPEAT_VALUES[0];},set:function(value){value=REPEAT_VALUES.indexOf(value)!==-1?value:REPEAT_VALUES[0];this.setAttribute('repeat',value);this.els.repeat.dataset.l10nId='repeat-'+value;this.onDOMRetranslated();}});Object.defineProperty(proto,'shuffle',{get:function(){return this.getAttribute('shuffle')||SHUFFLE_VALUES[0];},set:function(value){value=SHUFFLE_VALUES.indexOf(value)!==-1?value:SHUFFLE_VALUES[0];this.setAttribute('shuffle',value);}});Object.defineProperty(proto,'overlayVisible',{get:function(){return this.els.container.classList.contains('show-overlay');},set:function(value){var overlayVisible=!!value;clearTimeout(this._hideOverlayTimeout);if(overlayVisible){this.els.container.classList.add('show-overlay');this._hideOverlayTimeout=setTimeout(()=>{this.overlayVisible=false;},HIDE_OVERLAY_TIMEOUT);}
else{this.els.container.classList.remove('show-overlay');}}});try{window.MusicArtwork=document.registerElement('music-artwork',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);var isTouch='ontouchstart'in window;proto.createdCallback=function(){var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style>
  [data-icon]:before { /* Copied from /components/gaia-icons/gaia-icons.css */
    font-family: "gaia-icons";
    content: attr(data-icon);
    display: inline-block;
    font-weight: 500;
    font-style: normal;
    text-decoration: inherit;
    text-transform: none;
    text-rendering: optimizeLegibility;
    font-size: 30px;
    -webkit-font-smoothing: antialiased;
  }
  #container {
    background-color: #000;
    border-top: 0.1rem solid rgba(255, 255, 255, 0.1);
    direction: ltr;
    display: flex;
    flex-flow: row nowrap;
    position: relative;
    width: 100%;
    height: 4.8rem;
    -moz-user-select: none;
  }
  #container > button {
    background: transparent;
    border: none;
    border-radius: 0;
    color: #fff;
    flex: 1 0 auto;
    position: relative;
    padding: 0;
    height: 100%;
    transition: background 0.2s ease;
  }
  #container > button:hover {
    background: transparent;
  }
  #container > button:active {
    background: #00caf2;
    transition-duration: 0s;
  }
  #container > button:disabled {
    opacity: 0.3;
  }
  #container > button:disabled:active {
    background: transparent;
  }
</style>
<div id="container">
  <button type="button" id="previous"
      data-icon="skip-back"
      data-l10n-id="playbackPrevious">
  </button>
  <button type="button" id="toggle"
      data-icon="play"
      data-l10n-id="playbackPlay">
  </button>
  <button type="button" id="next"
      data-icon="skip-forward"
      data-l10n-id="playbackNext">
  </button>
</div>`;var $id=shadowRoot.getElementById.bind(shadowRoot);this.els={container:$id('container'),previous:$id('previous'),toggle:$id('toggle'),next:$id('next')};var seeking=false;this.els.container.addEventListener('contextmenu',(evt)=>{evt.preventDefault();if(seeking){return;}
var button=evt.target.closest('button');if(button.id==='previous'||button.id==='next'){seeking=true;this.dispatchEvent(new CustomEvent('startseek',{detail:{reverse:button.id==='previous'}}));}});this.els.container.addEventListener(isTouch?'touchend':'mouseup',(evt)=>{if(seeking){evt.preventDefault();this.dispatchEvent(new CustomEvent('stopseek'));seeking=false;}});this.els.container.addEventListener('click',(evt)=>{var button=evt.target.closest('button');switch(button.id){case'previous':case'next':this.dispatchEvent(new CustomEvent(button.id));break;case'toggle':this.paused=!this.paused;this.dispatchEvent(new CustomEvent(this.paused?'pause':'play'));break;}});this.onDOMRetranslated=()=>{document.l10n.translateFragment(shadowRoot);};};proto.attachedCallback=function(){document.addEventListener('DOMRetranslated',this.onDOMRetranslated);this.onDOMRetranslated();};proto.detachedCallback=function(){document.removeEventListener('DOMRetranslated',this.onDOMRetranslated);};Object.defineProperty(proto,'paused',{get:function(){return this.els.toggle.dataset.icon!=='pause';},set:function(value){var paused=!!value;if(paused===this.paused){return;}
this.els.toggle.dataset.icon=paused?'play':'pause';this.els.toggle.dataset.l10nId=paused?'playbackPlay':'playbackPause';this.onDOMRetranslated();}});try{window.MusicControls=document.registerElement('music-controls',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style>
  #container {
    display: flex;
    flex-flow: row nowrap;
    width: 100%;
    height: 100%;
    -moz-user-select: none;
  }
  #container > button {
    background-color: transparent;
    background-image: url(/img/ui/music-rating-off.png);
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 2.2rem auto;
    border: none;
    flex: 1 0 auto;
    width: 2.2rem;
    height: 100%;
  }
  #container[data-value="1"] > :-moz-any([value="1"]),
  #container[data-value="2"] > :-moz-any([value="1"],[value="2"]),
  #container[data-value="3"] > :-moz-any([value="1"],[value="2"],[value="3"]),
  #container[data-value="4"] > :-moz-any([value="1"],[value="2"],[value="3"],[value="4"]),
  #container[data-value="5"] > * {
    background-image: url(/img/ui/music-rating-on.png);
  }
</style>
<div id="container">
  <button type="button" value="1" data-l10n-id="rating-star" data-l10n-args='{"n":1}'></button>
  <button type="button" value="2" data-l10n-id="rating-star" data-l10n-args='{"n":2}'></button>
  <button type="button" value="3" data-l10n-id="rating-star" data-l10n-args='{"n":3}'></button>
  <button type="button" value="4" data-l10n-id="rating-star" data-l10n-args='{"n":4}'></button>
  <button type="button" value="5" data-l10n-id="rating-star" data-l10n-args='{"n":5}'></button>
</div>`;var $id=shadowRoot.getElementById.bind(shadowRoot);this.els={container:$id('container')};this.els.container.addEventListener('click',(evt)=>{var button=evt.target.closest('button');if(!button){return;}
var value=parseInt(button.value,10)||0;if(value===this.value){value--;}
this.value=value;this.dispatchEvent(new CustomEvent('change',{detail:value}));});this.onDOMRetranslated=()=>{document.l10n.translateFragment(shadowRoot);};};proto.attachedCallback=function(){document.addEventListener('DOMRetranslated',this.onDOMRetranslated);this.onDOMRetranslated();};proto.detachedCallback=function(){document.removeEventListener('DOMRetranslated',this.onDOMRetranslated);};proto.attributeChangedCallback=function(attr,oldVal,newVal){switch(attr){case'value':this.els.container.dataset.value=newVal;break;}};Object.defineProperty(proto,'value',{get:function(){return parseInt(this.getAttribute('value'),10)||0;},set:function(value){this.setAttribute('value',clamp(0,5,parseInt(value,10)||0));}});function clamp(min,max,value){return Math.min(Math.max(min,value),max);}
try{window.MusicRating=document.registerElement('music-rating',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);var isTouch='ontouchstart'in window;proto.createdCallback=function(){var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style>
  #container {
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-flow: row nowrap;
    position: relative;
    width: 100%;
    height: 4.2rem;
    -moz-user-select: none;
  }
  #container > span {
    display: inline-block;
    position: relative;
    height: 100%;
  }
  #elapsed-time,
  #remaining-time {
    color: #e7e7e7;
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 4.2rem;
    direction: ltr;
    vertical-align: top;
    flex: 0 0 auto;
    width: 5.3rem;
  }
  #elapsed-time {
    padding-left: 1.5rem;
  }
  #remaining-time {
    padding-right: 1.5rem;
    text-align: right;
  }
  #seek-bar {
    flex: 1 0 auto;
    z-index: 1;
  }
  #seek-bar-progress {
    background-color: #a6b4b7;
    border: none;
    border-radius: 0;
    position: absolute;
    top: calc(50% - 0.1rem);
    left: 0;
    width: 100%;
    height: 0.1rem;
    pointer-events: none;
    -moz-appearance: none;
  }
  #seek-bar-progress::-moz-progress-bar {
    background-color: #01c5ed;
  }
  #seek-bar-indicator {
    background-color: transparent;
    border-radius: 50%;
    position: absolute;
    top: calc(50% - 3rem);
    left: -3rem;
    width: 6rem;
    height: 6rem;
    pointer-events: none;
    transition: transform 20ms linear;
    will-change: transform;
  }
  #seek-bar-indicator:after {
    content: '';
    background-color: #fff;
    border: 1px solid #fff;
    border-radius: 50%;
    position: absolute;
    top: 1.85rem;
    left: 1.85rem;
    width: 2.1rem;
    height: 2.1rem;
  }
  #seek-bar-indicator.highlight {
    background-color: #00caf2;
  }
</style>
<div id="container">
  <span id="elapsed-time"></span>
  <span id="seek-bar">
    <progress id="seek-bar-progress"></progress>
    <div id="seek-bar-indicator"></div>
  </span>
  <span id="remaining-time"></span>
</div>`;var $id=shadowRoot.getElementById.bind(shadowRoot);this.els={container:$id('container'),elapsedTime:$id('elapsed-time'),seekBar:$id('seek-bar'),seekBarProgress:$id('seek-bar-progress'),seekBarIndicator:$id('seek-bar-indicator'),remainingTime:$id('remaining-time')};var container=this.els.container;var seekBar=this.els.seekBar;var seekTimeout=null;container.addEventListener(isTouch?'touchstart':'mousedown',(evt)=>{clearTimeout(seekTimeout);container.addEventListener(isTouch?'touchmove':'mousemove',pointerMoveHandler);container.addEventListener(isTouch?'touchend':'mouseup',pointerEndHandler);this.els.seekBarIndicator.classList.add('highlight');pointerMoveHandler(evt);});var pointerMoveHandler=(evt)=>{var pointer=isTouch?evt.targetTouches[0]:evt;var percent=clamp(0,1,(pointer.clientX-seekBar.offsetLeft)/seekBar.offsetWidth);if(document.documentElement.dir==='rtl'){this.remainingTime=this._overrideRemainingTime=percent*this.duration;}
else{this.elapsedTime=this._overrideElapsedTime=percent*this.duration;}};var pointerEndHandler=(evt)=>{this.dispatchEvent(new CustomEvent('seek',{detail:{elapsedTime:this.elapsedTime}}));container.removeEventListener(isTouch?'touchmove':'mousemove',pointerMoveHandler);container.removeEventListener(isTouch?'touchend':'mouseup',pointerEndHandler);seekTimeout=setTimeout(()=>{this._overrideRemainingTime=null;this._overrideElapsedTime=null;this.els.seekBarIndicator.classList.remove('highlight');},100);};this._overrideRemainingTime=null;this._overrideElapsedTime=null;this.duration=null;this.elapsedTime=null;this.remainingTime=null;};Object.defineProperty(proto,'duration',{get:function(){return this._duration;},set:function(value){if(isNaN(value)){this._duration=null;this.remainingTime=null;return;}
this._duration=value;this.remainingTime=this._duration-this._elapsedTime;}});Object.defineProperty(proto,'elapsedTime',{get:function(){return this._elapsedTime;},set:function(value){if(isNaN(value)){this._elapsedTime=null;this.remainingTime=null;return;}
this._elapsedTime=this._overrideElapsedTime!==null?this._overrideElapsedTime:value;this.remainingTime=this._duration-this._elapsedTime;}});Object.defineProperty(proto,'remainingTime',{get:function(){return this._remainingTime;},set:function(value){var indeterminate=isNaN(value)||isNaN(this._duration);if(indeterminate){this._remainingTime=null;this._elapsedTime=null;}
else{this._remainingTime=this._overrideRemainingTime!==null?this._overrideRemainingTime:value;this._elapsedTime=this._duration-this._remainingTime;}
window.requestAnimationFrame(()=>{if(indeterminate){this.els.remainingTime.textContent='---:--';this.els.elapsedTime.textContent='--:--';return;}
var percent=this._duration?this._elapsedTime/this._duration:0;var x=this.els.seekBar.offsetWidth*percent;if(document.documentElement.dir==='rtl'){x=this.els.seekBar.offsetWidth-x;}
this.els.seekBarIndicator.style.transform='translateX('+x+'px)';IntlHelper.get('duration').then((duration)=>{this.els.remainingTime.textContent=duration.format(-this._remainingTime*1000);this.els.elapsedTime.textContent=duration.format(this._elapsedTime*1000);});});}});function clamp(min,max,value){return Math.min(Math.max(min,value),max);}
IntlHelper.define('duration','mozduration',{minUnit:'second',maxUnit:'minute'});try{window.MusicSeekBar=document.registerElement('music-seek-bar',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;;;;;var SERVICE_WORKERS=false;;;;window.View=(function(){'use strict';var debug=0?(...args)=>console.log('[View]',...args):()=>{};if(!SERVICE_WORKERS)(function(){window.ROUTES={'/api/activities/share/:filePath':'share','/api/albums/list':'getAlbums','/api/albums/info/:filePath':'getAlbum','/api/artists/list':'getArtists','/api/artists/info/:filePath':'getArtist','/api/artwork/original/:filePath':'getSongArtwork','/api/artwork/thumbnail/:filePath':'getSongThumbnail','/api/artwork/url/original/:filePath':'getSongArtworkURL','/api/artwork/url/thumbnail/:filePath':'getSongThumbnailURL','/api/audio/play':'play','/api/audio/pause':'pause','/api/audio/seek/:time':'seek','/api/audio/fastseek/start/:direction':'startFastSeek','/api/audio/fastseek/stop':'stopFastSeek','/api/audio/status':'getPlaybackStatus','/api/database/status':'getDatabaseStatus','/api/playlists/list':'getPlaylists','/api/playlists/info/:id':'getPlaylist','/api/queue/current':'currentSong','/api/queue/previous':'previousSong','/api/queue/next':'nextSong','/api/queue/album/:filePath':'queueAlbum','/api/queue/artist/:filePath':'queueArtist','/api/queue/playlist/:id/shuffle':'queuePlaylist','/api/queue/playlist/:id/song/:filePath':'queuePlaylist','/api/queue/song/:filePath':'queueSong','/api/queue/repeat/:repeat':'setRepeatSetting','/api/queue/shuffle/:shuffle':'setShuffleSetting','/api/songs/list':'getSongs','/api/songs/count':'getSongCount','/api/songs/info/:filePath':'getSong','/api/songs/rating/:rating/:filePath':'setSongRating','/api/search/:key/':'search','/api/search/:key/:query':'search'};for(var path in window.ROUTES){var method=window.ROUTES[path];window.ROUTES[path]=parseSimplePath(path);window.ROUTES[path].method=method;}})();function View(){this.client=bridge.client({service:'music-service',endpoint:window.parent,timeout:false});this.params={};var parts=window.parent.location.href.split('?');parts.shift();var query=parts.join('?');query.split('&').forEach((param)=>{var parts=param.split('=');this.params[parts[0]]=parts[1];});window.addEventListener('click',(evt)=>{var link=evt.target.closest('a');if(link){evt.preventDefault();this.client.method('navigate',link.getAttribute('href'));}});window.addEventListener('viewdestroy',()=>this.destroy());document.addEventListener('DOMRetranslated',()=>{this.title=document.title;});}
View.prototype.setupSearch=function(params){this.searchBox.addEventListener('search',(evt)=>this.search(evt.detail));this.searchResults.addEventListener('open',()=>{this.client.method('searchOpen');});this.searchResults.addEventListener('close',()=>{this.client.method('searchClose');this.list.scrollTop=this.searchBox.HEIGHT;});this.searchResults.addEventListener('resultclick',(evt)=>{var link=evt.detail;if(link){this.client.method('navigate',link.getAttribute('href'));}});this.searchResults.getItemImageSrc=(item)=>this.getThumbnail(item.name);};View.prototype.setupList=function(){this.list.minScrollHeight=`calc(100% + ${this.searchBox.HEIGHT}px)`;this.list.offset=this.searchBox.HEIGHT;this.list.configure({getItemImageSrc:(item)=>this.getThumbnail(item.name)});this.list.rendered.then(()=>document.body.hidden=false);this.list.scrollTo(this.searchBox.HEIGHT);};View.prototype.destroy=function(){Object.getOwnPropertyNames(this).forEach(prop=>this[prop]=null);debug('Destroyed');};View.prototype.render=function(){};View.prototype.onRenderDone=function(){if(window.frameElement){window.frameElement.dispatchEvent(new CustomEvent('rendered'));}
debug('Rendered');};View.prototype.fetch=SERVICE_WORKERS?function(url){return window.fetch(encodeURI(url));}:function(url){for(var path in window.ROUTES){var route=window.ROUTES[path];var match=url.match(route.regexp);if(match){return new Promise((resolve)=>{setTimeout(()=>{var args=[route.method].concat(match.splice(1));this.client.method.apply(this.client,args).then((result)=>{resolve({blob:()=>Promise.resolve(result),json:()=>Promise.resolve(result)});});});});}}
return Promise.reject();};Object.defineProperty(View.prototype,'title',{get:function(){return document.title;},set:function(value){document.title=value;window.frameElement.dispatchEvent(new CustomEvent('titlechange',{detail:document.title}));}});View.extend=function(subclass){subclass.prototype=Object.create(View.prototype,{constructor:{value:subclass,enumerable:false,writable:true,configurable:true}});return subclass;};function parseSimplePath(path){if(/\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+/g.test(path)){throw new Error('Invalid usage of named placeholders');}
var mixedPlaceHolders=/(\*\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\:[a-zA-Z0-9]+)|(\:[a-zA-Z0-9]+\*)/g;if(mixedPlaceHolders.test(path.replace(/\\\*/g,''))){throw new Error('Invalid usage of named placeholders');}
try{path=path.replace(/(.|^)[*]+/g,function(m,escape){return escape==='\\'?'\\*':(escape+'(?:.*?)');});var tags=[];path=path.replace(/(.|^)\:([a-zA-Z0-9]+)/g,function(m,escape,tag){if(escape==='\\'){return':'+tag;}
tags.push(tag);return escape+'(.+?)';});return{regexp:RegExp(path+'$'),tags:tags};}
catch(ex){throw new Error('Invalid path specified');}}
return View;})();;'use strict';const REPEAT_VALUES=['off','list','song'];const SHUFFLE_VALUES=['off','on'];var PlayerView=View.extend(function PlayerView(){View.call(this);this.artwork=document.getElementById('artwork');this.controls=document.getElementById('controls');this.seekBar=document.getElementById('seek-bar');this.artwork.addEventListener('share',()=>this.share());this.artwork.addEventListener('repeat',()=>{this.setRepeatSetting(this.artwork.repeat);});this.artwork.addEventListener('shuffle',()=>{this.setShuffleSetting(this.artwork.shuffle);});this.artwork.addEventListener('ratingchange',(evt)=>{this.setSongRating(evt.detail);});this.controls.addEventListener('play',()=>this.play());this.controls.addEventListener('pause',()=>this.pause());this.controls.addEventListener('previous',()=>this.previous());this.controls.addEventListener('next',()=>this.next());this.controls.addEventListener('startseek',(evt)=>{this.startFastSeek(evt.detail.reverse);});this.controls.addEventListener('stopseek',()=>this.stopFastSeek());this.seekBar.addEventListener('seek',(evt)=>{this.seek(evt.detail.elapsedTime);});this.client.on('play',()=>this.controls.paused=false);this.client.on('pause',()=>this.controls.paused=true);this.client.on('songChange',()=>this.update());this.client.on('durationChange',(duration)=>{this.seekBar.duration=duration;});this.client.on('elapsedTimeChange',(elapsedTime)=>{this.seekBar.elapsedTime=elapsedTime;});this.update();});PlayerView.prototype.update=function(){this.getPlaybackStatus().then((status)=>{this.getSong(status.filePath).then((song)=>{if(!song){return;}
document.l10n.formatValues('unknownTitle','unknownArtist','unknownAlbum').then(([unknownTitle,unknownArtist,unknownAlbum])=>{this.title=song.metadata.title||unknownTitle;this.artwork.artist=song.metadata.artist||unknownArtist;this.artwork.album=song.metadata.album||unknownAlbum;});this.artwork.els.rating.value=song.metadata.rated;});this.getSongArtwork(status.filePath).then((url)=>this.artwork.src=url);this.artwork.repeat=REPEAT_VALUES[status.repeat];this.artwork.shuffle=SHUFFLE_VALUES[status.shuffle];this.controls.paused=status.paused;this.seekBar.duration=status.duration;this.seekBar.elapsedTime=status.elapsedTime;this.render();});};PlayerView.prototype.destroy=function(){this.client.destroy();View.prototype.destroy.call(this);};PlayerView.prototype.render=function(){this.onRenderDone();};PlayerView.prototype.startFastSeek=function(reverse){this.fetch('/api/audio/fastseek/start/'+(reverse?'reverse':'forward'));};PlayerView.prototype.stopFastSeek=function(){this.fetch('/api/audio/fastseek/stop');};PlayerView.prototype.seek=function(time){this.fetch('/api/audio/seek/'+time);};PlayerView.prototype.play=function(){this.fetch('/api/audio/play');};PlayerView.prototype.pause=function(){this.fetch('/api/audio/pause');};PlayerView.prototype.previous=function(){this.fetch('/api/queue/previous');};PlayerView.prototype.next=function(){this.fetch('/api/queue/next');};PlayerView.prototype.share=function(){this.getPlaybackStatus().then((status)=>{this.fetch('/api/activities/share/'+status.filePath);});};PlayerView.prototype.getPlaybackStatus=function(){return this.fetch('/api/audio/status').then(response=>response.json());};PlayerView.prototype.setRepeatSetting=function(repeat){this.fetch('/api/queue/repeat/'+REPEAT_VALUES.indexOf(repeat));};PlayerView.prototype.setShuffleSetting=function(shuffle){this.fetch('/api/queue/shuffle/'+SHUFFLE_VALUES.indexOf(shuffle));};PlayerView.prototype.setSongRating=function(rating){this.getPlaybackStatus().then((status)=>{this.fetch('/api/songs/rating/'+rating+'/'+status.filePath);});};PlayerView.prototype.getSong=function(filePath){return this.fetch('/api/songs/info/'+filePath).then((response)=>{return response.json();});};PlayerView.prototype.getSongArtwork=function(filePath){return this.fetch('/api/artwork/url/original/'+filePath).then((response)=>{return response.json();});};window.view=new PlayerView();