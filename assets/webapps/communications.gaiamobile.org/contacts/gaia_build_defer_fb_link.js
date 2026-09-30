;'use strict';var utils=window.utils||{};if(!utils.templates){(function(){var Templates=utils.templates={};function getTarget(element){var target=element;if(!element.tagName){target=document.querySelector(element);}
return target;}
function getTemplate(target,data){var templates=target.querySelectorAll('*[data-template]');if(templates.length===0){throw new Error('No template declared');}
if(templates.length>1&&templates.item(0).dataset.condition){throw new Error('Only one template supported in this version');}
return{template:templates.item(0),isMulti:false};}
function templateReplace(data){return function(text,property){var out;if(property.indexOf('.')===-1){out=data[property];if(Array.isArray(out)&&out.length>0){out=out[0];}}else{throw new Error('Dotted expressions not supported');}
if(typeof out==='undefined'){out=text;}
return out;};}
function add(element,data,mode,targetNode){var target=getTarget(element);var newElem;var theData=[data];if(data instanceof Array){theData=data;}
var multiTemplate=true;var template;var idx=0;theData.forEach(function(oneData){oneData._idx_=idx++;if(multiTemplate===true){var tresult=getTemplate(target,oneData);template=tresult.template;if(tresult.isMulti===false){multiTemplate=false;}}
if(template){newElem=this.render(template,oneData);target=targetNode||target;if(mode==='A'){target.appendChild(newElem);}else if(mode==='P'){if(target.firstChild){target.insertBefore(newElem,element.firstChild);}else{target.appendChild(newElem);}}}}.bind(Templates));return newElem;}
Templates.append=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'A',targetNode);};Templates.prepend=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'P',targetNode);};Templates.render=function(eleTemplate,data){var newElem=eleTemplate.cloneNode(true);newElem.removeAttribute('data-template');newElem.removeAttribute('data-condition');var pattern=/#(\w+[\w.]*)#/g;var inner=newElem.innerHTML;var replaceFunction=templateReplace(data);var ninner=inner.replace(pattern,replaceFunction);newElem.innerHTML=ninner;var attrs=newElem.attributes;var total=attrs.length;for(var c=0;c<total;c++){var val=attrs[c].value;var nval=val.replace(pattern,replaceFunction);newElem.setAttribute(attrs[c].name,nval);}
if(!newElem.id){if(data.id){newElem.id=data.id;}}
return newElem;};Templates.clear=function(element){var target=getTarget(element);var templates=target.querySelectorAll('*[data-template]');target.innerHTML='';var total=templates.length;for(var c=0;c<total;c++){target.appendChild(templates.item(c));}};})();};'use strict';var utils=window.utils||{};if(typeof utils.squareImage==='undefined'){utils.squareImage=function(blob,callback){var img=document.createElement('img');var url=URL.createObjectURL(blob);img.src=url;function cleanupImg(){img.src='';URL.revokeObjectURL(url);}
img.onerror=cleanupImg;img.onload=function onBlobLoad(){var width=img.width;var height=img.height;if(width===height){cleanupImg();callback(blob);}else{var canvas=document.createElement('canvas');var min=canvas.width=canvas.height=Math.min(width,height);var context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,(width-min)/2,(height-min)/2,min,min,0,0,min,min);cleanupImg();canvas.toBlob(function onCanvasToBlob(canvasBlob){context=null;canvas.width=canvas.height=0;canvas=null;callback(canvasBlob);},'image/jpeg',0.95);}};};};'use strict';var utils=window.utils||{};(function(utils){var DEPENDENCIES=['/shared/js/contacts/import/utilities/config.js','/shared/js/image_utils.js'];var dpr=window.devicePixelRatio||1;var CONFIG_FILE='/config-images.json';var DEFAULT_CONFIG={'thumbnail':{'format':'image/jpeg','size':65,'quality':1.0}};var THUMB_CONFIG=DEFAULT_CONFIG.thumbnail;if(typeof utils.thumbnailImage!=='undefined'){return;}
function getThumbsConfig(){return new Promise(function(resolve,reject){utils.config.load(CONFIG_FILE).then(function resolved(config){resolve(config);},function rejected(){resolve(DEFAULT_CONFIG);});});}
function scaleImage(blob,configData){var thumbConfig=configData&&configData.thumbnail||{};var thumbnailEdge=(thumbConfig.size||THUMB_CONFIG.size)*dpr;var format=thumbConfig.format||THUMB_CONFIG.format;var encodingQuality=thumbConfig.quality||THUMB_CONFIG.quality;return ImageUtils.resizeAndCropToCover(blob,thumbnailEdge,thumbnailEdge,format,encodingQuality);}
utils.thumbnailImage=function(blob,callback){LazyLoader.load(DEPENDENCIES,function(){getThumbsConfig().then(function(config){return scaleImage(blob,config);}).then(callback).catch(function(err){console.error('Error while converting image to thumbnail:',err.name);callback(blob);});});};})(utils);;'use strict';var utils=window.utils||{};if(!utils.listeners){(function(document){var Listeners=utils.listeners={};Listeners.add=function(config){try{for(var id in config){var handler=config[id];var nodes=document.querySelectorAll(id);for(var i=0;i<nodes.length;i++){var node=nodes[i];if(Array.isArray(handler)){handler.forEach(function handle(item){if(!item.hasOwnProperty('event')&&!item.hasOwnProperty('handler')){return;}
node.addEventListener(item.event,item.handler);});}else{node.addEventListener('click',handler);}}}}
catch(e){window.console.error('Error while registering listener for: ',id,e);}};})(document);};'use strict';var utils=window.utils||{};var SCALE_RATIO=window.devicePixelRatio||1;var LAST_IMPORT_TIMESTAMP_SUFFIX='_last_import_timestamp';function scale(size){return Math.round(SCALE_RATIO*size);}
if(!utils.misc){utils.misc={};utils.misc.toMozContact=function(contact){var outContact=contact;if(!(contact instanceof mozContact)){outContact=new mozContact(contact);outContact.id=contact.id||outContact.id;}
return outContact;};const FLAG_YEAR_IGNORED=9996;utils.misc.FLAG_YEAR_IGNORED=FLAG_YEAR_IGNORED;utils.misc.formatDate=function(date,customFormat){var dateString=null;try{var format=customFormat||{month:'short',day:'numeric'};var offset=date.getTimezoneOffset()*60*1000;var normalizedDate=new Date(date.getTime()+offset);var year=normalizedDate.getFullYear();if(year!==FLAG_YEAR_IGNORED){format.year='numeric';}
var f=new Intl.DateTimeFormat(navigator.languages,format);dateString=f.format(normalizedDate);}catch(err){console.error('Error parsing date: ',err);throw err;}
return dateString;};utils.misc.parseName=function(nameString){var MIN_LENGHT_SIGNIFICATIVE=3;var MIN_LENGHT_FN=2;var out={givenName:'',familyName:''};if(!nameString){return out;}
var str=nameString.trim();if(!str){return out;}
function startsWithUpper(str){var firstLetter=str.charAt(0);var capFirstLetter=firstLetter.toLocaleUpperCase();return(capFirstLetter===firstLetter);}
var tokens=nameString.split(/\s+/);var significativeTokens={};for(var j=0;j<tokens.length;j++){var token=tokens[j];if(token.length>MIN_LENGHT_SIGNIFICATIVE||startsWithUpper(token)){significativeTokens[token]=true;}}
var totalTokens=tokens.length;var lastToken=totalTokens-1;var rolePrevToken;var remainingTokens=Object.keys(significativeTokens).length;var outGivenNames=[],outFamilyNames=[];var numFns=0;while(lastToken>=0){if(significativeTokens[tokens[lastToken]]){remainingTokens--;}
var currToken=tokens[lastToken],nextToken=tokens[lastToken+1],prevToken=tokens[lastToken-1];if(!nextToken&&prevToken){outFamilyNames.push(currToken);numFns++;rolePrevToken='FN';}
else if(!prevToken){outGivenNames.push(currToken);rolePrevToken='GN';}
else if(nextToken){if(!significativeTokens[currToken]){if(rolePrevToken==='FN'){outFamilyNames.push(currToken);}
else{outGivenNames.push(currToken);}}
else if(currToken.length<MIN_LENGHT_FN){outGivenNames.push(currToken);rolePrevToken='GN';}
else{if(remainingTokens>=2&&numFns<2){outFamilyNames.push(currToken);numFns++;rolePrevToken='FN';}
else{outGivenNames.push(currToken);rolePrevToken='GN';}}}
lastToken--;}
out.givenName=outGivenNames.reverse().join(' ').trim();out.familyName=outFamilyNames.reverse().join(' ').trim();return out;};utils.misc.getPreferredPictureBox=function(){var imgThumbSize=oauthflow.params.facebook.imgThumbSize;var out={width:scale(imgThumbSize)};out.height=out.width;return out;};utils.misc.getPreferredPictureDetail=function(){var imgDetailWidth=oauthflow.params.facebook.imgDetailWidth;return scale(imgDetailWidth);};utils.misc.setTimestamp=function(type,callback){ImportStatusData.put(type+LAST_IMPORT_TIMESTAMP_SUFFIX,Date.now()).then(callback);};utils.misc.getTimestamp=function(type,callback){ImportStatusData.get(type+LAST_IMPORT_TIMESTAMP_SUFFIX).then(callback);};};;var oauthflow=this.oauthflow||{};oauthflow.params={"facebook":{"redirectURI":"https://www.facebook.com/connect/login_success.html","loginPage":"https://m.facebook.com/dialog/oauth/?","applicationId":"123456","scope":["friends_about_me","friends_birthday","friends_hometown","friends_location","friends_work_history","read_stream"],"redirectMsg":"http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/dialogs_end.html","redirectLogout":"http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/dialogs_end.html","imgDetailWidth":200,"imgThumbSize":120},"live":{"redirectURI":"https://www.mozilla.org/index.html","loginPage":"https://login.live.com/oauth20_authorize.srf?","applicationId":"123456","scope":["wl.basic","wl.contacts_emails","wl.contacts_phone_numbers","wl.contacts_birthday","wl.contacts_postal_addresses"],"logoutUrl":"https://login.live.com/logout.srf"},"gmail":{"redirectURI":"https://serene-cove-3587.herokuapp.com/liveowd/oauth2_new/flow_live.html","loginPage":"https://accounts.google.com/o/oauth2/auth?","applicationId":"664741361278.apps.googleusercontent.com","scope":["https://www.google.com/m8/feeds/"],"logoutUrl":"https://accounts.google.com/Logout"}};;'use strict';var fb=window.fb||{};window.fb=fb;(function(document){var Utils=fb.utils||{};fb.utils=Utils;var FRIEND_COUNT_QUERY='select friend_count from user where uid=me()';var CACHE_FRIENDS_KEY=Utils.CACHE_FRIENDS_KEY='numFacebookFriends';var LAST_UPDATED_KEY=Utils.LAST_UPDATED_KEY='lastUpdatedTime';Utils.ALARM_ID_KEY='nextAlarmId';Utils.SCHEDULE_SYNC_KEY='facebookShouldHaveScheduledAt';var REDIRECT_LOGOUT_URI=window.oauthflow?oauthflow.params.facebook.redirectLogout:'';var STORAGE_KEY=Utils.TOKEN_DATA_KEY='tokenData';Utils.setLastUpdate=function(value,cb){window.asyncStorage.setItem(LAST_UPDATED_KEY,{data:value},cb);};Utils.getLastUpdate=function(callback){window.asyncStorage.getItem(LAST_UPDATED_KEY,function(obj){var out=0;if(obj){out=obj.data||out;}
if(typeof callback==='function'){callback(out);}});};Utils.getNonCacheableUrl=function(url){if(url.indexOf('?')===-1){url+='?';}
return url+'&burst_cache='+Date.now();};Utils.getContactData=function(cid){var outReq=new Utils.Request();var req=navigator.mozContacts.find({filterBy:['id'],filterValue:cid,filterOp:'equals'});req.onsuccess=function(e){if(e.target.result&&e.target.result.length>0){outReq.done(e.target.result[0]);}
else{outReq.done(null);}};req.onerror=function(e){outReq.failed(e.target.error);};return outReq;};Utils.getMozContact=function(uid){var outReq=new Utils.Request();window.setTimeout(function get_mozContact_ByUid(){fb.getMozContactByUid(uid,function onsuccess(result){if(Array.isArray(result)&&result.length>0){outReq.done(result[0]);}else{outReq.done(null);}},function onerror(e){outReq.failed(e.target.error);});},0);return outReq;};Utils.getNumberMozContacts=function(uid){var outReq=new Utils.Request();window.setTimeout(function get_mozContact_ByUid(){fb.getMozContactByUid(uid,function onsuccess(result){if(Array.isArray(result)){outReq.done(result.length);}else{outReq.done(0);}},function onerror(error){outReq.failed(error);});},0);return outReq;};Utils.getAllFbContacts=function(){var outReq=new Utils.Request();window.setTimeout(function get_all_fb_contacts(){var filter={filterValue:fb.CATEGORY,filterOp:'contains',filterBy:['category']};var req=navigator.mozContacts.find(filter);req.onsuccess=function(e){outReq.done(e.target.result);};req.onerror=function(e){outReq.failed(e.target.error);};},0);return outReq;};Utils.getNumFbContacts=function(){var outReq=new Utils.Request();window.setTimeout(function get_num_fb_contacts(){var req=fb.contacts.getLength();req.onsuccess=function(){outReq.done(req.result);};req.onerror=function(){outReq.failed(req.error);};},0);return outReq;};Utils.getNumFbFriends=function(callback,access_token){fb.utils.runQuery(FRIEND_COUNT_QUERY,callback,access_token);};Utils.getCachedAccessToken=function(callback){ImportStatusData.get(STORAGE_KEY).then(function(data){var out=null;if(data){out=data.access_token||null;}
if(typeof callback==='function'){callback(out);}});};Utils.setCachedAccessToken=function(data,callback){ImportStatusData.put(STORAGE_KEY,data).then(function done(){if(typeof callback==='function'){callback();}},function error(){console.error('Error while saving access token');if(typeof callback==='function'){callback();}});};Utils.getCachedNumFbFriends=function(callback){ImportStatusData.get(CACHE_FRIENDS_KEY).then(function(data){if(typeof callback==='function'&&typeof data==='number'){callback(data);}});};Utils.setCachedNumFriends=function(value,cb){ImportStatusData.put(CACHE_FRIENDS_KEY,value).then(cb);};Utils.removeCachedNumFriends=function(callback){ImportStatusData.remove(CACHE_FRIENDS_KEY).then(function(){typeof callback==='function'&&callback();});};Utils.getImportChecked=function(callback){Utils.getCachedAccessToken(function(access_token){var out='logged-out';if(access_token){out='logged-in';}
else{Utils.getCachedNumFbFriends(function(value){if(value){out='renew-pwd';if(typeof callback==='function'){callback(out);}}});}
if(typeof callback==='function'){callback(out);}});};Utils.numFbFriendsData=function(callback){var localCb=callback.local;var remoteCb=callback.remote;Utils.getCachedNumFbFriends(localCb);function auxCallback(response){if(response.data&&response.data[0]&&response.data[0].friend_count){remoteCb(response.data[0].friend_count);}}
if(typeof remoteCb==='function'&&navigator.onLine===true){var remoteCallbacks={success:auxCallback,error:null,timeout:null};Utils.getCachedAccessToken(function(access_token){if(access_token){Utils.getNumFbFriends(remoteCallbacks,access_token);}});}};Utils.clearFbData=function(){var outReq=new Utils.Request();window.setTimeout(function do_clearFbData(){var ireq=fb.contacts.clear();ireq.onsuccess=function(){var req=Utils.getAllFbContacts();req.onsuccess=function(){var cleaner=new Utils.FbContactsCleaner(req.result,'clear');outReq.done(cleaner);window.setTimeout(cleaner.start,0);};req.onerror=function(){window.console.error('FB Clean. Error retrieving FB Contacts');outReq.failed(req.error);};};ireq.onerror=function(e){window.console.error('Error while clearing the FB Cache');outReq.failed(ireq.error);};},0);return outReq;};Utils.logout=function(){var outReq=new Utils.Request();var WINDOW_TIMER_INTERVAL=500;var LOGOUT_TIMEOUT=5000;var MAX_TIMER_TICKS=LOGOUT_TIMEOUT/WINDOW_TIMER_INTERVAL;window.setTimeout(function do_logout(){Utils.getCachedAccessToken(function getAccessToken(access_token){if(access_token){var logoutService='https://www.facebook.com/logout.php?';var params=['next'+'='+encodeURIComponent(REDIRECT_LOGOUT_URI),'access_token'+'='+access_token];var logoutParams=params.join('&');var logoutUrl=logoutService+logoutParams;var loggedOut=false;var m_listen=function(e){if(e.origin!==fb.CONTACTS_APP_ORIGIN){return;}
if(e.data==='closed'){loggedOut=true;ImportStatusData.remove(STORAGE_KEY);outReq.done();}
e.stopImmediatePropagation();window.removeEventListener('message',m_listen);};window.addEventListener('message',m_listen);var logoutWindow=window.open(logoutUrl,'','dialog');var timerTicks=0;var timerId=window.setInterval(function(){timerTicks++;var closed=(logoutWindow.closed===true);var timedOut=(timerTicks>=MAX_TIMER_TICKS);if(loggedOut||closed||timedOut){window.clearInterval(timerId);window.removeEventListener('message',m_listen);}
if(closed&&!loggedOut){outReq.failed('UserCancelled');}
else if(timedOut&&!loggedOut){outReq.failed('Timeout');}},WINDOW_TIMER_INTERVAL);}
else{outReq.done();}});},0);return outReq;};Utils.FbContactsCleaner=function(contacts,pmode){this.lcontacts=contacts;var total=contacts.length;var next=0;var self=this;var CHUNK_SIZE=5;var numResponses=0;var mustUpdate=(pmode==='update');var notifyClean=false;var mustHold=false;var holded=false;var mustFinish=false;this.start=function(){mustHold=holded=mustFinish=false;if(total>0){cleanContacts(0);}
else if(typeof self.onsuccess==='function'){window.setTimeout(self.onsuccess);}};this.hold=function(){mustHold=true;};this.finish=function(){mustFinish=true;if(holded){notifySuccess();}};this.resume=function(){mustHold=holded=mustFinish=false;window.setTimeout(function resume_clean(){cleanContacts(next);});};function successHandler(e){if(notifyClean||typeof self.oncleaned==='function'){notifyClean=true;var cleaned=e.target.number;window.setTimeout(function(){self.oncleaned(cleaned);},0);}
continueCb();}
function errorHandler(contactid,error){if(typeof self.onerror==='function'){self.onerror(contactid,error);}
continueCb();}
function cleanContacts(from){for(var idx=from;idx<(from+CHUNK_SIZE)&&idx<total;idx++){var contact=contacts[idx];var number=idx;var req,fbContact;if(fb.isFbLinked(contact)){if(mustUpdate){fbContact=new fb.Contact(contact);req=fbContact.unlink('hard');}
else{fb.unlinkClearAll(contact);req=navigator.mozContacts.save(utils.misc.toMozContact(contact));}}
else{if(mustUpdate){fbContact=new fb.Contact(contact);req=fbContact.remove();}
else{req=navigator.mozContacts.remove(utils.misc.toMozContact(contact));}}
req.number=number;req.onsuccess=successHandler;req.onerror=function(e){errorHandler(contact.id,e.target.error);};}}
function notifySuccess(){if(typeof self.onsuccess==='function'){window.setTimeout(self.onsuccess);}}
function finishHandler(){var req=fb.contacts.flush();req.onsuccess=notifySuccess;req.onerror=function cleaner_flushError(){errorHandler(null,req.error);};}
function continueCb(){next++;numResponses++;if(next<total&&numResponses===CHUNK_SIZE){numResponses=0;if(!mustHold&&!mustFinish){cleanContacts(next);}
else if(mustFinish&&!holded){finishHandler();}
if(mustHold){holded=true;}}
else if(next>=total){finishHandler();}}};})(document);;'use strict';var fb=this.fb||{};var self=this;fb.utils=this.fb.utils||{};fb.DEFAULT_TIMEOUT=30000;fb.utils.runQuery=function(query,callback,access_token){function QueryRequest(){this.cancel=function(){if(typeof this.oncancel==='function'){window.setTimeout(function(){this.oncancel();}.bind(this),0);}};}
var outReq=new QueryRequest();var queryService='https://graph.facebook.com/fql?q=';queryService+=encodeURIComponent(query);var params=['access_token'+'='+access_token,'format=json'];var queryParams=params.join('&');var remote=queryService+'&'+queryParams;var xhr=new XMLHttpRequest({mozSystem:true});outReq.xhr=xhr;outReq.oncancel=function(){this.xhr.abort();};xhr.open('GET',remote,true);xhr.responseType='json';xhr.timeout=fb.operationsTimeout||fb.DEFAULT_TIMEOUT;xhr.onload=function(e){if(xhr.status===200||xhr.status===400||xhr.status===0){if(callback&&typeof callback.success==='function'){self.setTimeout(function(){callback.success(xhr.response);},0);}}
else{self.console.error('FB: HTTP error executing query. ',query,' Status: ',xhr.status);if(callback&&typeof callback.error==='function'){self.setTimeout(callback.error,0);}}};xhr.ontimeout=function(e){self.console.error('FB: Timeout!!! while executing query',query);if(callback&&typeof callback.timeout==='function'){self.setTimeout(callback.timeout,0);}};xhr.onerror=function(e){self.console.error('FB: Error while executing query: ',query,': ',e);if(callback&&typeof callback.error==='function'){self.setTimeout(function(){callback.error(e);},0);}};xhr.send();return outReq;};fb.utils.getFriendPicture=function(uid,callback,access_token,targetPictureSize){var imgSrc='https://graph.facebook.com/'+uid+'/picture?';var params=['width='+targetPictureSize,'access_token='+access_token,'t='+Date.now()];var imgService=imgSrc+params.join('&');var xhr=new XMLHttpRequest({mozSystem:true});xhr.open('GET',imgService,true);xhr.responseType='blob';xhr.timeout=fb.operationsTimeout||fb.DEFAULT_TIMEOUT;xhr.onload=function(e){if(xhr.status===200||xhr.status===0){var mblob=e.target.response;if(typeof callback==='function'){self.setTimeout(function(){callback(mblob);},0);}}
else{self.console.error('FB: HTTP error retrieving img for uid: ',uid,' Status: ',xhr.status);if(typeof callback==='function'){self.setTimeout(function(){callback(null);},0);}}};xhr.ontimeout=function(e){self.console.error('FB: Timeout!!! while retrieving img for uid: ',uid);if(typeof callback==='function'){self.setTimeout(function(){callback(null);},0);}};xhr.onerror=function(e){self.console.error('FB: Error while retrieving img for uid: ',uid,'Error: ',e);if(typeof callback==='function'){self.setTimeout(function(){callback(null);},0);}};xhr.send();};;;;;;;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var fb=window.fb||{};if(typeof window.oauth2==='undefined'){(function(document){var oauth2=window.oauth2={};var accessTokenCbData;var STORAGE_KEY='tokenData';var APP_ORIGIN=location.origin;function clearStorage(service){ImportStatusData.remove(getKey(service));}
function getKey(service){var key=STORAGE_KEY;if(service!=='facebook'){key=STORAGE_KEY+'_'+service;}
return key;}
oauth2.getAccessToken=function(ready,state,service){accessTokenCbData={callback:ready,state:state,service:service};fb.testToken=fb.testToken||(parent.fb&&parent.fb.testToken);if(service==='facebook'&&typeof fb.testToken==='string'&&fb.testToken.trim().length>0){window.console.warn('Facebook. A test token will be used!');tokenDataReady({data:{access_token:fb.testToken,expires_in:0,state:state}});return;}
ImportStatusData.get(getKey(service)).then(function getAccessToken(tokenData){if(!tokenData||!tokenData.access_token){startOAuth(state,service);return;}
var access_token=tokenData.access_token;var expires=Number(tokenData.expires);var token_ts=tokenData.token_ts;if(expires!==0&&Date.now()-token_ts>=expires){window.console.warn('Access token has expired, restarting flow');startOAuth(state,service);return;}
if(typeof ready==='function'){ready(access_token);}});};function startOAuth(state,service){clearStorage(service);oauthflow.start(state,service);}
function tokenDataReady(e){var parameters=e.data;if(!parameters||!parameters.access_token){return;}
if(e.origin!==APP_ORIGIN){return;}
Curtain.show('wait',accessTokenCbData.state);window.setTimeout(function do_token_ready(){var access_token=parameters.access_token;if(parameters.state===accessTokenCbData.state){accessTokenCbData.callback(access_token);}else{window.console.error('FB: Error in state',parameters.state,accessTokenCbData.state);return;}
var end=parameters.expires_in;ImportStatusData.put(getKey(accessTokenCbData.service),{access_token:access_token,expires:end*1000,token_ts:Date.now()}).then(function notify_parent(){parent.postMessage({type:'token_stored',data:''},APP_ORIGIN);});},0);}
window.addEventListener('message',tokenDataReady);})(document);};'use strict';var fb=self.fb||{};self.fb=fb;fb.utils=self.fb.utils||{};self.fb.utils=fb.utils;if(typeof fb.utils.Request!=='function'){fb.utils.Request=function(){this.done=function(result){this.result=result;if(typeof this.onsuccess==='function'){var ev={};ev.target=this;window.setTimeout(function(){this.onsuccess(ev);}.bind(this),0);}};this.failed=function(error){this.error=error;if(typeof this.onerror==='function'){var ev={};ev.target=this;window.setTimeout(function(){this.onerror(ev);}.bind(this),0);}};};};'use strict';var fb=window.fb||{};(function(){var contacts=fb.contacts||{};fb.contacts=contacts;var Reader;var readerLoaded=false;var INDEX_ID=1;var isIndexDirty=false;var READER_LOADED_EV='reader_loaded';var TEL_INDEXER_JS='/shared/js/fb/fb_tel_index.js';var PHONE_MATCHER_JS='/shared/js/simple_phone_matcher.js';var FB_READER_JS='/shared/js/fb/fb_data_reader.js';var BINARY_SEARCH_JS='/shared/js/binary_search.js';contacts.UID_NOT_FOUND='UIDNotFound';contacts.ALREADY_EXISTS='AlreadyExists';if(!contacts.init){var proxyMethods=['get','getLength','getByPhone','search','refresh','init','restart'];proxyMethods.forEach(function(aMethod){contacts[aMethod]=defaultFunction.bind(null,aMethod);});LazyLoader.load(FB_READER_JS,onreaderLoaded);}
else{onreaderLoaded();}
function onreaderLoaded(){readerLoaded=true;Reader=fb.contacts;document.dispatchEvent(new CustomEvent(READER_LOADED_EV));}
function setIndex(index){Reader.dsIndex=index;isIndexDirty=false;}
function datastore(){return Reader.datastore;}
function index(){return Reader.dsIndex;}
function defaultFunction(target){var args=[];for(var j=1;j<arguments.length;j++){args.push(arguments[j]);}
if(!readerLoaded){document.addEventListener(READER_LOADED_EV,function rd_loaded(){document.removeEventListener(READER_LOADED_EV,rd_loaded);Reader[target].apply(this,args);});}
else{Reader[target].apply(this,args);}}
function initError(outRequest,error){outRequest.failed(error);}
function safeError(err){if(err&&err.name){return err;}
return{name:'UnknownError'};}
function defaultError(request){return defaultErrorCb.bind(null,request);}
function defaultSuccess(request){return defaultSuccessCb.bind(null,request);}
function defaultErrorCb(request,error){request.failed(safeError(error));}
function defaultSuccessCb(request,result){request.done(result);}
function doSave(obj,outRequest){LazyLoader.load([TEL_INDEXER_JS,PHONE_MATCHER_JS,BINARY_SEARCH_JS],function(){var uid=obj.uid;datastore().add(obj,uid).then(function success(){indexByPhone(obj,uid);isIndexDirty=true;outRequest.done();},function error(err){if(err.name==='ConstraintError'){err={name:contacts.ALREADY_EXISTS};}
outRequest.failed(err);});});}
function indexByPhone(obj,newId){if(Array.isArray(obj.tel)){obj.tel.forEach(function(aTel){var variants=SimplePhoneMatcher.generateVariants(aTel.value);variants.forEach(function(aVariant){index().byTel[aVariant]=newId;});TelIndexer.index(index().treeTel,aTel.value.substring(1),newId);});}}
function reIndexByPhone(oldObj,newObj,dsId){removePhoneIndex(oldObj);indexByPhone(newObj,dsId);TelIndexer.orderTree(index().treeTel);}
function removePhoneIndex(deletedFriend){if(Array.isArray(deletedFriend.tel)){deletedFriend.tel.forEach(function(aTel){TelIndexer.remove(index().treeTel,aTel.value.substring(1));var variants=SimplePhoneMatcher.generateVariants(aTel.value);variants.forEach(function(aVariant){delete index().byTel[aVariant];});});}}
contacts.save=function(obj){var retRequest=new fb.utils.Request();window.setTimeout(function save(){contacts.init(function(){doSave(obj,retRequest);},function(err){initError(retRequest,err);});},0);return retRequest;};contacts.update=function(obj){var retRequest=new fb.utils.Request();window.setTimeout(function save(){contacts.init(function(){doUpdate(obj,retRequest);},function(err){initError(retRequest,err);});},0);return retRequest;};function doUpdate(obj,outRequest){LazyLoader.load([TEL_INDEXER_JS,PHONE_MATCHER_JS,BINARY_SEARCH_JS],function(){var uid=obj.uid;var successCb=successUpdate.bind(null,outRequest);var errorCb=errorUpdate.bind(null,outRequest,uid);datastore().get(uid).then(function success(oldObj){if(!oldObj){errorCb({name:contacts.UID_NOT_FOUND});return;}
reIndexByPhone(oldObj,obj,uid);datastore().put(obj,uid).then(function success(){return datastore().put(index(),INDEX_ID);},errorCb).then(successCb,errorCb);},errorCb);});}
function successUpdate(outRequest){outRequest.done();}
function errorUpdate(outRequest,uid,error){window.console.error('Error while updating datastore for: ',uid);outRequest.failed(error);}
function doRemove(uid,outRequest,forceFlush){LazyLoader.load([TEL_INDEXER_JS,PHONE_MATCHER_JS,BINARY_SEARCH_JS],function(){var errorCb=errorRemove.bind(null,outRequest,uid);var objToDelete;datastore().get(uid).then(function success_get_remove(object){objToDelete=object;if(!objToDelete){errorRemove(outRequest,uid,{name:contacts.UID_NOT_FOUND});return;}
datastore().remove(uid).then(function success_rm(removed){successRemove(outRequest,objToDelete,forceFlush,removed);},errorCb);},errorCb);});}
function successRemove(outRequest,deletedFriend,forceFlush,removed){if(removed===true){isIndexDirty=true;removePhoneIndex(deletedFriend);if(forceFlush){var flushReq=fb.contacts.flush();flushReq.onsuccess=function(){isIndexDirty=false;outRequest.done(true);};flushReq.onerror=function(){outRequest.failed(flushReq.error);};}
else{outRequest.done(true);}}
else{outRequest.done(false);}}
function errorRemove(outRequest,uid,error){error=safeError(error);window.console.error('FB Data: Error while removing ',uid,': ',error.name);outRequest.failed(error);}
contacts.remove=function(uid,flush){var hasToFlush=(flush===true?flush:false);var retRequest=new fb.utils.Request();window.setTimeout(function remove(){contacts.init(function(){doRemove(uid,retRequest,hasToFlush);},function(err){initError(retRequest,err);});},0);return retRequest;};contacts.clear=function(){var outRequest=new fb.utils.Request();window.setTimeout(function clear(){contacts.init(function(){doClear(outRequest);},function(err){initError(outRequest,err);});},0);return outRequest;};function doClear(outRequest){datastore().clear().then(function success(){setIndex(null);datastore().put(index(),INDEX_ID).then(defaultSuccess(outRequest),function error(err){err=safeError(err);window.console.error('Error while re-creating the index: ',err.name);outRequest.failed(err);});},defaultError(outRequest));}
contacts.flush=function(){var outRequest=new fb.utils.Request();window.setTimeout(function do_Flush(){if(!(datastore())||!isIndexDirty){window.console.warn('The datastore has not been initialized or is not dirty');outRequest.done();return;}
TelIndexer.orderTree(index().treeTel);datastore().put(index(),INDEX_ID).then(defaultSuccess(outRequest),defaultError(outRequest));},0);return outRequest;};})();;'use strict';var fb=self.fb||{};self.fb=fb;if(!self.AuxFB){self.AuxFb=(function(){var CATEGORY='facebook';var NOT_LINKED='not_linked';var LINKED='fb_linked';function populate(source,target,propertyNames){propertyNames.forEach(function(property){var propertyValue=source[property];if(propertyValue){if(Array.isArray(propertyValue)){target[property]=propertyValue.slice(0,propertyValue.length);}else{target[property]=propertyValue;}}});}
function mergeFbData(dcontact,fbdata){var multipleFields=['email','tel','photo','org','adr'];multipleFields.forEach(function(field){if(!dcontact[field]){dcontact[field]=[];}
var items=fbdata[field];if(items){items.forEach(function(item){var dupList=checkDuplicates(field,item,dcontact[field],fbdata.shortTelephone);if(dupList.length===0){dcontact[field].push(item);}});}});var singleFields=['bday','anniversary'];singleFields.forEach(function(field){if(!dcontact[field]){dcontact[field]=fbdata[field];}});mergeNames(dcontact,fbdata);}
function mergeNames(devContact,fbContact){var namesChanged=false;var nameFields=['givenName','familyName'];nameFields.forEach(function(anameField){var fieldValue=devContact[anameField];var fbValue=fbContact[anameField];if((!Array.isArray(fieldValue)||fieldValue.length===0)&&Array.isArray(fbValue)&&fbValue.length>0){namesChanged=true;devContact[anameField]=(fieldValue&&fieldValue[0])||[];devContact[anameField].push(fbValue[0]);}});if(namesChanged){var givenName=devContact.givenName[0]||'';var familyName=devContact.familyName[0]||'';devContact.name=[givenName+' '+familyName];}}
function isFbContact(devContact){return(devContact&&devContact.category&&devContact.category.indexOf(CATEGORY)!==-1);}
function isFbLinked(devContact){return(devContact&&devContact.category&&devContact.category.indexOf(LINKED)!==-1);}
function getData(devContact){var outReq=new fb.utils.Request();window.setTimeout(function do_getData(){var uid=getFriendUid(devContact);if(uid){var fbreq=fb.contacts.get(uid);fbreq.onsuccess=function(){var fbdata=fbreq.result;var out=mergeContact(devContact,fbdata);outReq.done(out);};fbreq.onerror=function(){outReq.failed(fbreq.error);};}
else{outReq.done(devContact);}},0);return outReq;}
function getFriendUid(devContact){var out=devContact.uid;if(!out){if(isFbLinked(devContact)){out=getLinkedTo(devContact);}
else if(devContact.category){var idx=devContact.category.indexOf(CATEGORY);if(idx!==-1){out=devContact.category[idx+2];}}}
return out;}
function getLinkedTo(devContact){var out;if(devContact.category){var idx=devContact.category.indexOf(LINKED);if(idx!==-1){out=devContact.category[idx+1];}}
return out;}
function mergeContact(devContact,fbContact){var out=devContact;if(fbContact){out=Object.create(null);out.updated=devContact.updated;out.published=devContact.published;populate(devContact,out,Object.getOwnPropertyNames(devContact));populate(devContact,out,Object.getOwnPropertyNames(Object.getPrototypeOf(devContact)));mergeFbData(out,fbContact);}
return out;}
function getContactByNumber(number,onsuccess,onerror){var req=fb.contacts.getByPhone(number);req.onsuccess=function get_by_phone_success(e){var fbData=req.result;if(fbData){fb.getMozContactByUid(fbData.uid,function merge(result){if(Array.isArray(result)&&result[0]){var finalContact=fb.mergeContact(result[0],fbData);onsuccess(finalContact);}
else{onsuccess(null);}},function error_get_mozContact(err){console.error('Error getting mozContact: ',err.name);onerror(err);});}
else{onsuccess(null);}};req.onerror=function(){onerror(req.error);};}
function checkDuplicates(field,fbItem,devContactItems,extraFbItems){var potentialDuplicatesFields=['email','tel'];var out=[];if(devContactItems&&potentialDuplicatesFields.indexOf(field)!==-1){var total=devContactItems.length;for(var i=0;i<total;i++){var localValue=devContactItems[i].value;var fbValue=fbItem.value;if(localValue){var trimedLocal=localValue.trim();if(trimedLocal===fbValue||(field==='tel'&&Array.isArray(extraFbItems)&&extraFbItems.indexOf(trimedLocal)!==-1)){out.push(trimedLocal);out.push(fbValue);}}}}
return out;}
function getMozContactByUid(uid,onsuccess,onerror){var filter={filterBy:['category'],filterValue:uid,filterOp:'contains'};var req=navigator.mozContacts.find(filter);req.onsuccess=function(){onsuccess(req.result);};req.onerror=function(){onerror(req.error);};}
return{'isFbContact':isFbContact,'isFbLinked':isFbLinked,'getData':getData,'getFriendUid':getFriendUid,'getLinkedTo':getLinkedTo,'mergeContact':mergeContact,'getContactByNumber':getContactByNumber,'getMozContactByUid':getMozContactByUid,'checkDuplicates':checkDuplicates,get CATEGORY(){return CATEGORY;},get LINKED(){return LINKED;},get NOT_LINKED(){return NOT_LINKED;}};})();var props=Object.keys(self.AuxFb);for(var j=0,end=props.length;j<end;j++){var prop=props[j];if(typeof self.fb[prop]==='function'){self.fb[prop]=self.AuxFb[prop];}
else{Object.defineProperty(self.fb,prop,{value:(function(){return self.AuxFb[prop];})(),writable:false,enumerable:true,configurable:false});}}};'use strict';var fb=this.fb||{};fb.PROPAGATED_PREFIX='fb_propagated_';fb.PROFILE_PHOTO_URI='fb_profile_photo';fb.FRIEND_URI='fb_friend';fb.DEFAULT_PHONE_TYPE='other';fb.DEFAULT_EMAIL_TYPE='other';fb.FLAG_YEAR_IGNORED=9996;fb.CONTACTS_APP_ORIGIN=location.origin;fb.isPropagated=function fcu_isPropagated(field,devContact){return(devContact.category&&devContact.category.indexOf(fb.PROPAGATED_PREFIX+field)!==-1);};fb.removePropagatedFlag=function fcu_removePropagatedFlag(field,devContact){var idx=devContact.category.indexOf(fb.PROPAGATED_PREFIX+field);if(idx!==-1){devContact.category.splice(idx,1);}};fb.setPropagatedFlag=function fcu_setPropagatedFlag(field,devContact){var idx=devContact.category.indexOf(fb.PROPAGATED_PREFIX+field);if(idx===-1){devContact.category.push(fb.PROPAGATED_PREFIX+field);}};fb.getFriendPictureUrl=function(devContact){var out;var urls=devContact.url;if(urls){for(var c=0;c<urls.length;c++){var aurl=urls[c];if(aurl.type.indexOf(fb.PROFILE_PHOTO_URI)!==-1){out=aurl.value;break;}}}
return out;};fb.setFriendPictureUrl=function(devContact,url){var urls=devContact.url||[];urls.push({type:[fb.PROFILE_PHOTO_URI],value:url});devContact.url=urls;};fb.friend2mozContact=function(f){function normalizeFbPhoneNumber(phone){var out=phone.number;if(phone.country_code&&out.indexOf('+')!==0){out='+'+phone.country_code+out;}
return out;}
if(Array.isArray(f.familyName)){return f;}
f.familyName=[f.last_name?f.last_name.trim():(f.last_name||'')];var middleName=f.middle_name?f.middle_name.trim():(f.middle_name||'');f.additionalName=middleName;var firstName=f.first_name?f.first_name.trim():(f.first_name||'');f.givenName=[(firstName+' '+middleName).trim()];delete f.last_name;delete f.middle_name;delete f.first_name;if(f.email){f.email1=f.email;f.email=[{type:[fb.DEFAULT_EMAIL_TYPE],value:f.email}];}
else{f.email1='';}
if(Array.isArray(f.phones)&&f.phones.length>0){f.tel=[];f.shortTelephone=[];f.phones.forEach(function(aphone){f.tel.push({type:[fb.DEFAULT_PHONE_TYPE],value:normalizeFbPhoneNumber(aphone)});f.shortTelephone.push(aphone.number);});}
delete f.phones;f.uid=f.uid.toString();return f;};fb.getWorksAt=function(fbdata){var out='';if(fbdata.work&&fbdata.work.length>0){out=fbdata.work[0].employer.name;}
return out;};fb.getBirthDate=function getBirthDate(sbday){var out=new Date(0);var imonth=sbday.indexOf('/');var smonth=sbday.substring(0,imonth);var iyear=sbday.lastIndexOf('/');if(iyear===imonth){iyear=sbday.length;}
var sday=sbday.substring(imonth+1,iyear);var syear=sbday.substring(iyear+1,sbday.length);out.setUTCDate(parseInt(sday,10));out.setUTCMonth(parseInt(smonth,10)-1,parseInt(sday,10));if(syear&&syear.length>0){out.setUTCFullYear(parseInt(syear,10));}
else{out.setUTCFullYear(fb.FLAG_YEAR_IGNORED);}
out.setUTCHours(0);out.setUTCMinutes(0);out.setUTCSeconds(0);out.setUTCMilliseconds(0);return out;};fb.getAddresses=function(fbdata){function fillAddress(fbAddress,type){var outAddr={};outAddr.type=[type];outAddr.locality=fbAddress.city||'';outAddr.region=fbAddress.state||'';outAddr.countryName=fbAddress.country||'';return outAddr;}
var out=[];var addrTypes={'home':'hometown_location','current':'current_location'};Object.keys(addrTypes).forEach(function onAddressType(type){var addrObj=fbdata[addrTypes[type]];if(addrObj){out.push(fillAddress(addrObj,type));}});return out;};fb.markAsUnlinked=function(devContact){var category=devContact.category;var updatedCategory=[];if(category){var idx=category.indexOf(fb.CATEGORY);if(idx!==-1){for(var c=0;c<idx;c++){updatedCategory.push(category[c]);}
for(c=idx+3;c<category.length;c++){updatedCategory.push(category[c]);}}}
devContact.category=updatedCategory;return devContact;};fb.unlinkClearAll=function(devContact){fb.resetNames(devContact);fb.markAsUnlinked(devContact);};fb.resetNames=function resetNames(dContact){if(fb.isPropagated('givenName',dContact)){dContact.givenName=[''];fb.removePropagatedFlag('givenName',dContact);}
if(fb.isPropagated('familyName',dContact)){dContact.familyName=[''];fb.removePropagatedFlag('familyName',dContact);}
dContact.name=[dContact.givenName[0]+' '+dContact.familyName[0]];};fb.markFbCleaningInProgress=function(value){utils.cookie.update({fbCleaningInProgress:value});};;'use strict';var fb=window.fb||{};fb.Contact=function(deviceContact,cid){var contactData;var devContact=deviceContact;var contactid=cid;function doGetFacebookUid(data){return fb.getFriendUid(data);}
function getFacebookUid(){return doGetFacebookUid(deviceContact);}
function setFacebookUid(value){doSetFacebookUid(deviceContact,value);}
function doSetFacebookUid(dcontact,value){if(!dcontact.category){dcontact.category=[];}
if(dcontact.category.indexOf(fb.CATEGORY)===-1){markAsFb(dcontact);}
var idx=dcontact.category.indexOf(fb.CATEGORY);dcontact.category[idx+2]=value;}
function markAsFb(dcontact){if(!dcontact.category){dcontact.category=[];}
if(dcontact.category.indexOf(fb.CATEGORY)===-1){dcontact.category.push(fb.CATEGORY);dcontact.category.push(fb.NOT_LINKED);}
return dcontact;}
function markAsLinked(dcontact,uid){if(!dcontact.category){dcontact.category=[];}
if(dcontact.category.indexOf(fb.LINKED)===-1){dcontact.category.push(fb.CATEGORY);dcontact.category.push(fb.LINKED);dcontact.category.push(uid);}
return dcontact;}
function promoteToLinked(dcontact){var idx=dcontact.category.indexOf(fb.NOT_LINKED);if(idx!=-1){dcontact.category[idx]=fb.LINKED;}}
this.setData=function(data){contactData=data;};Object.defineProperty(this,'uid',{get:getFacebookUid,set:setFacebookUid,enumerable:true,});Object.defineProperty(this,'mozContact',{get:getDevContact});function getDevContact(){return devContact;}
this.save=function(){var outReq=new fb.utils.Request();if(contactData&&navigator.mozContacts){window.setTimeout(function save_do(){var photoList=contactData.fbInfo.photo;if(photoList&&photoList.length>0&&photoList[0]){utils.squareImage(photoList[0],function squared(squared_image){photoList[0]=squared_image;doSave(outReq);});}
else{doSave(outReq);}},0);}
else{throw'Data or mozContacts not available';}
return outReq;};function doSave(outReq){var contactInfo={};copyNames(contactData,contactInfo);if(contactData.fbInfo.url){contactInfo.url=contactData.fbInfo.url;}
doSetFacebookUid(contactInfo,contactData.uid);var fbReq=persistToFbCache(contactData);fbReq.onsuccess=function(){var mozContactsReq=navigator.mozContacts.save(utils.misc.toMozContact(contactInfo));mozContactsReq.onsuccess=function(e){outReq.done(fbReq.result);};mozContactsReq.onerror=function(e){window.console.error('FB: Error while saving on mozContacts',e.target.error);outReq.failed(e.target.error);};};fbReq.onerror=function(){window.console.error('FB: Error while saving on datastore',fbReq.error&&fbReq.error.name);outReq.failed(fbReq.error);};}
function persistToFbCache(contactData,mUpdate){var isUpdate=(mUpdate===true?mUpdate:false);var outReq=new fb.utils.Request();window.setTimeout(function persist_fb_do(){var data=Object.create(contactData.fbInfo);data.tel=contactData.tel||[];data.email=contactData.email||[];data.uid=contactData.uid;Object.keys(contactData.fbInfo).forEach(function(prop){data[prop]=contactData.fbInfo[prop];});copyNames(contactData,data);var updaterFn=(isUpdate===true?fb.contacts.update:fb.contacts.save);var fbReq=updaterFn(data);fbReq.onsuccess=function(){outReq.done(fbReq.result);};fbReq.onerror=function(){window.console.error('FB: Error while saving Fb data on the Datastore',fbReq.error&&fbReq.error.name);outReq.failed(fbReq.error);};},0);return outReq;}
this.update=function(contactData){function auxDoUpdate(contactData,outReq){if(!contactData.fbInfo.photo){var dataReq=fb.contacts.get(contactData.uid);dataReq.onsuccess=function(){contactData.fbInfo.photo=dataReq.result.photo;auxCachePersist(contactData,outReq,true);};dataReq.onerror=function(){window.console.error('Error while retrieving existing photo for ',contactData.uid,dataReq.error);outReq.failed(dataReq.error);};}
else{utils.squareImage(contactData.fbInfo.photo[0],function sq_img(squaredImg){contactData.fbInfo.photo[0]=squaredImg;auxCachePersist(contactData,outReq,true);});}}
function auxCachePersist(contactData,outReq,isUpdate){var fbReq=persistToFbCache(contactData,isUpdate);fbReq.onsuccess=function(){outReq.done(fbReq.result);};fbReq.onerror=function(){window.console.error('FB: Error while saving to FB cache: ',contactData.uid,fbReq.error);outReq.failed(fbReq.error);};}
var outReq=new fb.utils.Request();window.setTimeout(function update_do(){if(!fb.isFbLinked(devContact)){copyNames(contactData,devContact);}else{revisitPropagatedNames(contactData,devContact);}
if(contactData.fbInfo.photo){devContact.url=contactData.fbInfo.url;}
var auxReq=new fb.utils.Request();auxReq.onsuccess=function(){var mozContactsReq=navigator.mozContacts.save(utils.misc.toMozContact(devContact));mozContactsReq.onsuccess=function(e){outReq.done();};mozContactsReq.onerror=function(e){window.console.error('FB: Error while saving mozContact: ',devContact.id,e.target.error);outReq.failed(e.target.error);};};auxReq.onerror=function(e){outReq.failed(e.target.error);};auxDoUpdate(contactData,auxReq);},0);return outReq;};function asArrayOfValues(value){return Array.isArray(value)?value:[value];}
function copyNames(source,destination){destination.name=asArrayOfValues(source.name);destination.givenName=asArrayOfValues(source.givenName);destination.familyName=asArrayOfValues(source.familyName);destination.additionalName=asArrayOfValues(source.additionalName);}
this.merge=function(fbdata){return fb.mergeContact(devContact,fbdata);};this.getData=function(){return fb.getData(devContact);};this.getDataAndValues=function(){var outReq=new fb.utils.Request();window.setTimeout(function do_getData(){var uid=doGetFacebookUid(devContact);if(uid){var fbreq=fb.contacts.get(uid);fbreq.onsuccess=(function(){var fbdata=fbreq.result;var out1=this.merge(fbdata);var out2={};var duplicates={};Object.keys(fbdata).forEach(function(key){var dataElement=fbdata[key];if(dataElement&&Array.isArray(dataElement)&&key!=='photo'){dataElement.forEach(function(item){if(item.value&&item.value.length>0){var dupList=fb.checkDuplicates(key,item,devContact[key],fbdata.shortTelephone);dupList.forEach(function(aDup){duplicates[aDup]=true;});out2[item.value]=true;}
else if(typeof item==='string'&&item.length>0){out2[item]=true;}
else if(key==='adr'){if(item.locality){out2[item.locality]=true;}
if(item.countryName){out2[item.countryName]=true;}}});}
else if(key==='photo'){out2.hasPhoto=true;}
else if(dataElement){out2[dataElement]=true;}});Object.keys(duplicates).forEach(function(aDup){delete out2[aDup];});outReq.done([out1,out2,fbdata]);}).bind(this);fbreq.onerror=function(){outReq.failed(fbreq.error);};}
else{outReq.done([devContact,{}]);}}.bind(this),0);return outReq;};this.promoteToLinked=function(){promoteToLinked(devContact);};this.linkTo=function(fbFriend){var out=new fb.utils.Request();window.setTimeout(function do_linkTo(){if(!devContact){var req=fb.utils.getContactData(contactid);req.onsuccess=function(){devContact=req.result;doLink(devContact,fbFriend,out);};req.onerror=function(){throw'FB: Error while retrieving contact data';};}
else{doLink(devContact,fbFriend,out);}},0);return out;};function propagateField(field,from,to){var copied=false;if(!Array.isArray(to[field])||!to[field][0]||!to[field][0].trim()){to[field]=from[field];copied=true;}
return copied;}
function createName(contact){contact.name=[];if(Array.isArray(contact.givenName)){contact.name[0]=contact.givenName[0]+' ';}
if(Array.isArray(contact.familyName)){contact.name[0]+=contact.familyName[0];}}
function propagateNames(from,to){var isGivenNamePropagated=propagateField('givenName',from,to);var isFamilyNamePropagated=propagateField('familyName',from,to);if(isGivenNamePropagated||isFamilyNamePropagated){if(isGivenNamePropagated){fb.setPropagatedFlag('givenName',to);}
if(isFamilyNamePropagated){fb.setPropagatedFlag('familyName',to);}
createName(to);}}
function revisitPropagatedNames(from,to){if(fb.isPropagated('givenName',to)){to.givenName=from.givenName;}
if(fb.isPropagated('familyName',to)){to.familyName=from.familyName;}
createName(to);}
function doLink(contactdata,fbFriend,out){if(contactdata){if(fbFriend.uid){markAsLinked(contactdata,fbFriend.uid);if(fbFriend.photoUrl){fb.setFriendPictureUrl(contactdata,fbFriend.photoUrl);}
else if(fbFriend.mozContact){contactdata.url=fbFriend.mozContact.url;}}
else if(fbFriend.mozContact){markAsLinked(contactdata,doGetFacebookUid(fbFriend.mozContact));contactdata.url=fbFriend.mozContact.url;}
propagateNames(fbFriend.mozContact,contactdata);var mozContactsReq=navigator.mozContacts.save(utils.misc.toMozContact(contactdata));mozContactsReq.onsuccess=function(e){if(fbFriend.mozContact&&!fb.isFbLinked(fbFriend.mozContact)){var deleteReq=navigator.mozContacts.remove(utils.misc.toMozContact(fbFriend.mozContact));deleteReq.onsuccess=function(e){out.done(e.target.result);};deleteReq.onerror=function(e){window.console.error('FB: Error while linking');out.failed(e.target.error);};}
else{out.done(e.target.result);}};mozContactsReq.onerror=function(e){out.failed(e.target.error);};}
else{throw'FB: Contact data not defined';}}
this.unlink=function(type){var out=new fb.utils.Request();window.setTimeout(function do_unlink(){if(!devContact){var req=fb.utils.getContactData(contactid);req.onsuccess=function(){devContact=req.result;doUnlink(devContact,out,type);};req.onerror=function(){throw'FB: Error while retrieving contact data';};}
else{doUnlink(devContact,out,type);}},0);return out;};function resetNames(dContact){fb.resetNames(dContact);}
function doUnlink(dContact,out,type){var theType=type||'soft';var uid=doGetFacebookUid(dContact);resetNames(dContact);fb.markAsUnlinked(dContact);var req=navigator.mozContacts.save(utils.misc.toMozContact(dContact));req.onsuccess=function(e){if(theType!=='hard'){var fbNumReq=fb.utils.getNumberMozContacts(uid);fbNumReq.onsuccess=function(){if(fbNumReq.result>=1){out.done();}else{var fbDataReq=fb.contacts.get(uid);fbDataReq.onsuccess=function(){var imported=fbDataReq.result;var data={};copyNames(imported,data);data.url=imported.url;doSetFacebookUid(data,uid);var aMozContact=utils.misc.toMozContact(data);var reqRestore=navigator.mozContacts.save(aMozContact);reqRestore.onsuccess=function(e){out.done(aMozContact.id);};reqRestore.onerror=function(e){out.failed(e.target.error);};};fbDataReq.onerror=function(){window.console.error('FB: Error while unlinking contact data');out.failed(fbDataReq.error);};}};fbNumReq.onerror=function(){window.console.error('FB: Error while unlinking contact data');out.failed(fbNumReq.error);};}
else{var removeReq=fb.contacts.remove(uid,true);removeReq.onsuccess=function(){out.done(removeReq.result);};removeReq.onerror=function(){out.failed(removeReq.error);};}};req.onerror=function(e){out.failed(e.target.error);};}
this.remove=function(pforceFlush){var forceFlush=(pforceFlush===true)?pforceFlush:false;var out=new fb.utils.Request();window.setTimeout(function do_remove(){var uid=doGetFacebookUid(devContact);var fbNumReq=fb.utils.getNumberMozContacts(uid);fbNumReq.onsuccess=function num_onsuccess(){var removeReq;if(fbNumReq.result===1){removeReq=navigator.mozContacts.remove(utils.misc.toMozContact(devContact));removeReq.onsuccess=function(e){var fbReq=fb.contacts.remove(uid,forceFlush);fbReq.onsuccess=function(){out.done(fbReq.result);};fbReq.onerror=function(){out.failed(fbReq.error);};};removeReq.onerror=function(e){out.failed(e.target.error);};}
else{removeReq=navigator.mozContacts.remove(utils.misc.toMozContact(devContact));removeReq.onsuccess=function(e){out.done();};removeReq.onerror=function(e){out.failed(e.target.error);};}};},0);return out;};};;'use strict';var Curtain=(function(){var curtainFrame=parent.document.querySelector('#iframe_curtain');if(!curtainFrame){curtainFrame=document.createElement('iframe');curtainFrame.id='iframe_curtain';curtainFrame.src='/shared/pages/import/curtain.html';parent.document.body.appendChild(curtainFrame);}
function getDoc(){return curtainFrame.contentWindow.document;}
var cpuWakeLock,cancelButton,retryButton,okButton,progressElement,form,progressTitle;var messages=[];var elements=['error','timeout','wait','message','progress','alert'];if(getDoc().readyState==='complete'){init();}else{curtainFrame.addEventListener('load',function loaded(){curtainFrame.removeEventListener('load',loaded);init();});}
function init(){var doc=getDoc();cancelButton=doc.querySelector('#cancel');retryButton=doc.querySelector('#retry');okButton=doc.querySelector('#ok');progressElement=doc.querySelector('#progressElement');form=doc.querySelector('form');elements.forEach(function createElementRef(name){messages[name]=doc.getElementById(name+'Msg');});progressTitle=doc.getElementById('progressTitle');}
function doShow(type){form.classList.remove('no-menu');form.dataset.state=type;curtainFrame.classList.add('visible');curtainFrame.classList.remove('fade-out');curtainFrame.classList.add('fade-in');}
function capitalize(str){return str.charAt(0).toUpperCase()+str.slice(1);}
function Progress(pfrom){var from=pfrom;var counter=0;var total=0;progressElement.setAttribute('value',0);function showMessage(){document.l10n.setAttributes(messages.progress,'progressFB',{current:counter,total:total});}
this.update=function(){progressElement.setAttribute('value',(++counter*100)/total);showMessage();};this.setFrom=function(pfrom){from=capitalize(pfrom);progressTitle.setAttribute('data-l10n-id','progressFB3'+from+'Title');};this.setTotal=function(ptotal){total=ptotal;showMessage();};this.getValue=function(){return counter;};}
return{show:function(type,from){var out;from=capitalize(from);switch(type){case'wait':messages[type].setAttribute('data-l10n-id',type+from);break;case'timeout':document.l10n.formatValue('timeout'+from).then((from)=>{document.l10n.setAttributes(messages[type],'timeout1',{from:from});});break;case'error':document.l10n.formatValue('type'+from).then((from)=>{document.l10n.setAttributes(messages[type],'error1',{from:from});});break;case'alert':case'message':messages[type].setAttribute('data-l10n-id',type+from);break;case'progress':progressTitle.setAttribute('data-l10n-id',type+'FB3'+from+'Title');out=new Progress(from);cpuWakeLock=navigator.requestWakeLock('cpu');break;}
doShow(type);return out;},hide:function c_hide(hiddenCB){if(cpuWakeLock){cpuWakeLock.unlock();cpuWakeLock=null;}
curtainFrame.classList.add('fade-out');curtainFrame.addEventListener('animationend',function cu_fadeOut(ev){curtainFrame.removeEventListener('animationend',cu_fadeOut);curtainFrame.classList.remove('visible');curtainFrame.classList.remove('fade-out');curtainFrame.classList.remove('fade-in');delete form.dataset.state;if(typeof hiddenCB==='function'){hiddenCB();}});},set oncancel(cancelCb){if(typeof cancelCb==='function'){delete cancelButton.onclick;cancelButton.onclick=function on_cancel(e){delete cancelButton.onclick;cancelCb();return false;};}},set onretry(retryCb){if(typeof retryCb==='function'){delete retryButton.onclick;retryButton.onclick=function on_retry(e){delete retryButton.onclick;retryCb();return false;};}},set onok(okCb){if(typeof okCb==='function'){delete okButton.onclick;okButton.onclick=function on_ok(e){delete okButton.onclick;okCb();return false;};}},get visible(){return curtainFrame.classList.contains('visible');},hideMenu:function c_hideMenu(){form.classList.add('no-menu');}};})();;'use strict';if(!window.FacebookConnector){window.FacebookConnector=(function(){var nextUpdateTime;window.fb=window.fb||{};fb.operationsTimeout=parent.config?parent.config.operationsTimeout:null;var reusedFbContact=new fb.Contact();reusedFbContact.ready=true;function createFbImporter(clist,access_token){var out=new window.ContactsImporter(clist,access_token,this);out.persist=persistFbData;return out;}
function persistFbData(data,successCb,errorCb,options){var saveCbs={success:function(e){if(options==='not_match'){successCb();return;}
var cbs={onmatch:function(matches){Object.keys(matches).forEach(function(aMatchId){var fbContact=new
fb.Contact(matches[aMatchId].matchingContact);var mozContReq=fb.utils.getMozContact(data.uid);mozContReq.onsuccess=function(){var linkParams={uid:data.uid,mozContact:mozContReq.result};if(Array.isArray(data.photo)&&data.photo[0]){linkParams.photoUrl=data.pic_big;}
var req=fbContact.linkTo(linkParams);req.onsuccess=successCb;req.onerror=function error(e){window.console.error('Error while automatically linking : ',aMatchId,data.uid,e.target.name);successCb();};};mozContReq.onerror=function(e){window.console.error('Error getting mozContact data in automatic linking: ',e.target.error.name);successCb();};});},onmismatch:successCb};Matcher.match(data,'passive',cbs);},error:errorCb};saveFbContact(data,saveCbs.success,saveCbs.error);}
function saveFbContact(data,successCb,errorCb){var fbContact,successWrapperCb;if(reusedFbContact.ready){reusedFbContact.ready=null;fbContact=reusedFbContact;successWrapperCb=function onsuccess(e){reusedFbContact.ready=true;successCb(e);};}else{fbContact=new fb.Contact();successWrapperCb=successCb;}
fbContact.setData(data);var req=fbContact.save();req.onsuccess=successWrapperCb;req.onerror=errorCb;}
function setInfraForSync(existingContacts,friendsImported,callback){if(!fb.sync){(typeof callback==='function')&&callback();return;}
window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY,function(data){if(!data||(existingContacts&&existingContacts.length===0)&&!friendsImported){fb.utils.setLastUpdate(nextUpdateTime,function(){var req=fb.sync.scheduleNextSync();if(typeof callback==='function'){req.onsuccess=callback;}});}});}
var UID_FILTER_IDX=5;var acc_tk;function buildFriendQuery(uid){var aquery1=[].concat(FRIENDS_QUERY);aquery1[UID_FILTER_IDX]='= '+uid;return aquery1.join('');}
var FRIENDS_QUERY=['SELECT uid, name, first_name, last_name, pic_big, current_location, ','middle_name, birthday_date, email, profile_update_time, ',' work, phones, hometown_location',' FROM user',' WHERE uid ','IN (SELECT uid1 FROM friend WHERE uid2=me())',' ORDER BY ','first_name'];var friendsQueryStr=FRIENDS_QUERY.join('');function contactDataLoaded(options,response){if(!response.error){nextUpdateTime=Date.now();var successCb=this.success;var friend=response.data[0];if(friend){var out1=self.adaptDataForShowing(friend);var photoCbs={};photoCbs.success=function(blobPicture){if(!blobPicture){pictureLoaded(out1,options,successCb);return;}
utils.thumbnailImage(blobPicture,function gotThumbnail(thumbnail){if(blobPicture!==thumbnail){out1.photo=[blobPicture,thumbnail];}else{out1.photo=[blobPicture];}
pictureLoaded(out1,options,successCb);});};self.downloadContactPicture(friend,acc_tk,photoCbs);}
else{window.console.error('FB: No Friend data found');this.error('No friend data found');}}
else{this.error(response.error);}}
function pictureLoaded(friend,options,success){var data=self.adaptDataForSaving(friend);persistFbData(data,function(){success({uid:friend.uid,url:friend.pic_big});},function error(err){console.error('Error while persisting: ',err);},options);window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY,function(data){if(!data){fb.utils.setLastUpdate(nextUpdateTime,fb.sync.scheduleNextSync);}});}
function FacebookConnector(){}
FacebookConnector.prototype={listAllContacts:function(access_token,callbacks,options){if(options&&options.orderBy==='lastName'){FRIENDS_QUERY[FRIENDS_QUERY.length]='last_name';friendsQueryStr=FRIENDS_QUERY.join('');}
return fb.utils.runQuery(friendsQueryStr,{success:callbacks.success,error:callbacks.error,timeout:callbacks.timeout},access_token);},listDeviceContacts:function(callbacks){var req=fb.utils.getAllFbContacts();req.onsuccess=function successHandler(){callbacks.success(req.result);};req.onerror=callbacks.error;},getImporter:function(contactsList,access_token){return createFbImporter.bind(this)(contactsList,access_token);},importContact:function(uid,access_token,callbacks,options){acc_tk=access_token;var oneFriendQuery=buildFriendQuery(uid);var auxCallbacks={success:contactDataLoaded.bind(callbacks,options),error:callbacks.error,timeout:callbacks.timeout};fb.utils.runQuery(oneFriendQuery,auxCallbacks,access_token);},cleanContacts:function(contactsList,mode,cb){if(mode==='update'){var cleaner=new fb.utils.FbContactsCleaner(contactsList,mode);window.setTimeout(cleaner.start,0);cb(cleaner);}
else{var req=fb.utils.clearFbData();req.onsuccess=function(){cb(req.result);};req.onerror=function(e){window.console.error('Error while starting cleaning: ',e.target.error.name);cb(null);};}},adaptDataForShowing:function(source){var box=utils.misc.getPreferredPictureBox();var picWidth=box.width;var picHeight=box.height;var out=fb.friend2mozContact(source);out.contactPictureUri='https://graph.facebook.com/'+
source.uid+'/picture?type=square'+'&width='+picWidth+'&height='+picHeight+'&t='+Date.now();return out;},adaptDataForSaving:function fbAdapt(cfdata){var worksAt=fb.getWorksAt(cfdata);var address=fb.getAddresses(cfdata);var birthDate=null;if(cfdata.birthday_date&&cfdata.birthday_date.length>0){birthDate=fb.getBirthDate(cfdata.birthday_date);}
var fbInfo={bday:birthDate,org:[worksAt]};if(address){fbInfo.adr=address;}
if(cfdata.shortTelephone){fbInfo.shortTelephone=cfdata.shortTelephone;delete cfdata.shortTelephone;}
fbInfo.url=[];if(cfdata.photo){fbInfo.photo=cfdata.photo;if(cfdata.pic_big){fb.setFriendPictureUrl(fbInfo,cfdata.pic_big);}
delete cfdata.photo;}
cfdata.fbInfo=fbInfo;return cfdata;},getContactUid:function(deviceContact){return fb.getFriendUid(deviceContact);},get name(){return'facebook';},get automaticLogout(){return false;},downloadContactPicture:function(contact,access_token,callbacks){return fb.utils.getFriendPicture(contact.uid,callbacks.success,access_token,utils.misc.getPreferredPictureDetail());},oncontactsloaded:function(lfriends){nextUpdateTime=Date.now();fb.utils.setCachedNumFriends(lfriends.length);},oncontactsimported:function(existingContacts,friendsImported,cb){setInfraForSync(existingContacts,friendsImported,cb);fb.contacts.flush();},startSync:function(existingContacts,myFriendsByUid,syncFinished){var callbacks={success:syncFinished};fb.sync.startWithData(existingContacts,myFriendsByUid,callbacks);},scheduleNextSync:function(){fb.sync.scheduleNextSync();}};var self=new FacebookConnector();return self;})();};'use strict';var fb=window.fb||{};if(!fb.sync){(function(){var Sync=fb.sync={};var theWorker;var fbContactsById;var totalToChange=0,changed=0;var nextTimestamp;var completionCallback,errorCallback;var fbFriendsDataByUid;var logLevel=fb.logLevel||parent.fb.logLevel||'DEBUG';var isDebug=(logLevel==='DEBUG');var alarmFrame=null,currentAlarmRequest=null;var DELAY_ALARM_SCHED=5000;function debug(){if(isDebug){var theArgs=['<<FBSync>>'];for(var c=0;c<arguments.length;c++){theArgs.push(arguments[c]);}
window.console.log.apply(window.console,theArgs);}}
function startWorker(){theWorker=new Worker('/facebook/js/sync_worker.js');theWorker.onmessage=function(e){workerMessage(e.data);};theWorker.onerror=function(e){window.console.error('Worker Error',e.message,e.lineno,e.column);if(typeof errorCallback==='function'){errorCallback({type:'default_error'});}};}
function workerMessage(m){switch(m.type){case'query_error':var error=m.data||{};window.console.error('FB: Error reported by the worker',JSON.stringify(error));if(typeof errorCallback==='function'){errorCallback({name:'defaultError'});}
break;case'token_error':debug('FB: Token error reported by the worker');if(typeof errorCallback==='function'){errorCallback({name:'invalidToken'});}
break;case'timeout_error':debug('Timeout error reported by the worker');if(typeof errorCallback==='function'){errorCallback({name:'timeout'});}
break;case'trace':debug(m.data);break;case'friendRemoved':removeFbFriend(m.data.contactId);break;case'friendUpdated':updateFbFriend(m.data.contactId,fb.friend2mozContact(m.data.updatedFbData));break;case'totals':changed=0;totalToChange=m.data.totalToChange;nextTimestamp=m.data.queryTimestamp;var newFriendNumber=m.data.newFriendNumber;if(newFriendNumber){debug('New friend number: ',newFriendNumber);fb.utils.setCachedNumFriends(newFriendNumber);}
debug('Total to be changed: ',totalToChange);checkTotals();break;case'friendImgReady':debug('Friend Img Data ready: ',m.data.contactId);updateFbFriendWhenImageReady(m.data);break;}}
function updateFbFriendWhenImageReady(data){var contact=fbContactsById[data.contactId];var uid=fb.getFriendUid(contact);var updatedFbData=fbFriendsDataByUid[uid];if(!data.photo){updateFbFriend(data.contactId,updatedFbData);return;}
utils.thumbnailImage(data.photo,function gotTumbnail(thumbnail){var fbInfo={};fbInfo.photo=[data.photo,thumbnail];fb.setFriendPictureUrl(fbInfo,updatedFbData.pic_big);updatedFbData.fbInfo=fbInfo;updateFbFriend(data.contactId,updatedFbData);});}
function onsuccessCb(){changed++;checkTotals();}
function updateFbFriend(contactId,cfdata){fb.friend2mozContact(cfdata);cfdata.fbInfo=cfdata.fbInfo||{};cfdata.fbInfo.org=[fb.getWorksAt(cfdata)];var birthDate=null;if(cfdata.birthday_date&&cfdata.birthday_date.length>0){birthDate=fb.getBirthDate(cfdata.birthday_date);}
cfdata.fbInfo.bday=birthDate;var address=fb.getAddresses(cfdata);if(address){cfdata.fbInfo.adr=address;}
if(cfdata.shortTelephone){cfdata.fbInfo.shortTelephone=cfdata.shortTelephone;delete cfdata.shortTelephone;}
var fbContact=new fb.Contact(fbContactsById[contactId]);var fbReq=fbContact.update(cfdata);fbReq.onsuccess=function(){debug('Friend updated correctly',cfdata.uid);onsuccessCb();};fbReq.onerror=function(){window.console.error('FB: Error while saving contact data: ',cfdata.uid);changed++;checkTotals();};}
function removeFbFriend(contactId){debug('Removing Friend: ',contactId);var removedFriend=fbContactsById[contactId];var fbContact=new fb.Contact(removedFriend);if(fb.isFbLinked(removedFriend)){debug('Friend is linked: ',contactId);var req=fbContact.unlink('hard');req.onsuccess=onsuccessCb;req.onerror=function(){window.console.error('FB. Error while hard unlinking friend: ',contactId);changed++;checkTotals();};}
else{debug('Friend is not linked: ',contactId);var fbContactReq=fbContact.remove();fbContactReq.onsuccess=onsuccessCb;fbContactReq.onerror=function(){window.console.error('FB. Error while removing contact: ',contactId);changed++;checkTotals();};}}
function checkTotals(){if(changed===totalToChange){debug('Sync process finished!');if(window.contacts&&window.contacts.List){window.setTimeout(window.contacts.List.load,0);}
fb.utils.setLastUpdate(nextTimestamp,function sync_end(){completionCallback(totalToChange);});if(theWorker){theWorker.terminate();theWorker=null;}}}
Sync.start=function(params){if(params){completionCallback=params.success;errorCallback=params.error;}
totalToChange=0;changed=0;var req=fb.utils.getAllFbContacts();req.onsuccess=function(){var uids={};var fbContacts=req.result;if(fbContacts.length===0){debug('Nothing to be synchronized. No FB Contacts present');return;}
startWorker();fbContactsById={};var forceUpdate={};fbContacts.forEach(function(contact){fbContactsById[contact.id]=contact;var pictureUrl=fb.getFriendPictureUrl(contact);var uid=fb.getFriendUid(contact);uids[uid]={contactId:contact.id,photoUrl:pictureUrl};if(!pictureUrl){forceUpdate[uid]={contactId:contact.id};}});fb.utils.getLastUpdate(function run_worker(ts){fb.utils.getCachedAccessToken(function(access_token){theWorker.postMessage({type:'start',data:{uids:uids,imgNeedsUpdate:forceUpdate,timestamp:ts,access_token:access_token,operationsTimeout:fb.operationsTimeout,targetPictureSize:utils.misc.getPreferredPictureDetail()}});});});};req.onerror=function(){window.console.error('FB: Error while getting friends on the device',req.error.name);if(typeof errorCallback==='function'){errorCallback({name:'defaultError'});}};};Sync.scheduleNextSync=function(){currentAlarmRequest=new fb.utils.Request();window.setTimeout(function(){alarmFrame=document.createElement('iframe');alarmFrame.src='/facebook/fb_sync.html';alarmFrame.width=1;alarmFrame.height=1;alarmFrame.style.display='none';document.body.appendChild(alarmFrame);},0);return currentAlarmRequest;};function cleanAlarmSchedFrame(){alarmFrame.src=null;document.body.removeChild(alarmFrame);alarmFrame=null;}
Sync.onAlarmScheduled=function(date){debug('Next synch scheduled at: ',date);if(alarmFrame){window.setTimeout(cleanAlarmSchedFrame,DELAY_ALARM_SCHED);}
currentAlarmRequest.done(date);};Sync.onAlarmError=function(e){if(alarmFrame){window.setTimeout(cleanAlarmSchedFrame,DELAY_ALARM_SCHED);}
window.console.error('<<FB Sync>> Error while scheduling a new sync: ',e);currentAlarmRequest.failed(e);};Sync.debug=function(){debug.apply(this,arguments);};Sync.startWithData=function(contactList,myFriendsByUid,callbacks){completionCallback=callbacks.success;errorCallback=callbacks.error;nextTimestamp=Date.now();changed=0;totalToChange=Number.MAX_VALUE;debug('Starting Synchronization with data');fbFriendsDataByUid=myFriendsByUid;var toBeUpdated={};fb.utils.getLastUpdate(function import_updates(lastUpdate){var toBeChanged=0;var lastUpdateTime=Math.round(lastUpdate/1000);debug('Last update time: ',lastUpdateTime);fbContactsById={};contactList.forEach(function(aContact){fbContactsById[aContact.id]=aContact;var uid=fb.getFriendUid(aContact);var friendData=fbFriendsDataByUid[uid];if(friendData){var friendUpdate=friendData.profile_update_time;debug('Friend update Time ',friendUpdate,'for UID: ',uid);var profileImgUrl=fb.getFriendPictureUrl(aContact);if(friendUpdate>lastUpdateTime||profileImgUrl!==friendData.pic_big){debug('Friend changed!! : ',uid);if(profileImgUrl!==friendData.pic_big){debug('Profile img changed: ',profileImgUrl);toBeUpdated[uid]={contactId:aContact.id};}
else{debug('Updating friend: ',friendData.uid);toBeChanged++;updateFbFriend(aContact.id,friendData);}}
else{debug('Friend has not changed',uid);}}
else{debug('Removing friend: ',aContact.id);toBeChanged++;removeFbFriend(aContact.id);}});debug('First pass of Updates and removed finished');var toBeUpdatedList=Object.keys(toBeUpdated);if(toBeUpdatedList.length>0){totalToChange=toBeChanged+toBeUpdatedList.length;debug('Starting worker for updating img data');startWorker();fb.utils.getCachedAccessToken(function(access_token){theWorker.postMessage({type:'startWithData',data:{access_token:access_token,uids:toBeUpdated,operationsTimeout:fb.operationsTimeout,targetPictureSize:utils.misc.getPreferredPictureDetail()}});});}
else{totalToChange=toBeChanged;checkTotals();}});};})();};'use strict';if(!window.ImageLoader){var ImageLoader=function ImageLoader(pContainer,pItems){var container,items,itemsSelector,lastScrollTime,scrollLatency=100,scrollTimer,itemHeight,total,imgsLoading=0,loadImage=defaultLoadImage,self=this;init(pContainer,pItems);function init(pContainer,pItems){itemsSelector=pItems;container=document.querySelector(pContainer);attachHandlers();window.addEventListener('image-loader-resume',resuming);window.addEventListener('image-loader-pause',unload);load();}
function resuming(){window.clearTimeout(scrollTimer);attachHandlers();update();}
function onUpdate(evt){evt.stopPropagation();onScroll();}
function load(){window.clearTimeout(scrollTimer);scrollTimer=null;items=container.querySelectorAll(itemsSelector);itemHeight=items[0]?items[0].offsetHeight:1;total=items.length;window.setTimeout(update,0);}
function attachHandlers(){container.addEventListener('scroll',onScroll);document.addEventListener('onupdate',onUpdate);}
function unload(){container.removeEventListener('scroll',onScroll);document.removeEventListener('onupdate',onUpdate);window.clearTimeout(scrollTimer);scrollTimer=null;}
function setResolver(pResolver){loadImage=pResolver;}
function onScroll(){if(imgsLoading>0){window.stop();imgsLoading=0;}
lastScrollTime=Date.now();if(!scrollTimer){scrollTimer=window.setTimeout(updateFromScroll,scrollLatency);}}
function updateFromScroll(){scrollTimer=null;var deltaLatency=lastScrollTime-Date.now()+scrollLatency;if(deltaLatency>0){scrollTimer=window.setTimeout(updateFromScroll,deltaLatency);}else{update();}}
function defaultLoadImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('img[data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='true';}
return;}}
++imgsLoading;var tmp=new Image();var src=tmp.src=image.dataset.src;tmp.onload=function onload(){--imgsLoading;image.style.backgroundImage='url('+src+')';if(tmp.complete){item.dataset.visited='true';}
tmp=null;};tmp.onabort=tmp.onerror=function onerror(){--imgsLoading;item.dataset.visited='false';tmp=null;};}
function update(){if(total===0){return;}
var viewTop=container.scrollTop;var index=Math.floor(viewTop/itemHeight);var containerHeight=container.offsetHeight;for(var i=index;i>=0;i--){var item=items[i];if(item){if(item.offsetTop+itemHeight<viewTop){break;}
if(item.dataset.visited!=='true'&&item.offsetTop<=viewTop+containerHeight){loadImage(item,self);}}}
for(var j=index+1;j<total;j++){var theItem=items[j];if(!theItem){return;}
if(theItem.offsetTop>viewTop+containerHeight){return;}
if(theItem.dataset.visited!=='true'){loadImage(theItem,self);}}}
function releaseImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='false';}
return null;}
image.style.backgroundImage='none';item.dataset.visited='false';return image;}
function destroy(){unload();window.removeEventListener('image-loader-pause',unload);window.removeEventListener('image-loader-resume',resuming);container=items=itemsSelector=lastScrollTime=scrollLatency=null;scrollTimer=itemHeight=total=imgsLoading=loadImage=null;}
this.reload=load;this.unload=unload;this.setResolver=setResolver;this.defaultLoad=defaultLoadImage;this.releaseImage=releaseImage;this.destroy=destroy;};};'use strict';var utils=window.utils||{};utils.status=(function(){var STATUS_TIME=2000;var statusMsg=document.querySelector('#statusMsg');var hidingTimeout;var transitionEndTimeout;var additionalLine;var hideAnimationDone=function(){statusMsg.removeEventListener('transitionend',hideAnimationDone);statusMsg.classList.add('hidden');};var showAnimationDone=function(){if(transitionEndTimeout){clearTimeout(transitionEndTimeout);}
statusMsg.removeEventListener('transitionend',showAnimationDone);hidingTimeout=setTimeout(utils.status.hide,STATUS_TIME);};var hideStatus=function(){statusMsg.addEventListener('transitionend',hideAnimationDone);statusMsg.classList.remove('opening');statusMsg.classList.remove('bannerStart');statusMsg.querySelector('p').removeAttribute('data-l10n-id');if(additionalLine){statusMsg.removeChild(additionalLine);additionalLine=null;}};var setL10nAttributes=function(node,l10n){if(l10n&&l10n.id){navigator.mozL10n.setAttributes(node,l10n.id,l10n.args);return true;}else{console.error('Status arguments must be objects');return false;}};var showStatus=function(mainMessage,extra){statusMsg.removeEventListener('transitionend',showAnimationDone);statusMsg.removeEventListener('transitionend',hideAnimationDone);LazyLoader.load([statusMsg],function _loaded(){if(!setL10nAttributes(statusMsg.querySelector('p'),mainMessage)){return;}
if(extra){additionalLine=document.createElement('p');statusMsg.appendChild(additionalLine);setL10nAttributes(additionalLine,extra);}
if(statusMsg.classList.contains('opening')){clearTimeout(hidingTimeout);hidingTimeout=setTimeout(hideStatus,STATUS_TIME);return;}
statusMsg.classList.remove('hidden');statusMsg.addEventListener('transitionend',showAnimationDone);setTimeout(function displaying(){statusMsg.classList.add('opening');statusMsg.classList.add('bannerStart');transitionEndTimeout=setTimeout(showAnimationDone,STATUS_TIME);},10);});};return{show:showStatus,hide:hideStatus};})();;'use strict';var utils=window.utils||{};if(!utils.dom){(function(document){var Dom=utils.dom={};Dom.removeChildNodes=function(node){while(node.hasChildNodes()){node.removeChild(node.firstChild);}};Dom.addClassToNodes=function(container,selector,clazz){var nodes=container.querySelectorAll(selector);for(var i=0,n=nodes.length;i<n;++i){nodes[i].classList.add(clazz);}};Dom.removeClassFromNodes=function(container,selector,clazz){var nodes=container.querySelectorAll(selector);for(var i=0,n=nodes.length;i<n;++i){nodes[i].classList.remove(clazz);}};Dom.updatePhoto=function(photo,dest){var background='';if(photo!=null){background='url('+URL.createObjectURL(photo)+')';}
dest.style.backgroundImage=background;dest.dataset.photoReady='true';};})(document);};'use strict';var fb=window.fb||{};if(!fb.link){(function(document){var link=fb.link={};var UI=link.ui={};link.CID_PARAM='contactid';var contactid;var cdata;var access_token;var numQueries=0;var friendUidToLink;var SEARCH_QUERY=['SELECT uid, name, email from user ',' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',' AND (',null,')',' ORDER BY name'];var MAIL_COND,CELL_COND;MAIL_COND=['strpos(email, ',"'",null,"'",') >= 0'];CELL_COND=['strpos(cell, ',"'",null,"'",') >= 0'];var ALL_QUERY=['SELECT uid, name, last_name, first_name,',' middle_name, email from user ',' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',' ORDER BY name'];var COUNT_QUERY='SELECT uid FROM user WHERE uid IN '+'(SELECT uid1 FROM friend WHERE uid2=me())';var SEARCH_ACCENTS_FIELDS={'last_name':'familyName','first_name':'givenName','middle_name':'givenName'};var friendsList;var viewButton,mainSection;var currentRecommendation=null;var allFriends=null;var currentNetworkRequest=null;var state;var imgLoader;var completedCb;function notifyParent(message){parent.postMessage({type:message.type||'',data:message.data||''},fb.CONTACTS_APP_ORIGIN);}
function buildQuery(contact){var filter=[];if(contact.tel&&contact.tel.length>0){contact.tel.forEach(function(tel){CELL_COND[2]=tel.value.trim();filter.push(CELL_COND.join(''));filter.push(' OR ');});}
if(contact.email&&contact.email.length>0){contact.email.forEach(function(email){MAIL_COND[2]=email.value.trim();filter.push(MAIL_COND.join(''));filter.push(' OR ');});}
if(filter.length>0){filter[filter.length-1]=null;}
var filterStr=filter.join('');var out;if(filterStr){SEARCH_QUERY[3]=filterStr;out=SEARCH_QUERY.join('');}
else{out=null;}
return out;}
link.getRemoteProposal=function(acc_tk,contid){var cid=contid||contactid;var req=fb.utils.getContactData(cid);req.onsuccess=function(){if(req.result){cdata=req.result;numQueries=1;currentRecommendation=null;var query=buildQuery(cdata);if(query===null){getRemoteProposalAll(acc_tk);return;}
doGetRemoteProposal(acc_tk,cdata,query);}
else{throw new Error('FB: Contact to be linked not found in mozContacts: '+cid);}};req.onerror=function(e){window.console.error('FB: Error while retrieving contact data: ',cid);throw e;};};function getRemoteProposalAll(acc_tk){numQueries++;doGetRemoteProposal(acc_tk,null,ALL_QUERY.join(''),true);}
function proposalReadyMultiple(done,error,response){if(response.error){done(response);return;}else if(!Array.isArray(response.data)){error({name:'QueryResponseError'});return;}
var friendList,totalFriends;if(response.data.length>0&&Array.isArray(response.data[0].fql_result_set)){friendList=response.data[0].fql_result_set;if(response.data[1]&&Array.isArray(response.data[1].fql_result_set)){totalFriends=response.data[1].fql_result_set.length;}}
else{friendList=response.data;totalFriends=friendList.length;}
if(typeof totalFriends!=='undefined'){fb.utils.setCachedNumFriends(totalFriends);}
done({data:friendList});}
function doGetRemoteProposal(acc_tk,contactData,query,isAll){var theQuery=query;var callback=proposalReadyMultiple.bind(null,fb.link.proposalReady,fb.link.errorHandler);if(!isAll){theQuery=JSON.stringify({query1:query,query2:COUNT_QUERY});}
state='proposal';currentNetworkRequest=fb.utils.runQuery(theQuery,{success:callback,error:fb.link.errorHandler,timeout:fb.link.timeoutHandler},acc_tk);}
function cancelCb(shouldNotifyParent){if(currentNetworkRequest){currentNetworkRequest.cancel();currentNetworkRequest=null;}
Curtain.hide(shouldNotifyParent?notifyParent.bind(null,{type:'abort'}):null);}
function getRemoteAll(){Curtain.oncancel=cancelCb;Curtain.show('wait','friends');state='friends';currentNetworkRequest=fb.utils.runQuery(ALL_QUERY.join(''),{success:fb.link.friendsReady,error:fb.link.errorHandler,timeout:fb.link.timeoutHandler},access_token);}
link.getProposal=function(cid,acc_tk){link.getRemoteProposal(acc_tk,cid);};link.proposalReady=function(response){if(typeof response.error!=='undefined'){window.console.error('FB: Error while retrieving link data',response.error.code,response.error.message);if(response.error.code!=190){setCurtainHandlersErrorProposal();Curtain.show('error','proposal');}
else{handleTokenError();}
return;}
if(response.data.length===0&&numQueries===1){getRemoteProposalAll(access_token);}
else{var data=response.data;currentRecommendation=data;var sortedByName=[];var numFriendsProposed=data.length;var searchAccentsArrays={};var index=0;data.forEach(function(item){if(!item.email){item.email='';}
var box=utils.misc.getPreferredPictureBox();item.picwidth=box.width;item.picheight=box.height;if(numQueries===2){sortedByName.push(item);Object.keys(SEARCH_ACCENTS_FIELDS).forEach(function(field){searchAccentsArrays[field]=searchAccentsArrays[field]||[];if(item[field]){var words=item[field].split(/[ ]+/);words.push(item[field]);words.forEach(function(word){var obj={originalIndex:index};obj[field]=Normalizer.toAscii(word).toLowerCase();searchAccentsArrays[field].push(obj);});}});index++;}});if(numQueries===2){var accentsProposal=searchAccents(searchAccentsArrays,cdata);if(accentsProposal.length===0){data=sortedByName;mainSection.classList.add('no-proposal');numFriendsProposed=0;}
else{currentRecommendation=[];accentsProposal.forEach(function(proposalIndex){currentRecommendation.push(sortedByName[proposalIndex]);});numFriendsProposed=currentRecommendation.length;}}else{viewButton.setAttribute('data-l10n-id','viewAll');viewButton.onclick=UI.viewAllFriends;}
utils.templates.append('#friends-list',currentRecommendation);imgLoader.reload();if(typeof completedCb==='function'){completedCb();}
Curtain.hide(function onCurtainHide(){sendReadyEvent();window.addEventListener('message',function linkOnViewPort(e){if(e.origin!==fb.CONTACTS_APP_ORIGIN){return;}
var data=e.data;if(data&&data.type==='dom_transition_end'){window.removeEventListener('message',linkOnViewPort);utils.status.show({id:'linkProposal',args:{numFriends:numFriendsProposed}});}});});}};function searchAccents(searchArrays,contactData){var out=[];var searchFields=Object.keys(SEARCH_ACCENTS_FIELDS);function compareItems(target,item){var out;if(typeof target==='string'){out=target.localeCompare(item);if(out!==0){if(item.indexOf(target)===0){out=0;}}}
return out;}
searchFields.forEach(function(searchField){var searchArray=searchArrays[searchField].sort(function(a,b){return a[searchField].localeCompare(b[searchField]);});var fieldToSearch=contactData[SEARCH_ACCENTS_FIELDS[searchField]];if(fieldToSearch&&fieldToSearch[0]){var dataToSearch=fieldToSearch[0].trim().split(/[ ]+/);dataToSearch.forEach(function(aData){var targetString=Normalizer.toAscii(aData).toLowerCase();var searchResult=utils.binarySearch(targetString,searchArray,{arrayField:searchField,compareFunction:compareItems});searchResult.forEach(function(aResult){var candidate=searchArray[aResult].originalIndex;if(out.indexOf(candidate)===-1){out.push(candidate);}});});}});return out;}
function sendReadyEvent(){parent.postMessage({type:'ready',data:''},fb.CONTACTS_APP_ORIGIN);}
function setCurtainHandlersErrorProposal(){Curtain.oncancel=function(){cancelCb(true);};Curtain.onretry=function getRemoteProposal(){Curtain.oncancel=function(){cancelCb(true);};Curtain.show('wait',state);link.getRemoteProposal(access_token,contactid);};}
link.baseHandler=function(type){if(state==='friends'){Curtain.onretry=getRemoteAll;Curtain.oncancel=Curtain.hide;}else if(state==='proposal'){setCurtainHandlersErrorProposal();}
else if(state==='linking'){Curtain.onretry=function retry_link(){Curtain.show('message','linking');UI.selected({target:{dataset:{uuid:friendUidToLink}}});};Curtain.oncancel=Curtain.hide;}
Curtain.show(type,state);};link.timeoutHandler=function(){link.baseHandler('timeout');};link.errorHandler=function(){link.baseHandler('error');};function clearList(){if(!friendsList){friendsList=document.querySelector('#friends-list');}
var template=friendsList.querySelector('[data-template]');utils.dom.removeChildNodes(friendsList);friendsList.appendChild(template);}
link.friendsReady=function(response){if(typeof response.error==='undefined'&&response.data){viewButton.setAttribute('data-l10n-id','viewRecommend');viewButton.onclick=UI.viewRecommended;allFriends=response;fb.utils.setCachedNumFriends(response.data.length);response.data.forEach(function(item){if(!item.email){item.email='';}});clearList();var fragment=document.createDocumentFragment();utils.templates.append(friendsList,response.data,fragment);friendsList.appendChild(fragment);imgLoader.reload();Curtain.hide();}
else{window.console.error('FB: Error while retrieving friends',response.error.code,response.error.message);if(response.error.code!==190){Curtain.onretry=getRemoteAll;Curtain.oncancel=Curtain.hide;}
else{Curtain.onretry=handleTokenError;}
Curtain.show('error','friends');}};function setCurtainHandlers(){Curtain.oncancel=function curtain_cancel(){cancelCb(true);};}
link.start=function(contactId,acc_tk,endCb){completedCb=endCb;access_token=acc_tk;contactid=contactId;setCurtainHandlers();clearList();imgLoader=new ImageLoader('#mainContent','li:not([data-uuid="#uid#"])');if(!acc_tk){oauth2.getAccessToken(function proposal_new_token(new_acc_tk){access_token=new_acc_tk;link.getProposal(contactId,new_acc_tk);},'proposal','facebook');}
else{link.getProposal(contactId,acc_tk);}};link.init=function(){mainSection=document.querySelector('#main');viewButton=document.querySelector('#view-all');};function retryOnErrorCb(){UI.selected({target:{dataset:{uuid:friendUidToLink}}});}
function handleTokenError(){Curtain.hide(notifyParent.bind(null,{type:'token_error'}));var cb=function(){allFriends=null;link.start(contactid);};ImportStatusData.remove(fb.utils.TOKEN_DATA_KEY).then(cb);}
UI.selected=function(event){Curtain.show('message','linking');var element=event.target.parentNode;friendUidToLink=element.dataset.uuid;var req=fb.contacts.get(friendUidToLink);req.onsuccess=function(){if(req.result){window.setTimeout(function delay(){Curtain.hide(notifyParent.bind(null,{type:'item_selected',data:{uid:friendUidToLink}}));},1000);}
else{state='linking';var callbacks={};callbacks.success=function(data){Curtain.hide(notifyParent.bind(null,{type:'item_selected',data:data}));};callbacks.error=function(e){var error=e.target.error;window.console.error('FB: Error while importing friend data ',JSON.stringify(error));Curtain.oncancel=Curtain.hide;if(error.code!=190){Curtain.onretry=retryOnErrorCb;}
else{Curtain.onretry=handleTokenError;}
Curtain.show('error','linking');};callbacks.timeout=function(){link.baseHandler('timeout');};imgLoader.unload();FacebookConnector.importContact(friendUidToLink,access_token,callbacks,'not_match');}};req.onerror=function(){window.console.error('FB: Error while importing friend data');Curtain.oncancel=Curtain.hide;Curtain.onretry=retryOnErrorCb;Curtain.show('error','linking');};};UI.end=function(event){var msg={type:'window_close',data:''};parent.postMessage(msg,fb.CONTACTS_APP_ORIGIN);};UI.viewAllFriends=function(event){if(!allFriends){getRemoteAll();}
else{link.friendsReady(allFriends);}
return false;};UI.viewRecommended=function(event){event.target.onclick=UI.viewAllFriends;event.target.setAttribute('data-l10n-id','viewAll');clearList();utils.templates.append(friendsList,currentRecommendation);imgLoader.reload();return false;};})(document);};'use strict';(function(document){var cid=window.location.search.substring(fb.link.CID_PARAM.length+2);if(parent.fb){fb.operationsTimeout=parent.fb.operationsTimeout;}
utils.listeners.add({'#link-header':[{event:'action',handler:fb.link.ui.end}],'#friends-list':fb.link.ui.selected});fb.link.init();document.querySelector('#view-all').onclick=fb.link.ui.viewAllFriends;fb.contacts.init(function fb_init(){window.addEventListener('message',function getAccessToken(e){if(e.origin!==fb.CONTACTS_APP_ORIGIN){return;}
window.removeEventListener('message',getAccessToken);fb.link.start(cid,e.data.data);});parent.postMessage({type:'messaging_ready',data:''},fb.CONTACTS_APP_ORIGIN);});})(document);;;;;;;window.COMPONENTS_BASE_URL='/shared/elements/';;;;;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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