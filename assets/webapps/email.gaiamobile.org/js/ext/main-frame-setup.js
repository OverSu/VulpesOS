define('ext/ext/equal', ['require'], function (require) {
    var COMPARE_DEPTH = 6;
    function boundedCmpObjs(a, b, depthLeft) {
        var aAttrCount = 0, bAttrCount = 0, key, nextDepth = depthLeft - 1;
        if ('toJSON' in a)
            a = a.toJSON();
        if ('toJSON' in b)
            b = b.toJSON();
        for (key in a) {
            aAttrCount++;
            if (!(key in b))
                return false;
            if (depthLeft) {
                if (!equal(a[key], b[key], nextDepth))
                    return false;
            } else {
                if (a[key] !== b[key])
                    return false;
            }
        }
        for (key in b) {
            bAttrCount++;
        }
        if (aAttrCount !== bAttrCount)
            return false;
        return true;
    }
    function equal(a, b, depthLeft) {
        if (depthLeft === undefined) {
            depthLeft = COMPARE_DEPTH;
        }
        var ta = typeof a, tb = typeof b;
        if (ta !== 'object' || tb !== ta || a == null || b == null)
            return a === b;
        if (a === b)
            return true;
        if (Array.isArray(a)) {
            if (!Array.isArray(b))
                return false;
            if (a.length !== b.length)
                return false;
            for (var iArr = 0; iArr < a.length; iArr++) {
                if (!equal(a[iArr], b[iArr], depthLeft - 1))
                    return false;
            }
            return true;
        }
        return boundedCmpObjs(a, b, depthLeft);
    }
    return equal;
});
;
define('ext/logic', [
    'require',
    'evt',
    './ext/equal'
], function (require) {
    var evt = require('evt');
    var equal = require('./ext/equal');
    function logic() {
        return logic.event.apply(logic, arguments);
    }
    evt.mix(logic);
    logic.scope = function (namespace, defaultDetails) {
        return new Scope(namespace, defaultDetails);
    };
    var objectToScope = new WeakMap();
    function toScope(scope) {
        if (!(scope instanceof Scope)) {
            scope = objectToScope.get(scope);
            if (!scope) {
                throw new Error('Invalid scope ' + scope + ' passed to logic.event(); ' + 'did you remember to call logic.defineScope()? ' + new Error().stack);
            }
        }
        return scope;
    }
    logic.defineScope = function (obj, namespace, defaultDetails) {
        if (!namespace && obj && obj.constructor && obj.constructor.name) {
            namespace = obj.constructor.name;
        }
        var scope = new Scope(namespace, defaultDetails);
        objectToScope.set(obj, scope);
        return scope;
    };
    logic.subscope = function (scope, defaultDetails) {
        scope = toScope(scope);
        return new Scope(scope.namespace, into(shallowClone(scope.defaultDetails), shallowClone(defaultDetails)));
    };
    logic.event = function (scope, type, details) {
        scope = toScope(scope);
        var isDefaultPrevented = false;
        var preprocessEvent = {
            scope: scope,
            namespace: scope.namespace,
            type: type,
            details: details,
            preventDefault: function () {
                isDefaultPrevented = true;
            }
        };
        logic.emit('preprocessEvent', preprocessEvent);
        if (isDefaultPrevented) {
            return { id: 0 };
        }
        type = preprocessEvent.type;
        details = preprocessEvent.details;
        if (typeof type !== 'string') {
            throw new Error('Invalid "type" passed to logic.event(); ' + 'expected a string, got "' + type + '"');
        }
        if (scope.defaultDetails) {
            if (isPlainObject(details)) {
                details = into(shallowClone(scope.defaultDetails), shallowClone(details));
            } else {
                details = shallowClone(scope.defaultDetails);
            }
        } else {
            details = shallowClone(details);
        }
        var event = new LogicEvent(scope, type, details);
        logic.emit('censorEvent', event);
        logic.emit('event', event);
        if (logic.realtimeLogEverything) {
            dump('logic: ' + event.toString() + '\n');
        }
        return event;
    };
    logic.underTest = false;
    logic._currentTestRejectFunction = null;
    logic.fail = function (ex) {
        if (logic.underTest) {
            if (logic._currentTestRejectFunction) {
                logic._currentTestRejectFunction(ex);
            } else {
                throw ex;
            }
        } else {
            console.error('Logic fail:', ex);
        }
    };
    var nextId = 1;
    logic.uniqueId = function () {
        return nextId++;
    };
    logic.isCensored = false;
    logic.realtimeLogEverything = false;
    var interceptions = {};
    logic.interceptable = function (type, fn) {
        if (interceptions[type]) {
            return interceptions[type]();
        } else {
            return fn();
        }
    };
    logic.interceptOnce = function (type, replacementFn) {
        var prevFn = interceptions[type];
        interceptions[type] = function () {
            interceptions[type] = prevFn;
            return replacementFn();
        };
    };
    logic.match = function (ns, type, detailPredicate) {
        return new LogicMatcher(LogicMatcher.normalizeMatchArgs(ns, type, detailPredicate));
    };
    function MismatchError(matcher, event) {
        this.matcher = matcher;
        this.event = event;
    }
    MismatchError.prototype = Object.create(Error.prototype, {
        constructor: { value: MismatchError },
        toString: {
            value: function () {
                if (this.matcher.not) {
                    return 'MismatchError: expected ' + this.event + ' to not occur (failIfMatched ' + this.matcher + ').';
                } else {
                    return 'MismatchError: expected ' + this.event + ' to match ' + JSON.stringify(this.matcher.detailPredicate) + '.';
                }
            }
        }
    });
    function LogicMatcher(opts) {
        this.matchedLogs = opts.prevMatcher ? opts.prevMatcher.matchedLogs : [];
        this.capturedLogs = [];
        this.ns = opts.ns;
        this.type = opts.type;
        this.detailPredicate = opts.detailPredicate;
        this.failOnMismatchedDetails = true;
        this.not = opts.not;
        this.timeoutMS = 2000;
        this.resolved = false;
        this.anotherMatcherNeedsMyLogs = false;
        if (opts.prevMatcher) {
            opts.prevMatcher.anotherMatcherNeedsMyLogs = true;
        }
        logic.defineScope(this, 'LogicMatcher');
        var hasPrevPromise = !!opts.prevPromise;
        var normalizedPrevPromise = opts.prevPromise || Promise.resolve();
        if (this.not) {
            this.promise = normalizedPrevPromise.then(() => {
                this.capturedLogs.some(event => {
                    if ((!this.ns || event.namespace === this.ns) && event.matches(this.type, this.detailPredicate)) {
                        throw new MismatchError(this, event);
                    }
                });
            });
        } else if (this.type) {
            this.promise = new Promise((resolve, reject) => {
                var subscribeToNextMatch = () => {
                    var timeoutId = setTimeout(() => {
                        logic(this, 'failedMatch', {
                            ns: this.ns,
                            type: this.type,
                            detailPredicate: this.detailPredicate,
                            capturedLogs: this.capturedLogs
                        });
                        reject(new Error('LogicMatcherTimeout: ' + this));
                    }, this.timeoutMS);
                    var resolveThisMatcher = event => {
                        this.resolved = true;
                        this.capturedLogs = [];
                        if (!this.anotherMatcherNeedsMyLogs) {
                            this.removeMatchListener();
                        }
                    };
                    var matchFn = event => {
                        this.capturedLogs.push(event);
                        if (this.resolved) {
                            return;
                        }
                        if (this.ns && event.namespace !== this.ns || event.type !== this.type) {
                            return false;
                        }
                        if (event.matches(this.type, this.detailPredicate)) {
                            resolveThisMatcher(event);
                            this.matchedLogs.push(event);
                            clearTimeout(timeoutId);
                            logic(this, 'match', {
                                ns: this.ns,
                                type: this.type,
                                event: event
                            });
                            resolve(event);
                            return true;
                        } else {
                            if (this.failOnMismatchedDetails) {
                                resolveThisMatcher(event);
                                reject(new MismatchError(this, event));
                                return true;
                            } else {
                            }
                        }
                        return false;
                    };
                    this.removeMatchListener = () => {
                        logic.removeListener('event', matchFn);
                    };
                    logic.on('event', matchFn);
                    if (opts.prevMatcher) {
                        var prevLogs = opts.prevMatcher.capturedLogs;
                        var matchIndex = prevLogs.findIndex(matchFn);
                        if (matchIndex !== -1) {
                            this.capturedLogs = prevLogs.slice(matchIndex + 1);
                        }
                        opts.prevMatcher.removeMatchListener();
                    }
                };
                if (hasPrevPromise) {
                    normalizedPrevPromise.then(subscribeToNextMatch, e => reject(e));
                } else {
                    try {
                        subscribeToNextMatch();
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        } else {
            this.promise = normalizedPrevPromise;
        }
    }
    LogicMatcher.normalizeMatchArgs = function (ns, type, details) {
        if (typeof type === 'object') {
            details = type;
            type = ns;
            ns = null;
        }
        return {
            ns: ns,
            type: type,
            detailPredicate: details
        };
    };
    LogicMatcher.prototype = {
        match(ns, type, details) {
            var args = LogicMatcher.normalizeMatchArgs(ns, type, details);
            args.prevMatcher = this;
            args.prevPromise = this.promise;
            return new LogicMatcher(args);
        },
        failIfMatched(ns, type, details) {
            var args = LogicMatcher.normalizeMatchArgs(ns, type, details);
            args.not = true;
            args.prevMatcher = this;
            args.prevPromise = this.promise;
            return new LogicMatcher(args);
        },
        then(fn, catchFn) {
            return new LogicMatcher({
                prevPromise: this.promise.then(() => {
                    var ret = fn(this.matchedLogs.slice());
                    if (ret instanceof Promise) {
                        ret = new LogicMatcher({ prevPromise: ret });
                    }
                    return ret;
                }, catchFn)
            });
        },
        toString() {
            return '<LogicMatcher ' + (this.ns ? this.ns + '/' : '') + this.type + ' ' + new ObjectSimplifier().simplify(this.detailPredicate) + '>';
        }
    };
    function Scope(namespace, defaultDetails) {
        this.namespace = namespace;
        if (defaultDetails && !isPlainObject(defaultDetails)) {
            throw new Error('Invalid defaultDetails; expected a plain-old object: ' + defaultDetails);
        }
        this.defaultDetails = defaultDetails;
    }
    function ObjectSimplifier(opts) {
        opts = opts || {};
        this.maxDepth = opts.maxDepth || 10;
        this.maxStringLength = opts.maxStringLength || 1000;
        this.maxArrayLength = opts.maxArrayLength || 1000;
        this.maxObjectLength = opts.maxObjectLength || 10;
    }
    ObjectSimplifier.prototype = {
        simplify: function (x) {
            return this._simplify(x, 0, new WeakSet());
        },
        _simplify: function (x, depth, cacheSet) {
            if (cacheSet.has(x)) {
                return '(cycle)';
            }
            if (typeof x === 'number') {
                return x;
            } else if (typeof x === 'string') {
                return x.slice(0, this.maxStringLength);
            } else if (x && x.BYTES_PER_ELEMENT) {
                return x.slice(0, this.maxArrayLength);
            } else if (Array.isArray(x)) {
                if (depth < this.maxDepth) {
                    return x.slice(0, this.maxArrayLength).map(element => this._simplify(element, depth + 1, cacheSet));
                } else {
                    return '[Array length=' + x.length + ']';
                }
            } else if (x && typeof x === 'object') {
                cacheSet.add(x);
                if (!isPlainObject(x)) {
                    if (x.toJSON) {
                        return this._simplify(x.toJSON(), depth, cacheSet);
                    } else if (x.toString) {
                        return this._simplify(x.toString(), depth, cacheSet);
                    } else {
                        return '(?)';
                    }
                } else {
                    if (depth < this.maxDepth) {
                        var retObj = {};
                        var idx = 0;
                        for (var key in x) {
                            if (idx > this.maxObjectLength) {
                                break;
                            }
                            retObj[key] = this._simplify(x[key], depth + 1, cacheSet);
                            idx++;
                        }
                        return retObj;
                    } else if (x.toString) {
                        return this._simplify(x.toString(), depth, cacheSet);
                    } else {
                        return '(object?)';
                    }
                }
            } else if (typeof x === 'function') {
                return '(function)';
            } else {
                return x;
            }
        }
    };
    function LogicEvent(scope, type, details) {
        if (!(scope instanceof Scope)) {
            throw new Error('Invalid "scope" passed to LogicEvent(); ' + 'did you remember to call logic.defineScope()?');
        }
        this.scope = scope;
        this.type = type;
        this.details = details;
        this.time = Date.now();
        this.id = logic.uniqueId();
        this.jsonRepresentation = {
            namespace: this.scope.namespace,
            type: this.type,
            details: new ObjectSimplifier().simplify(this.details),
            time: this.time,
            id: this.id
        };
    }
    LogicEvent.fromJSON = function (data) {
        var event = new LogicEvent(new Scope(data.namespace), data.type, data.details);
        event.time = data.time;
        event.id = data.id;
        return event;
    };
    LogicEvent.prototype = {
        get namespace() {
            return this.scope.namespace;
        },
        toJSON: function () {
            return this.jsonRepresentation;
        },
        toString: function () {
            return '<LogicEvent ' + this.namespace + '/' + this.type + ' ' + JSON.stringify(this.jsonRepresentation.details) + '>';
        },
        matches: function (type, detailPredicate) {
            if (this.type !== type) {
                return false;
            }
            if (typeof detailPredicate === 'function') {
                return !!detailPredicate(this.details);
            } else if (isPlainObject(detailPredicate)) {
                for (var key in detailPredicate) {
                    var expected = detailPredicate && detailPredicate[key];
                    var actual = this.details && this.details[key];
                    if (actual === undefined) {
                        actual = null;
                    }
                    if (expected === undefined) {
                        continue;
                    } else if (!this.details || !equal(expected, actual)) {
                        return false;
                    }
                }
                return true;
            } else if (detailPredicate != null) {
                return equal(this.details, detailPredicate);
            } else {
                return true;
            }
        }
    };
    function isPlainObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        if (obj.toString && obj.toString() !== '[object Object]') {
            return false;
        }
        for (var k in obj) {
            if (typeof k === 'function') {
                return false;
            }
        }
        return true;
    }
    logic.isPlainObject = isPlainObject;
    var promiseToStartEventMap = new WeakMap();
    var promiseToResultEventMap = new WeakMap();
    logic.startAsync = function (scope, type, details) {
        var resolve, reject;
        var promise = logic.async(scope, type, details, (_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });
        return {
            resolve: resolve,
            reject: reject
        };
    };
    logic.async = function (scope, type, details, fn) {
        if (!fn && typeof details === 'function') {
            fn = details;
            details = null;
        }
        scope = logic.subscope(scope, details);
        var startEvent;
        var promise = new Promise((resolve, reject) => {
            startEvent = logic(scope, 'begin ' + type, {
                asyncStatus: 0,
                asyncName: type
            });
            fn(result => {
                promiseToResultEventMap.set(promise, logic(scope, type, {
                    asyncStatus: 1,
                    sourceEventIds: [startEvent.id],
                    result: result
                }));
                resolve(result);
            }, error => {
                promiseToResultEventMap.set(promise, logic(scope, type, {
                    asyncStatus: 2,
                    sourceEventIds: [startEvent.id],
                    error: error
                }));
                reject(error);
            });
        });
        promiseToStartEventMap.set(promise, startEvent);
        return promise;
    };
    logic.await = function (scope, type, details, promise) {
        if (!promise && details.then) {
            promise = details;
            details = null;
        }
        scope = logic.subscope(scope, details).subscope(scope);
        var startEvent = promiseToStartEventMap.get(promise);
        var awaitEvent = logic.event(scope, 'await ' + type, {
            awaitStatus: 0,
            sourceEventIds: startEvent ? [startEvent.id] : null,
            awaitName: type
        });
        return promise.then(result => {
            var resultEvent = promiseToResultEventMap.get(promise);
            logic(scope, type, {
                awaitStatus: 1,
                result: result,
                sourceEventIds: resultEvent ? [
                    resultEvent.id,
                    awaitEvent.id
                ] : [awaitEvent.id]
            });
            return result;
        }, error => {
            var resultEvent = promiseToResultEventMap.get(promise);
            logic(scope, type, {
                awaitStatus: 2,
                error: error,
                sourceEventIds: resultEvent ? [
                    resultEvent.id,
                    awaitEvent.id
                ] : [awaitEvent.id]
            });
            throw error;
        });
    };
    function shallowClone(x) {
        if (isPlainObject(x)) {
            var ret = {};
            for (var key in x) {
                ret[key] = x[key];
            }
            return ret;
        } else {
            return x;
        }
    }
    function into(target, source) {
        if (!target) {
            target = {};
        }
        for (var key in source) {
            target[key] = source[key];
        }
        return target;
    }
    return logic;
});
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('ext/ext/addressparser', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.addressparser = factory();
    }
}(this, function () {
    'use strict';
    var addressparser = {};
    addressparser.parse = function (str) {
        var tokenizer = new addressparser.Tokenizer(str), tokens = tokenizer.tokenize();
        var addresses = [], address = [], parsedAddresses = [];
        tokens.forEach(function (token) {
            if (token.type === 'operator' && (token.value === ',' || token.value === ';')) {
                if (address.length) {
                    addresses.push(address);
                }
                address = [];
            } else {
                address.push(token);
            }
        });
        if (address.length) {
            addresses.push(address);
        }
        addresses.forEach(function (address) {
            address = addressparser._handleAddress(address);
            if (address.length) {
                parsedAddresses = parsedAddresses.concat(address);
            }
        });
        return parsedAddresses;
    };
    addressparser._handleAddress = function (tokens) {
        var token, isGroup = false, state = 'text', address, addresses = [], data = {
                address: [],
                comment: [],
                group: [],
                text: []
            }, i, len;
        for (i = 0, len = tokens.length; i < len; i++) {
            token = tokens[i];
            if (token.type === 'operator') {
                switch (token.value) {
                case '<':
                    state = 'address';
                    break;
                case '(':
                    state = 'comment';
                    break;
                case ':':
                    state = 'group';
                    isGroup = true;
                    break;
                default:
                    state = 'text';
                }
            } else {
                if (token.value) {
                    data[state].push(token.value);
                }
            }
        }
        if (!data.text.length && data.comment.length) {
            data.text = data.comment;
            data.comment = [];
        }
        if (isGroup) {
            data.text = data.text.join(' ');
            addresses.push({
                name: data.text || address && address.name,
                group: data.group.length ? addressparser.parse(data.group.join(',')) : []
            });
        } else {
            if (!data.address.length && data.text.length) {
                for (i = data.text.length - 1; i >= 0; i--) {
                    if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
                        data.address = data.text.splice(i, 1);
                        break;
                    }
                }
                var _regexHandler = function (address) {
                    if (!data.address.length) {
                        data.address = [address.trim()];
                        return ' ';
                    } else {
                        return address;
                    }
                };
                if (!data.address.length) {
                    for (i = data.text.length - 1; i >= 0; i--) {
                        data.text[i] = data.text[i].replace(/\s*\b[^@\s]+@[^@\s]+\b\s*/, _regexHandler).trim();
                        if (data.address.length) {
                            break;
                        }
                    }
                }
            }
            if (!data.text.length && data.comment.length) {
                data.text = data.comment;
                data.comment = [];
            }
            if (data.address.length > 1) {
                data.text = data.text.concat(data.address.splice(1));
            }
            data.text = data.text.join(' ');
            data.address = data.address.join(' ');
            if (!data.address && isGroup) {
                return [];
            } else {
                address = {
                    address: data.address || data.text || '',
                    name: data.text || data.address || ''
                };
                if (address.address === address.name) {
                    if ((address.address || '').match(/@/)) {
                        address.name = '';
                    } else {
                        address.address = '';
                    }
                }
                addresses.push(address);
            }
        }
        return addresses;
    };
    addressparser.Tokenizer = function (str) {
        this.str = (str || '').toString();
        this.operatorCurrent = '';
        this.operatorExpecting = '';
        this.node = null;
        this.escaped = false;
        this.list = [];
    };
    addressparser.Tokenizer.prototype.operators = {
        '"': '"',
        '(': ')',
        '<': '>',
        ',': '',
        ':': ';',
        ';': ''
    };
    addressparser.Tokenizer.prototype.tokenize = function () {
        var chr, list = [];
        for (var i = 0, len = this.str.length; i < len; i++) {
            chr = this.str.charAt(i);
            this.checkChar(chr);
        }
        this.list.forEach(function (node) {
            node.value = (node.value || '').toString().trim();
            if (node.value) {
                list.push(node);
            }
        });
        return list;
    };
    addressparser.Tokenizer.prototype.checkChar = function (chr) {
        if ((chr in this.operators || chr === '\\') && this.escaped) {
            this.escaped = false;
        } else if (this.operatorExpecting && chr === this.operatorExpecting) {
            this.node = {
                type: 'operator',
                value: chr
            };
            this.list.push(this.node);
            this.node = null;
            this.operatorExpecting = '';
            this.escaped = false;
            return;
        } else if (!this.operatorExpecting && chr in this.operators) {
            this.node = {
                type: 'operator',
                value: chr
            };
            this.list.push(this.node);
            this.node = null;
            this.operatorExpecting = this.operators[chr];
            this.escaped = false;
            return;
        }
        if (!this.escaped && chr === '\\') {
            this.escaped = true;
            return;
        }
        if (!this.node) {
            this.node = {
                type: 'text',
                value: ''
            };
            this.list.push(this.node);
        }
        if (this.escaped && chr !== '\\') {
            this.node.value += '\\';
        }
        this.node.value += chr;
        this.escaped = false;
    };
    return addressparser;
}));
define('ext/mailapi', [
    'exports',
    './logic',
    './ext/addressparser'
], function (exports, logic, addressparser) {
    function objCopy(obj) {
        var copy = {};
        Object.keys(obj).forEach(function (key) {
            copy[key] = obj[key];
        });
        return copy;
    }
    function reportError() {
        var msg = null;
        for (var i = 0; i < arguments.length; i++) {
            if (msg)
                msg += ' ' + arguments[i];
            else
                msg = '' + arguments[i];
        }
        logic.fail(new Error(msg));
    }
    var unexpectedBridgeDataError = reportError, internalError = reportError, reportClientCodeError = reportError;
    var HEADER_CACHE_LIMIT = 8;
    function MailAccount(api, wireRep, acctsSlice) {
        this._api = api;
        this.id = wireRep.id;
        this._wireRep = wireRep;
        this.acctsSlice = acctsSlice;
        this.type = wireRep.type;
        this.name = wireRep.name;
        this.syncRange = wireRep.syncRange;
        this.syncInterval = wireRep.syncInterval;
        this.notifyOnNew = wireRep.notifyOnNew;
        this.playSoundOnSend = wireRep.playSoundOnSend;
        this.enabled = wireRep.enabled;
        this.problems = wireRep.problems;
        this.identities = [];
        for (var iIdent = 0; iIdent < wireRep.identities.length; iIdent++) {
            this.identities.push(new MailSenderIdentity(this._api, wireRep.identities[iIdent]));
        }
        this.username = wireRep.credentials.username;
        this.servers = wireRep.servers;
        this.authMechanism = wireRep.credentials.oauth2 ? 'oauth2' : 'password';
        this.element = null;
        this.data = null;
    }
    MailAccount.prototype = {
        toString: function () {
            return '[MailAccount: ' + this.type + ' ' + this.id + ']';
        },
        toJSON: function () {
            return {
                type: 'MailAccount',
                accountType: this.type,
                id: this.id
            };
        },
        __update: function (wireRep) {
            this.enabled = wireRep.enabled;
            this.problems = wireRep.problems;
            this.syncRange = wireRep.syncRange;
            this.syncInterval = wireRep.syncInterval;
            this.notifyOnNew = wireRep.notifyOnNew;
            this.playSoundOnSend = wireRep.playSoundOnSend;
            this._wireRep.defaultPriority = wireRep.defaultPriority;
            for (var i = 0; i < wireRep.identities.length; i++) {
                if (this.identities[i]) {
                    this.identities[i].__update(wireRep.identities[i]);
                } else {
                    this.identities.push(new MailSenderIdentity(this._api, wireRep.identities[i]));
                }
            }
        },
        __die: function () {
        },
        clearProblems: function (callback) {
            this._api._clearAccountProblems(this, callback);
        },
        modifyAccount: function (mods, callback) {
            this._api._modifyAccount(this, mods, callback);
        },
        deleteAccount: function () {
            this._api._deleteAccount(this);
        },
        get isDefault() {
            if (!this.acctsSlice)
                throw new Error('No account slice available');
            return this.acctsSlice.defaultAccount === this;
        }
    };
    function MailSenderIdentity(api, wireRep) {
        this._api = api;
        this.id = wireRep.id;
        this.name = wireRep.name;
        this.address = wireRep.address;
        this.replyTo = wireRep.replyTo;
        this.signature = wireRep.signature;
        this.signatureEnabled = wireRep.signatureEnabled;
    }
    MailSenderIdentity.prototype = {
        toString: function () {
            return '[MailSenderIdentity: ' + this.type + ' ' + this.id + ']';
        },
        toJSON: function () {
            return { type: 'MailSenderIdentity' };
        },
        __update: function (wireRep) {
            this.id = wireRep.id;
            this.name = wireRep.name;
            this.address = wireRep.address;
            this.replyTo = wireRep.replyTo;
            this.signature = wireRep.signature;
            this.signatureEnabled = wireRep.signatureEnabled;
        },
        modifyIdentity: function (mods, callback) {
            if (typeof mods.signature !== 'undefined') {
                this.signature = mods.signature;
            }
            if (typeof mods.signatureEnabled !== 'undefined') {
                this.signatureEnabled = mods.signatureEnabled;
            }
            this._api._modifyIdentity(this, mods, callback);
        },
        __die: function () {
        }
    };
    exports._MailFolder = MailFolder;
    function MailFolder(api, wireRep) {
        this._api = api;
        this.__update(wireRep);
        this.onchange = null;
        this.onremove = null;
        this.element = null;
        this.data = null;
    }
    MailFolder.prototype = {
        toString: function () {
            return '[MailFolder: ' + this.path + ']';
        },
        toJSON: function () {
            return {
                type: this.type,
                path: this.path
            };
        },
        __update: function (wireRep) {
            this._wireRep = wireRep;
            this.unread = wireRep.unreadCount;
            this.lastSyncedAt = wireRep.lastSyncedAt ? new Date(wireRep.lastSyncedAt) : null;
            this.path = wireRep.path;
            this.id = wireRep.id;
            this.name = wireRep.name;
            this.path = wireRep.path;
            this.depth = wireRep.depth;
            this.type = wireRep.type;
            this.name = this._api.l10n_folder_name(this.name, this.type);
            this.selectable = wireRep.type !== 'account' && wireRep.type !== 'nomail';
            this.neededForHierarchy = !this.selectable;
            switch (this.type) {
            case 'localdrafts':
            case 'outbox':
            case 'account':
            case 'nomail':
                this.isValidMoveTarget = false;
                break;
            default:
                this.isValidMoveTarget = true;
            }
        },
        __die: function () {
        }
    };
    function filterOutBuiltinFlags(flags) {
        var outFlags = [];
        for (var i = flags.length - 1; i >= 0; i--) {
            if (flags[i][0] !== '\\')
                outFlags.push(flags[i]);
        }
        return outFlags;
    }
    function serializeMessageName(x) {
        return {
            date: x.date.valueOf(),
            suid: x.id,
            guid: x.guid
        };
    }
    var ContactCache = exports.ContactCache = {
        _contactCache: Object.create(null),
        _cacheHitEntries: 0,
        _cacheEmptyEntries: 0,
        MAX_CACHE_HITS: 256,
        MAX_CACHE_EMPTY: 1024,
        _livePeepsById: Object.create(null),
        _livePeepsByEmail: Object.create(null),
        pendingLookupCount: 0,
        callbacks: [],
        init: function () {
            var contactsAPI = navigator.mozContacts;
            if (!contactsAPI)
                return;
            contactsAPI.oncontactchange = this._onContactChange.bind(this);
        },
        _resetCache: function () {
            this._contactCache = Object.create(null);
            this._cacheHitEntries = 0;
            this._cacheEmptyEntries = 0;
        },
        shutdown: function () {
            var contactsAPI = navigator.mozContacts;
            if (!contactsAPI)
                return;
            contactsAPI.oncontactchange = null;
        },
        _onContactChange: function (event) {
            var contactsAPI = navigator.mozContacts;
            var livePeepsById = this._livePeepsById, livePeepsByEmail = this._livePeepsByEmail;
            if (this._cacheHitEntries || this._cacheEmptyEntries)
                this._resetCache();
            if (event.reason === 'remove') {
                function cleanOutPeeps(livePeeps) {
                    for (var iPeep = 0; iPeep < livePeeps.length; iPeep++) {
                        var peep = livePeeps[iPeep];
                        peep.contactId = null;
                        if (peep.onchange) {
                            try {
                                peep.onchange(peep);
                            } catch (ex) {
                                reportClientCodeError('peep.onchange error', ex, '\n', ex.stack);
                            }
                        }
                    }
                }
                var livePeeps;
                if (!event.contactID) {
                    for (var contactId in livePeepsById) {
                        livePeeps = livePeepsById[contactId];
                        cleanOutPeeps(livePeeps);
                        this._livePeepsById = Object.create(null);
                    }
                } else {
                    livePeeps = livePeepsById[event.contactID];
                    if (livePeeps) {
                        cleanOutPeeps(livePeeps);
                        delete livePeepsById[event.contactID];
                    }
                }
            } else {
                var req = contactsAPI.find({
                    filterBy: ['id'],
                    filterOp: 'equals',
                    filterValue: event.contactID
                });
                req.onsuccess = function () {
                    if (!req.result.length)
                        return;
                    var contact = req.result[0], livePeeps, iPeep, peep;
                    if (event.reason === 'update') {
                        livePeeps = livePeepsById[contact.id];
                        if (livePeeps) {
                            var contactEmails = contact.email ? contact.email.map(function (e) {
                                return e.value;
                            }) : [];
                            for (iPeep = 0; iPeep < livePeeps.length; iPeep++) {
                                peep = livePeeps[iPeep];
                                if (contactEmails.indexOf(peep.address) === -1) {
                                    livePeeps.splice(iPeep--, 1);
                                    peep.contactId = null;
                                    if (peep.onchange) {
                                        try {
                                            peep.onchange(peep);
                                        } catch (ex) {
                                            reportClientCodeError('peep.onchange error', ex, '\n', ex.stack);
                                        }
                                    }
                                }
                            }
                            if (livePeeps.length === 0)
                                delete livePeepsById[contact.id];
                        }
                    }
                    if (!contact.email)
                        return;
                    for (var iEmail = 0; iEmail < contact.email.length; iEmail++) {
                        var email = contact.email[iEmail].value;
                        livePeeps = livePeepsByEmail[email];
                        if (!livePeeps)
                            continue;
                        for (iPeep = 0; iPeep < livePeeps.length; iPeep++) {
                            peep = livePeeps[iPeep];
                            if (!peep.contactId) {
                                peep.contactId = contact.id;
                                var idLivePeeps = livePeepsById[peep.contactId];
                                if (idLivePeeps === undefined)
                                    idLivePeeps = livePeepsById[peep.contactId] = [];
                                idLivePeeps.push(peep);
                            } else if (peep.contactId !== contact.id) {
                                continue;
                            }
                            if (contact.name && contact.name.length)
                                peep.name = contact.name[0];
                            if (peep.onchange) {
                                try {
                                    peep.onchange(peep);
                                } catch (ex) {
                                    reportClientCodeError('peep.onchange error', ex, '\n', ex.stack);
                                }
                            }
                        }
                    }
                };
            }
        },
        resolvePeeps: function (addressPairs) {
            if (addressPairs == null)
                return null;
            var resolved = [];
            for (var i = 0; i < addressPairs.length; i++) {
                resolved.push(this.resolvePeep(addressPairs[i]));
            }
            return resolved;
        },
        resolvePeep: function (addressPair) {
            if (!addressPair) {
                console.error('NO ADDRESS PAIR?', new Error().stack);
                return;
            }
            var emailAddress = addressPair.address;
            var entry = this._contactCache[emailAddress], contact, peep;
            var contactsAPI = navigator.mozContacts;
            if (entry === null || !contactsAPI) {
                peep = new MailPeep(addressPair.name || '', emailAddress, null, null);
                if (!contactsAPI)
                    return peep;
            } else if (entry !== undefined) {
                var name = addressPair.name || '';
                if (entry.name && entry.name.length)
                    name = entry.name[0];
                peep = new MailPeep(name, emailAddress, entry.id, entry.photo && entry.photo.length ? entry.photo[0] : null);
            } else {
                peep = new MailPeep(addressPair.name || '', emailAddress, null, null);
                this._contactCache[emailAddress] = null;
                this.pendingLookupCount++;
                var filterValue = emailAddress ? emailAddress.toLowerCase() : '';
                var req = contactsAPI.find({
                    filterBy: ['email'],
                    filterOp: 'equals',
                    filterValue: filterValue
                });
                var self = this, handleResult = function () {
                        if (req.result && req.result.length) {
                            var contact = req.result[0];
                            ContactCache._contactCache[emailAddress] = contact;
                            if (++ContactCache._cacheHitEntries > ContactCache.MAX_CACHE_HITS)
                                self._resetCache();
                            var peepsToFixup = self._livePeepsByEmail[emailAddress];
                            if (!peepsToFixup)
                                return;
                            for (var i = 0; i < peepsToFixup.length; i++) {
                                var peep = peepsToFixup[i];
                                if (!peep.contactId) {
                                    peep.contactId = contact.id;
                                    var livePeeps = self._livePeepsById[peep.contactId];
                                    if (livePeeps === undefined)
                                        livePeeps = self._livePeepsById[peep.contactId] = [];
                                    livePeeps.push(peep);
                                }
                                if (contact.name && contact.name.length)
                                    peep.name = contact.name[0];
                                if (contact.photo && contact.photo.length)
                                    peep._thumbnailBlob = contact.photo[0];
                                if (!self.callbacks.length) {
                                    if (peep.onchange) {
                                        try {
                                            peep.onchange(peep);
                                        } catch (ex) {
                                            reportClientCodeError('peep.onchange error', ex, '\n', ex.stack);
                                        }
                                    }
                                }
                            }
                        } else {
                            ContactCache._contactCache[emailAddress] = null;
                            if (++ContactCache._cacheEmptyEntries > ContactCache.MAX_CACHE_EMPTY)
                                self._resetCache();
                        }
                        if (--self.pendingLookupCount === 0) {
                            for (i = 0; i < ContactCache.callbacks.length; i++) {
                                ContactCache.callbacks[i]();
                            }
                            ContactCache.callbacks.splice(0, ContactCache.callbacks.length);
                        }
                    };
                req.onsuccess = handleResult;
                req.onerror = handleResult;
            }
            var livePeeps;
            livePeeps = this._livePeepsByEmail[emailAddress];
            if (livePeeps === undefined)
                livePeeps = this._livePeepsByEmail[emailAddress] = [];
            livePeeps.push(peep);
            if (peep.contactId) {
                livePeeps = this._livePeepsById[peep.contactId];
                if (livePeeps === undefined)
                    livePeeps = this._livePeepsById[peep.contactId] = [];
                livePeeps.push(peep);
            }
            return peep;
        },
        forgetPeepInstances: function () {
            var livePeepsById = this._livePeepsById, livePeepsByEmail = this._livePeepsByEmail;
            for (var iArg = 0; iArg < arguments.length; iArg++) {
                var peeps = arguments[iArg];
                if (!peeps)
                    continue;
                for (var iPeep = 0; iPeep < peeps.length; iPeep++) {
                    var peep = peeps[iPeep], livePeeps, idx;
                    if (peep.contactId) {
                        livePeeps = livePeepsById[peep.contactId];
                        if (livePeeps) {
                            idx = livePeeps.indexOf(peep);
                            if (idx !== -1) {
                                livePeeps.splice(idx, 1);
                                if (livePeeps.length === 0)
                                    delete livePeepsById[peep.contactId];
                            }
                        }
                    }
                    livePeeps = livePeepsByEmail[peep.address];
                    if (livePeeps) {
                        idx = livePeeps.indexOf(peep);
                        if (idx !== -1) {
                            livePeeps.splice(idx, 1);
                            if (livePeeps.length === 0)
                                delete livePeepsByEmail[peep.address];
                        }
                    }
                }
            }
        }
    };
    function revokeImageSrc() {
        var useWin = this.ownerDocument.defaultView || window;
        useWin.URL.revokeObjectURL(this.src);
    }
    function showBlobInImg(imgNode, blob) {
        var useWin = imgNode.ownerDocument.defaultView || window;
        imgNode.src = useWin.URL.createObjectURL(blob);
        imgNode.addEventListener('load', revokeImageSrc);
    }
    function MailPeep(name, address, contactId, thumbnailBlob) {
        this.name = name;
        this.address = address;
        this.contactId = contactId;
        this._thumbnailBlob = thumbnailBlob;
        this.element = null;
        this.data = null;
        this.type = null;
        this.onchange = null;
    }
    MailPeep.prototype = {
        get isContact() {
            return this.contactId !== null;
        },
        toString: function () {
            return '[MailPeep: ' + this.address + ']';
        },
        toJSON: function () {
            return {
                name: this.name,
                address: this.address,
                contactId: this.contactId
            };
        },
        toWireRep: function () {
            return {
                name: this.name,
                address: this.address
            };
        },
        get hasPicture() {
            return this._thumbnailBlob !== null;
        },
        displayPictureInImageTag: function (imgNode) {
            if (this._thumbnailBlob)
                showBlobInImg(imgNode, this._thumbnailBlob);
        }
    };
    function MailHeader(slice, wireRep) {
        this._slice = slice;
        this._wireRep = wireRep;
        this.id = wireRep.suid;
        this.guid = wireRep.guid;
        this.author = ContactCache.resolvePeep(wireRep.author);
        this.to = ContactCache.resolvePeeps(wireRep.to);
        this.cc = ContactCache.resolvePeeps(wireRep.cc);
        this.bcc = ContactCache.resolvePeeps(wireRep.bcc);
        this.replyTo = wireRep.replyTo;
        this.date = new Date(wireRep.date);
        this.__update(wireRep);
        this.hasAttachments = wireRep.hasAttachments;
        this.subject = wireRep.subject;
        this.snippet = wireRep.snippet;
        this.onchange = null;
        this.onremove = null;
        this.element = null;
        this.data = null;
    }
    MailHeader.prototype = {
        toString: function () {
            return '[MailHeader: ' + this.id + ']';
        },
        toJSON: function () {
            return {
                type: 'MailHeader',
                id: this.id
            };
        },
        makeCopy: function () {
            return new MailHeader(this._slice, this._wireRep);
        },
        __update: function (wireRep) {
            this._wireRep = wireRep;
            if (wireRep.snippet !== null) {
                this.snippet = wireRep.snippet;
            }
            this.isRead = wireRep.flags.indexOf('\\Seen') !== -1;
            this.isStarred = wireRep.flags.indexOf('\\Flagged') !== -1;
            this.isRepliedTo = wireRep.flags.indexOf('\\Answered') !== -1;
            this.isForwarded = wireRep.flags.indexOf('$Forwarded') !== -1;
            this.isJunk = wireRep.flags.indexOf('$Junk') !== -1;
            this.tags = filterOutBuiltinFlags(wireRep.flags);
            this.sendStatus = wireRep.sendStatus || {};
        },
        __die: function () {
            ContactCache.forgetPeepInstances([this.author], this.to, this.cc, this.bcc);
        },
        deleteMessage: function () {
            return this._slice._api.deleteMessages([this]);
        },
        moveMessage: function (targetFolder) {
            return this._slice._api.moveMessages([this], targetFolder);
        },
        setRead: function (beRead) {
            return this._slice._api.markMessagesRead([this], beRead);
        },
        setStarred: function (beStarred) {
            return this._slice._api.markMessagesStarred([this], beStarred);
        },
        modifyTags: function (addTags, removeTags) {
            return this._slice._api.modifyMessageTags([this], addTags, removeTags);
        },
        getBody: function (options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = null;
            }
            this._slice._api._getBodyForMessage(this, options, callback);
        },
        get bytesToDownloadForBodyDisplay() {
            return this._wireRep.bytesToDownloadForBodyDisplay || 0;
        },
        editAsDraft: function (callback) {
            var composer = this._slice._api.resumeMessageComposition(this, callback);
            composer.hasDraft = true;
            return composer;
        },
        replyToMessage: function (replyMode, callback) {
            return this._slice._api.beginMessageComposition(this, null, {
                replyTo: this,
                replyMode: replyMode
            }, callback);
        },
        forwardMessage: function (forwardMode, callback) {
            return this._slice._api.beginMessageComposition(this, null, {
                forwardOf: this,
                forwardMode: forwardMode
            }, callback);
        }
    };
    function MailMatchedHeader(slice, wireRep) {
        this.header = new MailHeader(slice, wireRep.header);
        this.matches = wireRep.matches;
        this.element = null;
        this.data = null;
    }
    MailMatchedHeader.prototype = {
        toString: function () {
            return '[MailMatchedHeader: ' + this.header.id + ']';
        },
        toJSON: function () {
            return {
                type: 'MailMatchedHeader',
                id: this.header.id
            };
        },
        __update: function (wireRep) {
            this.matches = wireRep.matches;
            this.header.__update(wireRep.header);
        },
        __die: function () {
            this.header.__die();
        }
    };
    function MailBody(api, suid, wireRep, handle) {
        this._api = api;
        this.id = suid;
        this._date = wireRep.date;
        this._handle = handle;
        this.attachments = null;
        if (wireRep.attachments) {
            this.attachments = [];
            for (var iAtt = 0; iAtt < wireRep.attachments.length; iAtt++) {
                this.attachments.push(new MailAttachment(this, wireRep.attachments[iAtt]));
            }
        }
        this._relatedParts = wireRep.relatedParts;
        this.bodyReps = wireRep.bodyReps;
        this._references = wireRep.references;
        this.onchange = null;
        this.ondead = null;
    }
    MailBody.prototype = {
        toString: function () {
            return '[MailBody: ' + this.id + ']';
        },
        toJSON: function () {
            return {
                type: 'MailBody',
                id: this.id
            };
        },
        __update: function (wireRep, detail) {
            this._relatedParts = wireRep.relatedParts;
            this.bodyReps = wireRep.bodyReps;
            if (detail && detail.changeDetails && detail.changeDetails.detachedAttachments) {
                var indices = detail.changeDetails.detachedAttachments;
                for (var iSplice = 0; iSplice < indices.length; iSplice++) {
                    this.attachments.splice(indices[iSplice], 1);
                }
            }
            if (wireRep.attachments) {
                var i, attachment;
                for (i = 0; i < this.attachments.length; i++) {
                    attachment = this.attachments[i];
                    attachment.__update(wireRep.attachments[i]);
                }
                for (i = this.attachments.length; i < wireRep.attachments.length; i++) {
                    this.attachments.push(new MailAttachment(this, wireRep.attachments[i]));
                }
            }
        },
        get embeddedImageCount() {
            if (!this._relatedParts)
                return 0;
            return this._relatedParts.length;
        },
        get bodyRepsDownloaded() {
            var i = 0;
            var len = this.bodyReps.length;
            for (; i < len; i++) {
                if (!this.bodyReps[i].isDownloaded) {
                    return false;
                }
            }
            return true;
        },
        get embeddedImagesDownloaded() {
            for (var i = 0; i < this._relatedParts.length; i++) {
                var relatedPart = this._relatedParts[i];
                if (!relatedPart.file)
                    return false;
            }
            return true;
        },
        downloadEmbeddedImages: function (callWhenDone, callOnProgress) {
            var relPartIndices = [];
            for (var i = 0; i < this._relatedParts.length; i++) {
                var relatedPart = this._relatedParts[i];
                if (relatedPart.file)
                    continue;
                relPartIndices.push(i);
            }
            if (!relPartIndices.length) {
                if (callWhenDone)
                    callWhenDone();
                return;
            }
            this._api._downloadAttachments(this, relPartIndices, [], [], callWhenDone, callOnProgress);
        },
        showEmbeddedImages: function (htmlNode, loadCallback) {
            var i, cidToBlob = {};
            for (i = 0; i < this._relatedParts.length; i++) {
                var relPart = this._relatedParts[i];
                if (relPart.file && !Array.isArray(relPart.file))
                    cidToBlob[relPart.contentId] = relPart.file;
            }
            var nodes = htmlNode.querySelectorAll('.moz-embedded-image');
            for (i = 0; i < nodes.length; i++) {
                var node = nodes[i], cid = node.getAttribute('cid-src');
                if (!cidToBlob.hasOwnProperty(cid))
                    continue;
                showBlobInImg(node, cidToBlob[cid]);
                if (loadCallback)
                    node.addEventListener('load', loadCallback, false);
                node.removeAttribute('cid-src');
                node.classList.remove('moz-embedded-image');
            }
        },
        checkForExternalImages: function (htmlNode) {
            var someNode = htmlNode.querySelector('.moz-external-image');
            return someNode !== null;
        },
        showExternalImages: function (htmlNode, loadCallback) {
            var nodes = htmlNode.querySelectorAll('.moz-external-image');
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (loadCallback) {
                    node.addEventListener('load', loadCallback, false);
                }
                node.setAttribute('src', node.getAttribute('ext-src'));
                node.removeAttribute('ext-src');
                node.classList.remove('moz-external-image');
            }
        },
        die: function () {
            this.onchange = null;
            this._api.__bridgeSend({
                type: 'killBody',
                id: this.id,
                handle: this._handle
            });
        }
    };
    function MailAttachment(_body, wireRep) {
        this._body = _body;
        this.partId = wireRep.part;
        this.filename = wireRep.name;
        this.mimetype = wireRep.type;
        this.sizeEstimateInBytes = wireRep.sizeEstimate;
        this._file = wireRep.file;
        this.element = null;
        this.data = null;
    }
    MailAttachment.prototype = {
        toString: function () {
            return '[MailAttachment: "' + this.filename + '"]';
        },
        toJSON: function () {
            return {
                type: 'MailAttachment',
                filename: this.filename
            };
        },
        __update: function (wireRep) {
            this.mimetype = wireRep.type;
            this.sizeEstimateInBytes = wireRep.sizeEstimate;
            this._file = wireRep.file;
        },
        get isDownloaded() {
            return !!this._file;
        },
        get isDownloadable() {
            return this.mimetype !== 'application/x-gelam-no-download';
        },
        download: function (callWhenDone, callOnProgress, registerWithDownloadManager) {
            if (this.isDownloaded) {
                callWhenDone();
                return;
            }
            this._body._api._downloadAttachments(this._body, [], [this._body.attachments.indexOf(this)], [registerWithDownloadManager || false], callWhenDone, callOnProgress);
        }
    };
    function UndoableOperation(_api, operation, affectedCount, _tempHandle, _longtermIds) {
        this._api = _api;
        this.operation = operation;
        this.affectedCount = affectedCount;
        this._tempHandle = _tempHandle;
        this._longtermIds = null;
        this._undoRequested = false;
    }
    UndoableOperation.prototype = {
        toString: function () {
            return '[UndoableOperation]';
        },
        toJSON: function () {
            return {
                type: 'UndoableOperation',
                handle: this._tempHandle,
                longtermIds: this._longtermIds
            };
        },
        undo: function () {
            if (!this._longtermIds) {
                this._undoRequested = true;
                return;
            }
            this._api.__undo(this);
        }
    };
    function BridgedViewSlice(api, ns, handle) {
        this._api = api;
        this._ns = ns;
        this._handle = handle;
        this.items = [];
        this.status = 'new';
        this.syncProgress = 0;
        this.atTop = false;
        this.atBottom = false;
        this.userCanGrowUpwards = false;
        this.userCanGrowDownwards = false;
        this.pendingRequestCount = 0;
        this._growing = 0;
        this.onadd = null;
        this.onchange = null;
        this.onsplice = null;
        this.onremove = null;
        this.onstatus = null;
        this.oncomplete = null;
        this.ondead = null;
    }
    BridgedViewSlice.prototype = {
        toString: function () {
            return '[BridgedViewSlice: ' + this._ns + ' ' + this._handle + ']';
        },
        toJSON: function () {
            return {
                type: 'BridgedViewSlice',
                namespace: this._ns,
                handle: this._handle
            };
        },
        requestShrinkage: function (firstUsedIndex, lastUsedIndex) {
            this.pendingRequestCount++;
            if (lastUsedIndex >= this.items.length)
                lastUsedIndex = this.items.length - 1;
            this._api.__bridgeSend({
                type: 'shrinkSlice',
                handle: this._handle,
                firstIndex: firstUsedIndex,
                firstSuid: this.items[firstUsedIndex].id,
                lastIndex: lastUsedIndex,
                lastSuid: this.items[lastUsedIndex].id
            });
        },
        requestGrowth: function (dirMagnitude, userRequestsGrowth) {
            if (this._growing) {
                reportError('Already growing in ' + this._growing + ' dir.');
                return;
            }
            this._growing = dirMagnitude;
            this.pendingRequestCount++;
            this._api.__bridgeSend({
                type: 'growSlice',
                dirMagnitude: dirMagnitude,
                userRequestsGrowth: userRequestsGrowth,
                handle: this._handle
            });
        },
        die: function () {
            this.onadd = null;
            this.onchange = null;
            this.onsplice = null;
            this.onremove = null;
            this.onstatus = null;
            this.oncomplete = null;
            this._api.__bridgeSend({
                type: 'killSlice',
                handle: this._handle
            });
            for (var i = 0; i < this.items.length; i++) {
                var item = this.items[i];
                item.__die();
            }
        }
    };
    function AccountsViewSlice(api, handle) {
        BridgedViewSlice.call(this, api, 'accounts', handle);
    }
    AccountsViewSlice.prototype = Object.create(BridgedViewSlice.prototype);
    AccountsViewSlice.prototype.getAccountById = function (id) {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i]._wireRep.id === id) {
                return this.items[i];
            }
        }
        return null;
    };
    Object.defineProperty(AccountsViewSlice.prototype, 'defaultAccount', {
        get: function () {
            var defaultAccount = this.items[0];
            for (var i = 1; i < this.items.length; i++) {
                if ((this.items[i]._wireRep.defaultPriority || 0) > (defaultAccount._wireRep.defaultPriority || 0))
                    defaultAccount = this.items[i];
            }
            return defaultAccount;
        }
    });
    function FoldersViewSlice(api, handle) {
        BridgedViewSlice.call(this, api, 'folders', handle);
    }
    FoldersViewSlice.prototype = Object.create(BridgedViewSlice.prototype);
    FoldersViewSlice.prototype.getFirstFolderWithType = function (type, items) {
        if (!items)
            items = this.items;
        for (var i = 0; i < items.length; i++) {
            var folder = items[i];
            if (folder.type === type)
                return folder;
        }
        return null;
    };
    FoldersViewSlice.prototype.getFirstFolderWithName = function (name, items) {
        if (!items)
            items = this.items;
        for (var i = 0; i < items.length; i++) {
            var folder = items[i];
            if (folder.name === name)
                return folder;
        }
        return null;
    };
    FoldersViewSlice.prototype.getFirstFolderWithPath = function (path, items) {
        if (!items)
            items = this.items;
        for (var i = 0; i < items.length; i++) {
            var folder = items[i];
            if (folder.path === path)
                return folder;
        }
        return null;
    };
    function HeadersViewSlice(api, handle, ns) {
        BridgedViewSlice.call(this, api, ns || 'headers', handle);
        this._bodiesRequestId = 1;
        this._bodiesRequest = {};
    }
    HeadersViewSlice.prototype = Object.create(BridgedViewSlice.prototype);
    HeadersViewSlice.prototype.refresh = function () {
        this._api.__bridgeSend({
            type: 'refreshHeaders',
            handle: this._handle
        });
    };
    HeadersViewSlice.prototype._notifyRequestBodiesComplete = function (reqId) {
        var callback = this._bodiesRequest[reqId];
        if (reqId && callback) {
            callback(true);
            delete this._bodiesRequest[reqId];
        }
    };
    HeadersViewSlice.prototype.maybeRequestBodies = function (idxStart, idxEnd, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = null;
        }
        var messages = [];
        idxEnd = Math.min(idxEnd, this.items.length - 1);
        for (; idxStart <= idxEnd; idxStart++) {
            var item = this.items[idxStart];
            if (this._ns === 'matchedHeaders') {
                item = item.header;
            }
            if (item && item.snippet === null) {
                messages.push({
                    suid: item.id,
                    date: item.date.valueOf()
                });
            }
        }
        if (!messages.length)
            return callback && window.setZeroTimeout(callback, false);
        var reqId = this._bodiesRequestId++;
        this._bodiesRequest[reqId] = callback;
        this._api.__bridgeSend({
            type: 'requestBodies',
            handle: this._handle,
            requestId: reqId,
            messages: messages,
            options: options
        });
    };
    function MessageComposition(api, handle) {
        this._api = api;
        this._handle = handle;
        this.senderIdentity = null;
        this.to = null;
        this.cc = null;
        this.bcc = null;
        this.subject = null;
        this.body = null;
        this._references = null;
        this.attachments = null;
        this.hasDraft = false;
    }
    MessageComposition.prototype = {
        toString: function () {
            return '[MessageComposition: ' + this._handle + ']';
        },
        toJSON: function () {
            return {
                type: 'MessageComposition',
                handle: this._handle
            };
        },
        die: function () {
            if (this._handle) {
                this._api._composeDone(this._handle, 'die', null, null);
                this._handle = null;
            }
        },
        addAttachment: function (attachmentDef, callback) {
            if (!this.hasDraft)
                this.saveDraft();
            this._api._composeAttach(this._handle, attachmentDef, callback);
            var placeholderAttachment = {
                name: attachmentDef.name,
                blob: {
                    size: attachmentDef.blob.size,
                    type: attachmentDef.blob.type
                }
            };
            this.attachments.push(placeholderAttachment);
            return placeholderAttachment;
        },
        removeAttachment: function (attachmentDef, callback) {
            var idx = this.attachments.indexOf(attachmentDef);
            if (idx !== -1) {
                this.attachments.splice(idx, 1);
                this._api._composeDetach(this._handle, idx, callback);
            }
        },
        _buildWireRep: function () {
            return {
                senderId: this.senderIdentity.id,
                to: this.to,
                cc: this.cc,
                bcc: this.bcc,
                subject: this.subject,
                body: this.body,
                referencesStr: this._references,
                attachments: this.attachments
            };
        },
        finishCompositionSendMessage: function (callback) {
            this._api._composeDone(this._handle, 'send', this._buildWireRep(), callback);
        },
        saveDraft: function (callback) {
            this.hasDraft = true;
            this._api._composeDone(this._handle, 'save', this._buildWireRep(), callback);
        },
        abortCompositionDeleteDraft: function (callback) {
            this._api._composeDone(this._handle, 'delete', null, callback);
        }
    };
    var LEGAL_CONFIG_KEYS = [];
    var RE_URL = /(^|[\s(,;])((?:https?:\/\/|www\d{0,3}[.][a-z0-9.\-]{2,249}|[a-z0-9.\-]{2,250}[.][a-z]{2,4}\/)[-\w.!~*'();,/?:@&=+$#%]*)/im;
    var RE_UNEAT_LAST_URL_CHARS = /(?:[),;.!?]|[.!?]\)|\)[.!?])$/;
    var RE_HTTP = /^https?:/i;
    var RE_MAIL = /(^|[\s(,;<>])([^(,;<>@\s]+@[a-z0-9.\-]{2,250}[.][a-z0-9\-]{2,32})/im;
    var RE_MAILTO = /^mailto:/i;
    var MailUtils = {
        linkifyPlain: function (body, doc) {
            var nodes = [];
            var match = true, contentStart;
            while (true) {
                var url = RE_URL.exec(body);
                var email = RE_MAIL.exec(body);
                if (url && (!email || url.index < email.index)) {
                    contentStart = url.index + url[1].length;
                    if (contentStart > 0)
                        nodes.push(doc.createTextNode(body.substring(0, contentStart)));
                    var useUrl = url[2];
                    var uneat = RE_UNEAT_LAST_URL_CHARS.exec(useUrl);
                    if (uneat) {
                        useUrl = useUrl.substring(0, uneat.index);
                    }
                    var link = doc.createElement('a');
                    link.className = 'moz-external-link';
                    if (RE_HTTP.test(url[2]))
                        link.setAttribute('ext-href', useUrl);
                    else
                        link.setAttribute('ext-href', 'http://' + useUrl);
                    var text = doc.createTextNode(useUrl);
                    link.appendChild(text);
                    nodes.push(link);
                    body = body.substring(url.index + url[1].length + useUrl.length);
                } else if (email) {
                    contentStart = email.index + email[1].length;
                    if (contentStart > 0)
                        nodes.push(doc.createTextNode(body.substring(0, contentStart)));
                    link = doc.createElement('a');
                    link.className = 'moz-external-link';
                    if (RE_MAILTO.test(email[2]))
                        link.setAttribute('ext-href', email[2]);
                    else
                        link.setAttribute('ext-href', 'mailto:' + email[2]);
                    text = doc.createTextNode(email[2]);
                    link.appendChild(text);
                    nodes.push(link);
                    body = body.substring(email.index + email[0].length);
                } else {
                    break;
                }
            }
            if (body.length > 0)
                nodes.push(doc.createTextNode(body));
            return nodes;
        },
        linkifyHTML: function (doc) {
            function linkElem(elem) {
                var children = elem.childNodes;
                for (var i in children) {
                    var sub = children[i];
                    if (sub.nodeName == '#text') {
                        var nodes = MailUtils.linkifyPlain(sub.nodeValue, doc);
                        elem.replaceChild(nodes[nodes.length - 1], sub);
                        for (var iNode = nodes.length - 2; iNode >= 0; --iNode) {
                            elem.insertBefore(nodes[iNode], nodes[iNode + 1]);
                        }
                    } else if (sub.nodeName != 'A') {
                        linkElem(sub);
                    }
                }
            }
            linkElem(doc.body);
        }
    };
    function MailAPI() {
        this._nextHandle = 1;
        this._slices = {};
        this._pendingRequests = {};
        this._liveBodies = {};
        this._spliceFireFuncs = [];
        this._storedSends = [];
        this._processingMessage = null;
        this._deferredMessages = [];
        this.config = {};
        this.onbadlogin = null;
        ContactCache.init();
    }
    exports.MailAPI = MailAPI;
    MailAPI.prototype = {
        toString: function () {
            return '[MailAPI]';
        },
        toJSON: function () {
            return { type: 'MailAPI' };
        },
        utils: MailUtils,
        __bridgeSend: function (msg) {
            this._storedSends.push(msg);
        },
        __bridgeReceive: function ma___bridgeReceive(msg) {
            if (this._processingMessage && msg.type !== 'pong') {
                this._deferredMessages.push(msg);
            } else {
                this._processMessage(msg);
            }
        },
        _processMessage: function ma__processMessage(msg) {
            var methodName = '_recv_' + msg.type;
            if (!(methodName in this)) {
                unexpectedBridgeDataError('Unsupported message type:', msg.type);
                return;
            }
            try {
                var done = this[methodName](msg);
                if (!done) {
                    this._processingMessage = msg;
                }
            } catch (ex) {
                internalError('Problem handling message type:', msg.type, ex, '\n', ex.stack);
                return;
            }
        },
        _doneProcessingMessage: function (msg) {
            if (this._processingMessage && this._processingMessage !== msg)
                throw new Error('Mismatched message completion!');
            this._processingMessage = null;
            while (this._processingMessage === null && this._deferredMessages.length) {
                this._processMessage(this._deferredMessages.shift());
            }
        },
        _recv_badLogin: function ma__recv_badLogin(msg) {
            if (this.onbadlogin)
                this.onbadlogin(new MailAccount(this, msg.account, null), msg.problem, msg.whichSide);
            return true;
        },
        _fireAllSplices: function () {
            for (var i = 0; i < this._spliceFireFuncs.length; i++) {
                var fireSpliceData = this._spliceFireFuncs[i];
                fireSpliceData();
            }
            this._spliceFireFuncs.length = 0;
        },
        _recv_batchSlice: function receiveBatchSlice(msg) {
            var slice = this._slices[msg.handle];
            if (!slice) {
                unexpectedBridgeDataError('Received message about nonexistent slice:', msg.handle);
                return true;
            }
            var updateStatus = this._updateSliceStatus(msg, slice);
            for (var i = 0; i < msg.sliceUpdates.length; i++) {
                var update = msg.sliceUpdates[i];
                if (update.type === 'update') {
                    this._spliceFireFuncs.push(this._processSliceUpdate.bind(this, msg, update.updates, slice));
                } else {
                    this._transformAndEnqueueSingleSplice(msg, update, slice);
                }
            }
            if (ContactCache.pendingLookupCount) {
                ContactCache.callbacks.push(function contactsResolved() {
                    this._fireAllSplices();
                    this._fireStatusNotifications(updateStatus, slice);
                    this._doneProcessingMessage(msg);
                }.bind(this));
                return false;
            }
            this._fireAllSplices();
            this._fireStatusNotifications(updateStatus, slice);
            return true;
        },
        _fireStatusNotifications: function (updateStatus, slice) {
            if (updateStatus && slice.onstatus) {
                slice.onstatus(slice.status);
            }
        },
        _updateSliceStatus: function (msg, slice) {
            slice.atTop = msg.atTop;
            slice.atBottom = msg.atBottom;
            slice.userCanGrowUpwards = msg.userCanGrowUpwards;
            slice.userCanGrowDownwards = msg.userCanGrowDownwards;
            var generatedStatusChange = msg.status && (slice.status !== msg.status || slice.syncProgress !== msg.progress);
            if (msg.status) {
                slice.status = msg.status;
                slice.syncProgress = msg.syncProgress;
            }
            return generatedStatusChange;
        },
        _processSliceUpdate: function (msg, splice, slice) {
            try {
                for (var i = 0; i < splice.length; i += 2) {
                    var idx = splice[i], wireRep = splice[i + 1], itemObj = slice.items[idx];
                    itemObj.__update(wireRep);
                    if (slice.onchange) {
                        slice.onchange(itemObj, idx);
                    }
                    if (itemObj.onchange) {
                        itemObj.onchange(itemObj, idx);
                    }
                }
            } catch (ex) {
                reportClientCodeError('onchange notification error', ex, '\n', ex.stack);
            }
        },
        _transformAndEnqueueSingleSplice: function (msg, splice, slice) {
            var transformedItems = this._transform_sliceSplice(splice, slice);
            var fake = false;
            this._spliceFireFuncs.push(function singleSpliceUpdate() {
                this._fireSplice(splice, slice, transformedItems, fake);
            }.bind(this));
        },
        _fireSplice: function (splice, slice, transformedItems, fake) {
            var i, stopIndex, items, tempMsg;
            if (splice.headerCount !== undefined) {
                slice.headerCount = splice.headerCount;
            }
            if (slice.onsplice) {
                try {
                    slice.onsplice(splice.index, splice.howMany, transformedItems, splice.requested, splice.moreExpected, fake);
                } catch (ex) {
                    reportClientCodeError('onsplice notification error', ex, '\n', ex.stack);
                }
            }
            if (splice.howMany) {
                try {
                    stopIndex = splice.index + splice.howMany;
                    for (i = splice.index; i < stopIndex; i++) {
                        var item = slice.items[i];
                        if (slice.onremove)
                            slice.onremove(item, i);
                        if (item.onremove)
                            item.onremove(item, i);
                        item.__die();
                    }
                } catch (ex) {
                    reportClientCodeError('onremove notification error', ex, '\n', ex.stack);
                }
            }
            slice.items.splice.apply(slice.items, [
                splice.index,
                splice.howMany
            ].concat(transformedItems));
            if (slice.onadd) {
                try {
                    stopIndex = splice.index + transformedItems.length;
                    for (i = splice.index; i < stopIndex; i++) {
                        slice.onadd(slice.items[i], i);
                    }
                } catch (ex) {
                    reportClientCodeError('onadd notification error', ex, '\n', ex.stack);
                }
            }
            if (splice.requested && !splice.moreExpected) {
                slice._growing = 0;
                if (slice.pendingRequestCount)
                    slice.pendingRequestCount--;
                if (slice.oncomplete) {
                    var completeFunc = slice.oncomplete;
                    slice.oncomplete = null;
                    try {
                        completeFunc(splice.newEmailCount);
                    } catch (ex) {
                        reportClientCodeError('oncomplete notification error', ex, '\n', ex.stack);
                    }
                }
            }
        },
        _transform_sliceSplice: function ma__transform_sliceSplice(splice, slice) {
            var addItems = splice.addItems, transformedItems = [], i;
            switch (slice._ns) {
            case 'accounts':
                for (i = 0; i < addItems.length; i++) {
                    transformedItems.push(new MailAccount(this, addItems[i], slice));
                }
                break;
            case 'identities':
                for (i = 0; i < addItems.length; i++) {
                    transformedItems.push(new MailSenderIdentity(this, addItems[i]));
                }
                break;
            case 'folders':
                for (i = 0; i < addItems.length; i++) {
                    transformedItems.push(new MailFolder(this, addItems[i]));
                }
                break;
            case 'headers':
                for (i = 0; i < addItems.length; i++) {
                    transformedItems.push(new MailHeader(slice, addItems[i]));
                }
                break;
            case 'matchedHeaders':
                for (i = 0; i < addItems.length; i++) {
                    transformedItems.push(new MailMatchedHeader(slice, addItems[i]));
                }
                break;
            default:
                console.error('Slice notification for unknown type:', slice._ns);
                break;
            }
            return transformedItems;
        },
        _recv_sliceDead: function (msg) {
            var slice = this._slices[msg.handle];
            delete this._slices[msg.handle];
            if (slice.ondead)
                slice.ondead(slice);
            slice.ondead = null;
            return true;
        },
        _getBodyForMessage: function (header, options, callback) {
            var downloadBodyReps = false, withBodyReps = false;
            if (options && options.downloadBodyReps) {
                downloadBodyReps = options.downloadBodyReps;
            }
            if (options && options.withBodyReps) {
                withBodyReps = options.withBodyReps;
            }
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'getBody',
                suid: header.id,
                callback: callback
            };
            this.__bridgeSend({
                type: 'getBody',
                handle: handle,
                suid: header.id,
                date: header.date.valueOf(),
                downloadBodyReps: downloadBodyReps,
                withBodyReps: withBodyReps
            });
        },
        _recv_gotBody: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for got body:', msg.handle);
                return true;
            }
            delete this._pendingRequests[msg.handle];
            var body = msg.bodyInfo ? new MailBody(this, req.suid, msg.bodyInfo, msg.handle) : null;
            if (body) {
                this._liveBodies[msg.handle] = body;
            }
            req.callback.call(null, body, req.suid);
            return true;
        },
        _recv_requestBodiesComplete: function (msg) {
            var slice = this._slices[msg.handle];
            if (slice)
                slice._notifyRequestBodiesComplete(msg.requestId);
            return true;
        },
        _recv_bodyModified: function (msg) {
            var body = this._liveBodies[msg.handle];
            if (!body) {
                unexpectedBridgeDataError('body modified for dead handle', msg.handle);
                return true;
            }
            var wireRep = msg.bodyInfo;
            body.__update(wireRep, msg.detail);
            if (body.onchange) {
                body.onchange(msg.detail, body);
            }
            return true;
        },
        _recv_bodyDead: function (msg) {
            var body = this._liveBodies[msg.handle];
            if (body && body.ondead) {
                body.ondead();
            }
            delete this._liveBodies[msg.handle];
            return true;
        },
        _downloadAttachments: function (body, relPartIndices, attachmentIndices, registerAttachments, callWhenDone, callOnProgress) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'downloadAttachments',
                body: body,
                relParts: relPartIndices.length > 0,
                attachments: attachmentIndices.length > 0,
                callback: callWhenDone,
                progress: callOnProgress
            };
            this.__bridgeSend({
                type: 'downloadAttachments',
                handle: handle,
                suid: body.id,
                date: body._date,
                relPartIndices: relPartIndices,
                attachmentIndices: attachmentIndices,
                registerAttachments: registerAttachments
            });
        },
        _recv_downloadedAttachments: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for got body:', msg.handle);
                return true;
            }
            delete this._pendingRequests[msg.handle];
            if (req.callback)
                req.callback.call(null, req.body);
            return true;
        },
        learnAboutAccount: function (details, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'learnAboutAccount',
                details: details,
                callback: callback
            };
            this.__bridgeSend({
                type: 'learnAboutAccount',
                handle: handle,
                details: details
            });
        },
        _recv_learnAboutAccountResults: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle:', msg.handle);
                return true;
            }
            delete this._pendingRequests[msg.handle];
            req.callback.call(null, msg.data);
            return true;
        },
        tryToCreateAccount: function ma_tryToCreateAccount(details, domainInfo, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'tryToCreateAccount',
                details: details,
                domainInfo: domainInfo,
                callback: callback
            };
            this.__bridgeSend({
                type: 'tryToCreateAccount',
                handle: handle,
                details: details,
                domainInfo: domainInfo
            });
        },
        _recv_tryToCreateAccountResults: function ma__recv_tryToCreateAccountResults(msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for create account:', msg.handle);
                return true;
            }
            delete this._pendingRequests[msg.handle];
            var account;
            if (msg.account) {
                account = new MailAccount(this, msg.account, null);
            }
            req.callback.call(null, msg.error, msg.errorDetails, account);
            return true;
        },
        _clearAccountProblems: function ma__clearAccountProblems(account, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'clearAccountProblems',
                callback: callback
            };
            this.__bridgeSend({
                type: 'clearAccountProblems',
                accountId: account.id,
                handle: handle
            });
        },
        _recv_clearAccountProblems: function ma__recv_clearAccountProblems(msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback && req.callback();
            return true;
        },
        _modifyAccount: function ma__modifyAccount(account, mods, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'modifyAccount',
                callback: callback
            };
            this.__bridgeSend({
                type: 'modifyAccount',
                accountId: account.id,
                mods: mods,
                handle: handle
            });
        },
        _recv_modifyAccount: function (msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback && req.callback();
            return true;
        },
        _deleteAccount: function ma__deleteAccount(account) {
            this.__bridgeSend({
                type: 'deleteAccount',
                accountId: account.id
            });
        },
        _modifyIdentity: function ma__modifyIdentity(identity, mods, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'modifyIdentity',
                callback: callback
            };
            this.__bridgeSend({
                type: 'modifyIdentity',
                identityId: identity.id,
                mods: mods,
                handle: handle
            });
        },
        _recv_modifyIdentity: function (msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback && req.callback();
            return true;
        },
        viewAccounts: function ma_viewAccounts(realAccountsOnly) {
            var handle = this._nextHandle++, slice = new AccountsViewSlice(this, handle);
            this._slices[handle] = slice;
            this.__bridgeSend({
                type: 'viewAccounts',
                handle: handle
            });
            return slice;
        },
        viewSenderIdentities: function ma_viewSenderIdentities() {
            var handle = this._nextHandle++, slice = new BridgedViewSlice(this, 'identities', handle);
            this._slices[handle] = slice;
            this.__bridgeSend({
                type: 'viewSenderIdentities',
                handle: handle
            });
            return slice;
        },
        viewFolders: function ma_viewFolders(mode, argument) {
            var handle = this._nextHandle++, slice = new FoldersViewSlice(this, handle);
            this._slices[handle] = slice;
            this.__bridgeSend({
                type: 'viewFolders',
                mode: mode,
                handle: handle,
                argument: argument ? argument.id : null
            });
            return slice;
        },
        viewFolderMessages: function ma_viewFolderMessages(folder) {
            var handle = this._nextHandle++, slice = new HeadersViewSlice(this, handle);
            slice.folderId = folder.id;
            slice.pendingRequestCount++;
            this._slices[handle] = slice;
            this.__bridgeSend({
                type: 'viewFolderMessages',
                folderId: folder.id,
                handle: handle
            });
            return slice;
        },
        searchFolderMessages: function ma_searchFolderMessages(folder, text, whatToSearch) {
            var handle = this._nextHandle++, slice = new HeadersViewSlice(this, handle, 'matchedHeaders');
            slice.pendingRequestCount++;
            this._slices[handle] = slice;
            this.__bridgeSend({
                type: 'searchFolderMessages',
                folderId: folder.id,
                handle: handle,
                phrase: text,
                whatToSearch: whatToSearch
            });
            return slice;
        },
        deleteMessages: function ma_deleteMessages(messages) {
            var handle = this._nextHandle++;
            var undoableOp = new UndoableOperation(this, 'delete', messages.length, handle), msgSuids = messages.map(serializeMessageName);
            this._pendingRequests[handle] = {
                type: 'mutation',
                handle: handle,
                undoableOp: undoableOp
            };
            this.__bridgeSend({
                type: 'deleteMessages',
                handle: handle,
                messages: msgSuids
            });
            return undoableOp;
        },
        moveMessages: function ma_moveMessages(messages, targetFolder, callback) {
            var handle = this._nextHandle++;
            var undoableOp = new UndoableOperation(this, 'move', messages.length, handle), msgSuids = messages.map(serializeMessageName);
            this._pendingRequests[handle] = {
                type: 'mutation',
                handle: handle,
                undoableOp: undoableOp,
                callback: callback
            };
            this.__bridgeSend({
                type: 'moveMessages',
                handle: handle,
                messages: msgSuids,
                targetFolder: targetFolder.id
            });
            return undoableOp;
        },
        markMessagesRead: function ma_markMessagesRead(messages, beRead) {
            return this.modifyMessageTags(messages, beRead ? ['\\Seen'] : null, beRead ? null : ['\\Seen'], beRead ? 'read' : 'unread');
        },
        markMessagesStarred: function ma_markMessagesStarred(messages, beStarred) {
            return this.modifyMessageTags(messages, beStarred ? ['\\Flagged'] : null, beStarred ? null : ['\\Flagged'], beStarred ? 'star' : 'unstar');
        },
        modifyMessageTags: function ma_modifyMessageTags(messages, addTags, removeTags, _opcode) {
            var handle = this._nextHandle++;
            if (!_opcode) {
                if (addTags && addTags.length)
                    _opcode = 'addtag';
                else if (removeTags && removeTags.length)
                    _opcode = 'removetag';
            }
            var undoableOp = new UndoableOperation(this, _opcode, messages.length, handle), msgSuids = messages.map(serializeMessageName);
            this._pendingRequests[handle] = {
                type: 'mutation',
                handle: handle,
                undoableOp: undoableOp
            };
            this.__bridgeSend({
                type: 'modifyMessageTags',
                handle: handle,
                opcode: _opcode,
                addTags: addTags,
                removeTags: removeTags,
                messages: msgSuids
            });
            return undoableOp;
        },
        sendOutboxMessages: function (account, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'sendOutboxMessages',
                callback: callback
            };
            this.__bridgeSend({
                type: 'sendOutboxMessages',
                accountId: account.id,
                handle: handle
            });
        },
        _recv_sendOutboxMessages: function (msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback && req.callback();
            return true;
        },
        setOutboxSyncEnabled: function (account, enabled, callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'setOutboxSyncEnabled',
                callback: callback
            };
            this.__bridgeSend({
                type: 'setOutboxSyncEnabled',
                accountId: account.id,
                outboxSyncEnabled: enabled,
                handle: handle
            });
        },
        _recv_setOutboxSyncEnabled: function (msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback && req.callback();
            return true;
        },
        parseMailbox: function (email) {
            try {
                var mailbox = addressparser.parse(email);
                return mailbox.length >= 1 ? mailbox[0] : null;
            } catch (ex) {
                reportClientCodeError('parse mailbox error', ex, '\n', ex.stack);
                return null;
            }
        },
        _recv_mutationConfirmed: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for mutation:', msg.handle);
                return true;
            }
            req.undoableOp._tempHandle = null;
            req.undoableOp._longtermIds = msg.longtermIds;
            if (req.undoableOp._undoRequested)
                req.undoableOp.undo();
            if (req.callback) {
                req.callback(msg.result);
            }
            return true;
        },
        __undo: function undo(undoableOp) {
            this.__bridgeSend({
                type: 'undo',
                longtermIds: undoableOp._longtermIds
            });
        },
        resolveEmailAddressToPeep: function (emailAddress, callback) {
            var peep = ContactCache.resolvePeep({
                name: null,
                address: emailAddress
            });
            if (ContactCache.pendingLookupCount)
                ContactCache.callbacks.push(callback.bind(null, peep));
            else
                callback(peep);
        },
        beginMessageComposition: function (message, folder, options, callback) {
            if (!callback)
                throw new Error('A callback must be provided; you are using the API ' + 'wrong if you do not.');
            if (!options)
                options = {};
            var handle = this._nextHandle++, composer = new MessageComposition(this, handle);
            this._pendingRequests[handle] = {
                type: 'compose',
                composer: composer,
                callback: callback
            };
            var msg = {
                type: 'beginCompose',
                handle: handle,
                mode: null,
                submode: null,
                refSuid: null,
                refDate: null,
                refGuid: null,
                refAuthor: null,
                refSubject: null
            };
            if (options.hasOwnProperty('replyTo') && options.replyTo) {
                msg.mode = 'reply';
                msg.submode = options.replyMode;
                msg.refSuid = options.replyTo.id;
                msg.refDate = options.replyTo.date.valueOf();
                msg.refGuid = options.replyTo.guid;
                msg.refAuthor = options.replyTo.author.toWireRep();
                msg.refSubject = options.replyTo.subject;
            } else if (options.hasOwnProperty('forwardOf') && options.forwardOf) {
                msg.mode = 'forward';
                msg.submode = options.forwardMode;
                msg.refSuid = options.forwardOf.id;
                msg.refDate = options.forwardOf.date.valueOf();
                msg.refGuid = options.forwardOf.guid;
                msg.refAuthor = options.forwardOf.author.toWireRep();
                msg.refSubject = options.forwardOf.subject;
            } else {
                msg.mode = 'new';
                if (message) {
                    msg.submode = 'message';
                    msg.refSuid = message.id;
                } else if (folder) {
                    msg.submode = 'folder';
                    msg.refSuid = folder.id;
                }
            }
            this.__bridgeSend(msg);
            return composer;
        },
        resumeMessageComposition: function (message, callback) {
            if (!callback)
                throw new Error('A callback must be provided; you are using the API ' + 'wrong if you do not.');
            var handle = this._nextHandle++, composer = new MessageComposition(this, handle);
            this._pendingRequests[handle] = {
                type: 'compose',
                composer: composer,
                callback: callback
            };
            this.__bridgeSend({
                type: 'resumeCompose',
                handle: handle,
                messageNamer: serializeMessageName(message)
            });
            return composer;
        },
        _recv_composeBegun: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for compose begun:', msg.handle);
                return true;
            }
            req.composer.senderIdentity = new MailSenderIdentity(this, msg.identity);
            req.composer.subject = msg.subject;
            req.composer.body = msg.body;
            req.composer.to = msg.to;
            req.composer.cc = msg.cc;
            req.composer.bcc = msg.bcc;
            req.composer._references = msg.referencesStr;
            req.composer.attachments = msg.attachments;
            req.composer.sendStatus = msg.sendStatus;
            if (req.callback) {
                var callback = req.callback;
                req.callback = null;
                callback.call(null, req.composer);
            }
            return true;
        },
        _composeAttach: function (draftHandle, attachmentDef, callback) {
            if (!draftHandle) {
                return;
            }
            var draftReq = this._pendingRequests[draftHandle];
            if (!draftReq) {
                return;
            }
            var callbackHandle = this._nextHandle++;
            this._pendingRequests[callbackHandle] = {
                type: 'attachBlobToDraft',
                callback: callback
            };
            this.__bridgeSend({
                type: 'attachBlobToDraft',
                handle: callbackHandle,
                draftHandle: draftHandle,
                attachmentDef: attachmentDef
            });
        },
        _recv_attachedBlobToDraft: function (msg) {
            var callbackReq = this._pendingRequests[msg.handle];
            var draftReq = this._pendingRequests[msg.draftHandle];
            if (!callbackReq) {
                return true;
            }
            delete this._pendingRequests[msg.handle];
            if (callbackReq.callback && draftReq && draftReq.composer) {
                callbackReq.callback(msg.err, draftReq.composer);
            }
            return true;
        },
        _composeDetach: function (draftHandle, attachmentIndex, callback) {
            if (!draftHandle) {
                return;
            }
            var draftReq = this._pendingRequests[draftHandle];
            if (!draftReq) {
                return;
            }
            var callbackHandle = this._nextHandle++;
            this._pendingRequests[callbackHandle] = {
                type: 'detachAttachmentFromDraft',
                callback: callback
            };
            this.__bridgeSend({
                type: 'detachAttachmentFromDraft',
                handle: callbackHandle,
                draftHandle: draftHandle,
                attachmentIndex: attachmentIndex
            });
        },
        _recv_detachedAttachmentFromDraft: function (msg) {
            var callbackReq = this._pendingRequests[msg.handle];
            var draftReq = this._pendingRequests[msg.draftHandle];
            if (!callbackReq) {
                return true;
            }
            delete this._pendingRequests[msg.handle];
            if (callbackReq.callback && draftReq && draftReq.composer) {
                callbackReq.callback(msg.err, draftReq.composer);
            }
            return true;
        },
        _composeDone: function (handle, command, state, callback) {
            if (!handle)
                return;
            var req = this._pendingRequests[handle];
            if (!req) {
                return;
            }
            req.type = command;
            if (callback)
                req.callback = callback;
            this.__bridgeSend({
                type: 'doneCompose',
                handle: handle,
                command: command,
                state: state
            });
        },
        _recv_doneCompose: function (msg) {
            var req = this._pendingRequests[msg.handle];
            if (!req) {
                unexpectedBridgeDataError('Bad handle for doneCompose:', msg.handle);
                return true;
            }
            req.active = null;
            if (req.type === 'die' || !msg.err && req.type !== 'save')
                delete this._pendingRequests[msg.handle];
            if (req.callback) {
                req.callback.call(null, {
                    sentDate: msg.sentDate,
                    messageId: msg.messageId,
                    sendStatus: msg.sendStatus
                });
                req.callback = null;
            }
            return true;
        },
        setInteractive: function () {
            this.__bridgeSend({ type: 'setInteractive' });
        },
        _recv_cronSyncStart: function ma__recv_cronSyncStart(msg) {
            if (this.oncronsyncstart)
                this.oncronsyncstart(msg.accountIds);
            return true;
        },
        _recv_cronSyncStop: function ma__recv_cronSyncStop(msg) {
            if (this.oncronsyncstop)
                this.oncronsyncstop(msg.accountsResults);
            return true;
        },
        _recv_backgroundSendStatus: function (msg) {
            if (this.onbackgroundsendstatus) {
                this.onbackgroundsendstatus(msg.data);
            }
            return true;
        },
        useLocalizedStrings: function (strings) {
            this.__bridgeSend({
                type: 'localizedStrings',
                strings: strings
            });
            if (strings.folderNames)
                this.l10n_folder_names = strings.folderNames;
        },
        l10n_folder_names: {},
        l10n_folder_name: function (name, type) {
            if (this.l10n_folder_names.hasOwnProperty(type)) {
                var lowerName = name.toLowerCase();
                if (type === lowerName || type === 'drafts' || type === 'junk' || type === 'queue')
                    return this.l10n_folder_names[type];
            }
            return name;
        },
        modifyConfig: function (mods) {
            for (var key in mods) {
                if (LEGAL_CONFIG_KEYS.indexOf(key) === -1)
                    throw new Error(key + ' is not a legal config key!');
            }
            this.__bridgeSend({
                type: 'modifyConfig',
                mods: mods
            });
        },
        _recv_config: function (msg) {
            this.config = msg.config;
            return true;
        },
        ping: function (callback) {
            var handle = this._nextHandle++;
            this._pendingRequests[handle] = {
                type: 'ping',
                callback: callback
            };
            window.setZeroTimeout(function () {
                this.__bridgeSend({
                    type: 'ping',
                    handle: handle
                });
            }.bind(this));
        },
        _recv_pong: function (msg) {
            var req = this._pendingRequests[msg.handle];
            delete this._pendingRequests[msg.handle];
            req.callback();
            return true;
        },
        debugSupport: function (command, argument) {
            if (command === 'setLogging')
                this.config.debugLogging = argument;
            this.__bridgeSend({
                type: 'debugSupport',
                cmd: command,
                arg: argument
            });
        }
    };
});
;
define('ext/worker-support/main-router', [], function () {
    'use strict';
    var listeners = {};
    var modules = [];
    var worker = null;
    function register(module) {
        var action, name = module.name;
        modules.push(module);
        if (module.process) {
            action = function (msg) {
                module.process(msg.uid, msg.cmd, msg.args);
            };
        } else if (module.dispatch) {
            action = function (msg) {
                if (module.dispatch[msg.cmd]) {
                    module.dispatch[msg.cmd].apply(module.dispatch, msg.args);
                }
            };
        }
        listeners[name] = action;
        module.sendMessage = function (uid, cmd, args, transferArgs) {
            worker.postMessage({
                type: name,
                uid: uid,
                cmd: cmd,
                args: args
            }, transferArgs);
        };
    }
    function unregister(module) {
        delete listeners['on' + module.name];
    }
    function shutdown() {
        modules.forEach(function (module) {
            if (module.shutdown)
                module.shutdown();
        });
    }
    function useWorker(_worker) {
        worker = _worker;
        worker.onmessage = function dispatchToListener(evt) {
            var data = evt.data;
            var listener = listeners[data.type];
            if (listener)
                listener(data);
        };
    }
    return {
        register: register,
        unregister: unregister,
        useWorker: useWorker,
        shutdown: shutdown
    };
});
;
define('ext/worker-support/configparser-main', [], function () {
    'use strict';
    function debug(str) {
    }
    function nsResolver(prefix) {
        var baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
        var ns = {
            rq: baseUrl + 'mobilesync/requestschema/2006',
            ad: baseUrl + 'responseschema/2006',
            ms: baseUrl + 'mobilesync/responseschema/2006'
        };
        return ns[prefix] || null;
    }
    function parseAccountCommon(uid, cmd, text) {
        var doc = new DOMParser().parseFromString(text, 'text/xml');
        var getNode = function (xpath, rel) {
            return doc.evaluate(xpath, rel || doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        };
        var dictifyChildNodes = function (node) {
            if (!node) {
                return null;
            }
            var dict = {};
            for (var kid = node.firstElementChild; kid; kid = kid.nextElementSibling) {
                dict[kid.tagName] = kid.textContent;
            }
            return dict;
        };
        var provider = getNode('/clientConfig/emailProvider');
        var incoming = getNode('incomingServer[@type="imap"] | ' + 'incomingServer[@type="activesync"] | ' + 'incomingServer[@type="pop3"]', provider);
        var outgoing = getNode('outgoingServer[@type="smtp"]', provider);
        var oauth2Settings = dictifyChildNodes(getNode('oauth2Settings', provider));
        var config = null;
        var status = null;
        if (incoming) {
            config = {
                type: null,
                incoming: {},
                outgoing: {},
                oauth2Settings: oauth2Settings
            };
            for (var iter in Iterator(incoming.children)) {
                var child = iter[1];
                config.incoming[child.tagName] = child.textContent;
            }
            if (incoming.getAttribute('type') === 'activesync') {
                config.type = 'activesync';
            } else if (outgoing) {
                var isImap = incoming.getAttribute('type') === 'imap';
                config.type = isImap ? 'imap+smtp' : 'pop3+smtp';
                for (var iter in Iterator(outgoing.children)) {
                    var child = iter[1];
                    config.outgoing[child.tagName] = child.textContent;
                }
                var ALLOWED_SOCKET_TYPES = [
                    'SSL',
                    'STARTTLS'
                ];
                if (ALLOWED_SOCKET_TYPES.indexOf(config.incoming.socketType) === -1 || ALLOWED_SOCKET_TYPES.indexOf(config.outgoing.socketType) === -1) {
                    config = null;
                    status = 'unsafe';
                }
            } else {
                config = null;
                status = 'no-outgoing';
            }
        } else {
            status = 'no-incoming';
        }
        self.sendMessage(uid, cmd, [
            config,
            status
        ]);
    }
    function parseActiveSyncAccount(uid, cmd, text, aNoRedirect) {
        var doc = new DOMParser().parseFromString(text, 'text/xml');
        var getNode = function (xpath, rel) {
            return doc.evaluate(xpath, rel, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        };
        var getNodes = function (xpath, rel) {
            return doc.evaluate(xpath, rel, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        };
        var getString = function (xpath, rel) {
            return doc.evaluate(xpath, rel, nsResolver, XPathResult.STRING_TYPE, null).stringValue;
        };
        var postResponse = function (error, config, redirectedEmail) {
            self.sendMessage(uid, cmd, [
                config,
                error,
                redirectedEmail
            ]);
        };
        var error = null;
        if (doc.documentElement.tagName === 'parsererror') {
            error = 'Error parsing autodiscover response';
            return postResponse(error);
        }
        var responseNode = getNode('/ad:Autodiscover/ms:Response', doc) || getNode('/ms:Autodiscover/ms:Response', doc);
        if (!responseNode) {
            error = 'Missing Autodiscover Response node';
            return postResponse(error);
        }
        var error = getNode('ms:Error', responseNode) || getNode('ms:Action/ms:Error', responseNode);
        if (error) {
            error = getString('ms:Message/text()', error);
            return postResponse(error);
        }
        var redirect = getNode('ms:Action/ms:Redirect', responseNode);
        if (redirect) {
            if (aNoRedirect) {
                error = 'Multiple redirects occurred during autodiscovery';
                return postResponse(error);
            }
            var redirectedEmail = getString('text()', redirect);
            return postResponse(null, null, redirectedEmail);
        }
        var user = getNode('ms:User', responseNode);
        var config = {
            culture: getString('ms:Culture/text()', responseNode),
            user: {
                name: getString('ms:DisplayName/text()', user),
                email: getString('ms:EMailAddress/text()', user)
            },
            servers: []
        };
        var servers = getNodes('ms:Action/ms:Settings/ms:Server', responseNode);
        var server;
        while (server = servers.iterateNext()) {
            config.servers.push({
                type: getString('ms:Type/text()', server),
                url: getString('ms:Url/text()', server),
                name: getString('ms:Name/text()', server),
                serverData: getString('ms:ServerData/text()', server)
            });
        }
        for (var iter in Iterator(config.servers)) {
            var server = iter[1];
            if (server.type === 'MobileSync') {
                config.mobileSyncServer = server;
                break;
            }
        }
        if (!config.mobileSyncServer) {
            error = 'No MobileSync server found';
            return postResponse(error, config);
        }
        postResponse(null, config);
    }
    ;
    var self = {
        name: 'configparser',
        sendMessage: null,
        process: function (uid, cmd, args) {
            debug('process ' + cmd);
            switch (cmd) {
            case 'accountcommon':
                parseAccountCommon(uid, cmd, args[0]);
                break;
            case 'accountactivesync':
                parseActiveSyncAccount(uid, cmd, args[0], args[1]);
                break;
            }
        }
    };
    return self;
});
define('ext/worker-support/cronsync-main', [
    'require',
    'evt'
], function (require) {
    'use strict';
    var evt = require('evt');
    function debug(str) {
        console.log('cronsync-main: ' + str);
    }
    function makeData(accountIds, interval, date) {
        return {
            type: 'sync',
            accountIds: accountIds,
            interval: interval,
            timestamp: date.getTime()
        };
    }
    function makeAccountKey(accountIds) {
        return 'id' + accountIds.join(' ');
    }
    var prefixLength = 'interval'.length;
    function toInterval(intervalKey) {
        return parseInt(intervalKey.substring(prefixLength), 10);
    }
    function hasSameValues(ary1, ary2) {
        if (ary1.length !== ary2.length) {
            return false;
        }
        var hasMismatch = ary1.some(function (item, i) {
            return item !== ary2[i];
        });
        return !hasMismatch;
    }
    var dispatcher = {
        _routeReady: false,
        _routeQueue: [],
        _sendMessage: function (type, args) {
            if (this._routeReady) {
                routeRegistration.sendMessage(null, type, args);
            } else {
                this._routeQueue.push([
                    type,
                    args
                ]);
            }
        },
        hello: function () {
            this._routeReady = true;
            if (this._routeQueue.length) {
                var queue = this._routeQueue;
                this._routeQueue = [];
                queue.forEach(function (args) {
                    this._sendMessage(args[0], args[1]);
                }.bind(this));
            }
        },
        clearAll: function () {
            var mozAlarms = navigator.mozAlarms;
            if (!mozAlarms) {
                return;
            }
            var r = mozAlarms.getAll();
            r.onsuccess = function (event) {
                var alarms = event.target.result;
                if (!alarms) {
                    return;
                }
                alarms.forEach(function (alarm) {
                    if (alarm.data && alarm.data.type === 'sync') {
                        mozAlarms.remove(alarm.id);
                    }
                });
            }.bind(this);
            r.onerror = function (err) {
                console.error('cronsync-main clearAll mozAlarms.getAll: error: ' + err);
            }.bind(this);
        },
        ensureSync: function (syncData) {
            var mozAlarms = navigator.mozAlarms;
            if (!mozAlarms) {
                console.warn('no mozAlarms support!');
                return;
            }
            debug('ensureSync called');
            var request = mozAlarms.getAll();
            request.onsuccess = function (event) {
                debug('success!');
                var alarms = event.target.result;
                if (!alarms) {
                    alarms = [];
                }
                var expiredAlarmIds = [], okAlarmIntervals = {}, uniqueAlarms = {};
                alarms.forEach(function (alarm) {
                    if (!alarm.data || !alarm.data.type || alarm.data.type !== 'sync') {
                        return;
                    }
                    var intervalKey = 'interval' + alarm.data.interval, wantedAccountIds = syncData[intervalKey];
                    if (!wantedAccountIds || !hasSameValues(wantedAccountIds, alarm.data.accountIds)) {
                        debug('account array mismatch, canceling existing alarm');
                        expiredAlarmIds.push(alarm.id);
                    } else {
                        var interval = toInterval(intervalKey), now = Date.now(), alarmTime = alarm.data.timestamp, accountKey = makeAccountKey(wantedAccountIds);
                        if (interval && !uniqueAlarms.hasOwnProperty(accountKey) && alarmTime > now && alarmTime < now + interval) {
                            debug('existing alarm is OK: ' + accountKey);
                            uniqueAlarms[accountKey] = true;
                            okAlarmIntervals[intervalKey] = true;
                        } else {
                            debug('existing alarm is out of interval range, canceling');
                            expiredAlarmIds.push(alarm.id);
                        }
                    }
                });
                expiredAlarmIds.forEach(function (alarmId) {
                    mozAlarms.remove(alarmId);
                });
                var alarmMax = 0, alarmCount = 0, self = this;
                function done() {
                    alarmCount += 1;
                    if (alarmCount < alarmMax) {
                        return;
                    }
                    debug('ensureSync completed');
                    self._sendMessage('syncEnsured');
                }
                Object.keys(syncData).forEach(function (intervalKey) {
                    if (okAlarmIntervals.hasOwnProperty(intervalKey)) {
                        return;
                    }
                    var interval = toInterval(intervalKey), accountIds = syncData[intervalKey], date = new Date(Date.now() + interval);
                    if (!interval) {
                        return;
                    }
                    alarmMax += 1;
                    var alarmRequest = mozAlarms.add(date, 'ignoreTimezone', makeData(accountIds, interval, date));
                    alarmRequest.onsuccess = function () {
                        debug('success: mozAlarms.add for ' + 'IDs: ' + accountIds + ' at ' + interval + 'ms');
                        done();
                    };
                    alarmRequest.onerror = function (err) {
                        console.error('cronsync-main mozAlarms.add for IDs: ' + accountIds + ' failed: ' + err);
                    };
                });
                if (!alarmMax) {
                    done();
                }
            }.bind(this);
            request.onerror = function (err) {
                console.error('cronsync-main ensureSync mozAlarms.getAll: error: ' + err);
            };
        }
    };
    if (navigator.mozSetMessageHandler) {
        navigator.mozSetMessageHandler('alarm', function onAlarm(alarm) {
            console.log('mozSetMessageHandler: received an alarm');
            if (window.hasOwnProperty('appDispatchedMessage')) {
                window.appDispatchedMessage = true;
            }
            var data = alarm.data;
            if (!data || data.type !== 'sync') {
                return;
            }
            if (navigator.requestWakeLock) {
                var locks = [navigator.requestWakeLock('cpu')];
                debug('wake locks acquired: ' + locks + ' for account IDs: ' + data.accountIds);
                evt.emitWhenListener('cronSyncWakeLocks', makeAccountKey(data.accountIds), locks);
            }
            debug('alarm dispatch started at ' + new Date());
            dispatcher._sendMessage('alarm', [
                data.accountIds,
                data.interval
            ]);
        });
    }
    var routeRegistration = {
        name: 'cronsync',
        sendMessage: null,
        dispatch: dispatcher
    };
    return routeRegistration;
});
define('ext/worker-support/devicestorage-main', [], function () {
    'use strict';
    function debug(str) {
        dump('DeviceStorage: ' + str + '\n');
    }
    function save(uid, cmd, storage, blob, filename, registerDownload) {
        var deviceStorage = navigator.getDeviceStorage(storage);
        if (!deviceStorage) {
            self.sendMessage(uid, cmd, [
                false,
                'no-device-storage',
                null,
                false
            ]);
            return;
        }
        var req = deviceStorage.addNamed(blob, filename);
        req.onerror = function () {
            self.sendMessage(uid, cmd, [
                false,
                req.error.name,
                null,
                false
            ]);
        };
        req.onsuccess = function (e) {
            var prefix = '';
            if (typeof window.IS_GELAM_TEST !== 'undefined') {
                prefix = 'TEST_PREFIX/';
            }
            var savedPath = prefix + e.target.result;
            var registering = false;
            if (registerDownload) {
                var downloadManager = navigator.mozDownloadManager;
                console.warn('have downloadManager?', !!downloadManager, 'have adoptDownload?', downloadManager && !!downloadManager.adoptDownload);
                if (downloadManager && downloadManager.adoptDownload) {
                    try {
                        var fullPath = e.target.result;
                        var firstSlash = fullPath.indexOf('/', 2);
                        var storageName = fullPath.substring(1, firstSlash);
                        var storagePath = fullPath.substring(firstSlash + 1);
                        console.log('adopting download', deviceStorage.storageName, e.target.result);
                        registering = true;
                        downloadManager.adoptDownload({
                            totalBytes: blob.size,
                            url: '',
                            storageName: storageName,
                            storagePath: storagePath,
                            contentType: blob.type,
                            startTime: new Date(Date.now())
                        }).then(function () {
                            console.log('registered download with download manager');
                            self.sendMessage(uid, cmd, [
                                true,
                                null,
                                savedPath,
                                true
                            ]);
                        }, function () {
                            console.warn('failed to register download with download manager');
                            self.sendMessage(uid, cmd, [
                                true,
                                null,
                                savedPath,
                                false
                            ]);
                        });
                    } catch (ex) {
                        console.error('Problem adopting download!:', ex, '\n', ex.stack);
                    }
                } else {
                    console.log('download manager not available, not registering.');
                }
            } else {
                console.log('do not want to register download');
            }
            if (!registering) {
                self.sendMessage(uid, cmd, [
                    true,
                    null,
                    savedPath,
                    false
                ]);
            }
        };
    }
    var self = {
        name: 'devicestorage',
        sendMessage: null,
        process: function (uid, cmd, args) {
            debug('process ' + cmd);
            switch (cmd) {
            case 'save':
                save(uid, cmd, args[0], args[1], args[2], args[3]);
                break;
            }
        }
    };
    return self;
});
define('ext/worker-support/maildb-main', [], function () {
    'use strict';
    function debug(str) {
        dump('MailDB: ' + str + '\n');
    }
    var db = null;
    function open(uid, cmd, args) {
        db = self._debugDB = new MailDB(args[0], function () {
            self.sendMessage(uid, cmd, Array.prototype.slice.call(arguments));
        });
    }
    function others(uid, cmd, args) {
        if (!Array.isArray(args))
            args = [];
        args.push(function () {
            self.sendMessage(uid, cmd, Array.prototype.slice.call(arguments));
        });
        if (!db._db)
            console.warn('trying to call', cmd, 'on apparently dead db. skipping.');
        else
            db[cmd].apply(db, args);
    }
    var self = {
        name: 'maildb',
        sendMessage: null,
        process: function (uid, cmd, args) {
            switch (cmd) {
            case 'open':
                open(uid, cmd, args);
                break;
            default:
                others(uid, cmd, args);
                break;
            }
        },
        _debugDB: null
    };
    var IndexedDB;
    if ('indexedDB' in window && window.indexedDB) {
        IndexedDB = window.indexedDB;
    } else if ('mozIndexedDB' in window && window.mozIndexedDB) {
        IndexedDB = window.mozIndexedDB;
    } else if ('webkitIndexedDB' in window && window.webkitIndexedDB) {
        IndexedDB = window.webkitIndexedDB;
    } else {
        console.error('No IndexedDB!');
        throw new Error('I need IndexedDB; load me in a content page universe!');
    }
    var CUR_VERSION = 22;
    var FRIENDLY_LAZY_DB_UPGRADE_VERSION = 5;
    var TBL_CONFIG = 'config', CONFIG_KEY_ROOT = 'config', CONFIG_KEYPREFIX_ACCOUNT_DEF = 'accountDef:';
    var TBL_FOLDER_INFO = 'folderInfo';
    var TBL_HEADER_BLOCKS = 'headerBlocks';
    var TBL_BODY_BLOCKS = 'bodyBlocks';
    function MailDB(testOptions, successCb, errorCb, upgradeCb) {
        this._db = null;
        this._lazyConfigCarryover = null;
        this._fatalError = function (event) {
            function explainSource(source) {
                if (!source)
                    return 'unknown source';
                if (source instanceof IDBObjectStore)
                    return 'object store "' + source.name + '"';
                if (source instanceof IDBIndex)
                    return 'index "' + source.name + '" on object store "' + source.objectStore.name + '"';
                if (source instanceof IDBCursor)
                    return 'cursor on ' + explainSource(source.source);
                return 'unexpected source';
            }
            var explainedSource, target = event.target;
            if (target instanceof IDBTransaction) {
                explainedSource = 'transaction (' + target.mode + ')';
            } else if (target instanceof IDBRequest) {
                explainedSource = 'request as part of ' + (target.transaction ? target.transaction.mode : 'NO') + ' transaction on ' + explainSource(target.source);
            } else {
                explainedSource = target.toString();
            }
            console.error('indexedDB error:', target.error.name, 'from', explainedSource);
        };
        var dbVersion = CUR_VERSION;
        if (testOptions && testOptions.dbDelta)
            dbVersion += testOptions.dbDelta;
        if (testOptions && testOptions.dbVersion)
            dbVersion = testOptions.dbVersion;
        var openRequest = IndexedDB.open('b2g-email', dbVersion), self = this;
        openRequest.onsuccess = function (event) {
            self._db = openRequest.result;
            successCb();
        };
        openRequest.onupgradeneeded = function (event) {
            console.log('MailDB in onupgradeneeded');
            var db = openRequest.result;
            if (event.oldVersion < FRIENDLY_LAZY_DB_UPGRADE_VERSION || testOptions && testOptions.nukeDb) {
                self._nukeDB(db);
            } else {
                var trans = openRequest.transaction;
                self.getConfig(function (configObj, accountInfos) {
                    if (configObj)
                        self._lazyConfigCarryover = {
                            oldVersion: event.oldVersion,
                            config: configObj,
                            accountInfos: accountInfos
                        };
                    self._nukeDB(db);
                }, trans);
            }
        };
        openRequest.onerror = this._fatalError;
    }
    MailDB.prototype = {
        _nukeDB: function (db) {
            var existingNames = db.objectStoreNames;
            for (var i = 0; i < existingNames.length; i++) {
                db.deleteObjectStore(existingNames[i]);
            }
            db.createObjectStore(TBL_CONFIG);
            db.createObjectStore(TBL_FOLDER_INFO);
            db.createObjectStore(TBL_HEADER_BLOCKS);
            db.createObjectStore(TBL_BODY_BLOCKS);
        },
        close: function () {
            if (this._db) {
                this._db.close();
                this._db = null;
            }
        },
        getConfig: function (callback, trans) {
            var transaction = trans || this._db.transaction([
                TBL_CONFIG,
                TBL_FOLDER_INFO
            ], 'readonly');
            var configStore = transaction.objectStore(TBL_CONFIG), folderInfoStore = transaction.objectStore(TBL_FOLDER_INFO);
            var configReq = configStore.mozGetAll(), folderInfoReq = folderInfoStore.mozGetAll();
            configReq.onerror = this._fatalError;
            folderInfoReq.onerror = this._fatalError;
            var self = this;
            folderInfoReq.onsuccess = function (event) {
                var configObj = null, accounts = [], i, obj;
                if (self._lazyConfigCarryover) {
                    var lazyCarryover = self._lazyConfigCarryover;
                    self._lazyConfigCarryover = null;
                    callback(configObj, accounts, lazyCarryover);
                    return;
                }
                for (i = 0; i < configReq.result.length; i++) {
                    obj = configReq.result[i];
                    if (obj.id === 'config')
                        configObj = obj;
                    else
                        accounts.push({
                            def: obj,
                            folderInfo: null
                        });
                }
                for (i = 0; i < folderInfoReq.result.length; i++) {
                    accounts[i].folderInfo = folderInfoReq.result[i];
                }
                try {
                    callback(configObj, accounts);
                } catch (ex) {
                    console.error('Problem in configCallback', ex, '\n', ex.stack);
                }
            };
        },
        saveConfig: function (config) {
            var req = this._db.transaction(TBL_CONFIG, 'readwrite').objectStore(TBL_CONFIG).put(config, 'config');
            req.onerror = this._fatalError;
        },
        saveAccountDef: function (config, accountDef, folderInfo, callback) {
            var trans = this._db.transaction([
                TBL_CONFIG,
                TBL_FOLDER_INFO
            ], 'readwrite');
            var configStore = trans.objectStore(TBL_CONFIG);
            configStore.put(config, 'config');
            configStore.put(accountDef, CONFIG_KEYPREFIX_ACCOUNT_DEF + accountDef.id);
            if (folderInfo) {
                trans.objectStore(TBL_FOLDER_INFO).put(folderInfo, accountDef.id);
            }
            trans.onerror = this._fatalError;
            if (callback) {
                trans.oncomplete = function () {
                    callback();
                };
            }
        },
        loadHeaderBlock: function (folderId, blockId, callback) {
            var req = this._db.transaction(TBL_HEADER_BLOCKS, 'readonly').objectStore(TBL_HEADER_BLOCKS).get(folderId + ':' + blockId);
            req.onerror = this._fatalError;
            req.onsuccess = function () {
                callback(req.result);
            };
        },
        loadBodyBlock: function (folderId, blockId, callback) {
            var req = this._db.transaction(TBL_BODY_BLOCKS, 'readonly').objectStore(TBL_BODY_BLOCKS).get(folderId + ':' + blockId);
            req.onerror = this._fatalError;
            req.onsuccess = function () {
                callback(req.result);
            };
        },
        saveAccountFolderStates: function (accountId, folderInfo, perFolderStuff, deletedFolderIds, callback) {
            var trans = this._db.transaction([
                TBL_FOLDER_INFO,
                TBL_HEADER_BLOCKS,
                TBL_BODY_BLOCKS
            ], 'readwrite');
            trans.onerror = this._fatalError;
            trans.objectStore(TBL_FOLDER_INFO).put(folderInfo, accountId);
            var headerStore = trans.objectStore(TBL_HEADER_BLOCKS), bodyStore = trans.objectStore(TBL_BODY_BLOCKS), i;
            var operationQueue = [];
            function addToQueue() {
                var args = Array.slice(arguments);
                var store = args.shift();
                var type = args.shift();
                operationQueue.push({
                    store: store,
                    type: type,
                    args: args
                });
            }
            function workQueue() {
                var pendingRequest = operationQueue.shift();
                if (!pendingRequest)
                    return;
                var store = pendingRequest.store;
                var type = pendingRequest.type;
                var request = store[type].apply(store, pendingRequest.args);
                request.onsuccess = request.onerror = workQueue;
            }
            for (i = 0; i < perFolderStuff.length; i++) {
                var pfs = perFolderStuff[i], block;
                for (var headerBlockId in pfs.headerBlocks) {
                    block = pfs.headerBlocks[headerBlockId];
                    if (block)
                        addToQueue(headerStore, 'put', block, pfs.id + ':' + headerBlockId);
                    else
                        addToQueue(headerStore, 'delete', pfs.id + ':' + headerBlockId);
                }
                for (var bodyBlockId in pfs.bodyBlocks) {
                    block = pfs.bodyBlocks[bodyBlockId];
                    if (block)
                        addToQueue(bodyStore, 'put', block, pfs.id + ':' + bodyBlockId);
                    else
                        addToQueue(bodyStore, 'delete', pfs.id + ':' + bodyBlockId);
                }
            }
            if (deletedFolderIds) {
                for (i = 0; i < deletedFolderIds.length; i++) {
                    var folderId = deletedFolderIds[i], range = IDBKeyRange.bound(folderId + ':', folderId + ':\uFFF0', false, false);
                    addToQueue(headerStore, 'delete', range);
                    addToQueue(bodyStore, 'delete', range);
                }
            }
            if (callback) {
                trans.addEventListener('complete', function () {
                    callback();
                });
            }
            workQueue();
            return trans;
        },
        deleteAccount: function (accountId) {
            var trans = this._db.transaction([
                TBL_CONFIG,
                TBL_FOLDER_INFO,
                TBL_HEADER_BLOCKS,
                TBL_BODY_BLOCKS
            ], 'readwrite');
            trans.onerror = this._fatalError;
            trans.objectStore(TBL_CONFIG).delete('accountDef:' + accountId);
            trans.objectStore(TBL_FOLDER_INFO).delete(accountId);
            var range = IDBKeyRange.bound(accountId + '/', accountId + '/\uFFF0', false, false);
            trans.objectStore(TBL_HEADER_BLOCKS).delete(range);
            trans.objectStore(TBL_BODY_BLOCKS).delete(range);
        }
    };
    return self;
});
define('ext/async_blob_fetcher', ['exports'], function (exports) {
    function asyncFetchBlobAsUint8Array(blob, callback) {
        var blobUrl = URL.createObjectURL(blob);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', blobUrl, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
                callback(xhr.status);
                return;
            }
            callback(null, new Uint8Array(xhr.response));
        };
        xhr.onerror = function () {
            callback('error');
        };
        try {
            xhr.send();
        } catch (ex) {
            console.error('XHR send() failure on blob');
            callback('error');
        }
        URL.revokeObjectURL(blobUrl);
    }
    return { asyncFetchBlobAsUint8Array: asyncFetchBlobAsUint8Array };
});
;
define('ext/worker-support/net-main', [
    'require',
    '../async_blob_fetcher'
], function (require) {
    'use strict';
    var asyncFetchBlobAsUint8Array = require('../async_blob_fetcher').asyncFetchBlobAsUint8Array;
    var sockInfoByUID = {};
    function open(uid, host, port, options) {
        var socket = navigator.mozTCPSocket;
        var sock = socket.open(host, port, options);
        var sockInfo = sockInfoByUID[uid] = {
            uid: uid,
            sock: sock,
            activeBlob: null,
            blobOffset: 0,
            queuedData: null,
            backlog: []
        };
        sock.onopen = function (evt) {
            self.sendMessage(uid, 'onopen');
        };
        sock.onerror = function (evt) {
            var err = evt.data;
            var wrappedErr;
            if (err && typeof err === 'object') {
                wrappedErr = {
                    name: err.name,
                    type: err.type,
                    message: err.message
                };
            } else {
                wrappedErr = err;
            }
            self.sendMessage(uid, 'onerror', wrappedErr);
        };
        sock.ondata = function (evt) {
            var buf = evt.data;
            self.sendMessage(uid, 'ondata', buf, [buf]);
        };
        sock.ondrain = function (evt) {
            if (sockInfo.activeBlob && sockInfo.queuedData) {
                console.log('net-main(' + sockInfo.uid + '): Socket drained, sending.');
                sock.send(sockInfo.queuedData.buffer, 0, sockInfo.queuedData.byteLength);
                sockInfo.queuedData = null;
                fetchNextBlobChunk(sockInfo);
            } else {
                self.sendMessage(uid, 'ondrain');
            }
        };
        sock.onclose = function (evt) {
            self.sendMessage(uid, 'onclose');
            delete sockInfoByUID[uid];
        };
    }
    function beginBlobSend(sockInfo, blob) {
        console.log('net-main(' + sockInfo.uid + '): Blob send of', blob.size, 'bytes');
        sockInfo.activeBlob = blob;
        sockInfo.blobOffset = 0;
        sockInfo.queuedData = null;
        fetchNextBlobChunk(sockInfo);
    }
    function fetchNextBlobChunk(sockInfo) {
        if (sockInfo.blobOffset >= sockInfo.activeBlob.size) {
            console.log('net-main(' + sockInfo.uid + '): Blob send completed.', 'backlog length:', sockInfo.backlog.length);
            sockInfo.activeBlob = null;
            var backlog = sockInfo.backlog;
            while (backlog.length) {
                var sendArgs = backlog.shift();
                var data = sendArgs[0];
                if (data instanceof Blob) {
                    beginBlobSend(sockInfo, data);
                    return;
                }
                sockInfo.sock.send(data, sendArgs[1], sendArgs[2]);
            }
            return;
        }
        var nextOffset = Math.min(sockInfo.blobOffset + self.BLOB_BLOCK_READ_SIZE, sockInfo.activeBlob.size);
        console.log('net-main(' + sockInfo.uid + '): Fetching bytes', sockInfo.blobOffset, 'through', nextOffset, 'of', sockInfo.activeBlob.size);
        var blobSlice = sockInfo.activeBlob.slice(sockInfo.blobOffset, nextOffset);
        sockInfo.blobOffset = nextOffset;
        function gotChunk(err, binaryDataU8) {
            console.log('net-main(' + sockInfo.uid + '): Retrieved chunk');
            if (err) {
                sockInfo.sock.close();
                return;
            }
            if (sockInfo.sock.bufferedAmount === 0) {
                console.log('net-main(' + sockInfo.uid + '): Sending chunk immediately.');
                sockInfo.sock.send(binaryDataU8.buffer, 0, binaryDataU8.byteLength);
                fetchNextBlobChunk(sockInfo);
                return;
            }
            sockInfo.queuedData = binaryDataU8;
        }
        ;
        asyncFetchBlobAsUint8Array(blobSlice, gotChunk);
    }
    function close(uid) {
        var sockInfo = sockInfoByUID[uid];
        if (!sockInfo)
            return;
        var sock = sockInfo.sock;
        sock.close();
        sock.onopen = null;
        sock.onerror = null;
        sock.ondata = null;
        sock.ondrain = null;
        sock.onclose = null;
        self.sendMessage(uid, 'onclose');
        delete sockInfoByUID[uid];
    }
    function write(uid, data, offset, length) {
        var sockInfo = sockInfoByUID[uid];
        if (!sockInfo) {
            return;
        }
        if (sockInfo.activeBlob) {
            sockInfo.backlog.push([
                data,
                offset,
                length
            ]);
            return;
        }
        self.sendMessage(uid, 'onprogress', []);
        if (data instanceof Blob) {
            beginBlobSend(sockInfo, data);
        } else {
            sockInfo.sock.send(data, offset, length);
        }
    }
    function upgradeToSecure(uid) {
        var sockInfo = sockInfoByUID[uid];
        if (!sockInfo)
            return;
        sockInfo.sock.upgradeToSecure();
    }
    var self = {
        name: 'netsocket',
        sendMessage: null,
        BLOB_BLOCK_READ_SIZE: 96 * 1024,
        process: function (uid, cmd, args) {
            switch (cmd) {
            case 'open':
                open(uid, args[0], args[1], args[2]);
                break;
            case 'close':
                close(uid);
                break;
            case 'write':
                write(uid, args[0], args[1], args[2]);
                break;
            case 'upgradeToSecure':
                upgradeToSecure(uid);
                break;
            default:
                console.error('Unhandled net-main command:', cmd);
                break;
            }
        }
    };
    return self;
});
define('ext/worker-support/wakelocks-main', [], function () {
    'use strict';
    function debug(str) {
        dump('WakeLocks: ' + str + '\n');
    }
    var nextId = 1;
    var locks = {};
    function requestWakeLock(type) {
        var lock = navigator.requestWakeLock(type);
        var id = nextId++;
        locks[id] = lock;
        return id;
    }
    var self = {
        name: 'wakelocks',
        sendMessage: null,
        process: function (uid, cmd, args) {
            debug('process ' + cmd + ' ' + JSON.stringify(args));
            switch (cmd) {
            case 'requestWakeLock':
                var type = args[0];
                self.sendMessage(uid, cmd, [requestWakeLock(type)]);
                break;
            case 'unlock':
                var id = args[0];
                var lock = locks[id];
                if (lock) {
                    lock.unlock();
                    delete locks[id];
                }
                self.sendMessage(uid, cmd, []);
            }
        }
    };
    return self;
});
window.setZeroTimeout = function (fn) {
    setTimeout(function () {
        fn();
    }, 0);
};
define('ext/main-frame-setup', [
    './mailapi',
    './worker-support/main-router',
    './worker-support/configparser-main',
    './worker-support/cronsync-main',
    './worker-support/devicestorage-main',
    './worker-support/maildb-main',
    './worker-support/net-main',
    './worker-support/wakelocks-main',
    'require'
], function ($mailapi, $router, $configparser, $cronsync, $devicestorage, $maildb, $net, $wakelocks, require) {
    var control = {
        name: 'control',
        sendMessage: null,
        process: function (uid, cmd, args) {
            var online = navigator.onLine;
            control.sendMessage(uid, 'hello', [online]);
            window.addEventListener('online', function (evt) {
                control.sendMessage(uid, evt.type, [true]);
            });
            window.addEventListener('offline', function (evt) {
                control.sendMessage(uid, evt.type, [false]);
            });
            $router.unregister(control);
        }
    };
    var MailAPI = new $mailapi.MailAPI();
    var bridge = {
        name: 'bridge',
        sendMessage: null,
        process: function (uid, cmd, args) {
            var msg = args;
            if (msg.type === 'hello') {
                delete MailAPI._fake;
                MailAPI.__bridgeSend = function (msg) {
                    worker.postMessage({
                        uid: uid,
                        type: 'bridge',
                        msg: msg
                    });
                };
                MailAPI.config = msg.config;
                MailAPI._storedSends.forEach(function (msg) {
                    MailAPI.__bridgeSend(msg);
                });
                MailAPI._storedSends = [];
            } else {
                MailAPI.__bridgeReceive(msg);
            }
        }
    };
    var worker = new Worker(require.toUrl('./worker-bootstrap.js'));
    $router.useWorker(worker);
    $router.register(control);
    $router.register(bridge);
    $router.register($configparser);
    $router.register($cronsync);
    $router.register($devicestorage);
    $router.register($maildb);
    $router.register($net);
    $router.register($wakelocks);
    return MailAPI;
});
;