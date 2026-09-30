;'use strict';(function(exports){var STORE_NAME='ice_contacts';var store=null;var status='not_initialized';var FIELD='ICE_CONTACTS';function init(){if(store!==null){return Promise.resolve(store);}
if(!navigator.getDataStores){return Promise.reject('No DS supported');}
if(status==='initialising'){document.addEventListener('ice_ready',function ready(){document.removeEventListener('ice_ready',ready);if(store===null){return Promise.reject('Error getting store');}else{return Promise.resolve(store);}});}
status='initialising';return new Promise(function(resolve,reject){navigator.getDataStores(STORE_NAME).then(function(stores){if(!stores||stores.length<0){document.dispatchEvent(new Event('on_ice_ready'));return reject('No DS found');}else{store=stores[0];status='initialised';document.dispatchEvent(new Event('ice_ready'));return resolve(store);}});});}
var ICEStore={setContacts:function(iceContacts){return init().then(function(){return store.put(iceContacts,FIELD).then(function(){return Promise.resolve(iceContacts);});});},getContacts:function(){return init().then(function(){return store.get(FIELD);});},onChange:function(cb){return init().then(function(){store.addEventListener('change',function(){store.get(FIELD).then(cb);});});}};exports.ICEStore=ICEStore;})(window);;'use strict';var Utils={prettyDate:function ut_prettyDate(time){var f=Intl.DateTimeFormat(navigator.languages,{hour12:navigator.mozHour12,hour:'numeric',minute:'numeric'});return f.format(new Date(time));},prettyDuration:function(node,duration,l10nPrefix){var elapsed=new Date(duration);var h=elapsed.getUTCHours();var m=elapsed.getUTCMinutes();var s=elapsed.getUTCSeconds();var l10nId=l10nPrefix||'callDuration';var durationL10n={h:h+'',m:m+'',s:s+''};if(l10nId==='callDuration'){durationL10n={h:(h>9?'':'0')+h,m:(m>9?'':'0')+m,s:(s>9?'':'0')+s};}
if(l10nPrefix==='callDurationTextFormat'&&h===0&&m===0){l10nId+='Seconds';}else{l10nId+=h>0?'Hours':'Minutes';}
navigator.mozL10n.setAttributes(node,l10nId,durationL10n);},setHeaderDate:function ut_setHeaderDate(elem,time){var diff=(Date.now()-time)/1000;var day_diff=Math.floor(diff/86400);var formattedTime;if(isNaN(day_diff)){elem.setAttribute('data-l10n-id','incorrectDate');return;}else if(day_diff===0){elem.setAttribute('data-l10n-id','today');return;}else if(day_diff===1){elem.setAttribute('data-l10n-id','yesterday');return;}else if(day_diff<6){formattedTime=(new Date(time)).toLocaleString(navigator.languages,{weekday:'long',});}else{formattedTime=(new Date(time)).toLocaleString(navigator.languages,{year:'2-digit',month:'2-digit',day:'2-digit'});}
elem.removeAttribute('data-l10n-id');elem.textContent=formattedTime;},getPhoneNumberPrimaryInfo:function ut_getPhoneNumberPrimaryInfo(matchingTel,contact){if(contact){if(contact.name&&contact.name.length&&contact.name[0]!==''){return contact.name;}else if(contact.org&&contact.org.length&&contact.org[0]!==''){return contact.org;}}
if(matchingTel){return matchingTel.value;}
return null;},toCamelCase:function ut_toCamelCase(str){return str.replace(/\-(.)/g,function replacer(str,p1){return p1.toUpperCase();});},_phoneTypesL10n:{'mobile':'phone_type_mobile','home':'phone_type_home','work':'phone_type_work','personal':'phone_type_personal','faxHome':'phone_type_fax_home','faxOffice':'phone_type_fax_office','faxOther':'phone_type_fax_other','other':'phone_type_other'},getPhoneNumberAdditionalInfo:function ut_getPhoneNumberAdditionalInfo(matchingTel){var type=matchingTel.type||'mobile';var carrier=matchingTel.carrier;if(Array.isArray(type)){type=type[0];}
var id;var args={};if(this._phoneTypesL10n.hasOwnProperty(type)){id=this._phoneTypesL10n[type];}else{id='phone_type_custom';args.type=type;}
if(carrier){id+='_and_carrier';args.carrier=carrier;}
return{id:id,args:Object.keys(args).length?args:null};},isPhoneType:function ut_isPhoneType(type){return this._phoneTypesL10n.hasOwnProperty(type);}};;'use strict';function DtmfTone(tone,short,serviceId){this.tone=tone;this.short=short;this.serviceId=serviceId;this.timer=0;}
DtmfTone.kShortToneLength=120;DtmfTone.prototype={play:function dt_play(){clearTimeout(this.timer);navigator.mozTelephony.stopTone(this.serviceId);navigator.mozTelephony.startTone(this.tone,this.serviceId);if(this.short){this.timer=window.setTimeout(function dt_stopTone(serviceId){navigator.mozTelephony.stopTone(serviceId);},DtmfTone.kShortToneLength,this.serviceId);}},stop:function dt_stop(){clearTimeout(this.timer);navigator.mozTelephony.stopTone(this.serviceId);}};;'use strict';const kMasterVolume=0.5;const kToneVolume=0.7;const kShortPressDuration=0.15;const kAttackDuration=0.025;const kDecayDuration=0.025;const kReleaseDuration=0.05;var TonePlayer={_audioContext:null,_channel:null,_gainNode:null,_playingNodes:[],_maybeTrashAudio:null,_initialized:false,init:function tp_init(channel){var telephony=navigator.mozTelephony;this._reset();this._channel=channel;this._maybeTrashAudio=(function tp_maybeTrashAudio(){var callIsActive=telephony&&(telephony.calls.length||telephony.conferenceGroup.calls.length);if(document.hidden&&!((this._channel==='telephony')&&callIsActive)){this._trashAudio();}}).bind(this);window.addEventListener('visibilitychange',this._maybeTrashAudio);telephony&&telephony.addEventListener('callschanged',this._maybeTrashAudio);this._initialized=true;},teardown:function tp_teardown(){var telephony=navigator.mozTelephony;telephony&&telephony.removeEventListener('callschanged',this._maybeTrashAudio);window.removeEventListener('visibilitychange',this._maybeTrashAudio);this._reset();this._initialized=false;},_reset:function tp_reset(){this._audioContext=null;this._channel=null;this._gainNode=null;this._playingNodes=[];this._maybeTrashAudio=null;},_ensureAudio:function tp_ensureAudio(){if(this._audioContext||!this._initialized){return;}
this._audioContext=new AudioContext();},_trashAudio:function tp_trashAudio(){this.stop();this._audioContext=null;},_startAt:function tp_startAt(frequencies,when,duration){var context=this._audioContext;var sampleRate=context.sampleRate;var envelope=context.createBuffer(1,(duration?duration:0.05)*sampleRate,sampleRate);for(var i=0;i<envelope.length;i++){var factor=kToneVolume;var t=i/sampleRate;if(t<=kAttackDuration){factor=t/kAttackDuration;}else if(t-kAttackDuration<=kDecayDuration){factor=1.0-(1.0-kToneVolume)*(t-kAttackDuration)/kDecayDuration;}
if(!duration){factor-=kToneVolume;}else if(t>duration-kReleaseDuration){factor*=(duration-t)/kReleaseDuration;}
envelope.getChannelData(0)[i]=factor*kMasterVolume;}
var gainNode=context.createGain();gainNode.connect(context.destination);if(!duration){this._gainNode=gainNode;}
var envelopeNode=context.createBufferSource();envelopeNode.buffer=envelope;envelopeNode.start(when);envelopeNode.connect(gainNode.gain);gainNode.gain.setValueAtTime(duration?0.0:kToneVolume*kMasterVolume,0.0);for(i=0;i<frequencies.length;++i){var oscNode=this._audioContext.createOscillator();oscNode.type='sine';oscNode.frequency.value=frequencies[i];oscNode.start(when);if(duration){oscNode.stop(Math.max(when,context.currentTime+0.5)+duration);}else{this._playingNodes.push(oscNode);}
oscNode.connect(gainNode);}},start:function tp_start(frequencies,shortPress){this._ensureAudio();this._startAt(frequencies,0,shortPress?kShortPressDuration:0);},stop:function tp_stop(){if(!this._gainNode){return;}
var context=this._audioContext;var sampleRate=context.sampleRate;var gain=this._gainNode.gain;this._gainNode=null;var ramp=context.createBuffer(1,kReleaseDuration*sampleRate,sampleRate);for(var i=0;i<ramp.length;i++){ramp.getChannelData(0)[i]=(ramp.length-i-1)/ramp.length*kToneVolume*kMasterVolume;}
var rampNode=context.createBufferSource();rampNode.buffer=ramp;rampNode.start();rampNode.connect(gain);gain.setValueAtTime(0.0,0.0);while(this._playingNodes.length){this._playingNodes.pop().stop(context.currentTime+kReleaseDuration+0.5);}},playSequence:function tp_playSequence(sequence){this._ensureAudio();var when=this._audioContext.currentTime+0.2;for(var index=0;index<sequence.length;++index){var step=sequence[index];var frequencies=step.slice(0,2);var duration=step[2]/1000;this._startAt(frequencies,when,duration);when+=duration;}}};;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
L10nError.prototype=Object.create(Error.prototype);L10nError.prototype.constructor=L10nError;var io={_load:function(type,url,callback,sync){var xhr=new XMLHttpRequest();var needParse;if(xhr.overrideMimeType){xhr.overrideMimeType(type);}
xhr.open('GET',url,!sync);if(type==='application/json'){if(sync){needParse=true;}else{xhr.responseType='json';}}
xhr.addEventListener('load',function io_onload(e){if(e.target.status===200||e.target.status===0){var res=e.target.response||e.target.responseText;callback(null,needParse?JSON.parse(res):res);}else{callback(new L10nError('Not found: '+url));}});xhr.addEventListener('error',callback);xhr.addEventListener('timeout',callback);try{xhr.send(null);}catch(e){if(e.name==='NS_ERROR_FILE_NOT_FOUND'){callback(new L10nError('Not found: '+url));}else{throw e;}}},load:function(url,callback,sync){return io._load('text/plain',url,callback,sync);},loadJSON:function(url,callback,sync){return io._load('application/json',url,callback,sync);}};function EventEmitter(){}
EventEmitter.prototype.emit=function ee_emit(){if(!this._listeners){return;}
var args=Array.prototype.slice.call(arguments);var type=args.shift();if(!this._listeners[type]){return;}
var typeListeners=this._listeners[type].slice();for(var i=0;i<typeListeners.length;i++){typeListeners[i].apply(this,args);}};EventEmitter.prototype.addEventListener=function ee_add(type,listener){if(!this._listeners){this._listeners={};}
if(!(type in this._listeners)){this._listeners[type]=[];}
this._listeners[type].push(listener);};EventEmitter.prototype.removeEventListener=function ee_rm(type,listener){if(!this._listeners){return;}
var typeListeners=this._listeners[type];var pos=typeListeners.indexOf(listener);if(pos===-1){return;}
typeListeners.splice(pos,1);};function getPluralRule(lang){var locales2rules={'af':3,'ak':4,'am':4,'ar':1,'asa':3,'az':0,'be':11,'bem':3,'bez':3,'bg':3,'bh':4,'bm':0,'bn':3,'bo':0,'br':20,'brx':3,'bs':11,'ca':3,'cgg':3,'chr':3,'cs':12,'cy':17,'da':3,'de':3,'dv':3,'dz':0,'ee':3,'el':3,'en':3,'eo':3,'es':3,'et':3,'eu':3,'fa':0,'ff':5,'fi':3,'fil':4,'fo':3,'fr':5,'fur':3,'fy':3,'ga':8,'gd':24,'gl':3,'gsw':3,'gu':3,'guw':4,'gv':23,'ha':3,'haw':3,'he':2,'hi':4,'hr':11,'hu':0,'id':0,'ig':0,'ii':0,'is':3,'it':3,'iu':7,'ja':0,'jmc':3,'jv':0,'ka':0,'kab':5,'kaj':3,'kcg':3,'kde':0,'kea':0,'kk':3,'kl':3,'km':0,'kn':0,'ko':0,'ksb':3,'ksh':21,'ku':3,'kw':7,'lag':18,'lb':3,'lg':3,'ln':4,'lo':0,'lt':10,'lv':6,'mas':3,'mg':4,'mk':16,'ml':3,'mn':3,'mo':9,'mr':3,'ms':0,'mt':15,'my':0,'nah':3,'naq':7,'nb':3,'nd':3,'ne':3,'nl':3,'nn':3,'no':3,'nr':3,'nso':4,'ny':3,'nyn':3,'om':3,'or':3,'pa':3,'pap':3,'pl':13,'ps':3,'pt':3,'rm':3,'ro':9,'rof':3,'ru':11,'rwk':3,'sah':0,'saq':3,'se':7,'seh':3,'ses':0,'sg':0,'sh':11,'shi':19,'sk':12,'sl':14,'sma':7,'smi':7,'smj':7,'smn':7,'sms':7,'sn':3,'so':3,'sq':3,'sr':11,'ss':3,'ssy':3,'st':3,'sv':3,'sw':3,'syr':3,'ta':3,'te':3,'teo':3,'th':0,'ti':4,'tig':3,'tk':3,'tl':4,'tn':3,'to':0,'tr':0,'ts':3,'tzm':22,'uk':11,'ur':3,'ve':3,'vi':0,'vun':3,'wa':4,'wae':3,'wo':0,'xh':3,'xog':3,'yo':0,'zh':0,'zu':3};function isIn(n,list){return list.indexOf(n)!==-1;}
function isBetween(n,start,end){return typeof n===typeof start&&start<=n&&n<=end;}
var pluralRules={'0':function(){return'other';},'1':function(n){if((isBetween((n%100),3,10))){return'few';}
if(n===0){return'zero';}
if((isBetween((n%100),11,99))){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'2':function(n){if(n!==0&&(n%10)===0){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'3':function(n){if(n===1){return'one';}
return'other';},'4':function(n){if((isBetween(n,0,1))){return'one';}
return'other';},'5':function(n){if((isBetween(n,0,2))&&n!==2){return'one';}
return'other';},'6':function(n){if(n===0){return'zero';}
if((n%10)===1&&(n%100)!==11){return'one';}
return'other';},'7':function(n){if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'8':function(n){if((isBetween(n,3,6))){return'few';}
if((isBetween(n,7,10))){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'9':function(n){if(n===0||n!==1&&(isBetween((n%100),1,19))){return'few';}
if(n===1){return'one';}
return'other';},'10':function(n){if((isBetween((n%10),2,9))&&!(isBetween((n%100),11,19))){return'few';}
if((n%10)===1&&!(isBetween((n%100),11,19))){return'one';}
return'other';},'11':function(n){if((isBetween((n%10),2,4))&&!(isBetween((n%100),12,14))){return'few';}
if((n%10)===0||(isBetween((n%10),5,9))||(isBetween((n%100),11,14))){return'many';}
if((n%10)===1&&(n%100)!==11){return'one';}
return'other';},'12':function(n){if((isBetween(n,2,4))){return'few';}
if(n===1){return'one';}
return'other';},'13':function(n){if((isBetween((n%10),2,4))&&!(isBetween((n%100),12,14))){return'few';}
if(n!==1&&(isBetween((n%10),0,1))||(isBetween((n%10),5,9))||(isBetween((n%100),12,14))){return'many';}
if(n===1){return'one';}
return'other';},'14':function(n){if((isBetween((n%100),3,4))){return'few';}
if((n%100)===2){return'two';}
if((n%100)===1){return'one';}
return'other';},'15':function(n){if(n===0||(isBetween((n%100),2,10))){return'few';}
if((isBetween((n%100),11,19))){return'many';}
if(n===1){return'one';}
return'other';},'16':function(n){if((n%10)===1&&n!==11){return'one';}
return'other';},'17':function(n){if(n===3){return'few';}
if(n===0){return'zero';}
if(n===6){return'many';}
if(n===2){return'two';}
if(n===1){return'one';}
return'other';},'18':function(n){if(n===0){return'zero';}
if((isBetween(n,0,2))&&n!==0&&n!==2){return'one';}
return'other';},'19':function(n){if((isBetween(n,2,10))){return'few';}
if((isBetween(n,0,1))){return'one';}
return'other';},'20':function(n){if((isBetween((n%10),3,4)||((n%10)===9))&&!(isBetween((n%100),10,19)||isBetween((n%100),70,79)||isBetween((n%100),90,99))){return'few';}
if((n%1000000)===0&&n!==0){return'many';}
if((n%10)===2&&!isIn((n%100),[12,72,92])){return'two';}
if((n%10)===1&&!isIn((n%100),[11,71,91])){return'one';}
return'other';},'21':function(n){if(n===0){return'zero';}
if(n===1){return'one';}
return'other';},'22':function(n){if((isBetween(n,0,1))||(isBetween(n,11,99))){return'one';}
return'other';},'23':function(n){if((isBetween((n%10),1,2))||(n%20)===0){return'one';}
return'other';},'24':function(n){if((isBetween(n,3,10)||isBetween(n,13,19))){return'few';}
if(isIn(n,[2,12])){return'two';}
if(isIn(n,[1,11])){return'one';}
return'other';}};var index=locales2rules[lang.replace(/-.*$/,'')];if(!(index in pluralRules)){return function(){return'other';};}
return pluralRules[index];}
var MAX_PLACEABLES=100;var PropertiesParser={patterns:null,entryIds:null,init:function(){this.patterns={comment:/^\s*#|^\s*$/,entity:/^([^=\s]+)\s*=\s*(.*)$/,multiline:/[^\\]\\$/,index:/\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,unicode:/\\u([0-9a-fA-F]{1,4})/g,entries:/[^\r\n]+/g,controlChars:/\\([\\\n\r\t\b\f\{\}\"\'])/g,placeables:/\{\{\s*([^\s]*?)\s*\}\}/,};},parse:function(ctx,source){if(!this.patterns){this.init();}
var ast=[];this.entryIds=Object.create(null);var entries=source.match(this.patterns.entries);if(!entries){return ast;}
for(var i=0;i<entries.length;i++){var line=entries[i];if(this.patterns.comment.test(line)){continue;}
while(this.patterns.multiline.test(line)&&i<entries.length){line=line.slice(0,-1)+entries[++i].trim();}
var entityMatch=line.match(this.patterns.entity);if(entityMatch){try{this.parseEntity(entityMatch[1],entityMatch[2],ast);}catch(e){if(ctx){ctx._emitter.emit('parseerror',e);}else{throw e;}}}}
return ast;},parseEntity:function(id,value,ast){var name,key;var pos=id.indexOf('[');if(pos!==-1){name=id.substr(0,pos);key=id.substring(pos+1,id.length-1);}else{name=id;key=null;}
var nameElements=name.split('.');if(nameElements.length>2){throw new L10nError('Error in ID: "'+name+'".'+' Nested attributes are not supported.');}
var attr;if(nameElements.length>1){name=nameElements[0];attr=nameElements[1];if(attr[0]==='$'){throw new L10nError('Attribute can\'t start with "$"',id);}}else{attr=null;}
this.setEntityValue(name,attr,key,this.unescapeString(value),ast);},setEntityValue:function(id,attr,key,rawValue,ast){var pos,v;var value=rawValue.indexOf('{{')>-1?this.parseString(rawValue):rawValue;if(attr){pos=this.entryIds[id];if(pos===undefined){v={$i:id};if(key){v[attr]={};v[attr][key]=value;}else{v[attr]=value;}
ast.push(v);this.entryIds[id]=ast.length-1;return;}
if(key){if(typeof(ast[pos][attr])==='string'){ast[pos][attr]={$x:this.parseIndex(ast[pos][attr]),$v:{}};}
ast[pos][attr].$v[key]=value;return;}
ast[pos][attr]=value;return;}
if(key){pos=this.entryIds[id];if(pos===undefined){v={};v[key]=value;ast.push({$i:id,$v:v});this.entryIds[id]=ast.length-1;return;}
if(typeof(ast[pos].$v)==='string'){ast[pos].$x=this.parseIndex(ast[pos].$v);ast[pos].$v={};}
ast[pos].$v[key]=value;return;}
ast.push({$i:id,$v:value});this.entryIds[id]=ast.length-1;},parseString:function(str){var chunks=str.split(this.patterns.placeables);var complexStr=[];var len=chunks.length;var placeablesCount=(len-1)/2;if(placeablesCount>=MAX_PLACEABLES){throw new L10nError('Too many placeables ('+placeablesCount+', max allowed is '+MAX_PLACEABLES+')');}
for(var i=0;i<chunks.length;i++){if(chunks[i].length===0){continue;}
if(i%2===1){complexStr.push({t:'idOrVar',v:chunks[i]});}else{complexStr.push(chunks[i]);}}
return complexStr;},unescapeString:function(str){if(str.lastIndexOf('\\')!==-1){str=str.replace(this.patterns.controlChars,'$1');}
return str.replace(this.patterns.unicode,function(match,token){return unescape('%u'+'0000'.slice(token.length)+token);});},parseIndex:function(str){var match=str.match(this.patterns.index);if(!match){throw new L10nError('Malformed index');}
if(match[2]){return[{t:'idOrVar',v:match[1]},match[2]];}else{return[{t:'idOrVar',v:match[1]}];}}};var KNOWN_MACROS=['plural'];var MAX_PLACEABLE_LENGTH=2500;var rePlaceables=/\{\{\s*(.+?)\s*\}\}/g;var nonLatin1=/[^\x01-\xFF]/;var FSI='\u2068';var PDI='\u2069';function createEntry(node,env){var keys=Object.keys(node);if(typeof node.$v==='string'&&keys.length===2){return node.$v;}
var attrs;for(var i=0,key;key=keys[i];i++){if(key[0]==='$'){continue;}
if(!attrs){attrs=Object.create(null);}
attrs[key]=createAttribute(node[key],env,node.$i+'.'+key);}
return{id:node.$i,value:node.$v!==undefined?node.$v:null,index:node.$x||null,attrs:attrs||null,env:env,dirty:false};}
function createAttribute(node,env,id){if(typeof node==='string'){return node;}
return{id:id,value:node.$v||(node!==undefined?node:null),index:node.$x||null,env:env,dirty:false};}
function format(args,entity){if(typeof entity==='string'){return[{},entity];}
if(entity.dirty){throw new L10nError('Cyclic reference detected: '+entity.id);}
entity.dirty=true;var rv;try{rv=resolveValue({},args,entity.env,entity.value,entity.index);}finally{entity.dirty=false;}
return rv;}
function resolveIdentifier(args,env,id){if(KNOWN_MACROS.indexOf(id)>-1){return[{},env['__'+id]];}
if(args&&args.hasOwnProperty(id)){if(typeof args[id]==='string'||(typeof args[id]==='number'&&!isNaN(args[id]))){return[{},args[id]];}else{throw new L10nError('Arg must be a string or a number: '+id);}}
if(id in env&&id!=='__proto__'){return format(args,env[id]);}
throw new L10nError('Unknown reference: '+id);}
function subPlaceable(locals,args,env,id){var res;try{res=resolveIdentifier(args,env,id);}catch(err){return[{error:err},'{{ '+id+' }}'];}
var value=res[1];if(typeof value==='number'){return res;}
if(typeof value==='string'){if(value.length>=MAX_PLACEABLE_LENGTH){throw new L10nError('Too many characters in placeable ('+
value.length+', max allowed is '+
MAX_PLACEABLE_LENGTH+')');}
if(locals.contextIsNonLatin1||value.match(nonLatin1)){res[1]=FSI+value+PDI;}
return res;}
return[{},'{{ '+id+' }}'];}
function interpolate(locals,args,env,arr){return arr.reduce(function(prev,cur){if(typeof cur==='string'){return[prev[0],prev[1]+cur];}else if(cur.t==='idOrVar'){var placeable=subPlaceable(locals,args,env,cur.v);return[prev[0],prev[1]+placeable[1]];}},[locals,'']);}
function resolveSelector(args,env,expr,index){var selectorName=index[0].v;var selector=resolveIdentifier(args,env,selectorName)[1];if(typeof selector!=='function'){return selector;}
var argValue=index[1]?resolveIdentifier(args,env,index[1])[1]:undefined;if(selector===env.__plural){if(argValue===0&&'zero'in expr){return'zero';}
if(argValue===1&&'one'in expr){return'one';}
if(argValue===2&&'two'in expr){return'two';}}
return selector(argValue);}
function resolveValue(locals,args,env,expr,index){if(!expr){return[locals,expr];}
if(typeof expr==='string'||typeof expr==='boolean'||typeof expr==='number'){return[locals,expr];}
if(Array.isArray(expr)){locals.contextIsNonLatin1=expr.some(function($_){return typeof($_)==='string'&&$_.match(nonLatin1);});return interpolate(locals,args,env,expr);}
if(index){var selector=resolveSelector(args,env,expr,index);if(expr.hasOwnProperty(selector)){return resolveValue(locals,args,env,expr[selector]);}}
if('other'in expr){return resolveValue(locals,args,env,expr.other);}
throw new L10nError('Unresolvable value');}
var Resolver={createEntry:createEntry,format:format,rePlaceables:rePlaceables};function walkContent(node,fn){if(typeof node==='string'){return fn(node);}
if(node.t==='idOrVar'){return node;}
var rv=Array.isArray(node)?[]:{};var keys=Object.keys(node);for(var i=0,key;(key=keys[i]);i++){if(key==='$i'||key==='$x'){rv[key]=node[key];}else{rv[key]=walkContent(node[key],fn);}}
return rv;}
var reAlphas=/[a-zA-Z]/g;var reVowels=/[aeiouAEIOU]/g;var ACCENTED_MAP='\u0226\u0181\u0187\u1E12\u1E16\u0191\u0193\u0126\u012A'+'\u0134\u0136\u013F\u1E3E\u0220\u01FE\u01A4\u024A\u0158'+'\u015E\u0166\u016C\u1E7C\u1E86\u1E8A\u1E8E\u1E90'+'[\\]^_`'+'\u0227\u0180\u0188\u1E13\u1E17\u0192\u0260\u0127\u012B'+'\u0135\u0137\u0140\u1E3F\u019E\u01FF\u01A5\u024B\u0159'+'\u015F\u0167\u016D\u1E7D\u1E87\u1E8B\u1E8F\u1E91';var FLIPPED_MAP='\u2200\u0510\u2183p\u018E\u025F\u05E4HI\u017F'+'\u04FC\u02E5WNO\u0500\xD2\u1D1AS\u22A5\u2229\u0245'+'\uFF2DX\u028EZ'+'[\\]\u1D65_,'+'\u0250q\u0254p\u01DD\u025F\u0183\u0265\u0131\u027E'+'\u029E\u0285\u026Fuodb\u0279s\u0287n\u028C\u028Dx\u028Ez';function makeLonger(val){return val.replace(reVowels,function(match){return match+match.toLowerCase();});}
function replaceChars(map,val){return val.replace(reAlphas,function(match){return map.charAt(match.charCodeAt(0)-65);});}
var reWords=/[^\W0-9_]+/g;function makeRTL(val){return val.replace(reWords,function(match){return'\u202e'+match+'\u202c';});}
var reExcluded=/(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;function mapContent(fn,val){if(!val){return val;}
var parts=val.split(reExcluded);var modified=parts.map(function(part){if(reExcluded.test(part)){return part;}
return fn(part);});return modified.join('');}
function Pseudo(id,name,charMap,modFn){this.id=id;this.translate=mapContent.bind(null,function(val){return replaceChars(charMap,modFn(val));});this.name=this.translate(name);}
var PSEUDO={'fr-x-psaccent':new Pseudo('fr-x-psaccent','Runtime Accented',ACCENTED_MAP,makeLonger),'ar-x-psbidi':new Pseudo('ar-x-psbidi','Runtime Bidi',FLIPPED_MAP,makeRTL)};function Locale(id,ctx){this.id=id;this.ctx=ctx;this.isReady=false;this.entries=Object.create(null);this.entries.__plural=getPluralRule(this.isPseudo()?this.ctx.defaultLocale:id);}
Locale.prototype.isPseudo=function(){return this.ctx.qps.indexOf(this.id)!==-1;};var bindingsIO={extra:function(id,ver,path,type,callback,errback){if(type==='properties'){type='text';}
navigator.mozApps.getLocalizationResource(id,ver,path,type).then(callback.bind(null,null),errback);},app:function(id,ver,path,type,callback,errback,sync){switch(type){case'properties':io.load(path,callback,sync);break;case'json':io.loadJSON(path,callback,sync);break;}},};Locale.prototype.build=function L_build(callback){var sync=!callback;var ctx=this.ctx;var self=this;var l10nLoads=ctx.resLinks.length;function onL10nLoaded(err){if(err){ctx._emitter.emit('fetcherror',err);}
if(--l10nLoads<=0){self.isReady=true;if(callback){callback();}}}
if(l10nLoads===0){onL10nLoaded();return;}
function onJSONLoaded(err,json){if(!err&&json){self.addAST(json);}
onL10nLoaded(err);}
function onPropLoaded(err,source){if(!err&&source){var ast=PropertiesParser.parse(ctx,source);self.addAST(ast);}
onL10nLoaded(err);}
var idToFetch=this.isPseudo()?ctx.defaultLocale:this.id;var appVersion=null;var source='app';if(typeof(navigator)!=='undefined'){source=navigator.mozL10n._config.localeSources[this.id]||'app';appVersion=navigator.mozL10n._config.appVersion;}
for(var i=0;i<ctx.resLinks.length;i++){var resLink=decodeURI(ctx.resLinks[i]);var path=resLink.replace('{locale}',idToFetch);var type=path.substr(path.lastIndexOf('.')+1);var cb;switch(type){case'json':cb=onJSONLoaded;break;case'properties':cb=onPropLoaded;break;}
bindingsIO[source](this.id,appVersion,path,type,cb,onL10nLoaded,sync);}};function createPseudoEntry(node,entries){return Resolver.createEntry(walkContent(node,PSEUDO[this.id].translate),entries);}
Locale.prototype.addAST=function(ast){var createEntry=this.isPseudo()?createPseudoEntry.bind(this):Resolver.createEntry;for(var i=0;i<ast.length;i++){this.entries[ast[i].$i]=createEntry(ast[i],this.entries);}};function Context(id){this.id=id;this.isReady=false;this.isLoading=false;this.defaultLocale='en-US';this.availableLocales=[];this.supportedLocales=[];this.qps=[];this.resLinks=[];this.locales={};this._emitter=new EventEmitter();this._ready=new Promise(this.once.bind(this));}
function reportMissing(id,err){this._emitter.emit('notfounderror',err);return id;}
function getWithFallback(id){var cur=0;var loc;var locale;while(loc=this.supportedLocales[cur]){locale=this.getLocale(loc);if(!locale.isReady){locale.build(null);}
var entry=locale.entries[id];if(entry===undefined){cur++;reportMissing.call(this,id,new L10nError('"'+id+'"'+' not found in '+loc+' in '+this.id,id,loc));continue;}
return entry;}
throw new L10nError('"'+id+'"'+' missing from all supported locales in '+this.id,id);}
function formatTuple(args,entity){try{return Resolver.format(args,entity);}catch(err){this._emitter.emit('resolveerror',err);var locals={error:err};return[locals,entity.id];}}
function formatValue(args,entity){if(typeof entity==='string'){return entity;}
return formatTuple.call(this,args,entity)[1];}
function formatEntity(args,entity){var entityTuple=formatTuple.call(this,args,entity);var value=entityTuple[1];var formatted={value:value,attrs:null,};if(entity.attrs){formatted.attrs=Object.create(null);}
for(var key in entity.attrs){var attrTuple=formatTuple.call(this,args,entity.attrs[key]);formatted.attrs[key]=attrTuple[1];}
return formatted;}
function formatAsync(fn,id,args){return this._ready.then(getWithFallback.bind(this,id)).then(fn.bind(this,args),reportMissing.bind(this,id));}
Context.prototype.formatValue=function(id,args){return formatAsync.call(this,formatValue,id,args);};Context.prototype.formatEntity=function(id,args){return formatAsync.call(this,formatEntity,id,args);};function legacyGet(fn,id,args){if(!this.isReady){throw new L10nError('Context not ready');}
var entry;try{entry=getWithFallback.call(this,id);}catch(err){if(err.loc){throw err;}
reportMissing.call(this,id,err);return'';}
return fn.call(this,args,entry);}
Context.prototype.get=function(id,args){return legacyGet.call(this,formatValue,id,args);};Context.prototype.getEntity=function(id,args){return legacyGet.call(this,formatEntity,id,args);};Context.prototype.getLocale=function getLocale(code){var locales=this.locales;if(locales[code]){return locales[code];}
return locales[code]=new Locale(code,this);};function negotiate(available,requested,defaultLocale){var supportedLocale;for(var i=0;i<requested.length;i++){var locale=requested[i];if(available.indexOf(locale)!==-1){supportedLocale=locale;break;}}
if(!supportedLocale||supportedLocale===defaultLocale){return[defaultLocale];}
return[supportedLocale,defaultLocale];}
function freeze(supported){var locale=this.getLocale(supported[0]);if(locale.isReady){setReady.call(this,supported);}else{locale.build(setReady.bind(this,supported));}}
function setReady(supported){this.supportedLocales=supported;this.isReady=true;this._emitter.emit('ready');}
Context.prototype.registerLocales=function(defLocale,available){if(defLocale){this.defaultLocale=defLocale;}
this.availableLocales=[this.defaultLocale];this.qps=Object.keys(PSEUDO);if(available){for(var i=0,loc;loc=available[i];i++){if(this.availableLocales.indexOf(loc)===-1){this.availableLocales.push(loc);var pos=this.qps.indexOf(loc);if(pos!==-1){this.qps.splice(pos,1);}}}}};Context.prototype.requestLocales=function requestLocales(){if(this.isLoading&&!this.isReady){throw new L10nError('Context not ready');}
this.isLoading=true;var requested=Array.prototype.slice.call(arguments);if(requested.length===0){throw new L10nError('No locales requested');}
var supported=negotiate(this.availableLocales.concat(this.qps),requested,this.defaultLocale);if(this.supportedLocales[0]!==supported[0]){freeze.call(this,supported);}};Context.prototype.addEventListener=function(type,listener){this._emitter.addEventListener(type,listener);};Context.prototype.removeEventListener=function(type,listener){this._emitter.removeEventListener(type,listener);};Context.prototype.ready=function(callback){if(this.isReady){setTimeout(callback);}
this.addEventListener('ready',callback);};Context.prototype.once=function(callback){if(this.isReady){setTimeout(callback);return;}
var callAndRemove=(function(){this.removeEventListener('ready',callAndRemove);callback();}).bind(this);this.addEventListener('ready',callAndRemove);};var allowed={elements:['a','em','strong','small','s','cite','q','dfn','abbr','data','time','code','var','samp','kbd','sub','sup','i','b','u','mark','ruby','rt','rp','bdi','bdo','span','br','wbr'],attributes:{global:['title','aria-label','aria-valuetext','aria-moz-hint'],a:['download'],area:['download','alt'],input:['alt','placeholder'],menuitem:['label'],menu:['label'],optgroup:['label'],option:['label'],track:['label'],img:['alt'],textarea:['placeholder'],th:['abbr']}};var rtlList=['ar','he','fa','ps','ar-x-psbidi','ur'];var nodeObserver=null;var pendingElements=null;var moConfig={attributes:true,characterData:false,childList:true,subtree:true,attributeFilter:['data-l10n-id','data-l10n-args']};navigator.mozL10n={ctx:null,get:function get(id,ctxdata){return navigator.mozL10n.ctx.get(id,ctxdata);},formatValue:function(id,ctxdata){return navigator.mozL10n.ctx.formatValue(id,ctxdata);},formatEntity:function(id,ctxdata){return navigator.mozL10n.ctx.formatEntity(id,ctxdata);},translateFragment:function(fragment){return translateFragment.call(navigator.mozL10n,fragment);},setAttributes:setL10nAttributes,getAttributes:getL10nAttributes,ready:function ready(callback){return navigator.mozL10n.ctx.ready(callback);},once:function once(callback){return navigator.mozL10n.ctx.once(callback);},get readyState(){return navigator.mozL10n.ctx.isReady?'complete':'loading';},language:{set code(lang){navigator.mozL10n.ctx.requestLocales(lang);},get code(){return navigator.mozL10n.ctx.supportedLocales[0];},get direction(){return getDirection(navigator.mozL10n.ctx.supportedLocales[0]);}},qps:PSEUDO,_config:{appVersion:null,localeSources:Object.create(null),isPretranslated:false,},_getInternalAPI:function(){return{Error:L10nError,Context:Context,Locale:Locale,Resolver:Resolver,getPluralRule:getPluralRule,rePlaceables:rePlaceables,translateDocument:translateDocument,onMetaInjected:onMetaInjected,PropertiesParser:PropertiesParser,walkContent:walkContent,buildLocaleList:buildLocaleList};}};function getDirection(lang){return(rtlList.indexOf(lang)>=0)?'rtl':'ltr';}
var readyStates={loading:0,interactive:1,complete:2};function whenInteractive(callback){if(readyStates[document.readyState]>=readyStates.interactive){callback();return;}
document.addEventListener('readystatechange',function l10n_onrsc(){if(readyStates[document.readyState]>=readyStates.interactive){document.removeEventListener('readystatechange',l10n_onrsc);callback();}});}
function initObserver(){nodeObserver=new MutationObserver(onMutations.bind(navigator.mozL10n));nodeObserver.observe(document,moConfig);}
function init(pretranslate){if(!pretranslate){initObserver();}
initResources.call(navigator.mozL10n);}
function initResources(){var meta={};var nodes=document.head.querySelectorAll('link[rel="localization"],'+'meta[name="availableLanguages"],'+'meta[name="defaultLanguage"],'+'meta[name="appVersion"],'+'script[type="application/l10n"]');for(var i=0,node;node=nodes[i];i++){var type=node.getAttribute('rel')||node.nodeName.toLowerCase();switch(type){case'localization':this.ctx.resLinks.push(node.getAttribute('href'));break;case'meta':onMetaInjected.call(this,node,meta);break;case'script':onScriptInjected.call(this,node);break;}}
var additionalLanguagesPromise;if(navigator.mozApps&&navigator.mozApps.getAdditionalLanguages){additionalLanguagesPromise=navigator.mozApps.getAdditionalLanguages().catch(function(e){console.error('Error while loading getAdditionalLanguages',e);});document.addEventListener('additionallanguageschange',function(evt){registerLocales.call(this,meta,evt.detail);this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);}.bind(this));}else{additionalLanguagesPromise=Promise.resolve();}
additionalLanguagesPromise.then(function(extraLangs){registerLocales.call(this,meta,extraLangs);initLocale.call(this);}.bind(this));}
function registerLocales(meta,extraLangs){var locales=buildLocaleList.call(this,meta,extraLangs);navigator.mozL10n._config.localeSources=locales[1];this.ctx.registerLocales(locales[0],Object.keys(locales[1]));}
function getMatchingLangpack(appVersion,langpacks){for(var i=0,langpack;(langpack=langpacks[i]);i++){if(langpack.target===appVersion){return langpack;}}
return null;}
function buildLocaleList(meta,extraLangs){var loc,lp;var localeSources=Object.create(null);var defaultLocale=meta.defaultLanguage||this.ctx.defaultLocale;if(meta.availableLanguages){for(loc in meta.availableLanguages){localeSources[loc]='app';}}
if(extraLangs){for(loc in extraLangs){lp=getMatchingLangpack(this._config.appVersion,extraLangs[loc]);if(!lp){continue;}
if(!(loc in localeSources)||!meta.availableLanguages[loc]||parseInt(lp.revision)>meta.availableLanguages[loc]){localeSources[loc]='extra';}}}
if(!(defaultLocale in localeSources)){localeSources[defaultLocale]='app';}
return[defaultLocale,localeSources];}
function splitAvailableLanguagesString(str){var langs={};str.split(',').forEach(function(lang){lang=lang.trim().split(':');langs[lang[0]]=parseInt(lang[1]);});return langs;}
function onMetaInjected(node,meta){switch(node.getAttribute('name')){case'availableLanguages':meta.availableLanguages=splitAvailableLanguagesString(node.getAttribute('content'));break;case'defaultLanguage':meta.defaultLanguage=node.getAttribute('content');break;case'appVersion':navigator.mozL10n._config.appVersion=node.getAttribute('content');break;}}
function onScriptInjected(node){var lang=node.getAttribute('lang');var locale=this.ctx.getLocale(lang);locale.addAST(JSON.parse(node.textContent));}
function initLocale(){this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);window.addEventListener('languagechange',function l10n_langchange(){this.ctx.requestLocales.apply(this.ctx,navigator.languages||[navigator.language]);}.bind(this));}
function localizeMutations(mutations){var mutation;var targets=new Set();for(var i=0;i<mutations.length;i++){mutation=mutations[i];if(mutation.type==='childList'){var addedNode;for(var j=0;j<mutation.addedNodes.length;j++){addedNode=mutation.addedNodes[j];if(addedNode.nodeType!==Node.ELEMENT_NODE){continue;}
targets.add(addedNode);}}
if(mutation.type==='attributes'){targets.add(mutation.target);}}
targets.forEach(function(target){if(target.childElementCount){translateFragment.call(this,target);}else if(target.hasAttribute('data-l10n-id')){translateElement.call(this,target);}},this);}
function onMutations(mutations,self){self.disconnect();localizeMutations.call(this,mutations);self.observe(document,moConfig);}
function onReady(){if(!navigator.mozL10n._config.isPretranslated){translateDocument.call(this);}
navigator.mozL10n._config.isPretranslated=false;if(pendingElements){for(var i=0,element;element=pendingElements[i];i++){translateElement.call(this,element);}
pendingElements=null;}
if(!nodeObserver){initObserver();}
fireLocalizedEvent.call(this);}
function fireLocalizedEvent(){var event=new CustomEvent('localized',{'bubbles':false,'cancelable':false,'detail':{'language':this.ctx.supportedLocales[0]}});window.dispatchEvent(event);}
var reOverlay=/<|&#?\w+;/;var reHtml=/[&<>]/g;var htmlEntities={'&':'&amp;','<':'&lt;','>':'&gt;',};function translateDocument(){document.documentElement.lang=this.language.code;document.documentElement.dir=this.language.direction;translateFragment.call(this,document.documentElement);}
function translateFragment(element){if(typeof element.hasAttribute==='function'&&element.hasAttribute('data-l10n-id')){translateElement.call(this,element);}
var nodes=getTranslatableChildren(element);for(var i=0;i<nodes.length;i++){translateElement.call(this,nodes[i]);}}
function setL10nAttributes(element,id,args){element.setAttribute('data-l10n-id',id);if(args){element.setAttribute('data-l10n-args',JSON.stringify(args));}}
function getL10nAttributes(element){return{id:element.getAttribute('data-l10n-id'),args:JSON.parse(element.getAttribute('data-l10n-args'))};}
function getTranslatableChildren(element){return element?element.querySelectorAll('*[data-l10n-id]'):[];}
function camelCaseToDashed(string){if(string==='ariaValueText'){return'aria-valuetext';}
return string.replace(/[A-Z]/g,function(match){return'-'+match.toLowerCase();}).replace(/^-/,'');}
function escapeL10nArgs(match){return htmlEntities[match];}
function translateElement(element){if(!this.ctx.isReady){if(!pendingElements){pendingElements=[];}
pendingElements.push(element);return;}
var l10nId=element.getAttribute('data-l10n-id');if(!l10nId){return false;}
var l10nArgs=element.getAttribute('data-l10n-args');var entity=this.ctx.getEntity(l10nId,l10nArgs?JSON.parse(l10nArgs.replace(reHtml,escapeL10nArgs)):undefined);var value=entity.value;if(typeof value==='string'){if(!reOverlay.test(value)){element.textContent=value;}else{var translation=element.ownerDocument.createElement('template');translation.innerHTML=value;overlayElement(element,translation.content);}}
for(var key in entity.attrs){var attrName=camelCaseToDashed(key);if(isAttrAllowed({name:attrName},element)){element.setAttribute(attrName,entity.attrs[key]);}}}
function overlayElement(sourceElement,translationElement){var result=translationElement.ownerDocument.createDocumentFragment();var k,attr;var childElement;while((childElement=translationElement.childNodes[0])){translationElement.removeChild(childElement);if(childElement.nodeType===Node.TEXT_NODE){result.appendChild(childElement);continue;}
var index=getIndexOfType(childElement);var sourceChild=getNthElementOfType(sourceElement,childElement,index);if(sourceChild){overlayElement(sourceChild,childElement);result.appendChild(sourceChild);continue;}
if(isElementAllowed(childElement)){var sanitizedChild=childElement.ownerDocument.createElement(childElement.nodeName);overlayElement(sanitizedChild,childElement);result.appendChild(sanitizedChild);continue;}
result.appendChild(document.createTextNode(childElement.textContent));}
sourceElement.textContent='';sourceElement.appendChild(result);if(translationElement.attributes){for(k=0,attr;(attr=translationElement.attributes[k]);k++){if(isAttrAllowed(attr,sourceElement)){sourceElement.setAttribute(attr.name,attr.value);}}}}
function isElementAllowed(element){return allowed.elements.indexOf(element.tagName.toLowerCase())!==-1;}
function isAttrAllowed(attr,element){var attrName=attr.name.toLowerCase();var tagName=element.tagName.toLowerCase();if(allowed.attributes.global.indexOf(attrName)!==-1){return true;}
if(!allowed.attributes[tagName]){return false;}
if(allowed.attributes[tagName].indexOf(attrName)!==-1){return true;}
if(tagName==='input'&&attrName==='value'){var type=element.type.toLowerCase();if(type==='submit'||type==='button'||type==='reset'){return true;}}
return false;}
function getNthElementOfType(context,element,index){var nthOfType=0;for(var i=0,child;child=context.children[i];i++){if(child.nodeType===Node.ELEMENT_NODE&&child.tagName===element.tagName){if(nthOfType===index){return child;}
nthOfType++;}}
return null;}
function getIndexOfType(element){var index=0;var child;while((child=element.previousElementSibling)){if(child.tagName===element.tagName){index++;}}
return index;}
var DEBUG=false;navigator.mozL10n.ctx=new Context(window.document?document.URL:null);navigator.mozL10n.ctx.ready(onReady.bind(navigator.mozL10n));navigator.mozL10n.ctx.addEventListener('notfounderror',function reportMissingEntity(e){if(DEBUG||e.loc==='en-US'){console.warn(e.toString());}});if(DEBUG){navigator.mozL10n.ctx.addEventListener('fetcherror',console.error.bind(console));navigator.mozL10n.ctx.addEventListener('parseerror',console.error.bind(console));navigator.mozL10n.ctx.addEventListener('resolveerror',console.error.bind(console));}
if(window.document){navigator.mozL10n._config.isPretranslated=document.documentElement.lang===navigator.language;var forcePretranslate=!navigator.mozL10n._config.isPretranslated;whenInteractive(init.bind(navigator.mozL10n,forcePretranslate));}
document.l10n={setAttributes:navigator.mozL10n.setAttributes,getAttributes:navigator.mozL10n.getAttributes,formatValue:function(id,args){return navigator.mozL10n.formatValue(id,args);},translateFragment:function(frag){return Promise.resolve(navigator.mozL10n.translateFragment(frag));},ready:new Promise(function(resolve){navigator.mozL10n.once(resolve);}),formatValues:function(){var keys=arguments;var resp=keys.map(function(key){if(Array.isArray(key)){return navigator.mozL10n.formatValue(key[0],key[1]);}
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var SettingsListener={_lock:null,_observers:[],getSettingsLock:function sl_getSettingsLock(){if(this._lock&&!this._lock.closed){return this._lock;}
var settings=window.navigator.mozSettings;return(this._lock=settings.createLock());},observe:function sl_observe(name,defaultValue,callback){var settings=window.navigator.mozSettings;if(!settings){window.setTimeout(function(){callback(defaultValue);});return;}
var req;try{req=this.getSettingsLock().get(name);}catch(e){console.warn('Stale lock in settings_listener.js.','See https://bugzilla.mozilla.org/show_bug.cgi?id=793239');this._lock=null;req=this.getSettingsLock().get(name);}
req.addEventListener('success',(function onsuccess(){callback(typeof(req.result[name])!='undefined'?req.result[name]:defaultValue);}));var settingChanged=function settingChanged(evt){callback(evt.settingValue);};settings.addObserver(name,settingChanged);this._observers.push({name:name,callback:callback,observer:settingChanged});},unobserve:function sl_unobserve(name,callback){var settings=window.navigator.mozSettings;var that=this;this._observers.forEach(function(value,index){if(value.name===name&&value.callback===callback){settings.removeObserver(name,value.observer);that._observers.splice(index,1);}});}};;'use strict';(function(exports){var iceContactsDetails=[],iceContactsBar,contactListOverlay,contactInOverlay,contactList,contactListCancel;function init(){if(ICEContacts._initialized){return;}
iceContactsBar=document.getElementById('ice-contacts-bar');contactListOverlay=document.getElementById('contact-list-overlay');contactInOverlay=document.getElementById('contact-in-overlay');LazyLoader.load([contactListOverlay],function(){var contactListOverlayHeader=contactListOverlay.querySelector('header');contactListOverlayHeader.dataset.l10nId='ice-contacts-overlay-title';contactList=document.getElementById('contact-list');contactListCancel=document.getElementById('contact-list-overlay-cancel');iceContactsBar.addEventListener('click',showICEContactOverlay);contactListCancel.addEventListener('click',hideICEContactOverlay);ICEContacts._initialized=true;});}
function showICEContactsBar(){iceContactsBar.removeAttribute('hidden');}
function showICEContactOverlay(){contactListOverlay.classList.add('display');}
function hideICEContactOverlay(){contactListOverlay.classList.remove('display');}
function callICEContact(number){hideICEContactOverlay();CallHandler.call(number);}
function findContact(iceContact){return new Promise(function(resolve){var contactFilter={filterBy:['id'],filterValue:iceContact,filterOp:'equals',filterLimit:1};var contactRequest=navigator.mozContacts.find(contactFilter);contactRequest.onsuccess=function(){var contact=this.result[0];if(contact&&contact.tel){iceContactsDetails.push(contact);}
resolve(contact);};});}
function addContactToOverlay(contact){return new Promise(function(resolve){if(!contact||!contact.tel){resolve();return;}
contact.tel.forEach(function(tel){var iceContactOverlayEntry=contactInOverlay.cloneNode(true);iceContactOverlayEntry.removeAttribute('id');iceContactOverlayEntry.removeAttribute('hidden');iceContactOverlayEntry.querySelector('.js-name').textContent=contact.name[0];iceContactOverlayEntry.querySelector('.js-tel-type').dataset.l10nId=tel.type[0];iceContactOverlayEntry.querySelector('.js-tel').textContent=tel.value;contactList.insertBefore(iceContactOverlayEntry,contactListCancel);iceContactOverlayEntry.addEventListener('click',callICEContact.bind(null,tel.value));showICEContactsBar();});resolve();});}
function updateICEContacts(){init();return new Promise(function(resolve){LazyLoader.load([contactInOverlay],function(){ICEStore.getContacts().then(function(iceContacts){if(!iceContacts||!iceContacts.length){resolve();}else{var promises=[];iceContacts.forEach(function(iceContact){promises.push(findContact(iceContact).then(addContactToOverlay));});Promise.all(promises).then(resolve);}});});});}
function isFromICEContact(number){return iceContactsDetails.some(function(iceContact){return iceContact.tel.some(function(tel){return number==tel.value;});});}
var ICEContacts={_initialized:false,updateICEContacts:updateICEContacts,isFromICEContact:isFromICEContact};exports.ICEContacts=ICEContacts;})(window);;'use strict';var kFontStep=4;var minFontSize=12;var gTonesFrequencies={'1':[697,1209],'2':[697,1336],'3':[697,1477],'4':[770,1209],'5':[770,1336],'6':[770,1477],'7':[852,1209],'8':[852,1336],'9':[852,1477],'*':[941,1209],'0':[941,1336],'#':[941,1477]};var KeypadManager={_phoneNumber:'',_onCall:false,_keypadSoundIsEnabled:false,_shortTone:false,_vibrationEnabled:false,kVibrationDuration:50,_insertPosition:null,get phoneNumberView(){delete this.phoneNumberView;this.phoneNumberView=document.getElementById('phone-number-view');return this.phoneNumberView;},get fakePhoneNumberView(){delete this.fakePhoneNumberView;this.fakePhoneNumberView=document.getElementById('fake-phone-number-view');return this.fakePhoneNumberView;},get phoneNumberViewContainer(){delete this.phoneNumberViewContainer;this.phoneNumberViewContainer=document.getElementById('phone-number-view-container');return this.phoneNumberViewContainer;},get keypad(){delete this.keypad;this.keypad=document.getElementById('keypad');return this.keypad;},get callBar(){delete this.callBar;this.callBar=document.getElementById('keypad-callbar');return this.callBar;},get hideBar(){delete this.hideBar;this.hideBar=document.getElementById('keypad-hidebar');return this.hideBar;},get callBarAddContact(){delete this.callBarAddContact;this.callBarAddContact=document.getElementById('keypad-callbar-add-contact');return this.callBarAddContact;},get callBarCallAction(){delete this.callBarCallAction;this.callBarCallAction=document.getElementById('keypad-callbar-call-action');return this.callBarCallAction;},get callBarCancelAction(){delete this.callBarCancelAction;this.callBarCancelAction=document.getElementById('keypad-callbar-cancel');return this.callBarCancelAction;},get deleteButton(){delete this.deleteButton;this.deleteButton=document.getElementById('keypad-delete');return this.deleteButton;},get hideBarHangUpAction(){delete this.hideBarHangUpAction;this.hideBarHangUpAction=document.getElementById('keypad-hidebar-hang-up-action-wrapper');return this.hideBarHangUpAction;},get hideBarHideAction(){delete this.hideBarHideAction;this.hideBarHideAction=document.getElementById('keypad-hidebar-hide-keypad-action');return this.hideBarHangAction;},init:function kh_init(oncall){this._onCall=!!oncall;this._lastPressedKey=null;var defaultFontSize=window.getComputedStyle(document.body,null).getPropertyValue('font-size');minFontSize=parseInt(parseInt(defaultFontSize)*10*0.226);this.phoneNumberView.value='';this.phoneNumberView.addEventListener('click',this._updateInsertPosition.bind(this));this._phoneNumber='';var keyHandler=this.keyHandler.bind(this);this.keypad.addEventListener('touchstart',keyHandler,true);this.keypad.addEventListener('touchmove',keyHandler,true);this.keypad.addEventListener('touchend',keyHandler,true);this.keypad.addEventListener('touchcancel',keyHandler,true);this.deleteButton.addEventListener('touchstart',keyHandler);this.deleteButton.addEventListener('touchend',keyHandler);if(this.callBarAddContact){this.callBarAddContact.addEventListener('mouseup',this.addContact.bind(this));}
if(this.callBarCallAction){this.callBarCallAction.addEventListener('mouseup',this.makeCall.bind(this));}
if(this.callBarCancelAction){this.callBarCancelAction.addEventListener('mouseup',function(){window.close();});}
if(this.hideBarHideAction){this.hideBarHideAction.addEventListener('mouseup',this.callbarBackAction);}
if(this.hideBarHangUpAction){this.hideBarHangUpAction.addEventListener('mouseup',this.hangUpCallFromKeypad);}
TonePlayer.init('system');this.render();this._observePreferences();},render:function hk_render(layoutType){if(layoutType=='oncall'){this._onCall=true;var numberNode=window.CallScreen.activeCall.querySelector('.number');this._phoneNumber=numberNode.textContent;this._isKeypadClicked=false;this.phoneNumberViewContainer.classList.add('keypad-visible');if(this.callBar){this.callBar.classList.add('hide');}
if(this.hideBar){this.hideBar.classList.remove('hide');}
this.deleteButton.classList.add('hide');}else{this.phoneNumberViewContainer.classList.remove('keypad-visible');if(this.callBar){this.callBar.classList.remove('hide');}
if(this.hideBar){this.hideBar.classList.add('hide');}
this.deleteButton.classList.remove('hide');}},phoneNumber:function hk_phoneNumber(){return this._phoneNumber;},makeCall:function hk_makeCall(event){event.stopPropagation();if(this._phoneNumber!==''){window.CallHandler.call(KeypadManager._phoneNumber);}},addContact:function hk_addContact(event){var number=this._phoneNumber;if(!number){return;}
try{var activity=new window.MozActivity({name:'new',data:{type:'webcontacts/contact',params:{'tel':number}}});activity.onsuccess=function(){};activity.onerror=function(){};}catch(e){console.log('WebActivities unavailable? : '+e);}},callbarBackAction:function hk_callbarBackAction(event){window.CallScreen.hideKeypad();},hangUpCallFromKeypad:function hk_hangUpCallFromKeypad(event){window.CallScreen.views.classList.remove('show');window.OnCallHandler.end();},formatPhoneNumber:function kh_formatPhoneNumber(mode){var fakeView=null,view=null;switch(mode){case'dialpad':fakeView=this.fakePhoneNumberView;view=this.phoneNumberView;if(view.value===''){view.style.fontSize=view.dataset.size;return;}
break;case'on-call':fakeView=window.CallScreen.activeCall.querySelector('.fake-number');view=window.CallScreen.activeCall.querySelector('.number');break;}
var computedStyle=window.getComputedStyle(view,null);var currentFontSize=computedStyle.getPropertyValue('font-size');if(!('size'in view.dataset)){view.dataset.size=currentFontSize;}
var newFontSize=this.getNextFontSize(view,fakeView,parseInt(view.dataset.size),parseInt(currentFontSize));view.style.fontSize=newFontSize+'px';this.addEllipsis(view,fakeView,newFontSize);},addEllipsis:function kh_addEllipsis(view,fakeView,currentFontSize){var viewWidth=view.getBoundingClientRect().width;fakeView.style.fontSize=currentFontSize+'px';fakeView.textContent=view.value;var counter=1;var value=view.value;var newPhoneNumber;while(fakeView.getBoundingClientRect().width>viewWidth){newPhoneNumber='\u2026'+value.substr(-value.length+counter);fakeView.textContent=newPhoneNumber;counter++;}
if(newPhoneNumber){view.value=newPhoneNumber;}},getNextFontSize:function kh_getNextFontSize(view,fakeView,fontSize,initialFontSize){var viewWidth=view.getBoundingClientRect().width;fakeView.style.fontSize=fontSize+'px';fakeView.textContent=view.value;var rect=fakeView.getBoundingClientRect();while((rect.width>viewWidth)&&(fontSize>minFontSize)){fontSize=Math.max(fontSize-kFontStep,minFontSize);fakeView.style.fontSize=fontSize+'px';rect=fakeView.getBoundingClientRect();}
if((rect.width<viewWidth)&&(fontSize<initialFontSize)){fakeView.style.fontSize=(fontSize+kFontStep)+'px';rect=fakeView.getBoundingClientRect();if(rect.width<=viewWidth){fontSize+=kFontStep;}}
return fontSize;},_lastPressedKey:null,_dtmfTone:null,_playDtmfTone:function kh_playDtmfTone(key){var serviceId=0;if(!this._onCall){return;}
if(telephony.active){serviceId=telephony.active.serviceId;}
if(this._dtmfTone){this._dtmfTone.stop();this._dtmfTone=null;}
this._dtmfTone=new DtmfTone(key,this._shortTone,serviceId);this._dtmfTone.play();},_stopDtmfTone:function kh_stopDtmfTone(){if(!this._dtmfTone){return;}
this._dtmfTone.stop();this._dtmfTone=null;},_touchStart:function kh_touchStart(key){this._longPress=false;this._lastPressedKey=key;if(key!='delete'){if(this._keypadSoundIsEnabled){TonePlayer.start(gTonesFrequencies[key],!this._onCall||this._shortTone);}
if(this._vibrationEnabled){navigator.vibrate(this.kVibrationDuration);}
this._playDtmfTone(key);}
if((key=='0'&&!this._onCall)||key=='delete'){this._holdTimer=setTimeout(function(self){self.restoreCaretPosition();if(key=='delete'){self._clearPhoneNumber();}else if(key==='0'){self._replaceLastKey('+');}else if(key==='*'){var isAtTheEnd=self._insertPosition===null;var isFirst=self._insertPosition===1||(isAtTheEnd&&self._phoneNumber.length===1);if(!isFirst){self._replaceLastKey(',');}else{self._deleteAtInsertPosition();}}
self._longPress=true;self._updatePhoneNumberView();},400,this);}
if(key=='delete'){this._deleteAtInsertPosition();}else if(this.phoneNumberViewContainer.classList.contains('keypad-visible')){if(!this._isKeypadClicked){this._isKeypadClicked=true;this._phoneNumber=key;}else{this._insertAtCaret(key);}}else{this._insertAtCaret(key);}
setTimeout(function(self){self._updatePhoneNumberView();},0,this);},_touchMove:function kh_touchMove(touch){var target=document.elementFromPoint(touch.pageX,touch.pageY);var key=target.dataset?target.dataset.value:null;if(key!==this._lastPressedKey||key==='delete'){this._stopDtmfTone();this._lastPressedKey=null;}},_touchEnd:function kh_touchEnd(key){this._lastPressedKey=null;if(key!=='delete'){this._stopDtmfTone();}
if(this._keypadSoundIsEnabled){TonePlayer.stop();}
this.restoreCaretPosition();if(this._longPress){this._longPress=false;this._holdTimer=null;this.restoreCaretPosition();return;}
if(this._holdTimer){clearTimeout(this._holdTimer);}},keyHandler:function kh_keyHandler(event){event.preventDefault();var key=event.target.dataset.value;if(!key){return;}
event.stopPropagation();switch(event.type){case'touchstart':if(this._lastPressedKey){return;}
event.target.classList.add('active');this._touchStart(key);break;case'touchmove':this._touchMove(event.touches[0]);break;case'touchend':case'touchcancel':if(key!==this._lastPressedKey){return;}
event.target.classList.remove('active');this._touchEnd(key);break;}},updatePhoneNumber:function kh_updatePhoneNumber(number){this._phoneNumber=number;this._updatePhoneNumberView();},_updatePhoneNumberView:function kh_updatePhoneNumberview(){var phoneNumber=this._phoneNumber;var visibility=(phoneNumber.length>0)?'visible':'hidden';this.deleteButton.style.visibility=visibility;this.phoneNumberView.blur();if(this._onCall){var view=window.CallScreen.activeCall.querySelector('.number');view.textContent=phoneNumber;this.formatPhoneNumber('on-call');}else{this.phoneNumberView.value=phoneNumber;this.formatPhoneNumber('dialpad');}},_observePreferences:function kh_observePreferences(){var self=this;LazyLoader.load('/shared/js/settings_listener.js',function(){SettingsListener.observe('phone.ring.keypad',false,function(value){self._keypadSoundIsEnabled=!!value;});SettingsListener.observe('phone.dtmf.type','long',function(value){self._shortTone=(value==='short');});SettingsListener.observe('keyboard.vibration',false,function(value){self._vibrationEnabled=!!value;});});},_updateInsertPosition:function kh_updateInsertPosition(){this._insertPosition=this._realStartPosition();},_deleteAtInsertPosition:function kh_deleteAtInsertPosition(){if(this._insertPosition===null){this._phoneNumber=this._phoneNumber.slice(0,-1);}else{var start=this._realStartPosition();var end=this._realEndPosition();if(start>0&&start===end){start=end-1;}
this._phoneNumber=this._phoneNumber.substring(0,start)+
this._phoneNumber.substring(end);this._insertPosition=this._phoneNumber?start:null;}},_clearPhoneNumber:function kh_clearPhoneNumber(){if(this._insertPosition===null){this._phoneNumber='';}else{var start=this._realStartPosition();this._phoneNumber=this._phoneNumber.substring(start);this._insertPosition=this._phoneNumber?0:null;}},restoreCaretPosition:function kh_restoreCaretPosition(){if(this._insertPosition!==null){var caretPosition=this._caretPosition(this._insertPosition);this.phoneNumberView.selectionStart=caretPosition;this.phoneNumberView.selectionEnd=caretPosition;this.phoneNumberView.focus();}else{this.phoneNumberView.blur();}},_realStartPosition:function kh_realStartPosition(){var start=this.phoneNumberView.selectionStart;return this._realPosition(this.phoneNumberView,start);},_realEndPosition:function kh_realEndPosition(){var end=this.phoneNumberView.selectionEnd;return this._realPosition(this.phoneNumberView,end);},_caretPosition:function kh_caretPosition(realPosition){return realPosition-this._ellipsisOffset(this.phoneNumberView);},_realPosition:function kh_realPosition(input,position){return position+this._ellipsisOffset(this.phoneNumberView);},_ellipsisOffset:function kh_ellipsisOffset(input){var ellipsedCharacters=+input.dataset.ellipsedCharacters;return ellipsedCharacters?(ellipsedCharacters-1):0;},_replaceLastKey:function kh_replaceLastKey(newKey){this._deleteAtInsertPosition();this.restoreCaretPosition();this._insertAtCaret(newKey);},_insertAtCaret:function kh_insertAtCaret(key){if(this._insertPosition===null){this._phoneNumber+=key;}else{var start=this._realStartPosition();var end=this._realEndPosition();this._phoneNumber=this._phoneNumber.substring(0,start)+key+
this._phoneNumber.substring(end);this._insertPosition=start+1;}}};navigator.mozL10n&&navigator.mozL10n.once(function onL10nInit(){document.body.classList.remove('hidden');});;'use strict';var CallHandler={_telephony:window.navigator.mozTelephony,call:function(number){var sanitizedNumber=number.replace(/-/g,''),self=this;if(ICEContacts.isFromICEContact(number)){LazyLoader.load(['/shared/js/sim_settings_helper.js'],function(){SimSettingsHelper.getCardIndexFrom('outgoingCall',function(defaultCardIndex){if(defaultCardIndex===SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE){LazyLoader.load(['/shared/js/component_utils.js','/shared/elements/gaia_sim_picker/script.js'],function(){var simPicker=document.getElementById('sim-picker');simPicker.getOrPick(defaultCardIndex,number,function(ci){var callPromise=self._telephony.dial(number,ci);self._handleCallPromise(callPromise,sanitizedNumber);});});}else{var callPromise=self._telephony.dial(number,defaultCardIndex);self._handleCallPromise(callPromise,sanitizedNumber);}});});}else{var callPromise=self._telephony.dialEmergency(sanitizedNumber);self._handleCallPromise(callPromise,sanitizedNumber);}},_handleCallPromise:function(callPromise,sanitizedNumber){var self=this;callPromise.then(function(call){self._installHandlers(call,sanitizedNumber);}).catch(function(errorName){LazyLoader.load(['/shared/js/dialer/telephony_messages.js'],function(){TelephonyMessages.handleError(errorName,sanitizedNumber,TelephonyMessages.EMERGENCY_ONLY);});});},_installHandlers:function(call,number){function clearPhoneView(){KeypadManager.updatePhoneNumber('');}
if(call){call.onconnected=clearPhoneView;call.ondisconnected=function callEnded(evt){LazyLoader.load(['/shared/js/dialer/telephony_messages.js'],function(){TelephonyMessages.handleDisconnect(evt.call.disconnectedReason,number,TelephonyMessages.EMERGENCY_ONLY);});clearPhoneView();};}},};window.CallHandler=CallHandler;window.addEventListener('load',function onload(){if(navigator.mozAudioChannelManager){navigator.mozAudioChannelManager.volumeControlChannel='notification';}
window.removeEventListener('load',onload);window.ICEContacts.updateICEContacts();window.KeypadManager.init(false);});;window.COMPONENTS_BASE_URL='/shared/elements/';