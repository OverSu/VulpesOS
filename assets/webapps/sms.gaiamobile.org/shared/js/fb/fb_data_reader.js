;;;'use strict';var fb=self.fb||{};self.fb=fb;(function(){var contacts=fb.contacts||{};fb.contacts=contacts;var datastore;var DATASTORE_NAME='Gaia_Facebook_Friends';var INDEX_ID=1;var readyState='notInitialized';var INITIALIZE_EVENT='fb_ds_init';var revisionId;function createIndex(){return{byTel:Object.create(null),treeTel:[]};}
var index;function safeError(err){if(err&&err.name){return err;}
return{name:'UnknownError'};}
function notifyOpenSuccess(cb){readyState='initialized';if(typeof cb==='function'){window.setTimeout(cb,0);}
var ev=new CustomEvent(INITIALIZE_EVENT);document.dispatchEvent(ev);}
function initError(outRequest,error){outRequest.failed(error);}
function handleInitError(err,errorCb){readyState='error';contacts.error=err;if(typeof errorCb==='function'){window.setTimeout(function(){errorCb(err);},0);}
document.dispatchEvent(new CustomEvent(INITIALIZE_EVENT));}
function defaultError(request){return defaultErrorCb.bind(null,request);}
function defaultErrorCb(request,error){request.failed(error);}
function setIndex(obj){index=(obj||createIndex());}
function successGet(outReq,data){outReq.done(data);}
function errorGet(outReq,uid,err){window.console.error('Error while getting object for UID: ',uid);outReq.failed(err.name);}
Object.defineProperty(contacts,'datastore',{get:function getDataStore(){return datastore;},enumerable:false,configurable:false});Object.defineProperty(contacts,'dsIndex',{get:function getIndex(){return index;},set:setIndex,enumerable:false,configurable:false});contacts.get=function(uid){var outRequest=new fb.utils.Request();window.setTimeout(function get(){contacts.init(function(){doGet(uid,outRequest);},function(err){initError(outRequest,err);});},0);return outRequest;};function doGet(uid,outRequest){var successCb=successGet.bind(null,outRequest);var errorCb=errorGet.bind(null,outRequest,uid);datastore.get(uid).then(successCb,errorCb);}
contacts.getByPhone=function(tel){var outRequest=new fb.utils.Request();window.setTimeout(function get_by_phone(){contacts.init(function get_by_phone(){doGetByPhone(tel,outRequest);},function(err){initError(outRequest,err);});},0);return outRequest;};function doGetByPhone(tel,outRequest){var dsId;var normalizedNumber=navigator.mozPhoneNumberService.normalize(tel);if(datastore.revisionId!==revisionId){window.console.info('Datastore revision id has changed!');datastore.get(INDEX_ID).then(function success(obj){setIndex(obj);revisionId=datastore.revisionId;dsId=index.byTel[normalizedNumber];if(typeof dsId!=='undefined'){datastore.get(dsId).then(function success(friend){outRequest.done(friend);},defaultError(outRequest));}
else{outRequest.done(null);}},function(err){err=safeError(err);window.console.error('The index cannot be refreshed: ',err.name);outRequest.failed(err);});}
else{dsId=index.byTel[normalizedNumber];if(typeof dsId!=='undefined'){datastore.get(dsId).then(function success(friend){outRequest.done(friend);},defaultError(outRequest));}
else{outRequest.done(null);}}}
contacts.search=function(by,number){var outRequest=new fb.utils.Request();window.setTimeout(function do_search(){contacts.init(function do_search_init(){if(by==='phone'){doSearchByPhone(number,outRequest);}},function(err){initError(outRequest,err);});},0);return outRequest;};function doSearchByPhone(number,outRequest){var normalizedNumber=navigator.mozPhoneNumberService.normalize(number);LazyLoader.load(['/shared/js/fb/fb_tel_index.js','/shared/js/binary_search.js'],function(){var toSearchNumber=normalizedNumber;if(number.charAt(0)==='+'){toSearchNumber=number.substring(1);}
if(datastore.revisionId!==revisionId){window.console.info('Datastore revision id has changed!');datastore.get(INDEX_ID).then(function success(obj){setIndex(obj);revisionId=datastore.revisionId;var results=TelIndexer.search(index.treeTel,toSearchNumber);var out=null;if(results.length>0){out=datastore.get.apply(datastore,results);}
return out;},function(err){err=safeError(err);window.console.error('The index cannot be refreshed: ',err.name);outRequest.failed(err);}).then(function success(objList){if(objList&&!Array.isArray(objList)){objList=[objList];}
else{objList=[];}
outRequest.done(objList);},function error(err){err=safeError(err);window.console.error('Error while retrieving result data: ',err.name);outRequest.failed(err);});}
else{var results=TelIndexer.search(index.treeTel,toSearchNumber);if(results.length>0){datastore.get.apply(datastore,results).then(function success(objList){if(!Array.isArray(objList)){objList=[objList];}
outRequest.done(objList);},function error(err){err=safeError(err);window.console.error('Error while retrieving result data: ',err.name);outRequest.failed(err);});}
else{outRequest.done(results);}}});}
contacts.refresh=function(){var outRequest=new fb.utils.Request();window.setTimeout(function clear(){contacts.init(function(){doRefresh(outRequest);},function(err){initError(outRequest,err);});},0);return outRequest;};function doRefresh(outRequest){datastore.get(INDEX_ID).then(function success(obj){setIndex(obj);outRequest.done();},defaultError(outRequest));}
contacts.getLength=function(){var retRequest=new fb.utils.Request();window.setTimeout(function(){contacts.init(function get_all(){doGetLength(retRequest);},function(err){initError(retRequest,err);});},0);return retRequest;};function doGetLength(outRequest){datastore.getLength().then(function success(length){outRequest.done(length-1);},function error(err){outRequest.failed(safeError(err));});}
contacts.restart=function(){readyState='notInitialized';};contacts.init=function(cb,errorCb){if(!navigator.getDataStores){handleInitError({name:'DatastoreNotFound'},errorCb);return;}
if(readyState==='initialized'){cb();return;}
if(readyState==='initializing'){document.addEventListener(INITIALIZE_EVENT,function oninitalized(){cb();document.removeEventListener(INITIALIZE_EVENT,oninitalized);});return;}
readyState='initializing';navigator.getDataStores(DATASTORE_NAME).then(function success(ds){if(ds.length<1){handleInitError({name:'DatastoreNotFound'},errorCb);return;}
datastore=ds[0];datastore.getLength().then(function(length){if(length===0&&datastore.readOnly===false){window.console.info('Adding index as length is 0');setIndex(createIndex());return datastore.add(index);}
else if(length>0){return datastore.get(INDEX_ID);}
else if(datastore.readOnly===true){window.console.warn('The datastore is empty and readonly');}
return null;}).then(function add_index_success(v){if(typeof v!=='number'){setIndex(v);}
revisionId=datastore.revisionId;notifyOpenSuccess(cb);},function add_index_error(err){err=safeError(err);window.console.error('Error while setting the index: ',err.name);handleInitError(err,errorCb);});},function error(err){err=safeError(err);window.console.error('FB: Error while opening the DataStore: ',err.name);handleInitError(err,errorCb);});};})();