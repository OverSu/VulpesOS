;;(function(root,factory){'use strict';if(typeof define==='function'&&define.amd){define(factory);}else if(typeof exports==='object'){module.exports=factory();}else{root.Sanitizer=factory();}}(this,function(){'use strict';var Sanitizer={_entity:/[&<>"'/]/g,_entities:{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;','/':'&#x2F;'},getEntity:function(s){return Sanitizer._entities[s];},escapeHTML:function(strings,...values){var result='';for(var i=0;i<strings.length;i++){result+=strings[i];if(i<values.length){result+=String(values[i]).replace(Sanitizer._entity,Sanitizer.getEntity);}}
return result;},createSafeHTML:function(strings,...values){var escaped=Sanitizer.escapeHTML(strings,...values);return{__html:escaped,toString:function(){return'[object WrappedHTMLObject]';},info:'This is a wrapped HTML object. See https://developer.mozilla.or'+'g/en-US/Firefox_OS/Security/Security_Automation for more.'};},unwrapSafeHTML:function(...htmlObjects){var markupList=htmlObjects.map(function(obj){return obj.__html;});return markupList.join('');}};return Sanitizer;}));;;'use strict';function enumerateAll(storages,dir,options){var storageIndex=0;var ds_cursor=null;var cursor={continue:function cursor_continue(){ds_cursor.continue();}};function onsuccess(e){cursor.result=e.target.result;if(!cursor.result){storageIndex++;if(storageIndex<storages.length){enumerateNextStorage();return;}}
if(cursor.onsuccess){try{cursor.onsuccess(e);}catch(err){console.warn('enumerateAll onsuccess threw',err);}}}
function onerror(e){cursor.error=e.target.error;if(cursor.error.name==='NotFoundError'&&storageIndex!==storages.length-1){storageIndex++;enumerateNextStorage();return;}
if(cursor.onerror){try{cursor.onerror(e);}catch(err){console.warn('enumerateAll onerror threw',err);}}}
function enumerateNextStorage(){ds_cursor=storages[storageIndex].enumerate(dir,options||{});ds_cursor.onsuccess=onsuccess;ds_cursor.onerror=onerror;}
enumerateNextStorage();return cursor;};;;window.COMPONENTS_BASE_URL='/shared/elements/';;;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;;'use strict';window.GaiaSubheader=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSubheaderBaseurl||'/shared/elements/gaia_subheader/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-subheader',{prototype:proto});})(window);;'use strict';window.GaiaRadio=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaRadioBaseurl||'/shared/elements/gaia_radio/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._wrapper=this._template.getElementById('radio');this._wrapper.addEventListener('click',this.handleClick.bind(this));if(this.dataset.role){this._wrapper.setAttribute('role',this.dataset.role);}
if(!this.hasAttribute('role')){this.setAttribute('role','presentation');}
this.configureClass();shadow.appendChild(this._template);this.checked=this.hasAttribute('checked');this._wrapper.setAttribute('aria-checked',this.checked);setTimeout(function nextTick(){var label=this.querySelector('label, p');if(!label){return;}
label.addEventListener('click',this.handleClick.bind(this));}.bind(this));ComponentUtils.style.call(this,baseurl);var dirObserver=new MutationObserver(this.updateInternalDir.bind(this));dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});this.updateInternalDir();};proto.updateInternalDir=function(){var internal=this.shadowRoot.firstElementChild;if(document.documentElement.dir==='rtl'){internal.setAttribute('dir','rtl');}else{internal.removeAttribute('dir');}};proto.handleClick=function(e){e.stopImmediatePropagation();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(this.checked){return;}
if(!event.defaultPrevented){this.checked=!this.checked;}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.configureClass=function(){this._wrapper.className=this.className;this._wrapper.classList.toggle('checked',this._checked);};proto.hideDetails=function(){this.shadowRoot.querySelector('.details').style.display='none';};proto.attributeChangedCallback=function(name,from,to){if(name==='class'){this._wrapper.className=to;}};Object.defineProperty(proto,'checked',{get:function(){return this._checked;},set:function(value){if(!this._template){return;}
if(value){var relevant=document.querySelectorAll('gaia-radio[name="'+this.getAttribute('name')+'"]');for(var i=0,iLen=relevant.length;i<iLen;i++){relevant[i].checked=false;}
this.setAttribute('checked',true);}else{this.removeAttribute('checked');}
this._wrapper.classList.toggle('checked',value);this._wrapper.setAttribute('aria-checked',value);this._checked=value;}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});Object.defineProperty(proto,'value',{get:function(){return this.getAttribute('value');},set:function(value){this.setAttribute('value',value);}});Object.defineProperty(proto,'type',{get:function(){return'gaia-radio';}});var template=document.createElement('template');template.innerHTML='<span role="radio" id="radio">'+'<span><content select="p,label"></content></span>'+'<div class="details"><content select="details"></content></div>'+'<div class="divider"></div>'+'</span>';return document.registerElement('gaia-radio',{prototype:proto});})(window);;'use strict';var Templates={soundList:function({l10nID}){return Sanitizer.escapeHTML`
      <section hidden>
        <gaia-subheader skin="organic">
          <span data-l10n-id="${l10nID}"></span>
        </gaia-subheader>
        <section data-type="list">
          <ul></ul>
        </section>
      </section>`;},soundItem:function({l10nID,name}){return Sanitizer.escapeHTML`
      <li>
        <gaia-radio name="sounds" class="truncate">
          <label class="name">
            <bdi data-l10n-id="${l10nID}">${name}</bdi>
          </label>
          <details></details>
        </gaia-radio>
      </li>`;}};;'use strict';function NullRingtone(){}
NullRingtone.prototype={get name(){return navigator.mozL10n.get(this.l10nID);},get filename(){return null;},get l10nID(){return'ringtone-none';},get id(){return'none:none';},get type(){return null;},get url(){return null;},get shareable(){return false;},get deletable(){return false;},getBlob:function(){return new Promise(function(resolve,reject){resolve(null);});}};;;'use strict';window.builtInRingtones=(function(){var ID_PREFIX='builtin:';var BASE_URLS={'ringtone':'/shared/resources/media/ringtones/','alerttone':'/shared/resources/media/notifications/'};var mimeTypeMap={'.mp3':'audio/mp3','.mp4':'audio/mp4','.ogg':'audio/ogg','.opus':'audio/ogg'};function inferMimeType(filename){var dot=filename.lastIndexOf('.');if(dot===-1){console.warn('Couldn\'t infer mimetype for '+filename);return'application/octet-stream';}
var ext=filename.substr(dot);return mimeTypeMap[ext]||'application/octet-stream';}
function BuiltInRingtone(toneType,filename,toneDef){this._toneType=toneType;this._filename=filename;this._l10nID=toneDef.l10nID;}
BuiltInRingtone.prototype={get _rootName(){return this._filename.replace(/\.\w+$/,'');},get name(){return navigator.mozL10n.get(this.l10nID);},get filename(){return this._filename;},get l10nID(){return this._l10nID;},get id(){return ID_PREFIX+this._toneType+'/'+this._rootName;},get type(){return this._toneType;},get url(){return BASE_URLS[this._toneType]+this._filename;},get shareable(){return true;},get deletable(){return false;},getBlob:function(){var url=this.url;return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest();xhr.open('GET',url);xhr.overrideMimeType(inferMimeType(url));xhr.responseType='blob';xhr.send();xhr.onload=function(){resolve(xhr.response);};xhr.onerror=function(){var err=new Error('Could not read sound file: '+url+' (status: '+xhr.status+')');console.error(err);reject(err);};});}};function idToToneType(id){var slash=id.indexOf('/');if(id.indexOf(ID_PREFIX)!==0||slash===-1){throw new Error('invalid id: '+id);}
return id.substring(ID_PREFIX.length,slash);}
function idMatchesFilename(id,toneType,filename){return id===ID_PREFIX+toneType+'/'+filename.replace(/\.\w+$/,'');}
var toneDefsCache={};function getSoundFilenames(toneType){if(!(toneType in BASE_URLS)){throw new Error('tone type not supported: '+toneType);}
return new Promise(function(resolve,reject){if(toneType in toneDefsCache){resolve(toneDefsCache[toneType]);return;}
var xhr=new XMLHttpRequest();xhr.open('GET',BASE_URLS[toneType]+'list.json');xhr.responseType='json';xhr.send(null);xhr.onload=function(){toneDefsCache[toneType]=xhr.response;resolve(xhr.response);};xhr.onerror=function(){var err=new Error('Could not read sounds list for '+toneType+' (status: '+xhr.status+')');console.error(err);reject(err);};});}
function list(toneType){return getSoundFilenames(toneType).then(function(toneDefs){var tones=[];for(var filename in toneDefs){tones.push(new BuiltInRingtone(toneType,filename,toneDefs[filename]));}
return tones;});}
function get(id){return new Promise(function(resolve,reject){var toneType=idToToneType(id);resolve(getSoundFilenames(toneType).then(function(toneDefs){for(var filename in toneDefs){if(idMatchesFilename(id,toneType,filename)){return new BuiltInRingtone(toneType,filename,toneDefs[filename]);}}
var err=new Error('No '+toneType+' found with id = '+id);console.error(err);throw err;}));});}
return{list:list,get:get,get toneTypes(){return Object.keys(BASE_URLS);}};})();;;;'use strict';window.customRingtones=(function(){var ID_PREFIX='custom:';function CustomRingtone(info,dbKey){this._name=info.name;if(info.uniqueNum!==0||info.isExplicitNum){this._name+=' ('+info.uniqueNum+')';}
this._subtitle=info.subtitle||null;this._id=ID_PREFIX+dbKey;this._blob=info.blob;}
CustomRingtone.prototype={get name(){return this._name;},get filename(){return this._blob.name;},get subtitle(){return this._subtitle;},get id(){return this._id;},get type(){return'ringtone';},get url(){return this._url||(this._url=URL.createObjectURL(this._blob));},get shareable(){return true;},get deletable(){return true;},remove:function(){return remove(this.id);},getBlob:function(){return Promise.resolve(this._blob);}};function idToDBKey(id){if(id.indexOf(ID_PREFIX)!==0){throw new Error('invalid id: '+id);}
return parseInt(id.substr(ID_PREFIX.length));}
var DBNAME='customTones';var DBVERSION=1;var STORENAME='ringtones';var db=null;function withStore(type,callback){if(db){var transaction=db.transaction(STORENAME,type);callback(null,transaction.objectStore(STORENAME),transaction);}else{var openreq=indexedDB.open(DBNAME,DBVERSION);openreq.onerror=function(){console.error('customRingtones: can\'t open database:',openreq.error.name);callback(openreq.error);};openreq.onupgradeneeded=function(){var objStore=openreq.result.createObjectStore(STORENAME,{autoIncrement:true});objStore.createIndex('fullname',['name','subtitle','uniqueNum'],{unique:false});};openreq.onsuccess=function(){db=openreq.result;var transaction=db.transaction(STORENAME,type);callback(null,transaction.objectStore(STORENAME),transaction);};}}
function uniqueify(info){return new Promise(function(resolve,reject){withStore('readonly',function(err,store){if(err){reject(err);return;}
var nextUniqueNum=info.uniqueNum||0;var index=store.index('fullname');var req=index.openCursor(IDBKeyRange.bound([info.name,info.subtitle,0],[info.name,info.subtitle,Infinity]));req.onsuccess=function(event){var cursor=event.target.result;if(!cursor||nextUniqueNum<cursor.value.uniqueNum){resolve(nextUniqueNum);return;}
nextUniqueNum=cursor.value.uniqueNum+1;cursor.continue();};req.onerror=function(){console.error('Error in customRingtones.uniqueify(): ',req.error.name);reject(req.error);};});});}
function add(info){var cleanedInfo={name:info.name||'',subtitle:info.subtitle||'',blob:info.blob,uniqueNum:0};var m=/^(.*) \((\d+)\)$/.exec(cleanedInfo.name);if(m){cleanedInfo.name=m[1];cleanedInfo.uniqueNum=m[2];cleanedInfo.isExplicitNum=true;}
return uniqueify(cleanedInfo).then(function(uniqueNum){return new Promise(function(resolve,reject){withStore('readwrite',function(err,store,transaction){if(err){reject(err);return;}
cleanedInfo.uniqueNum=uniqueNum;var tone;var req=store.add(cleanedInfo);req.onsuccess=function(event){tone=new CustomRingtone(cleanedInfo,event.target.result);};transaction.oncomplete=function(event){resolve(tone);};transaction.onabort=transaction.onerror=function(){console.error('Error in customRingtones.add(): ',transaction.error.name);reject(req.error);};});});});}
function remove(id){return new Promise(function(resolve,reject){withStore('readwrite',function(err,store,transaction){if(err){reject(err);return;}
var req=store.delete(idToDBKey(id));transaction.oncomplete=function(event){resolve();};transaction.onabort=transaction.onerror=function(){console.error('Error in customRingtones.remove(): ',transaction.error.name);reject(req.error);};});});}
function clear(){return new Promise(function(resolve,reject){withStore('readwrite',function(err,store,transaction){if(err){reject(err);return;}
var req=store.clear();transaction.oncomplete=function(event){resolve();};transaction.onabort=transaction.onerror=function(){console.error('Error in customRingtones.clear(): ',transaction.error.name);reject(req.error);};});});}
function get(id){return new Promise(function(resolve,reject){withStore('readonly',function(err,store){if(err){reject(err);return;}
var key=idToDBKey(id);var req=store.get(key);req.onsuccess=function(event){var data=event.target.result;if(!data){resolve(null);}else{resolve(new CustomRingtone(data,key));}};req.onerror=function(){console.error('Error in customRingtones.get(): ',req.error.name);reject(req.error);};});});}
function list(toneType){return new Promise(function(resolve,reject){if(toneType==='alerttone'){resolve([]);return;}
withStore('readonly',function(err,store){if(err){reject(err);return;}
var req=store.openCursor();var results=[];req.onsuccess=function listOnSuccess(event){var cursor=event.target.result;if(cursor){var value=cursor.value;results.push(new CustomRingtone(value,cursor.key));cursor.continue();}else{resolve(results);}};req.onerror=function listOnError(){console.error('Error in customRingtones.list(): ',req.error.name);reject(req.error);};});});}
return{add:add,remove:remove,clear:clear,get:get,list:list};})();;;'use strict';window.sdCardRingtones=(function(){var ID_PREFIX='sdcard:';var BASE_DIRS={'ringtone':'Ringtones','alerttone':'Notifications'};function pathToType(path){var folder=new RegExp('^(/[^/]*/)?([^/]*)/').exec(path)[2];for(var type in BASE_DIRS){if(BASE_DIRS[type]===folder){return type;}}
throw new Error('unexpected SD card folder: '+folder);}
function SDCardRingtone(file){var leafname=file.name.substr(file.name.lastIndexOf('/')+1);this._name=leafname.replace(/\.\w+$/,'');this._blob=file;this._type=pathToType(this._blob.name);}
SDCardRingtone.prototype={get name(){return this._name;},get filename(){return this._blob.name;},get subtitle(){return navigator.mozL10n.get('sd-card-subtitle');},get id(){return ID_PREFIX+this._blob.name;},get type(){return this._type;},get url(){return this._url||(this._url=URL.createObjectURL(this._blob));},get shareable(){return true;},get deletable(){return true;},remove:function(){return remove(this.id);},getBlob:function(){return Promise.resolve(this._blob);}};function idToFilename(id){return id.substr(ID_PREFIX.length);}
var defaultStorage=navigator.getDeviceStorage('music');function remove(id){return new Promise(function(resolve,reject){var request=defaultStorage.delete(idToFilename(id));request.onsuccess=function(){resolve();};request.onerror=function(){console.error('Error in sdCardRingtones.remove(): ',this.error);reject(this.error);};});}
function get(id){return new Promise(function(resolve,reject){var request=defaultStorage.get(idToFilename(id));request.onsuccess=function(){resolve(new SDCardRingtone(this.result));};request.onerror=function(){console.error('Error in sdCardRingtones.get(): ',this.error);reject(this.error);};});}
function list(toneType){if(!(toneType in BASE_DIRS)){throw new Error('tone type not supported: '+toneType);}
return new Promise(function(resolve,reject){var results=[];var sdcards=navigator.getDeviceStorages('music');var cursor=enumerateAll(sdcards,BASE_DIRS[toneType]);cursor.onsuccess=function(){var file=this.result;if(file){if(file.name[0]!=='.'&&file.name.indexOf('/.')===-1){results.push(new SDCardRingtone(file));}
this.continue();}else{resolve(results);}};cursor.onerror=function(){if(this.error.name==='NotFoundError'||this.error.name==='TypeMismatchError'){resolve([]);}else{console.error('Error in sdCardRingtones.list(): ',this.error);reject(this.error);}};});}
return{remove:remove,get:get,list:list};})();;;'use strict';function TonePlayer(){this._currentTone=null;this._isValid=true;this._player=new Audio();this._player.addEventListener('loadedmetadata',function(){if(this._player.src){this._isValid=true;this._player.dispatchEvent(new CustomEvent('validated',{detail:this._isValid}));}}.bind(this));this._player.addEventListener('error',function(){if(this._player.src){this._isValid=false;this._player.dispatchEvent(new CustomEvent('validated',{detail:this._isValid}));}}.bind(this));this._player.addEventListener('ended',function(){this._firePlayingCallback(false);}.bind(this));window.addEventListener('visibilitychange',function(){if(document.hidden){this.stop();this._setExclusiveMode(false);}}.bind(this));}
TonePlayer.prototype={setTone:function(tone,callback){if(tone!==this._currentTone){this._firePlayingCallback(false);this._currentTone=tone;this._playingCallback=callback;if(tone&&tone.url){this._isValid=undefined;this._player.src=tone.url;this._player.play();this._firePlayingCallback(true);this._setExclusiveMode(true);}else{this._isValid=true;this._player.removeAttribute('src');this._player.load();}}else{if(!this._isValid){return;}
if(this._player.paused||this._player.ended){this._player.currentTime=0;this._player.play();this._firePlayingCallback(true);this._setExclusiveMode(true);}else{this._player.pause();this._firePlayingCallback(false);}}},stop:function(){this._player.pause();this._firePlayingCallback(false);},get currentTone(){return this._currentTone;},isValid:function(callback){if(this._isValid!==undefined){callback(this._isValid);return;}
this._player.addEventListener('validated',function validated(event){this.removeEventListener('validated',validated);callback(event.detail);});},_firePlayingCallback:function(playing){if(this._playingCallback){this._playingCallback(playing);}},_setExclusiveMode:function(exclusive){if(exclusive){if(!this._source){this._context=new AudioContext('ringer');this._source=this._context.createMediaElementSource(this._player);this._source.connect(this._context.destination);}}else{if(this._source){this._source.disconnect();this._context=null;this._source=null;}}}};;;'use strict';var ToneList=(function(){var NONE_ID='none:none';function toneCompare(a,b){if(a.id===NONE_ID&&b.id===NONE_ID){return 0;}else if(a.id===NONE_ID){return-1;}else if(b.id===NONE_ID){return 1;}
var aName=a.name.toLocaleLowerCase();var bName=b.name.toLocaleLowerCase();var cmp=aName.localeCompare(bName);if(cmp){return cmp;}
var aSubtitle=(a.subtitle||'').toLocaleLowerCase();var bSubtitle=(b.subtitle||'').toLocaleLowerCase();return aSubtitle.localeCompare(bSubtitle);}
function domify(htmlText){var dummyDiv=document.createElement('div');dummyDiv.innerHTML=htmlText;var element=dummyDiv.firstElementChild;return element;}
function ToneList(titleID,parent){this.element=domify(Templates.soundList({l10nID:titleID}));if(parent){parent.appendChild(this.element);}
this._ul=this.element.querySelector('ul');this._toneMap={};}
ToneList.prototype={makeItem:function(tone){var templateArgs={};if(tone.l10nID){templateArgs.l10nID=tone.l10nID;}else{templateArgs.name=tone.name;}
var item=domify(Templates.soundItem(templateArgs));item.dataset.id=tone.id;var detailNode=item.querySelector('details');if(detailNode&&tone.subtitle){detailNode.textContent=tone.subtitle;}else if(detailNode){detailNode.parentNode.hideDetails();}else if(tone.subtitle){var subtitle=document.createElement('p');subtitle.classList.add('subtitle');var bdi=document.createElement('bdi');bdi.textContent=tone.subtitle;subtitle.appendChild(bdi);item.querySelector('.name').parentNode.appendChild(subtitle);}
return item;},add:function(tones){if(this._ul.children.length===0){if(Array.isArray(tones)){tones.sort(toneCompare);tones.forEach(this._append.bind(this));}else{this._append(tones);}}else{if(Array.isArray(tones)){tones.forEach(this._insertSorted.bind(this));}else{this._insertSorted(tones);}}},remove:function(tone){this._ul.removeChild(this._toneMap[tone.id].element);if(!this._ul.firstChild){this.element.hidden=true;}},_append:function(tone){if(tone.id in this._toneMap){throw new Error('A tone with this ID is already in the list: '+
tone.id);}
var newItem=this.makeItem(tone);this._toneMap[tone.id]={tone:tone,element:newItem};this.element.hidden=false;this._ul.appendChild(newItem);},_insertSorted:function(tone){if(tone.id in this._toneMap){throw new Error('A tone with this ID is already in the list: '+
tone.id);}
var newItem=this.makeItem(tone);this._toneMap[tone.id]={tone:tone,element:newItem};this.element.hidden=false;var items=this._ul.querySelectorAll('li');for(var i=0;i<items.length;i++){var currTone=this._toneMap[items[i].dataset.id].tone;if(toneCompare(tone,currTone)<0){this._ul.insertBefore(newItem,items[i]);return;}}
this._ul.appendChild(newItem);}};return ToneList;})();;'use strict';navigator.mozSetMessageHandler('activity',function(activity){var tonePlayer=new TonePlayer();var toneTypes=activity.source.data.type;var allowNone=activity.source.data.allowNone;var currentToneID=activity.source.data.currentToneID;var allToneTypes=window.builtInRingtones.toneTypes;if(!Array.isArray(toneTypes)){toneTypes=[toneTypes];}
toneTypes=toneTypes.filter(function(x){return allToneTypes.indexOf(x)!==-1;});var otherToneTypes=allToneTypes.filter(function(x){return toneTypes.indexOf(x)===-1;});document.getElementById('header').addEventListener('action',function(){tonePlayer.stop();activity.postError('cancelled');});document.getElementById('set').addEventListener('click',function(){tonePlayer.stop();tonePlayer.isValid(function(valid){if(!valid){activity.postError('cancelled');}
var selectedTone=tonePlayer.currentTone;selectedTone.getBlob().then(function(blob){activity.postResult({name:selectedTone.name,l10nID:selectedTone.l10nID,id:selectedTone.id,blob:blob});});});});function PickerToneList(...args){ToneList.apply(this,args);}
PickerToneList.prototype=Object.create(ToneList.prototype);PickerToneList.prototype.constructor=PickerToneList;PickerToneList.prototype.makeItem=function(tone){var item=ToneList.prototype.makeItem.call(this,tone);var input=item.querySelector('gaia-radio');input.checked=(tone.id===currentToneID);input.addEventListener('click',function(){tonePlayer.setTone(tone);document.getElementById('set').disabled=false;});return item;};navigator.mozL10n.once(function(){var promises=[];var listParent=document.getElementById('list-parent');function addToneLists(toneType,includeNone){var builtInList=new PickerToneList('section-title-builtin-'+toneType,listParent);promises.push(window.builtInRingtones.list(toneType).then(function(tones){builtInList.add(tones);if(includeNone){builtInList.add(new NullRingtone());}}));var customList=new PickerToneList('section-title-custom-'+toneType,listParent);promises.push(window.customRingtones.list(toneType).then(function(tones){customList.add(tones);}));promises.push(window.sdCardRingtones.list(toneType).then(function(tones){customList.add(tones);}));}
toneTypes.forEach(function(toneType,i){addToneLists(toneType,i===0&&allowNone);});otherToneTypes.forEach(function(toneType){addToneLists(toneType);});Promise.all(promises).then(function(listsData){document.querySelector('body').dataset.ready=true;});});});