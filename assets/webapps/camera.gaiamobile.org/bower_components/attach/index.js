;
(function () {
    'use strict';
    var ns = '_attach';
    var proto = Element.prototype;
    var matches = proto.matchesSelector || proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector;
    function attach(root, type, selector, fn, ctx) {
        if (arguments.length === 2) {
            return attach.many.apply(null, arguments);
        }
        if (typeof selector === 'function') {
            ctx = fn;
            fn = selector;
            selector = null;
        }
        selector = selector || 'null';
        var store = getStore(root);
        var master = store.master[type];
        var delegates = store.delegates[type] = store.delegates[type] || {};
        delegates[selector] = fn;
        if (master) {
            return;
        }
        master = store.master[type] = callback;
        root.addEventListener(type, master);
        function callback(e) {
            var el = e.target;
            var selector;
            var matched;
            var out;
            var fn;
            while (el) {
                for (selector in delegates) {
                    fn = delegates[selector];
                    matched = el === root && selector === 'null' || matches.call(el, selector);
                    if (matched) {
                        out = fn.call(ctx || el, e, el);
                        if (out === false) {
                            return e.stopPropagation();
                        }
                    }
                }
                if (el == root)
                    break;
                el = el.parentNode;
            }
        }
    }
    attach.on = attach;
    attach.off = function (root, type, selector) {
        var store = getStore(root);
        var master = store.master[type];
        var delegates = store.delegates[type];
        if (type && selector) {
            delete delegates[selector];
        } else if (type) {
            delete store.delegates[type];
        } else {
            for (type in store.master) {
                attach.off(root, type);
            }
        }
        if (isEmpty(store.delegates[type])) {
            root.removeEventListener(type, master);
            delete store.master[type];
        }
    };
    attach.many = function (root, config, ctx) {
        var parts;
        var key;
        for (key in config) {
            parts = key.split(' ');
            attach.on(root, parts[0], parts[1], config[key], ctx);
        }
    };
    function getStore(el) {
        return el[ns] || createStore(el);
    }
    function createStore(el) {
        el[ns] = {
            master: {},
            delegates: {}
        };
        return el[ns];
    }
    function isEmpty(ob) {
        for (var key in ob) {
            return false;
        }
        return true;
    }
    if (typeof exports === 'object') {
        module.exports = attach;
    } else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return attach;
        });
    } else {
        window.attach = attach;
    }
}());