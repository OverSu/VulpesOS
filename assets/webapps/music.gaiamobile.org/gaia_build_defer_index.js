;;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var bridge={'service':require('../src/service'),'client':require('../src/client'),_m:require('../src/message')};if((typeof define)[0]!='u')define([],()=>bridge);else self['bridge']=bridge;},{"../src/client":2,"../src/message":4,"../src/service":6}],2:[function(require,module,exports){'use strict';var createPort=require('./message/port-adaptors');var Emitter=require('./emitter');var message=require('./message');var uuid=require('./utils').uuid;module.exports=Client;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Client] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Client]${type} - "${arg1}"`,...args);}}[0];var env=constructor.name
function Client(service,endpoint,timeout){if(!(this instanceof Client))return new Client(service,endpoint,timeout);if(typeof service=='object'){endpoint=service.endpoint;timeout=service.timeout;service=service.service;}
this.id=uuid();this.service=service;this.timeout=timeout;this.endpoint=endpoint||this.endpoint;if(!this.endpoint)throw error(1);this.setPort(this.endpoint);this.pending=new Set();this.receiver=message.receiver(this.id).on('_push',this.onPush.bind(this));debug('initialized',service);}
Client.prototype={connect(){debug('connect');if(this.connected)return this.connected;debug('connecting...',this.service);var mc=new MessageChannel();this.channel=mc.port1;this.channel.start();var data={clientId:this.id,service:this.service,originEnv:env};return this.connected=this.message('_connect').set('transfer',[mc.port2]).set('data',data).listen(mc.port1).send().then(response=>{debug('connected',response);var usingChannel=response.event.target===this.channel;if(usingChannel)this.setPort(this.channel);else{this.channel.close();delete this.channel;}
this.receiver.listen(this.port);}).catch(err=>{var msg=err&&err.message;if(msg=='timeout'){err=error(2,this.service);console.error(err.message);}
throw err;});},disconnect(options){if(!this.connected)return Promise.resolve();debug('disconnecting ...');var config={noRespond:options&&options.noRespond,data:this.id};this.cancelPending();return this.message('_disconnect').set(config).send().then(()=>this.onDisconnected());},method(name,...args){return this.connect().then(()=>{debug('method',name);return this.message('_method').set({recipient:this.service,data:{name:name,args:args}}).send();}).then(response=>response.value).catch(err=>{var msg=err&&err.message;if(msg=='timeout'){err=error(3,name);console.error(err.message);}
throw err;});},plugin(fn){fn(this,{'Emitter':Emitter,'uuid':uuid});return this;},message(type){debug('create message',type);var msg=message(type).set('port',this.port).set('timeout',this.timeout).on('response',()=>this.pending.delete(msg)).on('cancel',()=>this.pending.delete(msg));this.pending.add(msg);return msg;},cancelPending(){debug('cancel pending');this.pending.forEach(msg=>{msg.cancel();});this.pending.clear();},pendingResponded(){var responded=[];this.pending.forEach(msg=>responded.push(msg.responded));return Promise.all(responded);},onPush(message){debug('on push',message.data);this._emit(message.data.type,message.data.data);},onDisconnected(){delete this.connected;this.pendingResponded().then(()=>{debug('disconnected');if(this.channel)this.channel.close();this._emit('disconnected');});},setPort(endpoint){debug('set port');this.port=createPort(endpoint);},destroy:function(){return this.disconnect().then(()=>{if(this.destroyed)return;debug('destroy');this.destroyed=true;this.receiver.destroy();this._off();this.port=this.endpoint=this.receiver=null;});},_on:Emitter.prototype.on,_off:Emitter.prototype.off,_emit:Emitter.prototype.emit};Client.prototype.on=function(name,fn){this.connect().then(()=>{debug('bind on',name);Emitter.prototype.on.call(this,name,fn);this.message('_on').set('noRespond',true).set('data',{name:name,clientId:this.id}).send(this.port);});return this;};Client.prototype.off=function(name,fn){this.connect().then(()=>{Emitter.prototype.off.call(this,name,fn);this.message('_off').set('noRespond',true).set('data',{name:name,clientId:this.id}).send(this.port);});return this;};function error(id,...args){var help='Either the target endpoint is not alive or the Service is not `.listen()`ing.';return new Error({1:'an endpoint must be defined',2:`Unable to establish a connection with "${args[0]}". ${help}`,3:`Method "${args[0]}" didn't get a response. ${help}`}[id]);}},{"./emitter":3,"./message":4,"./message/port-adaptors":5,"./utils":7}],3:[function(require,module,exports){'use strict';module.exports=Emitter;var debug=0?console.log.bind(console,'[Emitter]'):()=>{};function Emitter(host){if(host)return Object.assign(host,Emitter.prototype);}
Emitter.prototype={on:function(type,callback){debug('on',type,callback);if(!this._callbacks)this._callbacks={};if(!this._callbacks[type])this._callbacks[type]=[];this._callbacks[type].push(callback);return this;},off:function(type,callback){debug('off',type,callback);if(this._callbacks){switch(arguments.length){case 0:this._callbacks={};break;case 1:delete this._callbacks[type];break;default:var typeListeners=this._callbacks[type];if(!typeListeners)return;var i=typeListeners.indexOf(callback);if(~i)typeListeners.splice(i,1);}}
return this;},emit:function(type,data){debug('emit',type,data);if(this._callbacks){var fns=this._callbacks[type]||[];fns=fns.concat(this._callbacks['*']||[]);for(var i=0;i<fns.length;i++)fns[i].call(this,data,type);}
return this;}};var p=Emitter.prototype;p['off']=p.off;p['on']=p.on;},{}],4:[function(require,module,exports){'use strict';var createPort=require('./port-adaptors');var Emitter=require('../emitter');var utils=require('../utils');var defer=utils.deferred;var uuid=utils.uuid;exports=module.exports=type=>new Message(type);exports.receiver=(id,n)=>new Receiver(id,n);exports.Receiver=Receiver;exports.Message=Message;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Message] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Message]${type} - "${arg1}"`,...args);}}[0];var TIMEOUT=1000;function Message(type){this.cancelled=false;this.listeners=[];this.deferred=defer();this.onMessage=this.onMessage.bind(this);this.onTimeout=this.onTimeout.bind(this);if(typeof type==='object')this.setupInbound(type);else this.setupOutbound(type);debug('initialized',type);}
Message.prototype={setupOutbound(type){this.id=uuid();this.type=type;this.sent=false;this.recipient='*';},setupInbound(e){debug('inbound');this.hasResponded=false;this.setSourcePort(e.source||e.target);this.event=e;Object.assign(this,e.data);},setSourcePort(endpoint){debug('set source',endpoint.constructor.name);this.sourcePort=createPort(endpoint,{ready:true});return this;},set(key,value){debug('set',key,value);if(typeof key=='object')Object.assign(this,key);else this[key]=value;return this;},serialize(){return{id:this.id,type:this.type,data:this.data,recipient:this.recipient,noRespond:this.noRespond};},preventDefault(){debug('prevent default');this.defaultPrevented=true;},send(endpoint){debug('send',this.type);if(this.sent)throw error(1);var serialized=this.serialize();var expectsResponse=!this.noRespond;this.port=endpoint?createPort(endpoint):this.port;if(!this.port)throw error(3);if(expectsResponse){this.listen(this.port);this.setResponseTimeout();}else this.deferred.resolve();this.port.postMessage(serialized,this.getTransfer());debug('sent',serialized);return this.deferred.promise;},setResponseTimeout(){if(this.timeout===false)return;var ms=this.timeout||TIMEOUT;this._timer=setTimeout(this.onTimeout,ms);},clearResponseTimeout(){clearTimeout(this._timer);},getTransfer(){return this.transfer||this.event&&this.event.ports;},onMessage(e){var valid=!!e.data.response&&e.data.id===this.id&&!this.cancelled;if(valid)this.onResponse(e);},onTimeout(){debug('response timeout',this.type);if(!this.silentTimeout)this.deferred.reject(error(4));this.teardown();},listen(thing){debug('add response listener',thing);var port=createPort(thing);port.addListener(this.onMessage);this.listeners.push(port);return this;},unlisten(){debug('remove response listeners');this.listeners.forEach(port=>port.removeListener(this.onMessage));this.listeners=[];},cancel(){this.teardown();this.cancelled=true;this.emit('cancel');},teardown(){this.clearResponseTimeout();this.unlisten();},respond(result){debug('respond',result);if(this.hasResponded)throw error(2);if(!this.sourcePort)return;if(this.noRespond)return;var self=this;this.hasResponded=true;if(result instanceof Error)reject(result);Promise.resolve(result).then(resolve,reject).catch(reject);function resolve(value){debug('resolve',value);respond({type:'resolve',value:value});}
function reject(err){var msg=err&&err.message||err;debug('reject',msg);respond({type:'reject',value:msg});}
function respond(response){self.response=response;self.sourcePort.postMessage({id:self.id,response:response},self.transfer);debug('responded with:',response);}},forward(endpoint){debug('forward');return this.set('silentTimeout',true).send(endpoint).then(result=>this.respond(result.value));},onResponse(e){debug('on response',e.data);var response=e.data.response;var type=response.type;var value=type=='reject'?response.value:response;response.event=e;this.response=response;this.teardown();this.deferred[this.response.type](value);this.emit('response',response);}};Emitter(Message.prototype);function Receiver(name){this.name=name;this.ports=new Set();this.onMessage=this.onMessage.bind(this);this['listen']=this['listen'].bind(this);this['unlisten']=this['unlisten'].bind(this);debug('receiver initialized',name);}
Receiver.prototype={listen(thing){debug('listen');var _port=createPort(thing||self,{receiver:true});if(this.ports.has(_port))return;_port.addListener(this.onMessage,this.listen);this.ports.add(_port);return this;},unlisten(){debug('unlisten');this.ports.forEach(port=>{port.removeListener(this.onMessage,this.unlisten);});},onMessage(e){if(!e.data.id)return;if(!e.data.type)return;if(!this.isRecipient(e.data.recipient))return;debug('receiver on message',e.data);var message=new Message(e);this.emit('message',message);if(message.defaultPrevented)return;try{this.emit(message.type,message);}
catch(e){message.respond(e);throw e;}},isRecipient(recipient){return recipient==this.name||recipient=='*'||this.name=='*';},destroy:function(){this.unlisten();delete this.name;return this;}};Emitter(Receiver.prototype);function error(id,...args){return new Error({1:'.send() can only be called once',2:'response already sent for this message',3:'a port must be defined',4:'timeout'}[id]);}},{"../emitter":3,"../utils":7,"./port-adaptors":5}],5:[function(require,module,exports){'use strict';var deferred=require('../utils').deferred;const MSG='message';var debug=0?function(arg1,...args){var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[PortAdaptor]${type} - "${arg1}"`,...args);}:()=>{};module.exports=function create(target,options){if(!target)throw error(1);if(isEndpoint(target))return target;var type=target.constructor.name;var CustomAdaptor=adaptors[type];debug('creating port adaptor for',type);if(CustomAdaptor)return CustomAdaptor(target,options);return new PortAdaptor(target,options);};function PortAdaptor(target){debug('PortAdaptor');this.target=target;}
var PortAdaptorProto=PortAdaptor.prototype={constructor:PortAdaptor,addListener(callback){on(this.target,MSG,callback);},removeListener(callback){off(this.target,MSG,callback);},postMessage(data,transfer){this.target.postMessage(data,transfer);}};var adaptors={'HTMLIFrameElement':function(iframe){debug('HTMLIFrameElement');var ready=windowReady(iframe);return{addListener(callback,listen){on(window,MSG,callback);},removeListener(callback,listen){off(window,MSG,callback);},postMessage(data,transfer){ready.then(()=>postMessageSync(iframe.contentWindow,data,transfer));}};},'BroadcastChannel':function(channel,options){debug('BroadcastChannel',channel.name);var receiver=options&&options.receiver;var ready=options&&options.ready;var sendReady=()=>{channel.postMessage('ready');debug('sent ready');};ready=ready||receiver?Promise.resolve():setupSender();if(receiver){sendReady();on(channel,MSG,e=>{if(e.data!='ready?')return;sendReady();});}
function setupSender(){debug('setup sender');var promise=deferred();channel.postMessage('ready?');on(channel,MSG,function fn(e){if(e.data!='ready')return;off(channel,MSG,fn);debug('BroadcastChannel: ready');promise.resolve();});return promise.promise;}
return{target:channel,addListener:PortAdaptorProto.addListener,removeListener:PortAdaptorProto.removeListener,postMessage(data,transfer){ready.then(()=>channel.postMessage(data,transfer));}};},'Window':function(win,options){debug('Window');var ready=options&&options.ready||win===parent||win===self;ready=ready?Promise.resolve():windowReady(win);return{addListener(callback,listen){on(window,MSG,callback);},removeListener(callback,listen){off(window,MSG,callback);},postMessage(data,transfer){ready.then(()=>postMessageSync(win,data,transfer));}};},'SharedWorker':function(worker){worker.port.start();return new PortAdaptor(worker.port);},'SharedWorkerGlobalScope':function(){var ports=[];return{postMessage(){},addListener(callback,listen){this.onconnect=e=>{var port=e.ports[0];ports.push(port);port.start();listen(port);};on(self,'connect',this.onconnect);},removeListener(callback,unlisten){off(self,'connect',this.onconnect);ports.forEach(port=>{port.close();unlisten(port);});}};}};var windowReady=(function(){if(typeof window=='undefined')return;var parent=window.opener||window.parent;var domReady='DOMContentLoaded';var windows=new WeakSet();if(parent!=self){on(window,domReady,function fn(){off(window,domReady,fn);postMessageSync(parent,'load');});}
on(self,'message',e=>e.data=='load'&&windows.add(e.source));return target=>{var win=target.contentWindow||target;if(windows.has(win))return Promise.resolve();if(win==window.parent)return Promise.resolve();var def=deferred();debug('waiting for Window to be ready ...');on(window,'message',function fn(e){if(e.data=='load'&&e.source==win){debug('Window ready');off(window,'message',fn);def.resolve();}});return def.promise;};})();function isEndpoint(thing){return!!(thing&&thing.addListener);}
function on(target,name,fn){target.addEventListener(name,fn);}
function off(target,name,fn){target.removeEventListener(name,fn);}
function postMessageSync(win,data,transfer){try{void win.document;}catch(_){win.postMessage(data,location.origin,transfer||[]);return;}var event={data:data,source:self};if(transfer)event.ports=transfer;win.dispatchEvent(new MessageEvent('message',event));}
function error(id){return new Error({1:'target is undefined'}[id]);}},{"../utils":7}],6:[function(require,module,exports){'use strict';var uuid=require('./utils').uuid;var message=require('./message');var Receiver=message.Receiver;module.exports=Service;var debug={0:()=>{},1:arg=>performance.mark(`[${self.constructor.name}][Service] - ${arg}`),2:(arg1,...args)=>{var type=`[${self.constructor.name}][${location.pathname}]`;console.log(`[Service]${type} - "${arg1}"`,...args);}}[0];Service.prototype=Object.create(Receiver.prototype);function Service(name){if(!(this instanceof Service))return new Service(name);message.Receiver.call(this,name);this.clients={};this.methods={};this.on('_disconnect',this.onDisconnect.bind(this)).on('_connect',this.onConnect.bind(this)).on('_method',this.onMethod.bind(this)).on('_off',this.onOff.bind(this)).on('_on',this.onOn.bind(this));this.destroy=this.destroy.bind(this);debug('initialized',name);}
Service.prototype.inWindow=constructor.name==='Window';Service.prototype.method=function(name,fn){this.methods[name]=fn;return this;};Service.prototype.broadcast=function(type,data,only){debug('broadcast',type,data,only);this.eachClient(client=>{if(only&&!~only.indexOf(client.id))return;debug('broadcasting to',client.id);this.push(type,data,client.id,{noRespond:true});});return this;};Service.prototype.push=function(type,data,clientId,options){var noRespond=options&&options.noRespond;var client=this.getClient(clientId);return message('_push').set({recipient:clientId,noRespond:noRespond,data:{type:type,data:data}}).send(client.port);};Service.prototype.eachClient=function(fn){for(var id in this.clients)fn(this.clients[id]);};Service.prototype.getClient=function(id){return this.clients[id];};Service.prototype.onConnect=function(message){debug('connection attempt',message.data,this.name);var data=message.data;var clientId=data.clientId;if(!clientId)return;if(data.service!==this.name)return;if(this.clients[clientId])return;this.emit('before-connect',message);if(message.defaultPrevented)return;this.upgradeChannel(message);this.addClient(clientId,message.sourcePort);message.respond();this.emit('connected',clientId);debug('connected',clientId);};Service.prototype.upgradeChannel=function(message){if(this.inWindow&&message.data.originEnv==='Window')return;var ports=message.event.ports;var channel=ports&&ports[0];if(channel){message.setSourcePort(channel);this.listen(channel);channel.start();}
debug('channel upgraded');};Service.prototype.onDisconnect=function(message){var client=this.clients[message.data];if(!client)return;this.emit('before-disconnect',message);if(message.defaultPrevented)return;this.removeClient(client.id);message.respond();this.emit('disconnected',client.id);debug('disconnected',client.id);};Service.prototype.onMethod=function(message){debug('on method',message.data);this.emit('before-method',message);if(message.defaultPrevented)return;var method=message.data;var name=method.name;var result;var fn=this.methods[name];if(!fn)throw error(4,name);try{result=fn.apply(this,method.args);}
catch(err){result=err;}
message.respond(result);};Service.prototype.onOn=function(message){debug('on on',message.data);this.emit('on',message.data);};Service.prototype.onOff=function(message){debug('on off');this.emit('off',message.data);};Service.prototype.addClient=function(id,port){this.clients[id]={id:id,port:port};};Service.prototype.removeClient=function(id){delete this.clients[id];};Service.prototype.plugin=function(fn){fn(this,{'uuid':uuid});return this;};Service.prototype.disconnect=function(client){this.removeClient(client.id);message('disconnect').set({recipient:client.id,noRespond:true}).send(client.port);};Service.prototype.destroy=function(){delete this.clients;this.unlisten();this.off();};var sp=Service.prototype;sp['broadcast']=sp.broadcast;sp['destroy']=sp.destroy;sp['method']=sp.method;sp['plugin']=sp.plugin;function error(id){var args=[].slice.call(arguments,1);return new Error({4:'method "'+args[0]+'" doesn\'t exist'}[id]);}},{"./message":4,"./utils":7}],7:[function(require,module,exports){'use strict';exports.uuid=function(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16);});};exports.deferred=function(){var promise={};promise.promise=new Promise((resolve,reject)=>{promise.resolve=resolve;promise.reject=reject;});return promise;};},{}]},{},[1]);;;var _createClass=(function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};})();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function');}}
(function(){'use strict';const Service=bridge.service;const channel=new BroadcastChannel('l20n-channel');function broadcast(type,data){return this.service.broadcast(type,data);}
function L10nError(message,id,lang){this.name='L10nError';this.message=message;this.id=id;this.lang=lang;}
L10nError.prototype=Object.create(Error.prototype);L10nError.prototype.constructor=L10nError;function load(type,url){return new Promise(function(resolve,reject){const xhr=new XMLHttpRequest();if(xhr.overrideMimeType){xhr.overrideMimeType(type);}
xhr.open('GET',url,true);if(type==='application/json'){xhr.responseType='json';}
xhr.addEventListener('load',function io_onload(e){if(e.target.status===200||e.target.status===0){resolve(e.target.response||e.target.responseText);}else{reject(new L10nError('Not found: '+url));}});xhr.addEventListener('error',reject);xhr.addEventListener('timeout',reject);try{xhr.send(null);}catch(e){if(e.name==='NS_ERROR_FILE_NOT_FOUND'){reject(new L10nError('Not found: '+url));}else{throw e;}}});}
const io={extra:function(code,ver,path,type){return navigator.mozApps.getLocalizationResource(code,ver,path,type);},app:function(code,ver,path,type){switch(type){case'text':return load('text/plain',path);case'json':return load('application/json',path);default:throw new L10nError('Unknown file type: '+type);}}};function fetchResource(res,{code,src,ver}){const url=res.replace('{locale}',code);const type=res.endsWith('.json')?'json':'text';return io[src](code,ver,url,type);}
const KNOWN_MACROS=['plural'];const MAX_PLACEABLE_LENGTH=2500;const FSI='⁨';const PDI='⁩';const resolutionChain=new WeakSet();function format(ctx,lang,args,entity){if(typeof entity==='string'){return[{},entity];}
if(resolutionChain.has(entity)){throw new L10nError('Cyclic reference detected');}
resolutionChain.add(entity);let rv;try{rv=resolveValue({},ctx,lang,args,entity.value,entity.index);}finally{resolutionChain.delete(entity);}
return rv;}
function resolveIdentifier(ctx,lang,args,id){if(KNOWN_MACROS.indexOf(id)>-1){return[{},ctx._getMacro(lang,id)];}
if(args&&args.hasOwnProperty(id)){if(typeof args[id]==='string'||typeof args[id]==='number'&&!isNaN(args[id])){return[{},args[id]];}else{throw new L10nError('Arg must be a string or a number: '+id);}}
if(id==='__proto__'){throw new L10nError('Illegal id: '+id);}
const entity=ctx._getEntity(lang,id);if(entity){return format(ctx,lang,args,entity);}
throw new L10nError('Unknown reference: '+id);}
function subPlaceable(locals,ctx,lang,args,id){let newLocals,value;try{[newLocals,value]=resolveIdentifier(ctx,lang,args,id);}catch(err){return[{error:err},FSI+'{{ '+id+' }}'+PDI];}
if(typeof value==='number'){const formatter=ctx._getNumberFormatter(lang);return[newLocals,formatter.format(value)];}
if(typeof value==='string'){if(value.length>=MAX_PLACEABLE_LENGTH){throw new L10nError('Too many characters in placeable ('+value.length+', max allowed is '+MAX_PLACEABLE_LENGTH+')');}
return[newLocals,FSI+value+PDI];}
return[{},FSI+'{{ '+id+' }}'+PDI];}
function interpolate(locals,ctx,lang,args,arr){return arr.reduce(function([localsSeq,valueSeq],cur){if(typeof cur==='string'){return[localsSeq,valueSeq+cur];}else{const[,value]=subPlaceable(locals,ctx,lang,args,cur.name);return[localsSeq,valueSeq+value];}},[locals,'']);}
function resolveSelector(ctx,lang,args,expr,index){let selectorName;if(index[0].type==='call'&&index[0].expr.type==='prop'&&index[0].expr.expr.name==='cldr'){selectorName='plural';}else{selectorName=index[0].name;}
const selector=resolveIdentifier(ctx,lang,args,selectorName)[1];if(typeof selector!=='function'){return selector;}
const argValue=index[0].args?resolveIdentifier(ctx,lang,args,index[0].args[0].name)[1]:undefined;if(selectorName==='plural'){if(argValue===0&&'zero'in expr){return'zero';}
if(argValue===1&&'one'in expr){return'one';}
if(argValue===2&&'two'in expr){return'two';}}
return selector(argValue);}
function resolveValue(locals,ctx,lang,args,expr,index){if(!expr){return[locals,expr];}
if(typeof expr==='string'||typeof expr==='boolean'||typeof expr==='number'){return[locals,expr];}
if(Array.isArray(expr)){return interpolate(locals,ctx,lang,args,expr);}
if(index){const selector=resolveSelector(ctx,lang,args,expr,index);if(selector in expr){return resolveValue(locals,ctx,lang,args,expr[selector]);}}
const defaultKey=expr.__default||'other';if(defaultKey in expr){return resolveValue(locals,ctx,lang,args,expr[defaultKey]);}
throw new L10nError('Unresolvable value');}
const locales2rules={'af':3,'ak':4,'am':4,'ar':1,'asa':3,'az':0,'be':11,'bem':3,'bez':3,'bg':3,'bh':4,'bm':0,'bn':3,'bo':0,'br':20,'brx':3,'bs':11,'ca':3,'cgg':3,'chr':3,'cs':12,'cy':17,'da':3,'de':3,'dv':3,'dz':0,'ee':3,'el':3,'en':3,'eo':3,'es':3,'et':3,'eu':3,'fa':0,'ff':5,'fi':3,'fil':4,'fo':3,'fr':5,'fur':3,'fy':3,'ga':8,'gd':24,'gl':3,'gsw':3,'gu':3,'guw':4,'gv':23,'ha':3,'haw':3,'he':2,'hi':4,'hr':11,'hu':0,'id':0,'ig':0,'ii':0,'is':3,'it':3,'iu':7,'ja':0,'jmc':3,'jv':0,'ka':0,'kab':5,'kaj':3,'kcg':3,'kde':0,'kea':0,'kk':3,'kl':3,'km':0,'kn':0,'ko':0,'ksb':3,'ksh':21,'ku':3,'kw':7,'lag':18,'lb':3,'lg':3,'ln':4,'lo':0,'lt':10,'lv':6,'mas':3,'mg':4,'mk':16,'ml':3,'mn':3,'mo':9,'mr':3,'ms':0,'mt':15,'my':0,'nah':3,'naq':7,'nb':3,'nd':3,'ne':3,'nl':3,'nn':3,'no':3,'nr':3,'nso':4,'ny':3,'nyn':3,'om':3,'or':3,'pa':3,'pap':3,'pl':13,'ps':3,'pt':3,'rm':3,'ro':9,'rof':3,'ru':11,'rwk':3,'sah':0,'saq':3,'se':7,'seh':3,'ses':0,'sg':0,'sh':11,'shi':19,'sk':12,'sl':14,'sma':7,'smi':7,'smj':7,'smn':7,'sms':7,'sn':3,'so':3,'sq':3,'sr':11,'ss':3,'ssy':3,'st':3,'sv':3,'sw':3,'syr':3,'ta':3,'te':3,'teo':3,'th':0,'ti':4,'tig':3,'tk':3,'tl':4,'tn':3,'to':0,'tr':0,'ts':3,'tzm':22,'uk':11,'ur':3,'ve':3,'vi':0,'vun':3,'wa':4,'wae':3,'wo':0,'xh':3,'xog':3,'yo':0,'zh':0,'zu':3};function isIn(n,list){return list.indexOf(n)!==-1;}
function isBetween(n,start,end){return typeof n===typeof start&&start<=n&&n<=end;}
const pluralRules={'0':function(){return'other';},'1':function(n){if(isBetween(n%100,3,10)){return'few';}
if(n===0){return'zero';}
if(isBetween(n%100,11,99)){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'2':function(n){if(n!==0&&n%10===0){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'3':function(n){if(n===1){return'one';}
return'other';},'4':function(n){if(isBetween(n,0,1)){return'one';}
return'other';},'5':function(n){if(isBetween(n,0,2)&&n!==2){return'one';}
return'other';},'6':function(n){if(n===0){return'zero';}
if(n%10===1&&n%100!==11){return'one';}
return'other';},'7':function(n){if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'8':function(n){if(isBetween(n,3,6)){return'few';}
if(isBetween(n,7,10)){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'9':function(n){if(n===0||n!==1&&isBetween(n%100,1,19)){return'few';}
if(n===1){return'one';}
return'other';},'10':function(n){if(isBetween(n%10,2,9)&&!isBetween(n%100,11,19)){return'few';}
if(n%10===1&&!isBetween(n%100,11,19)){return'one';}
return'other';},'11':function(n){if(isBetween(n%10,2,4)&&!isBetween(n%100,12,14)){return'few';}
if(n%10===0||isBetween(n%10,5,9)||isBetween(n%100,11,14)){return'many';}
if(n%10===1&&n%100!==11){return'one';}
return'other';},'12':function(n){if(isBetween(n,2,4)){return'few';}
if(n===1){return'one';}
return'other';},'13':function(n){if(isBetween(n%10,2,4)&&!isBetween(n%100,12,14)){return'few';}
if(n!==1&&isBetween(n%10,0,1)||isBetween(n%10,5,9)||isBetween(n%100,12,14)){return'many';}
if(n===1){return'one';}
return'other';},'14':function(n){if(isBetween(n%100,3,4)){return'few';}
if(n%100===2){return'two';}
if(n%100===1){return'one';}
return'other';},'15':function(n){if(n===0||isBetween(n%100,2,10)){return'few';}
if(isBetween(n%100,11,19)){return'many';}
if(n===1){return'one';}
return'other';},'16':function(n){if(n%10===1&&n!==11){return'one';}
return'other';},'17':function(n){if(n===3){return'few';}
if(n===0){return'zero';}
if(n===6){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'18':function(n){if(n===0){return'zero';}
if(isBetween(n,0,2)&&n!==0&&n!==2){return'one';}
return'other';},'19':function(n){if(isBetween(n,2,10)){return'few';}
if(isBetween(n,0,1)){return'one';}
return'other';},'20':function(n){if((isBetween(n%10,3,4)||n%10===9)&&!(isBetween(n%100,10,19)||isBetween(n%100,70,79)||isBetween(n%100,90,99))){return'few';}
if(n%1000000===0&&n!==0){return'many';}
if(n%10===2&&!isIn(n%100,[12,72,92])){return'two';}
if(n%10===1&&!isIn(n%100,[11,71,91])){return'one';}
return'other';},'21':function(n){if(n===0){return'zero';}
if(n===1){return'one';}
return'other';},'22':function(n){if(isBetween(n,0,1)||isBetween(n,11,99)){return'one';}
return'other';},'23':function(n){if(isBetween(n%10,1,2)||n%20===0){return'one';}
return'other';},'24':function(n){if(isBetween(n,3,10)||isBetween(n,13,19)){return'few';}
if(isIn(n,[2,12])){return'two';}
if(isIn(n,[1,11])){return'one';}
return'other';}};function getPluralRule(code){const index=locales2rules[code.replace(/-.*$/,'')];if(!(index in pluralRules)){return function(){return'other';};}
return pluralRules[index];}
const L20nIntl=typeof Intl!=='undefined'?Intl:{NumberFormat:function(){return{format:function(v){return v;}};}};let Context=(function(){function Context(env,langs,resIds){_classCallCheck(this,Context);this.langs=langs;this.resIds=resIds;this.env=env;this.emit=(type,evt)=>env.emit(type,evt,this);}
_createClass(Context,[{key:'_formatTuple',value:function _formatTuple(lang,args,entity,id,key){try{return format(this,lang,args,entity);}catch(err){err.id=key?id+'::'+key:id;err.lang=lang;this.emit('resolveerror',err);return[{error:err},err.id];}}},{key:'_formatEntity',value:function _formatEntity(lang,args,entity,id){const[,value]=this._formatTuple(lang,args,entity,id);const formatted={value,attrs:null};if(entity.attrs){formatted.attrs=Object.create(null);for(let key in entity.attrs){const[,attrValue]=this._formatTuple(lang,args,entity.attrs[key],id,key);formatted.attrs[key]=attrValue;}}
return formatted;}},{key:'_formatValue',value:function _formatValue(lang,args,entity,id){return this._formatTuple(lang,args,entity,id)[1];}},{key:'fetch',value:function fetch(langs=this.langs){if(langs.length===0){return Promise.resolve(langs);}
return Promise.all(this.resIds.map(resId=>this.env._getResource(langs[0],resId))).then(()=>langs);}},{key:'_resolve',value:function _resolve(langs,keys,formatter,prevResolved){const lang=langs[0];if(!lang){return reportMissing.call(this,keys,formatter,prevResolved);}
let hasUnresolved=false;const resolved=keys.map((key,i)=>{if(prevResolved&&prevResolved[i]!==undefined){return prevResolved[i];}
const[id,args]=Array.isArray(key)?key:[key,undefined];const entity=this._getEntity(lang,id);if(entity){return formatter.call(this,lang,args,entity,id);}
this.emit('notfounderror',new L10nError('"'+id+'"'+' not found in '+lang.code,id,lang));hasUnresolved=true;});if(!hasUnresolved){return resolved;}
return this.fetch(langs.slice(1)).then(nextLangs=>this._resolve(nextLangs,keys,formatter,resolved));}},{key:'formatEntities',value:function formatEntities(...keys){return this.fetch().then(langs=>this._resolve(langs,keys,this._formatEntity));}},{key:'formatValues',value:function formatValues(...keys){return this.fetch().then(langs=>this._resolve(langs,keys,this._formatValue));}},{key:'_getEntity',value:function _getEntity(lang,id){const cache=this.env.resCache;for(let i=0,resId;resId=this.resIds[i];i++){const resource=cache.get(resId+lang.code+lang.src);if(resource instanceof L10nError){continue;}
if(id in resource){return resource[id];}}
return undefined;}},{key:'_getNumberFormatter',value:function _getNumberFormatter(lang){if(!this.env.numberFormatters){this.env.numberFormatters=new Map();}
if(!this.env.numberFormatters.has(lang)){const formatter=L20nIntl.NumberFormat(lang);this.env.numberFormatters.set(lang,formatter);return formatter;}
return this.env.numberFormatters.get(lang);}},{key:'_getMacro',value:function _getMacro(lang,id){switch(id){case'plural':return getPluralRule(lang.code);default:return undefined;}}}]);return Context;})();function reportMissing(keys,formatter,resolved){const missingIds=new Set();keys.forEach((key,i)=>{if(resolved&&resolved[i]!==undefined){return;}
const id=Array.isArray(key)?key[0]:key;missingIds.add(id);resolved[i]=formatter===this._formatValue?id:{value:id,attrs:null};});this.emit('notfounderror',new L10nError('"'+Array.from(missingIds).join(', ')+'"'+' not found in any language',missingIds));return resolved;}
var MAX_PLACEABLES=100;var PropertiesParser={patterns:null,entryIds:null,emit:null,init:function(){this.patterns={comment:/^\s*#|^\s*$/,entity:/^([^=\s]+)\s*=\s*(.*)$/,multiline:/[^\\]\\$/,index:/\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,unicode:/\\u([0-9a-fA-F]{1,4})/g,entries:/[^\r\n]+/g,controlChars:/\\([\\\n\r\t\b\f\{\}\"\'])/g,placeables:/\{\{\s*([^\s]*?)\s*\}\}/};},parse:function(emit,source){if(!this.patterns){this.init();}
this.emit=emit;var entries={};var lines=source.match(this.patterns.entries);if(!lines){return entries;}
for(var i=0;i<lines.length;i++){var line=lines[i];if(this.patterns.comment.test(line)){continue;}
while(this.patterns.multiline.test(line)&&i<lines.length){line=line.slice(0,-1)+lines[++i].trim();}
var entityMatch=line.match(this.patterns.entity);if(entityMatch){try{this.parseEntity(entityMatch[1],entityMatch[2],entries);}catch(e){if(!this.emit){throw e;}}}}
return entries;},parseEntity:function(id,value,entries){var name,key;var pos=id.indexOf('[');if(pos!==-1){name=id.substr(0,pos);key=id.substring(pos+1,id.length-1);}else{name=id;key=null;}
var nameElements=name.split('.');if(nameElements.length>2){throw this.error('Error in ID: "'+name+'".'+' Nested attributes are not supported.');}
var attr;if(nameElements.length>1){name=nameElements[0];attr=nameElements[1];if(attr[0]==='$'){throw this.error('Attribute can\'t start with "$"');}}else{attr=null;}
this.setEntityValue(name,attr,key,this.unescapeString(value),entries);},setEntityValue:function(id,attr,key,rawValue,entries){var value=rawValue.indexOf('{{')>-1?this.parseString(rawValue):rawValue;var isSimpleValue=typeof value==='string';var root=entries;var isSimpleNode=typeof entries[id]==='string';if(!entries[id]&&(attr||key||!isSimpleValue)){entries[id]=Object.create(null);isSimpleNode=false;}
if(attr){if(isSimpleNode){const val=entries[id];entries[id]=Object.create(null);entries[id].value=val;}
if(!entries[id].attrs){entries[id].attrs=Object.create(null);}
if(!entries[id].attrs&&!isSimpleValue){entries[id].attrs[attr]=Object.create(null);}
root=entries[id].attrs;id=attr;}
if(key){isSimpleNode=false;if(typeof root[id]==='string'){const val=root[id];root[id]=Object.create(null);root[id].index=this.parseIndex(val);root[id].value=Object.create(null);}
root=root[id].value;id=key;isSimpleValue=true;}
if(isSimpleValue){if(id in root){throw this.error('Duplicated id: '+id);}
root[id]=value;}else{if(!root[id]){root[id]=Object.create(null);}
root[id].value=value;}},parseString:function(str){var chunks=str.split(this.patterns.placeables);var complexStr=[];var len=chunks.length;var placeablesCount=(len-1)/2;if(placeablesCount>=MAX_PLACEABLES){throw this.error('Too many placeables ('+placeablesCount+', max allowed is '+MAX_PLACEABLES+')');}
for(var i=0;i<chunks.length;i++){if(chunks[i].length===0){continue;}
if(i%2===1){complexStr.push({type:'idOrVar',name:chunks[i]});}else{complexStr.push(chunks[i]);}}
return complexStr;},unescapeString:function(str){if(str.lastIndexOf('\\')!==-1){str=str.replace(this.patterns.controlChars,'$1');}
return str.replace(this.patterns.unicode,function(match,token){return String.fromCodePoint(parseInt(token,16));});},parseIndex:function(str){var match=str.match(this.patterns.index);if(!match){throw new L10nError('Malformed index');}
if(match[2]){return[{type:'call',expr:{type:'prop',expr:{type:'glob',name:'cldr'},prop:'plural',cmpt:false},args:[{type:'idOrVar',name:match[2]}]}];}else{return[{type:'idOrVar',name:match[1]}];}},error:function(msg,type='parsererror'){const err=new L10nError(msg);if(this.emit){this.emit(type,err);}
return err;}};const MAX_PLACEABLES$1=100;var L20nParser={parse:function(emit,string){this._source=string;this._index=0;this._length=string.length;this.entries=Object.create(null);this.emit=emit;return this.getResource();},getResource:function(){this.getWS();while(this._index<this._length){try{this.getEntry();}catch(e){if(e instanceof L10nError){this.getJunkEntry();if(!this.emit){throw e;}}else{throw e;}}
if(this._index<this._length){this.getWS();}}
return this.entries;},getEntry:function(){if(this._source[this._index]==='<'){++this._index;const id=this.getIdentifier();if(this._source[this._index]==='['){++this._index;return this.getEntity(id,this.getItemList(this.getExpression,']'));}
return this.getEntity(id);}
if(this._source.startsWith('/*',this._index)){return this.getComment();}
throw this.error('Invalid entry');},getEntity:function(id,index){if(!this.getRequiredWS()){throw this.error('Expected white space');}
const ch=this._source[this._index];const hasIndex=index!==undefined;const value=this.getValue(ch,hasIndex,hasIndex);let attrs;if(value===undefined){if(ch==='>'){throw this.error('Expected ">"');}
attrs=this.getAttributes();}else{const ws1=this.getRequiredWS();if(this._source[this._index]!=='>'){if(!ws1){throw this.error('Expected ">"');}
attrs=this.getAttributes();}}
++this._index;if(id in this.entries){throw this.error('Duplicate entry ID "'+id,'duplicateerror');}
if(!attrs&&!index&&typeof value==='string'){this.entries[id]=value;}else{this.entries[id]={value,attrs,index};}},getValue:function(ch=this._source[this._index],index=false,required=true){switch(ch){case'\'':case'"':return this.getString(ch,1);case'{':return this.getHash(index);}
if(required){throw this.error('Unknown value type');}
return;},getWS:function(){let cc=this._source.charCodeAt(this._index);while(cc===32||cc===10||cc===9||cc===13){cc=this._source.charCodeAt(++this._index);}},getRequiredWS:function(){const pos=this._index;let cc=this._source.charCodeAt(pos);while(cc===32||cc===10||cc===9||cc===13){cc=this._source.charCodeAt(++this._index);}
return this._index!==pos;},getIdentifier:function(){const start=this._index;let cc=this._source.charCodeAt(this._index);if(cc>=97&&cc<=122||cc>=65&&cc<=90||cc===95){cc=this._source.charCodeAt(++this._index);}else{throw this.error('Identifier has to start with [a-zA-Z_]');}
while(cc>=97&&cc<=122||cc>=65&&cc<=90||cc>=48&&cc<=57||cc===95){cc=this._source.charCodeAt(++this._index);}
return this._source.slice(start,this._index);},getUnicodeChar:function(){for(let i=0;i<4;i++){let cc=this._source.charCodeAt(++this._index);if(cc>96&&cc<103||cc>64&&cc<71||cc>47&&cc<58){continue;}
throw this.error('Illegal unicode escape sequence');}
this._index++;return String.fromCharCode(parseInt(this._source.slice(this._index-4,this._index),16));},stringRe:/"|'|{{|\\/g,getString:function(opchar,opcharLen){const body=[];let placeables=0;this._index+=opcharLen;const start=this._index;let bufStart=start;let buf='';while(true){this.stringRe.lastIndex=this._index;const match=this.stringRe.exec(this._source);if(!match){throw this.error('Unclosed string literal');}
if(match[0]==='"'||match[0]==='\''){if(match[0]!==opchar){this._index+=opcharLen;continue;}
this._index=match.index+opcharLen;break;}
if(match[0]==='{{'){if(placeables>MAX_PLACEABLES$1-1){throw this.error('Too many placeables, maximum allowed is '+MAX_PLACEABLES$1);}
placeables++;if(match.index>bufStart||buf.length>0){body.push(buf+this._source.slice(bufStart,match.index));buf='';}
this._index=match.index+2;this.getWS();body.push(this.getExpression());this.getWS();this._index+=2;bufStart=this._index;continue;}
if(match[0]==='\\'){this._index=match.index+1;const ch2=this._source[this._index];if(ch2==='u'){buf+=this._source.slice(bufStart,match.index)+this.getUnicodeChar();}else if(ch2===opchar||ch2==='\\'){buf+=this._source.slice(bufStart,match.index)+ch2;this._index++;}else if(this._source.startsWith('{{',this._index)){buf+=this._source.slice(bufStart,match.index)+'{{';this._index+=2;}else{throw this.error('Illegal escape sequence');}
bufStart=this._index;}}
if(body.length===0){return buf+this._source.slice(bufStart,this._index-opcharLen);}
if(this._index-opcharLen>bufStart||buf.length>0){body.push(buf+this._source.slice(bufStart,this._index-opcharLen));}
return body;},getAttributes:function(){const attrs=Object.create(null);while(true){this.getAttribute(attrs);const ws1=this.getRequiredWS();const ch=this._source.charAt(this._index);if(ch==='>'){break;}else if(!ws1){throw this.error('Expected ">"');}}
return attrs;},getAttribute:function(attrs){const key=this.getIdentifier();let index;if(this._source[this._index]==='['){++this._index;this.getWS();index=this.getItemList(this.getExpression,']');}
this.getWS();if(this._source[this._index]!==':'){throw this.error('Expected ":"');}
++this._index;this.getWS();const hasIndex=index!==undefined;const value=this.getValue(undefined,hasIndex);if(key in attrs){throw this.error('Duplicate attribute "'+key,'duplicateerror');}
if(!index&&typeof value==='string'){attrs[key]=value;}else{attrs[key]={value,index};}},getHash:function(index){const items=Object.create(null);++this._index;this.getWS();let defKey;while(true){const[key,value,def]=this.getHashItem();items[key]=value;if(def){if(defKey){throw this.error('Default item redefinition forbidden');}
defKey=key;}
this.getWS();const comma=this._source[this._index]===',';if(comma){++this._index;this.getWS();}
if(this._source[this._index]==='}'){++this._index;break;}
if(!comma){throw this.error('Expected "}"');}}
if(defKey){items.__default=defKey;}else if(!index){throw this.error('Unresolvable Hash Value');}
return items;},getHashItem:function(){let defItem=false;if(this._source[this._index]==='*'){++this._index;defItem=true;}
const key=this.getIdentifier();this.getWS();if(this._source[this._index]!==':'){throw this.error('Expected ":"');}
++this._index;this.getWS();return[key,this.getValue(),defItem];},getComment:function(){this._index+=2;const start=this._index;const end=this._source.indexOf('*/',start);if(end===-1){throw this.error('Comment without a closing tag');}
this._index=end+2;},getExpression:function(){let exp=this.getPrimaryExpression();while(true){let ch=this._source[this._index];if(ch==='.'||ch==='['){++this._index;exp=this.getPropertyExpression(exp,ch==='[');}else if(ch==='('){++this._index;exp=this.getCallExpression(exp);}else{break;}}
return exp;},getPropertyExpression:function(idref,computed){let exp;if(computed){this.getWS();exp=this.getExpression();this.getWS();if(this._source[this._index]!==']'){throw this.error('Expected "]"');}
++this._index;}else{exp=this.getIdentifier();}
return{type:'prop',expr:idref,prop:exp,cmpt:computed};},getCallExpression:function(callee){this.getWS();return{type:'call',expr:callee,args:this.getItemList(this.getExpression,')')};},getPrimaryExpression:function(){const ch=this._source[this._index];switch(ch){case'$':++this._index;return{type:'var',name:this.getIdentifier()};case'@':++this._index;return{type:'glob',name:this.getIdentifier()};default:return{type:'id',name:this.getIdentifier()};}},getItemList:function(callback,closeChar){const items=[];let closed=false;this.getWS();if(this._source[this._index]===closeChar){++this._index;closed=true;}
while(!closed){items.push(callback.call(this));this.getWS();let ch=this._source.charAt(this._index);switch(ch){case',':++this._index;this.getWS();break;case closeChar:++this._index;closed=true;break;default:throw this.error('Expected "," or "'+closeChar+'"');}}
return items;},getJunkEntry:function(){const pos=this._index;let nextEntity=this._source.indexOf('<',pos);let nextComment=this._source.indexOf('/*',pos);if(nextEntity===-1){nextEntity=this._length;}
if(nextComment===-1){nextComment=this._length;}
let nextEntry=Math.min(nextEntity,nextComment);this._index=nextEntry;},error:function(message,type='parsererror'){const pos=this._index;let start=this._source.lastIndexOf('<',pos-1);const lastClose=this._source.lastIndexOf('>',pos-1);start=lastClose>start?lastClose+1:start;const context=this._source.slice(start,pos+10);const msg=message+' at pos '+pos+': `'+context+'`';const err=new L10nError(msg);if(this.emit){this.emit(type,err);}
return err;}};function walkEntry(entry,fn){if(typeof entry==='string'){return fn(entry);}
const newEntry=Object.create(null);if(entry.value){newEntry.value=walkValue(entry.value,fn);}
if(entry.index){newEntry.index=entry.index;}
if(entry.attrs){newEntry.attrs=Object.create(null);for(let key in entry.attrs){newEntry.attrs[key]=walkEntry(entry.attrs[key],fn);}}
return newEntry;}
function walkValue(value,fn){if(typeof value==='string'){return fn(value);}
if(value.type){return value;}
const newValue=Array.isArray(value)?[]:Object.create(null);const keys=Object.keys(value);for(let i=0,key;key=keys[i];i++){newValue[key]=walkValue(value[key],fn);}
return newValue;}
function createGetter(id,name){let _pseudo=null;return function getPseudo(){if(_pseudo){return _pseudo;}
const reAlphas=/[a-zA-Z]/g;const reVowels=/[aeiouAEIOU]/g;const reWords=/[^\W0-9_]+/g;const reExcluded=/(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;const charMaps={'fr-x-psaccent':'ȦƁƇḒḖƑƓĦĪĴĶĿḾȠǾƤɊŘŞŦŬṼẆẊẎẐ[\\]^_`ȧƀƈḓḗƒɠħīĵķŀḿƞǿƥɋřşŧŭṽẇẋẏẑ','ar-x-psbidi':'∀ԐↃpƎɟפHIſӼ˥WNOԀÒᴚS⊥∩ɅＭXʎZ[\\]ᵥ_,ɐqɔpǝɟƃɥıɾʞʅɯuodbɹsʇnʌʍxʎz'};const mods={'fr-x-psaccent':val=>val.replace(reVowels,match=>match+match.toLowerCase()),'ar-x-psbidi':val=>val.replace(reWords,match=>'‮'+match+'‬')};const replaceChars=(map,val)=>val.replace(reAlphas,match=>map.charAt(match.charCodeAt(0)-65));const transform=val=>replaceChars(charMaps[id],mods[id](val));const apply=(fn,val)=>{if(!val){return val;}
const parts=val.split(reExcluded);const modified=parts.map(function(part){if(reExcluded.test(part)){return part;}
return fn(part);});return modified.join('');};return _pseudo={name:transform(name),process:str=>apply(transform,str)};};}
const pseudo=Object.defineProperties(Object.create(null),{'fr-x-psaccent':{enumerable:true,get:createGetter('fr-x-psaccent','Runtime Accented')},'ar-x-psbidi':{enumerable:true,get:createGetter('ar-x-psbidi','Runtime Bidi')}});function emit(listeners,...args){const type=args.shift();if(listeners['*']){listeners['*'].slice().forEach(listener=>listener.apply(this,args));}
if(listeners[type]){listeners[type].slice().forEach(listener=>listener.apply(this,args));}}
function addEventListener(listeners,type,listener){if(!(type in listeners)){listeners[type]=[];}
listeners[type].push(listener);}
function removeEventListener(listeners,type,listener){const typeListeners=listeners[type];const pos=typeListeners.indexOf(listener);if(pos===-1){return;}
typeListeners.splice(pos,1);}
let Env=(function(){function Env(fetchResource){_classCallCheck(this,Env);this.fetchResource=fetchResource;this.resCache=new Map();this.resRefs=new Map();this.numberFormatters=null;this.parsers={properties:PropertiesParser,l20n:L20nParser};const listeners={};this.emit=emit.bind(this,listeners);this.addEventListener=addEventListener.bind(this,listeners);this.removeEventListener=removeEventListener.bind(this,listeners);}
_createClass(Env,[{key:'createContext',value:function createContext(langs,resIds){const ctx=new Context(this,langs,resIds);resIds.forEach(resId=>{const usedBy=this.resRefs.get(resId)||0;this.resRefs.set(resId,usedBy+1);});return ctx;}},{key:'destroyContext',value:function destroyContext(ctx){ctx.resIds.forEach(resId=>{const usedBy=this.resRefs.get(resId)||0;if(usedBy>1){return this.resRefs.set(resId,usedBy-1);}
this.resRefs.delete(resId);this.resCache.forEach((val,key)=>key.startsWith(resId)?this.resCache.delete(key):null);});}},{key:'_parse',value:function _parse(syntax,lang,data){const parser=this.parsers[syntax];if(!parser){return data;}
const emit=(type,err)=>this.emit(type,amendError(lang,err));return parser.parse.call(parser,emit,data);}},{key:'_create',value:function _create(lang,entries){if(lang.src!=='pseudo'){return entries;}
const pseudoentries=Object.create(null);for(let key in entries){pseudoentries[key]=walkEntry(entries[key],pseudo[lang.code].process);}
return pseudoentries;}},{key:'_getResource',value:function _getResource(lang,res){const cache=this.resCache;const id=res+lang.code+lang.src;if(cache.has(id)){return cache.get(id);}
const syntax=res.substr(res.lastIndexOf('.')+1);const saveEntries=data=>{const entries=this._parse(syntax,lang,data);cache.set(id,this._create(lang,entries));};const recover=err=>{err.lang=lang;this.emit('fetcherror',err);cache.set(id,err);};const langToFetch=lang.src==='pseudo'?{code:'en-US',src:'app',ver:lang.ver}:lang;const resource=this.fetchResource(res,langToFetch).then(saveEntries,recover);cache.set(id,resource);return resource;}}]);return Env;})();function amendError(lang,err){err.lang=lang;return err;}
function prioritizeLocales(def,availableLangs,requested){let supportedLocale;for(let i=0;i<requested.length;i++){const locale=requested[i];if(availableLangs.indexOf(locale)!==-1){supportedLocale=locale;break;}}
if(!supportedLocale||supportedLocale===def){return[def];}
return[supportedLocale,def];}
function negotiateLanguages({appVersion,defaultLang,availableLangs},additionalLangs,prevLangs,requestedLangs){const allAvailableLangs=Object.keys(availableLangs).concat(Object.keys(additionalLangs)).concat(Object.keys(pseudo));const newLangs=prioritizeLocales(defaultLang,allAvailableLangs,requestedLangs);const langs=newLangs.map(code=>({code:code,src:getLangSource(appVersion,availableLangs,additionalLangs,code),ver:appVersion}));return{langs,haveChanged:!arrEqual(prevLangs,newLangs)};}
function arrEqual(arr1,arr2){return arr1.length===arr2.length&&arr1.every((elem,i)=>elem===arr2[i]);}
function getMatchingLangpack(appVersion,langpacks){for(let i=0,langpack;langpack=langpacks[i];i++){if(langpack.target===appVersion){return langpack;}}
return null;}
function getLangSource(appVersion,availableLangs,additionalLangs,code){if(additionalLangs&&additionalLangs[code]){const lp=getMatchingLangpack(appVersion,additionalLangs[code]);if(lp&&(!(code in availableLangs)||parseInt(lp.revision)>availableLangs[code])){return'extra';}}
if(code in pseudo&&!(code in availableLangs)){return'pseudo';}
return'app';}
let Remote=(function(){function Remote(fetchResource,broadcast){_classCallCheck(this,Remote);this.broadcast=broadcast;this.env=new Env(fetchResource);this.ctxs=new Map();}
_createClass(Remote,[{key:'registerView',value:function registerView(view,resources,meta,additionalLangs,requestedLangs){const{langs}=negotiateLanguages(meta,additionalLangs,[],requestedLangs);this.ctxs.set(view,this.env.createContext(langs,resources));return langs;}},{key:'unregisterView',value:function unregisterView(view){this.ctxs.delete(view);return true;}},{key:'formatEntities',value:function formatEntities(view,keys){return this.ctxs.get(view).formatEntities(...keys);}},{key:'formatValues',value:function formatValues(view,keys){return this.ctxs.get(view).formatValues(...keys);}},{key:'changeLanguages',value:function changeLanguages(view,meta,additionalLangs,requestedLangs){const oldCtx=this.ctxs.get(view);const prevLangs=oldCtx.langs;const newLangs=negotiateLanguages(meta,additionalLangs,prevLangs,requestedLangs);this.ctxs.set(view,this.env.createContext(newLangs.langs,oldCtx.resIds));return newLangs;}},{key:'requestLanguages',value:function requestLanguages(requestedLangs){this.broadcast('languageschangerequest',requestedLangs);}},{key:'getName',value:function getName(code){return pseudo[code].name;}},{key:'processString',value:function processString(code,str){return pseudo[code].process(str);}}]);return Remote;})();const remote=new Remote(fetchResource,broadcast);remote.service=new Service('l20n').method('registerView',(...args)=>remote.registerView(...args)).method('requestLanguages',(...args)=>remote.requestLanguages(...args)).method('changeLanguages',(...args)=>remote.changeLanguages(...args)).method('formatEntities',(...args)=>remote.formatEntities(...args)).method('formatValues',(...args)=>remote.formatValues(...args)).method('getName',(...args)=>remote.getName(...args)).method('processString',(...args)=>remote.processString(...args)).on('disconnect',clientId=>remote.unregisterView(clientId)).listen(channel);})();;;var _createClass=(function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};})();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function');}}
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
const client=new Client({service:'l20n',endpoint:channel,timeout:false});document.l10n=new View(client,document);window.addEventListener('pageshow',()=>client.connect());window.addEventListener('pagehide',()=>client.disconnect());window.addEventListener('languagechange',document.l10n);document.addEventListener('additionallanguageschange',document.l10n);navigator.mozL10n={setAttributes:document.l10n.setAttributes,getAttributes:document.l10n.getAttributes,formatValue:(...args)=>document.l10n.formatValue(...args),translateFragment:(...args)=>document.l10n.translateFragment(...args),once:cb=>document.l10n.ready.then(cb),ready:cb=>document.l10n.ready.then(()=>{document.addEventListener('DOMRetranslated',cb);cb();})};})();;;(function(global){'use strict';const helperCache=new Map();const knownObjects={datetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
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
window.addEventListener('timeformatchange',global.IntlHelper,false);window.addEventListener('languagechange',global.IntlHelper,false);window.addEventListener('moztimechange',global.IntlHelper,false);})(this);;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;(function(define){define(function(require,exports,module){'use strict';var GaiaDialogMenu=require('gaia-dialog-menu');var forEach=[].forEach;var slice=[].slice;var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){this.createShadowRoot().innerHTML=template;this.els={inner:this.shadowRoot.querySelector('.inner'),moreButton:this.shadowRoot.querySelector('.more-button')};this.els.moreButton.addEventListener('click',this.openOverflow.bind(this));var self=this;this.reflow_raf=rafWrap(this.reflow,this);addEventListener('resize',this.reflow_raf);this.shadowStyleHack();if(document.readyState==='loading'){addEventListener('load',this.reflow.bind(this));return;}
this.style.visibility='hidden';self.reflow_raf();};proto.attachedCallback=function(){this.style.visibility='hidden';this.reflow_raf();};proto.reflow=function(){this.release();var overflow=this.getOverflowData();if(overflow.overflowed){this.onOverflowed(overflow);}
this.style.visibility='';};proto.getOverflowData=function(){var space=this.els.inner.clientWidth;var child=this.children[0];var overflowed=false;var willFit=0;var total=0;var overflow;var width;while(child){width=child.clientWidth;overflow=width+total-space;if(overflow>3){overflowed=true;break;}
willFit++;total+=width;child=child.nextElementSibling;}
return{willFit:willFit,remaining:space-total,overflowed:overflowed};};proto.onOverflowed=function(overflow){var items=slice.call(this.children,0,-1);var minMoreButtonWidth=70;var extra=overflow.remaining<minMoreButtonWidth?1:0;var numToHide=items.length-overflow.willFit+extra;this.hiddenChildren=slice.call(items,0-numToHide);this.hiddenChildren.forEach(function(el){el.classList.add('overflowing');});this.els.inner.classList.add('overflowed');};proto.release=function(){if(!this.hiddenChildren){return;}
this.els.inner.classList.remove('overflowed');forEach.call(this.hiddenChildren,function(el){el.classList.remove('overflowing');});};proto.getTotalItemLength=function(){return[].reduce.call(this.children,function(total,el){return total+el.clientWidth;},0);};proto.shadowStyleHack=function(){var style=this.shadowRoot.querySelector('style').cloneNode(true);this.classList.add('-content','-host');style.setAttribute('scoped','');this.appendChild(style);};proto.openOverflow=function(e){this.dialog=new GaiaDialogMenu();this.hiddenChildren.forEach(function(el){this.dialog.appendChild(el);el.classList.remove('overflowing');},this);this.appendChild(this.dialog);this.dialog.addEventListener('click',this.dialog.close.bind(this.dialog));this.dialog.addEventListener('closed',this.onDialogClosed.bind(this));this.dialog.open(e);};proto.onDialogClosed=function(){this.dialog.remove();this.dialog=null;this.hiddenChildren.forEach(function(el){el.classList.add('overflowing');this.insertBefore(el,this.lastChild);},this);};var template=`
<style>

/** Reset
 ---------------------------------------------------------*/

::-moz-focus-inner { border: 0; }

/** Host
 ---------------------------------------------------------*/

.-host {
  display: block;
}

/** Inner
 ---------------------------------------------------------*/

.inner {
  display: flex;
  height: 45px;
  overflow: hidden;

  border-top: 1px solid;
  border-color:
    var(--border-color,
    var(--background-plus));

  justify-content: space-between;
}

/** Direct Children
 ---------------------------------------------------------*/

.-content > *,
.more-button {
  box-sizing: border-box;
  flex: 1 0 0;
  height: 100%;
  margin: 0;
  padding: 0 6px;
  border: 0;
  font-size: 17px;
  line-height: 45px;
  font-style: italic;
  font-weight: lighter;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms 300ms;

  color:
    var(--text-color, inherit);
}

/**
 * :active
 */

.more-button :active,
.-content > :active {
  transition: none;
  color: var(--highlight-color);
}

/**
 * .overflowing
 */

.-content > .overflowing {
  display: none;
}

/**
 * [disabled]
 */

.-content > [disabled] {
  pointer-events: none;
  opacity: 0.3;
}

.-content > [data-icon] {
  font-size: 0;
}

/** Style
 ---------------------------------------------------------*/

style {
  display: none !important;
}

/** More Button
 ---------------------------------------------------------*/

.more-button {
  display: none;
  flex: 0.7;
}

/** More Button Icon
 ---------------------------------------------------------*/

.more-button:before {
  font-family: 'gaia-icons';
  font-weight: 500;
  content: 'more';
  text-rendering: optimizeLegibility;
  font-style: normal;
  font-size: 32px;
}

/**
 * .overflowed
 */

.overflowed .more-button {
  display: block;
}

</style>

<div class="inner">
  <content></content>
  <button class="more-button"></button>
</div>`;function rafWrap(fn,ctx){var raf=requestAnimationFrame;var frame;return function(){if(frame){return;}
var args=arguments;frame=raf(function(){raf(function(){frame=null;fn.apply(ctx,arguments);});});};}
try{module.exports=document.registerElement('gaia-toolbar',{prototype:proto});module.exports.proto=proto;}catch(e){if(e.name!=='NotSupportedError'){throw e;}}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-toolbar',this));;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){var buttons=document.createDocumentFragment();[].forEach.call(this.querySelectorAll('button'),(button)=>{buttons.appendChild(button);});var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style>
  #heading:empty,
  #message:empty,
  #menu:empty {
    display: none;
  }
  #container {
    background-color: #2d2d2d;
    display: flex;
    flex-flow: column nowrap;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    overflow: hidden;
    -moz-user-select: none;
  }
  #content {
    box-sizing: border-box;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    flex: 1 0 auto;
    padding: 1rem 1.5rem;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    vertical-align: middle;
    word-wrap: break-word;
  }
  #heading {
    color: #fff;
    font-size: 1.6rem;
    line-height: 1.6rem;
    margin: 0;
    padding: 0;
  }
  #message {
    border-top: 0.1rem solid #686868;
    color: #fafafa;
    font-size: 2.2rem;
    font-weight: 300;
    line-height: 3rem;
    margin: 1rem 0 0;
    padding: 1rem 0 0;
  }
  #heading:empty + #message {
    border: none;
    padding: 0;
  }
  #menu {
    box-sizing: border-box;
    display: flex;
    flex-flow: row nowrap;
    flex: 0 0 auto;
    margin: 0;
    padding: 1.5rem;
    width: 100%;
  }
  #menu > button {
    background: #d8d8d8;
    border: none;
    border-radius: 2rem;
    color: #333;
    outline: none;
    font-family: sans-serif;
    font-size: 1.6rem;
    font-style: italic;
    line-height: 4rem;
    box-sizing: border-box;
    flex: 1 1 auto;
    padding: 0 0.2rem;
    height: 4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background 200ms 280ms, color 200ms 280ms;
  }
  #menu > button:active {
    background: #00aacc;
    color: #fff;
    transition: none;
  }
  #menu > button.primary {
    background: #00caf2;
    color: #fff;
  }
  #menu > button.danger {
    background: #e51e1e;
    color: #fff;
  }
  #menu > button.primary:active {
    background: #006579;
    color: #c8c8c8;
  }
  #menu > button.danger:active {
    background: #730f0f;
    color: #c8c8c8;
  }
  #menu > button[disabled] {
    background: #565656;
    color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  #menu > button.primary[disabled] {
    background: #006579;
  }
  #menu > button.danger[disabled] {
    background: #730f0f;
  }
  #menu > button + button {
    margin-left: 1rem;
  }
</style>
<form id="container" role="dialog">
  <section id="content">
    <h1 id="heading"></h1>
    <p id="message"></p>
  </section>
  <menu id="menu"></menu>
</form>`;var $id=shadowRoot.getElementById.bind(shadowRoot);this.els={container:$id('container'),content:$id('content'),heading:$id('heading'),message:$id('message'),menu:$id('menu')};this.els.menu.appendChild(buttons);this.els.menu.addEventListener('click',(evt)=>{var button=evt.target.closest('button[data-action]');if(button){this.dispatchEvent(new CustomEvent('action',{detail:button.dataset.action}));}});this.els.heading.textContent=this.getAttribute('heading');this.els.message.textContent=this.getAttribute('message');this.els.heading.dataset.l10nId=this.getAttribute('heading-l10n-id');this.els.message.dataset.l10nId=this.getAttribute('message-l10n-id');this.onDOMRetranslated=()=>{document.l10n.translateFragment(shadowRoot);};};proto.attachedCallback=function(){document.addEventListener('DOMRetranslated',this.onDOMRetranslated);this.onDOMRetranslated();};proto.detachedCallback=function(){document.removeEventListener('DOMRetranslated',this.onDOMRetranslated);};proto.attributeChangedCallback=function(attr,oldVal,newVal){switch(attr){case'heading':this.els.heading.textContent=newVal;break;case'message':this.els.message.textContent=newVal;break;case'heading-l10n-id':this.els.heading.dataset.l10nId=newVal;this.onDOMRetranslated();break;case'message-l10n-id':this.els.message.dataset.l10nId=newVal;this.onDOMRetranslated();break;}};proto.addActionButton=function(title,action,className=''){var button=document.createElement('button');button.type='button';button.textContent=title;button.dataset.action=action;button.className=className;this.els.menu.appendChild(button);};proto.removeActionButton=function(action){var buttons=this.els.menu.querySelectorAll(`[data-action="${action}"]`);[].forEach.call(buttons,button=>this.els.menu.removeChild(button));};['heading','message'].forEach((prop)=>{Object.defineProperty(proto,prop,{get:function(){return this.getAttribute(prop);},set:function(value){this.setAttribute(prop,value||'');}});});try{window.MusicOverlay=document.registerElement('music-overlay',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);injectGlobalStyles();proto.createdCallback=function(){var shadowRoot=this.createShadowRoot();shadowRoot.innerHTML=`<style scoped>
  [hidden] {
    display: none;
  }
  #container {
    background-color: #333;
    color: #fff;
    position: relative;
    width: 100%;
    height: 5rem;
    overflow: hidden;
    -moz-user-select: none;
  }
  #spinner {
    background: url('/img/ui/music-scan-progress.png') no-repeat center center / 100% auto;
    border: none;
    display: block;
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 2.9rem;
    height: 2.9rem;
    animation: 0.9s music-scan-progress-spinner infinite linear;
  }
  #spinner::-moz-progress-bar {
    background: none;
  }
  #value {
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 5rem;
    text-align: center;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 5rem;
    height: 5rem;
  }
  #heading,
  #subheading {
    font-weight: normal;
    box-sizing: border-box;
    position: absolute;
    margin: 0;
    padding: 0 0.5rem;
    left: 5rem;
    width: calc(100% - 5rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #heading {
    font-size: 1.9rem;
    line-height: 3rem;
    top: 0;
  }
  #subheading {
    font-size: 1.4rem;
    top: 3rem;
  }
</style>
<div id="container">
  <progress id="spinner"></progress>
  <span id="value"></span>
  <h1 id="heading"></h1>
  <h2 id="subheading"></h2>
</div>`;var $id=shadowRoot.getElementById.bind(shadowRoot);this.els={container:$id('container'),spinner:$id('spinner'),value:$id('value'),heading:$id('heading'),subheading:$id('subheading')};if(!this.hasAttribute('value')&&!this.hasAttribute('heading')&&!this.hasAttribute('subheading')){this.els.container.hidden=true;}
this.value=this.getAttribute('value');this.heading=this.getAttribute('heading');this.subheading=this.getAttribute('subheading');this.onDOMRetranslated=()=>{document.l10n.translateFragment(shadowRoot);};};proto.attachedCallback=function(){document.addEventListener('DOMRetranslated',this.onDOMRetranslated);this.onDOMRetranslated();};proto.detachedCallback=function(){document.removeEventListener('DOMRetranslated',this.onDOMRetranslated);};proto.attributeChangedCallback=function(attr,oldVal,newVal){var promise;var l10nId=this.getAttribute(attr+'-l10n-id');if(!newVal&&l10nId){promise=document.l10n.formatValues(l10nId);}else{promise=Promise.resolve();}
promise.then(()=>{switch(attr){case'value':this.els.value.textContent=newVal;break;case'heading':this.els.heading.textContent=newVal;break;case'subheading':this.els.subheading.textContent=newVal;break;}});};proto.update=function(properties={}){this.value=properties.value||this.value;this.heading=properties.heading||this.heading;this.subheading=properties.subheading||this.subheading;this.els.container.hidden=false;};proto.clear=function(){this.els.container.hidden=true;};['value','heading','subheading'].forEach((prop)=>{Object.defineProperty(proto,prop,{get:function(){return this.getAttribute(prop);},set:function(value){this.setAttribute(prop,value||'');}});});function injectGlobalStyles(){var style=document.createElement('style');style.innerHTML=`@keyframes music-scan-progress-spinner {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;document.head.appendChild(style);}
try{window.MusicScanProgress=document.registerElement('music-scan-progress',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;(function(window){'use strict';var GaiaToolbar=window['gaia-toolbar'];var proto=Object.create(GaiaToolbar.prototype);proto.createdCallback=function(){GaiaToolbar.prototype.createdCallback.apply(this,arguments);this.querySelector('style').innerHTML+=`music-tab-bar {
  background-color: var(--background-minus);
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  -moz-user-select: none;
}

.-content {
  direction: ltr;
}

.-content > *,
.more-button {
  transition: none;
}

.-content > .selected {
  color: var(--highlight-color);
}`;this.addEventListener('click',(evt)=>{var tab=evt.target.closest('button');if(!tab||tab===this.selectedElement){return;}
this.selectedElement=tab;this.dispatchEvent(new CustomEvent('change',{detail:{selectedElement:this.selectedElement,selectedIndex:this.selectedIndex}}));});this.selectedIndex=0;this.reflow();};Object.defineProperty(proto,'selectedElement',{get:function(){return this.querySelectorAll('button')[this.selectedIndex];},set:function(value){var index=[].indexOf.call(this.querySelectorAll('button'),value);if(index!==-1){this.selectedIndex=index;}}});Object.defineProperty(proto,'selectedIndex',{get:function(){return this._selectedIndex||0;},set:function(value){var tabs=this.querySelectorAll('button');if(this._selectedIndex===value||value<0||value>=tabs.length){return;}
this._selectedIndex=value;[].forEach.call(tabs,(tab,index)=>{if(index===this._selectedIndex){tab.classList.add('selected');return;}
tab.classList.remove('selected');});}});try{window.MusicTabBar=document.registerElement('music-tab-bar',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}})(window);;;(function(window){'use strict';var proto=Object.create(HTMLElement.prototype);proto.createdCallback=function(){var style=document.createElement('style');style.innerHTML=`music-view-stack {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  -moz-user-select: none;
}
music-view-stack > iframe {
  border: none;
  visibility: hidden;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}
music-view-stack > iframe.active,
music-view-stack > iframe.fade,
music-view-stack > iframe.pop,
music-view-stack > iframe.push {
  animation-duration: 0.2s;
  animation-timing-function: linear;
  visibility: visible;
}
music-view-stack > iframe.active {
  pointer-events: auto;
}
music-view-stack > iframe.fade {
  animation-duration: 0s;
}
music-view-stack > iframe.fade.in {
  animation-name: fade-in;
}
music-view-stack > iframe.fade.out {
  animation-name: fade-out;
}
music-view-stack > iframe.pop.in {
  animation-name: pop-in;
}
music-view-stack > iframe.pop.out {
  animation-name: pop-out;
}
music-view-stack > iframe.push.in {
  animation-name: push-in;
}
music-view-stack > iframe.push.out {
  animation-name: push-out;
}
[dir="rtl"] music-view-stack > iframe.pop.in {
  animation-name: push-in;
}
[dir="rtl"] music-view-stack > iframe.pop.out {
  animation-name: push-out;
}
[dir="rtl"] music-view-stack > iframe.push.in {
  animation-name: pop-in;
}
[dir="rtl"] music-view-stack > iframe.push.out {
  animation-name: pop-out;
}
@keyframes fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes fade-out {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes pop-in {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
@keyframes pop-out {
  0%   { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes push-in {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
@keyframes push-out {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}`;if(this.firstChild){this.insertBefore(style,this.firstChild);}else{this.appendChild(style);}
this.cachedViews={};[].forEach.call(this.querySelectorAll('iframe'),(frame)=>{var location=new URL(frame.src);var view={url:location.pathname+location.search,frame:frame,title:frame.contentDocument.title};this.initializeView(view).then((view)=>{if(this.activeView===view){this.dispatchEvent(new CustomEvent('titlechange',{detail:view.title}));}});this.cachedViews[view.url]=view;});this.addEventListener('animationend',(evt)=>{var classList=evt.target.classList;if(classList.contains('destroy')){this.destroyView(evt.target.src);}
classList.remove('fade','pop','push','in','out');});this.views=[];this.activeView=null;};proto.loadView=function(url){var view=this.cachedViews[url];if(view){return Promise.resolve(view);}
var frame=document.createElement('iframe');this.appendChild(frame);frame.src=url;view={url:url,frame:frame,title:''};return this.initializeView(view);};proto.initializeView=function(view){view.frame.addEventListener('rendered',()=>{this.dispatchEvent(new CustomEvent('rendered'));});view.frame.addEventListener('titlechange',(evt)=>{view.title=evt.detail;if(this.activeView===view){this.dispatchEvent(new CustomEvent('titlechange',{detail:evt.detail}));}});const onL10nReady=()=>{view.title=view.frame.contentDocument.title;this.cachedViews[view.url]=view;this.dispatchEvent(new CustomEvent('loaded'));return view;};return loaded(view.frame).then(()=>view.frame.contentDocument.l10n.ready).then(onL10nReady);};proto.destroyView=function(url){for(var key in this.cachedViews){var view=this.cachedViews[key];if(key===url||view.frame.src===url){view.frame.contentWindow.dispatchEvent(new CustomEvent('viewdestroy'));delete this.cachedViews[key];setTimeout(()=>this.removeChild(view.frame),5000);return;}}};proto.setRootView=function(url){return this.loadView(url).then((view)=>{var oldActiveView=this.activeView;if(oldActiveView){oldActiveView.frame.classList.add('fade','out');oldActiveView.frame.classList.remove('active');oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));}
this.views=[view];this.activeView=view;var newActiveView=this.activeView;newActiveView.frame.classList.add('fade','in');newActiveView.frame.classList.add('active');newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));this.dispatchEvent(new CustomEvent('change',{detail:newActiveView}));});};proto.pushView=function(url){if(!this.activeView){return this.setRootView(url);}
return this.loadView(url).then((view)=>{requestAnimationFrame(()=>{var oldActiveView=this.activeView;oldActiveView.frame.classList.add('push','out');oldActiveView.frame.classList.remove('active');oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));this.views.push(view);this.activeView=view;var newActiveView=this.activeView;newActiveView.frame.classList.add('push','in','active');newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));this.dispatchEvent(new CustomEvent('change',{detail:newActiveView}));});});};proto.popView=function(destroy){if(this.views.length<2){return Promise.reject();}
var oldActiveView=this.activeView;this.views.pop();this.activeView=this.views[this.views.length-1];var newActiveView=this.activeView;return new Promise((resolve)=>{requestAnimationFrame(()=>{oldActiveView.frame.classList.add('pop','out');oldActiveView.frame.classList.remove('active');oldActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));if(destroy){oldActiveView.frame.classList.add('destroy');}
newActiveView.frame.classList.add('pop','in','active');newActiveView.frame.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));this.dispatchEvent(new CustomEvent('change',{detail:newActiveView}));resolve();});});};try{window.MusicViewStack=document.registerElement('music-view-stack',{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}
function loaded(frame){return new Promise((resolve)=>{frame.addEventListener('load',function onLoad(){frame.removeEventListener('load',onLoad);resolve();});});}})(window);;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;;'use strict';var MediaDB=(function(){function MediaDB(mediaType,metadataParser,options){this.mediaType=mediaType;this.metadataParser=metadataParser;if(!options){options={};}
this.indexes=options.indexes||[];this.version=options.version||1;this.mimeTypes=options.mimeTypes;this.autoscan=(options.autoscan!==undefined)?options.autoscan:true;this.state=MediaDB.OPENING;this.scanning=false;this.initialScanComplete=false;this.parsingBigFiles=false;this.updateRecord=options.updateRecord;this.reparsedRecord=options.reparsedRecord;if(options.excludeFilter&&(options.excludeFilter instanceof RegExp)){this.clientExcludeFilter=options.excludeFilter;}
this.batchHoldTime=options.batchHoldTime||100;this.batchSize=options.batchSize||0;this.dbname='MediaDB/'+this.mediaType+'/';var media=this;this.details={eventListeners:{},pendingInsertions:[],pendingDeletions:[],whenDoneProcessing:[],pendingCreateNotifications:[],pendingDeleteNotifications:[],pendingNotificationTimer:null,newestFileModTime:0};if(!this.metadataParser){this.metadataParser=function(file,callback){setTimeout(function(){callback({});},0);};}
var dbVersion=(0xFFFF&this.version)<<16|(0xFFFF&MediaDB.VERSION);var openRequest=indexedDB.open(this.dbname,dbVersion);openRequest.onerror=function(e){console.error('MediaDB():',openRequest.error.name);};openRequest.onblocked=function(e){console.error('indexedDB.open() is blocked in MediaDB()');};openRequest.onupgradeneeded=function(e){var db=openRequest.result;var transaction=e.target.transaction;var oldVersion=e.oldVersion;var oldDbVersion=0xFFFF&oldVersion;var oldClientVersion=0xFFFF&(oldVersion>>16);if(oldClientVersion===0){oldDbVersion=2;oldClientVersion=oldVersion/oldDbVersion;}
if(0===db.objectStoreNames.length){createObjectStores(db);}else{handleUpgrade(db,transaction,oldDbVersion,oldClientVersion);}};openRequest.onsuccess=function(e){media.db=openRequest.result;media.db.onerror=function(event){console.error('MediaDB: ',event.target.error&&event.target.error.name);};changeState(media,MediaDB.ENUMERABLE);var cursorRequest=media.db.transaction('files','readonly').objectStore('files').index('date').openCursor(null,'prev');cursorRequest.onerror=function(){console.error('MediaDB initialization error',cursorRequest.error);};cursorRequest.onsuccess=function(){var cursor=cursorRequest.result;if(cursor){media.details.newestFileModTime=cursor.value.date;}
else{media.details.newestFileModTime=0;}
initDeviceStorage();};};function createObjectStores(db){var filestore=db.createObjectStore('files',{keyPath:'name'});filestore.createIndex('date','date');media.indexes.forEach(function(indexName){if(indexName==='name'||indexName==='date'){return;}
filestore.createIndex(indexName,indexName);});}
function enumerateOldFiles(store,callback){var openCursorReq=store.openCursor();openCursorReq.onsuccess=function(){var cursor=openCursorReq.result;if(cursor){callback(cursor.value);cursor.continue();}};}
function handleUpgrade(db,trans,oldDbVersion,oldClientVersion){media.state=MediaDB.UPGRADING;var evtDetail={'oldMediaDBVersion':oldDbVersion,'oldClientVersion':oldClientVersion,'newMediaDBVersion':MediaDB.VERSION,'newClientVersion':media.version};dispatchEvent(media,'upgrading',evtDetail);var store=trans.objectStore('files');if(media.version!=oldClientVersion){upgradeIndexesChanges(store);}
var clientUpgradeNeeded=(media.version!=oldClientVersion)&&media.updateRecord;if((2!=oldDbVersion||3!=MediaDB.VERSION)&&!clientUpgradeNeeded){return;}
enumerateOldFiles(store,function doUpgrade(dbfile){if(2==oldDbVersion&&3==MediaDB.VERSION){upgradeDBVer2to3(store,dbfile);}
if(clientUpgradeNeeded){handleClientUpgrade(store,dbfile,oldClientVersion);}});}
function upgradeIndexesChanges(store){var dbIndexes=store.indexNames;var clientIndexes=media.indexes;for(var i=0;i<dbIndexes.length;i++){if('name'===dbIndexes[i]||'date'===dbIndexes[i]){continue;}
if(clientIndexes.indexOf(dbIndexes[i])<0){store.deleteIndex(dbIndexes[i]);}}
for(i=0;i<clientIndexes.length;i++){if(!dbIndexes.contains(clientIndexes[i])){store.createIndex(clientIndexes[i],clientIndexes[i]);}}}
function upgradeDBVer2to3(store,dbfile){if(dbfile.name[0]==='/'){return;}
store.delete(dbfile.name);dbfile.name='/sdcard/'+dbfile.name;store.add(dbfile);}
function handleClientUpgrade(store,dbfile,oldClientVersion){try{dbfile.metadata=media.updateRecord(dbfile,oldClientVersion,media.version);if(dbfile.needsReparse&&!media.reparsedRecord){console.warn('client app requested reparse, but no reparsedRecord was set');delete dbfile.needsReparse;}
store.put(dbfile);}catch(ex){console.warn('client app updates record, '+dbfile.name+', failed: '+ex.message);}}
function initDeviceStorage(){var details=media.details;details.storages=navigator.getDeviceStorages(mediaType);details.availability={};getStorageAvailability();function getStorageAvailability(){var next=0;getNextAvailability();function getNextAvailability(){if(next>=details.storages.length){setupHandlers();return;}
var s=details.storages[next++];var name=s.storageName;var req=s.available();req.onsuccess=function(e){details.availability[name]=req.result;getNextAvailability();};req.onerror=function(e){details.availability[name]='unavailable';getNextAvailability();};}}
function setupHandlers(){for(var i=0;i<details.storages.length;i++){details.storages[i].addEventListener('change',changeHandler);}
details.dsEventListener=changeHandler;sendInitialEvent();}
function sendInitialEvent(){var state=getState(details.availability);changeState(media,state);if(media.autoscan){scan(media);}}
function getState(availability){var n=0;var a=0;var u=0;var s=0;for(var name in availability){n++;switch(availability[name]){case'available':a++;break;case'unavailable':u++;break;case'shared':s++;break;}}
if(s>0){return MediaDB.UNMOUNTED;}
if(u===n){return MediaDB.NOCARD;}
return MediaDB.READY;}
function changeHandler(e){switch(e.reason){case'modified':case'deleted':fileChangeHandler(e);return;case'available':case'unavailable':case'shared':volumeChangeHandler(e);return;default:return;}}
function volumeChangeHandler(e){var storageName=e.target.storageName;if(details.availability[storageName]===e.reason){return;}
var oldState=media.state;details.availability[storageName]=e.reason;var newState=getState(details.availability);if(newState!==oldState){changeState(media,newState);if(newState===MediaDB.READY){if(media.autoscan){scan(media);}}
else{endscan(media);}}
else if(newState===MediaDB.READY){if(e.reason==='available'){dispatchEvent(media,'ready');if(media.autoscan){scan(media);}}
else if(e.reason==='unavailable'){dispatchEvent(media,'cardremoved');deleteAllFiles(storageName);}}}
function fileChangeHandler(e){var filename=e.path;if(ignoreName(media,filename)){return;}
if(e.reason==='modified'){insertRecord(media,filename);}else{deleteRecord(media,filename);}}
function deleteAllFiles(storageName){var storagePrefix=storageName?'/'+storageName+'/':'';var store=media.db.transaction('files').objectStore('files');var cursorRequest=store.openCursor();cursorRequest.onsuccess=function(){var cursor=cursorRequest.result;if(cursor){if(cursor.value.name.startsWith(storagePrefix)){deleteRecord(media,cursor.value.name);}
cursor.continue();}};}}}
MediaDB.prototype={close:function close(){this.db.close();for(var i=0;i<this.details.storages.length;i++){var s=this.details.storages[i];s.removeEventListener('change',this.details.dsEventListener);}
changeState(this,MediaDB.CLOSED);},addEventListener:function addEventListener(type,listener){if(!this.details.eventListeners.hasOwnProperty(type)){this.details.eventListeners[type]=[];}
var listeners=this.details.eventListeners[type];if(listeners.indexOf(listener)!==-1){return;}
listeners.push(listener);},removeEventListener:function removeEventListener(type,listener){if(!this.details.eventListeners.hasOwnProperty(type)){return;}
var listeners=this.details.eventListeners[type];var position=listeners.indexOf(listener);if(position===-1){return;}
listeners.splice(position,1);},getFileInfo:function getFile(filename,callback,errback){if(this.state===MediaDB.OPENING){throw Error('MediaDB is not ready. State: '+this.state);}
var media=this;var read=media.db.transaction('files','readonly').objectStore('files').get(filename);read.onerror=function(){var msg='MediaDB.getFileInfo: unknown filename: '+filename;if(errback){errback(msg);}else{console.error(msg);}};read.onsuccess=function(){if(callback){callback(read.result);}};},getFile:function getFile(filename,callback,errback){if(this.state!==MediaDB.READY){throw Error('MediaDB is not ready. State: '+this.state);}
var storage=navigator.getDeviceStorage(this.mediaType);var getRequest=storage.get(filename);getRequest.onsuccess=function(){callback(getRequest.result);};getRequest.onerror=function(){var errmsg=getRequest.error&&getRequest.error.name;if(errback){errback(errmsg);}else{console.error('MediaDB.getFile:',errmsg);}};},deleteFile:function deleteFile(filename){if(this.state!==MediaDB.READY){throw Error('MediaDB is not ready. State: '+this.state);}
var storage=navigator.getDeviceStorage(this.mediaType);storage.delete(filename).onerror=function(e){console.error('MediaDB.deleteFile(): Failed to delete',filename,'from DeviceStorage:',e.target.error);};},addFile:function addFile(filename,file){if(this.state!==MediaDB.READY){throw Error('MediaDB is not ready. State: '+this.state);}
var media=this;var storage=navigator.getDeviceStorage(media.mediaType);var deletereq=storage.delete(filename);deletereq.onsuccess=deletereq.onerror=save;function save(){var request=storage.addNamed(file,filename);request.onerror=function(){console.error('MediaDB: Failed to store',filename,'in DeviceStorage:',request.error);};}},updateMetadata:function(filename,metadata,callback){if(this.state===MediaDB.OPENING){throw Error('MediaDB is not ready. State: '+this.state);}
var media=this;var read=media.db.transaction('files','readonly').objectStore('files').get(filename);read.onerror=function(){console.error('MediaDB.updateMetadata called with unknown filename');};read.onsuccess=function(){var fileinfo=read.result;Object.keys(metadata).forEach(function(key){fileinfo.metadata[key]=metadata[key];});var write=media.db.transaction('files','readwrite').objectStore('files').put(fileinfo);write.onerror=function(){console.error('MediaDB.updateMetadata: database write failed',write.error&&write.error.name);};if(callback){write.onsuccess=function(){callback();};}};},count:function(key,range,callback){if(this.state!==MediaDB.READY&&this.state!==MediaDB.ENUMERABLE){throw Error('MediaDB is not ready or enumerable. State: '+this.state);}
if(arguments.length===1){callback=key;range=undefined;key=undefined;}
else if(arguments.length===2){callback=range;range=key;key=undefined;}
var store=this.db.transaction('files').objectStore('files');if(key&&key!=='name'){store=store.index(key);}
var countRequest=store.count(range||null);countRequest.onerror=function(){console.error('MediaDB.count() failed with',countRequest.error);};countRequest.onsuccess=function(e){callback(e.target.result);};},enumerate:function enumerate(key,range,direction,callback){if(this.state!==MediaDB.READY&&this.state!==MediaDB.ENUMERABLE){throw Error('MediaDB is not ready or enumerable. State: '+this.state);}
var handle={state:'enumerating'};if(arguments.length===1){callback=key;key=undefined;}
else if(arguments.length===2){callback=range;range=undefined;}
else if(arguments.length===3){callback=direction;direction=undefined;}
var store=this.db.transaction('files').objectStore('files');if(key&&key!=='name'){store=store.index(key);}
var cursorRequest=store.openCursor(range||null,direction||'next');cursorRequest.onerror=function(){console.error('MediaDB.enumerate() failed with',cursorRequest.error);handle.state='error';};cursorRequest.onsuccess=function(){if(handle.state==='cancelling'){handle.state='cancelled';return;}
var cursor=cursorRequest.result;if(cursor){try{var fileinfo=cursor.value;if(!fileinfo.fail){callback(fileinfo);}}
catch(e){console.warn('MediaDB.enumerate(): callback threw',e,e.stack);}
cursor.continue();}
else{handle.state='complete';callback(null);}};return handle;},advancedEnumerate:function(key,range,direction,index,callback){if(this.state!==MediaDB.READY){throw Error('MediaDB is not ready. State: '+this.state);}
var handle={state:'enumerating'};var store=this.db.transaction('files').objectStore('files');if(key&&key!=='name'){store=store.index(key);}
var cursorRequest=store.openCursor(range||null,direction||'next');var isTarget=false;cursorRequest.onerror=function(){console.error('MediaDB.enumerate() failed with',cursorRequest.error);handle.state='error';};cursorRequest.onsuccess=function(){if(handle.state==='cancelling'){handle.state='cancelled';return;}
var cursor=cursorRequest.result;if(cursor){try{if(index===0){isTarget=true;}
var fileinfo=cursor.value;if(!fileinfo.fail&&isTarget){callback(cursor.value);cursor.continue();}
else{cursor.advance(index);isTarget=true;}}
catch(e){console.warn('MediaDB.enumerate(): callback threw',e,e.stack);}}
else{handle.state='complete';callback(null);}};return handle;},enumerateAll:function enumerateAll(key,range,direction,callback){var batch=[];if(arguments.length===1){callback=key;key=undefined;}
else if(arguments.length===2){callback=range;range=undefined;}
else if(arguments.length===3){callback=direction;direction=undefined;}
return this.enumerate(key,range,direction,function(fileinfo){if(fileinfo!==null){batch.push(fileinfo);}else{callback(batch);}});},cancelEnumeration:function cancelEnumeration(handle){if(handle.state==='enumerating'){handle.state='cancelling';}},getAll:function getAll(callback){if(this.state!==MediaDB.READY&&this.state!==MediaDB.ENUMERABLE){throw Error('MediaDB is not ready or enumerable. State: '+this.state);}
var store=this.db.transaction('files').objectStore('files');var request=store.mozGetAll();request.onerror=function(){console.error('MediaDB.getAll() failed with',request.error);};request.onsuccess=function(){var all=request.result;var good=all.filter(function(fileinfo){return!fileinfo.fail;});callback(good);};},scan:function(){scan(this);},freeSpace:function freeSpace(callback){if(this.state!==MediaDB.READY){throw Error('MediaDB is not ready. State: '+this.state);}
var storage=navigator.getDeviceStorage(this.mediaType);var freereq=storage.freeSpace();freereq.onsuccess=function(){callback(freereq.result);};}};MediaDB.VERSION=3;MediaDB.OPENING='opening';MediaDB.UPGRADING='upgrading';MediaDB.ENUMERABLE='enumerable';MediaDB.READY='ready';MediaDB.NOCARD='nocard';MediaDB.UNMOUNTED='unmounted';MediaDB.CLOSED='closed';function ignore(media,file){if(ignoreName(media,file.name)){return true;}
if(media.mimeTypes&&media.mimeTypes.indexOf(file.type)===-1){return true;}
return false;}
function ignoreName(media,filename){if(media.clientExcludeFilter&&media.clientExcludeFilter.test(filename)){return true;}else{return(filename[0]==='.'||filename.indexOf('/.')!==-1);}}
function scan(media){media.scanning=true;dispatchEvent(media,'scanstart');quickScan(media.details.newestFileModTime);function quickScan(timestamp){var options;if(timestamp>0){media.details.firstscan=false;options={since:new Date(timestamp+1)};}
else{media.details.firstscan=true;media.details.records=[];options={};}
scanDS(media.details.storages,null,options).then(processFiles).catch(handleScanError);function processFiles(files){if(!media.scanning){return;}
files=files.sort(function(a,b){return b.lastModifiedDate-a.lastModifiedDate;});for(var i=0;i<files.length;i++){insertRecord(media,files[i]);}
whenDoneProcessing(media,function(){sendNotifications(media);if(media.details.firstscan){endscan(media);}
else{fullScan();}});}
function handleScanError(error){console.warn('Error while scanning',error);endscan(media);}}
function fullScan(){if(media.state!==MediaDB.READY){endscan(media);return;}
var dsfiles;scanDS(media.details.storages).then(function(files){dsfiles=files;getDBFiles();}).catch(function(error){console.warn('Error while scanning',error);endscan(media);});function getDBFiles(){var store=media.db.transaction('files').objectStore('files');var getAllRequest=store.mozGetAll();getAllRequest.onsuccess=function(){if(!media.scanning){return;}
var dbfiles=getAllRequest.result;compareLists(dbfiles,dsfiles);};}
function compareLists(dbfiles,dsfiles){dsfiles.sort(function(a,b){if(a.name<b.name){return-1;}else{return 1;}});var dsindex=0,dbindex=0;while(true){var dsfile;if(dsindex<dsfiles.length){dsfile=dsfiles[dsindex];}else{dsfile=null;}
var dbfile;if(dbindex<dbfiles.length){dbfile=dbfiles[dbindex];}else{dbfile=null;}
if(dsfile===null&&dbfile===null){break;}
if(dbfile===null){insertRecord(media,dsfile);dsindex++;continue;}
if(dsfile===null){deleteRecord(media,dbfile.name);dbindex++;continue;}
if(dsfile.name===dbfile.name){var lastModified=dsfile.lastModifiedDate;var timeDifference=lastModified.getTime()-dbfile.date;var sameTime=(timeDifference===0||((Math.abs(timeDifference)<=12*60*60*1000)&&(timeDifference%10*60*1000===0)));var sameSize=dsfile.size===dbfile.size;if(!sameTime||!sameSize){deleteRecord(media,dbfile.name);insertRecord(media,dsfile);}else if(dbfile.needsReparse){deleteRecord(media,dbfile.name);insertRecord(media,dsfile,dbfile.metadata);}
dsindex++;dbindex++;continue;}
if(dsfile.name<dbfile.name){insertRecord(media,dsfile);dsindex++;continue;}
if(dsfile.name>dbfile.name){deleteRecord(media,dbfile.name);dbindex++;continue;}
console.error('Assertion failed');}
insertRecord(media,null);}}
function scanDS(storage,directory,options){if(Array.isArray(storage)){return Promise.all(storage.map((s)=>scanDS(s,directory,options))).then(function(arrays){return Array.prototype.concat.apply([],arrays);});}
return new Promise(function(resolve,reject){var files=[];var cursor=storage.enumerate(directory||'',options||{});cursor.onerror=function(){if(cursor.error.name==='NotFoundError'){resolve(files);}
else{reject(cursor.error);}};cursor.onsuccess=function(){var result=cursor.result;if(result){if(!ignore(media,result)){files.push(result);}
cursor.continue();}
else{resolve(files);}};});}}
function endscan(media){if(media.scanning){media.initialScanComplete=true;media.scanning=false;media.parsingBigFiles=false;dispatchEvent(media,'scanend');}}
function insertRecord(media,fileOrName,oldMetadata){var details=media.details;details.pendingInsertions.push([fileOrName,oldMetadata]);if(details.processingQueue){return;}
processQueue(media);}
function deleteRecord(media,filename){var details=media.details;details.pendingDeletions.push(filename);if(details.processingQueue){return;}
processQueue(media);}
function whenDoneProcessing(media,f){var details=media.details;if(details.processingQueue){details.whenDoneProcessing.push(f);}else{f();}}
function processQueue(media){var details=media.details;details.processingQueue=true;next();function next(){if(details.pendingDeletions.length>0){deleteFiles();}
else if(details.pendingInsertions.length>0){insertFile(...details.pendingInsertions.shift());}
else{details.processingQueue=false;if(details.whenDoneProcessing.length>0){var functions=details.whenDoneProcessing;details.whenDoneProcessing=[];functions.forEach(function(f){f();});}}}
function deleteFiles(){var transaction=media.db.transaction('files','readwrite');var store=transaction.objectStore('files');deleteNextFile();function deleteNextFile(){if(details.pendingDeletions.length===0){next();return;}
var filename=details.pendingDeletions.shift();var request=store.delete(filename);request.onerror=function(){console.warn('MediaDB: Unknown file in deleteRecord:',filename,request.error);deleteNextFile();};request.onsuccess=function(){queueDeleteNotification(media,filename);deleteNextFile();};}}
function insertFile(f,oldMetadata){if(f===null){sendNotifications(media);endscan(media);next();return;}
if(typeof f==='string'){var storage=navigator.getDeviceStorage(media.mediaType);var getreq=storage.get(f);getreq.onerror=function(){console.warn('MediaDB: Unknown file in insertRecord:',f,getreq.error);next();};getreq.onsuccess=function(){if(media.mimeTypes&&ignore(media,getreq.result)){next();}else{parseMetadata(getreq.result,f,oldMetadata);}};}
else{parseMetadata(f,f.name,oldMetadata);}}
function parseMetadata(file,filename,oldMetadata){if(!file.lastModifiedDate){console.warn('MediaDB: parseMetadata: no lastModifiedDate for',filename,'using Date.now() until #793955 is fixed');}
var fileinfo={name:filename,type:file.type,size:file.size,date:file.lastModifiedDate?file.lastModifiedDate.getTime():Date.now()};if(fileinfo.date>details.newestFileModTime){details.newestFileModTime=fileinfo.date;}
media.metadataParser(file,gotMetadata,metadataError,parsingBigFile);function parsingBigFile(){media.parsingBigFiles=true;}
function metadataError(e){console.warn('MediaDB: error parsing metadata for',filename,':',e);fileinfo.fail=true;storeRecord(fileinfo);}
function gotMetadata(metadata){fileinfo.metadata=metadata;if(oldMetadata&&media.reparsedRecord){fileinfo.metadata=media.reparsedRecord(oldMetadata,metadata);}
storeRecord(fileinfo);if(!media.scanning){media.parsingBigFiles=false;}}}
function storeRecord(fileinfo){if(media.details.firstscan){media.details.records.push(fileinfo);if(!fileinfo.fail){queueCreateNotification(media,fileinfo);}
next();}
else{var transaction=media.db.transaction('files','readwrite');var store=transaction.objectStore('files');var request=store.add(fileinfo);request.onsuccess=function(){if(!fileinfo.fail){queueCreateNotification(media,fileinfo);}
next();};request.onerror=function(event){if(request.error.name==='ConstraintError'){event.stopPropagation();event.preventDefault();var putrequest=store.put(fileinfo);putrequest.onsuccess=function(){queueDeleteNotification(media,fileinfo.name);if(!fileinfo.fail){queueCreateNotification(media,fileinfo);}
next();};putrequest.onerror=function(){console.error('MediaDB: unexpected ConstraintError','in insertRecord for file:',fileinfo.name);next();};}
else{console.error('MediaDB: unexpected error in insertRecord:',request.error,'for file:',fileinfo.name);next();}};}}}
function queueCreateNotification(media,fileinfo){var creates=media.details.pendingCreateNotifications;creates.push(fileinfo);if(media.batchSize&&creates.length>=media.batchSize){sendNotifications(media);}else{resetNotificationTimer(media);}}
function queueDeleteNotification(media,filename){var deletes=media.details.pendingDeleteNotifications;deletes.push(filename);if(media.batchSize&&deletes.length>=media.batchSize){sendNotifications(media);}else{resetNotificationTimer(media);}}
function resetNotificationTimer(media){var details=media.details;if(details.pendingNotificationTimer){clearTimeout(details.pendingNotificationTimer);}
details.pendingNotificationTimer=setTimeout(function(){sendNotifications(media);},media.scanning?media.batchHoldTime:100);}
function sendNotifications(media){var details=media.details;if(details.pendingNotificationTimer){clearTimeout(details.pendingNotificationTimer);details.pendingNotificationTimer=null;}
if(details.pendingDeleteNotifications.length>0){var deletions=details.pendingDeleteNotifications;details.pendingDeleteNotifications=[];dispatchEvent(media,'deleted',deletions);}
if(details.pendingCreateNotifications.length>0){var creations=details.pendingCreateNotifications;details.pendingCreateNotifications=[];if(details.firstscan&&details.records.length>0){var transaction=media.db.transaction('files','readwrite');var store=transaction.objectStore('files');for(var i=0;i<details.records.length;i++){store.add(details.records[i]);}
details.records.length=0;transaction.oncomplete=function(){dispatchEvent(media,'created',creations);};}
else{dispatchEvent(media,'created',creations);}}}
function dispatchEvent(media,type,detail){var handler=media['on'+type];var listeners=media.details.eventListeners[type];if(!handler&&(!listeners||listeners.length===0)){return;}
var event={type:type,target:media,currentTarget:media,timestamp:Date.now(),detail:detail};if(typeof handler==='function'){try{handler.call(media,event);}
catch(e){console.warn('MediaDB: ','on'+type,'event handler threw',e,e.stack);}}
if(!listeners){return;}
for(var i=0;i<listeners.length;i++){try{var listener=listeners[i];if(typeof listener==='function'){listener.call(media,event);}
else{listener.handleEvent(event);}}
catch(e){console.warn('MediaDB: ',type,'event listener threw',e,e.stack);}}}
function changeState(media,state){if(media.state!==state){media.state=state;switch(state){case MediaDB.READY:case MediaDB.ENUMERABLE:dispatchEvent(media,state);break;default:dispatchEvent(media,'unavailable',state);break;}}}
return MediaDB;}());;;'use strict';var Database=(function(){var playlists=[{id:'shuffle-all',index:'metadata.title',direction:'next',shuffle:true},{id:'highest-rated',index:'metadata.rated',direction:'prev',shuffle:false},{id:'recently-added',index:'date',direction:'prev',shuffle:false},{id:'most-played',index:'metadata.played',direction:'prev',shuffle:false},{id:'least-played',index:'metadata.played',direction:'next',shuffle:false}];var status={upgrading:false,unavailable:false,enumerable:false,ready:false};var resolveEnumerable;var enumerable=new Promise((resolve)=>{resolveEnumerable=resolve;});var resolveReady;var ready=new Promise((resolve)=>{resolveReady=resolve;});var dbChange=debounce(()=>service.broadcast('databaseChange'),500);document.addEventListener('DOMRetranslated',dbChange);function debounce(fn,ms){var timeout;return()=>{var args=arguments;clearTimeout(timeout);timeout=setTimeout(()=>fn.apply(this,args),ms);};}
var musicdb;function init(){var excludedFolders=['Ringtones','Notifications','Alarms'];var excludeFilter=new RegExp('^(/[^/]*/)?('+excludedFolders.join('|')+')/','i');musicdb=new MediaDB('music',metadataParserWrapper,{indexes:['metadata.album','metadata.artist','metadata.title','metadata.rated','metadata.played','date'],excludeFilter:excludeFilter,batchSize:1,autoscan:false,updateRecord:updateRecord,reparsedRecord:reparsedRecord,version:3});function metadataParserWrapper(file,onsuccess,onerror){var scripts=['/js/metadata/metadata_scripts.js','/js/metadata/album_art.js'];LazyLoader.load(scripts).then(()=>{return AudioMetadata.parse(file);}).then((metadata)=>{return AlbumArt.process(file,metadata);}).then(onsuccess,onerror);}
var startedReparsing=false;function updateRecord(record,oldVersion,newVersion){if(oldVersion===2){record.needsReparse=true;if(!startedReparsing){startedReparsing=true;service.broadcast('databaseUpgrade');}}
return record.metadata;}
function reparsedRecord(oldMetadata,newMetadata){newMetadata.rated=oldMetadata.rated;newMetadata.played=oldMetadata.played;return newMetadata;}
musicdb.onupgrading=function(event){status.upgrading=true;status.enumerable=false;status.ready=false;service.broadcast('databaseUpgrade');};musicdb.onunavailable=function(event){var reason=event.detail===MediaDB.UNMOUNTED?'pluggedin':event.detail;onUnavailable(reason);};musicdb.oncardremoved=function(){service.broadcast('databaseChange');};function onUnavailable(reason){status.unavailable=reason;status.enumerable=false;status.ready=false;enumerable=new Promise((resolve)=>{resolveEnumerable=resolve;});ready=new Promise((resolve)=>{resolveReady=resolve;});service.broadcast('databaseUnavailable',reason);}
musicdb.onenumerable=onEnumerable;var refreshOnReady=false;function onEnumerable(){if(musicdb.state===MediaDB.READY){onReady();}else{musicdb.onready=onReady;}
status.upgrading=false;status.enumerable=true;resolveEnumerable();service.broadcast('databaseEnumerable');}
function onReady(){musicdb.scan();status.unavailable=false;status.enumerable=true;status.ready=true;resolveEnumerable();resolveReady();service.broadcast('databaseReady',refreshOnReady);refreshOnReady=true;}
var filesDeletedWhileScanning=0;var filesFoundWhileScanning=0;var filesFoundBatch=0;var scanning=false;var SCAN_UPDATE_BATCH_SIZE=25;var DELETE_BATCH_TIMEOUT=500;var deleteTimer=null;var firstScanDone=false;musicdb.onscanstart=function(){scanning=true;filesFoundWhileScanning=0;filesFoundBatch=0;filesDeletedWhileScanning=0;};musicdb.onscanend=function(){scanning=false;service.broadcast('scanStopped');if(filesFoundBatch>0||filesDeletedWhileScanning>0){filesFoundWhileScanning=0;filesFoundBatch=0;filesDeletedWhileScanning=0;dbChange();}
if(!firstScanDone){firstScanDone=true;window.performance.mark('fullyLoaded');}};musicdb.oncreated=function(event){if(scanning){var metadata=event.detail[0].metadata;var n=event.detail.length;filesFoundWhileScanning+=n;filesFoundBatch+=n;service.broadcast('scanProgress',{count:filesFoundWhileScanning,artist:metadata.artist,title:metadata.title});if(filesFoundBatch>SCAN_UPDATE_BATCH_SIZE){filesFoundBatch=0;dbChange();}}
else{dbChange();}};musicdb.ondeleted=function(event){if(scanning){filesDeletedWhileScanning+=event.detail.length;}
else{if(deleteTimer){clearTimeout(deleteTimer);}
deleteTimer=setTimeout(function(){deleteTimer=null;dbChange();},DELETE_BATCH_TIMEOUT);}};}
function incrementPlayCount(fileinfo){return new Promise((resolve)=>{fileinfo.metadata.played++;musicdb.updateMetadata(fileinfo.name,{played:fileinfo.metadata.played},resolve);});}
function setSongRating(fileinfo,rated){return new Promise((resolve)=>{fileinfo.metadata.rated=rated;musicdb.updateMetadata(fileinfo.name,{rated:fileinfo.metadata.rated},resolve);});}
function getFile(fileinfo,decrypt=false){return new Promise((resolve,reject)=>{ready.then(()=>{musicdb.getFile(fileinfo.name,(file)=>{if(file){resolve(file);}else{reject('unable to get file: '+fileinfo.name);}});});}).then((blob)=>{if(!decrypt||!fileinfo.metadata.locked){return blob;}
return new Promise(function(resolve,reject){LazyLoader.load('/shared/js/omadrm/fl.js').then(()=>{ForwardLock.getKey(function(secret){ForwardLock.unlockBlob(secret,blob,resolve,null,reject);});});});});}
function getFileInfo(filename){return new Promise(function(resolve,reject){ready.then(()=>musicdb.getFileInfo(filename,(r)=>{r?resolve(r):reject('Undefined result for '+filename);},reject)).catch((e)=>reject(e));});}
function enumerate(...args){return enumerable.then(()=>musicdb.enumerate(...args));}
function enumerateAll(...args){return enumerable.then(()=>musicdb.enumerateAll(...args));}
function advancedEnumerate(...args){return enumerable.then(()=>musicdb.advancedEnumerate(...args));}
function count(...args){return enumerable.then(()=>musicdb.count(...args));}
function cancelEnumeration(handle){musicdb.cancelEnumeration(handle);}
IntlHelper.define('titleSorter','collator',{usage:'sort',sensitivity:'base',numeric:true,ignorePunctuation:true});function _localeSort(collator,a,b){return collator.compare(a,b);}
function _sortArtist(collator,a,b){return _localeSort(collator,a.metadata.artist,b.metadata.artist);}
function _sortAlbum(collator,a,b){return _localeSort(collator,a.metadata.album,b.metadata.album);}
function _sortTitle(collator,a,b){return _localeSort(collator,a.metadata.title,b.metadata.title);}
function _sortTrack(collator,a,b){return(a.metadata.discnum-b.metadata.discnum)||(a.metadata.tracknum-b.metadata.tracknum)||_sortTitle(collator,a,b);}
function artists(){return new Promise((resolve)=>{enumerateAll('metadata.artist',null,'nextunique',(artists)=>{artists.sort(_sortArtist.bind(null,IntlHelper.get('titleSorter')));resolve(artists);});});}
function albums(){return new Promise((resolve)=>{enumerateAll('metadata.album',null,'nextunique',(albums)=>{albums.sort(_sortAlbum.bind(null,IntlHelper.get('titleSorter')));resolve(albums);});});}
function songs(){return new Promise((resolve)=>{enumerateAll('metadata.title',null,'next',(songs)=>{songs.sort(_sortTitle.bind(null,IntlHelper.get('titleSorter')));resolve(songs);});});}
function totalCount(){return new Promise((resolve)=>{count('metadata.title',null,(count)=>resolve(count));});}
function artist(name){return new Promise((resolve)=>{var range=IDBKeyRange.only(name);enumerateAll('metadata.artist',range,'next',(songs)=>{var collator=IntlHelper.get('titleSorter');songs.sort((a,b)=>{return _sortAlbum(collator,a,b)||_sortTrack(collator,a,b);});resolve(songs);});});}
function album(name){return new Promise((resolve)=>{var range=IDBKeyRange.only(name);enumerateAll('metadata.album',range,'next',(songs)=>{songs.sort(_sortTrack.bind(null,IntlHelper.get('titleSorter')));resolve(songs);});});}
function search(key,query,callback){return enumerable.then(()=>{if(!query){callback(null);return;}
return LazyLoader.load('/shared/js/text_normalizer.js').then(()=>{query=Normalizer.toAscii(query.toLocaleLowerCase());var direction=(key==='title')?'next':'nextunique';return musicdb.enumerate('metadata.'+key,null,direction,(result)=>{if(result===null){callback(result);return;}
var resultLowerCased=result.metadata[key].toLocaleLowerCase();if(Normalizer.toAscii(resultLowerCased).indexOf(query)!==-1){callback(result);}});});});}
return{init:init,incrementPlayCount:incrementPlayCount,setSongRating:setSongRating,getFile:getFile,getFileInfo:getFileInfo,enumerate:enumerate,enumerateAll:enumerateAll,advancedEnumerate:advancedEnumerate,count:count,cancelEnumeration:cancelEnumeration,artists:artists,albums:albums,songs:songs,totalCount:totalCount,artist:artist,album:album,search:search,playlists:playlists,status:status,get initialScanComplete(){return musicdb.initialScanComplete;}};})();;;'use strict';var audio=null;var queueSettings=null;var remote=null;var nfcShare=null;var currentFilePath=null;var currentQueue=null;var isInterrupted=false;var isFastSeeking=false;var isStopped=true;var externalFile=null;var service=bridge.service('music-service').method('play',play).method('pause',pause).method('seek',seek).method('startFastSeek',startFastSeek).method('stopFastSeek',stopFastSeek).method('getPlaybackStatus',getPlaybackStatus).method('currentSong',currentSong).method('previousSong',previousSong).method('nextSong',nextSong).method('queueAlbum',queueAlbum).method('queueArtist',queueArtist).method('queuePlaylist',queuePlaylist).method('queueSong',queueSong).method('setRepeatSetting',setRepeatSetting).method('setShuffleSetting',setShuffleSetting).method('getAlbums',getAlbums).method('getAlbum',getAlbum).method('getArtists',getArtists).method('getArtist',getArtist).method('getPlaylists',getPlaylists).method('getPlaylist',getPlaylist).method('getSongs',getSongs).method('getSongCount',getSongCount).method('getSong',getSong).method('getSongFile',getSongFile).method('setSongRating',setSongRating).method('search',search).method('getSongArtwork',getSongArtwork).method('getSongThumbnail',getSongThumbnail).method('getSongArtworkURL',getSongArtworkURL).method('getSongThumbnailURL',getSongThumbnailURL).method('share',share).method('openExternalFile',openExternalFile).method('enableNFC',enableNFC).method('getDatabaseStatus',getDatabaseStatus).method('navigate',navigate).method('searchOpen',searchOpen).method('searchClose',searchClose).listen().listen(new BroadcastChannel('music-service'));document.addEventListener('DOMContentLoaded',function(){audio=document.getElementById('audio');audio.addEventListener('loadeddata',function(){URL.revokeObjectURL(audio.src);});audio.addEventListener('play',function(){service.broadcast('play');});audio.addEventListener('pause',function(){service.broadcast('pause');});audio.addEventListener('durationchange',function(){service.broadcast('durationChange',audio.duration);});audio.addEventListener('timeupdate',function(){service.broadcast('elapsedTimeChange',audio.currentTime);});audio.addEventListener('ended',function(){nextSong(true);});audio.addEventListener('mozinterruptbegin',function(){isInterrupted=true;service.broadcast('interruptBegin');});audio.addEventListener('mozinterruptend',function(){isInterrupted=false;service.broadcast('interruptEnd');});});function play(filePath){loadRemote();if(!filePath){audio.play();return;}
getSongFile(filePath).then((file)=>{if(isStopped){return;}
currentFilePath=filePath;audio.src=null;audio.load();audio.mozAudioChannelType='content';audio.src=URL.createObjectURL(file);audio.load();audio.play();getSong(filePath).then((song)=>{Database.incrementPlayCount(song);});service.broadcast('songChange');});}
function pause(){audio.pause();}
function stop(){isStopped=true;audio.pause();currentFilePath=null;currentQueue=null;audio.src=null;audio.load();service.broadcast('stop');}
var seekTimeout;function seek(time){if(audio.seeking){clearTimeout(seekTimeout);seekTimeout=setTimeout(()=>seek(time),50);return;}
audio.fastSeek(parseInt(time,10));}
function startFastSeek(reverse){if(isFastSeeking){return;}
reverse=reverse===true||reverse==='reverse';isFastSeeking=true;function fastSeek(){if(!isFastSeeking){audio.volume=1;return;}
audio.volume=0.5;seek(audio.currentTime+(reverse?-5:5));setTimeout(fastSeek,100);}
fastSeek();}
function stopFastSeek(){isFastSeeking=false;}
function getPlaybackStatus(){return loadQueueSettings().then(()=>{return{queueIndex:currentQueue?currentQueue.index:-1,queueRawIndex:currentQueue?currentQueue.rawIndex:-1,queueLength:currentQueue?currentQueue.length:-1,repeat:PlaybackQueue.repeat,shuffle:PlaybackQueue.shuffle?1:0,filePath:currentFilePath,stopped:isStopped,paused:audio.paused,duration:audio.duration,elapsedTime:audio.currentTime,isInterrupted:isInterrupted,isFastSeeking:isFastSeeking};});}
function currentSong(){if(!currentQueue){return Promise.reject();}
return currentQueue.current();}
function previousSong(){if(!currentQueue){return Promise.reject();}
currentQueue.previous();return currentSong().then(song=>play(song.name));}
function nextSong(automatic=false){if(!currentQueue){return Promise.reject();}
var hasNextSong=currentQueue.next(automatic);if(!hasNextSong&&!externalFile){return Promise.resolve(stop());}
return currentSong().then(song=>play(song.name));}
function loadQueueSettings(){if(!queueSettings){queueSettings=LazyLoader.load('/js/queue.js').then(()=>{return PlaybackQueue.loadSettings();});}
return queueSettings;}
function loadRemote(){if(!remote){remote=LazyLoader.load('/js/remote.js').then(()=>{return Remote;});}
return remote;}
function loadNFCShare(){if(!nfcShare){nfcShare=LazyLoader.load('/js/nfc_share.js').then(()=>{return NFCShare;});}
return nfcShare;}
function queueArtist(filePath){return loadQueueSettings().then(()=>{return getArtist(filePath).then((songs)=>{var index=songs.findIndex(song=>song.name===filePath);currentQueue=new PlaybackQueue.StaticQueue(songs,index);return currentSong().then((song)=>{isStopped=false;play(song.name);});});});}
function queueAlbum(filePath){return loadQueueSettings().then(()=>{return getAlbum(filePath).then((songs)=>{var index=songs.findIndex(song=>song.name===filePath);currentQueue=new PlaybackQueue.StaticQueue(songs,index);return currentSong().then((song)=>{isStopped=false;play(song.name);});});});}
function queuePlaylist(id,filePath){return loadQueueSettings().then(()=>{return getPlaylist(id).then((songs)=>{var playlist=Database.playlists.find(playlist=>playlist.id===id);return setShuffleSetting(playlist.shuffle).then(()=>{var index=filePath?songs.findIndex(song=>song.name===filePath):(playlist.shuffle?Math.floor(Math.random()*songs.length):0);currentQueue=new PlaybackQueue.StaticQueue(songs,index);return currentSong().then((song)=>{isStopped=false;play(song.name);});});});});}
function queueSong(filePath){return loadQueueSettings().then(()=>{return getSongs().then((songs)=>{var index=songs.findIndex(song=>song.name===filePath);currentQueue=new PlaybackQueue.StaticQueue(songs,index);return currentSong().then((song)=>{isStopped=false;play(song.name);});});});}
function setRepeatSetting(repeat){repeat=parseInt(repeat,10)||0;return loadQueueSettings().then(()=>PlaybackQueue.repeat=repeat);}
function setShuffleSetting(shuffle){if(typeof shuffle!=='boolean'){shuffle=shuffle!=='false'&&parseInt(shuffle||0,10)!==0;}
return loadQueueSettings().then(()=>PlaybackQueue.shuffle=shuffle);}
function getPlaylists(){return Promise.resolve(Database.playlists);}
function getPlaylist(id){var playlist=Database.playlists.find(playlist=>playlist.id===id);return new Promise((resolve)=>{Database.enumerateAll(playlist.index,null,playlist.direction,(songs)=>{resolve(songs);});});}
function getArtists(){return Database.artists();}
function getAlbums(){return Database.albums();}
function getSongs(){return Database.songs();}
function getSongCount(){return Database.totalCount();}
function getArtist(filePath){return getSong(filePath).then((song)=>{return Database.artist(song.metadata.artist);});}
function getAlbum(filePath){return getSong(filePath).then((song)=>{return Database.album(song.metadata.album);});}
function getSong(filePath){if(externalFile&&filePath===externalFile.name){return Promise.resolve(externalFile);}
return Database.getFileInfo(filePath);}
function getSongFile(filePath){if(externalFile&&filePath===externalFile.name){return Promise.resolve(externalFile.file);}
return getSong(filePath).then((song)=>{return Database.getFile(song);});}
function getSongArtwork(filePath){return LazyLoader.load('/js/metadata/album_art_cache.js').then(()=>{return getSong(filePath).then((song)=>{return AlbumArtCache.getFullSizeBlob(song);});});}
function getSongThumbnail(filePath){return LazyLoader.load('/js/metadata/album_art_cache.js').then(()=>{return getSong(filePath).then((song)=>{return AlbumArtCache.getThumbnailBlob(song);});});}
function getSongArtworkURL(filePath){return LazyLoader.load('/js/metadata/album_art_cache.js').then(()=>{return getSong(filePath).then((song)=>{return AlbumArtCache.getFullSizeURL(song);});});}
function getSongThumbnailURL(filePath){return LazyLoader.load('/js/metadata/album_art_cache.js').then(()=>{return getSong(filePath).then((song)=>{return AlbumArtCache.getThumbnailURL(song);});});}
function setSongRating(rating,filePath){rating=parseInt(rating,10)||0;return getSong(filePath).then((song)=>{return Database.setSongRating(song,rating);});}
function search(key,query){return new Promise((resolve)=>{var results=[];Database.search(key,query,(result)=>{if(result===null){resolve(results);}else{results.push(result);}});});}
function getDatabaseStatus(){return Promise.resolve(Database.status);}
function navigate(url){navigateToURL(url);}
function searchOpen(){onSearchOpen();}
function searchClose(){onSearchClose();}
function share(filePath){return getSong(filePath).then((song)=>{if(song.metadata.locked||!window.MozActivity){return;}
return Promise.all([getSongFile(filePath),getSongThumbnail(filePath)]).then(([file,thumbnail])=>{var path=song.name;var filename=path.substring(path.lastIndexOf('/')+1);return new window.MozActivity({name:'share',data:{type:'audio/*',number:1,blobs:[file],filenames:[filename],filepaths:[path],metadata:[{title:song.metadata.title,artist:song.metadata.artist,album:song.metadata.album,picture:thumbnail}]}});});});}
function openExternalFile(file,filename=null){var scripts=['/js/metadata/metadata_scripts.js','/js/metadata/album_art.js'];return loadQueueSettings().then(()=>{return LazyLoader.load(scripts);}).then(()=>{return AudioMetadata.parse(file,filename);}).then((metadata)=>{externalFile={file:file,name:file.name||URL.createObjectURL(file),metadata:metadata};currentQueue=new PlaybackQueue.StaticQueue([externalFile]);return currentSong();}).then((song)=>{isStopped=false;play(song.name);});}
function enableNFC(enabled){if(!nfcShare&&!enabled){return;}
loadNFCShare().then(()=>{NFCShare.enabled=enabled;});}
Database.init();;;var SERVICE_WORKERS=false;;;'use strict';function perfMark(marker){window.performance.mark(marker);perfMark[marker]=Date.now();}
perfMark.get=(marker)=>{var start=window.performance.timing.fetchStart;return perfMark[marker]-start;};perfMark.log=()=>Object.keys(perfMark).forEach((marker)=>{if(typeof perfMark[marker]!=='function'){console.log('[Performance] '+marker+': '+perfMark.get(marker)+'ms');}});perfMark('navigationLoaded');const VIEWS={ALBUM_DETAIL:{TAB:'albums',URL:'/views/album-detail/index.html'},ALBUMS:{TAB:'albums',URL:'/views/albums/index.html'},ARTIST_DETAIL:{TAB:'artists',URL:'/views/artist-detail/index.html'},ARTISTS:{TAB:'artists',URL:'/views/artists/index.html'},HOME:{TAB:'home',URL:'/views/home/index.html'},PLAYER:{TAB:'home',URL:'/views/player/index.html'},PLAYLIST_DETAIL:{TAB:'playlists',URL:'/views/playlist-detail/index.html'},PLAYLISTS:{TAB:'playlists',URL:'/views/playlists/index.html'},SONGS:{TAB:'songs',URL:'/views/songs/index.html'}};var $id=document.getElementById.bind(document);var isPlaying=false;var activity=null;if(navigator.mozSetMessageHandler){navigator.mozSetMessageHandler('activity',activity=>onActivity(activity));}
var client=bridge.client({service:'music-service',endpoint:window,timeout:false});client.on('play',()=>isPlaying=true);client.on('stop',()=>{isPlaying=false;var isPlayerView=viewStack.activeView&&viewStack.activeView.url===VIEWS.PLAYER.URL;if(isPlayerView){viewStack.popView(true);window.history.back();}});client.on('databaseChange',()=>updateOverlays());client.on('databaseUpgrade',()=>{if(upgradeOverlay){upgradeOverlay.hidden=false;}});client.on('databaseUnavailable',(reason)=>{if(noCardOverlay){noCardOverlay.hidden=reason!=='nocard';}
if(pluggedInOverlay){pluggedInOverlay.hidden=reason!=='pluggedin';}});client.on('databaseEnumerable',()=>{if(upgradeOverlay){upgradeOverlay.hidden=true;}});client.on('databaseReady',()=>{if(noCardOverlay){noCardOverlay.hidden=true;}
if(pluggedInOverlay){pluggedInOverlay.hidden=true;}});client.on('scanProgress',(detail)=>{scanProgress.update({value:detail.count,heading:detail.artist,subheading:detail.title});});client.on('scanStopped',()=>scanProgress.clear());client.connect();var header=$id('header');var headerTitle=$id('header-title');var playerButton=$id('player-button');var activityDoneButton=$id('activity-done-button');var viewStack=$id('view-stack');var tabBar=$id('tab-bar');var emptyOverlay=$id('empty-overlay');var noCardOverlay=$id('no-card-overlay');var pluggedInOverlay=$id('plugged-in-overlay');var upgradeOverlay=$id('upgrade-overlay');var scanProgress=$id('scan-progress');updateOverlays();header.addEventListener('action',(evt)=>{if(evt.detail.type!=='back'){return;}
var isPlayerView=viewStack.activeView&&viewStack.activeView.url===VIEWS.PLAYER.URL;if(viewStack.views.length>1){viewStack.popView(!isPlayerView);window.history.back();return;}
cancelActivity();});playerButton.addEventListener('click',()=>navigateToURL('/player'));activityDoneButton.addEventListener('click',()=>{switch(activity&&activity.source.name){case'open':activity.postResult({saved:false});break;case'pick':client.method('getPlaybackStatus').then((status)=>{var filePath=status.filePath;var getSong=client.method('getSong',filePath);var getSongFile=client.method('getSongFile',filePath);var getSongThumbnail=client.method('getSongThumbnail',filePath);Promise.all([getSong,getSongFile,getSongThumbnail]).then(([song,file,thumbnail])=>{activity.postResult({type:file.type,blob:file,name:song.metadata.title||'',metadata:{title:song.metadata.title,artist:song.metadata.artist,album:song.metadata.album,picture:thumbnail}});});});break;}});viewStack.addEventListener('change',(evt)=>{var viewUrl=evt.detail.url;var tab=getTabByViewURL(viewUrl);if(tab){tabBar.selectedElement=tab;}
document.body.dataset.activeViewUrl=viewUrl;var showingPlayer=viewUrl===VIEWS.PLAYER.URL;playerButton.hidden=showingPlayer||!isPlaying;activityDoneButton.hidden=!showingPlayer||!activity;client.method('enableNFC',showingPlayer);setBackButtonHidden(!activity&&viewStack.views.length<2);setHeaderTitle(evt.detail.title);});viewStack.addEventListener('titlechange',(evt)=>{setHeaderTitle(evt.detail);});viewStack.addEventListener('loaded',onVisuallyLoaded);viewStack.addEventListener('rendered',onFullyLoaded);tabBar.addEventListener('change',(evt)=>{var tab=evt.detail.selectedElement;navigateToURL(tab.dataset.url,true);});if(emptyOverlay){emptyOverlay.addEventListener('action',()=>cancelActivity());}
if(noCardOverlay){noCardOverlay.addEventListener('action',()=>cancelActivity());}
if(pluggedInOverlay){pluggedInOverlay.addEventListener('action',()=>cancelActivity());}
if(upgradeOverlay){upgradeOverlay.addEventListener('action',()=>cancelActivity());}
if(SERVICE_WORKERS){navigator.serviceWorker.getRegistration().then((registration)=>{if(registration&&registration.active){console.log('ServiceWorker already registered');boot();return;}
navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>{console.log('ServiceWorker registered successfully');window.location.reload();}).catch((error)=>{console.error('ServiceWorker registration failed',error);});});}
else{boot();}
function setHeaderTitle(title){if(viewStack.activeView){viewStack.activeView.title=title;}
window.requestAnimationFrame(()=>headerTitle.textContent=title);}
function setBackButtonHidden(hidden){header.els.actionButton.style.visibility=hidden?'hidden':'visible';scanProgress.hidden=!hidden;}
function getTabByViewURL(url){for(var key in VIEWS){if(url===VIEWS[key].URL){return tabBar.querySelector('button[value="'+VIEWS[key].TAB+'"]');}}
return null;}
function navigateToURL(url,replaceRoot){var path=url.substring(1);var parts=path.split('?');var viewUrl='/views/'+parts.shift()+'/index.html';if(replaceRoot){viewStack.setRootView(viewUrl);}
else{viewStack.pushView(viewUrl);}
if(!SERVICE_WORKERS){url='#'+url;}
window.history.pushState(null,null,url);}
function updateOverlays(){if(emptyOverlay){client.method('getSongCount').then((count)=>{emptyOverlay.hidden=count>0;});}
client.method('getDatabaseStatus').then((status)=>{if(noCardOverlay){noCardOverlay.hidden=status.unavailable!=='nocard';}
if(pluggedInOverlay){pluggedInOverlay.hidden=status.unavailable!=='pluggedin';}
if(upgradeOverlay){upgradeOverlay.hidden=!status.upgrading;}});}
function cancelActivity(){switch(activity&&activity.source.name){case'open':activity.postResult({saved:false});break;case'pick':activity.postError('pick cancelled');break;}}
function onActivity(activity){window.activity=activity;if(activity.source.name==='open'){client.method('openExternalFile',activity.source.data.blob,activity.source.data.filename);}
setBackButtonHidden(false);}
function onSearchOpen(){document.body.dataset.search=true;}
function onSearchClose(){document.body.removeAttribute('data-search');}
function onVisuallyLoaded(){viewStack.removeEventListener('loaded',onVisuallyLoaded);perfMark('visuallyLoaded');perfMark('contentInteractive');}
function onFullyLoaded(){viewStack.removeEventListener('rendered',onFullyLoaded);perfMark('fullyLoaded');perfMark.log();}
function boot(){var url=SERVICE_WORKERS?window.location.href.substring(window.location.origin.length):window.location.hash.substring(1)||'/';if(url==='/'||url==='/index.html'){url=tabBar.firstElementChild.dataset.url;}
header.action='back';setBackButtonHidden(true);navigateToURL(url,true);perfMark('navigationInteractive');}