;;var _createClass=(function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};})();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function');}}
(function(){'use strict';function emit(listeners,...args){const type=args.shift();if(listeners['*']){listeners['*'].slice().forEach(listener=>listener.apply(this,args));}
if(listeners[type]){listeners[type].slice().forEach(listener=>listener.apply(this,args));}}
function addEventListener(listeners,type,listener){if(!(type in listeners)){listeners[type]=[];}
listeners[type].push(listener);}
function removeEventListener(listeners,type,listener){const typeListeners=listeners[type];const pos=typeListeners.indexOf(listener);if(pos===-1){return;}
typeListeners.splice(pos,1);}
let Client=(function(){function Client(remote){_classCallCheck(this,Client);this.id=this;this.remote=remote;const listeners={};this.on=(...args)=>addEventListener(listeners,...args);this.emit=(...args)=>emit(listeners,...args);}
_createClass(Client,[{key:'method',value:function method(name,...args){return this.remote[name](...args);}}]);return Client;})();function broadcast(type,data){Array.from(this.ctxs.keys()).forEach(client=>client.emit(type,data));}
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
const pseudo=Object.defineProperties(Object.create(null),{'fr-x-psaccent':{enumerable:true,get:createGetter('fr-x-psaccent','Runtime Accented')},'ar-x-psbidi':{enumerable:true,get:createGetter('ar-x-psbidi','Runtime Bidi')}});let Env=(function(){function Env(fetchResource){_classCallCheck(this,Env);this.fetchResource=fetchResource;this.resCache=new Map();this.resRefs=new Map();this.numberFormatters=null;this.parsers={properties:PropertiesParser,l20n:L20nParser};const listeners={};this.emit=emit.bind(this,listeners);this.addEventListener=addEventListener.bind(this,listeners);this.removeEventListener=removeEventListener.bind(this,listeners);}
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
_createClass(Remote,[{key:'registerView',value:function registerView(view,resources,meta,additionalLangs,requestedLangs){const{langs}=negotiateLanguages(meta,additionalLangs,[],requestedLangs);this.ctxs.set(view,this.env.createContext(langs,resources));return langs;}},{key:'unregisterView',value:function unregisterView(view){this.ctxs.delete(view);return true;}},{key:'formatEntities',value:function formatEntities(view,keys){return this.ctxs.get(view).formatEntities(...keys);}},{key:'formatValues',value:function formatValues(view,keys){return this.ctxs.get(view).formatValues(...keys);}},{key:'changeLanguages',value:function changeLanguages(view,meta,additionalLangs,requestedLangs){const oldCtx=this.ctxs.get(view);const prevLangs=oldCtx.langs;const newLangs=negotiateLanguages(meta,additionalLangs,prevLangs,requestedLangs);this.ctxs.set(view,this.env.createContext(newLangs.langs,oldCtx.resIds));return newLangs;}},{key:'requestLanguages',value:function requestLanguages(requestedLangs){this.broadcast('languageschangerequest',requestedLangs);}},{key:'getName',value:function getName(code){return pseudo[code].name;}},{key:'processString',value:function processString(code,str){return pseudo[code].process(str);}}]);return Remote;})();const observerConfig={attributes:true,characterData:false,childList:true,subtree:true,attributeFilter:['data-l10n-id','data-l10n-args']};const observers=new WeakMap();function initMutationObserver(view){observers.set(view,{roots:new Set(),observer:new MutationObserver(mutations=>translateMutations(view,mutations))});}
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
const remote=new Remote(fetchResource,broadcast);const client=new Client(remote);document.l10n=new View(client,document);window.addEventListener('languagechange',document.l10n);document.addEventListener('additionallanguageschange',document.l10n);navigator.mozL10n={setAttributes:document.l10n.setAttributes,getAttributes:document.l10n.getAttributes,formatValue:(...args)=>document.l10n.formatValue(...args),translateFragment:(...args)=>document.l10n.translateFragment(...args),once:cb=>document.l10n.ready.then(cb),ready:cb=>document.l10n.ready.then(()=>{document.addEventListener('DOMRetranslated',cb);cb();})};})();;;(function(){'use strict';if(window.navigator.mozHour12||window.navigator.hour12){return;}
window.navigator.mozHour12=undefined;var _setMozHour12=function(result){if(result===null){result=undefined;}
if(window.navigator.mozHour12!==result){window.navigator.mozHour12=result;window.dispatchEvent(new CustomEvent('timeformatchange'));}};var _hour12Handler=function(event){_setMozHour12(event.settingValue);};var _kLocaleTime='locale.hour12';var req=window.navigator.mozSettings.createLock().get(_kLocaleTime);req.onsuccess=function(){_setMozHour12(req.result[_kLocaleTime]);};window.navigator.mozSettings.addObserver(_kLocaleTime,_hour12Handler);})();;;(function(global){'use strict';global.mozIntl={formatList:function(list){return navigator.mozL10n.formatValue('listSeparator_middle').then(sep=>list.join(sep));},DateTimeFormat:function(locales,options){const resolvedOptions=Object.assign({},options);if(resolvedOptions.dayperiod){if(resolvedOptions.hour===undefined){resolvedOptions.hour='numeric';}}
if(resolvedOptions.hour!==undefined&&resolvedOptions.hour12===undefined){resolvedOptions.hour12=navigator.mozHour12;}
if(resolvedOptions.dayperiod===undefined&&resolvedOptions.hour12===true){resolvedOptions.dayperiod=true;}
var intlFormat=new Intl.DateTimeFormat(locales,resolvedOptions);resolvedOptions.locale=intlFormat.resolvedOptions().locale;resolvedOptions.hour12=intlFormat.resolvedOptions().hour12;var hourFormatter;if(resolvedOptions.dayperiod!==undefined&&resolvedOptions.hour12===true){hourFormatter=Intl.DateTimeFormat(locales,{hour:'numeric',hour12:false});}
return{resolvedOptions(){return resolvedOptions;},format:function(date,tokenFormats){var dayPeriod;var string=intlFormat.format(date);if(resolvedOptions.dayperiod===false&&resolvedOptions.hour12===true){dayPeriod=getDayPeriodTokenForDate(date,hourFormatter);string=string.replace(dayPeriod,'').trim();}else if(resolvedOptions.dayperiod===true&&options.hour===undefined){dayPeriod=getDayPeriodTokenForDate(date,hourFormatter);const hour=date.toLocaleString(navigator.languages,{hour12:true,hour:'numeric'}).replace(dayPeriod,'').trim();string=string.replace(hour,'').trim();}
for(var token in tokenFormats){if(token==='dayperiod'&&resolvedOptions.hour12===false){continue;}
const localOptions={[token]:resolvedOptions[token],};var formatter=global.mozIntl.DateTimeFormat(navigator.languages,localOptions);var tokenString=formatter.format(date);string=string.replace(tokenString,tokenFormats[token]);}
return string;},};},calendarInfo:function(token){switch(token){case'firstDayOfTheWeek':return navigator.mozL10n.formatValue('firstDayOfTheWeek').then(firstDayOfTheWeek=>parseInt(firstDayOfTheWeek)%7);default:throw new Error('Unknown token: '+token);}},DurationFormat:function(locales=navigator.languages,options={}){const resolvedOptions=Object.assign({locale:locales[0],maxUnit:'hour',minUnit:'second',},options);const numFormatter=Intl.NumberFormat(locales,{style:'decimal',useGrouping:false,minimumIntegerDigits:2});const maxUnitIdx=getDurationUnitIdx(resolvedOptions.maxUnit,0);const minUnitIdx=getDurationUnitIdx(resolvedOptions.minUnit,durationFormatOrder.length-1);return navigator.mozL10n.formatValue('durationPattern').then(fmt=>({resolvedOptions:function(){return resolvedOptions;},format:function(input){const minValue=durationFormatElements[resolvedOptions.minUnit].value;input=Math.round(input/minValue)*minValue;const duration=splitIntoTimeUnits(input,maxUnitIdx,minUnitIdx);var string=trimDurationPattern(fmt,resolvedOptions.maxUnit,resolvedOptions.minUnit);for(var unit in duration){const token=durationFormatElements[unit].token;string=string.replace(token,numFormatter.format(duration[unit]));}
if(input<0){return'-'+string;}
return string;}}));},RelativeTimeFormat:function(locales,options){return{resolvedOptions:function(){return options;},format:function(x){const{unit,value}=relativeTimeFormatId(x,options);return navigator.mozL10n.formatValue(unit,{value});},};},UnitFormat:function(locales,options){const unitGroup=getUnitFormatGroupName(options.unit);if(unitGroup===undefined){throw new RangeError(`invalid value ${options.unit} for option unit`);}
if(!unitFormatGroups[unitGroup].styles.includes(options.style)){throw new RangeError(`invalid value ${options.style} for option style`);}
const unit=`${unitGroup}-${options.unit}-${options.style}`;return{format:function(x){return document.l10n.formatValue(unit,{value:x});},};},_gaia:{relativePart:function(milliseconds){const units=computeTimeUnits(milliseconds);const unit=getBestMatchUnit(units);return{unit:unit+'s',value:Math.abs(units[unit])};},RelativeDate:function(locales,options){const style=options&&options.style||'long';const maxFormatter=Intl.DateTimeFormat(locales,{year:'numeric',month:'numeric',day:'numeric'});const relativeFmtOptions={unit:'bestFit',style:style,minUnit:'minute',};return{format:function(time,maxDiff){maxDiff=maxDiff||86400*10;const secDiff=(Date.now()-time)/1000;if(isNaN(secDiff)){return navigator.mozL10n.formatValue('incorrectDate');}
if(secDiff>maxDiff){return Promise.resolve(maxFormatter.format(time));}
const{unit,value}=relativeTimeFormatId(time,relativeFmtOptions);return navigator.mozL10n.formatValue(unit,{value});},formatElement:function(element,time,maxDiff){maxDiff=maxDiff||86400*10;const secDiff=(Date.now()-time)/1000;if(isNaN(secDiff)){element.setAttribute('data-l10n-id','incorrectDate');}
element.removeAttribute('data-l10n-id');if(secDiff>maxDiff){element.textContent=maxFormatter.format(time);}
const{unit,value}=relativeTimeFormatId(time,relativeFmtOptions);navigator.mozL10n.setAttributes(element,unit,{value});},};},getFormattedUnit:function(type,style,v){if(!unitFormatData.hasOwnProperty(type)){throw new RangeError(`invalid type ${type}`);}
if(!unitFormatGroups[type].styles.includes(style)){throw new RangeError(`invalid style ${style} for type ${type}`);}
var units=unitFormatData[type];var scale=0;for(let i=1;i<units.length;i++){if(v<units[i].value*unitFormatGroups[type].rounding){scale=i-1;break;}else if(i===units.length-1){scale=i;}}
var value=Math.round(v/units[scale].value*100)/100;return global.mozIntl.UnitFormat(navigator.languages,{unit:units[scale].name,style:style}).format(value);},}};const durationFormatOrder=['hour','minute','second','millisecond'];const durationFormatElements={'hour':{value:3600000,token:'hh'},'minute':{value:60000,token:'mm'},'second':{value:1000,token:'ss'},'millisecond':{value:10,token:'SS'}};const unitFormatData={'duration':[{'name':'second','value':1},{'name':'minute','value':60},{'name':'hour','value':60*60},{'name':'day','value':24*60*60},{'name':'month','value':30*24*60*60},],'digital':[{'name':'byte','value':1},{'name':'kilobyte','value':1024},{'name':'megabyte','value':1024*1024},{'name':'gigabyte','value':1024*1024*1024},{'name':'terabyte','value':1024*1024*1024*1024},],};const unitFormatGroups={'duration':{'units':['second','minute','hour','day','month'],'styles':['narrow'],'rounding':1},'digital':{'units':['byte','kilobyte','megabyte','gigabyte','terabyte'],'styles':['short'],'rounding':0.8}};function getDurationUnitIdx(name,defaultValue){if(!name){return defaultValue;}
const pos=durationFormatOrder.indexOf(name);if(pos===-1){throw new Error('Unknown unit type: '+name);}
return pos;}
function splitIntoTimeUnits(v,maxUnitIdx,minUnitIdx){const units={};var input=Math.abs(v);for(var i=maxUnitIdx;i<=minUnitIdx;i++){const key=durationFormatOrder[i];const{value}=durationFormatElements[key];units[key]=i==minUnitIdx?Math.round(input/value):Math.floor(input/value);input-=units[key]*value;}
return units;}
function trimDurationPattern(string,maxUnit,minUnit){const maxToken=durationFormatElements[maxUnit].token;const minToken=durationFormatElements[minUnit].token;string=string.substring(string.indexOf(maxToken),string.indexOf(minToken)+minToken.length);return string;}
function getDayPeriodTokenForDate(date,hourFormatter){const hourToken=hourFormatter.format(date);const newDate=new Date(date);newDate.setHours(parseInt(hourToken));return new Intl.DateTimeFormat(navigator.language, {hour:'numeric', hour12:true}).formatToParts(newDate).find(part => part.type === 'dayPeriod').value;}
function computeTimeUnits(v){const units={};const millisecond=Math.round(v);const second=Math.round(millisecond/1000);const minute=Math.round(second/60);const hour=Math.round(minute/60);const day=Math.round(hour/24);const rawYear=day*400/146097;units.millisecond=millisecond;units.second=second;units.minute=minute;units.hour=hour;units.day=day;units.week=Math.round(day/7);units.month=Math.round(rawYear*12);units.quarter=Math.round(rawYear*4);units.year=Math.round(rawYear);return units;}
function getBestMatchUnit(units){if(Math.abs(units.minute)<45){return'minute';}
if(Math.abs(units.hour)<22){return'hour';}
if(Math.abs(units.day)<7){return'day';}
if(Math.abs(units.week)<4){return'week';}
if(Math.abs(units.month)<11){return'month';}
return'year';}
function relativeTimeFormatId(x,options){const ms=x-Date.now();const units=computeTimeUnits(ms);const unit=options.unit==='bestFit'?getBestMatchUnit(units):options.unit;const v=units[unit];const tl=v<0?'-ago':'-until';const style=options.style||'long';const entry=unit+'s'+tl+'-'+style;return{unit:entry,value:Math.abs(v)};}
function getUnitFormatGroupName(unitName){for(let groupName in unitFormatGroups){if(unitFormatGroups[groupName].units.includes(unitName)){return groupName;}}
return undefined;}})(this);;;(function(global){'use strict';const helperCache=new Map();const knownObjects={datetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
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
window.addEventListener('timeformatchange',global.IntlHelper,false);window.addEventListener('languagechange',global.IntlHelper,false);window.addEventListener('moztimechange',global.IntlHelper,false);})(this);;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;window.GaiaSwitch=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSwitchBaseurl||'/shared/elements/gaia_switch/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._input=this._template.querySelector('input[type="checkbox"]');var checked=this.getAttribute('checked');if(checked!==null){this._input.checked=true;}
var wrapper=this._template.getElementById('switch');wrapper.addEventListener('click',this.handleClick.bind(this));shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);var dirObserver=new MutationObserver(this.updateInternalDir.bind(this));dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});this.updateInternalDir();};proto.updateInternalDir=function(){var internal=this.shadowRoot.firstElementChild;if(document.documentElement.dir==='rtl'){internal.setAttribute('dir','rtl');}else{internal.removeAttribute('dir');}};proto.handleClick=function(e){if(e&&e.target.tagName==='A'){return;}
e&&e.preventDefault();e&&e.stopImmediatePropagation();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(!event.defaultPrevented){this.checked=!this.checked;}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.click=function(){this.handleClick();};Object.defineProperty(proto,'checked',{get:function(){return this._input.checked;},set:function(value){this._input.checked=value;}});Object.defineProperty(proto,'disabled',{get:function(){return this.hasAttribute('disabled');},set:function(value){if(value){this.setAttribute('disabled',true);}else{this.removeAttribute('disabled');}}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});Object.defineProperty(proto,'type',{get:function(){return'gaia-switch';}});var template=document.createElement('template');template.innerHTML=`<span id="switch">
      <input type="checkbox">
      <span><content select="label"></content></span>
      <div class="details"><content select="details"></content></div>
      <content select="a"></content>
    </span>`;return document.registerElement('gaia-switch',{prototype:proto});})(window);