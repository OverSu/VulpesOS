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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;'use strict';window.GaiaRadio=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaRadioBaseurl||'/shared/elements/gaia_radio/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._wrapper=this._template.getElementById('radio');this._wrapper.addEventListener('click',this.handleClick.bind(this));if(this.dataset.role){this._wrapper.setAttribute('role',this.dataset.role);}
if(!this.hasAttribute('role')){this.setAttribute('role','presentation');}
this.configureClass();shadow.appendChild(this._template);this.checked=this.hasAttribute('checked');this._wrapper.setAttribute('aria-checked',this.checked);setTimeout(function nextTick(){var label=this.querySelector('label, p');if(!label){return;}
label.addEventListener('click',this.handleClick.bind(this));}.bind(this));ComponentUtils.style.call(this,baseurl);var dirObserver=new MutationObserver(this.updateInternalDir.bind(this));dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});this.updateInternalDir();};proto.updateInternalDir=function(){var internal=this.shadowRoot.firstElementChild;if(document.documentElement.dir==='rtl'){internal.setAttribute('dir','rtl');}else{internal.removeAttribute('dir');}};proto.handleClick=function(e){e.stopImmediatePropagation();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(this.checked){return;}
if(!event.defaultPrevented){this.checked=!this.checked;}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.configureClass=function(){this._wrapper.className=this.className;this._wrapper.classList.toggle('checked',this._checked);};proto.hideDetails=function(){this.shadowRoot.querySelector('.details').style.display='none';};proto.attributeChangedCallback=function(name,from,to){if(name==='class'){this._wrapper.className=to;}};Object.defineProperty(proto,'checked',{get:function(){return this._checked;},set:function(value){if(!this._template){return;}
if(value){var relevant=document.querySelectorAll('gaia-radio[name="'+this.getAttribute('name')+'"]');for(var i=0,iLen=relevant.length;i<iLen;i++){relevant[i].checked=false;}
this.setAttribute('checked',true);}else{this.removeAttribute('checked');}
this._wrapper.classList.toggle('checked',value);this._wrapper.setAttribute('aria-checked',value);this._checked=value;}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});Object.defineProperty(proto,'value',{get:function(){return this.getAttribute('value');},set:function(value){this.setAttribute('value',value);}});Object.defineProperty(proto,'type',{get:function(){return'gaia-radio';}});var template=document.createElement('template');template.innerHTML='<span role="radio" id="radio">'+'<span><content select="p,label"></content></span>'+'<div class="details"><content select="details"></content></div>'+'<div class="divider"></div>'+'</span>';return document.registerElement('gaia-radio',{prototype:proto});})(window);;;'use strict';(function(exports){if(exports.ForwardLock){return;}
const mimeSubtype='vnd.mozilla.oma.drm.fl';const SECRET_SETTINGS_ID='oma.drm.forward_lock.secret.key';var secret=null;function xor(buffer,key){var words=new Uint32Array(buffer,0,buffer.byteLength>>2);for(var i=0,n=words.length;i<n;i++){words[i]^=key;}}
function lockBuffer(secret,content,type,metadata){var header='LOCKED 1 '+escape(type)+'\n';if(metadata){for(var p in metadata){header+=escape(p)+':'+escape(metadata[p])+'\n';}}
header+='\0';var buffer=new Uint8Array(new Uint8Array(content)).buffer;xor(buffer,secret);return new Blob([header,buffer],{type:type.split('/')[0]+'/'+mimeSubtype});}
function lockBlob(secret,blob,metadata,callback){var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){callback(lockBuffer(secret,reader.result,blob.type,metadata));};}
function unlockBlob(secret,blob,callback,errorCallback){if(!secret){return error('no secret supplied');}
var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){var buffer=reader.result;var bytes=new Uint8Array(buffer);var header='';var contentStart;for(var i=0;i<bytes.length;i++){if(bytes[i]===0){contentStart=i+1;break;}
header+=String.fromCharCode(bytes[i]);}
if(!header.startsWith('LOCKED')){return error('Bad magic number');}
if(header.substring(6,9)!==' 1 '){return error('Unsupported version number');}
if(!contentStart){return error('No content');}
var eol=header.indexOf('\n');if(eol===-1){return error('malformed header');}
var type=unescape(header.substring(9,eol).trim());var metadata={};var lines=header.substring(eol+1).split('\n');for(var j=0;j<lines.length;j++){var line=lines[j];if(!line){continue;}
var[key,value]=line.split(':');if(!key||!value){return error('malformed metadata');}
metadata[unescape(key)]=unescape(value);}
var content=buffer.slice(contentStart);xor(content,secret);var blob=new Blob([content],{type:type});try{callback(blob,metadata);}
catch(e){console.error('Exception in content callback',e);}};function error(msg){msg='LCKA.decrypt(): '+msg;if(errorCallback){try{errorCallback(msg);}
catch(e){console.error('Exception in error callback',e);}}
else{console.error(msg);}}}
function getKey(callback){try{if(secret!==null){report(secret);return;}
var lock=navigator.mozSettings.createLock();var getreq=lock.get(SECRET_SETTINGS_ID);getreq.onsuccess=function(){secret=getreq.result[SECRET_SETTINGS_ID]||null;report(secret);};getreq.onerror=function(){console.error('Error getting ForwardLock setting',getreq.error);report(null);};}
catch(e){console.error('Exception in ForwardLock.getKey():',e);report(null);}
function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getKey() callback',e);}}}}
function getOrCreateKey(callback){getKey(function(key){if(key!==null){report(key);return;}
secret=((Math.random()*0xFFFFFFFF)|0)+1;var setting={};setting[SECRET_SETTINGS_ID]=secret;var setreq=navigator.mozSettings.createLock().set(setting);setreq.onsuccess=function(){report(secret);};setreq.onerror=function(){console.error('Failed to set key in ForwardLock.getOrCreateKey()',setreq.error.name);secret=null;};});function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getOrCreateKey() callback');}}}}
exports.ForwardLock={lockBuffer:lockBuffer,lockBlob:lockBlob,unlockBlob:unlockBlob,mimeSubtype:mimeSubtype,getKey:getKey,getOrCreateKey:getOrCreateKey};}(window));;;'use strict';const DEBUG=true;const OMADownloadStatus=Object.freeze({SUCCESS:'900 Success',INSUFFICIENT_MEMORY:'901 Insufficient memory',USER_CANCELLED:'902 User Cancelled',LOSS_OF_SERVICE:'903 Loss of Service',ATTRIBUTE_MISMATCH:'905 Attribute mismatch',INVALID_DESCRIPTOR:'906 Invalid descriptor',INVALID_DDVERSION:'951 Invalid DDVersion',DEVICE_ABORTED:'952 Device Aborted',NON_ACCEPTABLE_CONTENT:'953 Non-Acceptable Content',LOADER_ERROR:'954 Loader Error'});const DOWNLOAD_ERROR='download_error';const INSTALL_ERROR='install_error';const ERR_DESCRIPTOR_DOWNLOAD_FAILED='err_descriptor_download_failed';const ERR_BAD_DESCRIPTOR='err_bad_descriptor';const ERR_TOO_BIG='err_too_big';const ERR_UNSUPPORTED_TYPE='err_unsupported_type';const ERR_BAD_TYPE='err_bad_type';const ERR_CONTENT_DOWNLOAD_FAILED='err_content_download_failed';const ERR_BAD_DRM_MESSAGE='err_bad_drm_message';const ERR_BAD_IMAGE='err_bad_image';const ERR_BAD_AUDIO='err_bad_audio';const ERR_NO_SPACE='err_no_space';const ERR_NO_SDCARD='err_no_sdcard';const ERR_SDCARD_IN_USE='err_sdcard_in_use';const ERR_DB_STORE_FAILURE='err_db_store_failure';const ERR_DS_SAVE_FAILURE='err_ds_save_failure';const SUCCESS_SONG='success_song';const SUCCESS_RINGTONE='success_ringtone';const SUCCESS_WALLPAPER='success_wallpaper';const systemXHR=Object.freeze({mozSystem:true});const SupportedImageTypes=Object.freeze({'image/jpeg':true,'image/png':true,'image/gif':true,'image/bmp':true});const SupportedAudioTypes=Object.freeze({'audio/mpeg':true,'audio/mp4':true,'audio/opus':true,'audio/ogg':true});const MimeTypeAliases=Object.freeze({'audio/mp3':'audio/mpeg'});const RINGTONE_KEY='dialer.ringtone';const RINGTONE_NAME_KEY='dialer.ringtone.name';const RINGTONE_ID_KEY='dialer.ringtone.id';const WALLPAPER_KEY='wallpaper.image';const SONG='song';const RINGTONE='ringtone';const WALLPAPER='wallpaper';const MAX_DOWNLOAD_SIZE=16*1024*1024;;;'use strict';function debug(...args){if(!DEBUG){return;}
if(!debug.startTime){debug.startTime=Date.now();}
args.unshift('[Locked Content]',Date.now()-debug.startTime);console.log.apply(console,args);}
function $(id){return document.getElementById(id);}
function _(id,args){return navigator.mozL10n.get(id,args);}
function showDialog(options){function close(e){document.body.removeChild(dialog);e.preventDefault();e.stopPropagation();}
var cancelButton;var okButton;var dialog=document.createElement('form');dialog.setAttribute('role','dialog');dialog.dataset.type='confirm';var section=document.createElement('section');dialog.appendChild(section);if(options.title){var title=document.createElement('h1');title.textContent=options.title;section.appendChild(title);}
var msg=document.createElement('p');msg.textContent=options.message;section.appendChild(msg);if(options.details){var details=document.createElement('p');var small=document.createElement('small');small.textContent=options.details;details.appendChild(small);section.appendChild(details);}
var menu=document.createElement('menu');dialog.appendChild(menu);if(options.cancelCallback){cancelButton=document.createElement('button');menu.appendChild(cancelButton);cancelButton.textContent=options.cancelText||_('cancel');cancelButton.onclick=function(e){close(e);options.cancelCallback();};}
if(options.okCallback){okButton=document.createElement('button');menu.appendChild(okButton);okButton.textContent=options.okText||_('ok');if(options.danger){okButton.classList.add('danger');}
else if(!options.cancelCallback){okButton.classList.add('recommend');}
okButton.onclick=function(e){close(e);options.okCallback();};}
if(okButton&&!cancelButton){okButton.classList.add('full');}
if(cancelButton&&!okButton){cancelButton.classList.add('full');}
document.body.appendChild(dialog);};;'use strict';var objectStore=(function(){const DBNAME='LOCKEDCONTENT';const DBVERSION=1;const STORENAMES=['ringtones','wallpapers'];var db;function getStore(access,storeName,callback){if(STORENAMES.indexOf(storeName)===-1){throw Error('unknown object store name:',storeName);}
if(db){callback(db.transaction(storeName,access).objectStore(storeName));}
else{initDB(function(){getStore(access,storeName,callback);});}}
function initDB(callback){var open=indexedDB.open(DBNAME,DBVERSION);open.onsuccess=function(){db=open.result;callback();};open.onupgradeneeded=function(){STORENAMES.forEach(function(storeName){open.result.createObjectStore(storeName,{autoIncrement:true,keyPath:'id'});});};open.onerror=function(){console.error('can not open database:',open.error.name);};}
return{readonly:function readonly(storeName,callback){getStore('readonly',storeName,callback);},readwrite:function readwrite(storeName,callback){getStore('readwrite',storeName,callback);}};}());;'use strict';window.addEventListener('load',function(){navigator.mozL10n.once(function(){navigator.mozSetMessageHandler('activity',function(activity){var type=activity.source.data.type;if(type==='ringtone'||(Array.isArray(type)&&type.indexOf('ringtone')!==-1)){pickRingtone(activity);}
else if(type==='wallpaper'||(Array.isArray(type)&&type.indexOf('wallpaper')!==-1)){pickWallpaper(activity);}
else{console.error('unexpected activity request',activity.source.name,JSON.stringify(activity.source.data));}});});});function pickRingtone(activity){var selectedRingtone;var selectedRingtoneID;var player=new Audio();var currentRingtoneName;var numRingtones=0;var container=$('ringtones');var header=$('header');container.hidden=false;$('done').hidden=false;$('title').textContent=_('pick-ringtone');header.addEventListener('action',function(){player.pause();activity.postError('cancelled');});$('done').onclick=function(){player.pause();ForwardLock.getKey(function(secret){ForwardLock.lockBlob(secret,selectedRingtone.blob,{},function(lockedBlob){activity.postResult({blob:lockedBlob,name:selectedRingtone.descriptor.name,id:selectedRingtoneID});});});};getCurrentRingtoneName(function(name){currentRingtoneName=name;enumerateAndBuildUI();});function getCurrentRingtoneName(callback){navigator.mozSettings.createLock().get(RINGTONE_NAME_KEY).onsuccess=function(e){callback(e.target.result[RINGTONE_NAME_KEY]);};}
function enumerateAndBuildUI(){objectStore.readonly('ringtones',function(ringtoneStore){var cursor=ringtoneStore.openCursor();cursor.onsuccess=function(){if(cursor.result){addRingtone(cursor.result.value,'forwardlock:'+cursor.result.key);cursor.result.continue();}
else{if(numRingtones===0){displayError(activity,'no-installed-ringtones');}}};});}
function addRingtone(ringtone,id){numRingtones++;var name=ringtone.descriptor.name;var listItem=document.createElement('li');var radio=document.createElement('gaia-radio');radio.name='ringtone';var label=document.createElement('label');label.textContent=name;radio.appendChild(label);if(name===currentRingtoneName){selectedRingtone=ringtone;selectedRingtoneID=id;radio.checked=true;}
radio.addEventListener('change',function(){if(radio.checked){selectedRingtone=ringtone;selectedRingtoneID=id;play(ringtone);}});listItem.appendChild(radio);container.appendChild(listItem);}
function play(ringtone){if(!ringtone.url){ringtone.url=URL.createObjectURL(ringtone.blob);}
player.src=ringtone.url;player.play();}}
function pickWallpaper(activity){var numWallpapers=0;var template=$('wallpaper-template');var container=$('wallpapers');container.hidden=false;$('title').textContent=_('pick-wallpaper');$('header').addEventListener('action',function(){activity.postError('cancelled');});objectStore.readonly('wallpapers',function(wallpaperStore){var cursor=wallpaperStore.openCursor();cursor.onsuccess=function(){if(cursor.result){addWallpaper(cursor.result.value);numWallpapers++;cursor.result.continue();}
else{if(numWallpapers===0){displayError(activity,'no-installed-wallpaper');}}};});function addWallpaper(wallpaper){var blob=wallpaper.blob;var url=URL.createObjectURL(blob);var wallpaperEl=template.content.cloneNode(true).firstElementChild;container.appendChild(wallpaperEl);wallpaperEl.style.backgroundImage='url('+url+')';wallpaperEl.onclick=function(){ForwardLock.getKey(function(secret){ForwardLock.lockBlob(secret,blob,{},function(lockedBlob){activity.postResult({blob:lockedBlob});});});};}}
function displayError(activity,id){setTimeout(function(){alert(_(id));activity.postError(id);});}