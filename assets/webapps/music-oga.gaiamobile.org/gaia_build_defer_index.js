;;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;'use strict';var MediaDB=(function(){function MediaDB(mediaType,metadataParser,options){this.mediaType=mediaType;this.metadataParser=metadataParser;if(!options){options={};}
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
return MediaDB;}());;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;;(function(exports){'use strict';var FontSizeUtils={_cachedContexts:{},_getCachedContext:function(fontSize,fontFamily,fontStyle){fontStyle=fontStyle||'italic';var cache=this._cachedContexts;var ctx=cache[fontSize]&&cache[fontSize][fontFamily]?cache[fontSize][fontFamily][fontStyle]:null;if(!ctx){var canvas=document.createElement('canvas');canvas.setAttribute('moz-opaque','true');canvas.setAttribute('width','1');canvas.setAttribute('height','1');ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font=fontStyle+' '+fontSize+'px '+fontFamily;if(!cache[fontSize]){cache[fontSize]={};}
if(!cache[fontSize][fontFamily]){cache[fontSize][fontFamily]={};}
cache[fontSize][fontFamily][fontStyle]=ctx;}
return ctx;},resetCache:function(){this._cachedContexts={};},getFontWidth:function(string,fontSize,fontFamily,fontStyle){var ctx=this._getCachedContext(fontSize,fontFamily,fontStyle);return ctx.measureText(string).width;},getMaxFontSizeInfo:function(string,allowedSizes,fontFamily,maxWidth){var fontSize;var resultWidth;var i=allowedSizes.length-1;do{fontSize=allowedSizes[i];resultWidth=this.getFontWidth(string,fontSize,fontFamily);i--;}while(resultWidth>maxWidth&&i>=0);return{fontSize:fontSize,overflow:resultWidth>maxWidth,textWidth:resultWidth};},_overflowCountCache:-1,getOverflowCount:function(string,fontSize,fontFamily,maxWidth){var substring;var resultWidth;var overflowCount=-1;if(string.length>this._overflowCountCache){substring=string.substr(0,string.length-this._overflowCountCache);resultWidth=this.getFontWidth(substring,fontSize,fontFamily);if(resultWidth>maxWidth){overflowCount=this._overflowCountCache;}}
do{overflowCount++;substring=string.substr(0,string.length-overflowCount);resultWidth=this.getFontWidth(substring,fontSize,fontFamily);}while(substring.length>0&&resultWidth>maxWidth);this._overflowCountCache=overflowCount;return overflowCount;},getContentWidth:function(style){var width=parseInt(style.width,10);if(style.boxSizing==='border-box'){width-=(parseInt(style.paddingRight,10)+
parseInt(style.paddingLeft,10));}
return width;},getStyleProperties:function(element){var style=window.getComputedStyle(element);var contentWidth=this.getContentWidth(style);if(isNaN(contentWidth)){contentWidth=0;}
return{fontFamily:style.fontFamily,contentWidth:contentWidth,paddingRight:parseInt(style.paddingRight,10),paddingLeft:parseInt(style.paddingLeft,10),offsetLeft:element.offsetLeft};},getWindowWidth:function(){return window.innerWidth;}};exports.FontSizeUtils=FontSizeUtils;}(this));;'use strict';(function(exports){var AccessibilityHelper={setAriaSelected:function ah_setAriaSelected(selectedTab,tabs){Array.prototype.forEach.call(tabs,function setAriaSelectedAttr(tab){tab.setAttribute('aria-selected',tab===selectedTab?'true':'false');});}};exports.AccessibilityHelper=AccessibilityHelper;})(window);;;this.asyncStorage=(function(){'use strict';var DBNAME='asyncStorage';var DBVERSION=1;var STORENAME='keyvaluepairs';var db=null;function withDatabase(f){if(db){f();}else{var openreq=indexedDB.open(DBNAME,DBVERSION);openreq.onerror=function withStoreOnError(){console.error('asyncStorage: can\'t open database:',openreq.error.name);};openreq.onupgradeneeded=function withStoreOnUpgradeNeeded(){openreq.result.createObjectStore(STORENAME);};openreq.onsuccess=function withStoreOnSuccess(){db=openreq.result;f();};}}
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
return{getItem:getItem,setItem:setItem,removeItem:removeItem,clear:clear,length:length,key:key};}());;;(function(exports){'use strict';var ImageUtils=exports.ImageUtils={};const JPEG='image/jpeg';const PNG='image/png';const GIF='image/gif';const BMP='image/bmp';ImageUtils.JPEG=JPEG;ImageUtils.PNG=PNG;ImageUtils.GIF=GIF;ImageUtils.BMP=BMP;ImageUtils.getSizeAndType=function getSizeAndType(imageBlob){if(!(imageBlob instanceof Blob)){console.log('not blob');return Promise.reject(new TypeError('argument is not a Blob'));}
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
exports.Downsample={sizeAtLeast:sizeAtLeast,sizeNoMoreThan:sizeNoMoreThan,areaAtLeast:areaAtLeast,areaNoMoreThan:areaNoMoreThan,NONE:NONE,MAX_SIZE_REDUCTION:1/fragments[fragments.length-1].dimensionScale,MAX_AREA_REDUCTION:1/fragments[fragments.length-1].areaScale};}(exports.ImageUtils));})(window);;'use strict';(function(exports){if(exports.ForwardLock){return;}
const mimeSubtype='vnd.mozilla.oma.drm.fl';const SECRET_SETTINGS_ID='oma.drm.forward_lock.secret.key';var secret=null;function xor(buffer,key){var words=new Uint32Array(buffer,0,buffer.byteLength>>2);for(var i=0,n=words.length;i<n;i++){words[i]^=key;}}
function lockBuffer(secret,content,type,metadata){var header='LOCKED 1 '+escape(type)+'\n';if(metadata){for(var p in metadata){header+=escape(p)+':'+escape(metadata[p])+'\n';}}
header+='\0';var buffer=new Uint8Array(new Uint8Array(content)).buffer;xor(buffer,secret);return new Blob([header,buffer],{type:type.split('/')[0]+'/'+mimeSubtype});}
function lockBlob(secret,blob,metadata,callback){var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){callback(lockBuffer(secret,reader.result,blob.type,metadata));};}
function unlockBlob(secret,blob,callback,errorCallback){if(!secret){return error('no secret supplied');}
var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){var buffer=reader.result;var bytes=new Uint8Array(buffer);var header='';var contentStart;for(var i=0;i<bytes.length;i++){if(bytes[i]===0){contentStart=i+1;break;}
header+=String.fromCharCode(bytes[i]);}
if(!header.startsWith('LOCKED')){return error('Bad magic number');}
if(header.substring(6,9)!==' 1 '){return error('Unsupported version number');}
if(!contentStart){return error('No content');}
var eol=header.indexOf('\n');if(eol===-1){return error('malformed header');}
var type=unescape(header.substring(9,eol).trim());var metadata={};var lines=header.substring(eol+1).split('\n');for(var j=0;j<lines.length;j++){var line=lines[j];if(!line){continue;}
var[key,value]=line.split(':');if(!key||!value){return error('malformed metadata');}
metadata[unescape(key)]=unescape(value);}
var content=buffer.slice(contentStart);xor(content,secret);var blob=new Blob([content],{type:type});try{callback(blob,metadata);}
catch(e){console.error('Exception in content callback',e);}};function error(msg){msg='LCKA.decrypt(): '+msg;if(errorCallback){try{errorCallback(msg);}
catch(e){console.error('Exception in error callback',e);}}
else{console.error(msg);}}}
function getKey(callback){try{if(secret!==null){report(secret);return;}
var lock=navigator.mozSettings.createLock();var getreq=lock.get(SECRET_SETTINGS_ID);getreq.onsuccess=function(){secret=getreq.result[SECRET_SETTINGS_ID]||null;report(secret);};getreq.onerror=function(){console.error('Error getting ForwardLock setting',getreq.error);report(null);};}
catch(e){console.error('Exception in ForwardLock.getKey():',e);report(null);}
function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getKey() callback',e);}}}}
function getOrCreateKey(callback){getKey(function(key){if(key!==null){report(key);return;}
secret=((Math.random()*0xFFFFFFFF)|0)+1;var setting={};setting[SECRET_SETTINGS_ID]=secret;var setreq=navigator.mozSettings.createLock().set(setting);setreq.onsuccess=function(){report(secret);};setreq.onerror=function(){console.error('Failed to set key in ForwardLock.getOrCreateKey()',setreq.error.name);secret=null;};});function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getOrCreateKey() callback');}}}}
exports.ForwardLock={lockBuffer:lockBuffer,lockBlob:lockBlob,unlockBlob:unlockBlob,mimeSubtype:mimeSubtype,getKey:getKey,getOrCreateKey:getOrCreateKey};}(window));;(function(root,factory){'use strict';if(typeof define==='function'&&define.amd){define(factory);}else if(typeof exports==='object'){module.exports=factory();}else{root.Sanitizer=factory();}}(this,function(){'use strict';var Sanitizer={_entity:/[&<>"'/]/g,_entities:{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;','/':'&#x2F;'},getEntity:function(s){return Sanitizer._entities[s];},escapeHTML:function(strings,...values){var result='';for(var i=0;i<strings.length;i++){result+=strings[i];if(i<values.length){result+=String(values[i]).replace(Sanitizer._entity,Sanitizer.getEntity);}}
return result;},createSafeHTML:function(strings,...values){var escaped=Sanitizer.escapeHTML(strings,...values);return{__html:escaped,toString:function(){return'[object WrappedHTMLObject]';},info:'This is a wrapped HTML object. See https://developer.mozilla.or'+'g/en-US/Firefox_OS/Security/Security_Automation for more.'};},unwrapSafeHTML:function(...htmlObjects){var markupList=htmlObjects.map(function(obj){return obj.__html;});return markupList.join('');}};return Sanitizer;}));;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;'use strict';window.GaiaSubheader=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSubheaderBaseurl||'/shared/elements/gaia_subheader/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-subheader',{prototype:proto});})(window);;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;'use strict';function formatTime(secs){if(isNaN(secs)){return;}
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
image.src=url;};'use strict';var App=(function(){var app;var chromeInteractive=false;init();function init(){navigator.mozL10n.once(function onLocalizationInit(){window.performance.mark('navigationLoaded');Database.init();TitleBar.init();TabBar.init();setStartMode();navigator.mozL10n.ready(function(){ModeManager.updateTitle();if(!chromeInteractive){chromeInteractive=true;window.performance.mark('navigationInteractive');}});});}
function setStartMode(){if(document.URL.indexOf('#pick')!==-1){navigator.mozSetMessageHandler('activity',function activityHandler(a){var activityName=a.source.name;if(activityName==='pick'){document.body.classList.add('picker-mode');app.pendingPick=a;document.getElementById('overlay-cancel-button').addEventListener('click',function(){if(App.pendingPick){App.pendingPick.postError('pick cancelled');}});}
TabBar.option='title';ModeManager.start(MODE_PICKER);});}else{TitleBar.doneButton.parentNode.removeChild(TitleBar.doneButton);TabBar.option='mix';ModeManager.start(MODE_TILES);}}
function showOverlay(id){document.activeElement.blur();app.currentOverlay=id;function setVisibility(visible){Array.forEach(document.body.children,function(elt){if(elt.id==='overlay'){elt.classList.toggle('hidden',!visible);}else{elt.setAttribute('aria-hidden',visible);}});}
if(id===null){setVisibility(false);return;}
var menu=document.getElementById('overlay-menu');if(app.pendingPick){menu.classList.remove('hidden');}else{menu.classList.add('hidden');}
var l10nIds={'title':id+'-title','text':id+'-text'};if(id==='nocard'){l10nIds.title='nocard2-title';l10nIds.text='nocard3-text';}
var titleElement=document.getElementById('overlay-title');var textElement=document.getElementById('overlay-text');titleElement.dataset.l10nId=l10nIds.title;textElement.dataset.l10nId=l10nIds.text;setVisibility(true);}
function showCorrectOverlay(){if(app.knownSongs.length>0){if(app.currentOverlay==='empty'||app.currentOverlay==='upgrade'){app.showOverlay(null);}}else{app.showOverlay('empty');}}
function dbEnumerable(callback){if(app.currentOverlay==='upgrade'){app.showOverlay(null);}
refreshViews(function(){window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');TitleBar.view.removeAttribute('no-font-fit');document.getElementById('spinner').classList.add('hidden');setTimeout(function(){document.getElementById('spinner-overlay').classList.add('hidden');},100);if(document.URL.indexOf('#pick')===-1){setupCommunications();}
if(callback){callback();}});}
function setupCommunications(){var files=['shared/js/bluetooth_helper.js','shared/js/media/remote_controls.js','js/communications.js',];LazyLoader.load(files).then(()=>{MusicComms.init();});}
function dbReady(refresh,callback){if(app.currentOverlay==='nocard'||app.currentOverlay==='pluggedin'){app.showOverlay(null);}
if(refresh){refreshViews(callback);}else if(callback){callback();}}
function dbUnavailable(why){if(typeof PlayerView!=='undefined'){PlayerView.stop();}
if(!app.pendingPick){TabBar.option='mix';ModeManager.start(MODE_TILES,function(){TilesView.hideSearch();});}
if(why==='nocard'){app.showOverlay('nocard');}else if(why==='unmounted'){app.showOverlay('pluggedin');}}
var hidSearchBox=false;function refreshViews(callback){function showListView(){var option=TabBar.option;var info={key:'metadata.'+option,range:null,direction:(option==='title')?'next':'nextunique',option:option};ModeManager.waitForView(MODE_PICKER,()=>{ListView.activate(info);});}
if(app.pendingPick){showListView();if(callback){callback();}
return;}
if(ModeManager.currentMode===MODE_LIST&&TabBar.option!=='playlist'){showListView();}
ModeManager.waitForView(MODE_TILES,()=>{TilesView.activate(function(songs){TabBar.setDisabled(!songs.length);app.knownSongs=songs;app.showCorrectOverlay();if(app.currentOverlay===null&&!hidSearchBox){hidSearchBox=true;window.setTimeout(function(){TilesView.hideSearch();},1000);}
if(callback){callback();}});});}
app={pendingPick:null,currentOverlay:null,knownSongs:[],showOverlay:showOverlay,showCorrectOverlay:showCorrectOverlay,dbEnumerable:dbEnumerable,dbReady:dbReady,dbUnavailable:dbUnavailable,refreshViews:refreshViews};return app;})();;'use strict';var Database=(function(){var musicdb;function init(){var excludedFolders=['Ringtones','Notifications','Alarms'];var excludeFilter=new RegExp('^(/[^/]*/)?('+excludedFolders.join('|')+')/','i');musicdb=new MediaDB('music',metadataParserWrapper,{indexes:['metadata.album','metadata.artist','metadata.title','metadata.rated','metadata.played','date'],excludeFilter:excludeFilter,batchSize:1,autoscan:false,updateRecord:updateRecord,reparsedRecord:reparsedRecord,version:3});function metadataParserWrapper(file,onsuccess,onerror){var files=['/js/metadata_scripts.js','/js/metadata/album_art.js'];LazyLoader.load(files).then(()=>{return AudioMetadata.parse(file);}).then((metadata)=>{return AlbumArt.process(file,metadata);}).then(onsuccess,onerror);}
var startedReparsing=false;function updateRecord(record,oldVersion,newVersion){if(oldVersion===2){record.needsReparse=true;if(!startedReparsing){startedReparsing=true;App.showOverlay('upgrade');}}
return record.metadata;}
function reparsedRecord(oldMetadata,newMetadata){newMetadata.rated=oldMetadata.rated;newMetadata.played=oldMetadata.played;return newMetadata;}
musicdb.onupgrading=function(event){App.showOverlay('upgrade');};musicdb.onunavailable=function(event){var why;switch(event.detail){case MediaDB.NOCARD:why='nocard';break;case MediaDB.UNMOUNTED:why='unmounted';break;}
App.dbUnavailable(why);};musicdb.oncardremoved=function(){App.dbUnavailable('cardremoved');};musicdb.onenumerable=startupOnEnumerable;var refreshOnReady=false;function startupOnEnumerable(){App.dbEnumerable(function(){if(musicdb.state===MediaDB.READY){onReady();}else{musicdb.onready=onReady;}});}
function onReady(){App.dbReady(refreshOnReady,function(){musicdb.scan();});refreshOnReady=true;}
var filesDeletedWhileScanning=0;var filesFoundWhileScanning=0;var filesFoundBatch=0;var scanning=false;var SCAN_UPDATE_BATCH_SIZE=25;var DELETE_BATCH_TIMEOUT=500;var deleteTimer=null;var firstScanDone=false;musicdb.onscanstart=function(){scanning=true;filesFoundWhileScanning=0;filesFoundBatch=0;filesDeletedWhileScanning=0;};musicdb.onscanend=function(){scanning=false;TitleBar.hideScanProgress();if(filesFoundBatch>0||filesDeletedWhileScanning>0){filesFoundWhileScanning=0;filesFoundBatch=0;filesDeletedWhileScanning=0;App.refreshViews();}
if(!firstScanDone){firstScanDone=true;window.performance.mark('fullyLoaded');}};musicdb.oncreated=function(event){if(scanning){var metadata=event.detail[0].metadata;var n=event.detail.length;filesFoundWhileScanning+=n;filesFoundBatch+=n;TitleBar.showScanProgress({count:filesFoundWhileScanning,artist:metadata.artist,title:metadata.title});if(filesFoundBatch>SCAN_UPDATE_BATCH_SIZE){filesFoundBatch=0;App.refreshViews();}}
else{App.refreshViews();}};musicdb.ondeleted=function(event){if(scanning){filesDeletedWhileScanning+=event.detail.length;}
else{if(deleteTimer){clearTimeout(deleteTimer);}
deleteTimer=setTimeout(function(){deleteTimer=null;App.refreshViews();},DELETE_BATCH_TIMEOUT);}};}
function incrementPlayCount(fileinfo){fileinfo.metadata.played++;musicdb.updateMetadata(fileinfo.name,{played:fileinfo.metadata.played});}
function setSongRating(fileinfo,rated){fileinfo.metadata.rated=rated;musicdb.updateMetadata(fileinfo.name,{rated:fileinfo.metadata.rated});}
function getFile(fileinfo,decrypt=false){return new Promise((resolve,reject)=>{musicdb.getFile(fileinfo.name,(file)=>{if(file){resolve(file);}else{reject('unable to get file: '+fileinfo.name);}});}).then((blob)=>{if(!decrypt||!fileinfo.metadata.locked){return blob;}
return new Promise(function(resolve,reject){ForwardLock.getKey(function(secret){ForwardLock.unlockBlob(secret,blob,resolve,null,reject);});});});}
function enumerate(...args){return musicdb.enumerate(...args);}
function enumerateAll(...args){return musicdb.enumerateAll(...args);}
function advancedEnumerate(...args){return musicdb.advancedEnumerate(...args);}
function count(...args){return musicdb.count(...args);}
function search(key,query,callback){query=Normalizer.toAscii(query.toLocaleLowerCase());var direction=(key==='title')?'next':'nextunique';return musicdb.enumerate('metadata.'+key,null,direction,(result)=>{if(result===null){callback(result);return;}
var resultLowerCased=result.metadata[key].toLocaleLowerCase();if(Normalizer.toAscii(resultLowerCased).indexOf(query)!==-1){callback(result);}});}
function cancelEnumeration(handle){musicdb.cancelEnumeration(handle);}
return{init:init,incrementPlayCount:incrementPlayCount,setSongRating:setSongRating,getFile:getFile,enumerate:enumerate,enumerateAll:enumerateAll,advancedEnumerate:advancedEnumerate,count:count,search:search,cancelEnumeration:cancelEnumeration,get initialScanComplete(){return musicdb.initialScanComplete;}};})();;'use strict';var TitleBar={get view(){return document.getElementById('title');},get titleText(){return document.querySelector('#title-text bdi');},get playerIcon(){return document.getElementById('title-player');},get doneButton(){return document.getElementById('title-done');},get scanProgress(){return document.getElementById('scan-progress');},get scanSpinner(){return document.getElementById('scan-spinner');},get scanCount(){return document.getElementById('scan-count');},get scanArtist(){return document.getElementById('scan-artist');},get scanTitle(){return document.getElementById('scan-title');},init:function tb_init(){this.view.addEventListener('click',this);this.view.addEventListener('action',this.onActionBack);},changeTitleText:function tb_changeTitleText(content){this.titleText.textContent=content;},showBackArrow:function(show){if(show){this.view.setAttribute('action','back');}
else{this.view.removeAttribute('action');}},onActionBack:function(){if(App.pendingPick){if(ModeManager.currentMode===MODE_PICKER){App.pendingPick.postError('pick cancelled');return;}
PlayerView.stop();}
ModeManager.pop();},showScanProgress:function(info){this.scanProgress.classList.remove('hidden');this.scanSpinner.classList.remove('hidden');this.scanCount.textContent=info.count;this.scanArtist.textContent=info.artist||'';this.scanTitle.textContent=info.title||'';},hideScanProgress:function(){this.scanSpinner.classList.add('hidden');setTimeout(function(){this.scanProgress.classList.add('hidden');}.bind(this),100);},handleEvent:function tb_handleEvent(evt){var target=evt.target;function cleanupPick(){PlayerView.stop();}
switch(evt.type){case'click':if(!target){return;}
switch(target.id){case'title-player':if(PlayerView.isQueued){ModeManager.push(MODE_PLAYER);}
break;case'title-done':var currentFileInfo=PlayerView.currentFileInfo;LazyLoader.load('js/metadata/album_art_cache.js').then(()=>{return AlbumArtCache.getThumbnailBlob(currentFileInfo);}).then((picture)=>{var currentMetadata=currentFileInfo.metadata;var playingBlob=PlayerView.playingBlob;App.pendingPick.postResult({type:playingBlob.type,blob:playingBlob,name:currentMetadata.title||'',metadata:{title:currentMetadata.title,artist:currentMetadata.artist,album:currentMetadata.album,picture:picture}});cleanupPick();});break;}
break;default:return;}}};;'use strict';var TabBar={playlistArray:[{metadata:{l10nId:'playlists-shuffle-all'},option:'shuffleAll'},{metadata:{l10nId:'playlists-highest-rated'},option:'rated'},{metadata:{l10nId:'playlists-recently-added'},option:'date'},{metadata:{l10nId:'playlists-most-played'},option:'played'},{metadata:{l10nId:'playlists-least-played'},option:'played'},null],get view(){return document.getElementById('tabs');},get tabs(){return this.view.querySelectorAll('[role="tab"]');},set option(choice){var map={'mix':'tabs-mix','playlist':'tabs-playlists','artist':'tabs-artists','album':'tabs-albums','title':'tabs-songs'};var tab=document.getElementById(map[choice]);AccessibilityHelper.setAriaSelected(tab,this.tabs);this._option=choice;},get option(){return this._option;},init:function tab_init(){this.option='mix';this.view.addEventListener('touchend',this);},setDisabled:function tab_setDisabled(option){this.disabled=option;},handleEvent:function tab_handleEvent(evt){if(this.disabled){return;}
switch(evt.type){case'touchend':var target=evt.target;if(!target){return;}
if(this.option===target.dataset.option){return;}else{this.option=target.dataset.option;}
switch(target.id){case'tabs-mix':ListView.cancelEnumeration();ModeManager.start(MODE_TILES);TilesView.hideSearch();break;case'tabs-playlists':ModeManager.start(MODE_LIST,function(){ListView.activate();this.playlistArray.forEach(function(playlist){ListView.update(this.option,playlist);}.bind(this));}.bind(this));break;case'tabs-artists':case'tabs-albums':case'tabs-songs':var info={key:'metadata.'+this.option,range:null,direction:(this.option==='title')?'next':'nextunique',option:this.option};ModeManager.start(MODE_LIST,function(){ListView.activate(info);});break;}
break;default:return;}}};;'use strict';var MODE_TILES=1;var MODE_LIST=2;var MODE_SUBLIST=3;var MODE_PLAYER=4;var MODE_SEARCH_FROM_TILES=5;var MODE_SEARCH_FROM_LIST=6;var MODE_PICKER=7;var ModeManager={views:{1:{id:'views-tiles',paths:['js/ui/views/tiles_view.js']},2:{id:'views-list',paths:['js/ui/views/list_view.js']},3:{id:'views-sublist',paths:['js/ui/views/subList_view.js']},4:{id:'views-player',paths:['js/ui/views/player_view.js','js/queue.js']},5:{id:'views-search',paths:['js/ui/views/search_view.js','shared/js/text_normalizer.js']},6:{id:'views-search',paths:['js/ui/views/search_view.js','shared/js/text_normalizer.js']},7:{id:'views-list',paths:['js/ui/views/list_view.js']}},_modeStack:[],playerTitle:null,get currentMode(){return this._modeStack[this._modeStack.length-1];},get previousMode(){return this._modeStack[this._modeStack.length-2];},start:function(mode,callback){this._modeStack=[];this._resetViews();this._pushMode(mode,false,function(){this._modeStack=[mode];this._updateMode(callback);}.bind(this));},push:function(mode,callback){this._pushMode(mode,true,function(){this._modeStack.push(mode);this._updateMode(callback);}.bind(this));},pop:function(){if(this._modeStack.length<=1){return;}
this._popMode();this._modeStack.pop();this._updateMode();},_resetViews:function(){for(var mode in this.views){var sheet=document.getElementById(this.views[mode].id);sheet.classList.remove('animated');sheet.classList.remove('current');sheet.classList.add('next');}},waitForView:function(mode,callback){var view=this.views[mode];if(view.isLoaded){if(callback){callback(view);return;}}
LazyLoader.load(view.paths).then(()=>{if(view.isLoaded){return;}
var sheet=document.getElementById(view.id);sheet.classList.remove('hidden');switch(view.id){case'views-tiles':TilesView.init();break;case'views-list':ListView.init();break;case'views-sublist':SubListView.init();break;case'views-player':if(App.pendingPick){PlayerView.init(TYPE_SINGLE,false);}else{PlayerView.init(TYPE_LIST);}
break;case'views-search':SearchView.init();break;}
if(view.id==='views-player'){return PlaybackQueue.loadSettings();}}).then(()=>{view.isLoaded=true;if(callback){callback(view);}});},_pushMode:function(mode,animated,callback){this.waitForView(mode,(view)=>{var nextId=view.id;var currentId=this.currentMode?this.views[this.currentMode].id:null;var nextSheet=document.getElementById(nextId);var currentSheet=document.getElementById(currentId);if(nextSheet){nextSheet.classList.toggle('animated',animated);nextSheet.classList.remove('previous');nextSheet.classList.remove('next');nextSheet.classList.add('current');}
if(currentSheet){currentSheet.classList.toggle('animated',animated);currentSheet.classList.remove('current');currentSheet.classList.add('previous');}
if(callback){callback();}});},_popMode:function(callback){var currentId=this.views[this.currentMode].id;var previousId=this.views[this.previousMode].id;var currentSheet=document.getElementById(currentId);var previousSheet=document.getElementById(previousId);currentSheet.classList.remove('current');currentSheet.classList.add('next');previousSheet.classList.remove('previous');previousSheet.classList.add('current');if(callback){callback();}},_updateBackArrow:function(){var noBackArrow=[MODE_TILES,MODE_LIST,MODE_SEARCH_FROM_TILES,MODE_SEARCH_FROM_LIST];var hide=noBackArrow.indexOf(this.currentMode)>-1;TitleBar.showBackArrow(!hide);},updateTitle:function(){var title;switch(this.currentMode){case MODE_TILES:title=this.playerTitle||navigator.mozL10n.get('music');break;case MODE_LIST:case MODE_SUBLIST:switch(TabBar.option){case'playlist':title=navigator.mozL10n.get('playlists');break;case'artist':title=navigator.mozL10n.get('artists');break;case'album':title=navigator.mozL10n.get('albums');break;case'title':title=navigator.mozL10n.get('songs');break;}
break;case MODE_PLAYER:title=this.playerTitle||navigator.mozL10n.get('unknownTitle');break;case MODE_PICKER:title=navigator.mozL10n.get('picker-title');break;}
if(title){TitleBar.changeTitleText(title);}
TitleBar.view.hidden=this.currentMode===MODE_SEARCH_FROM_TILES||this.currentMode===MODE_SEARCH_FROM_LIST;},updatePlayerIcon:function(){var isPlayerMode=(this.currentMode===MODE_PLAYER);var isPlayerQueued=(this.views[MODE_PLAYER].isLoaded&&PlayerView.isQueued);TitleBar.playerIcon.hidden=isPlayerMode||!isPlayerQueued;if(App.pendingPick){TitleBar.doneButton.hidden=!isPlayerMode;}},_updateTabs:function(){var hideTabs=this.currentMode===MODE_PLAYER||this.currentMode===MODE_SEARCH_FROM_TILES||this.currentMode===MODE_SEARCH_FROM_LIST;TabBar.view.classList.toggle('away',hideTabs);},_updateMode:function(callback){this._updateBackArrow();this.updateTitle();this.updatePlayerIcon();this._updateTabs();this._enableNFCSharing((this.currentMode===MODE_PLAYER));if(callback){callback();}},_enableNFCSharing:function(enabled){if(!navigator.mozNfc){return;}
if(enabled&&!App.pendingPick){navigator.mozNfc.onpeerready=function(event){var peer=event.peer;if(peer){peer.sendFile(PlayerView.playingBlob);}};}else{navigator.mozNfc.onpeerready=null;}}};