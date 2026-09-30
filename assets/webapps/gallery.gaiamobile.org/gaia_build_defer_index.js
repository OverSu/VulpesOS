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
const remote=new Remote(fetchResource,broadcast);const client=new Client(remote);document.l10n=new View(client,document);window.addEventListener('languagechange',document.l10n);document.addEventListener('additionallanguageschange',document.l10n);navigator.mozL10n={setAttributes:document.l10n.setAttributes,getAttributes:document.l10n.getAttributes,formatValue:(...args)=>document.l10n.formatValue(...args),translateFragment:(...args)=>document.l10n.translateFragment(...args),once:cb=>document.l10n.ready.then(cb),ready:cb=>document.l10n.ready.then(()=>{document.addEventListener('DOMRetranslated',cb);cb();})};})();;'use strict';var MediaDB=(function(){function MediaDB(mediaType,metadataParser,options){this.mediaType=mediaType;this.metadataParser=metadataParser;if(!options){options={};}
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
return MediaDB;}());;'use strict';var files=[];var picking=(window.location.hash==='#pick');var photodb;;'use strict';function ThumbnailItem(fileData){if(!fileData){throw new Error('fileData should not be null or undefined.');}
this.data=fileData;this.htmlNode=document.createElement('div');this.htmlNode.classList.add('thumbnail');this.htmlNode.setAttribute('role','button');this.htmlNode.setAttribute('tabindex',0);this.imgNode=document.createElement('img');this.imgNode.alt='';this.imgNode.classList.add('thumbnailImage');this.imgNode.dataset.filename=fileData.name;var url=URL.createObjectURL(fileData.metadata.thumbnail);this.imgNode.src=url;this.htmlNode.appendChild(this.imgNode);this.localize();}
ThumbnailItem.formatter=new Intl.DateTimeFormat(navigator.languages,{hour:'numeric',minute:'numeric',month:'long',day:'numeric',year:'numeric',});ThumbnailItem.resetFormatter=()=>{ThumbnailItem.formatter=new Intl.DateTimeFormat(navigator.languages,{hour:'numeric',minute:'numeric',month:'long',day:'numeric',year:'numeric',});};ThumbnailItem.prototype.localize=function(){var date=new Date(this.data.date);var descId=!this.data.metadata.video?'imageDated':'videoDated';document.l10n.setAttributes(this.imgNode,descId,{timeStamp:ThumbnailItem.formatter.format(date)});};;'use strict';function ThumbnailDateGroup(item){if(!item){throw new Error('item should not be null or undefined.');}
this.thumbnails=[];this.groupID=ThumbnailDateGroup.getGroupID(item);this.date=item.date;this.header=document.createElement('div');this.header.className='thumbnail-group-header';this.container=document.createElement('div');this.container.className='thumbnail-group-container';this.htmlNode=document.createElement('li');this.htmlNode.appendChild(this.header);this.htmlNode.appendChild(this.container);this.localize();}
ThumbnailDateGroup.getGroupID=function(item){var dateObj=new Date(item.date);var month=dateObj.getMonth()+1;return'group_'+dateObj.getFullYear()+'-'+
(month<10?'0'+month:month);};ThumbnailDateGroup.compareGroupID=function(id1,id2){return id1>id2?1:(id1<id2?-1:0);};ThumbnailDateGroup.prototype.addItem=function(item){if(!item){return;}
var self=this;function getInsertPosition(thumbnail){if(self.thumbnails.length===0||thumbnail.data.date>self.thumbnails[0].data.date){return 0;}
else if(thumbnail.data.date<self.thumbnails[self.thumbnails.length-1].data.date){return self.thumbnails.length;}
else{return MediaUtils.binarySearch(self.thumbnails,thumbnail,function(a,b){return b.data.date-a.data.date;});}}
var thumbnail=new ThumbnailItem(item);var insertPosition=getInsertPosition(thumbnail);this.container.insertBefore(thumbnail.htmlNode,this.container.children[insertPosition]);this.thumbnails.splice(insertPosition,0,thumbnail);return thumbnail;};ThumbnailDateGroup.prototype.getCount=function(){return this.thumbnails.length;};ThumbnailDateGroup.prototype.removeItem=function(thumbnail){var idx=this.thumbnails.indexOf(thumbnail);if(idx<0){return;}
this.thumbnails.splice(idx,1);URL.revokeObjectURL(thumbnail.imgNode.src);this.container.removeChild(thumbnail.htmlNode);};ThumbnailDateGroup.formatter=new Intl.DateTimeFormat(navigator.languages,{month:'long',year:'numeric',});ThumbnailDateGroup.resetFormatter=()=>{ThumbnailDateGroup.formatter=new Intl.DateTimeFormat(navigator.languages,{month:'long',year:'numeric',});};ThumbnailDateGroup.prototype.localize=function(){var date=new Date(this.date);this.header.textContent=ThumbnailDateGroup.formatter.format(date);this.thumbnails.forEach(function(thumbnail){thumbnail.localize();});};;'use strict';function ThumbnailList(groupClass,container){if(!groupClass||!container){throw new Error('group class or container cannot be null or undefined');}
this.thumbnailMap={};this.groupMap={};this.itemGroups=[];this.count=0;this.groupClass=groupClass;this.container=container;}
ThumbnailList.prototype.addItem=function(item){if(!item){return null;}
if(this.thumbnailMap[item.name]){return this.thumbnailMap[item.name];}
var self=this;function createItemGroup(item,before){var group=new self.groupClass(item);self.container.insertBefore(group.htmlNode,before?before.htmlNode:null);return group;}
function getItemGroup(item){var groupID=self.groupClass.getGroupID(item);var i;for(i=0;i<self.itemGroups.length;i++){if(self.itemGroups[i].groupID===groupID){return self.itemGroups[i];}else if(self.groupClass.compareGroupID(self.itemGroups[i].groupID,groupID)<0){break;}}
var createdGroup=createItemGroup(item,self.itemGroups[i]);self.itemGroups.splice(i,0,createdGroup);return createdGroup;}
var group=getItemGroup(item);var thumbnail=group.addItem(item);this.groupMap[item.name]=group;this.thumbnailMap[item.name]=thumbnail;this.count++;return thumbnail;};ThumbnailList.prototype.removeItem=function(filename){if(!this.thumbnailMap[filename]){return;}
var group=this.groupMap[filename];group.removeItem(this.thumbnailMap[filename]);if(!group.getCount()){this.container.removeChild(group.htmlNode);this.itemGroups.splice(this.itemGroups.indexOf(group),1);}
this.count--;delete this.groupMap[filename];delete this.thumbnailMap[filename];};ThumbnailList.prototype.reset=function(){for(var name in this.thumbnailMap){this.groupMap[name].removeItem(this.thumbnailMap[name]);}
this.container.innerHTML='';this.thumbnailMap={};this.itemGroups=[];this.groupMap={};this.count=0;};ThumbnailList.prototype.localize=function(){this.itemGroups.forEach(function(group){group.localize();});};;(function(exports){'use strict';var thumbnails=exports.Thumbnails={};thumbnails.container=document.createElement('ul');thumbnails.container.id='thumbnails';thumbnails.list=new ThumbnailList(ThumbnailDateGroup,thumbnails.container);document.addEventListener('DOMRetranslated',()=>{ThumbnailDateGroup.resetFormatter();ThumbnailItem.resetFormatter();thumbnails.list.localize();});var PAGE_SIZE=15;photodb=new MediaDB('pictures',metadataParserWrapper,{version:2,autoscan:false,batchHoldTime:2000,batchSize:3});var metadataParserLoaded=false;function metadataParserWrapper(file,onsuccess,onerror,bigFile){if(metadataParserLoaded){metadataParser(file,onsuccess,onerror,bigFile);return;}
LazyLoader.load(['js/metadata_scripts.js','shared/js/media/crop_resize_rotate.js'],function(){metadataParserLoaded=true;metadataParser(file,onsuccess,onerror,bigFile);});}
var firstPageResolver;var completionResolver;thumbnails.firstpage=new Promise(function(resolve,reject){firstPageResolver=resolve;thumbnails.complete=new Promise(function(resolve,reject){completionResolver=resolve;createThumbnails();});});function createThumbnails(){if(photodb.state===MediaDB.READY||photodb.state===MediaDB.ENUMERABLE){enumerateDB();}
else{photodb.addEventListener('enumerable',enumerateDB);}}
function enumerateDB(){var batch=[];var batchsize=PAGE_SIZE;var firstPageDisplayed=false;photodb.enumerate('date',null,'prev',function(fileinfo){if(fileinfo){if(picking&&fileinfo.metadata.video){return;}
var metadata=fileinfo.metadata;if(metadata&&metadata.preview&&metadata.preview.filename){metadata.preview.width=Math.floor(metadata.preview.width);metadata.preview.height=Math.floor(metadata.preview.height);}
batch.push(fileinfo);if(batch.length>=batchsize){flush();batchsize*=2;}}
else{done();}});function flush(){batch.forEach(thumb);batch.length=0;if(!firstPageDisplayed){firstPageDisplayed=true;firstPageResolver();}}
function thumb(fileinfo){files.push(fileinfo);thumbnails.list.addItem(fileinfo);}
function done(){flush();completionResolver();}}}(window));;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var MediaUtils={formatDate:function(timestamp){if(!timestamp||timestamp===undefined||isNaN(timestamp)){return;}
return new Date(timestamp).toLocaleString(navigator.languages,{'month':'numeric','year':'numeric','day':'numeric'});},getLocalizedSizeTokens:function(size){if(!size||size===undefined||isNaN(size)){return Promise.resolve('');}
var units=['B','KB','MB','GB','TB','PB','EB','ZB','YB'];var i=0;while(size>=1024&&i<(units.length-1)){size/=1024;++i;}
var sizeDecimal=i<2?Math.round(size):Math.round(size*10)/10;return document.l10n.formatValue('byteUnit-'+units[i]).then((unit)=>{return{size:sizeDecimal,unit};});},getLocalizedSize:function(size){return this.getLocalizedSizeTokens(size).then((args)=>{return document.l10n.formatValue('fileSize',args);});},formatDuration:function(duration){function padLeft(num,length){var r=String(num);while(r.length<length){r='0'+r;}
return r;}
duration=Math.round(duration);var minutes=Math.floor(duration/60);var seconds=duration%60;if(minutes<60){return padLeft(minutes,2)+':'+padLeft(seconds,2);}
var hours=Math.floor(minutes/60);minutes=Math.floor(minutes%60);return hours+':'+padLeft(minutes,2)+':'+padLeft(seconds,2);},populateMediaInfo:function(data){for(var id in data){if(data.hasOwnProperty(id)){var element=document.getElementById(id);if(element){if(typeof data[id]==='string'){element.setAttribute('data-l10n-id',data[id]);}else if(data[id].hasOwnProperty('raw')){element.removeAttribute('data-l10n-id');element.textContent=data[id].raw;}else{document.l10n.setAttributes(element,data[id].id,data[id].args);}}}}},binarySearch:function(array,element,comparator,from,to){if(comparator===undefined){comparator=function(a,b){return a-b;};}
if(from===undefined){return MediaUtils.binarySearch(array,element,comparator,0,array.length);}
if(from===to){return from;}
var mid=Math.floor((from+to)/2);var result=comparator(element,array[mid]);if(result<0){return MediaUtils.binarySearch(array,element,comparator,from,mid);}
else{return MediaUtils.binarySearch(array,element,comparator,mid+1,to);}}};;'use strict';var ScreenLayout={defaultQueries:{tiny:'(max-width: 767px)',small:'(min-width: 768px) and (max-width: 991px)',medium:'(min-width: 992px) and (max-width: 1200px)',large:'(min-width: 1201px)',hardwareHomeButton:window.VulpesCompat?'(min-width: 0px)':'(-moz-physical-home-button)'},init:function sl_init(){this.queries=(function(qs){var result={};for(var key in qs){result[key]=window.matchMedia(qs[key]);}
return result;})(this.defaultQueries);},_isOnRealDevice:undefined,isOnRealDevice:function sl_isOnRealDevice(){if(typeof(this._isOnRealDevice)!=='undefined'){return this._isOnRealDevice;}
if(window.innerWidth===screen.availWidth){this._isOnRealDevice=true;}else{this._isOnRealDevice=false;}
return this._isOnRealDevice;},getCurrentLayout:function sl_getCurrentLayout(type){if(type===undefined){for(var name in this.defaultQueries){if(this.queries[name]&&this.queries[name].matches){return name;}}}
if(typeof this.queries[type]!=='undefined'){return this.queries[type].matches;}
return false;},watch:function sl_watch(name,media){var mediaString=media||this.queries[name].media;if(!mediaString){return;}
this.unwatch(name);this.queries[name]=window.matchMedia(mediaString);this.boundHandleChange=this.handleChange.bind(this);this.queries[name].addListener(this.boundHandleChange);},unwatch:function sl_unwatch(name){if(this.queries[name]){this.queries[name].removeListener(this.boundHandleChange);}},handleChange:function sl_handleChange(evt){for(var key in this.queries){if(this.queries[key].media!==evt.media){continue;}
window.dispatchEvent(new CustomEvent('screenlayoutchange',{detail:{name:key,status:evt.matches}}));}}};ScreenLayout.init();;;(function(exports){'use strict';function round(x){return Math.round(x*100)/100;}
function MozSampleSize(n,scale){return Object.freeze({dimensionScale:round(scale),areaScale:round(scale*scale),toString:function(){return'#-moz-samplesize='+n;},scale:function(x){return Math.ceil(x*scale);}});}
var NONE=Object.freeze({dimensionScale:1,areaScale:1,toString:function(){return'';},scale:function(x){return x;}});var fragments=[NONE,MozSampleSize(2,1/2),MozSampleSize(3,3/8),MozSampleSize(4,1/4),MozSampleSize(8,1/8)];function sizeAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.dimensionScale<=scale){return f;}}
return fragments[fragments.length-1];}
function sizeNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.dimensionScale>=scale){return f;}}
return NONE;}
function areaAtLeast(scale){scale=round(scale);for(var i=0;i<fragments.length;i++){var f=fragments[i];if(f.areaScale<=scale){return f;}}
return fragments[fragments.length-1];}
function areaNoMoreThan(scale){scale=round(scale);for(var i=fragments.length-1;i>=0;i--){var f=fragments[i];if(f.areaScale>=scale){return f;}}
return NONE;}
exports.Downsample={sizeAtLeast:sizeAtLeast,sizeNoMoreThan:sizeNoMoreThan,areaAtLeast:areaAtLeast,areaNoMoreThan:areaNoMoreThan,NONE:NONE,MAX_SIZE_REDUCTION:1/fragments[fragments.length-1].dimensionScale,MAX_AREA_REDUCTION:1/fragments[fragments.length-1].areaScale};}(window));;'use strict';var Dialogs={confirm:function(options,onConfirm,onCancel){LazyLoader.load('shared/style/confirm.css',function(){var dialog=$('confirm-dialog');var msgEle=$('confirm-msg');var cancelButton=$('confirm-cancel');var confirmButton=$('confirm-ok');var addText=function(element,prefix,defaultId){if(options[prefix+'Id']){document.l10n.setAttributes(element,options[prefix+'Id'],options[prefix+'Args']);}
else if(options[prefix]||options[prefix+'Text']){var textOption=options[prefix]||options[prefix+'Text'];element.textContent=textOption;}
else if(defaultId){element.setAttribute('data-l10n-id',defaultId);}};addText(msgEle,'message');addText(cancelButton,'cancel','cancel');addText(confirmButton,'confirm','ok');if(options.danger){confirmButton.classList.add('danger');}else{confirmButton.classList.remove('danger');}
if(options.bodyClass){document.body.classList.add(options.bodyClass);}
dialog.classList.remove('hidden');function close(ev){if(options.bodyClass){document.body.classList.remove(options.bodyClass);}
dialog.classList.add('hidden');cancelButton.removeEventListener('click',onCancelClick);confirmButton.removeEventListener('click',onConfirmClick);ev.preventDefault();ev.stopPropagation();return false;}
var onCancelClick=function(ev){close(ev);if(onCancel){onCancel();}
return false;};var onConfirmClick=function(ev){close(ev);if(onConfirm){onConfirm();}
return false;};cancelButton.addEventListener('click',onCancelClick);confirmButton.addEventListener('click',onConfirmClick);});}};;;window.COMPONENTS_BASE_URL='/shared/elements/';;;var CONFIG_MAX_IMAGE_PIXEL_SIZE=5242880;var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE=5242880;var CONFIG_MAX_PICK_PIXEL_SIZE=0;var CONFIG_MAX_EDIT_PIXEL_SIZE=0;var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH=0;var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT=0;;'use strict';function $(id){return document.getElementById(id);};'use strict';var Spinner={show:function show(){$('spinner').classList.remove('hidden');},hide:function hide(){$('spinner').classList.add('hidden');}};;'use strict';var Overlay={current:null,hide:function hide(){Overlay.current=null;$('overlay').classList.add('hidden');document.body.classList.remove('showing-dialog');},show:function show(id){Overlay.current=id;LazyLoader.load('shared/style/confirm.css',function(){$('overlay-camera-button').classList.add('hidden');$('overlay-cancel-button').classList.add('hidden');$('overlay-menu').classList.add('hidden');document.body.classList.add('showing-dialog');var title,text;switch(id){case null:Overlay.hide();return;case'nocard':title='nocard3-title';text='nocard4-text';if(picking){$('overlay-cancel-button').classList.remove('hidden');$('overlay-menu').classList.remove('hidden');}
break;case'pluggedin':title='pluggedin2-title';text='pluggedin2-text';if(picking){$('overlay-cancel-button').classList.remove('hidden');$('overlay-menu').classList.remove('hidden');}
break;case'scanning':title='scanning-title';text='scanning-text';if(picking){$('overlay-cancel-button').classList.remove('hidden');$('overlay-menu').classList.remove('hidden');}
break;case'emptygallery':title=picking?'emptygallery2-title-pick':'emptygallery2-title';text='emptygallery2-text';$('overlay-menu').classList.remove('hidden');if(picking){$('overlay-cancel-button').classList.remove('hidden');}else{$('overlay-camera-button').classList.remove('hidden');}
break;case'upgrade':title='upgrade-title';text='upgrade-text';if(picking){$('overlay-cancel-button').classList.remove('hidden');$('overlay-menu').classList.remove('hidden');}
break;default:console.warn('Reference to undefined overlay',id);if(picking){$('overlay-cancel-button').classList.remove('hidden');$('overlay-menu').classList.remove('hidden');}
return;}
$('overlay-title').setAttribute('data-l10n-id',title);$('overlay-text').setAttribute('data-l10n-id',text);$('overlay').classList.remove('hidden');});},addEventListener:function(type,listener){$('overlay').addEventListener(type,listener);},removeEventListener:function(type,listener){$('overlay').removeEventListener(type,listener);},};$('overlay-cancel-button').addEventListener('click',function(){$('overlay').dispatchEvent(new CustomEvent('cancel'));});$('overlay-camera-button').addEventListener('click',function(){$('overlay').dispatchEvent(new CustomEvent('camera'));});;;'use strict';var NFC={shrinkingUI:null,peer:null,share:function share(f,options){if(navigator.mozNfc){if(window.ShrinkingUI&&options){NFC.shrinkingUI=new window.ShrinkingUI(options.foregroundElement,options.backgroundElement);window.addEventListener('shrinking-sent',NFC.sendFile.bind(NFC,f));navigator.mozNfc.onpeerfound=function(evt){if(!evt.peer){return;}
NFC.peer=evt.peer;NFC.shrinkingUI.start();evt.preventDefault();};navigator.mozNfc.onpeerlost=function(){NFC.peer=null;NFC.shrinkingUI.stop();};}else{navigator.mozNfc.onpeerready=function(event){NFC.peer=event.peer;NFC.sendFile(f);};}}},sendFile:function(f){if(!NFC.peer){return;}
if(typeof f==='function'){var promise=f();promise.then(function(file){NFC.peer.sendFile(file);if(NFC.shrinkingUI){NFC.shrinkingUI.stop();}});}
else{NFC.peer.sendFile(f);if(NFC.shrinkingUI){NFC.shrinkingUI.stop();}}},unshare:function unshare(){if(navigator.mozNfc){NFC.peer=null;navigator.mozNfc.onpeerready=null;navigator.mozNfc.onpeerfound=null;navigator.mozNfc.onpeerlost=null;if(NFC.shrinkingUI){NFC.shrinkingUI.stop();NFC.shrinkingUI=null;window.removeEventListener('shrinking-sent',NFC.sendFile);}}}};;'use strict';var TRANSITION_FRACTION=0.25;var TRANSITION_SPEED=0.75;var thumbnails;var thumbnailList;var fullscreenView=$('fullscreen-view');const LAYOUT_MODE={list:'thumbnailListView',select:'thumbnailSelectView',fullscreen:'fullscreenView',edit:'editView',pick:'pickView',crop:'cropView'};var currentView;ScreenLayout.watch('portrait','(orientation: portrait)');var isPortrait=ScreenLayout.getCurrentLayout('portrait');var isPhone=ScreenLayout.getCurrentLayout('tiny');var fullscreenButtonIds=['back','delete','edit','share','camera','info'];var fullscreenButtons={};for(var i=0;i<fullscreenButtonIds.length;i++){var selector='fullscreen-'+fullscreenButtonIds[i]+'-button';selector+=(isPhone?'-tiny':'-large');fullscreenButtons[fullscreenButtonIds[i]]=document.getElementById(selector);}
var currentFileIndex=0;var editedPhotoIndex;var selectedFileNames=[];var selectedFileNamesToBlobs={};var videostorage=navigator.getDeviceStorage('videos');var justSavedEditedImage=false;function getVideoFile(filename,callback){var req=videostorage.get(filename);req.onsuccess=function(){callback(req.result);};req.onerror=function(){console.error('Failed to get video file',filename);};}
function getCurrentFile(){return new Promise(function(resolve,reject){var fileInfo=files[currentFileIndex];if(fileInfo.metadata.video){getVideoFile(fileInfo.metadata.video,function(file){resolve(file);});}else{photodb.getFile(fileInfo.name,function(file){resolve(file);},function(errmsg){reject(errmsg);});}});}
function compareFilesByDate(a,b){if(a.date<b.date){return 1;}else if(a.date>b.date){return-1;}
return 0;}
function getFileIndex(filename){var fileGroup=thumbnailList.groupMap[filename];if(!fileGroup){console.error('file group does not exist in thumbnail List',filename);return-1;}
var index=0;var thumbnail=thumbnailList.thumbnailMap[filename];index=fileGroup.thumbnails.indexOf(thumbnail);if(index<0){console.error('filename does not exist in thumbnail list',filename);return-1;}
for(var n=0;n<thumbnailList.itemGroups.length;n++){if(thumbnailList.itemGroups[n].groupID===fileGroup.groupID){break;}
index+=thumbnailList.itemGroups[n].getCount();}
return index;}
function fileDeleted(filename){var fileIndex=currentFileIndex;for(var n=0;n<files.length;n++){if(files[n].name===filename){break;}}
if(n>=files.length){return;}
files.splice(n,1)[0];thumbnailList.removeItem(filename);if(n<fileIndex){fileIndex--;}
if(fileIndex>=files.length){fileIndex=files.length-1;}
if(n<editedPhotoIndex){editedPhotoIndex--;}
if(files.length>0&&(currentView===LAYOUT_MODE.fullscreen)){showFile(fileIndex);}else{updateFocusThumbnail(fileIndex);}
if(files.length===0){if(currentView!==LAYOUT_MODE.pick){setView(LAYOUT_MODE.list);}
Overlay.show('emptygallery');}}
function deleteFile(n){if(n<0||n>=files.length){return;}
var fileinfo=files[n];photodb.deleteFile(files[n].name);if(fileinfo.metadata.video){videostorage.delete(fileinfo.metadata.video);}
if(fileinfo.metadata.preview&&fileinfo.metadata.preview.filename){var pictures=navigator.getDeviceStorage('pictures');pictures.delete(fileinfo.metadata.preview.filename);}}
function fileCreated(fileinfo){if(picking&&fileinfo.metadata.video){return;}
photodb.getFileInfo(fileinfo.name,function(fileinfo){var insertPosition;if(Overlay.current==='emptygallery'||Overlay.current==='scanning'){Overlay.hide();}
thumbnailList.addItem(fileinfo);insertPosition=getFileIndex(fileinfo.name);if(insertPosition<0){return;}
files.splice(insertPosition,0,fileinfo);if(currentFileIndex>=insertPosition){currentFileIndex++;}
if(editedPhotoIndex>=insertPosition){editedPhotoIndex++;}
if(currentView===LAYOUT_MODE.fullscreen){if(justSavedEditedImage){var banner=$('edit-copy-save-banner');showFile(insertPosition);document.l10n.setAttributes($('edit-copy-save-status'),'edit-copy-saved');banner.hidden=false;setTimeout(function(){banner.hidden=true;},3000);}else{showFile(currentFileIndex);}}
justSavedEditedImage=false;});}
function scrollToShowThumbnail(n){if(!files[n]){return;}
var selector='img[data-filename="'+files[n].name+'"]';var thumbnail=thumbnails.querySelector(selector);if(thumbnail){var screenTop=thumbnails.scrollTop;var screenBottom=screenTop+thumbnails.clientHeight;var thumbnailTop=thumbnail.offsetTop;var thumbnailBottom=thumbnailTop+thumbnail.offsetHeight;var toolbarHeight=40;screenBottom-=toolbarHeight;if(thumbnailTop<screenTop){thumbnails.scrollTop=thumbnailTop;}
else if(thumbnailBottom>screenBottom){thumbnails.scrollTop=thumbnailBottom-thumbnails.clientHeight+toolbarHeight;}}}
function setView(view){if(currentView===view){return;}
document.body.classList.remove(currentView);document.body.classList.add(view);switch(currentView){case LAYOUT_MODE.select:Array.forEach(thumbnails.querySelectorAll('.selected.thumbnailImage'),function(elt){elt.classList.remove('selected');});if(!isPhone&&currentFileIndex!==-1){showFile(currentFileIndex);}
break;case LAYOUT_MODE.fullscreen:if(!isPhone&&(view===LAYOUT_MODE.list)&&!isPortrait&&currentFileIndex!==-1){resizeFrames();}else{clearFrames();}
break;}
switch(view){case LAYOUT_MODE.list:scrollToShowThumbnail(currentFileIndex);if(currentView===LAYOUT_MODE.fullscreen){NFC.unshare();}
break;case LAYOUT_MODE.fullscreen:resizeFrames();NFC.share(getCurrentFile);break;case LAYOUT_MODE.select:clearSelection();if(!isPhone&&currentFrame.video&&!isPortrait){currentFrame.video.pause();}
break;case LAYOUT_MODE.edit:NFC.unshare();break;}
if(!isPhone){if(view!==LAYOUT_MODE.fullscreen){$('fullscreen-title').setAttribute('data-l10n-id','preview');}else{$('fullscreen-title').setAttribute('data-l10n-id','gallery');}}
currentView=view;}
function thumbnailClickHandler(evt){var target=evt.target;if(!target){return;}
target=target.classList.contains('thumbnail')?target.firstElementChild:target;if(!target||!target.classList.contains('thumbnailImage')){return;}
if(photodb.state!==MediaDB.READY){return;}
var index=getFileIndex(target.dataset.filename);if(picking&&currentView===LAYOUT_MODE.pick&&index>=0){Pick.select(files[index]);}else if(currentView===LAYOUT_MODE.select){updateSelection(target);}else{LazyLoader.load('js/frame_scripts.js',function(){if(isPortrait||isPhone){setView(LAYOUT_MODE.fullscreen);}
showFile(index);});}}
function updateFocusThumbnail(n){var previousIndex=currentFileIndex;currentFileIndex=n;if(isPhone||currentFileIndex===-1){return;}
var newTarget=thumbnailList.thumbnailMap[files[currentFileIndex].name];if(newTarget){newTarget.htmlNode.classList.add('focus');}
if(previousIndex===currentFileIndex){return;}
var oldTarget=files[previousIndex]?thumbnailList.thumbnailMap[files[previousIndex].name]:undefined;if(oldTarget){oldTarget.htmlNode.classList.remove('focus');}}
function clearSelection(){if(!isPhone){clearFrames();}
selectedFileNames=[];selectedFileNamesToBlobs={};$('thumbnails-delete-button').classList.add('disabled');$('thumbnails-share-button').classList.add('disabled');document.l10n.setAttributes($('thumbnails-number-selected'),'number-selected2',{n:0});}
function updateSelection(thumbnail){thumbnail.classList.toggle('selected');var selected=thumbnail.classList.contains('selected');var index=getFileIndex(thumbnail.dataset.filename);if(index<0){return;}
var filename=files[index].name;if(selected){selectedFileNames.push(filename);updateFocusThumbnail(index);if(files[index].metadata.video){getVideoFile(files[index].metadata.video,function(file){selectedFileNamesToBlobs[filename]=file;});}
else{photodb.getFile(filename,function(file){selectedFileNamesToBlobs[filename]=file;});}
if(!isPhone){showFile(currentFileIndex);}}
else{delete selectedFileNamesToBlobs[filename];var i=selectedFileNames.indexOf(filename);if(i!==-1){selectedFileNames.splice(i,1);}
if(currentFileIndex===index&&!isPhone){if(i>0){var lastSelected=selectedFileNames[i-1];var lastSelectedIndex=getFileIndex(lastSelected);updateFocusThumbnail(lastSelectedIndex);showFile(currentFileIndex);}else{clearFrames();}}}
var numSelected=selectedFileNames.length;document.l10n.setAttributes($('thumbnails-number-selected'),'number-selected2',{n:numSelected});if(numSelected===0){$('thumbnails-delete-button').classList.add('disabled');$('thumbnails-share-button').classList.add('disabled');}
else{$('thumbnails-delete-button').classList.remove('disabled');$('thumbnails-share-button').classList.remove('disabled');}}
function launchCameraApp(){fullscreenButtons.camera.classList.add('disabled');$('thumbnails-camera-button').classList.add('disabled');$('overlay-camera-button').classList.add('disabled');var a=new MozActivity({name:'record',data:{type:'photos'}});a.onsuccess=()=>{};window.setTimeout(function(){fullscreenButtons.camera.classList.remove('disabled');$('thumbnails-camera-button').classList.remove('disabled');$('overlay-camera-button').classList.remove('disabled');},2000);}
function deleteSelectedItems(){var selected=thumbnails.querySelectorAll('.selected.thumbnailImage');if(selected.length===0){return;}
Dialogs.confirm({messageId:'delete-n-items?',messageArgs:{n:selected.length},cancelId:'cancel',confirmId:'delete',danger:true,bodyClass:'showing-dialog'},function(){for(var i=0;i<selected.length;i++){selected[i].classList.toggle('selected');deleteFile(getFileIndex(selected[i].dataset.filename));}
clearSelection();});}
function shareSelectedItems(){var blobs=selectedFileNames.map(function(name){return selectedFileNamesToBlobs[name];});share(blobs);}
function share(blobs,blobName){if(blobs.length===0){return;}
var names=[],types=[],fullpaths=[];blobs.forEach(function(blob){var name=blob.name;if(!name&&blobs.length===1){name=blobName;}
fullpaths.push(name);name=name.substring(name.lastIndexOf('/')+1);names.push(name);var type=blob.type;if(type){type=type.substring(0,type.indexOf('/'));}
types.push(type);});var type;if(types.length===1||types.every(function(t){return t===types[0];})){type=types[0]+'/*';}else{type='application/*';}
var a=new MozActivity({name:'share',data:{type:type,number:blobs.length,blobs:blobs,filenames:names,filepaths:fullpaths}});a.onerror=function(e){if(a.error.name==='NO_PROVIDER'){document.l10n.formatValue('share-noprovider').then(alert);}
else{console.warn('share activity error:',a.error.name);}};}
function resizeHandler(){isPortrait=ScreenLayout.getCurrentLayout('portrait');if(currentView===LAYOUT_MODE.list&&isPortrait&&typeof currentFrame!=='undefined'&&currentFrame.video){currentFrame.video.pause();}
if(currentView===LAYOUT_MODE.fullscreen||(!isPhone&&!isPortrait&&(currentView===LAYOUT_MODE.list||currentView===LAYOUT_MODE.select))){resizeFrames();setFramesPosition();}}
function doNotScanInBackgroundHack(photodb){const enoughMB=512;var memoryMB=0;window.addEventListener('visibilitychange',backgroundScanKiller);photodb.addEventListener('scanend',function(){window.removeEventListener('visibilitychange',backgroundScanKiller);});function backgroundScanKiller(){if(!document.hidden||memoryMB>=enoughMB){return;}
if(!navigator.getFeature){exit();}
else{navigator.getFeature('hardware.memory').then(function(mem){memoryMB=mem;if(memoryMB<enoughMB){exit();}});}
function exit(){if(document.hidden&&photodb.scanning){console.warn('[Gallery] exiting to avoid background scan.');setTimeout(function(){if(document.hidden){window.close();}
else{console.warn('[Gallery] now visible again, so not exiting');}},500);}}}};(function startup(){'use strict';var firstScanDone=false;showUI();registerEventHandlers();finishDBInitialization();setInitialView();registerActivityHandler();displayThumbnails();doNotScanInBackgroundHack(photodb);function showUI(){document.body.classList.remove('hidden');if(!isPhone){LazyLoader.load('js/frame_scripts.js');}
window.performance.mark('navigationLoaded');}
function registerEventHandlers(){$('thumbnails-select-button').onclick=setView.bind(null,LAYOUT_MODE.select);$('selected-header').addEventListener('action',setView.bind(null,LAYOUT_MODE.list));if(!isPhone){$('fullscreen-toolbar-header').addEventListener('action',function(){setView(LAYOUT_MODE.list);});}
fullscreenButtons.camera.onclick=launchCameraApp;$('thumbnails-camera-button').onclick=launchCameraApp;Overlay.addEventListener('camera',launchCameraApp);$('thumbnails-delete-button').onclick=deleteSelectedItems;$('thumbnails-share-button').onclick=shareSelectedItems;Overlay.addEventListener('cancel',function(){if(picking){Pick.cancel();}});window.onresize=resizeHandler;window.performance.mark('navigationInteractive');}
function finishDBInitialization(){photodb.onupgrading=function(evt){Overlay.show('upgrade');};photodb.onunavailable=function(){if(!picking){if(currentView===LAYOUT_MODE.edit){exitEdit();}
setView(LAYOUT_MODE.list);}else{Pick.restart();}
var why=photodb.state;if(why===MediaDB.NOCARD){Overlay.show('nocard');}
else if(why===MediaDB.UNMOUNTED){Overlay.show('pluggedin');}};photodb.onready=function(){if(Overlay.current==='nocard'||Overlay.current==='pluggedin'||Overlay.current==='upgrade'){Overlay.hide();}};photodb.onscanstart=function onscanstart(){fullscreenButtons.edit.classList.add('disabled');$('throbber').classList.remove('hidden');$('throbber').classList.add('throb');};photodb.onscanend=function onscanend(){fullscreenButtons.edit.classList.remove('disabled');if(Overlay.current==='scanning'){Overlay.show('emptygallery');}
else if(!isPhone&&!currentFrame.displayingImage&&!currentFrame.displayingVideo){showFile(0);}
$('throbber').classList.remove('throb');setTimeout(function(){$('throbber').classList.add('hidden');},100);if(!firstScanDone){firstScanDone=true;window.performance.mark('fullyLoaded');}};photodb.oncardremoved=function oncardremoved(){if(picking){Pick.cancel();return;}
setView(LAYOUT_MODE.list);};photodb.oncreated=function(event){event.detail.forEach(fileCreated);};photodb.ondeleted=function(event){event.detail.forEach(fileDeleted);};switch(photodb.state){case MediaDB.UPGRADING:photodb.onupgrading();break;case MediaDB.READY:photodb.onready();break;case MediaDB.NOCARD:case MediaDB.UNMOUNTED:photodb.onunavailable();break;}}
function setInitialView(){if(picking){setView(LAYOUT_MODE.pick);}
else{setView(LAYOUT_MODE.list);}}
function registerActivityHandler(){navigator.mozSetMessageHandler('activity',function activityHandler(a){var activityName=a.source.name;switch(activityName){case'browse':if(currentView===LAYOUT_MODE.fullscreen){setView(LAYOUT_MODE.list);}
break;case'pick':LazyLoader.load('js/pick.js',function(){Pick.start(a);});break;}});}
function displayThumbnails(){thumbnails=Thumbnails.container;thumbnailList=Thumbnails.list;var placeholder=$('thumbnails-placeholder');placeholder.parentElement.replaceChild(thumbnails,placeholder);thumbnails.addEventListener('click',thumbnailClickHandler);Thumbnails.firstpage.then(function(){window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');setTimeout(function(){LazyLoader.load(['shared/elements/gaia-header/dist/gaia-header.js'],function(){var headers=document.querySelectorAll('gaia-header');for(var i=0;i<headers.length;++i){headers[i].removeAttribute('no-font-fit');}});});});Thumbnails.complete.then(function(){if(files.length===0){Overlay.show('scanning');}
window.performance.mark('mediaEnumerated');photodb.addEventListener('ready',function(){photodb.scan();});if(photodb.state===MediaDB.READY){photodb.scan();}});}})();