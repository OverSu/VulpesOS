(function (f) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = f();
    } else if (typeof define === 'function' && define.amd) {
        define([], f);
    } else {
        var g;
        if (typeof window !== 'undefined') {
            g = window;
        } else if (typeof global !== 'undefined') {
            g = global;
        } else if (typeof self !== 'undefined') {
            g = self;
        } else {
            g = this;
        }
        g.GaiaHeader = f();
    }
}(function () {
    var define, module, exports;
    return function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == 'function' && require;
                    if (!u && a)
                        return a(o, !0);
                    if (i)
                        return i(o, !0);
                    var f = new Error('Cannot find module \'' + o + '\'');
                    throw f.code = 'MODULE_NOT_FOUND', f;
                }
                var l = n[o] = { exports: {} };
                t[o][0].call(l.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e);
                }, l, l.exports, e, t, n, r);
            }
            return n[o].exports;
        }
        var i = typeof require == 'function' && require;
        for (var o = 0; o < r.length; o++)
            s(r[o]);
        return s;
    }({
        1: [
            function (require, module, exports) {
                ;
                (function (define) {
                    define(function (require, exports, module) {
                        'use strict';
                        var debug = 0 ? console.log.bind(console) : function () {
                        };
                        var cache = {};
                        var MIN = 16;
                        var MAX = 24;
                        var BUFFER = 3;
                        module.exports = function (config) {
                            debug('font fit', config);
                            var space = config.space - BUFFER;
                            var min = config.min || MIN;
                            var max = config.max || MAX;
                            var text = trim(config.text);
                            var fontSize = max;
                            var textWidth;
                            var font;
                            do {
                                font = config.font.replace(/\d+px/, fontSize + 'px');
                                textWidth = getTextWidth(text, font);
                            } while (textWidth > space && fontSize !== min && fontSize--);
                            return {
                                textWidth: textWidth,
                                fontSize: fontSize,
                                overflowing: textWidth > space
                            };
                        };
                        function getTextWidth(text, font) {
                            var ctx = getCanvasContext(font);
                            var width = ctx.measureText(text).width;
                            debug('got text width', width);
                            return width;
                        }
                        function getCanvasContext(font) {
                            debug('get canvas context', font);
                            var cached = cache[font];
                            if (cached) {
                                return cached;
                            }
                            var canvas = document.createElement('canvas');
                            canvas.setAttribute('moz-opaque', 'true');
                            canvas.setAttribute('width', '1px');
                            canvas.setAttribute('height', '1px');
                            debug('created canvas', canvas);
                            var ctx = canvas.getContext('2d', { willReadFrequently: true });
                            ctx.font = font;
                            return cache[font] = ctx;
                        }
                        function trim(text) {
                            return text.replace(/\s+/g, ' ').trim();
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
                }('font-fit', this)));
            },
            {}
        ],
        2: [
            function (require, module, exports) {
                ;
                (function (define) {
                    'use strict';
                    define(function (require, exports, module) {
                        var textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
                        var innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
                        var removeAttribute = Element.prototype.removeAttribute;
                        var setAttribute = Element.prototype.setAttribute;
                        var noop = function noop() {
                        };
                        exports.register = function (name, props) {
                            var baseProto = getBaseProto(props['extends']);
                            var template = props.template || baseProto.templateString;
                            var extensible = props.extensible = props.hasOwnProperty('extensible') ? props.extensible : true;
                            delete props['extends'];
                            if (template) {
                                if (extensible && props.template) {
                                    props.templateString = props.template;
                                }
                                var output = processCss(template, name);
                                props.template = document.createElement('template');
                                props.template.innerHTML = output.template;
                                props.lightCss = output.lightCss;
                                props.globalCss = props.globalCss || '';
                                props.globalCss += output.globalCss;
                            }
                            injectGlobalCss(props.globalCss);
                            delete props.globalCss;
                            var descriptors = mixin(props.attrs || {}, base.descriptors);
                            props._attrs = props.attrs;
                            delete props.attrs;
                            var proto = createProto(baseProto, props);
                            Object.defineProperties(proto, descriptors);
                            try {
                                return document.registerElement(name, { prototype: proto });
                            } catch (e) {
                                if (e.name !== 'NotSupportedError') {
                                    throw e;
                                }
                            }
                        };
                        var base = {
                            properties: {
                                GaiaComponent: true,
                                attributeChanged: noop,
                                attached: noop,
                                detached: noop,
                                created: noop,
                                createdCallback: function createdCallback() {
                                    if (this.dirObserver) {
                                        addDirObserver();
                                    }
                                    injectLightCss(this);
                                    this.created();
                                },
                                attributeChangedCallback: function attributeChangedCallback(name, from, to) {
                                    var prop = toCamelCase(name);
                                    if (this._attrs && this._attrs[prop]) {
                                        this[prop] = to;
                                    }
                                    this.attributeChanged(name, from, to);
                                },
                                attachedCallback: function attachedCallback() {
                                    if (this.dirObserver) {
                                        this.setInnerDirAttributes = setInnerDirAttributes.bind(null, this);
                                        document.addEventListener('dirchanged', this.setInnerDirAttributes);
                                    }
                                    this.attached();
                                },
                                detachedCallback: function detachedCallback() {
                                    if (this.dirObserver) {
                                        document.removeEventListener('dirchanged', this.setInnerDirAttributes);
                                    }
                                    this.detached();
                                },
                                setupShadowRoot: function setupShadowRoot() {
                                    if (!this.template) {
                                        return;
                                    }
                                    var node = document.importNode(this.template.content, true);
                                    this.createShadowRoot().appendChild(node);
                                    if (this.dirObserver) {
                                        setInnerDirAttributes(this);
                                    }
                                    return this.shadowRoot;
                                },
                                setAttr: function setAttr(name, value) {
                                    var internal = this.shadowRoot.firstElementChild;
                                    setAttribute.call(internal, name, value);
                                    setAttribute.call(this, name, value);
                                },
                                removeAttr: function removeAttr(name) {
                                    var internal = this.shadowRoot.firstElementChild;
                                    removeAttribute.call(internal, name);
                                    removeAttribute.call(this, name);
                                }
                            },
                            descriptors: {
                                textContent: {
                                    set: function set(value) {
                                        textContent.set.call(this, value);
                                        if (this.lightStyle) {
                                            this.appendChild(this.lightStyle);
                                        }
                                    },
                                    get: function get() {
                                        return textContent.get();
                                    }
                                },
                                innerHTML: {
                                    set: function set(value) {
                                        innerHTML.set.call(this, value);
                                        if (this.lightStyle) {
                                            this.appendChild(this.lightStyle);
                                        }
                                    },
                                    get: innerHTML.get
                                }
                            }
                        };
                        var defaultPrototype = createProto(HTMLElement.prototype, base.properties);
                        function getBaseProto(proto) {
                            if (!proto) {
                                return defaultPrototype;
                            }
                            proto = proto.prototype || proto;
                            return !proto.GaiaComponent ? createProto(proto, base.properties) : proto;
                        }
                        function createProto(proto, props) {
                            return mixin(Object.create(proto), props);
                        }
                        var hasShadowCSS = function () {
                            var div = document.createElement('div');
                            try {
                                div.querySelector(':host');
                                return true;
                            } catch (e) {
                                return false;
                            }
                        }();
                        var regex = {
                            shadowCss: /(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,
                            ':host': /(?:\:host)/g,
                            ':host()': /\:host\((.+)\)(?: \:\:content)?/g,
                            ':host-context': /\:host-context\((.+)\)([^{,]+)?/g,
                            '::content': /(?:\:\:content)/g
                        };
                        function processCss(template, name) {
                            var globalCss = '';
                            var lightCss = '';
                            if (!hasShadowCSS) {
                                template = template.replace(regex.shadowCss, function (match) {
                                    var hostContext = regex[':host-context'].exec(match);
                                    if (hostContext) {
                                        globalCss += match.replace(regex['::content'], '').replace(regex[':host-context'], '$1 ' + name + '$2').replace(/ +/g, ' ');
                                    } else {
                                        lightCss += match.replace(regex[':host()'], name + '$1').replace(regex[':host'], name).replace(regex['::content'], name);
                                    }
                                    return '';
                                });
                            }
                            return {
                                template: template,
                                lightCss: lightCss,
                                globalCss: globalCss
                            };
                        }
                        function injectGlobalCss(css) {
                            if (!css) {
                                return;
                            }
                            var style = document.createElement('style');
                            style.innerHTML = css.trim();
                            headReady().then(function () {
                                document.head.appendChild(style);
                            });
                        }
                        function headReady() {
                            return new Promise(function (resolve) {
                                if (document.head) {
                                    return resolve();
                                }
                                window.addEventListener('load', function fn() {
                                    window.removeEventListener('load', fn);
                                    resolve();
                                });
                            });
                        }
                        function injectLightCss(el) {
                            if (hasShadowCSS) {
                                return;
                            }
                            var stylesheet = el.querySelector('style');
                            if (!stylesheet) {
                                stylesheet = document.createElement('style');
                                stylesheet.setAttribute('scoped', '');
                                stylesheet.appendChild(document.createTextNode(el.lightCss));
                                el.appendChild(stylesheet);
                            }
                            el.lightStyle = stylesheet;
                        }
                        function toCamelCase(string) {
                            return string.replace(/-(.)/g, function replacer(string, p1) {
                                return p1.toUpperCase();
                            });
                        }
                        var dirObserver;
                        function setInnerDirAttributes(component) {
                            var dir = component.dir || document.dir;
                            Array.from(component.shadowRoot.children).forEach(function (element) {
                                if (element.nodeName !== 'STYLE') {
                                    element.dir = dir;
                                }
                            });
                        }
                        function addDirObserver() {
                            if (dirObserver) {
                                return;
                            }
                            dirObserver = new MutationObserver(onChanged);
                            dirObserver.observe(document.documentElement, {
                                attributeFilter: ['dir'],
                                attributes: true
                            });
                            function onChanged(mutations) {
                                document.dispatchEvent(new Event('dirchanged'));
                            }
                        }
                        function mixin(target, source) {
                            for (var key in source) {
                                target[key] = source[key];
                            }
                            return target;
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
                }('gaia-component', this)));
            },
            {}
        ],
        3: [
            function (require, module, exports) {
                (function (define) {
                    'use strict';
                    define(function (require, exports, module) {
                        var base = window.GAIA_ICONS_BASE_URL || window.COMPONENTS_BASE_URL || 'bower_components/';
                        if (!document.documentElement) {
                            window.addEventListener('load', load);
                        } else {
                            load();
                        }
                        function load() {
                            if (isLoaded()) {
                                return;
                            }
                            var link = document.createElement('link');
                            link.rel = 'stylesheet';
                            link.type = 'text/css';
                            link.href = base + 'gaia-icons/gaia-icons.css';
                            document.head.appendChild(link);
                            exports.loaded = true;
                        }
                        function isLoaded() {
                            return exports.loaded || document.querySelector('link[href*=gaia-icons]') || document.documentElement.classList.contains('gaia-icons-loaded');
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
                }('gaia-icons', this)));
            },
            {}
        ],
        4: [
            function (require, module, exports) {
                ;
                (function (define) {
                    'use strict';
                    define(function (require, exports, module) {
                        var component = require('gaia-component');
                        var _fontFit = require('font-fit');
                        require('gaia-icons');
                        var debug = 0 ? console.log.bind(console) : function () {
                        };
                        var KNOWN_ACTIONS = {
                            menu: 'menu',
                            back: 'back',
                            close: 'close'
                        };
                        var TITLE_FONT = 'italic 300 24px FiraSans';
                        var TITLE_PADDING = 10;
                        var MINIMUM_FONT_SIZE_CENTERED = 20;
                        var MINIMUM_FONT_SIZE_UNCENTERED = 16;
                        var MAXIMUM_FONT_SIZE = 23;
                        module.exports = component.register('gaia-header', {
                            extensible: false,
                            dirObserver: true,
                            created: function created() {
                                var _this = this;
                                debug('created');
                                this.setupShadowRoot();
                                this.els = {
                                    actionButton: this.shadowRoot.querySelector('.action-button'),
                                    titles: this.getElementsByTagName('h1')
                                };
                                this.els.actionButton.addEventListener('click', function (e) {
                                    return _this.onActionButtonClick(e);
                                });
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
                            attached: function attached() {
                                debug('attached');
                                this.runFontFitSoon();
                                this.observerStart();
                                window.addEventListener('resize', this.onResize);
                            },
                            detached: function detached() {
                                debug('detached');
                                window.removeEventListener('resize', this.onResize);
                                this.observerStop();
                                this.clearPending();
                            },
                            clearPending: function clearPending() {
                                for (var key in this.pending) {
                                    this.pending[key].clear();
                                    delete this.pending[key];
                                }
                                window.cancelAnimationFrame(this._resizeThrottlingId);
                                this._resizeThrottlingId = null;
                            },
                            runFontFit: function runFontFit() {
                                var _this2 = this;
                                debug('run font-fit');
                                if (this.noFontFit) {
                                    return Promise.resolve();
                                }
                                var titles = this.els.titles;
                                var space = this.getTitleSpace();
                                var styles = [].map.call(titles, function (el) {
                                    return _this2.getTitleStyle(el, space);
                                });
                                return this.setTitleStylesSoon(styles);
                            },
                            runFontFitSoon: function runFontFitSoon() {
                                var _this3 = this;
                                debug('run font-fit soon');
                                if (this.pending.runFontFitSoon) {
                                    return;
                                }
                                this.pending.runFontFitSoon = this.nextTick(function () {
                                    delete _this3.pending.runFontFitSoon;
                                    _this3.runFontFit();
                                });
                            },
                            getTitleStyle: function getTitleStyle(el, space) {
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
                            setTitleStylesSoon: function setTitleStylesSoon(styles) {
                                var _this4 = this;
                                debug('set title styles soon', styles);
                                var key = 'setStyleTitlesSoon';
                                this._titleStyles = styles;
                                if (this.unresolved[key]) {
                                    return this.unresolved[key];
                                }
                                this.unresolved[key] = new Promise(function (resolve) {
                                    _this4.pending[key] = _this4.nextTick(function () {
                                        var styles = _this4._titleStyles;
                                        var els = _this4.els.titles;
                                        [].forEach.call(els, function (el, i) {
                                            if (!styles[i]) {
                                                return debug('exit');
                                            }
                                            _this4.setTitleStyle(el, styles[i]);
                                        });
                                        delete _this4._titleStyles;
                                        delete _this4.unresolved[key];
                                        delete _this4.pending[key];
                                        resolve();
                                    });
                                });
                            },
                            setTitleStyle: function setTitleStyle(el, style) {
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
                            fontFit: function fontFit(text, space) {
                                var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
                                debug('font fit:', text, space, opts);
                                var fontFitArgs = {
                                    font: TITLE_FONT,
                                    min: opts.min || MINIMUM_FONT_SIZE_UNCENTERED,
                                    max: MAXIMUM_FONT_SIZE,
                                    text: text,
                                    space: space
                                };
                                return _fontFit(fontFitArgs);
                            },
                            observerStart: function observerStart() {
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
                            observerStop: function observerStop() {
                                if (!this.observing) {
                                    return;
                                }
                                this.observer.disconnect();
                                this.observing = false;
                                debug('observer stopped');
                            },
                            onResize: function onResize(e) {
                                var _this5 = this;
                                debug('onResize', this._resizeThrottlingId);
                                if (this._resizeThrottlingId !== null) {
                                    return;
                                }
                                this._resizeThrottlingId = window.requestAnimationFrame(function () {
                                    _this5._resizeThrottlingId = null;
                                    _this5.runFontFitSoon();
                                });
                            },
                            onMutation: function onMutation(mutations) {
                                debug('on mutation', mutations);
                                if (!this.pending.runFontFitSoon) {
                                    this.runFontFit();
                                }
                            },
                            getTitleSpace: function getTitleSpace() {
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
                            getWidth: function getWidth() {
                                var value = this.notFlush ? this.clientWidth : window.innerWidth;
                                debug('get width', value);
                                return value;
                            },
                            triggerAction: function triggerAction() {
                                if (this.action) {
                                    this.els.actionButton.click();
                                }
                            },
                            onActionButtonClick: function onActionButtonClick() {
                                var _this6 = this;
                                debug('action button click');
                                var config = { detail: { type: this.action } };
                                var e = new CustomEvent('action', config);
                                setTimeout(function () {
                                    return _this6.dispatchEvent(e);
                                });
                            },
                            getTitleMarginStart: function getTitleMarginStart() {
                                var start = this.titleStart;
                                var end = this.titleEnd;
                                var marginStart = end - start;
                                debug('get title margin start', marginStart);
                                return marginStart;
                            },
                            getButtonsBeforeTitle: function getButtonsBeforeTitle() {
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
                            getButtonsAfterTitle: function getButtonsAfterTitle() {
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
                            sumButtonWidths: function sumButtonWidths(buttons) {
                                var _this7 = this;
                                var defaultWidth = 50;
                                var sum = buttons.reduce(function (prev, button) {
                                    var isStandardButton = button === _this7.els.actionButton;
                                    var width = isStandardButton ? defaultWidth : button.clientWidth;
                                    return prev + width;
                                }, 0);
                                debug('sum button widths', buttons, sum);
                                return sum;
                            },
                            attrs: {
                                action: {
                                    get: function get() {
                                        return this._action;
                                    },
                                    set: function set(value) {
                                        var action = KNOWN_ACTIONS[value];
                                        if (action === this._action) {
                                            return;
                                        }
                                        this.setAttr('action', action);
                                        this._action = action;
                                    }
                                },
                                titleStart: {
                                    get: function get() {
                                        debug('get title-start');
                                        if ('_titleStart' in this) {
                                            return this._titleStart;
                                        }
                                        var buttons = this.getButtonsBeforeTitle();
                                        var value = this.sumButtonWidths(buttons);
                                        debug('get title-start', buttons, value);
                                        return value;
                                    },
                                    set: function set(value) {
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
                                    get: function get() {
                                        debug('get title-end');
                                        if ('_titleEnd' in this) {
                                            return this._titleEnd;
                                        }
                                        var buttons = this.getButtonsAfterTitle();
                                        return this.sumButtonWidths(buttons);
                                    },
                                    set: function set(value) {
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
                                    get: function get() {
                                        return this._noFontFit || false;
                                    },
                                    set: function set(value) {
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
                                    get: function get() {
                                        return this._ignoreDir || false;
                                    },
                                    set: function set(value) {
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
                            template: '<div class="inner">\n    <button class="action-button">\n      <content select="[l10n-action]"></content>\n    </button>\n    <content></content>\n  </div>\n\n  <style>\n\n  :host {\n    display: block;\n    -moz-user-select: none;\n\n    --gaia-header-button-color:\n      var(--header-button-color,\n      var(--header-color,\n      var(--link-color,\n      inherit)));\n  }\n\n  /**\n   * [hidden]\n   */\n\n  :host[hidden] {\n    display: none;\n  }\n\n  /** Reset\n   ---------------------------------------------------------*/\n\n  ::-moz-focus-inner { border: 0; }\n\n  /** Inner\n   ---------------------------------------------------------*/\n\n  .inner {\n    display: flex;\n    min-height: 50px;\n    -moz-user-select: none;\n\n    background:\n      var(--header-background,\n      var(--background,\n      #fff));\n  }\n\n  /** Action Button\n   ---------------------------------------------------------*/\n\n  /**\n   * 1. Hidden by default\n   */\n\n  .action-button {\n    position: relative;\n\n    display: none; /* 1 */\n    width: 50px;\n    font-size: 30px;\n    margin: 0;\n    padding: 0;\n    border: 0;\n    outline: 0;\n\n    align-items: center;\n    background: none;\n    cursor: pointer;\n    transition: opacity 200ms 280ms;\n    color:\n      var(--header-action-button-color,\n      var(--header-icon-color,\n      var(--gaia-header-button-color)));\n  }\n\n  /**\n   * [action=back]\n   * [action=menu]\n   * [action=close]\n   *\n   * 1. For icon vertical-alignment\n   */\n\n  [action=back] .action-button,\n  [action=menu] .action-button,\n  [action=close] .action-button {\n    display: flex; /* 1 */\n  }\n\n  /**\n   * :active\n   */\n\n  .action-button:active {\n    transition: none;\n    opacity: 0.2;\n  }\n\n  /** Action Button Icon\n   ---------------------------------------------------------*/\n\n  .action-button:before {\n    font-family: \'gaia-icons\';\n    font-style: normal;\n    text-rendering: optimizeLegibility;\n    font-weight: 500;\n  }\n\n  [action=close] .action-button:before { content: \'close\' }\n  [action=menu] .action-button:before { content: \'menu\' }\n\n  [action=back]:-moz-dir(ltr) .action-button:before { content: \'left\' }\n  [action=back]:-moz-dir(rtl) .action-button:before { content: \'right\' }\n\n  /** Action Button Icon\n   ---------------------------------------------------------*/\n\n  /**\n   * 1. To enable vertical alignment.\n   */\n\n  .action-button:before {\n    display: block;\n  }\n\n  /** Action Button Text\n   ---------------------------------------------------------*/\n\n  /**\n   * To provide custom localized content for\n   * the action-button, we allow the user\n   * to provide an element with the class\n   * .l10n-action. This node is then\n   * pulled inside the real action-button.\n   *\n   * Example:\n   *\n   *   <gaia-header action="back">\n   *     <span l10n-action aria-label="Back">Localized text</span>\n   *     <h1>title</h1>\n   *   </gaia-header>\n   */\n\n  ::content [l10n-action] {\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 100%;\n    height: 100%;\n    font-size: 0;\n  }\n\n  /** Title\n   ---------------------------------------------------------*/\n\n  /**\n   * 1. Vertically center text. We can\'t use flexbox\n   *    here as it breaks text-overflow ellipsis\n   *    without an inner div.\n   */\n\n  ::content h1 {\n    flex: 1;\n    margin: 0;\n    padding: 0;\n    overflow: hidden;\n\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    text-align: center;\n    line-height: 50px; /* 1 */\n    font-weight: 300;\n    font-style: italic;\n    font-size: 24px;\n\n    color:\n      var(--header-title-color,\n      var(--header-color,\n      var(--title-color,\n      var(--text-color,\n      inherit))));\n  }\n\n  /**\n   * [ignore-dir]\n   *\n   * When the <gaia-header> component has an [ignore-dir] attribute, header\n   * direction is forced to LTR but we still want the <h1> text to be reversed\n   * so that strings like \'1 selected\' become \'selected 1\'.\n   *\n   * When we\'re happy for <gaia-header> to be fully RTL responsive we won\'t need\n   * these rules anymore, but this depends on all Gaia apps being ready.\n   *\n   * This should be safe to remove when bug 1179459 lands.\n   */\n\n  :host[ignore-dir] {\n    direction: ltr;\n  }\n\n  :host[ignore-dir]:-moz-dir(rtl) h1 {\n    direction: rtl;\n  }\n\n  /** Buttons\n   ---------------------------------------------------------*/\n\n  ::content a,\n  ::content button {\n    position: relative;\n    z-index: 1;\n    box-sizing: border-box;\n    display: flex;\n    width: auto;\n    height: auto;\n    min-width: 50px;\n    margin: 0;\n    padding: 0 10px;\n    outline: 0;\n    border: 0;\n\n    font-size: 14px;\n    line-height: 1;\n    align-items: center;\n    justify-content: center;\n    text-decoration: none;\n    text-align: center;\n    background: none;\n    border-radius: 0;\n    font-style: italic;\n    cursor: pointer;\n    transition: opacity 200ms 280ms;\n    color: var(--gaia-header-button-color);\n  }\n\n  /**\n   * :active\n   */\n\n  ::content a:active,\n  ::content button:active {\n    transition: none;\n    opacity: 0.2;\n  }\n\n  /**\n   * [hidden]\n   */\n\n  ::content a[hidden],\n  ::content button[hidden] {\n    display: none;\n  }\n\n  /**\n   * [disabled]\n   */\n\n  ::content a[disabled],\n  ::content button[disabled] {\n    pointer-events: none;\n    color: var(--header-disabled-button-color);\n  }\n\n  /** Icon Buttons\n   ---------------------------------------------------------*/\n\n  /**\n   * Icons are a different color to text\n   */\n\n  ::content .icon,\n  ::content [data-icon] {\n    color:\n      var(--header-icon-color,\n      var(--gaia-header-button-color));\n  }\n\n  /**\n   * If users want their action button\n   * to be in the component\'s light-dom\n   * they can add an .action class\n   * to make it look like the\n   * shadow action button.\n   */\n\n  ::content .action {\n    color:\n      var(--header-action-button-color,\n      var(--header-icon-color,\n      var(--gaia-header-button-color)));\n  }\n\n  /**\n   * [data-icon]:empty\n   *\n   * Icon buttons with no textContent,\n   * should always be 50px.\n   *\n   * This is to prevent buttons being\n   * larger than they should be before\n   * icon-font has loaded.\n   */\n\n  ::content [data-icon]:empty {\n    width: 50px;\n  }\n\n  </style>',
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
                            Promise.resolve().then(function () {
                                if (!cleared) {
                                    fn();
                                }
                            });
                            return {
                                clear: function clear() {
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
            },
            {
                'font-fit': 1,
                'gaia-component': 2,
                'gaia-icons': 3
            }
        ]
    }, {}, [4])(4);
}));