;(function(){'use strict';if(window.navigator.mozHour12||window.navigator.hour12){return;}
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
return undefined;}})(this);;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;window.GaiaSubheader=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSubheaderBaseurl||'/shared/elements/gaia_subheader/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-subheader',{prototype:proto});})(window);;window.GaiaCheckbox=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaCheckboxBaseurl||'/shared/elements/gaia_checkbox/';proto.createdCallback=function(){this.lastClick=0;this.throttleTime=250;var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._wrapper=this._template.getElementById('checkbox');this._wrapper.addEventListener('click',this.handleClick.bind(this));this.configureClass();this.checked=this.hasAttribute('checked');this._wrapper.setAttribute('aria-checked',this.checked);this.setAttribute('role','presentation');shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);};proto.handleClick=function(e){e.preventDefault();e.stopImmediatePropagation();if(this.lastClick+this.throttleTime>Date.now()){return;}
this.lastClick=Date.now();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(!event.defaultPrevented){this.checked=!this.checked;this._wrapper.setAttribute('aria-checked',this.checked);}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.configureClass=function(){this._wrapper.className=this.className;};proto.attributeChangedCallback=function(name,from,to){if(name==='class'){this._wrapper.className=to;}};Object.defineProperty(proto,'checked',{get:function(){return this._checked||false;},set:function(value){this._wrapper.classList.toggle('checked',value);this._checked=value;}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});var template=document.createElement('template');template.innerHTML=`<span id="checkbox" role="checkbox">
      <span role="presentation"><content select="label"></content></span>
    </span>`;return document.registerElement('gaia-checkbox',{prototype:proto});})(window);;window.GaiaSwitch=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSwitchBaseurl||'/shared/elements/gaia_switch/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._input=this._template.querySelector('input[type="checkbox"]');var checked=this.getAttribute('checked');if(checked!==null){this._input.checked=true;}
var wrapper=this._template.getElementById('switch');wrapper.addEventListener('click',this.handleClick.bind(this));shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);var dirObserver=new MutationObserver(this.updateInternalDir.bind(this));dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});this.updateInternalDir();};proto.updateInternalDir=function(){var internal=this.shadowRoot.firstElementChild;if(document.documentElement.dir==='rtl'){internal.setAttribute('dir','rtl');}else{internal.removeAttribute('dir');}};proto.handleClick=function(e){if(e&&e.target.tagName==='A'){return;}
e&&e.preventDefault();e&&e.stopImmediatePropagation();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(!event.defaultPrevented){this.checked=!this.checked;}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.click=function(){this.handleClick();};Object.defineProperty(proto,'checked',{get:function(){return this._input.checked;},set:function(value){this._input.checked=value;}});Object.defineProperty(proto,'disabled',{get:function(){return this.hasAttribute('disabled');},set:function(value){if(value){this.setAttribute('disabled',true);}else{this.removeAttribute('disabled');}}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});Object.defineProperty(proto,'type',{get:function(){return'gaia-switch';}});var template=document.createElement('template');template.innerHTML=`<span id="switch">
      <input type="checkbox">
      <span><content select="label"></content></span>
      <div class="details"><content select="details"></content></div>
      <content select="a"></content>
    </span>`;return document.registerElement('gaia-switch',{prototype:proto});})(window);;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;(function(global){var
version='0.8.11',curlName='curl',defineName='define',bootScriptAttr='data-curl-run',bootScript,userCfg,prevCurl,prevDefine,doc=global.document,head=doc&&(doc['head']||doc.getElementsByTagName('head')[0]),insertBeforeEl=head&&head.getElementsByTagName('base')[0]||null,msgUsingExports={},msgFactoryExecuted={},activeScripts={},readyStates='addEventListener'in global?{}:{'loaded':1,'complete':1},cleanPrototype={},toString=cleanPrototype.toString,undef,cache={},urlCache={},preload=false,argsNet,dontAddExtRx=/\?|\.js\b/,absUrlRx=/^\/|^[^:]+:\/\/|^[A-Za-z]:[\\/]/,findDotsRx=/(\.)(\.?)(?:$|\/([^\.\/]+.*)?)/g,removeCommentsRx=/\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g,findRValueRequiresRx=/require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g,splitCommaSepRx=/\s*,\s*/,cjsGetters,core;function noop(){}
function isType(obj,type){return toString.call(obj).indexOf('[object '+type)==0;}
function normalizePkgDescriptor(descriptor,isPkg){var main;descriptor.path=removeEndSlash(descriptor['path']||descriptor['location']||'');if(isPkg){main=descriptor['main']||'./main';if(!isRelUrl(main))main='./'+main;descriptor.main=reduceLeadingDots(main,descriptor.name+'/');}
descriptor.config=descriptor['config'];return descriptor;}
function isRelUrl(it){return it.charAt(0)=='.';}
function isAbsUrl(it){return absUrlRx.test(it);}
function joinPath(path,file){return removeEndSlash(path)+'/'+file;}
function removeEndSlash(path){return path&&path.charAt(path.length-1)=='/'?path.substr(0,path.length-1):path;}
function reduceLeadingDots(childId,baseId){var removeLevels,normId,levels,isRelative,diff;removeLevels=1;normId=childId;if(isRelUrl(normId)){isRelative=true;normId=normId.replace(findDotsRx,function(m,dot,doubleDot,remainder){if(doubleDot)removeLevels++;return remainder||'';});}
if(isRelative){levels=baseId.split('/');diff=levels.length-removeLevels;if(diff<0){return childId;}
levels.splice(diff,removeLevels);return levels.concat(normId||[]).join('/');}
else{return normId;}}
function pluginParts(id){var delPos=id.indexOf('!');return{resourceId:id.substr(delPos+1),pluginId:delPos>=0&&id.substr(0,delPos)};}
function Begetter(){}
function beget(parent,mixin){Begetter.prototype=parent||cleanPrototype;var child=new Begetter();Begetter.prototype=cleanPrototype;for(var p in mixin)child[p]=mixin[p];return child;}
function Promise(){var self,thens,complete;self=this;thens=[];function then(resolved,rejected,progressed){thens.push([resolved,rejected,progressed]);}
function notify(which,arg){var aThen,cb,i=0;while((aThen=thens[i++])){cb=aThen[which];if(cb)cb(arg);}}
complete=function promiseComplete(success,arg){then=success?function(resolved,rejected){resolved&&resolved(arg);}:function(resolved,rejected){rejected&&rejected(arg);};complete=noop;notify(success?0:1,arg);notify=noop;thens=undef;};this.then=function(resolved,rejected,progressed){then(resolved,rejected,progressed);return self;};this.resolve=function(val){self.resolved=val;complete(true,val);};this.reject=function(ex){self.rejected=ex;complete(false,ex);};this.progress=function(msg){notify(2,msg);}}
function isPromise(o){return o instanceof Promise||o instanceof CurlApi;}
function when(promiseOrValue,callback,errback,progback){if(isPromise(promiseOrValue)){return promiseOrValue.then(callback,errback,progback);}
else{return callback(promiseOrValue);}}
function countdown(howMany,lambda,completed){var result;return function(){if(--howMany>=0&&lambda)result=lambda.apply(undef,arguments);if(howMany==0&&completed)completed(result);return result;}}
core={toAbsId:function(id,parentId,cfg){var absId,pluginId,parts;absId=reduceLeadingDots(id,parentId);if(isRelUrl(absId))return absId;parts=pluginParts(absId);pluginId=parts.pluginId;absId=pluginId||parts.resourceId;if(absId in cfg.pathMap){absId=cfg.pathMap[absId].main||absId;}
if(pluginId){if(pluginId.indexOf('/')<0&&!(pluginId in cfg.pathMap)){absId=joinPath(cfg.pluginPath,pluginId);}
absId=absId+'!'+parts.resourceId;}
return absId;},createContext:function(cfg,baseId,depNames,isPreload){var def;def=new Promise();def.id=baseId||'';def.isPreload=isPreload;def.depNames=depNames;def.config=cfg;function toAbsId(childId,checkPlugins){var absId,parts,plugin;absId=core.toAbsId(childId,def.id,cfg);if(!checkPlugins)return absId;parts=pluginParts(absId);if(!parts.pluginId)return absId;plugin=cache[parts.pluginId];if('normalize'in plugin){parts.resourceId=plugin['normalize'](parts.resourceId,toAbsId,def.config)||'';}
else{parts.resourceId=toAbsId(parts.resourceId);}
return parts.pluginId+'!'+parts.resourceId;}
function toUrl(n){return core.resolvePathInfo(toAbsId(n,true),cfg).url;}
function localRequire(ids,callback,errback){var cb,rvid,childDef,earlyExport;cb=callback&&function(){callback.apply(undef,arguments[0]);};if(isType(ids,'String')){if(cb){throw new Error('require(id, callback) not allowed');}
rvid=toAbsId(ids,true);childDef=cache[rvid];if(!(rvid in cache)){throw new Error('Module not resolved: '+rvid);}
earlyExport=isPromise(childDef)&&childDef.exports;return earlyExport||childDef;}
else{when(core.getDeps(core.createContext(cfg,def.id,ids,isPreload)),cb,errback);}}
def.require=localRequire;localRequire['toUrl']=toUrl;def.toAbsId=toAbsId;return def;},createResourceDef:function(cfg,id,isPreload){var def,origResolve,execute;def=core.createContext(cfg,id,undef,isPreload);origResolve=def.resolve;execute=countdown(1,function(deps){def.deps=deps;try{return core.executeDefFunc(def);}
catch(ex){def.reject(ex);}});def.resolve=function resolve(deps){when(isPreload||preload,function(){origResolve((cache[def.id]=urlCache[def.url]=execute(deps)));});};def.exportsReady=function executeFactory(deps){when(isPreload||preload,function(){if(def.exports){execute(deps);def.progress(msgFactoryExecuted);}});};return def;},createPluginDef:function(cfg,id,resId,isPreload){var def;def=core.createContext(cfg,resId,undef,isPreload);return def;},getCjsRequire:function(def){return def.require;},getCjsExports:function(def){return def.exports||(def.exports={});},getCjsModule:function(def){var module=def.module;if(!module){module=def.module={'id':def.id,'uri':core.getDefUrl(def),'exports':core.getCjsExports(def),'config':function(){return def.config;}};module.exports=module['exports'];}
return module;},getDefUrl:function(def){return def.url||(def.url=core.checkToAddJsExt(def.require['toUrl'](def.id),def.config));},setApi:function(cfg){var apiName,defName,apiObj,defObj,failMsg,okToOverwrite;apiName=curlName;defName=defineName;apiObj=defObj=global;failMsg=' already exists';if(cfg){okToOverwrite=cfg['overwriteApi']||cfg.overwriteApi;apiName=cfg['apiName']||cfg.apiName||apiName;apiObj=cfg['apiContext']||cfg.apiContext||apiObj;defName=cfg['defineName']||cfg.defineName||defName;defObj=cfg['defineContext']||cfg.defineContext||defObj;if(prevCurl&&isType(prevCurl,'Function')){global[curlName]=prevCurl;}
prevCurl=null;if(prevDefine&&isType(prevDefine,'Function')){global[defineName]=prevDefine;}
prevDefine=null;if(!okToOverwrite){if(apiObj[apiName]&&apiObj[apiName]!=_curl){throw new Error(apiName+failMsg);}
if(defObj[defName]&&defObj[defName]!=define){throw new Error(defName+failMsg);}}}
apiObj[apiName]=_curl;defObj[defName]=define;},config:function(cfg){var prevCfg,newCfg,pluginCfgs,p;if('baseUrl'in cfg)cfg.baseUrl=cfg['baseUrl'];if('main'in cfg)cfg.main=cfg['main'];if('preloads'in cfg)cfg.preloads=cfg['preloads'];if('pluginPath'in cfg)cfg.pluginPath=cfg['pluginPath'];if('dontAddFileExt'in cfg||cfg.dontAddFileExt){cfg.dontAddFileExt=new RegExp(cfg['dontAddFileExt']||cfg.dontAddFileExt);}
prevCfg=userCfg;newCfg=beget(prevCfg,cfg);newCfg.pathMap=beget(prevCfg.pathMap);pluginCfgs=cfg['plugins']||{};newCfg.plugins=beget(prevCfg.plugins);newCfg.paths=beget(prevCfg.paths,cfg.paths);newCfg.packages=beget(prevCfg.packages,cfg.packages);newCfg.pathList=[];function fixAndPushPaths(coll,isPkg){var id,pluginId,data,parts,currCfg,info;for(var name in coll){data=coll[name];if(isType(data,'String'))data={path:coll[name]};data.name=data.name||name;currCfg=newCfg;parts=pluginParts(removeEndSlash(data.name));id=parts.resourceId;pluginId=parts.pluginId;if(pluginId){currCfg=pluginCfgs[pluginId];if(!currCfg){currCfg=pluginCfgs[pluginId]=beget(newCfg);currCfg.pathMap=beget(newCfg.pathMap);currCfg.pathList=[];}
delete coll[name];}
info=normalizePkgDescriptor(data,isPkg);if(info.config)info.config=beget(newCfg,info.config);info.specificity=id.split('/').length;if(id){currCfg.pathMap[id]=info;currCfg.pathList.push(id);}
else{currCfg.baseUrl=core.resolveUrl(data.path,newCfg);}}}
function convertPathMatcher(cfg){var pathMap=cfg.pathMap;cfg.pathRx=new RegExp('^('+
cfg.pathList.sort(function(a,b){return pathMap[b].specificity-pathMap[a].specificity;}).join('|').replace(/\/|\./g,'\\$&')+')(?=\\/|$)');delete cfg.pathList;}
fixAndPushPaths(cfg['packages'],true);fixAndPushPaths(cfg['paths'],false);for(p in pluginCfgs){var absId=core.toAbsId(p+'!','',newCfg);newCfg.plugins[absId.substr(0,absId.length-1)]=pluginCfgs[p];}
pluginCfgs=newCfg.plugins;for(p in pluginCfgs){pluginCfgs[p]=beget(newCfg,pluginCfgs[p]);var pathList=pluginCfgs[p].pathList;if(pathList){pluginCfgs[p].pathList=pathList.concat(newCfg.pathList);convertPathMatcher(pluginCfgs[p]);}}
for(p in prevCfg.pathMap){if(!newCfg.pathMap.hasOwnProperty(p))newCfg.pathList.push(p);}
convertPathMatcher(newCfg);return newCfg;},resolvePathInfo:function(absId,cfg){var pathMap,pathInfo,path,pkgCfg;pathMap=cfg.pathMap;if(!isAbsUrl(absId)){path=absId.replace(cfg.pathRx,function(match){pathInfo=pathMap[match]||{};pkgCfg=pathInfo.config;return pathInfo.path||'';});}
else{path=absId;}
return{config:pkgCfg||userCfg,url:core.resolveUrl(path,cfg)};},resolveUrl:function(path,cfg){var baseUrl=cfg.baseUrl;return baseUrl&&!isAbsUrl(path)?joinPath(baseUrl,path):path;},checkToAddJsExt:function(url,cfg){return url+((cfg||userCfg).dontAddFileExt.test(url)?'':'.js');},loadScript:function(def,success,failure){var el=doc.createElement('script');function process(ev){ev=ev||global.event;if(ev.type=='load'||readyStates[el.readyState]){delete activeScripts[def.id];el.onload=el.onreadystatechange=el.onerror='';success();}}
function fail(e){failure(new Error('Syntax or http error: '+def.url));}
el.onload=el.onreadystatechange=process;el.onerror=fail;el.type=def.mimetype||'text/javascript';el.charset='utf-8';el.async=!def.order;el.src=def.url;activeScripts[def.id]=el;head.insertBefore(el,insertBeforeEl);return el;},extractCjsDeps:function(defFunc){var source,ids=[],currQuote;source=typeof defFunc=='string'?defFunc:defFunc.toSource?defFunc.toSource():defFunc.toString();source.replace(removeCommentsRx,'').replace(findRValueRequiresRx,function(m,rq,id,qq){if(qq){currQuote=currQuote==qq?undef:currQuote;}
else if(!currQuote){ids.push(id);}
return'';});return ids;},fixArgs:function(args){var id,deps,defFunc,defFuncArity,len,cjs;len=args.length;defFunc=args[len-1];defFuncArity=isType(defFunc,'Function')?defFunc.length:-1;if(len==2){if(isType(args[0],'Array')){deps=args[0];}
else{id=args[0];}}
else if(len==3){id=args[0];deps=args[1];}
if(!deps&&defFuncArity>0){cjs=true;deps=['require','exports','module'].slice(0,defFuncArity).concat(core.extractCjsDeps(defFunc));}
return{id:id,deps:deps||[],res:defFuncArity>=0?defFunc:function(){return defFunc;},cjs:cjs};},executeDefFunc:function(def){var resource,moduleThis;moduleThis=def.cjs?def.exports:undef;resource=def.res.apply(moduleThis,def.deps);if(resource===undef&&def.exports){resource=def.module?(def.exports=def.module['exports']):def.exports;}
return resource;},defineResource:function(def,args){def.res=args.res;def.cjs=args.cjs;def.depNames=args.deps;core.getDeps(def);},getDeps:function(parentDef){var i,names,deps,len,dep,completed,name,exportCollector,resolveCollector;deps=[];names=parentDef.depNames;len=names.length;if(names.length==0)allResolved();function collect(dep,index,alsoExport){deps[index]=dep;if(alsoExport)exportCollector(dep,index);}
exportCollector=countdown(len,collect,allExportsReady);resolveCollector=countdown(len,collect,allResolved);for(i=0;i<len;i++){name=names[i];if(name in cjsGetters){resolveCollector(cjsGetters[name](parentDef),i,true);if(parentDef.exports){parentDef.progress(msgUsingExports);}}
else if(!name){resolveCollector(undef,i,true);}
else{getDep(name,i);}}
return parentDef;function getDep(name,index){var resolveOnce,exportOnce,childDef,earlyExport;resolveOnce=countdown(1,function(dep){exportOnce(dep);resolveCollector(dep,index);});exportOnce=countdown(1,function(dep){exportCollector(dep,index);});childDef=core.fetchDep(name,parentDef);earlyExport=isPromise(childDef)&&childDef.exports;if(earlyExport){exportOnce(earlyExport);}
when(childDef,resolveOnce,parentDef.reject,parentDef.exports&&function(msg){if(childDef.exports){if(msg==msgUsingExports){exportOnce(childDef.exports);}
else if(msg==msgFactoryExecuted){resolveOnce(childDef.exports);}}});}
function allResolved(){parentDef.resolve(deps);}
function allExportsReady(){parentDef.exportsReady&&parentDef.exportsReady(deps);}},fetchResDef:function(def){core.getDefUrl(def);core.loadScript(def,function(){var args=argsNet;argsNet=undef;if(def.useNet!==false){if(!args||args.ex){def.reject(new Error(((args&&args.ex)||'define() missing or duplicated: '+def.url)));}
else{core.defineResource(def,args);}}},def.reject);return def;},fetchDep:function(depName,parentDef){var toAbsId,isPreload,parentCfg,parts,absId,mainId,loaderId,pluginId,resId,pathInfo,def,tempDef,resCfg;toAbsId=parentDef.toAbsId;isPreload=parentDef.isPreload;parentCfg=parentDef.config||userCfg;absId=toAbsId(depName);if(absId in cache){mainId=absId;}
else{parts=pluginParts(absId);resId=parts.resourceId;mainId=parts.pluginId||resId;pathInfo=core.resolvePathInfo(mainId,parentCfg);}
if(!(absId in cache)){resCfg=core.resolvePathInfo(resId,parentCfg).config;if(parts.pluginId){loaderId=mainId;}
else{loaderId=resCfg['moduleLoader']||resCfg.moduleLoader||resCfg['loader']||resCfg.loader;if(loaderId){resId=mainId;mainId=loaderId;pathInfo=core.resolvePathInfo(loaderId,parentCfg);}}}
if(mainId in cache){def=cache[mainId];}
else if(pathInfo.url in urlCache){def=cache[mainId]=urlCache[pathInfo.url];}
else{def=core.createResourceDef(resCfg,mainId,isPreload);def.url=core.checkToAddJsExt(pathInfo.url,pathInfo.config);cache[mainId]=urlCache[pathInfo.url]=def;core.fetchResDef(def);}
if(mainId==loaderId){if(parts.pluginId&&parentCfg.plugins[parts.pluginId]){resCfg=parentCfg.plugins[parts.pluginId];}
tempDef=new Promise();when(def,function(plugin){var normalizedDef,fullId,dynamic;dynamic=plugin['dynamic'];if('normalize'in plugin){resId=plugin['normalize'](resId,toAbsId,def.config)||'';}
else{resId=toAbsId(resId);}
fullId=loaderId+'!'+resId;normalizedDef=cache[fullId];if(!(fullId in cache)){normalizedDef=core.createPluginDef(resCfg,fullId,resId,isPreload);if(!dynamic){cache[fullId]=normalizedDef;}
var loaded=function(res){if(!dynamic)cache[fullId]=res;normalizedDef.resolve(res);};loaded['resolve']=loaded;loaded['reject']=loaded['error']=normalizedDef.reject;plugin.load(resId,normalizedDef.require,loaded,resCfg);}
if(tempDef!=normalizedDef){when(normalizedDef,tempDef.resolve,tempDef.reject,tempDef.progress);}},tempDef.reject);}
return tempDef||def;},getCurrentDefName:function(){var def;if(!isType(global.opera,'Opera')){for(var d in activeScripts){if(activeScripts[d].readyState=='interactive'){def=d;break;}}}
return def;},findScript:function(predicate){var i=0,scripts,script;scripts=doc&&(doc.scripts||doc.getElementsByTagName('script'));while(scripts&&(script=scripts[i++])){if(predicate(script))return script;}},extractDataAttrConfig:function(){var script,attr='';script=core.findScript(function(script){var run;run=script.getAttribute(bootScriptAttr);if(run)attr=run;return run;});if(script){script.setAttribute(bootScriptAttr,'');}
return attr;},bootScript:function(){var urls=bootScript.split(splitCommaSepRx);if(urls.length){load();}
function load(){core.loadScript({url:urls.shift()},check,check);}
function check(){if(bootScript){if(urls.length){core.nextTurn(fail);load();}
else fail('run.js script did not run.');}}
function fail(msg){throw new Error(msg||'Primary run.js failed. Trying fallback.');}},nextTurn:function(task){setTimeout(task,0);}};cjsGetters={'require':core.getCjsRequire,'exports':core.getCjsExports,'module':core.getCjsModule};function _curl(){var args,promise,cfg;bootScript='';args=[].slice.call(arguments);if(isType(args[0],'Object')){cfg=args.shift();promise=_config(cfg);}
return new CurlApi(args[0],args[1],args[2],promise);}
function _config(cfg,callback,errback){var pPromise,main,fallback;bootScript='';if(cfg){core.setApi(cfg);userCfg=core.config(cfg);if('preloads'in cfg){pPromise=new CurlApi(cfg['preloads'],undef,errback,preload,true);core.nextTurn(function(){preload=pPromise;});}
main=cfg['main'];if(main){return new CurlApi(main,callback,errback);}}}
function CurlApi(ids,callback,errback,waitFor,isPreload){var then,ctx;ctx=core.createContext(userCfg,undef,[].concat(ids),isPreload);this['then']=this.then=then=function(resolved,rejected){when(ctx,function(deps){if(resolved)resolved.apply(undef,deps);},function(ex){if(rejected)rejected(ex);else throw ex;});return this;};this['next']=function(ids,cb,eb){return new CurlApi(ids,cb,eb,ctx);};this['config']=_config;if(callback||errback)then(callback,errback);core.nextTurn(function(){when(isPreload||preload,function(){when(waitFor,function(){core.getDeps(ctx);},errback);});});}
_curl['version']=version;_curl['config']=_config;function _define(args){var id,def,pathInfo;id=args.id;if(id==undef){if(argsNet!==undef){argsNet={ex:'Multiple anonymous defines encountered'};}
else if(!(id=core.getCurrentDefName())){argsNet=args;}}
if(id!=undef){def=cache[id];if(!(id in cache)){pathInfo=core.resolvePathInfo(id,userCfg);def=core.createResourceDef(pathInfo.config,id);cache[id]=def;}
if(!isPromise(def))throw new Error('duplicate define: '+id);def.useNet=false;core.defineResource(def,args);}}
function define(){var args=core.fixArgs(arguments);_define(args);}
define['amd']={'plugins':true,'jQuery':true,'curl':version};userCfg={baseUrl:'',pluginPath:'curl/plugin',dontAddFileExt:dontAddExtRx,paths:{},packages:{},plugins:{},pathMap:{},pathRx:/$^/};prevCurl=global[curlName];prevDefine=global[defineName];if(prevCurl&&isType(prevCurl,'Object')){global[curlName]=undef;_config(prevCurl);}
else{core.setApi();}
bootScript=core.extractDataAttrConfig();if(bootScript)core.nextTurn(core.bootScript);cache[curlName]=_curl;cache['curl/_privileged']={'core':core,'cache':cache,'config':function(){return userCfg;},'_define':_define,'_curl':_curl,'Promise':Promise};}(this.window||(typeof global!='undefined'&&global)||this));define("ext/curl",function(){});define('models/account',['require','exports','module'],function(require,exports,module){'use strict';function Account(options){var key;if(typeof(options)==='undefined'){options={};}
for(key in options){if(options.hasOwnProperty(key)){this[key]=options[key];}}}
module.exports=Account;Account.prototype={providerType:null,id:null,preset:null,domain:'',entrypoint:'',calendarHome:'',user:'',password:'',get fullUrl(){return this.domain+this.entrypoint;},set fullUrl(value){var protocolIdx=value.indexOf('://');this.domain=value;this.entrypoint='/';if(protocolIdx!==-1){protocolIdx+=3;var domainChunk=value.substr(protocolIdx);var pathIdx=domainChunk.indexOf('/');if(pathIdx!==-1){pathIdx=pathIdx+protocolIdx;this.entrypoint=value.substr(pathIdx);this.domain=value.substr(0,pathIdx);}}},toJSON:function(){var output={};var fields=['entrypoint','calendarHome','domain','password','user','providerType','preset','oauth','error'];fields.forEach(function(key){output[key]=this[key];},this);if(this._id||this._id===0){output._id=this._id;}
return output;}};});define('common/presets',{"google":{"providerType":"Caldav","group":"remote","authenticationType":"oauth2","apiCredentials":{"tokenUrl":"https://accounts.google.com/o/oauth2/token","authorizationUrl":"https://accounts.google.com/o/oauth2/auth","user_info":{"url":"https://www.googleapis.com/oauth2/v3/userinfo","field":"email"},"client_secret":"jQTKlOhF-RclGaGJot3HIcVf","client_id":"605300196874-1ki833poa7uqabmh3hq6u1onlqlsi54h.apps.googleusercontent.com","scope":"https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email","redirect_uri":"https://oauth.gaiamobile.org/authenticated"},"options":{"domain":"https://apidata.googleusercontent.com","entrypoint":"/caldav/v2/","providerType":"Caldav"}},"yahoo":{"providerType":"Caldav","group":"remote","options":{"domain":"https://caldav.calendar.yahoo.com","entrypoint":"/","providerType":"Caldav","user":"@yahoo.com","usernameType":"email"}},"caldav":{"providerType":"Caldav","group":"remote","options":{"domain":"","entrypoint":"","providerType":"Caldav"}},"local":{"singleUse":true,"providerType":"Local","group":"local","options":{"providerType":"Local"}}});define('common/promise',['require','exports','module'],function(require,exports){'use strict';function denodeify(fn){return function(){var args=Array.slice(arguments);if(args.length===fn.length){return fn.apply(this,args);}
var deferred=defer();args.push(function(err,result){if(err){return deferred.reject(err);}
if(arguments.length>2){result=Array.prototype.slice.call(arguments,1);}
deferred.resolve(result);});var returnValue=fn.apply(this,args);return typeof returnValue==='object'?returnValue:deferred.promise;};}
exports.denodeify=denodeify;function denodeifyAll(object,methods){methods.forEach((method)=>{object[method]=exports.denodeify(object[method]);});}
exports.denodeifyAll=denodeifyAll;function defer(){var deferred={};var promise=new Promise((resolve,reject)=>{deferred.resolve=resolve;deferred.reject=reject;});deferred.promise=promise;return deferred;}});define('common/next_tick',['require','exports','module'],function(require,exports,module){'use strict';var resolved=Promise.resolve();module.exports=function(callback){resolved.then(callback);};});define('provider/abstract',['require','exports','module','common/promise','common/next_tick'],function(require,exports,module){'use strict';var denodeifyAll=require('common/promise').denodeifyAll;var nextTick=require('common/next_tick');function Abstract(options){var key;for(key in options){if(options.hasOwnProperty(key)){this[key]=options[key];}}
denodeifyAll(this,['eventCapabilities','getAccount','findCalendars','syncEvents','ensureRecurrencesExpanded','createEvent','updateEvent','deleteEvent']);}
module.exports=Abstract;Abstract.prototype={defaultColor:'#F97C17',useCredentials:false,useUrl:false,canSync:false,canExpandRecurringEvents:false,getAccount:function(account,callback){},findCalendars:function(){},syncEvents:function(account,calendar,callback){},ensureRecurrencesExpanded:function(date,callback){},updateEvent:function(event,busytime,callback){},deleteEvent:function(event,busytime,callback){},createEvent:function(event,callback){},calendarCapabilities:function(calendar){return{canCreateEvent:true,canUpdateEvent:true,canDeleteEvent:true};},eventCapabilities:function(event,callback){var caps=this.calendarCapabilities();nextTick(function(){callback(null,{canCreate:caps.canCreateEvent,canUpdate:caps.canUpdateEvent,canDelete:caps.canDeleteEvent});});}};});define('core',['require','exports','module'],function(require,exports,module){'use strict';exports.db=null;exports.errorController=null;exports.notificationsController=null;exports.periodicSyncController=null;exports.providerFactory=null;exports.serviceController=null;exports.storeFactory=null;exports.syncController=null;exports.timeController=null;exports.viewFactory=null;});define('common/constants',['require','exports','module'],function(require,exports){'use strict';exports.localCalendarId='local-first';});define('common/timespan',['require','exports','module'],function(require,exports,module){'use strict';function Timespan(startDate,endDate){this.start=startDate.valueOf();this.end=endDate.valueOf();}
module.exports=Timespan;Timespan.prototype={isEqual:function(inputSpan){return(this.start===inputSpan.start&&this.end===inputSpan.end);},trimOverlap:function(span){if(this.contains(span)||span.contains(this)){return null;}
var start=span.start;var end=span.end;var ourEnd=this.end;var ourStart=this.start;var overlapsBefore=start>=ourStart&&start<ourEnd;var overlapsAfter=ourStart>=start&&ourStart<end;var newStart=span.start;var newEnd=span.end;if(overlapsBefore){newStart=ourEnd+1;}
if(overlapsAfter){newEnd=ourStart-1;}
return new Timespan(newStart,newEnd);},overlaps:function(start,end){var ourStart=this.start;var ourEnd=this.end;if(start instanceof Timespan){end=start.end;start=start.start;}else{start=(start instanceof Date)?start.valueOf():start;end=(end instanceof Date)?end.valueOf():end;}
return(start>=ourStart&&start<ourEnd||ourStart>=start&&ourStart<end);},contains:function(date){var start=this.start;var end=this.end;if(date instanceof Date){return start<=date&&end>=date;}else if(date instanceof Timespan){return start<=date.start&&end>=date.end;}else{return this.containsNumeric(date);}},containsNumeric:function(timestamp){var start=this.start;var end=this.end;return start<=timestamp&&end>=timestamp;}};});!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define('ext/co',[],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.co=e()}}(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var slice=Array.prototype.slice;module.exports=co['default']=co.co=co;co.wrap=function(fn){createPromise.__generatorFunction__=fn;return createPromise;function createPromise(){return co.call(this,fn.apply(this,arguments));}};function co(gen){var ctx=this;return new Promise(function(resolve,reject){if(typeof gen==='function')gen=gen.call(ctx);if(!gen||typeof gen.next!=='function')return resolve(gen);onFulfilled();function onFulfilled(res){var ret;try{ret=gen.next(res);}catch(e){return reject(e);}
next(ret);}
function onRejected(err){var ret;try{ret=gen.throw(err);}catch(e){return reject(e);}
next(ret);}
function next(ret){if(ret.done)return resolve(ret.value);var value=toPromise.call(ctx,ret.value);if(value&&isPromise(value))return value.then(onFulfilled,onRejected);return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
+'but the following object was passed: "'+String(ret.value)+'"'));}});}
function toPromise(obj){if(!obj)return obj;if(isPromise(obj))return obj;if(isGeneratorFunction(obj)||isGenerator(obj))return co.call(this,obj);if('function'==typeof obj)return thunkToPromise.call(this,obj);if(Array.isArray(obj))return arrayToPromise.call(this,obj);if(isObject(obj))return objectToPromise.call(this,obj);return obj;}
function thunkToPromise(fn){var ctx=this;return new Promise(function(resolve,reject){fn.call(ctx,function(err,res){if(err)return reject(err);if(arguments.length>2)res=slice.call(arguments,1);resolve(res);});});}
function arrayToPromise(obj){return Promise.all(obj.map(toPromise,this));}
function objectToPromise(obj){var results=new obj.constructor();var keys=Object.keys(obj);var promises=[];for(var i=0;i<keys.length;i++){var key=keys[i];var promise=toPromise.call(this,obj[key]);if(promise&&isPromise(promise))defer(promise,key);else results[key]=obj[key];}
return Promise.all(promises).then(function(){return results;});function defer(promise,key){results[key]=undefined;promises.push(promise.then(function(res){results[key]=res;}));}}
function isPromise(obj){return'function'==typeof obj.then;}
function isGenerator(obj){return'function'==typeof obj.next&&'function'==typeof obj.throw;}
function isGeneratorFunction(obj){var constructor=obj.constructor;if(!constructor)return false;if('GeneratorFunction'===constructor.name||'GeneratorFunction'===constructor.displayName)return true;return isGenerator(constructor.prototype);}
function isObject(val){return Object==val.constructor;}},{}]},{},[1])(1)});define('common/calc',['require','exports','module','./timespan','ext/co'],function(require,exports){'use strict';var Timespan=require('./timespan');var co=require('ext/co');const SECOND=1000;const MINUTE=(SECOND*60);const HOUR=MINUTE*60;exports._hourDate=new Date();exports.startDay=0;exports.FLOATING='floating';exports.ALLDAY='allday';exports.SECOND=SECOND;exports.MINUTE=MINUTE;exports.HOUR=HOUR;exports.PAST='past';exports.NEXT_MONTH='next-month';exports.OTHER_MONTH='other-month';exports.PRESENT='present';exports.FUTURE='future';Object.defineProperty(exports,'today',{get:function(){return new Date();}});exports.daysInWeek=function(){return 7;};exports.dayOfWeekFromMonday=function(numeric){var day=numeric-1;if(day<0){return 6;}
return day;};exports.dayOfWeekFromStartDay=function(numeric){var day=numeric-exports.startDay;if(day<0){return 7+day;}
return day;};exports.isToday=function(date){return exports.isSameDate(date,exports.today);};exports.isOnlyDate=function(date){if(date.getHours()===0&&date.getMinutes()===0&&date.getSeconds()===0){return true;}
return false;};exports.hourDiff=function(start,end){start=(start instanceof Date)?start.valueOf():start;end=(end instanceof Date)?end.valueOf():end;start=start/HOUR;end=end/HOUR;return end-start;};exports.spanOfDay=function(date,includeTime){if(typeof(includeTime)==='undefined'){date=exports.createDay(date);}
var end=exports.createDay(date);end.setDate(end.getDate()+1);return new Timespan(date,end);};exports.spanOfMonth=function(month){month=exports.monthStart(month);var startDay=exports.getWeekStartDate(month);var endDay=exports.monthEnd(month);endDay=exports.getWeekEndDate(endDay);return new Timespan(startDay,endDay);};exports.monthEnd=function(date,diff=0){var endDay=new Date(date.getFullYear(),date.getMonth()+diff+1,1);endDay.setMilliseconds(-1);return endDay;};exports.getUTC=function(date){return new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds(),date.getUTCMilliseconds());};exports.dateFromTransport=function(transport){var utc=transport.utc;var offset=transport.offset;var zone=transport.tzid;var date=new Date(parseInt(utc)-parseInt(offset));if(zone&&zone===exports.FLOATING){return exports.getUTC(date);}
return date;};exports.dateToTransport=function(date,tzid,isDate){var result=Object.create(null);if(isDate){result.isDate=isDate;}
if(tzid){result.tzid=tzid;}
var utc=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds(),date.getMilliseconds());if(isDate||tzid&&tzid===exports.FLOATING){result.utc=utc;result.offset=0;result.tzid=exports.FLOATING;}else{var localUtc=date.valueOf();var offset=utc-localUtc;result.utc=utc;result.offset=offset;}
return result;};exports.isSameDate=function(first,second){return first.getMonth()==second.getMonth()&&first.getDate()==second.getDate()&&first.getFullYear()==second.getFullYear();};exports.getDayId=function(date){return['d',date.getFullYear(),date.getMonth(),date.getDate()].join('-');};exports.dateFromId=function(id){var parts=id.split('-'),date,type;if(parts.length>1){type=parts.shift();switch(type){case'd':date=new Date(parts[0],parts[1],parts[2]);break;case'm':date=new Date(parts[0],parts[1]);break;}}
return date;};exports.getMonthId=function(date){return['m',date.getFullYear(),date.getMonth()].join('-');};exports.createDay=function(date,day,month,year){return new Date(year!=null?year:date.getFullYear(),month!=null?month:date.getMonth(),day!=null?day:date.getDate());};exports.endOfDay=function(date){var day=exports.createDay(date,date.getDate()+1);day.setMilliseconds(-1);return day;};exports.monthStart=function(date,diff=0){return new Date(date.getFullYear(),date.getMonth()+diff,1);};exports.dayOfWeek=function(date){var number=date;if(typeof(date)!=='number'){number=date.getDay();}
return exports.dayOfWeekFromStartDay(number);};exports.getWeekStartDate=function(date){var currentDay=exports.dayOfWeek(date);var startDay=(date.getDate()-currentDay);return exports.createDay(date,startDay);};exports.getWeekEndDate=function(date){var start=exports.getWeekStartDate(date);start.setDate(start.getDate()+7);start.setMilliseconds(-1);return start;};exports.daysBetween=function(start,end,includeTime){if(start instanceof Timespan){if(end){includeTime=end;}
end=new Date(start.end);start=new Date(start.start);}
if(start>end){var tmp=end;end=start;start=tmp;tmp=null;}
var list=[];var last=start.getDate();if(exports.isSameDate(start,end)){if(includeTime){list.push(end);}else{list.push(exports.createDay(start));}
return list;}
while(true){var next=new Date(start.getFullYear(),start.getMonth(),++last);if(next>end){throw new Error('sanity fails next is greater then end');}
if(!exports.isSameDate(next,end)){list.push(next);continue;}
break;}
if(includeTime){list.unshift(start);list.push(end);}else{list.unshift(exports.createDay(start));list.push(exports.createDay(end));}
return list;},exports.getWeeksDays=function(startDate){var weeksDayStart=exports.getWeekStartDate(startDate);var result=[weeksDayStart];for(var i=1;i<7;i++){result.push(exports.createDay(weeksDayStart,weeksDayStart.getDate()+i));}
return result;};exports.isPast=function(date){return(date.valueOf()<exports.today.valueOf());};exports.isFuture=function(date){return!exports.isPast(date);};exports.relativeState=function(day,month){var states;if(exports.isToday(day)){return exports.PRESENT;}
if(exports.isPast(day)){states=exports.PAST;}else{states=exports.FUTURE;}
if(day.getMonth()!==month.getMonth()){states+=' '+exports.OTHER_MONTH;}
return states;};exports.relativeOffset=function(baseDate,date){if(exports.isSameDate(baseDate,date)){return date.getHours()+(date.getMinutes()/60);}
return 0;};exports.relativeDuration=function(baseDate,startDate,endDate){if(!exports.isSameDate(startDate,endDate)){if(exports.isSameDate(baseDate,startDate)){endDate=exports.endOfDay(baseDate);}else if(exports.isSameDate(baseDate,endDate)){startDate=exports.createDay(endDate);}else{return 24;}}
return exports.hourDiff(startDate,endDate);};exports.isAllDay=function(baseDate,startDate,endDate){var refStart=exports.createDay(baseDate);var refEnd=exports.endOfDay(baseDate);var startBefore=startDate<=refStart;var endsAfter=endDate>=refEnd;return(startBefore&&endsAfter)||Number(startDate)===Number(endDate);};if(typeof(window)!=='undefined'){window.addEventListener('localized',co.wrap(function*(){exports.startDay=yield mozIntl.calendarInfo('firstDayOfTheWeek');}));}});(function(){var _global=this;var _rng;if(typeof(_global.require)=='function'&&typeof(module)!='undefined'&&module.exports){try{var _rb=_global.require('crypto').randomBytes;_rng=_rb&&function(){return _rb(16);};}catch(e){}}
if(!_rng&&_global.crypto&&crypto.getRandomValues){var _rnds8=new Uint8Array(16);_rng=function whatwgRNG(){crypto.getRandomValues(_rnds8);return _rnds8;};}
if(!_rng){var _rnds=new Array(16);_rng=function(){for(var i=0,r;i<16;i++){if((i&0x03)===0)r=Math.random()*0x100000000;_rnds[i]=r>>>((i&0x03)<<3)&0xff;}
return _rnds;};}
var BufferClass=typeof(_global.Buffer)=='function'?_global.Buffer:Array;var _byteToHex=[];var _hexToByte={};for(var i=0;i<256;i++){_byteToHex[i]=(i+0x100).toString(16).substr(1);_hexToByte[_byteToHex[i]]=i;}
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
var uuid=v4;uuid.v1=v1;uuid.v4=v4;uuid.parse=parse;uuid.unparse=unparse;uuid.BufferClass=BufferClass;if(typeof define==='function'&&define.amd){define('ext/uuid',[],function(){return uuid;});}else if(typeof(module)!='undefined'&&module.exports){module.exports=uuid;}else{var _previousRoot=_global.uuid;uuid.noConflict=function(){_global.uuid=_previousRoot;return uuid;};_global.uuid=uuid;}}).call(this);define('event_mutations',['require','exports','module','common/calc','core','ext/uuid'],function(require,exports){'use strict';var Calc=require('common/calc');var core=require('core');var uuid=require('ext/uuid');function createBusytime(event){return{_id:event._id+'-'+uuid.v4(),eventId:event._id,calendarId:event.calendarId,start:event.remote.start,end:event.remote.end};}
function Create(options){if(options){for(var key in options){if(options.hasOwnProperty(key)){this[key]=options[key];}}}}
Create.prototype={commit:function(callback){var storeFactory=core.storeFactory;var alarmStore=storeFactory.get('Alarm');var eventStore=storeFactory.get('Event');var busytimeStore=storeFactory.get('Busytime');var componentStore=storeFactory.get('IcalComponent');var trans=core.db.transaction(eventStore._dependentStores,'readwrite');trans.oncomplete=function commitComplete(){callback(null);};trans.onerror=function commitError(e){callback(e.target.error);};eventStore.persist(this.event,trans);if(!this.busytime){this.busytime=createBusytime(this.event);}
busytimeStore.persist(this.busytime,trans);if(this.icalComponent){componentStore.persist(this.icalComponent,trans);}
var alarms=this.event.remote.alarms;if(alarms&&alarms.length){var i=0;var len=alarms.length;var now=Date.now();var alarmTrans=core.db.transaction(['alarms'],'readwrite');for(;i<len;i++){var alarm={startDate:{offset:this.busytime.start.offset,utc:this.busytime.start.utc+(alarms[i].trigger*1000)},eventId:this.busytime.eventId,busytimeId:this.busytime._id};var alarmDate=Calc.dateFromTransport(this.busytime.end).valueOf();if(alarmDate<now){continue;}
alarmStore.persist(alarm,alarmTrans);}}}};function Update(){Create.apply(this,arguments);}
Update.prototype={commit:function(callback){var storeFactory=core.storeFactory;var busytimeStore=storeFactory.get('Busytime');var self=this;busytimeStore.removeEvent(this.event._id,function(err){if(err){callback(err);return;}
Create.prototype.commit.call(self,callback);});}};exports.create=function createMutation(option){return new Create(option);};exports.update=function updateMutation(option){return new Update(option);};});define('provider/local',['require','exports','module','./abstract','core','common/constants','event_mutations','ext/uuid'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var core=require('core');var localCalendarId=require('common/constants').localCalendarId;var mutations=require('event_mutations');var uuid=require('ext/uuid');function Local(){Abstract.apply(this,arguments);var storeFactory=core.storeFactory;this.events=storeFactory.get('Event');this.busytimes=storeFactory.get('Busytime');this.alarms=storeFactory.get('Alarm');}
module.exports=Local;Local.defaultCalendar=function(){var l10nId='calendar-local';var name;if('mozL10n'in window.navigator){name=window.navigator.mozL10n.get(l10nId);if(name===l10nId){name=null;}}
if(!name){name='Offline calendar';}
return{name:name,id:localCalendarId,color:Local.prototype.defaultColor};};Local.prototype={__proto__:Abstract.prototype,canExpandRecurringEvents:false,getAccount:function(account,callback){callback(null,{});},findCalendars:function(account,callback){var list={};list[localCalendarId]=Local.defaultCalendar();callback(null,list);},syncEvents:function(account,calendar,cb){cb(null);},createEvent:function(event,callback){if(!event.remote.id){event.remote.id=uuid();}
var create=mutations.create({event:event});create.commit(function(err){if(err){return callback(err);}
callback(null,create.busytime,create.event);});return create;},deleteEvent:function(event,busytime,callback){if(typeof(busytime)==='function'){callback=busytime;busytime=null;}
var storeFactory=core.storeFactory;storeFactory.get('Event').remove(event._id,callback);},updateEvent:function(event,busytime,callback){if(typeof(busytime)==='function'){callback=busytime;busytime=null;}
var update=mutations.update({event:event});update.commit(function(err){if(err){return callback(err);}
callback(null,update.busytime,update.event);});return update;}};});define('common/responder',['require','exports','module'],function(require,exports,module){'use strict';function Responder(events){this._$events=Object.create(null);this.buffer={};if(typeof(events)!=='undefined'){this.addEventListener(events);}}
module.exports=Responder;Responder.stringify=function stringify(command,data){return JSON.stringify([command,data]);};Responder.parse=function parse(json){var data;try{data=(json.forEach)?json:JSON.parse(json);}catch(e){throw new Error('Could not parse json: "'+json+'"');}
return data;};Responder.prototype={parse:Responder.parse,stringify:Responder.stringify,events:null,respond:function respond(json){var event=Responder.parse(json);var args=Array.prototype.slice.call(arguments).slice(1);this.emit.apply(this,event.concat(args));return event;},addEventListener:function addEventListener(type,callback){var event;if(typeof(callback)==='undefined'&&typeof(type)==='object'){for(event in type){if(type.hasOwnProperty(event)){this.addEventListener(event,type[event]);}}
return this;}
if(!(type in this._$events)){this._$events[type]=[];}
this._$events[type].push(callback);return this.flushTopicBuffer(type);},once:function once(type,callback){var self=this;function onceCb(){self.removeEventListener(type,onceCb);callback.apply(this,arguments);}
this.addEventListener(type,onceCb);return this.flushTopicBuffer(type);},flushTopicBuffer:function flushTopicBuffer(topic){if(!(topic in this.buffer)){return this;}
this.buffer[topic].forEach(args=>{args.unshift(topic);this.emit.apply(this,args);});return this;},emit:function emit(){var args=Array.prototype.slice.call(arguments),event=args.shift(),eventList,self=this;if(event in this._$events){eventList=this._$events[event];eventList.forEach(function(callback){if(typeof(callback)==='object'&&callback.handleEvent){callback.handleEvent({type:event,data:args});}else{callback.apply(self,args);}});}
return this;},emitWhenListener:function emitWhenListener(){var args=Array.prototype.slice.call(arguments);var event=args.shift();if(event in this._$events&&this._$events[event].length){return this.emit.apply(this,arguments);}
if(!(event in this.buffer)){this.buffer[event]=[];}
this.buffer[event].push(args);return this;},removeAllEventListeners:function removeAllEventListeners(name){if(name in this._$events){this._$events[name].length=0;}
return this;},removeEventListener:function removeEventListener(name,callback){var i,length,events;if(!(name in this._$events)){return false;}
events=this._$events[name];for(i=0,length=events.length;i<length;i++){if(events[i]&&events[i]===callback){events.splice(i,1);return true;}}
return false;}};Responder.prototype.on=Responder.prototype.addEventListener;Responder.prototype.off=Responder.prototype.removeEventListener;});define('common/debug',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(name){return function(){var args=Array.prototype.slice.call(arguments).map(JSON.stringify);args.unshift('[calendar] ');args.unshift(name);console.log.apply(console,args);};};});define('common/probably_parse_int',['require','exports','module'],function(require,exports,module){'use strict';var NUMERIC=/^[0-9]+$/;module.exports=function(id){if(typeof id==='string'&&id.match(NUMERIC)){return parseInt(id,10);}
return id;};});define('db',['require','exports','module','models/account','common/presets','provider/local','common/responder','core','common/debug','common/promise','common/next_tick','common/constants','common/probably_parse_int','ext/uuid'],function(require,exports,module){'use strict';var Account=require('models/account');var Presets=require('common/presets');var Local=require('provider/local');var Responder=require('common/responder');var core=require('core');var debug=require('common/debug')('db');var denodeifyAll=require('common/promise').denodeifyAll;var nextTick=require('common/next_tick');var localCalendarId=require('common/constants').localCalendarId;var probablyParseInt=require('common/probably_parse_int');var uuid=require('ext/uuid');var idb=window.indexedDB;const VERSION=15;var store=Object.freeze({events:'events',accounts:'accounts',calendars:'calendars',busytimes:'busytimes',settings:'settings',alarms:'alarms',icalComponents:'icalComponents'});function Db(name){this.name=name;Responder.call(this);this._upgradeOperations=[];denodeifyAll(this,['load']);}
module.exports=Db;Db.prototype={__proto__:Responder.prototype,connection:null,load:function(callback){debug(`Will load ${this.name} db.`);var self=this;function setupDefaults(){if(self.oldVersion<8){self._setupDefaults(callback);}else{nextTick(callback);}}
if(this.isOpen){return setupDefaults();}
this.open(VERSION,setupDefaults);},open:function(version,callback){if(typeof(version)==='function'){callback=version;version=VERSION;}
var req=idb.open(this.name,version);this.version=version;var self=this;req.onsuccess=function(){self.isOpen=true;self.connection=req.result;if(self._upgradeOperations.length){var pending=self._upgradeOperations.length;var operation;while((operation=self._upgradeOperations.shift())){operation.call(self,function next(){if(!(--pending)){callback(null,self);self.emit('open',self);}});}}else{callback(null,self);self.emit('open',self);}};req.onblocked=function(error){callback(error,null);self.emit('error',error);};req.onupgradeneeded=function(event){self._handleVersionChange(req.result,event);};req.onerror=function(error){callback(error,null);self.emit('error',error);};},transaction:function(list,state){var names;var self=this;if(typeof(list)==='string'){names=[];names.push(this.store[list]||list);}else{names=list.map(function(name){return self.store[name]||name;});}
return this.connection.transaction(names,state||'readonly');},_handleVersionChange:function(db,event){var newVersion=event.newVersion;var curVersion=event.oldVersion;var transaction=event.currentTarget.transaction;this.hasUpgraded=true;this.oldVersion=curVersion;this.upgradedVersion=newVersion;for(;curVersion<newVersion;curVersion++){if(curVersion<6){var existingNames=db.objectStoreNames;for(var i=0;i<existingNames.length;i++){db.deleteObjectStore(existingNames[i]);}
curVersion=6;var busytimes=db.createObjectStore(store.busytimes,{keyPath:'_id'});busytimes.createIndex('end','end.utc',{unique:false,multiEntry:false});busytimes.createIndex('eventId','eventId',{unique:false,multiEntry:false});var events=db.createObjectStore(store.events,{keyPath:'_id'});events.createIndex('calendarId','calendarId',{unique:false,multiEntry:false});events.createIndex('parentId','parentId',{unique:false,multiEntry:false});db.createObjectStore(store.accounts,{keyPath:'_id',autoIncrement:true});db.createObjectStore(store.calendars,{keyPath:'_id',autoIncrement:true});}else if(curVersion===7){db.createObjectStore(store.settings,{keyPath:'_id'});}else if(curVersion===8){var alarms=db.createObjectStore(store.alarms,{keyPath:'_id',autoIncrement:true});alarms.createIndex('trigger','trigger.utc',{unique:false,multiEntry:false});alarms.createIndex('busytimeId','busytimeId',{unique:false,multiEntry:false});}else if(curVersion===12){var icalComponents=db.createObjectStore(store.icalComponents,{keyPath:'eventId',autoIncrement:false});icalComponents.createIndex('lastRecurrenceId','lastRecurrenceId.utc',{unique:false,multiEntry:false});}else if(curVersion===13){var calendarStore=transaction.objectStore(store.calendars);calendarStore.createIndex('accountId','accountId',{unique:false,multiEntry:false});}else if(curVersion===14){this.sanitizeEvents(transaction);}}},sanitizeEvents:function(trans){var badCalendarIdToEventIds={};var objectStore=trans.objectStore(store.events);objectStore.openCursor().onsuccess=(function(evt){var cursor=evt.target.result;if(!cursor){return this._updateXorDeleteEvents(badCalendarIdToEventIds,trans);}
var calendarId=cursor.value.calendarId;if(typeof(calendarId)==='number'){return cursor.continue();}
var eventIds=badCalendarIdToEventIds[calendarId]||[];eventIds.push(cursor.key);badCalendarIdToEventIds[calendarId]=eventIds;cursor.continue();}).bind(this);},_updateXorDeleteEvents:function(badCalendarIdToEventIds,trans){var calendarIds=Object.keys(badCalendarIdToEventIds);calendarIds.forEach(function(calendarId){calendarId=probablyParseInt(calendarId);var eventIds=badCalendarIdToEventIds[calendarId];var calendars=trans.objectStore(store.calendars);calendars.get(calendarId).onsuccess=(function(evt){var result=evt.target.result;if(result){this._updateEvents(eventIds,calendarId,trans);}else{this._deleteEvents(eventIds,trans);}}).bind(this);},this);},_updateEvents:function(eventIds,calendarId,trans){var eventStore=trans.objectStore(store.events);var busytimeStore=trans.objectStore(store.busytimes);var busytimeStoreIndexedByEventId=busytimeStore.index('eventId');eventIds.forEach(function(eventId){eventStore.get(eventId).onsuccess=function(evt){var result=evt.target.result;result.calendarId=calendarId;eventStore.put(result);};busytimeStoreIndexedByEventId.get(eventId).onsuccess=function(evt){var result=evt.target.result;result.calendarId=calendarId;busytimeStore.put(result);};});},_deleteEvents:function(eventIds,trans){var events=core.storeFactory.get('Event');eventIds.forEach(function(eventId){events.remove(eventId,trans);});},get store(){return store;},close:function(){if(this.connection){this.isOpen=false;this.connection.close();this.connection=null;}},clearNonCredentials:function(callback){var stores=['events','busytimes'];var trans=this.transaction(stores,'readwrite');trans.addEventListener('complete',callback);stores.forEach(function(store){store=trans.objectStore(store);store.clear();});},_setupDefaults:function(callback){debug('Will setup defaults.');var storeFactory=core.storeFactory;var calendarStore=storeFactory.get('Calendar');var accountStore=storeFactory.get('Account');var trans=this.transaction(['accounts','calendars'],'readwrite');if(callback){trans.addEventListener('error',function(err){callback(err);});trans.addEventListener('complete',function(){callback();});}
var options=Presets.local.options;debug('Creating local calendar with options:',options);var account=new Account(options);account.preset='local';account._id=uuid();var calendar={_id:localCalendarId,accountId:account._id,remote:Local.defaultCalendar()};accountStore.persist(account,trans);calendarStore.persist(calendar,trans);},deleteDatabase:function(callback){var req=idb.deleteDatabase(this.name);req.onblocked=function(){callback(new Error('blocked'));};req.onsuccess=function(event){callback(null,event);};req.onerror=function(event){callback(event,null);};}};});define('common/error',['require','exports','module'],function(require,exports,module){'use strict';function Base(name,detail){this.message='oops... why did you throw this?';this.name=name;this.detail=detail;}
module.exports=Base;Base.prototype=Object.create(Error.prototype);function errorFactory(name,l10nID){var error=function(detail){this.name=name;this.detail=detail;this.l10nID=l10nID||name;};error.prototype=Object.create(Base.prototype);return error;}
Base.Authentication=errorFactory('authentication','unauthenticated');Base.InvalidServer=errorFactory('invalid-server','internal-server-error');Base.ServerFailure=errorFactory('server-failure','internal-server-error');});(function(window){'use strict';window.NotificationHelper={getIconURI:function nh_getIconURI(app,entryPoint){var icons=app.manifest.icons;if(entryPoint){icons=app.manifest.entry_points[entryPoint].icons;}
if(!icons){return null;}
var sizes=Object.keys(icons).map(function parse(str){return parseInt(str,10);});sizes.sort(function(x,y){return y-x;});var HVGA=document.documentElement.clientWidth<480;var index=sizes[HVGA?sizes.length-1:0];return app.installOrigin+icons[index];},send:function nh_send(titleL10n,options){return Promise.all([titleL10n,options.bodyL10n].map(getL10n)).then(([title,body])=>{if(body){options.body=body;}
options.lang=document.documentElement.getAttribute('lang');var notification=new window.Notification(title,options);if(options.closeOnClick!==false){notification.addEventListener('click',function nh_click(){notification.removeEventListener('click',nh_click);notification.close();});}
return notification;});},};function getL10n(l10nAttrs){if(!l10nAttrs){return;}
if(typeof l10nAttrs==='string'){return document.l10n.formatValue(l10nAttrs);}
if(typeof l10nAttrs.raw==="string"){return l10nAttrs.raw;}
return document.l10n.formatValue(l10nAttrs.id,l10nAttrs.args);}})(this);define("shared/notification_helper",(function(global){return function(){var ret,fn;return ret||global.NotificationHelper;};}(this)));define('performance',['require','exports','module'],function(require,exports){'use strict';exports._isMonthAgendaInteractive=false;exports._isMonthReady=false;exports._isVisuallyActive=false;exports._isPendingReady=false;var dispatched={};function dispatch(markName){dispatched[markName]=true;window.performance.mark(markName);}
exports.isComplete=function(markName){return dispatched[markName];};exports.domLoaded=function(){dispatch('navigationLoaded');};exports.chromeInteractive=function(){dispatch('navigationInteractive');};exports.monthsDayReady=function(){if(exports._isMonthAgendaInteractive){return;}
exports._isMonthAgendaInteractive=true;dispatchVisuallyLoadedAndInteractive();};exports.monthReady=function(){if(exports._isMonthReady){return;}
exports._isMonthReady=true;dispatchVisuallyLoadedAndInteractive();};function dispatchVisuallyLoadedAndInteractive(){if(exports._isVisuallyActive||!exports._isMonthAgendaInteractive||!exports._isMonthReady){return;}
exports._isVisuallyActive=true;dispatch('visuallyLoaded');dispatch('contentInteractive');dispatchAppLoad();}
exports.pendingReady=function(){if(exports._isPendingReady){return;}
exports._isPendingReady=true;dispatchAppLoad();};function dispatchAppLoad(){if(!exports._isVisuallyActive||!exports._isPendingReady){return;}
dispatch('fullyLoaded');window.dispatchEvent(new CustomEvent('fullyLoaded'));}});!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define('ext/page',[],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.page=e()}}(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var pathtoRegexp=require('path-to-regexp');module.exports=page;var location=window.history.location||window.location;var dispatch=true;var base='';var running;var hashbang=false;function page(path,fn){if('function'===typeof path){return page('*',path);}
if('function'===typeof fn){var route=new Route(path);for(var i=1;i<arguments.length;++i){page.callbacks.push(route.middleware(arguments[i]));}}else if('string'==typeof path){'string'===typeof fn?page.redirect(path,fn):page.show(path,fn);}else{page.start(path);}}
page.callbacks=[];page.base=function(path){if(0===arguments.length)return base;base=path;};page.start=function(options){options=options||{};if(running)return;running=true;if(false===options.dispatch)dispatch=false;if(false!==options.popstate)window.addEventListener('popstate',onpopstate,false);if(false!==options.click)window.addEventListener('click',onclick,false);if(true===options.hashbang)hashbang=true;if(!dispatch)return;var url=(hashbang&&~location.hash.indexOf('#!'))?location.hash.substr(2)+location.search:location.pathname+location.search+location.hash;page.replace(url,null,true,dispatch);};page.stop=function(){if(!running)return;running=false;window.removeEventListener('click',onclick,false);window.removeEventListener('popstate',onpopstate,false);};page.show=function(path,state,dispatch){var ctx=new Context(path,state);if(false!==dispatch)page.dispatch(ctx);if(false!==ctx.handled)ctx.pushState();return ctx;};page.redirect=function(from,to){page(from,function(e){setTimeout(function(){page.replace(to);});});};page.replace=function(path,state,init,dispatch){var ctx=new Context(path,state);ctx.init=init;ctx.save();if(false!==dispatch)page.dispatch(ctx);return ctx;};page.dispatch=function(ctx){var i=0;function next(){var fn=page.callbacks[i++];if(!fn)return unhandled(ctx);fn(ctx,next);}
next();};function unhandled(ctx){if(ctx.handled)return;var current;if(hashbang){current=base+location.hash.replace('#!','');}else{current=location.pathname+location.search;}
if(current===ctx.canonicalPath)return;page.stop();ctx.handled=false;location.href=ctx.canonicalPath;}
function Context(path,state){if('/'===path[0]&&0!==path.indexOf(base))path=base+path;var i=path.indexOf('?');this.canonicalPath=path;this.path=path.replace(base,'')||'/';this.title=document.title;this.state=state||{};this.state.path=path;this.querystring=~i?path.slice(i+1):'';this.pathname=~i?path.slice(0,i):path;this.params=[];this.hash='';if(!~this.path.indexOf('#'))return;var parts=this.path.split('#');this.path=parts[0];this.hash=parts[1]||'';this.querystring=this.querystring.split('#')[0];}
page.Context=Context;Context.prototype.pushState=function(){history.pushState(this.state,this.title,hashbang&&this.path!=='/'?'#!'+this.path:this.canonicalPath);};Context.prototype.save=function(){history.replaceState(this.state,this.title,hashbang&&this.path!=='/'?'#!'+this.path:this.canonicalPath);};function Route(path,options){options=options||{};this.path=(path==='*')?'(.*)':path;this.method='GET';this.regexp=pathtoRegexp(this.path,this.keys=[],options.sensitive,options.strict);}
page.Route=Route;Route.prototype.middleware=function(fn){var self=this;return function(ctx,next){if(self.match(ctx.path,ctx.params))return fn(ctx,next);next();};};Route.prototype.match=function(path,params){var keys=this.keys,qsIndex=path.indexOf('?'),pathname=~qsIndex?path.slice(0,qsIndex):path,m=this.regexp.exec(decodeURIComponent(pathname));if(!m)return false;for(var i=1,len=m.length;i<len;++i){var key=keys[i-1];var val='string'===typeof m[i]?decodeURIComponent(m[i]):m[i];if(key){params[key.name]=undefined!==params[key.name]?params[key.name]:val;}else{params.push(val);}}
return true;};function onpopstate(e){if(e.state){var path=e.state.path;page.replace(path,e.state);}}
function onclick(e){if(1!=which(e))return;if(e.metaKey||e.ctrlKey||e.shiftKey)return;if(e.defaultPrevented)return;var el=e.target;while(el&&'A'!=el.nodeName)el=el.parentNode;if(!el||'A'!=el.nodeName)return;var link=el.getAttribute('href');if(el.pathname===location.pathname&&(el.hash||'#'===link))return;if(link&&link.indexOf("mailto:")>-1)return;if(el.target)return;if(!sameOrigin(el.href))return;var path=el.pathname+el.search+(el.hash||'');var orig=path;path=path.replace(base,'');if(base&&orig===path)return;e.preventDefault();page.show(orig);}
function which(e){e=e||window.event;return null===e.which?e.button:e.which;}
function sameOrigin(href){var origin=location.protocol+'//'+location.hostname;if(location.port)origin+=':'+location.port;return(href&&(0===href.indexOf(origin)));}
page.sameOrigin=sameOrigin;},{"path-to-regexp":2}],2:[function(require,module,exports){module.exports=pathtoRegexp;var PATH_REGEXP=new RegExp(['(\\\\.)','([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?','([.+*?=^!:${}()[\\]|\\/])'].join('|'),'g');function escapeGroup(group){return group.replace(/([=!:$\/()])/g,'\\$1');}
var attachKeys=function(re,keys){re.keys=keys;return re;};function pathtoRegexp(path,keys,options){if(keys&&!Array.isArray(keys)){options=keys;keys=null;}
keys=keys||[];options=options||{};var strict=options.strict;var end=options.end!==false;var flags=options.sensitive?'':'i';var index=0;if(path instanceof RegExp){var groups=path.source.match(/\((?!\?)/g)||[];keys.push.apply(keys,groups.map(function(match,index){return{name:index,delimiter:null,optional:false,repeat:false};}));return attachKeys(path,keys);}
if(Array.isArray(path)){path=path.map(function(value){return pathtoRegexp(value,keys,options).source;});return attachKeys(new RegExp('(?:'+path.join('|')+')',flags),keys);}
path=path.replace(PATH_REGEXP,function(match,escaped,prefix,key,capture,group,suffix,escape){if(escaped){return escaped;}
if(escape){return'\\'+escape;}
var repeat=suffix==='+'||suffix==='*';var optional=suffix==='?'||suffix==='*';keys.push({name:key||index++,delimiter:prefix||'/',optional:optional,repeat:repeat});prefix=prefix?'\\'+prefix:'';capture=escapeGroup(capture||group||'[^'+(prefix||'\\/')+']+?');if(repeat){capture=capture+'(?:'+prefix+capture+')*';}
if(optional){return'(?:'+prefix+'('+capture+'))?';}
return prefix+'('+capture+')';});var endsWithSlash=path[path.length-1]==='/';if(!strict){path=(endsWithSlash?path.slice(0,-2):path)+'(?:\\/(?=$))?';}
if(!end){path+=strict&&endsWithSlash?'':'(?=\\/|$)';}
return attachKeys(new RegExp('^'+path+(end?'$':''),flags),keys);};},{}]},{},[1])(1)});define('router',['require','exports','module','core','ext/page'],function(require,exports,module){'use strict';var COPY_METHODS=['start','stop','show'];var core=require('core');var page=require('ext/page');function Router(){var i=0;var len=COPY_METHODS.length;this.page=page;this.page({hashbang:true});this._activeObjects=[];for(;i<len;i++){this[COPY_METHODS[i]]=page[COPY_METHODS[i]].bind(page);}
this._lastState=this._lastState.bind(this);}
Router.prototype={go:function(path,context){this.show(path,context);},mangeObject:function(){var args=Array.prototype.slice.call(arguments);var object=args.shift();this._activeObjects.push(object);if('onactive'in object){object.onactive.apply(object,args);}},clearObjects:function(){var item;while((item=this._activeObjects.pop())){if('oninactive'in item){item.oninactive();}}},_lastState:function(ctx){this.last=ctx;},resetState:function(){if(!this.currentPath){this.currentPath='/month/';}
this.show(this.currentPath);},state:function(path,views,options){options=options||{};if(!Array.isArray(views)){views=[views];}
var self=this;var viewObjs=[];function loadAllViews(ctx,next){var len=views.length;var numViews=len;var i;viewObjs=[];for(i=0;i<numViews;i++){core.viewFactory.get(views[i],function(view){viewObjs.push(view);len--;if(!len){next();}});}}
function setPath(ctx,next){var meta=document.querySelector('meta[name="theme-color"]');meta.setAttribute('content',meta.dataset[options.color||'default']);if(options.path!==false){document.body.dataset.path=ctx.canonicalPath;document.body.clientWidth;}
next();}
function handleViews(ctx,next){if(options.clear!==false){self.clearObjects();}
for(var i=0;i<viewObjs.length;i++){self.mangeObject(viewObjs[i],ctx);}
if(options.appPath!==false){self.currentPath=ctx.canonicalPath;}
next();}
this.page(path,loadAllViews,setPath,handleViews,this._lastState);},modifier:function(path,view,options){options=options||{};options.appPath=false;options.clear=false;this.state(path,view,options);}};module.exports=new Router();});define('notification',['require','exports','module','shared/notification_helper','ext/co','common/debug','performance','router'],function(require,exports,module){'use strict';var NotificationHelper=require('shared/notification_helper');var co=require('ext/co');var debug=require('common/debug')('notification');var performance=require('performance');var router=require('router');var cachedSelf;exports.sendNotification=co.wrap(function*(titleL10n,bodyL10n,url,data){data=data||{};var app=yield getSelf();if(!app){debug('mozApps.getSelf fail');return;}
var icon=`${NotificationHelper.getIconURI(app)}?${url}`;var notification=yield NotificationHelper.send(titleL10n,{bodyL10n:bodyL10n,icon:icon,tag:url,data:data,closeOnClick:false});return new Promise(function(resolve,reject){notification.onshow=resolve;notification.onerror=reject;notification.onclick=()=>launch(url);});});exports.revokeNotificationsForEvent=co.wrap(function*(event){var id=event.remote.id;var notifications=yield Notification.get();notifications.forEach(notification=>{if(notification.data.id===id){notification.close();}});});function getSelf(){if(!cachedSelf){cachedSelf=new Promise((resolve,reject)=>{var request=navigator.mozApps.getSelf();request.onsuccess=(event)=>{resolve(event.target.result);};request.onerror=()=>{reject(new Error('mozApps.getSelf failed!'));};});}
return cachedSelf;}
function launch(url){closeNotifications(url);if(performance.isComplete('fullyLoaded')){return foreground(url);}
window.addEventListener('fullyLoaded',function onMozAppLoaded(){window.removeEventListener('fullyLoaded',onMozAppLoaded);return foreground(url);});}
exports.launch=launch;function foreground(url){return getSelf().then(app=>{router.go(url);return app&&app.launch();});}
function closeNotifications(url){Notification.get({tag:url}).then(notifications=>{notifications.forEach(n=>n.close());});}});define('controllers/error',['require','exports','module','common/error','common/error','common/responder','common/next_tick','notification'],function(require,exports,module){'use strict';var Authentication=require('common/error').Authentication;var InvalidServer=require('common/error').InvalidServer;var Responder=require('common/responder');var nextTick=require('common/next_tick');var notification=require('notification');function ErrorController(){Responder.call(this);this._handlers=Object.create(null);}
module.exports=ErrorController;ErrorController.prototype={__proto__:Responder.prototype,accountErrorUrl:'/update-account/',dispatch:function(error){if(error instanceof Authentication||error instanceof InvalidServer){this.handleAuthenticate(error.detail.account);}
this.emit('error',error);},handleAuthenticate:function(account,callback){if(!account){return console.error('attempting to trigger reauth without an account');}
if(!account.error||account.error.count!==1){return nextTick(callback);}
var lock=navigator.requestWakeLock('cpu');var titleL10n='notification-error-sync-title';var bodyL10n='notification-error-sync-description';var url=this.accountErrorUrl+account._id;notification.sendNotification(titleL10n,bodyL10n,url).then(()=>{callback&&callback();lock.unlock();});}};});define('pending_manager',['require','exports','module','common/next_tick'],function(require,exports,module){'use strict';var nextTick=require('common/next_tick');function PendingManager(){this.objects=[];this.pending=0;this.onstart=this.onstart.bind(this);this.onend=this.onend.bind(this);}
module.exports=PendingManager;PendingManager.prototype={register:function(object){object.on(object.startEvent,this.onstart);object.on(object.completeEvent,this.onend);if(!this.isPending()&&object.pending){nextTick(()=>this.onpending&&this.onpending());}
this.objects.push(object);},unregister:function(object){this.objects=this.objects.filter(el=>el!==object);},isPending:function(){return this.objects.some(object=>object.pending);},onstart:function(){if(!this.pending){this.onpending&&this.onpending();}
this.pending++;},onend:function(){this.pending--;if(!this.pending){this.oncomplete&&this.oncomplete();}}};});define('controllers/recurring_events',['require','exports','module','common/responder','core','common/debug','common/next_tick'],function(require,exports,module){'use strict';var Responder=require('common/responder');var core=require('core');var debug=require('common/debug')('controllers/recurring_events');var nextTick=require('common/next_tick');function RecurringEvents(){this.accounts=core.storeFactory.get('Account');Responder.call(this);}
module.exports=RecurringEvents;RecurringEvents.prototype={__proto__:Responder.prototype,startEvent:'expandStart',completeEvent:'expandComplete',paddingInDays:85,waitBeforeMove:750,maximumExpansions:25,_moveTimeout:null,pending:false,unobserve:function(){core.timeController.removeEventListener('monthChange',this);core.syncController.removeEventListener('syncComplete',this);},observe:function(){var time=core.timeController;if(time.position){this.queueExpand(time.position);}
time.on('monthChange',this);core.syncController.on('syncComplete',this);},handleEvent:function(event){switch(event.type){case'syncComplete':this.queueExpand(core.timeController.position);break;case'monthChange':if(this._moveTimeout!==null){clearTimeout(this._moveTimeout);this._moveTimeout=null;}
this._moveTimeout=setTimeout(this.queueExpand.bind(this,event.data[0]),this.waitBeforeMove);break;}},_expandProvider:function(expandDate,provider,callback){debug('Will attempt to expand provider until:',expandDate);var tries=0;var max=this.maximumExpansions;function attemptCompleteExpand(){debug('Will try to complete expansion (tries = '+tries+')');if(tries>=max){return callback(new Error('could not complete expansion after "'+tries+'"'));}
provider.ensureRecurrencesExpanded(expandDate,function(err,didExpand){if(err){return callback(err);}
debug('Expansion attempt did expand:',didExpand);if(!didExpand){callback();}else{tries++;nextTick(attemptCompleteExpand);}});}
attemptCompleteExpand();},queueExpand:function(expandTo){if(this.pending){if(!this._next){this._next=expandTo;}else if(expandTo>this._next){this._next=expandTo;}
return;}
this.pending=true;this.emit('expandStart');var self=this;function expandNext(date){self.expand(date,function(){if(date===self._next){self._next=null;}
var next=self._next;if(!next){self.pending=false;self.emit('expandComplete');return;}
expandNext(next);});}
expandNext(expandTo);},expand:function(expandTo,callback){debug('expand',expandTo);this.accounts.all((err,accounts)=>{if(err){return callback(err);}
var expandDate=new Date(expandTo.valueOf());expandDate.setDate(expandDate.getDate()+this.paddingInDays);var providers=this._getExpandableProviders(accounts);var pending=providers.length;if(!pending){return nextTick(callback);}
providers.forEach(provider=>{this._expandProvider(expandDate,provider,()=>{if(--pending<=0){callback();}});});});},_getExpandableProviders:function(accounts){var providers=[];Object.keys(accounts).forEach(key=>{var account=accounts[key];var provider=core.providerFactory.get(account.providerType);if(provider&&provider.canExpandRecurringEvents&&providers.indexOf(provider)===-1){providers.push(provider);}});return providers;}};});define('worker/manager',['require','exports','module','common/responder','common/debug'],function(require,exports,module){'use strict';var Responder=require('common/responder');var debug=require('common/debug')('worker/manager');const IDLE_CLEANUP_TIME=5000;function Manager(){this._lastId=0;Responder.call(this);this.roles=Object.create(null);this.workers=[];}
module.exports=Manager;Manager.prototype={Worker:Worker,__proto__:Responder.prototype,_onLog:debug,_formatData:function(data){if(data[1]&&data[1].stack&&data[1].constructorName){var err=data[1];var builtErr;if(window[err.constructorName]){builtErr=Object.create(window[err.constructorName].prototype);}else{builtErr=Object.create(Error.prototype);}
var key;for(key in err){if(err.hasOwnProperty(key)){builtErr[key]=err[key];}}
data[1]=builtErr;}
return data;},_onWorkerError:function(worker,err){if(/reference to undefined property/.test(err.message)){return;}
if(worker.instance){worker.instance.terminate();worker.instance=null;}
var pending=worker.pending;worker.pending=Object.create(null);for(var id in pending){if(pending[id].stream){pending[id].stream.emit('error',err);}
pending[id].callback(err);}},_onWorkerMessage:function(worker,event){var data=this._formatData(event.data);var type=data.shift();var match=type.match(/^(\d+) (end|stream)$/);if(type=='log'){this._onLog.apply(this,data);}else if(match){var pending=worker.pending[match[1]];if(pending){this._dispatchMessage(worker,pending,match[2],data);}else{throw new Error('Message arrived for unknown consumer: '+
type+' '+JSON.stringify(data));}}else{this.respond([type].concat(data));}},_dispatchMessage:function(worker,pending,type,data){if(type=='stream'){pending.stream.respond(data);}else{pending.callback.apply(null,data);delete worker.pending[pending.id];if(Object.keys(worker.pending).length){return;}
this._scheduleCleanup(worker);}},_addPending:function(worker,pending){worker.pending[pending.id]=pending;clearTimeout(worker.cleanup);},_scheduleCleanup:function(worker){clearTimeout(worker.cleanup);worker.cleanup=setTimeout(function(){if(Object.keys(worker.pending).length){return;}
if(!worker.instance){return;}
worker.instance.terminate();worker.instance=null;},IDLE_CLEANUP_TIME);},add:function(role,workerURL){debug('Will add',role,'worker at',workerURL);var worker={instance:null,pending:Object.create(null),url:workerURL,cleanup:null};this.workers.push(worker);[].concat(role).forEach(function(role){if(!(role in this.roles)){this.roles[role]=[worker];}else{this.roles[role].push(worker);}},this);},_ensureActiveWorker:function(role){if(role in this.roles){var workers=this.roles[role];var worker=workers[Math.floor(Math.random()*workers.length)];if(worker.instance){return worker;}else{this._startWorker(worker);return worker;}}else{throw new Error('no worker with role "'+role+'" active');}},_startWorker:function(worker){worker.instance=new this.Worker(worker.url+'?time='+Date.now());worker.instance.onerror=this._onWorkerError.bind(this,worker);worker.instance.onmessage=this._onWorkerMessage.bind(this,worker);this._scheduleCleanup(worker);},request:function(role){var args=Array.prototype.slice.call(arguments,1);var callback=args.pop();var worker=null;try{worker=this._ensureActiveWorker(role);}catch(e){callback(e);return;}
var data={id:this._lastId++,role:role,payload:args};this._addPending(worker,{id:data.id,callback:callback});worker.instance.postMessage(['_dispatch',data]);},stream:function(role){var args=Array.prototype.slice.call(arguments,1);var stream=new Responder();var self=this;var data={id:this._lastId++,role:role,payload:args,type:'stream'};stream.request=function(callback){var worker=null;stream.request=function(){throw new Error('stream request has been sent');};try{worker=self._ensureActiveWorker(role);}catch(e){callback(e);return;}
self._addPending(worker,{id:data.id,stream:stream,callback:callback});worker.instance.postMessage(['_dispatch',data]);};return stream;}};});define('controllers/service',['require','exports','module','worker/manager','common/debug'],function(require,exports,module){'use strict';var Manager=require('worker/manager');var debug=require('common/debug')('controllers/service');function Service(){Manager.call(this);}
module.exports=Service;Service.prototype={__proto__:Manager.prototype,start:function(){debug('Will load and initialize worker...');this.add('caldav','/js/caldav_worker.js');}};});define('common/is_offline',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(){return(navigator&&'onLine'in navigator)?!navigator.onLine:true;};});define('controllers/sync',['require','exports','module','common/responder','core','common/is_offline'],function(require,exports,module){'use strict';var Responder=require('common/responder');var core=require('core');var isOffline=require('common/is_offline');function Sync(){this.pending=0;Responder.call(this);}
module.exports=Sync;Sync.prototype={__proto__:Responder.prototype,startEvent:'syncStart',completeEvent:'syncComplete',_incrementPending:function(){if(!this.pending){this.emit('syncStart');}
this.pending++;},_resolvePending:function(){if(!(--this.pending)){this.emit('syncComplete');}
if(this.pending<0){dump('\n\n Error calendar sync .pending is < 0 \n\n');}},all:function(callback){if(callback){this.once('syncComplete',callback);}
if(isOffline()){this.emit('offline');this.emit('syncComplete');return;}
var account=core.storeFactory.get('Account');account.all(function(err,list){for(var key in list){this.account(list[key]);}
if(!this.pending){this.emit('syncComplete');}}.bind(this));},calendar:function(account,calendar,callback){var store=core.storeFactory.get('Calendar');var self=this;this._incrementPending();store.sync(account,calendar,err=>{self._resolvePending();this.handleError(err,callback);});},account:function(account,callback){var storeFactory=core.storeFactory;var accountStore=storeFactory.get('Account');var calendarStore=storeFactory.get('Calendar');var self=this;this._incrementPending();accountStore.sync(account,err=>{if(err){self._resolvePending();return this.handleError(err,callback);}
var pending=0;function next(){if(!(--pending)){self._resolvePending();if(callback){callback();}}}
function fetchCalendars(err,calendars){if(err){self._resolvePending();return self.handleError(err,callback);}
for(var key in calendars){pending++;self.calendar(account,calendars[key],next);}}
calendarStore.remotesByAccount(account._id,fetchCalendars);});},handleError:function(err,callback){if(callback){return callback(err);}
core.errorController.dispatch(err);}};});define('controllers/time',['require','exports','module','common/calc','common/responder'],function(require,exports,module){'use strict';var isSameDate=require('common/calc').isSameDate;var Responder=require('common/responder');function Time(){Responder.call(this);this._timeCache=Object.create(null);}
module.exports=Time;Time.prototype={__proto__:Responder.prototype,_position:null,_currentTimespan:null,_timeCache:null,_scale:null,_mostRecentDayType:'day',cacheLocked:false,get mostRecentDayType(){return this._mostRecentDayType;},get mostRecentDay(){if(this.mostRecentDayType==='selectedDay'){return this.selectedDay;}else{return this.position;}},get timespan(){return this._currentTimespan;},get scale(){return this._scale;},set scale(value){var oldValue=this._scale;if(value!==oldValue){this._scale=value;this.emit('scaleChange',value,oldValue);}},get selectedDay(){return this._selectedDay;},set selectedDay(value){var day=this._selectedDay;this._mostRecentDayType='selectedDay';if(!day||!isSameDate(day,value)){this._selectedDay=value;this.emit('selectedDayChange',value,day);}},moveToMostRecentDay:function(){if(this.mostRecentDayType==='selectedDay'){this.move(this.selectedDay);}},_updateCache:function(type,value){var old=this._timeCache[type];if(!old||!isSameDate(value,old)){this._timeCache[type]=value;this.emit(type+'Change',value,old);}},get month(){return this._timeCache.month;},get day(){return this._timeCache.day;},get year(){return this._timeCache.year;},get position(){return this._position;},move:function(date){var year=date.getFullYear();var month=date.getMonth();var yearDate=new Date(year,0,1);var monthDate=new Date(year,month,1);this._position=date;this._mostRecentDayType='day';this._updateCache('year',yearDate);this._updateCache('month',monthDate);this._updateCache('day',date);}};});define('common/async_require',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(ids){if(!Array.isArray(ids)){ids=[ids];}
var requireFn=window.requirejs||window.require||require;return new Promise((resolve,reject)=>requireFn(ids,resolve,reject));};});;!function(undefined){var isArray=Array.isArray?Array.isArray:function _isArray(obj){return Object.prototype.toString.call(obj)==="[object Array]";};var defaultMaxListeners=10;function init(){this._events={};if(this._conf){configure.call(this,this._conf);}}
function configure(conf){if(conf){this._conf=conf;conf.delimiter&&(this.delimiter=conf.delimiter);conf.maxListeners&&(this._events.maxListeners=conf.maxListeners);conf.wildcard&&(this.wildcard=conf.wildcard);conf.newListener&&(this.newListener=conf.newListener);if(this.wildcard){this.listenerTree={};}}}
function EventEmitter(conf){this._events={};this.newListener=false;configure.call(this,conf);}
function searchListenerTree(handlers,type,tree,i){if(!tree){return[];}
var listeners=[],leaf,len,branch,xTree,xxTree,isolatedBranch,endReached,typeLength=type.length,currentType=type[i],nextType=type[i+1];if(i===typeLength&&tree._listeners){if(typeof tree._listeners==='function'){handlers&&handlers.push(tree._listeners);return[tree];}else{for(leaf=0,len=tree._listeners.length;leaf<len;leaf++){handlers&&handlers.push(tree._listeners[leaf]);}
return[tree];}}
if((currentType==='*'||currentType==='**')||tree[currentType]){if(currentType==='*'){for(branch in tree){if(branch!=='_listeners'&&tree.hasOwnProperty(branch)){listeners=listeners.concat(searchListenerTree(handlers,type,tree[branch],i+1));}}
return listeners;}else if(currentType==='**'){endReached=(i+1===typeLength||(i+2===typeLength&&nextType==='*'));if(endReached&&tree._listeners){listeners=listeners.concat(searchListenerTree(handlers,type,tree,typeLength));}
for(branch in tree){if(branch!=='_listeners'&&tree.hasOwnProperty(branch)){if(branch==='*'||branch==='**'){if(tree[branch]._listeners&&!endReached){listeners=listeners.concat(searchListenerTree(handlers,type,tree[branch],typeLength));}
listeners=listeners.concat(searchListenerTree(handlers,type,tree[branch],i));}else if(branch===nextType){listeners=listeners.concat(searchListenerTree(handlers,type,tree[branch],i+2));}else{listeners=listeners.concat(searchListenerTree(handlers,type,tree[branch],i));}}}
return listeners;}
listeners=listeners.concat(searchListenerTree(handlers,type,tree[currentType],i+1));}
xTree=tree['*'];if(xTree){searchListenerTree(handlers,type,xTree,i+1);}
xxTree=tree['**'];if(xxTree){if(i<typeLength){if(xxTree._listeners){searchListenerTree(handlers,type,xxTree,typeLength);}
for(branch in xxTree){if(branch!=='_listeners'&&xxTree.hasOwnProperty(branch)){if(branch===nextType){searchListenerTree(handlers,type,xxTree[branch],i+2);}else if(branch===currentType){searchListenerTree(handlers,type,xxTree[branch],i+1);}else{isolatedBranch={};isolatedBranch[branch]=xxTree[branch];searchListenerTree(handlers,type,{'**':isolatedBranch},i+1);}}}}else if(xxTree._listeners){searchListenerTree(handlers,type,xxTree,typeLength);}else if(xxTree['*']&&xxTree['*']._listeners){searchListenerTree(handlers,type,xxTree['*'],typeLength);}}
return listeners;}
function growListenerTree(type,listener){type=typeof type==='string'?type.split(this.delimiter):type.slice();for(var i=0,len=type.length;i+1<len;i++){if(type[i]==='**'&&type[i+1]==='**'){return;}}
var tree=this.listenerTree;var name=type.shift();while(name){if(!tree[name]){tree[name]={};}
tree=tree[name];if(type.length===0){if(!tree._listeners){tree._listeners=listener;}
else if(typeof tree._listeners==='function'){tree._listeners=[tree._listeners,listener];}
else if(isArray(tree._listeners)){tree._listeners.push(listener);if(!tree._listeners.warned){var m=defaultMaxListeners;if(typeof this._events.maxListeners!=='undefined'){m=this._events.maxListeners;}
if(m>0&&tree._listeners.length>m){tree._listeners.warned=true;console.error('(node) warning: possible EventEmitter memory '+'leak detected. %d listeners added. '+'Use emitter.setMaxListeners() to increase limit.',tree._listeners.length);console.trace();}}}
return true;}
name=type.shift();}
return true;}
EventEmitter.prototype.delimiter='.';EventEmitter.prototype.setMaxListeners=function(n){this._events||init.call(this);this._events.maxListeners=n;if(!this._conf)this._conf={};this._conf.maxListeners=n;};EventEmitter.prototype.event='';EventEmitter.prototype.once=function(event,fn){this.many(event,1,fn);return this;};EventEmitter.prototype.many=function(event,ttl,fn){var self=this;if(typeof fn!=='function'){throw new Error('many only accepts instances of Function');}
function listener(){if(--ttl===0){self.off(event,listener);}
fn.apply(this,arguments);}
listener._origin=fn;this.on(event,listener);return self;};EventEmitter.prototype.emit=function(){this._events||init.call(this);var type=arguments[0];if(type==='newListener'&&!this.newListener){if(!this._events.newListener){return false;}}
if(this._all){var l=arguments.length;var args=new Array(l-1);for(var i=1;i<l;i++)args[i-1]=arguments[i];for(i=0,l=this._all.length;i<l;i++){this.event=type;this._all[i].apply(this,args);}}
if(type==='error'){if(!this._all&&!this._events.error&&!(this.wildcard&&this.listenerTree.error)){if(arguments[1]instanceof Error){throw arguments[1];}else{throw new Error("Uncaught, unspecified 'error' event.");}
return false;}}
var handler;if(this.wildcard){handler=[];var ns=typeof type==='string'?type.split(this.delimiter):type.slice();searchListenerTree.call(this,handler,ns,this.listenerTree,0);}
else{handler=this._events[type];}
if(typeof handler==='function'){this.event=type;if(arguments.length===1){handler.call(this);}
else if(arguments.length>1)
switch(arguments.length){case 2:handler.call(this,arguments[1]);break;case 3:handler.call(this,arguments[1],arguments[2]);break;default:var l=arguments.length;var args=new Array(l-1);for(var i=1;i<l;i++)args[i-1]=arguments[i];handler.apply(this,args);}
return true;}
else if(handler){var l=arguments.length;var args=new Array(l-1);for(var i=1;i<l;i++)args[i-1]=arguments[i];var listeners=handler.slice();for(var i=0,l=listeners.length;i<l;i++){this.event=type;listeners[i].apply(this,args);}
return(listeners.length>0)||!!this._all;}
else{return!!this._all;}};EventEmitter.prototype.on=function(type,listener){if(typeof type==='function'){this.onAny(type);return this;}
if(typeof listener!=='function'){throw new Error('on only accepts instances of Function');}
this._events||init.call(this);this.emit('newListener',type,listener);if(this.wildcard){growListenerTree.call(this,type,listener);return this;}
if(!this._events[type]){this._events[type]=listener;}
else if(typeof this._events[type]==='function'){this._events[type]=[this._events[type],listener];}
else if(isArray(this._events[type])){this._events[type].push(listener);if(!this._events[type].warned){var m=defaultMaxListeners;if(typeof this._events.maxListeners!=='undefined'){m=this._events.maxListeners;}
if(m>0&&this._events[type].length>m){this._events[type].warned=true;console.error('(node) warning: possible EventEmitter memory '+'leak detected. %d listeners added. '+'Use emitter.setMaxListeners() to increase limit.',this._events[type].length);console.trace();}}}
return this;};EventEmitter.prototype.onAny=function(fn){if(typeof fn!=='function'){throw new Error('onAny only accepts instances of Function');}
if(!this._all){this._all=[];}
this._all.push(fn);return this;};EventEmitter.prototype.addListener=EventEmitter.prototype.on;EventEmitter.prototype.off=function(type,listener){if(typeof listener!=='function'){throw new Error('removeListener only takes instances of Function');}
var handlers,leafs=[];if(this.wildcard){var ns=typeof type==='string'?type.split(this.delimiter):type.slice();leafs=searchListenerTree.call(this,null,ns,this.listenerTree,0);}
else{if(!this._events[type])return this;handlers=this._events[type];leafs.push({_listeners:handlers});}
for(var iLeaf=0;iLeaf<leafs.length;iLeaf++){var leaf=leafs[iLeaf];handlers=leaf._listeners;if(isArray(handlers)){var position=-1;for(var i=0,length=handlers.length;i<length;i++){if(handlers[i]===listener||(handlers[i].listener&&handlers[i].listener===listener)||(handlers[i]._origin&&handlers[i]._origin===listener)){position=i;break;}}
if(position<0){continue;}
if(this.wildcard){leaf._listeners.splice(position,1);}
else{this._events[type].splice(position,1);}
if(handlers.length===0){if(this.wildcard){delete leaf._listeners;}
else{delete this._events[type];}}
return this;}
else if(handlers===listener||(handlers.listener&&handlers.listener===listener)||(handlers._origin&&handlers._origin===listener)){if(this.wildcard){delete leaf._listeners;}
else{delete this._events[type];}}}
return this;};EventEmitter.prototype.offAny=function(fn){var i=0,l=0,fns;if(fn&&this._all&&this._all.length>0){fns=this._all;for(i=0,l=fns.length;i<l;i++){if(fn===fns[i]){fns.splice(i,1);return this;}}}else{this._all=[];}
return this;};EventEmitter.prototype.removeListener=EventEmitter.prototype.off;EventEmitter.prototype.removeAllListeners=function(type){if(arguments.length===0){!this._events||init.call(this);return this;}
if(this.wildcard){var ns=typeof type==='string'?type.split(this.delimiter):type.slice();var leafs=searchListenerTree.call(this,null,ns,this.listenerTree,0);for(var iLeaf=0;iLeaf<leafs.length;iLeaf++){var leaf=leafs[iLeaf];leaf._listeners=null;}}
else{if(!this._events[type])return this;this._events[type]=null;}
return this;};EventEmitter.prototype.listeners=function(type){if(this.wildcard){var handlers=[];var ns=typeof type==='string'?type.split(this.delimiter):type.slice();searchListenerTree.call(this,handlers,ns,this.listenerTree,0);return handlers;}
this._events||init.call(this);if(!this._events[type])this._events[type]=[];if(!isArray(this._events[type])){this._events[type]=[this._events[type]];}
return this._events[type];};EventEmitter.prototype.listenersAny=function(){if(this._all){return this._all;}
else{return[];}};if(typeof define==='function'&&define.amd){define('ext/eventemitter2',[],function(){return EventEmitter;});}else if(typeof exports==='object'){exports.EventEmitter2=EventEmitter;}
else{window.EventEmitter2=EventEmitter;}}();define('common/binsearch',['require','exports','module'],function(require,exports){'use strict';exports.find=function(list,seekVal,cmpfunc,aLow,aHigh){var low=((aLow===undefined)?0:aLow),high=((aHigh===undefined)?(list.length-1):aHigh),mid,cmpval;while(low<=high){mid=low+Math.floor((high-low)/2);cmpval=cmpfunc(seekVal,list[mid]);if(cmpval<0){high=mid-1;}else if(cmpval>0){low=mid+1;}else{return mid;}}
return null;};exports.insert=function(list,seekVal,cmpfunc){if(!list.length){return 0;}
var low=0,high=list.length-1,mid,cmpval;while(low<=high){mid=low+Math.floor((high-low)/2);cmpval=cmpfunc(seekVal,list[mid]);if(cmpval<0){high=mid-1;}else if(cmpval>0){low=mid+1;}else{break;}}
if(cmpval<0){return mid;}else if(cmpval>0){return mid+1;}else{return mid;}};});define('common/compare',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(a,b){if(a>b){return 1;}
if(a<b){return-1;}
return 0;};});define('utils/mout',['require','exports','module'],function(require,exports){'use strict';exports.norm=function norm(val,min,max){if(val===min&&min===max){return 1;}
return(val-min)/(max-min);};exports.clamp=function clamp(val,min,max){return val<min?min:(val>max?max:val);};exports.round=function round(value,radix){radix=radix||1;return Math.round(value/radix)*radix;};exports.floor=function floor(val,step){step=Math.abs(step||1);return Math.floor(val/step)*step;};exports.ceil=function ceil(val,step){step=Math.abs(step||1);return Math.ceil(val/step)*step;};exports.lerp=function lerp(ratio,start,end){return start+(end-start)*ratio;};exports.debounce=function debounce(fn,threshold,isAsap){var timeout,result;function debounced(){var args=arguments,context=this;function delayed(){if(!isAsap){result=fn.apply(context,args);}
timeout=null;}
if(timeout){clearTimeout(timeout);}else if(isAsap){result=fn.apply(context,args);}
timeout=setTimeout(delayed,threshold);return result;}
debounced.cancel=function(){clearTimeout(timeout);};return debounced;};exports.throttle=function throttle(fn,delay){var context,timeout,result,args,diff,prevCall=0;function delayed(){prevCall=Date.now();timeout=null;result=fn.apply(context,args);}
function throttled(){context=this;args=arguments;diff=delay-(Date.now()-prevCall);if(diff<=0){clearTimeout(timeout);delayed();}else if(!timeout){timeout=setTimeout(delayed,diff);}
return result;}
throttled.cancel=function(){clearTimeout(timeout);};return throttled;};});define('day_observer',['require','exports','module','common/calc','ext/eventemitter2','common/binsearch','common/compare','core','utils/mout'],function(require,exports){'use strict';var Calc=require('common/calc');var EventEmitter2=require('ext/eventemitter2');var binsearch=require('common/binsearch');var compare=require('common/compare');var core=require('core');var daysBetween=Calc.daysBetween;var debounce=require('utils/mout').debounce;var getDayId=Calc.getDayId;var isAllDay=Calc.isAllDay;var spanOfMonth=Calc.spanOfMonth;var DISPATCH_DELAY=25;var MAX_CACHED_MONTHS=5;var busytimes=new Map();var events=new Map();var eventsToBusytimes=new Map();var cache=new Map();var dayQueue=new Set();var cachedSpans=[];var cacheLocked=false;var emitter=exports.emitter=new EventEmitter2();exports.init=function(){var eventStore=core.storeFactory.get('Event');eventStore.on('persist',(id,event)=>cacheEvent(event));eventStore.on('remove',removeEventById);var busytimeStore=core.storeFactory.get('Busytime');busytimeStore.on('persist',(id,busy)=>cacheBusytime(busy));busytimeStore.on('remove',removeBusytimeById);core.syncController.on('syncStart',()=>{cacheLocked=true;});core.syncController.on('syncComplete',()=>{cacheLocked=false;pruneCache();dispatch();});var calendarStore=core.storeFactory.get('Calendar');calendarStore.on('calendarVisibilityChange',(id,calendar)=>{var type=calendar.localDisplayed?'add':'remove';busytimes.forEach((busy,busyId)=>{if(busy.calendarId===id){registerBusytimeChange(busyId,type);}});});core.timeController.on('monthChange',loadMonth);var month=core.timeController.month;if(month){loadMonth(month);}};exports.on=function(date,callback){var dayId=getDayId(date);callback(getDay(dayId,date));emitter.on(dayId,callback);};function getDay(dayId,date){if(cache.has(dayId)){return cache.get(dayId);}
var day={dayId:dayId,date:date,amount:0,basic:[],allday:[]};cache.set(dayId,day);return day;}
exports.off=function(date,callback){emitter.off(getDayId(date),callback);};exports.removeAllListeners=function(){emitter.removeAllListeners();};exports.findAssociated=function(busytimeId){return queryBusytime(busytimeId).then(busytime=>{return queryEvent(busytime.eventId).then(event=>{return{busytime:busytime,event:event};});});};function queryBusytime(busytimeId){if(busytimes.has(busytimeId)){return Promise.resolve(busytimes.get(busytimeId));}
var busytimeStore=core.storeFactory.get('Busytime');return busytimeStore.get(busytimeId);}
function queryEvent(eventId){if(events.has(eventId)){return Promise.resolve(events.get(eventId));}
var eventStore=core.storeFactory.get('Event');return eventStore.get(eventId);}
function cacheBusytime(busy){var{_id,startDate,endDate,eventId}=busy;if(outsideSpans(startDate)&&outsideSpans(endDate)){return;}
busytimes.set(_id,busy);eventsToBusytimes.get(eventId).push(_id);registerBusytimeChange(_id);}
function removeBusytimeById(id){var busy=busytimes.get(id);if(!busy){return;}
var eventId=busy.eventId;var ids=eventsToBusytimes.get(eventId).filter(i=>i!==id);eventsToBusytimes.set(eventId,ids);removeEventIfNoBusytimes(ids,eventId);registerBusytimeChange(id,'remove');busytimes.delete(id);}
function cacheEvent(event){var id=event._id;events.set(id,event);if(!eventsToBusytimes.has(id)){eventsToBusytimes.set(id,[]);}}
function removeEventById(id){events.delete(id);eventsToBusytimes.delete(id);}
function registerBusytimeChange(id,type){var busy=busytimes.get(id);var{startDate,endDate}=busy;var end=new Date(endDate.getTime()-1);var calendarStore=core.storeFactory.get('Calendar');var isRemove=type==='remove'||!calendarStore.shouldDisplayCalendar(busy.calendarId);daysBetween(startDate,end).forEach(date=>{if(outsideSpans(date)){return;}
var dayId=getDayId(date);if(isRemove&&!cache.has(dayId)){return;}
var day=getDay(dayId,date);day.basic=day.basic.filter(r=>r.busytime._id!==id);day.allday=day.allday.filter(r=>r.busytime._id!==id);if(!isRemove){var group=isAllDay(date,startDate,endDate)?day.allday:day.basic;sortedInsert(group,busy);}
day.amount=day.basic.length+day.allday.length;dayQueue.add(dayId);});dispatch();}
function sortedInsert(group,busy){var index=binsearch.insert(group,busy.startDate,(date,record)=>{return compare(date,record.busytime.startDate);});var event=events.get(busy.eventId);var calendarStore=core.storeFactory.get('Calendar');group.splice(index,0,{event:event,busytime:busy,color:calendarStore.getColorByCalendarId(event.calendarId)});}
var dispatch=debounce(function(){dayQueue.forEach(id=>{dayQueue.delete(id);if(cache.has(id)){emitter.emit(id,cache.get(id));}});},DISPATCH_DELAY);function loadMonth(newMonth){var span=spanOfMonth(newMonth);var toLoad=span;cachedSpans.every(cached=>toLoad=cached.trimOverlap(toLoad));if(!toLoad){return;}
cachedSpans.push(span);var busytimeStore=core.storeFactory.get('Busytime');busytimeStore.loadSpan(toLoad,onBusytimeSpanLoad);}
function onBusytimeSpanLoad(err,busytimes){if(err){console.error('Error loading Busytimes from TimeSpan:',err.toString());return;}
var eventIds=Array.from(new Set(busytimes.map(b=>b.eventId).filter(id=>!events.has(id))));var eventStore=core.storeFactory.get('Event');eventStore.findByIds(eventIds).then(events=>{Object.keys(events).forEach(key=>cacheEvent(events[key]));busytimes.forEach(cacheBusytime);pruneCache();});}
function pruneCache(){if(cacheLocked){return;}
trimCachedSpans();cache.forEach(removeDayFromCacheIfOutsideSpans);eventsToBusytimes.forEach(removeEventIfNoBusytimes);}
function trimCachedSpans(){while(cachedSpans.length>MAX_CACHED_MONTHS){var baseDate=core.timeController.month;var maxDiff=0;var maxDiffIndex=0;cachedSpans.forEach((span,i)=>{var diff=Math.abs(span.start-baseDate);if(diff>maxDiff){maxDiff=diff;maxDiffIndex=i;}});cachedSpans.splice(maxDiffIndex,1);}}
function removeDayFromCacheIfOutsideSpans(day,id){if(outsideSpans(day.date)){day.basic.forEach(removeRecordIfOutsideSpans);day.allday.forEach(removeRecordIfOutsideSpans);cache.delete(id);}}
function outsideSpans(date){return!cachedSpans.some(timespan=>timespan.contains(date));}
function removeRecordIfOutsideSpans(record){removeBusytimeIfOutsideSpans(record.busytime);}
function removeBusytimeIfOutsideSpans(busytime){var{_id,startDate,endDate}=busytime;if(outsideSpans(startDate)&&outsideSpans(endDate)){removeBusytimeById(_id);}}
function removeEventIfNoBusytimes(ids,eventId){if(!ids.length){removeEventById(eventId);}}});define('common/object',['require','exports','module'],function(require,exports,module){'use strict';exports.filter=function(obj,fn,thisArg){var results=[];exports.forEach(obj,function(key,value){if(fn.call(thisArg,key,value)){results.push(value);}});return results;};exports.forEach=function(obj,fn,thisArg){exports.map(obj,fn,thisArg);};exports.map=function(obj,fn,thisArg){var results=[];Object.keys(obj).forEach((key)=>{var value=obj[key];var result=fn.call(thisArg,key,value);results.push(result);});return results;};exports.values=function(obj){return exports.map(obj,(key,value)=>{return value;});};});define('bridge',['require','exports','module','ext/eventemitter2','ext/co','core','day_observer','common/next_tick','common/object'],function(require,exports){'use strict';var EventEmitter2=require('ext/eventemitter2');var co=require('ext/co');var core=require('core');var dayObserver=require('day_observer');var nextTick=require('common/next_tick');var object=require('common/object');exports.fetchRecord=function(busytimeId){return co(function*(){var record=yield dayObserver.findAssociated(busytimeId);var eventStore=core.storeFactory.get('Event');var owners=yield eventStore.ownersOf(record.event);var provider=core.providerFactory.get(owners.account.providerType);var capabilities=yield provider.eventCapabilities(record.event);record.calendar=owners.calendar;record.account=owners.account;record.capabilities=capabilities;return record;});};exports.observeCalendars=function(){var stream=new FakeClientStream();var calendarStore=core.storeFactory.get('Calendar');var getAllAndWrite=co.wrap(function*(){var calendars=yield calendarStore.all();var data=yield object.map(calendars,co.wrap(function*(id,calendar){var caps;try{var provider=yield calendarStore.providerFor(calendar);caps=provider.calendarCapabilities(calendar);}catch(error){console.error(error);return false;}
return{calendar:calendar,capabilities:caps};}));stream.write(data.filter(element=>!!element));});calendarStore.on('add',getAllAndWrite);calendarStore.on('remove',getAllAndWrite);calendarStore.on('update',getAllAndWrite);stream.cancel=function(){calendarStore.off('add',getAllAndWrite);calendarStore.off('remove',getAllAndWrite);calendarStore.off('update',getAllAndWrite);stream._cancel();};nextTick(getAllAndWrite);return stream;};exports.updateCalendar=function(calendar){var calendarStore=core.storeFactory.get('Calendar');return calendarStore.persist(calendar);};exports.createEvent=function(event){return persistEvent(event,'create','canCreate');};exports.updateEvent=function(event){return persistEvent(event,'update','canUpdate');};exports.deleteEvent=function(event){return persistEvent(event,'delete','canDelete');};var persistEvent=co.wrap(function*(event,action,capability){event=event.data||event;try{var eventStore=core.storeFactory.get('Event');var provider=yield eventStore.providerFor(event);var caps=yield provider.eventCapabilities(event);if(!caps[capability]){return Promise.reject(new Error(`Can't ${action} event`));}
return provider[action+'Event'](event);}catch(err){console.error(`${action} Error for event "${event._id}" `+`on calendar "${event.calendarId}"`);console.error(err);return Promise.reject(err);}});exports.getSetting=function(id){var settingStore=core.storeFactory.get('Setting');return settingStore.getValue(id);};exports.setSetting=function(id,value){var settingStore=core.storeFactory.get('Setting');return settingStore.set(id,value);};exports.observeSetting=function(id){var stream=new FakeClientStream();var settingStore=core.storeFactory.get('Setting');var writeOnChange=function(value){stream.write(value);};settingStore.on(`${id}Change`,writeOnChange);stream.cancel=function(){settingStore.off(`${id}Change`,writeOnChange);stream._cancel();};exports.getSetting(id).then(writeOnChange);return stream;};exports.getAccount=function(id){var accountStore=core.storeFactory.get('Account');return accountStore.get(id);};exports.deleteAccount=function(id){var accountStore=core.storeFactory.get('Account');return accountStore.remove(id);};exports.createAccount=co.wrap(function*(model){var storeFactory=core.storeFactory;var accountStore=storeFactory.get('Account');var calendarStore=storeFactory.get('Calendar');var[,result]=yield accountStore.verifyAndPersist(model);yield accountStore.sync(result);var calendars=yield calendarStore.remotesByAccount(result._id);for(var key in calendars){core.syncController.calendar(result,calendars[key]);}
return result;});exports.observeAccounts=function(){var stream=new FakeClientStream();var accountStore=core.storeFactory.get('Account');var getAllAndWrite=co.wrap(function*(){try{var accounts=yield accountStore.all();var data=object.map(accounts,(id,account)=>{return{account:account,provider:core.providerFactory.get(account.providerType)};});stream.write(data);}catch(err){console.error(`Error fetching accounts: ${err.message}`);}});accountStore.on('add',getAllAndWrite);accountStore.on('remove',getAllAndWrite);accountStore.on('update',getAllAndWrite);stream.cancel=function(){accountStore.off('add',getAllAndWrite);accountStore.off('remove',getAllAndWrite);accountStore.off('update',getAllAndWrite);stream._cancel();};nextTick(getAllAndWrite);return stream;};exports.observeDay=function(date){var stream=new FakeClientStream();var emit=stream.write.bind(stream);stream.cancel=function(){dayObserver.off(date,emit);stream._cancel();};nextTick(()=>dayObserver.on(date,emit));return stream;};exports.availablePresets=function(presetList){var accountStore=core.storeFactory.get('Account');return accountStore.availablePresets(presetList);};function FakeClientStream(){this._emitter=new EventEmitter2();this._enabled=true;}
FakeClientStream.prototype.write=function(data){this._enabled&&this._emitter.emit('data',data);};FakeClientStream.prototype.listen=function(callback){this._enabled&&this._emitter.on('data',callback);};FakeClientStream.prototype.unlisten=function(callback){this._enabled&&this._emitter.off('data',callback);};FakeClientStream.prototype._cancel=function(){this._emitter.removeAllListeners();this._enabled=false;};});(function(global){'use strict';const helperCache=new Map();const knownObjects={datetime:{create:function(options){const customOptions=Object.assign({},options);if(options.hour){customOptions.hour12=navigator.mozHour12;}
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
window.addEventListener('timeformatchange',global.IntlHelper,false);window.addEventListener('languagechange',global.IntlHelper,false);window.addEventListener('moztimechange',global.IntlHelper,false);})(this);define("shared/intl_helper",(function(global){return function(){var ret,fn;return ret||global.IntlHelper;};}(this)));define('date_l10n',['require','exports','module','shared/intl_helper'],function(require,exports){'use strict';var IntlHelper=require('shared/intl_helper');exports.init=function(){window.addEventListener('localized',exports._localizeElements);window.addEventListener('timeformatchange',exports._localizeElements);};exports._localizeElements=function(){var elements=document.querySelectorAll('[data-l10n-date-format]');for(var i=0;i<elements.length;i++){exports._localizeElement(elements[i]);}};exports._localizeElement=function(element){var date=element.dataset.date;if(!date){return;}
var format=element.dataset.l10nDateFormat;var formatter=IntlHelper.get(format);var text;if(format==='week-hour-format'){text=formatter.format(new Date(date),{dayperiod:'<span class="ampm" aria-hidden="true">$&</span>',});}else{text=formatter.format(new Date(date));}
element.textContent=text;};});define('intl',['require','exports','module','shared/intl_helper'],function(require,exports){'use strict';var IntlHelper=require('shared/intl_helper');exports.init=function init(){IntlHelper.define('months-day-view-header-format','datetime',{weekday:'long',month:'short',day:'numeric'});IntlHelper.define('multi-month-view-header-format','datetime',{month:'short',year:'numeric'});IntlHelper.define('day-view-header-format','datetime',{month:'short',day:'numeric',weekday:'long'});IntlHelper.define('shortTimeFormat','datetime',{hour:'numeric',minute:'numeric'});};});define('message_handler',['require','exports','module','common/responder','common/debug','notification'],function(require,exports,module){'use strict';var Responder=require('common/responder');var debug=require('common/debug')('message_handler');var notification=require('notification');var responder=exports.responder=new Responder();exports.start=function(){if(!('mozSetMessageHandler'in navigator)){debug('mozSetMessageHandler is missing!');return;}
debug('Will listen for alarm messages...');navigator.mozSetMessageHandler('alarm',message=>{debug('Received alarm message!');var data=message.data;switch(data.type){case'sync':responder.emitWhenListener('sync');break;default:responder.emitWhenListener('alarm',data);break;}});debug('Will listen for notification messages...');navigator.mozSetMessageHandler('notification',message=>{debug('Received notification message!');if(!message.clicked){return debug('Notification was not clicked?');}
var url=message.imageURL.split('?')[1];notification.launch(url);});};});define('controllers/notifications',['require','exports','module','common/calc','ext/co','core','common/debug','message_handler','notification'],function(require,exports){'use strict';var calc=require('common/calc');var co=require('ext/co');var core=require('core');var debug=require('common/debug')('controllers/notifications');var messageHandler=require('message_handler');var notification=require('notification');exports.observe=function(){debug('Will start notifications controller...');messageHandler.responder.on('alarm',exports.onAlarm);};exports.unobserve=function(){messageHandler.responder.off('alarm',exports.onAlarm);};exports.onAlarm=co.wrap(function*(alarm){var storeFactory=core.storeFactory;var alarmStore=storeFactory.get('Alarm');alarm=yield alarmStore.get(alarm._id);debug('Will request cpu wake lock...');var lock=navigator.requestWakeLock('cpu');debug('Received cpu lock. Will issue notification...');try{yield issueNotification(alarm);}catch(err){console.error('[controllers/notifications]',err.toString());}finally{debug('Will release cpu wake lock...');lock.unlock();}
alarm.fired=true;yield alarmStore.persist(alarm);});var issueNotification=co.wrap(function*(alarm){if(alarm.fired){return;}
var storeFactory=core.storeFactory;var eventStore=storeFactory.get('Event');var busytimeStore=storeFactory.get('Busytime');var trans=core.db.transaction(['busytimes','events']);var[event,busytime]=yield Promise.all([eventStore.get(alarm.eventId,trans),busytimeStore.get(alarm.busytimeId,trans)]);if(!event){throw new Error(`can't find event with ID: ${alarm.eventId}`);}
if(!busytime){throw new Error(`can't find busytime with ID: ${alarm.busytimeId}`);}
var begins=calc.dateFromTransport(busytime.start);var formatter=mozIntl._gaia.RelativeDate(navigator.languages);var distance=yield formatter.format(begins);var now=new Date();var alarmType=begins>now?'alarm-start-notice':'alarm-started-notice';var titleL10n={id:alarmType,args:{title:event.remote.title,distance:distance}};var bodyL10n={raw:event.remote.description||''};debug('Will send event notification with title',titleL10n,'body:',bodyL10n);return notification.sendNotification(titleL10n,bodyL10n,`/alarm-display/${busytime._id}`,{id:event.remote.id});});});define('controllers/periodic_sync',['require','exports','module','common/responder','core','common/debug','message_handler'],function(require,exports){'use strict';var Responder=require('common/responder');var core=require('core');var debug=require('common/debug')('controllers/periodic_sync');var messageHandler=require('message_handler');var syncAlarm;var prevSyncFrequency;var syncFrequency;var syncing;var scheduling;var events=new Responder();exports.events=events;var accounts;var settings;exports.observe=function(){debug('Will start periodic sync controller...');var storeFactory=core.storeFactory;accounts=storeFactory.get('Account');settings=storeFactory.get('Setting');return Promise.all([settings.getValue('syncAlarm'),settings.getValue('syncFrequency')]).then(values=>{[syncAlarm,syncFrequency]=values;accounts.on('persist',onAccountsChange);accounts.on('remove',onAccountsChange);debug('Will listen for syncFrequencyChange...');settings.on('syncFrequencyChange',exports);messageHandler.responder.on('sync',exports);return scheduleSync();});};exports.unobserve=function(){syncAlarm=null;prevSyncFrequency=null;syncFrequency=null;syncing=null;scheduling=null;accounts.off('persist',onAccountsChange);accounts.off('remove',onAccountsChange);settings.off('syncFrequencyChange',exports);messageHandler.responder.off('sync',exports);};exports.handleEvent=function(event){switch(event.type){case'sync':return onSync();case'syncFrequencyChange':debug('Received syncFrequencyChange!');return onSyncFrequencyChange(event.data[0]);}};function onSync(){return sync().then(scheduleSync);}
function onSyncFrequencyChange(value){debug('Sync frequency changed to',value);syncFrequency=value;return maybeScheduleSync();}
function onAccountsChange(){debug('Looking up syncable accounts...');return accounts.syncableAccounts().then(syncable=>{if(!syncable||!syncable.length){debug('There are no syncable accounts!');revokePreviousAlarm();events.emit('pause');return;}
debug('There are',syncable.length,'syncable accounts');if(!syncAlarmIssued()){debug('The first syncable account was just added.');return scheduleSync();}});}
function sync(){if(!syncing){syncing=new Promise((resolve,reject)=>{debug('Will request cpu and wifi wake locks...');var cpuLock=navigator.requestWakeLock('cpu');var wifiLock=navigator.requestWakeLock('wifi');debug('Will start periodic sync...');core.syncController.all(()=>{debug('Sync complete! Will release cpu and wifi wake locks...');cpuLock.unlock();wifiLock.unlock();events.emit('sync');syncing=null;resolve();});});}
return syncing;}
function scheduleSync(){if(scheduling){return scheduling;}
scheduling=accounts.syncableAccounts().then(syncable=>{if(!syncable||!syncable.length){debug('There seem to be no syncable accounts, will defer scheduling...');return Promise.resolve();}
debug('Will schedule periodic sync in:',syncFrequency);prevSyncFrequency=syncFrequency;revokePreviousAlarm();return issueSyncAlarm().then(cacheSyncAlarm).then(maybeScheduleSync);}).then(()=>{events.emit('schedule');scheduling=null;}).catch(error=>{debug('Error scheduling sync:',error);console.error(error.toString());scheduling=null;});return scheduling;}
function revokePreviousAlarm(){if(!syncAlarmIssued()){debug('No sync alarms issued, nothing to revoke...');return;}
debug('Will revoke alarm',syncAlarm.alarmId);var alarms=navigator.mozAlarms;alarms.remove(syncAlarm.alarmId);}
function issueSyncAlarm(){if(!prevSyncFrequency){debug('Periodic sync disabled!');return Promise.resolve({alarmId:null,start:null,end:null});}
var start=new Date();var end=new Date(start.getTime()+
prevSyncFrequency*60*1000);var alarms=navigator.mozAlarms;var request=alarms.add(end,'ignoreTimezone',{type:'sync'});return new Promise((resolve,reject)=>{request.onsuccess=function(){resolve({alarmId:this.result,start:start,end:end});};request.onerror=function(){reject(this.error);};});}
function cacheSyncAlarm(alarm){debug('Will save alarm:',alarm);syncAlarm=alarm;return settings.set('syncAlarm',syncAlarm);}
function maybeScheduleSync(){if(syncFrequency===prevSyncFrequency){return Promise.resolve();}
if(scheduling){return scheduling.then(scheduleSync);}
return scheduleSync();}
function syncAlarmIssued(){return syncAlarm&&!!syncAlarm.alarmId;}});define('provider/caldav_pull_events',['require','exports','module','common/calc','core','common/debug','ext/uuid'],function(require,exports,module){'use strict';var Calc=require('common/calc');var core=require('core');var debug=require('common/debug')('pull events');var uuid=require('ext/uuid');function PullEvents(stream,options){if(options.calendar){this.calendar=options.calendar;}else{throw new Error('.calendar option must be given');}
if(options.account){this.account=options.account;}else{throw new Error('.account option must be given');}
stream.on('event',this);stream.on('component',this);stream.on('occurrence',this);stream.on('missingEvents',this);this.icalQueue=[];this.eventQueue=[];this.busytimeQueue=[];this.alarmQueue=[];var storeFactory=core.storeFactory;this._busytimeStore=storeFactory.get('Busytime');this._accountStore=storeFactory.get('Account');this._accountStore.on('remove',this._onRemoveAccount.bind(this));this._aborted=false;this._trans=null;}
module.exports=PullEvents;PullEvents.prototype={eventQueue:null,busytimeQueue:null,busytimeIdFromRemote:function(busytime){var eventId=this.eventIdFromRemote(busytime,!busytime.isException);return busytime.start.utc+'-'+
busytime.end.utc+'-'+
eventId;},eventIdFromRemote:function(event,ignoreException){var id=event.eventId||event.id;if(!ignoreException&&event.recurrenceId){id+='-'+event.recurrenceId.utc;}
return this.calendar._id+'-'+id;},formatEvent:function(event){var id=this.eventIdFromRemote(event,true);var result=Object.create(null);result.calendarId=this.calendar._id;result.remote=event;if(event.recurrenceId){result.parentId=id;result._id=this.eventIdFromRemote(event);}else{result._id=id;}
return result;},formatBusytime:function(time){var eventId=this.eventIdFromRemote(time,!time.isException);var id=eventId+'-'+uuid.v4();var calendarId=this.calendar._id;time._id=id;time.calendarId=calendarId;time.eventId=eventId;if(time.alarms){var i=0;var len=time.alarms.length;var alarm;for(;i<len;i++){alarm=time.alarms[i];alarm.eventId=eventId;alarm.busytimeId=id;}}
return this._busytimeStore.initRecord(time);},handleOccurrenceSync:function(item){var alarms;if('alarms'in item){alarms=item.alarms;delete item.alarms;if(alarms.length){var i=0;var len=alarms.length;var now=Date.now();for(;i<len;i++){var alarm={startDate:{},eventId:item.eventId,busytimeId:item._id};for(var j in item.start){alarm.startDate[j]=item.start[j];}
alarm.startDate.utc+=(alarms[i].trigger*1000);var alarmDate=Calc.dateFromTransport(item.end);if(alarmDate.valueOf()<now){continue;}
this.alarmQueue.push(alarm);}}}
this.busytimeQueue.push(item);},handleComponentSync:function(component){component.eventId=this.eventIdFromRemote(component);component.calendarId=this.calendar._id;if(!component.lastRecurrenceId){delete component.lastRecurrenceId;}
this.icalQueue.push(component);},handleEventSync:function(event){var exceptions=event.remote.exceptions;delete event.remote.exceptions;var id=event._id;this._busytimeStore.removeEvent(id);this.eventQueue.push(event);var component=event.remote.icalComponent;delete event.remote.icalComponent;if(!event.remote.recurrenceId){this.icalQueue.push({data:component,eventId:event._id});}
if(exceptions){for(var i=0;i<exceptions.length;i++){this.handleEventSync(this.formatEvent(exceptions[i]));}}},_onRemoveAccount:function(id){if(id===this.account._id){this.abort();}},abort:function(){if(this._aborted){return;}
this._aborted=true;if(this._trans){this._trans.abort();}},handleEvent:function(event){if(this._aborted){return;}
var data=event.data;switch(event.type){case'missingEvents':this.removeList=data[0];break;case'occurrence':var occur=this.formatBusytime(data[0]);this.handleOccurrenceSync(occur);break;case'component':this.handleComponentSync(data[0]);break;case'event':var e=this.formatEvent(data[0]);this.handleEventSync(e);break;}},commit:function(trans,callback){var storeFactory=core.storeFactory;var eventStore=storeFactory.get('Event');var icalComponentStore=storeFactory.get('IcalComponent');var busytimeStore=storeFactory.get('Busytime');var alarmStore=storeFactory.get('Alarm');if(typeof(trans)==='function'){callback=trans;trans=core.db.transaction(['calendars','events','busytimes','alarms','icalComponents'],'readwrite');}
if(this._aborted){return callback&&callback(null);}
this._trans=trans;var self=this;this.eventQueue.forEach(function(event){debug('add event',event);eventStore.persist(event,trans);});this.icalQueue.forEach(function(ical){debug('add component',ical);icalComponentStore.persist(ical,trans);});this.busytimeQueue.forEach(function(busy){debug('add busytime',busy);busytimeStore.persist(busy,trans);});this.alarmQueue.forEach(function(alarm){debug('add alarm',alarm);alarmStore.persist(alarm,trans);});if(this.removeList){this.removeList.forEach(function(id){eventStore.remove(id,trans);});}
function handleError(e){if(e&&e.type!=='abort'){console.error('Error persisting sync results',e);}
if(e&&e.preventDefault){e.preventDefault();}
self._trans=null;callback&&callback(e);}
trans.addEventListener('error',handleError);trans.addEventListener('abort',handleError);trans.addEventListener('complete',function(){self._trans=null;callback&&callback(null);});return trans;}};});define('provider/caldav',['require','exports','module','./abstract','common/error','common/calc','./caldav_pull_events','common/error','common/error','./local','common/error','core','common/is_offline','event_mutations','common/next_tick'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var Authentication=require('common/error').Authentication;var Calc=require('common/calc');var CaldavPullEvents=require('./caldav_pull_events');var CalendarError=require('common/error');var InvalidServer=require('common/error').InvalidServer;var Local=require('./local');var ServerFailure=require('common/error').ServerFailure;var core=require('core');var isOffline=require('common/is_offline');var mutations=require('event_mutations');var nextTick=require('common/next_tick');var CALDAV_ERROR_MAP={'caldav-authentication':Authentication,'caldav-invalid-entrypoint':InvalidServer,'caldav-server-failure':ServerFailure};function mapError(error,detail){console.error('Error with name:',error.name);var calError=CALDAV_ERROR_MAP[error.name];if(!calError){calError=new CalendarError(error.name,detail);}else{calError=new calError(detail);}
return calError;}
function CaldavProvider(){Abstract.apply(this,arguments);var storeFactory=core.storeFactory;this.service=core.serviceController;this.accounts=storeFactory.get('Account');this.busytimes=storeFactory.get('Busytime');this.events=storeFactory.get('Event');this.icalComponents=storeFactory.get('IcalComponent');}
module.exports=CaldavProvider;CaldavProvider.prototype={__proto__:Abstract.prototype,role:'caldav',useUrl:true,useCredentials:true,canSync:true,canExpandRecurringEvents:true,isOffline:isOffline,daysToSyncInPast:30,canCreateEvent:true,canUpdateEvent:true,canDeleteEvent:true,hasAccountSettings:true,_handleServiceError:function(rawErr,detail){var calendarErr=mapError(rawErr,detail);if(calendarErr instanceof Authentication||calendarErr instanceof InvalidServer){if(detail.account){if(detail.account._id){this.accounts.markWithError(detail.account,calendarErr);}}else{console.error('Permanent server error without an account!');}}
return calendarErr;},calendarCapabilities:function(calendar){var remote=calendar.remote;if(!remote.privilegeSet){return{canUpdateEvent:true,canDeleteEvent:true,canCreateEvent:true};}
var privilegeSet=remote.privilegeSet;var canWriteConent=privilegeSet.indexOf('write-content')!==-1;return{canUpdateEvent:canWriteConent,canCreateEvent:canWriteConent,canDeleteEvent:privilegeSet.indexOf('unbind')!==-1};},eventCapabilities:function(event,callback){if(event.remote.isRecurring){nextTick(function(){callback(null,{canUpdate:false,canDelete:false,canCreate:false});});}else{var calendarStore=core.storeFactory.get('Calendar');calendarStore.get(event.calendarId,function(err,calendar){if(err){return callback(err);}
var caps=this.calendarCapabilities(calendar);callback(null,{canCreate:caps.canCreateEvent,canUpdate:caps.canUpdateEvent,canDelete:caps.canDeleteEvent});}.bind(this));}},getAccount:function(account,callback){if(this.bailWhenOffline(callback)){return;}
var self=this;this.service.request('caldav','getAccount',account,function(err,data){if(err){return callback(self._handleServiceError(err,{account:account}));}
callback(null,data);});},formatRemoteCalendar:function(calendar){if(!calendar.color){calendar.color=this.defaultColor;}
return calendar;},findCalendars:function(account,callback){if(this.bailWhenOffline(callback)){return;}
var self=this;function formatCalendars(err,data){if(err){return callback(self._handleServiceError(err,{account:account}));}
if(data){for(var key in data){data[key]=self.formatRemoteCalendar(data[key]);}}
callback(err,data);}
this.service.request('caldav','findCalendars',account.toJSON(),formatCalendars);},_syncEvents:function(account,calendar,cached,callback){var startDate;if(!calendar.firstEventSyncDate){startDate=Calc.createDay(new Date());calendar.firstEventSyncDate=new Date(startDate.valueOf());}else{startDate=new Date(calendar.firstEventSyncDate.valueOf());}
startDate.setDate(startDate.getDate()-this.daysToSyncInPast);var options={startDate:startDate,cached:cached};var stream=this.service.stream('caldav','streamEvents',account.toJSON(),calendar.remote,options);var pull=new CaldavPullEvents(stream,{account:account,calendar:calendar});var calendarStore=core.storeFactory.get('Calendar');var syncStart=new Date();var self=this;stream.request(function(err){if(err){return callback(self._handleServiceError(err,{account:account,calendar:calendar}));}
var trans=pull.commit(function(commitErr){if(commitErr){callback(err);return;}
callback(null);});calendar.error=undefined;calendar.lastEventSyncToken=calendar.remote.syncToken;calendar.lastEventSyncDate=syncStart;calendarStore.persist(calendar,trans);});return pull;},_cachedEventsFor:function(calendar,callback){var store=core.storeFactory.get('Event');store.eventsForCalendar(calendar._id,function(err,results){if(err){callback(err);return;}
var list=Object.create(null);var i=0;var len=results.length;var item;for(;i<len;i++){item=results[i];list[item.remote.url]={syncToken:item.remote.syncToken,id:item._id};}
callback(null,list);});},syncEvents:function(account,calendar,callback){var self=this;if(this.bailWhenOffline(callback)){return;}
if(!calendar._id){throw new Error('calendar must be assigned an _id');}
if((calendar.lastEventSyncToken&&calendar.lastEventSyncToken===calendar.remote.syncToken)){return nextTick(callback);}
this._cachedEventsFor(calendar,function(err,results){if(err){callback(err);return;}
self._syncEvents(account,calendar,results,callback);});},ensureRecurrencesExpanded:function(maxDate,callback){var self=this;this.icalComponents.findRecurrencesBefore(maxDate,function(err,results){if(err){callback(err);return;}
if(!results.length){callback(null,false);return;}
var groups=Object.create(null);results.forEach(function(comp){var calendarId=comp.calendarId;if(!(calendarId in groups)){groups[calendarId]=[];}
groups[calendarId].push(comp);});var pullGroups=[];var pending=0;var options={maxDate:Calc.dateToTransport(maxDate)};function next(err,pull){pullGroups.push(pull);if(!(--pending)){var trans=core.db.transaction(['icalComponents','alarms','busytimes'],'readwrite');trans.oncomplete=function(){callback(null,true);};trans.onerror=function(event){callback(event.result.error.name);};pullGroups.forEach(function(pull){pull.commit(trans);});}}
for(var calendarId in groups){pending++;self._expandComponents(calendarId,groups[calendarId],options,next);}});},_expandComponents:function(calendarId,comps,options,callback){var calStore=core.storeFactory.get('Calendar');calStore.ownersOf(calendarId,function(err,owners){if(err){return callback(err);}
var calendar=owners.calendar;var account=owners.account;var stream=this.service.stream('caldav','expandComponents',comps,options);var pull=new CaldavPullEvents(stream,{account:account,calendar:calendar,stores:['busytimes','alarms','icalComponents']});stream.request(function(err){if(err){callback(err);return;}
callback(null,pull);});}.bind(this));},createEvent:function(event,busytime,callback){if(typeof(busytime)==='function'){callback=busytime;busytime=null;}
if(this.bailWhenOffline(callback)){return;}
this.events.ownersOf(event,fetchOwners);var self=this;var calendar;var account;function fetchOwners(err,owners){calendar=owners.calendar;account=owners.account;self.service.request('caldav','createEvent',account,calendar.remote,event.remote,handleRequest);}
function handleRequest(err,remote){if(err){return callback(self._handleServiceError(err,{account:account,calendar:calendar}));}
var event={_id:calendar._id+'-'+remote.id,calendarId:calendar._id};var component={eventId:event._id,ical:remote.icalComponent};delete remote.icalComponent;event.remote=remote;var create=mutations.create({event:event,icalComponent:component});create.commit(function(err){if(err){callback(err);return;}
callback(null,create.busytime,create.event);});}},updateEvent:function(event,busytime,callback){if(typeof(busytime)==='function'){callback=busytime;busytime=null;}
if(this.bailWhenOffline(callback)){return;}
this.events.ownersOf(event,fetchOwners);var self=this;var calendar;var account;function fetchOwners(err,owners){calendar=owners.calendar;account=owners.account;self.icalComponents.get(event._id,fetchComponent);}
function fetchComponent(err,ical){if(err){callback(err);return;}
var details={event:event.remote,icalComponent:ical.ical};self.service.request('caldav','updateEvent',account,calendar.remote,details,handleUpdate);}
function handleUpdate(err,remote){if(err){callback(self._handleServiceError(err,{account:account,calendar:calendar}));return;}
var component={eventId:event._id,ical:remote.icalComponent};delete remote.icalComponent;event.remote=remote;var update=mutations.update({event:event,icalComponent:component});update.commit(function(err){if(err){callback(err);return;}
callback(null,update.busytime,update.event);});}},deleteEvent:function(event,busytime,callback){if(typeof(busytime)==='function'){callback=busytime;busytime=null;}
if(this.bailWhenOffline(callback)){return;}
this.events.ownersOf(event,fetchOwners);var calendar;var account;var self=this;function fetchOwners(err,owners){calendar=owners.calendar;account=owners.account;self.service.request('caldav','deleteEvent',account,calendar.remote,event.remote,handleRequest);}
function handleRequest(err){if(err){callback(self._handleServiceError(err,{account:account,calendar:calendar}));return;}
Local.prototype.deleteEvent.call(self,event,busytime,callback);}},bailWhenOffline:function(callback){if(!this.offlineMessage&&'mozL10n'in window.navigator){this.offlineMessage=window.navigator.mozL10n.get('error-offline');}
var ret=this.isOffline()&&callback;if(ret){var error=new Error();error.name='offline';error.message=this.offlineMessage;callback(error);}
return ret;}};});define('provider/factory',['require','exports','module','common/debug','./caldav','./local'],function(require,exports){'use strict';var debug=require('common/debug')('provider/factory');var ctors={Caldav:require('./caldav'),Local:require('./local')};var providers=exports.providers=Object.create(null);exports.get=function(name){if(!providers[name]){try{debug(`Initializing provider ${name}`);providers[name]=new ctors[name]();}catch(e){console.error('Error',e.name,e.message);console.error('Failed to initialize provider',name,e.stack);}}
return providers[name];};});define('store/abstract',['require','exports','module','common/responder','core','common/promise','common/next_tick'],function(require,exports,module){'use strict';var Responder=require('common/responder');var core=require('core');var denodeifyAll=require('common/promise').denodeifyAll;var nextTick=require('common/next_tick');function Abstract(){this._cached=Object.create(null);Responder.call(this);denodeifyAll(this,['persist','all','_allCached','removeByIndex','get','remove','count']);}
module.exports=Abstract;Abstract.prototype={__proto__:Responder.prototype,_store:null,_dependentStores:null,_createModel:function(object,id){if(typeof(id)!=='undefined'){object._id=id;}
return object;},_addToCache:function(object){this._cached[object._id]=object;},_clearCache:function(){this._cached=Object.create(null);},_removeFromCache:function(id){if(id in this._cached){delete this._cached[id];}},_transactionCallback:function(trans,callback){if(callback){trans.addEventListener('error',function(e){callback(e);});trans.addEventListener('complete',function(){callback(null);});}},persist:function(object,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=undefined;}
if(!trans){trans=core.db.transaction(this._dependentStores||this._store,'readwrite');}
var self=this;var store=trans.objectStore(this._store);var data=this._objectData(object);var id;var model;var putReq;var reqType=this._detectPersistType(object);trans.addEventListener('error',function(event){if(callback){callback(event);}});if(reqType==='update'){putReq=store.put(data);}else{this._assignId(data);putReq=store.add(data);this._addDependents(object,trans);}
if(data._id){id=data._id;model=self._createModel(object,id);self._addToCache(model);}
trans.addEventListener('complete',function(data){if(!model){id=putReq.result;model=self._createModel(object,id);self._addToCache(model);}
if(callback){callback(null,id,model);}
self.emit(reqType,id,model);self.emit('persist',id,model);});},_allCached:function(callback){var list=this._cached;nextTick(function(){callback(null,list);});},all:function(callback){if(this._allCallbacks){this._allCallbacks.push(callback);return;}
this._allCallbacks=[callback];var self=this;var trans=core.db.transaction(this._store);var store=trans.objectStore(this._store);function process(data){return self._addToCache(self._createModel(data));}
function fireQueue(err,value){var callback;while((callback=self._allCallbacks.shift())){callback(err,value);}}
store.mozGetAll().onsuccess=function(event){event.target.result.forEach(process);};trans.onerror=function(event){fireQueue(event.target.error.name);};trans.oncomplete=function(){fireQueue(null,self._cached);self.all=self._allCached;};},_addDependents:function(){},_removeDependents:function(trans){},_detectPersistType:function(object){return('_id'in object)?'update':'add';},_parseId:function(id){return id;},_assignId:function(obj){},removeByIndex:function(indexName,indexValue,trans,callback){var self=this;if(typeof(trans)==='function'){callback=trans;trans=undefined;}
if(!trans){trans=core.db.transaction(this._dependentStores||this._store,'readwrite');}
if(callback){trans.addEventListener('complete',function(){callback(null);});trans.addEventListener('error',function(event){callback(event);});}
var index=trans.objectStore(this._store).index(indexName);var req=index.openCursor(IDBKeyRange.only(indexValue));req.onsuccess=function(event){var cursor=event.target.result;if(cursor){self._removeDependents(cursor.primaryKey,trans);self._removeFromCache(cursor.primaryKey);cursor.delete();cursor.continue();}};return req;},get:function(id,trans,callback){var self=this;if(typeof(trans)==='function'){callback=trans;trans=null;}
if(!trans){trans=core.db.transaction(this._store);}
var store=trans.objectStore(this._store);var req=store.get(this._parseId(id));req.onsuccess=function(){var model;if(req.result){model=self._createModel(req.result);}
callback(null,model);};req.onerror=function(event){callback(event);};},remove:function(id,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=undefined;}
if(!trans){trans=core.db.transaction(this._dependentStores||this._store,'readwrite');}
var self=this;var store=trans.objectStore(this._store);id=this._parseId(id);store.delete(id);this._removeDependents(id,trans);self.emit('preRemove',id);trans.addEventListener('error',function(event){if(callback){callback(event);}});trans.addEventListener('complete',function(){if(callback){callback(null,id);}
self.emit('remove',id);self._removeFromCache(id);});},count:function(callback){var trans=core.db.transaction(this._store);var store=trans.objectStore(this._store);var req=store.count();req.onsuccess=function(){callback(null,req.result);};req.onerror=function(e){callback(e);};},_objectData:function(data){if('toJSON'in data){return data.toJSON();}
return data;}};});define('common/extend',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(target,input){for(var key in input){if(hasOwnProperty.call(input,key)){target[key]=input[key];}}
return target;};});define('store/account',['require','exports','module','models/account','./abstract','core','common/debug','common/promise','common/extend','common/next_tick','common/probably_parse_int'],function(require,exports,module){'use strict';var AccountModel=require('models/account');var Abstract=require('./abstract');var core=require('core');var debug=require('common/debug')('store/account');var denodeifyAll=require('common/promise').denodeifyAll;var extend=require('common/extend');var nextTick=require('common/next_tick');var probablyParseInt=require('common/probably_parse_int');function Account(){Abstract.apply(this,arguments);denodeifyAll(this,['verifyAndPersist','sync','markWithError','syncableAccounts','availablePresets']);}
module.exports=Account;Account.prototype={__proto__:Abstract.prototype,_store:'accounts',_parseId:probablyParseInt,_validateModel:function(model,callback){this.all(function(err,allAccounts){if(err){callback(err);return;}
for(var index in allAccounts){if(allAccounts[index].user===model.user&&allAccounts[index].fullUrl===model.fullUrl&&allAccounts[index]._id!==model._id){var dupErr=new Error('Cannot add two accounts with the same url / entry point');dupErr.name='account-exist';callback(dupErr);return;}}
callback();});},verifyAndPersist:function(model,callback){var self=this;var provider=core.providerFactory.get(model.providerType);provider.getAccount(model.toJSON(),function(err,data){if(err){callback(err);return;}
model.error=undefined;model.calendarHome=data.calendarHome;extend(model,data);self._validateModel(model,function(err){if(err){return callback(err);}
self.persist(model,callback);});});},_dependentStores:['accounts','calendars','events','busytimes','alarms','icalComponents'],_removeDependents:function(id,trans){var store=core.storeFactory.get('Calendar');store.remotesByAccount(id,trans,function(err,related){if(err){return console.error('Error removing deps for account: ',id);}
var key;for(key in related){store.remove(related[key]._id,trans);}});},sync:function(account,callback){var self=this;var provider=core.providerFactory.get(account.providerType);var calendarStore=core.storeFactory.get('Calendar');var persist=[];var calendars;var originalIds;function fetchExistingCalendars(err,results){if(err){return callback(err);}
calendars=results;originalIds=Object.keys(calendars);provider.findCalendars(account,persistCalendars);}
function persistCalendars(err,remoteCals){var key;if(err){callback(err);return;}
for(key in remoteCals){if(remoteCals.hasOwnProperty(key)){var cal=remoteCals[key];var idx=originalIds.indexOf(key);if(idx!==-1){originalIds.splice(idx,1);var original=calendars[key];original.remote=cal;original.error=undefined;persist.push(original);}else{persist.push(calendarStore._createModel({remote:new Object(cal),accountId:account._id}));}}}
if(persist.length||originalIds.length){var trans=core.db.transaction(self._dependentStores,'readwrite');originalIds.forEach(function(id){calendarStore.remove(calendars[id]._id,trans);});persist.forEach(function(object){calendarStore.persist(object,trans);});trans.addEventListener('error',function(err){callback(err);});trans.addEventListener('complete',function(){callback(null);});}else{callback(null);}}
calendarStore.remotesByAccount(account._id,fetchExistingCalendars);},_createModel:function(obj,id){if(!(obj instanceof AccountModel)){obj=new AccountModel(obj);}
if(typeof(id)!=='undefined'){obj._id=id;}
return obj;},markWithError:function(account,error,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=null;}
if(!account._id){throw new Error('given account must be persisted');}
if(!account.error){account.error={name:error.name,date:new Date(),count:0};}
account.error.count++;var calendarStore=core.storeFactory.get('Calendar');var self=this;function fetchedCalendars(err,calendars){if(!trans){trans=core.db.transaction(self._dependentStores,'readwrite');}
if(err){console.error('Cannot fetch all calendars',err);return self.persist(account,trans,callback);}
for(var id in calendars){calendarStore.markWithError(calendars[id],error,trans);}
self.persist(account,trans);self._transactionCallback(trans,callback);}
calendarStore.remotesByAccount(account._id,fetchedCalendars);},syncableAccounts:function(callback){debug('Will find syncable accounts...');this.all((err,list)=>{if(err){return callback(err);}
var results=[];for(var key in list){var account=list[key];var provider=core.providerFactory.get(account.providerType);if(provider.canSync){results.push(account);}}
callback(null,results);});},availablePresets:function(presetList,callback){var results=[];var singleUse={};var hasSingleUses=false;for(var preset in presetList){if(presetList[preset].singleUse){hasSingleUses=true;singleUse[preset]=true;}else{results.push(preset);}}
if(!hasSingleUses){return nextTick(function(){callback(null,results);});}
this.all(function(err,list){if(err){callback(err);return;}
for(var id in list){var preset=list[id].preset;if(singleUse[preset]){delete singleUse[preset];}}
callback(null,results.concat(Object.keys(singleUse)));});}};});define('common/create_dom_promise',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function createDOMPromise(request){return new Promise((resolve,reject)=>{request.onsuccess=resolve;request.onerror=reject;});};});define('store/alarm',['require','exports','module','./abstract','common/calc','common/create_dom_promise','core','common/debug','common/promise','common/object'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var Calc=require('common/calc');var createDOMPromise=require('common/create_dom_promise');var core=require('core');var debug=require('common/debug')('store/alarm');var denodeifyAll=require('common/promise').denodeifyAll;var object=require('common/object');function Alarm(){Abstract.apply(this,arguments);this._processQueue=this._processQueue.bind(this);denodeifyAll(this,['findAllByBusytimeId','workQueue']);}
module.exports=Alarm;Alarm.prototype={__proto__:Abstract.prototype,_store:'alarms',_dependentStores:['alarms'],_alarmAddThresholdHours:48,_addToCache:function(){},_removeFromCache:function(){},autoQueue:false,_processQueue:function(){this.workQueue();},_objectData:function(object){var data=Abstract.prototype._objectData.call(this,object);if(data.startDate){data.trigger=data.startDate;}
return data;},_addDependents:function(obj,trans){if(!this.autoQueue){return;}
trans.addEventListener('complete',this._processQueue);},_moveAlarms:function(now,requiresAlarm,callback){var time=Calc.dateToTransport(now);var utc=time.utc;var minimum=utc+(this._alarmAddThresholdHours*Calc.HOUR);var request=core.db.transaction('alarms','readwrite').objectStore('alarms').index('trigger').openCursor();request.onerror=function(){callback(new Error('Alarm cursor failed to open.'));};var past=[];var future=[];request.onsuccess=function(event){var cursor=event.target.result;if(!cursor||(cursor.key>=minimum&&(!requiresAlarm||future.length))){return dispatchAlarms(past,future).then(callback).catch(error=>debug('Error dispatching alarms:',error));}
var record=cursor.value;var date=Calc.dateFromTransport(record.trigger);var bucket=date<Date.now()?past:future;bucket.push(record);record.triggered=record.trigger;delete record.trigger;cursor.update(record);cursor.continue();};},findAllByBusytimeId:function(busytimeId,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=null;}
if(!trans){trans=core.db.transaction(this._dependentStores);}
var store=trans.objectStore(this._store);var index=store.index('busytimeId');var key=IDBKeyRange.only(busytimeId);index.mozGetAll(key).onsuccess=function(e){callback(null,e.target.result);};},workQueue:function(now,callback){if(typeof(now)==='function'){callback=now;now=null;}
now=now||new Date();var alarms=navigator.mozAlarms;if(!alarms){if(callback){callback(null);}
return;}
var self=this;var requiresAlarm=false;var req=alarms.getAll();req.onsuccess=function(e){var data=e.target.result;var len=data.length;var mozAlarm;requiresAlarm=true;for(var i=0;i<len;i++){mozAlarm=data[i].data;if(mozAlarm&&'eventId'in mozAlarm&&'trigger'in mozAlarm){requiresAlarm=false;break;}}
callback=callback||function(){};self._moveAlarms(now,requiresAlarm,callback);};req.onerror=function(){var msg='failed to get alarms';console.error('CALENDAR:',msg);if(callback){callback(new Error(msg));}};}};function dispatchAlarms(past,future){var eventToAlarm={};past.forEach(alarm=>{var event=alarm.eventId;if(!event||event in eventToAlarm){return;}
eventToAlarm[event]=alarm;});object.forEach(eventToAlarm,(event,alarm)=>{core.notificationsController.onAlarm(alarm);});var alarms=navigator.mozAlarms;return Promise.all(future.map(alarm=>{var timezone=alarm.triggered.tzid===Calc.FLOATING?'ignoreTimezone':'honorTimezone';return createDOMPromise(alarms.add(Calc.dateFromTransport(alarm.triggered),timezone,alarm));}));}});define('store/busytime',['require','exports','module','./abstract','common/calc','common/binsearch','core','common/compare','common/promise'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var Calc=require('common/calc');var binsearch=require('common/binsearch');var core=require('core');var compare=require('common/compare');var denodeifyAll=require('common/promise').denodeifyAll;function Busytime(){Abstract.apply(this,arguments);this._setupCache();denodeifyAll(this,['removeEvent','loadSpan']);}
module.exports=Busytime;Busytime.prototype={__proto__:Abstract.prototype,_store:'busytimes',_dependentStores:['alarms','busytimes'],_setupCache:function(){this._byEventId=Object.create(null);},_createModel:function(input,id){return this.initRecord(input,id);},initRecord:function(input,id){var _super=Abstract.prototype._createModel;var model=_super.apply(this,arguments);model.startDate=Calc.dateFromTransport(model.start);model.endDate=Calc.dateFromTransport(model.end);return model;},_removeDependents:function(id,trans){core.storeFactory.get('Alarm').removeByIndex('busytimeId',id,trans);},removeEvent:function(id,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=undefined;}
if(typeof(trans)==='undefined'){trans=core.db.transaction(this._dependentStores,'readwrite');}
var req=this.removeByIndex('eventId',id,trans);var success=req.onsuccess;var self=this;req.onsuccess=function(e){var cursor=e.target.result;if(cursor){var id=cursor.primaryKey;self.emit('remove',id);}
success(e);};this._transactionCallback(trans,callback);},_startCompare:function(aObj,bObj){var a=aObj.start.utc;var b=bObj.start.utc;return compare(a,b);},loadSpan:function(span,callback){var trans=core.db.transaction(this._store);var store=trans.objectStore(this._store);var startPoint=Calc.dateToTransport(new Date(span.start));var endPoint=Calc.dateToTransport(new Date(span.end));var keyRange=IDBKeyRange.lowerBound(startPoint.utc);var index=store.index('end');var self=this;index.mozGetAll(keyRange).onsuccess=function(e){var data=e.target.result;data=data.sort(self._startCompare);var idx=binsearch.insert(data,{start:{utc:endPoint.utc+1}},self._startCompare);data=data.slice(0,idx);if(callback){callback(null,data.map(function(item){return self.initRecord(item);}));}};},_addToCache:function(){},_removeFromCache:function(){}};});define('models/calendar',['require','exports','module'],function(require,exports,module){'use strict';function Cal(options){if(typeof(options)==='undefined'){options={};}
this.remote={};for(var key in options){if(options.hasOwnProperty(key)){this[key]=options[key];}}}
module.exports=Cal;Cal.prototype={remote:null,firstEventSyncDate:null,lastEventSyncToken:'',lastEventSyncDate:'',localDisplayed:true,accountId:'',updateRemote:function(provider){var data=provider;if('toJSON'in provider){data=provider.toJSON();}
this.remote=data;},eventSyncNeeded:function(){var local=this.lastEventSyncToken;var remote=this.remote.syncToken;return local!=remote;},set name(name){this.remote.name=name;return this.remote.name;},set color(color){this.remote.color=color;return this.remote.color;},set description(description){this.remote.description=description;return this.remote.description;},get name(){return this.remote.name;},get color(){var color=this.remote.color;if(color){if(color.substr(0,1)==='#'){return color.substr(0,7);}}
return this.remote.color;},get description(){return this.remote.description;},toJSON:function(){var result={error:this.error,remote:this.remote,accountId:this.accountId,localDisplayed:this.localDisplayed,lastEventSyncDate:this.lastEventSyncDate,lastEventSyncToken:this.lastEventSyncToken,firstEventSyncDate:this.firstEventSyncDate};if(this._id||this._id===0){result._id=this._id;}
return result;}};});define('store/calendar',['require','exports','module','./abstract','models/calendar','core','common/promise','common/constants','common/probably_parse_int'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var CalendarModel=require('models/calendar');var core=require('core');var denodeifyAll=require('common/promise').denodeifyAll;var localCalendarId=require('common/constants').localCalendarId;var probablyParseInt=require('common/probably_parse_int');function Store(){Abstract.apply(this,arguments);this._usedColors=[];denodeifyAll(this,['markWithError','remotesByAccount','sync','providerFor','ownersOf']);}
module.exports=Store;Store.REMOTE_COLORS=['#00aacc','#bad600','#df4784','#f9bc17','#0766b7','#76a408','#33a185'];Store.LOCAL_COLOR='#f97c17',Store.capabilities={createEvent:'canCreateEvent',updateEvent:'canUpdateEvent',deleteEvent:'canDeleteEvent'};Store.prototype={__proto__:Abstract.prototype,_store:'calendars',_dependentStores:['calendars','events','busytimes','alarms','icalComponents'],_parseId:probablyParseInt,_createModel:function(obj,id){if(!(obj instanceof CalendarModel)){obj=new CalendarModel(obj);}
if(typeof(id)!=='undefined'){obj._id=id;}
return obj;},_removeDependents:function(id,trans){var store=core.storeFactory.get('Event');store.removeByIndex('calendarId',id,trans);},markWithError:function(calendar,error,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=null;}
if(!calendar._id){throw new Error('given calendar must be persisted.');}
calendar.error={name:error.name,date:new Date()};this.persist(calendar,trans,callback);},persist:function(calendar,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=undefined;}
this._updateCalendarColor(calendar);var cb=callback;var cached=this._cached[calendar._id];if(cached&&cached.localDisplayed!==calendar.localDisplayed){cb=function(err,id,model){this.emit('calendarVisibilityChange',id,model);callback(err,id,model);}.bind(this);}
Abstract.prototype.persist.call(this,calendar,trans,cb);},remove:function(id,trans,callback){this._removeCalendarColorFromCache(id);Abstract.prototype.remove.apply(this,arguments);},_clearCache:function(){Abstract.prototype._clearCache.call(this);this._usedColors=[];},_updateCalendarColor:function(calendar){this._removeCalendarColorFromCache(calendar._id);this._setCalendarColor(calendar);this._usedColors.push(calendar.color);},_removeCalendarColorFromCache:function(id){var color=this.getColorByCalendarId(id);var index=this._usedColors.indexOf(color);if(index!==-1){this._usedColors.splice(index,1);}},getColorByCalendarId:function(id){return this._cached[id]&&this._cached[id].color;},_setCalendarColor:function(calendar){if(calendar._id===localCalendarId){calendar.color=Store.LOCAL_COLOR;return;}
var prevColor=this.getColorByCalendarId(calendar._id);if(prevColor&&Store.REMOTE_COLORS.indexOf(prevColor)!==-1){calendar.color=prevColor;}else{calendar.color=this._getNextColor();}},_getNextColor:function(){var available=Store.REMOTE_COLORS.filter(function(color){return this._usedColors.indexOf(color)===-1;},this);return available.length?available[0]:this._getLeastUsedColor();},_getLeastUsedColor:function(){var counter={};this._usedColors.forEach(function(color){counter[color]=(counter[color]||0)+1;});var leastUsedColor;var leastUsedCount=Infinity;for(var color in counter){if(counter[color]<leastUsedCount){leastUsedCount=counter[color];leastUsedColor=color;}}
return leastUsedColor;},shouldDisplayCalendar:function(calendarId){var calendar=this._cached[calendarId];return calendar&&calendar.localDisplayed;},remotesByAccount:function(accountId,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=null;}
if(!trans){trans=core.db.transaction(this._store);}
var store=trans.objectStore(this._store);var reqKey=IDBKeyRange.only(accountId);var req=store.index('accountId').mozGetAll(reqKey);req.onerror=function remotesError(e){callback(e.target.error);};var self=this;req.onsuccess=function remotesSuccess(e){var result=Object.create(null);e.target.result.forEach(function(calendar){result[calendar.remote.id]=self._createModel(calendar,calendar._id);});callback(null,result);};},sync:function(account,calendar,callback){var provider=core.providerFactory.get(account.providerType);provider.syncEvents(account,calendar,callback);},providerFor:function(calendar,callback){this.ownersOf(calendar,function(err,owners){if(err){return callback(err);}
var provider;try{var account=owners.account;var providerType=account.providerType;provider=core.providerFactory.get(providerType);}catch(error){return callback(error);}
callback(null,provider);});},ownersOf:function(objectOrId,callback){var result={};var accountStore=core.storeFactory.get('Account');if(objectOrId instanceof CalendarModel){result.calendar=objectOrId;accountStore.get(objectOrId.accountId,fetchAccount);return;}
if(typeof objectOrId==='object'){objectOrId=objectOrId.calendarId;}
var calendarStore=core.storeFactory.get('Calendar');calendarStore.get(objectOrId,fetchCalendar);function fetchCalendar(err,calendar){if(err){return callback(err);}
result.calendar=calendar;accountStore.get(calendar.accountId,fetchAccount);}
function fetchAccount(err,account){if(err){return callback(err);}
result.account=account;callback(null,result);}}};});define('store/event',['require','exports','module','./abstract','common/calc','./calendar','core','common/promise'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var Calc=require('common/calc');var Calendar=require('./calendar');var core=require('core');var denodeifyAll=require('common/promise').denodeifyAll;function Events(){Abstract.apply(this,arguments);denodeifyAll(this,['providerFor','findByIds','ownersOf','eventsForCalendar']);}
module.exports=Events;Events.prototype={__proto__:Abstract.prototype,_store:'events',_dependentStores:['events','busytimes','alarms','icalComponents'],_addToCache:function(){},_removeFromCache:function(){},_createModel:function(input,id){var _super=Abstract.prototype._createModel;var model=_super.apply(this,arguments);model.remote.startDate=Calc.dateFromTransport(model.remote.start);model.remote.endDate=Calc.dateFromTransport(model.remote.end);return model;},_removeDependents:function(id,trans){this.removeByIndex('parentId',id,trans);var busy=core.storeFactory.get('Busytime');busy.removeEvent(id,trans);var component=core.storeFactory.get('IcalComponent');component.remove(id,trans);},_assignId:function(obj){var id=obj.calendarId+'-'+obj.remote.id;obj._id=id;return id;},providerFor:function(event,callback){this.ownersOf(event,function(err,owners){callback(null,core.providerFactory.get(owners.account.providerType));});},findByIds:function(ids,callback){var results={};var pending=ids.length;var self=this;if(!pending){callback(null,results);}
function next(){if(!(--pending)){callback(null,results);}}
function success(e){var item=e.target.result;if(item){results[item._id]=self._createModel(item);}
next();}
function error(){next();}
ids.forEach(function(id){var trans=core.db.transaction('events');var store=trans.objectStore('events');var req=store.get(id);req.onsuccess=success;req.onerror=error;},this);},ownersOf:Calendar.prototype.ownersOf,eventsForCalendar:function(calendarId,callback){var trans=core.db.transaction('events');var store=trans.objectStore('events');var index=store.index('calendarId');var key=IDBKeyRange.only(calendarId);var req=index.mozGetAll(key);req.onsuccess=function(e){callback(null,e.target.result);};req.onerror=function(e){callback(e);};}};});define('store/ical_component',['require','exports','module','./abstract','common/calc','core','common/promise'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var Calc=require('common/calc');var core=require('core');var denodeifyAll=require('common/promise').denodeifyAll;function IcalComponent(){Abstract.apply(this,arguments);denodeifyAll(this,['findRecurrencesBefore']);}
module.exports=IcalComponent;IcalComponent.prototype={__proto__:Abstract.prototype,_store:'icalComponents',_addToCache:function(){},_removeFromCache:function(){},_createModel:function(object){return object;},_detectPersistType:function(object){return'update';},findRecurrencesBefore:function(maxDate,callback){var trans=core.db.transaction(this._store,'readwrite');trans.onerror=function(event){callback(event.target.error.name);};var time=Calc.dateToTransport(maxDate);var utc=time.utc;var range=IDBKeyRange.bound(0,utc);var store=trans.objectStore(this._store);var idx=store.index('lastRecurrenceId');var req=idx.mozGetAll(range);req.onsuccess=function(event){callback(null,event.target.result);};}};});define('store/setting',['require','exports','module','./abstract','common/promise','common/next_tick'],function(require,exports,module){'use strict';var Abstract=require('./abstract');var denodeifyAll=require('common/promise').denodeifyAll;var nextTick=require('common/next_tick');function Setting(){Abstract.apply(this,arguments);denodeifyAll(this,['getValue','set']);}
module.exports=Setting;Setting.prototype={__proto__:Abstract.prototype,_store:'settings',defaults:{standardAlarmDefault:-300,alldayAlarmDefault:32400,syncFrequency:15,syncAlarm:{alarmId:null,start:null,end:null}},_addToCache:function(){},_removeFromCache:function(){},getValue:function(key,callback){var self=this;if(key in this._cached){nextTick(function handleCached(){callback(null,self._cached[key].value);});return;}
this.get(key,function handleStored(err,value){if(err){return callback(err);}
if(value===undefined&&self.defaults[key]!==undefined){value={value:self.defaults[key]};}
self._cached[key]=value;callback(null,value.value);});},set:function(key,value,trans,callback){if(typeof(trans)==='function'){callback=trans;trans=null;}
var cached=this._cached[key];var record;if(cached&&cached._id){cached.value=value;cached.updatedAt=new Date();record=cached;}else{var created=new Date();this._cached[key]=record={_id:key,createdAt:created,updatedAt:created,value:value};}
this.emit(key+'Change',value,record);this.persist(record,trans,callback);}};});define('store/factory',['require','exports','module','common/debug','./account','./alarm','./busytime','./calendar','./event','./ical_component','./setting'],function(require,exports){'use strict';var debug=require('common/debug')('store/factory');var ctors={Account:require('./account'),Alarm:require('./alarm'),Busytime:require('./busytime'),Calendar:require('./calendar'),Event:require('./event'),IcalComponent:require('./ical_component'),Setting:require('./setting')};exports._instances=Object.create(null);exports.get=function(name){if(!exports._instances[name]){try{debug(`Initializing store ${name}`);exports._instances[name]=new ctors[name]();}catch(e){console.error('Error',e.name,e.message);console.error('Failed to initialize store',name,e.stack);}}
return exports._instances[name];};});define('time_observer',['require','exports','module','ext/eventemitter2'],function(require,exports,module){'use strict';var EventEmitter2=require('ext/eventemitter2');exports=module.exports=new EventEmitter2();exports.on=function(){EventEmitter2.prototype.on.apply(this,arguments);this._start();};exports.once=function(){EventEmitter2.prototype.once.apply(this,arguments);this._start();};exports.off=function(){EventEmitter2.prototype.off.apply(this,arguments);this._autoStop();};exports.removeAllListeners=function(){EventEmitter2.prototype.removeAllListeners.apply(this,arguments);this._autoStop();};exports._autoStop=function(){if(!this._hasListeners()){this._stop();}};exports._hasListeners=function(){return this.listeners('day').length>0||this.listeners('minute').length>0;};exports._timeout=null;exports._prevTick=null;exports._start=function(){if(this._timeout||!this._hasListeners()){return;}
this._prevTick=new Date();this._timeout=setTimeout(this._tick,this._nextMinute());};exports._stop=function(){if(this._timeout){window.clearTimeout(this._timeout);this._timeout=null;}};exports._tick=function(){this._stop();this._exec();this._start();}.bind(exports);exports._nextMinute=function(){var now=new Date();return(60-now.getSeconds())*1000;};exports._exec=function(){var now=new Date();var prev=this._prevTick;if(prev.getMinutes()!==now.getMinutes()){this.emit('minute');}
if(prev.getDate()!==now.getDate()){this.emit('day');}};exports.init=function(){document.addEventListener('visibilitychange',()=>{exports._toggleStatusOnVisibilityChange(document.hidden);});exports._start();};exports._toggleStatusOnVisibilityChange=function(hidden){if(!hidden){exports._exec();}
var method=hidden?'_stop':'_start';exports[method]();};});define('snake_case',['require','exports','module'],function(require,exports,module){'use strict';module.exports=function(name){return name.replace(/^./,chr=>chr.toLowerCase()).replace(/[A-Z]/g,chr=>'_'+chr.toLowerCase());};});define('views/factory',['require','exports','module','common/async_require','common/debug','common/next_tick','snake_case'],function(require,exports,module){'use strict';var asyncRequire=require('common/async_require');var debug=require('common/debug')('viewFactory');var nextTick=require('common/next_tick');var snakeCase=require('snake_case');exports._instances=Object.create(null);exports.get=function(name,cb){if(this._registered(name)){debug(`Found view named ${name}`);this._get(name,cb);return;}
var path=`views/${snakeCase(name)}`;try{var Ctor=require(path);debug(`Initializing view ${name} registered as ${path}`);this._initView(name,Ctor,cb);}catch(e){debug(`Will try to load view ${name} at ${path}`);asyncRequire(path).then(Ctor=>{debug(`Loaded view ${name}`);this._initView(name,Ctor,cb);});}},exports._registered=function(name){return name in this._instances;};exports._get=function(name,cb){var view=this._instances[name];cb&&nextTick(()=>cb.call(null,view));};exports._initView=function(name,Ctor,cb){if(this._registered(name)){return;}
var view=new Ctor();this._instances[name]=view;this._get(name,cb);};});define('app',['require','exports','module','db','controllers/error','pending_manager','controllers/recurring_events','controllers/service','controllers/sync','controllers/time','common/async_require','bridge','ext/co','core','date_l10n','day_observer','common/debug','./intl','message_handler','common/next_tick','controllers/notifications','performance','controllers/periodic_sync','provider/factory','router','store/factory','time_observer','views/factory'],function(require,exports){'use strict';var Db=require('db');var ErrorController=require('controllers/error');var PendingManager=require('pending_manager');var RecurringEventsController=require('controllers/recurring_events');var ServiceController=require('controllers/service');var SyncController=require('controllers/sync');var TimeController=require('controllers/time');var asyncRequire=require('common/async_require');var bridge=require('bridge');var co=require('ext/co');var core=require('core');var dateL10n=require('date_l10n');var dayObserver=require('day_observer');var debug=require('common/debug')('app');var intl=require('./intl');var messageHandler=require('message_handler');var nextTick=require('common/next_tick');var notificationsController=require('controllers/notifications');var performance=require('performance');var periodicSyncController=require('controllers/periodic_sync');var providerFactory=require('provider/factory');var router=require('router');var storeFactory=require('store/factory');var timeObserver=require('time_observer');var viewFactory=require('views/factory');var loadLazyStyles=null;var l10nReady=new Promise(resolve=>navigator.mozL10n.once(()=>resolve()));var pendingManager=new PendingManager();var startingURL=window.location.href;function setupCore(dbName){if(core.db){return;}
core.bridge=bridge;core.db=new Db(dbName||'b2g-calendar');core.errorController=new ErrorController();core.notificationsController=notificationsController;core.periodicSyncController=periodicSyncController;core.providerFactory=providerFactory;core.serviceController=new ServiceController();core.storeFactory=storeFactory;core.syncController=new SyncController();core.timeController=new TimeController();core.viewFactory=viewFactory;}
function setupPendingManager(){pendingManager.onpending=()=>{document.body.classList.add('pending-operation');};pendingManager.oncomplete=()=>{document.body.classList.remove('pending-operation');performance.pendingReady();if(!loadLazyStyles){loadLazyStyles=asyncRequire('css!lazy_loaded');}};pendingManager.register(core.syncController);}
function setupRouter(){router.state('/week/','Week');router.state('/day/','Day');router.state('/month/',['Month','MonthDayAgenda']);router.modifier('/settings/','Settings',{clear:false});router.modifier('/advanced-settings/','AdvancedSettings',{color:'settings'});router.state('/alarm-display/:id','ViewEvent',{path:false});router.state('/event/add/','ModifyEvent');router.state('/event/edit/:id','ModifyEvent');router.state('/event/show/:id','ViewEvent');router.modifier('/select-preset/','CreateAccount',{color:'settings'});router.modifier('/create-account/:preset','ModifyAccount');router.modifier('/update-account/:id','ModifyAccount');router.start();performance.chromeInteractive();var pathname=window.location.pathname;if(pathname==='/index.html'||pathname==='/'){router.go('/month/');}}
function setupControllers(){core.serviceController.start(false);notificationsController.observe();periodicSyncController.observe();var recurringEventsController=new RecurringEventsController();pendingManager.register(recurringEventsController);recurringEventsController.observe();var alarms=core.storeFactory.get('Alarm');alarms.autoQueue=true;}
function setupUI(){intl.init();return co(function*(){dateL10n.init();timeObserver.init();core.timeController.move(new Date());window.addEventListener('moztimechange',()=>{debug('Noticed timezone change!');nextTick(()=>window.location.href=startingURL);});nextTick(()=>viewFactory.get('Errors'));yield[renderView('TimeHeader'),renderView('ViewSelector')];document.body.classList.remove('loading');performance.domLoaded();setupRouter();});}
function renderView(viewName){return new Promise(accept=>{viewFactory.get(viewName,view=>{view.render();accept();});});}
function startDayObserver(){return co(function*(){var storeFactory=core.storeFactory;var calendars=storeFactory.get('Calendar');yield calendars.all();dayObserver.init();});}
function startUI(){return co(function*(){yield l10nReady;yield setupUI();});}
function configureAudioChannelManager(){var audioChannelManager=navigator.mozAudioChannelManager;if(audioChannelManager){audioChannelManager.volumeControlChannel='notification';}}
function init(){return co(function*(){debug('Will initialize calendar app');setupCore();setupPendingManager();yield core.db.load();setupControllers();yield[startDayObserver(),startUI()];messageHandler.start();configureAudioChannelManager();});}
exports.init=init;exports.pendingManager=pendingManager;exports.setupCore=setupCore;});(function(){'use strict';window.require=window.require||window.curl;require.config({baseUrl:'/js',waitSeconds:60,paths:{shared:'/shared/js',dom:'curl/plugin/dom',css:'curl/plugin/css'},shim:{'ext/caldav':{exports:'Caldav'},'ext/ical':{exports:'ICAL'},'ext/page':{exports:'page'},'shared/gesture_detector':{exports:'GestureDetector'},'shared/input_parser':{exports:'InputParser'},'shared/intl_helper':{exports:'IntlHelper'},'shared/lazy_loader':{exports:'LazyLoader'},'shared/notification_helper':{exports:'NotificationHelper'}}});require.config({paths:{'views/week':'lazy_loaded','views/advanced_settings':'lazy_loaded','views/create_account':'lazy_loaded','views/day':'lazy_loaded','views/modify_account':'lazy_loaded','views/modify_event':'lazy_loaded','views/settings':'lazy_loaded','views/view_event':'lazy_loaded'}});require(['app'],app=>app.init());}());define("main",function(){});define('view',['require','exports','module'],function(require,exports,module){'use strict';var DEFAULT_ERROR_ID='error-default';const INVALID_CSS=/([^a-zA-Z\-\_0-9])/g;function View(options){if(typeof(options)==='undefined'){options={};}
if(typeof(options)==='string'){this.selectors={element:options};}else{var key;if(typeof(options)==='undefined'){options={};}
for(key in options){if(options.hasOwnProperty(key)){this[key]=options[key];}}}
this.hideErrors=this.hideErrors.bind(this);}
module.exports=View;View.ACTIVE='active';View.prototype={seen:false,activeClass:View.ACTIVE,errorVisible:false,get element(){return this._findElement('element');},get status(){return this._findElement('status');},get errors(){return this._findElement('errors');},idForModel:function(prefix,objectOrString){prefix+=(typeof(objectOrString)==='object')?objectOrString._id:objectOrString;return prefix;},calendarId:function(input){if(typeof(input)!=='string'){input=input.calendarId;}
input=this.cssClean(input);return'calendar-id-'+input;},delegate:function(element,type,selector,handler){if(typeof(handler)==='object'){var context=handler;handler=function(){context.handleEvent.apply(context,arguments);};}
element.addEventListener(type,function(e){var target=e.target;while(target!==element){if('mozMatchesSelector'in target&&target.mozMatchesSelector(selector)){return handler(e,target);}
target=target.parentNode;}});},cssClean:function(string){if(typeof(string)!=='string'){return string;}
return string.replace(INVALID_CSS,'-');},_findElement:function(name,all,element){if(typeof(all)==='object'){element=all;all=false;}
element=element||document;var cacheName;var selector;if(typeof(all)==='undefined'){all=false;}
if(name in this.selectors){cacheName='_'+name+'Element';selector=this.selectors[name];if(!this[cacheName]){if(all){this[cacheName]=element.querySelectorAll(selector);}else{this[cacheName]=element.querySelector(selector);}}
return this[cacheName];}
return null;},showErrors:function(list){var _=navigator.mozL10n.get;var errors='';if(!Array.isArray(list)){list=[list];}
var i=0;var len=list.length;for(;i<len;i++){var name=list[i].l10nID||list[i].name;errors+=_('error-'+name)||_(DEFAULT_ERROR_ID);}
this.errors.textContent=errors;this.errorVisible=true;this.status.classList.add(this.activeClass);this.status.addEventListener('animationend',this.hideErrors);},hideErrors:function(){this.status.classList.remove(this.activeClass);this.status.removeEventListener('animationend',this.hideErrors);this.errorVisible=false;},onactive:function(){if(this.errorVisible){this.hideErrors();}
if(this.seen===false){this.onfirstseen();}
if('dispatch'in this){this.dispatch.apply(this,arguments);}
this.seen=true;if(this.element){this.element.classList.add(this.activeClass);}},oninactive:function(){if(this.element){this.element.classList.remove(this.activeClass);}},onfirstseen:function(){}};});var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());define("shared/lazy_loader",(function(global){return function(){var ret,fn;return ret||global.LazyLoader;};}(this)));define('dom',['require','exports','module','shared/lazy_loader'],function(require,exports){'use strict';var LazyLoader=require('shared/lazy_loader');exports.load=function(id,require,onLoad,config){if(config.isBuild){return onLoad();}
var node=document.getElementById(id);if(!node){onLoad.error('can\'t find element with id #'+id);return;}
LazyLoader.load(node,function(){onLoad(node);});};});define('views/errors',['require','exports','module','view','core','dom!errors'],function(require,exports,module){'use strict';var View=require('view');var core=require('core');require('dom!errors');function Errors(){View.apply(this,arguments);core.syncController.on('offline',this);}
module.exports=Errors;Errors.prototype={__proto__:View.prototype,selectors:{status:'*[role="application"] > section[role="status"]',errors:'*[role="application"] > section > .errors'},handleEvent:function(event){switch(event.type){case'offline':this.showErrors([{name:'offline'}]);break;}}};});var GestureDetector=(function(){function GD(e,options){this.element=e;this.options=options||{};this.options.panThreshold=this.options.panThreshold||GD.PAN_THRESHOLD;this.state=initialState;this.timers={};}
GD.prototype.startDetecting=function(){var self=this;eventtypes.forEach(function(t){self.element.addEventListener(t,self);});};GD.prototype.stopDetecting=function(){var self=this;eventtypes.forEach(function(t){self.element.removeEventListener(t,self);});};GD.prototype.handleEvent=function(e){var handler=this.state[e.type];if(!handler){return;}
if(e.changedTouches){for(var i=0;i<e.changedTouches.length;i++){handler(this,e,e.changedTouches[i]);handler=this.state[e.type];if(!handler){return;}}}
else{handler(this,e);}};GD.prototype.startTimer=function(type,time){this.clearTimer(type);var self=this;this.timers[type]=setTimeout(function(){self.timers[type]=null;var handler=self.state[type];if(handler){handler(self,type);}},time);};GD.prototype.clearTimer=function(type){if(this.timers[type]){clearTimeout(this.timers[type]);this.timers[type]=null;}};GD.prototype.switchTo=function(state,event,touch){this.state=state;if(state.init){state.init(this,event,touch);}};GD.prototype.emitEvent=function(type,detail){if(!this.target){console.error('Attempt to emit event with no target');return;}
var event=this.element.ownerDocument.createEvent('CustomEvent');event.initCustomEvent(type,true,true,detail);this.target.dispatchEvent(event);};GD.HOLD_INTERVAL=1000;GD.PAN_THRESHOLD=20;GD.DOUBLE_TAP_DISTANCE=50;GD.DOUBLE_TAP_TIME=500;GD.VELOCITY_SMOOTHING=0.5;GD.SCALE_THRESHOLD=20;GD.ROTATE_THRESHOLD=22.5;GD.THRESHOLD_SMOOTHING=0.9;var abs=Math.abs,floor=Math.floor,sqrt=Math.sqrt,atan2=Math.atan2;var PI=Math.PI;var eventtypes=['touchstart','touchmove','touchend'];function eventTime(e){var ts=e.timeStamp;if(ts>2*Date.now()){return Math.floor(ts/1000);}else{return ts;}}
function coordinates(e,t){return Object.freeze({screenX:t.screenX,screenY:t.screenY,clientX:t.clientX,clientY:t.clientY,timeStamp:eventTime(e)});}
function midpoints(e,t1,t2){return Object.freeze({screenX:floor((t1.screenX+t2.screenX)/2),screenY:floor((t1.screenY+t2.screenY)/2),clientX:floor((t1.clientX+t2.clientX)/2),clientY:floor((t1.clientY+t2.clientY)/2),timeStamp:eventTime(e)});}
function between(c1,c2){var r=GD.THRESHOLD_SMOOTHING;return Object.freeze({screenX:floor(c1.screenX+r*(c2.screenX-c1.screenX)),screenY:floor(c1.screenY+r*(c2.screenY-c1.screenY)),clientX:floor(c1.clientX+r*(c2.clientX-c1.clientX)),clientY:floor(c1.clientY+r*(c2.clientY-c1.clientY)),timeStamp:floor(c1.timeStamp+r*(c2.timeStamp-c1.timeStamp))});}
function touchDistance(t1,t2){var dx=t2.screenX-t1.screenX;var dy=t2.screenY-t1.screenY;return sqrt(dx*dx+dy*dy);}
function touchDirection(t1,t2){return atan2(t2.screenY-t1.screenY,t2.screenX-t1.screenX)*180/PI;}
function touchRotation(d1,d2){var angle=d2-d1;if(angle>180){angle-=360;}else if(angle<=-180){angle+=360;}
return angle;}
function isDoubleTap(lastTap,thisTap){var dx=abs(thisTap.screenX-lastTap.screenX);var dy=abs(thisTap.screenY-lastTap.screenY);var dt=thisTap.timeStamp-lastTap.timeStamp;return(dx<GD.DOUBLE_TAP_DISTANCE&&dy<GD.DOUBLE_TAP_DISTANCE&&dt<GD.DOUBLE_TAP_TIME);}
var initialState={name:'initialState',init:function(d,e,t){d.target=null;d.start=d.last=null;d.touch1=d.touch2=null;d.vx=d.vy=null;d.startDistance=d.lastDistance=null;d.startDirection=d.lastDirection=null;d.lastMidpoint=null;d.scaled=d.rotated=null;if(e&&t&&e.type==='touchstart'){initialState.touchstart(d,e,t);}},touchstart:function(d,e,t){d.switchTo(touchStartedState,e,t);}};var touchStartedState={name:'touchStartedState',init:function(d,e,t){d.target=e.target;d.touch1=t.identifier;d.start=d.last=coordinates(e,t);if(d.options.holdEvents){d.startTimer('holdtimeout',GD.HOLD_INTERVAL);}},touchstart:function(d,e,t){d.clearTimer('holdtimeout');if(e.touches.length>1){d.switchTo(transformState,e,t);}
else{console.warn('Ignoring missing touchend event. See bug 1162771.');d.switchTo(initialState,e,t);}},touchmove:function(d,e,t){if(t.identifier!==d.touch1){return;}
if(abs(t.screenX-d.start.screenX)>d.options.panThreshold||abs(t.screenY-d.start.screenY)>d.options.panThreshold){d.clearTimer('holdtimeout');d.switchTo(panStartedState,e,t);}},touchend:function(d,e,t){if(t.identifier!==d.touch1){return;}
if(d.lastTap&&isDoubleTap(d.lastTap,d.start)){d.emitEvent('tap',d.start);d.emitEvent('dbltap',d.start);d.lastTap=null;}
else{d.emitEvent('tap',d.start);d.lastTap=coordinates(e,t);}
d.clearTimer('holdtimeout');d.switchTo(initialState);},holdtimeout:function(d){d.switchTo(holdState);}};var panStartedState={name:'panStartedState',init:function(d,e,t){d.start=d.last=between(d.start,coordinates(e,t));if(e.type==='touchmove'){panStartedState.touchmove(d,e,t);}},touchmove:function(d,e,t){if(t.identifier!==d.touch1){return;}
var current=coordinates(e,t);d.emitEvent('pan',{absolute:{dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY},relative:{dx:current.screenX-d.last.screenX,dy:current.screenY-d.last.screenY},position:current});var dt=current.timeStamp-d.last.timeStamp;var vx=(current.screenX-d.last.screenX)/dt;var vy=(current.screenY-d.last.screenY)/dt;if(d.vx==null){d.vx=vx;d.vy=vy;}
else{d.vx=d.vx*GD.VELOCITY_SMOOTHING+
vx*(1-GD.VELOCITY_SMOOTHING);d.vy=d.vy*GD.VELOCITY_SMOOTHING+
vy*(1-GD.VELOCITY_SMOOTHING);}
d.last=current;},touchend:function(d,e,t){if(t.identifier!==d.touch1){return;}
var current=coordinates(e,t);var dx=current.screenX-d.start.screenX;var dy=current.screenY-d.start.screenY;var angle=atan2(dy,dx)*180/PI;if(angle<0){angle+=360;}
var direction;if(angle>=315||angle<45){direction='right';}else if(angle>=45&&angle<135){direction='down';}else if(angle>=135&&angle<225){direction='left';}else if(angle>=225&&angle<315){direction='up';}
d.emitEvent('swipe',{start:d.start,end:current,dx:dx,dy:dy,dt:e.timeStamp-d.start.timeStamp,vx:d.vx,vy:d.vy,direction:direction,angle:angle});d.switchTo(initialState);}};var holdState={name:'holdState',init:function(d){d.emitEvent('holdstart',d.start);},touchmove:function(d,e,t){var current=coordinates(e,t);d.emitEvent('holdmove',{absolute:{dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY},relative:{dx:current.screenX-d.last.screenX,dy:current.screenY-d.last.screenY},position:current});d.last=current;},touchend:function(d,e,t){var current=coordinates(e,t);d.emitEvent('holdend',{start:d.start,end:current,dx:current.screenX-d.start.screenX,dy:current.screenY-d.start.screenY});d.switchTo(initialState);}};var transformState={name:'transformState',init:function(d,e,t){d.touch2=t.identifier;var t1=e.touches.identifiedTouch(d.touch1);var t2=e.touches.identifiedTouch(d.touch2);d.startDistance=d.lastDistance=touchDistance(t1,t2);d.startDirection=d.lastDirection=touchDirection(t1,t2);d.scaled=d.rotated=false;},touchmove:function(d,e,t){if(t.identifier!==d.touch1&&t.identifier!==d.touch2){return;}
var t1=e.touches.identifiedTouch(d.touch1);var t2=e.touches.identifiedTouch(d.touch2);var midpoint=midpoints(e,t1,t2);var distance=touchDistance(t1,t2);var direction=touchDirection(t1,t2);var rotation=touchRotation(d.startDirection,direction);if(!d.scaled){if(abs(distance-d.startDistance)>GD.SCALE_THRESHOLD){d.scaled=true;d.startDistance=d.lastDistance=floor(d.startDistance+
GD.THRESHOLD_SMOOTHING*(distance-d.startDistance));}else{distance=d.startDistance;}}
if(!d.rotated){if(abs(rotation)>GD.ROTATE_THRESHOLD){d.rotated=true;}else{direction=d.startDirection;}}
if(d.scaled||d.rotated){d.emitEvent('transform',{absolute:{scale:distance/d.startDistance,rotate:touchRotation(d.startDirection,direction)},relative:{scale:distance/d.lastDistance,rotate:touchRotation(d.lastDirection,direction)},midpoint:midpoint});d.lastDistance=distance;d.lastDirection=direction;d.lastMidpoint=midpoint;}},touchend:function(d,e,t){if(t.identifier===d.touch2){d.touch2=null;}else if(t.identifier===d.touch1){d.touch1=d.touch2;d.touch2=null;}else{return;}
if(d.scaled||d.rotated){d.emitEvent('transformend',{absolute:{scale:d.lastDistance/d.startDistance,rotate:touchRotation(d.startDirection,d.lastDirection)},relative:{scale:1,rotate:0},midpoint:d.lastMidpoint});}
d.switchTo(afterTransformState);}};var afterTransformState={name:'afterTransformState',touchstart:function(d,e,t){d.switchTo(transformState,e,t);},touchend:function(d,e,t){if(t.identifier===d.touch1){d.switchTo(initialState);}}};return GD;}());define("shared/gesture_detector",(function(global){return function(){var ret,fn;return ret||global.GestureDetector;};}(this)));define('views/month_day',['require','exports','module','common/calc','core'],function(require,exports,module){'use strict';var Calc=require('common/calc');var core=require('core');function MonthDay(options){this.container=options.container;this.date=options.date;this.month=options.month;this._updateBusyCount=this._updateBusyCount.bind(this);}
module.exports=MonthDay;MonthDay.prototype={container:null,date:null,element:null,month:null,_observer:null,create:function(){var dayId=Calc.getDayId(this.date);var id='month-view-day-'+dayId;var state=Calc.relativeState(this.date,this.month);var l10nStateId=state.replace(/\s/g,'-');var date=this.date.getDate();if(l10nStateId==='future'||l10nStateId==='past'){l10nStateId='';}else{l10nStateId+='-description';}
var el=document.createElement('li');el.setAttribute('role','gridcell');el.id=id;el.tabindex=0;el.setAttribute('aria-describedby',`${id}-busy-indicator ${id}-description`);el.dataset.date=dayId;el.className=state;el.classList.add('month-day');el.innerHTML=`<span class="day" role="button">${date}</span>
      <div id="${id}-busy-indicator" class="busy-indicator"
        aria-hidden="true"></div>
      <span id="${id}-description" aria-hidden="true"
        data-l10n-id="${l10nStateId}"></span>`;this.element=el;this.container.appendChild(el);},activate:function(){this._observer=core.bridge.observeDay(this.date);this._observer.listen(this._updateBusyCount);},deactivate:function(){this._observer&&this._observer.cancel();},destroy:function(){this.deactivate();this.container=this.element=null;},_updateBusyCount:function(data){var count=Math.min(3,data.amount);var holder=this.element.querySelector('.busy-indicator');if(count>0){holder.setAttribute('aria-label',navigator.mozL10n.get('busy',{n:count}));}else{holder.removeAttribute('aria-label');}
var diff=count-holder.childNodes.length;if(diff===0){return;}
if(diff>0){var dot;while(diff--){dot=document.createElement('div');dot.className='gaia-icon icon-calendar-dot';holder.appendChild(dot);}
return;}
while(diff++){holder.removeChild(holder.firstChild);}}};});define('views/single_month',['require','exports','module','common/calc','./month_day','view','core'],function(require,exports,module){'use strict';var Calc=require('common/calc');var MonthDay=require('./month_day');var View=require('view');var core=require('core');var daysBetween=Calc.daysBetween;var daysInWeek=Calc.daysInWeek;var getDayId=Calc.getDayId;var spanOfMonth=Calc.spanOfMonth;var SELECTED='selected';function SingleMonth(){View.apply(this,arguments);this.days=[];this.timespan=spanOfMonth(this.date);}
module.exports=SingleMonth;SingleMonth.prototype={__proto__:View.prototype,active:false,container:null,date:null,days:null,element:null,create:function(){var element=document.createElement('section');element.className='month';element.setAttribute('role','grid');element.setAttribute('aria-labelledby','current-month-year');element.setAttribute('aria-readonly',true);element.innerHTML=this._renderDayHeaders();element.dataset.date=getDayId(this.date);this.element=element;this._buildWeeks();},_renderDayHeaders:function(){var startDay=Calc.startDay;var days=[];var i;for(i=startDay;i<7;i++){days.push(this._dayHeader(i));}
if(startDay>0){for(i=0;i<startDay;i++){days.push(this._dayHeader(i));}}
var html=`<header id="month-days" role="presentation">
      <ol role="row">${days.join('')}</ol>
    </header>`;return html;},_dayHeader:function(dayIndex){return`<li data-l10n-id="weekday-${dayIndex}-single-char"
      role="columnheader"></li>`;},_buildWeeks:function(){var weekLength=daysInWeek();var week;daysBetween(this.timespan).forEach((date,i)=>{if(i%weekLength===0){week=document.createElement('ol');week.setAttribute('role','row');this.element.appendChild(week);}
var day=new MonthDay({date:date,month:this.date,container:week});day.create();this.days.push(day);});},activate:function(){if(this.active){return;}
this.active=true;this.onactive();this.days.forEach(day=>day.activate());this._onSelectedDayChange(core.timeController.selectedDay);core.timeController.on('selectedDayChange',this);},deactivate:function(){if(!this.active){return;}
this.active=false;this.oninactive();this.days.forEach(day=>day.deactivate());core.timeController.off('selectedDayChange',this);},destroy:function(){this.deactivate();this._detach();this.days.forEach(day=>day.destroy());this.days=[];},append:function(){this.container.appendChild(this.element);},_detach:function(){if(this.element&&this.element.parentNode){this.element.parentNode.removeChild(this.element);}},handleEvent:function(e){if(e.type==='selectedDayChange'){this._onSelectedDayChange(e.data[0]);}},_clearSelectedDay:function(){var day=this.element.querySelector(`li.${SELECTED}`);if(day){day.classList.remove(SELECTED);day.removeAttribute('aria-selected');}},_onSelectedDayChange:function(date){this._clearSelectedDay();if(!date||!this.timespan.contains(date)){return;}
var el=this.element.querySelector(`li[data-date="${getDayId(date)}"]`);el.classList.add(SELECTED);el.setAttribute('aria-selected',true);el.focus();}};});define('views/month',['require','exports','module','common/calc','shared/gesture_detector','./single_month','view','core','performance','router','time_observer'],function(require,exports,module){'use strict';var Calc=require('common/calc');var GestureDetector=require('shared/gesture_detector');var SingleMonth=require('./single_month');var View=require('view');var core=require('core');var dateFromId=Calc.dateFromId;var monthStart=Calc.monthStart;var performance=require('performance');var router=require('router');var timeObserver=require('time_observer');var XSWIPE_OFFSET=window.innerWidth/10;function Month(){View.apply(this,arguments);this.frames=new Map();window.addEventListener('localized',this);this._setPresentDate=this._setPresentDate.bind(this);}
module.exports=Month;Month.prototype={__proto__:View.prototype,SCALE:'month',selectors:{element:'#month-view',},date:null,currentFrame:null,_lastTarget:null,frames:null,onactive:function(){View.prototype.onactive.apply(this,arguments);core.timeController.scale=this.SCALE;if(this.currentFrame){this.currentFrame.activate();}},_onswipe:function(data){if(Math.abs(data.dy)>(Math.abs(data.dx)-XSWIPE_OFFSET)){return;}
var dir=document.documentElement.dir==='rtl'?-1:1;this._move(dir*data.dx<0);},_onwheel:function(event){if(event.deltaMode!==event.DOM_DELTA_PAGE||event.deltaX===0){return;}
this._move(event.deltaX>0);},_move:function(isNext){var controller=core.timeController;var date=isNext?this._nextTime():this._previousTime();controller.selectedDay=date;controller.move(date);},_nextTime:function(){return monthStart(this.date,1);},_previousTime:function(){return monthStart(this.date,-1);},_initEvents:function(){this.controller=core.timeController;this.element.addEventListener('swipe',this);this.element.addEventListener('wheel',this);this.controller.on('monthChange',this);this.delegate(this.element,'click','.month-day',this);this.delegate(this.element,'dbltap','.month-day',this);timeObserver.on('day',this._setPresentDate);this.gd=new GestureDetector(this.element);this.gd.startDetecting();},handleEvent:function(e,target){switch(e.type){case'swipe':this._onswipe(e.detail);break;case'wheel':this._onwheel(e);break;case'click':var date=dateFromId(target.dataset.date);this.controller.selectedDay=date;break;case'dbltap':if(this._lastTarget===target){this._goToAddEvent();}
break;case'monthChange':this.changeDate(e.data[0]);break;case'localized':this.reconstruct();break;}
this._lastTarget=target;},_goToAddEvent:function(date){setTimeout(()=>{router.go('/event/add/');},50);},changeDate:function(time){this.date=monthStart(time);if(this.currentFrame){this.currentFrame.deactivate();}
this.currentFrame=this._getFrame(this.date);this._trimFrames();this._appendFrames();this.currentFrame.activate();},_getFrame:function(date){var id=date.getTime();var frame=this.frames.get(id);if(!frame){frame=new SingleMonth({date:date,container:this.element});frame.create();this.frames.set(id,frame);}
return frame;},_trimFrames:function(){if(this.frames.size<=3){return;}
var delta=31*24*60*60*1000;this.frames.forEach((frame,ts)=>{var base=Number(this.date);if(Math.abs(base-ts)>delta){frame.destroy();this.frames.delete(ts);}});},_appendFrames:function(){Array.from(this.frames.keys()).sort((a,b)=>a-b).forEach(key=>this.frames.get(key).append());},_setPresentDate:function(){var id=Calc.getDayId(new Date());var presentDate=this.element.querySelector('[data-date="'+id+'"]');var previousDate=this.element.querySelector('.present');if(previousDate){previousDate.classList.remove('present');previousDate.classList.add('past');}
if(presentDate){presentDate.classList.add('present');}},oninactive:function(){View.prototype.oninactive.call(this);if(this.currentFrame){this.currentFrame.deactivate();}},onfirstseen:function(){this._initEvents();this.changeDate(this.controller.month);performance.monthReady();},destroy:function(){this.frames.forEach((frame,key)=>{this.frames.delete(key);frame.destroy();});},reconstruct:function(){this.destroy();this.changeDate(this.controller.month);}};});define('template',['require','exports','module'],function(require,exports,module){'use strict';var POSSIBLE_HTML=/[&<>"'`]/;var span=document.createElement('span');function create(templates){var key,result={};for(key in templates){if(templates.hasOwnProperty(key)){result[key]=new Template(templates[key]);}}
return result;}
function Template(fn){this.template=fn;}
module.exports=Template;Template.prototype={arg:function(key){if(typeof(this.data)==='undefined'){return'';}else if(typeof(this.data)!=='object'){return this.data;}
return this.data[key];},h:function(a){var arg=this.arg(a);arg=arg==null?'':String(arg);if(POSSIBLE_HTML.test(arg)){span.textContent=arg;return span.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}else{return arg;}},s:function(a){var arg=this.arg(a);return String((arg||''));},bool:function(key,onTrue){if(this.data[key]){return onTrue;}else{return'';}},l10n:function(key,prefix){var value=this.arg(key);if(prefix){value=prefix+value;}
return navigator.mozL10n.get(value);},l10nId:function(a){return this.s(a).replace(/\s/g,'-');},render:function(data){this.data=data;return this.template();},renderEach:function(objects,join){var i=0,len=objects.length,result=[];for(;i<len;i++){result.push(this.render(objects[i]));}
if(typeof(join)!=='undefined'){return result.join(join);}
return result;}};Template.create=create;});define('templates/date_span',['require','exports','module','common/calc','shared/intl_helper','template'],function(require,exports,module){'use strict';var Calc=require('common/calc');var IntlHelper=require('shared/intl_helper');var create=require('template').create;module.exports=create({time:function(){var time=this.arg('time');var format=this.h('format');var formatter=IntlHelper.get(format);var displayTime=formatter.format(time);return`<span data-l10n-date-format="${format}"
                  data-date="${time}">${displayTime}</span>`;},hour:function(){var hour=this.h('hour');var format=this.h('format');var className=this.h('className');var date=new Date(0);date.setHours(hour,0,0,0);var displayHour;var formatter=IntlHelper.get(format);if(this.arg('addAmPmClass')){displayHour=formatter.format(date,{dayperiod:'<span class="ampm" aria-hidden="true">$&</span>',});}else{displayHour=formatter.format(date);}
var l10nAttr=(hour===Calc.ALLDAY)?'data-l10n-id="hour-allday"':`data-l10n-date-format="${format}"`;return`<span class="${className}" data-date="${date}" 
      ${l10nAttr}>${displayHour}</span>`;}});});define('templates/month_day_agenda',['require','exports','module','./date_span','template'],function(require,exports,module){'use strict';var DateSpan=require('./date_span');var create=require('template').create;var MonthDayAgenda=create({event:function(){var busytimeId=this.h('busytimeId');var color=this.h('color');var eventTime;if(this.arg('isAllDay')){eventTime='<div class="all-day" data-l10n-id="hour-allday"></div>';}else{var startTime=formatTime(this.arg('startTime'));var endTime=formatTime(this.arg('endTime'));eventTime=`<div class="start-time">${startTime}</div>
        <div class="end-time">${endTime}</div>`;}
var title=this.h('title');var eventDetails=`<h5 role="presentation" dir="auto">${title}</h5>`;var location=this.h('location');if(location&&location.length>0){eventDetails+=`<span class="details" dir="auto">
        <span class="location">${location}</span>
      </span>`;}
var alarmClass=this.arg('hasAlarms')?'has-alarms':'';return`<a href="/event/show/${busytimeId}/" class="event ${alarmClass}"
      role="option" aria-describedby="${busytimeId}-icon-calendar-alarm">
      <div class="container">
      <div class="gaia-icon icon-calendar-dot" style="color:${color}"
          aria-hidden="true"></div>
        <div class="event-time">${eventTime}</div>
        <div class="event-details">${eventDetails}</div>
        <div id="${busytimeId}-icon-calendar-alarm" aria-hidden="true"
          class="gaia-icon icon-calendar-alarm" style="color:${color}"
          data-l10n-id="icon-calendar-alarm"></div>
      </div>
      </a>`;}});module.exports=MonthDayAgenda;function formatTime(time){return DateSpan.time.render({time:time,format:'shortTimeFormat'});}});define('views/month_day_agenda',['require','exports','module','shared/intl_helper','view','core','common/calc','common/calc','performance','templates/month_day_agenda'],function(require,exports,module){'use strict';var IntlHelper=require('shared/intl_helper');var Parent=require('view');var core=require('core');var createDay=require('common/calc').createDay;var isAllDay=require('common/calc').isAllDay;var performance=require('performance');var template=require('templates/month_day_agenda');function MonthDayAgenda(){Parent.apply(this,arguments);this._render=this._render.bind(this);this.controller=core.timeController;}
module.exports=MonthDayAgenda;MonthDayAgenda.prototype={__proto__:Parent.prototype,date:null,_observer:null,selectors:{element:'#month-day-agenda',events:'.day-events',currentDate:'#event-list-date',emptyMessage:'#empty-message'},get element(){return this._findElement('element');},get events(){return this._findElement('events');},get currentDate(){return this._findElement('currentDate');},get emptyMessage(){return this._findElement('emptyMessage');},onactive:function(){Parent.prototype.onactive.call(this);this.controller.on('selectedDayChange',this);this.changeDate(this.controller.selectedDay);},oninactive:function(){Parent.prototype.oninactive.call(this);this._unobserve();this.controller.removeEventListener('selectedDayChange',this);this.date=null;},_unobserve:function(){this._observer&&this._observer.cancel();this._observer=null;},changeDate:function(date){date=date||createDay(new Date());this.date=date;this._unobserve();this._observer=core.bridge.observeDay(date);this._observer.listen(this._render);var formatId='months-day-view-header-format';var formatter=IntlHelper.get(formatId);this.currentDate.textContent=formatter.format(date);this.currentDate.dataset.date=date;this.currentDate.dataset.l10nDateFormat=formatId;},_render:function(records){this.events.innerHTML=records.allday.concat(records.basic).map(this._renderEvent,this).join('');this.emptyMessage.classList.toggle('active',records.amount===0);performance.monthsDayReady();},_renderEvent:function(record){var{event,busytime,color}=record;var{startDate,endDate}=busytime;return template.event.render({hasAlarms:!!(event.remote.alarms&&event.remote.alarms.length),busytimeId:busytime._id,color:color,title:event.remote.title,location:event.remote.location,startTime:startDate,endTime:endDate,isAllDay:isAllDay(this.date,startDate,endDate)});},handleEvent:function(e){switch(e.type){case'selectedDayChange':this.changeDate(e.data[0]);break;}}};});define('views/time_header',['require','exports','module','shared/intl_helper','view','core','router'],function(require,exports,module){'use strict';var IntlHelper=require('shared/intl_helper');var View=require('view');var core=require('core');var router=require('router');var SETTINGS=/settings/;function TimeHeader(){View.apply(this,arguments);this.controller=core.timeController;this.controller.on('scaleChange',this);this.element.addEventListener('action',(e)=>{e.stopPropagation();var path=window.location.pathname;if(SETTINGS.test(path)){router.resetState();}else{router.show('/settings/');}});}
module.exports=TimeHeader;TimeHeader.prototype={__proto__:View.prototype,selectors:{element:'#time-header',title:'#time-header h1'},scales:{month:'multi-month-view-header-format',day:'day-view-header-format',multiMonth:'multi-month-view-header-format'},handleEvent:function(e){switch(e.type){case'yearChange':case'monthChange':case'dayChange':case'weekChange':this._updateTitle();break;case'scaleChange':this._updateScale.apply(this,e.data);break;}},get title(){return this._findElement('title');},_scaleEvent:function(event){switch(event){case'month':return'monthChange';case'year':return'yearChange';case'week':return'weekChange';}
return'dayChange';},_updateScale:function(newScale,oldScale){if(oldScale){this.controller.removeEventListener(this._scaleEvent(oldScale),this);}
this.controller.addEventListener(this._scaleEvent(newScale),this);this._updateTitle();},getScale:function(type){var position=this.controller.position;if(type==='week'){var lastWeekday=this._getLastWeekday();if(position.getMonth()!==lastWeekday.getMonth()){return this._localeFormat(position,'multiMonth')+' '+
this._localeFormat(lastWeekday,'multiMonth');}
type='month';}
return this._localeFormat(position,type||'month');},_getLastWeekday:function(){var position=this.controller.position;return new Date(position.getFullYear(),position.getMonth(),position.getDate()+4);},_localeFormat:function(date,scale){if(!this.scales[scale]){return;}
var formatter=IntlHelper.get(this.scales[scale]);return formatter.format(date);},_updateTitle:function(){var con=core.timeController;var title=this.title;title.dataset.l10nDateFormat=this.scales[con.scale]||this.scales.month;title.dataset.date=con.position.toString();title.textContent=this.getScale(con.scale);},render:function(){this._updateScale(this.controller.scale);}};});define('views/view_selector',['require','exports','module','view','core','common/next_tick','time_observer'],function(require,exports,module){'use strict';var View=require('view');var core=require('core');var nextTick=require('common/next_tick');var timeObserver=require('time_observer');function ViewSelector(opts){View.call(this,opts);this._showTodayDate=this._showTodayDate.bind(this);}
module.exports=ViewSelector;ViewSelector.prototype={__proto__:View.prototype,selectors:{element:'#view-selector'},render:function(){this._showTodayDate();this.delegate(this.element,'click','a',this);timeObserver.on('day',this._showTodayDate);},handleEvent:function(event,target){if(target.matches('[role="tab"]')){this._toggleActiveTabOnClick(event);}else{this._moveToTodayOnClick(event);}},_moveToTodayOnClick:function(event){var date=new Date();core.timeController.move(date);core.timeController.selectedDay=date;event.preventDefault();},_toggleActiveTabOnClick:function(event){var tabs=this.element.querySelectorAll('[role="tab"]');Array.from(tabs).forEach(tab=>{if(tab!==event.target){tab.setAttribute('aria-selected',false);return;}
nextTick(()=>tab.setAttribute('aria-selected',true));});},_showTodayDate:function(){var icon=this.element.querySelector('.icon-calendar-today');icon.innerHTML=(new Date()).getDate();}};});define("bundle",function(){});