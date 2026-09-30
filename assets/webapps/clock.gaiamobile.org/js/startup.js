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



(function(exports) {

  var AccessibilityHelper = {
    /**
     * For a set of tab elements, set aria-selected attribute in accordance with
     * the current selection.
     * @param {Object} selectedTab a tab to select object.
     * @param {Array} tabs an array of tabs.
     */
    setAriaSelected: function ah_setAriaSelected(selectedTab, tabs) {
      // In case tabs is a NodeList, that does not have forEach.
      Array.prototype.forEach.call(tabs, function setAriaSelectedAttr(tab) {
        tab.setAttribute('aria-selected',
          tab === selectedTab ? 'true' : 'false');
      });
    }
  };

  exports.AccessibilityHelper = AccessibilityHelper;

})(window);

define("shared/js/accessibility_helper", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.AccessibilityHelper;
    };
}(this)));

define('tabs',['require','shared/js/accessibility_helper'],function(require) {
'use strict';

var AccessibilityHelper = require('shared/js/accessibility_helper');

/**
 * Abstraction for handling the Tabs links at the bottom of the UI.
 * @param {HTMLElement} element The containing element for the Tabs UI.
 */
function Tabs(element) {
  this.element = element;
  this.links = element.querySelectorAll('a');
  this.element.addEventListener('click', this);
}

/**
 * Update selected attributes for the selected tab.
 * Also emit a 'selected' event with the relevant data.
 */
Tabs.prototype.handleEvent = function tabsHandleEvent(event) {
  AccessibilityHelper.setAriaSelected(event.target, this.links);
};


return Tabs;

});

define('view',['require'],function(require) {
'use strict';
var priv = new WeakMap();
var elementMap = new WeakMap();

/**
 * A View is simply a wrapper around an element.
 *
 * @constructor
 * @param {HTMLElement} element The element that will be wrapped by this view.
 */
function View(element) {
  if (!(this instanceof View)) {
    throw new Error('View must be called as a constructor');
  }
  elementMap.set(element, this);

  Object.defineProperties(this, {
    id: { value: element.id },
    element: { value: element }
  });

  priv.set(this, {
    visible: !element.classList.contains('hidden'),
    pendingVisible: false
  });
}

/**
 * Find or create a view instance for an element.
 *
 * @param {HTMLElement} element The element that will be wrapped by the view.
 * @param {Function} ctor The constructor method for the view, defaults to View.
 */
View.instance = function(element, ctor = View) {
  if (elementMap.has(element)) {
    return elementMap.get(element);
  }
  return new ctor(element);
};

Object.defineProperties(View.prototype, {
  /**
   * View.prototype.visible - set to true or false to toggle the "hidden" class
   * on the element.
   *
   * Also emits a 'visibilitychange' event passing either true or false to show
   * the new visible state.  The event happens before the class is changed to
   * allow time to modify the DOM before something becomes visible.
   */
  visible: {
    get: function() {
      return priv.get(this).visible;
    },
    set: function(value) {
      var state = priv.get(this);
      value = !!value;
      if (state.visible !== value || state.pendingVisible) {
        state.pendingVisible = false;
        state.visible = value;

        var event = new CustomEvent('panel-visibilitychange', {
          detail: {
            isVisible: value
          }
        });
        this.element.dispatchEvent(event);

        if (!value) {
          this.element.classList.add('hidden');
        } else {
          this.element.classList.remove('hidden');
        }
      }
      return value;
    }
  },

  pendingVisible: {
    get: function() {
      return priv.get(this).pendingVisible;
    },
    set: function(value) {
      return (priv.get(this).pendingVisible = !!value);
    }
  }
});

return View;

});

define('sounds',['require','exports','module'],function(require, exports) {
  'use strict';
  
  // Sadly, this is needed because when sound l10n ids change, they no
  // longer match up with the sound filename.
  var DEFAULT_SOUND = 'ac_awake.opus';
  var SOUND_FILE_TO_L10N_ID = {
    '0': 'noSound',
    'ac_awake.opus': 'ac_awake_opus',
    'ac_crystalize.opus': 'ac_crystalize_opus',
    'ac_cycle.opus': 'ac_cycle_opus',
    'ac_digicloud.opus': 'ac_digicloud_opus',
    'ac_humming_waves.opus': 'ac_humming_waves_opus',
    'ac_into_the_void.opus': 'ac_into_the_void_opus',
    'ac_lightly.opus': 'ac_lightly_opus',
    'ac_mobile.opus': 'ac_mobile_opus',
    'ac_pinger.opus': 'ac_pinger_opus',
    'ac_skip.opus': 'ac_skip_opus',
    'ac_tri.opus': 'ac_tri_opus',
    'ac_universal.opus': 'ac_universal_opus'
  };

  exports.normalizeSound = function(sound) {
    // Since ringtones are stored on the system, they may be
    // version-dependent. Ensure the sound exists (based upon our
    // understanding of the available sounds); if not, default to
    // something else.
    if (sound && !SOUND_FILE_TO_L10N_ID.hasOwnProperty(sound)) {
      return DEFAULT_SOUND;
    } else {
      return sound;
    }
  };

  /**
   * Given a sound ID, return the label to be displayed, for instance,
   * on a FormButton.
   */
  exports.formatLabel = function(sound) {
    return (sound === null || sound === '0') ?
      'noSound' : SOUND_FILE_TO_L10N_ID[sound];
  };
});


define('alarm_database',['require','./sounds','alarm','alarm'],function(require) {

  var sounds = require('./sounds');

  /**
   * The AlarmDatabase stores a list of alarms in IndexedDB. All
   * mutation operations return Promises, for easy chaining and state
   * management. This module returns the one-and-only instance of
   * AlarmDatabase.
   */
  function AlarmDatabase(dbName, storeName, version) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;

    this.withDatabase = new Promise((resolve, reject) => {
      var request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        var db = event.target.result;
        // Ensure the object store exists.
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onerror = (() => reject(request.errorCode));
      request.onsuccess = ((event) => resolve(event.target.result));
    }).then((db) => {
      // Only return when all of the alarms have been upgraded.
      return new Promise((resolve, reject) => {
        // Go through existing alarms here, and make sure they conform
        // to the latest spec (upgrade old versions, etc.).
        var transaction = db.transaction(this.storeName, 'readwrite');
        var store = transaction.objectStore(this.storeName);
        var cursor = store.openCursor();
        cursor.onsuccess = (event) => {
          var cursor = event.target.result;
          if (cursor) {
            store.put(this.normalizeAlarmRecord(cursor.value));
            cursor.continue();
          }
        };

        transaction.oncomplete = (() => resolve(db));
        transaction.onerror = ((evt) => reject(evt.target.errorCode));
      });
    }).catch(function(err) {
      // Explicit err.toString() coercion needed to see a message.
      console.error('AlarmDatabase Fatal Error:', err.toString());
    });
  }

  AlarmDatabase.prototype = {

    /**
     * Given an Alarm's JSON data (as returned by IndexedDB),
     * normalize any properties to ensure it conforms to the most
     * current Alarm specification.
     */
    normalizeAlarmRecord: function(alarm) {
      if (!alarm.registeredAlarms) {
        alarm.registeredAlarms = {};
      }

      if (typeof alarm.enabled !== 'undefined') {
        delete alarm.enabled;
      }

      if (typeof alarm.normalAlarmId !== 'undefined') {
        alarm.registeredAlarms.normal = alarm.normalAlarmId;
        delete alarm.normalAlarmId;
      }

      if (typeof alarm.snoozeAlarmId !== 'undefined') {
        alarm.registeredAlarms.snooze = alarm.snoozeAlarmId;
        delete alarm.snoozeAlarmId;
      }

      var newRepeat = {};
      var i;

      // Map '1111100' string bitmap to a repeat object with day properties.
      if (typeof alarm.repeat === 'string') {
        for (i = 0; i < alarm.repeat.length; i++) {
          if (alarm.repeat[i.toString()] === '1') {
            newRepeat[i.toString()] = true;
          }
        }
        alarm.repeat = newRepeat;
      } else if (typeof alarm.repeat === 'object') {
        var keys = Object.keys(alarm.repeat);
        if (keys.length !== 0 && Number.isNaN(parseInt(keys[0]))) {
          var oldKeys = ['sunday', 'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday'];

          for (i = 0; i < keys.length; i++) {
            var index = oldKeys.indexOf(keys[i]);
            if (index !== -1) {
              newRepeat[index] = alarm.repeat[keys[i]];
            }
          }
          alarm.repeat = newRepeat;
        }
      } else {
        alarm.repeat = newRepeat;
      }

      // Pre-April-2014 code may have stored 'vibrate' and 'sound' as
      // the string "0", and hour/minute as strings.
      alarm.sound = sounds.normalizeSound(
        alarm.sound !== '0' ? alarm.sound : null);
      alarm.vibrate = (alarm.vibrate && alarm.vibrate !== '0') || false;
      alarm.hour = parseInt(alarm.hour, 10);
      alarm.minute = parseInt(alarm.minute, 10);

      return alarm;
    },

    /**
     * Execute a database store request with the given method and
     * arguments, returning a Promise that will be fulfilled with the
     * Store's result.
     */
    withStoreRequest: function(method /*, args... */) {
      var args = Array.slice(arguments, 1);
      var readmode = (/get/.test(method) ? 'readonly' : 'readwrite');
      return this.withDatabase.then((database) => {
        var store = database
              .transaction(this.storeName, readmode)
              .objectStore(this.storeName);
        if (method === 'getAll') {
          return objectStoreGetAll(store);
        } else {
          return new Promise((resolve, reject) => {
            var request = store[method].apply(store, args);
            request.onsuccess = (() => resolve(request.result));
            request.onerror = (() => reject(request.errorCode));
          });
        }
      });
    },

    put: function(alarm) {
      var data = alarm.toJSON();
      if (!data.id) {
        delete data.id; // IndexedDB requires _no_ ID key, not null/undefined.
      }
      return this.withStoreRequest('put', data).then((id) => {
        alarm.id = id;
      });
    },

    getAll: function() {
      var Alarm = require('alarm'); // Circular dependency.
      return this.withStoreRequest('getAll').then((alarms) => {
        return alarms.map((data) => new Alarm(data));
      });
    },

    get: function(id) {
      var Alarm = require('alarm'); // Circular dependency.
      return this.withStoreRequest('get', id).then((data) => {
        return new Alarm(data);
      });
    },

    delete: function(id) {
      return this.withStoreRequest('delete', id);
    }
  };


  /**
   * Return all records from an ObjectStore. This function is
   * non-standard, but is such a common pattern that it has actually
   * been included in certain implementations of IndexedDB. It is
   * extracted here for clarity.
   */
  function objectStoreGetAll(objectStore) {
    return new Promise((resolve, reject) => {
      var items = [];
      var cursor = objectStore.openCursor();
      cursor.onerror = reject;
      cursor.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        }
        else {
          resolve(items);
        }
      };
    });
  }

  // For Clock, we only use one database and store, both named 'alarms'.
  // Right now, we're on version 7.
  return new AlarmDatabase('alarms', 'alarms', 7);
});

define('alarm',['require','exports','module','alarm_database','alarm_database','alarm_database','alarm_database'],function(require, exports, module) {
  'use strict';

  /**
   * Alarm represents one alarm instance. It tracks any mozAlarms it
   * has registered, its IndexedDB ID, and any other properties
   * relating to the alarm's schedule and firing options.
   */
  function Alarm(opts) {
    opts = opts || {};
    var now = new Date();
    var defaults = {
      id: null,
      registeredAlarms: {}, // keys: ('normal' or 'snooze') => mozAlarmID
      // Map of weekdays { "0": true, "1": false, ... }
      // "0" is for Sunday in Gregorian calendar
      repeat: {},
      hour: now.getHours(),
      minute: now.getMinutes(),
      label: '',
      sound: 'ac_awake.opus',
      vibrate: true,
      snooze: 10 // Number of minutes to snooze
    };

    for (var key in defaults) {
      this[key] = (key in opts ? opts[key] : defaults[key]);
    }
  }

  Alarm.prototype = {
    toJSON: function() {
      return {
        id: this.id,
        registeredAlarms: this.registeredAlarms,
        repeat: this.repeat,
        hour: this.hour,
        minute: this.minute,
        label: this.label,
        sound: this.sound,
        vibrate: this.vibrate,
        snooze: this.snooze
      };
    },

    /**
     * An alarm is enabled if and only if it has a registeredAlarm set
     * with a type of 'normal'. To disable an alarm, any
     * registeredAlarms are unregistered with mozAlarms and removed
     * from this.registeredAlarms.
     */
    isEnabled: function() {
      for (var i in this.registeredAlarms) {
        // Both 'normal' and 'snooze' registered alarms should be
        // treated as enabled, because the alarm will imminently fire.
        if (i === 'normal' || i === 'snooze') {
          return true;
        }
      }
      return false;
    },

    isRepeating: function() {
      for (var key in this.repeat) {
        if (this.repeat[key]) {
          return true;
        }
      }
      return false;
    },

    getNextAlarmFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      var nextFire = new Date(now.getTime());
      nextFire.setHours(this.hour, this.minute, 0, 0);

      while (nextFire <= now ||
             (this.isRepeating() &&
              !this.repeat[nextFire.getDay().toString()])) {
        nextFire.setDate(nextFire.getDate() + 1);
      }
      return nextFire;
    },

    getNextSnoozeFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      return new Date(now.getTime() + this.snooze * 60 * 1000);
    },

    /**
     * Schedule an alarm to ring in the future.
     *
     * @return {Promise}
     * @param {'normal'|'snooze'} type
     */
    schedule: function(type) {
      var alarmDatabase = require('alarm_database'); // circular dependency

      var firedate, promise;
      if (type === 'normal') {
        promise = this.cancel(); // Cancel both snooze and regular mozAlarms.
        firedate = this.getNextAlarmFireTime();
      } else if (type === 'snooze') {
        promise = this.cancel('snooze'); // Cancel any snooze mozAlarms.
        firedate = this.getNextSnoozeFireTime();
      } else {
        return Promise.reject('Invalid type for Alarm.schedule().');
      }

      // Save the alarm to the database first. This ensures we have a
      // valid ID, and that we've saved any modified properties before
      // attempting to schedule the alarm.
      return promise.then(() => alarmDatabase.put(this)).then(() => {
        return new Promise((resolve, reject) => {
          // Then, schedule the alarm.
          var req = navigator.mozAlarms.add(firedate, 'ignoreTimezone',
                                            { id: this.id, type: type });
          req.onerror = reject;
          req.onsuccess = (evt) => {
            this.registeredAlarms[type] = evt.target.result;
            resolve();
          };
        });
        // After scheduling the alarm, this.registeredAlarms has
        // changed, so we must save that too.
      }).then(() => alarmDatabase.put(this))
        .then(() => {
          this._notifyChanged();
        }).catch((e) => {
          console.log('Alarm scheduling error: ' + e.toString());
          throw e;
        });
    },

    /**
     * Cancel an alarm. If `type` is provided, cancel only that type
     * ('normal' or 'snooze'). Returns a Promise.
     */
    cancel: function(/* optional */ type) {
      var types = (type ? [type] : Object.keys(this.registeredAlarms));
      var alarmDatabase = require('alarm_database'); // circular dependency
      types.forEach((type) => {
        var id = this.registeredAlarms[type];
        navigator.mozAlarms.remove(id);
        delete this.registeredAlarms[type];
      });
      return alarmDatabase.put(this).then(() => {
        this._notifyChanged();
      }).catch((e) => {
        console.log('Alarm cancel error: ' + e.toString());
        throw e;
      });
    },

    _notifyChanged: function(removed) {
      // Only update the application if this alarm was actually saved
      // (i.e. it has an ID).
      if (this.id) {
        var alarmDatabase = require('alarm_database');
        // Updating Alarm info from the DataStore
        alarmDatabase.getAll()
        .then((alarms) => {
          var storeAlarms = [];

          alarms.forEach(function(a) {
            // Grabbing alarms that are 'normal'
            if(a.registeredAlarms.normal) {
              storeAlarms.push(a.getNextAlarmFireTime());
            }
          });

          return this.getNextAlarm(storeAlarms);
        }).then((nextAlarm) => {

          navigator.getDataStores('alarms')
          .then((stores) => {
            return [stores[0].getLength(), stores[0]];
          }).then(([len, store]) => {
            if(0 === len) {
              return store.add(nextAlarm);
            } else {
              return store.put(nextAlarm, 1);
            }
          }).then((id) => {
            if(id) {
              console.log('[Clock] ==== Updated Alarm on LockScreen ====');
            }
          });

        });
        window.dispatchEvent(
          new CustomEvent(removed ? 'alarm-removed' : 'alarm-changed', {
            detail: { alarm: this }
          })
        );
      }
    },

    /**
     * Delete an alarm completely from the database, canceling any
     * pending scheduled mozAlarms.
     */
    delete: function() {
      var alarmDatabase = require('alarm_database'); // circular dependency
      return this.cancel().then(() => {
        return alarmDatabase.delete(this.id).then(() => {
          this._notifyChanged(/* removed = */ true);
        });
      });
    },

    /**
     * Returns the next scheduled alarm within the next 24 hours
     * @param {Array} type 'Date'
     * @returns {Object} This is either an empty obj or hour and minute
     */
    getNextAlarm: function(storeAlarms) {
      var alarmIndex = [],
          nextAlarm = {};

      // remove alarms that have more than 24 hrs
      storeAlarms.forEach( function(val,index) {
        if((val.getTime() - new Date().getTime()) / 36e5 > 24 ) {
          alarmIndex.push(index);
        }
      });

      // remove last index first
      alarmIndex.sort(function(a,b) {
        return b - a;
      });
      alarmIndex.forEach( function(val) {
        storeAlarms.splice(val, 1);
      });

      // sort alarms
      storeAlarms.sort(function(a,b){
        return new Date(a.getTime()) - new Date(b.getTime());
      });

      if(storeAlarms.length > 0) {
        var mins = storeAlarms[0].getMinutes();
        nextAlarm = {
          hour : '' + storeAlarms[0].getHours(),
          minute : mins < 10 ? '0' + mins : '' + mins
        };
      }
      return nextAlarm;
    }

  };


  module.exports = Alarm;

});

/**
 * parse-loose-time v1.0.0
 * https://github.com/millermedeiros/parse-loose-time/
 * released under the MIT License
 */
define('ext/parse_loose_time',['require','exports','module'],function(require, exports, module) {
'use strict';

// Release the ZALGO!
var numeric = /\d{1,2}[^\d]*(\d{2})?/i;
var oclock = /\d+.*o.*clock/i;
var british = /(half|quarter|\d+).*(to|past)[^\d]*\d{1,2}/i;
var knownWords = [
  'noon',
  'noontime',
  'midday',
  'half-day',
  'midnight'
];
// match "p" after digit for "pm"
var rPm = /\d\s*(o.*clock\s*)?p/i;

var checkKnowWords = {
  test: function(str) {
    return knownWords.indexOf(str) !== -1;
  }
};

var map = [
  [checkKnowWords, parseWords],
  [british, parseBritish],
  [oclock, parseOClock],
  [numeric, parseNumeric]
];

module.exports = parseTime;
function parseTime(time) {
  time = time.trim().toLowerCase();
  // node 0.12 don't support Array#find :/
  var fn;
  map.some(function(a) {
    if (a[0].test(time)) {
      fn = a[1];
      return true;
    }
  });
  return fn ? fn(time) : null;
}

function parseNumeric(str) {
  var hour;
  var minute;
  var num = extractNumbers(str);

  switch (num.length) {
    case 4:
      hour = num.slice(0, 2);
      minute = num.slice(2, 4);
      break;
    case 3:
      hour = num.slice(0, 1);
      minute = num.slice(1, 3);
      break;
    case 2:
    case 1:
      hour = num.slice(0, 2);
      minute = 0;
      break;
    default:
      return '';
  }

  hour = Number(hour);
  minute = Number(minute);

  if (num.length === 2 && hour > 24) {
    return null;
  }

  if (hour < 12 && str.match(rPm)) {
    hour += 12;
  }

  return {
    hour: Math.min(hour, 24),
    minute: Math.min(minute, 59)
  };
}

function extractNumbers(str) {
  return str.replace(/[^0-9]/g, '');
}

function parseOClock(str) {
  // yes, we will consider "1:23 o'clock" the same as "1 o'clock"
  var time = parseNumeric(str);
  if (!time) {
    return null;
  }
  time.minute = 0;
  return time;
}

function parseBritish(str) {
  // need to handle case where it is a custom numeric value
  var parts = str.match(/(.+)(to|past)(.+)/i);
  var time = parseNumeric(parts[3]);
  if (!time) {
    return null;
  }

  var diff;
  if (str.indexOf('quarter') !== -1) {
    diff = 15;
  } else if (str.indexOf('half') !== -1) {
    diff = 30;
  } else {
    diff = Number(extractNumbers(parts[1]));
  }

  var isTo = str.indexOf('to') !== -1;
  if (isTo) {
    time.hour -= 1;
    time.minute = 60 - diff;
  } else {
    time.minute = diff;
  }

  return time;
}

function parseWords(str) {
  if (str === 'midnight') {
    return { hour: 0, minute: 0 };
  }
  return { hour: 12, minute: 0 };
}
});

define('connection/alarm',['require','exports','module','alarm','ext/parse_loose_time'],function(require, exports) {
'use strict';

var Alarm = require('alarm');
var parseTime = require('ext/parse_loose_time');

exports.onmessage = function(event, port) {
  if (event.data.type !== 'create') {
    port.postMessage({
      error: `Error: Invalid gaia_alarm message type "${event.data.type}"`
    });
    return;
  }

  var time = event.data.time;
  var timeObject = typeof time === 'object' ? time : parseTime(time);

  if (!isValidTime(timeObject)) {
    port.postMessage({
      error: `Invalid alarm time "${time}"`
    });
    return;
  }

  var alarm = new Alarm(timeObject);
  alarm.schedule('normal').then(() => {
    window.dispatchEvent(new CustomEvent('alarm-changed', {
      detail: { alarm: alarm, showBanner: false }
    }));
    port.postMessage({
      hour: timeObject.hour,
      minute: timeObject.minute,
      time: alarm.getNextAlarmFireTime().getTime()
    });
  }).catch(err => {
    port.postMessage({
      error: `${err.message} ${err.stack}`
    });
  });
};

function isValidTime(time) {
  // time can be "null" and "typeof null === 'object'"
  return time && typeof time === 'object' && 'hour' in time &&
    time.hour >= 0 && time.hour <= 24 && 'minute' in time &&
    time.minute >= 0 && time.minute <= 59;
}

});

/* globals indexedDB */
/**
 * This file defines an asynchronous version of the localStorage API, backed by
 * an IndexedDB database.  It creates a global asyncStorage object that has
 * methods like the localStorage object.
 *
 * To store a value use setItem:
 *
 *   asyncStorage.setItem('key', 'value');
 *
 * If you want confirmation that the value has been stored, pass a callback
 * function as the third argument:
 *
 *  asyncStorage.setItem('key', 'newvalue', function() {
 *    console.log('new value stored');
 *  });
 *
 * To read a value, call getItem(), but note that you must supply a callback
 * function that the value will be passed to asynchronously:
 *
 *  asyncStorage.getItem('key', function(value) {
 *    console.log('The value of key is:', value);
 *  });
 *
 * Note that unlike localStorage, asyncStorage does not allow you to store and
 * retrieve values by setting and querying properties directly. You cannot just
 * write asyncStorage.key; you have to explicitly call setItem() or getItem().
 *
 * removeItem(), clear(), length(), and key() are like the same-named methods of
 * localStorage, but, like getItem() and setItem() they take a callback
 * argument.
 *
 * The asynchronous nature of getItem() makes it tricky to retrieve multiple
 * values. But unlike localStorage, asyncStorage does not require the values you
 * store to be strings.  So if you need to save multiple values and want to
 * retrieve them together, in a single asynchronous operation, just group the
 * values into a single object. The properties of this object may not include
 * DOM elements, but they may include things like Blobs and typed arrays.
 *
 * Unit tests are in apps/gallery/test/unit/asyncStorage_test.js
 */

this.asyncStorage = (function() {
  'use strict';

  var DBNAME = 'asyncStorage';
  var DBVERSION = 1;
  var STORENAME = 'keyvaluepairs';
  var db = null;

  function withDatabase(f) {
    if (db) {
      f();
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function withStoreOnError() {
        console.error('asyncStorage: can\'t open database:',
            openreq.error.name);
      };
      openreq.onupgradeneeded = function withStoreOnUpgradeNeeded() {
        // First time setup: create an empty object store
        openreq.result.createObjectStore(STORENAME);
      };
      openreq.onsuccess = function withStoreOnSuccess() {
        db = openreq.result;
        f();
      };
    }
  }

  function withStore(type, callback, oncomplete) {
    withDatabase(function() {
      var transaction = db.transaction(STORENAME, type);
      if (oncomplete) {
        transaction.oncomplete = oncomplete;
      }
      callback(transaction.objectStore(STORENAME));
    });
  }

  function getItem(key, callback) {
    var req;
    withStore('readonly', function getItemBody(store) {
      req = store.get(key);
      req.onerror = function getItemOnError() {
        console.error('Error in asyncStorage.getItem(): ', req.error.name);
      };
    }, function onComplete() {
      var value = req.result;
      if (value === undefined) {
        value = null;
      }
      callback(value);
    });
  }

  function setItem(key, value, callback) {
    withStore('readwrite', function setItemBody(store) {
      var req = store.put(value, key);
      req.onerror = function setItemOnError() {
        console.error('Error in asyncStorage.setItem(): ', req.error.name);
      };
    }, callback);
  }

  function removeItem(key, callback) {
    withStore('readwrite', function removeItemBody(store) {
      var req = store.delete(key);
      req.onerror = function removeItemOnError() {
        console.error('Error in asyncStorage.removeItem(): ', req.error.name);
      };
    }, callback);
  }

  function clear(callback) {
    withStore('readwrite', function clearBody(store) {
      var req = store.clear();
      req.onerror = function clearOnError() {
        console.error('Error in asyncStorage.clear(): ', req.error.name);
      };
    }, callback);
  }

  function length(callback) {
    var req;
    withStore('readonly', function lengthBody(store) {
      req = store.count();
      req.onerror = function lengthOnError() {
        console.error('Error in asyncStorage.length(): ', req.error.name);
      };
    }, function onComplete() {
      callback(req.result);
    });
  }

  function key(n, callback) {
    if (n < 0) {
      callback(null);
      return;
    }

    var req;
    withStore('readonly', function keyBody(store) {
      var advanced = false;
      req = store.openCursor();
      req.onsuccess = function keyOnSuccess() {
        var cursor = req.result;
        if (!cursor) {
          // this means there weren't enough keys
          return;
        }
        if (n === 0 || advanced) {
          // Either 1) we have the first key, return it if that's what they
          // wanted, or 2) we've got the nth key.
          return;
        }

        // Otherwise, ask the cursor to skip ahead n records
        advanced = true;
        cursor.advance(n);
      };
      req.onerror = function keyOnError() {
        console.error('Error in asyncStorage.key(): ', req.error.name);
      };
    }, function onComplete() {
      var cursor = req.result;
      callback(cursor ? cursor.key : null);
    });
  }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key
  };
}());


define("shared/js/async_storage", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.asyncStorage;
    };
}(this)));

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

define('timer',['require','shared/js/async_storage','utils'],function(require) {
'use strict';

var asyncStorage = require('shared/js/async_storage');
var Utils = require('utils');

var timerPrivate = new WeakMap();

/**
 * Timer
 *
 * Create new or revive existing timer objects.
 *
 * @param {Object} opts Optional timer object to create or revive
 *                      a new or existing timer object.
 *                 - startTime, number time in ms.
 *                 - duration, time to count from `start`.
 *                 - configuredDuration, time requested by user.
 *                 - sound, string sound name.
 *                 - vibrate, boolean, vibrate or not.
 *                 - id, integer, mozAlarm API id number.
 */
function Timer(opts) {
  opts = opts || {};

  var now = Date.now();
  if (opts.id !== undefined) {
    delete opts.id;
  }
  // private properties
  timerPrivate.set(this, Utils.extend({
    state: Timer.INITIAL
  }, extractProtected(opts)));
  // public properties
  Utils.extend(this, {
    startTime: now,
    duration: null,
    configuredDuration: null,
    sound: 'ac_awake.opus',
    vibrate: true
  }, opts);
}

Timer.prototype.constructor = Timer;

/**
 * request - get the persisted Timer object.
 *
 * @param {function} [callback] - called with (err, timer_raw).
 */
Timer.getFromStorage = function(callback) {
  asyncStorage.getItem('active_timer', function(timer) {
    if (timer) {
      // Normalize the timer data. Pre-April-2014 code may have stored
      // 'vibrate' and 'sound' as the string "0".
      timer.sound = (timer.sound !== '0' ? timer.sound : null);
      timer.vibrate = (timer.vibrate && timer.vibrate !== '0');
    }
    callback && callback(timer || null);
  });
};

/**
 * singleton - get the unique persisted Timer object.
 *
 * @param {function} [callback] - called with (err, timer).
 */
var timerSingleton = Utils.singleton(Timer);
Timer.singleton = function tm_singleton(callback) {
  Timer.getFromStorage(function(err, obj) {
    var ts = timerSingleton(obj);
    callback && callback(null, ts);
  });
};

function extractProtected(config) {
  var ret = {};
  var protectedProperties = new Set(['state']);
  for (var i in config) {
    if (protectedProperties.has(i)) {
      ret[i] = config[i];
      delete config[i];
    }
  }
  return ret;
}

/**
 * toSerializable - convert `this` to a serialized format.
 *
 * @return {object} - object representation of this Timer.
 */
Timer.prototype.toSerializable = function timerToSerializable() {
  var timer = Utils.extend({}, this, timerPrivate.get(this));

  // Normalize the data. TODO: Perform this normalization immediately
  // at the getter/setter level when this class is refactored.
  return {
    startTime: timer.startTime,
    duration: timer.duration,
    configuredDuration: timer.configuredDuration,
    sound: (timer.sound !== '0' ? timer.sound : null),
    vibrate: (timer.vibrate !== '0' ? timer.vibrate : null),
    state: timer.state
  };
};

/**
 * save - Save the timer to the database.
 *
 * @param {function} [callback] - callback to call after the timer
 *                                has been saved.
 */
Timer.prototype.save = function timerSave(callback) {
  asyncStorage.setItem('active_timer', this.toSerializable(), function() {
    callback && callback(null, this);
  }.bind(this));
};

/**
 * register - Register the timer with mozAlarm API.
 *
 * @param {function} [callback] - callback to call after the timer
 *                                has been registered.
 */
Timer.prototype.register = function timerRegister(callback) {
  var data = {
    type: 'timer'
  };
  var request;

  // Remove previously-created mozAlarm for this alarm, if necessary.
  this.unregister();

  request = navigator.mozAlarms.add(
    new Date(Date.now() + this.remaining), 'ignoreTimezone', data
  );

  request.onsuccess = (function(ev) {
    this.id = ev.target.result;
    callback && callback(null, this);
  }.bind(this));
  request.onerror = function(ev) {
    callback && callback(ev.target.error);
  };
};

/**
 * commit - save and register the timer as necessary.
 *
 * @param {function} [callback] - callback to call after the timer
 *                                has been registered.
 */
Timer.prototype.commit = function timerCommit(callback) {
  var saveSelf = this.save.bind(this, callback);
  if (this.state === Timer.STARTED) {
    this.register(saveSelf);
  } else {
    this.unregister();
    saveSelf();
  }
};

Timer.prototype.unregister = function timerUnregister() {
  if (typeof this.id === 'number') {
    navigator.mozAlarms.remove(this.id);
  }
};

Object.defineProperty(Timer.prototype, 'remaining', {
  get: function() {
    if (this.state === Timer.INITIAL) {
      return this.configuredDuration;
    } else if (this.state === Timer.PAUSED) {
      return this.duration;
    } else if (this.state === Timer.STARTED) {
      if (typeof this.startTime === 'undefined' ||
          typeof this.duration === 'undefined') {
        return 0;
      }
      var r = (this.startTime + this.duration) - Date.now();
      return r >= 0 ? r : 0;
    }
  }
});

Object.defineProperty(Timer.prototype, 'state', {
  get: function() {
    var priv = timerPrivate.get(this);
    return priv.state;
  }
});

Timer.prototype.start = function timerStart() {
  if (this.state !== Timer.STARTED) {
    var priv = timerPrivate.get(this);
    priv.state = Timer.STARTED;
    this.startTime = Date.now();
    this.duration = (typeof this.duration === 'number') ? this.duration :
      this.configuredDuration;
    window.dispatchEvent(new CustomEvent('timer-start', {
      detail: { remaining: this.remaining }
    }));
    this._tick();
  }
};

Timer.prototype.pause = function timerPause() {
  if (this.state === Timer.STARTED) {
    this.duration = this.remaining; // remaining getter observes private state
    var priv = timerPrivate.get(this);
    priv.state = Timer.PAUSED;
    this.startTime = null;
    this._cancelTick();
    window.dispatchEvent(new CustomEvent('timer-pause', {
      detail: { remaining: this.remaining }
    }));
  }
};

Timer.prototype.cancel = function timerReset() {
  if (this.state !== Timer.INITIAL) {
    var priv = timerPrivate.get(this);
    priv.state = Timer.INITIAL;
    this.startTime = null;
    this.duration = this.configuredDuration;
    this._cancelTick();
    this._dispatchEnd();
  }
};

/**
 * plus Increase the duration and extend the endAt time
 *
 * @param {Number} seconds The time in seconds to add.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.plus = function timerPlus(seconds) {
  // Convert to ms
  var ms = seconds * 1000;

  this.duration += ms;

  return this;
};

Timer.prototype._dispatchEnd = function timerDispatchEnd() {
  // cancel and end are basically the same thing
  window.dispatchEvent(new CustomEvent('timer-end', {
    detail: { remaining: 0 }
  }));
};

Timer.prototype._tick = function timerTick() {
  if (this.state !== Timer.STARTED) {
    return;
  }

  // we cache the previous value posted to avoid triggering multiple "tick"
  // messages for the same second
  var remaining = this.remaining;
  var current = Math.round(remaining / 1000);
  if (current !== this._previousTick) {
    this._previousTick = current;
    window.dispatchEvent(new CustomEvent('timer-tick', {
      detail: { remaining: remaining }
    }));
  }

  if (remaining > 0) {
    // use setTimeout instead of requestAnimationFrame because window will
    // probably be hidden when handling connections
    this._tickTimeout = window.setTimeout(() => this._tick(), 100);
  } else {
    this._dispatchEnd();
  }
};

Timer.prototype._cancelTick = function timerCancelTick() {
  window.clearTimeout(this._tickTimeout);
};

/**
 * Static "const" Timer states.
 */
Object.defineProperties(Timer, {
  INITIAL: { value: 0 },
  STARTED: { value: 1 },
  PAUSED: { value: 2 }
});

return Timer;
});

/**
 * parse-duration v0.1.1
 * Released under the MIT License
 * https://github.com/jkroso/parse-duration
 */
define('ext/parse_duration',['require','exports','module'],function(require, exports, module) {

var duration = /(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-zμ]*)/ig

module.exports = parse

/**
 * conversion ratios
 */

parse.nanosecond =
parse.ns = 1 / 1e6

parse.μs =
parse.microsecond = 1 / 1e3

parse.millisecond =
parse.ms = 1

parse.second =
parse.sec =
parse.s = parse.ms * 1000

parse.minute =
parse.min =
parse.m = parse.s * 60

parse.hour =
parse.hr =
parse.h = parse.m * 60

parse.day =
parse.d = parse.h * 24

parse.week =
parse.wk =
parse.w = parse.d * 7

parse.month = parse.d * (365.25 / 12)

parse.year =
parse.yr =
parse.y = parse.d * 365.25

/**
 * convert `str` to ms
 *
 * @param {String} str
 * @return {Number}
 */

function parse(str){
  var result = 0
  // ignore commas
  str = str.replace(/(\d),(\d)/g, '$1$2')
  str.replace(duration, function(_, n, units){
    units = parse[units]
      || parse[units.toLowerCase().replace(/s$/, '')]
      || 1
    result += parseFloat(n, 10) * units
  })
  return result
}

});

define('connection/timer',['require','exports','module','timer','ext/parse_duration'],function(require, exports) {
'use strict';

var Timer = require('timer');
var parseDuration = require('ext/parse_duration');
var port;
var timer;

exports.onstart = function(request) {
  port = request.port;

  window.addEventListener('timer-start', onTimerEvent);
  window.addEventListener('timer-pause', onTimerEvent);
  window.addEventListener('timer-end', onTimerEvent);
  window.addEventListener('timer-tick', onTimerEvent);
};

exports.onclose = function() {
  port = null;
  timer = null;

  window.removeEventListener('timer-start', onTimerEvent);
  window.removeEventListener('timer-pause', onTimerEvent);
  window.removeEventListener('timer-end', onTimerEvent);
  window.removeEventListener('timer-tick', onTimerEvent);
};

function onTimerEvent(evt) {
  if (!port) {
    return;
  }

  port.postMessage({
    type: evt.type,
    remaining: evt.detail.remaining
  });
}

exports.onmessage = function(event) {
  if (timer) {
    exec(event);
  } else {
    Timer.singleton((err, t) => {
      timer = t;
      exec(event);
    });
  }
};

function exec(event) {
  var { type, duration } = event.data;
  if (type === 'create') {
    create(duration);
    return;
  }
  // type: [start, pause, cancel]
  timer[type]();
  timer.commit();
}

function create(inputDuration) {
  var duration = parseDuration(String(inputDuration));

  if (!duration) {
    port.postMessage({
      error: `Invalid timer duration "${inputDuration}"`
    });
    return;
  }

  // we don't check the timer state since we assume the user wants to override
  // any running timer and start it immediately
  timer.duration = duration;
  timer.start();
  timer.commit();
}

});

define('connection/handler',['require','exports','module','./alarm','./timer'],function(require, exports) {
'use strict';

var handlers = {
  'gaia_alarm': require('./alarm'),
  'gaia_timer': require('./timer')
};

exports.init = function() {
  navigator.mozSetMessageHandler('connection', req => {
    var port = req.port;
    var handler = handlers[req.keyword];

    if (!handler) {
      console.error(`can't find handler for connection "${req.keyword}"`);
      return;
    }

    // IACMessagePort don't support onstart & onclose events as of 2015-07-21
    // but for timer we do need to emulate this behavior
    if (handler.onstart) {
      handler.onstart(req);
    }

    if (handler.onmessage || handler.onclose) {
      port.onmessage = event => {
        if (event.data.type === 'close' && handler.onclose) {
          handler.onclose(req);
          return;
        }
        handler.onmessage && handler.onmessage(event, port);
      };
    }
  });
};

});

define('app',['require','tabs','view','connection/handler'],function(require) {
'use strict';
/* global IntlHelper */

var Tabs = require('tabs');
var View = require('view');
var connectionHandler = require('connection/handler');



/**
 * Global Application event handling and paging
 */
var App = {
  /**
   * Load the Tabs and Panels, attach events and navigate to the default view.
   */
  init: function() {
    connectionHandler.init();
    IntlHelper.define('digit-nopadding', 'number', {
      style: 'decimal',
      useGrouping: false
    });
    this.tabs = new Tabs(document.getElementById('clock-tabs'));

    window.addEventListener('hashchange', this);
    window.addEventListener('visibilitychange', this);
    // Tell audio channel manager that we want to adjust the alarm channel
    // if the user press the volumeup/volumedown buttons in Clock.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'alarm';
    }

    this.visible = !document.hidden;
    this.panels = Array.prototype.map.call(
      document.querySelectorAll('[data-panel-id]'),
      function(element) {
        var panel = {
          el: element,
          fragment: element.dataset.panelId.replace('_', '-') + '-panel',
          instance: null
        };

        return panel;
      }.bind(this)
    );

    window.performance.mark('navigationLoaded');

    this.navigate({ hash: '#alarm-panel' }, function() {
      // Dispatch an event to mark when we've finished loading.
      // At this point, the navigation is usable, and the primary
      // alarm list tab has begun loading.
      window.performance.mark('navigationInteractive');
    }.bind(this));
    return this;
  },

  /**
   * Load and instantiate the specified panel (when necessary).
   *
   * @param {Object} panel - An object describing the panel. It must contain
   *                         either an `el` attribute (defining the panel's
   *                         containing element) or an `instance` attribute
   *                         (defining the instantiated Panel itself).
   * @param {Function} [callback] - A function that will be invoked with the
   *                                instantiated panel once it is loaded.
   */
  loadPanel: function(panel, callback) {
    if (panel.instance) {
      callback && setTimeout(callback, 0, panel);
      return;
    }

    var moduleId = 'panels/' + panel.el.dataset.panelId + '/main';

    require([moduleId], function(PanelModule) {
      panel.instance = View.instance(panel.el, PanelModule);
      callback && callback(panel);
    });
  },

  alarmListLoaded: function() {
    // Performance testing markers. See <https://bugzil.la/996038>.
    // At this point, the alarm list has been loaded, and all facets
    // of Clock are now interactive. The other panels are lazily
    // loaded when the user switches tabs.
    window.performance.mark('visuallyLoaded');
    window.performance.mark('contentInteractive');
    window.performance.mark('fullyLoaded');
  },

  /**
   * split each event handler into it's own method
   */
  handleEvent: function(event) {
    var handler = this['on' + event.type];
    if (handler) {
      return handler.apply(this, arguments);
    }
  },

  /**
   * navigate between pages.
   *
   * @param {object} data Options for navigation.
   * @param {string} data.hash The hash of the panel id.  I.E. '#alarm-panel'.
   * @param {function} callback Callback to invoke when done.
   */
  navigate: function(data, callback) {
    var currentIndex = this.panels.indexOf(this.currentPanel);
    this.panels.forEach(function(panel, panelIndex) {
      if ('#' + panel.fragment === data.hash) {
        this.loadPanel(panel, function() {
          var instance = panel.instance;
          instance.navData = data.data || null;
          instance.active = true;
          instance.visible = true;
          if (currentIndex !== -1 && currentIndex !== panelIndex) {
            var direction = currentIndex < panelIndex;
            requestAnimationFrame(function startAnimation(oldPanel) {
              instance.transition =
                direction ? 'slide-in-right' : 'slide-in-left';

              oldPanel.instance.transition =
                direction ? 'slide-out-left' : 'slide-out-right';
            }.bind(null, this.currentPanel));
          }
          this.currentPanel = panel;
          callback && callback();
        }.bind(this));
      } else {
        if (panel.instance) {
          panel.instance.active = false;
        }
      }
    }, this);
    this.currentHash = data.hash;
  },

  /**
   * Navigate to the new hash.
   */
  onhashchange: function(event) {
    if (this.currentHash === location.hash) {
      return;
    }
    this.navigate({ hash: location.hash });
  },

  /**
   * Whenever the application gains/loses focus, inform the current panel of
   * its visibility loss.
   */
  onvisibilitychange: function(event) {
    this.visible = !document.hidden;
    if (this.currentPanel) {
      this.currentPanel.visible = this.visible;
    }
  }
};

return App;

});



define('startup_init', ['require','app'],function(require) {
  var App = require('app');
  App.init();
});

require(['require_config'], function() {
  requirejs(['startup_init']);
});

define("startup", function(){});

define('panel',['require','view'],function(require) {
'use strict';
var View = require('view');
var priv = new WeakMap();

/**
 * A Panel is a "full screen" style tab/dialog.  Panels have an active state
 * which can be true or false, and can transition in and out using CSS3
 * classes and animation events.
 *
 * @constructor
 * @param {HTMLElement} element The element to wrap.
 */
function Panel(element) {
  View.apply(this, arguments);
  priv.set(this, {
    active: element.classList.contains('active'),
    transition: false
  });
  element.addEventListener('animationend', this);
}

Panel.prototype = Object.create(View.prototype);

/**
 * Handles the "animationend" event.  Sets the transition state to false
 * and hides the element if the Panel is not active.
 */
Panel.prototype.handleEvent = function(event) {
  if (event.target !== this.element) {
    return;
  }
  // remove visibility if transition finishes on non-active view
  if (!this.active) {
    this.visible = false;
  }
  this.transition = false;
};

Object.defineProperties(Panel.prototype, {
  /**
   * Panel.prototype.active - Boolean
   *
   * Sets the internal active state, and adds or removes the "active"
   * class on the element.
   */
  active: {
    get: function() {
      return priv.get(this).active;
    },
    set: function(value) {
      var state = priv.get(this);
      value = !!value;
      if (state.active !== value) {
        state.active = value;
        if (value) {
          this.element.classList.add('active');
        } else {
          this.pendingVisible = true;
          this.element.classList.remove('active');
        }
      }
      return value;
    }
  },
  /**
   * Panel.prototype.transition - String or false
   *
   * Sets the internal transition state.  When set, adds the class specified
   * to the element, removing the old transition class if it exists.
   *
   * When set to false, it removes the current transition class.
   */
  transition: {
    get: function() {
      return priv.get(this).transition;
    },
    set: function(value) {
      var state = priv.get(this);
      if (value) {
        if (state.transition) {
          this.element.classList.remove(state.transition);
        }
        this.element.classList.add(value);
      } else if (state.transition) {
        this.element.classList.remove(state.transition);
      }
      state.transition = value;
      return value;
    }
  }
});

return Panel;

});

define('panels/alarm/clock_view',['require','shared/js/async_storage','utils'],function(require) {
'use strict';
 /* global IntlHelper */

var asyncStorage = require('shared/js/async_storage');
var Utils = require('utils');
var SETTINGS_CLOCKMODE = 'settings_clockoptions_mode';
var viewMode = null;

IntlHelper.define('date-long', 'mozdatetime', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
});

// Retrieve stored view mode data as early as possible.
asyncStorage.getItem(SETTINGS_CLOCKMODE, function(value) {

  // If no value has been stored, don't update
  // the viewMode closure.
  if (value === null) {
    return;
  }
  // If the ClockView hasn't initialized yet,
  // and the stored value is different from
  // the arbitrarily chosen default view (analog)
  // then update the viewMode closure.
  if (!ClockView.isInitialized && viewMode !== value) {
    viewMode = value;
  }
});

var ClockView = {
  get mode() {
    // Closure value, stored in settings,
    // or the default (analog)
    return viewMode;
  },

  set mode(value) {
    // If the `mode` is being updated to a new value:
    //
    //    - Update the viewMode closure
    //    - Store the new value in persistent data storage
    //
    // Always return `value`
    if (viewMode !== value) {
      viewMode = value;
      asyncStorage.setItem(
        SETTINGS_CLOCKMODE, value
      );
    }
    return viewMode;
  },

  timeouts: {
    analog: null,
    dayDate: null,
    digital: null
  },

  get digital() {
    delete this.digital;
    return (this.digital = document.getElementById('digital-clock'));
  },

  get analog() {
    delete this.analog;
    return (this.analog = document.getElementById('analog-clock'));
  },

  get time() {
    delete this.time;
    return (this.time = document.getElementById('clock-time'));
  },

  get dayDate() {
    delete this.dayDate;
    return (this.dayDate = document.getElementById('clock-day-date'));
  },

  get container() {
    delete this.container;
    return (this.container =
      document.getElementById('analog-clock-container'));
  },
  isInitialized: false,

  init: function cv_init() {
    var handler = this.handleEvent.bind(this);

    document.addEventListener('visibilitychange', handler);

    this.analog.addEventListener('click', handler, false);
    this.digital.addEventListener('click', handler, false);
    window.addEventListener('alarm-list-changed',
                            this.resizeAnalogClock.bind(this));

    this.hands = {};
    ['second', 'minute', 'hour'].forEach(function(hand) {
      this.hands[hand] = document.getElementById(hand + 'hand');
    }, this);
    // Kick off the day date display (upper left string)
    this.updateDayDate();

    // This will get fired on language change
    IntlHelper.observe('date-long', this.updateDayDate.bind(this));

    // Those two will get fired on language and timeformat changes
    IntlHelper.observe('time-html', this.updateDigitalClock.bind(this));
    IntlHelper.observe('time-text', this.updateAnalogClock.bind(this));

    // If the attempt to request and set the viewMode
    // closure early has failed to respond before the
    // call to ClockView.init(), make an async request,
    // passing the response value as an argument to this.show()
    if (this.mode === null) {
      asyncStorage.getItem(
        SETTINGS_CLOCKMODE, this.show.bind(this)
      );
    } else {
      // Display the clock face
      this.show();
    }

    this.isInitialized = true;
  },

  updateDayDate: function cv_updateDayDate() {
    var d = new Date();
    var f = IntlHelper.get('date-long');

    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                            d.getMinutes() * 60 * 1000 -
                            d.getMilliseconds();

    // If the date of the month is part of the locale format as a
    // number, insert bold tags to accentuate the number itself.
    var dateString = f.format(d, {
      day: '<b>$&</b>'
    });

    this.dayDate.innerHTML = dateString;

    this.timeouts.dayDate = setTimeout(
      this.updateDayDate.bind(this), remainMillisecond
    );
  },

  update: function cv_update(opts) {
    opts = opts || {};

    if (this.mode === 'digital') {
      this.updateDigitalClock(opts);
    } else {
      this.updateAnalogClock(opts);
    }
  },

  updateDigitalClock: function cv_updateDigitalClock(opts) {
    opts = opts || {};

    // this function may be called manually, reset the timer
    clearTimeout(this.timeouts.digital);

    var d = new Date();
    this.time.innerHTML = Utils.getLocalizedTimeHtml(d);
    this.timeouts.digital = setTimeout(
      this.updateDigitalClock.bind(this), (60 - d.getSeconds()) * 1000
    );
  },

  updateAnalogClock: function cv_updateAnalogClock(opts) {
    opts = opts || {};

    // this function may be called manually, reset the timer
    clearTimeout(this.timeouts.analog);

    if (opts.needsResize) {
      this.resizeAnalogClock();
    }
    var now = new Date();
    var sec, min, hour;
    sec = now.getSeconds();
    min = now.getMinutes();
    // hours progress gradually
    hour = (now.getHours() % 12) + min / 60;
    this.setTransform('second', sec);
    this.setTransform('minute', min);
    this.setTransform('hour', hour);

    // Update aria label for analog view.
    this.container.setAttribute('aria-label', Utils.getLocalizedTimeText(now));

    // update again in one second
    this.timeouts.analog = setTimeout(
      this.updateAnalogClock.bind(this), 1000 - now.getMilliseconds()
    );
  },

  setTransform: function cv_setTransform(id, angle) {
    var hand = this.hands[id];
    // return correct angle for different hands
    function conv(timeFrag) {
      var mult;
      // generate a conformable number to rotate about
      // 30 degrees per hour 6 per second and minute
      mult = id === 'hour' ? 30 : 6;
      // we generate the angle from the fractional sec/min/hour
      return (timeFrag * mult);
    }
    // Use transform rotate on the rect itself vs on a child element
    // avoids unexpected behavior if either dur and fill are set to defaults
    // Use translateZ to force it on its own layer, which will invoke the GPU
    // and thus do the minimum amount of work required (reduces power usage)
    hand.style.transform = 'rotate(' + conv(angle) + 'deg) translateZ(1px)';
  },

  handleEvent: function cv_handleEvent(event) {
    var newMode, target;

    switch (event.type) {
      case 'visibilitychange':
        if (document.hidden) {
          if (this.timeouts.dayDate) {
            clearTimeout(this.timeouts.dayDate);
          }
          if (this.timeouts.digital) {
            clearTimeout(this.timeouts.digital);
          }
          if (this.timeouts.analog) {
            clearTimeout(this.timeouts.analog);
          }
          return;
        } else if (!document.hidden) {
          // Refresh the view when app return to foreground.
          this.updateDayDate();
          this.update();

        }
        break;

      case 'click':
        target = event.target;

        if (!target) {
          return;
        }

        if (this.digital.contains(target) ||
            target.id === 'digital-clock') {

          newMode = 'analog';
        }

        if (this.analog.contains(target) ||
            target.id === 'analog-clock') {

          newMode = 'digital';
        }

        if (newMode) {
          this.show(newMode);
        }

        break;
    }
  },

  calAnalogClockType: function cv_calAnalogClockType(count) {
    var type = 'small';
    if (count < 2) {
      type = 'large';
    } else if (count === 2) {
      type = 'medium';
    }
    return type;
  },

  getAlarmCount: function() {
    return document.querySelectorAll('#alarms .alarm-item').length;
  },

  resizeAnalogClock: function cv_resizeAnalogClock() {
    var type = this.calAnalogClockType(this.getAlarmCount());
    this.container.className = type;
    document.getElementById('alarms').className = 'count' + type;
  },

  show: function cv_show(mode) {
    var isAnalog = false;
    var previous, hiding, showing;

    if (location.hash !== '#alarm-panel') {
      location.hash = '#alarm-panel';
    }

    // The clock display mode is either
    //
    //    - Explicitly passed as the mode param
    //    - Set as a property of ClockView
    //    - Default to "analog"
    //
    mode = mode || this.mode || 'analog';

    isAnalog = mode === 'analog';

    // Determine what to hide and what to show
    previous = isAnalog ? 'digital' : 'analog';
    hiding = isAnalog ? this.digital : this.analog;
    showing = isAnalog ? this.analog : this.digital;

    // Clear any previously created timeouts.
    if (this.timeouts[previous]) {
      clearTimeout(
        this.timeouts[previous]
      );
    }

    hiding.classList.remove('visible');
    showing.classList.add('visible');

    // Update the locally stored `mode`.
    this.mode = mode;

    // This MUST be called after this.mode is set
    // to ensure that the correct mode is used for
    // updating the clockface
    this.update({
      needsResize: true
    });
  }
};

return ClockView;
});

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  'use strict';

  var priv = new WeakMap();
  var rmatcher = /\$\{([^}]+)\}/g;
  var rentity = /[&<>"']/g;
  var rentities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
  };

  function extract(node) {
    var nodeId;
    // Received an ID string? Find the appropriate node to continue
    if (typeof node === 'string') {
      nodeId = node;
      node = document.getElementById(node);
    } else if (node) {
      nodeId = node.id;
    }

    if (!node) {
      console.error(
        'Can not find the node passed to Template', nodeId
      );
      return '';
    }

    // No firstChild means no comment node.
    if (!node.firstChild) {
      console.error(
        'Node passed to Template should have a comment node', nodeId
      );
      return '';
    }

    // Starting with the container node's firstChild...
    node = node.firstChild;

    do {
      // Check if it's the comment node that we're looking for...
      if (node.nodeType === Node.COMMENT_NODE) {
        return (node.nodeValue || '').trim();
      }
      // If the current child of the container node isn't
      // a comment node, it's likely a text node, so hop to
      // the nextSibling and repeat the operation.
    } while ((node = node.nextSibling));

    console.error(
      'Nodes passed to Template should have a comment node', nodeId
    );
    return '';
  }


  /**
   * Template
   *
   * Initialize a template instance from a string or node
   *
   * @param {String} idOrNode id string of existing node.
   *        {Object} idOrNode existing node.
   *
   */
  function Template(idOrNode) {
    if (!(this instanceof Template)) {
      return new Template(idOrNode);
    }
    // Storing the extracted template string as a private
    // instance property prevents direct access to the
    // template once it's been initialized.
    priv.set(this, {
      idOrNode: idOrNode
    });
  }

  Template.prototype.extract = function() {
    var members = priv.get(this);
    if (!members.tmpl) {
      members.tmpl = extract(members.idOrNode);
      delete members.idOrNode;
    }
    return members.tmpl;
  };

  /**
   * template.toString()
   *
   * Safe, read-only access to the template string
   *
   */
  Template.prototype.toString = function() {
    // Return a copy of the stored template string.
    return this.extract().slice();
  };

  /**
   * template.interpolate
   *
   * Interpolate template string with values provided by data object.
   * Optionally allow properties to retain HTML that is known to be safe.
   *
   * @param {Object} data   - key/value properties correspond to substitution,
   *                        with keys as identifiers in template string and
   *                        values as replacement strings.
   *
   * @param {Object} [options]      - optional
   * @param {Array}  options.safe   - array of identifiers in the data parameter
   *                                that contain HTML that is known and
   *                                are "known" to ignore.
   *                                Unless identifiers are listed here,
   *                                there corresponding string will be escaped.
  */
  Template.prototype.interpolate = function(data = {}, options = {}) {
    var safeList = options.safe;

    if (safeList && !Array.isArray(safeList)) {
      throw new TypeError(
        `If present "options.safe" must be an Array, not ${typeof options.safe}`
      );
    }

    var hasSafeProperties = safeList && safeList.length;

    return this.extract().replace(rmatcher, function(match, property) {
      property = property.trim();

      if (!(property in data)) {
        throw new Error(
          `No value provided for template identifier "${property}"`
        );
      }

      var unsafeString = data[property];

      if (typeof unsafeString !== 'string') {
        throw new TypeError(
          `"data.${property}" must be a String, not ${typeof unsafeString}`
        );
      }

      var isPropertySafe = hasSafeProperties && safeList.includes(property);

      return isPropertySafe ?
        // If the property is explicitly listed as "safe"
        // return the string of rendered markup
        unsafeString:
        // Otherwise the string is to be treated as suspicious
        Template.escape(unsafeString);
    });
  };

  /**
   * Prepares object that can provide either interpolated template string with
   * values provided by data object or ready DocumentFragment. Optionally allows
   * properties to retain HTML that is known to be safe.
   *
   * @param {Object} data Properties correspond to substitution i.e. identifiers
   * in the template string.
   * @param {Object} options Optional options object. Currently supported only
   * "safe" option - a list of properties that contain HTML that is known to be
   * safe and don't need to be additionally escaped.
   * @return {{ toString: function, toDocumentFragment: function }}
   */
  Template.prototype.prepare = function(data, options) {
    var self = this;

    return {
      toString: function t_toString() {
        return self.interpolate(data, options);
      },

      toDocumentFragment: function t_toDocumentFragment() {
        var template = document.createElement('template');
        template.innerHTML = this.toString();
        return template.content.cloneNode(true);
      }
    };
  };

  Template.escape = function escape(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str.replace(rentity, function(s) {
      return rentities[s];
    });
  };

  exports.Template = Template;

}(this));

define("shared/js/template", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.Template;
    };
}(this)));

define('template',['require','shared/js/template'],function(require) {
'use strict';
var Template = require('shared/js/template');

function ClockTemplate(text) {
  var srcNode = document.createElement('div');
  var comment = document.createComment(text);
  srcNode.appendChild(comment);
  return new Template(srcNode);
}

return ClockTemplate;
});

define('text',{
  pluginBuilder: './text_builder',
  load: function(name, req, onload, config) {
    'use strict';
    var url = req.toUrl(name),
        xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.onreadystatechange = function(evt) {
      var status, err;
      if (xhr.readyState === 4) {
        status = xhr.status;
        if (status > 399 && status < 600) {
          //An http 4xx or 5xx error. Signal an error.
          err = new Error(url + ' HTTP status: ' + status);
          err.xhr = xhr;
          onload.error(err);
        } else {
          onload(xhr.responseText);
        }
      }
    };
    xhr.responseType = 'text';
    xhr.send(null);
  }
});



define('text!banner/banner.html',[],function () { return '<p data-l10n-id="${noticeId}" data-l10n-args="${noticeArgs}"></p>\n';});

define('banner/main',['require','template','utils','text!banner/banner.html'],function(require) {
  'use strict';

  var Template = require('template');
  var Utils = require('utils');
  var html = require('text!banner/banner.html');

  function Banner(node) {
    // Accept a reference to an element or the element id
    if (typeof node === 'string') {
      this.notice = document.getElementById(node);
    } else {
      this.notice = node;
    }
    // Accept an optional reference to template element id
    this.tmpl = new Template(html);
    // Store a reference to timeout to debounce banner
    this.timeout = null;
    return this;
  }

  Banner.prototype = {

    constructor: Banner,

    render: function bn_render(alarmTime) {
      var timeLeft, tl, countdownType, localTimes;

      timeLeft = +alarmTime - Date.now();
      // generate human readable numbers to pass to localization function
      tl = Utils.dateMath.fromMS(timeLeft, {
        unitsPartial: ['days', 'hours', 'minutes']
      });

      if (tl.days) {
        countdownType = 'countdown_moreThanADay';
        localTimes = {
          'days': tl.days,
          'hours': tl.hours
        };
      } else if (tl.hours > 0) {
        countdownType = 'countdown_moreThanAnHour';
        localTimes = {
          'hours': tl.hours,
          'minutes': tl.minutes
        };
      } else {
        countdownType = 'countdown_lessThanAnHour';
        localTimes = {
          'minutes': tl.minutes
        };
      }

      return {
        noticeId: countdownType,
        noticeArgs: JSON.stringify(localTimes)
      };
    },

    show: function bn_show(alarmTime) {
      // Render the Banner notice
      this.notice.innerHTML = this.tmpl.interpolate(
        this.render(alarmTime)
      );
      // 'visible' class controls the animation
      this.notice.classList.add('visible');
      // use this object rather than a function to retain context
      this.notice.addEventListener('click', this);
      // Debounce timer in case alarms are added more quickly than 4 seconds
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      // After 4 seconds, remove the banner
      this.timeout = setTimeout(this.hide.bind(this), 4000);
    },

    hide: function bn_hide() {
      this.notice.classList.remove('visible');
      this.notice.removeEventListener('click', this);
    },

    handleEvent: function bn_handleEvent() {
      this.hide();
    }
  };

  return Banner;
});

define('tmpl',[], function() {
  'use strict';

  var tmpl = {
    pluginBuilder: './tmpl_builder',

    toDom: function(text) {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        var node = temp.children[0];
        return node;
    },

    load: function(id, require, onload, config) {
      require(['text!' + id], function(text) {
        onload(tmpl.toDom(text));
      });
    }
  };

  return tmpl;
});


define('tmpl!panels/alarm/list_item.html',['tmpl'], function (tmpl) { return tmpl.toDom('<li class="alarm-cell">\n  <label class="alarmList alarmEnable">\n    <input class="input-enable" data-id="" type="checkbox">\n    <span></span>\n  </label>\n  <a href="#alarm-edit-panel" class="alarm-item" data-id="">\n    <span class="time"></span>\n    <span class="label"></span>\n    <span class="repeat"></span>\n  </a>\n</li>\n'); });


define('async_queue',['require'],function(require) {

  /**
   * A serial queue of functions. Call `.push()` to add a function to
   * the task; when each function completes (as a result of calling
   * 'done()'), the next item in the queue will be executed.
   */
  function AsyncQueue() {
    this.queue = [];
    this.current = null;
  }

  AsyncQueue.prototype = {
    /**
     * Add a function to the execution queue. It should accept one
     * argument, a 'done' callback.
     */
    push: function(fn) {
      if (!this.current) {
        this._startTask(fn);
      } else {
        this.queue.push(fn);
      }
    },

    _startTask: function(fn) {
      this.current = fn;
      fn(this._nextTask.bind(this));
    },

    _nextTask: function() {
      this.current = null;
      if (this.queue.length) {
        this._startTask(this.queue.shift());
      }
    }
  };

  return AsyncQueue;
});


define('panels/alarm/alarm_list',['require','banner/main','alarm_database','utils','app','tmpl!panels/alarm/list_item.html','async_queue'],function(require) {
'use strict';
/* global IntlHelper */

var Banner = require('banner/main');
var alarmDatabase = require('alarm_database');
var Utils = require('utils');
var App = require('app');
var alarmTemplate = require('tmpl!panels/alarm/list_item.html');
var AsyncQueue = require('async_queue');

/**
 * AlarmListPanel displays the list of alarms on the Clock tab.
 */
function AlarmListPanel(element) {
  this.alarms = element;

  this.newAlarmButton.addEventListener(
    'click', this.onClickNewAlarm.bind(this));
  this.alarms.addEventListener('click', this.onClickAlarmItem.bind(this));

  this.banner = new Banner('banner-countdown');

  alarmDatabase.getAll().then((alarms) => {
    for (var i = 0; alarms && i < alarms.length; i++) {
      this.addOrUpdateAlarm(alarms[i]);
    }
    this.updateAlarmStatusBar();
    App.alarmListLoaded();
  });

  // This will be fired on language and timeformat changes
  IntlHelper.observe('time-html', this.refreshDisplay.bind(this));

  window.addEventListener('alarm-changed', (evt) => {
    var alarm = evt.detail.alarm;
    this.addOrUpdateAlarm(alarm);
    if (evt.detail.showBanner) {
      this.banner.show(alarm.getNextAlarmFireTime());
    }
    this.updateAlarmStatusBar();
  });
  window.addEventListener('alarm-removed', (evt) => {
    this.removeAlarm(evt.detail.alarm);
    this.updateAlarmStatusBar();
  });
}

AlarmListPanel.prototype = {
  alarmIdMap: {},

  refreshDisplay: function(evt) {
    for (var key in this.alarmIdMap) {
      var alarm = this.alarmIdMap[key];
      this.addOrUpdateAlarm(alarm);
    }
  },

  onClickNewAlarm: function(evt) {
    evt.preventDefault();
    App.navigate({ hash: '#alarm-edit-panel', data: null });
  },

  onClickAlarmItem: function(evt) {
    var link = evt.target;
    var alarm = this.alarmIdMap[link.dataset.id];
    if (link.classList.contains('input-enable')) {
      this.toggleAlarm(alarm, link.checked);
    } else if (link.classList.contains('alarm-item')) {
      App.navigate({ hash: '#alarm-edit-panel', data: alarm });
      evt.preventDefault();
    }
  },

  /**
   * Render an alarm into a DOM node.
   *
   * @param alarm The alarm to render.
   * @param {Element} [li] Existing element to re-use, if any.
   */
  renderAlarm: function(alarm) {
    var li = (this.alarms.querySelector('#alarm-' + alarm.id) ||
              alarmTemplate.cloneNode(true));

    var isActive = ('normal' in alarm.registeredAlarms ||
                    'snooze' in alarm.registeredAlarms);

    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);

    li.id = 'alarm-' + alarm.id;
    li.dataset.id = alarm.id;

    var enableButton = li.querySelector('.input-enable');
    enableButton.dataset.id = alarm.id;
    enableButton.checked = isActive;

    var link = li.querySelector('.alarm-item');
    link.classList.toggle('with-repeat', alarm.isRepeating());
    link.dataset.id = alarm.id;

    li.querySelector('.time').innerHTML = Utils.getLocalizedTimeHtml(d);
    if (alarm.label) {
      li.querySelector('.label').removeAttribute('data-l10n-id');
      li.querySelector('.label').textContent = alarm.label;
    } else {
      li.querySelector('.label').setAttribute('data-l10n-id', 'alarm');
    }
    if (alarm.isRepeating()) {
      Utils.summarizeDaysOfWeek(alarm.repeat).then(l10nId => {
        if (typeof l10nId === 'string') {
          li.querySelector('.repeat').setAttribute('data-l10n-id', l10nId);
        } else if (l10nId.raw) {
          li.querySelector('.repeat').removeAttribute('data-l10n-id');
          li.querySelector('.repeat').textContent = l10nId.raw;
        }
      });
    } else {
      li.querySelector('.repeat').removeAttribute('data-l10n-id');
      li.querySelector('.repeat').textContent = '';
    }
    return li;
  },

  refreshClockView: function() {
    window.dispatchEvent(new CustomEvent('alarm-list-changed'));
  },

  addOrUpdateAlarm: function(alarm) {
    this.alarmIdMap[alarm.id] = alarm;
    var li = this.renderAlarm(alarm);
    var liId = parseInt(li.dataset.id, 10) || null;

    // Go through the list of existing alarms, inserting this alarm
    // before the first alarm that has a lower ID than this one.
    var node = this.alarms.firstChild;
    while (true) {
      var nodeId = (node ? parseInt(node.dataset.id, 10) : -1);
      if (nodeId < liId) {
        this.alarms.insertBefore(li, node);
        break;
      }
      node = node.nextSibling;
    }
    this.refreshClockView();
  },

  removeAlarm: function(alarm) {
    delete this.alarmIdMap[alarm.id];
    var li = this.alarms.querySelector('#alarm-' + alarm.id);
    if (li) {
      li.parentNode.removeChild(li);
    }
    this.refreshClockView();
  },

  toggleAlarmQueue: new AsyncQueue(),

  /**
   * Toggle an alarm's enabled state. To ensure that the database
   * state remains consistent with the DOM, perform operations
   * serially in a queue.
   *
   * @param {Alarm} alarm
   * @param {boolean} enabled
   * @param {function} callback Optional callback.
   */
  toggleAlarm: function(alarm, enabled) {
    this.toggleAlarmQueue.push((done) => {
      if (enabled) {
        alarm.schedule('normal').then(() => {
          this.addOrUpdateAlarm(alarm);
          this.updateAlarmStatusBar();

          if (alarm.isEnabled()) {
            this.banner.show(alarm.getNextAlarmFireTime());
          }
        }).then(done, done);
      } else {
        alarm.cancel().then(done);
      }
    });
  },

  updateAlarmStatusBar: function() {
    if (navigator.mozSettings) {
      var anyAlarmEnabled = false;
      for (var id in this.alarmIdMap) {
        if (this.alarmIdMap[id].isEnabled()) {
          anyAlarmEnabled = true;
          break;
        }
      }
      navigator.mozSettings.createLock().set({
        'alarm.enabled': anyAlarmEnabled
      });
    }
  }

};

Utils.extendWithDomGetters(AlarmListPanel.prototype, {
  title: '#alarms-title',
  newAlarmButton: '#alarm-new'
});


return AlarmListPanel;

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

define('panels/alarm/active_alarm',['require','app','alarm_database','timer','utils','./child_window_manager','./post_message_proxy'],function(require) {
  'use strict';

  var App = require('app');
  var alarmDatabase = require('alarm_database');
  var Timer = require('timer');
  var Utils = require('utils');
  var ChildWindowManager = require('./child_window_manager');
  var PostMessageProxy = require('./post_message_proxy');

  /**
   * ActiveAlarm handles the system event that fires when an alarm
   * goes off. This includes opening an attention window and updating
   * an alarm's schedule when the user taps 'snooze'. The interaction
   * is mediated through a PostMessageProxy (as `this.ringView`),
   * which makes it trivial to interact with a JavaScript object
   * hosted in another window.
   */
  function ActiveAlarm() {
    this.alertWindow = new ChildWindowManager(
      window.location.origin + '/onring.html');

    // Handle the system's alarm event.
    navigator.mozSetMessageHandler('alarm', this.onMozAlarm.bind(this));
    window.addEventListener('test-alarm', this.onMozAlarm.bind(this));

    // Handle events transparently from the child window.
    PostMessageProxy.receive('activeAlarm', this);
    this.ringView = PostMessageProxy.create(null, 'ringView');
  }

  function logForAlarmDebugging() {
    // The following logs are included for debugging reported
    // problems with alarm firing times: <https://bugzil.la/1052245>
    console.log('[Clock] =====================================\n');
    console.log('[Clock] Alarm Debug:', JSON.stringify({
      'now': new Date().toJSON(),
      'tz': new Date().getTimezoneOffset()
    }));

    alarmDatabase.getAll().then((alarms) => {
      console.log('[Clock] ===== Raw IndexedDB Alarm Data: =====\n');
      // Logging in a loop to ensure we don't overrun the line buffer:
      alarms.forEach(function(a) {
        console.log('[Clock]   ', JSON.stringify(a.toJSON()));
      });
      console.log('[Clock] -------------------------------------\n');
    });

    var request = navigator.mozAlarms.getAll();
    request.onsuccess = function() {
      console.log('[Clock] ======= Remaining mozAlarms: ========\n');

      if (!request.result) {
        console.log('[Clock] mozAlarm API invariant failure?');
      } else {
        request.result.forEach(function(alarm) {
          console.log('[Clock]   ', JSON.stringify(alarm));
        });
      }

      console.log('[Clock] -------------------------------------\n');
    };

    request.onerror = function() {
      console.error('[Clock] Failed to get list of mozAlarms:', this.error);
    };
  }

  // Log at startup.
  logForAlarmDebugging();

  // Log periodically when the Clock app is running.
  setInterval(logForAlarmDebugging, 10 * 60 * 1000);

  ActiveAlarm.prototype = {

    /**
     * Fired when the system triggers an alarm. We acquire a wake lock
     * here to ensure that the system doesn't fall asleep before we
     * have a chance to present the attention alert window.
     */
    onMozAlarm: function(message) {
      // message.detail in only for marionette test.
      // We pass it via AlarmActions.fire method.
      var data = message.data || message.detail;
      data.date = message.date || message.detail.date;

      console.log('[Clock] ### ALARM FIRED! ### Details:',
                  JSON.stringify(message));

      logForAlarmDebugging(message);

      Utils.safeWakeLock({ timeoutMs: 30000 }, (done) => {
        switch (data.type) {
        case 'normal':
        case 'snooze':
          this.onAlarmFired(data, done);
          break;
        case 'timer':
          this.onTimerFired(data, done);
          break;
        }
      });
    },

    /**
     * Add `alert` to the attention screen. The child alert window
     * expects to receive any number of alert messages; if the child
     * window has not been presented yet, this function opens the
     * window before passing along the alert.
     *
     * An Alert object (which can represent a timer or an alarm)
     * adheres to the following structure:
     *
     * @param {Alert} alert An alert to pass to the child window.
     * @param {string} alert.type 'alarm' or 'timer'
     * @param {string} [alert.label] Optional label
     * @param {string} [alert.sound] Optional filename of a sound to play
     * @param {boolean} alert.vibrate True if the alarm should vibrate
     * @param {Date} alert.time The time the alert was supposed to fire
     * @param {string} [alert.id] The ID of the alert, if type === 'alarm'
     */
    popAlert: function(alert) {
      this.alertWindow.whenReady(() => {
        this.ringView.window = this.alertWindow.childWindow;
        this.ringView.addAlert(alert);
      });
    },

    /**
     * Handle an alarm firing. Immediately reschedule the alarm for
     * its next firing interval (if the alarm was a repeat alarm).
     *
     * @param {object} message The message as retrieved by mozAlarm
     * @param {function} done Callback to release the wake lock.
     */
    onAlarmFired: function(data, done) {
      var id = data.id;
      var date = data.date;
      var type = data.type;

      alarmDatabase.get(id).then((alarm) => {
        this.popAlert({
          type: 'alarm',
          label: alarm.label,
          sound: alarm.sound,
          vibrate: alarm.vibrate,
          time: date,
          hour: alarm.hour,
          minute: alarm.minute,
          id: alarm.id
        });

        if (type === 'normal') {
          // The alarm instance doesn't yet know that a mozAlarm has
          // fired, so we call .cancel() to wipe this mozAlarm ID from
          // alarm.registeredAlarms().
          alarm.cancel();

          if (alarm.isRepeating()) {
            alarm.schedule('normal').then(done);
          } else {
            done();
          }
        } else if (type === 'snooze') {
          // Inform the Alarm instance that a mozAlarm snooze has fired.
          alarm.cancel('snooze');
          done();
        } else {
          done();
        }
      });
    },

    /**
     * Handle a timer firing.
     *
     * @param {object} message The message as retrieved by mozAlarm
     * @param {function} done Callback to release the wake lock.
     */
    onTimerFired: function(data, done) {
      Timer.getFromStorage((timer) => {
        this.popAlert({
          type: 'timer',
          label: timer.label,
          sound: timer.sound,
          vibrate: timer.vibrate,
          time: new Date(timer.startTime + timer.duration)
        });
        done();
      });
    },

    /**
     * Snooze the given alarm.
     *
     * @param {string} alarmId The ID of the alarm.
     */
    snoozeAlarm: function(alarmId) {
      alarmDatabase.get(alarmId).then((alarm) => {
        alarm.schedule('snooze');
      });
    },

    /**
     * Close the current alert window.
     *
     * @param {string} type 'alarm' or 'timer'
     * @param {string} alarmId The ID of the alarm, if type === 'alarm'
     */
    close: function(type, alarmId) {
      this.alertWindow.close();
      if (type === 'timer') {
        App.navigate({ hash: '#timer-panel' });
        Timer.singleton(function(err, timer) {
          if (!err) {
            timer.cancel();
            timer.save();
          }
        });
      } else if (type === 'alarm') {
        App.navigate({ hash: '#alarm-panel' });
      }
    }
  };

  return ActiveAlarm;
});


define('text!panels/alarm/panel.html',[],function () { return '<div id="clock-view">\n  <div id="analog-clock">\n    <div id="analog-clock-container" role="img">\n      <div id="analog-clock-face">\n        <div id="analog-clock-hands">\n          <div class="analog-clock-hand" id="secondhand"></div>\n          <div class="analog-clock-hand" id="minutehand"></div>\n          <div class="analog-clock-hand" id="hourhand"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div id="digital-clock">\n    <div id="digital-clock-face">\n      <span id="clock-time"></span>\n    </div>\n  </div>\n  <div id="clock-day-date"></div>\n  <!--  create new alarm icon -->\n  <button id="alarm-new" data-l10n-id="newAlarmButton"></button>\n  <!-- list of exisiting alarms, to be populated -->\n  <ul id="alarms"></ul>\n</div>\n<section id="banner-countdown" role="status">\n  <!-- this will be replaced dynamically -->\n</section>\n';});

define('panels/alarm/main',['require','panel','panels/alarm/clock_view','panels/alarm/alarm_list','panels/alarm/active_alarm','text!panels/alarm/panel.html'],function(require) {
'use strict';

var Panel = require('panel');
var ClockView = require('panels/alarm/clock_view');
var AlarmListPanel = require('panels/alarm/alarm_list');
var ActiveAlarm = require('panels/alarm/active_alarm');
var html = require('text!panels/alarm/panel.html');

function AlarmPanel() {
  Panel.apply(this, arguments);

  this.element.innerHTML = html;
  ClockView.init();
  this.alarmListPanel = new AlarmListPanel(document.getElementById('alarms'));
  this.activeAlarm = new ActiveAlarm();
}

AlarmPanel.prototype = Object.create(Panel.prototype);

return AlarmPanel;
});

