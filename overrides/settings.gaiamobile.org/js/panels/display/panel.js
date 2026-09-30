
/**
 * Update setting value based on slider position.
 * Base on sound panel's implementation.
 *
 * @module SliderHandler
 */
define('panels/display/slider_handler',["require"],function(require) {
  'use strict';

  const INTERVAL = 300;

  var SliderHandler = function() {
    this._element = null;
    this._key = '';
    this._isFirstInput = false;
    this._intervalID = null;
  };

  SliderHandler.prototype = {
    /**
     * initialization
     *
     * The sliders listen to input, touchstart and touchend events to fit
     * the ux requirements, and when the user tap or drag the sliders, the
     * sequence of the events is:
     * touchstart -> input -> input(more if dragging) -> touchend -> input
     *
     * @access public
     * @memberOf SliderHandler.prototype
     * @param  {Object} element html elements
     * @param  {String} settings key
     */
    init: function d_init(element, key) {
      this._element = element;
      this._key = key;

      this._boundSetSliderValue = function(value) {
        this._setSliderValue(value);
      }.bind(this);

      // We can't use the input change event because it does not fire
      // when the slider is being dragged, and will only fire when released.
      this._element.addEventListener('touchstart',
        this._touchStartHandler.bind(this));
      this._element.addEventListener('input',
        this._inputHandler.bind(this));
      this._element.addEventListener('change',
        this._touchEndHandler.bind(this));
      this._element.addEventListener('touchend',
        this._touchEndHandler.bind(this));
    },

    /**
     * Change slider's value
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param {Number} value slider value
     */
    _setSliderValue: function d_setSliderValue(value) {
      this._element.value = value;
    },

    /**
     * Handle touchstart event
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchStartHandler: function d_touchStartHandler(event) {
      this._isFirstInput = true;
    },

    /**
     * Update setting
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _updateSetting: function d_updateSetting() {
      var value = this._element.valueAsNumber;
      if (!Number.isFinite(value)) return;
      var settingObject = {};
      settingObject[this._key] = value;

      // Only set the new value if it does not equal to the previous one
      if (value !== this._previous) {
        navigator.mozSettings.createLock().set(settingObject);
        this._previous = value;
      }
    },

    /**
     * Handle input event
     *
     * The mozSettings api is not designed to call rapidly, so we use
     * setInterval() as a timer to ease the number of calling, or we
     * will see the queued callbacks try to update the slider's value
     * which we are unable to avoid and make bad ux for the users.
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _inputHandler: function d_inputHandler(event) {
      if (!this._intervalID) {
        this._isFirstInput = false;
        this._updateSetting();
        this._intervalID =
          setInterval(this._updateSetting.bind(this), INTERVAL);
      }
    },

    /**
     * Handle touchend event
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchEndHandler: function d_touchEndHandler(event) {
      clearInterval(this._intervalID);
      this._intervalID = null;
      this._updateSetting();
    }
  };

  return function ctor_sliderHandler() {
    return new SliderHandler();
  };
});

define('panels/display/display',['require','shared/settings_listener','panels/display/slider_handler'],function(require){'use strict';var SettingsListener=require('shared/settings_listener');var SliderHandler=require('panels/display/slider_handler');const AUTO_BRIGHTNESS_SETTING='screen.automatic-brightness';const SCREEN_BRIGHTNESS='screen.brightness';var Display=function(){this.elements=null;};Display.prototype={init:function d_init(elements,data){this.elements=elements;this.initBrightnessItems(data);SliderHandler().init(elements.brightnessManualInput,SCREEN_BRIGHTNESS);},initBrightnessItems:function d_init_brightness_items(data){var brightnessAuto=this.elements.brightnessAuto;var brightnessAutoCheckbox=this.elements.brightnessAutoCheckbox;var brightnessManual=this.elements.brightnessManual;var brightnessManualInput=this.elements.brightnessManualInput;if(data.ambientLight){brightnessAuto.hidden=false;SettingsListener.observe(AUTO_BRIGHTNESS_SETTING,false,function(value){brightnessAutoCheckbox.checked=value;brightnessManual.hidden=value;}.bind(this));}else{brightnessAuto.hidden=true;brightnessManual.hidden=false;var cset={};cset[AUTO_BRIGHTNESS_SETTING]=false;SettingsListener.getSettingsLock().set(cset);}
SettingsListener.observe(SCREEN_BRIGHTNESS,0.5,function(value){brightnessManualInput.value=value;}.bind(this));}};return function ctor_display(){return new Display();};});define('panels/display/panel',['require','modules/settings_panel','panels/display/display','shared/lazy_loader'],function(require){'use strict';var SettingsPanel=require('modules/settings_panel');var DisplayModule=require('panels/display/display');var LazyLoader=require('shared/lazy_loader');var displayElements={};return function ctor_display_panel(){var display=DisplayModule();return SettingsPanel({onInit:function dp_onInit(panel){displayElements={brightnessManual:panel.querySelector('.brightness-manual'),brightnessManualInput:panel.querySelector('.brightness-manual input'),brightnessAuto:panel.querySelector('.brightness-auto'),brightnessAutoCheckbox:panel.querySelector('.brightness-auto gaia-checkbox')};LazyLoader.getJSON('/resources/device-features.json').then(function(data){display.init(displayElements,data);});}});};});