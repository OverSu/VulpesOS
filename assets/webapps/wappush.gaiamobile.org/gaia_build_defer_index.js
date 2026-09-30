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
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;(function(){'use strict';function dump_off(msg,optionalObject){}
function dump_on(msg,optionalObject){var output=msg;if(optionalObject){try{output+=JSON.stringify(optionalObject);}catch(e){}}
if(dump){var appName=document.location.hostname.replace(/\..*$/,'');dump('['+appName+'] '+output+'\n');}else{console.log(output);}}
window.DUMP=dump_off;var settings=window.navigator.mozSettings;var reqGaiaDebug=settings.createLock().get('debug.gaia.enabled');reqGaiaDebug.onsuccess=function gaiaDebug(){window.DUMP=reqGaiaDebug.result['debug.gaia.enabled']?dump_on:dump_off;};settings.addObserver('debug.gaia.enabled',function(event){window.DUMP=event.settingValue?dump_on:dump_off;dump_on(event.settingValue?'Enabling DUMP':'Disabling DUMP');});}());;(function(exports){'use strict';function ensureValidEventName(eventName){if(!eventName||typeof eventName!=='string'){throw new Error('Event name should be a valid non-empty string!');}}
function ensureValidHandler(handler){if(typeof handler!=='function'){throw new Error('Handler should be a function!');}}
function ensureAllowedEventName(allowedEvents,eventName){if(allowedEvents&&allowedEvents.indexOf(eventName)<0){throw new Error('Event "'+eventName+'" is not allowed!');}}
var eventDispatcher={on:function(eventName,handler){ensureValidEventName(eventName);ensureAllowedEventName(this.allowedEvents,eventName);ensureValidHandler(handler);var handlers=this.listeners.get(eventName);if(!handlers){handlers=new Set();this.listeners.set(eventName,handlers);}
handlers.add(handler);},once:function(eventName,handler){ensureValidHandler(handler);var once=(parameters)=>{eventDispatcher.off.call(this,eventName,once);handler(parameters);};eventDispatcher.on.call(this,eventName,once);},off:function(eventName,handler){ensureValidEventName(eventName);ensureAllowedEventName(this.allowedEvents,eventName);ensureValidHandler(handler);var handlers=this.listeners.get(eventName);if(!handlers){return;}
handlers.delete(handler);if(!handlers.size){this.listeners.delete(eventName);}},offAll:function(eventName){if(typeof eventName==='undefined'){this.listeners.clear();return;}
ensureValidEventName(eventName);ensureAllowedEventName(this.allowedEvents,eventName);var handlers=this.listeners.get(eventName);if(!handlers){return;}
handlers.clear();this.listeners.delete(eventName);},emit:function(eventName,parameters){ensureValidEventName(eventName);ensureAllowedEventName(this.allowedEvents,eventName);var handlers=this.listeners.get(eventName);if(!handlers){return;}
handlers.forEach(function(handler){try{handler(parameters);}catch(e){console.error(e);}});}};exports.EventDispatcher={mixin:function(target,allowedEvents){if(!target||typeof target!=='object'){throw new Error('Object to mix into should be valid object!');}
if(typeof allowedEvents!=='undefined'&&!Array.isArray(allowedEvents)){throw new Error('Allowed events should be a valid array of strings!');}
Object.keys(eventDispatcher).forEach(function(method){if(typeof target[method]!=='undefined'){throw new Error('Object to mix into already has "'+method+'" property defined!');}
target[method]=eventDispatcher[method].bind(this);},{listeners:new Map(),allowedEvents:allowedEvents});return target;}};})(self);;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;(function(window){'use strict';window.NotificationHelper={getIconURI:function nh_getIconURI(app,entryPoint){var icons=app.manifest.icons;if(entryPoint){icons=app.manifest.entry_points[entryPoint].icons;}
if(!icons){return null;}
var sizes=Object.keys(icons).map(function parse(str){return parseInt(str,10);});sizes.sort(function(x,y){return y-x;});var HVGA=document.documentElement.clientWidth<480;var index=sizes[HVGA?sizes.length-1:0];return app.installOrigin+icons[index];},send:function nh_send(titleL10n,options){return Promise.all([titleL10n,options.bodyL10n].map(getL10n)).then(([title,body])=>{if(body){options.body=body;}
options.lang=document.documentElement.getAttribute('lang');var notification=new window.Notification(title,options);if(options.closeOnClick!==false){notification.addEventListener('click',function nh_click(){notification.removeEventListener('click',nh_click);notification.close();});}
return notification;});},};function getL10n(l10nAttrs){if(!l10nAttrs){return;}
if(typeof l10nAttrs==='string'){return document.l10n.formatValue(l10nAttrs);}
if(typeof l10nAttrs.raw==="string"){return l10nAttrs.raw;}
return document.l10n.formatValue(l10nAttrs.id,l10nAttrs.args);}})(this);;(function(){var _global=this;var mathRNG,nodeRNG,whatwgRNG;var _rndBytes=new Array(16);mathRNG=function(){var r,b=_rndBytes,i=0;for(var i=0,r;i<16;i++){if((i&0x03)==0)r=Math.random()*0x100000000;b[i]=r>>>((i&0x03)<<3)&0xff;}
return b;}
try{var _rb=require('crypto').randomBytes;nodeRNG=_rb&&function(){return _rb(16);};}catch(e){}
var _rng=nodeRNG||whatwgRNG||mathRNG;var BufferClass=typeof(Buffer)=='function'?Buffer:Array;var _byteToHex=[];var _hexToByte={};for(var i=0;i<256;i++){_byteToHex[i]=(i+0x100).toString(16).substr(1);_hexToByte[_byteToHex[i]]=i;}
function parse(s,buf,offset){var i=(buf&&offset)||0,ii=0;buf=buf||[];s.toLowerCase().replace(/[0-9a-f]{2}/g,function(oct){if(ii<16){buf[i+ii++]=_hexToByte[oct];}});while(ii<16){buf[i+ii++]=0;}
return buf;}
function unparse(buf,offset){var i=offset||0,bth=_byteToHex;return bth[buf[i++]]+bth[buf[i++]]+
bth[buf[i++]]+bth[buf[i++]]+'-'+
bth[buf[i++]]+bth[buf[i++]]+'-'+
bth[buf[i++]]+bth[buf[i++]]+'-'+
bth[buf[i++]]+bth[buf[i++]]+'-'+
bth[buf[i++]]+bth[buf[i++]]+
bth[buf[i++]]+bth[buf[i++]]+
bth[buf[i++]]+bth[buf[i++]];}
var _seedBytes=_rng();var _nodeId=[_seedBytes[0]|0x01,_seedBytes[1],_seedBytes[2],_seedBytes[3],_seedBytes[4],_seedBytes[5]];var _clockseq=(_seedBytes[6]<<8|_seedBytes[7])&0x3fff;var _lastMSecs=0,_lastNSecs=0;function v1(options,buf,offset){var i=buf&&offset||0;var b=buf||[];options=options||{};var clockseq=options.clockseq!=null?options.clockseq:_clockseq;var msecs=options.msecs!=null?options.msecs:new Date().getTime();var nsecs=options.nsecs!=null?options.nsecs:_lastNSecs+1;var dt=(msecs-_lastMSecs)+(nsecs-_lastNSecs)/10000;if(dt<0&&options.clockseq==null){clockseq=clockseq+1&0x3fff;}
if((dt<0||msecs>_lastMSecs)&&options.nsecs==null){nsecs=0;}
if(nsecs>=10000){throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');}
_lastMSecs=msecs;_lastNSecs=nsecs;_clockseq=clockseq;msecs+=12219292800000;var tl=((msecs&0xfffffff)*10000+nsecs)%0x100000000;b[i++]=tl>>>24&0xff;b[i++]=tl>>>16&0xff;b[i++]=tl>>>8&0xff;b[i++]=tl&0xff;var tmh=(msecs/0x100000000*10000)&0xfffffff;b[i++]=tmh>>>8&0xff;b[i++]=tmh&0xff;b[i++]=tmh>>>24&0xf|0x10;b[i++]=tmh>>>16&0xff;b[i++]=clockseq>>>8|0x80;b[i++]=clockseq&0xff;var node=options.node||_nodeId;for(var n=0;n<6;n++){b[i+n]=node[n];}
return buf?buf:unparse(b);}
function v4(options,buf,offset){var i=buf&&offset||0;if(typeof(options)=='string'){buf=options=='binary'?new BufferClass(16):null;options=null;}
options=options||{};var rnds=options.random||(options.rng||_rng)();rnds[6]=(rnds[6]&0x0f)|0x40;rnds[8]=(rnds[8]&0x3f)|0x80;if(buf){for(var ii=0;ii<16;ii++){buf[i+ii]=rnds[ii];}}
return buf||unparse(rnds);}
var uuid=v4;uuid.v1=v1;uuid.v4=v4;uuid.parse=parse;uuid.unparse=unparse;uuid.BufferClass=BufferClass;uuid.mathRNG=mathRNG;uuid.nodeRNG=nodeRNG;uuid.whatwgRNG=whatwgRNG;if(typeof(module)!='undefined'){module.exports=uuid;}else{var _previousRoot=_global.uuid;uuid.noConflict=function(){_global.uuid=_previousRoot;return uuid;}
_global.uuid=uuid;}}());;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;(function(exports){'use strict';function activityDefaultError(event){console.warn('Unhandled error spawning activity: '+
event.target.error.message+'\n');}
var ActivityPicker={url:function ap_browse(url,onsuccess,onerror){if(typeof onerror!=='function'){onerror=activityDefaultError;}
if(window.MozActivity){var activity=new MozActivity({name:'view',data:{type:'url',url:url}});if(typeof onsuccess==='function'){activity.onsuccess=onsuccess;}
activity.onerror=onerror;}}};exports.ActivityPicker=ActivityPicker;}(this));;'use strict';var ProvisioningAuthentication=(function(){var pin=null;var auth=null;function pa_isDocumentValid(userPin,authInfo){pin=userPin;auth=authInfo;var sec=auth.sec;switch(sec){case'NETWPIN':throw new Error('cp-finish-confirm-dialog-message-auth-error');case'USERPIN':return pa_userPinAuthentication();case'USERNETWPIN':return pa_userNetwPinAuthentication();case'USERPINMAC':return pa_userPinMacAuthentication();default:throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}}
function pa_userPinAuthentication(){var mac=auth.mac;return mac===pa_sign(pin,auth.data,auth.data.length);}
function pa_userNetwPinAuthentication(){throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}
function pa_userPinMacAuthentication(){throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}
function pa_sign(key,data,dataLength){function bin2hex(buffer){var i,f=0,a=[],data=new Uint8Array(buffer);f=data.length;for(i=0;i<f;i++){a[i]=data[i].toString(16).replace(/^([\da-f])$/,'0$1');}
return a.join('');}
var _data=new Uint8Array(dataLength);for(var i=0;i<dataLength;i++){_data[i]=data[i];}
var hmac=CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA1,key);var words=CryptoJS.enc.Hex.parse(bin2hex(_data));hmac.update(words);var hash=hmac.finalize();return hash.toString(CryptoJS.enc.Hex).toUpperCase();}
return{isDocumentValid:pa_isDocumentValid};})();;'use strict';var CpScreenHelper=(function(){var cpScreen=null;var pinScreen=null;var apnScreen=null;var detailsScreen=null;var quitButton=null;var cancelQuitButton=null;var acceptInstallCfgButton=null;var cancelInstallCfgButton=null;var finishButton=null;var pin=null;var quitAppConfirmDialog=null;var installCfgConfirmDialog=null;var authFailureMessage=null;var pinHelp=null;var finishConfirmDialog=null;var showPINInput=false;var authenticated=false;var isDocumentValid=false;var processed=false;var messageTag=null;var authInfo=null;var provisioningDoc=null;var apns=null;var iccCardIndex=0;var acceptApnButton=null;var acceptPinButton=null;var acceptDetailsButton=null;var titleApn=null;var titleDetails=null;var titlePin=null;var multipleApns=false;var headerDetails=null;function cpsh_init(){processed=false;titleApn=document.getElementById('title-apn');titleDetails=document.getElementById('title-details');titlePin=document.getElementById('title-pin');quitAppConfirmDialog=document.getElementById('cp-quit-app-confirm');quitButton=quitAppConfirmDialog.querySelector('.quit');cancelQuitButton=quitAppConfirmDialog.querySelector('.cancel');installCfgConfirmDialog=document.getElementById('cp-install-configuration-confirm');acceptInstallCfgButton=installCfgConfirmDialog.querySelector('.accept');cancelInstallCfgButton=installCfgConfirmDialog.querySelector('.cancel');authFailureMessage=document.getElementById('cp-auth-failure');pinHelp=document.getElementById('cp-done-help');finishConfirmDialog=document.getElementById('cp-finish-confirm');finishButton=finishConfirmDialog.querySelector('button');cpScreen=document.getElementById('cp-screen');pinScreen=document.getElementById('cp-pin-screen');pin=pinScreen.querySelector('input');apnScreen=document.getElementById('cp-apn-screen');detailsScreen=document.getElementById('cp-details-screen');acceptApnButton=document.getElementById('apn-accept');acceptPinButton=document.getElementById('pin-accept');acceptDetailsButton=document.getElementById('details-accept');var headerApnList=document.getElementById('header-apn-list');headerDetails=document.getElementById('header-details');var headerPin=document.getElementById('header-pin');quitButton.addEventListener('click',cpsh_onQuit);cancelQuitButton.addEventListener('click',cpsh_onCancelQuit);finishButton.addEventListener('click',cpsh_onFinish);pin.addEventListener('keyup',cpsh_onPinInput);acceptApnButton.addEventListener('click',cpsh_onApnAccept);acceptPinButton.addEventListener('click',cpsh_onPinAccept);acceptDetailsButton.addEventListener('click',cpsh_onDetailsAccept);headerApnList.addEventListener('action',cpsh_onClose);headerDetails.addEventListener('action',cpsh_closeDetails);headerPin.addEventListener('action',cpsh_closePin);}
function cpsh_hide(){cpScreen.hidden=true;finishConfirmDialog.hidden=true;installCfgConfirmDialog.hidden=true;quitAppConfirmDialog.hidden=true;}
function cpsh_showConfirmInstallationDialog(message){installCfgConfirmDialog.hidden=false;acceptInstallCfgButton.addEventListener('click',cpsh_onAcceptInstallCfg.bind(null,message));cancelInstallCfgButton.addEventListener('click',cpsh_onCancelInstallCfg);}
function cpsh_populateScreen(message){cpScreen.hidden=false;var title=Utils.prepareMessageTitle(message);navigator.mozL10n.setAttributes(titleApn,title.id,title.args);navigator.mozL10n.setAttributes(titleDetails,title.id,title.args);navigator.mozL10n.setAttributes(titlePin,title.id,title.args);iccCardIndex=message.serviceId;messageTag=message.timestamp;authInfo=message.provisioning.authInfo;provisioningDoc=message.provisioning.provisioningDoc;var parsedProvisioningDoc=ParsedProvisioningDoc.from(provisioningDoc);apns=parsedProvisioningDoc.getApns();if(apns.length===0){message=finishConfirmDialog.querySelector('strong');navigator.mozL10n.setAttributes(message,'cp-finish-confirm-dialog-message-no-apns');finishConfirmDialog.hidden=false;return;}
showPINInput=(authInfo.sec!=='NETWPIN');authenticated=authInfo.checked;isDocumentValid=authInfo.pass;if(showPINInput){navigator.mozL10n.setAttributes(pinHelp,'cp-accept-help-pin');pin.type='number';acceptPinButton.disabled=true;}else{navigator.mozL10n.setAttributes(pinHelp,'cp-done-help');pin.type='hidden';pin.blur();acceptPinButton.disabled=false;}
if(apns.length>1){multipleApns=true;cpsh_showApnList();return;}
multipleApns=false;cpsh_showDetails(0);}
function cpsh_showApnList(){var fragment=document.createDocumentFragment();for(var i=0;i<apns.length;i++){var list=document.createElement('li');var a=document.createElement('a');a.addEventListener('click',cpsh_showDetails.bind(null,i));var aside=document.createElement('aside');aside.className='pack-end';aside.setAttribute('data-icon','forward');aside.setAttribute('aria-hidden',true);var p=document.createElement('p');p.textContent=apns[i].carrier;a.appendChild(aside);a.appendChild(p);list.appendChild(a);fragment.appendChild(list);}
var content=apnScreen.querySelector('.message');content.innerHTML='';content.appendChild(fragment);}
function cpsh_onApnAccept(){if(showPINInput){pinScreen.addEventListener('transitionend',cpsh_setPinFocus);}
apnScreen.classList.add('left');pinScreen.classList.remove('right');}
function cpsh_showDetails(index){if(multipleApns){acceptDetailsButton.style.visibility='hidden';headerDetails.setAttribute('action','back');}
var details=detailsScreen.querySelector('.message');details.innerHTML='';cpsh_createNode(details,'Name',apns[index].carrier);cpsh_createNode(details,'APN',apns[index].apn);cpsh_createNode(details,'Proxy',apns[index].proxy);cpsh_createNode(details,'Port',apns[index].port);cpsh_createNode(details,'Username',apns[index].user);cpsh_createNode(details,'Password',apns[index].password);cpsh_createNode(details,'MMSC',apns[index].mmsc);cpsh_createNode(details,'MMS Proxy',apns[index].mmsproxy);cpsh_createNode(details,'MMS Port',apns[index].mmsport);cpsh_createNode(details,'Authentication Type',apns[index].authType);cpsh_createNode(details,'APN Type',apns[index].types);detailsScreen.classList.remove('right');apnScreen.classList.add('left');}
function cpsh_closeDetails(evt){if(!multipleApns){cpsh_onClose(evt);return;}
detailsScreen.classList.add('right');apnScreen.classList.remove('left');}
function cpsh_onDetailsAccept(){if(showPINInput){pinScreen.addEventListener('transitionend',cpsh_setPinFocus);}
detailsScreen.classList.add('left');pinScreen.classList.remove('right');}
function cpsh_createNode(rootNode,key,value){if(!value){return;}
var element=document.createElement('li');var nodeKey=document.createElement('p');var nodeValue=document.createElement('p');nodeKey.textContent=key;nodeValue.textContent=value;element.appendChild(nodeKey);element.appendChild(nodeValue);rootNode.appendChild(element);}
function cpsh_setPinFocus(){pin.focus();pinScreen.removeEventListener('transitionend',cpsh_setPinFocus);}
function cpsh_closePin(){pin.blur();if(!multipleApns){pinScreen.classList.add('right');detailsScreen.classList.remove('left');return;}
pinScreen.classList.add('right');apnScreen.classList.remove('left');}
function cpsh_onClose(evt){if(processed){WapPushManager.close();return;}
quitAppConfirmDialog.hidden=false;}
function cpsh_onQuit(evt){evt.preventDefault();MessageDB.deleteByTimestamp(messageTag).then(function(){WapPushManager.close();},function(){console.error('Could not delete message from the database');WapPushManager.close();});}
function cpsh_onCancelQuit(evt){evt.preventDefault();quitAppConfirmDialog.hidden=true;}
function cpsh_onCancelInstallCfg(evt){evt.preventDefault();WapPushManager.close();}
function cpsh_onAcceptInstallCfg(message,evt){evt.preventDefault();cpsh_populateScreen(message);installCfgConfirmDialog.hidden=true;}
function cpsh_onPinAccept(){var message=null;if(!authenticated){if(!pin.value){cpsh_pinError();return;}
try{isDocumentValid=ProvisioningAuthentication.isDocumentValid(pin.value,authInfo);}catch(e){message=finishConfirmDialog.querySelector('strong');navigator.mozL10n.setAttributes(message,e.message);finishConfirmDialog.hidden=false;return;}
authenticated=true;if(!isDocumentValid){authenticated=false;cpsh_pinError();return;}}
processed=true;StoreProvisioning.provision(apns,iccCardIndex);MessageDB.deleteByTimestamp(messageTag).then(function(){finishConfirmDialog.hidden=false;},function(e){console.error('Could not delete message from the database: ',e);finishConfirmDialog.hidden=false;});}
function cpsh_pinError(){authFailureMessage.hidden=false;pinHelp.hidden=true;pin.focus();pin.setAttribute('max',-1);pin.addEventListener('keyup',cpsh_onPinErrorRestore);}
function cpsh_onPinErrorRestore(){authFailureMessage.hidden=true;pinHelp.hidden=false;pin.removeAttribute('max');pin.addEventListener('keyup',cpsh_onPinInput);}
function cpsh_onFinish(evt){evt.preventDefault();WapPushManager.close();}
function cpsh_onPinInput(evt){acceptPinButton.disabled=(pin.value.length===0);}
return{init:cpsh_init,hide:cpsh_hide,showConfirmInstallationDialog:cpsh_showConfirmInstallationDialog};})();;var CryptoJS=CryptoJS||function(g,l){var e={},d=e.lib={},m=function(){},k=d.Base={extend:function(a){m.prototype=this;var c=new m;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},p=d.WordArray=k.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=l?c:4*a.length},toString:function(a){return(a||n).stringify(this)},concat:function(a){var c=this.words,q=a.words,f=this.sigBytes;a=a.sigBytes;this.clamp();if(f%4)for(var b=0;b<a;b++)c[f+b>>>2]|=(q[b>>>2]>>>24-8*(b%4)&255)<<24-8*((f+b)%4);else if(65535<q.length)for(b=0;b<a;b+=4)c[f+b>>>2]=q[b>>>2];else c.push.apply(c,q);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<32-8*(c%4);a.length=g.ceil(c/4)},clone:function(){var a=k.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4)c.push(4294967296*g.random()|0);return new p.init(c,a)}}),b=e.enc={},n=b.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++){var d=c[f>>>2]>>>24-8*(f%4)&255;b.push((d>>>4).toString(16));b.push((d&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f+=2)b[f>>>3]|=parseInt(a.substr(f,2),16)<<24-4*(f%8);return new p.init(b,c/2)}},j=b.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++)b.push(String.fromCharCode(c[f>>>2]>>>24-8*(f%4)&255));return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f++)b[f>>>2]|=(a.charCodeAt(f)&255)<<24-8*(f%4);return new p.init(b,c)}},h=b.Utf8={stringify:function(a){try{return decodeURIComponent(escape(j.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return j.parse(unescape(encodeURIComponent(a)))}},r=d.BufferedBlockAlgorithm=k.extend({reset:function(){this._data=new p.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=h.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,f=c.sigBytes,d=this.blockSize,e=f/(4*d),e=a?g.ceil(e):g.max((e|0)-this._minBufferSize,0);a=e*d;f=g.min(4*a,f);if(a){for(var k=0;k<a;k+=d)this._doProcessBlock(b,k);k=b.splice(0,a);c.sigBytes-=f}return new p.init(k,f)},clone:function(){var a=k.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});d.Hasher=r.extend({cfg:k.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){r.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,d){return(new a.init(d)).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return(new s.HMAC.init(a,d)).finalize(b)}}});var s=e.algo={};return e}(Math);(function(){var g=CryptoJS,l=g.lib,e=l.WordArray,d=l.Hasher,m=[],l=g.algo.SHA1=d.extend({_doReset:function(){this._hash=new e.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(d,e){for(var b=this._hash.words,n=b[0],j=b[1],h=b[2],g=b[3],l=b[4],a=0;80>a;a++){if(16>a)m[a]=d[e+a]|0;else{var c=m[a-3]^m[a-8]^m[a-14]^m[a-16];m[a]=c<<1|c>>>31}c=(n<<5|n>>>27)+l+m[a];c=20>a?c+((j&h|~j&g)+1518500249):40>a?c+((j^h^g)+1859775393):60>a?c+((j&h|j&g|h&g)-1894007588):c+((j^h^g)-899497514);l=g;g=h;h=j<<30|j>>>2;j=n;n=c}b[0]=b[0]+n|0;b[1]=b[1]+j|0;b[2]=b[2]+h|0;b[3]=b[3]+g|0;b[4]=b[4]+l|0},_doFinalize:function(){var d=this._data,e=d.words,b=8*this._nDataBytes,g=8*d.sigBytes;e[g>>>5]|=128<<24-g%32;e[(g+64>>>9<<4)+14]=Math.floor(b/4294967296);e[(g+64>>>9<<4)+15]=b;d.sigBytes=4*e.length;this._process();return this._hash},clone:function(){var e=d.clone.call(this);e._hash=this._hash.clone();return e}});g.SHA1=d._createHelper(l);g.HmacSHA1=d._createHmacHelper(l)})();(function(){var g=CryptoJS,l=g.enc.Utf8;g.algo.HMAC=g.lib.Base.extend({init:function(e,d){e=this._hasher=new e.init;"string"==typeof d&&(d=l.parse(d));var g=e.blockSize,k=4*g;d.sigBytes>k&&(d=e.finalize(d));d.clamp();for(var p=this._oKey=d.clone(),b=this._iKey=d.clone(),n=p.words,j=b.words,h=0;h<g;h++)n[h]^=1549556828,j[h]^=909522486;p.sigBytes=b.sigBytes=k;this.reset()},reset:function(){var e=this._hasher;e.reset();e.update(this._iKey)},update:function(e){this._hasher.update(e);return this},finalize:function(e){var d=this._hasher;e=d.finalize(e);d.reset();return d.finalize(this._oKey.clone().concat(e))}})})();;(function(exports){'use strict';var inProgress=false;var LinkActionHandler={onClick:function lah_onClick(event){var dataset=event.target.dataset;var action=dataset.action;var type;event.preventDefault();if(!action){return;}
if(inProgress){return;}
inProgress=true;type=action.replace('-link','');ActivityPicker[type](dataset[type],this.reset,this.reset);},reset:function lah_reset(){inProgress=false;}};exports.LinkActionHandler=LinkActionHandler;}(this));;'use strict';var MessageDB=(function(){var DB_NAME='wappush';var DB_VERSION=2;var MESSAGE_STORE_NAME='message';var VIEWED_STORE_NAME='viewed';var KEY_PATH='timestamp';var ID_INDEX='id';var ID_INDEX_KEYPATH='id';var db=null;function mdb_transactionPromise(transaction){return new Promise(function(resolve,reject){transaction.oncomplete=function mdb_onTransactionComplete(event){resolve();};transaction.onerror=function mdb_onTransactionError(event){reject(event.target.error);};});}
function mdb_deleteViewedMessages(){var transaction=db.transaction([MESSAGE_STORE_NAME,VIEWED_STORE_NAME],'readwrite');var promise=mdb_transactionPromise(transaction);var store=transaction.objectStore(MESSAGE_STORE_NAME);var viewedStore=transaction.objectStore(VIEWED_STORE_NAME);var req=viewedStore.openCursor();req.onsuccess=event=>{var cursor=event.target.result;if(cursor){store.delete(cursor.value.timestamp);cursor.delete();cursor.continue();}};return promise;}
function mdb_open(){if(db){return Promise.resolve(db);}
var indexedDB;try{indexedDB=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB||window.msIndexedDB;}catch(e){return Promise.reject(e);}
if(!indexedDB){return Promise.reject(new Error('IndexedDB is not available'));}
return new Promise(function(resolve,reject){var req;try{req=indexedDB.open(DB_NAME,DB_VERSION);}catch(e){reject(e);return;}
req.onsuccess=function mdb_opened(event){db=event.target.result;mdb_deleteViewedMessages().then(()=>resolve(db));};req.onerror=function mdb_openError(event){reject(event.target.error);};req.onupgradeneeded=function mdb_upgradeNeeded(event){var db=event.target.result;var store=null;switch(event.oldVersion){case 0:store=db.createObjectStore(MESSAGE_STORE_NAME,{keyPath:KEY_PATH});store.createIndex(ID_INDEX,ID_INDEX_KEYPATH,{unique:false});case 1:store=db.createObjectStore(VIEWED_STORE_NAME,{keyPath:KEY_PATH});break;default:event.target.transaction.abort();}};});}
function mdb_processMessage(store,message){if(message.action==='delete'){mdb_deleteById(store,message.id);return false;}else{store.put(message);return true;}}
function mdb_put(message){return mdb_open().then(function mdb_openResolved(db){var transaction=db.transaction(MESSAGE_STORE_NAME,'readwrite');var promise=mdb_transactionPromise(transaction);var store=transaction.objectStore(MESSAGE_STORE_NAME);var stored;if(!message.id){store.put(message);mdb_dispatchEvent('new',message);return promise;}
if(!message.created){stored=mdb_processMessage(store,message);mdb_dispatchEvent(stored?'new':'discard',message);return promise;}
var index=store.index(ID_INDEX);var req=index.openCursor(IDBKeyRange.only(message.id));req.onsuccess=function mdb_cursorSuccess(event){var cursor=event.target.result;if(cursor){var storedMessage=cursor.value;if(storedMessage.created){if(storedMessage.created<message.created){cursor.delete(storedMessage);message.timestamp=storedMessage.timestamp;stored=mdb_processMessage(store,message);mdb_dispatchEvent(stored?'update':'discard',message);}else{mdb_dispatchEvent('discard',message);}
return;}
cursor.continue();}else{stored=mdb_processMessage(store,message);mdb_dispatchEvent(stored?'new':'discard',message);}};return promise;});}
function mdb_deleteById(store,id){var index=store.index(ID_INDEX);var req=index.openCursor(id);req.onsuccess=function mdb_openCursorSuccess(event){var cursor=event.target.result;if(cursor){var message=cursor.value;cursor.delete().onsuccess=function mdb_onDeleted(){mdb_dispatchEvent('delete',message);};cursor.continue();}};}
function mdb_retrieve(timestamp){return mdb_open().then(function mdb_openResolved(db){var transaction=db.transaction([MESSAGE_STORE_NAME,VIEWED_STORE_NAME],'readwrite');var promise=mdb_transactionPromise(transaction);var store=transaction.objectStore(MESSAGE_STORE_NAME);var req=store.get(timestamp.toString());var message=null;req.onsuccess=function mdb_gotMessage(event){if(event.target.result){message=event.target.result;if(message.type!='text/vnd.wap.connectivity-xml'){var viewedStore=transaction.objectStore(VIEWED_STORE_NAME);viewedStore.put(message);}}};return promise.then(()=>{if(message){return message;}else{return Promise.reject(new Error('Message with id '+timestamp+' not found'));}});});}
function mdb_deleteByTimestamp(timestamp){return mdb_open().then(function mdb_deleteCallback(db){var transaction=db.transaction(MESSAGE_STORE_NAME,'readwrite');var promise=mdb_transactionPromise(transaction);var store=transaction.objectStore(MESSAGE_STORE_NAME);timestamp=timestamp.toString();store.get(timestamp).onsuccess=function(event){var message=event.target.result;store.delete(timestamp).onsuccess=function mdb_onDeleted(){mdb_dispatchEvent('delete',message);};};return promise;});}
function mdb_clear(){return mdb_open().then(function mdb_openResolved(db){var transaction=db.transaction([MESSAGE_STORE_NAME,VIEWED_STORE_NAME],'readwrite');var promise=mdb_transactionPromise(transaction);var store=transaction.objectStore(MESSAGE_STORE_NAME);var viewedStore=transaction.objectStore(VIEWED_STORE_NAME);store.clear();viewedStore.clear();return promise;});}
function mdb_dispatchEvent(type,target){MessageDB.emit(type,target);}
var mdb_allowedEvents=['new','update','discard','delete'];return EventDispatcher.mixin({put:mdb_put,retrieve:mdb_retrieve,deleteByTimestamp:mdb_deleteByTimestamp,clear:mdb_clear},mdb_allowedEvents);})();;(function(exports){'use strict';var CONTENT_TYPE='application/xml';var AUTHTYPE_MAPPING={'PAP':'1','CHAP':'2'};var TYPE_MAPPING={'w2':'default','w4':'mms'};function ParsedProvisioningDoc(provisioningDoc){this._provisioningDoc=provisioningDoc;this._applicationNodes=null;this._napDefNodes=null;this._pxLogicalNodes=null;this._apns=[],this._proxies=[];this._apnsReady=false;}
ParsedProvisioningDoc.prototype={getPxPhysicalNodes:function pd_getPxPhysicalNodes(toProxyNode){var toProxy=toProxyNode.getAttribute('value');var pxLogicalNode=null;for(var i=0;i<this._pxLogicalNodes.length;i++){var selector='parm[name="PROXY-ID"][value="'+toProxy+'"]';pxLogicalNode=this._pxLogicalNodes[i].querySelector(selector);if(pxLogicalNode){break;}}
if(!pxLogicalNode){return null;}
return this._pxLogicalNodes[i].querySelectorAll('characteristic[type="PXPHYSICAL"]');},getNapDefNode:function pd_getNapDefNode(toNapId){for(var i=0;i<this._napDefNodes.length;i++){var selector='parm[name="NAPID"][value="'+toNapId+'"]';var napDefNode=this._napDefNodes[i].querySelector(selector);if(napDefNode){return this._napDefNodes[i];}}
return null;},parse:function pd_parse(){if(!this._provisioningDoc){return;}
function parsePxPhysicalNode(pxPhysicalNode,isMmsProxy){var obj={};var proxyKey=null,portKey=null;proxyKey=isMmsProxy?'mmsproxy':'proxy';portKey=isMmsProxy?'mmsport':'port';var pxAddrNode=pxPhysicalNode.querySelector('parm[name="PXADDR"]');if(pxAddrNode){obj[proxyKey]=pxAddrNode.getAttribute('value');}
obj['TO-NAPID']=[];var toNapIdNode=pxPhysicalNode.querySelector('parm[name="TO-NAPID"]');if(toNapIdNode){obj['TO-NAPID'].push(toNapIdNode.getAttribute('value'));}
var portNodes=pxPhysicalNode.querySelectorAll('characteristic[type="PORT"]');for(var j=0;j<portNodes.length;j++){var portNode=portNodes[j].querySelector('parm[name="PORTNBR"]');obj[portKey]=portNode.getAttribute('value');}
return obj;}
function parseNapDefNode(napDefNode){var obj={};var napIdNode=napDefNode.querySelector('parm[name="NAPID"]');if(napIdNode){obj.NAPID=napIdNode.getAttribute('value');}
var nameNode=napDefNode.querySelector('parm[name="NAME"]');if(nameNode){obj.carrier=nameNode.getAttribute('value');}
var apnNode=napDefNode.querySelector('parm[name="NAP-ADDRESS"]');if(apnNode){obj.apn=apnNode.getAttribute('value');}
var napAuthInfoNode=napDefNode.querySelector('characteristic[type="NAPAUTHINFO"]');if(napAuthInfoNode){var authTypeNode=napAuthInfoNode.querySelector('parm[name="AUTHTYPE"]');if(authTypeNode){var authType=AUTHTYPE_MAPPING[authTypeNode.getAttribute('value')];if(authType){obj.authtype=authType;}}
var authNameNode=napAuthInfoNode.querySelector('parm[name="AUTHNAME"]');if(authNameNode){obj.user=authNameNode.getAttribute('value');}
var authSecretNode=napAuthInfoNode.querySelector('parm[name="AUTHSECRET"]');if(authSecretNode){obj.password=authSecretNode.getAttribute('value');}}
return obj;}
var parser=new DOMParser();var domDocument=parser.parseFromString(this._provisioningDoc,CONTENT_TYPE);this._applicationNodes=domDocument.querySelectorAll('characteristic[type="APPLICATION"]');this._napDefNodes=domDocument.querySelectorAll('characteristic[type="NAPDEF"]');this._pxLogicalNodes=domDocument.querySelectorAll('characteristic[type="PXLOGICAL"]');if(!this._applicationNodes){return;}
var napDefNode=null;var apn=null;var type=[];var proxy=null;var applicationNode=null;for(var j=0;j<this._applicationNodes.length;j++){applicationNode=this._applicationNodes[j];var appIdNode=null,appId=null;appIdNode=applicationNode.querySelector('parm[name="APPID"]');appId=appIdNode.getAttribute('value');var toProxyNodes=null;toProxyNodes=applicationNode.querySelectorAll('parm[name="TO-PROXY"]');var toNapIdNodes=null;toNapIdNodes=applicationNode.querySelectorAll('parm[name="TO-NAPID"]');var addrNode=null,addr=null;addrNode=applicationNode.querySelector('parm[name="ADDR"]');if(addrNode){addr=addrNode.getAttribute('value');}
if(appId&&(appId!=='w2')&&(appId!=='w4')){continue;}
if(!toNapIdNodes&&!toProxyNodes){continue;}
type=[];type.push(TYPE_MAPPING[appId]);if(toProxyNodes){for(var l=0;l<toProxyNodes.length;l++){var pxPhysicalNodes=this.getPxPhysicalNodes(toProxyNodes[l]);if(!pxPhysicalNodes){continue;}
for(var m=0;m<pxPhysicalNodes.length;m++){proxy=parsePxPhysicalNode(pxPhysicalNodes[m],(TYPE_MAPPING[appId]==='mms'));this._proxies.push(proxy);for(var n=0;n<proxy['TO-NAPID'].length;n++){napDefNode=this.getNapDefNode(proxy['TO-NAPID'][n]);apn=parseNapDefNode(napDefNode);apn.types=type;if((TYPE_MAPPING[appId]==='mms')&&addr){apn.mmsc=addr;}
this._apns.push(apn);}}}}
if(toNapIdNodes){for(var o=0;o<toNapIdNodes.length;o++){var toNapId=toNapIdNodes[o].getAttribute('value');if(!toNapId){continue;}
napDefNode=this.getNapDefNode(toNapId);apn=parseNapDefNode(napDefNode);apn.types=type;this._apns.push(apn);}}}},getApns:function ppd_getApns(){function addProperties(src,dst){for(var key in src){dst[key]=src[key];}}
if(this._apnsReady){return this._apns;}
for(var i=0;i<this._proxies.length;i++){var proxy=this._proxies[i];for(var j=0;j<proxy['TO-NAPID'].length;j++){var TO_NAPID=proxy['TO-NAPID'][j];for(var k=0;k<this._apns.length;k++){var apn=this._apns[k];if(TO_NAPID===apn.NAPID){addProperties(proxy,apn);break;}}}}
this._apnsReady=true;return this._apns;}};ParsedProvisioningDoc.from=function ppd_from(provisioningDoc){var obj=new ParsedProvisioningDoc(provisioningDoc);obj.parse();return obj;};exports.ParsedProvisioningDoc=ParsedProvisioningDoc;})(window);;(function(exports){'use strict';function ParsedMessage(obj){if(obj){for(var key in obj){this[key]=obj[key];}}}
ParsedMessage.prototype={constructor:ParsedMessage,toJSON:function pm_toJSON(){var obj={type:this.type,sender:this.sender,serviceId:this.serviceId,timestamp:this.timestamp};if(this.href){obj.href=this.href;}
if(this.id){obj.id=this.id;}
if(this.created){obj.created=this.created;}
if(this.expires){obj.expires=this.expires;}
if(this.text){obj.text=this.text;}
if(this.action){obj.action=this.action;}
if(this.provisioning){obj.provisioning=this.provisioning;}
return obj;},save:function pm_save(){var self=this;var json_message=this.toJSON();return MessageDB.put(json_message).then(function(status){if(status==='updated'){self.timestamp=json_message.timestamp;}
return Promise.resolve(status);});},isExpired:function pm_isExpired(){return(this.expires&&(this.expires<Date.now()))||false;},getUniqueId:function pm_getUniqueId(){return this.timestamp;}};ParsedMessage.from=function pm_from(message,timestamp){var parser=new DOMParser();var doc=parser.parseFromString(message.content,'text/xml');var obj=new ParsedMessage();obj.type=message.contentType;obj.sender=message.sender;obj.serviceId=message.serviceId;obj.timestamp=timestamp.toString();if(message.contentType==='text/vnd.wap.si'){var indicationNode=doc.querySelector('indication');if(indicationNode.hasAttribute('href')){obj.href=indicationNode.getAttribute('href');}
obj.text=indicationNode.textContent;if(indicationNode.hasAttribute('created')){var date=new Date(indicationNode.getAttribute('created'));obj.created=date.getTime();}
if(indicationNode.hasAttribute('si-expires')){var expiresDate=new Date(indicationNode.getAttribute('si-expires'));obj.expires=expiresDate.getTime();}
if(indicationNode.hasAttribute('action')){obj.action=indicationNode.getAttribute('action');}else{obj.action='signal-medium';}
if(indicationNode.hasAttribute('si-id')){obj.id=indicationNode.getAttribute('si-id');}else if(obj.action==='delete'){return null;}else if(obj.href){obj.id=obj.href;}}else if(message.contentType==='text/vnd.wap.sl'){var slNode=doc.querySelector('sl');obj.href=slNode.getAttribute('href');if(slNode.hasAttribute('action')){obj.action=slNode.getAttribute('action');}else{obj.action='execute-low';}}else if(message.contentType==='text/vnd.wap.connectivity-xml'){obj.provisioning=Provisioning.fromMessage(message);if(!obj.provisioning.authInfo){return null;}
var authInfo=obj.provisioning.authInfo;if(authInfo.checked&&!authInfo.pass){return null;}
obj.text='cp-message-received';}else{return null;}
return obj;};ParsedMessage.load=function pm_load(timestamp){return MessageDB.retrieve(timestamp).then(function(message){return new ParsedMessage(message);});};exports.ParsedMessage=ParsedMessage;})(window);;(function(exports){'use strict';function Provisioning(obj){if(obj){for(var key in obj){this[key]=obj[key];}}}
Provisioning.fromMessage=function p_fromMessage(message){var obj=new Provisioning();obj.provisioningDoc=message.content;obj.authInfo=message.authInfo;return obj;};exports.Provisioning=Provisioning;})(window);;'use strict';var SiSlScreenHelper=(function(){var screen=null;var header=null;var title=null;var container=null;var text=null;var link=null;function sssh_init(){title=document.getElementById('title-si-sl');screen=document.getElementById('si-sl-screen');header=document.getElementById('header-si-sl');container=screen.querySelector('.container');text=container.querySelector('p');link=container.querySelector('a');header.addEventListener('action',sssh_onClose);link.addEventListener('click',LinkActionHandler.onClick.bind(LinkActionHandler));}
function sssh_populateScreen(message){screen.hidden=false;if(message&&!message.isExpired()){var l10nTitle=Utils.prepareMessageTitle(message);navigator.mozL10n.setAttributes(title,l10nTitle.id,l10nTitle.args);text.textContent=message.text;link.textContent=message.href;link.href=message.href;link.dataset.url=message.href;}else{navigator.mozL10n.setAttributes(title,'wap-push-message');navigator.mozL10n.setAttributes(text,'this-message-has-expired');link.textContent='';link.href='';link.dataset.url='';}}
function sssh_onClose(){WapPushManager.close();}
function sssh_hide(){screen.hidden=true;}
return{init:sssh_init,hide:sssh_hide,populateScreen:sssh_populateScreen};})();;'use strict';var StoreProvisioning=(function(){var CP_APN_KEY='ril.data.cp.apns';var MCC_KEY='operatorvariant.mcc';var MNC_KEY='operatorvariant.mnc';var mccMncCodes={mcc:'000',mnc:'00'};function sp_getMccMncCodes(iccCardIndex,callback){var settings=navigator.mozSettings;if(!settings){if(callback){callback();}
return;}
iccCardIndex=iccCardIndex||0;var transaction=navigator.mozSettings.createLock();var mccRequest=transaction.get(MCC_KEY);mccRequest.onsuccess=function(){var mccs=mccRequest.result[MCC_KEY];if(!mccs||!Array.isArray(mccs)||!mccs[iccCardIndex]){mccMncCodes.mcc='000';}else{mccMncCodes.mcc=mccs[iccCardIndex];}
var mncRequest=transaction.get(MNC_KEY);mncRequest.onsuccess=function(){var mncs=mncRequest.result[MNC_KEY];if(!mncs||!Array.isArray(mncs)||!mncs[iccCardIndex]){mccMncCodes.mnc='00';}else{mccMncCodes.mnc=mncs[iccCardIndex];}
if(callback){callback(mccMncCodes.mcc,mccMncCodes.mnc);}};};}
function sp_provision(parameters,iccCardIndex,callback){var existingApns=null;var newApns={};for(var i=0;i<parameters.length;i++){parameters[i]._id=uuid();}
var settings=navigator.mozSettings;if(!settings){if(callback){callback();}
return;}
sp_getMccMncCodes(iccCardIndex,function sp_getMccMncCodesCb(){var transaction=navigator.mozSettings.createLock();var load=transaction.get(CP_APN_KEY);load.onsuccess=function onsuccessCb(){existingApns=load.result[CP_APN_KEY];var data={},mcc=mccMncCodes.mcc,mnc=mccMncCodes.mnc;if(!existingApns){newApns[mcc]={};newApns[mcc][mnc]=parameters;data[CP_APN_KEY]=newApns;}else{if(!existingApns[mcc]){existingApns[mcc]={};}
if(!existingApns[mcc][mnc]){existingApns[mcc][mnc]=[];}
existingApns[mcc][mnc]=existingApns[mcc][mnc].concat(parameters);data[CP_APN_KEY]=existingApns;}
transaction.set(data);iccCardIndex=iccCardIndex||0;var request=transaction.get('ril.data.apnSettings');request.onsuccess=function(){var apnSettings=request.result['ril.data.apnSettings'];if(!apnSettings||!Array.isArray(apnSettings)){apnSettings=[[],[]];}
var apnList=apnSettings[iccCardIndex];parameters.forEach(function(apn){var apnEnabled=false;for(var i=0;i<apnList.length;i++){if(apnList[i].types[0]===apn.types[0]){apnList[i]=apn;apnEnabled=true;break;}}
if(!apnEnabled){apnList.push(apn);}});transaction.set({'ril.data.apnSettings':apnSettings,'apn.selections':null});if(callback){callback();}};request.onerror=function onError(){if(callback){callback();}};};load.onerror=function onerrorCb(){if(callback){callback();}};});}
return{getMccMncCodes:sp_getMccMncCodes,provision:sp_provision};})();;(function(exports){'use strict';var Utils={deserializeParameters:function ut_deserializeParameters(input){var rparams=/([^?=&]+)(?:=([^&]*))?/g;var parsed={};input.replace(rparams,function($0,$1,$2){parsed[$1]=decodeURIComponent($2);});return parsed;},prepareMessageTitle:function ut_prepareMessageTitle(message){if(navigator.mozIccManager&&navigator.mozIccManager.iccIds.length>1){return{id:'message-title-with-sim',args:{id:+message.serviceId+1,title:message.sender}};}else{return{id:'message-title',args:{title:message.sender}};}}};exports.Utils=Utils;}(this));;'use strict';var WhiteList={_whiteList:[],init:function wl_init(){return LazyLoader.getJSON('js/whitelist.json').then((function wl_load(list){this._whiteList=list;}).bind(this),function(){});},has:function wl_has(value){if(this._whiteList.length===0){return true;}
return(this._whiteList.indexOf(value)!==-1);}};;(function(exports){'use strict';var WapPushManager={init:wpm_init,close:wpm_close,displayWapPushMessage:wpm_displayWapPushMessage,onVisibilityChange:wpm_onVisibilityChange,onWapPushReceived:wpm_onWapPushReceived};var wapPushEnableKey='wap.push.enabled';var wapPushEnabled;var app;var closeTimeout;var pendingMessages;var displayedSiMessage;function wpm_getApp(){return new Promise(function(resolve,reject){var req=navigator.mozApps.getSelf();req.onsuccess=function wpm_gotApp(){resolve(this.result);};req.onerror=function wpm_getAppError(){reject(this.error);};});}
function wpm_getConfig(){return new Promise(function(resolve,reject){var req=navigator.mozSettings.createLock().get(wapPushEnableKey);req.onsuccess=function wpm_settingsLockSuccess(){resolve(this.result[wapPushEnableKey]);};req.onerror=function wpm_settingsLockError(){reject(this.error);};});}
function wpm_init(){wapPushEnabled=true;app=null;closeTimeout=null;pendingMessages=0;displayedSiMessage=null;navigator.mozSettings.addObserver(wapPushEnableKey,wpm_onSettingsChange);var promise=Promise.all([wpm_getApp(),wpm_getConfig(),WhiteList.init()]);promise=promise.then(function(values){app=values[0];wapPushEnabled=values[1];SiSlScreenHelper.init();CpScreenHelper.init();MessageDB.on('new',wpm_onNew);MessageDB.on('update',wpm_onUpdate);MessageDB.on('discard',wpm_onDiscard);MessageDB.on('delete',wpm_onDelete);document.addEventListener('visibilitychange',wpm_onVisibilityChange);window.navigator.mozSetMessageHandler('notification',wpm_onNotification);window.navigator.mozSetMessageHandler('wappush-received',wpm_onWapPushReceived);}).catch(function(error){wapPushEnabled=false;var message=error.message||'Unknown error';console.error('Could not initialize the WAP push manager: ',message);throw error;});return promise;}
function wpm_onSettingsChange(v){wapPushEnabled=v.settingValue;}
function wpm_onVisibilityChange(){if(document.hidden){wpm_close();}else{window.clearTimeout(closeTimeout);closeTimeout=null;}}
function wpm_shouldDisplayMessage(message){if(!wapPushEnabled||(message===null)){return false;}
if((message.type!=='text/vnd.wap.connectivity-xml')&&(!WhiteList.has(message.sender)||message.isExpired())){return false;}
return true;}
function wpm_sendNotification(message){var iconURL=NotificationHelper.getIconURI(app);var body;if(message.type==='text/vnd.wap.connectivity-xml'){body=message.text;}else{body={id:(message.type==='text/vnd.wap.si')?'si-message-body':'sl-message-body',args:{text:message.text||'',url:message.href}};}
var title=Utils.prepareMessageTitle(message);var options={icon:iconURL,bodyL10n:body,tag:message.getUniqueId()};return NotificationHelper.send(title,options).then(function(notification){notification.addEventListener('click',function wpm_onNotificationClick(event){wpm_displayWapPushMessage(event.target.tag);});});}
function wpm_onWapPushReceived(wapMessage){DUMP('Received a message: ',wapMessage);pendingMessages++;var message=ParsedMessage.from(wapMessage,Date.now());if(!wpm_shouldDisplayMessage(message)){DUMP('The message will not be displayed');wpm_finish();return Promise.resolve();}
return message.save().catch(error=>{var message=error.message||'Unknown error';console.log('Could not add a message to the database: '+message+'\n');wpm_finish();throw error;});}
function wpm_onNotification(message){if(!message.clicked){return;}
wpm_displayWapPushMessage(message.tag);}
function wpm_onNew(obj){DUMP('A new message added to the DB');var message=new ParsedMessage(obj);if(message.action==='signal-high'||message.action==='execute-high')
{pendingMessages--;wpm_displayWapPushMessage(message.getUniqueId());}else{wpm_sendNotification(message).then(()=>wpm_finish());}}
function wpm_onUpdate(obj){DUMP('A message was updated in the DB');var message=new ParsedMessage(obj);if(displayedSiMessage&&displayedSiMessage.getUniqueId()===message.getUniqueId()){displayedSiMessage=message;SiSlScreenHelper.populateScreen(message);}
wpm_sendNotification(message).then(()=>wpm_finish());}
function wpm_onDelete(obj){DUMP('A message was deleted');var message=new ParsedMessage(obj);if(displayedSiMessage&&displayedSiMessage.getUniqueId()===message.getUniqueId()){wpm_close();}
wpm_clearNotifications(+message.getUniqueId());}
function wpm_onDiscard(){DUMP('The message was discarded');wpm_finish();}
function wpm_displayWapPushMessage(id){DUMP('Displaying message '+id);app.launch();window.clearTimeout(closeTimeout);closeTimeout=null;return ParsedMessage.load(id).then(function wpm_loadResolved(message){switch(message.type){case'text/vnd.wap.si':displayedSiMessage=message;CpScreenHelper.hide();if(message.isExpired()){SiSlScreenHelper.populateScreen();}else{SiSlScreenHelper.populateScreen(message);}
return wpm_clearNotifications(id);case'text/vnd.wap.sl':displayedSiMessage=null;CpScreenHelper.hide();SiSlScreenHelper.populateScreen(message);return wpm_clearNotifications(id);case'text/vnd.wap.connectivity-xml':displayedSiMessage=null;SiSlScreenHelper.hide();CpScreenHelper.showConfirmInstallationDialog(message);return Promise.resolve();}}).catch(function(error){var message=error.message||'Unknown error';console.error('Could not retrieve the message: ',message);throw error;});}
function wpm_clearNotifications(tag){return Notification.get({tag:tag}).then(function onSuccess(notifications){for(var i=0;i<notifications.length;i++){notifications[i].close();}},function onError(error){var message=error.message||'Unknown error';console.error('Could not get notification: ',message);throw error;});}
function wpm_finish(){pendingMessages--;if(document.hidden){wpm_close();}}
function wpm_close(){if(closeTimeout!==null){return;}
closeTimeout=window.setTimeout(function wpm_delayedClose(){if(pendingMessages>0){closeTimeout=window.setTimeout(wpm_delayedClose,100);return;}
DUMP('Automatically closing the application');closeTimeout=null;window.close();},100);}
exports.WapPushManager=WapPushManager;})(this);;'use strict';WapPushManager.init();