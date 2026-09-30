;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
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
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});;;!function(t){"use strict";t.ComponentUtils={style:function(t){var e=document.createElement("style"),i=t+"style.css",s=this;e.setAttribute("scoped",""),e.innerHTML="@import url("+i+");",this.appendChild(e),this.style.visibility="hidden",e.addEventListener("load",function(){s.shadowRoot&&s.shadowRoot.appendChild(e.cloneNode(!0)),s.style.visibility=""})}}}(window);;window.GaiaSwitch=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaSwitchBaseurl||'/shared/elements/gaia_switch/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);this._input=this._template.querySelector('input[type="checkbox"]');var checked=this.getAttribute('checked');if(checked!==null){this._input.checked=true;}
var wrapper=this._template.getElementById('switch');wrapper.addEventListener('click',this.handleClick.bind(this));shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);var dirObserver=new MutationObserver(this.updateInternalDir.bind(this));dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});this.updateInternalDir();};proto.updateInternalDir=function(){var internal=this.shadowRoot.firstElementChild;if(document.documentElement.dir==='rtl'){internal.setAttribute('dir','rtl');}else{internal.removeAttribute('dir');}};proto.handleClick=function(e){if(e&&e.target.tagName==='A'){return;}
e&&e.preventDefault();e&&e.stopImmediatePropagation();var event=new MouseEvent('click',{view:window,bubbles:true,cancelable:true});this.dispatchEvent(event);if(!event.defaultPrevented){this.checked=!this.checked;}
this.dispatchEvent(new CustomEvent('change',{bubbles:true,cancelable:false}));};proto.click=function(){this.handleClick();};Object.defineProperty(proto,'checked',{get:function(){return this._input.checked;},set:function(value){this._input.checked=value;}});Object.defineProperty(proto,'disabled',{get:function(){return this.hasAttribute('disabled');},set:function(value){if(value){this.setAttribute('disabled',true);}else{this.removeAttribute('disabled');}}});Object.defineProperty(proto,'name',{get:function(){return this.getAttribute('name');},set:function(value){this.setAttribute('name',value);}});Object.defineProperty(proto,'type',{get:function(){return'gaia-switch';}});var template=document.createElement('template');template.innerHTML=`<span id="switch">
      <input type="checkbox">
      <span><content select="label"></content></span>
      <div class="details"><content select="details"></content></div>
      <content select="a"></content>
    </span>`;return document.registerElement('gaia-switch',{prototype:proto});})(window);;window.GaiaMenu=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaMenuBaseurl||'/shared/elements/gaia_menu/';proto.createdCallback=function(){var shadow=this.createShadowRoot();this._template=template.content.cloneNode(true);var cancelButton=this._template.querySelector('.gaia-menu-cancel button');cancelButton.addEventListener('click',function(){this.hide();this.dispatchEvent(new CustomEvent('gaiamenu-cancel'));}.bind(this));shadow.appendChild(this._template);ComponentUtils.style.call(this,baseurl);document.l10n.ready.then(this.localize.bind(this));document.addEventListener('DOMRetranslated',this.localize.bind(this));};proto.localize=function(){document.l10n.formatValue('gaia-menu-cancel').then(value=>{this.shadowRoot.querySelector('button').textContent=value;});};proto.show=function(){this.removeAttribute('hidden');};proto.hide=function(){this.setAttribute('hidden','hidden');};var template=document.createElement('template');template.innerHTML=`<form role="dialog" data-type="action">
      <content select="header"></content>
      <menu>
        <content select="button"></content>
        <span class="gaia-menu-cancel">
          <button>Cancel</button>
        </span>
      </menu>
    </form>`;return document.registerElement('gaia-menu',{prototype:proto});})(window);;navigator.mozL10n.once(function(){function e(e){l.checked=e}function t(){if(c.enabled){var e=c.getDefaultAdapter();e.onsuccess=function(){return d=e.result,null==d?void o.createLock().set({"bluetooth.enabled":!1}):(d.ondevicefound=v.onDeviceFound,u.initWithAdapter(),void v.initWithAdapter())},e.onerror=function(){o.createLock().set({"bluetooth.enabled":!1})}}}var n={HFP:4382,A2DP:4365},i=navigator.mozL10n.get,o=(navigator.mozL10n,navigator.mozSettings),c=navigator.mozBluetooth,d=null;const r="bluetooth.device.connected";var a=20;if(o&&c){var s=document.querySelector("gaia-header");s.addEventListener("action",function(){window.close()});var l=document.querySelector(".bluetooth-status gaia-switch");l.addEventListener("change",function(){console.log("GOT CHANGE EVENT!, setting disabled");var e=o.createLock().set({"bluetooth.enabled":this.checked});l.setAttribute("disabled",!0),e.onerror=function(){l.removeAttribute("disabled")}});var u=function(){function e(e){var t=d.setName(e);t.onsuccess=function(){E=l.textContent=d.name}}function t(e){if(v.hidden=!e,e){s.hidden=!1;var t=o.createLock().get("bluetooth.visible");t.onsuccess=function(){var e=t.result["bluetooth.visible"];"undefined"==typeof e&&(e=!0),r(e)},t.onerror=function(){u.checked=!0}}else s.hidden=!0,f.disabled=!0,g&&(clearTimeout(g),g=null)}function n(){u.checked=d.discoverable,r(u.checked),setTimeout(function(){E=l.textContent=d.name,f.disabled=!1},1e3)}function r(e){c.enabled&&d&&(o.createLock().set({"bluetooth.visible":e}),d.setDiscoverable(e),e?g||(g=setTimeout(function(){r(!1)},y)):g&&(clearTimeout(g),g=null),u.checked=e)}var s=document.querySelector(".device-visible"),l=document.querySelector(".bluetooth-device-name"),u=document.querySelector(".device-visible gaia-switch"),v=document.getElementById("bluetooth-rename"),f=document.getElementById("rename-device"),h=document.getElementById("update-device-name"),m=document.getElementById("update-device-name-input"),p=document.getElementById("update-device-name-cancel"),b=document.getElementById("update-device-name-confirm"),g=null,y=12e4,E="";return u.addEventListener("change",function(){r(u.checked)}),f.onclick=function(){""===E&&(E=l.textContent=d.name),m.value=E,h.hidden=!1,m.focus();var e=m.value.length;m.setSelectionRange(0,e)},p.onclick=function(e){e&&e.preventDefault(),h.hidden=!0},b.onclick=function(t){t&&t.preventDefault();var n=m.value;if(n=n.replace(/^\s+|\s+$/g,""),n.length>a){var r=window.confirm(i("bluetooth-name-maxlength-alert",{length:a}));return void(r||(h.hidden=!0))}if(n===E||!c.enabled||!d)return void(h.hidden=!0);if(""!==n)e(n);else{var s=o.createLock().get("deviceinfo.product_model");s.onsuccess=function(){var t=s.result["deviceinfo.product_model"];e(t)}}h.hidden=!0},{update:t,initWithAdapter:n}}(),v=function(){function e(e,t){var n=document.createElement("span");""!==e.name?n.textContent=e.name:n.setAttribute("data-l10n-id","unnamed-device");var i=document.createElement("small");t&&i.setAttribute("data-l10n-id",t);var o=document.createElement("a");o.appendChild(n),o.appendChild(i);var c=document.createElement("li");return c.classList.add("bluetooth-device"),c.classList.add("bluetooth-type-"+e.icon),c.appendChild(o),c}function t(e){x.hidden=!e,e?(C.hidden=!0,O.show(!0),k.hidden=!1,document.addEventListener("visibilitychange",y)):(O.show(!1),D.show(!1),C.hidden=!1,k.hidden=!0,S.close(),w=null,L=null,P=null,clearTimeout(I),I=null,document.removeEventListener("visibilitychange",y))}function a(){d.onpairedstatuschanged=function(e){dispatchEvent(new CustomEvent("bluetooth-pairedstatuschanged")),f(e.status,"Authentication Failed")},d.ondiscoverystatechanged=function(e){e.discovering?(A.disabled=!0,k.hidden=!1):(A.disabled=!1,k.hidden=!0,clearTimeout(I),I=null)},d.onhfpstatuschanged=function(e){b(e.address,e.status,n.HFP)},d.ona2dpstatuschanged=function(e){b(e.address,e.status,n.A2DP)},l(function(){for(var e in D.index){var t=D.index[e];if(Object.keys(t.connectedProfiles).length>0)return}s()}),g()}function s(){var e=o.createLock().get(r);e.onsuccess=function(){var t=e.result[r];if(t&&D.index[t]){var n=D.index[t].device;p(n)}}}function l(t){if(c.enabled&&d){var n=d.getPairedDevices();n.onsuccess=function(){var i=n.result.slice(),o=i.length;if(0==o)return void D.show(!1);D.clear(),i.sort(function(e,t){return e.name>t.name});for(var c=0;o>c;c++)!function(t){var n=e(t,"");if(n.onclick=function(){S.show(t)},D.list.appendChild(n),D.index[t.address]={device:t,item:n,connectedProfiles:{}},t.address===L&&"audio-card"===t.icon){var i=n.querySelector("small");i.setAttribute("data-l10n-id","device-status-connecting"),setTimeout(function(){p(t)},5e3)}}(i[c]);u(function(e){e.length>0&&e.forEach(function(e){var t=e.device,n=e.connectedProfiles;for(var i in n)b(t.address,!0,i)}),D.show(!0),t&&t()})}}}function u(e){if(e){if(!d)return void e([]);var t=function(e,t){if(t){var n=d.getConnectedDevices(e);n.onsuccess=function(){t(n.result||[])},n.onerror=function(){t(null)}}},i={},o=function(e,t){t&&t.forEach(function(t){var n=i[t.address];n?n.connectedProfiles[e]=!0:(n={device:t,connectedProfiles:{}},n.connectedProfiles[e]=!0),i[t.address]=n})};t(n.HFP,function(c){o(n.HFP,c),t(n.A2DP,function(t){o(n.A2DP,t);var c=[];for(var d in i){var r=i[d];c.push(r)}e(c)})})}}function v(t){var n=t.device,i=O.index[n.address]||D.index[n.address];if(i){var o=i.item;if(n.name&&o){var c=o.querySelector("a > span");c&&(c.removeAttribute("data-l10n-id"),c.textContent=n.name)}}else{var r=e(n,"device-status-tap-connect");r.onclick=function(){if(!w){var e=r.querySelector("small");e.setAttribute("data-l10n-id","device-status-pairing"),this.setAttribute("aria-disabled",!0),E();var t=d.pair(n.address);w=n.address,t.onerror=function(e){f(!1,t.error.name)}}},O.list.appendChild(r),O.index[n.address]={device:n,item:r,connectedProfiles:{}}}}function f(e,t){if(!w)return void l();var n=w;if(w=null,e){if(O.index[n]){var o=(O.index[n].device,O.index[n].item);O.list.removeChild(o),delete O.index[n],L=n}}else{var c=i("error-pair-title");if("Repeated Attempts"===t?c=c+"\n"+i("error-pair-toofast"):"Authentication Failed"===t&&(c=c+"\n"+i("error-pair-pincode")),window.alert(c),O.index[n]){var o=O.index[n].item,d=o.querySelector("small");o.removeAttribute("aria-disabled"),d.setAttribute("data-l10n-id","device-status-tap-connect")}}l()}function h(e){if(e.address===P){var t=i("unpair-title")+"\n"+i("unpair-msg");if(!window.confirm(t))return;P=null}var n=d.unpair(e.address);n.onerror=function(){f(!0,null)}}function m(e,t){if(!c.enabled||!d||e.address!==P)return void(t&&t());var n=d.disconnect(e);n.onsuccess=n.onerror=function(){t&&t()}}function p(e){if(!c.enabled||!d||"audio-card"!==e.icon||e.address===P)return void(L=null);var t=function(){var t=function(){L&&(L=null)},n=function(){if(L){var e=D.index[L].item.querySelector("small");e.removeAttribute("data-l10n-id"),e.textContent="",L=null,window.alert(i("error-connect-msg"))}};E();var o=d.connect(e);if(o.onsuccess=t,o.onerror=n,L=e.address,D.index[L]){var c=D.index[L].item.querySelector("small");c.setAttribute("data-l10n-id","device-status-connecting")}};P&&D.index[P]?m(D.index[P].device,t):t()}function b(e,t,i){var c=D.index[e];if(c){c.connectedProfiles[i]=t;var d=!1;if(t)d=!0;else for(var i in c.connectedProfiles)d=d||c.connectedProfiles[i];d?(P=e,o.createLock().set({"bluetooth.device.connected":P})):P===e&&(P=null,o.createLock().set({"bluetooth.device.connected":null}));var r="",a=c.connectedProfiles[n.HFP],s=c.connectedProfiles[n.A2DP];r=a&&s?"device-status-connected-phone-media":a?"device-status-connected-phone":s?"device-status-connected-media":null;var l=D.index[e].item.querySelector("small");r?l.setAttribute("data-l10n-id",r):(l.removeAttribute("data-l10n-id"),l.textContent="")}}function g(){if(c.enabled&&d&&!I&&!document.hidden){var e=d.startDiscovery();e.onsuccess=function(){I||(I=setTimeout(E,B))},e.onerror=function(){console.error("Can not discover nearby device")}}}function y(){document.hidden&&E()}function E(){if(c.enabled&&d&&I){var e=d.stopDiscovery();e.onerror=function(){console.error("Can not stop discover nearby device")},clearTimeout(I),I=null}}var x=document.getElementById("bluetooth-search"),A=document.getElementById("search-device"),k=document.getElementById("bluetooth-searching"),C=document.getElementById("bluetooth-enable-msg"),w=null,L=null,P=null,B=6e4,I=null,D={title:document.getElementById("bluetooth-paired-title"),list:document.getElementById("bluetooth-paired-devices"),index:[],clear:function(){for(;this.list.hasChildNodes();)this.list.removeChild(this.list.lastChild);this.index=[]},show:function(e){e||this.clear(),this.title.hidden=!e,this.list.hidden=!e}},O={title:document.getElementById("bluetooth-found-title"),list:document.getElementById("bluetooth-devices"),index:[],clear:function(){for(;this.list.hasChildNodes();)this.list.removeChild(this.list.lastChild);this.index=[]},show:function(e){e||this.clear(),this.title.hidden=!e,this.list.hidden=!e}},S={menu:document.getElementById("paired-device-option"),connectOpt:document.getElementById("connect-option"),disconnectOpt:document.getElementById("disconnect-option"),unpairOpt:document.getElementById("unpair-option"),confirmDlg:document.getElementById("unpair-device"),unpairCancel:document.getElementById("unpair-device-cancel"),confirmOpt:document.getElementById("confirm-option"),showActions:function(){var e=this;P&&this.device.address===P?(this.connectOpt.style.display="none",this.disconnectOpt.style.display="block",this.disconnectOpt.onclick=function(){m(e.device)}):(this.connectOpt.style.display="block",this.disconnectOpt.style.display="none",this.connectOpt.onclick=function(){p(e.device)}),this.unpairOpt.onclick=function(){h(e.device)},this.menu.addEventListener("gaiamenu-cancel",function(){return e.close()}),this.menu.show()},showConfirm:function(){var e=this;this.unpairCancel.onclick=function(){return e.close()},this.confirmOpt.onclick=function(){return h(e.device),e.close()},this.confirmDlg.hidden=!1},show:function(e){this.device=e,this["audio-card"===this.device.icon?"showActions":"showConfirm"]()},close:function(){return this.menu.hide(),this.confirmDlg.hidden=!0,!1}};return A.onclick=function(){t(!0),O.clear(),g()},{update:t,initWithAdapter:a,startDiscovery:g,onDeviceFound:v}}(),f=!1;o.addObserver("bluetooth.enabled",function(t){var n=t.settingValue;f!=n&&(l.setAttribute("disabled",!0),f=n,e(n),v.update(n),u.update(n),n||(d=null))});var h=o.createLock().get("bluetooth.enabled");h.onsuccess=function(){f=h.result["bluetooth.enabled"],f&&t(),e(f),v.update(f),u.update(f)},c.addEventListener("adapteradded",function(){l.removeAttribute("disabled"),t()}),c.addEventListener("disabled",function(){l.removeAttribute("disabled"),d=null})}});