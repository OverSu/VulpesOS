'use strict';(function(exports){var datastore;var storeName='homescreen_settings';var readyState;var listeners=Object.create(null);function init(){return new Promise(function doInit(resolve,reject){if(readyState==='initialized'){resolve();return;}
if(readyState==='initializing'){document.addEventListener('vps-initialized',function oninitalized(){document.removeEventListener('vps-initialized',oninitalized);resolve();});return;}
readyState='initializing';if(!navigator.getDataStores){console.error('Home screen settings store: '+'DataStore API is not working');reject({name:'NO_DATASTORE'});readyState='failed';return;}
navigator.getDataStores(storeName).then(function(ds){if(ds.length<1){console.error('Home screen settings store: '+'Cannot get access to the Store');reject({name:'NO_ACCESS_TO_DATASTORE'});readyState='failed';return;}
datastore=ds[0];datastore.addEventListener('change',onchangeHandler);readyState='initialized';document.dispatchEvent(new CustomEvent('vps-initialized'));resolve();},reject);});}
function onchangeHandler(event){var operation=event.operation;var callbacks=listeners[operation];callbacks&&callbacks.forEach(function iterCallback(callback){datastore.get(event.id).then(function got(result){callback.method.call(callback.context||this,{type:operation,target:{name:event.id,value:result}});});});}
function addEventListener(type,callback){var context;if(!(type in listeners)){listeners[type]=[];}
var cb=callback;if(typeof cb==='object'){context=cb;cb=cb.handleEvent;}
if(cb){listeners[type].push({method:cb,context:context});init();}}
function removeEventListener(type,callback){if(!(type in listeners)){return false;}
var callbacks=listeners[type];var length=callbacks.length;for(var i=0;i<length;i++){var thisCallback=callback;if(typeof thisCallback==='object'){thisCallback=callback.handleEvent;}
if(callbacks[i]&&callbacks[i].method===thisCallback){callbacks.splice(i,1);return true;}}
return false;}
function get(id){return new Promise(function doGet(resolve,reject){init().then(function onInitialized(){datastore.get(id).then(resolve,reject);},reject);});}
function put(id,value){return new Promise(function doAdd(resolve,reject){init().then(function onInitialized(){datastore.put(value,id).then(function success(){resolve();},reject);},reject);});}
function setStoreName(name){if(readyState==='initializing'){document.addEventListener('vps-initialized',function deferSetStoreName(){document.removeEventListener('vps-initialized',deferSetStoreName);setStoreName(name);});return;}
readyState='uninitialized';storeName=name;}
exports.homescreenSettings={get:get,put:put,addEventListener:addEventListener,removeEventListener:removeEventListener,setStoreName:setStoreName};}(window));