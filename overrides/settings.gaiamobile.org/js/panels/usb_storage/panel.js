
define('modules/dialog_manager',["require", "modules/panel_cache", "shared/lazy_loader"],function(require) {
  'use strict';

  var PanelCache = require('modules/panel_cache');
  var LazyLoader = require('shared/lazy_loader');

  var DialogManager = function() {
    this.OVERLAY_SELECTOR = '.settings-dialog-overlay';

    this._overlayDOM = document.querySelector(this.OVERLAY_SELECTOR);
  };

  DialogManager.prototype = {
    /**
     * load panel based on passed in panelId
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} panelId
     * @return {Promise}
     */
    _loadPanel: function dm__loadPanel(panelId) {
      var promise = new Promise(function(resolve, reject) {
        var panelElement = document.getElementById(panelId);
        if (panelElement.dataset.rendered) { // already initialized
          resolve();
          return;
        }

        panelElement.dataset.rendered = true;

        // XXX remove SubPanel loader once sub panel are modulized
        if (panelElement.dataset.requireSubPanels) {
          // load the panel and its sub-panels (dependencies)
          // (load the main panel last because it contains the scripts)
          var selector = 'section[id^="' + panelElement.id + '-"]';
          var subPanels = document.querySelectorAll(selector);
          for (var i = 0, il = subPanels.length; i < il; i++) {
            LazyLoader.load([subPanels[i]]);
          }
          LazyLoader.load([panelElement], resolve);
        } else {
          LazyLoader.load([panelElement], resolve);
        }
      });
      return promise;
    },

    /**
     * promised version of PanelCache.get()
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} panelId
     * @return {Promise}
     */
    _getPanel: function dm__getPanel(panelId) {
      var promise = new Promise(function(resolve) {
        PanelCache.get(panelId, function(panel) {
          resolve(panel);
        });
      });
      return promise;
    },

    /**
     * this is used to control visibility of overlayDOM
     *
     * @memberOf DialogManager
     * @access private
     * @param {Boolean} show
     */
    _showOverlay: function dm__showOverlay(show) {
      this._overlayDOM.hidden = !show;
    },

    /**
     * It is used to control the timing of transitions so that we can make sure
     * whether animation is done or not.
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} method
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _transit: function dm__transit(method, dialog, options) {
      var promise = new Promise(function(resolve) {
        var panel = dialog.panel;
        var completed = false;
        var fallback;
        function finish(event) {
          if (event && (event.target !== panel || event.propertyName !== 'visibility')) return;
          if (completed) return;
          completed = true;
          clearTimeout(fallback);
          panel.removeEventListener('transitionend', finish);
          panel.removeEventListener('transitioncancel', finish);
          if (method === 'close') panel.hidden = true;
          resolve();
        }
        if (method === 'open') panel.hidden = false;
        setTimeout(function() {
          panel.addEventListener('transitionend', finish);
          panel.addEventListener('transitioncancel', finish);
          panel.classList.toggle('current', method === 'open');
          var style = window.getComputedStyle(panel);
          function milliseconds(value) {
            return parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000) || 0;
          }
          var durations = style.transitionDuration.split(',').map(milliseconds);
          var delays = style.transitionDelay.split(',').map(milliseconds);
          var duration = Math.max.apply(Math, durations.map(function(value, index) {
            return value + delays[index % delays.length];
          }));
          // Reduced motion, display changes or interrupted transitions may
          // omit the visibility event. Always release the dialog queue.
          fallback = setTimeout(finish, Math.max(0, duration) + 100);
        }, 150);
      });
      return promise;
    },

    /**
     * Do necessary works to open panel like loading panel, doing transition
     * and call related functions.
     *
     * @memberOf DialogManager
     * @access private
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _open: function dm__open(dialog, options) {
      var self = this;
      var foundPanel;

      return Promise.resolve()
      .then(function() {
        // 1: load panel
        return self._loadPanel(dialog.panel.id);
      })
      .then(function() {
        // 2: Get that panel
        return self._getPanel(dialog.panel.id);
      })
      .then(function(panel) {
        // 3: call beforeShow
        foundPanel = panel;
        return foundPanel.beforeShow(dialog.panel, options);
      })
      .then(function() {
        // 4. UI stuffs + transition
        dialog.init();
        dialog.initUI();
        dialog.bindEvents();

        if (dialog.TRANSITION_CLASS === 'zoom-in-80') {
          self._showOverlay(true);
        }

        return self._transit('open', dialog, options);
      })
      .then(function() {
        // 5. show that panel as a dialog
        return foundPanel.show(dialog.panel, options);
      });
    },

    /**
     * Do necessary works to close panel like loading panel, doing transition
     * and call related functions.
     *
     * @memberOf DialogManager
     * @access private
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _close: function dm__close(dialog, options) {
      var self = this;
      var foundPanel;
      var cachedResult;

      return Promise.resolve()
      .then(function() {
        // 1: Get that panel
        return self._getPanel(dialog.panel.id);
      })
      .then(function(panel) {
        // 2: Let's validate to see whether we can close this dialog or not.
        foundPanel = panel;

        var promise;
        // custom dialog - onSubmit
        if (foundPanel.onSubmit && options._type === 'submit') {
          promise = foundPanel.onSubmit();
        // custom dialog - onCancel
        } else if (foundPanel.onCancel && options._type === 'cancel') {
          promise = foundPanel.onCancel();
        // if no onSubmit & onCancel, pass directly
        } else {
          promise = Promise.resolve();
        }

        return promise;
      })
      .then(function(result) {
        cachedResult = result;

        // 3: call beforeHide
        return foundPanel.beforeHide();
      })
      .then(function() {
        // 4. transition
        return self._transit('close', dialog, options);
      })
      .then(function() {
        // 5. call hide
        return foundPanel.hide();
      })
      .then(function() {
        // 6. Get result and cleanup dialog
        var result;

        // for prompt dialog, we have to get its own result from input text.
        if (dialog.DIALOG_CLASS === 'prompt-dialog') {
          result = dialog.getResult();
        } else if (cachedResult) {
          result = cachedResult;
        }

        dialog.cleanup();

        if (dialog.TRANSITION_CLASS === 'zoom-in-80') {
          self._showOverlay(false);
        }

        return result;
      });
    },

    /**
     * It is a bridge to call open or close function.
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} method
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _navigate: function dm__navigate(method, dialog, options) {
      method = (method === 'open') ? '_open' : '_close';
      return this[method](dialog, options);
    },

    /**
     * DialogService would use this exposed API to open dialog.
     *
     * @memberOf DialogManager
     * @access public
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    open: function dm_open(dialog, options) {
      return this._navigate('open', dialog, options);
    },

    /**
     * DialogService would use this exposed API to close dialog.
     *
     * @memberOf DialogManager
     * @access public
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    close: function dm_close(dialog, type, options) {
      options._type = type;
      return this._navigate('close', dialog, options);
    }
  };

  var dialogManager = new DialogManager();
  return dialogManager;
});
define('modules/dialog/base_dialog',['require'],function(require){'use strict';var BaseDialog=function(panelDOM,options){this.panel=panelDOM;this._options=options||{};};BaseDialog.prototype.DIALOG_CLASS='dialog';BaseDialog.prototype.TRANSITION_CLASS='fade';BaseDialog.prototype.SUBMIT_BUTTON_SELECTOR='[type="submit"]';BaseDialog.prototype.CANCEL_BUTTON_SELECTOR='[type="reset"]';BaseDialog.prototype.MESSAGE_SELECTOR='.settings-dialog-message';BaseDialog.prototype.TITLE_SELECTOR='.settings-dialog-title';BaseDialog.prototype.init=function bd_init(){this.TRANSITION_CLASS=this._options.transition||this.TRANSITION_CLASS;this.panel.classList.add(this.DIALOG_CLASS);this.panel.classList.add(this.TRANSITION_CLASS);};BaseDialog.prototype.initUI=function bd_initUI(){var message=this._options.message;var title=this._options.title;var submitButton=this._options.submitButton;var cancelButton=this._options.cancelButton;this._updateMessage(message);this._updateTitle(title);this._updateSubmitButton(submitButton);this._updateCancelButton(cancelButton);};BaseDialog.prototype.bindEvents=function bd_bindEvent(){var self=this;this.getSubmitButton().onclick=function(){self._options.onWrapSubmit();};this.getCancelButton().onclick=function(){self._options.onWrapCancel();};};BaseDialog.prototype._updateMessage=function bd__updateMessage(message){var messageDOM=this.panel.querySelector(this.MESSAGE_SELECTOR);if(messageDOM&&message){message=this._getWrapL10nObject(message);document.l10n.setAttributes(messageDOM,message.id,message.args);}};BaseDialog.prototype._updateTitle=function bd__updateTitle(title){var titleDOM=this.panel.querySelector(this.TITLE_SELECTOR);if(titleDOM&&title){title=this._getWrapL10nObject(title);document.l10n.setAttributes(titleDOM,title.id,title.args);}};BaseDialog.prototype._updateSubmitButton=function bd__update(options){var buttonDOM=this.getSubmitButton();if(buttonDOM&&options){options=this._getWrapL10nObject(options);document.l10n.setAttributes(buttonDOM,options.id,options.args);buttonDOM.className=options.style||'recommend';}};BaseDialog.prototype._updateCancelButton=function bd__updateText(options){var buttonDOM=this.getCancelButton();if(buttonDOM&&options){options=this._getWrapL10nObject(options);document.l10n.setAttributes(buttonDOM,options.id,options.args);buttonDOM.className=options.style||'';}};BaseDialog.prototype._getWrapL10nObject=function bd__getWrapL10nObject(input){if(typeof input==='string'){return{id:input,args:null};}else if(typeof input==='object'){if(typeof input.id==='undefined'){throw new Error('You forgot to put l10nId - '+
JSON.stringify(input));}else{return{id:input.id,args:input.args||null,style:input.style};}}else{throw new Error('You are using the wrong L10nObject, '+'please check its format again');}};BaseDialog.prototype.getDOM=function bd_getDOM(){return this.panel;};BaseDialog.prototype.getSubmitButton=function bd_getSubmitButton(){return this.panel.querySelector(this.SUBMIT_BUTTON_SELECTOR);};BaseDialog.prototype.getCancelButton=function bd_getCancelButton(){return this.panel.querySelector(this.CANCEL_BUTTON_SELECTOR);};BaseDialog.prototype.cleanup=function bd_cleanup(){if(this.DIALOG_CLASS!=='panel-dialog'){this._updateTitle('settings-'+this.DIALOG_CLASS+'-header');this._updateSubmitButton('ok');this._updateCancelButton('cancel');}
this.panel.classList.remove(this.DIALOG_CLASS);this.panel.classList.remove(this.TRANSITION_CLASS);};return BaseDialog;});define('modules/dialog/panel_dialog',['require','modules/dialog/base_dialog'],function(require){'use strict';var BaseDialog=require('modules/dialog/base_dialog');var PanelDialog=function(panelDOM,options){BaseDialog.call(this,panelDOM,options);};PanelDialog.prototype=Object.create(BaseDialog.prototype);PanelDialog.prototype.constructor=PanelDialog;PanelDialog.prototype.DIALOG_CLASS='panel-dialog';PanelDialog.prototype.TRANSITION_CLASS='fade';return function ctor_PanelDialog(panelDOM,options){return new PanelDialog(panelDOM,options);};});define('modules/dialog/alert_dialog',['require','modules/dialog/base_dialog'],function(require){'use strict';var BaseDialog=require('modules/dialog/base_dialog');var AlertDialog=function(panelDOM,options){BaseDialog.call(this,panelDOM,options);};AlertDialog.prototype=Object.create(BaseDialog.prototype);AlertDialog.prototype.constructor=AlertDialog;AlertDialog.prototype.DIALOG_CLASS='alert-dialog';AlertDialog.prototype.TRANSITION_CLASS='fade';AlertDialog.prototype.bindEvents=function(){var self=this;this.getSubmitButton().onclick=function(){self._options.onWrapSubmit();};};return function ctor_alertDialog(panelDOM,options){return new AlertDialog(panelDOM,options);};});define('modules/dialog/confirm_dialog',['require','modules/dialog/base_dialog'],function(require){'use strict';var BaseDialog=require('modules/dialog/base_dialog');var ConfirmDialog=function(panelDOM,options){BaseDialog.call(this,panelDOM,options);};ConfirmDialog.prototype=Object.create(BaseDialog.prototype);ConfirmDialog.prototype.constructor=ConfirmDialog;ConfirmDialog.prototype.DIALOG_CLASS='confirm-dialog';ConfirmDialog.prototype.TRANSITION_CLASS='fade';ConfirmDialog.prototype.bindEvents=function(){var self=this;this.getSubmitButton().onclick=function(){self._options.onWrapSubmit();};this.getCancelButton().onclick=function(){self._options.onWrapCancel();};};return function ctor_confirmDialog(panelDOM,options){return new ConfirmDialog(panelDOM,options);};});define('modules/dialog/prompt_dialog',['require','modules/dialog/base_dialog'],function(require){'use strict';var BaseDialog=require('modules/dialog/base_dialog');var PromptDialog=function(panelDOM,options){BaseDialog.call(this,panelDOM,options);};PromptDialog.prototype=Object.create(BaseDialog.prototype);PromptDialog.prototype.constructor=PromptDialog;PromptDialog.prototype.DIALOG_CLASS='prompt-dialog';PromptDialog.prototype.TRANSITION_CLASS='fade';PromptDialog.prototype.INPUT_SELECTOR='.settings-dialog-input';PromptDialog.prototype.bindEvents=function(){var self=this;this.getSubmitButton().onclick=function(){self._options.onWrapSubmit();};this.getCancelButton().onclick=function(){self._options.onWrapCancel();};};PromptDialog.prototype.initUI=function(){BaseDialog.prototype.initUI.call(this);this.getInput().value=this._options.defaultValue||'';};PromptDialog.prototype.getInput=function(){return this.panel.querySelector(this.INPUT_SELECTOR);};PromptDialog.prototype.getResult=function(){return this.getInput().value;};return function ctor_promptDialog(panelDOM,options){return new PromptDialog(panelDOM,options);};});define('modules/dialog_service',["require", "settings", "modules/defer", "modules/dialog_manager", "modules/dialog/panel_dialog", "modules/dialog/alert_dialog", "modules/dialog/confirm_dialog", "modules/dialog/prompt_dialog"],function(require) {
  'use strict';

  var Settings = require('settings');
  var Defer = require('modules/defer');
  var DialogManager = require('modules/dialog_manager');

  var PanelDialog = require('modules/dialog/panel_dialog');
  var AlertDialog = require('modules/dialog/alert_dialog');
  var ConfirmDialog = require('modules/dialog/confirm_dialog');
  var PromptDialog = require('modules/dialog/prompt_dialog');

  var DialogService = function() {
    this._navigating = false;
    this._pendingRequests = [];
    this._settingsAlertDialogId = 'settings-alert-dialog';
    this._settingsBaseDialogId = 'settings-base-dialog';
    this._settingsConfirmDialogId = 'settings-confirm-dialog';
    this._settingsPromptDialogId = 'settings-prompt-dialog';
  };

  DialogService.prototype = {
    /**
     * Alert dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    alert: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsAlertDialogId, {
        type: 'alert',
        message: message,
        title: options.title,
        submitButton: options.submitButton
      });
    },

    /**
     * Confirm dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    confirm: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsConfirmDialogId, {
        type: 'confirm',
        message: message,
        title: options.title,
        submitButton: options.submitButton,
        cancelButton: options.cancelButton
      });
    },

    /**
     * Prompt dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    prompt: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsPromptDialogId, {
        type: 'prompt',
        message: message,
        title: options.title,
        defaultValue: options.defaultValue,
        submitButton: options.submitButton,
        cancelButton: options.cancelButton
      });
    },

    /**
     * Panel dialog. If you are going to show any panel as a dialog,
     * you have to use this method to show them.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} panelId
     * @param {Object} userOptions
     * @return {Promise}
     */
    show: function dm_show(panelId, userOptions, _pendingDefer) {
      var self = this;
      var defer;
      var dialog;
      var dialogDOM = document.getElementById(panelId);
      var currentPanel = Settings.currentPanel;
      var options = userOptions || {};

      if (_pendingDefer) {
        defer = _pendingDefer;
      } else {
        defer = Defer();
      }

      if (this._navigating) {
        this._pendingRequests.push({
          defer: defer,
          panelId: panelId,
          userOptions: userOptions
        });
      } else {
        if ('#' + panelId === currentPanel) {
          defer.reject('You are showing the same panel #' + panelId);
        } else {
          var opening;
          var closing = false;
          function close(type) {
            if (closing) return;
            closing = true;
            // A tap during the opening animation must not run hide/show
            // concurrently, or a queued dialog can inherit stale form values.
            Promise.resolve(opening).then(function() {
              return DialogManager.close(dialog, type, options);
            }).then(function(result) {
              self._navigating = false;
              defer.resolve({type: type, value: result});
              self._execPendingRequest();
            }, function(error) {
              // Panel validation rejects to keep the form open. Allow a
              // correction or cancellation without rejecting the show promise.
              closing = false;
              dialogDOM.dispatchEvent(new CustomEvent('dialogvalidationfailed', {
                detail: error
              }));
            });
          }
          options.onWrapSubmit = function() { close('submit'); };
          options.onWrapCancel = function() { close('cancel'); };

          switch (options.type) {
            case 'alert':
              dialog = AlertDialog(dialogDOM, options);
              break;
            case 'confirm':
              dialog = ConfirmDialog(dialogDOM, options);
              break;
            case 'prompt':
              dialog = PromptDialog(dialogDOM, options);
              break;
            default:
              dialog = PanelDialog(dialogDOM, options);
              break;
          }
          this._navigating = true;
          opening = DialogManager.open(dialog, options);
          opening.catch(function(error) {
            // A missing host API must not lock every later Settings dialog.
            dialogDOM.classList.remove('current');
            dialogDOM.hidden = true;
            var overlay = document.querySelector('.settings-dialog-overlay');
            if (overlay) overlay.hidden = true;
            self._navigating = false;
            defer.reject(error);
            self._execPendingRequest();
          });
        }
      }

      return defer.promise;
    },

    /**
     * This method can help us pop up any pending request and would try to
     * show it after previous request was done.
     *
     * @memberOf DialogService
     * @access private
     */
    _execPendingRequest: function() {
      var request = this._pendingRequests.pop();
      if (request) {
        this.show(request.panelId, request.userOptions, request.defer);
      }
    }
  };

  var dialogService = new DialogService();
  return dialogService;
});
define('panels/usb_storage/usb_transfer',['require','modules/settings_cache','shared/settings_listener','modules/dialog_service','shared/async_storage','modules/media_storage'],function(require){'use strict';var SettingsCache=require('modules/settings_cache');var SettingsListener=require('shared/settings_listener');var DialogService=require('modules/dialog_service');var AsyncStorage=require('shared/async_storage');var MediaStorage=require('modules/media_storage');var _debug=false;var debug=function(){};if(_debug){debug=function ut_debug(msg){console.log('--> [UsbTransfer]: '+msg);};}
var UsbTransfer=function(){this._keyUmsEnabled='ums.enabled';this._keyUmsMode='ums.mode';this._keyTransferProtocol='usb.transfer';this._elements=null;this._usbHotProtocolSwitch=false;this._partialUmsSupport=!navigator.getDeviceStorages('sdcard').every(storage=>storage.canBeShared);this.PROTOCOL_UMS='0';this.PROTOCOL_MTP='1';this.MODE_UMS=1;this.MODE_MTP=3;};UsbTransfer.prototype={init:function ut_init(elements,option){this._elements=elements;if(option&&option.usbHotProtocolSwitch!==undefined){this._usbHotProtocolSwitch=option.usbHotProtocolSwitch;}
SettingsListener.observe(this._keyTransferProtocol,this.PROTOCOL_UMS,this._configProtocol.bind(this));SettingsListener.observe(this._keyUmsEnabled,false,this._umsEnabledHandler.bind(this));this._elements.usbEnabledCheckBox.addEventListener('change',this._umsCheckboxChange.bind(this));MediaStorage.observe('volumeState',this._updateUmsState.bind(this));},_umsCheckboxChange:function storage_umsCheckboxChange(evt){var checkbox=evt.target;var cset={};var warningKey='ums-turn-on-warning';debug('state change '+checkbox.checked);if(checkbox.checked){AsyncStorage.getItem(warningKey,(showed)=>{if(!showed){debug('show turn-on warning');this._umsTurnOnWarning(checkbox,warningKey);}else{debug('turn-on warning is showed');SettingsCache.getSettings(this._openIncompatibleSettingsDialogIfNeeded.bind(this));}});}else{cset[this._keyUmsEnabled]=false;navigator.mozSettings.createLock().set(cset);}},_umsTurnOnWarning:function storage_umsTurnOnWarning(checkbox,warningKey){DialogService.confirm('ums-confirm',{title:'ums-warning-title',submitButton:'ok',cancelButton:'cancel'}).then((result)=>{var type=result.type;if(type==='submit'){debug('turn on success');AsyncStorage.setItem(warningKey,true);SettingsCache.getSettings(this._openIncompatibleSettingsDialogIfNeeded.bind(this));}else{debug('turn on fail');var cset={};cset[this._keyUmsEnabled]=false;navigator.mozSettings.createLock().set(cset);checkbox.checked=false;}});},_openIncompatibleSettingsDialogIfNeeded:function storage_openIncompatibleSettingsDialogIfNeeded(settings){var cset={};var umsSettingKey=this._keyUmsEnabled;var oldSetting='tethering.usb.enabled';var usbTetheringSetting=settings[oldSetting];if(!usbTetheringSetting){cset[umsSettingKey]=true;navigator.mozSettings.createLock().set(cset);}else{DialogService.confirm('is-warning-storage-tethering-message',{title:'is-warning-storage-header',submitButton:{id:'enable',style:'recommend'},cancelButton:{id:'cancel'}}).then((result)=>{var enabled=result.type==='submit';var lock=navigator.mozSettings.createLock();var cset={};cset[umsSettingKey]=enabled;cset[oldSetting]=!enabled;lock.set(cset);});}},_umsEnabledHandler:function ut_umsEnabledHandler(enabled){debug('ums.enabled: '+enabled);this._elements.usbEnabledCheckBox.checked=enabled;this._updateUmsState();},_configProtocol:function ut_configProtocol(protocol){SettingsCache.getSettings((results)=>{var enabled=results[this._keyUmsEnabled];var mode=results[this._keyUmsMode];if(enabled){this._changeMode(mode,protocol);}});},_changeMode:function ut_changeMode(mode,protocol){if(mode!==this.MODE_MTP&&protocol===this.PROTOCOL_MTP){this._setMode(this.MODE_MTP);}else if(mode===this.MODE_MTP&&protocol===this.PROTOCOL_UMS){if(this._partialUmsSupport){debug('show partial warning');DialogService.show('ums-partial-warning').then((result)=>{if(result.type==='cancel'){var param={};param[this._keyTransferProtocol]=this.PROTOCOL_MTP;SettingsListener.getSettingsLock().set(param);}else{this._setMode(this.MODE_UMS);}});}else{this._setMode(this.MODE_UMS);}}else{console.log('Error: should not be executed');}},_updateUmsState:function ut_updateUmsState(){var key;debug('enabled:'+this._elements.usbEnabledCheckBox.checked+'/'+'volumeState:'+MediaStorage.volumeState);if(this._elements.usbEnabledCheckBox.checked){key='enabled';if(MediaStorage.volumeState==='shared'){this._disableProtocolSelections(true);}else{this._disableProtocolSelections(false);}}else if(MediaStorage.volumeState==='shared'){key='umsUnplugToDisable';this._disableProtocolSelections(true);}else{key='disabled';this._disableProtocolSelections(false);}
this._elements.usbEnabledInfoBlock.setAttribute('data-l10n-id',key);},_disableProtocolSelections:function ut_disableProtocolSelections(disabled){var i;if(disabled){if(!this._usbHotProtocolSwitch){for(i=0;i<this._elements.protocols.length;i++){this._elements.protocols[i].setAttribute('disabled',true);}}}else{for(i=0;i<this._elements.protocols.length;i++){this._elements.protocols[i].removeAttribute('disabled');}}},_setMode:function ut_setMode(mode){var param={};param[this._keyUmsMode]=mode;SettingsListener.getSettingsLock().set(param);}};return function ctor_usb_transfer(){return new UsbTransfer();};});define('panels/usb_storage/panel',['require','modules/settings_panel','panels/usb_storage/usb_transfer','shared/lazy_loader'],function(require){'use strict';var SettingsPanel=require('modules/settings_panel');var UsbTransferModule=require('panels/usb_storage/usb_transfer');var LazyLoader=require('shared/lazy_loader');var elements={};return function ctor_usb_storage_panel(){var usbTransfer=UsbTransferModule();return SettingsPanel({onInit:function us_onInit(panel){elements={usbEnabledCheckBox:panel.querySelector('.ums-switch'),usbEnabledInfoBlock:panel.querySelector('.ums-switch-desc'),protocols:panel.querySelectorAll('gaia-radio')};LazyLoader.getJSON('/resources/device-features.json').then(({usbHotProtocolSwitch})=>usbTransfer.init(elements,{usbHotProtocolSwitch:usbHotProtocolSwitch}));}});};});