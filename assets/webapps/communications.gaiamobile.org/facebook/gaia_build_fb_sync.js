;;;;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;;;this.asyncStorage=(function(){'use strict';var DBNAME='asyncStorage';var DBVERSION=1;var STORENAME='keyvaluepairs';var db=null;function withDatabase(f){if(db){f();}else{var openreq=indexedDB.open(DBNAME,DBVERSION);openreq.onerror=function withStoreOnError(){console.error('asyncStorage: can\'t open database:',openreq.error.name);};openreq.onupgradeneeded=function withStoreOnUpgradeNeeded(){openreq.result.createObjectStore(STORENAME);};openreq.onsuccess=function withStoreOnSuccess(){db=openreq.result;f();};}}
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
return{getItem:getItem,setItem:setItem,removeItem:removeItem,clear:clear,length:length,key:key};}());;;'use strict';if(!window.ImportStatusData){var ImportStatusData=(function(){var store=null;var DS_NAME='Import_Status_Data';var datastoreLoading=false;var datastoreLoaded=false;var DS_LOADED_EVENT='datastore_loaded';var getDatastore=function getDatastore(){return new Promise(function(resolve,reject){if(!navigator.getDataStores){reject({name:'DatastoreNotEnabled'});return;}
if(datastoreLoaded){resolve(store);return;}
if(datastoreLoading){document.addEventListener(DS_LOADED_EVENT,function loadedHandler(){document.removeEventListener(DS_LOADED_EVENT,loadedHandler);resolve(store);});}
datastoreLoading=true;navigator.getDataStores(DS_NAME).then(function(stores){store=stores[0];},reject).then(function(){datastoreLoading=false;datastoreLoaded=true;document.dispatchEvent(new CustomEvent(DS_LOADED_EVENT));resolve(store);},reject);});};var put=function put(key,obj){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.put(obj,key).then(resolve,reject);},reject);});};var remove=function remove(key){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.remove(key).then(resolve,reject);},reject);});};var get=function get(key){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.get(key).then(resolve,reject);},reject);});};var clear=function clear(){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.clear().then(resolve,reject);},reject);});};return{put:put,remove:remove,get:get,clear:clear};})();};;;;;;;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;;(function(window){'use strict';window.NotificationHelper={getIconURI:function nh_getIconURI(app,entryPoint){var icons=app.manifest.icons;if(entryPoint){icons=app.manifest.entry_points[entryPoint].icons;}
if(!icons){return null;}
var sizes=Object.keys(icons).map(function parse(str){return parseInt(str,10);});sizes.sort(function(x,y){return y-x;});var HVGA=document.documentElement.clientWidth<480;var index=sizes[HVGA?sizes.length-1:0];return app.installOrigin+icons[index];},send:function nh_send(titleL10n,options){return Promise.all([titleL10n,options.bodyL10n].map(getL10n)).then(([title,body])=>{if(body){options.body=body;}
options.lang=document.documentElement.getAttribute('lang');var notification=new window.Notification(title,options);if(options.closeOnClick!==false){notification.addEventListener('click',function nh_click(){notification.removeEventListener('click',nh_click);notification.close();});}
return notification;});},};function getL10n(l10nAttrs){if(!l10nAttrs){return;}
if(typeof l10nAttrs==='string'){return document.l10n.formatValue(l10nAttrs);}
if(typeof l10nAttrs.raw==="string"){return l10nAttrs.raw;}
return document.l10n.formatValue(l10nAttrs.id,l10nAttrs.args);}})(this);;;var oauthflow=this.oauthflow||{};oauthflow.params={"facebook":{"redirectURI":"https://www.facebook.com/connect/login_success.html","loginPage":"https://m.facebook.com/dialog/oauth/?","applicationId":"123456","scope":["friends_about_me","friends_birthday","friends_hometown","friends_location","friends_work_history","read_stream"],"redirectMsg":"http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/dialogs_end.html","redirectLogout":"http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/dialogs_end.html","imgDetailWidth":200,"imgThumbSize":120},"live":{"redirectURI":"https://www.mozilla.org/index.html","loginPage":"https://login.live.com/oauth20_authorize.srf?","applicationId":"123456","scope":["wl.basic","wl.contacts_emails","wl.contacts_phone_numbers","wl.contacts_birthday","wl.contacts_postal_addresses"],"logoutUrl":"https://login.live.com/logout.srf"},"gmail":{"redirectURI":"https://serene-cove-3587.herokuapp.com/liveowd/oauth2_new/flow_live.html","loginPage":"https://accounts.google.com/o/oauth2/auth?","applicationId":"664741361278.apps.googleusercontent.com","scope":["https://www.google.com/m8/feeds/"],"logoutUrl":"https://accounts.google.com/Logout"}};;'use strict';var utils=window.utils||{};if(typeof utils.config==='undefined'){(function(){var configs={};var initializing={};var initialized={};var EVENT_INITIALIZED='config_initialized';utils.config=utils.config||{};utils.config.reset=function(){configs={};initializing={};initialized={};};function onLoad(xhr,file,resolveCb){configs[file]=xhr.response;delete initializing[file];initialized[file]=true;document.dispatchEvent(new CustomEvent(EVENT_INITIALIZED,{detail:{file:file,success:true}}));resolveCb(configs[file]);}
utils.config.load=function(file){return new Promise(function(resolve,reject){var isInitialized=initialized[file];if(isInitialized===true){resolve(configs[file]);return;}
var isInitializing=initializing[file];if(isInitializing){var handler=function(expectedFile,e){document.removeEventListener(EVENT_INITIALIZED,handler);var file=e.detail.file;if(expectedFile!==file){return;}
if(e.detail.success){resolve(configs[file]);}
else{reject();}}.bind(null,file);document.addEventListener(EVENT_INITIALIZED,handler);return;}
initializing[file]=true;var xhr=new XMLHttpRequest();xhr.open('GET',file,true);xhr.responseType='json';xhr.onload=function(){var resolvedCb=resolve;if(xhr.status!==200){resolvedCb=reject;}
onLoad(xhr,file,resolvedCb);};xhr.onerror=function(){document.dispatchEvent(new CustomEvent(EVENT_INITIALIZED,{detail:{file:file,success:false}}));delete initializing[file];reject(xhr.error);};try{xhr.send(null);}
catch(e){console.error('Error while loading config file: ',e.message);onLoad({status:404},file,reject);}});};})();};;'use strict';var utils=window.utils||{};if(typeof utils.squareImage==='undefined'){utils.squareImage=function(blob,callback){var img=document.createElement('img');var url=URL.createObjectURL(blob);img.src=url;function cleanupImg(){img.src='';URL.revokeObjectURL(url);}
img.onerror=cleanupImg;img.onload=function onBlobLoad(){var width=img.width;var height=img.height;if(width===height){cleanupImg();callback(blob);}else{var canvas=document.createElement('canvas');var min=canvas.width=canvas.height=Math.min(width,height);var context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,(width-min)/2,(height-min)/2,min,min,0,0,min,min);cleanupImg();canvas.toBlob(function onCanvasToBlob(canvasBlob){context=null;canvas.width=canvas.height=0;canvas=null;callback(canvasBlob);},'image/jpeg',0.95);}};};};;'use strict';var utils=window.utils||{};(function(utils){var DEPENDENCIES=['/shared/js/contacts/import/utilities/config.js','/shared/js/image_utils.js'];var dpr=window.devicePixelRatio||1;var CONFIG_FILE='/config-images.json';var DEFAULT_CONFIG={'thumbnail':{'format':'image/jpeg','size':65,'quality':1.0}};var THUMB_CONFIG=DEFAULT_CONFIG.thumbnail;if(typeof utils.thumbnailImage!=='undefined'){return;}
function getThumbsConfig(){return new Promise(function(resolve,reject){utils.config.load(CONFIG_FILE).then(function resolved(config){resolve(config);},function rejected(){resolve(DEFAULT_CONFIG);});});}
function scaleImage(blob,configData){var thumbConfig=configData&&configData.thumbnail||{};var thumbnailEdge=(thumbConfig.size||THUMB_CONFIG.size)*dpr;var format=thumbConfig.format||THUMB_CONFIG.format;var encodingQuality=thumbConfig.quality||THUMB_CONFIG.quality;return ImageUtils.resizeAndCropToCover(blob,thumbnailEdge,thumbnailEdge,format,encodingQuality);}
utils.thumbnailImage=function(blob,callback){LazyLoader.load(DEPENDENCIES,function(){getThumbsConfig().then(function(config){return scaleImage(blob,config);}).then(callback).catch(function(err){console.error('Error while converting image to thumbnail:',err.name);callback(blob);});});};})(utils);;;'use strict';var utils=window.utils||{};var SCALE_RATIO=window.devicePixelRatio||1;var LAST_IMPORT_TIMESTAMP_SUFFIX='_last_import_timestamp';function scale(size){return Math.round(SCALE_RATIO*size);}
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
out.givenName=outGivenNames.reverse().join(' ').trim();out.familyName=outFamilyNames.reverse().join(' ').trim();return out;};utils.misc.getPreferredPictureBox=function(){var imgThumbSize=oauthflow.params.facebook.imgThumbSize;var out={width:scale(imgThumbSize)};out.height=out.width;return out;};utils.misc.getPreferredPictureDetail=function(){var imgDetailWidth=oauthflow.params.facebook.imgDetailWidth;return scale(imgDetailWidth);};utils.misc.setTimestamp=function(type,callback){ImportStatusData.put(type+LAST_IMPORT_TIMESTAMP_SUFFIX,Date.now()).then(callback);};utils.misc.getTimestamp=function(type,callback){ImportStatusData.get(type+LAST_IMPORT_TIMESTAMP_SUFFIX).then(callback);};};;'use strict';var fb=self.fb||{};self.fb=fb;fb.utils=self.fb.utils||{};self.fb.utils=fb.utils;if(typeof fb.utils.Request!=='function'){fb.utils.Request=function(){this.done=function(result){this.result=result;if(typeof this.onsuccess==='function'){var ev={};ev.target=this;window.setTimeout(function(){this.onsuccess(ev);}.bind(this),0);}};this.failed=function(error){this.error=error;if(typeof this.onerror==='function'){var ev={};ev.target=this;window.setTimeout(function(){this.onerror(ev);}.bind(this),0);}};};};;'use strict';var fb=window.fb||{};(function(){var contacts=fb.contacts||{};fb.contacts=contacts;var Reader;var readerLoaded=false;var INDEX_ID=1;var isIndexDirty=false;var READER_LOADED_EV='reader_loaded';var TEL_INDEXER_JS='/shared/js/fb/fb_tel_index.js';var PHONE_MATCHER_JS='/shared/js/simple_phone_matcher.js';var FB_READER_JS='/shared/js/fb/fb_data_reader.js';var BINARY_SEARCH_JS='/shared/js/binary_search.js';contacts.UID_NOT_FOUND='UIDNotFound';contacts.ALREADY_EXISTS='AlreadyExists';if(!contacts.init){var proxyMethods=['get','getLength','getByPhone','search','refresh','init','restart'];proxyMethods.forEach(function(aMethod){contacts[aMethod]=defaultFunction.bind(null,aMethod);});LazyLoader.load(FB_READER_JS,onreaderLoaded);}
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
TelIndexer.orderTree(index().treeTel);datastore().put(index(),INDEX_ID).then(defaultSuccess(outRequest),defaultError(outRequest));},0);return outRequest;};})();;;'use strict';var fb=window.fb||{};fb.Contact=function(deviceContact,cid){var contactData;var devContact=deviceContact;var contactid=cid;function doGetFacebookUid(data){return fb.getFriendUid(data);}
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
else{removeReq=navigator.mozContacts.remove(utils.misc.toMozContact(devContact));removeReq.onsuccess=function(e){out.done();};removeReq.onerror=function(e){out.failed(e.target.error);};}};},0);return out;};};;;'use strict';var fb=window.fb||{};window.fb=fb;(function(document){var Utils=fb.utils||{};fb.utils=Utils;var FRIEND_COUNT_QUERY='select friend_count from user where uid=me()';var CACHE_FRIENDS_KEY=Utils.CACHE_FRIENDS_KEY='numFacebookFriends';var LAST_UPDATED_KEY=Utils.LAST_UPDATED_KEY='lastUpdatedTime';Utils.ALARM_ID_KEY='nextAlarmId';Utils.SCHEDULE_SYNC_KEY='facebookShouldHaveScheduledAt';var REDIRECT_LOGOUT_URI=window.oauthflow?oauthflow.params.facebook.redirectLogout:'';var STORAGE_KEY=Utils.TOKEN_DATA_KEY='tokenData';Utils.setLastUpdate=function(value,cb){window.asyncStorage.setItem(LAST_UPDATED_KEY,{data:value},cb);};Utils.getLastUpdate=function(callback){window.asyncStorage.getItem(LAST_UPDATED_KEY,function(obj){var out=0;if(obj){out=obj.data||out;}
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
else if(next>=total){finishHandler();}}};})(document);;;'use strict';var fb=self.fb||{};self.fb=fb;if(!self.AuxFB){self.AuxFb=(function(){var CATEGORY='facebook';var NOT_LINKED='not_linked';var LINKED='fb_linked';function populate(source,target,propertyNames){propertyNames.forEach(function(property){var propertyValue=source[property];if(propertyValue){if(Array.isArray(propertyValue)){target[property]=propertyValue.slice(0,propertyValue.length);}else{target[property]=propertyValue;}}});}
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
else{Object.defineProperty(self.fb,prop,{value:(function(){return self.AuxFb[prop];})(),writable:false,enumerable:true,configurable:false});}}};;'use strict';var fb=this.fb||{};fb.PROPAGATED_PREFIX='fb_propagated_';fb.PROFILE_PHOTO_URI='fb_profile_photo';fb.FRIEND_URI='fb_friend';fb.DEFAULT_PHONE_TYPE='other';fb.DEFAULT_EMAIL_TYPE='other';fb.FLAG_YEAR_IGNORED=9996;fb.CONTACTS_APP_ORIGIN=location.origin;fb.isPropagated=function fcu_isPropagated(field,devContact){return(devContact.category&&devContact.category.indexOf(fb.PROPAGATED_PREFIX+field)!==-1);};fb.removePropagatedFlag=function fcu_removePropagatedFlag(field,devContact){var idx=devContact.category.indexOf(fb.PROPAGATED_PREFIX+field);if(idx!==-1){devContact.category.splice(idx,1);}};fb.setPropagatedFlag=function fcu_setPropagatedFlag(field,devContact){var idx=devContact.category.indexOf(fb.PROPAGATED_PREFIX+field);if(idx===-1){devContact.category.push(fb.PROPAGATED_PREFIX+field);}};fb.getFriendPictureUrl=function(devContact){var out;var urls=devContact.url;if(urls){for(var c=0;c<urls.length;c++){var aurl=urls[c];if(aurl.type.indexOf(fb.PROFILE_PHOTO_URI)!==-1){out=aurl.value;break;}}}
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
dContact.name=[dContact.givenName[0]+' '+dContact.familyName[0]];};fb.markFbCleaningInProgress=function(value){utils.cookie.update({fbCleaningInProgress:value});};;;'use strict';var fb=window.fb||{};if(!fb.sync){(function(){var Sync=fb.sync={};var theWorker;var fbContactsById;var totalToChange=0,changed=0;var nextTimestamp;var completionCallback,errorCallback;var fbFriendsDataByUid;var logLevel=fb.logLevel||parent.fb.logLevel||'DEBUG';var isDebug=(logLevel==='DEBUG');var alarmFrame=null,currentAlarmRequest=null;var DELAY_ALARM_SCHED=5000;function debug(){if(isDebug){var theArgs=['<<FBSync>>'];for(var c=0;c<arguments.length;c++){theArgs.push(arguments[c]);}
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
else{totalToChange=toBeChanged;checkTotals();}});};})();};'use strict';var fb=window.fb||{};var config=window.config||{};if(typeof fb.init==='undefined'){(function(){var initialized=false;var initializing=false;var EV_FB_INIT='fb_init_initialized';fb.isEnabled=false;fb.init=function(callback){if(initialized){callback();return;}
if(initializing){document.addEventListener(EV_FB_INIT,function handler(e){initializing=false;document.removeEventListener(EV_FB_INIT,handler);callback();});return;}
initializing=true;utils.config.load('/contacts/config.json').then(function cLoaded(configData){if(configData.facebookEnabled===true){fb.isEnabled=true;}
fb.operationsTimeout=config.operationsTimeout=configData.operationsTimeout;fb.logLevel=configData.logLevel||'none';fb.syncPeriod=configData.facebookSyncPeriod||24;fb.testToken=configData.testToken;initialized=true;document.dispatchEvent(new CustomEvent(EV_FB_INIT));callback();},function loadError(err){console.error('Error while loading config.json',err);});};})();};'use strict';var fb=window.fb||{};var Sync=fb.sync||{};fb.sync=Sync;(function(){var Alarm=Sync.alarm={};var ALARM_ID_KEY=fb.utils.ALARM_ID_KEY;var isSyncOngoing=false;var DEFAULT_RETRY_PERIOD=1;var RETRY_PERIOD_TIMEOUT=0.25;var CLOSE_DELAY=5000;var FB_TRAY_ICON='/contacts/style/images/f_logo.png';var FB_SYNC_ERROR_PARAM='isSyncError';Alarm.init=function(){fb.init(function fb_alarm_init(){if(navigator.mozHasPendingMessage('alarm')){fb.sync.debug('Alarm System Message Received!!!!!');navigator.mozSetMessageHandler('alarm',handleAlarm);}
else if(parent.location===window.location){fb.sync.debug('Fb Sync woke up. Alarm ok. mozHasPendingMsg failed');window.setTimeout(function(){handleAlarm({data:{sync:true}});},0);}
else{setNextAlarm(true,fb.syncPeriod);}});};function syncSuccess(){fb.sync.debug('Sync finished ok at ',new Date());isSyncOngoing=false;setNextAlarm(false,fb.syncPeriod,function(){closeApp();});}
function syncError(error){isSyncOngoing=false;var theError=error;if(!theError||theError.name==='undefined'){theError={name:'defaultError'};}
switch(theError.name){case'invalidToken':fb.sync.debug('Invalid token!!!. Notifying the user');showNotification({title:'facebook',body:'notificationLogin',iconURL:FB_TRAY_ICON+'?'+FB_SYNC_ERROR_PARAM+'=1',callback:handleInvalidToken});break;case'timeout':fb.sync.debug('Timeout in sync. Next sync scheduled in 15 minutes');scheduleAt(RETRY_PERIOD_TIMEOUT,closeApp);break;case'defaultError':window.console.error('Error reported in synchronization: ',JSON.stringify(theError));showNotification({title:'facebook',body:'syncError',iconURL:FB_TRAY_ICON+'?'+FB_SYNC_ERROR_PARAM+'=1',callback:function(){scheduleAt(fb.syncPeriod,closeApp);}});break;}}
function handleAlarm(message){if(message.data&&message.data.sync===true&&isSyncOngoing===false&&navigator.onLine===true){isSyncOngoing=true;fb.sync.debug('Starting sync at: ',new Date());ackAlarm(function alarm_process(){fb.sync.start({success:syncSuccess,error:syncError});});}
else if(isSyncOngoing===true){fb.sync.debug('There is an ongoing synchronization. Trying it later');scheduleAt(DEFAULT_RETRY_PERIOD,closeApp);}
else if(navigator.onLine===false){fb.sync.debug('Navigator is not online. Setting an alarm for next hour');scheduleAt(DEFAULT_RETRY_PERIOD,closeApp);}
else{fb.sync.debug('Alarm message but apparently was not a sync message');closeApp();}}
function alarmSetErrorCb(notifyParent,e){if(notifyParent){window.setTimeout(function(){parent.fb.sync.onAlarmError(e.target.error);},0);}
else{window.console.error('<<FBSync>> Error while setting next alarm: ',e.target.error.name);}}
function scheduleAt(hours,callback){var nextUpdate=Date.now()+hours*60*60*1000;var scheduledDate=new Date(nextUpdate);fb.sync.debug('Forcing scheduling an alarm at: ',scheduledDate);var req=addAlarm(scheduledDate);req.onsuccess=function(){fb.sync.debug('--> Next Sync forced to happen at: ',scheduledDate);if(typeof callback==='function'){callback();}};req.onerror=function(e){alarmSetErrorCb(false,e);};}
function ackAlarm(callback){window.asyncStorage.removeItem(ALARM_ID_KEY,callback,callback);}
function addAlarm(at){var outReq=new fb.utils.Request();window.setTimeout(function do_add_alarm(){window.asyncStorage.getItem(ALARM_ID_KEY,function set_alarm(id){if(id){navigator.mozAlarms.remove(Number(id));}
var req=navigator.mozAlarms.add(at,'honorTimezone',{sync:true});req.onsuccess=function(){window.asyncStorage.setItem(ALARM_ID_KEY,String(req.result),function success_store(){outReq.done(req.result);},function error_store(e){var errorParam={target:{error:e||{name:'AsyncStorageError'}}};outReq.failed(errorParam);});};req.onerror=function(e){outReq.failed(e);};});},0);return outReq;}
function setNextAlarm(notifyParent,hours,callback){fb.utils.getLastUpdate(function(timestamp){var nextUpdate=timestamp+hours*60*60*1000;var scheduledDate=new Date(nextUpdate);fb.sync.debug('Going to set a new alarm at: ',scheduledDate);var req=addAlarm(scheduledDate);req.onsuccess=function(){if(notifyParent===true){window.setTimeout(function(){parent.fb.sync.onAlarmScheduled(scheduledDate);},0);}
fb.sync.debug('--> Next Sync will happen at: ',scheduledDate);if(typeof callback==='function'){callback();}};req.onerror=function(e){alarmSetErrorCb(notifyParent,e);};});}
function showNotification(params){navigator.mozApps.getSelf().onsuccess=function(evt){var app=evt.target.result;var iconURL=app.installOrigin+params.iconURL;var options={body:params.body,icon:iconURL};NotificationHelper.send(params.title,options).then(notification=>{if(typeof params.callback==='function'){params.callback();}});};}
function closeApp(){window.setTimeout(window.close,CLOSE_DELAY);}
function handleInvalidToken(){closeApp();}
Alarm.init();})();