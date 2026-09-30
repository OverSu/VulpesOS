;window.COMPONENTS_BASE_URL='/shared/elements/';;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;(function(define){'use strict';define(function(require,exports,module){var textContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');var innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');var removeAttribute=Element.prototype.removeAttribute;var setAttribute=Element.prototype.setAttribute;var noop=function(){};exports.register=function(name,props){var baseProto=getBaseProto(props.extends);var template=props.template||baseProto.templateString;var extensible=props.extensible=props.hasOwnProperty('extensible')?props.extensible:true;delete props.extends;if(template){if(extensible&&props.template){props.templateString=props.template;}
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
return target;}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));;;(function(define){define(function(require,exports,module){'use strict';var component=require('gaia-component');module.exports=component.register('gaia-toast',{created:function(){this.setupShadowRoot();this.els={inner:this.shadowRoot.querySelector('.inner'),bread:this.shadowRoot.querySelector('.bread')};this.timeout=this.getAttribute('timeout');},show:function(){this.els.bread.removeEventListener('animationend',this.onAnimateOutEnd);clearTimeout(this.hideTimeout);this.els.inner.classList.add('visible');var reflow=this.els.inner.offsetTop;this.els.bread.classList.remove('animate-out');this.els.bread.classList.add('animate-in');this.hideTimeout=setTimeout(this.hide.bind(this),this.timeout);},hide:function(){var self=this;clearTimeout(this.hideTimeout);this.els.bread.classList.remove('animate-in');this.els.bread.classList.add('animate-out');this.els.bread.removeEventListener('animationend',this.onAnimateOutEnd);this.onAnimateOutEnd=function(){self.els.bread.removeEventListener('animationend',self.onAnimateOutEnd);self.els.bread.classList.remove('animate-out');self.els.inner.classList.remove('visible');};this.els.bread.addEventListener('animationend',this.onAnimateOutEnd);},animateOut:function(){},attrs:{timeout:{get:function(){return this.getAttribute('timeout')||1000;},set:function(value){var current=this.getAttribute('timeout');if(current==value){return;}
else if(!value){this.removeAttribute('timeout');}
else{this.setAttribute('timeout',value);}}}},template:`
    <div class="inner">
      <div class="bread">
        <content></content>
      </div>
    </div>

    <style>

    /** Host
     ---------------------------------------------------------*/

    :host {
      position: fixed;
      left: 0;
      bottom: 0;
      width: 100%;
      font-style: italic;
      text-align: center;
      z-index: 100;

      color:
        var(--highlight-color);
    }

    /** Inner
      ---------------------------------------------------------*/

    .inner {
      display: none;
      padding: 16px;
    }

    .inner.visible {
      display: block;
    }

    /**
     ---------------------------------------------------------*/

    .bread {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
      box-shadow: 0px 1px 0px 0px rgba(0, 0, 0, 0.15);
      transform: translateY(100%);

      background:
        var(--background-plus,
        white);
    }

    .bread.animate-in {
      animation-name: gaia-toast-enter;
      animation-fill-mode: forwards;
      animation-duration: 300ms;
    }

    .bread.animate-out {
      animation-name: gaia-toast-leave;
      animation-duration: 600ms;
      transform: translateY(0%);
    }

    </style>
  `,globalCss:`
    @keyframes gaia-toast-enter {
      0% {
        transform: translateY(100%);
        opacity: 0;
      }

      40% {
        opacity: 0;
      }

      100% {
        transform: translateY(0%);
        opacity: 1;
      }
    }

    @keyframes gaia-toast-leave {
      0% {
        opacity: 1;
      }

      100% {
        opacity: 0;
      }
    }
  `});});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-toast',this));;'use strict';window.GaiaSubheader=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSubheaderBaseurl||'/shared/elements/gaia_subheader/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-subheader',{prototype:proto});})(window);;'use strict';window.GaiaButtons=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaButtonsBaseurl||'/shared/elements/gaia_buttons/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-buttons',{prototype:proto});})(window);;'use strict';window.GaiaCheckbox=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaCheckboxBaseurl||'/shared/elements/gaia_checkbox/';proto.createdCallback=function(){this.lastClick=0;this.throttleTime=250;var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._wrapper=this._template.getElementById('checkbox');this._wrapper.addEventListener('click',this.handleClick.bind(this));this.configureClass();this.checked=this.hasAttribute('checked');this._wrapper.setAttribute('aria-checked',this.checked);this.setAttribute('role','presentation');shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);};proto.handleClick=function(e){e.preventDefault();e.stopImmediatePropagation();if(this.lastClick+this.throttleTime>Date.now()){return;}
this.lastClick=Date.now();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(!event.defaultPrevented){this.checked=!this.checked;this._wrapper.setAttribute('aria-checked',this.checked);}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.configureClass=function(){this._wrapper.className=this.className;};proto.attributeChangedCallback=function(name,from,to){if(name==='class'){this._wrapper.className=to;}};Object.defineProperty(proto,'checked',{get:function(){return this._checked||false;},set:function(value){this._wrapper.classList.toggle('checked',value);this._checked=value;}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});var template=document.createElement('template');template.innerHTML=`<span id="checkbox" role="checkbox">
      <span role="presentation"><content select="label"></content></span>
    </span>`;return document.registerElement('gaia-checkbox',{prototype:proto});})(window);;'use strict';window.GaiaConfirm=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaConfirmBaseurl||'/shared/elements/gaia_confirm/';function eatEvent(unless,event){if(unless&&unless.indexOf(event.target)!==-1){return;}
event.preventDefault();event.stopImmediatePropagation();}
proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);var confirm=this.querySelector('gaia-buttons .confirm');var cancel=this.querySelector('gaia-buttons .cancel');if(confirm){confirm.addEventListener('click',(e)=>{eatEvent(null,e);this.dispatchEvent(new CustomEvent('confirm'));});}
if(cancel){cancel.addEventListener('click',(e)=>{eatEvent(null,e);this.dispatchEvent(new CustomEvent('cancel'));});}};var template=document.createElement('template');template.innerHTML=`<form role="dialog" class="confirm">
      <section>
        <content select="h1"></content>
        <content select="p"></content>
      </section>
      <content select="gaia-buttons">
      </content>
    </form>`;return document.registerElement('gaia-confirm',{prototype:proto});})(window);;(function(window,undefined){'use strict';function L10nError(message,id,loc){this.name='L10nError';this.message=message;this.id=id;this.loc=loc;}
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
return navigator.mozL10n.formatValue(key);});return Promise.all(resp);},requestLanguages:function(langs){navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx,langs);},pseudo:{'fr-x-psaccent':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));}},'ar-x-psbidi':{getName:function(){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);},processString:function(s){return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));}}},};navigator.mozL10n.ready(function(){document.documentElement.setAttribute('langs',navigator.mozL10n.ctx.supportedLocales.join(' '));});navigator.mozL10n.once(function(){window.addEventListener('localized',function(){document.dispatchEvent(new CustomEvent('DOMRetranslated',{bubbles:false,cancelable:false}));});});})(this);;;'use strict';(function(exports){var SettingsPromiseManager=function SettingsPromiseManager(){this._readLock=null;this._writeLock=null;};SettingsPromiseManager.prototype._cleanLock=function(type){var propName;switch(type){case'read':propName='_readLock';break;case'write':propName='_writeLock';break;default:throw new Error('SettingsPromiseManager: Not such type.');}
if(this[propName]&&this[propName].closed){this[propName]=null;}};SettingsPromiseManager.prototype._getLock=function(type){var propName;switch(type){case'read':propName='_readLock';break;case'write':propName='_writeLock';break;default:throw new Error('SettingsPromiseManager: Not such type.');}
if(this[propName]&&!this[propName].closed){return this[propName];}
var settings=window.navigator.mozSettings;this[propName]=settings.createLock();return this[propName];};SettingsPromiseManager.prototype._getReadLock=function(){return this._getLock('read');};SettingsPromiseManager.prototype._getWriteLock=function(){return this._getLock('write');};SettingsPromiseManager.prototype.get=function(obj){if(typeof obj==='string'){return this.getOne(obj);}
if(typeof obj!=='object'){throw new Error('SettingsPromiseManager.get: '+'require object, array, or string.');}
var arr=Array.isArray(obj)?obj:Object.keys(obj);var promise=Promise.all(arr.map(function(key){return this.getOne(key);},this));return promise;};SettingsPromiseManager.prototype.getOne=function(key){var promise=new Promise(function(resolve,reject){var req=this._getReadLock().get(key);req.onsuccess=function(){this._cleanLock('read');resolve(req.result[key]);}.bind(this);req.onerror=function(){this._cleanLock('read');reject();}.bind(this);}.bind(this));return promise;};SettingsPromiseManager.prototype.set=function(obj,value){if(typeof obj==='string'){return this.setOne(obj,value);}
if(typeof obj!=='object'){throw new Error('SettingsPromiseManager.set: require object.');}
var promise=new Promise(function(resolve,reject){var req=this._getWriteLock().set(obj);req.onsuccess=function(){this._cleanLock('write');resolve();}.bind(this);req.onerror=function(){this._cleanLock('write');reject();}.bind(this);}.bind(this));return promise;};SettingsPromiseManager.prototype.setOne=function(key,value){var obj={};obj[key]=value;return this.set(obj);};SettingsPromiseManager.prototype.updateOne=function(key,callback){var promise=new Promise(function(resolve,reject){var lock=this._getWriteLock();var req=lock.get(key);req.onsuccess=function(){var newValue=callback(req.result[key]);var obj={};obj[key]=newValue;resolve(lock.set(obj));}.bind(this);req.onerror=function(){reject(req.error);}.bind(this);}.bind(this)).then(function(){this._cleanLock('write');}.bind(this),function(e){this._cleanLock('write');throw e;}.bind(this));return promise;};var SettingsManagerBase=function(){this.initialized=false;this._callbacks=null;this._values={};this._initPromise=null;};SettingsManagerBase.prototype.onsettingchange=null;SettingsManagerBase.prototype.KEYS=[];SettingsManagerBase.prototype.PROPERTIES=[];SettingsManagerBase.prototype.getSettingsSync=function(){return this._values;};SettingsManagerBase.prototype.initSettings=function(){if(this._initPromise){return this._initPromise;}
var promise=this.promiseManager.get(this.KEYS).then(function(results){results.forEach(function(value,i){this._values[this.PROPERTIES[i]]=value;},this);this.startObserve();this.initialized=true;return this._values;}.bind(this),function(error){this._initPromise=null;return Promise.reject(error);}.bind(this));this._initPromise=promise;return promise;};SettingsManagerBase.prototype.startObserve=function(){if(this._callbacks){return;}
var callbacks=this._callbacks=[];this.KEYS.forEach(function(key,i){var callback=function(e){this._values[this.PROPERTIES[i]]=e.settingValue;if(typeof this.onsettingchange==='function'){this.onsettingchange(this._values);}}.bind(this);navigator.mozSettings.addObserver(key,callback);callbacks.push(callback);},this);};SettingsManagerBase.prototype.stopObserve=function(){if(!this._callbacks){return;}
var callbacks=this._callbacks;this.KEYS.forEach(function(key,i){navigator.mozSettings.removeObserver(key,callbacks[i]);},this);this._callbacks=null;};var SoundFeedbackSettings=function(){};SoundFeedbackSettings.prototype=new SettingsManagerBase();SoundFeedbackSettings.prototype.KEYS=['keyboard.clicksound','audio.volume.notification'];SoundFeedbackSettings.prototype.PROPERTIES=['clickEnabled','isSoundEnabled'];var VibrationFeedbackSettings=function(){};VibrationFeedbackSettings.prototype=new SettingsManagerBase();VibrationFeedbackSettings.prototype.KEYS=['keyboard.vibration'];VibrationFeedbackSettings.prototype.PROPERTIES=['vibrationEnabled'];var IMEngineSettings=function(){};IMEngineSettings.prototype=new SettingsManagerBase();IMEngineSettings.prototype.KEYS=['keyboard.wordsuggestion','keyboard.autocorrect'];IMEngineSettings.prototype.PROPERTIES=['suggestionsEnabled','correctionsEnabled'];var HandwritingPadSettings=function(){};HandwritingPadSettings.prototype=new SettingsManagerBase();HandwritingPadSettings.prototype.KEYS=['keyboard.handwriting.strokeWidth','keyboard.handwriting.responseTime'];HandwritingPadSettings.prototype.PROPERTIES=['strokeWidth','responseTime'];var UserPressManagerSettings=function(){};UserPressManagerSettings.prototype=new SettingsManagerBase();UserPressManagerSettings.prototype.KEYS=['deviceinfo.hardware','deviceinfo.product_model'];UserPressManagerSettings.prototype.PROPERTIES=['deviceinfoHardware','deviceinfoProductModel'];exports.SettingsPromiseManager=SettingsPromiseManager;exports.SettingsManagerBase=SettingsManagerBase;exports.SoundFeedbackSettings=SoundFeedbackSettings;exports.VibrationFeedbackSettings=VibrationFeedbackSettings;exports.IMEngineSettings=IMEngineSettings;exports.HandwritingPadSettings=HandwritingPadSettings;exports.UserPressManagerSettings=UserPressManagerSettings;})(window);;;'use strict';(function(exports){var PromiseStorage=function(name){this.name=name;if(typeof this.name!=='string'||this.name===''){throw new Error('PromiseStorage: Need a storage name.');}
this._openPromise=null;};PromiseStorage.prototype.DB_VERSION=1;PromiseStorage.prototype.STORE_NAME='keyvaluepairs';PromiseStorage.prototype.start=function(){return this._getDatabase().catch(function(e){this._openPromise=null;throw e;}.bind(this));};PromiseStorage.prototype.stop=function(){if(!this._openPromise){return Promise.resolve();}
return this._getDatabase().then(function(db){db.close();this._openPromise=null;});};PromiseStorage.prototype._getDatabase=function(){if(this._openPromise){return this._openPromise;}
var p=new Promise(function(resolve,reject){var req=window.indexedDB.open(this.name,this.DB_VERSION);req.onerror=function(){reject(req.error);};req.onsuccess=function(evt){resolve(req.result);};req.onupgradeneeded=function(evt){var db=req.result;if(evt.oldVersion<1){db.createObjectStore(this.STORE_NAME);}}.bind(this);}.bind(this));this._openPromise=p;return p;};PromiseStorage.prototype._getTxn=function(type,callback){return this._getDatabase().then(function(db){var txn=db.transaction(this.STORE_NAME,type);return callback(txn);}.bind(this));};PromiseStorage.prototype.getItems=function(names){return this._getTxn('readonly',function(txn){var store=txn.objectStore(this.STORE_NAME);var reqPromises=names.map(function(name){return new Promise(function(resolve,reject){var req=store.get(name);req.onerror=function(e){reject(req.error);};req.onsuccess=function(){resolve(req.result);};});},this);return new Promise(function(resolve){txn.oncomplete=function(){resolve(Promise.all(reqPromises));};});}.bind(this)).catch(function(e){e&&console.error(e);return Promise.reject(e);});};PromiseStorage.prototype.getItem=function(name){return this._getTxn('readonly',function(txn){return new Promise(function(resolve,reject){var req=txn.objectStore(this.STORE_NAME).get(name);req.onerror=function(e){reject(req.error);};txn.oncomplete=function(){resolve(req.result);};}.bind(this));}.bind(this)).catch(function(e){e&&console.error(e);return Promise.reject(e);});};PromiseStorage.prototype.setItem=function(name,data){return this._getTxn('readwrite',function(txn){return new Promise(function(resolve,reject){var store=txn.objectStore(this.STORE_NAME);var req=store.put(data,name);req.onerror=function(e){reject(req.error);};txn.oncomplete=function(){resolve(req.result);};}.bind(this));}.bind(this)).catch(function(e){e&&console.error(e);return Promise.reject(e);});};PromiseStorage.prototype.setItems=function(items){return this._getTxn('readwrite',function(txn){var store=txn.objectStore(this.STORE_NAME);var reqPromises=Object.keys(items).map(function(name){var data=items[name];return new Promise(function(resolve,reject){var req=store.put(data,name);req.onerror=function(e){reject(req.error);};req.onsuccess=function(){resolve(req.result);};});},this);return new Promise(function(resolve){txn.oncomplete=function(){resolve(Promise.all(reqPromises));};});}.bind(this)).catch(function(e){e&&console.error(e);return Promise.reject(e);});};PromiseStorage.prototype.deleteItem=function(name){return this._getTxn('readwrite',function(txn){return new Promise(function(resolve,reject){var req=txn.objectStore(this.STORE_NAME).delete(name);req.onerror=function(e){reject(req.error);};txn.oncomplete=function(){resolve();};}.bind(this));}.bind(this)).catch(function(e){e&&console.error(e);return Promise.reject(e);});};exports.PromiseStorage=PromiseStorage;}(window));;'use strict';(function(exports){var CloseLock=function(manager,topic){this._manager=manager;this._topic=topic;};CloseLock.prototype.unlock=function(){this._manager.releaseLock(this,this._topic);};var CloseLockManager=function CloseLockManager(){this._closeLocks=null;this._awakeLocks=null;this.waitForUnlock=false;};CloseLockManager.prototype.onclose=null;CloseLockManager.prototype.start=function(){this._closeLocks=new Set();this._awakeLocks=new Set();this.waitForUnlock=false;};CloseLockManager.prototype.stop=function(){this._closeLocks=null;this._awakeLocks=null;this.waitForUnlock=false;};CloseLockManager.prototype.requestLock=function(topic){var lock=new CloseLock(this,topic);switch(topic){case'requestClose':this._closeLocks.add(lock);break;case'stayAwake':this._awakeLocks.add(lock);break;default:throw'CloseLockManager: Undefined topic '+topic;}
this._maybeCloseNow();return lock;};CloseLockManager.prototype.releaseLock=function(lock,topic){if(!(lock instanceof CloseLock)){throw'CloseLockManager: releaseLock need a lock.';}
var set;switch(topic){case'requestClose':set=this._closeLocks;break;case'stayAwake':set=this._awakeLocks;break;default:throw'CloseLockManager: Undefined topic '+topic;}
if(!set.has(lock)){return;}
set.delete(lock);this._maybeCloseNow();};CloseLockManager.prototype._maybeCloseNow=function(){if(this._awakeLocks.size===0&&this._closeLocks.size!==0){if(typeof this.onclose==='function'){this.onclose();}else{console.error('CloseLockManager: '+'close should be triggered now but no callback attached.');}}};exports.CloseLockManager=CloseLockManager;exports.CloseLock=CloseLock;})(window);;'use strict';(function(exports){var BaseView=function(){this.childViews={};};BaseView.prototype.childViews=null;BaseView.prototype.CONTAINER_ID=null;BaseView.prototype.container=null;BaseView.prototype.start=function(){if(this.CONTAINER_ID){this.container=document.getElementById(this.CONTAINER_ID);}};BaseView.prototype.stop=function(){this.container=null;};BaseView.prototype.beforeShow=function(options){return Promise.all(Object.keys(this.childViews).map(name=>this.childViews[name].beforeShow(options)));};BaseView.prototype.show=function(){return Promise.all(Object.keys(this.childViews).map(name=>this.childViews[name].show()));};BaseView.prototype.beforeHide=function(){return Promise.all(Object.keys(this.childViews).map(name=>this.childViews[name].beforeHide()));};BaseView.prototype.hide=function(){return Promise.all(Object.keys(this.childViews).map(name=>this.childViews[name].hide()));};exports.BaseView=BaseView;})(window);;'use strict';(function(exports){var UserDictionary=function UserDictionary(){this._wordSet=null;this._saveQueue=null;this._dbStore=null;this._started=false;};UserDictionary.prototype.start=function(){if(this._started){console.error('UserDictionary: attempting to start twice');return;}
this._started=true;this._saveQueue=Promise.resolve();this._dbStore=new PromiseStorage(this.DB_NAME);this._dbStore.start();};UserDictionary.prototype.stop=function(){if(this._started){this._wordSet=null;this._saveQueue=null;this._dbStore.stop();}};UserDictionary.prototype.DB_NAME='UserDictLatin';UserDictionary.prototype.getList=function(){if(!this._started){return Promise.reject('UserDictionary not started');}
return this._dbStore.getItem('wordlist').then(list=>{list=list||[];this._wordSet=new Set(list);return this._wordSet;}).catch(e=>{e&&console.error(e);this._wordSet=new Set([]);return this._wordSet;});};UserDictionary.prototype._saveDict=function(){var wordList=Array.from(this._wordSet);wordList=wordList.sort((a,b)=>a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));this._wordSet=new Set(wordList);var dictBlob=0===wordList.length?undefined:new WordListConverter(wordList).toBlob();var p=this._saveQueue.then(()=>{this._dbStore.setItems({'wordlist':wordList,'dictblob':dictBlob});return wordList;});this._saveQueue=p;this._saveQueue=this._saveQueue.catch(e=>{console.error(e);});return p;};UserDictionary.prototype.addWord=function(word){if(!this._started){return Promise.reject('UserDictionary not started');}
word=word.trim();if(this._wordSet.has(word)){return Promise.reject('existing');}
this._wordSet.add(word);return this._saveDict();};UserDictionary.prototype.updateWord=function(oldWord,word){if(!this._started){return Promise.reject('UserDictionary not started');}
word=word.trim();if(oldWord===word){return Promise.resolve(Array.from(this._wordSet));}
this._wordSet.delete(oldWord);if(this._wordSet.has(word)){return this._saveDict().then(()=>Promise.reject('existing'));}else{this._wordSet.add(word);return this._saveDict();}};UserDictionary.prototype.removeWord=function(word){if(!this._started){return Promise.reject('UserDictionary not started');}
this._wordSet.delete(word);return this._saveDict();};UserDictionary.prototype._getBlob=function(){return this._dbStore.getItem('dictblob');};exports.UserDictionary=UserDictionary;})(window);;'use strict';(function(){var namespace;try{namespace=window;}catch(e){namespace=module.exports;}
(function(exports){const _EndOfWord=String.fromCharCode(0);const _DEBUG=true;var TSTNode=function(ch){this.ch=ch;this.left=this.center=this.right=null;this.frequency=0;this.count=0;};var TSTTree=function(ch){this.table={};};TSTTree.prototype.insert=function(node,word,freq){var ch=word[0];if(!node){node=new TSTNode(ch);}
if(ch<node.ch){node.left=this.insert(node.left,word,freq);}else if(ch>node.ch){node.right=this.insert(node.right,word,freq);}else{node.frequency=Math.max(node.frequency,freq);if(word.length>1){node.center=this.insert(node.center,word.substring(1),freq);}}
return node;};TSTTree.prototype.setCount=function(node){if(!node){return 0;}
node.count=this.setCount(node.left)+this.setCount(node.right)+1;this.setCount(node.center);return node.count;};TSTTree.prototype.rotateRight=function(node){var tmp=node.left;node.left=tmp.right;tmp.right=node;node.count=(node.left?node.left.count:0)+
(node.right?node.right.count:0)+1;tmp.count=(tmp.left?tmp.left.count:0)+tmp.right.count+1;return tmp;};TSTTree.prototype.rotateLeft=function(node){var tmp=node.right;node.right=tmp.left;tmp.left=node;node.count=(node.left?node.left.count:0)+
(node.right?node.right.count:0)+1;tmp.count=tmp.left.count+(tmp.right?tmp.right.count:0)+1;return tmp;};TSTTree.prototype.divide=function(node,divCount){var leftCount=node.left?node.left.count:0;if(divCount<leftCount){node.left=this.divide(node.left,divCount);node=this.rotateRight(node);}else if(divCount>leftCount){node.right=this.divide(node.right,divCount-leftCount-1);node=this.rotateLeft(node);}
return node;};TSTTree.prototype.balanceLevel=function(node){if(!node){return node;}
node=this.divide(node,Math.floor(node.count/2));node.left=this.balanceLevel(node.left);node.right=this.balanceLevel(node.right);node.center=this.balanceTree(node.center);return node;};TSTTree.prototype.collectLevel=function(level,node){if(!node){return;}
level.push(node);this.collectLevel(level,node.left);this.collectLevel(level,node.right);};TSTTree.prototype.sortLevelByFreq=function(node){var nodes=[];this.collectLevel(nodes,node);nodes.sort(function(node1,node2){return node1.ch.charCodeAt(0)-node2.ch.charCodeAt(0);});nodes.sort(function(node1,node2){return node2.frequency-node1.frequency;});var prev=null;nodes.forEach(function(node,index){node.next=(index<nodes.length-1)?nodes[index+1]:null;node.prev=prev;prev=node;});return nodes[0];};TSTTree.prototype.promoteNodeToRoot=function(root,node){if(node.ch<root.ch){root.left=this.promoteNodeToRoot(root.left,node);return this.rotateRight(root);}else if(node.ch>root.ch){root.right=this.promoteNodeToRoot(root.right,node);return this.rotateLeft(root);}else{return root;}};TSTTree.prototype.balanceTree=function(node){if(!node){return;}
node=this.promoteNodeToRoot(node,this.sortLevelByFreq(node));node.left=this.balanceLevel(node.left);node.right=this.balanceLevel(node.right);node.center=this.balanceTree(node.center);return node;};TSTTree.prototype.balance=function(root){this.setCount(root);root=this.balanceTree(root);return root;};var TSTBuilder=function(words){this.words=words;this._built=false;this.maxWordLength=0;this.characterFrequency={};this.tstRoot=null;};TSTBuilder.prototype.debug=function(msg){if(_DEBUG){console.log(msg);}};TSTBuilder.prototype.build=function(){var tstRoot=null;var tree=new TSTTree();this.words.forEach(function(wordFreq){var word=wordFreq.w;var freq=wordFreq.f;this.maxWordLength=Math.max(this.maxWordLength,word.length);tstRoot=tree.insert(tstRoot,word+_EndOfWord,freq);word.split('').forEach(function(ch){if(ch in this.characterFrequency){this.characterFrequency[ch]++;}else{this.characterFrequency[ch]=1;}},this);},this);tstRoot=tree.balance(tstRoot);this.tstRoot=tstRoot;this._built=true;};TSTBuilder.prototype.getTreeRoot=function(){if(!this._built){throw Error('TST not built yet.');}
return this.tstRoot;};TSTBuilder.prototype.getMaxWordLength=function(){if(!this._built){throw Error('TST not built yet.');}
return this.maxWordLength;};TSTBuilder.prototype.getCharacterFrequency=function(){if(!this._built){throw Error('TST not built yet.');}
return this.characterFrequency;};var TSTSerializer=function(tstRoot){this._tstRoot=tstRoot;this._output=null;};TSTSerializer.prototype.debug=function(msg){if(_DEBUG){console.log(msg);}};TSTSerializer.prototype._serializeNode=function(node){this._output.push(node);if(node.ch==_EndOfWord&&node.center){this.debug('nul node with a center!');}
if(node.ch!=_EndOfWord&&!node.center){this.debug('char node with no center!');}
if(node.center){this._serializeNode(node.center);}
if(node.left){this._serializeNode(node.left);}
if(node.right){this._serializeNode(node.right);}};TSTSerializer.prototype.serializeToNodes=function(){this._output=[];this._serializeNode(this._tstRoot);return this._output;};var TSTBlobBuilder=function(nodes,characterFrequency,maxWordLength){this._nodes=nodes;this._characterFrequency=characterFrequency;this._maxWordLength=maxWordLength;this._output=null;this._outputPos=undefined;};TSTBlobBuilder.prototype.debug=function(msg){if(_DEBUG){console.log(msg);}};TSTBlobBuilder.prototype.toBlobArray=function(){var nodeslen=this._computeOffsets();this._output=new Uint8Array(15+(6*Object.keys(this._characterFrequency).length)+
nodeslen);this._outputPos=0;this._output[this._outputPos++]='F'.charCodeAt(0);this._output[this._outputPos++]='x'.charCodeAt(0);this._output[this._outputPos++]='O'.charCodeAt(0);this._output[this._outputPos++]='S'.charCodeAt(0);this._output[this._outputPos++]='D'.charCodeAt(0);this._output[this._outputPos++]='I'.charCodeAt(0);this._output[this._outputPos++]='C'.charCodeAt(0);this._output[this._outputPos++]='T'.charCodeAt(0);this._output[this._outputPos++]=0;this._output[this._outputPos++]=0;this._output[this._outputPos++]=0;this._output[this._outputPos++]=1;this._output[this._outputPos++]=Math.min(this._maxWordLength,255);var characters=Object.keys(this._characterFrequency).map(function(ch){return{ch:ch,freq:this._characterFrequency[ch]};},this);characters.sort(function(chFreq1,chFreq2){return chFreq2.freq-chFreq1.freq;});this._output[this._outputPos++]=(characters.length>>8)&0xFF;this._output[this._outputPos++]=characters.length&0xFF;characters.forEach(function(chFreq){var charCode=chFreq.ch.charCodeAt(0);this._output[this._outputPos++]=(charCode>>8)&0xFF;this._output[this._outputPos++]=charCode&0xFF;var freq=chFreq.freq;this._output[this._outputPos++]=(freq>>24)&0xFF;this._output[this._outputPos++]=(freq>>16)&0xFF;this._output[this._outputPos++]=(freq>>8)&0xFF;this._output[this._outputPos++]=freq&0xFF;},this);this._nodes.forEach(function(node){this._emitNode(node);},this);return this._output.buffer;};TSTBlobBuilder.prototype._computeOffsets=function(){var offset=0;this._nodes.forEach(function(node){node.offset=offset;var charlen;if(node.ch==_EndOfWord){charlen=0;}else if(node.ch.charCodeAt(0)<=255){charlen=1;}else{charlen=2;}
var nextlen=node.next?3:0;offset=offset+1+charlen+nextlen;});return offset;};TSTBlobBuilder.prototype._writeUint24=function(x){this._output[this._outputPos++]=(x>>16)&0xFF;this._output[this._outputPos++]=(x>>8)&0xFF;this._output[this._outputPos++]=x&0xFF;};TSTBlobBuilder.prototype._emitNode=function(node){var charcode=(node.ch==_EndOfWord)?0:node.ch.charCodeAt(0);var cbit=(0!==charcode)?0x80:0;var sbit=(charcode>255)?0x40:0;var nbit=node.next?0x20:0;var freq;if(0===node.frequency){freq=0;}else{freq=1+Math.floor(node.frequency*31);}
var firstbyte=cbit|sbit|nbit|(freq&0x1F);this._output[this._outputPos++]=firstbyte;if(cbit){if(sbit){this._output[this._outputPos++]=charcode>>8;}
this._output[this._outputPos++]=charcode&0xFF;}
if(nbit){this._writeUint24(node.next.offset);}};var WordListConverter=function(words){this.blob=undefined;words.reduce(function(prevType,word){var thisType=typeof word;if(thisType!==prevType){throw'Type mismatch. previous: '+prevType+', this: '+thisType;}
if('object'===thisType){if(!('w'in word)){throw'"w" field not found in word';}
if(!('f'in word)){throw'"f" field not found in word';}
if(!(word.f>=0&&word.f<1)){throw'"f" value not in allowed range';}}
return thisType;},typeof words[0]);this.words=words;};WordListConverter.prototype.debug=function(msg){if(_DEBUG){console.log(msg);}};WordListConverter.prototype.toBlob=function(){if(this.blob){return this.blob;}
var words=this.words;if('string'===typeof words[0]){words=words.map(function(word){return{w:word,f:0.3};});}
var tstBuilder=new TSTBuilder(words);tstBuilder.build();var nodes=new TSTSerializer(tstBuilder.getTreeRoot()).serializeToNodes();this.blob=new TSTBlobBuilder(nodes,tstBuilder.getCharacterFrequency(),tstBuilder.getMaxWordLength()).toBlobArray();return this.blob;};exports.WordListConverter=WordListConverter;})(namespace);})();;'use strict';(function(exports){var UserDictionaryListPanel=function(app){BaseView.apply(this);this.app=app;this._model=new UserDictionary(this);this._populated=false;this._listContainer=null;this._domWordMap=null;this._wordDomMap=null;};UserDictionaryListPanel.prototype=Object.create(BaseView.prototype);UserDictionaryListPanel.prototype.CONTAINER_ID='panel-ud-wordlist';UserDictionaryListPanel.prototype.start=function(){BaseView.prototype.start.call(this);this._listContainer=this.container.querySelector('#ud-wordlist-list');this._model.start();this._domWordMap=new WeakMap();this._wordDomMap={};};UserDictionaryListPanel.prototype.stop=function(){BaseView.prototype.stop.call(this);this._populated=false;this._listContainer=null;this._model.stop();this._domWordMap=null;this._wordDomMap=null;};UserDictionaryListPanel.prototype.beforeShow=function(options){if(!this._populated){this._populated=true;return this._model.getList().then(words=>{if(!words||words.size===0){this.container.classList.add('empty');}else{this.container.classList.remove('empty');this._rearrangeList(words);}}).catch(e=>console.error(e));}};UserDictionaryListPanel.prototype.show=function(){this.container.querySelector('#ud-addword-btn').addEventListener('click',this);this._listContainer.addEventListener('click',this);this.container.querySelector('gaia-header').addEventListener('action',this);};UserDictionaryListPanel.prototype.beforeHide=function(){this.container.querySelector('#ud-addword-btn').removeEventListener('click',this);this._listContainer.removeEventListener('click',this);this.container.querySelector('gaia-header').removeEventListener('action',this);};UserDictionaryListPanel.prototype.handleEvent=function(evt){var target=evt.target;switch(evt.type){case'click':if('ud-addword-btn'===target.id){this._showAddDialog();}else if('li'===target.tagName.toLowerCase()){this._showEditDialog(target);evt.preventDefault();}
break;case'action':this.app.panelController.navigateToRoot();break;}};UserDictionaryListPanel.prototype._rearrangeList=function(wordList){wordList.forEach(word=>{word=word.trim();var wordElem;if(word in this._wordDomMap){wordElem=this._wordDomMap[word];}else{wordElem=this._createWordElem(word);}
this._listContainer.appendChild(wordElem);});};UserDictionaryListPanel.prototype._createWordElem=function(word){var innerAnchor=document.createElement('a');innerAnchor.href='#'+word;innerAnchor.textContent=word;var elem=document.createElement('li');elem.appendChild(innerAnchor);this._domWordMap.set(elem,word);this._wordDomMap[word]=elem;return elem;};UserDictionaryListPanel.prototype._showAddDialog=function(){this.app.dialogController.openDialog(this.app.dialogController.userDictionaryEditDialog).then(result=>{if('commit'===result.action){this._addWord(result.word);}}).catch(e=>e&&console.error(e));};UserDictionaryListPanel.prototype._showEditDialog=function(wordElem){var word=this._domWordMap.get(wordElem);this.app.dialogController.openDialog(this.app.dialogController.userDictionaryEditDialog,{word:word}).then(result=>{switch(result.action){case'remove':this._removeWord(word,wordElem);break;case'commit':this._replaceWord(word,result.word,wordElem);break;}}).catch(e=>e&&console.error(e));};UserDictionaryListPanel.prototype._addWord=function(word){word=word.trim();if(word.length>0){var awakeLock=this.app.closeLockManager.requestLock('stayAwake');this._model.addWord(word).then(wordList=>{awakeLock.unlock();this.container.classList.remove('empty');this._rearrangeList(wordList);}).catch(e=>{awakeLock.unlock();if('existing'===e){return;}else{console.error(e);}});}};UserDictionaryListPanel.prototype._removeWord=function(word,wordElem){var awakeLock=this.app.closeLockManager.requestLock('stayAwake');this._model.removeWord(word).then(()=>{awakeLock.unlock();this._domWordMap.delete(wordElem);delete this._wordDomMap[word];this._listContainer.removeChild(wordElem);if(0===this._listContainer.childNodes.length){this.container.classList.add('empty');}}).catch(e=>{awakeLock.unlock();console.error(e);});};UserDictionaryListPanel.prototype._replaceWord=function(oldWord,newWord,wordElem){newWord=newWord.trim();if(newWord.length>0&&oldWord!==newWord){var awakeLock=this.app.closeLockManager.requestLock('stayAwake');this._model.updateWord(oldWord,newWord).then(wordList=>{awakeLock.unlock();this._domWordMap.set(wordElem,newWord);delete this._wordDomMap[oldWord];this._wordDomMap[newWord]=wordElem;wordElem.childNodes[0].textContent=newWord;this._rearrangeList(wordList);}).catch(e=>{awakeLock.unlock();if('existing'===e){this._domWordMap.delete(wordElem);delete this._wordDomMap[oldWord];this._listContainer.removeChild(wordElem);}else{console.error(e);}});}};exports.UserDictionaryListPanel=UserDictionaryListPanel;})(window);;'use strict';(function(exports){var UserDictionaryEditDialog=function(){BaseView.apply(this);this._inputField=null;this._oldWord=undefined;};UserDictionaryEditDialog.prototype=Object.create(BaseView.prototype);UserDictionaryEditDialog.prototype.CONTAINER_ID='panel-ud-editword';UserDictionaryEditDialog.prototype.onsubmit=undefined;UserDictionaryEditDialog.prototype.start=function(){BaseView.prototype.start.call(this);this._inputField=this.container.querySelector('#ud-editword-input');};UserDictionaryEditDialog.prototype.stop=function(){BaseView.prototype.stop.call(this);this._inputField=null;};UserDictionaryEditDialog.prototype.beforeShow=function(options){if(options&&'word'in options){this.container.classList.remove('add-mode');this._inputField.value=options.word;this._oldWord=options.word;}else{this.container.classList.add('add-mode');}};UserDictionaryEditDialog.prototype.show=function(){this.container.querySelector('#ud-editword-header').addEventListener('action',this);this.container.querySelector('#ud-saveword-btn').addEventListener('click',this);this.container.querySelector('#ud-editword-input').addEventListener('keydown',this);this.container.querySelector('#ud-editword-delete-btn').addEventListener('click',this);this.container.querySelector('#ud-editword-dialog-cancel-btn').addEventListener('click',this);this.container.querySelector('#ud-editword-dialog-delete-btn').addEventListener('click',this);this._inputField.focus();};UserDictionaryEditDialog.prototype.beforeHide=function(){this.container.querySelector('#ud-editword-header').removeEventListener('action',this);this.container.querySelector('#ud-saveword-btn').removeEventListener('click',this);this.container.querySelector('#ud-editword-input').removeEventListener('keydown',this);this.container.querySelector('#ud-editword-delete-btn').removeEventListener('click',this);this.container.querySelector('#ud-editword-dialog-cancel-btn').removeEventListener('click',this);this.container.querySelector('#ud-editword-dialog-delete-btn').removeEventListener('click',this);};UserDictionaryEditDialog.prototype.hide=function(){this._inputField.value='';this._oldWord=undefined;};UserDictionaryEditDialog.prototype.handleEvent=function(evt){switch(evt.type){case'action':this._cancel();break;case'click':switch(evt.target.id){case'ud-saveword-btn':this._commitWord();break;case'ud-editword-delete-btn':navigator.mozL10n.setAttributes(this.container.querySelector('#ud-editword-delete-prompt'),'userDictionaryDeletePrompt',{word:this._oldWord});this.container.querySelector('#ud-editword-delete-dialog').removeAttribute('hidden');break;case'ud-editword-dialog-delete-btn':this._removeWord();case'ud-editword-dialog-cancel-btn':this.container.querySelector('#ud-editword-delete-dialog').setAttribute('hidden',true);break;}
break;case'keydown':if(evt.keyCode===KeyEvent.DOM_VK_RETURN){this._commitWord();this._inputField.blur();}
break;}};UserDictionaryEditDialog.prototype._removeWord=function(){this.onsubmit({action:'remove'});};UserDictionaryEditDialog.prototype._commitWord=function(){this.onsubmit({action:'commit',word:this._inputField.value.trim()});};UserDictionaryEditDialog.prototype._cancel=function(){this.onsubmit({action:'cancel'});};exports.UserDictionaryEditDialog=UserDictionaryEditDialog;})(window);;'use strict';(function(exports){var SettingsView=function(app,container,settingsConstructor){BaseView.apply(this);this.app=app;this.container=container;this.SettingsConstructor=settingsConstructor;this.settings=null;this.elements=[];this.taskQueue=null;};SettingsView.prototype=Object.create(BaseView.prototype);SettingsView.prototype.start=function(){this.settings=new this.SettingsConstructor();this.settings.promiseManager=this.app.settingsPromiseManager;this.settings.onsettingchange=function(){this.taskQueue=this.taskQueue.then(this._updateUI.bind(this)).catch(function(e){console.error(e);});}.bind(this);this.taskQueue=this.settings.initSettings().then(this._updateUI.bind(this)).catch(function(e){console.error(e);});this.settings.KEYS.forEach(function(settingKey,i){var el=this.container.querySelector('[data-setting="'+settingKey+'"]');if(!el){return;}
this.elements[i]=el;el.addEventListener('change',this);},this);};SettingsView.prototype._updateUI=function(){var values=this.settings.getSettingsSync();this.settings.KEYS.forEach(function(settingKey,i){var el=this.elements[i];if(!el){return;}
el.disabled=false;switch(el.type||el.nodeName.toLowerCase()){case'gaia-checkbox':el.checked=values[this.settings.PROPERTIES[i]];break;case'range':el.value=values[this.settings.PROPERTIES[i]];break;default:throw'SettingsView: UI type unimplemented.';}},this);};SettingsView.prototype.handleEvent=function(evt){var el=evt.target;var settingsKey=el.dataset.setting;var lock;var value;switch(el.type||el.nodeName.toLowerCase()){case'gaia-checkbox':lock=this.app.closeLockManager.requestLock('stayAwake');value=el.checked;break;case'range':lock=this.app.closeLockManager.requestLock('stayAwake');value=el.valueAsNumber;break;default:throw'SettingsView: UI type unimplemented.';}
el.disabled=true;this.taskQueue=this.taskQueue.then(function(){return this.app.settingsPromiseManager.set(settingsKey,value);}.bind(this)).then(function(){el.disabled=false;lock.unlock();},function(e){console.error('SettingsView: Attempt to set setting failed',settingsKey,e);el.disabled=false;this._updateUI();lock.unlock();}.bind(this)).catch(function(e){console.error(e);});};SettingsView.prototype.stop=function(){this.elements.forEach(function(el){if(!el){return;}
el.removeEventListener('change',this);});this.settings=null;this.elements=[];this.taskQueue=null;};exports.SettingsView=SettingsView;})(window);;'use strict';(function(exports){var GeneralSettingsGroupView=function GeneralSettingsGroupView(app){BaseView.apply(this);this.app=app;};GeneralSettingsGroupView.prototype=Object.create(BaseView.prototype);GeneralSettingsGroupView.prototype.CONTAINER_ID='general-settings';GeneralSettingsGroupView.prototype.start=function(){BaseView.prototype.start.call(this);this.childViews.soundFeedbackSettings=new SettingsView(this.app,this.container,SoundFeedbackSettings);this.childViews.soundFeedbackSettings.start();this.childViews.vibrationFeedbackSettings=new SettingsView(this.app,this.container,VibrationFeedbackSettings);this.childViews.vibrationFeedbackSettings.start();this.childViews.imEngineSettings=new SettingsView(this.app,this.container,IMEngineSettings);this.childViews.imEngineSettings.start();};GeneralSettingsGroupView.prototype.stop=function(){BaseView.prototype.stop.call(this);this.childViews.soundFeedbackSettings.stop();delete this.childViews.soundFeedbackSettings;this.childViews.vibrationFeedbackSettings.stop();delete this.childViews.vibrationFeedbackSettings;this.childViews.imEngineSettings.stop();delete this.childViews.imEngineSettings;};exports.GeneralSettingsGroupView=GeneralSettingsGroupView;})(window);;'use strict';(function(exports){var GeneralPanel=function(app){BaseView.apply(this);this._menuUDItem=null;this.app=app;};GeneralPanel.prototype=Object.create(BaseView.prototype);GeneralPanel.prototype.CONTAINER_ID='general';GeneralPanel.prototype.USER_DICT_ITEM_ID='menu-userdict';GeneralPanel.prototype.start=function(){BaseView.prototype.start.call(this);this._menuUDItem=document.getElementById(this.USER_DICT_ITEM_ID);this.childViews.general=new GeneralSettingsGroupView(this.app);this.childViews.general.start();if(typeof HandwritingSettingsGroupView==='function'){this.childViews.handwriting=new HandwritingSettingsGroupView(this.app);this.childViews.handwriting.start();}else{this.childViews.handwriting=new BaseView();this.childViews.handwriting.start();}
this.childViews.layoutItemList=new LayoutItemListView(this.app);this.childViews.layoutItemList.start();};GeneralPanel.prototype.stop=function(){BaseView.prototype.stop.call(this);this._menuUDItem=null;this.childViews.general.stop();delete this.childViews.general;this.childViews.handwriting.stop();delete this.childViews.handwriting;this.childViews.layoutItemList.stop();delete this.childViews.layoutItemList;};GeneralPanel.prototype.show=function(){this.container.querySelector('gaia-header').addEventListener('action',this);if(this._menuUDItem){this._menuUDItem.addEventListener('click',this);}
return BaseView.prototype.show.call(this);};GeneralPanel.prototype.beforeHide=function(){this.container.querySelector('gaia-header').removeEventListener('action',this);if(this._menuUDItem){this._menuUDItem.removeEventListener('click',this);}
return BaseView.prototype.beforeHide.call(this);};GeneralPanel.prototype.handleEvent=function(evt){switch(evt.type){case'action':this.app.requestClose();break;case'click':this.app.panelController.navigateToPanel(this.app.panelController.userDictionaryListPanel);evt.preventDefault();break;}};exports.GeneralPanel=GeneralPanel;})(window);;'use strict';(function(exports){const TRANSITION_TIMEOUT=600;var PanelController=function(app,rootPanelClass){this.RootPanelClass=rootPanelClass||this.ROOT_PANEL_CLASS;this._currentPanel=null;this.app=app;this.rootPanel=null;this.userDictionaryListPanel=null;};PanelController.prototype.ROOT_PANEL_CLASS=GeneralPanel;PanelController.prototype.start=function(){this.rootPanel=new this.RootPanelClass(this.app);this.rootPanel.start();if(typeof UserDictionaryListPanel==='function'){this.userDictionaryListPanel=new UserDictionaryListPanel(this.app);this.userDictionaryListPanel.start();}
Promise.resolve(this.rootPanel.beforeShow()).then(this.rootPanel.show.bind(this.rootPanel)).catch(e=>e&&console.error(e));};PanelController.prototype.stop=function(){this._currentPanel=null;this.rootPanel.stop();this.rootPanel=null;if(this.userDictionaryListPanel){this.userDictionaryListPanel.stop();this.userDictionaryListPanel=null;}};PanelController.prototype._createTransitionPromise=function(target){return new Promise(function(resolve){var transitionEnd=function(){clearTimeout(timeout);target.removeEventListener('transitionend',transitionEnd);resolve();};var timeout=setTimeout(transitionEnd,TRANSITION_TIMEOUT);target.addEventListener('transitionend',transitionEnd);});};PanelController.prototype.navigateToRoot=function(){Promise.resolve(this._currentPanel.beforeHide()).then(()=>this.rootPanel.beforeShow()).then(()=>{var transitionPromise=this._createTransitionPromise(this._currentPanel.container);this._currentPanel.container.classList.remove('current');this.rootPanel.container.classList.remove('prev');this.rootPanel.container.classList.add('current');return transitionPromise;}).then(this._currentPanel.hide.bind(this._currentPanel)).then(this.rootPanel.show.bind(this.rootPanel)).then(()=>{this._currentPanel=null;}).catch(e=>e&&console.error(e));};PanelController.prototype.navigateToPanel=function(panel,options){this._currentPanel=panel;Promise.resolve(this.rootPanel.beforeHide()).then(()=>panel.beforeShow(options)).then(()=>{var transitionPromise=this._createTransitionPromise(panel.container);panel.container.classList.add('current');this.rootPanel.container.classList.remove('current');this.rootPanel.container.classList.add('prev');return transitionPromise;}).then(this.rootPanel.hide.bind(this.rootPanel)).then(panel.show.bind(panel)).catch(e=>e&&console.error(e));};var DialogController=function(){this.userDictionaryEditDialog=null;};DialogController.prototype.start=function(){if(typeof UserDictionaryEditDialog==='function'){this.userDictionaryEditDialog=new UserDictionaryEditDialog(this);this.userDictionaryEditDialog.start();}};DialogController.prototype.stop=function(){if(this.userDictionaryEditDialog){this.userDictionaryEditDialog.stop();this.userDictionaryEditDialog=null;}};DialogController.prototype._createTransitionPromise=PanelController.prototype._createTransitionPromise;DialogController.prototype.openDialog=function(dialog,options){if(!('onsubmit'in dialog)){return Promise.reject('Dialog does not have a onsubmit callback');}
var resultPromiseResolve,resultPromiseReject;var resultPromise=new Promise(function(resolve,reject){resultPromiseResolve=resolve;resultPromiseReject=reject;});dialog.onsubmit=results=>{resultPromiseResolve(results);Promise.resolve(dialog.beforeHide()).then(()=>{var transitionPromise=this._createTransitionPromise(dialog.container);dialog.container.classList.remove('displayed');return transitionPromise;}).then(()=>{dialog.onsubmit=undefined;return dialog.hide();}).catch(e=>e&&console.log(e));};Promise.resolve(dialog.beforeShow(options)).then(()=>{var transitionPromise=this._createTransitionPromise(dialog.container);dialog.container.classList.add('displayed');return transitionPromise;}).then(dialog.show.bind(dialog)).catch(e=>resultPromiseReject(e));return resultPromise;};exports.PanelController=PanelController;exports.DialogController=DialogController;})(window);;'use strict';(function(exports){var LayoutDictionaryDownloader=function(imEngineId,dictFilename){this.imEngineId=imEngineId;this.dictFilename=dictFilename;this._xhr=null;};LayoutDictionaryDownloader.prototype.REMOTE_URL='https://fxos.cdn.mozilla.net/dictionaries/%imEngineId/%ver/%dictFilename';LayoutDictionaryDownloader.prototype.ENGINE_DATA_VERSIONS=Object.freeze({'latin':1});LayoutDictionaryDownloader.prototype.onprogress=null;LayoutDictionaryDownloader.prototype.load=function(){if(this._xhr){throw new Error('LayoutDictionaryDownloader: Already downloading...');}
var p=new Promise(function(resolve,reject){var url=this.REMOTE_URL.replace('%imEngineId',this.imEngineId).replace('%ver',this.ENGINE_DATA_VERSIONS[this.imEngineId]).replace('%dictFilename',this.dictFilename);var xhr=this._xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.responseType='arraybuffer';xhr.onprogress=function(evt){if(typeof this.onprogress==='function'){this.onprogress(evt.loaded,evt.total);}}.bind(this);xhr.onloadend=function(){this._xhr=null;var data=xhr.response;if(data&&this._verifyData(data)){if(typeof this.onprogress==='function'){this.onprogress(data.byteLength,data.byteLength);}
resolve(data);}else{reject(xhr.statusText);}}.bind(this);xhr.send();}.bind(this));return p;};LayoutDictionaryDownloader.prototype.abort=function(){if(!this._xhr){throw new Error('LayoutDictionaryDownloader: '+'Not downloading but abort is called.');}
this._xhr.abort();this._xhr=null;};LayoutDictionaryDownloader.prototype._verifyData=function(buffer){switch(this.imEngineId){case'latin':if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<8){return false;}
var view=new Uint8Array(buffer,0,8);return(String.fromCharCode.apply(String,view)==='FxOSDICT');default:throw new Error('LayoutDictionaryDownloader: '+'No verify method available for this imEngine.');}};exports.LayoutDictionaryDownloader=LayoutDictionaryDownloader;}(window));;'use strict';(function(exports){var Deferred=function(){this.promise=new Promise(function(resolve,reject){this.resolve=resolve;this.reject=reject;}.bind(this));return this;};var LayoutDictionary=function(list,dict){this.dbStore=list.dbStore;this.imEngineId=dict.imEngineId;this.filename=dict.filename;this.filePath=dict.filePath;this.fileSize=dict.fileSize;this.databaseId=dict.databaseId;this.installedLayoutIds=dict.installedLayoutIds;if(dict.preloaded){this.state=this.STATE_PRELOADED;}else if(this.installedLayoutIds.size!==0){this.state=this.STATE_INSTALLED;}else{this.state=this.STATE_INSTALLABLE;}
this._downloader=null;this._installingLayoutDeferreds=null;this._installingPromise=null;this._removingPromise=null;};LayoutDictionary.prototype.state=0;LayoutDictionary.prototype.imEngineId='';LayoutDictionary.prototype.filename='';LayoutDictionary.prototype.filePath='';LayoutDictionary.prototype.fileSize=0;LayoutDictionary.prototype.databaseId=0;LayoutDictionary.prototype.installedLayoutIds=null;LayoutDictionary.prototype.downloadLoadedSize=0;LayoutDictionary.prototype.downloadTotalSize=0;LayoutDictionary.prototype.STATE_PRELOADED=1;LayoutDictionary.prototype.STATE_INSTALLABLE=2;LayoutDictionary.prototype.STATE_INSTALLING_CANCELLABLE=3;LayoutDictionary.prototype.STATE_INSTALLING=4;LayoutDictionary.prototype.STATE_INSTALLED=5;LayoutDictionary.prototype.STATE_REMOVING=6;LayoutDictionary.prototype.start=function(){this._installingLayoutDeferreds=new Map();};LayoutDictionary.prototype.stop=function(){this._downloader=null;this._installingLayoutDeferreds=null;this._installingPromise=null;this._removingPromise=null;};LayoutDictionary.prototype.installForLayout=function(layoutItem){var deferred;switch(this.state){case this.STATE_PRELOADED:throw new Error('LayoutDictionary: '+'Can\'t install a dictionary under this state.');case this.STATE_INSTALLABLE:this._startInstall();deferred=new Deferred();this._installingLayoutDeferreds.set(layoutItem,deferred);return deferred.promise;case this.STATE_INSTALLING_CANCELLABLE:case this.STATE_INSTALLING:if(this._installingLayoutDeferreds.has(layoutItem)){return this._installingLayoutDeferreds.get(layoutItem).promise;}
deferred=new Deferred();this._installingLayoutDeferreds.set(layoutItem,deferred);return deferred.promise;case this.STATE_INSTALLED:this.installedLayoutIds.add(layoutItem.id);return Promise.resolve();case this.STATE_REMOVING:return this._removingPromise.then(this.installForLayout.bind(this,layoutItem),this.installForLayout.bind(this,layoutItem));default:throw new Error('LayoutDictionary: Invalid state.');}};LayoutDictionary.prototype.removeForLayout=function(layoutItem){switch(this.state){case this.STATE_PRELOADED:throw new Error('LayoutDictionary: '+'Can\'t remove a dictionary under this state.');case this.STATE_INSTALLABLE:return Promise.resolve();case this.STATE_INSTALLING_CANCELLABLE:if(!this._installingLayoutDeferreds.has(layoutItem)){return Promise.resolve();}
var deferred=this._installingLayoutDeferreds.get(layoutItem);deferred.reject('Cancelled');this._installingLayoutDeferreds.delete(layoutItem);if(this._installingLayoutDeferreds.size>0){return deferred.promise.catch(function(){});}
this._downloader.abort();return this._installingPromise.catch(function(){});case this.STATE_INSTALLING:if(!this._installingLayoutDeferreds.has(layoutItem)){return Promise.resolve();}
deferred=this._installingLayoutDeferreds.get(layoutItem);deferred.reject('Cancelled');this._installingLayoutDeferreds.delete(layoutItem);if(this._installingLayoutDeferreds.size>0){return deferred.promise.catch(function(){});}
return this._installingPromise.catch(function(){});case this.STATE_INSTALLED:if(!this.installedLayoutIds.has(layoutItem.id)){return Promise.resolve();}
if(this.installedLayoutIds.size>1){this.installedLayoutIds.delete(layoutItem.id);return Promise.resolve();}
this._startRemove();this._removingPromise=this._removingPromise.then(function(){this.installedLayoutIds.delete(layoutItem.id);}.bind(this));return this._removingPromise;case this.STATE_REMOVING:if(this.installedLayoutIds.has(layoutItem.id)){return this._removingPromise;}
return Promise.resolve();default:throw new Error('LayoutDictionary: Invalid state.');}};LayoutDictionary.prototype._startInstall=function(){if(this.state!==this.STATE_INSTALLABLE){throw new Error('LayoutDictionary: '+'Can\'t start install a dictionary under this state.');}
this.state=this.STATE_INSTALLING_CANCELLABLE;this.downloadLoadedSize=0;this.downloadTotalSize=this.fileSize;this._downloader=new LayoutDictionaryDownloader(this.imEngineId,this.filename);this._downloader.onprogress=this._updateProgress.bind(this);this._installingPromise=this._downloader.load().then(function(data){this._downloader=null;this.state=this.STATE_INSTALLING;return this.dbStore.setItem(this.databaseId,data);}.bind(this)).then(function(){this._installingPromise=null;this._installingLayoutDeferreds.forEach(function(deferred,layoutItem){this.installedLayoutIds.add(layoutItem.id);deferred.resolve();},this);this._installingLayoutDeferreds.clear();this.state=this.STATE_INSTALLED;this.downloadLoadedSize=0;this.downloadTotalSize=0;}.bind(this)).catch(function(e){console.warn('LayoutDictionary: Installation failed with error:',e);this._downloader=null;this._installingPromise=null;this._installingLayoutDeferreds.forEach(function(deferred){deferred.reject('Failed');},this);this._installingLayoutDeferreds.clear();this.state=this.STATE_INSTALLABLE;this.downloadLoadedSize=0;this.downloadTotalSize=0;}.bind(this)).then(function(){if(this.state===this.STATE_INSTALLED&&this._installingLayoutDeferreds.size===0&&this.installedLayoutIds.size===0){return this._startRemove();}}.bind(this));};LayoutDictionary.prototype._startRemove=function(){if(this.state!==this.STATE_INSTALLED){throw new Error('LayoutDictionary: '+'Can\'t start remove a dictionary under this state.');}
this.state=this.STATE_REMOVING;this._removingPromise=this.dbStore.deleteItem(this.databaseId).then(function(){this._removingPromise=null;this.state=this.STATE_INSTALLABLE;}.bind(this)).catch(function(e){this._removingPromise=null;this.state=this.STATE_INSTALLED;throw e;}.bind(this));};LayoutDictionary.prototype._updateProgress=function(loaded,total){this.downloadLoadedSize=loaded;this.downloadTotalSize=total;Array.from(this._installingLayoutDeferreds).map(function(keyValue){return keyValue[0];}).forEach(function(layoutItem){layoutItem.updateInstallProgress(loaded,total);});};exports.LayoutDictionary=LayoutDictionary;}(window));;'use strict';(function(exports){var LayoutDictionaryList=function LayoutDictionaryList(layoutList){this.dbStore=null;this.dictionaries=null;};LayoutDictionaryList.prototype.DATABASE_NAME='imEngineData';LayoutDictionaryList.prototype.start=function(){this.dictionaries=new Map();this.dbStore=new PromiseStorage(this.DATABASE_NAME);this.dbStore.start();};LayoutDictionaryList.prototype.stop=function(){this.dictionaries.forEach(function(dict){dict.stop();});this.dictionaries=null;this.dbStore.stop();this.dbStore=null;};LayoutDictionaryList.prototype.getDictionary=function(imEngineId,dictFilePath){var databaseId=imEngineId+'/'+dictFilePath;return this.dictionaries.get(databaseId);};LayoutDictionaryList.prototype.createDictionariesFromLayouts=function createDictionariesFromLayouts(layouts){var dictsMap=this._getDictsMapFromLayouts(layouts);dictsMap.forEach(function(dict,databaseId){var layoutDict=new LayoutDictionary(this,dict);layoutDict.start();this.dictionaries.set(databaseId,layoutDict);},this);};LayoutDictionaryList.prototype._getDictsMapFromLayouts=function(layouts){var dictsMap=new Map();layouts.forEach(function(layout){if(!layout.dictFilename){return;}
var dict;var databaseId=layout.imEngineId+'/'+layout.dictFilePath;if(dictsMap.has(databaseId)){if(layout.installed){dict=dictsMap.get(databaseId);dict.installedLayoutIds.add(layout.id);}
return;}
dict={imEngineId:layout.imEngineId,filename:layout.dictFilename,filePath:layout.dictFilePath,fileSize:layout.dictFileSize,databaseId:databaseId,preloaded:layout.preloaded,installedLayoutIds:new Set()};if(layout.installed){dict.installedLayoutIds.add(layout.id);}
dictsMap.set(databaseId,dict);});return dictsMap;};exports.LayoutDictionaryList=LayoutDictionaryList;}(window));;'use strict';(function(exports){var LayoutItemErrorInfo=function(layoutItemState){switch(layoutItemState){case LayoutItem.prototype.STATE_INSTALLING_CANCELLABLE:this.error=this.ERROR_DOWNLOADERROR;break;case LayoutItem.prototype.STATE_INSTALLING:this.error=this.ERROR_INSTALLERROR;break;case LayoutItem.prototype.STATE_REMOVING:this.error=this.ERROR_REMOVEERROR;break;default:throw new Error('LayoutItemErrorInfo: Error at invalid state.');}};LayoutItemErrorInfo.prototype.ERROR_DOWNLOADERROR=1;LayoutItemErrorInfo.prototype.ERROR_INSTALLERROR=2;LayoutItemErrorInfo.prototype.ERROR_REMOVEERROR=3;var LayoutItem=function(list,layout){this.list=list;this.id=layout.id;this.name=layout.name;this.nameL10nId=layout.nameL10nId;this.imEngineId=layout.imEngineId;this.dictFilePath=layout.dictFilePath;this.fileSize=layout.dictFileSize;this.types=layout.types;if(layout.preloaded){this.state=this.STATE_PRELOADED;}else if(layout.installed){this.state=this.STATE_INSTALLED;}else{this.state=this.STATE_INSTALLABLE;}
this._dictionary=null;this._userCancelled=undefined;};LayoutItem.prototype.STATE_PRELOADED=1;LayoutItem.prototype.STATE_INSTALLABLE=2;LayoutItem.prototype.STATE_INSTALLING_CANCELLABLE=3;LayoutItem.prototype.STATE_INSTALLING=4;LayoutItem.prototype.STATE_INSTALLED=5;LayoutItem.prototype.STATE_REMOVING=6;LayoutItem.prototype.onerror=null;LayoutItem.prototype.onstatechange=null;LayoutItem.prototype.onprogress=null;LayoutItem.prototype.oninstall=null;LayoutItem.prototype.id='';LayoutItem.prototype.name='';LayoutItem.prototype.nameL10nId='';LayoutItem.prototype.types=null;LayoutItem.prototype.fileSize=0;LayoutItem.prototype.downloadLoadedSize=0;LayoutItem.prototype.downloadTotalSize=0;LayoutItem.prototype.start=function(){if(this.state!==this.STATE_PRELOADED){this._dictionary=this.list.dictionaryList.getDictionary(this.imEngineId,this.dictFilePath);}};LayoutItem.prototype.stop=function(){};LayoutItem.prototype.install=function(){if(this.state!==this.STATE_INSTALLABLE){throw new Error('LayoutItem: '+'Can\'t install a layout under this state.');}
var openLock=this.list.closeLockManager.requestLock('stayAwake');this._userCancelled=false;var p=Promise.resolve().then(function(){var p=this._dictionary.installForLayout(this);if(this._dictionary.state===this._dictionary.STATE_INSTALLING_CANCELLABLE){this.downloadLoadedSize=this._dictionary.downloadLoadedSize;this.downloadTotalSize=this._dictionary.downloadTotalSize;this._changeState(this.STATE_INSTALLING_CANCELLABLE);}else{this._changeState(this.STATE_INSTALLING);}
return p;}.bind(this)).then(function(){if(this.state!==this.STATE_INSTALLING){this.downloadLoadedSize=0;this.downloadTotalSize=0;this._changeState(this.STATE_INSTALLING);}
return navigator.mozInputMethod.addInput(this.id,{launch_path:'/index.html#'+this.id,name:this.name,description:this.name,types:this.types});}.bind(this)).then(this.list.setLayoutAsInstalled.bind(this.list,this.id)).then(function(){this._userCancelled=undefined;openLock.unlock();this._changeState(this.STATE_INSTALLED);if(typeof this.oninstall==='function'){this.oninstall();}}.bind(this)).catch(function(e){if(!this._userCancelled){this._triggerError();}
this._userCancelled=undefined;this.downloadLoadedSize=0;this.downloadTotalSize=0;openLock.unlock();this._changeState(this.STATE_INSTALLABLE);throw(e||new Error('LayoutItem: Installation failed/cancelled.'));}.bind(this));return p;};LayoutItem.prototype.cancelInstall=function(){if(this.state!==this.STATE_INSTALLING_CANCELLABLE){throw new Error('LayoutItem: '+'Can\'t cancel an install under this state.');}
this._userCancelled=true;this._dictionary.removeForLayout(this);};LayoutItem.prototype.remove=function(){if(this.state!==this.STATE_INSTALLED){throw new Error('LayoutItem: '+'Can\'t remove a layout under this state.');}
var openLock=this.list.closeLockManager.requestLock('stayAwake');var p=Promise.resolve().then(function(){this._changeState(this.STATE_REMOVING);return navigator.mozInputMethod.removeInput(this.id);}.bind(this)).then(function(){return this.list.setLayoutAsUninstalled(this.id).catch(function(e){console.error('LayoutItem: Ignoring set uninstall failure.',e);});}.bind(this)).then(function(){return this._dictionary.removeForLayout(this).catch(function(e){console.error('LayoutItem: Ignoring dictionary removal failure.',e);});}.bind(this)).then(openLock.unlock.bind(openLock)).then(this._changeState.bind(this,this.STATE_INSTALLABLE)).catch(function(e){this._triggerError();openLock.unlock();this._changeState(this.STATE_INSTALLED);throw(e||new Error('LayoutItem: Removing failed.'));}.bind(this));return p;};LayoutItem.prototype.updateInstallProgress=function(loaded,total){if(this.state!==this.STATE_INSTALLING_CANCELLABLE){console.warn('LayoutItem: Ignoring updateInstallProgress call in the wrong state.');return;}
this.downloadLoadedSize=loaded;this.downloadTotalSize=total;if(typeof this.onprogress==='function'){return this.onprogress(loaded,total);}};LayoutItem.prototype._triggerError=function(){if(typeof this.onerror==='function'){this.onerror(new LayoutItemErrorInfo(this.state));}};LayoutItem.prototype._changeState=function(state){this.state=state;if(typeof this.onstatechange==='function'){return this.onstatechange();}};exports.LayoutItemErrorInfo=LayoutItemErrorInfo;exports.LayoutItem=LayoutItem;}(window));;'use strict';(function(exports){var DownloadPreference=function(app){this.app=app;};DownloadPreference.prototype.STATE_PROMPT=0;DownloadPreference.prototype.STATE_ALLOW=1;DownloadPreference.prototype.STATE_DENY=2;DownloadPreference.prototype.PREF_DOWNLOAD_ON_DATA_CONNTECION='download.prompt-on-data-connection';DownloadPreference.prototype.start=function(){};DownloadPreference.prototype.stop=function(){};DownloadPreference.prototype.getCurrentState=function(){if(!this._isUsingDataConnection()){return Promise.resolve(this.STATE_ALLOW);}
return this.app.preferencesStore.getItem(this.PREF_DOWNLOAD_ON_DATA_CONNTECION).then(function(val){switch(val){case undefined:return this.STATE_PROMPT;case true:return this.STATE_ALLOW;case false:return this.STATE_DENY;default:console.error('DownloadPreference: Unknown preference.',val);return this.STATE_PROMPT;}}.bind(this),function(e){e&&console.error(e);return this.STATE_PROMPT;}.bind(this));};DownloadPreference.prototype.setDataConnectionDownloadState=function(state){switch(state){case this.STATE_PROMPT:return this.app.preferencesStore.deleteItem(this.PREF_DOWNLOAD_ON_DATA_CONNTECION);case this.STATE_ALLOW:return this.app.preferencesStore.setItem(this.PREF_DOWNLOAD_ON_DATA_CONNTECION,true);case this.STATE_DENY:return this.app.preferencesStore.setItem(this.PREF_DOWNLOAD_ON_DATA_CONNTECION,false);default:throw new Error('DownloadPreference: Unknown state.');}};DownloadPreference.prototype._isUsingDataConnection=function(){if(!navigator.mozMobileConnections){console.warn('DownloadPreference: mozMobileConnections is not available. '+'Assuming no data charges.');return false;}
var mobileDataConnected=Array.prototype.some.call(navigator.mozMobileConnections,function(conn){return(conn.data&&conn.data.connected);});return mobileDataConnected;};var LayoutEnabler=function(app){this.app=app;this.appManifestURL='';};LayoutEnabler.prototype.SETTING_ENABLE_LAYOUT_KEY='keyboard.enabled-layouts';LayoutEnabler.prototype.start=function(){this.appManifestURL=location.protocol+'//'+location.hostname+'/manifest.webapp';};LayoutEnabler.prototype.stop=function(){this.appManifestURL=null;};LayoutEnabler.prototype.enableLayout=function(id){return this.app.settingsPromiseManager.updateOne(this.SETTING_ENABLE_LAYOUT_KEY,function(obj){if(!obj[this.appManifestURL]){obj[this.appManifestURL]={};}
obj[this.appManifestURL][id]=true;return obj;}.bind(this));};LayoutEnabler.prototype.disableLayout=function(id){return this.app.settingsPromiseManager.updateOne(this.SETTING_ENABLE_LAYOUT_KEY,function(obj){if(!obj[this.appManifestURL]){obj[this.appManifestURL]={};}
delete obj[this.appManifestURL][id];return obj;}.bind(this));};var LayoutItemList=function(app){this.app=app;this.closeLockManager=app.closeLockManager;this.dictionaryList=null;this.downloadPreference=null;this.layoutEnabler=null;this._layoutConfigQueue=null;this._installedLayoutListSet=null;this.layoutItems=null;};LayoutItemList.prototype.ENABLED_LAYOUT_KEY='layout.dynamic-installed';LayoutItemList.prototype.CONFIG_FILE_PATH='./js/settings/layouts.json';LayoutItemList.prototype.onready=null;LayoutItemList.prototype.start=function(){this.dictionaryList=new LayoutDictionaryList(this);this.dictionaryList.start();this.downloadPreference=new DownloadPreference(this.app);this.downloadPreference.start();this.layoutEnabler=new LayoutEnabler(this.app);this.layoutEnabler.start();this.layoutItems=new Map();var p=this._getConfig().then(this._createLayoutItemsFromLayouts.bind(this)).then(function(){if(typeof this.onready==='function'){this.onready();}}.bind(this));this._layoutConfigQueue=p.catch(function(e){e&&console.error(e);});return p;};LayoutItemList.prototype.stop=function(){this.layoutItems.forEach(function(layoutItem){layoutItem.stop();});this.dictionaryList.stop();this.dictionaryList=null;this.downloadPreference.stop();this.downloadPreference=null;this.layoutEnabler.stop();this.layoutEnabler=null;this._layoutConfigQueue=null;this._installedLayoutListSet=null;};LayoutItemList.prototype.setLayoutAsInstalled=function(layoutId){var p=this._layoutConfigQueue.then(function(){this._installedLayoutListSet.add(layoutId);return this.app.preferencesStore.setItem(this.ENABLED_LAYOUT_KEY,Array.from(this._installedLayoutListSet));}.bind(this)).catch(function(e){this._installedLayoutListSet.delete(layoutId);throw e;});this._layoutConfigQueue=p.catch(function(e){e&&console.error(e);});return p;};LayoutItemList.prototype.setLayoutAsUninstalled=function(layoutId){var p=this._layoutConfigQueue.then(function(){this._installedLayoutListSet.delete(layoutId);return this.app.preferencesStore.setItem(this.ENABLED_LAYOUT_KEY,Array.from(this._installedLayoutListSet));}.bind(this)).catch(function(e){this._installedLayoutListSet.add(layoutId);throw e;});this._layoutConfigQueue=p.catch(function(e){e&&console.error(e);});return p;};LayoutItemList.prototype._getConfig=function(){var xhrPromise=new Promise(function(resolve,reject){var xhr=new XMLHttpRequest();xhr.open('GET',this.CONFIG_FILE_PATH);xhr.responseType='json';xhr.onload=function(){if(xhr.response){resolve(xhr.response);}else{reject();}};xhr.onerror=function(){reject();};xhr.send();}.bind(this));var installedLayoutsPromise=this.app.preferencesStore.getItem(this.ENABLED_LAYOUT_KEY);var p=Promise.all([xhrPromise,installedLayoutsPromise]).then(function(values){var layouts=values[0];var installedLayoutListSet=this._installedLayoutListSet=new Set(values[1]||[]);layouts.forEach(function(layout){layout.installed=layout.preloaded||installedLayoutListSet.has(layout.id);});return layouts;}.bind(this));return p;};LayoutItemList.prototype._createLayoutItemsFromLayouts=function(layouts){var needDownload=layouts.some(function(layout){return(layout.preloaded===false);});if(!needDownload){return;}
this.dictionaryList.createDictionariesFromLayouts(layouts);layouts.forEach(function(layout){var layoutItem=new LayoutItem(this,layout);layoutItem.start();this.layoutItems.set(layout.id,layoutItem);},this);};exports.LayoutItemList=LayoutItemList;exports.DownloadPreference=DownloadPreference;exports.LayoutEnabler=LayoutEnabler;}(window));;'use strict';(function(exports){var LayoutItemView=function(list,layoutItem){BaseView.apply(this);this._statusEl=null;this._progressEl=null;if(typeof layoutItem!=='object'){throw new Error('LayoutItemView: '+'LayoutItemView does not create a LayoutItem for itself, '+'please pass an approate instance as the model.');}
this.list=list;this._model=layoutItem;};LayoutItemView.prototype=Object.create(BaseView.prototype);LayoutItemView.prototype.oninlistchange=null;LayoutItemView.prototype.inList=undefined;LayoutItemView.prototype.IN_LIST_INSTALLED=0;LayoutItemView.prototype.IN_LIST_INSTALLABLE=1;LayoutItemView.prototype.TEMPLATE_ID='installable-keyboard-list-item';LayoutItemView.prototype.start=function(){this._model.onerror=this._showError.bind(this);this._model.onprogress=this._updateProgress.bind(this);this._model.onstatechange=this._updateUI.bind(this);this._model.oninstall=this._showEnableDialog.bind(this);var template=document.getElementById(this.TEMPLATE_ID);var el=this.container=document.importNode(template.content,true).firstElementChild;el.querySelector('.label').textContent=this._model.name;if(this._model.nameL10nId){el.querySelector('.label').dataset.l10nId=this._model.nameL10nId;}
el.addEventListener('click',this);this._statusEl=el.querySelector('.status');this._progressEl=el.querySelector('.progress');this._updateUI();};LayoutItemView.prototype._updateProgress=function(){var loadedSizeData=this._getHumanFileSize(this._model.downloadLoadedSize);var totalSizeData=this._getHumanFileSize(this._model.downloadTotalSize);this._progressEl.value=this._model.downloadLoadedSize;this._progressEl.max=this._model.downloadTotalSize;this._statusEl.dataset.l10nArgs=JSON.stringify({loadedSize:loadedSizeData.size,loadedSizeUnit:loadedSizeData.localizedUnit,totalSize:totalSizeData.size,totalSizeUnit:totalSizeData.localizedUnit});};LayoutItemView.prototype._updateUI=function(){var fileSizeData;var loadedSizeData;var totalSizeData;var item=this._model;switch(item.state){case item.STATE_PRELOADED:this.container.dataset.enabledAction='none';this._statusEl.dataset.l10nId='preInstalledStatus';fileSizeData=this._getHumanFileSize(item.fileSize);this._statusEl.dataset.l10nArgs=JSON.stringify({size:fileSizeData.size,sizeUnit:fileSizeData.localizedUnit});this._progressEl.classList.add('hide');this._updateList(this.IN_LIST_INSTALLED);break;case item.STATE_INSTALLABLE:this.container.dataset.enabledAction='download';this._statusEl.dataset.l10nId='installableStatus';fileSizeData=this._getHumanFileSize(item.fileSize);this._statusEl.dataset.l10nArgs=JSON.stringify({size:fileSizeData.size,sizeUnit:fileSizeData.localizedUnit});this._progressEl.classList.add('hide');this._updateList(this.IN_LIST_INSTALLABLE);break;case item.STATE_INSTALLING_CANCELLABLE:this.container.dataset.enabledAction='cancel-download';this._statusEl.dataset.l10nId='downloadingStatus';loadedSizeData=this._getHumanFileSize(item.downloadLoadedSize);totalSizeData=this._getHumanFileSize(item.downloadTotalSize);this._statusEl.dataset.l10nArgs=JSON.stringify({loadedSize:loadedSizeData.size,loadedSizeUnit:loadedSizeData.localizedUnit,totalSize:totalSizeData.size,totalSizeUnit:totalSizeData.localizedUnit});this._progressEl.classList.remove('hide');this._progressEl.value=item.downloadLoadedSize;this._progressEl.max=item.downloadTotalSize;this._updateList(this.IN_LIST_INSTALLABLE);break;case item.STATE_INSTALLING:this.container.dataset.enabledAction='none';this._statusEl.dataset.l10nId='downloadingStatus';fileSizeData=this._getHumanFileSize(item.fileSize);this._statusEl.dataset.l10nArgs=JSON.stringify({loadedSize:fileSizeData.size,loadedSizeUnit:fileSizeData.localizedUnit,totalSize:fileSizeData.size,totalSizeUnit:fileSizeData.localizedUnit});this._progressEl.classList.remove('hide');this._progressEl.value=this._progressEl.max=item.fileSize;this._updateList(this.IN_LIST_INSTALLABLE);break;case item.STATE_INSTALLED:this.container.dataset.enabledAction='remove';this._statusEl.dataset.l10nId='installedStatus';fileSizeData=this._getHumanFileSize(item.fileSize);this._statusEl.dataset.l10nArgs=JSON.stringify({size:fileSizeData.size,sizeUnit:fileSizeData.localizedUnit});this._progressEl.classList.add('hide');this._updateList(this.IN_LIST_INSTALLED);break;case item.STATE_REMOVING:this.container.dataset.enabledAction='none';this._statusEl.dataset.l10nId='removingStatus';delete this._statusEl.dataset.l10nArgs;this._progressEl.classList.add('hide');this._updateList(this.IN_LIST_INSTALLED);break;}};LayoutItemView.prototype._showEnableDialog=function(){this.list.confirmEnable(this._model.name).then(function(confirmed){if(confirmed){return this.list.enableLayout(this._model.id);}}.bind(this)).catch(function(e){e&&console.error(e);});};LayoutItemView.prototype._showError=function(errorInfo){switch(errorInfo.error){case errorInfo.ERROR_DOWNLOADERROR:this.list.showDownloadErrorToast();break;case errorInfo.ERROR_INSTALLERROR:console.error('LayoutItemView: layout installation error.');break;case errorInfo.ERROR_REMOVEERROR:console.error('LayoutItemView: layout removal error.');break;default:console.error('LayoutItemView: undefined onerror call,',errorInfo);break;}};LayoutItemView.prototype.handleEvent=function(evt){var el=evt.target;var p;switch(el.dataset.action){case'download':p=this.list.confirmDownload().then(function(confirmed){if(confirmed){return this._model.install();}}.bind(this));break;case'cancelDownload':p=this._model.cancelInstall();break;case'remove':p=this.list.confirmRemoval(this._model.name).then(function(confirmed){if(!confirmed){return;}
return this.list.disableLayout(this._model.id).then(function(){return this._model.remove();}.bind(this));}.bind(this));break;}
if(p){p.catch(function(e){e&&console.error(e);});}};LayoutItemView.prototype.stop=function(){this._model.onprogress=null;this._model.onstatechange=null;this.container.removeEventListener('click',this);this.container=null;};LayoutItemView.prototype._updateList=function(newListState){if(newListState===this.inList){return;}
if(typeof this.inList==='undefined'){this.inList=newListState;return;}
this.inList=newListState;if(typeof this.oninlistchange==='function'){this.oninlistchange();}};LayoutItemView.prototype._getHumanFileSize=function(sizeInNumber){var _=navigator.mozL10n.get;var sizeString='';var localizedUnit='';if(sizeInNumber>(1<<30)){sizeString=(sizeInNumber/(1<<30)).toFixed(2);localizedUnit=_('byteUnit-GB');}else if(sizeInNumber>(1<<20)){sizeString=(sizeInNumber/(1<<20)).toFixed(2);localizedUnit=_('byteUnit-MB');}else if(sizeInNumber>(1<<10)){sizeString=(sizeInNumber/(1<<10)).toFixed(2);localizedUnit=_('byteUnit-KB');}else{sizeString=sizeInNumber.toFixed(2);localizedUnit=_('byteUnit-B');}
sizeString=sizeString.replace(/\.?0*$/,'');return{size:sizeString,localizedUnit:localizedUnit};};exports.LayoutItemView=LayoutItemView;}(window));;'use strict';(function(exports){var LayoutItemDownloadErrorToastView=function(){BaseView.apply(this);this._isVisible=false;this._showDelayed=false;};LayoutItemDownloadErrorToastView.prototype=Object.create(BaseView.prototype);LayoutItemDownloadErrorToastView.prototype.CONTAINER_ID='installable-keyboards-download-error-toast';LayoutItemDownloadErrorToastView.prototype.start=function(){BaseView.prototype.start.call(this);this._isVisible=false;this._showDelayed=false;};LayoutItemDownloadErrorToastView.prototype.stop=function(){BaseView.prototype.stop.call(this);this._isVisible=false;this._showDelayed=false;};LayoutItemDownloadErrorToastView.prototype.show=function(){BaseView.prototype.show.call(this);this._isVisible=true;if(this._showDelayed){this.container.show();this._showDelayed=false;}};LayoutItemDownloadErrorToastView.prototype.beforeHide=function(){BaseView.prototype.beforeHide.call(this);this._isVisible=false;this.container.hide();};LayoutItemDownloadErrorToastView.prototype.showToast=function(){if(!this._isVisible){this._showDelayed=true;return;}
this.container.show();};var Deferred=function(){this.promise=new Promise(function(resolve,reject){this.resolve=resolve;this.reject=reject;}.bind(this));};var DialogInfo=function(args){this.args=args;this.deferred=new Deferred();};var ConfirmationDialogBaseView=function(){BaseView.apply(this);this._isVisible=false;this._isShown=undefined;this._currentDialogInfo=null;this._delayedDialogInfo=null;};ConfirmationDialogBaseView.prototype=Object.create(BaseView.prototype);ConfirmationDialogBaseView.prototype.CONTAINER_ID=undefined;ConfirmationDialogBaseView.prototype.start=function(){if(!this.CONTAINER_ID){throw new Error('ConfirmationDialogBaseView: CONTAINER_ID unset.');}
BaseView.prototype.start.call(this);this._delayedDialogInfo=[];this.container.hidden=true;this._isShown=false;this.container.addEventListener('confirm',this);this.container.addEventListener('cancel',this);};ConfirmationDialogBaseView.prototype.stop=function(){this.container.removeEventListener('confirm',this);this.container.removeEventListener('cancel',this);this._delayedDialogInfo.forEach(function(info){info.deferred.reject('stopped');});this._delayedDialogInfo=null;BaseView.prototype.stop.call(this);};ConfirmationDialogBaseView.prototype.show=function(){BaseView.prototype.show.call(this);this._isVisible=true;this._maybeShowNextDelayedDialog();};ConfirmationDialogBaseView.prototype.handleEvent=function(evt){switch(evt.type){case'confirm':this.hideDialog(true);break;case'cancel':this.hideDialog(false);break;default:throw new Error('ConfirmationDialogBaseView: Unknown event.');}};ConfirmationDialogBaseView.prototype.showDialog=function(){var info=new DialogInfo(Array.prototype.slice.call(arguments));this._delayedDialogInfo.push(info);this._maybeShowNextDelayedDialog();return info.deferred.promise;};ConfirmationDialogBaseView.prototype.beforeShowDialog=function(){};ConfirmationDialogBaseView.prototype._maybeShowNextDelayedDialog=function(){if(!this._delayedDialogInfo.length||!this._isVisible||this._isShown){return;}
var info=this._delayedDialogInfo.shift();this.beforeShowDialog.apply(this,info.args);this.container.hidden=false;this._isShown=true;this._currentDialogInfo=info;};ConfirmationDialogBaseView.prototype.beforeHide=function(){this._isVisible=false;if(this._isShown){this.hideDialog(false);}
BaseView.prototype.beforeHide.call(this);};ConfirmationDialogBaseView.prototype.hideDialog=function(confirmed){if(!this._isShown){throw new Error('ConfirmationDialogBaseView: hideDialog() called when not shown.');}
this._currentDialogInfo.deferred.resolve(confirmed);this.container.hidden=true;this._isShown=false;this._currentDialogInfo=null;this._maybeShowNextDelayedDialog();};var LayoutItemRemovalConfirmationDialogView=function(){ConfirmationDialogBaseView.apply(this);};LayoutItemRemovalConfirmationDialogView.prototype=Object.create(ConfirmationDialogBaseView.prototype);LayoutItemRemovalConfirmationDialogView.prototype.CONTAINER_ID='installable-keyboards-removal-dialog';LayoutItemRemovalConfirmationDialogView.prototype.beforeShowDialog=function(label){ConfirmationDialogBaseView.prototype.beforeShowDialog(this);this.container.firstElementChild.dataset.l10nArgs=JSON.stringify({keyboard:label});};var LayoutItemDataConnectionConfirmationDialogView=function(){ConfirmationDialogBaseView.apply(this);this.rememberMyChoiceElement=null;};LayoutItemDataConnectionConfirmationDialogView.prototype=Object.create(ConfirmationDialogBaseView.prototype);LayoutItemDataConnectionConfirmationDialogView.prototype.CONTAINER_ID='installable-keyboards-mobile-download-dialog';LayoutItemDataConnectionConfirmationDialogView.prototype.REMEMBER_MY_CHOICE_ID='installable-keyboards-remember';LayoutItemDataConnectionConfirmationDialogView.prototype.start=function(){ConfirmationDialogBaseView.prototype.start.apply(this);this.rememberMyChoiceElement=document.getElementById(this.REMEMBER_MY_CHOICE_ID);};LayoutItemDataConnectionConfirmationDialogView.prototype.stop=function(){ConfirmationDialogBaseView.prototype.stop.apply(this);this.rememberMyChoiceElement=null;};LayoutItemDataConnectionConfirmationDialogView.prototype.beforeShowDialog=function(){ConfirmationDialogBaseView.prototype.beforeShowDialog(this);this.rememberMyChoiceElement.checked=false;};LayoutItemDataConnectionConfirmationDialogView.prototype.shouldRemember=function(){return this.rememberMyChoiceElement.checked;};var LayoutItemEnableConfirmationDialogView=function(){ConfirmationDialogBaseView.apply(this);};LayoutItemEnableConfirmationDialogView.prototype=Object.create(ConfirmationDialogBaseView.prototype);LayoutItemEnableConfirmationDialogView.prototype.CONTAINER_ID='installable-keyboards-enable-dialog';LayoutItemEnableConfirmationDialogView.prototype.beforeShowDialog=function(label){ConfirmationDialogBaseView.prototype.beforeShowDialog(this);this.container.firstElementChild.dataset.l10nArgs=JSON.stringify({keyboard:label});};var LayoutItemListView=function(app){BaseView.apply(this);this.app=app;this._model=null;this._installableListContainer=null;this._installedListContainer=null;};LayoutItemListView.prototype=Object.create(BaseView.prototype);LayoutItemListView.prototype.CONTAINER_ID='installable-keyboard';LayoutItemListView.prototype.INSTALLED_LIST_ID='installed-keyboards-list';LayoutItemListView.prototype.INSTALLABLE_LIST_ID='installable-keyboards-list';LayoutItemListView.prototype.start=function(){BaseView.prototype.start.call(this);this._model=new LayoutItemList(this.app);this._model.onready=this._handleModelReady.bind(this);this._model.start();this.childViews.removeDialog=new LayoutItemRemovalConfirmationDialogView();this.childViews.removeDialog.start();this.childViews.downloadErrorToast=new LayoutItemDownloadErrorToastView();this.childViews.downloadErrorToast.start();this.childViews.dataConnectionDialog=new LayoutItemDataConnectionConfirmationDialogView();this.childViews.dataConnectionDialog.start();this.childViews.enableDialog=new LayoutItemEnableConfirmationDialogView();this.childViews.enableDialog.start();this._installedListContainer=document.getElementById(this.INSTALLED_LIST_ID);this._installableListContainer=document.getElementById(this.INSTALLABLE_LIST_ID);};LayoutItemListView.prototype.confirmDownload=function(){var downloadPreference=this._model.downloadPreference;return downloadPreference.getCurrentState().then(function(state){switch(state){case downloadPreference.STATE_PROMPT:return this._showConfirmDownloadDialog();case downloadPreference.STATE_ALLOW:return true;case downloadPreference.STATE_DENY:return false;}}.bind(this));};LayoutItemListView.prototype._showConfirmDownloadDialog=function(){var downloadPreference=this._model.downloadPreference;var dataConnectionDialog=this.childViews.dataConnectionDialog;return dataConnectionDialog.showDialog().then(function(confirmed){if(confirmed&&dataConnectionDialog.shouldRemember()){downloadPreference.setDataConnectionDownloadState(downloadPreference.STATE_ALLOW).catch(function(e){e&&console.error(e);});}
return confirmed;}.bind(this));};LayoutItemListView.prototype.confirmRemoval=function(layoutName){return this.childViews.removeDialog.showDialog(layoutName);};LayoutItemListView.prototype.confirmEnable=function(layoutName){return this.childViews.enableDialog.showDialog(layoutName);};LayoutItemListView.prototype.disableLayout=function(id){return this._model.layoutEnabler.disableLayout(id);};LayoutItemListView.prototype.enableLayout=function(id){return this._model.layoutEnabler.enableLayout(id);};LayoutItemListView.prototype.showDownloadErrorToast=function(){this.childViews.downloadErrorToast.showToast();};LayoutItemListView.prototype._handleModelReady=function(){this._model.onready=null;var layoutItems=this._model.layoutItems;if(layoutItems.size===0){return;}
this.container.hidden=false;this._model.layoutItems.forEach(function(layoutItem,layoutId){var layoutItemView=this.childViews[layoutId]=new LayoutItemView(this,layoutItem);layoutItemView.oninlistchange=function(){Array.from(this._model.layoutItems).map(function(keyValue){return keyValue[0];}).forEach(function(id){this._putItemViewInList(this.childViews[id]);}.bind(this));}.bind(this);layoutItemView.start();this._putItemViewInList(layoutItemView);},this);};LayoutItemListView.prototype._putItemViewInList=function(layoutItemView){var container;switch(layoutItemView.inList){case layoutItemView.IN_LIST_INSTALLED:container=this._installedListContainer;break;case layoutItemView.IN_LIST_INSTALLABLE:container=this._installableListContainer;break;default:throw new Error('LayoutItemListView: '+'Unknown inList state of child view.');}
container.appendChild(layoutItemView.container);};LayoutItemListView.prototype.stop=function(){BaseView.prototype.stop.call(this);this._model.onready=null;this._model.stop();this._model=null;this._installedListContainer=null;for(var id in this.childViews){this.childViews[id].stop();this.childViews[id]=null;}};exports.LayoutItemDownloadErrorToastView=LayoutItemDownloadErrorToastView;exports.LayoutItemRemovalConfirmationDialogView=LayoutItemRemovalConfirmationDialogView;exports.LayoutItemListView=LayoutItemListView;}(window));;;'use strict';(function(exports){var KeyboardSettingsApp=function KeyboardSettingsApp(){this.closeLockManager=null;this.settingsPromiseManager=null;this.preferencesStore=null;this.panelController=null;this.dialogController=null;this._closeLock=null;};KeyboardSettingsApp.prototype.PREFERENCES_STORE_NAME='preferences';KeyboardSettingsApp.prototype.start=function(){this.closeLockManager=new CloseLockManager();this.closeLockManager.onclose=this.close.bind(this);this.closeLockManager.start();this.settingsPromiseManager=new SettingsPromiseManager();this.preferencesStore=new PromiseStorage(this.PREFERENCES_STORE_NAME);this.preferencesStore.start();this.panelController=new PanelController(this);this.panelController.start();this.dialogController=new DialogController();this.dialogController.start();document.addEventListener('visibilitychange',this);};KeyboardSettingsApp.prototype.stop=function(){this.closeLockManager.stop();this.closeLockManager=null;this.settingsPromiseManager=null;this.preferencesStore.stop();this.preferencesStore=null;this.panelController.stop();this.panelController=null;this.dialogController.stop();this.dialogController=null;document.removeEventListener('visibilitychange',this);};KeyboardSettingsApp.prototype.close=function(){this.stop();window.close();};KeyboardSettingsApp.prototype.requestClose=function(){Promise.resolve(new MozActivity({name:'moz_configure_window',data:{target:'device'}})).catch(function(e){console.error(e);});};KeyboardSettingsApp.prototype.handleEvent=function(evt){if(document.hidden){this._closeLock=this.closeLockManager.requestLock('requestClose');}else if(this._closeLock){this._closeLock.unlock();this._closeLock=null;}};exports.KeyboardSettingsApp=KeyboardSettingsApp;})(window);;'use strict';(function(exports){var app=new KeyboardSettingsApp();app.start();exports.app=app;})(window);