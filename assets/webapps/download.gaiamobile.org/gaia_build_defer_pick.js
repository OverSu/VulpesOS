;(function(global){'use strict';global.mozIntl={formatList:function(list){return navigator.mozL10n.formatValue('listSeparator_middle').then(sep=>list.join(sep));},DateTimeFormat:function(locales,options){const resolvedOptions=Object.assign({},options);if(resolvedOptions.dayperiod){if(resolvedOptions.hour===undefined){resolvedOptions.hour='numeric';}}
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
return undefined;}})(this);;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;'use strict';var DownloadStore=(function(){var datastore;const DATASTORE_NAME='download_store';var downloadListDB;var downloadList=[];var lastRevisionId;const LIST_DB='download_list';const LIST_STORE='download_list';const LIST_KEY=0;const REVISION_KEY=1;var Request=function(){this.done=function(result){if(typeof this.onsuccess==='function'){this.result=result;window.setTimeout(function(){this.onsuccess({target:this});}.bind(this),0);}};this.failed=function(error){if(typeof this.onerror==='function'){this.error=error;window.setTimeout(function(){this.onerror({target:this});}.bind(this),0);}};};function promisify(request){return new Promise(function(resolve,reject){request.onsuccess=(event)=>{resolve(event.target.result);};request.onerror=(event)=>{reject(event.target.errorCode);};});}
var readyState;function init(success,fail){if(readyState==='initialized'){success();return;}
if(readyState==='initializing'){document.addEventListener('ds-initialized',function oninitalized(){document.removeEventListener('ds-initialized',oninitalized);success();});return;}
readyState='initializing';if(!navigator.getDataStores){var messageError='Data store: DataStore API is not working';console.error(messageError);fail({message:messageError});return;}
navigator.getDataStores(DATASTORE_NAME).then(function(ds){var messageError='Download Store: Cannot get access to the DataStore';if(ds.length<1){console.error(messageError);throw({message:messageError});}
datastore=ds[0];}).then(function(){return openDownloadListIndexedDB();}).then(function(db){downloadListDB=db;var listStore=downloadListDB.transaction(LIST_STORE,'readonly').objectStore(LIST_STORE);return Promise.all([promisify(listStore.get(LIST_KEY)).then((value)=>{downloadList=value;}),promisify(listStore.get(REVISION_KEY)).then((value)=>{lastRevisionId=value;})]);}).then(function(){readyState='initialized';const LEGACY_INDEX_ID=1;if(downloadList&&downloadList.includes(LEGACY_INDEX_ID)){return promisify(get(LEGACY_INDEX_ID)).then((download)=>{if('byTimestamp'in download){downloadList.splice(downloadList.indexOf(LEGACY_INDEX_ID),1);}});}}).then(function(){notifyOpenSuccess(success);}).catch(function(e){console.error('Error while opening the Download Store: ',e.message);fail(e);});}
function openDownloadListIndexedDB(){return new Promise(function(resolve,reject){var request=indexedDB.open(LIST_DB);request.onsuccess=function(event){var db=event.target.result;resolve(db);};request.onerror=function(event){reject(event.target.errorCode);};request.onupgradeneeded=function(event){var db=event.target.result;promisify(db.createObjectStore(LIST_STORE)).then(()=>{var listStore=db.transaction(LIST_STORE,'readwrite').objectStore(LIST_STORE);return Promise.all([promisify(listStore.add([],LIST_KEY)),promisify(listStore.add(0,REVISION_KEY))]);}).catch(reject);};request.onblocked=function(event){reject(event.target.errorCode);};});}
function notifyOpenSuccess(cb){window.setTimeout(cb,0);document.dispatchEvent(new CustomEvent('ds-initialized'));}
var fieldsToPropagate=['url','path','totalBytes','contentType','startTime','state','storageName','storagePath'];function cookDownload(download){var ret=Object.create(null);fieldsToPropagate.forEach(function(field){ret[field]=download[field];});ret.finalizeTime=new Date();return ret;}
function defaultError(req){return defaultErrorCb.bind(null,req);}
function defaultErrorCb(request,error){request.failed(error);}
function defaultSuccess(req){return defaultSuccessCb.bind(null,req);}
function defaultSuccessCb(request,result){request.done(result);}
function updateDownloadList(){var cursor=datastore.sync(lastRevisionId);function cursorResolve(task){switch(task.operation){case'done':lastRevisionId=task.revisionId;var listStore=downloadListDB.transaction(LIST_STORE,'readwrite').objectStore(LIST_STORE);return Promise.all([promisify(listStore.put(downloadList,LIST_KEY)),promisify(listStore.put(lastRevisionId,REVISION_KEY))]);case'clear':downloadList=[];break;case'add':downloadList.push(task.id);break;case'update':break;case'remove':var i=downloadList.indexOf(task.id);if(i>=0){downloadList.splice(i,1);}
break;}
return cursor.next().then(cursorResolve);}
return cursor.next().then(cursorResolve);}
function doAdd(download,req){var downloadCooked=cookDownload(download);datastore.add(downloadCooked).then(function(id){downloadCooked.id=id;datastore.put(downloadCooked,id).then(function(){req.done(downloadCooked);},defaultError(req));},defaultError(req));}
function add(download){var req=new Request();window.setTimeout(function(){init(doAdd.bind(null,download,req),req.failed.bind(req));});return req;}
function doGet(id,req){datastore.get(id).then(function(download){req.done(download);},defaultError(req));}
function get(id){var req=new Request();window.setTimeout(function(){init(doGet.bind(null,id,req),req.failed.bind(req));});return req;}
function doGetAll(req){updateDownloadList().then(function(){datastore.get.apply(datastore,downloadList).then(defaultSuccess(req),defaultError(req));},defaultError(req));}
function getAll(){var req=new Request();window.setTimeout(function(){init(doGetAll.bind(null,req),req.failed.bind(req));});return req;}
function doRemove(id,req){datastore.remove(id).then(function(success){if(success){defaultSuccess(req);}else{req.failed({message:'The download with id: '+id+'does not exist'});}},defaultError(req));}
function remove(download){var req=new Request();window.setTimeout(function(){init(doRemove.bind(null,download.id,req),req.failed.bind(req));});return req;}
function doAddListener(listener){datastore.addEventListener('change',listener);}
function addListener(listener){var req=new Request();window.setTimeout(function(){init(doAddListener.bind(null,listener),req.failed.bind(req));});return req;}
function doRemoveListener(listener){datastore.removeEventListener('change',listener);}
function removeListener(listener){var req=new Request();window.setTimeout(function(){init(doRemoveListener.bind(null,listener),req.failed.bind(req));});return req;}
return{get:get,getAll:getAll,add:add,remove:remove,addListener:addListener,removeListener:removeListener};}());;(function(exports){'use strict';var NUMBER_OF_DECIMALS=2;var BYTE_SCALE=['B','KB','MB','GB','TB'];function _getFormattedSize(bytes){if(bytes===undefined||isNaN(bytes)){return Promise.resolve(null);}
var index=0;while(bytes>=1024&&index<BYTE_SCALE.length){bytes/=1024;++index;}
return document.l10n.formatValue('byteUnit-'+BYTE_SCALE[index]).then(unit=>{return document.l10n.formatValue('fileSize',{size:bytes.toFixed(NUMBER_OF_DECIMALS),unit:unit});});}
function _calcPercentage(currently,total){if(total===0){return 0;}
return parseInt((100*currently)/total);}
var DownloadFormatter={getFormattedSize:function(bytes){return _getFormattedSize(bytes);},getPercentage:function(download){return _calcPercentage(download.currentBytes,download.totalBytes);},getFileName:function(download){return download.path.split('/').pop();},getTotalSize:function(download){var bytes=download.totalBytes;return _getFormattedSize(bytes);},getDownloadedSize:function(download){var bytes=download.currentBytes;return _getFormattedSize(bytes);},getDate:function(download){var date;try{date=download.startTime;}catch(ex){date=new Date();console.error(ex);}
var formatter=mozIntl._gaia.RelativeDate(navigator.languages);return formatter.format(date);},getUUID:function(download){return download.id||this.getFileName(download);}};exports.DownloadFormatter=DownloadFormatter;}(this));;'use strict';(function(exports){const CHUNK_SIZE=10;function DownloadPicker(){this.header=document.querySelector('#header');this.list=document.querySelector('#downloads ul');this.downloads=Object.create(null);navigator.mozSetMessageHandler('activity',this.handleActivity.bind(this));}
DownloadPicker.prototype={handleActivity:function(activity){switch(activity.source.name){case'pick':this.activity=activity;this.attachActionHandlers();this.renderList();break;default:activity.postError('name not supported');}},renderList:function(){DownloadStore.getAll().onsuccess=(event)=>{var result=event.target.result;if(!Array.isArray(result)){result=[result];}
var items=result.reverse();var total=document.body.dataset.downloads=items.length;this.renderFragment(items,0,total);};},renderFragment:function(items,from,total){var target=document.createDocumentFragment();var idx=from;for(;idx<from+CHUNK_SIZE&&idx<total;idx++){this.appendDownload(items[idx],target);}
this.list.appendChild(target);(idx<total)&&setTimeout(()=>{this.renderFragment(items,idx,total);});},appendDownload:function(download,target){var id=download.id;if(this.downloads[id]){return;}
this.downloads[id]=download;var item=document.createElement('li');item.dataset.id=id;var pFileName=document.createElement('p');pFileName.classList.add('fileName');pFileName.textContent=DownloadFormatter.getFileName(download);var pInfo=document.createElement('p');pInfo.classList.add('info');DownloadFormatter.getDate(download,(date)=>{DownloadFormatter.getTotalSize(download).then(totalSize=>{navigator.mozL10n.setAttributes(pInfo,'summary',{date:date,status:totalSize});});});item.appendChild(pFileName);item.appendChild(pInfo);target.appendChild(item);},attachActionHandlers:function(){this.header.addEventListener('action',()=>{this.activity.postError('cancelled');});this.list.addEventListener('click',(event)=>{var download=this.downloads[event.target.dataset.id];download&&this.pick(download);});},pick:function(download){LazyLoader.load(['shared/js/mime_mapper.js','shared/js/download/download_helper.js'],()=>{var req=DownloadHelper.info(download);req.onsuccess=(event)=>{this.activity.postResult(event.target.result);};req.onerror=(event)=>{DownloadHelper.handlerError(req.error,download);};});}};exports.downloadPicker=new DownloadPicker();}(window));