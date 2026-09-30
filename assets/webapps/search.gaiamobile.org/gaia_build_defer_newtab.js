;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return deferred.promise;}};return new LazyLoader();}());;this.asyncStorage=(function(){'use strict';var DBNAME='asyncStorage';var DBVERSION=1;var STORENAME='keyvaluepairs';var db=null;function withDatabase(f){if(db){f();}else{var openreq=indexedDB.open(DBNAME,DBVERSION);openreq.onerror=function withStoreOnError(){console.error('asyncStorage: can\'t open database:',openreq.error.name);};openreq.onupgradeneeded=function withStoreOnUpgradeNeeded(){openreq.result.createObjectStore(STORENAME);};openreq.onsuccess=function withStoreOnSuccess(){db=openreq.result;f();};}}
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
return{getItem:getItem,setItem:setItem,removeItem:removeItem,clear:clear,length:length,key:key};}());;(function(exports){'use strict';var DB_NAME='places_idb_store';var DB_VERSION=3;var PLACES_STORE='places';var VISITS_STORE='visits';function PlacesIdbStore(){}
PlacesIdbStore.prototype={db:null,latestRevision:null,init:function(){var self=this;return new Promise(function(resolve,reject){var req=window.indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=self.upgradeSchema;req.onsuccess=function(e){self.db=e.target.result;asyncStorage.getItem('latest-revision',function(value){self.latestRevision=value||0;resolve();});};});},upgradeSchema:function(e){var db=e.target.result;var fromVersion=e.oldVersion;if(fromVersion<1){var places=db.createObjectStore(PLACES_STORE,{keyPath:'url'});places.createIndex('frecency','frecency',{unique:false});places.createIndex('visited','visited',{unique:false});}
if(fromVersion<2){asyncStorage.removeItem('latest-revision');var visits=db.createObjectStore(VISITS_STORE,{keyPath:'date'});visits.createIndex('date','date',{unique:true});}
if(fromVersion<3){var oStore=e.target.transaction.objectStore(VISITS_STORE);oStore.createIndex('url','url',{unique:false});}},add:function(id,data,rev){return new Promise((resolve,reject)=>{var txn=this.db.transaction([PLACES_STORE,VISITS_STORE],'readwrite');if(data.visits&&data.visits.length===0){this._removeUrl(id).then(this.saveAndResolve(rev,resolve));}else{txn.objectStore(PLACES_STORE).put(data);if(!data.visits){data.visits=Number.isFinite(data.visited)?[data.visited]:[];}
var visitsStore=txn.objectStore(VISITS_STORE);data.visits.filter(Number.isFinite).forEach(function(date){visitsStore.put({date:date,url:data.url,title:data.title,icons:data.icons});});txn.oncomplete=this.saveAndResolve(rev,resolve);}});},addPlace:function(place){return new Promise((resolve,reject)=>{var txn=this.db.transaction([PLACES_STORE],'readwrite');txn.objectStore(PLACES_STORE).put(place);txn.oncomplete=resolve;});},remove:function(id,rev){return new Promise((resolve,reject)=>{this._removeUrl(id).then(this.saveAndResolve(rev,resolve));});},_removeUrl:function(id){return Promise.all([new Promise((resolve,reject)=>{var txn=this.db.transaction([PLACES_STORE],'readwrite');txn.objectStore(PLACES_STORE).delete(id);txn.oncomplete=resolve;}),new Promise((resolve,reject)=>{var txn=this.db.transaction([VISITS_STORE],'readwrite');var visitsStore=txn.objectStore(VISITS_STORE);var urlIndex=visitsStore.index('url');var req=urlIndex.openCursor(IDBKeyRange.only(id));req.onsuccess=function(){var cursor=req.result;if(cursor){visitsStore.delete(cursor.primaryKey);cursor.continue();}else{resolve();}};})]);},clear:function(rev){return new Promise((resolve,reject)=>{var txn=this.db.transaction([PLACES_STORE,VISITS_STORE],'readwrite');txn.objectStore(PLACES_STORE).clear();txn.objectStore(VISITS_STORE).clear();txn.oncomplete=this.saveAndResolve(rev,resolve);});},saveAndResolve:function(rev,resolve){return function(){asyncStorage.setItem('latest-revision',rev);resolve();};},readStore:function(store,index,limit,done,filter){var results=[];var txn=this.db.transaction(store,'readonly');var oStore=txn.objectStore(store);oStore.index(index).openCursor(null,'prev').onsuccess=function(event){var cursor=event.target.result;if(cursor){if(!filter||filter(cursor.value)){results.push(cursor.value);}
if(results.length<limit){cursor.continue();}}};txn.oncomplete=function(){done(results);};},read:function(index,limit,done,filter){this.readStore(PLACES_STORE,index,limit,done,filter);},readVisits:function(limit,done,filter){this.readStore(VISITS_STORE,'date',limit,done,filter);}};exports.PlacesIdbStore=PlacesIdbStore;})(window);;(function syncStore(exports){'use strict';function onChange(evt){var self=this;doSync(this).then(function(){if(typeof self.onChangeFN==='function'){self.onChangeFN(self,evt);}},error=>console.error('DataStore sync '+self.STORE_NAME+': '+error));}
function ensureDS(SDS){if(SDS.store!==null){return Promise.resolve(SDS);}
return new Promise(function(resolve,reject){navigator.getDataStores(SDS.STORE_NAME).then(function(stores){if(!Array.isArray(stores)||stores.length<1){reject('Could not find store '+SDS.STORE_NAME);return;}
SDS.store=stores[0];SDS.store.addEventListener('change',onChange.bind(SDS));resolve(SDS);});});}
function doSync(SDS) {
    var prior = SDS.syncQueue || Promise.resolve();
    var next = prior.then(function() {
      if (!SDS.store) throw new Error('Store not initialised');
      SDS.syncInProgress = true;
      var cursor = SDS.store.sync(SDS.lastRevision);
      function step() { return cursor.next().then(function(task) {
        var result;
        switch (task.operation) {
          case 'add': case 'update':
            if (task.data && SDS.keyField in task.data && !SDS.filterFN(task.data))
              result = SDS.persistStore.add(task.data[SDS.keyField], task.data, task.revisionId);
            break;
          case 'clear': result = SDS.persistStore.clear(task.revisionId); break;
          case 'remove': result = SDS.persistStore.remove(task.id, task.revisionId); break;
          case 'done': SDS.lastRevision = task.revisionId; return;
        }
        return Promise.resolve(result).then(step);
      }); }
      return step().then(function(){SDS.syncInProgress=false;},function(e){SDS.syncInProgress=false;cursor.close();throw e;});
    });
    SDS.syncQueue = next.catch(function(){});
    return next;
  }
  function SyncDataStore(name,persist,key){this.STORE_NAME=name;this.store=null;this.synced=false;this.lastRevision=0;this.keyField=key||'id';this.onChangeFN=null;this.syncInProgress=false;this.persistStore=persist;this.filterFN=function(){return false;};}
SyncDataStore.prototype={sync:function(revisionId){this.lastRevision=revisionId||this.lastRevision;return ensureDS(this).then(doSync);},set onChange(onChange){this.onChangeFN=onChange.bind(this);},set filter(fn){this.filterFN=fn;}};function InMemoryStore(){this.results={};}
InMemoryStore.prototype={add:function(id,data){this.results[id]=data;},update:function(id,data){this.results[id]=data;},clear:function(){this.results={};},remove:function(id){delete this.results[id];}};exports.SyncDataStore=SyncDataStore;exports.InMemoryStore=InMemoryStore;})(window);;'use strict';var rscheme=/^(?:[a-z\u00a1-\uffff0-9-+]+)(?::(?:\/\/)?)/i;var UrlHelper={a:null,getUrlFromInput:function urlHelper_getUrlFromInput(input){this.a=this.a||document.createElement('a');this.a.href=input;return this.a.href;},_getScheme:function(input){return(rscheme.exec(input)||[])[0];},hasScheme:function(input){return!!this._getScheme(input);},isURL:function urlHelper_isURL(input){return!UrlHelper.isNotURL(input);},isNotURL:function urlHelper_isNotURL(input){var case1Reg=/^(\?)|(\?.+\s)/;var case2Reg=/[\?\.\s\:]/;var case3Reg=/^(data|view-source)\:/;var str=input.trim();if(case1Reg.test(str)||!case2Reg.test(str)||this._getScheme(str)===str){return true;}
if(case3Reg.test(str)){return false;}
if(!this.hasScheme(str)){str='http://'+str;}
if(!this.urlValidate){this.urlValidate=document.createElement('input');this.urlValidate.setAttribute('type','url');}
this.urlValidate.setAttribute('value',str);return!this.urlValidate.validity.valid;},resolveUrl:function urlHelper_resolveURL(url,baseUrl){if(!url){return null;}
try{return new URL(url,baseUrl).href;}catch(e){return null;}},getHostname:function urlHelper_getHostname(url){try{return new URL(url).hostname;}catch(e){return null;}}};;'use strict';var DateHelper={todayStarted:function dh_todayStarted(){var now=(new Date()).valueOf();return this.getMidnight(now);},yesterdayStarted:function dh_yesterdayStarted(){var now=(new Date()).valueOf();var dayAgo=now-86400000;return this.getMidnight(dayAgo);},thisWeekStarted:function dh_thisWeekStarted(){var now=new Date();var dayOfTheWeek=now.getDay();var firstDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dayOfTheWeek);return this.getMidnight(firstDay);},thisMonthStarted:function dh_thisMonthStarted(){var now=new Date();var firstDay=(new Date(now.getFullYear(),now.getMonth(),1).valueOf());return firstDay;},lastSixMonthsStarted:function dh_lastSixMonthsStarted(){var now=new Date().valueOf();var sixMonthsAgo=now-2629743830*6;return sixMonthsAgo;},thisYearStarted:function dh_thisYearStarted(){var now=new Date();var firstDay=(new Date(now.getFullYear(),0).valueOf());return firstDay;},getMidnight:function dh_getMidnight(timestamp){var day=new Date(timestamp);var midnight=(new Date(day.getFullYear(),day.getMonth(),day.getDate(),0).valueOf());return midnight;}};var NumberHelper={zfill:function nh_zfill(string,len){var s=string;while(s.length<len){s='0'+s;}
return s;}};var StringHelper={fromUTF8:function ut_fromUTF8(str){var buf=new Uint8Array(str.length);for(var i=0;i<str.length;i++){buf[i]=str.charCodeAt(i);}
return buf;},camelCase:function ut_camelCase(str){var rdashes=/-(.)/g;return str.replace(rdashes,function replacer(str,p1){return p1.toUpperCase();});}};var HtmlHelper={createHighlightHTML:function ut_createHighlightHTML(text,terms){var toHighlight=[];var normalizedText=Normalizer.toAscii(text).toLowerCase();terms.forEach(function(term){term=Normalizer.toAscii(term).toLowerCase();var index=normalizedText.indexOf(term);while(index>=0){for(var i=0,length=term.length;i<length;i++){toHighlight[index+i]=true;}
index=normalizedText.indexOf(term,index+term.length);}});var fragment=document.createDocumentFragment();for(var i=0;i<text.length;i++){if(!toHighlight[i]){fragment.appendChild(document.createTextNode(text[i]));}else{var term='';while(toHighlight[i]){term+=text[i];i++;}
i--;var mark=document.createElement('mark');mark.textContent=term;fragment.appendChild(mark);}}
return fragment;},escapeHTML:function ut_escapeHTML(str,escapeQuotes){var span=document.createElement('span');span.textContent=str;span.innerHTML=span.innerHTML.replace(/\s/g,'&nbsp;');if(escapeQuotes){return span.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}
return span.innerHTML;},importElements:function importElements(context){var ids=[].slice.call(arguments,1);ids.forEach(function(id){context[StringHelper.camelCase(id)]=document.getElementById(id);});}};;'use strict';var SettingsListener={_lock:null,_observers:[],getSettingsLock:function sl_getSettingsLock(){if(this._lock&&!this._lock.closed){return this._lock;}
var settings=window.navigator.mozSettings;return(this._lock=settings.createLock());},observe:function sl_observe(name,defaultValue,callback){var settings=window.navigator.mozSettings;if(!settings){window.setTimeout(function(){callback(defaultValue);});return;}
var req;try{req=this.getSettingsLock().get(name);}catch(e){console.warn('Stale lock in settings_listener.js.','See https://bugzilla.mozilla.org/show_bug.cgi?id=793239');this._lock=null;req=this.getSettingsLock().get(name);}
req.addEventListener('success',(function onsuccess(){callback(typeof(req.result[name])!='undefined'?req.result[name]:defaultValue);}));var settingChanged=function settingChanged(evt){callback(evt.settingValue);};settings.addObserver(name,settingChanged);this._observers.push({name:name,callback:callback,observer:settingChanged});},unobserve:function sl_unobserve(name,callback){var settings=window.navigator.mozSettings;var that=this;this._observers.forEach(function(value,index){if(value.name===name&&value.callback===callback){settings.removeObserver(name,value.observer);that._observers.splice(index,1);}});}};;'use strict';(function(exports){var isManuallyPrivate=window.location.search.includes('private=1');var isManuallyRegular=window.location.search.includes('private=0');var isPrivateByDefault=false;SettingsListener.observe('browser.private.default',false,function(value){if(value){isPrivateByDefault=true;}else{isPrivateByDefault=false;}
exports.newtab.togglePrivacyMode();});function Newtab(){var self=this;navigator.mozApps.getSelf().onsuccess=function(){var app=this.result;app.connect('search-results').then(function onConnAccepted(ports){ports.forEach(function(port){self._port=port;});self.init();},function onConnectionRejected(reason){console.log('Error connecting: '+reason+'\n');});};this.togglePrivacyMode();}
Newtab.prototype={provider:null,init:function(){this.provider.init();this.provider.searchObj=this;},requestScreenshot:function(url){this._port.postMessage({'action':'request-screenshot','url':url});},requestPrivateWindow:function(){this._port.postMessage({'action':'private-window'});},togglePrivacyMode:function(){var themeMeta=document.querySelector('meta[name="theme-color"]');var themeColor=document.createElement('meta');if((isPrivateByDefault&&!isManuallyRegular)||(!isPrivateByDefault&&isManuallyPrivate)){if(themeMeta){document.head.removeChild(themeMeta);}
themeColor.setAttribute('name','theme-color');themeColor.setAttribute('content','#392E54');document.head.appendChild(themeColor);document.body.classList.add('private');asyncStorage.getItem('shouldSuppressPrivateDialog',value=>{if(value){return;}
this.privateBrowserDialog=document.getElementById('private-window-dialog');this.privateBrowserDialog.removeAttribute('hidden');this.privateBrowserDialogClose=document.getElementById('private-window-hide-dialog');this.privateBrowserDialogClose.addEventListener('click',this);this.privateBrowserLearnMore=document.getElementById('private-learn-more');this.privateBrowserLearnMore.addEventListener('click',this);});}
if(isPrivateByDefault&&isManuallyRegular){if(themeMeta){document.head.removeChild(themeMeta);}}},handleEvent:function(e){switch(e.target){case this.privateBrowserDialogClose:this.hidePrivateBrowserDialog();break;case this.privateBrowserLearnMore:this.learnAboutPrivateBrowsing(e);break;}},hidePrivateBrowserDialog:function(){this.privateBrowserDialog.setAttribute('hidden',true);var checkbox=this.privateBrowserDialog.querySelector('gaia-checkbox');if(checkbox.checked){asyncStorage.setItem('shouldSuppressPrivateDialog',true);}},learnAboutPrivateBrowsing:function(e){e.preventDefault();new MozActivity({name:'view',data:{type:'url',url:e.target.href}});}};exports.newtab=new Newtab();exports.Search={provider:function(provider){exports.newtab.provider=provider;},navigate:function(url){new MozActivity({name:'view',data:{type:'url',url:url}});}};})(window);;'use strict';(function IconsHelper(exports){const ICON_CACHE_PERIOD=24*60*60*1000;const FETCH_XHR_TIMEOUT=10000;const DEBUG=false;var dataStore=null;function getDefaultIconSize(){var dpr=window.devicePixelRatio;return(dpr&&dpr>1)?142:84;}
function sizeIsNearer(size1,size2,targetSize){var delta1=Math.abs(targetSize-size1);var delta2=Math.abs(targetSize-size2);return(delta1<=delta2);}
function getIcon(uri,iconTargetSize,placeObj={},siteObj={}){var iconUrl=null;iconTargetSize=iconTargetSize*window.devicePixelRatio;if(siteObj.webManifestUrl&&siteObj.webManifest){iconUrl=getBestIconFromWebManifest(siteObj.webManifest,iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Web Manifest');}}
if(!iconUrl&&siteObj.manifest&&siteObj.manifest.icons){iconUrl=getBestIconFromWebManifest({icons:_convertToWebManifestIcons(siteObj.manifest,siteObj.origin||siteObj.manifest.origin)},iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Firefox App Manifest');}}
if(!iconUrl&&placeObj&&placeObj.icons){iconUrl=getBestIconFromMetaTags(placeObj.icons,iconTargetSize);if(DEBUG&&iconUrl){console.log('Icon from Meta tags');}}
if(!iconUrl){var a=document.createElement('a');a.href=uri;iconUrl=a.origin+'/favicon.ico';if(iconTargetSize){iconUrl+='#-moz-resolution='+iconTargetSize+','+iconTargetSize;}
DEBUG&&console.log('Icon from favicon.ico');}
return new Promise(resolve=>{resolve(iconUrl);});}
function getIconBlob(uri,iconTargetSize,placeObj={},siteObj={}){return new Promise((resolve,reject)=>{getIcon(uri,iconTargetSize,placeObj,siteObj).then(iconUrl=>{getStore().then(iconStore=>{iconStore.get(iconUrl).then(iconObj=>{if(!iconObj||!iconObj.timestamp||Date.now()-iconObj.timestamp>=ICON_CACHE_PERIOD){return fetchIconBlob(iconUrl).then(iconBlob=>{var img=document.createElement('img');var icon=new Icon(img,uri);icon.renderBlob(iconBlob,{size:iconTargetSize,onLoad:function(blob){var iconObj={blob:blob,originalUrl:iconUrl.toString(),timestamp:Date.now()};resolve(iconObj);iconStore.add(iconObj,iconUrl);},onerror:function(e){reject(`Failed to fetch icon ${iconUrl}`);}});}).catch(err=>{reject(`Failed to fetch icon ${iconUrl}: ${err}`);});}
return resolve(iconObj);}).catch(err=>{reject(`Failed to get icon from dataStore: ${err}`);});}).catch(err=>{reject(`Error opening the dataStore: ${err}`);});});});}
function setElementIcon(icon,targetSize){return getIconBlob(icon.bookmark.url,targetSize,icon.bookmark,icon.bookmark).then(iconObj=>{if(iconObj.blob){icon.icon=iconObj.blob;return Promise.resolve();}else if(icon.bookmark.icon){return fetchIconBlob(icon.bookmark.icon).then(iconBlob=>{icon.icon=iconBlob;return Promise.resolve();},Promise.reject.bind(Promise));}
return Promise.reject('No icon data found');},Promise.reject.bind(Promise));}
function getBestIconFromWebManifest(webManifest,iconSize){var icons=webManifest.icons;if(!icons){return null;}
var maxSize=10000;var bestSize=maxSize;var iconURL=null;iconSize=iconSize||getDefaultIconSize();icons.forEach((potentialIcon)=>{if(!iconURL){iconURL=potentialIcon.src;}
var sizes=Array.from(potentialIcon.sizes);var nearestSize=getNearestSize(sizes,iconSize,bestSize);if(nearestSize!==bestSize&&sizeIsNearer(nearestSize,bestSize,iconSize)){iconURL=potentialIcon.src;bestSize=nearestSize;}});return iconURL?iconURL:null;}
function _convertToWebManifestIcons(manifest,origin){return Object.keys(manifest.icons).map(function(size){var url=manifest.icons[size];var sizes=[size+'x'+size];url=url.indexOf('http')>-1?url:origin+url;return{src:new URL(url),sizes:sizes};});}
function getBestIconFromMetaTags(icons,iconSize){if(!icons){return null;}
iconSize=iconSize||getDefaultIconSize();var iconURL=null;var bestSize=10000;Object.keys(icons).forEach((uri)=>{var potentialIcon=icons[uri];if(!iconURL){iconURL=uri;}
var sizes=Array.from(potentialIcon.sizes);var nearestSize=getNearestSize(sizes,iconSize,bestSize);if(nearestSize!==bestSize&&sizeIsNearer(nearestSize,bestSize,iconSize)){iconURL=uri;bestSize=nearestSize;}
if(potentialIcon.rel==='apple-touch-icon'||potentialIcon.rel==='apple-touch-icon-precomposed'){var moreInfoUrl='https://developer.mozilla.org/en-US/'+'Apps/Build/Icon_implementation_for_apps#General_icons_for_web_apps';console.warn('Warning: The apple-touch icons are being used '+'as a fallback only. They will be deprecated in '+'the future. See '+moreInfoUrl);}});return iconURL||null;}
function getNearestSize(sizes,iconSize,bestSize){var bogusSize=10000;if(!bestSize){bestSize=bogusSize;}
var nearestSize=sizes.reduce(function(nearestSize,sizeString,idx){var size=widthFromSizeString(sizeString);if(isNaN(size)){return nearestSize;}
if(sizeIsNearer(size,nearestSize,iconSize)){return size;}else{return nearestSize;}},bestSize);return nearestSize===bogusSize?-1:nearestSize;}
function widthFromSizeString(size){size=size||'';var xIndex=size.indexOf('x');if(!xIndex){return NaN;}
return parseInt(size.substr(0,xIndex));}
function getStore(){return new Promise(resolve=>{if(dataStore){return resolve(dataStore);}
navigator.getDataStores('icons').then(stores=>{dataStore=stores[0];return resolve(dataStore);});});}
function clear(){return getStore().then(iconStore=>{iconStore.clear();});}
function fetchIcon(iconUrl){return new Promise((resolve,reject)=>{fetchIconBlob(iconUrl).then((iconBlob)=>{var img=document.createElement('img');img.src=URL.createObjectURL(iconBlob);img.onload=()=>{var iconSize=Math.max(img.naturalWidth,img.naturalHeight);resolve({blob:iconBlob,url:iconUrl,size:iconSize,timestamp:Date.now()});};img.onerror=()=>{reject(new Error(`Error while loading image.`));};}).catch((e)=>{reject(new Error(`Error while loading image: ${e}`));});});}
function fetchIconBlob(iconUrl){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest({mozAnon:true,mozSystem:true});xhr.open('GET',iconUrl,true);xhr.responseType='blob';xhr.timeout=FETCH_XHR_TIMEOUT;xhr.send();xhr.onload=()=>{if(xhr.readyState===XMLHttpRequest.DONE&&xhr.status===200){var iconBlob=xhr.response;resolve(iconBlob);return;}
reject(new Error(`Got HTTP status ${xhr.status} trying to load ${iconUrl}.`));};xhr.onerror=xhr.ontimeout=()=>{reject(new Error(`Error while getting ${iconUrl}.`));};});}
exports.IconsHelper={getIcon:getIcon,getIconBlob:getIconBlob,setElementIcon:setElementIcon,getBestIconFromWebManifest:getBestIconFromWebManifest,getBestIconFromMetaTags:getBestIconFromMetaTags,fetchIcon:fetchIcon,fetchIconBlob:fetchIconBlob,get defaultIconSize(){return getDefaultIconSize();},clear:clear,getNearestSize:getNearestSize,};})(window);;'use strict';function Provider(){}
Provider.prototype={name:'Provider',dedupes:false,init:function(searchObj){this.searchObj=searchObj;this.container=document.getElementById(this.name.toLowerCase());this.container.addEventListener('click',this.click.bind(this));},clear:function(){this.container.innerHTML='';},click:function(){},abort:function(){if(this.request&&this.request.abort){this.request.abort();}},updateIcon:function(config,iconWrapper){var iconDom=iconWrapper.querySelector('img');IconsHelper.getIcon(config.dataset.url,null,config).then((icon)=>{if(icon&&iconDom){iconDom.onload=function(){iconWrapper.classList.remove('empty');iconDom.style.display='block';};iconDom.src=icon;}});},buildResultsDom:function(results){var frag=document.createDocumentFragment();results.forEach(function(config,index){var result=document.createElement('div');var iconWrapper=document.createElement('div');var icon=document.createElement('img');var description=document.createElement('div');var title=document.createElement('span');var meta=document.createElement('small');result.classList.add('result');iconWrapper.classList.add('icon');description.classList.add('description');title.classList.add('title');meta.classList.add('meta');for(var i in config.dataset){result.dataset[i]=config.dataset[i];}
if(config.title){title.setAttribute('dir','auto');title.textContent=config.title;}else{title.setAttribute('dir','ltr');title.textContent=config.url;}
if(config.meta){meta.textContent=config.meta;if(config.description){meta.id=this.name+'-description-'+index;meta.setAttribute('aria-label',config.description);result.setAttribute('aria-describedby',meta.id);}}
icon.setAttribute('role','presentation');if(config.icon){icon.src=window.URL.createObjectURL(config.icon);}else{iconWrapper.classList.add('empty');}
result.setAttribute('role','link');result.setAttribute('aria-label',config.label||config.title);description.appendChild(title);description.appendChild(meta);iconWrapper.appendChild(icon);result.appendChild(iconWrapper);result.appendChild(description);frag.appendChild(result);if(!config.icon){this.updateIcon(config,iconWrapper);}},this);return frag;},render:function(results){var dom=this.buildResultsDom(results);this.container.appendChild(dom);if(this.header){results.length?this.header.classList.remove('hidden'):this.header.classList.add('hidden');}}};;'use strict';function DataGridProvider(){}
DataGridProvider.prototype={__proto__:Provider.prototype,name:'DataGridProvider',isGridProvider:true,init:function(){this.grid=document.getElementById('icons');},clear:function(){this.grid.clear();},render:function(results){results.forEach(function(config,index){this.grid.add(config.data);},this);this.grid.render({skipDivider:true});}};;(function(exports){'use strict';var _=navigator.mozL10n.get;var MAX_AWESOME_RESULTS=4;var MAX_HISTORY_RESULTS=20;var MAX_TOPSITES_RESULTS=6;var STORE_NAME='places';var topSitesWrapper=document.getElementById('top-sites');var historyWrapper=document.getElementById('history');if(topSitesWrapper&&historyWrapper){topSitesWrapper.addEventListener('click',itemClicked);historyWrapper.addEventListener('click',itemClicked);}
var cachedLink=document.createElement('a');function parseUrl(url){cachedLink.href=url;return cachedLink;}
var icons={};var iconUrls={};function getIcon(place){if(place.url in icons&&icons[place.url]){return icons[place.url];}
IconsHelper.getIcon(place.url,null,place).then(icon=>{saveIcon(place.url,icon);});return false;}
function saveIcon(key,url){if(key in icons){return;}
icons[key]=null;iconUrls[key]=url;fetchIcon(url,function(err,icon){if(!err){icons[key]=icon;}});}
function fetchIcon(uri,callback){var xhr=new XMLHttpRequest({mozSystem:true});xhr.open('GET',uri,true);xhr.responseType='blob';xhr.addEventListener('load',function(){if(!(xhr.status===200||xhr.status===0)){return callback(new Error('error_downloading'));}
var blob=xhr.response;if(blob.size>this.MAX_ICON_SIZE){return callback(new Error('image_to_large'));}
var img=document.createElement('img');img.src=window.URL.createObjectURL(blob);img.onload=function(){window.URL.revokeObjectURL(img.src);if(img.naturalWidth<=0){return callback(new Error('Cannot load image'));}
callback(null,blob);};img.onerror=function(){window.URL.revokeObjectURL(img.src);return callback(new Error('Cannot load image'));};});xhr.onerror=function(err){return callback(new Error('Cannot load uri'));};xhr.send();}
function itemClicked(e){if(e.target.dataset.url){Search.navigate(e.target.dataset.url);}}
var listTemplate=createList();function createList(){var list=document.createElement('ul');list.setAttribute('role','listbox');return list;}
function incrementHistoryThreshold(timestamp,currentThreshold,thresholds){var newThreshold=currentThreshold+=1;if(timestamp<thresholds[newThreshold]){return incrementHistoryThreshold(timestamp,newThreshold,thresholds);}
return newThreshold;}
function drawHistoryHeading(parent,threshold,timestamp){var LABELS=['future','today','yesterday','last-7-days','this-month','last-6-months','older-than-6-months'];var text='';if(threshold==5&&timestamp){var date=new Date(timestamp);var now=new Date();text=_('month-'+date.getMonth());if(date.getFullYear()!=now.getFullYear()){text+=' '+date.getFullYear();}}else{text=_(LABELS[threshold]);}
var h3=document.createElement('h3');var spanNode=document.createElement('span');spanNode.textContent=text;var ul=listTemplate.cloneNode(true);h3.appendChild(spanNode);parent.appendChild(h3);parent.appendChild(ul);}
function updateIcon(visit,iconWrapper){var iconDom=iconWrapper.querySelector('img');IconsHelper.getIcon(visit.url,null,visit).then((icon)=>{if(icon&&iconDom){iconDom.onload=function(){iconWrapper.classList.remove('empty');iconDom.style.display='block';};iconDom.src=icon;}});}
function buildHistory(visits){var thresholds=[Date.now(),DateHelper.todayStarted(),DateHelper.yesterdayStarted(),DateHelper.thisWeekStarted(),DateHelper.thisMonthStarted(),DateHelper.lastSixMonthsStarted(),0];var threshold=0;var month=null;var year=null;var fragment=document.createDocumentFragment();visits.forEach(function(visit){if(visit.date>0&&visit.date<thresholds[threshold]){threshold=incrementHistoryThreshold(visit.date,threshold,thresholds);if(threshold!=5){drawHistoryHeading(fragment,threshold);}}
if(threshold===5){var timestampDate=new Date(visit.date);if(timestampDate.getMonth()!=month||timestampDate.getFullYear()!=year){month=timestampDate.getMonth();year=timestampDate.getFullYear();drawHistoryHeading(fragment,threshold,visit.date);}}
visit.meta=visit.url;visit.dataset={url:visit.url};var dom=exports.Places.buildResultsDom([visit]);var iconDom=dom.querySelector('.icon');fragment.appendChild(dom);updateIcon(visit,iconDom);});return fragment;}
function showStartPage(){if(!topSitesWrapper||!historyWrapper){return;}
var store=exports.Places.persistStore;var urls=[];store.readVisits(MAX_HISTORY_RESULTS,function(results){var docFragment=buildHistory(results);historyWrapper.innerHTML='';historyWrapper.appendChild(docFragment);},function filter(visit){var isStored=visit.url in urls;urls[visit.url]=true;return!isStored;});store.read('frecency',MAX_TOPSITES_RESULTS,function(results){var docFragment=document.createDocumentFragment();results.forEach(function(x){docFragment.appendChild(formatTopResult(x));});topSitesWrapper.innerHTML='';topSitesWrapper.appendChild(docFragment);});}
function formatTopResult(result){var div=document.createElement('div');var span=document.createElement('span');if(result.title){span.setAttribute('dir','auto');span.textContent=result.title;}else{span.setAttribute('dir','ltr');span.textContent=result.url;}
div.dataset.url=result.url;div.classList.add('top-site');div.appendChild(span);div.setAttribute('role','link');if(result.screenshot||result.tile){var img=result.screenshot||result.tile;var imgUrl=(typeof img==='string')?img:URL.createObjectURL(img);div.style.backgroundImage='url('+imgUrl+')';}
return div;}
function matchesFilter(value,filter){return!filter||(value&&value.match(new RegExp(filter,'i'))!==null);}
function formatPlace(placeObj,filter){var result={'title':placeObj.title,'meta':placeObj.url,'icon':getIcon(placeObj),'dataset':{'url':placeObj.url},'label':placeObj.title};return result;}
function Places(){}
Places.prototype={__proto__:Provider.prototype,name:'Places',click:itemClicked,init:function(){if(!topSitesWrapper||!historyWrapper){this.header=document.getElementById(this.name.toLowerCase()+'-header');this.container=document.getElementById(this.name.toLowerCase());this.container.addEventListener('click',this.click.bind(this));}
this.persistStore=new PlacesIdbStore();this.persistStore.init().then(()=>{this.syncStore=new SyncDataStore(STORE_NAME,this.persistStore,'url');this.syncStore.filter=function(place){return place.url.startsWith('app://')||place.url==='about:blank';};this.syncStore.onChange=function(){showStartPage();};var rev=this.persistStore.latestRevision||0;return this.syncStore.sync(rev).then(()=>{return new Promise(resolve=>{function done(){showStartPage();resolve();}
asyncStorage.getItem('have-preloaded-sites',(havePreloaded)=>{if(!havePreloaded){this.preloadTopSites().then(()=>{asyncStorage.setItem('have-preloaded-sites',true);done();});}else{done();}});});});});},saveSites:function(sites){return Promise.all(sites.map(site=>{site.frecency=-2;return this.persistStore.addPlace(site);}));},preloadTopSites:function(){return LazyLoader.getJSON('/js/inittopsites.json').then(sites=>{return this.saveSites(sites);});},search:function(filter){return new Promise((resolve,reject)=>{var matchedOrigins={};this.persistStore.read('frecency',MAX_AWESOME_RESULTS,(results)=>{resolve(results.map(function(result){return formatPlace(result,filter);}));},function filterFun(result){if(result.frecency<=0){return false;}
var url=parseUrl(result.url);var matches=!(url.hostname in matchedOrigins)&&(matchesFilter(result.title,filter)||matchesFilter(result.url,filter));if(matches){matchedOrigins[url.hostname]=true;}
return matches;});});}};exports.Places=new Places();Search.provider(exports.Places);}(window));