;;;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return{getItem:getItem,setItem:setItem,removeItem:removeItem,clear:clear,length:length,key:key};}());;(function(window){'use strict';window.NotificationHelper={getIconURI:function nh_getIconURI(app,entryPoint){var icons=app.manifest.icons;if(entryPoint){icons=app.manifest.entry_points[entryPoint].icons;}
if(!icons){return null;}
var sizes=Object.keys(icons).map(function parse(str){return parseInt(str,10);});sizes.sort(function(x,y){return y-x;});var HVGA=document.documentElement.clientWidth<480;var index=sizes[HVGA?sizes.length-1:0];return app.installOrigin+icons[index];},send:function nh_send(titleL10n,options){return Promise.all([titleL10n,options.bodyL10n].map(getL10n)).then(([title,body])=>{if(body){options.body=body;}
options.lang=document.documentElement.getAttribute('lang');var notification=new window.Notification(title,options);if(options.closeOnClick!==false){notification.addEventListener('click',function nh_click(){notification.removeEventListener('click',nh_click);notification.close();});}
return notification;});},};function getL10n(l10nAttrs){if(!l10nAttrs){return;}
if(typeof l10nAttrs==='string'){return document.l10n.formatValue(l10nAttrs);}
if(typeof l10nAttrs.raw==="string"){return l10nAttrs.raw;}
return document.l10n.formatValue(l10nAttrs.id,l10nAttrs.args);}})(this);;;;'use strict';var SettingsListener={_lock:null,_observers:[],getSettingsLock:function sl_getSettingsLock(){if(this._lock&&!this._lock.closed){return this._lock;}
var settings=window.navigator.mozSettings;return(this._lock=settings.createLock());},observe:function sl_observe(name,defaultValue,callback){var settings=window.navigator.mozSettings;if(!settings){window.setTimeout(function(){callback(defaultValue);});return;}
var req;try{req=this.getSettingsLock().get(name);}catch(e){console.warn('Stale lock in settings_listener.js.','See https://bugzilla.mozilla.org/show_bug.cgi?id=793239');this._lock=null;req=this.getSettingsLock().get(name);}
req.addEventListener('success',(function onsuccess(){callback(typeof(req.result[name])!='undefined'?req.result[name]:defaultValue);}));var settingChanged=function settingChanged(evt){callback(evt.settingValue);};settings.addObserver(name,settingChanged);this._observers.push({name:name,callback:callback,observer:settingChanged});},unobserve:function sl_unobserve(name,callback){var settings=window.navigator.mozSettings;var that=this;this._observers.forEach(function(value,index){if(value.name===name&&value.callback===callback){settings.removeObserver(name,value.observer);that._observers.splice(index,1);}});}};;;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var DEBUGGING=false;var debug=(function(){var SEQ_ID=0;var PROCESS_ID=Date.now();var DEBUG_PREFIX='CC';return function _debug(){if(!DEBUGGING){return;}
var currentWindow=window;var parents=[];while(currentWindow!==currentWindow.parent){parents.push(currentWindow.location.pathname);currentWindow=currentWindow.parent;}
parents.push(currentWindow.location.pathname);parents=parents.reverse().join('>')+':';var uId=PROCESS_ID;var message=['('+uId+'-'+(SEQ_ID++)+')',DEBUG_PREFIX,parents];for(var i=0,len=arguments.length,obj;i<len;i++){obj=arguments[i];message.push(typeof obj==='object'?JSON.stringify(obj):obj);}
if(window.dump){message.push('\n');window.dump(message.join(' '));}else if(console&&console.log){console.log(message.join(' '));}};}());;'use strict';var _=function cc_fallbackTranslation(keystring){var r=window.navigator.mozL10n.get.apply(this,arguments);return r||(DEBUGGING?'!!':'')+keystring;};function deepCopy(object){if(object===null||!(object instanceof Object)){return object;}
var clone,constructor=object.constructor;switch(constructor){case Date:clone=new constructor(object.getTime());break;default:clone=constructor();break;}
for(var key in object){if(object.hasOwnProperty(key)){clone[key]=deepCopy(object[key]);}}
return clone;}
var Toolkit={checkEnoughDelay:function(threshold,dateA,dateB){if(!dateA){return true;}
var end=dateB||new Date();return(end.getTime()-dateA.getTime())>threshold;},toMidnight:function _toMidnight(date){date.setHours(0);date.setMinutes(0);date.setSeconds(0);date.setMilliseconds(0);return date;}};;'use strict';var Formatting=(function(){var MINUTE=60*1000;var HOUR=60*MINUTE;var DAY=24*HOUR;function getDaysOfDifference(a,b){return Math.floor((a.getTime()-b.getTime())/DAY);}
function getFormattedDate(timestamp,formatter){return formatter.format(timestamp);}
function formatTime(timestamp,formatter){if(!timestamp){return _('never');}
var now=new Date(),then=new Date(timestamp);if(formatter){return getFormattedDate(then,formatter);}
var date,time;var daysOfDifference=getDaysOfDifference(now,then);if(daysOfDifference===0){date=_('today');}else if(daysOfDifference===1){date=_('yesterday');}else{date=getFormattedDate(timestamp,Formatting.formatters.shortWeekday);}
time=getFormattedDate(timestamp,Formatting.formatters.shortTime);return _('day-hour-format',{day:date,time:time});}
function formatTimeSinceNow(timestamp){var now=new Date(),then=new Date(timestamp);var formattedTime=formatTime(timestamp);if(getDaysOfDifference(now,then)>0){return formattedTime;}
var age=now-then;if(age<MINUTE){formattedTime=_('minutes-ago-short',{value:0});}else if(age<HOUR){var minutes=Math.floor(age/MINUTE);formattedTime=_('minutes-ago-short',{value:minutes});}else if(age<DAY){var hours=Math.floor(age/HOUR);formattedTime=_('hours-ago-short',{value:hours});}
return formattedTime;}
function formatData(dataArray){return isNaN(dataArray[0])?'':_('magnitude',{value:dataArray[0],unit:dataArray[1]});}
function roundData(value,positions){positions=(typeof positions==='undefined')?2:positions;if(value<1000){return[value.toFixed(positions),_('B')];}
if(value<1000000){return[(value/1000).toFixed(positions),_('KB')];}
if(value<1000000000){return[(value/1000000).toFixed(positions),_('MB')];}
return[(value/1000000000).toFixed(positions),_('GB')];}
function getPositions(value,deltaPositions){deltaPositions=(typeof deltaPositions==='undefined')?0:deltaPositions;if(parseInt(value)===value){return 0;}
if(value<10){return 2+deltaPositions;}
if(value<100){return 1+deltaPositions;}
return 0;}
function smartRound(value,deltaPositions){deltaPositions=(typeof deltaPositions==='undefined')?0:deltaPositions;if(value<1000){var bPositions=getPositions(value,deltaPositions);return[value.toFixed(bPositions),_('B')];}
if(value<1000000){var kbytes=value/1000;var kbPositions=getPositions(kbytes,deltaPositions);return[kbytes.toFixed(kbPositions),_('KB')];}
if(value<1000000000){var mbytes=value/1000000;var mPositions=getPositions(mbytes,deltaPositions);return[mbytes.toFixed(mPositions),_('MB')];}
var gbytes=value/1000000000;var gPositions=getPositions(gbytes,deltaPositions);return[gbytes.toFixed(gPositions),_('GB')];}
function formatTimeHTML(timestampA,timestampB){function timeElement(content){var time=document.createElement('time');time.textContent=content;return time;}
var fragment=document.createDocumentFragment();if(typeof timestampB==='undefined'){fragment.appendChild(timeElement(Formatting.formatTime(timestampA)));return fragment;}
var dateA=new Date(timestampA);var dateB=new Date(timestampB);if(dateA.getFullYear()===dateB.getFullYear()&&dateA.getMonth()===dateB.getMonth()&&dateA.getDay()===dateB.getDay()){return formatTimeHTML(timestampB);}
fragment.appendChild(timeElement(Formatting.formatTime(timestampA,Formatting.formatters.shortDate)));fragment.appendChild(document.createTextNode(' – '));fragment.appendChild(timeElement(Formatting.formatTime(timestampB)));return fragment;}
function computeTelephonyMinutes(activity){return Math.ceil(activity.calltime/60000);}
return{getFormattedDate:getFormattedDate,formatTime:formatTime,formatTimeSinceNow:formatTimeSinceNow,formatData:formatData,roundData:roundData,getPositions:getPositions,smartRound:smartRound,formatTimeHTML:formatTimeHTML,computeTelephonyMinutes:computeTelephonyMinutes,formatters:{}};}());function setFormatters(){const locales=navigator.languages;Formatting.formatters.longDate=Intl.DateTimeFormat(locales,{month:'long',day:'numeric',year:'numeric'});Formatting.formatters.shortDate=Intl.DateTimeFormat(locales,{month:'short',day:'numeric',});Formatting.formatters.shortTime=Intl.DateTimeFormat(locales,{hour12:navigator.mozHour12,hour:'numeric',minute:'numeric'});Formatting.formatters.shortWeekday=Intl.DateTimeFormat(locales,{weekday:'short'});}
setFormatters();window.addEventListener('languagechange',setFormatters,false);window.addEventListener('timeformatchange',setFormatters,false);;'use strict';var SimManager=(function(){var serviceIcc={};var serviceSettingMap={'data':'ril.data.defaultServiceId','telephony':'ril.telephony.defaultServiceId','message':'ril.sms.defaultServiceId'};function notifyInitializationDone(updatedService){var simInitializedEvent=new CustomEvent('simManagerReady',{detail:updatedService});window.dispatchEvent(simInitializedEvent);}
function _init(serviceId){_reset(serviceId);LazyLoader.load(['/shared/js/airplane_mode_helper.js'],function(){AirplaneModeHelper.addEventListener('statechange',function _onAirplaneModeChange(state){if(state==='disabled'){serviceIcc[serviceId].dirty=true;var eventDetail={detail:{serviceId:serviceId}};var airplanemodeDisabledEvent=new CustomEvent('airplaneModeDisabled',eventDetail);window.dispatchEvent(airplanemodeDisabledEvent);}});});function checkForCompletion(){serviceIcc[serviceId].initialized=true;SettingsListener.observe(serviceSettingMap[serviceId],0,function(value){var isDirty=(serviceIcc[serviceId].slotId!==value);serviceIcc[serviceId].dirty=isDirty;serviceIcc[serviceId].slotId=value;if(isDirty){var serviceSlotChangeEvent=new CustomEvent(serviceId+'SlotChange',{detail:serviceId});window.dispatchEvent(serviceSlotChangeEvent);}});notifyInitializationDone(serviceId);}
if(SimManager.isMultiSim()){var settings=window.navigator.mozSettings;var req=settings&&settings.createLock().get(serviceSettingMap[serviceId]);req.onsuccess=function _onsuccesSlotId(){if(!req.result[serviceSettingMap[serviceId]]){console.warn('The setting '+serviceSettingMap[serviceId]+' does not exists, using default Slot (0)');}
var slotId=req.result[serviceSettingMap[serviceId]]||0;serviceIcc[serviceId].slotId=slotId;checkForCompletion();};req.onerror=function _onErrorSlotId(){console.warn('The setting '+serviceSettingMap[serviceId]+' does not exists');checkForCompletion();};}else{notifyInitializationDone(serviceId);}}
function _requestDataSIMIcc(onsuccess,onerror){_requestService('data',onsuccess,onerror);}
function _requestTelephonySIMIcc(onsuccess,onerror){_requestService('telephony',onsuccess,onerror);}
function _requestMessageSIMIcc(onsuccess,onerror){_requestService('message',onsuccess,onerror);}
function _requestService(serviceId,onsuccess,onerror){if(serviceIcc[serviceId]&&serviceIcc[serviceId].initialized&&!serviceIcc[serviceId].dirty){(typeof onsuccess==='function')&&onsuccess(serviceIcc[serviceId]);}else if(!serviceIcc[serviceId]||!serviceIcc[serviceId].initialized){console.warn('SimManager is not ready, waiting for initialized custom '+'event');window.addEventListener('simManagerReady',function _onSMInit(evt){if(evt.detail==='all'||evt.detail===serviceId){window.removeEventListener('simManagerReady',_onSMInit);_requestServiceSIMIcc(serviceId,onsuccess,onerror);}});_init(serviceId);}else{_requestServiceSIMIcc(serviceId,onsuccess,onerror);}}
function _requestServiceSIMIcc(serviceId,onsuccess,onerror){var iccManager=window.navigator.mozIccManager;var slotId=serviceIcc[serviceId].slotId;var mobileConnection=navigator.mozMobileConnections[slotId];var iccId=mobileConnection.iccId||null;if(!iccId){console.error('The slot '+slotId+', configured as the '+serviceId+' slot, is empty');(typeof onerror==='function')&&onerror();return;}
serviceIcc[serviceId].iccId=iccId;serviceIcc[serviceId].icc=iccManager.getIccById(iccId);if(!serviceIcc[serviceId].icc){(typeof onerror==='function')&&onerror();return;}
(typeof onsuccess==='function')&&onsuccess(serviceIcc[serviceId]);}
function _reset(serviceId){function _resetService(serviceId){var _initialized=!SimManager.isMultiSim();serviceIcc[serviceId]={dirty:true,icc:null,iccId:null,slotId:0,initialized:_initialized};}
if(!serviceId){Object.keys(serviceSettingMap).forEach(function _initService(serviceId){_resetService(serviceId);});}else{_resetService(serviceId);}}
function _requestServiceConnection(serviceId){var slotId=serviceIcc[serviceId].slotId;return navigator.mozMobileConnections[slotId];}
function _requestDataConnection(callback){if(serviceIcc.data&&serviceIcc.data.initialized){var connection=_requestServiceConnection('data');(typeof callback==='function')&&callback(connection);}else{console.warn('SimManager is not ready, waiting for initialized custom '+'event');window.addEventListener('simManagerReady',function _onSMInit(evt){if(evt.detail==='all'||evt.detail==='data'){window.removeEventListener('simManagerReady',_onSMInit);var connection=_requestServiceConnection('data');(typeof callback==='function')&&callback(connection);}});_init('data');}}
return{isMultiSim:function(){return(navigator.mozMobileConnections.length>1);},requestDataSimIcc:_requestDataSIMIcc,requestTelephonySimIcc:_requestTelephonySIMIcc,requestDataConnection:_requestDataConnection,requestMessageSimIcc:_requestMessageSIMIcc,reset:_reset};})();;'use strict';function addAlarmTimeout(type,delay){var handlerContainer=document.getElementById('message-handler');return handlerContainer.contentWindow.addAlarmTimeout(type,delay);}
function setNextReset(when,callback){var handlerContainer=document.getElementById('message-handler');return handlerContainer?handlerContainer.contentWindow.setNextReset(when,callback):window.setNextReset(when,callback);}
function getTopUpTimeout(callback){var handlerContainer=document.getElementById('message-handler');return handlerContainer?handlerContainer.contentWindow.getTopUpTimeout(callback):window.getTopUpTimeout(callback);}
function addNetworkUsageAlarm(dataInterface,dataLimit,onsuccess,onerror){var handlerContainer=document.getElementById('message-handler');if(handlerContainer){handlerContainer.contentWindow.addNetworkUsageAlarm(dataInterface,dataLimit,onsuccess,onerror);}else{window.addNetworkUsageAlarm(dataInterface,dataLimit,onsuccess,onerror);}}
function sendBalanceThresholdNotification(remaining,settings,callback){var handlerContainer=document.getElementById('message-handler');if(handlerContainer){handlerContainer.contentWindow.sendBalanceThresholdNotification(remaining,settings,callback);}}
function resetTelephony(callback){ConfigManager.setOption({lastTelephonyReset:new Date(),lastTelephonyActivity:{calltime:0,smscount:0,timestamp:new Date()}},callback);}
var Common={COST_CONTROL_APP:'app://costcontrol.gaiamobile.org',DATA_USAGE_WARNING:0.8,allApps:null,allAppsLoaded:false,allNetworkInterfaces:null,allNetworkInterfaceLoaded:false,specialApps:['app://search.gaiamobile.org/manifest.webapp'],SYSTEM_MANIFEST:'app://system.gaiamobile.org/manifest.webapp',BROWSER_APP:{manifestURL:'app://browser.gaiamobile.org/manifest.webapp',origin:'',manifest:{icons:{'84':'/shared/resources/branding/browser_84.png','126':'/shared/resources/branding/browser_126.png','142':'/shared/resources/branding/browser_142.png','189':'/shared/resources/branding/browser_189.png','284':'/shared/resources/branding/browser_284.png'},name:'browser'}},startFTE:function(mode){var iframe=document.getElementById('fte_view');window.addEventListener('message',function handler(e){if(e.origin!==Common.COST_CONTROL_APP){return;}
if(e.data.type==='fte_ready'){window.removeEventListener('message',handler);iframe.classList.remove('non-ready');window.performance.mark('navigationLoaded');window.performance.mark('navigationInteractive');window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');window.performance.mark('fullyLoaded');}});iframe.src='/fte.html'+'#'+mode;},closeFTE:function(){var iframe=window.parent.document.getElementById('fte_view');iframe.classList.add('non-ready');iframe.src='';},startApp:function(){parent.postMessage({type:'fte_finished',data:''},Common.COST_CONTROL_APP);},closeApplication:function(){return setTimeout(function _close(){debug('Closing.');window.close();});},modalAlert:function(message){alert(message);},get localize(){return navigator.mozL10n.setAttributes;},getInterface:function getInterface(findFunction){if(!Common.allNetworkInterfaceLoaded){debug('Network interfaces are not ready yet');var header=_('data-usage');var msg=_('loading-interface-data');this.modalAlert(header+'\n'+msg);return;}
if(Common.allNetworkInterfaces){return Common.allNetworkInterfaces.find(findFunction);}},getDataSIMInterface:function _getDataSIMInterface(iccId){if(!iccId){console.warn('Undefined icc identifier, unable get data interface');return;}
if(iccId){var findCurrentInterface=function(networkInterface){if(networkInterface.id===iccId){return networkInterface;}};return this.getInterface(findCurrentInterface);}
return undefined;},getWifiInterface:function _getWifiInterface(){var findWifiInterface=function(networkInterface){if(networkInterface.type===navigator.mozNetworkStats.WIFI){return networkInterface;}};return this.getInterface(findWifiInterface);},loadApps:function(){return new Promise(function(resolve,reject){if(Common.allAppsLoaded){resolve(Common.allApps);return;}
var request=window.navigator.mozApps.mgmt.getAll();request.onsuccess=function(event){var appList=event.target.result;Common.allApps=appList.filter(function(app){return Common.specialApps.indexOf(app.manifestURL)===-1;});Common.allApps.push(Common.BROWSER_APP);Common.allAppsLoaded=true;resolve(Common.allApps);};request.onerror=function(){reject(new Error('Apps could not be loaded'));};});},loadNetworkInterfaces:function(onsuccess,onerror){var networks=navigator.mozNetworkStats.getAvailableNetworks();networks.onsuccess=function(){Common.allNetworkInterfaces=networks.result;Common.allNetworkInterfaceLoaded=true;if(onsuccess){onsuccess();}};networks.onerror=function(){console.error('Error when trying to load network interfaces');if(onerror){onerror();}};},getApp:function(manifestURL){return this.allApps.find(function(app){return app.manifestURL===manifestURL;});},getAppManifest:function(app){return app.manifest||app.updateManifest;},getLocalizedAppName:function(app){if(app.manifestURL===Common.SYSTEM_MANIFEST){return _('data-usage-other-apps');}
if(app.manifestURL===Common.BROWSER_APP.manifestURL){return _('data-usage-browser-app');}
var manifest=this.getAppManifest(app);var userLang=document.documentElement.lang;var locales=manifest.locales;var localized=locales&&locales[userLang]&&locales[userLang].name;return localized||manifest.name;},getAppIcon:function(app){var manifest=this.getAppManifest(app);var icons=manifest.icons;var defaultImage='../style/images/app/icons/default.png';if(!icons||!Object.keys(icons).length){return defaultImage;}
var preferredIconSize=30*(window.devicePixelRatio||1);var preferredSize=Number.MAX_VALUE;var max=0;for(var size in icons){size=parseInt(size,10);if(size>max){max=size;}
if(size>=preferredIconSize&&size<preferredSize){preferredSize=size;}}
if(preferredSize===Number.MAX_VALUE){preferredSize=max;}
var url=icons[preferredSize];if(url){return!(/^(http|https|data):/.test(url))?app.origin+url:url;}else{return defaultImage;}},getDataLimit:function _getDataLimit(settings){var multiplier=(settings.dataLimitUnit==='MB')?1000000:1000000000;return settings.dataLimitValue*multiplier;},resetData:function _resetData(mode,onsuccess,onerror){var wifiInterface=Common.getWifiInterface();var wifiClearRequest,mobileClearRequest;var getOnErrorFor=function(networkInterface){return function(){if(wifiClearRequest){wifiClearRequest.onerror=undefined;}
if(mobileClearRequest){mobileClearRequest.onerror=undefined;}
(typeof onerror==='function')&&onerror(networkInterface);};};if((mode==='all'||mode==='wifi')&&wifiInterface){wifiClearRequest=navigator.mozNetworkStats.clearStats(wifiInterface);wifiClearRequest.onerror=getOnErrorFor('wi-Fi');}
if(mode==='all'||mode==='mobile'){SimManager.requestDataSimIcc(function(dataSim){var currentSimcardInterface=Common.getDataSIMInterface(dataSim.iccId);if(currentSimcardInterface){mobileClearRequest=navigator.mozNetworkStats.clearStats(currentSimcardInterface);mobileClearRequest.onerror=getOnErrorFor('simcard');mobileClearRequest.onsuccess=function _restoreDataLimitAlarm(){ConfigManager.requestSettings(dataSim.iccId,function _onSettings(settings){if(settings.dataLimit){addNetworkUsageAlarm(currentSimcardInterface,Common.getDataLimit(settings),function _addNetworkUsageAlarmOK(){ConfigManager.setOption({'dataUsageNotified':false});});}});};}});}
if(mode==='all'){ConfigManager.setOption({lastCompleteDataReset:new Date()});}else{ConfigManager.setOption({lastDataReset:new Date()});}
if(typeof onsuccess==='function'){onsuccess();}},resetAll:function _resetAll(callback){function logResetDataError(networkInterface){console.log('Error when trying to reset '+networkInterface+' interface');}
Common.resetData('all',thenResetTelephony,logResetDataError);function thenResetTelephony(){resetTelephony(callback);}},updateNextReset:function _updateNextReset(trackingPeriod,value,callback){if(trackingPeriod==='never'){setNextReset(null,callback);return;}
var nextReset,today=new Date();if(trackingPeriod==='monthly'){var month,year;var monthday=parseInt(value,10);month=today.getMonth();year=today.getFullYear();if(today.getDate()>=monthday){month=(month+1)%12;if(month===0){year++;}}
nextReset=new Date(year,month,monthday);if(monthday!==nextReset.getDate()){var LAST_DAY_OF_PREVIOUS_MONTH=0;nextReset.setDate(LAST_DAY_OF_PREVIOUS_MONTH);}}else if(trackingPeriod==='weekly'){var oneDay=24*60*60*1000;var weekday=parseInt(value,10);var daysToTarget=weekday-today.getDay();if(daysToTarget<=0){daysToTarget=7+daysToTarget;}
nextReset=new Date();nextReset.setTime(nextReset.getTime()+oneDay*daysToTarget);Toolkit.toMidnight(nextReset);}
setNextReset(nextReset,callback);},localizeWeekdaySelector:function _localizeWeekdaySelector(selector){var weekStartsOnMonday=parseInt(navigator.mozL10n.get('firstDayOfTheWeek'),10)===1;debug('Week starts on monday?',weekStartsOnMonday);var monday=selector.querySelector('.monday');var sunday=selector.querySelector('.sunday');var list=monday.parentNode;if(weekStartsOnMonday){debug('Monday, Tuesday...');list.insertBefore(monday,list.childNodes[0]);list.appendChild(sunday);}else{debug('Sunday, Monday...');list.insertBefore(sunday,list.childNodes[0]);list.insertBefore(monday,sunday.nextSibling);}}};;'use strict';var ConfigManager=(function(){var today=new Date();var DEFAULT_SETTINGS={'dataLimit':false,'dataLimitValue':1,'dataLimitUnit':'GB','errors':{'INCORRECT_TOPUP_CODE':false,'BALANCE_TIMEOUT':false,'TOPUP_TIMEOUT':false},'fte':true,'waitingForBalance':null,'waitingForTopUp':null,'lastBalance':null,'lastBalanceRequest':null,'lastTopUpRequest':null,'lastDataUsage':{'timestamp':today,'start':today,'end':today,'today':today,'wifi':{'apps':{},'total':0},'mobile':{'apps':{},'total':0}},'lastTelephonyActivity':{'timestamp':today,'calltime':0,'smscount':0},'lastTelephonyReset':today,'lastDataReset':today,'lastCompleteDataReset':today,'lowLimit':false,'lowLimitThreshold':false,'lowLimitNotified':false,'zeroBalanceNotified':false,'dataUsageNotified':false,'nextReset':null,'plantype':'postpaid','resetTime':1,'trackingPeriod':'monthly','isMobileChartVisible':true,'isWifiChartVisible':false};var CONFIG_CACHE=[];function getApplicationMode(){if(noConfigFound){return'DATA_USAGE_ONLY';}
return settings.plantype.toUpperCase();}
var configuration,configurationIndex,noConfigFound=false;function setConfig(newConfiguration){configuration=newConfiguration;debug('Provider configuration done!');}
function requestConfiguration(currentDataIcc,callback){if(!currentDataIcc||!currentDataIcc.iccInfo){console.error('No iccInfo available');return;}
function returnConfiguration(){if(typeof callback==='function'){callback(configuration);}}
if(configuration){setTimeout(function(){returnConfiguration();});return;}
if(configurationIndex){loadConfiguration(currentDataIcc,returnConfiguration);}else{loadConfigurationIndex(function onIndex(){loadConfiguration(currentDataIcc,returnConfiguration);});}}
function loadConfiguration(currentDataIcc,callback){var configFilePath=getConfigFilePath(currentDataIcc);if(CONFIG_CACHE[configFilePath]){ConfigManager.setConfig(CONFIG_CACHE[configFilePath]);(typeof callback==='function')&&callback();}else{LazyLoader.load(configFilePath,function(){CONFIG_CACHE[configFilePath]=configuration;(typeof callback==='function')&&callback();});}}
function getConfigFilePath(currentDataIcc){noConfigFound=false;var mcc=currentDataIcc.iccInfo.mcc;var mnc=currentDataIcc.iccInfo.mnc;var key=mcc+'_'+mnc;var configDir=configurationIndex[key];if(!configDir){configDir='default';noConfigFound=true;}
return'js/config/'+configDir+'/config.js';}
function loadConfigurationIndex(callback){LazyLoader.getJSON('/js/config/index.json').then(function(json){configurationIndex=json;if(configurationIndex===null){console.error('Error loading the configuration index!'+'Response from LazyLoader was null.');configurationIndex={};}
if(typeof callback==='function'){setTimeout(function(){callback();});}},function(error){console.error('Error loading the configuration index! '+'Error code: '+error);configurationIndex={};});}
Date.prototype.toJSON=function(){return{'__date__':this.toISOString()};};function settingsReviver(k,v){if(v===null||typeof v!=='object'||!v.hasOwnProperty('__date__')){return v;}
return new Date(v.__date__);}
var NO_ICCID='NOICCID';var settings;function requestSettings(iccIdInfo,callback){var currentICCID=iccIdInfo||NO_ICCID;asyncStorage.getItem(currentICCID,function _wrapGetItem(localSettings){try{settings=JSON.parse(localSettings,settingsReviver);}catch(e){}
if(settings===null){settings=deepCopy(DEFAULT_SETTINGS);debug('Storing default settings for ICCID:',currentICCID);asyncStorage.setItem(currentICCID,JSON.stringify(settings),callback&&callback.bind(null,settings));}else if(callback){callback(settings);}});}
function requestAll(callback){SimManager.requestDataSimIcc(function(dataSimIcc){requestConfiguration(dataSimIcc.icc,function _afterConfig(configuration){requestSettings(dataSimIcc.iccId,function _afterSettings(settings){if(callback){callback(configuration,settings,dataSimIcc.iccId);}});});});}
function dispatchOptionChange(name,value,oldValue,settings){var event=new CustomEvent('optionchange',{detail:{name:name,value:value,oldValue:oldValue,settings:settings}});window.dispatchEvent(event);debug('Event optionchange dispatched for',name);}
function setOption(options,callback){SimManager.requestDataSimIcc(function(dataSimIcc){if(!settings){requestSettings(dataSimIcc.iccId,function _afterEnsuringSettings(){setOption(options,callback);});return;}
var formerValue={};for(var name in options){if(options.hasOwnProperty(name)){formerValue[name]=settings[name];settings[name]=options[name];}}
var currentICCID=dataSimIcc.iccId||NO_ICCID;asyncStorage.setItem(currentICCID,JSON.stringify(settings),function _onSet(){requestSettings(dataSimIcc.iccId,function _onSettings(settings){for(var name in options){if(options.hasOwnProperty(name)){dispatchOptionChange(name,settings[name],formerValue[name],settings);}}
if(callback){callback();}});});});}
function syncOption(name,value){var oldValue=settings[name];if(value===undefined){return oldValue;}
var update={};update[name]=value;setOption(update);}
var callbacks;function callCallbacks(evt){debug('Option',evt.detail.name,'has changed!');var callbackCollection=callbacks[evt.detail.name]||[];for(var i=0;i<callbackCollection.length;i++){var callback=callbackCollection[i];if(callback){callback(evt.detail.value,evt.detail.oldValue,evt.detail.name,evt.detail.settings);}}}
function syncObserve(name,callback,avoidInitialCall){debug('Installing observer for',name);if(callbacks===undefined){callbacks={};window.addEventListener('storage',function _onSync(evt){if(evt.key==='sync'){var name=evt.newValue.split('#')[0];var oldValue=settings?settings[name]:undefined;debug('Synchronization request for',name,'received!');SimManager.requestDataSimIcc(function(dataSimIcc){requestSettings(dataSimIcc.iccId,function _onSettings(newSettings){settings=newSettings;dispatchOptionChange(name,settings[name],oldValue,settings);});});}});window.addEventListener('optionchange',callCallbacks);}
if(callbacks[name]===undefined){callbacks[name]=[];}
if(callbacks[name].indexOf(callback)<0){callbacks[name].push(callback);avoidInitialCall=avoidInitialCall||false;if(!avoidInitialCall&&callback){callback(settings[name],null,name,settings);}}}
function syncRemoveObserver(name,callback){var callbackCollection=callbacks[name];if(!callbackCollection){return;}
var index=callbackCollection.indexOf(callback);if(index>-1){callbackCollection.splice(index,1);}}
function defaultValue(name){return deepCopy(DEFAULT_SETTINGS[name]);}
return{getApplicationMode:getApplicationMode,setConfig:setConfig,requestAll:requestAll,requestSettings:requestSettings,setOption:setOption,defaultValue:defaultValue,option:syncOption,observe:syncObserve,removeObserver:syncRemoveObserver,get configuration(){return configuration;},supportCustomizeMode:false};}());;'use strict';var CostControl=(function(){var costcontrol;function getInstance(onready){debug('Initializing Cost Control');function goOn(){debug('Cost Control already ready!');onready(costcontrol);}
if(costcontrol){if(SimManager.isMultiSim()){SimManager.requestDataSimIcc(function(dataSimIcc){if(costcontrol.iccId===dataSimIcc.iccId){goOn();}});}else{goOn();}
return;}
function setupCostControl(configuration,settings,iccId){costcontrol={iccId:iccId,request:request,lastDataResults:{},lastDataResultsPerApp:{},isBalanceRequestSMS:isBalanceRequestSMS};debug('Cost Control ready!');onready(costcontrol);}
loadAPIs();ConfigManager.requestAll(setupCostControl);}
var mobileMessageManager,statistics,isSendingBalanceRequest=false;function loadAPIs(){if('mozMobileMessage'in window.navigator){mobileMessageManager=window.navigator.mozMobileMessage;}
if('mozNetworkStats'in window.navigator){statistics=window.navigator.mozNetworkStats;}
debug('APIs loaded!');}
function isBalanceRequestSMS(message,configuration){return message.receiver===configuration.balance.destination;}
function request(requestObj,callback){ConfigManager.requestAll(function _onInfo(configuration,settings){debug('Request for:',requestObj.type);var force=requestObj.force;var result={};result.type=requestObj.type;function _requestDataStatistics(){SimManager.requestDataSimIcc(function(dataSim){requestDataStatistics(configuration,settings,callback,dataSim,result,requestObj);});}
function _requestBalance(connection){var issues=getServiceIssues(configuration,settings,connection);var canBeIgnoredByForcing=(issues==='minimum_delay'&&force);if(issues&&!canBeIgnoredByForcing){result.status='error';result.details=issues;result.data=settings.lastBalance;if(callback){callback(result);}
return;}
var costIssues=getCostIssues(configuration,connection);if(!force&&costIssues){result.status='error';result.details=costIssues;result.data=settings.lastBalance;if(callback){callback(result);}
return;}
var isWaiting=settings.waitingForBalance!==null;var timeout=Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,settings.lastBalanceRequest);if((isWaiting&&!timeout)||isSendingBalanceRequest){result.status='in_progress';result.data=settings.lastBalance;if(callback){callback(result);}
return;}
isSendingBalanceRequest=true;LazyLoader.load('js/iac_manager.js',function(){requestBalance(configuration,settings,callback,result);});}
function _requestTopUp(connection){var issuesTopUp=getServiceIssues(configuration,settings,connection);if(issuesTopUp&&issuesTopUp!=='minimum_delay'){result.status='error';result.details=issuesTopUp;result.data=settings.lastDataUsage;if(callback){callback(result);}
return;}
var costIssuesTopUp=getCostIssues(configuration,connection);if(!force&&costIssuesTopUp){result.status='error';result.details=costIssuesTopUp;result.data=settings.lastBalance;if(callback){callback(result);}
return;}
var isWaitingTopUp=settings.waitingForTopUp!==null;var timeoutTopUp=Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,settings.lastTopUpRequest);if(isWaitingTopUp&&!timeoutTopUp&&!force){result.status='in_progress';result.data=settings.lastDataUsage;if(callback){callback(result);}
return;}
var code=requestObj.data;LazyLoader.load('js/iac_manager.js',function(){requestTopUp(configuration,settings,code,callback,result);});}
switch(requestObj.type){case'balance':SimManager.requestDataConnection(_requestBalance);break;case'topup':SimManager.requestDataConnection(_requestTopUp);break;case'datausage':if(!Common.allNetworkInterfaceLoaded){Common.loadNetworkInterfaces(_requestDataStatistics,_requestDataStatistics);}else{_requestDataStatistics();}
break;case'telephony':result.data=settings.lastTelephonyActivity;result.status='success';if(callback){callback(result);}
break;}
return;});}
function getServiceIssues(configuration,settings,connection){if(!connection||!connection.data||!connection.voice||!connection.voice.connected){return'no_service';}
var mode=ConfigManager.getApplicationMode();if(mode!=='PREPAID'){return'no_service';}
if(connection.voice.relSignalStrength===null){return'no_coverage';}
if(configuration.balance.minimum_delay){var isMinimumDelayHonored=Toolkit.checkEnoughDelay(configuration.balance.minimum_delay,settings.lastBalanceRequest);if(!isMinimumDelayHonored){return'minimum_delay';}}
return'';}
function getCostIssues(configuration,connection){var inRoaming=connection.voice.roaming;if(inRoaming&&configuration.is_roaming_free!==true){return'non_free_in_roaming';}
if(!inRoaming&&configuration.is_free!==true){return'non_free';}
return'';}
var BALANCE_TIMEOUT=5*60*1000;function requestBalance(configuration,settings,callback,result){debug('Requesting balance...');result.data=settings.lastBalance;function sendSMS(){debug('After IAC broadcast ask for starting - balance');var newSMS=mobileMessageManager.send(configuration.balance.destination,configuration.balance.text);newSMS.onsuccess=function _onSuccess(){debug('Request SMS sent! Waiting for response.');if(!DEBUGGING){mobileMessageManager.delete(newSMS.result.id);}
var newAlarm=addAlarmTimeout('balanceTimeout',BALANCE_TIMEOUT);newAlarm.onsuccess=function _alarmSet(evt){var id=evt.target.result;debug('Timeout for balance (',id,') update set to:',BALANCE_TIMEOUT);ConfigManager.setOption({'waitingForBalance':id,'lastBalanceRequest':new Date()},function _onSet(){isSendingBalanceRequest=false;result.status='success';if(callback){callback(result);}});};newAlarm.onerror=function _alarmFailedToSet(evt){ConfigManager.setOption({'lastBalanceRequest':new Date()},function _onSet(){isSendingBalanceRequest=false;debug('Failed to set timeout for balance request!');result.status='error';result.details='timeout_fail';if(callback){callback(result);}});};};newSMS.onerror=function _onError(){isSendingBalanceRequest=false;debug('Request SMS failed! But returning stored balance.');IACManager.broadcastEndOfSMSQuery('balance').then(function(msg){debug('After IAC broadcast ask for ending - balance');});result.status='error';result.details='request_fail';if(callback){callback(result);}};debug('Balance out of date. Requesting fresh data...');}
IACManager.init(configuration);IACManager.broadcastStartOfSMSQuery('balance').then(sendSMS,sendSMS);}
var TOPUP_TIMEOUT=5*60*1000;function requestTopUp(configuration,settings,code,callback,result){debug('Requesting TopUp with code',code,'...');function sendSMS(){debug('After IAC broadcast ask for starting - topup');var newSMS=mobileMessageManager.send(configuration.topup.destination,configuration.topup.text.replace(/\&code/g,code));newSMS.onsuccess=function _onSuccess(){debug('TopUp SMS sent! Waiting for response.');if(!DEBUGGING){mobileMessageManager.delete(newSMS.result.id);}
var newAlarm=addAlarmTimeout('topupTimeout',TOPUP_TIMEOUT);newAlarm.onsuccess=function _alarmSet(evt){var id=evt.target.result;debug('Timeout for TopUp (',id,') update set to:',TOPUP_TIMEOUT);ConfigManager.setOption({'waitingForTopUp':id,'lastTopUpRequest':new Date()},function _onSet(){result.status='success';if(callback){callback(result);}});};newAlarm.onerror=function _alarmFailedToSet(evt){debug('Failed to set timeout for TopUp request!');result.status='error';result.details='timeout_fail';if(callback){callback(result);}};};newSMS.onerror=function _onError(){debug('TopUp SMS failed!');IACManager.broadcastEndOfSMSQuery('topup').then(function(msg){debug('After IAC broadcast ask for ending - topup');});result.status='error';result.details='request_fail';if(callback){callback(result);}};}
IACManager.init(configuration);IACManager.broadcastStartOfSMSQuery('topup').then(sendSMS,sendSMS);}
var DAY=24*3600*1000;function requestDataStatistics(configuration,settings,callback,dataSimIcc,result,requestParameters){debug('Statistics out of date. Requesting fresh data...');var apps=requestParameters&&requestParameters.apps;var start=requestParameters&&requestParameters.startDate;var end=requestParameters&&requestParameters.endDate;if(!start){var maxAge=1000*statistics.maxStorageAge;var minimumStart=new Date(Date.now()-maxAge);debug('The max age for samples is '+minimumStart);start=new Date(settings.lastCompleteDataReset||Date.now()-7*DAY);if(start<minimumStart){console.warn('Start date is surpassing the maximum age for the '+'samples. Setting to '+minimumStart);start=minimumStart;}}
start=Toolkit.toMidnight(start);if(!end){var today=Toolkit.toMidnight(new Date());var tomorrow=new Date();tomorrow.setTime(today.getTime()+DAY);end=Toolkit.toMidnight(settings.nextReset?new Date(settings.nextReset.getTime()-DAY):tomorrow);}
if(start>end){console.error('Start date is higher than end date. This must not '+'happen. Changed end date to day after startDate');end=new Date(start.getTime()+DAY);}
var wifiInterface=Common.getWifiInterface();var currentSimcardNetwork=Common.getDataSIMInterface(dataSimIcc.iccId);var wifiRequests,simRequests;var pendingRequests=0;function checkForCompletion(){pendingRequests--;if(pendingRequests===0){updateDataUsage();}}
function updateDataUsage(){var lastDataUsage={timestamp:new Date(),start:start,end:end,today:today,wifi:{apps:{},total:0,samples:[]},mobile:{apps:{},total:0,samples:[]}};function saveLastDataUsage(perApp){var savedUsage={};Object.keys(lastDataUsage).forEach(function(key){var value=lastDataUsage[key];if(key==='wifi'||key==='mobile'){if(perApp){value=settings.lastDataUsage[key];}
savedUsage[key]={apps:{},total:value.total};Object.keys(value.apps).forEach(function(manifest){savedUsage[key].apps[manifest]={total:value.apps[manifest].total};});}else{savedUsage[key]=value;}});ConfigManager.setOption({'lastDataUsage':savedUsage},function _onSetItem(){debug('Statistics up to date and stored.');});}
function aggregateSamples(network){if(!network.apps){return;}
var manifestURLs=Object.keys(network.apps);if(manifestURLs.length===0){return;}
var samplesByDate={};var today=Toolkit.toMidnight(new Date());var offset=today.getTimezoneOffset()*60*1000;manifestURLs.forEach(function(manifestURL){var samples=network.apps[manifestURL].samples;samples.forEach(function(sample){if(sample.date&&sample.date.__date__){sample.date=new Date(sample.date.__date__);}
var sampleLocalTime=sample.date.getTime()+offset;var sampleUTCDate=Toolkit.toMidnight(new Date(sampleLocalTime));var aggregateSample=samplesByDate[sampleUTCDate.getTime()];if(!aggregateSample){aggregateSample=samplesByDate[sampleUTCDate.getTime()]={value:0,date:sample.date};}
aggregateSample.value+=sample.value;});});var dates=Object.keys(samplesByDate);network.samples=dates.map(function(date){return samplesByDate[date];});network.samples.sort(function(a,b){return a.date.getTime()-b.date.getTime();});}
function handleResult(request,network){var result=request.result;var data=adaptData(result);var manifestURL=request.result.appManifestURL;if(manifestURL&&manifestURL!=='null'){var isBrowser=request.result.browsingTrafficOnly&&manifestURL===Common.SYSTEM_MANIFEST;if(isBrowser){manifestURL=Common.BROWSER_APP.manifestURL;}
network.apps[manifestURL]={samples:data[0],total:data[1]};}else{network.samples=network.samples.concat(data[0]);}
network.total+=data[1];}
if(simRequests){simRequests.forEach(function(request){handleResult(request,lastDataUsage.mobile);});aggregateSamples(lastDataUsage.mobile);}
if(wifiRequests){wifiRequests.forEach(function(request){handleResult(request,lastDataUsage.wifi);});aggregateSamples(lastDataUsage.wifi);}
var perApp=apps&&apps.length>0;saveLastDataUsage(perApp);result.status='success';result.data=lastDataUsage;if(perApp){costcontrol.lastDataResultsPerApp=lastDataUsage;}else{costcontrol.lastDataResults=lastDataUsage;}
debug('Returning up to date statistics.');if(callback){callback(result);}}
function requestPerAppUsage(networkId){function requestSamples(options){pendingRequests++;var req=statistics.getSamples(networkId,start,end,options);req.onsuccess=checkForCompletion;return req;}
var requests;if(apps&&apps.length>0){requests=[];apps.forEach(function(manifestURL){if(manifestURL!==Common.SYSTEM_MANIFEST){var options={appManifestURL:manifestURL};if(manifestURL===Common.BROWSER_APP.manifestURL){options.appManifestURL=Common.SYSTEM_MANIFEST;options.browsingTrafficOnly=true;}
requests.push(requestSamples(options));}});}else{requests=[requestSamples()];}
return requests;}
if(currentSimcardNetwork){simRequests=requestPerAppUsage(currentSimcardNetwork);}
if(wifiInterface){wifiRequests=requestPerAppUsage(wifiInterface);}
if(pendingRequests===0){updateDataUsage();}}
function adaptData(networkStatsResult){var data=networkStatsResult.data;var output=[];var totalData,accum=0;for(var i=0;i<data.length;i++){var item=data[i];if(item.txBytes===undefined){output.push({date:item.date});continue;}
totalData=0;if(item.rxBytes){totalData+=item.rxBytes;}
if(item.txBytes){totalData+=item.txBytes;}
accum+=totalData;output.push({value:totalData,date:item.date});}
return[output,accum];}
return{getInstance:getInstance,reset:function _onReset(){costcontrol=null;}};}());;(function(){'use strict';function inStandAloneMode(){return window.parent.location.pathname==='/message_handler.html';}
if(!inStandAloneMode()){ConfigManager=window.parent.ConfigManager;CostControl=window.parent.CostControl;SimManager=window.parent.SimManager;}
if(inStandAloneMode()&&window.history.length>1){debug('Nothing to do in message handler, returning to app...');window.history.back();}
function inApplicationMode(){return window.parent.location.pathname==='/index.html';}
var closing;function closeIfProceeds(){debug('Checking for closing...');if(inStandAloneMode()){closing=Common.closeApplication();}}
function addAlarmTimeout(type,delay){var date=new Date();date.setTime(date.getTime()+delay);var request=navigator.mozAlarms.add(date,'ignoreTimezone',{type:type});return request;}
window.addAlarmTimeout=addAlarmTimeout;function setNextReset(when,callback){asyncStorage.getItem('nextResetAlarm',function(id){debug('Current nextResetAlarm',id+'.',id?'Removing.':'');if(id){navigator.mozAlarms.remove(id);}
if(!when){debug('Automatic reset disabled');updateResetAttributes(null,null,callback);return;}
if(when.getTime()<Date.now()){debug('Faking a past reset alarm');_onAlarm({data:{type:'nextReset'}});if(callback){setTimeout(callback);}
return;}
var alarms=navigator.mozAlarms;var request=alarms.add(when,'ignoreTimezone',{type:'nextReset'});request.onsuccess=function _onSuccess(){debug('Setting nextResetAlarm',request.result,'to',when);updateResetAttributes(request.result,when,callback);};});}
window.setNextReset=setNextReset;function getTopUpTimeout(callback){SimManager.requestDataSimIcc(function(dataSimIcc){ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){var request=navigator.mozAlarms.getAll();request.onsuccess=function(e){var alarms=e.target.result;var length=alarms.length;if(!length){callback(null);return;}
var refId=settings.waitingForTopUp;var index=0,alarm,found=false;while(index<length&&!found){alarm=alarms[index];found=(alarm.id===refId);index++;}
if(found){debug('TopUp timeout found:',alarm.date);callback(alarm.date);}else{callback(null);}};});});}
window.getTopUpTimeout=getTopUpTimeout;function addNetworkUsageAlarm(dataInterface,dataLimit,onsuccess,onerror){onsuccess=onsuccess||function(){};onerror=onerror||function(){};NetworkUsageAlarm.updateAlarm(dataInterface,dataLimit,onsuccess,onerror);}
window.addNetworkUsageAlarm=addNetworkUsageAlarm;function updateResetAttributes(alarmId,date,callback){asyncStorage.setItem('nextResetAlarm',alarmId,function _updateOption(){ConfigManager.setOption({nextReset:date},function _sync(){localStorage.sync='nextReset#'+Math.random();if(callback){callback();}});});}
function sendIncorrectTopUpNotification(callback){var title='topup-incorrectcode-title2';var message='topup-incorrectcode-message3';sendNotification('topUpError',title,message);if(callback){callback();}}
function sendBalanceThresholdNotification(remaining,settings,callback){debug('Low limit already notified:',settings.lowLimitNotified);debug('Zero balance already notified:',settings.lowLimitNotified);var type;if(remaining.balance===0&&!settings.zeroBalanceNotified){type='zeroBalance';}else if(settings.lowLimit&&remaining.balance<settings.lowLimitThreshold&&!settings.lowLimitNotified){type='lowBalance';}else if(callback){setTimeout(callback);return;}
debug('Notification type:',type);var remainingBalance=_('currency',{currency:remaining.currency,value:remaining.balance});var title='low-balance-notification-title';var message={id:'low-balance-notification-text',args:{remaining:remainingBalance}};if(type==='zeroBalance'){title='usage';message='zero-balance-message';}
sendNotification(type,title,message);var update={};var notified=(type==='lowBalance')?'lowLimitNotified':'zeroBalanceNotified';update[notified]=true;ConfigManager.setOption(update,callback);}
window.sendBalanceThresholdNotification=sendBalanceThresholdNotification;function _onAlarm(alarm){clearTimeout(closing);SimManager.requestDataSimIcc(function(dataSimIcc){function _launchNextReset(){ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){Common.resetAll(function updateNextResetAndClose(){Common.updateNextReset(settings.trackingPeriod,settings.resetTime,closeIfProceeds);});});}
switch(alarm.data.type){case'balanceTimeout':ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){settings.errors.BALANCE_TIMEOUT=true;ConfigManager.setOption({'errors':settings.errors,'waitingForBalance':null},function _onBalanceTimeout(){debug('Timeout for balance');debug('Trying to synchronize!');localStorage.sync='errors#'+Math.random();closeIfProceeds();});});break;case'topupTimeout':ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){settings.errors.TOPUP_TIMEOUT=true;ConfigManager.setOption({'errors':settings.errors,'waitingForTopUp':null},function _onBalanceTimeout(){debug('Timeout for topup');debug('Trying to synchronize!');localStorage.sync='errors#'+Math.random();closeIfProceeds();});});break;case'nextReset':if(!Common.allNetworkInterfaceLoaded){Common.loadNetworkInterfaces(_launchNextReset);}else{_launchNextReset();}
break;}});}
function getNofificationAction(type,app){var activityName,action;var noop=function(){};switch(type){case'lowBalance':case'zeroBalance':activityName='costcontrol/balance';action=function(){if(window.parent.BalanceTab){window.parent.CostControlApp.showBalanceTab();}};break;case'topUpError':activityName='costcontrol/balance';action=function(){if(window.parent.BalanceTab){window.parent.BalanceTab.topUpWithCode(true);}};break;default:activityName='costcontrol/data_usage';action=function(){if(window.parent.CostControlApp){window.parent.CostControlApp.showDataUsageTab();}};break;}
if(!inStandAloneMode()){return function(){if(inApplicationMode()){app.launch();action&&action();}else{type=new MozActivity({name:activityName});}};}
return noop;}
function sendNotification(notificationType,title,message){navigator.mozApps.getSelf().onsuccess=function _onAppReady(evt){var app=evt.target.result;var iconURL=NotificationHelper.getIconURI(app);var navigate=getNofificationAction(notificationType,app);NotificationHelper.send(title,{'bodyL10n':message,'icon':iconURL,'data':notificationType}).then(function(notification){notification.addEventListener('click',function(){notification.close();navigate();});});};}
function _onNetworkAlarm(alarm){clearTimeout(closing);navigator.mozApps.getSelf().onsuccess=function _onAppReady(evt){SimManager.requestDataSimIcc(function(dataSimIcc){ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){var limit=Common.getDataLimit(settings);var limitText=Formatting.formatData(Formatting.smartRound(limit));var title={id:'data-limit-notification-title2',args:{limit:limitText}};var message='data-limit-notification-text2';sendNotification('dataUsage',title,message);ConfigManager.setOption({'dataUsageNotified':true},closeIfProceeds);return;});});};}
function disableSilentModeFor(type,configuration){LazyLoader.load('js/iac_manager.js',function(){IACManager.init(configuration);IACManager.broadcastEndOfSMSQuery(type).then(function(msg){debug('After broadcasting for '+type+' (disabling)');});});}
var costcontrol;function _getCCInstance(){CostControl.getInstance(function _onCostControl(ccontrol){costcontrol=ccontrol;if(inStandAloneMode()||inApplicationMode()){debug('Installing handlers');navigator.mozSetMessageHandler('sms-received',function _onSMS(sms){clearTimeout(closing);ConfigManager.requestAll(function _onInfo(configuration,settings){var isBalanceResponse=configuration.balance&&Array.isArray(configuration.balance.senders)&&configuration.balance.senders.indexOf(sms.sender)>-1;var isTopupResponse=configuration.topup&&Array.isArray(configuration.topup.senders)&&configuration.topup.senders.indexOf(sms.sender)>-1;if(!isBalanceResponse&&!isTopupResponse){closeIfProceeds();return;}
debug('Parsing received SMS');var isBalance,isConfirmation,isError;isBalance=isConfirmation=isError=false;debug('Trying to recognize balance SMS');var description=new RegExp(configuration.balance.regexp);var balanceData=sms.body.match(description);if(!balanceData){debug('Trying to recognize zero balance SMS');var zeroDescription=configuration.balance.zero_regexp?new RegExp(configuration.balance.zero_regexp):null;if(zeroDescription&&zeroDescription.test(sms.body)){balanceData=['0.00','0','0'];}}
isBalance=!!balanceData;if(!isBalance||balanceData.length<2){console.warn('Impossible to parse balance message.');debug('Trying to recognize TopUp confirmation SMS');description=new RegExp(configuration.topup.confirmation_regexp);isConfirmation=!!sms.body.match(description);if(!isConfirmation){console.warn('Impossible to parse TopUp confirmation message.');debug('Trying to recognize TopUp error SMS');description=new RegExp(configuration.topup.incorrect_code_regexp);isError=!!sms.body.match(description);if(!isError){console.warn('Impossible to parse TopUp confirmation msg.');}}}
if(!isBalance&&!isConfirmation&&!isError){closeIfProceeds();return;}
if(!DEBUGGING&&(isBalance&&(settings.waitingForBalance!==null))||(isConfirmation&&(settings.waitingForTopUp!==null))){var mobileMessageManager=window.navigator.mozMobileMessage;mobileMessageManager.delete(sms.id);}
if(isBalance){var integer=balanceData[1].replace(/[^0-9]/g,'');var decimal=balanceData[2]||'0';var newBalance={balance:parseFloat(integer+'.'+decimal),currency:configuration.credit.currency,timestamp:new Date()};if(settings.waitingForBalance!==null){navigator.mozAlarms.remove(settings.waitingForBalance);debug('Balance timeout:',settings.waitingForBalance,'removed');disableSilentModeFor('balance',configuration);}
ConfigManager.setOption({'lastBalance':newBalance,'waitingForBalance':null},function _onSet(){debug('Balance up to date and stored');debug('Trying to synchronize!');localStorage.sync='lastBalance#'+Math.random();sendBalanceThresholdNotification(newBalance,settings,closeIfProceeds);});}else if(isConfirmation){if(settings.waitingForTopUp!==null){navigator.mozAlarms.remove(settings.waitingForTopUp);debug('TopUp timeout:',settings.waitingForTopUp,'removed');disableSilentModeFor('topup',configuration);}
ConfigManager.setOption({'waitingForTopUp':null,'lowLimitNotified':false,'zeroBalanceNotified':false},function _onSet(){debug('TopUp confirmed!');debug('Trying to synchronize!');localStorage.sync='waitingForTopUp#'+Math.random();closeIfProceeds();});}else if(isError){settings.errors.INCORRECT_TOPUP_CODE=true;navigator.mozAlarms.remove(settings.waitingForTopUp);debug('TopUp timeout: ',settings.waitingForTopUp,'removed');ConfigManager.setOption({'errors':settings.errors,'waitingForTopUp':null,'lowLimitNotified':false,'zeroBalanceNotified':false},function _onSet(){debug('Balance up to date and stored');debug('Trying to synchronize!');localStorage.sync='errors#'+Math.random();sendIncorrectTopUpNotification(closeIfProceeds);});}});});navigator.mozSetMessageHandler('networkstats-alarm',_onNetworkAlarm);navigator.mozSetMessageHandler('alarm',_onAlarm);navigator.mozSetMessageHandler('sms-sent',function _onSent(sms){clearTimeout(closing);debug('SMS sent!');var configuration=ConfigManager.configuration;var mode=ConfigManager.getApplicationMode();if(mode==='PREPAID'&&!costcontrol.isBalanceRequestSMS(sms,configuration)){costcontrol.request({type:'balance'});}
if(mode==='PREPAID'&&costcontrol.isBalanceRequestSMS(sms,configuration)){closeIfProceeds();}else{var mobileMessageManager=window.navigator.mozMobileMessage;var infoRequest=mobileMessageManager.getSegmentInfoForText(sms.body);infoRequest.onsuccess=function onInfo(evt){var realCount,smsInfo=evt.target.result;if(!smsInfo||!smsInfo.segments){console.error('Invalid getSegmentInfoForText() result. Counting 1 segment');realCount=1;}else{realCount=smsInfo.segments;}
updateSMSCount(realCount);};infoRequest.onerror=function onError(){console.error('Can not retrieve segment info for body '+
sms.body);updateSMSCount(1);};}
function updateSMSCount(count){SimManager.requestDataSimIcc(function(dataSimIcc){ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){settings.lastTelephonyActivity.timestamp=new Date();settings.lastTelephonyActivity.smscount+=count;ConfigManager.setOption({lastTelephonyActivity:settings.lastTelephonyActivity},function _sync(){localStorage.sync='lastTelephonyActivity#'+Math.random();closeIfProceeds();});});});}});navigator.mozSetMessageHandler('telephony-call-ended',function _onCall(tcall){clearTimeout(closing);if(tcall.direction!=='outgoing'){closeIfProceeds();return;}
debug('Outgoing call finished!');SimManager.requestDataSimIcc(function(dataSimIcc){ConfigManager.requestSettings(dataSimIcc.iccId,function _onSettings(settings){var mode=ConfigManager.getApplicationMode();if(mode==='PREPAID'){costcontrol.request({type:'balance'});}
settings.lastTelephonyActivity.timestamp=new Date();settings.lastTelephonyActivity.calltime+=tcall.duration;ConfigManager.setOption({lastTelephonyActivity:settings.lastTelephonyActivity},function _sync(){localStorage.sync='lastTelephonyActivity#'+Math.random();closeIfProceeds();});});});});}
var readyEvent=new CustomEvent('messagehandlerready');window.parent.dispatchEvent(readyEvent);});}
_getCCInstance();}());