;;;window.COMPONENTS_BASE_URL='/shared/elements/';;;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;;'use strict';window.GaiaSubheader=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSubheaderBaseurl||'/shared/elements/gaia_subheader/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-subheader',{prototype:proto});})(window);;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;;;'use strict';var LazyLoader=(function(){function LazyLoader(){this._loaded={};this._isLoading={};}
LazyLoader.prototype={_js:function(file,callback){var script=document.createElement('script');script.src=file;script.async=false;script.addEventListener('load',callback);document.head.appendChild(script);this._isLoading[file]=script;},_css:function(file,callback){var style=document.createElement('link');style.type='text/css';style.rel='stylesheet';style.href=file;document.head.appendChild(style);callback();},_html:function(domNode,callback){if(domNode.getAttribute('is')){this.load(['/shared/js/html_imports.js'],function(){HtmlImports.populate(callback);}.bind(this));return;}
for(var i=0;i<domNode.childNodes.length;i++){if(domNode.childNodes[i].nodeType==document.COMMENT_NODE){domNode.innerHTML=domNode.childNodes[i].nodeValue;break;}}
window.dispatchEvent(new CustomEvent('lazyload',{detail:domNode}));callback();},getJSON:function(file,mozSystem){return new Promise(function(resolve,reject){var xhr;if(mozSystem){xhr=new XMLHttpRequest({mozSystem:true});}else{xhr=new XMLHttpRequest();}
xhr.open('GET',file,true);xhr.responseType='json';xhr.onerror=function(error){reject(error);};xhr.onload=function(){if(xhr.response!==null){resolve(xhr.response);}else{reject(new Error('No valid JSON object was found ('+
xhr.status+' '+xhr.statusText+')'));}};xhr.send();});},load:function(files,callback){var deferred={};deferred.promise=new Promise(resolve=>{deferred.resolve=resolve;});if(!Array.isArray(files)){files=[files];}
var loadsRemaining=files.length,self=this;function perFileCallback(file){if(self._isLoading[file]){delete self._isLoading[file];}
self._loaded[file]=true;if(--loadsRemaining===0){deferred.resolve();if(callback){callback();}}}
for(var i=0;i<files.length;i++){var file=files[i];if(this._loaded[file.id||file]){perFileCallback(file);}else if(this._isLoading[file]){this._isLoading[file].addEventListener('load',perFileCallback.bind(null,file));}else{var method,idx;if(typeof file==='string'){method=file.match(/\.([^.]+)$/)[1];idx=file;}else{method='html';idx=file.id;}
this['_'+method](file,perFileCallback.bind(null,idx));}}
return deferred.promise;}};return new LazyLoader();}());;;'use strict';(function(){window.utils=window.utils||{};var PerformanceHelper={domLoaded:function(){window.performance.mark('navigationLoaded');},chromeInteractive:function(){window.performance.mark('navigationInteractive');},visuallyComplete:function(){window.performance.mark('visuallyLoaded');},contentInteractive:function(){window.performance.mark('contentInteractive');},loadEnd:function(){window.performance.mark('fullyLoaded');}};window.utils.PerformanceHelper=PerformanceHelper;})();;;'use strict';(function(){const CACHE_ENABLED=true;const FIRST_CHUNK='firstChunk';const l10nStrings={'title':{query:'gaia-header h1#app-title[data-l10n-id="contacts"]',container:'textContent'},'search':{query:'input[data-l10n-id="search-contact"]',container:'placeholder'}};var _observers={};function addObserver(aMessage,aCallback){if(typeof aCallback!=='function'){return;}
if(!_observers[aMessage]){_observers[aMessage]=[];}
_observers[aMessage].push(aCallback);}
function notifyObservers(aMessage,aData){var observers=_observers[aMessage];if(!observers){return;}
for(var callback in observers){if(observers[callback]){observers[callback](aData);}}}
var _caches=new Map();_caches.set(FIRST_CHUNK,{containerId:'groups-list',active:false});var _cachedContacts;var _cachedFavorites;var _cachedHeaders;var _cacheEvictionTimer;function setCache(aCache){if(!CACHE_ENABLED||!aCache.id||!aCache.content||!aCache.lastOrderString||!_caches.has(aCache.id)){return;}
var l10n={};Object.keys(l10nStrings).forEach(key=>{var string=l10nStrings[key];var selector=document.querySelector(string.query);if(!selector||!selector[string.container]){return;}
l10n[key]=selector[string.container];});localStorage.setItem(aCache.id,JSON.stringify({content:aCache.content,languageDirection:navigator.mozL10n.language.direction,languageCode:navigator.mozL10n.language.code,lastOrderString:aCache.lastOrderString,updated:Date.now(),l10n:l10n}));}
function deleteCache(aId){if(!CACHE_ENABLED){return;}
localStorage.removeItem(aId);}
function getCachedContacts(aNodeList){if(!CACHE_ENABLED||!aNodeList){return;}
if(!_cachedContacts){_cachedContacts=new Map();}
if(!_cachedFavorites){_cachedFavorites=new Map();}
for(var i=0;i<aNodeList.length;i++){var cacheEntry=aNodeList[i];if(cacheEntry.parentNode.id=='contact-list-ice'){continue;}
if(cacheEntry.parentNode.id=='contacts-list-favorites'){_cachedFavorites.set(cacheEntry.dataset.uuid,cacheEntry.innerHTML);continue;}
_cachedContacts.set(cacheEntry.dataset.uuid,cacheEntry.innerHTML);}}
function appendNodesToContainer(aContainer,aNodeList){if(!CACHE_ENABLED||!aNodeList.length){return Promise.resolve();}
return new Promise((resolve)=>{if(!_cachedHeaders){_cachedHeaders={};}
var resolved=false;var fragment=document.createDocumentFragment();aNodeList.forEach((node)=>{if(!node.elementName){return;}
var child=document.createElement(node.elementName);node.attributes&&node.attributes.forEach((attribute)=>{if(!attribute.name||!attribute.value){return;}
child.setAttribute(attribute.name,attribute.value);});if(node.innerHTML){child.innerHTML=node.innerHTML;}
fragment.appendChild(child);var headerName=child.id.split('section-group-')[1];_cachedHeaders[headerName]=fragment.querySelector('ol#contacts-list-'+headerName);if(!resolved){resolve();}});getCachedContacts(fragment.querySelectorAll('li[data-cache=true]'));aContainer.appendChild(fragment);});}
function removeCacheFromContainer(aContainer){if(!CACHE_ENABLED||!_cachedContacts){return;}
for(var id of _cachedContacts.keys()){var items=aContainer.querySelectorAll('li[data-uuid=\"'+id+'\"]');Array.prototype.forEach.call(items,(item)=>{var ol=item.parentNode;ol.removeChild(item);if(ol.children.length<1){var header=_cachedHeaders[ol.dataset.group];if(header){var groupTitle=header.parentNode.children[0];groupTitle.classList.add('hide');}}});}}
function undoCache(aCacheId){if(!CACHE_ENABLED||!_caches.has(aCacheId)){return;}
var _cache=_caches.get(aCacheId);if(!_cache.containerId){return;}
var container=document.getElementById(_cache.containerId);if(!container){console.warning('Could not remove cached content from '+
_cache.containerId);return;}
removeCacheFromContainer(container);}
var Cache={get active(){return CACHE_ENABLED&&_caches.get(FIRST_CHUNK).active;},get enabled(){return CACHE_ENABLED;},get contacts(){return(CACHE_ENABLED&&_cachedContacts)?_cachedContacts.keys():null;},get favorites(){return(CACHE_ENABLED&&_cachedFavorites)?_cachedFavorites.keys():null;},get length(){return(CACHE_ENABLED&&_cachedContacts)?_cachedContacts.size+_cachedFavorites.size:0;},get headers(){return(CACHE_ENABLED&&_cachedHeaders)?_cachedHeaders:{};},get lastOrderString(){return(CACHE_ENABLED&&_caches.get(FIRST_CHUNK).lastOrderString);},get updated(){return(CACHE_ENABLED&&_caches.get(FIRST_CHUNK).updated);},get _rawContent(){return _caches.get(FIRST_CHUNK).content;},set firstChunk(aFirstChunk){if(!CACHE_ENABLED||!aFirstChunk||!aFirstChunk.cache||!aFirstChunk.lastOrderString){return;}
setCache({id:FIRST_CHUNK,content:aFirstChunk.cache,lastOrderString:aFirstChunk.lastOrderString});},set oneviction(aCallback){if(!CACHE_ENABLED){return;}
addObserver('oneviction',aCallback);},hasContact:function(aUuid){if(!CACHE_ENABLED){return;}
return _cachedContacts&&_cachedContacts.has(aUuid);},hasFavorite:function(aUuid){if(!CACHE_ENABLED){return;}
return _cachedFavorites&&_cachedFavorites.has(aUuid);},getContact:function(aUuid){if(!CACHE_ENABLED||!this.hasContact(aUuid)){return;}
var contact=_cachedContacts.get(aUuid);_cachedContacts.delete(aUuid);return contact;},getFavorite:function(aUuid){if(!CACHE_ENABLED||!this.hasFavorite(aUuid)){return;}
var contact=_cachedFavorites.get(aUuid);_cachedFavorites.delete(aUuid);return contact;},removeContact:function(aUuid){if(!CACHE_ENABLED||!this.hasContact(aUuid)||!this.hasFavorite(aUuid)){return;}
if(_cachedContacts.has(aUuid)){_cachedContacts.delete(aUuid);}
if(_cachedFavorites.has(aUuid)){_cachedFavorites.delete(aUuid);}},_doEvict:function(aUndo){_cacheEvictionTimer=null;if(aUndo){undoCache(FIRST_CHUNK);}
deleteCache(FIRST_CHUNK);this.cleanup();notifyObservers('oneviction');},evict:function(aUndo,aInstant){if(!CACHE_ENABLED){return;}
if(aInstant){this._doEvict(aUndo);return;}
if(_cacheEvictionTimer){clearTimeout(_cacheEvictionTimer);}
_cacheEvictionTimer=setTimeout(()=>{this._doEvict(aUndo);},1000);},maybeEvict:function(){if(!CACHE_ENABLED||!this.active){return;}
if((_caches.get(FIRST_CHUNK).languageDirection!=navigator.mozL10n.language.direction)||(_caches.get(FIRST_CHUNK).languageCode!=navigator.mozL10n.language.code)){this.evict(true);}},cleanup:function(){if(!CACHE_ENABLED){return;}
_caches.get(FIRST_CHUNK).active=false;_caches.get(FIRST_CHUNK).content=null;_cachedContacts=null;_cachedFavorites=null;_cachedHeaders=null;},apply:function(aCacheId){if(!CACHE_ENABLED||!_caches.has(aCacheId)){return Promise.reject();}
var _cache=_caches.get(aCacheId);var cache=localStorage.getItem(aCacheId);if(!cache){return Promise.reject();}
try{cache=JSON.parse(cache);_cache.content=cache.content;_cache.languageDirection=cache.languageDirection;_cache.languageCode=cache.languageCode;_cache.lastOrderString=cache.lastOrderString;_cache.updated=new Date(cache.updated);}catch(e){console.error(e);return Promise.reject();}
if(!_cache.containerId){return Promise.reject();}
if(cache.l10n){Object.keys(cache.l10n).forEach(key=>{if(!l10nStrings[key]||cache.l10n[key]==='undefined'){return;}
var string=l10nStrings[key];var selector=document.querySelector(string.query);if(!selector){return;}
selector[string.container]=cache.l10n[key];});}
if(cache.languageDirection){var html=document.querySelector('html');html.setAttribute('dir',cache.languageDirection);}
var container=document.getElementById(_cache.containerId);if(!container){console.warning('Could not apply cached content to '+
_cache.containerId);return Promise.reject();}
return appendNodesToContainer(container,_cache.content).then(()=>{_cache.content=null;_cache.active=true;_caches.set(aCacheId,_cache);return Promise.resolve();});}};window.Cache=Cache;})();;'use strict';window.addEventListener('DOMContentLoaded',function(){LazyLoader.load(['/shared/js/l10n.js']).then(function(){LazyLoader.load([document.getElementById('view-contact-details')]).then(function(){});});});window.onload=function(){var dependencies=['/contacts/services/contacts.js','/shared/js/contact_photo_helper.js','/shared/js/contacts/contacts_buttons.js','/shared/js/text_normalizer.js','/shared/js/contacts/utilities/dom.js','/shared/js/contacts/utilities/templates.js','/shared/js/contacts/import/utilities/misc.js','/contacts/js/match_service.js','/contacts/views/details/js/details_ui.js','/contacts/views/details/js/details_controller.js','/shared/pages/import/js/curtain.js'];LazyLoader.load(dependencies).then(function(){DetailsUI.init();DetailsController.init();window.addEventListener('renderdone',function fn(){window.removeEventListener('renderdone',fn);document.body.classList.remove('hidden');});navigator.mozSetMessageHandler('activity',activity=>{DetailsController.setActivity(activity);var id=activity.source.data.params.id;ContactsService.get(id,function onSuccess(savedContact){ContactsService.getCount(count=>{DetailsUI.render(savedContact,count,true);});},function onError(){console.error('Error retrieving contact');});});});};