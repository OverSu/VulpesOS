;
(function (define) {
    'use strict';
    define([
        'require',
        'exports',
        'module',
        'gaia-component',
        'font-fit',
        'gaia-icons'
    ], function (require, exports, module) {
        var component = require('gaia-component');
        var fontFit = require('font-fit');
        require('gaia-icons');
        var debug = 0 ? console.log.bind(console) : function () {
        };
        const KNOWN_ACTIONS = {
            menu: 'menu',
            back: 'back',
            close: 'close'
        };
        const TITLE_FONT = 'italic 300 24px FiraSans';
        const TITLE_PADDING = 10;
        const MINIMUM_FONT_SIZE_CENTERED = 20;
        const MINIMUM_FONT_SIZE_UNCENTERED = 16;
        const MAXIMUM_FONT_SIZE = 23;
        module.exports = component.register('gaia-header', {
            extensible: false,
            dirObserver: true,
            created: function () {
                debug('created');
                this.setupShadowRoot();
                this.els = {
                    actionButton: this.shadowRoot.querySelector('.action-button'),
                    titles: this.getElementsByTagName('h1')
                };
                this.els.actionButton.addEventListener('click', e => this.onActionButtonClick(e));
                this.observer = new MutationObserver(this.onMutation.bind(this));
                this.ignoreDir = this.hasAttribute('ignore-dir');
                this.titleEnd = this.getAttribute('title-end');
                this.titleStart = this.getAttribute('title-start');
                this.noFontFit = this.getAttribute('no-font-fit');
                this.notFlush = this.hasAttribute('not-flush');
                this.action = this.getAttribute('action');
                this.unresolved = {};
                this.pending = {};
                this._resizeThrottlingId = null;
                this.onResize = this.onResize.bind(this);
            },
            attached: function () {
                debug('attached');
                this.runFontFitSoon();
                this.observerStart();
                window.addEventListener('resize', this.onResize);
            },
            detached: function () {
                debug('detached');
                window.removeEventListener('resize', this.onResize);
                this.observerStop();
                this.clearPending();
            },
            clearPending: function () {
                for (var key in this.pending) {
                    this.pending[key].clear();
                    delete this.pending[key];
                }
                window.cancelAnimationFrame(this._resizeThrottlingId);
                this._resizeThrottlingId = null;
            },
            runFontFit: function () {
                debug('run font-fit');
                if (this.noFontFit) {
                    return Promise.resolve();
                }
                var titles = this.els.titles;
                var space = this.getTitleSpace();
                var styles = [].map.call(titles, el => this.getTitleStyle(el, space));
                return this.setTitleStylesSoon(styles);
            },
            runFontFitSoon: function () {
                debug('run font-fit soon');
                if (this.pending.runFontFitSoon) {
                    return;
                }
                this.pending.runFontFitSoon = this.nextTick(() => {
                    delete this.pending.runFontFitSoon;
                    this.runFontFit();
                });
            },
            getTitleStyle: function (el, space) {
                debug('get el style', el, space);
                var text = el.textContent;
                var styleId = space.start + text + space.end + '#' + space.value;
                if (!text || !text.trim()) {
                    return debug('exit: no text');
                }
                if (getStyleId(el) === styleId) {
                    return debug('exit: no change');
                }
                var marginStart = this.getTitleMarginStart();
                var textSpace = space.value - Math.abs(marginStart);
                var fontFitResult = this.fontFit(text, textSpace, { min: MINIMUM_FONT_SIZE_CENTERED });
                var overflowing = fontFitResult.overflowing;
                var padding = {
                    start: 0,
                    end: 0
                };
                if (overflowing) {
                    debug('title overflowing');
                    padding.start = !space.start ? TITLE_PADDING : 0;
                    padding.end = !space.end ? TITLE_PADDING : 0;
                    textSpace = space.value - padding.start - padding.end;
                    fontFitResult = this.fontFit(text, textSpace);
                    marginStart = 0;
                }
                return {
                    id: styleId,
                    fontSize: fontFitResult.fontSize,
                    marginStart: marginStart,
                    overflowing: overflowing,
                    padding: padding
                };
            },
            setTitleStylesSoon: function (styles) {
                debug('set title styles soon', styles);
                var key = 'setStyleTitlesSoon';
                this._titleStyles = styles;
                if (this.unresolved[key]) {
                    return this.unresolved[key];
                }
                this.unresolved[key] = new Promise(resolve => {
                    this.pending[key] = this.nextTick(() => {
                        var styles = this._titleStyles;
                        var els = this.els.titles;
                        [].forEach.call(els, (el, i) => {
                            if (!styles[i]) {
                                return debug('exit');
                            }
                            this.setTitleStyle(el, styles[i]);
                        });
                        delete this._titleStyles;
                        delete this.unresolved[key];
                        delete this.pending[key];
                        resolve();
                    });
                });
            },
            setTitleStyle: function (el, style) {
                debug('set title style', style);
                this.observerStop();
                if (this.ignoreDir) {
                    el.style.marginLeft = style.marginStart + 'px';
                    el.style.paddingLeft = style.padding.start + 'px';
                    el.style.paddingRight = style.padding.end + 'px';
                } else {
                    el.style.marginInlineStart = style.marginStart + 'px';
                    el.style.paddingInlineStart = style.padding.start + 'px';
                    el.style.paddingInlineEnd = style.padding.end + 'px';
                }
                el.style.fontSize = style.fontSize + 'px';
                setStyleId(el, style.id);
                this.observerStart();
            },
            fontFit: function (text, space, opts = {}) {
                debug('font fit:', text, space, opts);
                var fontFitArgs = {
                    font: TITLE_FONT,
                    min: opts.min || MINIMUM_FONT_SIZE_UNCENTERED,
                    max: MAXIMUM_FONT_SIZE,
                    text: text,
                    space: space
                };
                return fontFit(fontFitArgs);
            },
            observerStart: function () {
                if (this.observing) {
                    return;
                }
                this.observer.observe(this, {
                    childList: true,
                    attributes: true,
                    subtree: true
                });
                this.observing = true;
                debug('observer started');
            },
            observerStop: function () {
                if (!this.observing) {
                    return;
                }
                this.observer.disconnect();
                this.observing = false;
                debug('observer stopped');
            },
            onResize: function (e) {
                debug('onResize', this._resizeThrottlingId);
                if (this._resizeThrottlingId !== null) {
                    return;
                }
                this._resizeThrottlingId = window.requestAnimationFrame(() => {
                    this._resizeThrottlingId = null;
                    this.runFontFitSoon();
                });
            },
            onMutation: function (mutations) {
                debug('on mutation', mutations);
                if (!this.pending.runFontFitSoon) {
                    this.runFontFit();
                }
            },
            getTitleSpace: function () {
                var start = this.titleStart;
                var end = this.titleEnd;
                var space = this.getWidth() - start - end;
                var result = {
                    value: space,
                    start: start,
                    end: end
                };
                debug('get title space', result);
                return result;
            },
            getWidth: function () {
                var value = this.notFlush ? this.clientWidth : window.innerWidth;
                debug('get width', value);
                return value;
            },
            triggerAction: function () {
                if (this.action) {
                    this.els.actionButton.click();
                }
            },
            onActionButtonClick: function () {
                debug('action button click');
                var config = { detail: { type: this.action } };
                var e = new CustomEvent('action', config);
                setTimeout(() => this.dispatchEvent(e));
            },
            getTitleMarginStart: function () {
                var start = this.titleStart;
                var end = this.titleEnd;
                var marginStart = end - start;
                debug('get title margin start', marginStart);
                return marginStart;
            },
            getButtonsBeforeTitle: function () {
                var children = this.children;
                var l = children.length;
                var els = [];
                for (var i = 0; i < l; i++) {
                    var el = children[i];
                    if (el.tagName === 'H1') {
                        break;
                    }
                    if (!contributesToLayout(el)) {
                        continue;
                    }
                    els.push(el);
                }
                if (this.action) {
                    els.push(this.els.actionButton);
                }
                return els;
            },
            getButtonsAfterTitle: function () {
                var children = this.children;
                var els = [];
                for (var i = children.length - 1; i >= 0; i--) {
                    var el = children[i];
                    if (el.tagName === 'H1') {
                        break;
                    }
                    if (!contributesToLayout(el)) {
                        continue;
                    }
                    els.push(el);
                }
                return els;
            },
            sumButtonWidths: function (buttons) {
                var defaultWidth = 50;
                var sum = buttons.reduce((prev, button) => {
                    var isStandardButton = button === this.els.actionButton;
                    var width = isStandardButton ? defaultWidth : button.clientWidth;
                    return prev + width;
                }, 0);
                debug('sum button widths', buttons, sum);
                return sum;
            },
            attrs: {
                action: {
                    get: function () {
                        return this._action;
                    },
                    set: function (value) {
                        var action = KNOWN_ACTIONS[value];
                        if (action === this._action) {
                            return;
                        }
                        this.setAttr('action', action);
                        this._action = action;
                    }
                },
                titleStart: {
                    get: function () {
                        debug('get title-start');
                        if ('_titleStart' in this) {
                            return this._titleStart;
                        }
                        var buttons = this.getButtonsBeforeTitle();
                        var value = this.sumButtonWidths(buttons);
                        debug('get title-start', buttons, value);
                        return value;
                    },
                    set: function (value) {
                        debug('set title-start', value);
                        value = parseInt(value, 10);
                        if (value === this._titleStart || isNaN(value)) {
                            return;
                        }
                        this.setAttr('title-start', value);
                        this._titleStart = value;
                        debug('set');
                    }
                },
                titleEnd: {
                    get: function () {
                        debug('get title-end');
                        if ('_titleEnd' in this) {
                            return this._titleEnd;
                        }
                        var buttons = this.getButtonsAfterTitle();
                        return this.sumButtonWidths(buttons);
                    },
                    set: function (value) {
                        debug('set title-end', value);
                        value = parseInt(value, 10);
                        if (value === this._titleEnd || isNaN(value)) {
                            return;
                        }
                        this.setAttr('title-end', value);
                        this._titleEnd = value;
                    }
                },
                noFontFit: {
                    get: function () {
                        return this._noFontFit || false;
                    },
                    set: function (value) {
                        debug('set no-font-fit', value);
                        value = !!(value || value === '');
                        if (value === this.noFontFit) {
                            return;
                        }
                        this._noFontFit = value;
                        if (value) {
                            this.setAttr('no-font-fit', '');
                        } else {
                            this.removeAttr('no-font-fit');
                        }
                    }
                },
                ignoreDir: {
                    get: function () {
                        return this._ignoreDir || false;
                    },
                    set: function (value) {
                        debug('set ignore-dir', value);
                        value = !!(value || value === '');
                        if (value === this.ignoreDir) {
                            return;
                        }
                        this._ignoreDir = value;
                        this.dirObserver = !value;
                        if (value) {
                            this.setAttr('ignore-dir', '');
                        } else {
                            this.removeAttr('ignore-dir');
                        }
                    }
                }
            },
            template: `<div class="inner">
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

  </style>`,
            nextTick: nextTick
        });
        function contributesToLayout(el) {
            return el.localName !== 'style' && !el.hasAttribute('l10n-action');
        }
        function setStyleId(el, id) {
            el._styleId = id;
        }
        function getStyleId(el) {
            return el._styleId;
        }
        function nextTick(fn) {
            var cleared;
            Promise.resolve().then(() => {
                if (!cleared) {
                    fn();
                }
            });
            return {
                clear: function () {
                    cleared = true;
                }
            };
        }
    });
}(typeof define == 'function' && define.amd ? define : function (n, w) {
    'use strict';
    return typeof module == 'object' ? function (c) {
        c(require, exports, module);
    } : function (c) {
        var m = { exports: {} };
        c(function (n) {
            return w[n];
        }, m.exports, m);
        w[n] = m.exports;
    };
}('gaia-header', this)));