define('views/current_time',['require','exports','module','shared/intl_helper','view','common/calc','time_observer'],function(require, exports, module) {
'use strict';

var IntlHelper = require('shared/intl_helper');
var View = require('view');
var createDay = require('common/calc').createDay;
var timeObserver = require('time_observer');

var activeClass = View.ACTIVE;

IntlHelper.define('current-time', 'mozdatetime', {
  hour: 'numeric',
  minute: 'numeric',
  dayperiod: false,
});

function CurrentTime(options) {
  this._container = options.container;
  // timespan can be injected later! this is just a convenience
  this.timespan = options.timespan;
  this._sticky = options.sticky;
  this.activate = this.activate.bind(this);
  this._tick = this._tick.bind(this);
}
module.exports = CurrentTime;

CurrentTime.prototype = {
  _create: function() {
    if (this.element) {
      return;
    }

    this.element = document.createElement('div');
    this.element.setAttribute('aria-hidden', true);
    this.element.classList.add('md__current-time');
    this._container.appendChild(this.element);
  },

  refresh: function() {
    this._clearInterval();

    if (this._previousOverlap) {
      this._previousOverlap.classList.remove('is-hidden');
    }

    this._unmarkCurrentDay();
    this._hide();
    this.activate();
  },

  activate: function() {
    if (!this.timespan.containsNumeric(Date.now())) {
      this._maybeActivateInTheFuture();
      return;
    }

    this._create();
    this.element.classList.add(activeClass);
    this._tick();
  },

  _maybeActivateInTheFuture: function() {
    var now = Date.now();
    var diff = this.timespan.start - now;
    if (diff >= 0) {
      // if timespan is in the "future" we make sure it will start rendering
      // the current time as soon as it reaches 00:00:00 of the first day
      // inside timespan (eg. current time is 2014-05-22T23:59:50 and user is
      // viewing 2014-05-23 until past midnight)
      this._clearInterval();
      timeObserver.once('day', this.activate);
    }
  },

  deactivate: function() {
    this._clearInterval();
    this._hide();
  },

  _hide: function() {
    if (this.element) {
      this.element.classList.remove(activeClass);
    }
  },

  destroy: function() {
    this.deactivate();
    if (this.element) {
      this._container.removeChild(this.element);
    }
  },

  _clearInterval: function() {
    timeObserver.off('day', this.activate);
    timeObserver.off('minute', this._tick);
  },

  _tick: function() {
    this._clearInterval();
    if (!this.timespan.contains(new Date())) {
      this.deactivate();
      this._unmarkCurrentDay();
      return;
    }
    this._render();
    timeObserver.once('minute', this._tick);
  },

  _render: function() {
    var now = new Date();

    var formatter = IntlHelper.get('current-time');
    this.element.textContent = formatter.format(now);

    this.element.dataset.date = now;
    this.element.dataset.l10nDateFormat = 'current-time';
    this.element.id = 'current-time-indicator';

    var hour = now.getHours();
    var elapsedMinutes = (hour * 60) + now.getMinutes();
    var totalMinutes = 24 * 60;
    var percentage = ((elapsedMinutes / totalMinutes) * 100);
    // we limit the position between 0.5-99.5% to avoid cropping the text
    this.element.style.top = Math.max(Math.min(percentage, 99.5), 0.5) + '%';

    this._checkOverlap(hour);
    this._markCurrentDay(now);
  },

  _checkOverlap: function(hour) {
    // we only need to check the current hour (with current design there is
    // no way to overlap previous/next hours)
    var displayHour = this._container.querySelector(
      `.md__hour-${hour} .md__display-hour`
    );

    displayHour.classList.toggle('is-hidden', this._intersect(displayHour));

    // just in case last time it checked was against a different hour
    if (this._previousOverlap && this._previousOverlap !== displayHour) {
      this._previousOverlap.classList.remove('is-hidden');
    }

    this._previousOverlap = displayHour;
  },

  _intersect: function(displayHour) {
    var b1 = this.element.getBoundingClientRect();
    var b2 = displayHour.getBoundingClientRect();

    return (
      b1.left <= b2.right &&
      b2.left <= b1.right &&
      b1.top <= b2.bottom &&
      b2.top <= b1.bottom
    );
  },

  _markCurrentDay: function(date) {
    if (!this._sticky) {
      return;
    }

    var day = createDay(date);
    var selector = `.md__allday[data-date="${day}"] .md__day-name`;
    var header = this._sticky.querySelector(selector);

    if (header) {
      header.classList.add('is-today');
    }

    if (this._previousHeader !== header) {
      this._unmarkCurrentDay();
    }

    this._previousHeader = header;
  },

  _unmarkCurrentDay: function() {
    if (this._previousHeader) {
      this._previousHeader.classList.remove('is-today');
    }
  }
};

});

/* global Buffer */
define('querystring',['require','exports','module'],function(require, exports) {
'use strict';

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}


function charCode(c) {
  return c.charCodeAt(0);
}


// a safe fast alternative to decodeURIComponent
exports.unescapeBuffer = function(s, decodeSpaces) {
  var out = new Buffer(s.length);
  var state = 'CHAR'; // states: CHAR, HEX0, HEX1
  var n, m, hexchar;

  for (var inIndex = 0, outIndex = 0; inIndex <= s.length; inIndex++) {
    var c = s.charCodeAt(inIndex);
    switch (state) {
      case 'CHAR':
        switch (c) {
          case charCode('%'):
            n = 0;
            m = 0;
            state = 'HEX0';
            break;
          case charCode('+'):
            if (decodeSpaces) {
              c = charCode(' ');
            }
            out[outIndex++] = c;
            break;
          default:
            out[outIndex++] = c;
        }
        break;

      case 'HEX0':
        state = 'HEX1';
        hexchar = c;
        if (charCode('0') <= c && c <= charCode('9')) {
          n = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          n = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          n = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = c;
          state = 'CHAR';
          break;
        }
        break;

      case 'HEX1':
        state = 'CHAR';
        if (charCode('0') <= c && c <= charCode('9')) {
          m = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          m = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          m = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = hexchar;
          out[outIndex++] = c;
          break;
        }
        out[outIndex++] = 16 * n + m;
        break;
    }
  }

  // TODO support returning arbitrary buffers.

  return out.slice(0, outIndex - 1);
};


exports.unescape = function(s, decodeSpaces) {
  return exports.unescapeBuffer(s, decodeSpaces).toString();
};


exports.escape = function(str) {
  return encodeURIComponent(str);
};

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};


exports.stringify = exports.encode = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return Object.keys(obj).map(function(k) {
      var ks = exports.escape(stringifyPrimitive(k)) + eq;
      if (Array.isArray(obj[k])) {
        return obj[k].map(function(v) {
          return ks + exports.escape(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + exports.escape(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) {
    return '';
  }
  return exports.escape(stringifyPrimitive(name)) + eq +
         exports.escape(stringifyPrimitive(obj));
};

// Parse a key=val string.
exports.parse = exports.decode = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    try {
      k = decodeURIComponent(kstr);
      v = decodeURIComponent(vstr);
    } catch (e) {
      k = exports.unescape(kstr, true);
      v = exports.unescape(vstr, true);
    }

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (Array.isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

});

define('utils/dom',['require','exports','module'],function(require, exports) {
'use strict';

/**
 * Gets the element absolute offset top relative to the window top.
 */
exports.absoluteOffsetTop = function(el) {
  var top = 0;
  while (el) {
    var pos = window.getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'relative') {
      top += el.offsetTop;
    }
    el = el.parentElement;
  }
  return top;
};

/**
 * Gets the closest (parent) element that matches the given selector.
 */
exports.closest = function(el, selector) {
  while (el) {
    if (matches(el, selector)) {
      return el;
    }
    el = el.parentElement;
  }
};

function matches(el, selector) {
  // "matches" is only unprefixed on Fx 34
  return 'matches' in el ?
    el.matches(selector) :
    el.mozMatchesSelector(selector);
}

/**
 * converts HTML string into a DOM element
 */
exports.buildElement = function(html) {
  var fragment = document.createElement('div');
  fragment.innerHTML = html;
  return fragment.firstChild;
};

/**
 * detach elements from DOM
 * supports single element or array-like objects
 */
exports.removeElements = function(els) {
  if (!els) {
    return;
  }
  els = 'length' in els ? Array.from(els) : Array.from(arguments);
  els.forEach(el => {
    el && el.parentNode && el.parentNode.removeChild(el);
  });
};

});

define('views/hour_double_tap',['require','exports','module','querystring','utils/dom','utils/dom','common/calc'],function(require, exports, module) {
'use strict';

// this will be replaced later for a better logic (see Bug 992728) but it was
// too much to do in a single patch, so for now we do a simple double tap
// without any visual feedback (similar to the old day view behavior)

var QueryString = require('querystring');
var absoluteOffsetTop = require('utils/dom').absoluteOffsetTop;
var closest = require('utils/dom').closest;
var createDay = require('common/calc').createDay;

function HourDoubleTap(options) {
  this.main = options.main;
  this.daysHolder = options.daysHolder;
  this.alldaysHolder = options.alldaysHolder;
  this.hourHeight = options.hourHeight;

  this._onDayTap = this._onDayTap.bind(this);
  this._onAllDayTap = this._onAllDayTap.bind(this);
  this.removeAddEventLink = this.removeAddEventLink.bind(this);
}
module.exports = HourDoubleTap;

HourDoubleTap.prototype = {

  _isActive: false,

  _addEventLink: null,

  setup: function() {
    this._mainOffset = absoluteOffsetTop(this.main);
    this.daysHolder.addEventListener('click', this._onDayTap);
    this.alldaysHolder.addEventListener('click', this._onAllDayTap);
  },

  destroy: function() {
    this.removeAddEventLink();
    this.daysHolder.removeEventListener('click', this._onDayTap);
    this.alldaysHolder.removeEventListener('click', this._onAllDayTap);
  },

  /**
   * If the event target is an existing event, the method finds whether the tap
   * was _really_ on the existing event, to account for possible event
   * retargeting that's not desirable in that case.
   *
   * @param {MouseEvent} evt This is the event to check.
   * @returns {Boolean} True if we tapped on a child of a day.
   */
  _isEventRightOnEventLink(evt) {
    var target = evt.target;
    if (!target.classList.contains('md__day')) {
      // Could be aggressive event fuzzing registering a tap on an existing
      // event or the "add event" UI, where the tap is really below that item.
      // See bug 1210201.

      // In this case, offsetY is the vertical space between the top of the
      // target element and the actual tap, so if the tap is bigger than the
      // height of the element, or smaller than 0, the tap really happened out
      // of the element.
      var tappedOnExistingEvent =
        // intentionally keeping retargeting behavior for the `add` button.
        target.classList.contains('md__add-event') ||
        target.classList.contains('md__event') &&
        evt.offsetY >= 0 &&
        evt.offsetY <= target.getBoundingClientRect().height;

      if (tappedOnExistingEvent) {
        return true;
      }
    }

    return false;
  },

  _onDayTap: function(evt) {
    if (this._isEventRightOnEventLink(evt)) {
      return;
    } else {
      // Having this in the `else` block is a hint to the reader that we could
      // remove it if the event retargeting gets smarter and we don't need this
      // `if` anymore.

      // It works because the event handler for the <a> is actually on `window`
      // and checks if the event was defaultPrevented. Check js/ext/page.js.

      // Until Bug 1091889 gets fixed we'll still get the :active
      // styles because they're being applied with `touchstart` and we can't
      // defaultPrevent this event without breaking everything.
      evt.preventDefault();
    }

    var target = evt.target.closest('.md__day');

    var y = evt.clientY + this.main.scrollTop - this._mainOffset;
    var hour = Math.floor(y / this.hourHeight);
    var baseDate = new Date(target.dataset.date);

    this._onTap(target, {
      startDate: addHours(baseDate, hour).toString(),
      endDate: addHours(baseDate, hour + 1).toString()
    }, hour);
  },

  _onAllDayTap: function(evt) {
    var target = evt.target;
    if (!target.classList.contains('md__allday-events')) {
      return;
    }

    var startDate = new Date(closest(target, '.md__allday').dataset.date);

    this._onTap(target, {
      isAllDay: true,
      startDate: startDate.toString(),
      endDate: createDay(startDate, startDate.getDate() + 1).toString()
    }, null, evt.mozInputSource);
  },

  _onTap: function(container, data, hour, source) {
    hour = hour || 0;

    if (this._addEventLink) {
      this.removeAddEventLink();
      return;
    }

    var link = document.createElement('a');
    link.href = '/event/add/?' + QueryString.stringify(data);
    link.className = 'md__add-event gaia-icon icon-newadd';
    link.dataset.l10nId = 'multi-day-new-event-link';
    link.style.top = (hour * this.hourHeight) + 'px';
    link.style.opacity = 0;

    link.addEventListener('click', this.removeAddEventLink);

    container.appendChild(link);
    this._addEventLink = link;

    // Initiated by a screen reader on double tap.
    if (source === 0) {
      link.click();
      return;
    }

    // opacity will trigger transition, needs to happen after nextTick
    setTimeout(() => {
      this._addEventLink && (this._addEventLink.style.opacity = 1);
    });
  },

  removeAddEventLink: function() {
    var link = this._addEventLink;
    if (!link) {
      return;
    }

    link.removeEventListener('click', this.removeAddEventLink);

    link.addEventListener('transitionend', function onTransitionEnd() {
      link.removeEventListener('transitionend', onTransitionEnd);
      link.parentNode && link.parentNode.removeChild(link);
    });
    link.style.opacity = 0;

    this._addEventLink = null;
  }

};

function addHours(date, hourDiff) {
  var result = new Date(date);
  result.setHours(result.getHours() + hourDiff);
  return result;
}

});

// this module is responsible for the touch/panning of MultiDay views
define('views/pan',['require','exports','module','ext/eventemitter2','utils/mout','utils/mout','utils/mout'],function(require, exports, module) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var clamp = require('utils/mout').clamp;
var lerp = require('utils/mout').lerp;
var norm = require('utils/mout').norm;

function Pan(options) {
  EventEmitter2.call(this);

  this.eventTarget = options.eventTarget;
  this.targets = options.targets;
  this.overflows = options.overflows || [];

  this._gridSize = Math.max(options.gridSize || 0, 1);
  this._visibleCells = Math.max(options.visibleCells || 0, 1);
  this._startMouseX = this._startMouseY = 0;
  this._isVertical = false;
  this._startTime = 0;
  this._touchStart = 0;
  this._dx = 0;

  // _lockedAxis is used to control if we detected if the movement is
  // vertical/horizontal, very important for ignoring clicks and also to be
  // able to set a threshold for the axis detection
  this._lockedAxis = false;

  this._onTouchStart = this._onTouchStart.bind(this);
  this._onTouchMove = this._onTouchMove.bind(this);
  this._onTouchEnd = this._onTouchEnd.bind(this);
  this._tick = this._tick.bind(this);
  this._setBaseValues = this._setBaseValues.bind(this);
  this._onTweenEnd = null;
}
module.exports = Pan;

Pan.prototype = {
  __proto__: EventEmitter2.prototype,

  TRANSITION_DURATION: 800,

  setup: function() {
    var element = this.eventTarget;
    element.addEventListener('touchstart', this._onTouchStart);
    element.addEventListener('touchmove', this._onTouchMove);
    element.addEventListener('touchend', this._onTouchEnd);
    element.addEventListener('touchcancel', this._onTouchEnd);
    window.addEventListener('localized', this._setBaseValues);
    this._setBaseValues();
  },

  _setBaseValues: function() {
    var delta = this._gridSize * this._visibleCells;

    if (document.documentElement.dir === 'rtl') {
      this._dir = -1;
      this._minX = 0;
      this._maxX = delta * 2;
    } else {
      this._dir = 1;
      this._minX = delta * -2;
      this._maxX = 0;
    }

    this._origX = this._startX = this._curX = this._destX = delta * -this._dir;
    this._set(this._origX);
  },

  _onTouchStart: function(evt) {
    this._startMouseX = evt.touches[0].clientX;
    this._startMouseY = evt.touches[0].clientY;
    this._isVertical = false;
    this._lockedAxis = false;
    this._touchStart = Date.now();
    // we need to reset the tween callback because we should only call it
    // once and only if user did not trigger a new touch
    this._onTweenEnd = null;
  },

  _onTouchMove: function(evt) {
    if (this._isVertical) {
      return;
    }

    var dx = this._startMouseX - evt.touches[0].clientX;
    var dy = this._startMouseY - evt.touches[0].clientY;
    this._dx = dx;

    if (!this._lockedAxis) {
      var adx = Math.abs(dx);
      var ady = Math.abs(dy);

      // we wait until we are sure movement is horizontal before we do anything.
      // if absolute difference between x/y movement is over a threshold (10px)
      // we assume drag follows a single axis.
      if (Math.abs(adx - ady) < 10) {
        return;
      }

      this._isVertical = adx < ady;
      this._lockedAxis = true;

      this.emit('start');

      if (this._isVertical) {
        return;
      }

      // we should only lock scroll once and only if dragging horizontally
      this._lockScroll();
    }

    this._updateDestination(this._origX - dx, 0);
  },

  _lockScroll: function() {
    this.overflows.forEach(el => el.style.overflowY = 'hidden');
  },

  _unlockScroll: function() {
    this.overflows.forEach(el => el.style.overflowY = 'scroll');
  },

  _updateDestination: function(x, duration) {
    duration = duration != null ? duration : this.TRANSITION_DURATION;

    this._startX = this._curX;
    this._destX = clamp(x, this._minX, this._maxX);

    var now = Date.now();
    this._endTime = now + duration;

    if (!this._requestId) {
      this._startTime = now;
      this._tween();
    }
  },

  _tween: function() {
    this._requestId = window.requestAnimationFrame(this._tick);
  },

  _tick: function() {
    var t = norm(Date.now(), this._startTime, this._endTime);

    if (t >= 1 || this._curX === this._destX) {
      this._killTween();
      this._set(this._destX);
      return;
    }

    var x = lerp(ease(t), this._startX, this._destX);
    this._set(x);
    this._tween();
  },

  _killTween: function() {
    if (this._requestId) {
      window.cancelAnimationFrame(this._requestId);
      this._requestId = null;
    }
    this._onTweenEnd && this._onTweenEnd.call(this);
  },

  _onTouchEnd: function() {
    // if touch is very fast momentum would be bigger than our threshold,
    // this is very important for click events otherwise they wouldn't open
    // the event details
    if (this._isVertical || !this._lockedAxis) {
      this._unlockScroll();
      return;
    }

    var duration = Date.now() - this._touchStart;
    var momentum = Math.abs(this._dx) / duration;
    var snap;

    if (momentum > 0.5) {
      // if the drag was fast we consider it as a swipe (move multiple cells
      // at once)
      var direction = this._dx > 0 ? -1 : 1;
      snap = this._origX + (direction * this._gridSize * this._visibleCells);
    } else {
      // we only round up if very close to the next column, this behavior is
      // better for the user than a regular round/ceil/floor
      snap = Math.round((this._destX / this._gridSize) + 0.2) *
        this._gridSize;
    }

    // we only unlock the scroll after the tween is complete to make multiple
    // consecutive swipes faster (also avoids flickering y-axis position)
    this._onTweenEnd = this._unlockScroll;
    this._updateDestination(snap);

    this.emit('release', {
      diff: Math.round((this._origX - this._destX) / this._gridSize) * this._dir
    });
  },

  _set: function(x) {
    x = clamp(x, this._minX, this._maxX);
    this.targets.forEach(el => {
      el.style.transform = 'translateX(' + x +'px)';
    });
    this._curX = x;
  },

  refresh: function() {
    var diff = Math.abs(this._curX - this._destX);
    diff *= this._curX < this._destX ? -1 : 1;

    // we update the position based on the relative distance to keep a smooth
    // transition
    if (diff) {
      this._set(this._origX + diff);
      this._updateDestination(this._origX);
    } else {
      this._set(this._origX);
    }
  }

};

// borrowed from zeh/ztween (expoOut)
function ease(t) {
  return (t >= 0.999) ? 1 : 1.001 * (-Math.pow(2, -10 * t) + 1);
}

});

/**
 * The interval tree is a structure
 * designed and optimized for storing
 * (possibly) overlapping intervals in
 * such a way that we can optimally query them.
 *
 * To store an item in the tree the item
 * must have `START`, `END` and `_id` properties
 * both properties must be numeric and start
 * must always be < then end. ID should be unique
 * to each interval though it should be possible
 * to store multiple intervals with the same
 * start/end times.
 *
 * Trees should be created by providing an
 * array of items sorted by their start
 * times.
 *
 *
 *    // _start is a constant see below
 *    var list = [
 *      { start: 100, end: 200 },
 *      { start: 120, end: 150 },
 *      ...
 *    ];
 *
 *    var tree = new Calendar.Node(list);
 *
 *
 * The tree _should-be_ dynamic and you can add and
 * remove items from the tree.
 *
 * For the present the tree will rebuild itself
 * after add/removal before the next query operation.
 *
 *
 *    tree.add({ start: 0, end: 50 });
 *
 *    // record should be === to record
 *    // stored in the tree.
 *    tree.remove(savedRecord);
 *
 *
 * TODO: Implement self-balancing and real tree mutations.
 */
define('interval_tree',['require','exports','module','common/binsearch','common/compare','common/debug'],function(require, exports, module) {
'use strict';

var binsearch = require('common/binsearch');
var compare = require('common/compare');
var debug = require('common/debug')('interval_tree');

const START = '_startDateMS';
const END = '_endDateMS';

function compareObjectStart(a, b) {
  return compare(a[START], b[START]);
}

function compareObjectEnd(a, b) {
  return compare(a[END], b[END]);
}

IntervalTree.compareObjectStart = compareObjectStart;
IntervalTree.compareObjectEnd = compareObjectEnd;

/**
 * Internal function to create an endpoint
 * list. Assumed this is the array to insert
 * endpoint values into.
 *
 * @param {Object} item object with [START] & [END] properties.
 */
function buildEndpoints(item) {
  /*jshint validthis:true */
  addOrdered(item[START], this);
  addOrdered(item[END], this);
}

function Node() {
  this.list = [];
}

Node.prototype = {

  /**
   * Node to the left null or a node.
   */
  left: null,

  /**
   * Node to the right null or a node.
   */
  right: null,

  /**
   * List of objects that overlap current node.
   *
   * @type Array
   */
  list: null,

  /**
   * Center point of this node.
   */
  median: null,

  /**
   * Highest value of this node & subnodes.
   */
  max: null,

  /**
   * Iterates through matching items.
   * Will be roughly ordered by start
   * time but exact sort order is not
   * guaranteed.
   *
   * @param {Calendar.Timespan} span timespan.
   * @param {Function} callback first argument is matching
   *                            record second is the node in the
   *                            tree where record was found.
   */
  traverse: function(span, fn) {
    if (this.left && (span.start < this.median)) {
      this.left.traverse(span, fn);
    }

    var i = 0;
    var len = this.list.length;
    var item;

    for (; i < len; i++) {
      item = this.list[i];

      if (item[START] > span.end) {
        break;
      }

      if (span.overlaps(item[START], item[END])) {
        fn(item, this);
      }
    }

    if (this.right && span.end > this.median) {
      this.right.traverse(span, fn);
    }
  },

  /**
   * Find all overlapping records via a Calendar.Timespan.
   *
   * @param {Calendar.Timespan} span timespan.
   * @return {Array} results sorted by start time.
   */
  query: function(span) {
    var results = [];
    var seen = Object.create(null);

    this.traverse(span, function(item) {
      ///XXX: we probably want to order
      // these by start time via bin search
      // order by sort at the end.
      if (!seen[item._id]) {
        results.push(item);
      }
    });

    return results;
  }

};

IntervalTree.Node = Node;

/**
 * Start point for creation of the tree
 * this is optimized for the most balanced tree
 * when possible. The idea is the majority of
 * operations will be read and traversal.
 *
 * NOTE: Currently we discard the tree and
 * mark the object as synced=false after mutations
 * The next time the object is queried the tree is rebuilt.
 */
function IntervalTree(list) {
  if (typeof(list) === 'undefined') {
    this.items = [];
  } else {
    this.items = list.concat([]);
  }

  /**
   * Properties to index by when fields are added.
   */
  this._indexes = Object.create(null);

  // method aggregates
  this._indexOnAdd = [];
  this._indexOnRemove = [];

  this.byId = Object.create(null);
  this.synced = false;
}
module.exports = IntervalTree;

IntervalTree.prototype = {

  START: START,
  END: END,

  build: function() {
    if (!this.synced) {
      this.rootNode = this._nodeFromList(this.items);
      this.synced = true;
    }
  },

  toArray: function() {
    // create a copy of the items array
    return this.items.concat();
  },

  _getId: function(item) {
    return item._id;
  },

  /**
   * Returns all values in the given index.
   *
   * @param {String} property name of index.
   * @param {String} [value] to filter index on (optional).
   * @return {Null|Array}
   */
  index: function(property, value) {
    var items = this._indexes[property];

    if (items && value) {
      return items[value];
    }

    return items;
  },

  /**
   * Create index on property.
   *
   * @param {String} property to index on.
   */
  createIndex: function(property) {
    var index = this._indexes[property] = {};

    // remember this will be invoked later with the context
    // of |this| always...
    function addToIndex(object) {
      var value = object[property];

      // create array for index possibilities
      if (!index[value]) {
        index[value] = [];
      }

      // and push single object to index
      index[value].push(object);
    }

    function removeFromIndex(object) {
      // object given should always be same instance stored.
      var value = object[property];
      var valueGroup = index[value];

      if (valueGroup) {
        var idx = valueGroup.indexOf(object);
        valueGroup.splice(idx, 1);
        if (valueGroup.length === 0) {
          delete index[value];
        }
      }
    }

    this._indexOnAdd.push(addToIndex);
    this._indexOnRemove.push(removeFromIndex);
  },

  /**
   * Adds an item to the tree
   */
  add: function(item) {
    var id = this._getId(item);

    if (id in this.byId) {
      return;
    }


    if (!item[START] && item.startDate) {
      item[START] = item.startDate.valueOf();
    }

    if (!item[END] && item.endDate) {
      item[END] = item.endDate.valueOf();
    }

    if (!item[START] || !item[END]) {
      return debug('Invalid input skipping record: ', item);
    }

    var idx = binsearch.insert(
      this.items,
      item,
      compareObjectStart
    );

    this.items.splice(idx, 0, item);
    this.byId[id] = item;
    this.synced = false;

    var len = this._indexOnAdd.length;
    for (var i = 0; i < len; i++) {
      this._indexOnAdd[i].call(this, item);
    }

    return item;
  },

  indexOf: function(item) {
    var query = {};
    query[START] = item[START];
    var idx = binsearch.find(
      this.items,
      query,
      compareObjectStart
    );

    var prevIdx;
    var current;

    if (idx !== null) {
      // we want to start idx at earliest
      // point in list that matches start time.
      // When there are multiple start times
      // the binsearch may start us at any point
      // in the range of matching items.


      // Iterate backwards.
      if (idx > 0) {
        prevIdx = idx;
        while (prevIdx > -1) {
          prevIdx--;
          current = this.items[prevIdx];
          if (current && current[START] === item[START]) {
            if (current === item) {
              return prevIdx;
            }
          } else {
            break;
          }
        }
      }

      //Iterate forwards.
      current = this.items[idx];
      while (current) {
        if (current === item) {
          return idx;
        }

        current = this.items[++idx];

        if (!current || current[START] !== item[START]) {
          return null;
        }
      }
    }

    return null;
  },

  /**
   * Removes an item to the list.
   * Must be same === item as as the
   * one you are trying to remove.
   */
  remove: function(item) {

    var idx = this.indexOf(item);

    if (idx !== null) {
      this._removeIds(this.items[idx]);

      this.items.splice(idx, 1);
      this.synced = false;
      return true;
    }

    return false;
  },

  _removeIds: function(item) {
    if (Array.isArray(item)) {
      item.forEach(this._removeIds, this);
    } else {
      var len = this._indexOnRemove.length;
      for (var i = 0; i < len; i++) {
        this._indexOnRemove[i].call(this, item);
      }

      var id = this._getId(item);
      delete this.byId[id];
    }
  },

  /**
   * Remove all intervals that start
   * after a particular time.
   *
   *    // assume we have a list of the
   *    // following intervals
   *    1-2 4-10 5-10 6-8 8-9
   *
   *    tree.removeFutureIntervals(5);
   *
   *    // now we have: 1-2, 4-10 5-10
   *
   * @param {Numeric} start last start point.
   */
  removeFutureIntervals: function(start) {
    var query = {};
    query[START] = start;

    var idx = binsearch.insert(
      this.items,
      query,
      compareObjectStart
    );

    var max = this.items.length - 1;

    if (!this.items[idx]) {
      return;
    }


    // for duplicate values we need
    // to find the very last one
    // before the split point.
    while (this.items[idx] && this.items[idx][START] <= start) {
      idx++;
      if (idx === max) {
        break;
      }
    }

    this.synced = false;
    var remove = this.items.splice(
      idx, this.items.length - idx
    );

    this._removeIds(remove);
    return remove;
  },

  /**
   * Remove all intervals that end
   * before a particular time.
   *
   * For example is you have:
   *
   *    // assume we have a list of the
   *    // following intervals
   *    1-10, 2-3, 3-4, 4-5
   *
   *    tree.removePastIntervals(4);
   *
   *    // now we have: 1-10, 4-5
   *
   * @param {Numeric} end last end point.
   */
  removePastIntervals: function(end) {
    // 1. first re-sort to end dates.
    var items = this.items.sort(compareObjectEnd);

    // 2. find index of the last date ending
    // on or before end.
    var endQuery = {};
    endQuery[END] = end;
    var idx = binsearch.insert(
      items,
      endQuery,
      compareObjectEnd
    );

    var max = items.length - 1;

    if (!items[idx]) {
      return;
    }

    // for duplicate values we need
    // to find the very last one
    // before the split point.
    while (items[idx][END] <= end) {
      idx++;
      if (idx === max) {
        break;
      }
    }

    this.synced = false;
    var remove = items.slice(0, idx);
    this.items = items.slice(idx).sort(
      compareObjectStart
    );

    this._removeIds(remove);

    return remove;
  },

  /**
   * Executes a query on all nodes.
   * Rebuilds tree if in unclean state first.
   *
   * @param {Calendar.Timespan} span timespan.
   */
  query: function(span) {
    this.build();
    return this.rootNode.query(span);
  },

  _nodeFromList: function(list) {
    var rootNode = new Node();

    var left = [];
    var right = [];

    var median;
    var endpoints = [];

    //1. build endpoints to calculate median
    //   endpoints are the middle value of
    //   all start/end points in the current list.
    list.forEach(buildEndpoints, endpoints);
    median = rootNode.median = endpoints[Math.floor(endpoints.length / 2)];

    list.forEach(function(item) {

      if (item[END] < median) {
        left.push(item);
      } else if (item[START] > median) {
        right.push(item);
      } else {
        rootNode.list.push(item);
      }
    }, this);

    // recurse - create left/right nodes.
    if (left.length) {
      rootNode.left = this._nodeFromList(left);
    }

    if (right.length) {
      rootNode.right = this._nodeFromList(right);
    }

    return rootNode;
  }
};

/**
 * Internal function to add an item
 * to an array via binary search insert.
 * Keeps items in order as they are inserted.
 *
 * @private
 */
function addOrdered(item, array) {
  var idx = binsearch.insert(
    array,
    item,
    compare
  );

  array.splice(idx, 0, item);
}

});

/**
 * Representation of conflicts over a span of time, organized into
 * non-overlapping columns tracked by IntervalTree instances.
 */
define('conflict_span',['require','exports','module','interval_tree','common/timespan'],function(require, exports, module) {
'use strict';

var IntervalTree = require('interval_tree');
var Timespan = require('common/timespan');

// Smallest gap interval to use in splitting conflict spans
var MIN_SPLIT_INTERVAL = 5 * 60 * 1000;  // 5 minutes

// Auto-increment ID for instances
var _id = 0;

function ConflictSpan(parent) {
  this.id = (_id++);
  this.parent = parent;
  this.startTime = null;
  this.endTime = null;
  this.all = new IntervalTree();
  this.columnsByID = {};
  this.columns = [];
  this.addColumn();
}
module.exports = ConflictSpan;

ConflictSpan.prototype = {
  /**
   * Get a list of all the busytime IDs in this span.
   *
   * @return {Array} List of all the busytime IDs.
   */
  getIDs: function() {
    return Object.keys(this.all.byId);
  },

  /**
   * Add a new column tracked by an IntervalTree
   *
   * @return {Object} IntervalTree tracking the column.
   */
  addColumn: function() {
    var tree = new IntervalTree();
    this.columns.push(tree);
    return tree;
  },

  /**
   * Find a column where the given busytime fits without conflict, adding a
   * new column if necessary.
   *
   * @param {Object} busytime full busytime object.
   * @return {Object} IntervalTree column that can accept the busytime.
   */
  findColumn: function(busytime, skipAdd) {
    var column = null;
    var span = new Timespan(busytime._startDateMS, busytime._endDateMS);
    for (var i = 0; i < this.columns.length; i++) {
      var curr = this.columns[i];
      if (!curr.query(span).length) {
        column = curr;
        break;
      }
    }
    if (!column && !skipAdd) {
      column = this.addColumn();
    }
    return column;
  },

  /**
   * Add a busytime to the conflict span
   *
   * @param {Object} busytime full busytime object.
   */
  add: function(busytime) {
    var id = busytime._id;

    this.parent.conflicts[id] = this;
    this.all.add(busytime);

    var column = this.findColumn(busytime);
    column.add(busytime);
    this.columnsByID[id] = column;

    this._updateTimes(busytime);
    this._updateLayout();
    return this;
  },

  /**
   * Remove a busytime from the conflict span
   *
   * @param {Object} busytime full busytime object.
   * @param {Boolean} skipMaintenance skip post-removal maintenance.
   */
  remove: function(busytime, skipMaintenance) {
    var id = busytime._id;

    this.all.remove(busytime);
    var column = this.columnsByID[id];
    if (!column) { return; }

    column.remove(busytime);
    delete this.columnsByID[id];
    delete this.parent.conflicts[id];

    // Removing a single item requires maintenance after. But, this can be
    // skipped during a split, which does its own cleanup after multiple
    // removes & adds between spans.
    if (skipMaintenance) { return this; }

    this._splitIfNecessary();
    var boom = this._selfDestructIfNecessary();
    if (!boom) {
      this._resetTimes();
      this._purgeEmptyColumns();
      this._updateLayout();
    }

    return this;
  },

  /**
   * Absorb the given conflict span into this one
   *
   * @param {Object} ConflictSpan to be absorbed.
   */
  absorb: function(otherCS) {
    var self = this;
    var otherIDs = otherCS.getIDs();
    otherIDs.forEach(function(otherID) {
      var otherBusytime = self.parent.tree.byId[otherID];
      self.add(otherBusytime);
      // Cheat: skip removing from the other span, since references go away.
    });
  },

  /**
   * Update the start/end times for this span from a new busytime.
   *
   * @param {Object} busytime full busytime object.
   */
  _updateTimes: function(busytime) {
    var start = busytime._startDateMS;
    if (null === this.startTime || start < this.startTime) {
      this.startTime = start;
    }
    var end = busytime._endDateMS;
    if (null === this.endTime || end > this.endTime) {
      this.endTime = end;
    }
  },

  /**
   * Reset times with a complete re-scan of all events in the span.
   */
  _resetTimes: function() {
    this.startTime = this.endTime = null;
    var byId = this.all.byId;
    for (var k in byId) {
      this._updateTimes(byId[k]);
    }
  },

  /**
   * Scan through the events in this span. If a significant gap is found,
   * presumably after a removal, split this span in two.
   *
   * @param {Object} busytime full busytime object.
   */
  _splitIfNecessary: function() {
    var start = this.startTime;
    var end = this.endTime;

    // Scan for the end of the first gap, if any.
    var splitAt = false;
    var prevHits = null;
    for (var top = start; top < end; top += MIN_SPLIT_INTERVAL) {
      var span = new Timespan(top, top + MIN_SPLIT_INTERVAL);
      var hits = this.all.query(span).length;
      if (0 === prevHits && hits > 0) {
        // Transition from empty to non-empty is where we split.
        splitAt = top; break;
      }
      prevHits = hits;
    }

    // Bail if we never found a gap.
    if (splitAt === false) { return; }

    // Remove & collect the post-gap items for new split.
    var newItems = [];
    var splitSpan = new Timespan(splitAt, Infinity);
    var splitItems = this.all.query(splitSpan);
    var self = this;
    splitItems.forEach(function(item) {
      self.remove(item, true);
      newItems.push(item);
    });

    // Perform partial post-removal maintenance
    var boom = this._selfDestructIfNecessary();
    if (!boom) {
      this._resetTimes();
      this._purgeEmptyColumns();
      this._updateLayout();
    }

    // Bail if there's just one item for new split - no conflict.
    if (newItems.length == 1) {
      this.parent._clearLayout(newItems[0]);
      return;
    }

    // Otherwise, populate a new span with the conflicting items.
    var newCS = new ConflictSpan(this.parent);
    newItems.forEach(function(item) {
      newCS.add(item);
    });

    // Finally, recurse into the new span and split further, if necessary.
    newCS._splitIfNecessary();
  },

  /**
   * If this span has only one event left, then self-destruct because there's
   * no longer a conflict.
   */
  _selfDestructIfNecessary: function() {
    var keys = this.getIDs();
    if (keys.length > 1) {
      // There's still a conflict, so bail.
      return false;
    }
    if (keys.length == 1) {
      // Exactly one left, so clean up.
      var busytime = this.all.byId[keys[0]];
      this.remove(busytime, true);
      this.parent._clearLayout(busytime);
    }
    return true;
  },

  /**
   * Purge empty columns from the conflict span.
   */
  _purgeEmptyColumns: function() {
    var newColumns = [];
    for (var i = 0; i < this.columns.length; i++) {
      var column = this.columns[i];
      if (Object.keys(column.byId).length > 0) {
        newColumns.push(column);
      }
    }
    this.columns = newColumns;
  },

  /**
   * Update layout for all events participating in this conflict span.
   */
  _updateLayout: function() {
    var numCols = this.columns.length;
    var width = (100 / numCols);
    for (var cIdx = 0; cIdx < numCols; cIdx++) {
      var column = this.columns[cIdx];
      for (var k in column.byId) {
        var busytime = column.byId[k];
        var el = this.parent.getElement(busytime);
        el.style.width = width + '%';
        el.style.left = (width * cIdx) + '%';
        // we toggle the style based on amount of overlaps
        el.classList.toggle('many-overlaps', numCols > 4);
        el.classList.toggle('has-overlaps', numCols > 1);
      }
    }
  }
};

});

/**
 * Conflict manager
 */
define('utils/overlap',['require','exports','module','conflict_span','interval_tree','common/timespan'],function(require, exports, module) {
'use strict';

/**
 * Module dependencies
 */
var ConflictSpan = require('conflict_span');
var IntervalTree = require('interval_tree');
var Timespan = require('common/timespan');

function Overlap() {
  this.reset();
}
module.exports = Overlap;

Overlap.prototype = {
  reset: function() {
    this.tree = new IntervalTree();
    this.conflicts = {};
    this.elements = {};
  },

  add: function(myBusytime, element) {
    this.tree.add(myBusytime);
    this.elements[myBusytime._id] = element;

    // Check for conflicts, bail if none
    var related = this._findRelated(myBusytime);
    if (0 === related.length) {
      return;
    }

    var myID = myBusytime._id;
    var myCS = this.conflicts[myID];

    var self = this;
    related.forEach(function(otherBusytime) {
      // Get the other's ID, skip the current
      var otherID = otherBusytime._id;
      if (otherID === myID) {
        return;
      }

      var otherCS = self.conflicts[otherID];
      if (!myCS && !otherCS) {
        // This is a brand new conflict.
        myCS = new ConflictSpan(self);
        myCS.add(myBusytime).add(otherBusytime);
      } else if (myCS && !otherCS) {
        // Other time can join this one's existing span
        myCS.add(otherBusytime);
      } else if (!myCS && otherCS) {
        // This time can join the other's existing span
        myCS = otherCS.add(myBusytime);
      } else if (myCS && otherCS && myCS != otherCS) {
        // Both already in different spans, so absorb other into this
        myCS.absorb(otherCS);
      }
    });

  },

  /**
   * Remove a busytime from the collection.
   * Unlike other methods you must pass a real
   * busytime object.
   *
   * @param {Object} busytime full busytime object.
   */
  remove: function(busytime) {
    this._clearLayout(busytime);
    this.tree.remove(busytime);
    delete this.elements[busytime._id];
    var myID = busytime._id;
    var myCS = this.conflicts[myID];
    if (myCS) {
      myCS.remove(busytime);
    }
  },

  /**
   * Get the ConflictSpan associated with this busytime, if any.
   *
   * @param {Object|String} busytime id or busytime object.
   * @return {Object} associated ConflictSpan, if any.
   */
  getConflictSpan: function(busytime) {
    var id = this._busytimeId(busytime);
    return this.conflicts[id];
  },

  /**
   * @param {Object|String} busytime id or busytime object.
   * @return {HTMLElement} associated dom element.
   */
  getElement: function(busytime) {
    var id = this._busytimeId(busytime);
    return this.elements[id];
  },

  /** private */

  _busytimeId: function(busytime) {
    return (typeof(busytime) === 'string') ? busytime : busytime._id;
  },

  /**
   * Search tree for busytimes that overlap with the given.
   */
  _findRelated: function(busytime) {
    //XXX: this is bad encapsulation but
    //     we generate these when we insert
    //     the points in the tree.
    var span = new Timespan(busytime._startDateMS, busytime._endDateMS);
    return this.tree.query(span);
  },

  /**
   * Clear the layout from a busytime element, presumably because it has just
   * been removed from conflict.
   *
   * @param {Object} busytime full busytime object.
   */
  _clearLayout: function(busytime) {
    var el = this.elements[busytime._id];
    el.style.width = '';
    el.style.left = '';
    el.classList.remove('has-overlaps', 'many-overlaps');
  }
};

});

define('utils/color',['require','exports','module'],function(require, exports) {
'use strict';

// right now the calendar app only displays 8 different colors so it's a good
// idea to memoize the results of hexToBackground to avoid calculating it for
// each busytime
var memoized = {};

exports.hexToBackground = function(hex) {
  if (!(hex in memoized)) {
    // we need 20% opacity for background; it's simpler to use rgba than to
    // create a new layer and set opacity:20%
    var {r, g, b} = hexToChannels(hex);
    memoized[hex] = `rgba(${r}, ${g}, ${b}, 0.2)`;
  }

  return memoized[hex];
};

function hexToChannels(hex) {
  var val = parseInt(hex.replace(/#/, ''), 16);
  return {
    r: val >> 16,
    g: val >> 8 & 0xFF,
    b: val & 0xFF
  };
}

});

define('templates/multi_day',['require','exports','module','./date_span','utils/color','template'],function(require, exports, module) {
'use strict';

var DateSpan = require('./date_span');
var colorUtils = require('utils/color');
var create = require('template').create;

var multiday = {};

multiday.hour = function() {
  var hour = this.arg('hour');

  var html = DateSpan.hour.render({
    hour: hour,
    format: this.arg('format'),
    addAmPmClass: this.arg('addAmPmClass'),
    className: 'md__display-hour'
  });

  // we use this temporary element just to grab the textContent
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  var text = tmp.textContent;

  return `<li aria-label="${text}" class="md__hour md__hour-${hour}">
    ${html}
  </li>`;
};

multiday.day = function() {
  return `<div class="md__day" data-date="${this.h('date')}"></div>`;
};

multiday.allday = function() {
  return `<div class="md__allday" data-date="${this.h('date')}">
    <h1 class="md__day-name" aria-level="2"
      id="md__day-name-${this.h('id')}"></h1>
    <div class="md__allday-events"></div>
  </div>`;
};

multiday.event = function() {
  var labels = [];
  var id = this.h('id');
  var instance = this.h('instance');
  var color = this.h('color');
  var bgColor = colorUtils.hexToBackground(color);

  var titleId = `md__event-${id}-title-${instance}`;
  labels.push(titleId);

  var location = this.h('location');
  var locationHtml = '';
  if (location) {
    var locationId = `md__event-${id}-location-${instance}`;
    labels.push(locationId);
    locationHtml = `<bdi class="md__event-location" id="${locationId}">
      ${location}
    </bdi>`;
  }

  var alarmIcon = '';
  if (this.arg('hasAlarms')) {
    var iconId = `md__event-${id}-icon-${instance}`;
    labels.push(iconId);
    alarmIcon = `<i class="gaia-icon icon-calendar-alarm"
      style="color: ${color}" aria-hidden="true" id="${iconId}"
      data-l10n-id="icon-calendar-alarm">
    </i>`;
  }

  var className = ['md__event'];
  if (alarmIcon) {
    className.push('has-alarms');
  }

  var descriptionId = `md__event-${id}-description-${instance}`;
  labels.push(descriptionId);

  return `<a href="/event/show/${id}"
    class="${className.join(' ')}"
    style="border-color: ${color}; background-color: ${bgColor}"
    aria-labelledby="${labels.join(' ')}">
    <bdi class="md__event-title" id="${titleId}">${this.h('title')}</bdi>
    ${locationHtml}
    ${alarmIcon}
    <span id="${descriptionId}" aria-hidden="true"
      data-l10n-id="${this.h('labelFormat')}"
      data-l10n-args="${this.h('labelFormatArgs')}">
    </span>
  </a>`;
};

module.exports = create(multiday);

});

/* global IntlHelper */

define('views/single_day',['require','exports','module','utils/overlap','utils/dom','core','common/calc','common/calc','common/calc','common/calc','templates/multi_day'],function(require, exports, module) {
'use strict';

var Overlap = require('utils/overlap');
var buildElement = require('utils/dom').buildElement;
var core = require('core');
var isSameDate = require('common/calc').isSameDate;
var relativeDuration = require('common/calc').relativeDuration;
var relativeOffset = require('common/calc').relativeOffset;
var spanOfDay = require('common/calc').spanOfDay;
var template = require('templates/multi_day');

var _id = 0;

IntlHelper.define('longDateFormat', 'datetime', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

function SingleDay(config) {
  this.date = config.date;
  this._hourHeight = config.hourHeight;
  this._daysHolder = config.daysHolder;
  this._allDayIcon = config.allDayIcon;
  this._alldaysHolder = config.alldaysHolder;
  this._oneDayLabelFormat = config.oneDayLabelFormat;
  this._render = this._render.bind(this);
  this._instanceID = _id++;
  this.overlaps = new Overlap();
}
module.exports = SingleDay;

SingleDay.prototype = {
  _isActive: false,
  _borderWidth: 0.1,
  _attached: false,
  _observer: null,

  setup: function() {
    this.day = buildElement(template.day.render({
      date: this.date
    }));
    this.allday = buildElement(template.allday.render({
      date: this.date,
      id: this._instanceID
    }));
    this._dayName = this.allday.querySelector('.md__day-name');
    this._alldayEvents = this.allday.querySelector('.md__allday-events');

    this._updateDayName();

    this.onactive();
  },

  _updateDayName: function() {
    // we can't use [data-l10n-date-format] because format might change based
    // on locale
    this._dayName.textContent = this.date.toLocaleString(navigator.languages, {
      weekday: 'short',
      day: 'numeric'
    });
  },

  handleEvent: function(evt) {
    switch(evt.type) {
      case 'localized':
        this._updateDayName();
        break;
    }
  },

  append: function() {
    this._daysHolder.appendChild(this.day);
    this._alldaysHolder.appendChild(this.allday);
    this._attached = true;
  },

  onactive: function() {
    if (this._isActive) {
      return;
    }
    this._observer = core.bridge.observeDay(this.date);
    this._observer.listen(this._render);
    window.addEventListener('localized', this);
    this._isActive = true;
  },

  _render: function(records) {
    this._alldayEvents.innerHTML = '';
    records.allday.forEach(this._renderAlldayEvent, this);
    this.overlaps.reset();
    this.day.innerHTML = '';
    records.basic.forEach(this._renderEvent, this);
    if (this._alldayEvents.children.length > 0) {
      // If there are all day events, the section acts as a listbox.
      this._alldayEvents.setAttribute('role', 'listbox');
      this._alldayEvents.setAttribute('aria-labelledby', this._allDayIcon.id +
        ' ' + this._dayName.id);
    } else {
      // If there are no all day events, the section acts as a create new all
      // day event button.
      this._alldayEvents.setAttribute('role', 'button');
      this._alldayEvents.setAttribute('data-l10n-id', 'create-all-day-event');
      this._alldayEvents.setAttribute('aria-describedby', this._dayName.id);
    }
  },

  _renderEvent: function(record) {
    var el = this._buildEventElement(record);

    var {busytime} = record;
    var {startDate, endDate} = busytime;

    // we don't set the height on the template because we use the same markup
    // for all day events as well
    var duration = relativeDuration(this.date, startDate, endDate);
    // we subtract border to keep a margin between consecutive events
    var hei = duration * this._hourHeight - this._borderWidth;

    // It doesn't make sense to set height less than 1 px, so we set it to 1 px
    // in order to show events correctly.
    hei = Math.max(1, hei);

    el.style.height = hei + 'px';

    if (duration < 1) {
      el.classList.add('is-partial');
      var size = '';
      // we need to toggle layout if event lasts less than 20, 30 and 45min
      if (duration < 0.3) {
        size = 'micro';
      } else if (duration < 0.5) {
        size = 'tiny';
      } else if (duration < 0.75) {
        size = 'small';
      }
      if (size) {
        el.classList.add('is-partial-' + size);
      }
    }

    var offset = relativeOffset(this.date, startDate);
    el.style.top = (offset * this._hourHeight) + 'px';

    this.overlaps.add(busytime, el);
    this.day.appendChild(el);
  },

  _buildEventElement: function(record) {
    var {title, location, alarms} = record.event.remote;
    var {startDate, endDate, _id} = record.busytime;

    // screen reader should be aware if the event spans multiple dates and also
    // know the event duration without having the open it
    var labelFormat = isSameDate(startDate, endDate) ? this._oneDayLabelFormat :
      'event-multiple-day-duration';

    var longDateFormat = IntlHelper.get('longDateFormat');
    var shortTimeFormat = IntlHelper.get('shortTimeFormat');
    var labelFormatArgs = JSON.stringify({
      startDate: longDateFormat.format(startDate),
      startTime: shortTimeFormat.format(startDate),
      endDate: longDateFormat.format(endDate),
      endTime: shortTimeFormat.format(endDate)
    });

    return buildElement(template.event.render({
      id: _id,
      instance: this._instanceID,
      title: title,
      location: location,
      hasAlarms: alarms && alarms.length,
      color: record.color,
      labelFormat: labelFormat,
      labelFormatArgs: labelFormatArgs
    }));
  },

  _renderAlldayEvent: function(record) {
    var el = this._buildEventElement(record);
    el.classList.add('is-allday');
    el.setAttribute('role', 'option');
    this._alldayEvents.appendChild(el);
  },

  destroy: function() {
    this.oninactive();
    this._detach();
  },

  _detach: function() {
    if (this._attached) {
      this._daysHolder.removeChild(this.day);
      this._alldaysHolder.removeChild(this.allday);
      this._attached = false;
    }
  },

  oninactive: function() {
    if (!this._isActive) {
      return;
    }
    this._observer.cancel();
    window.removeEventListener('localized', this);
    this._isActive = false;
  },

  setVisibleForScreenReader: function(visibleRange) {
    var visible = visibleRange.contains(spanOfDay(this.date));
    this.day.setAttribute('aria-hidden', !visible);
    this.allday.setAttribute('aria-hidden', !visible);
  }
};

});

define('utils/animated_scroll',['require','exports','module'],function(require, exports, module) {
'use strict';

module.exports = function animatedScroll(opts) {
  var {container, content, scrollTop} = opts;

  var maxScroll = container.scrollHeight - container.clientHeight;
  // safeguard against negative or `null` scrollTop (0 < scrollTop < maxScroll)
  scrollTop = Math.min(Math.max(scrollTop, 0), maxScroll);

  var diff = container.scrollTop - scrollTop;
  var seconds = Math.abs(diff) / 500;

  // hide scrollbar during animation to avoid errors introduced by user trying
  // to scroll while transition is still running; it also avoids weird
  // sensation of content moving while scrollbar is still at same position
  container.style.overflowY = 'hidden';

  window.requestAnimationFrame(() => {
    content.style.transform = 'translateY(' + diff + 'px)';
    // easeOutQuart borrowed from http://matthewlein.com/ceaser/
    content.style.transition = 'transform ' + seconds + 's ' +
      'cubic-bezier(0.165, 0.840, 0.440, 1.000)';
  });

  content.addEventListener('transitionend', function setScrollTop() {
    content.removeEventListener('transitionend', setScrollTop);
    content.style.transform = '';
    content.style.transition = '';
    container.scrollTop = scrollTop;
    container.style.overflowY = 'scroll';
  });
};

});

define('views/multi_day',['require','exports','module','common/calc','./current_time','./hour_double_tap','shared/intl_helper','./pan','./single_day','common/timespan','view','utils/animated_scroll','core','common/calc','templates/multi_day','utils/mout'],function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var CurrentTime = require('./current_time');
var HourDoubleTap = require('./hour_double_tap');
var IntlHelper = require('shared/intl_helper');
var Pan = require('./pan');
var SingleDay = require('./single_day');
var Timespan = require('common/timespan');
var View = require('view');
var animatedScroll = require('utils/animated_scroll');
var core = require('core');
var createDay = require('common/calc').createDay;
var template = require('templates/multi_day');
var throttle = require('utils/mout').throttle;

IntlHelper.define('hour-format', 'datetime', {
  hour: 'numeric'
});

function MultiDay(opts) {
  this.children = [];
  this._render = throttle(this._render, 200);
}
module.exports = MultiDay;

MultiDay.prototype = {

  // override these properties on child classes to change the behavior!
  scale: 'week',
  visibleCells: 5,
  element: null,
  _hourFormat: 'hour-format',
  _oneDayLabelFormat: 'event-one-day-duration',
  _addAmPmClass: false,

  childClass: SingleDay,
  children: null,
  seen: false,
  _baseDate: null,
  _hourHeight: 0,
  _prevRange: null,
  _visibleRange: null,

  set baseDate(date) {
    // it's very important that base date doesn't hold hour info otherwise we
    // could create duplicate days (because range wouldn't contain datetime)
    this._baseDate = createDay(date);
  },

  get baseDate() {
    return this._baseDate;
  },

  get daysHolder() {
    return this.element.querySelector('.md__days');
  },

  get alldaysHolder() {
    return this.element.querySelector('.md__alldays');
  },

  get main() {
    return this.element.querySelector('.md__main');
  },

  get mainContent() {
    return this.element.querySelector('.md__main-content');
  },

  get sidebar() {
    return this.element.querySelector('.md__sidebar');
  },

  get allDayIcon() {
    return this.element.querySelector('.md__all-day');
  },

  onactive: function() {
    this.element.classList.add(View.ACTIVE);

    if (!this.seen) {
      this.onfirstseen();
      this.seen = true;
    }

    var controller = core.timeController;
    controller.scale = this.scale;
    controller.moveToMostRecentDay();

    var previousBaseDate = this.baseDate;
    this.baseDate = this._calcBaseDate(controller.position);
    this._render();

    if (window.history.state && 'eventStartHour' in window.history.state) {
      // scroll to last edited event
      this._scrollToHour({
        hour: Math.max(window.history.state.eventStartHour - 1, 0)
      });
    } else if (!(previousBaseDate &&
                 Calc.isSameDate(previousBaseDate, this.baseDate))) {
      // Do not scroll when come back from other time views without changing the
      // base date
      this._resetScroll();
      this._scrollToHour();
    }

    // add listeners afterwards to avoid calling render twice
    controller.on('dayChange', this);
  },

  _calcBaseDate: function(date) {
    // this is overwritten by week view, and only called during onactivate
    return date;
  },

  onfirstseen: function() {
    this._setupPan();
    this._setupHours();
    this._setupCurrentTime();
    this._setupDoubleTap();
    this.allDayIcon.id = 'md__all-day-icon-' + this.scale;
    // we keep the localized listener even when view is inactive to avoid
    // rebuilding the hours/dates every time we switch between views
    window.addEventListener('localized', this);
    window.addEventListener('timeformatchange', this);
    // When screen reader is used, scrolling is done using wheel events.
    this.element.addEventListener('wheel', this);
  },

  _setupPan: function() {
    var containerWidth = this.daysHolder.parentNode.offsetWidth;
    this._pan = new Pan({
      gridSize: Math.round(containerWidth / this.visibleCells),
      visibleCells: this.visibleCells,
      eventTarget: this.element,
      overflows: [
        this.main
      ],
      targets: [
        this.alldaysHolder,
        this.daysHolder
      ]
    });
    this._pan.setup();
    this._pan.on('start', () => this._hourDoubleTap.removeAddEventLink());
    this._pan.on('release', obj => this._updateBaseDateAfterScroll(obj.diff));
  },

  _setupHours: function() {
    var sidebar = this.sidebar;
    // we need to remove all children because when locale change we rebuild
    // the hours (we can't use data-l10n-id because of special format)
    sidebar.innerHTML = '';
    var i = -1, hours = '';
    while (++i < 24) {
      hours += template.hour.render({
        hour: i,
        format: this._hourFormat,
        addAmPmClass: this._addAmPmClass
      });
    }
    sidebar.innerHTML = hours;
    this._hourHeight = sidebar.querySelector('.md__hour').offsetHeight;
  },

  _setupCurrentTime: function() {
    this._currentTime = new CurrentTime({
      container: this.mainContent,
      sticky: this.alldaysHolder
    });
  },

  _setupDoubleTap: function() {
    this._hourDoubleTap = new HourDoubleTap({
      main: this.main,
      daysHolder: this.daysHolder,
      alldaysHolder: this.alldaysHolder,
      hourHeight: this._hourHeight
    });
    this._hourDoubleTap.setup();
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'dayChange':
        this._onDayChange(e.data[0]);
        break;
      case 'localized':
      case 'timeformatchange':
        this._localize();
        break;
      case 'wheel':
        this._onwheel(e);
        break;
    }
  },

  _onwheel: function(event) {
    if (event.deltaMode !== event.DOM_DELTA_PAGE || event.deltaX === 0) {
      return;
    }
    // Update dates based on the number of visible cells after screen reader
    // wheel.
    this._updateBaseDateAfterScroll(event.deltaX * this.visibleCells);
  },

  _onDayChange: function(date) {
    // _render() updates the _visibleRange, so we need to check it first
    var containedToday = this._visibleRange.contains(new Date());
    this.baseDate = date;
    this._render();
    if (!containedToday) {
      this._scrollToHour({ onlyToday: true });
    }
  },

  _localize: function() {
    this._setupHours();
    this._refreshCurrentTime();
  },

  _updateBaseDateAfterScroll: function(diff) {
    var day = createDayDiff(this.baseDate, diff);
    core.timeController.move(day);
    core.timeController.selectedDay = day;
  },

  _render: function() {
    var currentRange = this._getRange();
    this._removeDatesOutsideRange(currentRange);

    // very important to re-activate child views in case we change views
    // without moving to a different date
    this.children.forEach(child => child.onactive());

    this._addDatesInsideRange(currentRange);

    this._prevRange = currentRange;
    this._visibleRange = this._getVisibleRange();
    this._sortDays();
    this._setVisibleForScreenReader();
    this._pan.refresh();
    this._refreshCurrentTime();
  },

  _refreshCurrentTime: function() {
    this._currentTime.timespan = this._visibleRange;
    this._currentTime.refresh();
  },

  _setVisibleForScreenReader: function() {
    this.children.forEach(
      child => child.setVisibleForScreenReader(this._visibleRange));
  },

  _removeDatesOutsideRange: function(range) {
    if (this.children.length) {
      this.children = this.children.filter(child => {
        if (range.contains(child.date)) {
          return true;
        }
        child.destroy();
        return false;
      });
    }
  },

  _addDatesInsideRange: function(range) {
    this._getPendingDates(range)
      .forEach(date => {
        var day = new this.childClass({
          date: date,
          daysHolder: this.daysHolder,
          alldaysHolder: this.alldaysHolder,
          allDayIcon: this.allDayIcon,
          hourHeight: this._hourHeight,
          oneDayLabelFormat: this._oneDayLabelFormat
        });
        day.setup();
        this.children.push(day);
      });
  },

  _getPendingDates: function(range) {
    var dates = Calc.daysBetween(range);
    if (this._prevRange) {
      dates = dates.filter(date => {
        return !this._prevRange.contains(date);
      });
    }
    return dates;
  },

  _sortDays: function() {
    // decided to use float and reappend the elements in the right order
    // since using position:absolute or css transforms felt "slower"
    // (we have a reflow anyway since we might add new elements to the DOM)
    this.children
      .sort((a, b) => a.date - b.date)
      .forEach(day => day.append());
  },

  _getRange: function() {
    return new Timespan(
      createDayDiff(this.baseDate, -this.visibleCells),
      createDayDiff(this.baseDate, (this.visibleCells * 2) - 1)
    );
  },

  _getVisibleRange: function() {
    return new Timespan(
      this.baseDate,
      createDayDiff(this.baseDate, this.visibleCells)
    );
  },

  _resetScroll: function() {
    this.main.scrollTop = 0;
  },

  _scrollToHour: function(options) {
    var hour = this._getScrollDestinationHour(options);
    if (hour != null) {
      animatedScroll({
        content: this.mainContent,
        container: this.main,
        scrollTop: hour * this._hourHeight
      });
    }
  },

  _getScrollDestinationHour: function(options) {
    var hour = options && options.hour;
    if (hour != null) {
      return hour;
    }

    var now = new Date();
    if (this._visibleRange.contains(now)) {
      return Math.max(now.getHours() - 1, 0);
    }

    return (options && options.onlyToday) ? null : 8;
  },

  oninactive: function() {
    this.element.classList.remove(View.ACTIVE);
    core.timeController.removeEventListener('dayChange', this);
    this.children.forEach(child => child.oninactive());
  }
};

function createDayDiff(date, diff) {
  return createDay(date, date.getDate() + diff);
}

});


define('views/week',['require','exports','module','common/calc','shared/intl_helper','./multi_day','dom!week-view'],function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var IntlHelper = require('shared/intl_helper');
var MultiDay = require('./multi_day');

require('dom!week-view');

IntlHelper.define('week-hour-format', 'mozdatetime', {
  hour: 'numeric',
  dayperiod: true,
});

function WeekView(opts) {
  MultiDay.apply(this, arguments);
}
module.exports = WeekView;

WeekView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'week',
  visibleCells: 5,
  _hourFormat: 'week-hour-format',
  _oneDayLabelFormat: 'week-event-one-day-duration',
  _addAmPmClass: true,

  get element() {
    return document.getElementById('week-view');
  },

  _calcBaseDate: function(date) {
    // Don't reset the first day when come back from other screens.
    if (this.baseDate && Calc.isSameDate(date, this.baseDate)) {
      return this.baseDate;
    }

    // Show monday as the first day of the grid if date is between Mon-Fri.
    var index = Calc.dayOfWeekFromMonday(date.getDay());
    if (index < 5) {
      date = Calc.createDay(date, date.getDate() - index);
    }
    return date;
  }
};

});

/* global mozIntl */
define('templates/alarm',['require','exports','module','template'],function(require, exports, module) {
'use strict';

var create = require('template').create;

var MINUTE = 60;
var HOUR = 3600;
var DAY = 86400;
var WEEK = 604800;
var MORNING = HOUR * 9;
var layouts = {
  standard: [
    'none',
    0,
    0 - MINUTE * 5,
    0 - MINUTE * 15,
    0 - MINUTE * 30,
    0 - HOUR,
    0 - HOUR * 2,
    0 - DAY
  ],
  allday: [
    'none',
    0 + MORNING,
    0 - DAY + MORNING,
    0 - DAY * 2 + MORNING,
    0 - WEEK + MORNING,
    0 - WEEK * 2 + MORNING
  ]
};

var Alarm = create({
  reminder: function() {
    var alarmContent = '';
    var alarms = this.arg('alarms');
    var isAllDay = this.arg('isAllDay');

    var i = 0;
    var alarm;
    while ((alarm = alarms[i])) {
      i++;
      alarmContent += Alarm.description.render({
        trigger: alarm.trigger,
        layout: isAllDay ? 'allday' : 'standard'
      });
    }

    return alarmContent;
  },

  description: function() {
    var {id, data} = getL10n(this.arg('trigger'), this.arg('layout'));
    var args = JSON.stringify(data);
    var description = navigator.mozL10n.get(id, data);

    return `<div role="listitem" data-l10n-id="${id}"
      data-l10n-args=\'${args}\'>
        ${description}
      </div>`;
  },

  // builds a list of <option>
  options: function() {
    var content = '';
    var selected;
    var foundSelected = false;

    var trigger = this.arg('trigger');
    var layout = this.arg('layout') || 'standard';
    var options = layouts[layout];

    var i = 0;
    var iLen = options.length;

    for (; i < iLen; i++) {
      selected = false;

      // trigger option 'selected' by normalizing imported dates
      if (layout === 'allday') {
        if (options[i] === (trigger + MORNING)) {
          trigger += MORNING;
        }
      }

      if (!selected && trigger && options[i] === trigger) {
        selected = true;
        foundSelected = true;
      }

      content += Alarm.option.render({
        selected: selected,
        layout: layout,
        value: options[i]
      });
    }

    // foundSelected is used in cases where user is editing an event that has
    // a custom reminder value (X minutes/hours/days before event) and that
    // is an option that we don't support internally on the calendar app.
    // we always add a new <option> using the custom value and mark it as
    // selected.
    if (!foundSelected && /^-?\d+$/.test(trigger)) {
      content += Alarm.option.render({
        selected: true,
        layout: layout,
        value: trigger
      });
    }

    return content;
  },

  option: function() {
    var _ = navigator.mozL10n.get;

    var layout = this.arg('layout');
    var value = this.arg('value');
    var selected = this.arg('selected');

    var l10n = getL10n(value, layout);

    var content = [
      '<option',
      'value="' + value + '"',
      (selected ? 'selected' : ''),
      'data-l10n-id="' + l10n.id + '"',
      'data-l10n-args=\'' + JSON.stringify(l10n.data) + '\'>',
      _(l10n.id, l10n.data) + '</option>'
    ].join(' ');

    return content;
  },

  picker: function() {
    return '<span class="button icon icon-dialog">' +
      '<select name="alarm[]">' +
        Alarm.options.render(this.data) +
      '</select>' +
    '</span>';
  }
});

function getL10n(trigger, layout) {
  if (trigger === 'none') {
    return {
      id: trigger,
      data: {}
    };
  }

  // Format the display text based on a zero-offset trigger
  if (layout === 'allday') {
    var options = layouts.allday;
    if (options.indexOf(trigger) !== -1) {
      trigger -= MORNING;
    }
  }

  if (trigger === 0) {
    return {
      id: 'alarm-at-event-' + layout,
      data: {}
    };
  }

  var affix = trigger > 0 ? 'after' : 'before';
  var part = mozIntl._gaia.relativePart(trigger * 1000);
  return {
    id: part.unit + '-' + affix,
    data: {
      value: part.value
    }
  };
}
module.exports = Alarm;

});

define('templates/account',['require','exports','module','template'],function(require, exports, module) {
'use strict';

var create = require('template').create;

module.exports = create({
  provider: function() {
    var name = this.h('name');
    return `<li class="${name}" role="presentation">
        <a data-l10n-id="preset-${name}" role="option" dir="auto"
           data-provider="${name}" href="/create-account/${name}">
        </a>
      </li>`;
  },

  account: function() {
    var id = this.h('id');
    var preset = this.h('preset');
    var user = this.h('user');

    return `<li id="account-${id}" role="presentation">
        <a href="/update-account/${id}" role="option" dir="auto">
          <span class="preset" data-l10n-id="preset-${preset}"></span>
          <span class="user">${user}</span>
        </a>
      </li>`;
  }
});

});


define('views/advanced_settings',['require','exports','module','templates/alarm','view','ext/co','core','utils/dom','router','templates/account','dom!advanced-settings-view'],function(require, exports, module) {
'use strict';

var AlarmTemplate = require('templates/alarm');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var dom = require('utils/dom');
var router = require('router');
var template = require('templates/account');

require('dom!advanced-settings-view');

function AdvancedSettings(options) {
  View.apply(this, arguments);
}
module.exports = AdvancedSettings;

AdvancedSettings.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#advanced-settings-view',
    accountList: '#advanced-settings-view .account-list',
    createAccountButton: '#advanced-settings-view .create-account',
    syncFrequency: '#setting-sync-frequency',
    header: '#advanced-settings-header',
    standardAlarmLabel: '#default-event-alarm',
    alldayAlarmLabel: '#default-allday-alarm'
  },

  get accountList() {
    return this._findElement('accountList');
  },

  get createAccountButton() {
    return this._findElement('createAccountButton');
  },

  get syncFrequency() {
    return this._findElement('syncFrequency');
  },

  get standardAlarmLabel() {
    return this._findElement('standardAlarmLabel');
  },

  get alldayAlarmLabel() {
    return this._findElement('alldayAlarmLabel');
  },

  get header() {
    return this._findElement('header');
  },

  get standardAlarm() {
    return this.standardAlarmLabel.querySelector('select');
  },

  get alldayAlarm() {
    return this.alldayAlarmLabel.querySelector('select');
  },

  _formatModel: function(model) {
    // XXX: Here for l10n
    return {
      id: model._id,
      preset: model.preset,
      user: model.user,
      hasError: !!model.error
    };
  },

  _initEvents: function() {
    var bridge = core.bridge;
    bridge.observeAccounts().listen(this._renderAccounts.bind(this));
    bridge.observeSetting('syncFrequency').listen(
      this._renderSyncFrequency.bind(this)
    );

    this.createAccountButton.addEventListener('click',
                                             this.onCreateAccount.bind(this));
    this.syncFrequency.addEventListener('change', this);

    this.standardAlarmLabel.addEventListener('change', this);
    this.alldayAlarmLabel.addEventListener('change', this);
  },

  handleSettingUiChange: function(type, value) {
    // basic conversions
    if (value === 'null') {
      value = null;
    }

    switch (type) {
      case 'alldayAlarmDefault':
      case 'standardAlarmDefault':
      case 'syncFrequency':
        if (value !== null) {
          value = parseInt(value);
        }
        core.bridge.setSetting(type, value);
        break;
    }
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'change':
        var target = event.target;
        this.handleSettingUiChange(target.name, target.value);
        break;
    }
  },

  onCreateAccount: function(event) {
    event.stopPropagation();
    event.preventDefault();
    router.show(event.target.getAttribute('href'));
  },

  render: co.wrap(function *() {
    this.header.runFontFitSoon();

    // the accounts and syncFrequency are already handled by the _initEvents
    var bridge = core.bridge;
    var data = yield {
      standardAlarmDefault: bridge.getSetting('standardAlarmDefault'),
      alldayAlarmDefault: bridge.getSetting('alldayAlarmDefault')
    };

    this._renderAlarmDefault('standard', data.standardAlarmDefault);
    this._renderAlarmDefault('allday', data.alldayAlarmDefault);
  }),

  _renderSyncFrequency: function(value) {
    this.syncFrequency.value = String(value);
  },

  _renderAccounts: function(accounts) {
    this.accountList.innerHTML = '';

    accounts
    .filter(data => data.provider.hasAccountSettings)
    .forEach(data => {
      var model = data.account;
      var idx = this.accountList.children.length;
      var item = template.account.render(this._formatModel(model));
      this.accountList.insertAdjacentHTML('beforeend', item);

      if (model.error) {
        this.accountList.children[idx].classList.add('error');
      }
    });
  },

  _renderAlarmDefault: function(type, value) {
    var element = type + 'AlarmLabel';
    dom.removeElements(this[element].querySelector('select'));

    // Render the select box
    var template = AlarmTemplate;
    var select = document.createElement('select');
    select.name = type + 'AlarmDefault';
    select.innerHTML = template.options.render({
      layout: type,
      trigger: value
    });
    this[element].querySelector('.button').appendChild(select);
  },

  onfirstseen: function() {
    this._initEvents();
    this.render();
  }
};

});


define('views/create_account',['require','exports','module','common/presets','view','ext/co','core','templates/account','dom!create-account-view'],function(require, exports, module) {
'use strict';

var Presets = require('common/presets');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var template = require('templates/account');

require('dom!create-account-view');

function CreateAccount(options) {
  View.apply(this, arguments);
  this.cancel = this.cancel.bind(this);
}
module.exports = CreateAccount;

CreateAccount.prototype = {
  __proto__: View.prototype,

  _changeToken: 0,

  presets: Presets,

  selectors: {
    element: '#create-account-view',
    accounts: '#create-account-presets',
    header: '#create-account-header'
  },

  get accounts() {
    return this._findElement('accounts');
  },

  get header() {
    return this._findElement('header');
  },

  _initEvents: function() {
    this._accountStream = core.bridge.observeAccounts();
    this._accountStream.listen(() => this.render());
    this.header.addEventListener('action', this.cancel);
  },

  destroy: function() {
    this._accountStream && this._accountStream.cancel();
    this.header.removeEventListener('action', this.cancel);
  },

  render: co.wrap(function *() {
    var presets = this.presets;
    var listElement = this.accounts;
    var currentToken = ++this._changeToken;

    listElement.innerHTML = '';

    function renderPreset(presetName) {
      listElement.insertAdjacentHTML(
        'beforeend',
        template.provider.render({ name: presetName })
      );
    }

    try {
      var available = yield core.bridge.availablePresets(presets);
      if (this._changeToken !== currentToken) {
        // another render call takes priority over this one.
        return;
      }
      available.forEach(renderPreset);
    } catch (err) {
      console.error('Error displaying presets', err);
    }
  }),

  onfirstseen: function() {
    // render will be called as a side-effect of _initEvents
    this._initEvents();
  },

  cancel: function() {
    window.history.back();
  }
};

});


define('views/day',['require','exports','module','./multi_day','dom!day-view'],function(require, exports, module) {
'use strict';

var MultiDay = require('./multi_day');

require('dom!day-view');

function DayView(opts) {
  MultiDay.apply(this, arguments);
}
module.exports = DayView;

DayView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'day',
  visibleCells: 1,

  get element() {
    return document.getElementById('day-view');
  }
};

});


define('oauth_window',['require','exports','module','querystring','view','dom!oauth2'],function(require, exports, module) {
'use strict';

var QueryString = require('querystring');
var View = require('view');

require('dom!oauth2');

/**
 * Creates a oAuth dialog given a set of parameters.
 *
 *    var oauth = new OAuthWindow(
 *      elementContainer,
 *      'https://accounts.google.com/o/oauth2/auth',
 *      {
 *        response_type: 'code',
 *        client_id: 'xxx',
 *        scope: 'https://www.googleapis.com/auth/calendar',
 *        redirect_uri: 'xxx',
 *        state: 'foobar',
 *        access_type: 'offline',
 *        approval_prompt: 'force'
 *      }
 *    );
 *
 *    oauth.oncomplete = function(evt) {
 *      if (evt.detail.code) {
 *        // success
 *      }
 *    };
 *
 *    oauth.onabort = function() {
 *      // oauth was aborted
 *    };
 *
 *
 */
function OAuthWindow(container, server, params) {
  if (!params.redirect_uri) {
    throw new Error(
      'must provide params.redirect_uri so oauth flow can complete'
    );
  }

  this.params = {};
  for (var key in params) {
    this.params[key] = params[key];
  }

  this._element = container;

  View.call(this);
  this.target = server + '?' + QueryString.stringify(params);

  this._handleUserTriggeredClose =
    this._handleUserTriggeredClose.bind(this);
}
module.exports = OAuthWindow;

OAuthWindow.prototype = {
  __proto__: View.prototype,

  get element() {
    return this._element;
  },

  get isOpen() {
    return !!this.browserFrame;
  },

  selectors: {
    browserHeader: 'gaia-header',
    browserTitle: 'gaia-header > h1',
    browserContainer: '.browser-container'
  },

  get browserContainer() {
    return this._findElement('browserContainer', this.element);
  },

  get browserTitle() {
    return this._findElement('browserTitle', this.element);
  },

  get browserHeader() {
    return this._findElement('browserHeader', this.element);
  },

  _handleFinalRedirect: function(url) {
    this.close();

    if (this.oncomplete) {
      var params;

      // find query string
      var queryStringIdx = url.indexOf('?');
      if (queryStringIdx !== -1) {
        params = QueryString.parse(url.slice(queryStringIdx + 1));
      }

      this.oncomplete(params || {});
    }
  },

  _handleLocationChange: function(url) {
    this.browserTitle.textContent = url;
  },

  _handleUserTriggeredClose: function() {
    // close the oauth flow
    this.close();

    // trigger an event so others can cleanup
    if (this.onabort) {
      this.onabort();
    }
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'mozbrowserlocationchange':
        var url = event.detail;
        if (url.indexOf(this.params.redirect_uri) === 0) {
          return this._handleFinalRedirect(url);
        }
        this._handleLocationChange(url);
        break;
    }
  },

  open: function() {
    if (this.browserFrame) {
      throw new Error('attempting to open frame while another is open');
    }

    // add the active class
    this.element.classList.add(View.ACTIVE);

    // handle cancel events
    this.browserHeader.addEventListener(
      'action', this._handleUserTriggeredClose
    );

    // setup browser iframe
    var iframe = this.browserFrame =
      document.createElement('iframe');

    iframe.setAttribute('mozbrowser', true);
    iframe.setAttribute('src', this.target);

    this.browserContainer.appendChild(iframe);

    iframe.addEventListener('mozbrowserlocationchange', this);
  },

  close: function() {
    if (!this.isOpen) {
      return;
    }

    this.browserFrame.removeEventListener(
      'mozbrowserlocationchange', this
    );

    this.browserHeader.removeEventListener(
      'action', this._handleUserTriggeredClose
    );

    this.element.classList.remove(View.ACTIVE);

    this.browserFrame.parentNode.removeChild(
      this.browserFrame
    );

    this.browserFrame = undefined;
  }
};

});

define('utils/uri',['require','exports','module'],function(require, exports) {
'use strict';

/**
 * Get the port of the url.
 * @param {string} url full url.
 * @return {?number} port number, null if none found.
 */
exports.getPort = function(url) {
  var parts = url.split(':');
  if (parts.length < 2) {
    return null;
  }

  // If we found a port and path, it's the last part
  var candidate = parts[parts.length - 1];
  parts = candidate.split('/');

  // If we found a port, it's the first part
  candidate = parts[0];
  if (!isInteger(candidate)) {
    return null;
  }

  return parseInt(candidate, 10);
};

/**
 * Get the scheme of the url. Note that this only detects http and https.
 * @param {string} url full url.
 * @return {?string} uri scheme (ie http), null if none found.
 */
exports.getScheme = function(url) {
  var parts = url.split(':');
  if (parts.length < 2) {
    return null;
  }


  // If we found a scheme, it's the first part
  var candidate = parts[0];
  if (candidate !== 'http' && candidate !== 'https') {
    return null;
  }

  return candidate;
};

/**
 * Decide whether or not this string represents an integer.
 * @param {string} str some string.
 * @param {boolean} whether or not str represents an integer.
 */
function isInteger(str) {
  return (/^\d+$/).test(str);
}

});


define('views/modify_account',['require','exports','module','models/account','oauth_window','common/presets','utils/uri','view','ext/co','core','common/is_offline','router','dom!modify-account-view'],function(require, exports, module) {
'use strict';

var Account = require('models/account');
var OAuthWindow = require('oauth_window');
var Presets = require('common/presets');
var URI = require('utils/uri');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var isOffline = require('common/is_offline');
var router = require('router');

require('dom!modify-account-view');

var DEFAULT_AUTH_TYPE = 'basic';
var OAUTH_AUTH_CREDENTIALS = [
  'client_id',
  'scope',
  'redirect_uri',
  'state'
];

function ModifyAccount(options) {
  View.apply(this, arguments);

  this.deleteRecord = this.deleteRecord.bind(this);
  this.cancel = this.cancel.bind(this);
  this.displayOAuth2 = this.displayOAuth2.bind(this);
  this.hideHeaderAndForm = this.hideHeaderAndForm.bind(this);
  this.cancelDelete = this.cancelDelete.bind(this);

  // bound so we can add remove listeners
  this._boundSaveUpdateModel = this.save.bind(this, { updateModel: true });
}
module.exports = ModifyAccount;

ModifyAccount.prototype = {
  __proto__: View.prototype,

  _changeToken: 0,

  selectors: {
    element: '#modify-account-view',
    form: '.modify-account-form',
    fields: '*[name]',
    saveButton: '#modify-account-view .save',
    deleteButton: '#modify-account-view .delete-confirm',
    deleteRecordButton: '.delete-record',
    cancelDeleteButton: '#modify-account-view .delete-cancel',
    header: '#modify-account-header',
    status: '#modify-account-view section[role="status"]',
    errors: '#modify-account-view .errors',
    oauth2Window: '#oauth2',
    oauth2SignIn: '#modify-account-view .force-oauth2'
  },

  progressClass: 'in-progress',
  removeDialogClass: 'remove-dialog',

  get authenticationType() {
    if (this.preset && this.preset.authenticationType) {
      return this.preset.authenticationType;
    }

    return DEFAULT_AUTH_TYPE;
  },

  get oauth2Window() {
    return this._findElement('oauth2Window');
  },

  get oauth2SignIn() {
    return this._findElement('oauth2SignIn');
  },

  get deleteRecordButton() {
    return this._findElement('deleteRecordButton');
  },

  get deleteButton() {
    return this._findElement('deleteButton');
  },

  get cancelDeleteButton() {
    return this._findElement('cancelDeleteButton');
  },

  get header() {
    return this._findElement('header');
  },

  get saveButton() {
    return this._findElement('saveButton');
  },

  get form() {
    return this._findElement('form');
  },

  get fields() {
    if (!this._fields) {
      var result = this._fields = {};
      var elements = this.element.querySelectorAll(
        this.selectors.fields
      );

      var i = 0;
      var len = elements.length;

      for (i; i < len; i++) {
        var el = elements[i];
        result[el.getAttribute('name')] = el;
      }
    }

    return this._fields;
  },

  updateForm: function() {
    var update = ['user', 'fullUrl'];

    update.forEach(function(name) {
      var field = this.fields[name];
      field.value = this.model[name];
    }, this);
  },

  updateModel: function() {
    var update = ['user', 'password', 'fullUrl'];

    update.forEach(function(name) {
      var field = this.fields[name];
      var value = field.value;
      if (name === 'fullUrl') {
        // Prepend a scheme if url has neither port nor scheme
        var port = URI.getPort(value);
        var scheme = URI.getScheme(value);
        if (!port && !scheme) {
          value = 'https://' + value;
        }
      }

      this.model[name] = value;
    }, this);
  },

  deleteRecord: function(e) {
    if (e) {
      e.preventDefault();
    }

    // begin the removal (which will emit the preRemove event) but don't wait
    // for it to complete...
    core.bridge.deleteAccount(this.model._id);

    // semi-hack clear the :target - harmless in tests
    // but important in the current UI because css :target
    // does not get cleared (for some reason)
    window.location.replace('#');

    // TODO: in the future we may want to store the entry
    // url of this view and use that instead of this
    // hard coded value...
    router.show('/advanced-settings/');
  },

  cancel: function(event) {
    if (event) {
      event.preventDefault();
    }

    window.history.back();
  },

  cancelDelete: function(event) {
    this.element.classList.remove(this.removeDialogClass);
    this.cancel(event);
  },

  isOffline: isOffline,

  save: co.wrap(function *(options, e) {

    if (e) {
      e.preventDefault();
    }

    var list = this.element.classList;

    if (this.isOffline()) {
      this.showErrors([{name: 'offline'}]);
      return;
    }

    list.add(this.progressClass);

    this.errors.textContent = '';

    if (options && options.updateModel) {
      this.updateModel();
    }

    try {
      yield core.bridge.createAccount(this.model);
      list.remove(this.progressClass);
      router.go(this.completeUrl);
    } catch(err) {
      list.remove(this.progressClass);
      this.showErrors(err);
    }
  }),

  hideHeaderAndForm: function() {
    this.element.classList.add(this.removeDialogClass);
  },

  displayOAuth2: function(event) {
    if (event) {
      event.preventDefault();
    }

    var self = this;
    this.oauth2Window.classList.add(View.ACTIVE);

    navigator.mozApps.getSelf().onsuccess = function(e) {
      var app = e.target.result;
      app.clearBrowserData().onsuccess = function() {
        self._redirectToOAuthFlow();
      };
    };
  },

  /**
   * @param {String} preset name of value in Calendar.Presets.
   */
  _createModel: function(preset, callback) {
    var settings = Presets[preset];
    var model = new Account(settings.options);
    model.preset = preset;
    return model;
  },

  _redirectToOAuthFlow: function() {

    var apiCredentials = this.preset.apiCredentials;
    var params = {
      /*
       * code response type for now might change when we can use window.open
       */
      response_type: 'code',
      /* offline so we get refresh_token[s] */
      access_type: 'offline',
      /* we us force so we always get a refresh_token */
      approval_prompt: 'force'
    };

    OAUTH_AUTH_CREDENTIALS.forEach(function(key) {
      if (key in apiCredentials) {
        params[key] = apiCredentials[key];
      }
    });

    var oauth = this._oauthDialog = new OAuthWindow(
      this.oauth2Window,
      apiCredentials.authorizationUrl,
      params
    );

    var self = this;

    oauth.open();
    oauth.onabort = function() {
      self.cancel();
    };

    oauth.oncomplete = function(params) {
      if ('error' in params) {
        // Ruh roh
        return self.cancel();
      }

      if (!params.code) {
        return console.error('authentication error');
      }

      // Fistpump!
      self.model.oauth = { code: params.code };
      self.save();
    };
  },

  render: function() {
    if (!this.model) {
      throw new Error('must provider model to ModifyAccount');
    }

    this.form.addEventListener('submit', this._boundSaveUpdateModel);
    this.saveButton.addEventListener('click', this._boundSaveUpdateModel);
    this.header.addEventListener('action', this.cancel);
    this.deleteRecordButton.addEventListener('click', this.hideHeaderAndForm);

    if (this.model._id) {
      this.type = 'update';
      this.deleteButton.addEventListener('click', this.deleteRecord);
      this.cancelDeleteButton.addEventListener('click', this.cancelDelete);
    } else {
      this.type = 'create';
    }

    var list = this.element.classList;
    list.add(this.type);
    list.add('preset-' + this.model.preset);
    list.add('provider-' + this.model.providerType);
    list.add('auth-' + this.authenticationType);

    if (this.model.error) {
      list.add('error');
    }

    if (this.authenticationType === 'oauth2') {
      this.oauth2SignIn.addEventListener('click', this.displayOAuth2);

      if (this.type === 'create') {
        this.displayOAuth2();
      }

      this.fields.user.disabled = true;
      this.saveButton.disabled = true;
    }

    this.form.reset();
    this.updateForm();

    var usernameType = this.model.usernameType;
    this.fields.user.type = (usernameType === undefined) ?
        'text' : usernameType;

    this.header.runFontFitSoon();
 },

  destroy: function() {
    var list = this.element.classList;

    list.remove(this.type);

    list.remove('preset-' + this.model.preset);
    list.remove('provider-' + this.model.providerType);
    list.remove('auth-' + this.authenticationType);
    list.remove('error');
    list.remove(this.removeDialogClass);

    this.fields.user.disabled = false;
    this.saveButton.disabled = false;

    this._fields = null;
    this.form.reset();

    this.deleteRecordButton.removeEventListener('click',
      this.hideHeaderAndForm);
    this.oauth2SignIn.removeEventListener('click', this.displayOAuth2);
    this.saveButton.removeEventListener('click', this._boundSaveUpdateModel);
    this.deleteButton.removeEventListener('click', this.deleteRecord);
    this.cancelDeleteButton.removeEventListener('click', this.cancelDelete);
    this.header.removeEventListener('action',
                                    this.cancel);
    this.form.removeEventListener('submit', this._boundSaveUpdateModel);
  },

  dispatch: co.wrap(function *(data) {
    if (this.model) {
      this.destroy();
    }

    var params = data.params;
    var changeToken = ++this._changeToken;

    this.completeUrl = '/settings/';

    try {
      var model;
      if (params.id) {
        model = yield core.bridge.getAccount(params.id);
      } else if (params.preset) {
        model = this._createModel(params.preset);
      }

      this.preset = Presets[model.preset];

      // race condition another dispatch has queued
      // while we where waiting for an async event.
      if (this._changeToken !== changeToken) {
        return;
      }

      this.model = model;
      this.render();
    } catch (err) {
      console.error('Error displaying model in ModifyAccount', data, err);
    }
  }),

  oninactive: function() {
    View.prototype.oninactive.apply(this, arguments);

    if (this._oauthDialog) {
      this._oauthDialog.close();
      this._oauthDialog = null;
    }
  }
};

});

define('models/event',['require','exports','module','common/calc','common/probably_parse_int'],function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var probablyParseInt = require('common/probably_parse_int');

/**
 * Creates a wrapper around a event instance from the db
 */
function Event(data) {
  var isNew = false;

  if (typeof(data) === 'undefined') {
    isNew = true;
    data = Object.create(null);
    data.remote = {};
  }

  this.data = data;
  /** shortcut */
  var remote = this.remote = this.data.remote;

  if ('start' in remote && !('startDate' in remote)) {
    remote.startDate = Calc.dateFromTransport(
      remote.start
    );
  }

  if ('end' in remote && !('endDate' in remote)) {
    remote.endDate = Calc.dateFromTransport(
      remote.end
    );
  }

  if (isNew) {
    this.resetToDefaults();
  }

  var start = this.remote.startDate;
  var end = this.remote.endDate;

  // the typeof check is to see if we have already
  // set the value in resetToDefaults (or prior)
  if (
      typeof(this._isAllDay) === 'undefined' &&
      Calc.isOnlyDate(start) &&
      Calc.isOnlyDate(end)
  ) {
    // mostly to handle the case before the time
    // where we actually managed isAllDay as a setter.
    this.isAllDay = true;
  } else {
    // not on prototype intentionally because
    // we need to either need to resetToDefaults
    // or check startDate/endDate in the constructor.
    this.isAllDay = false;
  }
}
module.exports = Event;

Event.prototype = {

  /**
   * Sets default values of an event.
   */
  resetToDefaults: function() {
    var now = new Date();

    this.isAllDay = false;

    this.startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    this.endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
  },

  get _id() {
    return this.data._id;
  },

  _setDate: function(date, field) {
    if (!(date instanceof Date)) {
      throw new TypeError('must pass instance of Date');
    }

    var allDay = this.isAllDay;

    if (allDay) {
      // clone the existing date
      date = new Date(date.valueOf());

      // filter out the stuff we don't care about
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
    }

    this.remote[field] = Calc.dateToTransport(
      date,
      null, // TODO allow setting tzid
      allDay
    );

    this.remote[field + 'Date'] = date;
  },

  /* start date */

  get startDate() {
    return this.remote.startDate;
  },

  set startDate(value) {
    this._setDate(value, 'start');
  },

  /* end date */

  get endDate() {
    return this.remote.endDate;
  },

  set endDate(value) {
    this._setDate(value, 'end');
  },

  set isAllDay(value) {
    this._isAllDay = value;

    // send values through the their setter.
    if (this.endDate) {
      this.endDate = this.endDate;
    }

    if (this.startDate) {
      this.startDate = this.startDate;
    }
  },

  get isAllDay() {
    return this._isAllDay;
  },

  /* associated records */

  get calendarId() {
    return this.data.calendarId;
  },

  set calendarId(value) {
    if (value && typeof(value) !== 'number') {
      value = probablyParseInt(value);
    }

    this.data.calendarId = value;
  },

  /* simple setters */

  get syncToken() {
    return this.remote.syncToken;
  },

  set syncToken(value) {
    this.remote.syncToken = value;
  },

  get title() {
    return this.remote.title || '';
  },

  set title(value) {
    this.remote.title = value;
  },

  get description() {
    return this.remote.description || '';
  },

  set description(value) {
    this.remote.description = value;
  },

  get location() {
    return this.remote.location || '';
  },

  set location(value) {
    this.remote.location = value;
    return this.remote.location;
  },

  get alarms() {
    return this.remote.alarms || [];
  },

  set alarms(value) {
    this.remote.alarms = value;
    return this.remote.alarms;
  },

  /**
   * If data doesn't have any errors, the event
   * takes on the attributes of data.
   *
   * @param {Object} data, object that contains
   *  at least some attributes of the event object.
   *
   * @return {Object} errors if validationErrors returns erros,
   *  true otherwise.
   */
  updateAttributes: function(data) {
    var errors = this.validationErrors(data);
    if (errors) {
      return errors;
    }
    for (var field in data) {
      this[field] = data[field];
    }
    return true;
  },

  /**
   * Validates the contents of the model.
   *
   * Output example:
   *
   *   [
   *     {
   *       name: 'invalidDate',
   *       properties: ['startDate', 'endDate']
   *     }
   *     //...
   *   ]
   *
   * @param {Object} data, optional object that contains
   *  at least some attributes of the event object.
   * @return {Array|False} see above.
   */
  validationErrors: function(data) {
    var obj = data || this;
    var end = obj.endDate.valueOf();
    var start = obj.startDate.valueOf();
    var errors = [];

    if (start >= end) {
      errors.push({
        name: 'start-after-end'
      });
    }

    if (errors.length) {
      return errors;
    }

    return false;
  }
};

});

define('views/event_base',['require','exports','module','models/event','view','ext/co','core','common/calc','common/next_tick','router'],function(require, exports, module) {
'use strict';

var Event = require('models/event');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var isToday = require('common/calc').isToday;
var nextTick = require('common/next_tick');
var router = require('router');

function EventBase(options) {
  View.apply(this, arguments);

  this._els = Object.create(null);
  this._changeToken = 0;

  this.cancel = this.cancel.bind(this);
  this.primary = this.primary.bind(this);
  this._initEvents();
}
module.exports = EventBase;

EventBase.prototype = {
  __proto__: View.prototype,

  READONLY: 'readonly',
  CREATE: 'create',
  UPDATE: 'update',
  PROGRESS: 'in-progress',
  ALLDAY: 'allday',
  LOADING: 'loading',

  DEFAULT_VIEW: '/month/',

  _initEvents: function() {
    this.header.addEventListener('action', this.cancel);
    this.primaryButton.addEventListener('click', this.primary);
  },

  uiSelector: '.%',

  get header() {
    return this._findElement('header');
  },

  get primaryButton() {
    return this._findElement('primaryButton');
  },

  get fieldRoot() {
    return this.element;
  },

  /**
   * Returns the url the view will "redirect" to
   * after completing the current add/edit/delete operation.
   *
   * @return {String} redirect url.
   */
  returnTo: function() {
    var path = this._returnTo || this.DEFAULT_VIEW;
    return path;
  },

  /**
   * Returns the top level URL, or returnTo()
   * Resets the returnTop variable so we can override on next visit
   */
  returnTop: function() {
    var path = this._returnTop || this.returnTo();
    delete this._returnTop;
    return path;
  },

  /**
   * Dismiss modification and go back to previous screen.
   */
  cancel: function() {
    window.history.back();
  },

  /**
   * This method is overridden
   */
  primary: function() {},

  /**
   * This method is overridden
   */
  _markReadonly: function() {},

  /**
   * When the event is something like this:
   * 2012-01-02 and we detect this is an all day event
   * we want to display the end date like this 2012-01-02.
   */
  formatEndDate: function(endDate) {
    if (
      endDate.getHours() === 0 &&
      endDate.getSeconds() === 0 &&
      endDate.getMinutes() === 0
    ) {
      // subtract the date to give the user a better
      // idea of which dates the event spans...
      endDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate() - 1
      );
    }

    return endDate;
  },

  /**
   * Assigns and displays event & busytime information.
   * Marks view as "loading"
   *
   * @param {{event, busytime, capabilities}} record
   */
  _useModel: function(record) {
    this.record = record;
    this.event = new Event(record.event);
    this.busytime = record.busytime;
    this.originalCalendar = record.calendar;

    if (!record.capabilities.canUpdate) {
      this._markReadonly(true);
      this.element.classList.add(this.READONLY);
    }

    // inheritance hook...
    this._updateUI();
  },

  /** override me! **/
  _updateUI: function() {},

  /**
   * Loads event and triggers form update.
   * Gracefully will handle race conditions
   * if rapidly switching between events.
   * TODO: This token may no longer be needed
   *   as we have an aria-disabled guard now.
   *
   * @param {String} id busytime id.
   */
  _loadModel: co.wrap(function *(id) {
    var token = ++this._changeToken;
    var classList = this.element.classList;
    var result = Promise.resolve();

    classList.add(this.LOADING);

    try {
      var record = yield core.bridge.fetchRecord(id);
      if (token === this._changeToken) {
        this._useModel(record);
      }
    } catch(err) {
      console.error(`Error looking up records for id: ${id}`);
      console.error(`${err.message}\n${err.stack}`);
      result = Promise.reject(err);
    }

    classList.remove(this.LOADING);

    return result;
  }),

  /**
   * Builds and sets defaults for a new model.
   *
   * @return {Calendar.Models.Model} new model.
   */
  _createModel: function(time) {
    // time can be null in some cases, default to today (eg. unit tests)
    time = time || new Date();

    this._setDefaultHour(time);

    var model = new Event();
    model.startDate = time;

    var end = new Date(time.valueOf());
    end.setHours(end.getHours() + 1);

    model.endDate = end;

    return model;
  },

  _setDefaultHour: function(date) {
    if (isToday(date)) {
      var now = new Date();
      // events created today default to begining of the next hour
      date.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      // events created on other days default to 8AM
      date.setHours(8, 0, 0, 0);
    }
  },

  /**
   * Gets and caches an element by selector
   */
  getEl: function(name) {
    if (!(name in this._els)) {
      var el = this.fieldRoot.querySelector(
        this.uiSelector.replace('%', name)
      );
      if (el) {
        this._els[name] = el;
      }
    }
    return this._els[name];
  },

  oninactive: function() {
    View.prototype.oninactive.apply(this, arguments);
  },

  /**
   * Handles the url parameters for when this view
   * comes into focus.
   *
   * When the (busytime) id parameter is given the event will
   * be found via the time controller.
   */
  dispatch: function(data) {
    // always remove loading initially (to prevent worst case)
    this.element.classList.remove(this.LOADING);

    // Re-run the header font fit when it comes into view.
    // Since the header is already in the markup on load and the view is hidden
    // the font fit calculations will be wrong initially.
    this.header.runFontFitSoon();

    var id = data.params.id;
    var classList = this.element.classList;
    var last = router.last;

    if (last && last.path) {
      if (!(/^\/(day|event|month|week)/.test(last.path))) {
        // We came from some place suspicious so fall back to default.
        this._returnTo = this.DEFAULT_VIEW;
      } else {
        // Return to the default view if we just added an event.
        // Else go back to where we came from.
        this._returnTo = /^\/event\/add\//.test(last.path) ?
            this.DEFAULT_VIEW : last.path;
      }
    }

    if (!this._returnTop && this._returnTo) {
      this._returnTop = this._returnTo;
    }

    var completeDispatch = () => this.ondispatch && this.ondispatch();

    if (id) {
      classList.add(this.UPDATE);

      this._loadModel(id).then(completeDispatch);
    } else {
      classList.add(this.CREATE);

      var controller = core.timeController;
      this.event = this._createModel(controller.mostRecentDay);
      this._updateUI();

      nextTick(completeDispatch);
    }

    this.primaryButton.removeAttribute('aria-disabled');
  },

  onfirstseen: function() {}

};

});

/* exported InputParser */


/**
 * Stateless object for input parser functions..
 * The intent is the methods here will only relate to the parsing
 * of input[type="date|time"]
 */
var InputParser = (function() {

  var InputParser = {
    _dateParts: ['year', 'month', 'date'],
    _timeParts: ['hours', 'minutes', 'seconds'],

    /**
     * Import HTML5 input[type="time"] string value
     *
     * @param {String} value 23:20:50.52, 17:39:57.
     * @return {Object} { hours: 23, minutes: 20, seconds: 50 }.
     */
    importTime: function(value) {
      var result = {
        hours: 0,
        minutes: 0,
        seconds: 0
      };

      if (!value) {
        return result;
      }


      var parts = value.split(':');
      var part;
      var partName;

      var i = 0;
      var len = InputParser._timeParts.length;

      for (; i < len; i++) {
        partName = InputParser._timeParts[i];
        part = parts[i];
        if (part) {
          result[partName] = parseInt(part.slice(0, 2), 10) || 0;
        }
      }

      return result;
    },

    /**
     * Export date to HTML5 input[type="time"]
     *
     * @param {Date} value export value.
     * @return {String} 17:39:57.
     */
    exportTime: function(value) {
      return value.toLocaleString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },

    /**
     * Import HTML5 input[type="time"] to object.
     *
     * @param {String} value 1997-12-19.
     * @return {Object} { year: 1997, month: 12, date: 19 }.
     */
    importDate: function(value) {
      var result = {
        year: 0,
        month: 0,
        date: 0
      };

      if (!value) {
        return result;
      }

      var parts = value.split('-');
      var part;
      var partName;

      var i = 0;
      var len = InputParser._dateParts.length;

      for (; i < len; i++) {
        partName = InputParser._dateParts[i];
        part = parts[i];
        if (part) {
          result[partName] = parseInt(part, 10);
        }
      }

      if (result.month > 0) {
        result.month = result.month - 1;
      }

      result.date = result.date || 1;

      return result;
    },

    /**
     * Export js local date to HTML5 input[type="date"].
     *
     * @param {Date} value export value.
     * @return {String} date string (1997-12-19).
     */
    exportDate: function(value) {
      var year = value.getFullYear();
      var month = value.getMonth() + 1;
      var day = value.getDate();

      if (month < 10) {
        month = `0${month}`;
      }
      if (day < 10) {
        day = `0${day}`;
      }
      return `${year}-${month}-${day}`;
    },

    /**
     * Designed to take a date & time value from
     * html5 input types and returns a JS Date.
     *
     * @param {String} date input date.
     * @param {String} time input time.
     *
     * @return {Date} full date object from date/time.
     */
    formatInputDate: function(date, time) {
      time = InputParser.importTime(time);
      date = InputParser.importDate(date);

      return new Date(
        date.year,
        date.month,
        date.date,
        time.hours,
        time.minutes,
        time.seconds
      );
    },
  };

  return InputParser;
}());

define("shared/input_parser", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.InputParser;
    };
}(this)));


define('views/modify_event',['require','exports','module','templates/alarm','./event_base','shared/input_parser','shared/intl_helper','querystring','ext/co','core','common/constants','notification','router','./factory','dom!modify-event-view'],function(require, exports, module) {
'use strict';

var AlarmTemplate = require('templates/alarm');
var EventBase = require('./event_base');
var InputParser = require('shared/input_parser');
var IntlHelper = require('shared/intl_helper');
var QueryString = require('querystring');
var co = require('ext/co');
var core = require('core');
var localCalendarId = require('common/constants').localCalendarId;
var notification = require('notification');
var router = require('router');
var viewFactory = require('./factory');

require('dom!modify-event-view');

IntlHelper.define('formalDate', 'datetime', {
  month: '2-digit',
  year: '2-digit',
  day: '2-digit'
});

IntlHelper.define('shortTime', 'datetime', {
  hour: 'numeric',
  minute: 'numeric'
});

function ModifyEvent(options) {
  this.deleteRecord = this.deleteRecord.bind(this);
  this._toggleAllDay = this._toggleAllDay.bind(this);
  EventBase.apply(this, arguments);
}
module.exports = ModifyEvent;

ModifyEvent.prototype = {
  __proto__: EventBase.prototype,

  ERROR_PREFIX: 'event-error-',

  MAX_ALARMS: 5,

  formats: {
    date: 'formalDate',
    time: 'shortTime',
  },

  selectors: {
    element: '#modify-event-view',
    alarmList: '#modify-event-view .alarms',
    form: '#modify-event-view form',
    startTimeLocale: '#start-time-locale',
    endDateLocale: '#end-date-locale',
    endTimeLocale: '#end-time-locale',
    status: '#modify-event-view section[role="status"]',
    errors: '#modify-event-view .errors',
    primaryButton: '#modify-event-view .save',
    deleteButton: '#modify-event-view .delete-record',
    header: '#modify-event-header'
  },

  uiSelector: '[name="%"]',

  _duration: 0, // The duration between start and end dates.

  _initEvents: function() {
    EventBase.prototype._initEvents.apply(this, arguments);

    this.deleteButton.addEventListener('click', this.deleteRecord);
    this.form.addEventListener('click', this.focusHandler);
    this.form.addEventListener('submit', this.primary);
    this.form.addEventListener('input', this._toggleSave.bind(this));

    var allday = this.getEl('allday');
    allday.addEventListener('change', this._toggleAllDay);

    this.alarmList.addEventListener('change', this._changeAlarm.bind(this));
  },

  /**
   * Fired when the allday checkbox changes.
   */
  _toggleAllDay: function(e) {
    var allday = this.getEl('allday').checked;

    if (allday) {
      // enable case
      this.element.classList.add(this.ALLDAY);
    } else {
      // disable case
      this.element.classList.remove(this.ALLDAY);
      if (e) {
        // only reset the start/end time if coming from an user interaction
        this._resetDateTime();
      }
    }

    // because of race conditions it is theoretically possible
    // for the user to check/uncheck this value
    // when we don't actually have a model loaded.
    if (this.event) {
      this.event.isAllDay = !!allday;
    }

    // Reset alarms if we come from a user event
    if (e) {
      this.event.alarms = [];
      this.updateAlarms(allday);
    }
  },

  _resetDateTime: function() {
    // if start event was "all day" and switch to regular event start/end time
    // will be the same, so we reset to default start time, otherwise we keep
    // the previously selected value
    var startDateTime = this._getStartDateTime();
    if (startDateTime === this._getEndDateTime()) {
      var startDate = new Date(startDateTime);
      this._setDefaultHour(startDate);
      this.getEl('startTime').value = InputParser.exportTime(startDate);
      this._renderDateTimeLocale(
        this._findElement('startTimeLocale'), startDate);
      // default event duration is 1 hour
      this._duration = 60 * 60 * 1000;
      this._setEndDateTimeWithCurrentDuration();
    }
  },

  /**
   * Called when any alarm is changed
   */
  _changeAlarm: function(e) {
    var template = AlarmTemplate;
    if (e.target.value == 'none') {
      var parent = e.target.parentNode;
      parent.parentNode.removeChild(parent);
      return;
    }

    // Append a new alarm select only if we don't have an empty one or if we
    // didn't reach the maximum number of alarms
    var alarms = this.queryAlarms();
    if (alarms.length >= this.MAX_ALARMS ||
        alarms.some(el => el.value === 'none')) {
      return;
    }

    var newAlarm = document.createElement('div');
    newAlarm.innerHTML = template.picker.render({
      layout: this.event.isAllDay ? 'allday' : 'standard'
    });
    this.alarmList.appendChild(newAlarm);
  },

  /**
   * Check if current event has been stored in the database
   */
  isSaved: function() {
    return this.element.classList.contains(this.UPDATE);
  },

  /**
   * Build the initial list of calendar ids.
   */
  onfirstseen: function() {
    // we need to notify users (specially automation tests) somehow that the
    // options are still being loaded from DB, this is very important to
    // avoid race conditions (eg.  trying to set calendar before list is
    // built) notice that we also add the class to the markup because on some
    // really rare occasions "onfirstseen" is called after the EventBase
    // removed the "loading" class from the root element (seen it happen less
    // than 1% of the time)
    this.getEl('calendarId').classList.add(this.LOADING);
  },

  _renderCalendars: function(records) {
    // remove old calendars (this will be called every time we have a change on
    // any calendar)
    var select = this.getEl('calendarId');
    // remove all the options
    select.options.length = 0;
    select.classList.remove(this.LOADING);

    records
    .filter(r => r.capabilities.canCreateEvent)
    .forEach(record => {
      var id = record.calendar._id;
      var {name} = record.calendar.remote;
      var option = document.createElement('option');

      if (id === localCalendarId) {
        option.text = navigator.mozL10n.get('calendar-local');
        option.setAttribute('data-l10n-id', 'calendar-local');
      } else {
        option.text = name;
      }

      option.value = id;
      select.add(option);
    });
  },

  /**
   * Mark all field's readOnly flag.
   *
   * @param {Boolean} boolean true/false.
   */
  _markReadonly: function(boolean) {
    var i = 0;
    var fields = this.form.querySelectorAll('[name]');
    var len = fields.length;

    for (; i < len; i++) {
      fields[i].readOnly = boolean;
    }
  },

  queryAlarms: function() {
    return Array.from(document.querySelectorAll('[name="alarm[]"]'));
  },

  get alarmList() {
    return this._findElement('alarmList');
  },

  get form() {
    return this._findElement('form');
  },

  get deleteButton() {
    return this._findElement('deleteButton');
  },

  get fieldRoot() {
    return this.form;
  },

  /**
   * Ask the provider to persist an event:
   *
   *  1. update the model with form data
   *
   *  2. send it to the provider if it has the capability
   *
   *  3. set the position of the calendar to startDate of new/edited event.
   *
   *  4. redirect to last view.
   *
   * For now both update & create share the same
   * behaviour (redirect) in the future we may change this.
   */
  _persistEvent: co.wrap(function *(method) {
    // create model data
    var data = this.formData();
    var errors;

    // we check explicitly for true, because the alternative
    // is an error object.
    if ((errors = this.event.updateAttributes(data)) !== true) {
      this.showErrors(errors);
      return;
    }

    // can't create without a calendar id
    // because of defaults this should be impossible.
    if (!data.calendarId) {
      return;
    }

    // mark view as 'in progress' so we can style
    // it via css during that time period
    this.element.classList.add(this.PROGRESS);

    try {
      // need to store date before async operation (event might change)
      var moveDate = this.event.startDate;
      yield core.bridge[method](this.event);
      // move the position in the calendar to the added/edited day
      core.timeController.move(moveDate);
      // order is important the above method triggers the building
      // of the dom elements so selectedDay must come after.
      core.timeController.selectedDay = moveDate;
      this._navigateAfterPersist(method, moveDate);
    } catch(err) {
      this.showErrors(err);
    }

    this.element.classList.remove(this.PROGRESS);
  }),

  _navigateAfterPersist: function(method, moveDate) {
    // we pass the date so we are able to scroll to the event on the
    // day/week views
    var state = {
      eventStartHour: moveDate.getHours()
    };

    if (method === 'updateEvent') {
      // If we edit a view our history stack looks like:
      //   /week -> /event/view -> /event/save -> /event/view
      // We need to return all the way to the top of the stack
      // We can remove this once we have a history stack
      viewFactory.get('ViewEvent', v => router.go(v.returnTop(), state));
      return;
    }

    router.go(this.returnTo(), state);
  },

  /**
   * Deletes current record if provider is present and has the capability.
   */
  deleteRecord: co.wrap(function *(event) {
    if (event) {
      event.preventDefault();
    }

    if (!this.isSaved()) {
      return;
    }

    try {
      yield notification.revokeNotificationsForEvent(this.event);
      yield core.bridge.deleteEvent(this.event);
      // If we edit a view our history stack looks like:
      //   /week -> /event/view -> /event/save -> /event/view
      // We need to return all the way to the top of the stack
      // We can remove this once we have a history stack
      viewFactory.get('ViewEvent', view => router.go(view.returnTop()));
    } catch (err) {
      this.showErrors(err);
    }
  }),

  /**
   * Persist current model.
   */
  primary: function(event) {
    if (event) {
      event.preventDefault();
    }

    // Disable the button on primary event to avoid race conditions
    this.disablePrimary();

    if (this.isSaved()) {
      this._persistEvent('updateEvent');
    } else {
      this._persistEvent('createEvent');
    }
  },

  /**
   * Enlarges focus areas for .button controls
   */
  focusHandler: function(e) {
    var input = e.target.querySelector('input, select');
    if (input && e.target.classList.contains('button')) {
      input.focus();
    }
  },

  /**
   * Export form information into a format
   * the model can understand.
   *
   * @return {Object} formatted data suitable
   *                  for use with Calendar.Model.Event.
   */
  formData: function() {
    var fields = {
      title: this.getEl('title').value,
      location: this.getEl('location').value,
      description: this.getEl('description').value,
      calendarId: this.getEl('calendarId').value
    };

    var startTime;
    var endTime;
    var allday = this.getEl('allday').checked;

    if (allday) {
      startTime = null;
      endTime = null;
    } else {
      startTime = this.getEl('startTime').value;
      endTime = this.getEl('endTime').value;
    }

    fields.startDate = InputParser.formatInputDate(
      this.getEl('startDate').value,
      startTime
    );

    fields.endDate = InputParser.formatInputDate(
      this.getEl('endDate').value,
      endTime
    );

    // Yahoo uses the same start and end date & time for all day events.
    // In order to distinguish all-day event from Yahoo calendar and event
    // with 0 duration we set duration of the event starting and ending at
    // the same date and time to 1 millisecond.
    if (!allday && fields.endDate.getTime() === fields.startDate.getTime()) {
      fields.endDate.setTime(
        fields.startDate.getTime() + 1
      );
    }

    if (allday) {
      // when the event is all day we display the same
      // day that the entire event spans but we must actually
      // end the event at the first second, minute hour of the next
      // day. This will ensure the server handles it as an all day event.
      fields.endDate.setDate(
        fields.endDate.getDate() + 1
      );
    }

    fields.alarms = [];
    var triggers = ['none'];
    this.queryAlarms().forEach(alarm => {
      if (triggers.indexOf(alarm.value) !== -1) {
        return;
      }

      triggers.push(alarm.value);

      fields.alarms.push({
        action: 'DISPLAY',
        trigger: parseInt(alarm.value, 10)
      });
    });

    return fields;
  },

  enablePrimary: function() {
    var btn = this.primaryButton;
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('disabled');
  },

  disablePrimary: function() {
    var btn = this.primaryButton;
    btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('disabled', 'disabled');
  },

  /**
   * Re-enable the primary button when we show errors
   */
  showErrors: function() {
    this.enablePrimary();
    EventBase.prototype.showErrors.apply(this, arguments);
  },

  /**
   * Read the urlparams and override stuff on our event model.
   * @param {string} search Optional string of the form ?foo=bar&cat=dog.
   * @private
   */
  _overrideEvent: function(search) {
    if (!search) {
      var hash = window.location.hash;
      search = hash.split('?')[1];
    }

    if (!search || search.length === 0) {
      return;
    }

    // Remove the question mark that begins the search.
    if (search.substr(0, 1) === '?') {
      search = search.substr(1, search.length - 1);
    }

    var field, value;
    // Parse the urlparams.
    var params = QueryString.parse(search);
    for (field in params) {
      value = params[field];
      switch (field) {
        case ModifyEvent.OverrideableField.START_DATE:
        case ModifyEvent.OverrideableField.END_DATE:
          params[field] = new Date(value);
          break;
        default:
          params[field] = value;
          break;
      }
    }

    // Override fields on our event.
    var model = this.event;
    for (field in ModifyEvent.OverrideableField) {
      value = ModifyEvent.OverrideableField[field];
      model[value] = params[value] || model[value];
    }
  },

  /**
   * Updates form to use values from the current model.
   *
   * Does not handle readonly flags or calenarId associations.
   * Suitable for use in pre-populating values for both new and
   * existing events.
   *
   * Resets any value on the current form.
   */
  _updateUI: function() {
    this._overrideEvent();
    this.form.reset();

    var model = this.event;
    this.getEl('title').value = model.title;
    this.getEl('location').value = model.location;
    var dateSrc = model;
    if (model.remote.isRecurring && this.busytime) {
      dateSrc = this.busytime;
    }

    var startDate = dateSrc.startDate;
    var endDate = dateSrc.endDate;
    this._duration = endDate.getTime() - startDate.getTime();

    // update the allday status of the view
    var allday = this.getEl('allday');
    if (allday && (allday.checked = model.isAllDay)) {
      this._toggleAllDay();
      endDate = this.formatEndDate(endDate);
    }

    this.getEl('startDate').value = InputParser.exportDate(startDate);
    this._setupDateTimeSync('startDate', 'start-date-locale', startDate);

    this.getEl('endDate').value = InputParser.exportDate(endDate);
    this._setupDateTimeSync('endDate', 'end-date-locale', endDate);

    this.getEl('startTime').value = InputParser.exportTime(startDate);
    this._setupDateTimeSync('startTime', 'start-time-locale', startDate);

    this.getEl('endTime').value = InputParser.exportTime(endDate);
    this._setupDateTimeSync('endTime', 'end-time-locale', endDate);

    this.getEl('description').textContent = model.description;

    // update calendar id
    this.getEl('calendarId').value = model.calendarId;

    // calendar display
    var currentCalendar = this.getEl('currentCalendar');

    if (this.originalCalendar) {
      currentCalendar.value =
        this.originalCalendar.remote.name;

      currentCalendar.readOnly = true;
    }

    this.updateAlarms(model.isAllDay);
    this._toggleSave();
  },

  _toggleSave: function() {
    var enabled = this.getEl('title').value || this.getEl('location').value;
    if (enabled) {
      this.enablePrimary();
    } else {
      this.disablePrimary();
    }
  },

  /**
   * Handling a layer over <input> to have localized
   * date/time
   */
  _setupDateTimeSync: function(src, target, value) {
    var targetElement = document.getElementById(target);
    if (!targetElement) {
      return;
    }
    this._renderDateTimeLocale(targetElement, value);

    var type = targetElement.dataset.type;
    var callback = type === 'date' ?
      this._updateDateLocaleOnInput : this._updateTimeLocaleOnInput;

    this.getEl(src)
      .addEventListener('input', function(e) {
        callback.call(this, targetElement, e);

        // We only auto change the end date and end time
        // when user changes start date or start time,
        // or end datetime is before start datetime
        // after changing end date or end time.
        // Otherwise, we don't auto change end date and end time.
        if (targetElement.id === 'start-date-locale' ||
            targetElement.id === 'start-time-locale') {
          this._setEndDateTimeWithCurrentDuration();
        } else if (this._getEndDateTime() < this._getStartDateTime()) {
          this._setEndDateTimeWithCurrentDuration();
          this.showErrors({
            name: type === 'date' ?
              'start-date-after-end-date' :
              'start-time-after-end-time'
          });
        }

        this._duration = this._getEndDateTime() - this._getStartDateTime();
      }.bind(this));
  },

  _setEndDateTimeWithCurrentDuration: function() {
    var date = new Date(this._getStartDateTime() + this._duration);
    var endDateLocale = this._findElement('endDateLocale');
    var endTimeLocale = this._findElement('endTimeLocale');
    this.getEl('endDate').value = InputParser.exportDate(date);
    this.getEl('endTime').value = InputParser.exportTime(date);
    this._renderDateTimeLocale(endDateLocale, date);
    this._renderDateTimeLocale(endTimeLocale, date);
  },

  _getStartDateTime: function() {
    return new Date(this.getEl('startDate').value + 'T' +
      this.getEl('startTime').value).getTime();
  },

  _getEndDateTime: function() {
    return new Date(this.getEl('endDate').value + 'T' +
      this.getEl('endTime').value).getTime();
  },

  _renderDateTimeLocale: function(targetElement, value) {
    // we inject the targetElement to make it easier to test
    var type = targetElement.dataset.type;
    var formatName = this.formats[type];
    var formatter = IntlHelper.get(formatName);
    targetElement.textContent = formatter.format(value);
    // we need to store the format and date for l10n
    targetElement.setAttribute('data-l10n-date-format', formatName);
    targetElement.dataset.date = value;
  },

  _updateDateLocaleOnInput: function(targetElement, e) {
    var selected = InputParser.importDate(e.target.value);
    // use date constructor to avoid issues, see Bug 966516
    var date = new Date(selected.year, selected.month, selected.date);
    this._renderDateTimeLocale(targetElement, date);
  },

  _updateTimeLocaleOnInput: function(targetElement, e) {
    var selected = InputParser.importTime(e.target.value);
    var date = new Date();
    date.setHours(selected.hours);
    date.setMinutes(selected.minutes);
    date.setSeconds(0);
    this._renderDateTimeLocale(targetElement, date);
  },

  /**
   * Called on render or when toggling an all-day event
   */
  updateAlarms: co.wrap(function *(isAllDay) {
    var template = AlarmTemplate;
    var alarms = [];

    // Used to make sure we don't duplicate alarms
    var alarmMap = {};

    if (this.event.alarms) {
      //jshint boss:true
      for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
        alarmMap[alarm.trigger] = true;
        alarm.layout = isAllDay ? 'allday' : 'standard';
        alarms.push(alarm);
      }
    }

    var layout = isAllDay ? 'allday' : 'standard';
    var value = yield core.bridge.getSetting(layout + 'AlarmDefault');

    if (!this.isSaved() && !alarmMap[value] && !this.event.alarms.length) {
      alarms.push({
        layout: layout,
        trigger: value
      });
    }

    // Bug_898242 to show an event when default is 'none',
    // we check if the event is not saved, if so, we push
    // the default alarm on to the list.
    if ((value === 'none' && this.isSaved()) || value !== 'none') {
      alarms.push({
        layout: layout
      });
    }

    this.alarmList.innerHTML = template.picker.renderEach(alarms).join('');
  }),

  reset: function() {
    var list = this.element.classList;

    list.remove(this.UPDATE);
    list.remove(this.CREATE);
    list.remove(this.READONLY);
    list.remove(this.ALLDAY);

    var allday = this.getEl('allday');

    if (allday) {
      allday.checked = false;
    }

    this._returnTo = null;
    this._markReadonly(false);
    this.event = null;
    this.busytime = null;

    this.alarmList.innerHTML = '';

    this.form.reset();
  },

  onactive: function() {
    EventBase.prototype.onactive.apply(this, arguments);
    this.calendarStream = core.bridge.observeCalendars();
    this.calendarStream.listen(this._renderCalendars.bind(this));
  },

  oninactive: function() {
    EventBase.prototype.oninactive.apply(this, arguments);
    this.reset();
    this.calendarStream && this.calendarStream.cancel();
  }
};

/**
 * The fields on our event model which urlparams may override.
 * @enum {string}
 */
ModifyEvent.OverrideableField = {
  CALENDAR_ID: 'calendarId',
  DESCRIPTION: 'description',
  END_DATE: 'endDate',
  IS_ALL_DAY: 'isAllDay',
  LOCATION: 'location',
  START_DATE: 'startDate',
  TITLE: 'title'
};

});

define('templates/calendar',['require','exports','module','template','common/constants'],function(require, exports, module) {
'use strict';

var create = require('template').create;
var localCalendarId = require('common/constants').localCalendarId;

module.exports = create({
  item: function() {
    var id = this.h('_id');
    var color = this.h('color');
    var l10n = '';
    var name = '';

    // localize only the default calendar; there is no need to set the name
    // the [data-l10n-id] will take care of setting the proper value
    if (id && localCalendarId === id) {
      // localize the default calendar name
      l10n = 'data-l10n-id="calendar-local"';
    } else {
      name = this.h('name');
    }

    var checked = this.bool('localDisplayed', 'checked');

    return `<li id="calendar-${id}" role="presentation">
        <div class="gaia-icon icon-calendar-dot" style="color:${color}"
             aria-hidden="true"></div>
        <gaia-checkbox class="invisible" value="${id}" ${checked}/>
          <label ${l10n} class="name" dir="auto">${name}</label>
        </gaia-checkbox>
      </li>`;
  }
});

});


define('views/settings',['require','exports','module','templates/calendar','view','ext/co','core','common/debug','router','dom!settings'],function(require, exports, module) {
'use strict';

var CalendarTemplate = require('templates/calendar');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var debug = require('common/debug')('views/settings');
var router = require('router');

require('dom!settings');

function Settings(options) {
  View.apply(this, arguments);

  this.calendarList = [];
  this._hideSettings = this._hideSettings.bind(this);
  this._onDrawerTransitionEnd = this._onDrawerTransitionEnd.bind(this);

  this._observeUI();
}
module.exports = Settings;

Settings.prototype = {
  __proto__: View.prototype,

  calendarList: null,

  /**
   * used internally to check if calendar and account data was loaded from db
   * @type {Promise}
   * @private
   */
  _load: null,

  waitBeforePersist: 600,

  /**
   * Local update is a flag
   * used to indicate that the incoming
   * update was made by this view and
   * should not fire the _update method.
   */
  _localUpdate: false,

  /**
   * Name of the class that will be applied to the
   * body element when sync is in progress.
   */
  selectors: {
    element: '#settings',
    calendars: '#settings .calendars',
    calendarName: '.name',
    toolbar: '#settings [role="tablist"]',
    header: '#settings-header',
    headerTitle: '#settings-header h1',

    // A dark semi-opaque layer that is used to "gray out" the view behind
    // the element used for settings. Tapping on it will also close out
    // the settings element, per ux desire.
    shield: '#settings .settings-shield',

    // This outer div is used to hide .settings-drawer via an
    // overflow: hidden, so that the .settings-drawer can translateY
    // animate downward and appear to come out from under the view
    // header that is visible "behind" the element used for settings.
    drawerContainer: '#settings .settings-drawer-container',

    // Holds the actual visible drawer contents: list of calendars
    // and bottom toolbar.
    drawer: '#settings .settings-drawer',

    advancedSettingsButton: '#settings .settings',
    syncButton: '#settings .sync',
    syncProgress: '#settings .sync-progress',

    // A view that settings overlays. Still needs to be active/visible but
    // hidden from the screen reader.
    timeViews: '#time-views'
  },

  get calendars() {
    return this._findElement('calendars');
  },

  get toolbar() {
    return this._findElement('toolbar');
  },

  get header() {
    return this._findElement('header');
  },

  get headerTitle() {
    return this._findElement('headerTitle');
  },

  get shield() {
    return this._findElement('shield');
  },

  get drawerContainer() {
    return this._findElement('drawerContainer');
  },

  get drawer() {
    return this._findElement('drawer');
  },

  get advancedSettingsButton() {
    return this._findElement('advancedSettingsButton');
  },

  get syncButton() {
    return this._findElement('syncButton');
  },

  get syncProgress() {
    return this._findElement('syncProgress');
  },

  get timeViews() {
    return this._findElement('timeViews');
  },

  _syncStartStatus: function () {
    this.syncProgress.setAttribute('data-l10n-id', 'sync-progress-syncing');
    this.syncProgress.classList.add('syncing');
  },

  _syncCompleteStatus: function () {
    this.syncProgress.setAttribute('data-l10n-id', 'sync-progress-complete');
    this.syncProgress.classList.remove('syncing');
  },

  _observeUI: function() {
    this.advancedSettingsButton.addEventListener('click', function(e) {
      e.stopPropagation();
      router.show('/advanced-settings/');
    });

    this.syncButton.addEventListener('click', this._onSyncClick.bind(this));
    core.syncController.on('syncStart', this._syncStartStatus.bind(this));
    core.syncController.on('syncComplete',
      this._syncCompleteStatus.bind(this));

    this.calendars.addEventListener(
      'change', this._onCalendarDisplayToggle.bind(this)
    );
  },

  _observeAccounts: function() {
    var stream = core.bridge.observeAccounts();
    stream.listen(this._updateSyncButton.bind(this));
    return new Promise(resolve => stream.listen(resolve));
  },

  _observeCalendars: function() {
    var stream = core.bridge.observeCalendars();
    stream.listen(this._updateCalendars.bind(this));
    return new Promise(resolve => stream.listen(resolve));
  },

  _updateCalendars: function(records) {
    this.calendarList = records.map(r => r.calendar);
    this.render();
  },

  _persistCalendarDisplay: co.wrap(function *(id, displayed) {
    try {
      var calendar = this.calendarList.find(c => String(c._id) === String(id));
      // we "clone" the calendar otherwise the caching logic will affect the
      // 'calendarVisibilityChange' event (we check if value changed this way)
      calendar = Object.create(calendar);
      calendar.localDisplayed = displayed;
      yield core.bridge.updateCalendar(calendar);
    } catch (err) {
      console.error(`Can't save calendar display: ${err}`);
    }
  }),

  _onCalendarDisplayToggle: function(e) {
    var input = e.target;
    this._persistCalendarDisplay(input.getAttribute('value'), !!input.checked);
  },

  _onSyncClick: function() {
    // trigger the sync the syncStart/complete events
    // will hide/show the button.
    core.syncController.all();
  },

  // Ajust size of drawer scroll area to fit size of calendars, within
  // a min/max that is controlled by CSS. This has to be a manual
  // calculation because UX wants the list of calendars to form-fit
  // without a scrollbar, but enforce a minimum height and a maximum.
  // The alternative to this approach is to size drawerContainer and
  // drawer to be height 100%, and put the min/max height CSS on the
  // .calendars. However, that means the translate animation is over
  // a 100% height div, which ends up looking not so smooth on close
  // of the animation, since the actual visible content is about half
  // the size of that 100% and in the easing, zips by too quickly that
  // it is harder to track, almost looks like just a harder visibility
  // discontinuity.
  _setCalendarContainerSize: function() {
    var nodes = this.calendars.children;
    var calendarsHeight = nodes[0] ?
                          nodes[0].getBoundingClientRect().height *
                          nodes.length : 0;
    this.drawerContainer.style.height = (calendarsHeight +
                                  this.toolbar.clientHeight) + 'px';
  },

  onrender: function() {
    this._setCalendarContainerSize();
    this._rendered = true;
    this._animateDrawer();
  },

  render: function() {
    debug('Will render settings view.');
    this.calendars.innerHTML = '';

    debug('Inject calendars into settings list.');
    this.calendarList.forEach(calendar => {
      debug('Will add calendar to settings view', calendar.id, calendar);
      var html = CalendarTemplate.item.render(calendar);
      this.calendars.insertAdjacentHTML('beforeend', html);

      if (calendar.error) {
        console.error('Views.Settings calendar error:', calendar.error);
        var idx = this.calendars.children.length - 1;
        var el = this.calendars.children[idx];
        el.classList.add('error');
      }

      this._setCalendarContainerSize();
    });

    this.onrender && this.onrender();
  },

  _updateSyncButton: function(list) {
    var canSync = list.some(o => o.provider.canSync);
    this.toolbar.classList.toggle('noaccount', !canSync);
  },

  _onDrawerTransitionEnd: function(e) {
    this._updateDrawerAnimState('done');
    if (!document.body.classList.contains('settings-drawer-visible')) {
      router.resetState();
    }
  },

  // Update a state visible in the DOM for when animation is taking place.
  // This is mostly useful for a test hook to know when the animation is
  // done.
  _updateDrawerAnimState: function(state) {
    this.drawer.dataset.animstate = state;
  },

  _hideSettings: function() {
    this._updateDrawerAnimState('animating');
    document.body.classList.remove('settings-drawer-visible');
  },

  _animateDrawer: function() {
    // Wait for both _rendered and _activated before triggering
    // the animation, so that it is smooth, without jank due to
    // changes in style/layout from activating or rendering.
    // Also, set the style on the body, since other views will also
    // have items animate based on the class. For instance, the +
    // to add an event in the view-selector views fades out.
    if (!this._rendered) {
      return debug('Skip animation since not yet rendered.');
    }

    if (!this._activated) {
      return debug('Skip animation since not yet activated.');
    }

    var classList = document.body.classList;
    if (classList.contains('settings-drawer-visible')) {
      return debug('Skip animation since drawer already visible?');
    }

    this._updateDrawerAnimState('animating');
    classList.add('settings-drawer-visible');
  },

  _loadBaseData: function() {
    if (!this._load) {
      // make sure we only observe data once and wait until it's ready before
      // showing the animation
      this._load = Promise.all([
        this._observeCalendars(),
        this._observeAccounts()
      ]);
    }

    return this._load;
  },

  onactive: co.wrap(function *() {
    debug('Will do settings animation.');

    try {
      yield this._loadBaseData();
    } catch(err) {
      console.error('Error fetching calendars in View.Settings', err);
      return;
    }

    // View#onactive will call Views.Settings#render the first time.
    View.prototype.onactive.apply(this, arguments);

    // onactive can be called more times than oninactive, since
    // settings can overlay over and not trigger an inactive state,
    // so only bind these listeners and do the drawer animation once.
    if (document.body.classList.contains('settings-drawer-visible')) {
      return;
    }

    debug('Settings drawer is not visible... will activate.');
    this._activated = true;
    this._animateDrawer();

    // Set header title to same as time view header
    this.headerTitle.textContent =
      document.getElementById('current-month-year').textContent;

    // Both the transparent back and clicking on the semi-opaque
    // shield should close the settings since visually those sections
    // do not look like part of the drawer UI, and UX wants to give
    // the user a few options to close the drawer since there is no
    // explicit close button.
    this.header.addEventListener('action', this._hideSettings);
    this.shield.addEventListener('click', this._hideSettings);
    this.timeViews.setAttribute('aria-hidden', true);
    this.drawer.addEventListener('transitionend', this._onDrawerTransitionEnd);
  }),

  oninactive: function() {
    debug('Will deactivate settings.');
    View.prototype.oninactive.apply(this, arguments);
    this._activated = false;
    this.header.removeEventListener('action', this._hideSettings);
    this.shield.removeEventListener('click', this._hideSettings);
    this.timeViews.removeAttribute('aria-hidden');
    this.drawer.removeEventListener('transitionend',
                                 this._onDrawerTransitionEnd);
  }

};

Settings.prototype.onfirstseen = Settings.prototype.render;

});

define('templates/duration_time',['require','exports','module','common/calc','templates/date_span','template'],function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var DateSpan = require('templates/date_span');
var create = require('template').create;

var l10n = navigator.mozL10n;

module.exports = create({
  durationTime: function() {
    var format = '';
    var startDate = this.arg('startDate');
    var endDate = this.arg('endDate');
    var isAllDay = this.arg('isAllDay');

    if (isAllDay) {
      // Use the last second of previous day as the base for endDate
      // (e.g., 1991-09-14T23:59:59 insteads of 1991-09-15T00:00:00).
      endDate = new Date(endDate - 1000);
      format = Calc.isSameDate(startDate, endDate) ?
        'one-all-day-duration' :
        'multiple-all-day-duration';
    } else {
      format = Calc.isSameDate(startDate, endDate) ?
        'one-day-duration' :
        'multiple-day-duration';
    }

    return l10n.get(format, {
      startTime: formatTime(startDate),
      startDate: formatDate(startDate),
      endTime: formatTime(endDate),
      endDate: formatDate(endDate)
    });
  }
});

function formatDate(date) {
  return date.toLocaleString(navigator.languages, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(time) {
  return DateSpan.time.render({
    time: time,
    format: 'shortTimeFormat'
  });
}

});


define('views/view_event',['require','exports','module','templates/duration_time','./event_base','templates/alarm','common/constants','router','dom!event-view'],function(require, exports, module) {
'use strict';

var DurationTime = require('templates/duration_time');
var EventBase = require('./event_base');
var alarmTemplate = require('templates/alarm');
var localCalendarId = require('common/constants').localCalendarId;
var router = require('router');

require('dom!event-view');

function ViewEvent(options) {
  EventBase.apply(this, arguments);
}
module.exports = ViewEvent;

ViewEvent.prototype = {
  __proto__: EventBase.prototype,

  DEFAULT_VIEW: '/month/',

  selectors: {
    element: '#event-view',
    header: '#show-event-header',
    primaryButton: '#event-view .edit'
  },

  _initEvents: function() {
    EventBase.prototype._initEvents.apply(this, arguments);
  },

  /**
   * Dismiss modification and go back to previous screen.
   */
  cancel: function() {
    router.go(this.returnTop());
  },

  primary: function(event) {
    if (event) {
      event.preventDefault();
    }

    // Disable the button on primary event to avoid race conditions
    this.primaryButton.setAttribute('aria-disabled', 'true');

    router.go('/event/edit/' + this.busytime._id + '/');
  },

  /**
   * Mark the event readOnly
   * Hides/shows the edit button
   *
   * @param {Boolean} boolean true/false.
   */
  _markReadonly: function(boolean) {
    this.primaryButton.disabled = boolean;
  },

  /**
   * Sets content for an element
   * Hides the element if there's no content to set
   */
  setContent: function(element, content, method) {
    method = method || 'textContent';
    element = this.getEl(element);
    element.querySelector('.content')[method] = content;

    if (!content) {
      element.style.display = 'none';
    } else {
      element.style.display = '';
    }
  },

  /**
   * Updates the UI to use values from the current model.
   */
  _updateUI: function() {
    var model = this.event;

    this.setContent('title', model.title);
    this.setContent('location', model.location);

    if (this.originalCalendar) {
      this.element.querySelector('.icon-calendar-dot').style.color =
        this.originalCalendar.color;

      var calendarId = this.originalCalendar.remote.id;
      var isLocalCalendar = calendarId === localCalendarId;
      var calendarName = isLocalCalendar ?
        navigator.mozL10n.get('calendar-local') :
        this.originalCalendar.remote.name;

      this.setContent(
        'current-calendar',
        calendarName
      );

      if (isLocalCalendar) {
        this.getEl('current-calendar')
          .querySelector('.content')
          .setAttribute('data-l10n-id', 'calendar-local');
      }
    }

    var dateSrc = model;
    if (model.remote.isRecurring && this.busytime) {
      dateSrc = this.busytime;
    }

    var duationTimeContent = DurationTime.durationTime.render(dateSrc);
    this.setContent('duration-time', duationTimeContent, 'innerHTML');

    var alarmContent = '';
    var alarms = this.event.alarms;
    if (alarms) {
      this.getEl('alarms')
        .classList
        .toggle('multiple', alarms.length > 1);

      alarmContent = alarmTemplate.reminder.render({
        alarms: alarms,
        isAllDay: this.event.isAllDay,
      });
    }

    this.setContent('alarms', alarmContent, 'innerHTML');
    this.setContent('description', model.description);
  },

  oninactive: function() {
    EventBase.prototype.oninactive.apply(this, arguments);
    this._markReadonly(false);
  }
};

});


define("lazy_loaded", function(){});
