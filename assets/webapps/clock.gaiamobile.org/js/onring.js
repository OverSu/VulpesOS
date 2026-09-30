requirejs.config({
  // waitSeconds is set to the default here; the build step rewrites
  // it to 0 in build/require_config.jslike so that we never timeout
  // waiting for modules in production. This is important when the
  // device is under super-low-memory stress, as it may take a while
  // for the device to get around to loading things like Clock's alarm
  // ringing screen, and we absolutely do not want that to time out.
  waitSeconds: 0,
  paths: {
    shared: '../shared'
  },
  shim: {
    'shared/js/template': {
      exports: 'Template'
    },
    'shared/js/gesture_detector': {
      exports: 'GestureDetector'
    },
    'shared/js/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/js/accessibility_helper': {
      exports: 'AccessibilityHelper'
    }
  }
});

define("require_config", function(){});

define('constants',['require','exports','module'],function(require, exports) {
  'use strict';

  // ---------------------------------------------------------
  // Constants

  // Random day that happens to be Sunday
  exports.KNOWN_SUNDAY = new Date(2015, 8, 20);
});

define('utils',['require','constants'],function(require) {
'use strict';
/* global mozIntl, IntlHelper */

var constants = require('constants');

var Utils = {};
// Maintain references to millisecond multipliers
var dateMultipliers = {
  days: 1000 * 60 * 60 * 24,
  hours: 1000 * 60 * 60,
  minutes: 1000 * 60,
  seconds: 1000,
  milliseconds: 1
};
var units = Object.keys(dateMultipliers);

IntlHelper.define('weekday-short', 'datetime', {
  weekday: 'short'
});

IntlHelper.define('time-html', 'mozdatetime', {
  dayperiod: true,
  hour: 'numeric',
  minute: 'numeric',
});

IntlHelper.define('time-text', 'datetime', {
  hour: 'numeric',
  minute: 'numeric',
});

/**
 * Define a singleton method that returns a unified instance
 * based on arguments.
 *
 * @param {function} constructor - A constructor function used
 *        to create a new instance.
 * @param {function} [getKey] - A function called with (arguments),
 *        and returns a lookup key for this singleton.
 * @return {object} - returns the instance either created or retrieved
 *        from the singleton-map by the key.
 */
Utils.singleton = function(constructor, getKey) {
  var singletonMap = new Map();
  return function() {
    var arglist = Array.prototype.slice.call(arguments);
    var key = (typeof getKey === 'function') ? getKey(arglist) : constructor;
    var instance = singletonMap.get(key);
    if (!instance) {
      instance = Object.create(constructor.prototype);
      constructor.apply(instance, arglist);
      singletonMap.set(key, instance);
    }
    return instance;
  };
};

Utils.memoizedDomPropertyDescriptor = function(selector) {
  var memoizedValue = null;
  return {
    get: function() {
      if (memoizedValue === null) {
        memoizedValue = document.querySelector(selector);
      }
      return memoizedValue;
    },
    set: function(value) {
      memoizedValue = value;
    }
  };
};

/**
 * Extend the given prototype object with lazy getters.
 * selectorMap is a mapping of { propertyName: selector }.
 */
Utils.extendWithDomGetters = function(proto, selectorMap) {
  for (var property in selectorMap) {
    Object.defineProperty(proto, property,
      Utils.memoizedDomPropertyDescriptor(selectorMap[property]));
  }
  return proto;
};

Utils.dateMath = {
  /**
   * Convert object literals containing interval length to milliseconds
   *
   * @param {Object|Date|Number} interval An object literal containing days,
   *                                      hours, minutes etc.
   *                                      Optionally a number or date object.
   * @param {Object} opts Options object with a unitsPartial property containing
   *                      (if desired) a restriction on which properties will be
   *                      searched on the interval.
   * @return {Number} Millisecond value for interval length.
   */
  toMS: function(interval, opts) {
    var converted, sign, unitsPartial;

    // if a millisecond interval or a Date is passed in, return that
    if (interval instanceof Date || typeof interval === 'number') {
      return +interval;
    }

    opts = opts || {};
    unitsPartial = opts.unitsPartial || units;
    // Allow for 'hours' or 'hour'
    unitsPartial = unitsPartial.map(function(unit) {
      // String.prototype.endsWith is available in FF17+
      return unit.endsWith('s') ? unit : unit.concat('s');
    });

    // some will exit early when it returns a truthy value
    sign = unitsPartial.some(function(unit) {
      return interval[unit] < 0;
    });
    // Using as a multiplier later
    sign = sign ? -1 : 1;
    // collect passed in units and multiply by their millisecond/unit count
    converted = unitsPartial.map(function(unit) {
      var partial;
      // we're storing the sign out of the iterator
      partial = Math.abs(interval[unit]);
      // A missing property and 0 should be treated the same
      return partial ? partial * dateMultipliers[unit] : 0;
    });

    // add up each millisecond-converted term and multiply total by sign
    return sign * converted.reduce(function(a, b) { return a + b; });
  },
  /**
   * Convert millisecond values to object literals conformable to toMS()
   *
   * @param {Number} interval A millisecond value.
   * @param {Object} [opts] Options object with a unitsPartial property
   *                        containing (if desired) a restriction on which
   *                        properties will be reated for the return value.
   * @return {Object} Object literal with properties as deliniated by opts.
   */
  fromMS: function(interval, opts) {
    var times, sign, unitsPartial;

    opts = opts || {};
    unitsPartial = opts.unitsPartial || units;
    // Allow for 'hours' or 'hour'
    unitsPartial = unitsPartial.map(function(unit) {
      // String.prototype.endsWith is available in FF17+
      return unit.endsWith('s') ? unit : unit.concat('s');
    });
    // For negative intervals (time previous to now)
    // update interval to absolute value and store the sign
    // to apply to all units
    if (interval < 0) {
      sign = -1;
      interval = Math.abs(interval);
    } else {
      sign = 1;
    }

    // divide the time interval by the highest millisecond multiplier
    // store the truncated result and subtract that from the interval
    // update the interval to be the remainder
    times = unitsPartial.map(function(unit, index) {
      var truncated, mult;
      mult = dateMultipliers[unit];
      truncated = Math.floor(interval / mult);
      interval = interval - (truncated * mult);
      // units are either all positive or negative
      // only iterate to needed specificity
      return sign * truncated;
    });

    // Populate the returned object using units as property names
    // and times for values
    return times.reduce(function(out, unitTime, index) {
      out[unitsPartial[index]] = unitTime;
      return out;
    }, {});
  }
};

Utils.extend = function(initialObject, extensions) {
  // extend({}, a, b, c ... d) -> {...}
  // rightmost properties (on 'd') take precedence
  extensions = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < extensions.length; i++) {
    var extender = extensions[i];
    for (var prop in extender) {
      var descriptor = Object.getOwnPropertyDescriptor(extender, prop);
      if (descriptor && descriptor.value !== undefined) {
        initialObject[prop] = extender[prop];
      }
    }
  }
  return initialObject;
};

Utils.escapeHTML = function(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes) {
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }
  return span.innerHTML;
};

Utils.getLocalizedTimeHtml = function(date) {
  var f = IntlHelper.get('time-html');
  return f.format(date, {
    dayperiod: '<small>$&</small>'
  });
};

Utils.getLocalizedTimeText = function(date) {
  var f = IntlHelper.get('time-text');
  return f.format(date);
};

Utils.changeSelectByValue = function(selectElement, value) {
  var options = selectElement.options;
  for (var i = 0; i < options.length; i++) {
    if (options[i].value == value) {
      if (selectElement.selectedIndex != i) {
        selectElement.selectedIndex = i;
      }
      break;
    }
  }
};

Utils.getSelectedValueByIndex = function(selectElement) {
  return selectElement.options[selectElement.selectedIndex].value;
};

var wakeTarget = {
  requests: {
    cpu: new Map(), screen: new Map(), wifi: new Map()
  },
  locks: {
    cpu: null, screen: null, wifi: null
  },
  timeouts: {
    cpu: null, screen: null, wifi: null
  }
};
function getLongestLock(type) {
  var max = 0;
  for (var i of wakeTarget.requests[type]) {
    var request = i[1];
    if (request.time > max) {
      max = request.time;
    }
  }
  return {
    time: max,
    lock: wakeTarget.locks[type],
    timeout: wakeTarget.timeouts[type]
  };
}
Utils.safeWakeLock = function(opts, fn) {
    /*
     * safeWakeLock
     *
     * Create a Wake lock that is automatically released after
     * timeoutMs. Locks are reentrant, and have no meaningful mutual
     * exclusion behavior.
     *
     * @param {Object} options - an object containing
     *                 [type] {string} a string passed to requestWakeLock
     *                                 default = 'cpu'. This string can be any
     *                                 resource exposed by the environment that
     *                                 this application was designed to run in.
     *                                 Gaia exposes three of them: 'cpu',
     *                                 'screen', and 'wifi'. Certified apps may
     *                                 expose more.
     *                 timeoutMs {number} number of milliseconds to hold
     *                                    the lock.
     * @param {Function} callback - a function to be called after all other
     *                              generated callbacks have been called.
     *                              function ([err]) -> undefined.
     */
  opts = opts || {};
  var type = opts.type || 'cpu';
  var timeoutMs = opts.timeoutMs | 0;
  var now = Date.now();
  var myKey = {};
  wakeTarget.requests[type].set(myKey, {
    time: now + timeoutMs
  });
  var max = getLongestLock(type);
  var unlockFn = function() {
    if (!myKey) {
      return;
    }
    wakeTarget.requests[type]. delete(myKey);
    var now = Date.now();
    var max = getLongestLock(type);
    if (max.time > now) {
      clearTimeout(wakeTarget.timeouts[type]);
      wakeTarget.timeouts[type] = setTimeout(unlockFn, max.time - now);
    } else {
      if (wakeTarget.locks[type]) {
        wakeTarget.locks[type].unlock();
      }
      wakeTarget.locks[type] = null;
      clearTimeout(wakeTarget.timeouts[type]);
      wakeTarget.timeouts[type] = null;
    }
    myKey = null;
  };
  clearTimeout(wakeTarget.timeouts[type]);
  wakeTarget.timeouts[type] = setTimeout(unlockFn, max.time - now);
  try {
    if (!wakeTarget.locks[type] && max.time > now) {
      wakeTarget.locks[type] = navigator.requestWakeLock(type);
    }
    fn(unlockFn);
  } catch (err) {
    unlockFn();
    throw err;
  }
};

Utils.async = {

  generator: function(latchCallback) {
    /*
     * Generator
     *
     * Create an async generator. Each time the generator is
     * called, it will return a new callback. When all issued
     * callbacks have been called, the latchCallback is called.
     *
     * If any of the callbacks are called with and error as
     * the first argument, the latchCallback will be called
     * immediately with that error.
     *
     * @latchCallback {Function} a function to be called after
     *           all other generated callbacks have been
     *           called
     *           function ([err]) -> undefined
     */
    var tracker = new Map();
    var issuedCallbackCount = 0;
    var disabled = false;
    var testFn = function(err) {
      var trackerSize;
      if (!disabled) {
        // FF18 defines size to be a method, so we need to test here:
        // Remove with FF18 support
        if (typeof tracker.size === 'function') {
          trackerSize = tracker.size();
        } else {
          trackerSize = tracker.size;
        }
        if (err || trackerSize === issuedCallbackCount) {
          disabled = true;
          latchCallback && latchCallback(err);
        }
      }
    };
    return function() {
      return (function() {
        var i = issuedCallbackCount++;
        return function(err) {
          tracker.set(i, true);
          testFn(err);
        };
      })();
    };
  },

  namedParallel: function(names, latchCallback) {
    /*
     * namedParallel
     *
     * Create an async namedParallel.
     *
     * The return value is an object containing the parameters
     * specified in the names array. Each parameter is set to
     * a callback. When all callbacks have been called, latchCallback
     * is called.
     *
     * If any named callback is called with an error as the first
     * parameter, latchCallback is immediately called with that
     * error. Future calls to callbacks are then no-ops.
     *
     * @names {List<String>} - A list of strings to be used as
     *        parameter names for callbacks on the returned object.
     */
    var generator = Utils.async.generator(latchCallback);
    var done = generator();
    var ret = {};
    for (var i = 0; i < names.length; i++) {
      ret[names[i]] = generator();
    }
    done();
    return ret;
  }

};

Utils.data = {

  defaultCompare: function ud_defaultCompare(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      var diff = a - b;
      return diff !== 0 ? diff / Math.abs(diff) : diff;
    } else if ((typeof a === 'string' || a instanceof String) &&
               (typeof b === 'string' || b instanceof String)) {
      return (a < b) ? -1 : ((a > b) ? 1 : 0);
    } else if (Array.isArray(a) && Array.isArray(b)) {
      var commonLength = Math.min(a.length, b.length);
      for (var i = 0; i < commonLength; i++) {
        var compareResult = Utils.data.defaultCompare(a[i], b[i]);
        if (compareResult !== 0) {
          return compareResult;
        }
      }
      return b.length - a.length;
    } else {
      throw new Error('Cannot compare ' + JSON.stringify([a, b]));
    }
  },

  keyedCompare: function ud_keyedCompare(key) {
    return function internal_keyedCompare(a, b) {
      return Utils.data.defaultCompare(a[key], b[key]);
    };
  },

  binarySearch: function ud_binarySearch(key, list, compare) {
    compare = compare || Utils.data.defaultCompare;
    var botI = 0;
    var topI = list.length;
    var midI, comp, value;
    if (list.length > 0) {
      do {
        midI = botI + ((topI - botI) / 2) | 0;
        value = list[midI];
        comp = compare(value, key);
        if (comp < 0) {
          botI = midI + 1;
        } else if (comp > 0) {
          topI = midI - 1;
        }
      } while (comp !== 0 && botI < topI);
    }
    midI = comp === 0 ? midI : topI;
    value = list[midI];
    if (comp === 0 || value && compare(value, key) === 0) {
      return { match: true, index: midI, value: value };
    } else {
      var index;
      if (0 > midI) {
        index = 0;
      } else if (midI >= list.length) {
        index = list.length;
      } else {
        index = midI + (compare(value, key) < 0 ? 1 : 0);
      }
      return {
        match: false,
        index: index
      };
    }
  },

  sortedInsert: function ud_sortedInsert(item, list, compare, unique) {
    compare = compare || Utils.data.defaultCompare;
    var bs = Utils.data.binarySearch(item, list, compare);
    var inserted = !bs.match || !unique;
    if (inserted) {
      list.splice(bs.index, 0, item);
    }
    return (inserted) ? bs.index : null;
  },

  sortedRemove: function ud_sortedRemove(item, list, compare, multiple) {
    compare = compare || Utils.data.defaultCompare;
    var removed = false;
    if (!multiple) {
      var bs = Utils.data.binarySearch(item, list, compare);
      if (bs.match) {
        list.splice(bs.index, 1);
        removed = true;
      }
    } else {
      var biasedCompare = function(target, result, ic) {
        return function(a, b) {
          if (ic(a, target) === 0) {
            return result;
          } else {
            return ic(a, b);
          }
        };
      };
      var leftBound = Utils.data.binarySearch(item, list,
        biasedCompare(item, 1, compare));
      var rightBound = Utils.data.binarySearch(item, list,
        biasedCompare(item, -1, compare));
      if (leftBound.index < rightBound.index) {
        list.splice(leftBound.index, rightBound.index - leftBound.index);
        removed = true;
      }
    }
    return removed;
  }
};

Utils.addEventListenerOnce = function(element, type, fn, useCapture) {
  var handler = function(evt) {
    element.removeEventListener(type, handler, useCapture);
    fn(evt);
  };
  element.addEventListener(type, handler, useCapture);
};

Utils.summarizeDaysOfWeek = function(repeat) {
  var days = [];
  if (repeat) {
    for (var day in repeat) {
      if (repeat[day]) {
        days.push(day);
      }
    }
  }

  if (days.length === 7) {
    return Promise.resolve('everyday');
  } else if (days.length === 5 &&
             days.indexOf('6') === -1 && // Saturday
             days.indexOf('0') === -1) { // Sunday
    return Promise.resolve('weekdays');
  } else if (days.length === 2 &&
             days.indexOf('6') !== -1 && // Saturday
             days.indexOf('0') !== -1) { // Sunday
    return Promise.resolve('weekends');
  } else if (days.length === 0) {
    return Promise.resolve('never');
  } else {
    var formatter = IntlHelper.get('weekday-short');

    var repeatStrings = [];

    for (var i = 0; i < 7; i++) {
      if (days.indexOf(i.toString()) !== -1) {
        var dayDate = new Date(constants.KNOWN_SUNDAY); 
        dayDate.setDate(constants.KNOWN_SUNDAY.getDate() + i);
        repeatStrings.push(formatter.format(dayDate));
      }
      
    }

    return mozIntl.formatList(repeatStrings).then(listString => {
      return { raw: listString };
    });
  }
};





return Utils;

});

/* global define */
define('audio_manager',['require'],function(require) {
  'use strict';

  /**
   * The Settings App stores volumes in the range [0, 15] inclusive.
   * Whenever we need to play sounds, though, the Audio object
   * requires a float between [0.0, 1.0]. The conversion has to happen
   * somewhere. The AudioManager here draws the line right out of what
   * gets read from mozSettings.
   *
   * In other words, the conversion is not important to clients of
   * this class, who should treat the volume as a float with no
   * conversion. The only weirdness here is that unit tests must be
   * aware of the slight rounding differences when converting from a
   * float to the system level.
   */

  ////////////////////////////////////////////////////////////////
  // VolumeManager

  function isValidVolume(volume) {
    return (typeof volume === 'number' &&
            volume <= 1.0 &&
            volume >= 0.0);
  }

  var VOLUME_SETTING = 'audio.volume.alarm';
  var SYSTEM_VOLUME_MAX = 15;
  function systemVolumeToFloat(volume) {
    return (volume / SYSTEM_VOLUME_MAX);
  }

  function floatToSystemVolume(volume) {
    return Math.round(volume * SYSTEM_VOLUME_MAX);
  }

  function requestAlarmSystemVolume() {
    // Asynchronously load the alarm volume from mozSettings.
    return new Promise(function(resolve, reject) {
      var lock = navigator.mozSettings.createLock();
      var req = lock.get(VOLUME_SETTING);
      req.onsuccess = function() {
        var volume = systemVolumeToFloat(req.result[VOLUME_SETTING]);
        if (isValidVolume(volume)) {
          globalVolumeManager._volume = volume;
          resolve(volume);
        }
      };

      req.onerror = function() {
        var DEFAULT_VOLUME = 1.0;
        resolve(DEFAULT_VOLUME);
      };
    });
  }

  function VolumeManager() {
    this.VOLUME_KEY = 'defaultAlarmVolume';
    this.DEFAULT_VOLUME = 1.0;
    this._volume = this.DEFAULT_VOLUME;

    if (navigator.mozSettings) {
      navigator.mozSettings.addObserver(
        VOLUME_SETTING,
        this.onSystemAlarmVolumeChange.bind(this));
    }
  }

  VolumeManager.prototype = {
    onSystemAlarmVolumeChange: function(e) {
      // don't use the setter here
      this._volume = systemVolumeToFloat(e.settingValue);
    },

    get volume() {
      return this._volume;
    },

    set volume(volume) {
      this.setVolume(volume);
    },

    /** Set the volume with an optional completion callback. */
    setVolume: function(volume, cb) {
      if (isValidVolume(volume)) {
        this._volume = volume;

        if (navigator.mozSettings) {
          var lock = navigator.mozSettings.createLock();

          var opts = {};
          opts[VOLUME_SETTING] = floatToSystemVolume(volume);
          var req = lock.set(opts);

          if (cb) {
            req.onsuccess = cb;
          }
        }
      }
    }

  };

  ////////////////////////////////////////////////////////////////
  // AudioPlayer

  var globalVolumeManager = new VolumeManager();

  /**
   * The AudioPlayer class manages the playback of alarm ringtones. It
   * is lazy-loading, so that you can instantiate it immediately;
   * Audio objects are not actually created or loaded until you need
   * to play a sound.
   */
  function AudioPlayer() {
    this._audio = null;
  }

  AudioPlayer.prototype = {

    /**
     * Play a ringtone from the shared/resources/media/alarms
     * directory, using the current global volume settings by default.
     * You can override the volume through opts.volume.
     *
     * @param {string} ringtoneName
     * @param {number} opts.volume Value between 0 and 1
     */
    playRingtone: function(ringtoneName, opts) {
      var volume = globalVolumeManager.volume;
      if (opts && 'volume' in opts) {
        volume = opts.volume;
      }
      this._prepare(); // Load up the audio element.
      this._audio.pause();
      this._audio.src = 'shared/resources/media/alarms/' + ringtoneName;
      this._audio.load(); // Required per MDN's HTMLMediaElement spec.
      this._audio.volume = volume;
      this._audio.play();
    },

    /**
     * Pause the currently-playing audio, if possible.
     */
    pause: function() {
      if (this._audio) {
        this._audio.pause();
      }
    },

    // Private methods:

    /**
     * Instantiate the Audio element and prepare it for playback.
     * For internal use only.
     * @private
     */
    _prepare: function() {
      if (!this._audio) {
        this._audio = new Audio();
        this._audio.mozAudioChannelType = 'alarm';
        this._audio.loop = true;
      }
    }
  };

  return {
    getAlarmVolume: function() {
      return globalVolumeManager.volume;
    },
    requestAlarmVolume: function() {
      return requestAlarmSystemVolume();
    },
    setAlarmVolume: function(volume, cb) {
      globalVolumeManager.setVolume(volume, cb);
    },
    createAudioPlayer: function() {
      return new AudioPlayer();
    },
    // Exposed for tests:
    systemVolumeToFloat: systemVolumeToFloat,
    floatToSystemVolume: floatToSystemVolume
  };
});


define('panels/alarm/post_message_proxy',['require'],function(require) {
  var objectMap = {}; // Map of object handlers.
  var responseMap = {}; // Map of callbacks awaiting function results.
  var sequenceNumber = 0; // ID for matching requests to responses.

  var PostMessageProxy = {

    /**
     * Create a PostMessageProxy. This returns an object that you can
     * call like any other JavaScript object, by proxying methods
     * through to another window.
     *
     * When you call a method, rather than returning its return value,
     * it reutrns a Promise that you can resolve to get the return
     * value from the remote function.
     *
     * @param whichWindow The window (usually window.parent or a child)
     * @param objectId A string to identify the object you're proxying
     */
    create: function(whichWindow, objectId) {
      return new Proxy({ window: whichWindow }, {
        get: function(target, name) {
          if (name in target) {
            return target[name];
          }
          return function() {
            var args = Array.slice(arguments);
            return new Promise((resolve, reject) => {
              var responseId = ++sequenceNumber;
              responseMap[responseId] = {
                resolve: resolve,
                reject: reject
              };
              target.window.postMessage({
                postMessageProxy: objectId,
                responseId: responseId,
                fn: name,
                args: args
              }, '*');
            });
          };
        }
      });
    },

    /**
     * On the other window, call PostMessateProxy.receive() to hook up
     * an object that processes messages from a proxy in another window.
     */
    receive: function(objectId, obj) {
      objectMap[objectId] = obj;
    },

    /**
     * Handle 'message' events from postMessage, both when receiving a
     * message to invoke a function call, and receiving a message with
     * the return value of that function call. Both callbacks are
     * handled here so that we only bind one listener for each
     * relevant window.
     */
    _messageHandler: function(evt) {
      if (!evt.source || evt.origin !== window.location.origin || !evt.data) return;
      var data = evt.data;
      if (data.postMessageProxy) {
        // Remote side (calling a function):
        var obj = objectMap[data.postMessageProxy];
        var { fn, args, responseId } = data;
        try {
          evt.source.postMessage({
            postMessageProxyResult: responseId,
            result: obj[fn].apply(obj, args)
          }, window.location.origin);
        } catch(e) {
          evt.source.postMessage({
            postMessageProxyResult: responseId,
            exception: e.toString(),
            stack: e.stack
          }, evt.origin);
        }
      } else if (data.postMessageProxyResult) {
        // Local side (return value):
        if (responseMap[data.postMessageProxyResult]) {
          var { resolve, reject } = responseMap[data.postMessageProxyResult];
          delete responseMap[data.postMessageProxyResult];
          if (data.exception) {
            var e = new Error();
            e.name = data.exception;
            e.stack = data.stack;
            reject(e);
          } else {
            resolve(data.result);
          }
        }
      }
    }
  };

  window.addEventListener('message', PostMessageProxy._messageHandler);

  return PostMessageProxy;

});

define('panels/alarm/child_window_manager',['require','utils'],function(require) {
  'use strict';

  var Utils = require('utils');

  const READY_EVENT_TYPE = 'childWindowReady';

  /**
   * ChildWindowManager maintains the lifecycle of a child attention
   * window. When you instantiate a ChildWindowManager, no window
   * exists yet; use .whenReady() or postMessage() to call up the
   * child window and perform actions on it. Provided the child window
   * calls ChildWindowManager.fireReady(), this class takes care of
   * the bookkeeping to make sure that the child window is ready to
   * receive events before sending over any messages. Similarly, this
   * class acquires a CPU wake lock when opening the window to ensure
   * that your messages are delivered reliably without the phone going
   * to sleep while waiting for the child window to receive a message.
   */
  function ChildWindowManager(url) {
    this.url = url;
    this.childWindow = null;
    this.childWindowReady = false;
    this.childOnReadyCallbacks = [];
    this.releaseCpuLock = null;
    window.addEventListener('message', this);
  }

  ChildWindowManager.prototype = {
    /**
     * Post a message to the child window. If the window is not yet
     * open, acquire a CPU wake lock and open the window, then deliver
     * the message. Subsequent calls to postMessage will similarly
     * wait until the window is ready before delivery.
     */
    postMessage: function(message) {
      this.whenReady(() => {
        this.childWindow.postMessage(message, window.location.origin);
      });
    },

    /**
     * Closes the window. You may reinstantiate a window again by
     * sending another postMessage.
     */
    close: function() {
      if (this.childWindow && !this.childWindow.closed) {
        this.childWindow.close();
      }
      this.childWindow = null;
    },

    /**
     * Call a function when the window is ready and opened. This is
     * used internally by postMessage.
     */
    whenReady: function(callback) {
      if (!this.childWindow || this.childWindow.closed) {
        Utils.safeWakeLock({ timeoutMs: 30000 }, (releaseCpu) => {
          this.childWindow = window.VulpesCompat ? VulpesCompat.openAttention(this.url) : window.open(this.url, '_blank', 'attention');
          this.childWindowReady = false;
          this.releaseCpuLock = releaseCpu;
        });
      }
      if (this.childWindowReady) {
        callback();
      } else {
        this.childOnReadyCallbacks.push(callback);
      }
    },

    /** Private. Handle DOM events. */
    handleEvent: function(evt) {
      if (evt.data.type === READY_EVENT_TYPE) {
        this.childWindowReady = true;
        while (this.childOnReadyCallbacks.length) {
          var callback = this.childOnReadyCallbacks.shift();
          callback();
        }
        if (this.releaseCpuLock) {
          this.releaseCpuLock();
        }
      }
    }
  };

  /**
   * Call this method from a child window when the child has loaded.
   * This fires a message to the parent window, instructing it to pass
   * along any queued events.
   */
  ChildWindowManager.fireReady = function() {
    if (!window.opener) {
      throw new Error('fireReady must be called from the child window.');
    }
    window.opener.postMessage({
      type: READY_EVENT_TYPE
    }, window.location.origin);
  };

  return ChildWindowManager;

});

define('ring_view',['require','utils','audio_manager','./panels/alarm/post_message_proxy','./panels/alarm/child_window_manager'],function(require) {
'use strict';

var Utils = require('utils');
var AudioManager = require('audio_manager');
var PostMessageProxy = require('./panels/alarm/post_message_proxy');
var ChildWindowManager = require('./panels/alarm/child_window_manager');

/**
 * RingView displays the alert screen when a timer or alarm fires.
 * This screen may receive multiple different alarm/timer events;
 * ideally it would display all events that fire, but currently it
 * only shows the most recent event.
 */

function whenDocumentReady() {
  return new Promise(function(resolve, reject) {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      const listener = function() {
        if (document.readyState === 'complete') {
          resolve();
          document.removeEventListener('readystatechange', listener);
        }
      };
      document.addEventListener('readystatechange', listener);
    }
  });
}

function RingView() {
  this.alerts = [];
  this.ringtonePlayer = AudioManager.createAudioPlayer();

  this.snoozeButton.addEventListener('click', this.onClickSnooze.bind(this));
  this.closeButton.addEventListener('click', this.onClickClose.bind(this));
  window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  window.addEventListener('timeformatchange', this.refreshDisplay.bind(this));

  this.activeAlarm = PostMessageProxy.create(window.opener, 'activeAlarm');

  PostMessageProxy.receive('ringView', this);

  if (window.opener) {
    // We have to wait for the document.readyState to be complete before
    // we fireReady. Otherwise, when the screen is off, it doesn't get
    // turned back on at all
    whenDocumentReady().then(() => {
      ChildWindowManager.fireReady();
    });
  }
}

// The time, in milliseconds, to keep the screen awake while showing
// an alarm. After this time, the screen shuts off and the alarm
// silences itself.
const WAKE_DURATION = 10 * 60 * 1000;

RingView.prototype = {

  /**
   * Fire the notification for an alarm or timer.
   *
   * Presently, we only display one notification at a time, and the
   * _most recent_ one at that. Each notification gets its own wake
   * lock, ensuring that the screen will remain on for WAKE_DURATION.
   *
   * @param {string} alert.type 'alarm' or 'timer'
   * @param {string} alert.label Label to display (optional).
   * @param {string} alert.sound Filename of a sound to play (optional).
   * @param {boolean} alert.vibrate True if the alert should vibrate.
   */
  addAlert: function(alert) {
    // If we previously had an alert visible, this one is
    // going to override it, as though the previous alert was
    // dismissed.
    if (this.alerts.length) {
      var oldAlert = this.alerts.shift();
      oldAlert.releaseScreenWakeLock();
    }

    alert.releaseScreenWakeLock = function() { };

    if (this._silenceTimeout) {
      clearTimeout(this._silenceTimeout);
      this._silenceTimeout = null;
    }
    this._silenceTimeout = setTimeout(() => {
      this.silence();
      alert.releaseScreenWakeLock();
    }, WAKE_DURATION);

    // Insert this alert at the front of the stack, so that it
    // overrides any previous alert that was being displayed.
    this.alerts.unshift(alert);

    this.refreshDisplay();

    // Acquire a CPU wake lock so that we don't fall asleep waiting
    // for the document to become visible. We'll only try to hold a
    // lock for a few seconds as we wait for the document to become
    // visible, out of an abundance of caution.
    Utils.safeWakeLock({ type: 'cpu', timeoutMs: 5000 }, (releaseCpu) => {
      // When the document is visible, acquire a screen wake lock so
      // that we can safely display the alert.
      this.whenVisible(() => {
          Utils.safeWakeLock({ type: 'screen', timeoutMs: WAKE_DURATION },
                             (releaseScreenWakeLock) => {
            // Once we have acquired the screen wake lock, we can
            // release the CPU lock.
            releaseCpu();

            // Save off the screen wake lock for when we dismiss the
            // alert; all alarms each have their own screen wake lock.
            alert.releaseScreenWakeLock = releaseScreenWakeLock;
        });
      });
    });
  },

  /**
   * Update the display to show the currently active alert. If there
   * are a stack of alerts pending, only the most recent alert is
   * shown, as added to this.alerts by this.addAlert().
   */
  refreshDisplay: function() {
    // First, silence any existing sound or vibration. If a previous
    // alarm was going off, this alarm may have different settings.
    // The new alarm will replace any prior settings.
    this.silence();

    var alert = this.alerts[0];

    // Set the label (blank or falsey becomes a default string).
    if (alert.label) {
      this.ringLabel.removeAttribute('data-l10n-id');
      this.ringLabel.textContent = alert.label;
    } else {
      this.ringLabel.setAttribute('data-l10n-id',
                                  alert.type === 'alarm' ? 'alarm' : 'timer');
    }

    // Display the proper screen widgets.
    this.ringDisplay.dataset.ringType = alert.type;

    var displayedTime;
    if (alert.type === 'alarm') {
      // Display the time as specified with "hour" and "minute". The timestamp
      // stored by mozAlarms does not move when the timezone changes, so we
      // cannot just use the value stored in '.time'. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1178208#c4
      displayedTime = new Date();
      displayedTime.setHours(alert.hour);
      displayedTime.setMinutes(alert.minute);
    } else {
      // XXX: Timers may be affected by timezone changes just like alarms, but
      // the fix here is not as straightforward, since we cannot take the
      // same shortcut as above. Since timers are rarely used across timezone
      // changes (unlike alarms), I'm punting on this for now.
      displayedTime = alert.time;
    }

    // Set the time to display.
    this.time.innerHTML = Utils.getLocalizedTimeText(displayedTime);

    if (alert.sound) {
      this.ringtonePlayer.playRingtone(alert.sound);
    }

    // Vibrate if we want to shakey shakey.
    if (alert.vibrate && ('vibrate' in navigator)) {
      clearInterval(this.vibrateInterval);
      var vibrateOnce = function() {
        navigator.vibrate([1000]);
      };
      this.vibrateInterval = setInterval(vibrateOnce, 2000);
      vibrateOnce();
    }

    document.documentElement.classList.add('ready');

    // If the window has been hidden, show the window.
    if (document.hidden) {
      window.focus();
    }
  },

  /**
   * Stop all sounds and vibration immediately.
   */
  silence: function() {
    // Stop the alert sound, if one was playin'.
    this.ringtonePlayer.pause();

    // Stop vibrating, if we were shakin'.
    clearInterval(this.vibrateInterval);
    this.vibrateInterval = null;
  },

  /**
   * Clean up any state when we close this alert window. This includes
   * silencing the alarm and releasing any locks we have acquired.
   */
  onBeforeUnload: function(evt) {
    // Clean up any wake locks we still have.
    while (this.alerts.length) {
      var alert = this.alerts.shift();
      alert.releaseScreenWakeLock();
    }
    this.silence();
  },

  /**
   * Snooze the current alarm. (The snooze button is only visible for
   * alarms, not timers. Alarms have an ID; timers do not.)
   */
  onClickSnooze: function(evt) {
    var alert = this.alerts[0];
    this.activeAlarm.snoozeAlarm(alert.id).then(() => window.close()).catch(console.error);
  },

  /**
   * Close this window, notifying ActiveAlarm, which will pop the user
   * back to the appropriate location if they are still using the
   * Clock app.
   */
  onClickClose: function(evt) {
    var alert = this.alerts[0];
    this.activeAlarm.close(alert.type, alert.id).then(() => window.close()).catch(console.error);
  },

  /**
   * Call the callback when `document.hidden` is false. Due to a bug
   * in the B2G Browser API <https://bugzil.la/810431>, the window may
   * not be immediately visible, particularly if the screen is off.
   * The recommended workaround for that bug was to use setTimeout. If
   * the page is still hidden after that, we listen for
   * `visibilitychange`. When that bug has some action, we should
   * revisit how much of this method is needed.
   */
  whenVisible: function(cb) {
    if (!document.hidden) {
      cb();
    } else {
      setTimeout(() => {
        if (!document.hidden) {
          cb();
        } else {
          var listener = function(e) {
            if (!document.hidden) {
              document.removeEventListener('visibilitychange', listener);
              cb();
            }
          };
          document.addEventListener('visibilitychange', listener);
        }
      });
    }
  }

};

Utils.extendWithDomGetters(RingView.prototype, {
  time: '#ring-clock-time',
  ringLabel: '#ring-label',
  snoozeButton: '#ring-button-snooze',
  closeButton: '#ring-button-stop',
  ringDisplay: '.ring-display'
});

return RingView;

});


requirejs(['require_config'], function() {
  requirejs(['ring_view'], function(RingView) {
    window.ringView = new RingView();
  });
});

define("onring", function(){});

