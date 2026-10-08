
require.config({baseUrl:'/js',paths:{'modules':'modules','panels':'panels','shared':'../shared/js','views':'../views'},waitSeconds:0,shim:{'dsds_settings':{exports:'DsdsSettings'},'settings':{exports:'Settings'},'shared/addons/match_pattern':{exports:'MatchPattern'},'shared/airplane_mode_helper':{exports:'AirplaneModeHelper'},'shared/apn_helper':{exports:'ApnHelper'},'shared/async_storage':{exports:'asyncStorage'},'shared/bluetooth_helper':{exports:'BluetoothHelper'},'shared/device_storage/enumerate_all':{exports:'enumerateAll'},'shared/download/download_formatter':{exports:'DownloadFormatter'},'shared/download/download_store':{exports:'DownloadStore'},'shared/download/download_ui':{exports:'DownloadUI'},'shared/download/download_helper':{exports:'DownloadHelper'},'shared/fxa_iac_client':{exports:'FxAccountsIACHelper'},'shared/homescreens/homescreen_settings':{exports:'homescreenSettings'},'shared/icc_helper':{exports:'IccHelper'},'shared/keyboard_helper':{exports:'KeyboardHelper',deps:['shared/input_mgmt/input_app_list']},'shared/language_list':{exports:'LanguageList'},'shared/lazy_loader':{exports:'LazyLoader'},'shared/manifest_helper':{exports:'ManifestHelper'},'shared/mime_mapper':{exports:'MimeMapper'},'shared/mobile_operator':{exports:'MobileOperator'},'shared/omadrm/fl':{exports:'ForwardLock'},'shared/passcode_helper':{exports:'PasscodeHelper'},'shared/sanitizer':{exports:'Sanitizer'},'shared/screen_layout':{exports:'ScreenLayout'},'shared/search_provider':{exports:'SearchProvider'},'shared/settings_helper':{exports:'SettingsHelper'},'shared/settings_listener':{exports:'SettingsListener'},'shared/settings_url':{exports:'SettingsURL'},'shared/sim_settings_helper':{exports:'SimSettingsHelper'},'shared/simslot':{exports:'SIMSlot'},'shared/simslot_manager':{exports:'SIMSlotManager',deps:['shared/simslot']},'shared/stk_helper':{exports:'STKHelper'},'shared/text_normalizer':{exports:'Normalizer'},'shared/toaster':{exports:'Toaster'},'shared/tz_select':{exports:'tzSelect',deps:['shared/icc_helper']},'shared/uuid':{exports:'uuid'},'shared/findmydevice_iac_api':{exports:'wakeUpFindMyDevice'},'shared/wifi_helper':{exports:'WifiHelper'},'vendor/jszip':{exports:'JSZip'}},modules:[{name:'main'},{name:'modules/apn/apn_settings_manager',exclude:['main','modules/async_storage']},{name:'modules/dialog_service',exclude:['main']},{name:'panels/about/panel',exclude:['main']},{name:'panels/about_more_info/panel',exclude:['main','modules/bluetooth/bluetooth_context']},{name:'panels/app_permissions_detail/panel',exclude:['main']},{name:'panels/app_permissions_list/panel',exclude:['main','modules/apps_cache']},{name:'panels/app_storage/panel',exclude:['main','modules/app_storage','modules/storage_helper']},{name:'views/phone/bluetooth/panel',exclude:['main','modules/mvvm/list_view','modules/dialog_service','modules/bluetooth/bluetooth_context']},{name:'panels/browsing_privacy/panel',exclude:['main','modules/dialog_service']},{name:'panels/call_barring/panel',exclude:['main']},{name:'panels/call_barring_passcode_change/panel',exclude:['main']},{name:'panels/date_time/panel',exclude:['main','modules/date_time']},{name:'panels/developer/panel',exclude:['main','modules/dialog_service','modules/apps_cache']},{name:'panels/developer_hud/panel',exclude:['main']},{name:'panels/display/panel',exclude:['main']},{name:'panels/feedback_choose/panel',exclude:['main']},{name:'panels/feedback_send/panel',exclude:['main']},{name:'panels/findmydevice/panel',exclude:['main','modules/settings_utils']},{name:'panels/firefox_accounts/panel',exclude:['main']},{name:'panels/firefox_sync/panel',exclude:['main','modules/settings_utils']},{name:'panels/frame/panel',exclude:['main']},{name:'panels/help/panel',exclude:['main']},{name:'panels/homescreens/panel',exclude:['main','modules/apps_cache']},{name:'panels/hotspot/panel',exclude:['main','modules/dialog_service']},{name:'panels/hotspot_wifi_settings/panel',exclude:['main']},{name:'panels/keyboard/panel',exclude:['main','modules/mvvm/list_view','modules/keyboard_context']},{name:'panels/keyboard_add_layouts/panel',exclude:['main','modules/mvvm/list_view','modules/keyboard_context','shared/keyboard_helper']},{name:'panels/languages/panel',exclude:['main','shared/keyboard_helper','modules/date_time']},{name:'panels/messaging/panel',exclude:['main','modules/messaging','modules/settings_utils']},{name:'panels/messaging_details/panel',exclude:['main','modules/messaging','modules/settings_utils']},{name:'panels/operator_settings/panel',exclude:['main','dsds_settings','modules/defer','modules/state_model','modules/mvvm/list_view','modules/dialog_service','modules/customized_network_type_map','modules/mobile/supported_network_info']},{name:'panels/root/panel',exclude:['main','panels/root/low_priority_items','modules/apps_cache','modules/addon_manager','modules/storage_helper']},{name:'panels/root/low_priority_items',exclude:['main','modules/app_storage','modules/battery','modules/bluetooth/bluetooth_context','modules/media_storage','modules/sim_security','modules/wifi_context']},{name:'panels/screen_lock/panel',exclude:['main']},{name:'panels/screen_lock_passcode/panel',exclude:['main','modules/settings_utils']},{name:'panels/search/panel',exclude:['main']},{name:'panels/simcard_manager/panel',exclude:['main']},{name:'panels/simpin/panel',exclude:['main','modules/sim_security']},{name:'panels/sound/panel',exclude:['main','modules/mobile/supported_network_info']},{name:'panels/usb_storage/panel',exclude:['main','modules/media_storage']},{name:'panels/wifi/panel',exclude:['main','modules/dialog_service']},{name:'panels/wifi_auth/panel',exclude:['main']},{name:'panels/wifi_enter_certificate_nickname/panel',exclude:['main']},{name:'panels/wifi_join_hidden/panel',exclude:['main']},{name:'panels/wifi_manage_certificates/panel',exclude:['main','modules/settings_utils']},{name:'panels/wifi_manage_networks/panel',exclude:['main','modules/dialog_service']},{name:'panels/wifi_select_certificate_file/panel',exclude:['main','modules/settings_utils']},{name:'panels/wifi_status/panel',exclude:['main']},{name:'panels/wifi_wps/panel',exclude:['main']}]});define("config/require",function(){});define('modules/base/module',[],function(){'use strict';const LOG_LEVEL={NONE:0,DEBUG:1,INFO:2,WARN:3,ERROR:4,ALL:5};var _constructorMap=(function(){var _ctorMap=new Map();var _getConstructor=function(Module){return _ctorMap.get(Module)||function(){};};var _registerConstructor=function(Module,constructor){_ctorMap.set(Module,constructor||function(){});};return{getConstructor:_getConstructor,registerConstructor:_registerConstructor};})();var _emptyFunction=function(){};var _createLogger=function(name){switch(name){case'DEBUG':return function(msg){console.log(this._msgPrefix+msg);};case'INFO':return function(msg){console.info(this._msgPrefix+msg);};case'WARN':return function(msg){console.warn(this._msgPrefix+msg);};case'ERROR':return function(msg){console.error(this._msgPrefix+msg);};}};var ModulePrototype={get _msgPrefix(){return'['+this.$name+']: ';},debug:_emptyFunction,info:_emptyFunction,warn:_emptyFunction,error:_emptyFunction,throw:function(msg){throw new Error(this._msgPrefix+msg);},set _logLevel(value){Object.keys(LOG_LEVEL).forEach((name)=>{var level=LOG_LEVEL[name];if(value>=level&&value>0){this[name.toLowerCase()]=_createLogger(name);}});},super:_constructorMap.getConstructor};var _extend=function(){switch(arguments.length){case 0:break;case 1:var Module=arguments[0];for(var prop in Module.prototype){if(prop==='$name'){continue;}
var pd=Object.getOwnPropertyDescriptor(Module.prototype,prop);if(pd){Object.defineProperty(this.prototype,prop,pd);}}
break;default:Array.prototype.forEach.call(arguments,(Module)=>{_extend.call(this,Module);});break;}
return this;};function _create(constructor){if(constructor&&typeof constructor!=='function'){throw new Error('[Module]: Invalid constructor');}
var ModuleFunc=function(){};ModuleFunc.prototype=Object.create(ModulePrototype);ModuleFunc.prototype.$name=constructor&&constructor.name||'';var Module=function(){var instance=new ModuleFunc();if(constructor){constructor.apply(instance,arguments);}
return instance;};_constructorMap.registerConstructor(Module,constructor);Module.extend=_extend;Module.prototype=ModuleFunc.prototype;return Module;}
return{LOG_LEVEL:LOG_LEVEL,create:_create};});define('modules/base/dependency_graph',['require','modules/base/module'],function(require){'use strict';var Module=require('modules/base/module');var DependencyGraph=Module.create(function DependencyGraph(dpGraph){this._nodes=dpGraph?JSON.parse(JSON.stringify(dpGraph._nodes)):{};});DependencyGraph.prototype._printNodes=function dg_printNodes(){Object.keys(this._nodes).forEach((name)=>{var node=this._nodes[name];console.log('name: '+name);console.log('children: '+
node.children.reduce((result,name)=>{return result+' '+name;},''));console.log('dependent nodes: '+
node.dependentNodes.reduce((result,name)=>{return result+' '+name;},''));console.log('======================');});};DependencyGraph.prototype._addDependentNodes=function dg_addDependentNodes(node,dependentNodes,traversedNodes){traversedNodes=traversedNodes||[];if(traversedNodes.indexOf(node.name)>=0){traversedNodes.push(node.name);var error=traversedNodes.join(' -> ');this.throw('circular dependency detected! '+error);}
if(dependentNodes){dependentNodes.forEach((name)=>{if(node.dependentNodes.indexOf(name)<0){node.dependentNodes.push(name);}});}else{dependentNodes=Array.prototype.slice.call(node.dependentNodes);}
dependentNodes.push(node.name);traversedNodes.push(node.name);node.children.forEach((name)=>{this._addDependentNodes(this._nodes[name],dependentNodes,traversedNodes);});dependentNodes.pop();traversedNodes.pop();};DependencyGraph.prototype.addDependency=function dg_addDep(name1,name2){var node1=this._nodes[name1];var node2=this._nodes[name2];if(!node1){node1=this._nodes[name1]={name:name1,children:[],dependentNodes:[]};}
if(!node2){node2=this._nodes[name2]={name:name2,children:[],dependentNodes:[]};}
if(node1.children.indexOf(name2)<0){node1.children.push(name2);this._addDependentNodes(node1);}};DependencyGraph.prototype.getAllDependent=function dg_getAllDep(name){var node=this._nodes[name];return node&&node.dependentNodes;};return DependencyGraph;});define('modules/mvvm/observable',['require','modules/base/module','modules/base/dependency_graph'],function(require){'use strict';var Module=require('modules/base/module');var DependencyGraph=require('modules/base/dependency_graph');var OP_PREFIX=(name)=>{return'$OP_'+name;};var Observable=Module.create(function Observable(object){this._observers={};if(object){this._initWithObject(object);}});Observable.prototype._initWithObject=function o_init(object){for(var name in object){if(typeof object[name]==='function'){this[name]=object[name];}else{_defineObservableProperty(this,name,{value:object[name]});}}};Observable.prototype._notify=function o__notify(name,newValue,oldValue){var observers=this._observers[name];if(observers){observers.forEach(function(observer){observer(newValue,oldValue);});}};Observable.prototype._removeObserver=function o__removeObserver(observer,name){var observers=this._observers[name];if(observers){var index=observers.indexOf(observer);if(index>=0){observers.splice(index,1);}}};Observable.prototype.observe=function o_observe(name,observer){if(typeof observer!=='function'){return;}
(this._observers[name]=this._observers[name]||[]).push(observer);};Observable.prototype.unobserve=function o_unobserve(name,observer){if(typeof name==='function'){Object.keys(this._observers).forEach(this._removeObserver.bind(this,name));}else{if(observer){this._removeObserver(observer,name);}else if(name in this._observers){this._observers[name]=[];}}};var _dependencyGraphs=new Map();function _getDependencyGraph(modulePrototype){var dependencyGraph=_dependencyGraphs.get(modulePrototype);if(!dependencyGraph){dependencyGraph=DependencyGraph(modulePrototype._dependencyGraph);modulePrototype._dependencyGraph=dependencyGraph;_dependencyGraphs.set(modulePrototype,dependencyGraph);}
return dependencyGraph;}
function _getAllDependentValues(observable,sourceProperty){var dependentList=observable._dependencyGraph&&observable._dependencyGraph.getAllDependent(sourceProperty);if(dependentList&&dependentList.length){return dependentList.map((name)=>{return{name:name,value:observable[name]};});}else{return null;}}
function _getterTemplate(name,defaultValue){return function(){var value=this[OP_PREFIX(name)];if(typeof value==='undefined'){value=this[OP_PREFIX(name)]=defaultValue;}
return value;};}
function _setterTemplate(name){return function(value){var oldValue=this[name];if(oldValue!==value){var dependentValues=_getAllDependentValues(this,name);this[OP_PREFIX(name)]=value;this._notify(name,value,oldValue);if(dependentValues){dependentValues.forEach((obj)=>{this._notify(obj.name,this[obj.name],obj.value);});}}};}
function _defineObservablePropertyCore(object,name,options){var dependency=options&&options.dependency;if(dependency){var dependencyGraph=_getDependencyGraph(object);dependency.forEach((dependentName)=>{dependencyGraph.addDependency(name,dependentName);});}
Object.defineProperty(object,name,{enumerable:true,get:options.get,set:options.set});}
function _defineObservableProperty(object,name,options){if(options&&options.readonly){var internalName='_'+name;_defineObservablePropertyCore(object,name,{dependency:[internalName],get:function(){return this[internalName];}});_defineObservablePropertyCore(object,internalName,{get:_getterTemplate(internalName,options&&options.value),set:_setterTemplate(internalName)});}else if(options&&options.dependency&&options.dependency.length){if(typeof options.get!=='function'){throw new Error('Observable: getter of '+name+' is invalid');}
_defineObservablePropertyCore(object,name,{dependency:options.dependency,get:options.get});}else{_defineObservablePropertyCore(object,name,{get:_getterTemplate(name,options&&options.value),set:_setterTemplate(name)});}}
Object.defineProperty(Observable,'defineObservableProperty',{get:function(){return _defineObservableProperty;}});return Observable;});define('modules/base/event_emitter',['require','modules/base/module'],function(require){'use strict';var Module=require('modules/base/module');var EventEmitter=Module.create(function EventEmitter(eventNames){if(eventNames&&eventNames.length){this._eventListeners=eventNames.reduce((result,eventName)=>{result[eventName]=[];return result;},{});}else{this.throw('no valid registered events');}});EventEmitter.prototype._emitEvent=function(eventName,value){var listeners=this._eventListeners[eventName];if(!listeners){this.throw('invalid event name: '+eventName);}
this.debug('_emitEvent:'+eventName+' '+value);var eventObj={type:eventName,detail:value};listeners.forEach((listener)=>{listener.call(this,eventObj);});};EventEmitter.prototype.addEventListener=function(eventName,listener){var listeners=this._eventListeners[eventName];if(listener&&listeners){switch(typeof listener){case'function':break;case'object':if(typeof listener.handleEvent==='function'){listener=listener.handleEvent;}else{listener=null;}
break;default:listener=null;break;}
if(listener&&listeners.indexOf(listener)<0){listeners.push(listener);}}else{this.error('addEventListener: invalid listener for '+eventName);}};EventEmitter.prototype.removeEventListener=function(eventName,listener){var listeners=this._eventListeners[eventName];if(listener&&listeners){var index=-1;var type=typeof listener;switch(type){case'function':index=listeners.indexOf(listener);break;case'object':index=listeners.indexOf(listener.handleEvent);break;}
if(index>=0){listeners.splice(index,1);}}else{this.error('removeEventListener: invalid listener for '+eventName);}};return EventEmitter;});define('modules/mvvm/observable_array',['require','modules/base/module','modules/base/event_emitter','modules/mvvm/observable'],function(require){'use strict';var Module=require('modules/base/module');var EventEmitter=require('modules/base/event_emitter');var Observable=require('modules/mvvm/observable');var Events=['insert','remove','replace','reset'];var ReadOnlyMethods=['forEach','map','every','some','indexOf','lastIndexOf','reduce','reduceRight'];var ObservableArray=Module.create(function ObservableArray(array){this.super(Observable).call(this);this.super(EventEmitter).call(this,Events);this._array=array||[];this._length=this._array.length;}).extend(Observable,EventEmitter);Observable.defineObservableProperty(ObservableArray.prototype,'length',{readonly:true});Observable.defineObservableProperty(ObservableArray.prototype,'array',{readonly:true});ReadOnlyMethods.forEach(function(op){ObservableArray.prototype[op]=function(){return this._array[op].apply(this._array,arguments);};});ObservableArray.prototype.push=function(item){this._array.push(item);this._length=this._array.length;this._emitEvent('insert',{index:this._array.length-1,count:1,items:[item]});};ObservableArray.prototype.pop=function(){if(!this._array.length){return null;}
var item=this._array.pop();this._length=this._array.length;this._emitEvent('remove',{index:this._array.length,count:1,items:[item]});return item;};ObservableArray.prototype.splice=function(index,count){if(arguments.length<2){return[];}
if(index>=this._length){index=this._length-1;}else if(index<0){index=this._length+index;}
if(count<0){count=0;}
var addedItems=Array.prototype.slice.call(arguments,2);var removedItems=this._array.splice.apply(this._array,arguments);this._length=this._array.length;if(removedItems.length){this._emitEvent('remove',{index:index,count:count,items:removedItems});}
if(addedItems.length){this._emitEvent('insert',{index:index,count:addedItems.length,items:addedItems});}
return removedItems;};ObservableArray.prototype.set=function(index,value){if(index<0||index>=this._array.length){this.throw('set: out of range');}
var oldValue=this._array[index];this._array[index]=value;this._emitEvent('replace',{index:index,oldValue:oldValue,newValue:value});};ObservableArray.prototype.get=function(index){return this._array[index];};ObservableArray.prototype.reset=function(array){this._array=array||[];this._length=this._array.length;this._emitEvent('reset',{items:this._array});};return ObservableArray;});/**
 * PageTransitions provides transition functions used when navigating panels.
 *
 * @module PageTransitions
 */
define('modules/page_transitions',[],function() {
  'use strict';

  var _sendPanelReady = function _send_panel_ready(oldPanelHash, newPanelHash) {
    var detail = {
      previous: oldPanelHash,
      current: newPanelHash
    };
    var event = new CustomEvent('panelready', {detail: detail});
    window.dispatchEvent(event);
  };

  return {
    /**
     * Typically used with phone size device layouts.
     *
     * @alias module:PageTransitions#oneColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    oneColumn: function pt_one_column(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      // switch previous/current classes
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
      }
      if (newPanel.className === 'current') {
        _sendPanelReady(oldPanel && '#' + oldPanel.id, '#' + newPanel.id);

        if (callback) {
          callback();
        }
        return;
      }

      // A hidden or newly inserted panel may not animate. Complete navigation
      // in that case too, otherwise its onShow hook never runs.
      var completed = false;
      var fallback;
      function paintWait(event) {
        if (event && event.target !== newPanel) {
          return;
        }
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(fallback);
        newPanel.removeEventListener('transitionend', paintWait);
        newPanel.removeEventListener('transitioncancel', paintWait);
        _sendPanelReady(oldPanel && '#' + oldPanel.id, '#' + newPanel.id);
        if (callback) {
          callback();
        }
      }
      newPanel.addEventListener('transitionend', paintWait);
      newPanel.addEventListener('transitioncancel', paintWait);
      newPanel.className = 'current';
      var style = window.getComputedStyle(newPanel);
      var seconds = function(value) {
        return parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000) || 0;
      };
      var durations = style.transitionDuration.split(',').map(seconds);
      var delays = style.transitionDelay.split(',').map(seconds);
      var duration = Math.max.apply(Math, durations.map(function(value, index) {
        return value + delays[index % delays.length];
      }));
      fallback = setTimeout(paintWait, Math.max(0, duration) + 100);

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }

    },

    /**
     * Typically used with tablet size device layouts.
     *
     * @alias module:PageTransitions#twoColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    twoColumn: function pt_two_column(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
        newPanel.className = 'current';
        _sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);
      } else {
        newPanel.className = 'current';
        _sendPanelReady(null, '#' + newPanel.id);
      }

      if (callback) {
        callback();
      }
    }
  };
});

define('modules/panel',[],function(){'use strict';var _emptyFunc=function panel_emptyFunc(){};var Panel=function ctor_panel(options){var _initialized=false;options=options||{};options.onInit=options.onInit||_emptyFunc;options.onUninit=options.onUninit||_emptyFunc;options.onShow=options.onShow||_emptyFunc;options.onHide=options.onHide||_emptyFunc;options.onBeforeShow=options.onBeforeShow||_emptyFunc;options.onBeforeHide=options.onBeforeHide||_emptyFunc;return{get initialized(){return _initialized;},init:function(panel,initOptions){if(_initialized){return;}
_initialized=true;return options.onInit(panel,initOptions);},uninit:function(){if(!_initialized){return;}
_initialized=false;options.onUninit();},show:function(panel,showOptions){return Promise.resolve(this.init(panel,showOptions)).then(function(){return options.onShow(panel,showOptions);});},hide:function(){return options.onHide();},beforeShow:function(panel,beforeShowOptions){return Promise.resolve(this.init(panel,beforeShowOptions)).then(function(){return options.onBeforeShow(panel,beforeShowOptions);});},beforeHide:function(){return options.onBeforeHide();}};};return Panel;});define('modules/settings_cache',[],function(){'use strict';var _settings=window.navigator.mozSettings;var _settingsCache=null;var _settingsCacheRequestSent=null;var _pendingSettingsCallbacks=[];var _callbacks=[];var _onSettingsChange=function sc_onSettingsChange(event){var key=event.settingName;var value=event.settingValue;if(_settingsCache){_settingsCache[key]=value;}
_callbacks.forEach(function(callback){callback(event);});};if(_settings){_settings.onsettingchange=_onSettingsChange;}
var SettingsCache={reset:function sc_reset(){_settings=window.navigator.mozSettings;if(_settings){_settings.onsettingchange=_onSettingsChange;}
_settingsCache=null;_settingsCacheRequestSent=null;_pendingSettingsCallbacks=[];_callbacks=[];},get cache(){return _settingsCache;},getSettings:function sc_getSettings(callback){if(!_settings){return;}
if(_settingsCache&&callback){callback(_settingsCache);return;}
if(!_settingsCacheRequestSent&&!_settingsCache){_settingsCacheRequestSent=true;var lock=_settings.createLock();var request=lock.get('*');request.onsuccess=function(e){var result=request.result;var cachedResult={};for(var attr in result){cachedResult[attr]=result[attr];}
_settingsCache=cachedResult;var cbk;while((cbk=_pendingSettingsCallbacks.pop())){cbk(result);}};}
if(callback){_pendingSettingsCallbacks.push(callback);}},addEventListener:function sc_addEventListener(eventName,callback){if(eventName!=='settingsChange'){return;}
var index=_callbacks.indexOf(callback);if(index===-1){_callbacks.push(callback);}},removeEventListener:function sc_removeEventListsner(eventName,callback){if(eventName!=='settingsChange'){return;}
var index=_callbacks.indexOf(callback);if(index!==-1){_callbacks.splice(index,1);}}};SettingsCache.getSettings(null);return SettingsCache;});define('modules/panel_utils',['require','settings','modules/settings_cache','shared/lazy_loader'],function(require){'use strict';var Settings=require('settings');var SettingsCache=require('modules/settings_cache');var LazyLoader=require('shared/lazy_loader');var _settings=navigator.mozSettings;function openDialog(dialogID,onSubmit,onReset){if('#'+dialogID===Settings.currentPanel){return;}
var origin=Settings.currentPanel;Settings.currentPanel=dialogID;var dialog=document.getElementById(dialogID);var submit=dialog.querySelector('[type=submit]');if(submit){submit.onclick=function onsubmit(){if(typeof onSubmit==='function'){(onSubmit.bind(dialog))();}
Settings.currentPanel=origin;};}
var reset=dialog.querySelector('[type=reset]');if(reset){reset.onclick=function onreset(){if(typeof onReset==='function'){(onReset.bind(dialog))();}
Settings.currentPanel=origin;};}}
function openLink(url){if(url.startsWith('tel:')){var telActivity=new window.MozActivity({name:'dial',data:{type:'webtelephony/number',number:url.substr(4)}});telActivity.onsuccess=function(){};}else if(!url.startsWith('#')){var linkActivity=new window.MozActivity({name:'view',data:{type:'url',url:url}});linkActivity.onsuccess=function(){};}}
var _openDialog=function pu_openDialog(dialogID){var dialog=document.getElementById(dialogID);var fields=Array.prototype.slice.call(dialog.querySelectorAll('[data-setting]:not([data-ignore])'));var updateInput=function(lock,input){var key=input.dataset.setting;var request=lock.get(key);request.onsuccess=function(){switch(input.type){case'gaia-radio':input.checked=(input.value==request.result[key]);break;case'checkbox':case'gaia-checkbox':input.checked=request.result[key]||false;break;case'select-one':input.value=request.result[key]||'';break;default:input.value=request.result[key]||'';break;}};};function reset(){if(_settings){var lock=_settings.createLock();fields.forEach(updateInput.bind(null,lock));}}
function submit(){if(_settings){fields=Array.prototype.slice.call(dialog.querySelectorAll('[data-setting]:not([data-ignore])'));var cset={},key;var lock=_settings.createLock();fields.forEach(function(input){key=input.dataset.setting;switch(input.type){case'gaia-radio':if(input.checked){cset[key]=input.value;}
break;case'checkbox':case'gaia-checkbox':cset[key]=input.checked;break;default:cset[key]=input.value;break;}});lock.set(cset);}}
reset();openDialog(dialogID,submit);};return{activate:function pu_activate(panel){var scripts=panel.getElementsByTagName('script');var scripts_src=Array.prototype.map.call(scripts,function(script){return script.getAttribute('src');});LazyLoader.load(scripts_src);var _onclick=function(evt){if(!this.dataset.href){this.dataset.href=this.href;this.href='#';}
var href=this.dataset.href;if(!href.startsWith('#')){evt.target.blur();openLink(href);}else if(!href.endsWith('Settings')){openDialog(href.substr(1));}else{_openDialog(href.substr(1));}
return false;};var rule='a[href^="http"], a[href^="tel"], [data-href]';var links=panel.querySelectorAll(rule);var i,count;for(i=0,count=links.length;i<count;i++){if(links[i].tagName!=='GAIA-HEADER'){links[i].addEventListener('click',_onclick);}}
var backHeader=panel.querySelector('gaia-header[action="back"]');var href=backHeader&&backHeader.dataset.href;if(backHeader&&href){backHeader.addEventListener('action',function(){Settings.currentPanel=this.dataset.href;});}},preset:function pu_preset(panel){SettingsCache.getSettings(function(result){panel=panel||document;var rule='input[type="checkbox"]:not([data-ignore]), gaia-switch, '+'gaia-checkbox';var checkboxes=panel.querySelectorAll(rule);var i,count,key;for(i=0,count=checkboxes.length;i<count;i++){key=checkboxes[i].name;if(key&&result[key]!==undefined){checkboxes[i].checked=!!result[key];}}
setTimeout(function(){for(i=0,count=checkboxes.length;i<count;i++){if(checkboxes[i].classList.contains('initial')){checkboxes[i].classList.remove('initial');}}},0);rule='gaia-radio:not([data-ignore])';var radios=panel.querySelectorAll(rule);for(i=0,count=radios.length;i<count;i++){key=radios[i].name;if(key&&result[key]!==undefined){radios[i].checked=(result[key]===radios[i].value);}}
rule='input[type="text"]:not([data-ignore])';var texts=panel.querySelectorAll(rule);for(i=0,count=texts.length;i<count;i++){key=texts[i].name;if(key&&result[key]!==undefined){texts[i].value=result[key];}}
rule='input[type="range"]:not([data-ignore])';var ranges=panel.querySelectorAll(rule);for(i=0,count=ranges.length;i<count;i++){key=ranges[i].name;if(key&&result[key]!==undefined){ranges[i].value=parseFloat(result[key]);}}
var selects=panel.querySelectorAll('select');for(i=0,count=selects.length;i<count;i++){var select=selects[i];key=select.name;if(key&&result[key]!==undefined){var value=result[key];var option='option[value="'+value+'"]';var selectOption=select.querySelector(option);if(selectOption){selectOption.selected=true;}}}
rule='[data-name]:not([data-ignore])';var spanFields=panel.querySelectorAll(rule);for(i=0,count=spanFields.length;i<count;i++){key=spanFields[i].dataset.name;if(key&&result[key]&&result[key]!='undefined'){rule='[data-setting="'+key+'"] '+'[value="'+result[key]+'"]';var option_span=document.querySelector(rule);if(option_span){spanFields[i].setAttribute('data-l10n-id',option_span.getAttribute('data-l10n-id'));}else{spanFields[i].removeAttribute('data-l10n-id');spanFields[i].textContent=result[key];}}else{switch(key){case'deviceinfo.software':document.l10n.setAttributes(spanFields[i],'deviceInfo_software',{os:result['deviceinfo.os']});break;case'deviceinfo.firmware_revision':spanFields[i].parentNode.hidden=true;break;case'deviceinfo.mac':spanFields[i].setAttribute('data-l10n-id','macUnavailable');break;}}}
rule='[data-show-name]:not([data-ignore])';var hiddenItems=panel.querySelectorAll(rule);for(i=0;i<hiddenItems.length;i++){key=hiddenItems[i].dataset.showName;hiddenItems[i].hidden=!result[key];}});},onLinkClick:function pu_onLinkClick(event){var target=event.target;var href;if(target.classList.contains('icon-back')){href=target.parentNode.getAttribute('href');}else{var nodeName=target.nodeName.toLowerCase();if(nodeName!='a'){return;}
href=target.getAttribute('href');}
if(!href||!href.startsWith('#')||href==='#'){return;}
Settings.currentPanel=href;event.preventDefault();},onSettingsChange:function pu_onSettingsChange(panel,event){var key=event.settingName;var value=event.settingValue;var i,count;var rule='[data-name="'+key+'"]:not([data-ignore])';var spanField=panel.querySelector(rule);if(spanField){var options=panel.querySelector('select[data-setting="'+key+'"]');if(options){for(i=0,count=options.length;i<count;i++){if(options[i]&&options[i].value===value){spanField.dataset.l10nId=options[i].dataset.l10nId;spanField.textContent=options[i].textContent;}}}else{spanField.textContent=value;}}
rule='[data-show-name="'+key+'"]:not([data-ignore])';var items=document.querySelectorAll(rule);for(i=0;i<items.length;i++){items[i].hidden=!value;}
var inputs=[].slice.call(panel.querySelectorAll(`input[name="${key}"],
        gaia-switch[name="${key}"],
        gaia-checkbox[name="${key}"],
        gaia-radio[name="${key}"]`));if(!inputs.length){return;}
inputs.forEach((input)=>{switch(input.type){case'gaia-switch':case'gaia-checkbox':case'checkbox':case'switch':value=!!value;if(input.checked===value){return;}
input.checked=value;break;case'range':if(input.value===value){return;}
input.value=value;break;case'select':for(i=0,count=input.options.length;i<count;i++){if(input.options[i].value===value){input.options[i].selected=true;break;}}
break;case'gaia-radio':input.checked=(input.value===value);break;}});},onInputChange:function pu_onInputChange(event){var input=event.target;var type=input.type||input.nodeName.toLowerCase();var key=input.name;if(!key||!_settings||event.type!='change'){return;}
if(input.dataset.setting){return;}
var value;switch(type){case'gaia-switch':case'gaia-checkbox':case'checkbox':case'switch':value=input.checked;break;case'range':value=parseFloat(parseFloat(input.value).toFixed(1));break;case'select-one':case'gaia-radio':case'text':case'password':value=input.value;if(input.dataset.valueType==='integer'){value=parseInt(value);}
break;}
var cset={};cset[key]=value;_settings.createLock().set(cset);}};});define('modules/settings_panel',['require','modules/panel','modules/settings_cache','modules/panel_utils'],function(require){'use strict';var Panel=require('modules/panel');var SettingsCache=require('modules/settings_cache');var PanelUtils=require('modules/panel_utils');var _emptyFunc=function panel_emptyFunc(){};var SettingsPanel=function ctor_SettingsPanel(options){var _panel=null;var _settingsChangeHandler=function(event){PanelUtils.onSettingsChange(_panel,event);};var _addListeners=function panel_addListeners(panel){if(!panel){return;}
SettingsCache.addEventListener('settingsChange',_settingsChangeHandler);panel.addEventListener('change',PanelUtils.onInputChange);panel.addEventListener('click',PanelUtils.onLinkClick);};var _removeListeners=function panel_removeListeners(panel){if(!panel){return;}
SettingsCache.removeEventListener('settingsChange',_settingsChangeHandler);panel.removeEventListener('change',PanelUtils.onInputChange);panel.removeEventListener('click',PanelUtils.onLinkClick);};options=options||{};options.onInit=options.onInit||_emptyFunc;options.onUninit=options.onUninit||_emptyFunc;options.onShow=options.onShow||_emptyFunc;options.onHide=options.onHide||_emptyFunc;options.onBeforeShow=options.onBeforeShow||_emptyFunc;options.onBeforeHide=options.onBeforeHide||_emptyFunc;return Panel({onInit:function(panel,initOptions){if(!panel){return;}
_panel=panel;PanelUtils.activate(panel);return options.onInit(panel,initOptions);},onUninit:function(){_removeListeners(_panel);_panel=null;options.onUninit();},onShow:function(panel,showOptions){return options.onShow(panel,showOptions);},onHide:function(){_removeListeners(_panel);return options.onHide();},onBeforeShow:function(panel,beforeShowOptions){PanelUtils.preset(panel);_addListeners(panel);return options.onBeforeShow(panel,beforeShowOptions);},onBeforeHide:function(){return options.onBeforeHide();}});};return SettingsPanel;});define('modules/panel_cache',['require','modules/settings_panel','shared/lazy_loader'],function(require){'use strict';var SettingsPanel=require('modules/settings_panel');var LazyLoader=require('shared/lazy_loader');var _panelCache={};var _panelStylesheetsLoaded=false;var _loadPanelStylesheetsIfNeeded=function loadPanelCSS(){if(_panelStylesheetsLoaded){return;}
LazyLoader.load(['shared/style/action_menu.css','shared/style/confirm.css','shared/style/progress_activity.css','shared/elements/gaia-icons/bidi-helper.css','shared/elements/gaia_buttons/script.js','shared/elements/gaia_confirm/script.js','style/homescreens.css','style/apps.css','style/screen_lock.css','style/simcard.css','style/updates.css','style/downloads.css','style/developer_service_workers.css'],function callback(){_panelStylesheetsLoaded=true;});};navigator.addIdleObserver({time:3,onidle:_loadPanelStylesheetsIfNeeded});return{reset:function spc_reset(){_panelCache={};_panelStylesheetsLoaded=false;},get:function spc_get(panelId,callback){if(!panelId&&!callback){return;}
if(panelId!=='root'){_loadPanelStylesheetsIfNeeded();}
var cachedPanel=_panelCache[panelId];if(cachedPanel){if(callback){callback(cachedPanel);}}else{var panelElement=document.getElementById(panelId);if(panelElement){var pathElement=panelElement.querySelector('panel');var path=pathElement?pathElement.dataset.path:null;var panelFuncLoaded=function(panelFunc){var panel=panelFunc();_panelCache[panelId]=panel;if(callback){callback(panel);}};if(path){require([path],function(panelFunc){panelFuncLoaded(panelFunc?panelFunc:SettingsPanel);});}else{panelFuncLoaded(SettingsPanel);}}else{if(callback){callback(null);}}}}};});var ScreenLayout={defaultQueries:{tiny:'(max-width: 767px)',small:'(min-width: 768px) and (max-width: 991px)',medium:'(min-width: 992px) and (max-width: 1200px)',large:'(min-width: 1201px)',hardwareHomeButton:window.VulpesCompat?'(min-width: 0px)':'(-moz-physical-home-button)'},init:function sl_init(){this.queries=(function(qs){var result={};for(var key in qs){result[key]=window.matchMedia(qs[key]);}
return result;})(this.defaultQueries);},_isOnRealDevice:undefined,isOnRealDevice:function sl_isOnRealDevice(){if(typeof(this._isOnRealDevice)!=='undefined'){return this._isOnRealDevice;}
if(window.innerWidth===screen.availWidth){this._isOnRealDevice=true;}else{this._isOnRealDevice=false;}
return this._isOnRealDevice;},getCurrentLayout:function sl_getCurrentLayout(type){if(type===undefined){for(var name in this.defaultQueries){if(this.queries[name]&&this.queries[name].matches){return name;}}}
if(typeof this.queries[type]!=='undefined'){return this.queries[type].matches;}
return false;},watch:function sl_watch(name,media){var mediaString=media||this.queries[name].media;if(!mediaString){return;}
this.unwatch(name);this.queries[name]=window.matchMedia(mediaString);this.boundHandleChange=this.handleChange.bind(this);this.queries[name].addListener(this.boundHandleChange);},unwatch:function sl_unwatch(name){if(this.queries[name]){this.queries[name].removeListener(this.boundHandleChange);}},handleChange:function sl_handleChange(evt){for(var key in this.queries){if(this.queries[key].media!==evt.media){continue;}
window.dispatchEvent(new CustomEvent('screenlayoutchange',{detail:{name:key,status:evt.matches}}));}}};ScreenLayout.init();define("shared/screen_layout",(function(global){return function(){var ret,fn;return ret||global.ScreenLayout;};}(this)));define('modules/settings_service',['require','modules/page_transitions','modules/panel_cache','shared/screen_layout','shared/lazy_loader','settings'],function(require){'use strict';var PageTransitions=require('modules/page_transitions');var PanelCache=require('modules/panel_cache');var ScreenLayout=require('shared/screen_layout');var LazyLoader=require('shared/lazy_loader');var Settings=require('settings');var _rootPanelId=null;var _currentNavigation=null;var _navigating=false;var _pendingNavigationRequest=null;var _cachedNavigation=null;var _cachedNavigationOptions={};var _activityHandler=null;var _loadModulesForSubPanelsPromise=null;var _getAppNameToLink=function ss_get_app_name_to_link(panelId){var reAppName=/app:(\w+)/;var name=reAppName.exec(panelId);return name&&name[1];};var _getAppInfo=function ss_get_app_info(appName){var _supportedAppInFrame={keyboard:{},bluetooth:{}};var appInfo=_supportedAppInFrame[appName];if(!appInfo){return false;}
var prefix='app://'+appName+'.gaiamobile.org/';var defaultSrc=prefix+'settings.html';var appMozapp=prefix+'manifest.webapp';var appSrc=appInfo.src?prefix+appInfo.src:defaultSrc;return{src:appSrc,mozapp:appMozapp};};var _isTabletAndLandscape=function ss_is_tablet_and_landscape(){return ScreenLayout.getCurrentLayout('tabletAndLandscaped');};var _retriveParentPanelId=function ss_retriveParentPanelId(panelId){var headerSelector='#'+panelId+' > gaia-header';var header=document.querySelector(headerSelector);return(header&&header.dataset.href||'').replace('#','');};var _shallCloseActivity=function ss_shallCloseActivity(panelId){if(panelId==='close'){return true;}
if(!_currentNavigation){return false;}
var parentPanelId=_retriveParentPanelId(_currentNavigation.panelId);return _currentNavigation.panelId===_activityHandler.targetPanelId&&panelId===parentPanelId;};var _transit=function ss_transit(oldPanel,newPanel,callback){var promise=new Promise(function(resolve){var wrappedCallback=function(){if(typeof callback==='function'){callback();}
resolve();};if(_isTabletAndLandscape()){PageTransitions.twoColumn(oldPanel,newPanel,wrappedCallback);}else{PageTransitions.oneColumn(oldPanel,newPanel,wrappedCallback);}});return promise;};var _loadPanel=function ss_loadPanel(panelId,callback){var panelElement=document.getElementById(panelId);if(panelElement.dataset.rendered){callback();return;}
panelElement.dataset.rendered=true;if(panelElement.dataset.requireSubPanels){var selector='section[id^="'+panelElement.id+'-"]';var subPanels=document.querySelectorAll(selector);for(var i=0,il=subPanels.length;i<il;i++){LazyLoader.load([subPanels[i]]);}
LazyLoader.load([panelElement],callback);}else{LazyLoader.load([panelElement],callback);}};var _loadModulesForSubPanels=function ss_loadModules(panelId){if(panelId===_rootPanelId){return Promise.resolve();}else{if(!_loadModulesForSubPanelsPromise){_loadModulesForSubPanelsPromise=new Promise(function(resolve){require(['shared/async_storage'],resolve);});}
return _loadModulesForSubPanelsPromise;}};var _onVisibilityChange=function ss_onVisibilityChange(){_handleVisibilityChange(!document.hidden);};var _handleVisibilityChange=function ss_onVisibilityChange(visible){if(!_currentNavigation){return;}
var panel=_currentNavigation.panel;var element=_currentNavigation.panelElement;var options=_currentNavigation.options;if(!panel){return;}
if(visible){panel.beforeShow(element,options);panel.show(element,options);}else{panel.beforeHide();panel.hide();}};var _navigate=function ss_navigate(panelId,options,callback){if(_currentNavigation&&_currentNavigation.panelId===panelId){callback();return;}
_loadPanel(panelId,function(){PanelCache.get(panelId,function(panel){var newPanelElement=document.getElementById(panelId);var currentPanelId=_currentNavigation&&_currentNavigation.panelId;var currentPanelElement=_currentNavigation&&_currentNavigation.panelElement;var currentPanel=_currentNavigation&&_currentNavigation.panel;_cachedNavigation=_currentNavigation;_cachedNavigationOptions=options;options=options||{};_loadModulesForSubPanels(panelId).then(function(){if(currentPanel&&currentPanelId!==_rootPanelId){return currentPanel.beforeHide();}}).then(function(){return panel.beforeShow(newPanelElement,options);}).then(function(){return _transit(currentPanelElement,newPanelElement);}).then(function(){if(currentPanel&&currentPanelId!==_rootPanelId){return currentPanel.hide();}}).then(function(){return panel.show(newPanelElement,options);}).then(function(){_currentNavigation={panelId:panelId,panelElement:newPanelElement,panel:panel,options:options};Settings._currentPanel='#'+panelId;callback();});});});};return{reset:function ss_reset(){_rootPanelId=null;_currentNavigation=null;_cachedNavigation=null;_cachedNavigationOptions={};_activityHandler=null;_navigating=false;_pendingNavigationRequest=null;window.removeEventListener('visibilitychange',_onVisibilityChange);},init:function ss_init(options){if(options){_rootPanelId=options.rootPanelId||'root';_activityHandler=options.context&&options.context.activityHandler;}
window.addEventListener('visibilitychange',_onVisibilityChange);},navigate:function ss_navigate(panelId,options,callback){if(_activityHandler&&_shallCloseActivity(panelId)){_activityHandler.postResult();return;}
if(_navigating){_pendingNavigationRequest=arguments;return;}
var appName=_getAppNameToLink(panelId);if(appName){var appInfo=_getAppInfo(appName);if(!appInfo){console.error('We only embed trust apps.');return;}
panelId='frame';options=options||{};options.mozapp=appInfo.mozapp;options.src=appInfo.src;}
_navigating=true;_navigate(panelId,options,(function(){_navigating=false;if(_pendingNavigationRequest){var args=_pendingNavigationRequest;_pendingNavigationRequest=null;this.navigate.apply(this,args);}
if(callback){callback();}}).bind(this));},back:function ss_back(){if(_activityHandler){_activityHandler.postResult();}else if(_cachedNavigation){this.navigate(_cachedNavigation.panelId,_cachedNavigationOptions);_cachedNavigation=null;_cachedNavigationOptions={};}}};});require(['config/require'],function(){'use strict';define('boot',['require','shared/settings_listener','modules/mvvm/observable','modules/mvvm/observable_array','modules/base/event_emitter','modules/settings_service','shared/screen_layout','settings'],function(require){require('shared/settings_listener');require('modules/mvvm/observable');require('modules/mvvm/observable_array');require('modules/base/event_emitter');var SettingsService=require('modules/settings_service');var ScreenLayout=require('shared/screen_layout');var Settings=require('settings');function isInitialPanel(panel){if(Settings.isTabletAndLandscape()){return panel===Settings.initialPanelForTablet;}else{return panel===('#'+window.LaunchContext.initialPanelId);}}
window.addEventListener('panelready',function onPanelReady(e){if(!isInitialPanel(e.detail.current)){return;}
var initialPanelHandler=window.LaunchContext.initialPanelHandler;if(initialPanelHandler){initialPanelHandler.release();var pendingTargetPanel=initialPanelHandler.pendingTargetPanel;switch(pendingTargetPanel){case'call':var mozMobileConnections=navigator.mozMobileConnections;if(mozMobileConnections&&mozMobileConnections.length>1){pendingTargetPanel='call-iccs';}
SettingsService.navigate(pendingTargetPanel);break;default:if(pendingTargetPanel){SettingsService.navigate(pendingTargetPanel);}
break;}}
window.removeEventListener('panelready',onPanelReady);window.performance.mark('visuallyLoaded');document.body.dataset.ready=true;},false);window.addEventListener('telephony-settings-loaded',function onTelephonySettingsLoaded(){window.removeEventListener('telephony-settings-loaded',onTelephonySettingsLoaded);window.performance.mark('fullyLoaded');});SettingsService.init({rootPanelId:'root',context:window.LaunchContext});var options={SettingsService:SettingsService,ScreenLayout:ScreenLayout};Settings.init(options);if(navigator.mozAudioChannelManager){navigator.mozAudioChannelManager.volumeControlChannel='notification';}});require(['boot']);});define("main",function(){});