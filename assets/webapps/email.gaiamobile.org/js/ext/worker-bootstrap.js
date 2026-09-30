var requirejs, require, define;
(function (global, undef) {
    var prim, topReq, dataMain, src, subPath, bootstrapConfig = requirejs || require, hasOwn = Object.prototype.hasOwnProperty, contexts = {}, queue = [], currDirRegExp = /^\.\//, urlRegExp = /^\/|\:|\?|\.js$/, commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, jsSuffixRegExp = /\.js$/;
    if (typeof requirejs === 'function') {
        return;
    }
    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }
    function getOwn(obj, prop) {
        return obj && hasProp(obj, prop) && obj[prop];
    }
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value && !Array.isArray(value) && typeof value !== 'function' && !(value instanceof RegExp)) {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        value.split('.').forEach(function (part) {
            g = g[part];
        });
        return g;
    }
    (function () {
        'use strict';
        var waitingId, nextTick, waiting = [];
        function callWaiting() {
            waitingId = 0;
            var w = waiting;
            waiting = [];
            while (w.length) {
                w.shift()();
            }
        }
        function asyncTick(fn) {
            waiting.push(fn);
            if (!waitingId) {
                waitingId = setTimeout(callWaiting, 0);
            }
        }
        function syncTick(fn) {
            fn();
        }
        function isFunObj(x) {
            var type = typeof x;
            return type === 'object' || type === 'function';
        }
        nextTick = typeof setImmediate === 'function' ? setImmediate.bind() : typeof process !== 'undefined' && process.nextTick ? process.nextTick : typeof setTimeout !== 'undefined' ? asyncTick : syncTick;
        function notify(ary, value) {
            prim.nextTick(function () {
                ary.forEach(function (item) {
                    item(value);
                });
            });
        }
        function callback(p, ok, yes) {
            if (p.hasOwnProperty('v')) {
                prim.nextTick(function () {
                    yes(p.v);
                });
            } else {
                ok.push(yes);
            }
        }
        function errback(p, fail, no) {
            if (p.hasOwnProperty('e')) {
                prim.nextTick(function () {
                    no(p.e);
                });
            } else {
                fail.push(no);
            }
        }
        prim = function prim(fn) {
            var promise, f, p = {}, ok = [], fail = [];
            function makeFulfill() {
                var f, f2, called = false;
                function fulfill(v, prop, listeners) {
                    if (called) {
                        return;
                    }
                    called = true;
                    if (promise === v) {
                        called = false;
                        f.reject(new TypeError('value is same promise'));
                        return;
                    }
                    try {
                        var then = v && v.then;
                        if (isFunObj(v) && typeof then === 'function') {
                            f2 = makeFulfill();
                            then.call(v, f2.resolve, f2.reject);
                        } else {
                            p[prop] = v;
                            notify(listeners, v);
                        }
                    } catch (e) {
                        called = false;
                        f.reject(e);
                    }
                }
                f = {
                    resolve: function (v) {
                        fulfill(v, 'v', ok);
                    },
                    reject: function (e) {
                        fulfill(e, 'e', fail);
                    }
                };
                return f;
            }
            f = makeFulfill();
            promise = {
                then: function (yes, no) {
                    var next = prim(function (nextResolve, nextReject) {
                        function finish(fn, nextFn, v) {
                            try {
                                if (fn && typeof fn === 'function') {
                                    v = fn(v);
                                    nextResolve(v);
                                } else {
                                    nextFn(v);
                                }
                            } catch (e) {
                                nextReject(e);
                            }
                        }
                        callback(p, ok, finish.bind(undefined, yes, nextResolve));
                        errback(p, fail, finish.bind(undefined, no, nextReject));
                    });
                    return next;
                },
                catch: function (no) {
                    return promise.then(null, no);
                }
            };
            try {
                fn(f.resolve, f.reject);
            } catch (e) {
                f.reject(e);
            }
            return promise;
        };
        prim.resolve = function (value) {
            return prim(function (yes) {
                yes(value);
            });
        };
        prim.reject = function (err) {
            return prim(function (yes, no) {
                no(err);
            });
        };
        prim.cast = function (x) {
            if (isFunObj(x) && 'then' in x) {
                return x;
            } else {
                return prim(function (yes, no) {
                    if (x instanceof Error) {
                        no(x);
                    } else {
                        yes(x);
                    }
                });
            }
        };
        prim.all = function (ary) {
            return prim(function (yes, no) {
                var count = 0, length = ary.length, result = [];
                function resolved(i, v) {
                    result[i] = v;
                    count += 1;
                    if (count === length) {
                        yes(result);
                    }
                }
                ary.forEach(function (item, i) {
                    prim.cast(item).then(function (v) {
                        resolved(i, v);
                    }, function (err) {
                        no(err);
                    });
                });
            });
        };
        prim.nextTick = nextTick;
    }());
    function newContext(contextName) {
        var req, main, makeMap, callDep, handlers, checkingLater, load, context, defined = {}, waiting = {}, config = {
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            }, mapCache = {}, requireDeferreds = [], deferreds = {}, calledDefine = {}, calledPlugin = {}, loadCount = 0, startTime = new Date().getTime(), errCount = 0, trackedErrors = {}, urlFetched = {}, bundlesMap = {};
        function trimDots(ary) {
            var i, part, length = ary.length;
            for (i = 0; i < length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex, foundMap, foundI, foundStarMap, starI, baseParts = baseName && baseName.split('/'), normalizedBaseParts = baseParts, map = config.map, starMap = map && map['*'];
            if (name && name.charAt(0) === '.') {
                if (baseName) {
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split('/');
                    lastIndex = name.length - 1;
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                    }
                    name = normalizedBaseParts.concat(name);
                    trimDots(name);
                    name = name.join('/');
                } else if (name.indexOf('./') === 0) {
                    name = name.substring(2);
                }
            }
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');
                outerLoop:
                    for (i = nameParts.length; i > 0; i -= 1) {
                        nameSegment = nameParts.slice(0, i).join('/');
                        if (baseParts) {
                            for (j = baseParts.length; j > 0; j -= 1) {
                                mapValue = getOwn(map, baseParts.slice(0, j).join('/'));
                                if (mapValue) {
                                    mapValue = getOwn(mapValue, nameSegment);
                                    if (mapValue) {
                                        foundMap = mapValue;
                                        foundI = i;
                                        break outerLoop;
                                    }
                                }
                            }
                        }
                        if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                            foundStarMap = getOwn(starMap, nameSegment);
                            starI = i;
                        }
                    }
                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }
                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }
            pkgMain = getOwn(config.pkgs, name);
            return pkgMain ? pkgMain : name;
        }
        function makeShimExports(value) {
            function fn() {
                var ret;
                if (value.init) {
                    ret = value.init.apply(global, arguments);
                }
                return ret || value.exports && getGlobal(value.exports);
            }
            return fn;
        }
        function takeQueue(anonId) {
            var i, id, args, shim;
            for (i = 0; i < queue.length; i += 1) {
                if (typeof queue[i][0] !== 'string') {
                    if (anonId) {
                        queue[i].unshift(anonId);
                        anonId = undef;
                    } else {
                        break;
                    }
                }
                args = queue.shift();
                id = args[0];
                i -= 1;
                if (!hasProp(defined, id) && !hasProp(waiting, id)) {
                    if (hasProp(deferreds, id)) {
                        main.apply(undef, args);
                    } else {
                        waiting[id] = args;
                    }
                }
            }
            if (anonId) {
                shim = getOwn(config.shim, anonId) || {};
                main(anonId, shim.deps || [], shim.exportsFn);
            }
        }
        function makeRequire(relName, topLevel) {
            var req = function (deps, callback, errback, alt) {
                var name, cfg;
                if (topLevel) {
                    takeQueue();
                }
                if (typeof deps === 'string') {
                    if (handlers[deps]) {
                        return handlers[deps](relName);
                    }
                    name = makeMap(deps, relName, true).id;
                    if (!hasProp(defined, name)) {
                        throw new Error('Not loaded: ' + name);
                    }
                    return defined[name];
                } else if (deps && !Array.isArray(deps)) {
                    cfg = deps;
                    deps = undef;
                    if (Array.isArray(callback)) {
                        deps = callback;
                        callback = errback;
                        errback = alt;
                    }
                    if (topLevel) {
                        return req.config(cfg)(deps, callback, errback);
                    }
                }
                callback = callback || function () {
                };
                prim.nextTick(function () {
                    takeQueue();
                    main(undef, deps || [], callback, errback, relName);
                });
                return req;
            };
            req.isBrowser = typeof document !== 'undefined' && typeof navigator !== 'undefined';
            req.nameToUrl = function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url, parentPath, bundleId, pkgMain = getOwn(config.pkgs, moduleName);
                if (pkgMain) {
                    moduleName = pkgMain;
                }
                bundleId = getOwn(bundlesMap, moduleName);
                if (bundleId) {
                    return req.nameToUrl(bundleId, ext, skipExt);
                }
                if (urlRegExp.test(moduleName)) {
                    url = moduleName + (ext || '');
                } else {
                    paths = config.paths;
                    syms = moduleName.split('/');
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            if (Array.isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }
                    url = syms.join('/');
                    url += ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js');
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }
                return config.urlArgs ? url + ((url.indexOf('?') === -1 ? '?' : '&') + config.urlArgs) : url;
            };
            req.toUrl = function (moduleNamePlusExt) {
                var ext, index = moduleNamePlusExt.lastIndexOf('.'), segment = moduleNamePlusExt.split('/')[0], isRelative = segment === '.' || segment === '..';
                if (index !== -1 && (!isRelative || index > 1)) {
                    ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                    moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                }
                return req.nameToUrl(normalize(moduleNamePlusExt, relName), ext, true);
            };
            req.defined = function (id) {
                return hasProp(defined, makeMap(id, relName, true).id);
            };
            req.specified = function (id) {
                id = makeMap(id, relName, true).id;
                return hasProp(defined, id) || hasProp(deferreds, id);
            };
            return req;
        }
        function resolve(name, d, value) {
            if (name) {
                defined[name] = value;
                if (requirejs.onResourceLoad) {
                    requirejs.onResourceLoad(context, d.map, d.deps);
                }
            }
            d.finished = true;
            d.resolve(value);
        }
        function reject(d, err) {
            d.finished = true;
            d.rejected = true;
            d.reject(err);
        }
        function makeNormalize(relName) {
            return function (name) {
                return normalize(name, relName, true);
            };
        }
        function defineModule(d) {
            var name = d.map.id, ret = d.factory.apply(defined[name], d.values);
            if (name) {
                if (ret === undef) {
                    if (d.cjsModule) {
                        ret = d.cjsModule.exports;
                    } else if (d.usingExports) {
                        ret = defined[name];
                    }
                }
            } else {
                requireDeferreds.splice(requireDeferreds.indexOf(d), 1);
            }
            resolve(name, d, ret);
        }
        function depFinished(val, i) {
            if (!this.rejected && !this.depDefined[i]) {
                this.depDefined[i] = true;
                this.depCount += 1;
                this.values[i] = val;
                if (!this.depending && this.depCount === this.depMax) {
                    defineModule(this);
                }
            }
        }
        function makeDefer(name) {
            var d = {};
            d.promise = prim(function (resolve, reject) {
                d.resolve = resolve;
                d.reject = reject;
            });
            d.map = name ? makeMap(name, null, true) : {};
            d.depCount = 0;
            d.depMax = 0;
            d.values = [];
            d.depDefined = [];
            d.depFinished = depFinished;
            if (d.map.pr) {
                d.deps = [makeMap(d.map.pr)];
            }
            return d;
        }
        function getDefer(name) {
            var d;
            if (name) {
                d = hasProp(deferreds, name) && deferreds[name];
                if (!d) {
                    d = deferreds[name] = makeDefer(name);
                }
            } else {
                d = makeDefer();
                requireDeferreds.push(d);
            }
            return d;
        }
        function makeErrback(d, name) {
            return function (err) {
                if (!d.rejected) {
                    if (!err.dynaId) {
                        err.dynaId = 'id' + (errCount += 1);
                        err.requireModules = [name];
                    }
                    reject(d, err);
                }
            };
        }
        function waitForDep(depMap, relName, d, i) {
            d.depMax += 1;
            callDep(depMap, relName).then(function (val) {
                d.depFinished(val, i);
            }, makeErrback(d, depMap.id)).catch(makeErrback(d, d.map.id));
        }
        function makeLoad(id) {
            var fromTextCalled;
            function load(value) {
                if (!fromTextCalled) {
                    resolve(id, getDefer(id), value);
                }
            }
            load.error = function (err) {
                getDefer(id).reject(err);
            };
            load.fromText = function (text, textAlt) {
                var d = getDefer(id), map = makeMap(makeMap(id).n), plainId = map.id;
                fromTextCalled = true;
                d.factory = function (p, val) {
                    return val;
                };
                if (textAlt) {
                    text = textAlt;
                }
                if (hasProp(config.config, id)) {
                    config.config[plainId] = config.config[id];
                }
                try {
                    req.exec(text);
                } catch (e) {
                    reject(d, new Error('fromText eval for ' + plainId + ' failed: ' + e));
                }
                takeQueue(plainId);
                d.deps = [map];
                waitForDep(map, null, d, d.deps.length);
            };
            return load;
        }
        load = typeof importScripts === 'function' ? function (map) {
            var url = map.url;
            if (urlFetched[url]) {
                return;
            }
            urlFetched[url] = true;
            getDefer(map.id);
            importScripts(url);
            takeQueue(map.id);
        } : function (map) {
            var script, id = map.id, url = map.url;
            if (urlFetched[url]) {
                return;
            }
            urlFetched[url] = true;
            script = document.createElement('script');
            script.setAttribute('data-requiremodule', id);
            script.type = config.scriptType || 'text/javascript';
            script.charset = 'utf-8';
            script.async = true;
            loadCount += 1;
            script.addEventListener('load', function () {
                loadCount -= 1;
                takeQueue(id);
            }, false);
            script.addEventListener('error', function () {
                loadCount -= 1;
                var err, pathConfig = getOwn(config.paths, id), d = getOwn(deferreds, id);
                if (pathConfig && Array.isArray(pathConfig) && pathConfig.length > 1) {
                    script.parentNode.removeChild(script);
                    pathConfig.shift();
                    d.map = makeMap(id);
                    load(d.map);
                } else {
                    err = new Error('Load failed: ' + id + ': ' + script.src);
                    err.requireModules = [id];
                    getDefer(id).reject(err);
                }
            }, false);
            script.src = url;
            document.head.appendChild(script);
        };
        function callPlugin(plugin, map, relName) {
            plugin.load(map.n, makeRequire(relName), makeLoad(map.id), {});
        }
        callDep = function (map, relName) {
            var args, bundleId, name = map.id, shim = config.shim[name];
            if (hasProp(waiting, name)) {
                args = waiting[name];
                delete waiting[name];
                main.apply(undef, args);
            } else if (!hasProp(deferreds, name)) {
                if (map.pr) {
                    if (bundleId = getOwn(bundlesMap, name)) {
                        map.url = req.nameToUrl(bundleId);
                        load(map);
                    } else {
                        return callDep(makeMap(map.pr)).then(function (plugin) {
                            var newMap = makeMap(name, relName, true), newId = newMap.id, shim = getOwn(config.shim, newId);
                            if (!hasProp(calledPlugin, newId)) {
                                calledPlugin[newId] = true;
                                if (shim && shim.deps) {
                                    req(shim.deps, function () {
                                        callPlugin(plugin, newMap, relName);
                                    });
                                } else {
                                    callPlugin(plugin, newMap, relName);
                                }
                            }
                            return getDefer(newId).promise;
                        });
                    }
                } else if (shim && shim.deps) {
                    req(shim.deps, function () {
                        load(map);
                    });
                } else {
                    load(map);
                }
            }
            return getDefer(name).promise;
        };
        function splitPrefix(name) {
            var prefix, index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [
                prefix,
                name
            ];
        }
        makeMap = function (name, relName, applyMap) {
            if (typeof name !== 'string') {
                return name;
            }
            var plugin, url, parts, prefix, result, cacheKey = name + ' & ' + (relName || '') + ' & ' + !!applyMap;
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (!prefix && hasProp(mapCache, cacheKey)) {
                return mapCache[cacheKey];
            }
            if (prefix) {
                prefix = normalize(prefix, relName, applyMap);
                plugin = hasProp(defined, prefix) && defined[prefix];
            }
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relName));
                } else {
                    name = normalize(name, relName, applyMap);
                }
            } else {
                name = normalize(name, relName, applyMap);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];
                url = req.nameToUrl(name);
            }
            result = {
                id: prefix ? prefix + '!' + name : name,
                n: name,
                pr: prefix,
                url: url
            };
            if (!prefix) {
                mapCache[cacheKey] = result;
            }
            return result;
        };
        handlers = {
            require: function (name) {
                return makeRequire(name);
            },
            exports: function (name) {
                var e = defined[name];
                if (typeof e !== 'undefined') {
                    return e;
                } else {
                    return defined[name] = {};
                }
            },
            module: function (name) {
                return {
                    id: name,
                    uri: '',
                    exports: handlers.exports(name),
                    config: function () {
                        return getOwn(config.config, name) || {};
                    }
                };
            }
        };
        function breakCycle(d, traced, processed) {
            var id = d.map.id;
            traced[id] = true;
            if (!d.finished && d.deps) {
                d.deps.forEach(function (depMap) {
                    var depId = depMap.id, dep = !hasProp(handlers, depId) && getDefer(depId);
                    if (dep && !dep.finished && !processed[depId]) {
                        if (hasProp(traced, depId)) {
                            d.deps.forEach(function (depMap, i) {
                                if (depMap.id === depId) {
                                    d.depFinished(defined[depId], i);
                                }
                            });
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
            }
            processed[id] = true;
        }
        function check(d) {
            var err, notFinished = [], waitInterval = config.waitSeconds * 1000, expired = waitInterval && startTime + waitInterval < new Date().getTime();
            if (loadCount === 0) {
                if (d) {
                    if (!d.finished) {
                        breakCycle(d, {}, {});
                    }
                } else if (requireDeferreds.length) {
                    requireDeferreds.forEach(function (d) {
                        breakCycle(d, {}, {});
                    });
                }
            }
            if (expired) {
                eachProp(deferreds, function (d) {
                    if (!d.finished) {
                        notFinished.push(d.map.id);
                    }
                });
                err = new Error('Timeout for modules: ' + notFinished);
                err.requireModules = notFinished;
                req.onError(err);
            } else if (loadCount || requireDeferreds.length) {
                if (!checkingLater) {
                    checkingLater = true;
                    prim.nextTick(function () {
                        checkingLater = false;
                        check();
                    });
                }
            }
        }
        function delayedError(e) {
            prim.nextTick(function () {
                if (!e.dynaId || !trackedErrors[e.dynaId]) {
                    trackedErrors[e.dynaId] = true;
                    req.onError(e);
                }
            });
        }
        main = function (name, deps, factory, errback, relName) {
            if (name && hasProp(calledDefine, name)) {
                return;
            }
            calledDefine[name] = true;
            var d = getDefer(name);
            if (deps && !Array.isArray(deps)) {
                factory = deps;
                deps = [];
            }
            d.promise.catch(errback || delayedError);
            relName = relName || name;
            if (typeof factory === 'function') {
                if (!deps.length && factory.length) {
                    factory.toString().replace(commentRegExp, '').replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });
                    deps = (factory.length === 1 ? ['require'] : [
                        'require',
                        'exports',
                        'module'
                    ]).concat(deps);
                }
                d.factory = factory;
                d.deps = deps;
                d.depending = true;
                deps.forEach(function (depName, i) {
                    var depMap;
                    deps[i] = depMap = makeMap(depName, relName, true);
                    depName = depMap.id;
                    if (depName === 'require') {
                        d.values[i] = handlers.require(name);
                    } else if (depName === 'exports') {
                        d.values[i] = handlers.exports(name);
                        d.usingExports = true;
                    } else if (depName === 'module') {
                        d.values[i] = d.cjsModule = handlers.module(name);
                    } else if (depName === undefined) {
                        d.values[i] = undefined;
                    } else {
                        waitForDep(depMap, relName, d, i);
                    }
                });
                d.depending = false;
                if (d.depCount === d.depMax) {
                    defineModule(d);
                }
            } else if (name) {
                resolve(name, d, factory);
            }
            startTime = new Date().getTime();
            if (!name) {
                check(d);
            }
        };
        req = makeRequire(null, true);
        req.config = function (cfg) {
            if (cfg.context && cfg.context !== contextName) {
                return newContext(cfg.context).config(cfg);
            }
            mapCache = {};
            if (cfg.baseUrl) {
                if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                    cfg.baseUrl += '/';
                }
            }
            var primId, shim = config.shim, objs = {
                    paths: true,
                    bundles: true,
                    config: true,
                    map: true
                };
            eachProp(cfg, function (value, prop) {
                if (objs[prop]) {
                    if (!config[prop]) {
                        config[prop] = {};
                    }
                    mixin(config[prop], value, true, true);
                } else {
                    config[prop] = value;
                }
            });
            if (cfg.bundles) {
                eachProp(cfg.bundles, function (value, prop) {
                    value.forEach(function (v) {
                        if (v !== prop) {
                            bundlesMap[v] = prop;
                        }
                    });
                });
            }
            if (cfg.shim) {
                eachProp(cfg.shim, function (value, id) {
                    if (Array.isArray(value)) {
                        value = { deps: value };
                    }
                    if ((value.exports || value.init) && !value.exportsFn) {
                        value.exportsFn = makeShimExports(value);
                    }
                    shim[id] = value;
                });
                config.shim = shim;
            }
            if (cfg.packages) {
                cfg.packages.forEach(function (pkgObj) {
                    var location, name;
                    pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                    name = pkgObj.name;
                    location = pkgObj.location;
                    if (location) {
                        config.paths[name] = pkgObj.location;
                    }
                    config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main').replace(currDirRegExp, '').replace(jsSuffixRegExp, '');
                });
            }
            primId = config.definePrim;
            if (primId) {
                waiting[primId] = [
                    primId,
                    [],
                    function () {
                        return prim;
                    }
                ];
            }
            if (cfg.deps || cfg.callback) {
                req(cfg.deps, cfg.callback);
            }
            return req;
        };
        req.onError = function (err) {
            throw err;
        };
        context = {
            id: contextName,
            defined: defined,
            waiting: waiting,
            config: config,
            deferreds: deferreds
        };
        contexts[contextName] = context;
        return req;
    }
    requirejs = topReq = newContext('_');
    if (typeof require !== 'function') {
        require = topReq;
    }
    topReq.exec = function (text) {
        return eval(text);
    };
    topReq.contexts = contexts;
    define = function () {
        queue.push([].slice.call(arguments, 0));
    };
    define.amd = { jQuery: true };
    if (bootstrapConfig) {
        topReq.config(bootstrapConfig);
    }
    if (topReq.isBrowser && !contexts._.config.skipDataMain) {
        dataMain = document.querySelectorAll('script[data-main]')[0];
        dataMain = dataMain && dataMain.getAttribute('data-main');
        if (dataMain) {
            dataMain = dataMain.replace(jsSuffixRegExp, '');
            if (!bootstrapConfig || !bootstrapConfig.baseUrl) {
                src = dataMain.split('/');
                dataMain = src.pop();
                subPath = src.length ? src.join('/') + '/' : './';
                topReq.config({ baseUrl: subPath });
            }
            topReq([dataMain]);
        }
    }
}(this));
define('alameda', function () {
});
var window = self;
function consoleHelper() {
    var msg = arguments[0] + ':';
    for (var i = 1; i < arguments.length; i++) {
        msg += ' ' + arguments[i];
    }
    msg += '\x1B[0m\n';
    dump(msg);
}
window.console = {
    log: consoleHelper.bind(null, '\x1B[32mWLOG'),
    error: consoleHelper.bind(null, '\x1B[31mWERR'),
    info: consoleHelper.bind(null, '\x1B[36mWINF'),
    warn: consoleHelper.bind(null, '\x1B[33mWWAR')
};
require(['worker-setup']);
define('worker-bootstrap', function () {
});
(function (root) {
    'use strict';
    requirejs.config({
        baseUrl: '.',
        packages: [{
                name: 'wo-imap-handler',
                location: 'ext/imap-handler/src',
                main: 'imap-handler'
            }],
        map: {
            'browserbox': { 'axe': 'axeshim-browserbox' },
            'browserbox-imap': { 'axe': 'axeshim-browserbox' },
            'ext/smtpclient': { 'axe': 'axeshim-smtpclient' }
        },
        paths: {
            'bleach': 'ext/bleach.js/lib/bleach',
            'imap-formal-syntax': 'ext/imap-handler/src/imap-formal-syntax',
            'smtpclient-response-parser': 'ext/smtpclient/src/smtpclient-response-parser',
            'tests': '../test/unit',
            'wbxml': 'ext/activesync-lib/wbxml/wbxml',
            'activesync/codepages': 'ext/activesync-lib/codepages',
            'activesync/protocol': 'ext/activesync-lib/protocol',
            'activesync-lib': 'ext/activesync-lib',
            'addressparser': 'ext/addressparser',
            'alameda': 'ext/alameda',
            'axe': 'ext/axe',
            'axe-logger': 'ext/axe-logger',
            'axeshim-browserbox': 'ext/axeshim-browserbox',
            'axeshim-smtpclient': 'ext/axeshim-smtpclient',
            'bleach.js': 'ext/bleach.js',
            'browserbox': 'ext/browserbox',
            'browserbox-imap': 'ext/browserbox-imap',
            'co': 'ext/co',
            'equal': 'ext/equal',
            'evt': 'ext/evt',
            'imap-handler': 'ext/imap-handler',
            'mailbuild': 'ext/mailbuild',
            'md5': 'ext/md5',
            'mimefuncs': 'ext/mimefuncs',
            'mimeparser': 'ext/mimeparser',
            'mimeparser-tzabbr': 'ext/mimeparser-tzabbr',
            'mimetypes': 'ext/mimetypes',
            'mix': 'ext/mix',
            'punycode': 'ext/punycode',
            'safe-base64': 'ext/safe-base64',
            'smtpclient': 'ext/smtpclient',
            'stringencoding': 'ext/stringencoding',
            'tcp-socket': 'ext/tcp-socket',
            'utf7': 'ext/utf7',
            'wo-utf7': 'ext/wo-utf7'
        },
        waitSeconds: 0
    });
    if (typeof gelamWorkerBaseUrl === 'string') {
        requirejs.config({ baseUrl: gelamWorkerBaseUrl });
    }
    root.setZeroTimeout = function (fn) {
        setTimeout(function () {
            fn();
        }, 0);
    };
}(this));
define('worker-config', function () {
});
define('worker-router', [], function () {
    var listeners = {};
    function receiveMessage(evt) {
        var data = evt.data;
        var listener = listeners[data.type];
        if (listener)
            listener(data);
    }
    window.addEventListener('message', receiveMessage);
    function unregister(type) {
        delete listeners[type];
    }
    function registerSimple(type, callback) {
        listeners[type] = callback;
        return function sendSimpleMessage(cmd, args) {
            window.postMessage({
                type: type,
                uid: null,
                cmd: cmd,
                args: args
            });
        };
    }
    var callbackSenders = {};
    function registerCallbackType(type) {
        if (callbackSenders.hasOwnProperty(type))
            return callbackSenders[type];
        listeners[type] = function receiveCallbackMessage(data) {
            var callback = callbacks[data.uid];
            if (!callback)
                return;
            delete callbacks[data.uid];
            callback.apply(callback, data.args);
        };
        var callbacks = {};
        var uid = 0;
        var sender = function sendCallbackMessage(cmd, args, callback) {
            if (callback) {
                callbacks[uid] = callback;
            }
            window.postMessage({
                type: type,
                uid: uid++,
                cmd: cmd,
                args: args
            });
        };
        callbackSenders[type] = sender;
        return sender;
    }
    function registerInstanceType(type) {
        var uid = 0;
        var instanceMap = {};
        listeners[type] = function receiveInstanceMessage(data) {
            var instanceListener = instanceMap[data.uid];
            if (!instanceListener)
                return;
            instanceListener(data);
        };
        return {
            register: function (instanceListener) {
                var thisUid = uid++;
                instanceMap[thisUid] = instanceListener;
                return {
                    sendMessage: function sendInstanceMessage(cmd, args, transferArgs) {
                        window.postMessage({
                            type: type,
                            uid: thisUid,
                            cmd: cmd,
                            args: args
                        }, transferArgs);
                    },
                    unregister: function unregisterInstance() {
                        delete instanceMap[thisUid];
                    }
                };
            }
        };
    }
    function shutdown() {
        window.removeEventListener('message', receiveMessage);
        listeners = {};
        callbackSenders = {};
    }
    return {
        registerSimple: registerSimple,
        registerCallbackType: registerCallbackType,
        registerInstanceType: registerInstanceType,
        unregister: unregister,
        shutdown: shutdown
    };
});
;
define('evt', [], function () {
    var evt, slice = Array.prototype.slice, props = [
            '_events',
            '_pendingEvents',
            'on',
            'once',
            'latest',
            'latestOnce',
            'removeListener',
            'emitWhenListener',
            'emit'
        ];
    function Emitter() {
        this._events = {};
        this._pendingEvents = {};
    }
    Emitter.prototype = {
        on: function (id, fn) {
            var listeners = this._events[id], pending = this._pendingEvents[id];
            if (!listeners) {
                listeners = this._events[id] = [];
            }
            listeners.push(fn);
            if (pending) {
                pending.forEach(function (args) {
                    fn.apply(null, args);
                });
                delete this._pendingEvents[id];
            }
            return this;
        },
        once: function (id, fn) {
            var self = this, fired = false;
            function one() {
                if (fired)
                    return;
                fired = true;
                fn.apply(null, arguments);
                setTimeout(function () {
                    self.removeListener(id, one);
                });
            }
            return this.on(id, one);
        },
        latest: function (id, fn) {
            if (this[id] && !this._pendingEvents[id]) {
                fn(this[id]);
            }
            this.on(id, fn);
        },
        latestOnce: function (id, fn) {
            if (this[id] && !this._pendingEvents[id])
                fn(this[id]);
            else
                this.once(id, fn);
        },
        removeListener: function (id, fn) {
            var i, listeners = this._events[id];
            if (listeners) {
                i = listeners.indexOf(fn);
                if (i !== -1) {
                    listeners.splice(i, 1);
                }
                if (listeners.length === 0)
                    delete this._events[id];
            }
        },
        emitWhenListener: function (id) {
            var listeners = this._events[id];
            if (listeners) {
                this.emit.apply(this, arguments);
            } else {
                if (!this._pendingEvents[id])
                    this._pendingEvents[id] = [];
                this._pendingEvents[id].push(slice.call(arguments, 1));
            }
        },
        emit: function (id) {
            var args = slice.call(arguments, 1), listeners = this._events[id];
            if (listeners) {
                listeners.forEach(function (fn) {
                    try {
                        fn.apply(null, args);
                    } catch (e) {
                        setTimeout(function () {
                            throw e;
                        });
                    }
                });
            }
        }
    };
    evt = new Emitter();
    evt.Emitter = Emitter;
    evt.mix = function (obj) {
        var e = new Emitter();
        props.forEach(function (prop) {
            if (obj.hasOwnProperty(prop)) {
                throw new Error('Object already has a property "' + prop + '"');
            }
            obj[prop] = e[prop];
        });
        return obj;
    };
    return evt;
});
define('ext/equal', ['require'], function (require) {
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
define('logic', [
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
define('util', ['exports'], function (exports) {
    var cmpHeaderYoungToOld = exports.cmpHeaderYoungToOld = function cmpHeaderYoungToOld(a, b) {
        var delta = b.date - a.date;
        if (delta)
            return delta;
        return b.id - a.id;
    };
    var bsearchForInsert = exports.bsearchForInsert = function bsearchForInsert(list, seekVal, cmpfunc) {
        if (!list.length)
            return 0;
        var low = 0, high = list.length - 1, mid, cmpval;
        while (low <= high) {
            mid = low + Math.floor((high - low) / 2);
            cmpval = cmpfunc(seekVal, list[mid]);
            if (cmpval < 0)
                high = mid - 1;
            else if (cmpval > 0)
                low = mid + 1;
            else
                break;
        }
        if (cmpval < 0)
            return mid;
        else if (cmpval > 0)
            return mid + 1;
        else
            return mid;
    };
    var bsearchMaybeExists = exports.bsearchMaybeExists = function bsearchMaybeExists(list, seekVal, cmpfunc, aLow, aHigh) {
        var low = aLow === undefined ? 0 : aLow, high = aHigh === undefined ? list.length - 1 : aHigh, mid, cmpval;
        while (low <= high) {
            mid = low + Math.floor((high - low) / 2);
            cmpval = cmpfunc(seekVal, list[mid]);
            if (cmpval < 0)
                high = mid - 1;
            else if (cmpval > 0)
                low = mid + 1;
            else
                return mid;
        }
        return null;
    };
    exports.partitionMessagesByFolderId = function partitionMessagesByFolderId(messageNamers) {
        var results = [], foldersToMsgs = {};
        for (var i = 0; i < messageNamers.length; i++) {
            var messageNamer = messageNamers[i], messageSuid = messageNamer.suid, idxLastSlash = messageSuid.lastIndexOf('/'), folderId = messageSuid.substring(0, idxLastSlash);
            if (!foldersToMsgs.hasOwnProperty(folderId)) {
                var messages = [messageNamer];
                results.push({
                    folderId: folderId,
                    messages: messages
                });
                foldersToMsgs[folderId] = messages;
            } else {
                foldersToMsgs[folderId].push(messageNamer);
            }
        }
        return results;
    };
    exports.formatAddresses = function (nameAddrPairs) {
        var addrstrings = [];
        for (var i = 0; i < nameAddrPairs.length; i++) {
            var pair = nameAddrPairs[i];
            if (typeof pair === 'string') {
                addrstrings.push(pair);
            } else if (!pair.name) {
                addrstrings.push(pair.address);
            } else {
                addrstrings.push('"' + pair.name.replace(/["']/g, '') + '" <' + pair.address + '>');
            }
        }
        return addrstrings.join(', ');
    };
});
;
define('mailchew-strings', [
    'exports',
    'evt'
], function (exports, evt) {
    exports.events = new evt.Emitter();
    exports.set = function set(strings) {
        exports.strings = strings;
        exports.events.emit('strings', strings);
    };
});
define('date', [
    'module',
    'exports'
], function ($module, exports) {
    var BEFORE = exports.BEFORE = function BEFORE(testDate, comparisonDate) {
        return testDate < comparisonDate;
    };
    var ON_OR_BEFORE = exports.ON_OR_BEFORE = function ON_OR_BEFORE(testDate, comparisonDate) {
        return testDate <= comparisonDate;
    };
    var SINCE = exports.SINCE = function SINCE(testDate, comparisonDate) {
        return testDate >= comparisonDate;
    };
    var STRICTLY_AFTER = exports.STRICTLY_AFTER = function STRICTLY_AFTER(testDate, comparisonDate) {
        return testDate > comparisonDate;
    };
    var IN_BS_DATE_RANGE = exports.IN_BS_DATE_RANGE = function IN_BS_DATE_RANGE(testDate, startTS, endTS) {
        return testDate >= startTS && testDate < endTS;
    };
    var PASTWARDS = 1, FUTUREWARDS = -1;
    var TIME_DIR_AT_OR_BEYOND = exports.TIME_DIR_AT_OR_BEYOND = function TIME_DIR_AT_OR_BEYOND(dir, testDate, comparisonDate) {
        if (dir === PASTWARDS)
            return testDate <= comparisonDate;
        else if (comparisonDate === null)
            return testDate >= NOW();
        else
            return testDate >= comparisonDate;
    };
    var TIME_DIR_DELTA = exports.TIME_DIR_DELTA = function TIME_DIR_DELTA(dir, testDate, comparisonDate) {
        if (dir === PASTWARDS)
            return testDate - comparisonDate;
        else
            return comparisonDate - testDate;
    };
    var TIME_DIR_ADD = exports.TIME_DIR_ADD = function TIME_DIR_ADD(dir, baseDate, time) {
        if (dir === PASTWARDS)
            return baseDate + time;
        else
            return baseDate - time;
    };
    var HOUR_MILLIS = exports.HOUR_MILLIS = 60 * 60 * 1000;
    var DAY_MILLIS = exports.DAY_MILLIS = 24 * 60 * 60 * 1000;
    var TIME_WARPED_NOW = null;
    exports.TEST_LetsDoTheTimewarpAgain = function (fakeNow) {
        if (fakeNow === null) {
            TIME_WARPED_NOW = null;
            return;
        }
        if (typeof fakeNow !== 'number')
            fakeNow = fakeNow.valueOf();
        TIME_WARPED_NOW = fakeNow;
    };
    var NOW = exports.NOW = function NOW() {
        return TIME_WARPED_NOW || Date.now();
    };
    var perfObj = typeof performance !== 'undefined' ? performance : Date;
    exports.PERFNOW = function PERFNOW() {
        return TIME_WARPED_NOW || perfObj.now();
    };
    var makeDaysAgo = exports.makeDaysAgo = function makeDaysAgo(numDays) {
        var past = quantizeDate(TIME_WARPED_NOW || Date.now()) - numDays * DAY_MILLIS;
        return past;
    };
    var makeDaysBefore = exports.makeDaysBefore = function makeDaysBefore(date, numDaysBefore) {
        if (date === null)
            return makeDaysAgo(numDaysBefore - 1);
        return quantizeDate(date) - numDaysBefore * DAY_MILLIS;
    };
    var quantizeDate = exports.quantizeDate = function quantizeDate(date) {
        if (date === null)
            return null;
        if (typeof date === 'number')
            date = new Date(date);
        return date.setUTCHours(0, 0, 0, 0).valueOf();
    };
    var quantizeDateUp = exports.quantizeDateUp = function quantizeDateUp(date) {
        if (typeof date === 'number')
            date = new Date(date);
        var truncated = date.setUTCHours(0, 0, 0, 0).valueOf();
        if (date.valueOf() === truncated)
            return truncated;
        return truncated + DAY_MILLIS;
    };
});
;
define('slice_bridge_proxy', ['exports'], function (exports) {
    function SliceBridgeProxy(bridge, ns, handle) {
        this._bridge = bridge;
        this._ns = ns;
        this._handle = handle;
        this.__listener = null;
        this.status = 'synced';
        this.progress = 0;
        this.atTop = false;
        this.atBottom = false;
        this.headerCount = 0;
        this.userCanGrowUpwards = false;
        this.userCanGrowDownwards = false;
        this.pendingUpdates = [];
        this.scheduledUpdate = false;
    }
    exports.SliceBridgeProxy = SliceBridgeProxy;
    SliceBridgeProxy.prototype = {
        sendSplice: function sbp_sendSplice(index, howMany, addItems, requested, moreExpected, newEmailCount) {
            var updateSplice = {
                index: index,
                howMany: howMany,
                addItems: addItems,
                requested: requested,
                moreExpected: moreExpected,
                newEmailCount: newEmailCount,
                headerCount: this.headerCount,
                type: 'slice'
            };
            this.addUpdate(updateSplice);
        },
        sendUpdate: function sbp_sendUpdate(indexUpdatesRun) {
            var update = {
                updates: indexUpdatesRun,
                type: 'update'
            };
            this.addUpdate(update);
        },
        sendStatus: function sbp_sendStatus(status, requested, moreExpected, progress, newEmailCount) {
            this.status = status;
            if (progress != null) {
                this.progress = progress;
            }
            this.sendSplice(0, 0, [], requested, moreExpected, newEmailCount);
        },
        sendSyncProgress: function (progress) {
            this.progress = progress;
            this.sendSplice(0, 0, [], true, true);
        },
        addUpdate: function sbp_addUpdate(update) {
            this.pendingUpdates.push(update);
            if (this.pendingUpdates.length > 5) {
                this.flushUpdates();
            } else if (!this.scheduledUpdate) {
                window.setZeroTimeout(this.flushUpdates.bind(this));
                this.scheduledUpdate = true;
            }
        },
        flushUpdates: function sbp_flushUpdates() {
            this._bridge.__sendMessage({
                type: 'batchSlice',
                handle: this._handle,
                status: this.status,
                progress: this.progress,
                atTop: this.atTop,
                atBottom: this.atBottom,
                userCanGrowUpwards: this.userCanGrowUpwards,
                userCanGrowDownwards: this.userCanGrowDownwards,
                sliceUpdates: this.pendingUpdates
            });
            this.pendingUpdates = [];
            this.scheduledUpdate = false;
        },
        die: function sbp_die() {
            if (this.__listener)
                this.__listener.die();
        }
    };
});
define('mailbridge', [
    'logic',
    './util',
    './mailchew-strings',
    './date',
    './slice_bridge_proxy',
    'require',
    'module',
    'exports'
], function (logic, $imaputil, $mailchewStrings, $date, $sliceBridgeProxy, require, $module, exports) {
    var bsearchForInsert = $imaputil.bsearchForInsert, bsearchMaybeExists = $imaputil.bsearchMaybeExists, SliceBridgeProxy = $sliceBridgeProxy.SliceBridgeProxy;
    function toBridgeWireOn(x) {
        return x.toBridgeWire();
    }
    var FOLDER_TYPE_TO_SORT_PRIORITY = {
        account: 'a',
        inbox: 'c',
        starred: 'e',
        important: 'f',
        drafts: 'g',
        localdrafts: 'h',
        outbox: 'i',
        queue: 'j',
        sent: 'k',
        junk: 'l',
        trash: 'n',
        archive: 'p',
        normal: 'z',
        nomail: 'z'
    };
    function makeFolderSortString(account, folder) {
        if (!folder)
            return account.id;
        var parentFolder = account.getFolderMetaForFolderId(folder.parentId);
        return makeFolderSortString(account, parentFolder) + '!' + FOLDER_TYPE_TO_SORT_PRIORITY[folder.type] + '!' + folder.name.toLocaleLowerCase();
    }
    function strcmp(a, b) {
        if (a < b)
            return -1;
        else if (a > b)
            return 1;
        return 0;
    }
    function checkIfAddressListContainsAddress(list, addrPair) {
        if (!list)
            return false;
        var checkAddress = addrPair.address;
        for (var i = 0; i < list.length; i++) {
            if (list[i].address === checkAddress)
                return true;
        }
        return false;
    }
    function MailBridge(universe, name) {
        this.universe = universe;
        this.universe.registerBridge(this);
        logic.defineScope(this, 'MailBridge', { name: name });
        this._slices = {};
        this._slicesByType = {
            accounts: [],
            identities: [],
            folders: [],
            headers: [],
            matchedHeaders: []
        };
        this._observedBodies = {};
        this._pendingRequests = {};
        this._lastUndoableOpPair = null;
    }
    exports.MailBridge = MailBridge;
    MailBridge.prototype = {
        __sendMessage: function (msg) {
            throw new Error('This is supposed to get hidden by an instance var.');
        },
        __receiveMessage: function mb___receiveMessage(msg) {
            var implCmdName = '_cmd_' + msg.type;
            if (!(implCmdName in this)) {
                logic(this, 'badMessageType', { type: msg.type });
                return;
            }
            logic(this, 'cmd', {
                type: msg.type,
                msg: msg
            });
            try {
                this[implCmdName](msg);
            } catch (ex) {
                logic.fail(ex);
                return;
            }
        },
        _cmd_ping: function mb__cmd_ping(msg) {
            this.__sendMessage({
                type: 'pong',
                handle: msg.handle
            });
        },
        _cmd_modifyConfig: function mb__cmd_modifyConfig(msg) {
            this.universe.modifyConfig(msg.mods);
        },
        bodyHasObservers: function (suid) {
            return !!this._observedBodies[suid];
        },
        notifyConfig: function (config) {
            this.__sendMessage({
                type: 'config',
                config: config
            });
        },
        _cmd_debugSupport: function mb__cmd_debugSupport(msg) {
            switch (msg.cmd) {
            case 'setLogging':
                this.universe.modifyConfig({ debugLogging: msg.arg });
                break;
            case 'dumpLog':
                switch (msg.arg) {
                case 'storage':
                    this.universe.dumpLogToDeviceStorage();
                    break;
                }
                break;
            }
        },
        _cmd_setInteractive: function mb__cmd_setInteractive(msg) {
            this.universe.setInteractive();
        },
        _cmd_localizedStrings: function mb__cmd_localizedStrings(msg) {
            $mailchewStrings.set(msg.strings);
        },
        _cmd_learnAboutAccount: function (msg) {
            this.universe.learnAboutAccount(msg.details).then(function success(info) {
                this.__sendMessage({
                    type: 'learnAboutAccountResults',
                    handle: msg.handle,
                    data: info
                });
            }.bind(this), function errback(err) {
                this.__sendMessage({
                    type: 'learnAboutAccountResults',
                    handle: msg.handle,
                    data: {
                        result: 'no-config-info',
                        configInfo: null
                    }
                });
            }.bind(this));
        },
        _cmd_tryToCreateAccount: function mb__cmd_tryToCreateAccount(msg) {
            var self = this;
            this.universe.tryToCreateAccount(msg.details, msg.domainInfo, function (error, account, errorDetails) {
                self.__sendMessage({
                    type: 'tryToCreateAccountResults',
                    handle: msg.handle,
                    account: account ? account.toBridgeWire() : null,
                    error: error,
                    errorDetails: errorDetails
                });
            });
        },
        _cmd_clearAccountProblems: function mb__cmd_clearAccountProblems(msg) {
            var account = this.universe.getAccountForAccountId(msg.accountId), self = this;
            account.checkAccount(function (incomingErr, outgoingErr) {
                function canIgnoreError(err) {
                    return !err || err !== 'bad-user-or-pass' && err !== 'bad-address' && err !== 'needs-oauth-reauth' && err !== 'imap-disabled';
                }
                if (canIgnoreError(incomingErr) && canIgnoreError(outgoingErr)) {
                    self.universe.clearAccountProblems(account);
                }
                self.__sendMessage({
                    type: 'clearAccountProblems',
                    handle: msg.handle
                });
            });
        },
        _cmd_modifyAccount: function mb__cmd_modifyAccount(msg) {
            var account = this.universe.getAccountForAccountId(msg.accountId), accountDef = account.accountDef;
            for (var key in msg.mods) {
                var val = msg.mods[key];
                switch (key) {
                case 'name':
                    accountDef.name = val;
                    break;
                case 'username':
                    if (accountDef.credentials.outgoingUsername === accountDef.credentials.username) {
                        accountDef.credentials.outgoingUsername = val;
                    }
                    accountDef.credentials.username = val;
                    break;
                case 'incomingUsername':
                    accountDef.credentials.username = val;
                    break;
                case 'outgoingUsername':
                    accountDef.credentials.outgoingUsername = val;
                    break;
                case 'password':
                    if (accountDef.credentials.outgoingPassword === accountDef.credentials.password) {
                        accountDef.credentials.outgoingPassword = val;
                    }
                    accountDef.credentials.password = val;
                    break;
                case 'incomingPassword':
                    accountDef.credentials.password = val;
                    break;
                case 'outgoingPassword':
                    accountDef.credentials.outgoingPassword = val;
                    break;
                case 'oauthTokens':
                    var oauth2 = accountDef.credentials.oauth2;
                    oauth2.accessToken = val.accessToken;
                    oauth2.refreshToken = val.refreshToken;
                    oauth2.expireTimeMS = val.expireTimeMS;
                    break;
                case 'identities':
                    break;
                case 'servers':
                    break;
                case 'syncRange':
                    accountDef.syncRange = val;
                    break;
                case 'syncInterval':
                    accountDef.syncInterval = val;
                    break;
                case 'notifyOnNew':
                    accountDef.notifyOnNew = val;
                    break;
                case 'playSoundOnSend':
                    accountDef.playSoundOnSend = val;
                    break;
                case 'setAsDefault':
                    if (val)
                        accountDef.defaultPriority = $date.NOW();
                    break;
                default:
                    throw new Error('Invalid key for modifyAccount: "' + key + '"');
                }
            }
            this.universe.saveAccountDef(accountDef, null);
            this.__sendMessage({
                type: 'modifyAccount',
                handle: msg.handle
            });
        },
        _cmd_deleteAccount: function mb__cmd_deleteAccount(msg) {
            this.universe.deleteAccount(msg.accountId);
        },
        _cmd_modifyIdentity: function mb__cmd_modifyIdentity(msg) {
            var account = this.universe.getAccountForSenderIdentityId(msg.identityId), accountDef = account.accountDef, identity = this.universe.getIdentityForSenderIdentityId(msg.identityId);
            for (var key in msg.mods) {
                var val = msg.mods[key];
                switch (key) {
                case 'name':
                    identity.name = val;
                    break;
                case 'address':
                    identity.address = val;
                    break;
                case 'replyTo':
                    identity.replyTo = val;
                    break;
                case 'signature':
                    identity.signature = val;
                    break;
                case 'signatureEnabled':
                    identity.signatureEnabled = val;
                    break;
                default:
                    throw new Error('Invalid key for modifyIdentity: "' + key + '"');
                }
            }
            this.universe.saveAccountDef(accountDef, null, function () {
                this.__sendMessage({
                    type: 'modifyIdentity',
                    handle: msg.handle
                });
            }.bind(this));
        },
        notifyBadLogin: function mb_notifyBadLogin(account, problem, whichSide) {
            this.__sendMessage({
                type: 'badLogin',
                account: account.toBridgeWire(),
                problem: problem,
                whichSide: whichSide
            });
        },
        _cmd_viewAccounts: function mb__cmd_viewAccounts(msg) {
            var proxy = this._slices[msg.handle] = new SliceBridgeProxy(this, 'accounts', msg.handle);
            proxy.markers = this.universe.accounts.map(function (x) {
                return x.id;
            });
            this._slicesByType['accounts'].push(proxy);
            var wireReps = this.universe.accounts.map(toBridgeWireOn);
            proxy.sendSplice(0, 0, wireReps, true, false);
        },
        notifyAccountAdded: function mb_notifyAccountAdded(account) {
            var accountWireRep = account.toBridgeWire();
            var i, proxy, slices, wireSplice = null, markersSplice = null;
            slices = this._slicesByType['accounts'];
            for (i = 0; i < slices.length; i++) {
                proxy = slices[i];
                proxy.sendSplice(proxy.markers.length, 0, [accountWireRep], false, false);
                proxy.markers.push(account.id);
            }
            accountWireRep = account.toBridgeFolder();
            slices = this._slicesByType['folders'];
            var startMarker = makeFolderSortString(account, accountWireRep), idxStart;
            for (i = 0; i < slices.length; i++) {
                proxy = slices[i];
                if (proxy.mode === 'account')
                    continue;
                idxStart = bsearchForInsert(proxy.markers, startMarker, strcmp);
                wireSplice = [accountWireRep];
                markersSplice = [startMarker];
                for (var iFolder = 0; iFolder < account.folders.length; iFolder++) {
                    var folder = account.folders[iFolder], folderMarker = makeFolderSortString(account, folder), idxFolder = bsearchForInsert(markersSplice, folderMarker, strcmp);
                    wireSplice.splice(idxFolder, 0, folder);
                    markersSplice.splice(idxFolder, 0, folderMarker);
                }
                proxy.sendSplice(idxStart, 0, wireSplice, false, false);
                proxy.markers.splice.apply(proxy.markers, [
                    idxStart,
                    0
                ].concat(markersSplice));
            }
        },
        notifyAccountModified: function (account) {
            var slices = this._slicesByType['accounts'], accountWireRep = account.toBridgeWire();
            for (var i = 0; i < slices.length; i++) {
                var proxy = slices[i];
                var idx = proxy.markers.indexOf(account.id);
                if (idx !== -1) {
                    proxy.sendUpdate([
                        idx,
                        accountWireRep
                    ]);
                }
            }
        },
        notifyAccountRemoved: function (accountId) {
            var i, proxy, slices;
            slices = this._slicesByType['accounts'];
            for (i = 0; i < slices.length; i++) {
                proxy = slices[i];
                var idx = proxy.markers.indexOf(accountId);
                if (idx !== -1) {
                    proxy.sendSplice(idx, 1, [], false, false);
                    proxy.markers.splice(idx, 1);
                }
            }
            slices = this._slicesByType['folders'];
            var startMarker = accountId + '!!', endMarker = accountId + '!|';
            for (i = 0; i < slices.length; i++) {
                proxy = slices[i];
                var idxStart = bsearchForInsert(proxy.markers, startMarker, strcmp), idxEnd = bsearchForInsert(proxy.markers, endMarker, strcmp);
                if (idxEnd !== idxStart) {
                    proxy.sendSplice(idxStart, idxEnd - idxStart, [], false, false);
                    proxy.markers.splice(idxStart, idxEnd - idxStart);
                }
            }
        },
        _cmd_viewSenderIdentities: function mb__cmd_viewSenderIdentities(msg) {
            var proxy = this._slices[msg.handle] = new SliceBridgeProxy(this, 'identities', msg.handle);
            this._slicesByType['identities'].push(proxy);
            var wireReps = this.universe.identities;
            proxy.sendSplice(0, 0, wireReps, true, false);
        },
        _cmd_requestBodies: function (msg) {
            var self = this;
            this.universe.downloadBodies(msg.messages, msg.options, function () {
                self.__sendMessage({
                    type: 'requestBodiesComplete',
                    handle: msg.handle,
                    requestId: msg.requestId
                });
            });
        },
        notifyFolderAdded: function (account, folderMeta) {
            var newMarker = makeFolderSortString(account, folderMeta);
            var slices = this._slicesByType['folders'];
            for (var i = 0; i < slices.length; i++) {
                var proxy = slices[i];
                var idx = bsearchForInsert(proxy.markers, newMarker, strcmp);
                proxy.sendSplice(idx, 0, [folderMeta], false, false);
                proxy.markers.splice(idx, 0, newMarker);
            }
        },
        notifyFolderModified: function (account, folderMeta) {
            var marker = makeFolderSortString(account, folderMeta);
            var slices = this._slicesByType['folders'];
            for (var i = 0; i < slices.length; i++) {
                var proxy = slices[i];
                var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
                if (idx === null)
                    continue;
                proxy.sendUpdate([
                    idx,
                    folderMeta
                ]);
            }
        },
        notifyFolderRemoved: function (account, folderMeta) {
            var marker = makeFolderSortString(account, folderMeta);
            var slices = this._slicesByType['folders'];
            for (var i = 0; i < slices.length; i++) {
                var proxy = slices[i];
                var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
                if (idx === null)
                    continue;
                proxy.sendSplice(idx, 1, [], false, false);
                proxy.markers.splice(idx, 1);
            }
        },
        notifyBodyModified: function (suid, detail, body) {
            var handles = this._observedBodies[suid];
            var defaultHandler = this.__sendMessage;
            if (handles) {
                for (var handle in handles) {
                    var emit = handles[handle] || defaultHandler;
                    emit.call(this, {
                        type: 'bodyModified',
                        handle: handle,
                        bodyInfo: body,
                        detail: detail
                    });
                }
            }
        },
        _cmd_viewFolders: function mb__cmd_viewFolders(msg) {
            var proxy = this._slices[msg.handle] = new SliceBridgeProxy(this, 'folders', msg.handle);
            this._slicesByType['folders'].push(proxy);
            proxy.mode = msg.mode;
            proxy.argument = msg.argument;
            var markers = proxy.markers = [];
            var wireReps = [];
            function pushAccountFolders(acct) {
                for (var iFolder = 0; iFolder < acct.folders.length; iFolder++) {
                    var folder = acct.folders[iFolder];
                    var newMarker = makeFolderSortString(acct, folder);
                    var idx = bsearchForInsert(markers, newMarker, strcmp);
                    wireReps.splice(idx, 0, folder);
                    markers.splice(idx, 0, newMarker);
                }
            }
            if (msg.mode === 'account') {
                pushAccountFolders(this.universe.getAccountForAccountId(msg.argument));
            } else {
                var accounts = this.universe.accounts.concat();
                accounts.sort(function (a, b) {
                    return a.id.localeCompare(b.id);
                });
                for (var iAcct = 0; iAcct < accounts.length; iAcct++) {
                    var acct = accounts[iAcct], acctBridgeRep = acct.toBridgeFolder(), acctMarker = makeFolderSortString(acct, acctBridgeRep), idxAcct = bsearchForInsert(markers, acctMarker, strcmp);
                    wireReps.splice(idxAcct, 0, acctBridgeRep);
                    markers.splice(idxAcct, 0, acctMarker);
                    pushAccountFolders(acct);
                }
            }
            proxy.sendSplice(0, 0, wireReps, true, false);
        },
        _cmd_viewFolderMessages: function mb__cmd_viewFolderMessages(msg) {
            var proxy = this._slices[msg.handle] = new SliceBridgeProxy(this, 'headers', msg.handle);
            this._slicesByType['headers'].push(proxy);
            var account = this.universe.getAccountForFolderId(msg.folderId);
            account.sliceFolderMessages(msg.folderId, proxy);
        },
        _cmd_searchFolderMessages: function mb__cmd_searchFolderMessages(msg) {
            var proxy = this._slices[msg.handle] = new SliceBridgeProxy(this, 'matchedHeaders', msg.handle);
            this._slicesByType['matchedHeaders'].push(proxy);
            var account = this.universe.getAccountForFolderId(msg.folderId);
            account.searchFolderMessages(msg.folderId, proxy, msg.phrase, msg.whatToSearch);
        },
        _cmd_refreshHeaders: function mb__cmd_refreshHeaders(msg) {
            var proxy = this._slices[msg.handle];
            if (!proxy) {
                logic(this, 'badSliceHandle', { handle: msg.handle });
                return;
            }
            if (proxy.__listener)
                proxy.__listener.refresh();
        },
        _cmd_growSlice: function mb__cmd_growSlice(msg) {
            var proxy = this._slices[msg.handle];
            if (!proxy) {
                logic(this, 'badSliceHandle', { handle: msg.handle });
                return;
            }
            if (proxy.__listener)
                proxy.__listener.reqGrow(msg.dirMagnitude, msg.userRequestsGrowth);
        },
        _cmd_shrinkSlice: function mb__cmd_shrinkSlice(msg) {
            var proxy = this._slices[msg.handle];
            if (!proxy) {
                logic(this, 'badSliceHandle', { handle: msg.handle });
                return;
            }
            if (proxy.__listener)
                proxy.__listener.reqNoteRanges(msg.firstIndex, msg.firstSuid, msg.lastIndex, msg.lastSuid);
        },
        _cmd_killSlice: function mb__cmd_killSlice(msg) {
            var proxy = this._slices[msg.handle];
            if (!proxy) {
                logic(this, 'badSliceHandle', { handle: msg.handle });
                return;
            }
            delete this._slices[msg.handle];
            var proxies = this._slicesByType[proxy._ns], idx = proxies.indexOf(proxy);
            proxies.splice(idx, 1);
            proxy.die();
            this.__sendMessage({
                type: 'sliceDead',
                handle: msg.handle
            });
        },
        _cmd_getBody: function mb__cmd_getBody(msg) {
            var self = this;
            var folderStorage = this.universe.getFolderStorageForMessageSuid(msg.suid);
            var pendingUpdates = [];
            var catchPending = function catchPending(msg) {
                pendingUpdates.push(msg);
            };
            if (!this._observedBodies[msg.suid])
                this._observedBodies[msg.suid] = {};
            this._observedBodies[msg.suid][msg.handle] = catchPending;
            var handler = function (bodyInfo) {
                self.__sendMessage({
                    type: 'gotBody',
                    handle: msg.handle,
                    bodyInfo: bodyInfo
                });
                if (msg.downloadBodyReps && !folderStorage.messageBodyRepsDownloaded(bodyInfo)) {
                    self.universe.downloadMessageBodyReps(msg.suid, msg.date, function () {
                    });
                }
                pendingUpdates.forEach(self.__sendMessage, self);
                pendingUpdates = null;
                self._observedBodies[msg.suid][msg.handle] = null;
            };
            if (msg.withBodyReps)
                folderStorage.getMessageBodyWithReps(msg.suid, msg.date, handler);
            else
                folderStorage.getMessageBody(msg.suid, msg.date, handler);
        },
        _cmd_killBody: function (msg) {
            var handles = this._observedBodies[msg.id];
            if (handles) {
                delete handles[msg.handle];
                var purgeHandles = true;
                for (var key in handles) {
                    purgeHandles = false;
                    break;
                }
                if (purgeHandles) {
                    delete this._observedBodies[msg.id];
                }
            }
            this.__sendMessage({
                type: 'bodyDead',
                handle: msg.handle
            });
        },
        _cmd_downloadAttachments: function mb__cmd__downloadAttachments(msg) {
            var self = this;
            this.universe.downloadMessageAttachments(msg.suid, msg.date, msg.relPartIndices, msg.attachmentIndices, msg.registerAttachments, function (err) {
                self.__sendMessage({
                    type: 'downloadedAttachments',
                    handle: msg.handle
                });
            });
        },
        _cmd_modifyMessageTags: function mb__cmd_modifyMessageTags(msg) {
            var longtermIds = this.universe.modifyMessageTags(msg.opcode, msg.messages, msg.addTags, msg.removeTags);
            this.__sendMessage({
                type: 'mutationConfirmed',
                handle: msg.handle,
                longtermIds: longtermIds
            });
        },
        _cmd_deleteMessages: function mb__cmd_deleteMessages(msg) {
            var longtermIds = this.universe.deleteMessages(msg.messages);
            this.__sendMessage({
                type: 'mutationConfirmed',
                handle: msg.handle,
                longtermIds: longtermIds
            });
        },
        _cmd_moveMessages: function mb__cmd_moveMessages(msg) {
            var longtermIds = this.universe.moveMessages(msg.messages, msg.targetFolder, function (err, moveMap) {
                this.__sendMessage({
                    type: 'mutationConfirmed',
                    handle: msg.handle,
                    longtermIds: longtermIds,
                    result: moveMap
                });
            }.bind(this));
        },
        _cmd_sendOutboxMessages: function (msg) {
            var account = this.universe.getAccountForAccountId(msg.accountId);
            this.universe.sendOutboxMessages(account, { reason: 'api request' }, function (err) {
                this.__sendMessage({
                    type: 'sendOutboxMessages',
                    handle: msg.handle
                });
            }.bind(this));
        },
        _cmd_setOutboxSyncEnabled: function (msg) {
            var account = this.universe.getAccountForAccountId(msg.accountId);
            this.universe.setOutboxSyncEnabled(account, msg.outboxSyncEnabled, function () {
                this.__sendMessage({
                    type: 'setOutboxSyncEnabled',
                    handle: msg.handle
                });
            }.bind(this));
        },
        _cmd_undo: function mb__cmd_undo(msg) {
            this.universe.undoMutation(msg.longtermIds);
        },
        _cmd_beginCompose: function mb__cmd_beginCompose(msg) {
            require([
                './drafts/composer',
                'mailchew'
            ], function ($composer, $mailchew) {
                var req = this._pendingRequests[msg.handle] = {
                    type: 'compose',
                    active: 'begin',
                    account: null,
                    persistedNamer: null,
                    die: false
                };
                var account, identity, folderId;
                if (msg.mode === 'new' && msg.submode === 'folder')
                    account = this.universe.getAccountForFolderId(msg.refSuid);
                else
                    account = this.universe.getAccountForMessageSuid(msg.refSuid);
                req.account = account;
                identity = account.identities[0];
                var bodyText = $mailchew.generateBaseComposeBody(identity);
                if (msg.mode !== 'reply' && msg.mode !== 'forward') {
                    return this.__sendMessage({
                        type: 'composeBegun',
                        handle: msg.handle,
                        error: null,
                        identity: identity,
                        subject: '',
                        body: {
                            text: bodyText,
                            html: null
                        },
                        to: [],
                        cc: [],
                        bcc: [],
                        references: null,
                        attachments: []
                    });
                }
                var folderStorage = this.universe.getFolderStorageForMessageSuid(msg.refSuid);
                var self = this;
                folderStorage.getMessage(msg.refSuid, msg.refDate, { withBodyReps: true }, function (res) {
                    if (!res) {
                        return console.warn('Cannot compose message missing header/body: ', msg.refSuid);
                    }
                    var header = res.header;
                    var bodyInfo = res.body;
                    if (msg.mode === 'reply') {
                        var rTo, rCc, rBcc;
                        var replyToAddress = header.replyTo && header.replyTo[0];
                        var effectiveAuthor = replyToAddress || msg.refAuthor;
                        switch (msg.submode) {
                        case 'list':
                        case null:
                        case 'sender':
                            rTo = [effectiveAuthor];
                            rCc = rBcc = [];
                            break;
                        case 'all':
                            if (checkIfAddressListContainsAddress(header.to, effectiveAuthor) || checkIfAddressListContainsAddress(header.cc, effectiveAuthor)) {
                                rTo = header.to;
                            } else {
                                if (header.to && header.to.length)
                                    rTo = [effectiveAuthor].concat(header.to);
                                else
                                    rTo = [effectiveAuthor];
                            }
                            var notYourIdentity = function (person) {
                                return person.address !== identity.address;
                            };
                            rTo = rTo.filter(notYourIdentity);
                            rCc = (header.cc || []).filter(notYourIdentity);
                            rBcc = header.bcc;
                            break;
                        }
                        var referencesStr;
                        if (bodyInfo.references) {
                            referencesStr = bodyInfo.references.concat([msg.refGuid]).map(function (x) {
                                return '<' + x + '>';
                            }).join(' ');
                        } else if (msg.refGuid) {
                            referencesStr = '<' + msg.refGuid + '>';
                        } else {
                            referencesStr = '';
                        }
                        req.active = null;
                        self.__sendMessage({
                            type: 'composeBegun',
                            handle: msg.handle,
                            error: null,
                            identity: identity,
                            subject: $mailchew.generateReplySubject(msg.refSubject),
                            body: $mailchew.generateReplyBody(bodyInfo.bodyReps, effectiveAuthor, msg.refDate, identity, msg.refGuid),
                            to: rTo,
                            cc: rCc,
                            bcc: rBcc,
                            referencesStr: referencesStr,
                            attachments: []
                        });
                    } else {
                        req.active = null;
                        self.__sendMessage({
                            type: 'composeBegun',
                            handle: msg.handle,
                            error: null,
                            identity: identity,
                            subject: $mailchew.generateForwardSubject(msg.refSubject),
                            body: $mailchew.generateForwardMessage(msg.refAuthor, msg.refDate, msg.refSubject, header, bodyInfo, identity),
                            to: [],
                            cc: [],
                            bcc: [],
                            references: null,
                            attachments: []
                        });
                    }
                });
            }.bind(this));
        },
        _cmd_attachBlobToDraft: function (msg) {
            require(['./drafts/composer'], function ($composer) {
                var draftReq = this._pendingRequests[msg.draftHandle];
                if (!draftReq)
                    return;
                this.universe.attachBlobToDraft(draftReq.account, draftReq.persistedNamer, msg.attachmentDef, function (err) {
                    this.__sendMessage({
                        type: 'attachedBlobToDraft',
                        handle: msg.handle,
                        draftHandle: msg.draftHandle,
                        err: err
                    });
                }.bind(this));
            }.bind(this));
        },
        _cmd_detachAttachmentFromDraft: function (msg) {
            require(['./drafts/composer'], function ($composer) {
                var req = this._pendingRequests[msg.draftHandle];
                if (!req)
                    return;
                this.universe.detachAttachmentFromDraft(req.account, req.persistedNamer, msg.attachmentIndex, function (err) {
                    this.__sendMessage({
                        type: 'detachedAttachmentFromDraft',
                        handle: msg.handle,
                        draftHandle: msg.draftHandle,
                        err: err
                    });
                }.bind(this));
            }.bind(this));
        },
        _cmd_resumeCompose: function mb__cmd_resumeCompose(msg) {
            var req = this._pendingRequests[msg.handle] = {
                type: 'compose',
                active: 'resume',
                account: null,
                persistedNamer: msg.messageNamer,
                die: false
            };
            var account = req.account = this.universe.getAccountForMessageSuid(msg.messageNamer.suid);
            var folderStorage = this.universe.getFolderStorageForMessageSuid(msg.messageNamer.suid);
            var self = this;
            folderStorage.runMutexed('resumeCompose', function (callWhenDone) {
                function fail() {
                    self.__sendMessage({
                        type: 'composeBegun',
                        handle: msg.handle,
                        error: 'no-message'
                    });
                    callWhenDone();
                }
                folderStorage.getMessage(msg.messageNamer.suid, msg.messageNamer.date, function (res) {
                    try {
                        if (!res.header || !res.body) {
                            fail();
                            return;
                        }
                        var header = res.header, body = res.body;
                        var composeBody = {
                            text: '',
                            html: null
                        };
                        if (body.bodyReps.length >= 1 && body.bodyReps[0].type === 'plain' && body.bodyReps[0].content.length === 2 && body.bodyReps[0].content[0] === 1) {
                            composeBody.text = body.bodyReps[0].content[1];
                        }
                        if (body.bodyReps.length == 2 && body.bodyReps[1].type === 'html') {
                            composeBody.html = body.bodyReps[1].content;
                        }
                        var attachments = [];
                        body.attachments.forEach(function (att) {
                            attachments.push({
                                name: att.name,
                                blob: {
                                    size: att.sizeEstimate,
                                    type: att.type
                                }
                            });
                        });
                        req.active = null;
                        self.__sendMessage({
                            type: 'composeBegun',
                            handle: msg.handle,
                            error: null,
                            identity: account.identities[0],
                            subject: header.subject,
                            body: composeBody,
                            to: header.to,
                            cc: header.cc,
                            bcc: header.bcc,
                            referencesStr: body.references,
                            attachments: attachments,
                            sendStatus: header.sendStatus
                        });
                        callWhenDone();
                    } catch (ex) {
                        fail();
                    }
                });
            });
        },
        _cmd_doneCompose: function mb__cmd_doneCompose(msg) {
            require(['./drafts/composer'], function ($composer) {
                var req = this._pendingRequests[msg.handle], self = this;
                if (!req) {
                    return;
                }
                if (msg.command === 'die') {
                    if (req.active) {
                        req.die = true;
                    } else {
                        delete this._pendingRequests[msg.handle];
                    }
                    return;
                }
                var account;
                if (msg.command === 'delete') {
                    function sendDeleted() {
                        self.__sendMessage({
                            type: 'doneCompose',
                            handle: msg.handle
                        });
                    }
                    if (req.persistedNamer) {
                        account = this.universe.getAccountForMessageSuid(req.persistedNamer.suid);
                        this.universe.deleteDraft(account, req.persistedNamer, sendDeleted);
                    } else {
                        sendDeleted();
                    }
                    delete this._pendingRequests[msg.handle];
                    return;
                }
                var wireRep = msg.state;
                account = this.universe.getAccountForSenderIdentityId(wireRep.senderId);
                var identity = this.universe.getIdentityForSenderIdentityId(wireRep.senderId);
                if (msg.command === 'send') {
                    req.persistedNamer = this.universe.saveDraft(account, req.persistedNamer, wireRep, function (err, newRecords) {
                        req.active = null;
                        if (req.die) {
                            delete this._pendingRequests[msg.handle];
                        }
                        var outboxFolder = account.getFirstFolderWithType('outbox');
                        this.universe.moveMessages([req.persistedNamer], outboxFolder.id);
                        this.universe.sendOutboxMessages(account, {
                            reason: 'moved to outbox',
                            emitNotifications: this.universe.online
                        });
                    }.bind(this));
                    var initialSendStatus = {
                        accountId: account.id,
                        suid: req.persistedNamer.suid,
                        state: this.universe.online ? 'sending' : 'pending',
                        emitNotifications: true
                    };
                    this.__sendMessage({
                        type: 'doneCompose',
                        handle: msg.handle,
                        sendStatus: initialSendStatus
                    });
                    this.universe.__notifyBackgroundSendStatus(initialSendStatus);
                } else if (msg.command === 'save') {
                    req.persistedNamer = this.universe.saveDraft(account, req.persistedNamer, wireRep, function (err) {
                        req.active = null;
                        if (req.die)
                            delete self._pendingRequests[msg.handle];
                        self.__sendMessage({
                            type: 'doneCompose',
                            handle: msg.handle
                        });
                    });
                }
            }.bind(this));
        },
        notifyCronSyncStart: function mb_notifyCronSyncStart(accountIds) {
            this.__sendMessage({
                type: 'cronSyncStart',
                accountIds: accountIds
            });
        },
        notifyCronSyncStop: function mb_notifyCronSyncStop(accountsResults) {
            this.__sendMessage({
                type: 'cronSyncStop',
                accountsResults: accountsResults
            });
        },
        notifyBackgroundSendStatus: function (data) {
            this.__sendMessage({
                type: 'backgroundSendStatus',
                data: data
            });
        }
    };
});
;
define('a64', ['exports'], function (exports) {
    var ORDERED_ARBITRARY_BASE64_CHARS = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        '{',
        '}'
    ];
    var ZERO_PADDING = '0000000000000000';
    function encodeInt(v, padTo) {
        var sbits = [];
        do {
            sbits.push(ORDERED_ARBITRARY_BASE64_CHARS[v & 63]);
            v = Math.floor(v / 64);
        } while (v > 0);
        sbits.reverse();
        var estr = sbits.join('');
        if (padTo && estr.length < padTo)
            return ZERO_PADDING.substring(0, padTo - estr.length) + estr;
        return estr;
    }
    exports.encodeInt = encodeInt;
    var E10_14_RSH_14 = Math.pow(10, 14) / Math.pow(2, 14), P2_14 = Math.pow(2, 14), P2_22 = Math.pow(2, 22), P2_32 = Math.pow(2, 32), P2_36 = Math.pow(2, 36), MASK32 = 4294967295;
    exports.parseUI64 = function p(s, padTo) {
        if (s.length < 16) {
            return encodeInt(parseInt(s, 10));
        }
        var lowParse = parseInt(s.substring(s.length - 14), 10), highParse = parseInt(s.substring(0, s.length - 14), 10), rawHighBits = highParse * E10_14_RSH_14;
        var lowBitsAdded = rawHighBits % P2_36 * P2_14 % P2_36 + lowParse % P2_36, lowBits = lowBitsAdded % P2_36, overflow = Math.floor(lowBitsAdded / P2_36) % 2;
        var highBits = Math.floor(rawHighBits / P2_22) + Math.floor(lowParse / P2_36) + overflow;
        var outStr = encodeInt(highBits) + encodeInt(lowBits, 6);
        if (padTo && outStr.length < padTo)
            return ZERO_PADDING.substring(0, padTo - outStr.length) + outStr;
        return outStr;
    };
    exports.cmpUI64 = function (a, b) {
        var c = a.length - b.length;
        if (c !== 0)
            return c;
        if (a < b)
            return -1;
        else if (a > b)
            return 1;
        return 0;
    };
    exports.decodeUI64 = function d(es) {
        var iNonZero = 0;
        for (; es.charCodeAt(iNonZero) === 48; iNonZero++) {
        }
        if (iNonZero)
            es = es.substring(iNonZero);
        var v, i;
        if (es.length <= 8) {
            v = 0;
            for (i = 0; i < es.length; i++) {
                v = v * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(es[i]);
            }
            return v.toString(10);
        }
        var ues = es.substring(0, es.length - 6), uv = 0, les = es.substring(es.length - 6), lv = 0;
        for (i = 0; i < ues.length; i++) {
            uv = uv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(ues[i]);
        }
        for (i = 0; i < les.length; i++) {
            lv = lv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(les[i]);
        }
        var rsh14val = uv * P2_22 + Math.floor(lv / P2_14), uraw = rsh14val / E10_14_RSH_14, udv = Math.floor(uraw), uds = udv.toString();
        var rsh14Leftover = rsh14val - udv * E10_14_RSH_14, lowBitsRemoved = rsh14Leftover * P2_14 + lv % P2_14;
        var lds = lowBitsRemoved.toString();
        if (lds.length < 14)
            lds = ZERO_PADDING.substring(0, 14 - lds.length) + lds;
        return uds + lds;
    };
});
;
define('syncbase', [
    './date',
    'exports'
], function ($date, exports) {
    exports.OPEN_REFRESH_THRESH_MS = 10 * 60 * 1000;
    exports.GROW_REFRESH_THRESH_MS = 60 * 60 * 1000;
    exports.EXPECTED_BLOCK_SIZE = 8;
    exports.MAX_BLOCK_SIZE = exports.EXPECTED_BLOCK_SIZE * 1024, exports.BLOCK_SPLIT_SMALL_PART = exports.EXPECTED_BLOCK_SIZE / 3 * 1024, exports.BLOCK_SPLIT_EQUAL_PART = exports.EXPECTED_BLOCK_SIZE / 2 * 1024, exports.BLOCK_SPLIT_LARGE_PART = exports.EXPECTED_BLOCK_SIZE / 1.5 * 1024;
    exports.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS = 32;
    exports.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS = 14 * $date.DAY_MILLIS;
    exports.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT = 1024;
    exports.POP3_SAVE_STATE_EVERY_N_MESSAGES = 50;
    exports.POP3_MAX_MESSAGES_PER_SYNC = 100;
    exports.POP3_INFER_ATTACHMENTS_SIZE = 512 * 1024;
    exports.POP3_SNIPPET_SIZE_GOAL = 4 * 1024;
    exports.SYNC_FOLDER_LIST_EVERY_MS = $date.DAY_MILLIS;
    exports.INITIAL_FILL_SIZE = 15;
    exports.INITIAL_SYNC_DAYS = 3;
    exports.INITIAL_SYNC_GROWTH_DAYS = 3;
    exports.TIME_SCALE_FACTOR_ON_NO_MESSAGES = 2;
    exports.OLDEST_SYNC_DATE = Date.UTC(1990, 0, 1);
    exports.SYNC_WHOLE_FOLDER_AT_N_MESSAGES = 40;
    exports.BISECT_DATE_AT_N_MESSAGES = 60;
    exports.TOO_MANY_MESSAGES = 2000;
    exports.IMAP_SEARCH_AMBIGUITY_MS = $date.DAY_MILLIS;
    exports.HEADER_EST_SIZE_IN_BYTES = 430;
    exports.MAX_OP_TRY_COUNT = 10;
    exports.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT = 5;
    exports.DEFERRED_OP_DELAY_MS = 30 * 1000;
    exports.CHECK_INTERVALS_ENUMS_TO_MS = {
        'manual': 0,
        '3min': 3 * 60 * 1000,
        '5min': 5 * 60 * 1000,
        '10min': 10 * 60 * 1000,
        '15min': 15 * 60 * 1000,
        '30min': 30 * 60 * 1000,
        '60min': 60 * 60 * 1000
    };
    exports.DEFAULT_CHECK_INTERVAL_ENUM = 'manual';
    exports.CONNECT_TIMEOUT_MS = 30000;
    exports.STALE_CONNECTION_TIMEOUT_MS = 30000;
    exports.KILL_CONNECTIONS_WHEN_JOBLESS = true;
    var DAY_MILLIS = 24 * 60 * 60 * 1000;
    exports.SYNC_RANGE_ENUMS_TO_MS = {
        'auto': 30 * DAY_MILLIS,
        '1d': 1 * DAY_MILLIS,
        '3d': 3 * DAY_MILLIS,
        '1w': 7 * DAY_MILLIS,
        '2w': 14 * DAY_MILLIS,
        '1m': 30 * DAY_MILLIS,
        'all': 30 * 365 * DAY_MILLIS
    };
    exports.CRONSYNC_MAX_MESSAGES_TO_REPORT_PER_ACCOUNT = 5;
    exports.CRONSYNC_MAX_SNIPPETS_TO_FETCH_PER_ACCOUNT = 5;
    exports.MAX_SNIPPET_BYTES = 4 * 1024;
    exports.TEST_adjustSyncValues = function TEST_adjustSyncValues(syncValues) {
        var legacyKeys = {
            fillSize: 'INITIAL_FILL_SIZE',
            days: 'INITIAL_SYNC_DAYS',
            growDays: 'INITIAL_SYNC_GROWTH_DAYS',
            wholeFolderSync: 'SYNC_WHOLE_FOLDER_AT_N_MESSAGES',
            bisectThresh: 'BISECT_DATE_AT_N_MESSAGES',
            tooMany: 'TOO_MANY_MESSAGES',
            scaleFactor: 'TIME_SCALE_FACTOR_ON_NO_MESSAGES',
            openRefreshThresh: 'OPEN_REFRESH_THRESH_MS',
            growRefreshThresh: 'GROW_REFRESH_THRESH_MS'
        };
        for (var key in syncValues)
            if (syncValues.hasOwnProperty(key)) {
                var outKey = legacyKeys[key] || key;
                if (exports.hasOwnProperty(outKey)) {
                    exports[outKey] = syncValues[key];
                } else {
                    console.warn('Invalid key for TEST_adjustSyncValues: ' + key);
                }
            }
    };
});
;
define('maildb', [
    './worker-router',
    'exports'
], function ($router, exports) {
    'use strict';
    var sendMessage = $router.registerCallbackType('maildb');
    function MailDB(testOptions) {
        this._callbacksQueue = [];
        function processQueue() {
            console.log('main thread reports DB ready');
            this._ready = true;
            this._callbacksQueue.forEach(function executeCallback(cb) {
                cb();
            });
            this._callbacksQueue = null;
        }
        sendMessage('open', [testOptions], processQueue.bind(this));
    }
    exports.MailDB = MailDB;
    MailDB.prototype = {
        close: function () {
            sendMessage('close');
        },
        getConfig: function (callback) {
            if (!this._ready) {
                console.log('deferring getConfig call until ready');
                this._callbacksQueue.push(this.getConfig.bind(this, callback));
                return;
            }
            console.log('issuing getConfig call to main thread');
            sendMessage('getConfig', null, callback);
        },
        saveConfig: function (config) {
            sendMessage('saveConfig', [config]);
        },
        saveAccountDef: function (config, accountDef, folderInfo, callback) {
            sendMessage('saveAccountDef', [
                config,
                accountDef,
                folderInfo
            ], callback);
        },
        loadHeaderBlock: function (folderId, blockId, callback) {
            sendMessage('loadHeaderBlock', [
                folderId,
                blockId
            ], callback);
        },
        loadBodyBlock: function (folderId, blockId, callback) {
            sendMessage('loadBodyBlock', [
                folderId,
                blockId
            ], callback);
        },
        saveAccountFolderStates: function (accountId, folderInfo, perFolderStuff, deletedFolderIds, callback, reuseTrans) {
            var args = [
                accountId,
                folderInfo,
                perFolderStuff,
                deletedFolderIds
            ];
            sendMessage('saveAccountFolderStates', args, callback);
            return null;
        },
        deleteAccount: function (accountId) {
            sendMessage('deleteAccount', [accountId]);
        }
    };
});
;
define('allback', ['exports'], function (exports) {
    exports.allbackMaker = function allbackMaker(names, allDoneCallback) {
        var aggrData = Object.create(null), callbacks = {}, waitingFor = names.concat();
        names.forEach(function (name) {
            aggrData[name] = undefined;
            callbacks[name] = function anAllback(callbackResult) {
                var i = waitingFor.indexOf(name);
                if (i === -1) {
                    console.error('Callback \'' + name + '\' fired multiple times!');
                    throw new Error('Callback \'' + name + '\' fired multiple times!');
                }
                waitingFor.splice(i, 1);
                if (arguments.length > 1)
                    aggrData[name] = arguments;
                else
                    aggrData[name] = callbackResult;
                if (waitingFor.length === 0 && allDoneCallback)
                    allDoneCallback(aggrData);
            };
        });
        return callbacks;
    };
    exports.latch = function () {
        var ready = false;
        var deferred = {};
        var results = Object.create(null);
        var count = 0;
        deferred.promise = new Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        function defer(name) {
            count++;
            var resolved = false;
            return function resolve() {
                if (resolved) {
                    var err = new Error('You have already resolved this deferred!');
                    console.error(err + '\n' + err.stack);
                    throw err;
                }
                resolved = true;
                if (name != null) {
                    results[name] = Array.slice(arguments);
                }
                if (--count === 0) {
                    setZeroTimeout(function () {
                        deferred.resolve(results);
                    });
                }
            };
        }
        var unlatch = defer();
        return {
            defer: defer,
            then: function () {
                var ret = deferred.promise.then.apply(deferred.promise, arguments);
                if (!ready) {
                    ready = true;
                    unlatch();
                }
                return ret;
            }
        };
    };
    exports.extractErrFromCallbackArgs = function (results) {
        var anyErr = null;
        for (var key in results) {
            var args = results[key];
            var errIfAny = args[0];
            if (errIfAny) {
                anyErr = errIfAny;
                break;
            }
        }
        return anyErr;
    };
    exports.latchedWithRejections = function (namedPromises) {
        return new Promise(function (resolve, reject) {
            var results = Object.create(null);
            var pending = 0;
            Object.keys(namedPromises).forEach(function (name) {
                pending++;
                var promise = namedPromises[name];
                promise.then(function (result) {
                    results[name] = {
                        resolved: true,
                        value: result
                    };
                    if (--pending === 0) {
                        resolve(results);
                    }
                }, function (err) {
                    results[name] = {
                        resolved: false,
                        value: err
                    };
                    if (--pending === 0) {
                        resolve(results);
                    }
                });
            });
            if (!pending) {
                resolve(results);
            }
        });
    };
});
;
define('mailslice', [
    'require',
    'exports',
    'module',
    'logic',
    './util',
    './a64',
    './allback',
    './date',
    './syncbase'
], function (require, exports, module) {
    var logic = require('logic');
    var $util = require('./util');
    var $a64 = require('./a64');
    var $allback = require('./allback');
    var $date = require('./date');
    var $sync = require('./syncbase');
    var bsearchForInsert = $util.bsearchForInsert, bsearchMaybeExists = $util.bsearchMaybeExists, cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld, allbackMaker = $allback.allbackMaker, BEFORE = $date.BEFORE, ON_OR_BEFORE = $date.ON_OR_BEFORE, SINCE = $date.SINCE, STRICTLY_AFTER = $date.STRICTLY_AFTER, IN_BS_DATE_RANGE = $date.IN_BS_DATE_RANGE, HOUR_MILLIS = $date.HOUR_MILLIS, DAY_MILLIS = $date.DAY_MILLIS, NOW = $date.NOW, quantizeDate = $date.quantizeDate, quantizeDateUp = $date.quantizeDateUp;
    var PASTWARDS = 1, FUTUREWARDS = -1;
    var OBJ_OVERHEAD_EST = 2, STR_ATTR_OVERHEAD_EST = 5, NUM_ATTR_OVERHEAD_EST = 10, LIST_ATTR_OVERHEAD_EST = 4, NULL_ATTR_OVERHEAD_EST = 2, LIST_OVERHEAD_EST = 4, NUM_OVERHEAD_EST = 8, STR_OVERHEAD_EST = 4;
    var tupleRangeIntersectsTupleRange = exports.tupleRangeIntersectsTupleRange = function tupleRangeIntersectsTupleRange(a, b) {
        if (BEFORE(a.endTS, b.startTS) || STRICTLY_AFTER(a.startTS, b.endTS))
            return false;
        if (a.endTS === b.startTS && a.endUID < b.startUID || a.startTS === b.endTS && a.startTS > b.endUID)
            return false;
        return true;
    };
    var SYNC_START_MINIMUM_PROGRESS = 0.02;
    function MailSlice(bridgeHandle, storage) {
        this._bridgeHandle = bridgeHandle;
        bridgeHandle.__listener = this;
        this._storage = storage;
        logic.defineScope(this, 'MailSlice', { bridgeHandle: bridgeHandle._handle });
        this.startTS = null;
        this.startUID = null;
        this.endTS = null;
        this.endUID = null;
        this.waitingOnData = false;
        this.ignoreHeaders = false;
        this.headers = [];
        this.desiredHeaders = $sync.INITIAL_FILL_SIZE;
        this.headerCount = storage.headerCount;
    }
    exports.MailSlice = MailSlice;
    MailSlice.prototype = {
        type: 'folder',
        set atTop(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.atTop = val;
            return val;
        },
        set atBottom(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.atBottom = val;
            return val;
        },
        set userCanGrowUpwards(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.userCanGrowUpwards = val;
            return val;
        },
        set userCanGrowDownwards(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.userCanGrowDownwards = val;
            return val;
        },
        get headerCount() {
            if (this._bridgeHandle) {
                return this._bridgeHandle.headerCount;
            }
            return null;
        },
        set headerCount(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.headerCount = val;
            return val;
        },
        _updateSliceFlags: function () {
            var flagHolder = this._bridgeHandle;
            flagHolder.atTop = this._storage.headerIsYoungestKnown(this.endTS, this.endUID);
            flagHolder.atBottom = this._storage.headerIsOldestKnown(this.startTS, this.startUID);
            if (flagHolder.atTop)
                flagHolder.userCanGrowUpwards = !this._storage.syncedToToday();
            else
                flagHolder.userCanGrowUpwards = false;
            if (flagHolder.atBottom)
                flagHolder.userCanGrowDownwards = !this._storage.syncedToDawnOfTime();
            else
                flagHolder.userCanGrowDownwards = false;
        },
        reset: function () {
            if (!this._bridgeHandle)
                return;
            this.headerCount = this._storage.headerCount;
            if (this.headers.length) {
                this._bridgeHandle.sendSplice(0, this.headers.length, [], false, true);
                this.headers.splice(0, this.headers.length);
                this.startTS = null;
                this.startUID = null;
                this.endTS = null;
                this.endUID = null;
            }
        },
        refresh: function () {
            this._storage.refreshSlice(this);
        },
        reqNoteRanges: function (firstIndex, firstSuid, lastIndex, lastSuid) {
            if (!this._bridgeHandle)
                return;
            var i;
            if (firstIndex >= this.headers.length || this.headers[firstIndex].suid !== firstSuid) {
                firstIndex = 0;
                for (i = 0; i < this.headers.length; i++) {
                    if (this.headers[i].suid === firstSuid) {
                        firstIndex = i;
                        break;
                    }
                }
            }
            if (lastIndex >= this.headers.length || this.headers[lastIndex].suid !== lastSuid) {
                for (i = this.headers.length - 1; i >= 0; i--) {
                    if (this.headers[i].suid === lastSuid) {
                        lastIndex = i;
                        break;
                    }
                }
            }
            if (lastIndex + 1 < this.headers.length) {
                this.atBottom = false;
                this.userCanGrowDownwards = false;
                var delCount = this.headers.length - lastIndex - 1;
                this.desiredHeaders -= delCount;
                this._bridgeHandle.sendSplice(lastIndex + 1, delCount, [], true, firstIndex > 0);
                this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
                var lastHeader = this.headers[lastIndex];
                this.startTS = lastHeader.date;
                this.startUID = lastHeader.id;
            }
            if (firstIndex > 0) {
                this.atTop = false;
                this.userCanGrowUpwards = false;
                this.desiredHeaders -= firstIndex;
                this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);
                this.headers.splice(0, firstIndex);
                var firstHeader = this.headers[0];
                this.endTS = firstHeader.date;
                this.endUID = firstHeader.id;
            }
            this._storage.sliceShrunk(this);
        },
        reqGrow: function (dirMagnitude, userRequestsGrowth) {
            if (dirMagnitude === -1)
                dirMagnitude = -$sync.INITIAL_FILL_SIZE;
            else if (dirMagnitude === 1)
                dirMagnitude = $sync.INITIAL_FILL_SIZE;
            this._storage.growSlice(this, dirMagnitude, userRequestsGrowth);
        },
        sendEmptyCompletion: function () {
            this.setStatus('synced', true, false);
        },
        setStatus: function (status, requested, moreExpected, flushAccumulated, progress, newEmailCount) {
            if (!this._bridgeHandle)
                return;
            switch (status) {
            case 'synced':
            case 'syncfailed':
                this._updateSliceFlags();
                break;
            }
            this._bridgeHandle.sendStatus(status, requested, moreExpected, progress, newEmailCount);
        },
        setSyncProgress: function (value) {
            if (!this._bridgeHandle)
                return;
            this._bridgeHandle.sendSyncProgress(value);
        },
        batchAppendHeaders: function (headers, insertAt, moreComing) {
            if (!this._bridgeHandle)
                return;
            logic(this, 'headersAppended', { headers: headers });
            if (insertAt === -1)
                insertAt = this.headers.length;
            this.headers.splice.apply(this.headers, [
                insertAt,
                0
            ].concat(headers));
            for (var i = 0; i < headers.length; i++) {
                var header = headers[i];
                if (this.startTS === null || BEFORE(header.date, this.startTS)) {
                    this.startTS = header.date;
                    this.startUID = header.id;
                } else if (header.date === this.startTS && header.id < this.startUID) {
                    this.startUID = header.id;
                }
                if (this.endTS === null || STRICTLY_AFTER(header.date, this.endTS)) {
                    this.endTS = header.date;
                    this.endUID = header.id;
                } else if (header.date === this.endTS && header.id > this.endUID) {
                    this.endUID = header.id;
                }
            }
            this._updateSliceFlags();
            this._bridgeHandle.sendSplice(insertAt, 0, headers, true, moreComing);
        },
        onHeaderAdded: function (header, body, syncDriven, messageIsNew) {
            if (!this._bridgeHandle)
                return;
            var idx = bsearchForInsert(this.headers, header, cmpHeaderYoungToOld);
            var hlen = this.headers.length;
            if (hlen >= this.desiredHeaders && idx === hlen)
                return;
            if (hlen >= this.desiredHeaders)
                this.desiredHeaders++;
            if (this.startTS === null || BEFORE(header.date, this.startTS)) {
                this.startTS = header.date;
                this.startUID = header.id;
            } else if (header.date === this.startTS && header.id < this.startUID) {
                this.startUID = header.id;
            }
            if (this.endTS === null || STRICTLY_AFTER(header.date, this.endTS)) {
                this.endTS = header.date;
                this.endUID = header.id;
            } else if (header.date === this.endTS && header.id > this.endUID) {
                this.endUID = header.id;
            }
            logic(this, 'headerAdded', {
                index: idx,
                header: header
            });
            this._bridgeHandle.sendSplice(idx, 0, [header], Boolean(this.waitingOnData), Boolean(this.waitingOnData));
            this.headers.splice(idx, 0, header);
        },
        onHeaderModified: function (header, body) {
            if (!this._bridgeHandle)
                return;
            var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
            if (idx !== null) {
                this.headers[idx] = header;
                logic(this, 'headerModified', {
                    index: idx,
                    header: header
                });
                this._bridgeHandle.sendUpdate([
                    idx,
                    header
                ]);
            }
        },
        onHeaderRemoved: function (header) {
            if (!this._bridgeHandle)
                return;
            var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
            if (idx !== null) {
                logic(this, 'headerRemoved', {
                    index: idx,
                    header: header
                });
                this._bridgeHandle.sendSplice(idx, 1, [], Boolean(this.waitingOnData), Boolean(this.waitingOnData));
                this.headers.splice(idx, 1);
                if (header.date === this.endTS && header.id === this.endUID) {
                    if (!this.headers.length) {
                        this.endTS = null;
                        this.endUID = null;
                    } else {
                        this.endTS = this.headers[0].date;
                        this.endUID = this.headers[0].id;
                    }
                }
                if (header.date === this.startTS && header.id === this.startUID) {
                    if (!this.headers.length) {
                        this.startTS = null;
                        this.startUID = null;
                    } else {
                        var lastHeader = this.headers[this.headers.length - 1];
                        this.startTS = lastHeader.date;
                        this.startUID = lastHeader.id;
                    }
                }
            }
        },
        die: function () {
            this._bridgeHandle = null;
            this.desiredHeaders = 0;
            this._storage.dyingSlice(this);
        },
        get isDead() {
            return this._bridgeHandle === null;
        }
    };
    var FOLDER_DB_VERSION = exports.FOLDER_DB_VERSION = 3;
    function FolderStorage(account, folderId, persistedFolderInfo, dbConn, FolderSyncer) {
        this._account = account;
        this._imapDb = dbConn;
        this.folderId = folderId;
        this.folderMeta = persistedFolderInfo.$meta;
        this._folderImpl = persistedFolderInfo.$impl;
        logic.defineScope(this, 'FolderStorage', {
            accountId: account.id,
            folderId: folderId
        });
        this._accuracyRanges = persistedFolderInfo.accuracy;
        this._headerBlockInfos = persistedFolderInfo.headerBlocks;
        this.headerCount = 0;
        if (this._headerBlockInfos) {
            this._headerBlockInfos.forEach(function (headerBlockInfo) {
                this.headerCount += headerBlockInfo.count;
            }.bind(this));
        }
        this._bodyBlockInfos = persistedFolderInfo.bodyBlocks;
        this._serverIdHeaderBlockMapping = persistedFolderInfo.serverIdHeaderBlockMapping;
        this._headerBlocks = {};
        this._loadedHeaderBlockInfos = [];
        this._bodyBlocks = {};
        this._loadedBodyBlockInfos = [];
        this._flushExcessTimeoutId = 0;
        this._bound_flushExcessOnTimeout = this._flushExcessOnTimeout.bind(this);
        this._bound_makeHeaderBlock = this._makeHeaderBlock.bind(this);
        this._bound_insertHeaderInBlock = this._insertHeaderInBlock.bind(this);
        this._bound_splitHeaderBlock = this._splitHeaderBlock.bind(this);
        this._bound_deleteHeaderFromBlock = this._deleteHeaderFromBlock.bind(this);
        this._bound_makeBodyBlock = this._makeBodyBlock.bind(this);
        this._bound_insertBodyInBlock = this._insertBodyInBlock.bind(this);
        this._bound_splitBodyBlock = this._splitBodyBlock.bind(this);
        this._bound_deleteBodyFromBlock = this._deleteBodyFromBlock.bind(this);
        this._dirty = false;
        this._dirtyHeaderBlocks = {};
        this._dirtyBodyBlocks = {};
        this._pendingLoads = [];
        this._pendingLoadListeners = {};
        this._deferredCalls = [];
        this._mutexQueue = [];
        this._slices = [];
        this._curSyncSlice = null;
        this._messagePurgeScheduled = false;
        this.folderSyncer = FolderSyncer && new FolderSyncer(account, this);
    }
    exports.FolderStorage = FolderStorage;
    FolderStorage.isTypeLocalOnly = function (type) {
        if (typeof type !== 'string') {
            throw new Error('isTypeLocalOnly() expects a string, not ' + type);
        }
        return type === 'outbox' || type === 'localdrafts';
    };
    FolderStorage.prototype = {
        get hasActiveSlices() {
            return this._slices.length > 0;
        },
        get isLocalOnly() {
            return FolderStorage.isTypeLocalOnly(this.folderMeta.type);
        },
        resetAndRefreshActiveSlices: function () {
            if (!this._slices.length)
                return;
            for (var i = this._slices.length - 1; i >= 0; i--) {
                var slice = this._slices[i];
                slice.desiredHeaders = $sync.INITIAL_FILL_SIZE;
                slice.reset();
                if (slice.type === 'folder') {
                    this._resetAndResyncSlice(slice, true, null);
                }
            }
        },
        generatePersistenceInfo: function () {
            if (!this._dirty)
                return null;
            var pinfo = {
                id: this.folderId,
                headerBlocks: this._dirtyHeaderBlocks,
                bodyBlocks: this._dirtyBodyBlocks
            };
            logic(this, 'generatePersistenceInfo', { info: pinfo });
            this._dirtyHeaderBlocks = {};
            this._dirtyBodyBlocks = {};
            this._dirty = false;
            this.flushExcessCachedBlocks('persist');
            this._account.universe.__notifyModifiedFolder(this._account, this.folderMeta);
            return pinfo;
        },
        _invokeNextMutexedCall: function () {
            var callInfo = this._mutexQueue[0], self = this, done = false;
            this._mutexedCallInProgress = true;
            logic(this, 'mutexedCall_begin', { name: callInfo.name });
            try {
                var mutexedOpDone = function (err) {
                    if (done) {
                        logic(self, 'tooManyCallbacks', { name: callInfo.name });
                        return;
                    }
                    logic(self, 'mutexedCall_end', { name: callInfo.name });
                    logic(self, 'mailslice:mutex-released', {
                        folderId: self.folderId,
                        err: err
                    });
                    done = true;
                    if (self._mutexQueue[0] !== callInfo) {
                        logic(self, 'mutexInvariantFail', {
                            callName: callInfo.name,
                            mutexName: self._mutexQueue[0].name
                        });
                        return;
                    }
                    self._mutexQueue.shift();
                    self.flushExcessCachedBlocks('mutex');
                    if (self._mutexQueue.length)
                        window.setZeroTimeout(self._invokeNextMutexedCall.bind(self));
                    else if (self._slices.length === 0)
                        self.folderSyncer.allConsumersDead();
                };
                callInfo.func(mutexedOpDone);
            } catch (ex) {
                logic(this, 'mutexedOpErr', { ex: ex });
            }
        },
        runMutexed: function (name, func) {
            var doRun = this._mutexQueue.length === 0;
            this._mutexQueue.push({
                name: name,
                func: func
            });
            if (doRun)
                this._invokeNextMutexedCall();
        },
        upgradeIfNeeded: function () {
            if (!this.folderMeta.version || FOLDER_DB_VERSION > this.folderMeta.version) {
                this._account.universe.performFolderUpgrade(this.folderMeta.id);
            }
        },
        _issueNewHeaderId: function () {
            return this._folderImpl.nextId++;
        },
        _makeHeaderBlock: function ifs__makeHeaderBlock(startTS, startUID, endTS, endUID, estSize, ids, headers) {
            var blockId = $a64.encodeInt(this._folderImpl.nextHeaderBlock++), blockInfo = {
                    blockId: blockId,
                    startTS: startTS,
                    startUID: startUID,
                    endTS: endTS,
                    endUID: endUID,
                    count: ids ? ids.length : 0,
                    estSize: estSize || 0
                }, block = {
                    ids: ids || [],
                    headers: headers || []
                };
            this._dirty = true;
            this._headerBlocks[blockId] = block;
            this._dirtyHeaderBlocks[blockId] = block;
            if (this._serverIdHeaderBlockMapping && headers) {
                var srvMapping = this._serverIdHeaderBlockMapping;
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    if (header.srvid)
                        srvMapping[header.srvid] = blockId;
                }
            }
            return blockInfo;
        },
        _insertHeaderInBlock: function ifs__insertHeaderInBlock(header, uid, info, block) {
            var idx = bsearchForInsert(block.headers, header, cmpHeaderYoungToOld);
            block.ids.splice(idx, 0, header.id);
            block.headers.splice(idx, 0, header);
            this._dirty = true;
            this._dirtyHeaderBlocks[info.blockId] = block;
        },
        _deleteHeaderFromBlock: function ifs__deleteHeaderFromBlock(uid, info, block) {
            var idx = block.ids.indexOf(uid), header;
            if (idx === -1) {
                logic(this, 'badDeletionRequest', {
                    header: header,
                    uid: uid
                });
                return;
            }
            header = block.headers[idx];
            if (header.flags && header.flags.indexOf('\\Seen') === -1) {
                this.folderMeta.unreadCount--;
            }
            block.ids.splice(idx, 1);
            block.headers.splice(idx, 1);
            info.estSize -= $sync.HEADER_EST_SIZE_IN_BYTES;
            info.count--;
            this._dirty = true;
            this._dirtyHeaderBlocks[info.blockId] = block;
            if (idx === 0 && info.count) {
                header = block.headers[0];
                info.endTS = header.date;
                info.endUID = header.id;
            }
            if (idx === info.count && idx > 0) {
                header = block.headers[idx - 1];
                info.startTS = header.date;
                info.startUID = header.id;
            }
        },
        _splitHeaderBlock: function ifs__splitHeaderBlock(splinfo, splock, newerTargetBytes) {
            var numHeaders = Math.ceil(newerTargetBytes / $sync.HEADER_EST_SIZE_IN_BYTES);
            if (numHeaders > splock.headers.length)
                throw new Error('No need to split!');
            var olderNumHeaders = splock.headers.length - numHeaders, olderEndHeader = splock.headers[numHeaders], olderInfo = this._makeHeaderBlock(splinfo.startTS, splinfo.startUID, olderEndHeader.date, olderEndHeader.id, olderNumHeaders * $sync.HEADER_EST_SIZE_IN_BYTES, splock.ids.splice(numHeaders, olderNumHeaders), splock.headers.splice(numHeaders, olderNumHeaders));
            var newerStartHeader = splock.headers[numHeaders - 1];
            splinfo.count = numHeaders;
            splinfo.estSize = numHeaders * $sync.HEADER_EST_SIZE_IN_BYTES;
            splinfo.startTS = newerStartHeader.date;
            splinfo.startUID = newerStartHeader.id;
            this._dirtyHeaderBlocks[splinfo.blockId] = splock;
            return olderInfo;
        },
        _makeBodyBlock: function ifs__makeBodyBlock(startTS, startUID, endTS, endUID, size, ids, bodies) {
            var blockId = $a64.encodeInt(this._folderImpl.nextBodyBlock++), blockInfo = {
                    blockId: blockId,
                    startTS: startTS,
                    startUID: startUID,
                    endTS: endTS,
                    endUID: endUID,
                    count: ids ? ids.length : 0,
                    estSize: size || 0
                }, block = {
                    ids: ids || [],
                    bodies: bodies || {}
                };
            this._dirty = true;
            this._bodyBlocks[blockId] = block;
            this._dirtyBodyBlocks[blockId] = block;
            if (this._folderImpl.nextBodyBlock % $sync.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS === 0 && !this._messagePurgeScheduled) {
                this._messagePurgeScheduled = true;
                this._account.scheduleMessagePurge(this.folderId);
            }
            return blockInfo;
        },
        _insertBodyInBlock: function ifs__insertBodyInBlock(body, id, info, block) {
            function cmpBodyByID(aID, bID) {
                var aDate = aID === id ? body.date : block.bodies[aID].date, bDate = bID === id ? body.date : block.bodies[bID].date, d = bDate - aDate;
                if (d)
                    return d;
                d = bID - aID;
                return d;
            }
            var idx = bsearchForInsert(block.ids, id, cmpBodyByID);
            block.ids.splice(idx, 0, id);
            block.bodies[id] = body;
            this._dirty = true;
            this._dirtyBodyBlocks[info.blockId] = block;
        },
        _deleteBodyFromBlock: function ifs__deleteBodyFromBlock(id, info, block) {
            var idx = block.ids.indexOf(id);
            var body = block.bodies[id];
            if (idx === -1 || !body) {
                logic(this, 'bodyBlockMissing', {
                    id: id,
                    index: idx,
                    hasBody: !!body
                });
                return;
            }
            block.ids.splice(idx, 1);
            delete block.bodies[id];
            info.estSize -= body.size;
            info.count--;
            this._dirty = true;
            this._dirtyBodyBlocks[info.blockId] = block;
            if (idx === 0 && info.count) {
                info.endUID = id = block.ids[0];
                info.endTS = block.bodies[id].date;
            }
            if (idx === info.count && idx > 0) {
                info.startUID = id = block.ids[idx - 1];
                info.startTS = block.bodies[id].date;
            }
        },
        _splitBodyBlock: function ifs__splitBodyBlock(splinfo, splock, newerTargetBytes) {
            var savedStartTS = splinfo.startTS, savedStartUID = splinfo.startUID;
            var newerBytes = 0, ids = splock.ids, newDict = {}, oldDict = {}, inNew = true, numHeaders = null, i, id, body, idxLast = ids.length - 1;
            for (i = 0; i < idxLast; i++) {
                id = ids[i], body = splock.bodies[id];
                newerBytes += body.size;
                newDict[id] = body;
                if (newerBytes >= newerTargetBytes) {
                    i++;
                    break;
                }
            }
            splinfo.count = numHeaders = i;
            splinfo.startTS = body.date;
            splinfo.startUID = id;
            for (; i < ids.length; i++) {
                id = ids[i];
                oldDict[id] = splock.bodies[id];
            }
            var oldEndUID = ids[numHeaders];
            var olderInfo = this._makeBodyBlock(savedStartTS, savedStartUID, oldDict[oldEndUID].date, oldEndUID, splinfo.estSize - newerBytes, ids.splice(numHeaders, ids.length - numHeaders), oldDict);
            splinfo.estSize = newerBytes;
            splock.bodies = newDict;
            this._dirtyBodyBlocks[splinfo.blockId] = splock;
            return olderInfo;
        },
        flushExcessCachedBlocks: function (debugLabel) {
            var slices = this._slices.filter(function (slice) {
                return slice.type === 'folder';
            });
            function blockIntersectsAnySlice(blockInfo) {
                for (var i = 0; i < slices.length; i++) {
                    var slice = slices[i];
                    if (tupleRangeIntersectsTupleRange(slice, blockInfo)) {
                        return true;
                    }
                }
                return false;
            }
            function maybeDiscard(blockType, blockInfoList, loadedBlockInfos, blockMap, dirtyMap, shouldDiscardFunc) {
                for (var i = loadedBlockInfos.length - 1; i > -1; i--) {
                    var blockInfo = loadedBlockInfos[i];
                    if (dirtyMap.hasOwnProperty(blockInfo.blockId)) {
                        continue;
                    }
                    if (shouldDiscardFunc(blockInfo)) {
                        delete blockMap[blockInfo.blockId];
                        loadedBlockInfos.splice(i, 1);
                    }
                }
            }
            maybeDiscard('header', this._headerBlockInfos, this._loadedHeaderBlockInfos, this._headerBlocks, this._dirtyHeaderBlocks, function (blockInfo) {
                return !blockIntersectsAnySlice(blockInfo);
            });
            var keepCount = slices.length ? 1 : 0, foundCount = 0;
            maybeDiscard('body', this._bodyBlockInfos, this._loadedBodyBlockInfos, this._bodyBlocks, this._dirtyBodyBlocks, function (blockInfo) {
                foundCount += 1;
                return foundCount > keepCount;
            });
        },
        _flushExcessOnTimeout: function () {
            this._flushExcessTimeoutId = 0;
            if (!this.isDead && this._mutexQueue.length === 0) {
                this.flushExcessCachedBlocks('flushExcessOnTimeout');
            }
        },
        _discardCachedBlockUsingDateAndID: function (type, date, id) {
            var scope = logic.subscope(this, {
                type: type,
                date: date,
                id: id
            });
            var blockInfoList, loadedBlockInfoList, blockMap, dirtyMap;
            logic(scope, 'discardFromBlock');
            if (type === 'header') {
                blockInfoList = this._headerBlockInfos;
                loadedBlockInfoList = this._loadedHeaderBlockInfos;
                blockMap = this._headerBlocks;
                dirtyMap = this._dirtyHeaderBlocks;
            } else {
                blockInfoList = this._bodyBlockInfos;
                loadedBlockInfoList = this._loadedBodyBlockInfos;
                blockMap = this._bodyBlocks;
                dirtyMap = this._dirtyBodyBlocks;
            }
            var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList, date, id), iInfo = infoTuple[0], info = infoTuple[1];
            if (!info) {
                logic(scope, 'badDiscardRequest');
                return;
            }
            var blockId = info.blockId;
            if (!blockMap.hasOwnProperty(blockId))
                return;
            if (dirtyMap.hasOwnProperty(blockId)) {
                logic(scope, 'badDiscardRequest');
                return;
            }
            delete blockMap[blockId];
            var idxLoaded = loadedBlockInfoList.indexOf(info);
            if (idxLoaded !== -1)
                loadedBlockInfoList.splice(idxLoaded, 1);
        },
        purgeExcessMessages: function (callback) {
            this._messagePurgeScheduled = false;
            var cutTS = Math.max(this._purge_findLastAccessCutPoint(), this._purge_findHardBlockCutPoint(this._headerBlockInfos), this._purge_findHardBlockCutPoint(this._bodyBlockInfos));
            if (cutTS === 0) {
                callback(0, cutTS);
                return;
            }
            cutTS = quantizeDate(cutTS + DAY_MILLIS);
            var aranges = this._accuracyRanges;
            var splitInfo = this._findFirstObjIndexForDateRange(aranges, cutTS, cutTS);
            if (splitInfo[1]) {
                splitInfo[1].startTS = cutTS;
                aranges.splice(splitInfo[0] + 1, aranges.length - splitInfo[0]);
            } else {
                aranges.splice(splitInfo[0], aranges.length - splitInfo[0]);
            }
            var headerBlockInfos = this._headerBlockInfos, headerBlocks = this._headerBlocks, deletionCount = 0, callActive = false, deleteTriggered = false;
            var deleteNextHeader = function () {
                if (callActive) {
                    deleteTriggered = true;
                    return;
                }
                while (true) {
                    if (!headerBlockInfos.length) {
                        callback(deletionCount, cutTS);
                        return;
                    }
                    var blockInfo = headerBlockInfos[headerBlockInfos.length - 1];
                    if (!this._headerBlocks.hasOwnProperty(blockInfo.blockId)) {
                        this._loadBlock('header', blockInfo, deleteNextHeader);
                        return;
                    }
                    var headerBlock = this._headerBlocks[blockInfo.blockId], lastHeader = headerBlock.headers[headerBlock.headers.length - 1];
                    if (SINCE(lastHeader.date, cutTS)) {
                        callback(deletionCount, cutTS);
                        return;
                    }
                    deleteTriggered = false;
                    callActive = true;
                    deletionCount++;
                    this.deleteMessageHeaderAndBodyUsingHeader(lastHeader, deleteNextHeader);
                    callActive = false;
                    if (!deleteTriggered)
                        return;
                }
            }.bind(this);
            deleteNextHeader();
        },
        _purge_findLastAccessCutPoint: function () {
            var aranges = this._accuracyRanges, cutoffDate = $date.NOW() - $sync.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS;
            var iCutRange;
            for (iCutRange = aranges.length; iCutRange >= 1; iCutRange--) {
                var arange = aranges[iCutRange - 1];
                if (!arange.fullSync)
                    continue;
                if (arange.fullSync.updated > cutoffDate)
                    break;
            }
            if (iCutRange === aranges.length)
                return 0;
            var cutTS = aranges[iCutRange].endTS, syncRangeMS = $sync.SYNC_RANGE_ENUMS_TO_MS[this._account.accountDef.syncRange] || $sync.SYNC_RANGE_ENUMS_TO_MS['auto'], syncHorizonTS = $date.NOW() - syncRangeMS - DAY_MILLIS;
            if (STRICTLY_AFTER(cutTS, syncHorizonTS))
                return syncHorizonTS;
            return cutTS;
        },
        _purge_findHardBlockCutPoint: function (blockInfoList) {
            if (blockInfoList.length <= $sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT)
                return 0;
            return blockInfoList[$sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT].startTS;
        },
        _findRangeObjIndexForDate: function ifs__findRangeObjIndexForDate(list, date) {
            var i;
            for (i = 0; i < list.length; i++) {
                var info = list[i];
                if (SINCE(date, info.endTS))
                    return [
                        i,
                        null
                    ];
                if (SINCE(date, info.startTS))
                    return [
                        i,
                        info
                    ];
            }
            return [
                i,
                null
            ];
        },
        _findRangeObjIndexForDateAndID: function ifs__findRangeObjIndexForDateAndID(list, date, uid) {
            var i;
            for (i = 0; i < list.length; i++) {
                var info = list[i];
                if (STRICTLY_AFTER(date, info.endTS) || date === info.endTS && uid > info.endUID)
                    return [
                        i,
                        null
                    ];
                if (STRICTLY_AFTER(date, info.startTS) || date === info.startTS && uid >= info.startUID)
                    return [
                        i,
                        info
                    ];
            }
            return [
                i,
                null
            ];
        },
        _findFirstObjIndexForDateRange: function ifs__findFirstObjIndexForDateRange(list, startTS, endTS) {
            var i;
            for (i = 0; i < list.length; i++) {
                var info = list[i];
                if (STRICTLY_AFTER(startTS, info.endTS))
                    return [
                        i,
                        null
                    ];
                if (endTS === null || STRICTLY_AFTER(endTS, info.startTS))
                    return [
                        i,
                        info
                    ];
            }
            return [
                i,
                null
            ];
        },
        _findLastObjIndexForDateRange: function ifs__findLastObjIndexForDateRange(list, startTS, endTS) {
            var i;
            for (i = list.length - 1; i >= 0; i--) {
                var info = list[i];
                if (ON_OR_BEFORE(endTS, info.startTS))
                    return [
                        i + 1,
                        null
                    ];
                if (BEFORE(startTS, info.endTS))
                    return [
                        i,
                        info
                    ];
            }
            return [
                0,
                null
            ];
        },
        _findFirstObjForDateRange: function ifs__findFirstObjForDateRange(list, startTS, endTS) {
            var i;
            var dateComparator = endTS === null ? SINCE : IN_BS_DATE_RANGE;
            for (i = 0; i < list.length; i++) {
                var date = list[i].date;
                if (dateComparator(date, startTS, endTS))
                    return [
                        i,
                        list[i]
                    ];
            }
            return [
                i,
                null
            ];
        },
        _insertIntoBlockUsingDateAndUID: function ifs__pickInsertionBlocks(type, date, uid, srvid, estSizeCost, thing, blockPickedCallback) {
            var blockInfoList, loadedBlockInfoList, blockMap, makeBlock, insertInBlock, splitBlock, serverIdBlockMapping;
            if (type === 'header') {
                blockInfoList = this._headerBlockInfos;
                loadedBlockInfoList = this._loadedHeaderBlockInfos;
                blockMap = this._headerBlocks;
                serverIdBlockMapping = this._serverIdHeaderBlockMapping;
                makeBlock = this._bound_makeHeaderBlock;
                insertInBlock = this._bound_insertHeaderInBlock;
                splitBlock = this._bound_splitHeaderBlock;
            } else {
                blockInfoList = this._bodyBlockInfos;
                loadedBlockInfoList = this._loadedBodyBlockInfos;
                blockMap = this._bodyBlocks;
                serverIdBlockMapping = null;
                makeBlock = this._bound_makeBodyBlock;
                insertInBlock = this._bound_insertBodyInBlock;
                splitBlock = this._bound_splitBodyBlock;
            }
            var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList, date, uid), iInfo = infoTuple[0], info = infoTuple[1];
            var updateInfo = {
                startTS: null,
                startUID: null,
                endTS: null,
                endUID: null
            };
            if (!info) {
                if (blockInfoList.length === 0) {
                    info = makeBlock(date, uid, date, uid);
                    blockInfoList.splice(iInfo, 0, info);
                    loadedBlockInfoList.push(info);
                } else if (iInfo < blockInfoList.length && blockInfoList[iInfo].estSize + estSizeCost < $sync.MAX_BLOCK_SIZE) {
                    info = blockInfoList[iInfo];
                    if (STRICTLY_AFTER(date, info.endTS)) {
                        updateInfo.endTS = date;
                        updateInfo.endUID = uid;
                    } else if (date === info.endTS && uid > info.endUID) {
                        updateInfo.endUID = uid;
                    }
                } else if (iInfo > 0 && blockInfoList[iInfo - 1].estSize + estSizeCost < $sync.MAX_BLOCK_SIZE) {
                    info = blockInfoList[--iInfo];
                    if (BEFORE(date, info.startTS)) {
                        updateInfo.startTS = date;
                        updateInfo.startUID = uid;
                    } else if (date === info.startTS && uid < info.startUID) {
                        updateInfo.startUID = uid;
                    }
                } else if (iInfo > 0 && iInfo < blockInfoList.length / 2 || iInfo === blockInfoList.length) {
                    info = blockInfoList[--iInfo];
                    if (BEFORE(date, info.startTS)) {
                        updateInfo.startTS = date;
                        updateInfo.startUID = uid;
                    } else if (date === info.startTS && uid < info.startUID) {
                        updateInfo.startUID = uid;
                    }
                } else {
                    info = blockInfoList[iInfo];
                    if (STRICTLY_AFTER(date, info.endTS)) {
                        updateInfo.endTS = date;
                        updateInfo.endUID = uid;
                    } else if (date === info.endTS && uid > info.endUID) {
                        updateInfo.endUID = uid;
                    }
                }
            }
            function processBlock(block) {
                if (updateInfo.startTS !== null) {
                    info.startTS = updateInfo.startTS;
                }
                if (updateInfo.startUID !== null) {
                    info.startUID = updateInfo.startUID;
                }
                if (updateInfo.endTS !== null) {
                    info.endTS = updateInfo.endTS;
                }
                if (updateInfo.endUID !== null) {
                    info.endUID = updateInfo.endUID;
                }
                info.estSize += estSizeCost;
                info.count++;
                insertInBlock(thing, uid, info, block);
                if (info.count > 1 && info.estSize >= $sync.MAX_BLOCK_SIZE) {
                    var firstBlockTarget;
                    if (iInfo === 0)
                        firstBlockTarget = $sync.BLOCK_SPLIT_SMALL_PART;
                    else if (iInfo === blockInfoList.length - 1)
                        firstBlockTarget = $sync.BLOCK_SPLIT_LARGE_PART;
                    else
                        firstBlockTarget = $sync.BLOCK_SPLIT_EQUAL_PART;
                    var olderInfo;
                    olderInfo = splitBlock(info, block, firstBlockTarget);
                    blockInfoList.splice(iInfo + 1, 0, olderInfo);
                    loadedBlockInfoList.push(olderInfo);
                    if (BEFORE(date, olderInfo.endTS) || date === olderInfo.endTS && uid <= olderInfo.endUID) {
                        iInfo++;
                        info = olderInfo;
                        block = blockMap[info.blockId];
                    }
                }
                if (serverIdBlockMapping && srvid)
                    serverIdBlockMapping[srvid] = info.blockId;
                if (blockPickedCallback) {
                    blockPickedCallback(info, block);
                }
            }
            if (blockMap.hasOwnProperty(info.blockId))
                processBlock.call(this, blockMap[info.blockId]);
            else
                this._loadBlock(type, info, processBlock.bind(this));
        },
        _runDeferredCalls: function ifs__runDeferredCalls() {
            while (this._deferredCalls.length && this._pendingLoads.length === 0) {
                var toCall = this._deferredCalls.shift();
                try {
                    toCall();
                } catch (ex) {
                    logic(this, 'callbackErr', { ex: ex });
                }
            }
        },
        _findBlockInfoFromBlockId: function (type, blockId) {
            var blockInfoList;
            if (type === 'header')
                blockInfoList = this._headerBlockInfos;
            else
                blockInfoList = this._bodyBlockInfos;
            for (var i = 0; i < blockInfoList.length; i++) {
                var blockInfo = blockInfoList[i];
                if (blockInfo.blockId === blockId)
                    return blockInfo;
            }
            return null;
        },
        _loadBlock: function ifs__loadBlock(type, blockInfo, callback) {
            var blockId = blockInfo.blockId;
            var aggrId = type + blockId;
            if (this._pendingLoads.indexOf(aggrId) !== -1) {
                this._pendingLoadListeners[aggrId].push(callback);
                return;
            }
            var index = this._pendingLoads.length;
            this._pendingLoads.push(aggrId);
            this._pendingLoadListeners[aggrId] = [callback];
            var self = this;
            function onLoaded(block) {
                if (!block)
                    logic(self, 'badBlockLoad', {
                        type: type,
                        blockId: blockId
                    });
                logic(self, 'loadBlock_end', {
                    type: type,
                    blockId: blockId,
                    block: block
                });
                if (type === 'header') {
                    self._headerBlocks[blockId] = block;
                    self._loadedHeaderBlockInfos.push(blockInfo);
                } else {
                    self._bodyBlocks[blockId] = block;
                    self._loadedBodyBlockInfos.push(blockInfo);
                }
                self._pendingLoads.splice(self._pendingLoads.indexOf(aggrId), 1);
                var listeners = self._pendingLoadListeners[aggrId];
                delete self._pendingLoadListeners[aggrId];
                for (var i = 0; i < listeners.length; i++) {
                    try {
                        listeners[i](block);
                    } catch (ex) {
                        logic(self, 'callbackErr', { ex: ex });
                    }
                }
                if (self._pendingLoads.length === 0)
                    self._runDeferredCalls();
                if (self._mutexQueue.length === 0 && !self._flushExcessTimeoutId) {
                    self._flushExcessTimeoutId = setTimeout(self._bound_flushExcessOnTimeout, 5000);
                }
            }
            logic(this, 'loadBlock_begin', {
                type: type,
                blockId: blockId
            });
            if (type === 'header')
                this._imapDb.loadHeaderBlock(this.folderId, blockId, onLoaded);
            else
                this._imapDb.loadBodyBlock(this.folderId, blockId, onLoaded);
        },
        _deleteFromBlock: function ifs__deleteFromBlock(type, date, id, callback) {
            var blockInfoList, loadedBlockInfoList, blockMap, deleteFromBlock;
            var scope = logic.subscope(this, {
                type: type,
                date: date,
                id: id
            });
            logic(scope, 'deleteFromBlock');
            if (type === 'header') {
                blockInfoList = this._headerBlockInfos;
                loadedBlockInfoList = this._loadedHeaderBlockInfos;
                blockMap = this._headerBlocks;
                deleteFromBlock = this._bound_deleteHeaderFromBlock;
            } else {
                blockInfoList = this._bodyBlockInfos;
                loadedBlockInfoList = this._loadedBodyBlockInfos;
                blockMap = this._bodyBlocks;
                deleteFromBlock = this._bound_deleteBodyFromBlock;
            }
            var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList, date, id), iInfo = infoTuple[0], info = infoTuple[1];
            if (!info) {
                log('badDeletionRequest');
                return;
            }
            function processBlock(block) {
                deleteFromBlock(id, info, block);
                if (info.count === 0) {
                    blockInfoList.splice(iInfo, 1);
                    delete blockMap[info.blockId];
                    loadedBlockInfoList.splice(loadedBlockInfoList.indexOf(info), 1);
                    this._dirty = true;
                    if (type === 'header')
                        this._dirtyHeaderBlocks[info.blockId] = null;
                    else
                        this._dirtyBodyBlocks[info.blockId] = null;
                }
                if (callback)
                    callback();
            }
            if (blockMap.hasOwnProperty(info.blockId))
                processBlock.call(this, blockMap[info.blockId]);
            else
                this._loadBlock(type, info, processBlock.bind(this));
        },
        sliceOpenSearch: function fs_sliceOpenSearch(slice) {
            this._slices.push(slice);
        },
        sliceOpenMostRecent: function fs_sliceOpenMostRecent(slice, forceRefresh) {
            slice.setStatus('synchronizing', false, true, false, SYNC_START_MINIMUM_PROGRESS);
            var sliceFn = this._sliceOpenMostRecent.bind(this, slice, forceRefresh);
            if (this.isLocalOnly) {
                sliceFn(function fakeReleaseMutex() {
                });
            } else {
                this.runMutexed('sync', sliceFn);
            }
        },
        _sliceOpenMostRecent: function fs__sliceOpenMostRecent(slice, forceRefresh, releaseMutex) {
            this._slices.push(slice);
            slice.headerCount = this.headerCount;
            var doneCallback = function doneSyncCallback(err, reportSyncStatusAs, moreExpected) {
                if (!reportSyncStatusAs) {
                    if (err)
                        reportSyncStatusAs = 'syncfailed';
                    else
                        reportSyncStatusAs = 'synced';
                }
                if (moreExpected === undefined)
                    moreExpected = false;
                slice.waitingOnData = false;
                slice.setStatus(reportSyncStatusAs, true, moreExpected, true);
                this._curSyncSlice = null;
                releaseMutex(err);
            }.bind(this);
            if (this._accuracyRanges.length || this.isLocalOnly) {
                var triggerRefresh;
                if (this._account.universe.online && this.folderSyncer.syncable && !this.isLocalOnly) {
                    if (forceRefresh)
                        triggerRefresh = 'force';
                    else
                        triggerRefresh = true;
                } else {
                    triggerRefresh = false;
                }
                slice.waitingOnData = 'db';
                this.getMessagesInImapDateRange(0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE, this.onFetchDBHeaders.bind(this, slice, triggerRefresh, doneCallback, releaseMutex));
                return;
            }
            if (!this._account.universe.online || this.isLocalOnly) {
                doneCallback();
                return;
            }
            if (!this.folderSyncer.syncable) {
                console.log('Synchronization is currently blocked; waiting...');
                doneCallback(null, 'syncblocked', true);
                return;
            }
            var progressCallback = slice.setSyncProgress.bind(slice);
            var syncCallback = function syncCallback(syncMode, ignoreHeaders) {
                slice.waitingOnData = syncMode;
                if (ignoreHeaders) {
                    slice.ignoreHeaders = true;
                }
                this._curSyncSlice = slice;
                slice.headerCount = this.headerCount;
            }.bind(this);
            slice._updateSliceFlags();
            this.folderSyncer.initialSync(slice, $sync.INITIAL_SYNC_DAYS, syncCallback, doneCallback, progressCallback);
        },
        growSlice: function ifs_growSlice(slice, dirMagnitude, userRequestsGrowth) {
            if (userRequestsGrowth)
                slice.setStatus('synchronizing', false, true, false, SYNC_START_MINIMUM_PROGRESS);
            this.runMutexed('grow', this._growSlice.bind(this, slice, dirMagnitude, userRequestsGrowth));
        },
        _growSlice: function ifs__growSlice(slice, dirMagnitude, userRequestsGrowth, releaseMutex) {
            var dir, desiredCount;
            var batchHeaders = [];
            var gotMessages = function gotMessages(headers, moreExpected) {
                if (headers.length === 0) {
                }
                if (dir === PASTWARDS) {
                    batchHeaders = batchHeaders.concat(headers);
                } else {
                    batchHeaders = headers.concat(batchHeaders);
                }
                if (moreExpected)
                    return;
                var doneCallback = function doneGrowCallback(err) {
                    slice.desiredHeaders = slice.headers.length;
                    slice.waitingOnData = false;
                    slice.setStatus(err ? 'syncfailed' : 'synced', true, false, true);
                    this._curSyncSlice = null;
                    releaseMutex(err);
                }.bind(this);
                var progressCallback = slice.setSyncProgress.bind(slice);
                if (batchHeaders.length) {
                    var refreshInterval;
                    if (!this._account.universe.online || !this._account.enabled || !this.folderSyncer.canGrowSync) {
                        refreshInterval = null;
                    } else {
                        var highestLegalEndTS;
                        var openEndTS = false;
                        var startTS, endTS;
                        if (dir === PASTWARDS) {
                            var oldestHeader = batchHeaders[batchHeaders.length - 1];
                            highestLegalEndTS = NOW() - $sync.OPEN_REFRESH_THRESH_MS;
                            endTS = slice.startTS + $date.DAY_MILLIS;
                            if (this.headerIsOldestKnown(oldestHeader.date, oldestHeader.id)) {
                                startTS = this.getOldestFullSyncDate();
                            } else {
                                startTS = oldestHeader.date - $sync.IMAP_SEARCH_AMBIGUITY_MS;
                            }
                        } else {
                            highestLegalEndTS = NOW() - $sync.GROW_REFRESH_THRESH_MS;
                            var youngestHeader = batchHeaders[0];
                            startTS = slice.endTS;
                            endTS = youngestHeader.date + $date.DAY_MILLIS;
                        }
                        if (STRICTLY_AFTER(endTS, highestLegalEndTS)) {
                            endTS = highestLegalEndTS;
                            openEndTS = true;
                        } else {
                            endTS = quantizeDate(endTS);
                        }
                        if (SINCE(startTS, endTS))
                            refreshInterval = null;
                        else
                            refreshInterval = this.checkAccuracyCoverageNeedingRefresh(quantizeDate(startTS), endTS, $sync.GROW_REFRESH_THRESH_MS);
                    }
                    slice.batchAppendHeaders(batchHeaders, dir === PASTWARDS ? -1 : 0, true);
                    slice.desiredHeaders = Math.max(slice.headers.length, desiredCount);
                    if (refreshInterval && refreshInterval.startTS !== refreshInterval.endTS) {
                        if (!userRequestsGrowth)
                            slice.setStatus('synchronizing', false, true, false, SYNC_START_MINIMUM_PROGRESS);
                        this.folderSyncer.refreshSync(slice, dir, quantizeDate(refreshInterval.startTS), openEndTS && refreshInterval.endTS === highestLegalEndTS ? null : quantizeDateUp(refreshInterval.endTS), null, doneCallback, progressCallback);
                    } else {
                        doneCallback();
                    }
                    return;
                }
                if (!this._account.universe.online || !this.folderSyncer.canGrowSync || !userRequestsGrowth) {
                    if (this.folderSyncer.syncable)
                        slice.sendEmptyCompletion();
                    releaseMutex(null);
                    return;
                }
                if (!userRequestsGrowth)
                    slice.setStatus('synchronizing', false, true, false, SYNC_START_MINIMUM_PROGRESS);
                this._curSyncSlice = slice;
                slice.headerCount = this.headerCount;
                slice.waitingOnData = 'grow';
                slice.desiredHeaders += desiredCount;
                this.folderSyncer.growSync(slice, dir, dir === PASTWARDS ? quantizeDate(slice.startTS) : quantizeDate(slice.endTS + $date.DAY_MILLIS), $sync.INITIAL_SYNC_GROWTH_DAYS, doneCallback, progressCallback);
            }.bind(this);
            if (this._mutexQueue.length === 0) {
                this.flushExcessCachedBlocks('grow');
            }
            if (dirMagnitude < 0) {
                dir = FUTUREWARDS;
                desiredCount = -dirMagnitude;
                this.getMessagesAfterMessage(slice.endTS, slice.endUID, desiredCount, gotMessages);
            } else {
                dir = PASTWARDS;
                desiredCount = dirMagnitude;
                this.getMessagesBeforeMessage(slice.startTS, slice.startUID, desiredCount, gotMessages);
            }
        },
        sliceShrunk: function fs_sliceShrunk(slice) {
            if (this._mutexQueue.length === 0)
                this.flushExcessCachedBlocks('shrunk');
        },
        refreshSlice: function fs_refreshSlice(slice) {
            slice.setStatus('synchronizing', false, true, false, 0);
            var refreshFn = this._refreshSlice.bind(this, slice, false);
            if (this.isLocalOnly) {
                refreshFn(function fakeReleaseMutex() {
                });
            } else {
                this.runMutexed('refresh', refreshFn);
            }
        },
        _refreshSlice: function fs__refreshSlice(slice, checkOpenRecency, releaseMutex) {
            var doneCallback = function refreshDoneCallback(err, bisectInfo, numMessages) {
                slice._onAddingHeader = null;
                var reportSyncStatusAs = 'synced';
                switch (err) {
                case 'aborted':
                case 'unknown':
                    reportSyncStatusAs = 'syncfailed';
                    break;
                }
                releaseMutex(err);
                slice.waitingOnData = false;
                slice.setStatus(reportSyncStatusAs, true, false, false, null, newEmailCount);
                return undefined;
            }.bind(this);
            if (slice.isDead) {
                console.log('MailSlice: Attempted to refresh a dead slice.');
                doneCallback('unknown');
                return;
            }
            slice.waitingOnData = 'refresh';
            var startTS = slice.startTS, endTS = slice.endTS, origStartTS = null, newEmailCount = null;
            if (this.headerIsYoungestKnown(endTS, slice.endUID)) {
                var prevTS = endTS;
                newEmailCount = 0;
                slice._onAddingHeader = function (header, currentSlice) {
                    if (SINCE(header.date, prevTS) && (!header.flags || header.flags.indexOf('\\Seen') === -1)) {
                        newEmailCount += 1;
                        if (slice.onNewHeader)
                            slice.onNewHeader(header);
                    }
                }.bind(this);
                endTS = null;
            } else {
                endTS = quantizeDate(endTS + DAY_MILLIS);
            }
            if (this.headerIsOldestKnown(startTS, slice.startUID)) {
                origStartTS = quantizeDate(startTS);
                startTS = this.getOldestFullSyncDate();
            } else {
                startTS -= $sync.IMAP_SEARCH_AMBIGUITY_MS;
            }
            if (startTS)
                startTS = quantizeDate(startTS);
            if (checkOpenRecency) {
                if (this.checkAccuracyCoverageNeedingRefresh(startTS, endTS || NOW() - $sync.OPEN_REFRESH_THRESH_MS, $sync.OPEN_REFRESH_THRESH_MS) === null) {
                    doneCallback();
                    return;
                }
            }
            this.folderSyncer.refreshSync(slice, FUTUREWARDS, startTS, endTS, origStartTS, doneCallback, slice.setSyncProgress.bind(slice));
        },
        _resetAndResyncSlice: function (slice, forceRefresh, releaseMutex) {
            this._slices.splice(this._slices.indexOf(slice), 1);
            if (releaseMutex)
                this._sliceOpenMostRecent(slice, forceRefresh, releaseMutex);
            else
                this.sliceOpenMostRecent(slice, forceRefresh);
        },
        dyingSlice: function ifs_dyingSlice(slice) {
            var idx = this._slices.indexOf(slice);
            this._slices.splice(idx, 1);
            if (slice.type === 'folder') {
                this.flushExcessCachedBlocks('deadslice');
            }
            if (this._slices.length === 0 && this._mutexQueue.length === 0) {
                this.folderSyncer.allConsumersDead();
            }
        },
        onFetchDBHeaders: function (slice, triggerRefresh, doneCallback, releaseMutex, headers, moreMessagesComing) {
            var triggerNow = false;
            if (!moreMessagesComing && triggerRefresh) {
                moreMessagesComing = true;
                triggerNow = true;
            }
            slice.batchAppendHeaders(headers, -1, true);
            if (!moreMessagesComing) {
                slice.desiredHeaders = slice.headers.length;
                doneCallback();
            } else if (triggerNow) {
                slice.desiredHeaders = slice.headers.length;
                this._curSyncSlice = null;
                var checkOpenRecency = triggerRefresh !== 'force';
                this._refreshSlice(slice, checkOpenRecency, releaseMutex);
            }
        },
        sliceQuicksearch: function ifs_sliceQuicksearch(slice, searchParams) {
        },
        getYoungestMessageTimestamp: function () {
            if (!this._headerBlockInfos.length)
                return 0;
            return this._headerBlockInfos[0].endTS;
        },
        headerIsYoungestKnown: function (date, uid) {
            if (!this._headerBlockInfos.length)
                return date === null && uid === null;
            var blockInfo = this._headerBlockInfos[0];
            return date === blockInfo.endTS && uid === blockInfo.endUID;
        },
        getOldestMessageTimestamp: function () {
            if (!this._headerBlockInfos.length)
                return 0;
            return this._headerBlockInfos[this._headerBlockInfos.length - 1].startTS;
        },
        headerIsOldestKnown: function (date, uid) {
            if (!this._headerBlockInfos.length)
                return date === null && uid === null;
            var blockInfo = this._headerBlockInfos[this._headerBlockInfos.length - 1];
            return date === blockInfo.startTS && uid === blockInfo.startUID;
        },
        getNewestFullSyncDate: function () {
            if (this._accuracyRanges.length)
                return this._accuracyRanges[0].endTS;
            return 0;
        },
        getOldestFullSyncDate: function () {
            var idxAR = this._accuracyRanges.length - 1;
            while (idxAR >= 0 && !this._accuracyRanges[idxAR].fullSync) {
                idxAR--;
            }
            var syncTS;
            if (idxAR >= 0)
                syncTS = this._accuracyRanges[idxAR].startTS;
            else
                syncTS = NOW();
            return syncTS;
        },
        syncedToToday: function () {
            if (!this.folderSyncer.canGrowSync)
                return true;
            var newestSyncTS = this.getNewestFullSyncDate();
            return SINCE(newestSyncTS, quantizeDate(NOW()));
        },
        syncedToDawnOfTime: function () {
            if (!this.folderSyncer.canGrowSync)
                return true;
            var oldestSyncTS = this.getOldestFullSyncDate();
            return ON_OR_BEFORE(oldestSyncTS, $sync.OLDEST_SYNC_DATE + $date.DAY_MILLIS);
        },
        getKnownMessageCount: function () {
            var count = 0;
            for (var i = 0; i < this._headerBlockInfos.length; i++) {
                var blockInfo = this._headerBlockInfos[i];
                count += blockInfo.count;
            }
            return count;
        },
        getMessagesInImapDateRange: function ifs_getMessagesInDateRange(startTS, endTS, minDesired, maxDesired, messageCallback) {
            var toFill = minDesired != null ? minDesired : $sync.TOO_MANY_MESSAGES, maxFill = maxDesired != null ? maxDesired : $sync.TOO_MANY_MESSAGES, self = this, iHeadBlockInfo = null, headBlockInfo;
            var headerPair = this._findFirstObjIndexForDateRange(this._headerBlockInfos, startTS, endTS);
            iHeadBlockInfo = headerPair[0];
            headBlockInfo = headerPair[1];
            if (!headBlockInfo) {
                messageCallback([], false);
                return;
            }
            function fetchMore() {
                while (true) {
                    if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
                        self._loadBlock('header', headBlockInfo, fetchMore);
                        return;
                    }
                    var headerBlock = self._headerBlocks[headBlockInfo.blockId];
                    var headerTuple = self._findFirstObjForDateRange(headerBlock.headers, startTS, endTS), iFirstHeader = headerTuple[0], header = headerTuple[1];
                    if (!header) {
                        messageCallback([], false);
                        return;
                    }
                    var iHeader = iFirstHeader;
                    for (; iHeader < headerBlock.headers.length && maxFill; iHeader++, maxFill--) {
                        header = headerBlock.headers[iHeader];
                        if (BEFORE(header.date, startTS))
                            break;
                    }
                    if (maxFill && iHeader < headerBlock.headers.length)
                        toFill = 0;
                    else
                        toFill -= iHeader - iFirstHeader;
                    if (!toFill) {
                    } else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
                        toFill = 0;
                    } else {
                        headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
                        if (STRICTLY_AFTER(startTS, headBlockInfo.endTS))
                            toFill = 0;
                    }
                    messageCallback(headerBlock.headers.slice(iFirstHeader, iHeader), Boolean(toFill));
                    if (!toFill)
                        return;
                }
            }
            fetchMore();
        },
        getAllMessagesInImapDateRange: function ifs_getAllMessagesInDateRange(startTS, endTS, allCallback) {
            var allHeaders = null;
            function someMessages(headers, moreHeadersExpected) {
                if (allHeaders)
                    allHeaders = allHeaders.concat(headers);
                else
                    allHeaders = headers;
                if (!moreHeadersExpected)
                    allCallback(allHeaders);
            }
            this.getMessagesInImapDateRange(startTS, endTS, null, null, someMessages);
        },
        getMessagesBeforeMessage: function (date, id, limit, messageCallback) {
            var toFill = limit != null ? limit : $sync.TOO_MANY_MESSAGES, self = this;
            var headerPair, iHeadBlockInfo, headBlockInfo;
            if (date) {
                headerPair = this._findRangeObjIndexForDateAndID(this._headerBlockInfos, date, id);
                iHeadBlockInfo = headerPair[0];
                headBlockInfo = headerPair[1];
            } else {
                iHeadBlockInfo = 0;
                headBlockInfo = this._headerBlockInfos[0];
            }
            if (!headBlockInfo) {
                if (iHeadBlockInfo < this._headerBlockInfos.length) {
                    headBlockInfo = this._headerBlockInfos[iHeadBlockInfo];
                } else {
                    messageCallback([], false);
                    return;
                }
            }
            var iHeader = null;
            function fetchMore() {
                while (true) {
                    if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
                        self._loadBlock('header', headBlockInfo, fetchMore);
                        return;
                    }
                    var headerBlock = self._headerBlocks[headBlockInfo.blockId];
                    if (iHeader === null) {
                        if (id != null) {
                            iHeader = bsearchForInsert(headerBlock.headers, {
                                date: date,
                                id: id
                            }, cmpHeaderYoungToOld);
                            if (headerBlock.ids[iHeader] === id) {
                                iHeader++;
                            } else {
                            }
                        } else {
                            iHeader = 1;
                        }
                    } else {
                        iHeader = 0;
                    }
                    var useHeaders = Math.min(headerBlock.headers.length - iHeader, toFill);
                    if (iHeader >= headerBlock.headers.length)
                        useHeaders = 0;
                    toFill -= useHeaders;
                    if (!toFill) {
                    } else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
                        toFill = 0;
                    } else {
                        headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
                    }
                    messageCallback(headerBlock.headers.slice(iHeader, iHeader + useHeaders), Boolean(toFill));
                    if (!toFill)
                        return;
                }
            }
            fetchMore();
        },
        getMessagesAfterMessage: function (date, id, limit, messageCallback) {
            var toFill = limit != null ? limit : $sync.TOO_MANY_MESSAGES, self = this;
            var headerPair = this._findRangeObjIndexForDateAndID(this._headerBlockInfos, date, id);
            var iHeadBlockInfo = headerPair[0];
            var headBlockInfo = headerPair[1];
            var scope = logic.subscope(this, {
                date: date,
                id: id
            });
            if (!headBlockInfo) {
                logic(scope, 'badIterationStart');
                messageCallback([], false);
                return;
            }
            var iHeader = null;
            function fetchMore() {
                while (true) {
                    if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
                        self._loadBlock('header', headBlockInfo, fetchMore);
                        return;
                    }
                    var headerBlock = self._headerBlocks[headBlockInfo.blockId];
                    if (iHeader === null) {
                        iHeader = headerBlock.ids.indexOf(id);
                        if (iHeader === -1) {
                            logic(scope, 'badIterationStart');
                            toFill = 0;
                        }
                        iHeader--;
                    } else {
                        iHeader = headerBlock.headers.length - 1;
                    }
                    var useHeaders = Math.min(iHeader + 1, toFill);
                    if (iHeader < 0)
                        useHeaders = 0;
                    toFill -= useHeaders;
                    if (!toFill) {
                    } else if (--iHeadBlockInfo < 0) {
                        toFill = 0;
                    } else {
                        headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
                    }
                    var messages = headerBlock.headers.slice(iHeader - useHeaders + 1, iHeader + 1);
                    messageCallback(messages, Boolean(toFill));
                    if (!toFill)
                        return;
                }
            }
            fetchMore();
        },
        markSyncRange: function (startTS, endTS, modseq, updated) {
            if (!endTS)
                endTS = NOW();
            if (startTS > endTS)
                throw new Error('Your timestamps are switched!');
            var aranges = this._accuracyRanges;
            function makeRange(start, end, modseq, updated) {
                return {
                    startTS: start,
                    endTS: end,
                    fullSync: typeof modseq === 'string' ? {
                        highestModseq: modseq,
                        updated: updated
                    } : {
                        highestModseq: modseq.fullSync.highestModseq,
                        updated: modseq.fullSync.updated
                    }
                };
            }
            var newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS), oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS), newSplits, oldSplits;
            newSplits = newInfo[1] && STRICTLY_AFTER(newInfo[1].endTS, endTS);
            oldSplits = oldInfo[1] && BEFORE(oldInfo[1].startTS, startTS);
            var insertions = [], delCount = oldInfo[0] - newInfo[0];
            if (oldInfo[1])
                delCount++;
            if (newSplits) {
                if (newInfo[1].fullSync && newInfo[1].fullSync.highestModseq === modseq && newInfo[1].fullSync.updated === updated)
                    endTS = newInfo[1].endTS;
                else
                    insertions.push(makeRange(endTS, newInfo[1].endTS, newInfo[1]));
            }
            insertions.push(makeRange(startTS, endTS, modseq, updated));
            if (oldSplits) {
                if (oldInfo[1].fullSync && oldInfo[1].fullSync.highestModseq === modseq && oldInfo[1].fullSync.updated === updated)
                    insertions[insertions.length - 1].startTS = oldInfo[1].startTS;
                else
                    insertions.push(makeRange(oldInfo[1].startTS, startTS, oldInfo[1]));
            }
            var newNeighbor = newInfo[0] > 0 ? aranges[newInfo[0] - 1] : null, oldAdjust = oldInfo[1] ? 1 : 0, oldNeighbor = oldInfo[0] < aranges.length - oldAdjust ? aranges[oldInfo[0] + oldAdjust] : null;
            if (newNeighbor && insertions[0].endTS === newNeighbor.startTS && newNeighbor.fullSync && newNeighbor.fullSync.highestModseq === modseq && newNeighbor.fullSync.updated === updated) {
                insertions[0].endTS = newNeighbor.endTS;
                newInfo[0]--;
                delCount++;
            }
            if (oldNeighbor && insertions[insertions.length - 1].startTS === oldNeighbor.endTS && oldNeighbor.fullSync && oldNeighbor.fullSync.highestModseq === modseq && oldNeighbor.fullSync.updated === updated) {
                insertions[insertions.length - 1].startTS = oldNeighbor.startTS;
                delCount++;
            }
            aranges.splice.apply(aranges, [
                newInfo[0],
                delCount
            ].concat(insertions));
            this.folderMeta.lastSyncedAt = NOW();
            this._dirty = true;
        },
        markSyncedToDawnOfTime: function () {
            logic(this, 'syncedToDawnOfTime');
            var aranges = this._accuracyRanges;
            aranges[aranges.length - 1].startTS = $sync.OLDEST_SYNC_DATE;
            this.folderMeta.lastSyncedAt = NOW();
            this._dirty = true;
        },
        clearSyncedToDawnOfTime: function (newOldestTS) {
            var aranges = this._accuracyRanges;
            if (!aranges.length)
                return;
            var lastRange = aranges[aranges.length - 1];
            if (STRICTLY_AFTER(lastRange.endTS, newOldestTS)) {
                lastRange.startTS = newOldestTS;
            } else {
                logic(this, 'accuracyRangeSuspect', { lastRange: lastRange });
                aranges.pop();
            }
        },
        checkAccuracyCoverageNeedingRefresh: function (startTS, endTS, threshMS) {
            var aranges = this._accuracyRanges, arange, newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS), oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS), recencyCutoff = NOW() - threshMS;
            var result = {
                startTS: startTS,
                endTS: endTS
            };
            if (newInfo[1]) {
                var i;
                for (i = newInfo[0]; i <= oldInfo[0]; i++) {
                    arange = aranges[i];
                    if (BEFORE(arange.endTS, result.endTS))
                        break;
                    if (!arange.fullSync || BEFORE(arange.fullSync.updated, recencyCutoff))
                        break;
                    if (ON_OR_BEFORE(arange.startTS, result.startTS))
                        return null;
                    result.endTS = arange.startTS;
                }
                for (i = oldInfo[0]; i >= 0; i--) {
                    arange = aranges[i];
                    if (STRICTLY_AFTER(arange.startTS, result.startTS))
                        break;
                    if (!arange.fullSync || BEFORE(arange.fullSync.updated, recencyCutoff))
                        break;
                    result.startTS = arange.endTS;
                }
            }
            return result;
        },
        getMessage: function (suid, date, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = undefined;
            }
            var header;
            var body;
            var pending = 2;
            function next() {
                if (!--pending) {
                    if (!body || !header) {
                        return callback(null);
                    }
                    callback({
                        header: header,
                        body: body
                    });
                }
            }
            this.getMessageHeader(suid, date, function (_header) {
                header = _header;
                next();
            });
            var gotBody = function gotBody(_body) {
                body = _body;
                next();
            };
            if (options && options.withBodyReps) {
                this.getMessageBodyWithReps(suid, date, gotBody);
            } else {
                this.getMessageBody(suid, date, gotBody);
            }
        },
        getMessageHeader: function ifs_getMessageHeader(suid, date, callback) {
            var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)), posInfo = this._findRangeObjIndexForDateAndID(this._headerBlockInfos, date, id);
            if (posInfo[1] === null) {
                logic(this, 'headerNotFound');
                try {
                    callback(null);
                } catch (ex) {
                    logic(this, 'callbackErr', { ex: ex });
                }
                return;
            }
            var headerBlockInfo = posInfo[1], self = this;
            if (!this._headerBlocks.hasOwnProperty(headerBlockInfo.blockId)) {
                this._loadBlock('header', headerBlockInfo, function (headerBlock) {
                    var idx = headerBlock.ids.indexOf(id);
                    var headerInfo = headerBlock.headers[idx] || null;
                    if (!headerInfo)
                        logic(self, 'headerNotFound');
                    try {
                        callback(headerInfo);
                    } catch (ex) {
                        logic(self, 'callbackErr', { ex: ex });
                    }
                });
                return;
            }
            var block = this._headerBlocks[headerBlockInfo.blockId], idx = block.ids.indexOf(id), headerInfo = block.headers[idx] || null;
            if (!headerInfo)
                logic(this, 'headerNotFound');
            try {
                callback(headerInfo);
            } catch (ex) {
                logic(this, 'callbackErr', { ex: ex });
            }
        },
        getMessageHeaders: function ifs_getMessageHeaders(namers, callback) {
            var pending = namers.length;
            var headers = [];
            var gotHeader = function gotHeader(header) {
                if (header) {
                    headers.push(header);
                }
                if (!--pending) {
                    callback(headers);
                }
            };
            for (var i = 0; i < namers.length; i++) {
                var namer = namers[i];
                this.getMessageHeader(namer.suid, namer.date, gotHeader);
            }
        },
        addMessageHeader: function ifs_addMessageHeader(header, body, callback) {
            if (header.id == null || header.suid == null) {
                throw new Error('No valid id: ' + header.id + ' or suid: ' + header.suid);
            }
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.addMessageHeader.bind(this, header, body, callback));
                return;
            }
            if (header.flags && header.flags.indexOf('\\Seen') === -1) {
                this.folderMeta.unreadCount++;
            }
            logic(this, 'addMessageHeader', {
                date: header.date,
                id: header.id,
                srvid: header.srvid
            });
            this.headerCount += 1;
            if (this._curSyncSlice) {
                this._curSyncSlice.headerCount = this.headerCount;
                if (!this._curSyncSlice.ignoreHeaders) {
                    this._curSyncSlice.onHeaderAdded(header, body, true, true);
                }
            }
            if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
                var date = header.date, uid = header.id;
                for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
                    var slice = this._slices[iSlice];
                    if (slice === this._curSyncSlice) {
                        continue;
                    }
                    if (slice.type === 'folder') {
                        slice.headerCount = this.headerCount;
                    }
                    if (slice.startTS !== null) {
                        if (BEFORE(date, slice.startTS)) {
                            if (slice.headers.length >= slice.desiredHeaders) {
                                continue;
                            }
                        } else if (SINCE(date, slice.endTS)) {
                            if (!(this._headerBlockInfos.length && slice.endTS === this._headerBlockInfos[0].endTS && slice.endUID === this._headerBlockInfos[0].endUID))
                                continue;
                        } else if (date === slice.startTS && uid < slice.startUID || date === slice.endTS && uid > slice.endUID) {
                            continue;
                        }
                    } else {
                        slice.desiredHeaders++;
                    }
                    if (slice._onAddingHeader) {
                        try {
                            slice._onAddingHeader(header);
                        } catch (ex) {
                            logic(this, 'callbackErr', { ex: ex });
                        }
                    }
                    try {
                        slice.onHeaderAdded(header, body, false, true);
                    } catch (ex) {
                        logic(this, 'callbackErr', { ex: ex });
                    }
                }
            }
            this._insertIntoBlockUsingDateAndUID('header', header.date, header.id, header.srvid, $sync.HEADER_EST_SIZE_IN_BYTES, header, callback);
        },
        updateMessageHeader: function ifs_updateMessageHeader(date, id, partOfSync, headerOrMutationFunc, body, callback, opts) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.updateMessageHeader.bind(this, date, id, partOfSync, headerOrMutationFunc, body, callback));
                return;
            }
            var infoTuple = this._findRangeObjIndexForDateAndID(this._headerBlockInfos, date, id), iInfo = infoTuple[0], info = infoTuple[1], self = this;
            function doUpdateHeader(block) {
                var idx = block.ids.indexOf(id), header;
                if (idx === -1) {
                    if (headerOrMutationFunc instanceof Function)
                        headerOrMutationFunc(null);
                    else
                        throw new Error('Failed to find ID ' + id + '!');
                } else if (headerOrMutationFunc instanceof Function) {
                    if (!headerOrMutationFunc(header = block.headers[idx]))
                        header = null;
                } else {
                    header = block.headers[idx] = headerOrMutationFunc;
                }
                if (header) {
                    self._dirty = true;
                    self._dirtyHeaderBlocks[info.blockId] = block;
                    logic(self, 'updateMessageHeader', {
                        date: header.date,
                        id: header.id,
                        srvid: header.srvid
                    });
                    if (self._slices.length > (self._curSyncSlice ? 1 : 0)) {
                        for (var iSlice = 0; iSlice < self._slices.length; iSlice++) {
                            var slice = self._slices[iSlice];
                            if (partOfSync && slice === self._curSyncSlice)
                                continue;
                            if (opts && opts.silent) {
                                continue;
                            }
                            if (BEFORE(date, slice.startTS) || STRICTLY_AFTER(date, slice.endTS))
                                continue;
                            if (date === slice.startTS && id < slice.startUID || date === slice.endTS && id > slice.endUID)
                                continue;
                            try {
                                slice.onHeaderModified(header, body);
                            } catch (ex) {
                                logic(this, 'callbackErr', { ex: ex });
                            }
                        }
                    }
                }
                if (callback)
                    callback();
            }
            if (!info) {
                if (headerOrMutationFunc instanceof Function)
                    headerOrMutationFunc(null);
                else
                    throw new Error('Failed to find block containing header with date: ' + date + ' id: ' + id);
            } else if (!this._headerBlocks.hasOwnProperty(info.blockId))
                this._loadBlock('header', info, doUpdateHeader);
            else
                doUpdateHeader(this._headerBlocks[info.blockId]);
        },
        updateMessageHeaderByServerId: function (srvid, partOfSync, headerOrMutationFunc, body, callback) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.updateMessageHeaderByServerId.bind(this, srvid, partOfSync, headerOrMutationFunc, body, callback));
                return;
            }
            var blockId = this._serverIdHeaderBlockMapping[srvid];
            if (srvid === undefined) {
                logic(this, 'serverIdMappingMissing', { srvid: srvid });
                return;
            }
            var findInBlock = function findInBlock(headerBlock) {
                var headers = headerBlock.headers;
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    if (header.srvid === srvid) {
                        this.updateMessageHeader(header.date, header.id, partOfSync, headerOrMutationFunc, body, callback);
                        return;
                    }
                }
            }.bind(this);
            if (this._headerBlocks.hasOwnProperty(blockId)) {
                findInBlock(this._headerBlocks[blockId]);
            } else {
                var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
                this._loadBlock('header', blockInfo, findInBlock);
            }
        },
        unchangedMessageHeader: function ifs_unchangedMessageHeader(header) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.unchangedMessageHeader.bind(this, header));
                return;
            }
            if (this._curSyncSlice && !this._curSyncSlice.ignoreHeaders)
                this._curSyncSlice.onHeaderAdded(header, true, false);
        },
        hasMessageWithServerId: function (srvid) {
            if (!this._serverIdHeaderBlockMapping)
                throw new Error('Server ID mapping not supported for this storage!');
            var blockId = this._serverIdHeaderBlockMapping[srvid];
            if (srvid === undefined) {
                logic(this, 'serverIdMappingMissing', { srvid: srvid });
                return false;
            }
            return !!blockId;
        },
        deleteMessageHeaderAndBody: function (suid, date, callback) {
            this.getMessageHeader(suid, date, function (header) {
                if (header)
                    this.deleteMessageHeaderAndBodyUsingHeader(header, callback);
                else
                    callback();
            }.bind(this));
        },
        deleteMessageHeaderUsingHeader: function (header, callback) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.deleteMessageHeaderUsingHeader.bind(this, header, callback));
                return;
            }
            this.headerCount -= 1;
            if (this._curSyncSlice) {
                this._curSyncSlice.headerCount = this.headerCount;
                if (!this._curSyncSlice.ignoreHeaders) {
                    this._curSyncSlice.onHeaderRemoved(header);
                }
            }
            if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
                for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
                    var slice = this._slices[iSlice];
                    if (slice.type === 'folder') {
                        slice.headerCount = this.headerCount;
                    }
                    if (slice === this._curSyncSlice)
                        continue;
                    if (BEFORE(header.date, slice.startTS) || STRICTLY_AFTER(header.date, slice.endTS))
                        continue;
                    if (header.date === slice.startTS && header.id < slice.startUID || header.date === slice.endTS && header.id > slice.endUID)
                        continue;
                    slice.onHeaderRemoved(header);
                }
            }
            if (this._serverIdHeaderBlockMapping && header.srvid)
                delete this._serverIdHeaderBlockMapping[header.srvid];
            this._deleteFromBlock('header', header.date, header.id, callback);
        },
        deleteMessageHeaderAndBodyUsingHeader: function (header, callback) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.deleteMessageHeaderAndBodyUsingHeader.bind(this, header, callback));
                return;
            }
            this.deleteMessageHeaderUsingHeader(header, function () {
                this._deleteFromBlock('body', header.date, header.id, callback);
            }.bind(this));
        },
        deleteMessageByServerId: function (srvid, callback) {
            if (!this._serverIdHeaderBlockMapping)
                throw new Error('Server ID mapping not supported for this storage!');
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.deleteMessageByServerId.bind(this, srvid, callback));
                return;
            }
            var blockId = this._serverIdHeaderBlockMapping[srvid];
            if (srvid === undefined) {
                logic(this, 'serverIdMappingMissing', { srvid: srvid });
                return;
            }
            var findInBlock = function findInBlock(headerBlock) {
                var headers = headerBlock.headers;
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    if (header.srvid === srvid) {
                        this.deleteMessageHeaderAndBodyUsingHeader(header, callback);
                        return;
                    }
                }
            }.bind(this);
            if (this._headerBlocks.hasOwnProperty(blockId)) {
                findInBlock(this._headerBlocks[blockId]);
            } else {
                var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
                this._loadBlock('header', blockInfo, findInBlock);
            }
        },
        addMessageBody: function ifs_addMessageBody(header, bodyInfo, callback) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.addMessageBody.bind(this, header, bodyInfo, callback));
                return;
            }
            logic(this, 'addMessageBody', {
                date: header.date,
                id: header.id,
                srvid: header.srvid,
                bodyInfo: bodyInfo
            });
            var sizeEst = OBJ_OVERHEAD_EST + NUM_ATTR_OVERHEAD_EST + 4 * NULL_ATTR_OVERHEAD_EST;
            function sizifyAddrs(addrs) {
                sizeEst += LIST_ATTR_OVERHEAD_EST;
                if (!addrs)
                    return;
                for (var i = 0; i < addrs.length; i++) {
                    var addrPair = addrs[i];
                    sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST + (addrPair.name ? addrPair.name.length : 0) + (addrPair.address ? addrPair.address.length : 0);
                }
            }
            function sizifyAttachments(atts) {
                sizeEst += LIST_ATTR_OVERHEAD_EST;
                if (!atts)
                    return;
                for (var i = 0; i < atts.length; i++) {
                    var att = atts[i];
                    sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST + att.name.length + att.type.length + NUM_ATTR_OVERHEAD_EST;
                }
            }
            function sizifyStr(str) {
                sizeEst += STR_ATTR_OVERHEAD_EST + str.length;
            }
            function sizifyStringList(strings) {
                sizeEst += LIST_OVERHEAD_EST;
                if (!strings)
                    return;
                for (var i = 0; i < strings.length; i++) {
                    sizeEst += STR_ATTR_OVERHEAD_EST + strings[i].length;
                }
            }
            function sizifyBodyRep(rep) {
                sizeEst += LIST_OVERHEAD_EST + NUM_OVERHEAD_EST * (rep.length / 2) + STR_OVERHEAD_EST * (rep.length / 2);
                for (var i = 1; i < rep.length; i += 2) {
                    if (rep[i])
                        sizeEst += rep[i].length;
                }
            }
            ;
            function sizifyBodyReps(reps) {
                if (!reps)
                    return;
                sizeEst += STR_OVERHEAD_EST * (reps.length / 2);
                for (var i = 0; i < reps.length; i++) {
                    var rep = reps[i];
                    if (rep.type === 'html') {
                        sizeEst += STR_OVERHEAD_EST + rep.amountDownloaded;
                    } else {
                        rep.content && sizifyBodyRep(rep.content);
                    }
                }
            }
            ;
            if (bodyInfo.to)
                sizifyAddrs(bodyInfo.to);
            if (bodyInfo.cc)
                sizifyAddrs(bodyInfo.cc);
            if (bodyInfo.bcc)
                sizifyAddrs(bodyInfo.bcc);
            if (bodyInfo.replyTo)
                sizifyStr(bodyInfo.replyTo);
            sizifyAttachments(bodyInfo.attachments);
            sizifyAttachments(bodyInfo.relatedParts);
            sizifyStringList(bodyInfo.references);
            sizifyBodyReps(bodyInfo.bodyReps);
            bodyInfo.size = sizeEst;
            this._insertIntoBlockUsingDateAndUID('body', header.date, header.id, header.srvid, bodyInfo.size, bodyInfo, callback);
        },
        messageBodyRepsDownloaded: function (bodyInfo) {
            if (!bodyInfo.bodyReps || !bodyInfo.bodyReps.length)
                return true;
            var bodyRepsDownloaded = bodyInfo.bodyReps.every(function (rep) {
                return rep.isDownloaded;
            });
            if (this._account.type !== 'pop3' || this.folderMeta.type !== 'inbox') {
                return bodyRepsDownloaded;
            }
            var attachmentsDownloaded = bodyInfo.attachments.every(function (att) {
                return !!att.file;
            });
            return bodyRepsDownloaded && attachmentsDownloaded;
        },
        getMessageBodyWithReps: function (suid, date, callback) {
            var self = this;
            this.getMessageBody(suid, date, function (bodyInfo) {
                if (!bodyInfo) {
                    return callback(bodyInfo);
                }
                if (self.messageBodyRepsDownloaded(bodyInfo)) {
                    return callback(bodyInfo);
                }
                self._account.universe.downloadMessageBodyReps(suid, date, function (err, bodyInfo) {
                    callback(bodyInfo);
                });
            });
        },
        getMessageBody: function ifs_getMessageBody(suid, date, callback) {
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.getMessageBody.bind(this, suid, date, callback));
                return;
            }
            var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)), posInfo = this._findRangeObjIndexForDateAndID(this._bodyBlockInfos, date, id);
            if (posInfo[1] === null) {
                logic(this, 'bodyNotFound');
                try {
                    callback(null);
                } catch (ex) {
                    logic(this, 'callbackErr', { ex: ex });
                }
                return;
            }
            var bodyBlockInfo = posInfo[1], self = this;
            if (!this._bodyBlocks.hasOwnProperty(bodyBlockInfo.blockId)) {
                this._loadBlock('body', bodyBlockInfo, function (bodyBlock) {
                    var bodyInfo = bodyBlock.bodies[id] || null;
                    if (!bodyInfo)
                        logic(self, 'bodyNotFound');
                    try {
                        callback(bodyInfo);
                    } catch (ex) {
                        logic(self, 'callbackErr', { ex: ex });
                    }
                });
                return;
            }
            var block = this._bodyBlocks[bodyBlockInfo.blockId], bodyInfo = block.bodies[id] || null;
            if (!bodyInfo)
                logic(this, 'bodyNotFound');
            try {
                callback(bodyInfo);
            } catch (ex) {
                logic(this, 'callbackErr', { ex: ex });
            }
        },
        updateMessageBody: function (header, bodyInfo, options, eventDetails, callback) {
            if (typeof eventDetails === 'function') {
                callback = eventDetails;
                eventDetails = null;
            }
            if (this._pendingLoads.length) {
                this._deferredCalls.push(this.updateMessageBody.bind(this, header, bodyInfo, options, eventDetails, callback));
                return;
            }
            var suid = header.suid;
            var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1));
            var self = this;
            function bodyUpdated() {
                if (options.flushBecause) {
                    bodyInfo = null;
                    self._account.saveAccountState(null, function forgetAndReGetMessageBody() {
                        self.getMessageBody(suid, header.date, performNotifications);
                    }, 'flushBody');
                } else {
                    performNotifications();
                }
            }
            function performNotifications(refreshedBody) {
                if (refreshedBody) {
                    bodyInfo = refreshedBody;
                }
                if (eventDetails && self._account.universe) {
                    self._account.universe.__notifyModifiedBody(suid, eventDetails, bodyInfo);
                }
                if (callback) {
                    callback(bodyInfo);
                }
            }
            this._deleteFromBlock('body', header.date, id, function () {
                self.addMessageBody(header, bodyInfo, bodyUpdated);
            });
        },
        shutdown: function () {
            for (var i = this._slices.length - 1; i >= 0; i--) {
                this._slices[i].die();
            }
            this.folderSyncer.shutdown();
        },
        youAreDeadCleanupAfterYourself: function () {
        }
    };
});
;
define('cronsync', [
    'require',
    'exports',
    'module',
    'logic',
    './worker-router',
    './mailslice',
    './syncbase',
    './allback',
    './slice_bridge_proxy'
], function (require, exports) {
    'use strict';
    var logic = require('logic'), router = require('./worker-router'), mailslice = require('./mailslice'), syncbase = require('./syncbase'), allback = require('./allback');
    function debug(str) {
        console.log('cronsync: ' + str + '\n');
    }
    var SliceBridgeProxy = require('./slice_bridge_proxy').SliceBridgeProxy;
    function makeHackedUpSlice(storage, callback) {
        var fakeBridgeThatEatsStuff = {
                __sendMessage: function () {
                }
            }, proxy = new SliceBridgeProxy(fakeBridgeThatEatsStuff, 'cron'), slice = new mailslice.MailSlice(proxy, storage), oldStatusMethod = proxy.sendStatus, newHeaders = [];
        slice.onNewHeader = function (header) {
            console.log('onNewHeader: ' + header);
            newHeaders.push(header);
        };
        proxy.sendStatus = function (status, requested, moreExpected, progress, newEmailCount) {
            oldStatusMethod.apply(this, arguments);
            if (callback) {
                switch (status) {
                case 'synced':
                case 'syncfailed':
                case 'syncblocked':
                    try {
                        callback(newHeaders);
                    } catch (ex) {
                        console.error('cronsync callback error:', ex, '\n', ex.stack);
                        callback = null;
                        throw ex;
                    }
                    callback = null;
                    break;
                }
            }
        };
        return slice;
    }
    function CronSync(universe) {
        this._universe = universe;
        logic.defineScope(this, 'CronSync');
        this._ensureSyncResolve = null;
        this.sendCronSync = router.registerSimple('cronsync', data => {
            var args = data.args;
            switch (data.cmd) {
            case 'alarm':
                debug('received an alarm via a message handler');
                this.onAlarm.apply(this, args);
                break;
            case 'syncEnsured':
                debug('received an syncEnsured via a message handler');
                this.onSyncEnsured.apply(this, args);
                break;
            }
        });
        this.sendCronSync('hello');
        this.ensureSync();
    }
    exports.CronSync = CronSync;
    CronSync.prototype = {
        ensureSync: function () {
            if (this._ensureSyncResolve) {
                return;
            }
            logic(this, 'ensureSync_begin');
            this._ensureSyncPromise = new Promise(resolve => {
                this._ensureSyncResolve = resolve;
            });
            debug('ensureSync called');
            var accounts = this._universe.accounts, syncData = {};
            accounts.forEach(function (account) {
                var interval = account.accountDef.syncInterval, intervalKey = 'interval' + interval;
                if (!syncData.hasOwnProperty(intervalKey)) {
                    syncData[intervalKey] = [];
                }
                syncData[intervalKey].push(account.id);
            });
            this.sendCronSync('ensureSync', [syncData]);
        },
        onSyncEnsured: function () {
            this._ensureSyncResolve();
            this._ensureSyncResolve = null;
            logic(this, 'ensureSync_end');
        },
        syncAccount: function (account) {
            return new Promise(resolve => {
                var scope = logic.subscope(this, { accountId: account.id });
                if (!this._universe.online || !account.enabled) {
                    debug('syncAccount early exit: online: ' + this._universe.online + ', enabled: ' + account.enabled);
                    logic(scope, 'syncSkipped');
                    resolve();
                    return;
                }
                var latch = allback.latch();
                var inboxDone = latch.defer('inbox');
                var inboxFolder = account.getFirstFolderWithType('inbox');
                var storage = account.getFolderStorageForFolderId(inboxFolder.id);
                logic(scope, 'syncAccount_begin');
                logic(scope, 'syncAccountHeaders_begin');
                var slice = makeHackedUpSlice(storage, newHeaders => {
                    logic(scope, 'syncAccountHeaders_end', { headers: newHeaders });
                    var notifyHeaders = [];
                    newHeaders.some(function (header, i) {
                        notifyHeaders.push({
                            date: header.date,
                            from: header.author.name || header.author.address,
                            subject: header.subject,
                            accountId: account.id,
                            messageSuid: header.suid
                        });
                        if (i === syncbase.CRONSYNC_MAX_MESSAGES_TO_REPORT_PER_ACCOUNT - 1) {
                            return true;
                        }
                    });
                    if (newHeaders.length) {
                        debug('Asking for snippets for ' + notifyHeaders.length + ' headers');
                        if (account.accountDef.type === 'pop3+smtp') {
                            logic(scope, 'syncAccount_end');
                            inboxDone([
                                newHeaders.length,
                                notifyHeaders
                            ]);
                        } else if (this._universe.online) {
                            logic(scope, 'syncAccountSnippets_begin');
                            this._universe.downloadBodies(newHeaders.slice(0, syncbase.CRONSYNC_MAX_SNIPPETS_TO_FETCH_PER_ACCOUNT), { maximumBytesToFetch: syncbase.MAX_SNIPPET_BYTES }, () => {
                                debug('Notifying for ' + newHeaders.length + ' headers');
                                logic(scope, 'syncAccountSnippets_end');
                                logic(scope, 'syncAccount_end');
                                inboxDone([
                                    newHeaders.length,
                                    notifyHeaders
                                ]);
                            });
                        } else {
                            logic(scope, 'syncAccount_end');
                            debug('UNIVERSE OFFLINE. Notifying for ' + newHeaders.length + ' headers');
                            inboxDone([
                                newHeaders.length,
                                notifyHeaders
                            ]);
                        }
                    } else {
                        logic(scope, 'syncAccount_end');
                        inboxDone();
                    }
                    slice.die();
                });
                storage.sliceOpenMostRecent(slice, true);
                var outboxFolder = account.getFirstFolderWithType('outbox');
                if (outboxFolder) {
                    var outboxStorage = account.getFolderStorageForFolderId(outboxFolder.id);
                    if (outboxStorage.getKnownMessageCount() > 0) {
                        var outboxDone = latch.defer('outbox');
                        logic(scope, 'sendOutbox_begin');
                        this._universe.sendOutboxMessages(account, { reason: 'syncAccount' }, () => {
                            logic(scope, 'sendOutbox_end');
                            outboxDone();
                        });
                    }
                }
                latch.then(latchResults => {
                    var inboxResult = latchResults.inbox[0];
                    this._universe.waitForAccountOps(account, function () {
                        account.runAfterSaves(function () {
                            resolve(inboxResult);
                        });
                    });
                });
            });
        },
        onAlarm: function (accountIds) {
            logic(this, 'alarmFired', { accountIds: accountIds });
            if (!accountIds) {
                return;
            }
            var accounts = this._universe.accounts, targetAccounts = [], ids = [];
            logic(this, 'cronSync_begin');
            this._universe.__notifyStartedCronSync(accountIds);
            accountIds.forEach(function (id) {
                accounts.some(function (account) {
                    if (account.id === id) {
                        targetAccounts.push(account);
                        ids.push(id);
                        return true;
                    }
                });
            });
            this.ensureSync();
            var syncResults = [];
            var accountsResults = { accountIds: accountIds };
            var done = () => {
                this._ensureSyncPromise.then(() => {
                    if (syncResults.length) {
                        accountsResults.updates = syncResults;
                    }
                    this._universe.__notifyStoppedCronSync(accountsResults);
                    logic(this, 'syncAccounts_end', { accountsResults: accountsResults });
                    logic(this, 'cronSync_end');
                });
            };
            if (!ids.length) {
                done();
                return;
            }
            logic(this, 'syncAccounts_begin');
            Promise.all(targetAccounts.map(account => {
                return this.syncAccount(account).then(result => {
                    if (result) {
                        syncResults.push({
                            id: account.id,
                            address: account.identities[0].address,
                            count: result[0],
                            latestMessageInfos: result[1]
                        });
                    }
                });
            })).then(done);
        },
        shutdown: function () {
            router.unregister('cronsync');
        }
    };
});
;
define('accountcommon', [
    './a64',
    'logic',
    './allback',
    'require',
    'module',
    'exports'
], function ($a64, logic, allback, require, $module, exports) {
    var latchedWithRejections = allback.latchedWithRejections;
    var AUTOCONFIG_TIMEOUT_MS = 30 * 1000;
    var ISPDB_AUTOCONFIG_ROOT = 'https://live.mozillamessaging.com/autoconfig/v1.1/';
    function requireConfigurator(type, fn) {
        if (type === 'activesync') {
            require(['activesync/configurator'], fn);
        } else if (type === 'pop3+smtp' || type === 'imap+smtp') {
            require(['composite/configurator'], fn);
        }
    }
    function accountTypeToClass(type, callback) {
        requireConfigurator(type, function (mod) {
            callback(mod.account.Account);
        });
    }
    exports.accountTypeToClass = accountTypeToClass;
    var autoconfigByDomain = exports._autoconfigByDomain = {
        'localhost': {
            type: 'imap+smtp',
            incoming: {
                hostname: 'localhost',
                port: 143,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            },
            outgoing: {
                hostname: 'localhost',
                port: 25,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            }
        },
        'fakeimaphost': {
            type: 'imap+smtp',
            incoming: {
                hostname: 'localhost',
                port: 0,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            },
            outgoing: {
                hostname: 'localhost',
                port: 0,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            }
        },
        'fakepop3host': {
            type: 'pop3+smtp',
            incoming: {
                hostname: 'localhost',
                port: 0,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            },
            outgoing: {
                hostname: 'localhost',
                port: 0,
                socketType: 'plain',
                username: '%EMAILLOCALPART%'
            }
        },
        'slocalhost': {
            type: 'imap+smtp',
            incoming: {
                hostname: 'localhost',
                port: 993,
                socketType: 'SSL',
                username: '%EMAILLOCALPART%'
            },
            outgoing: {
                hostname: 'localhost',
                port: 465,
                socketType: 'SSL',
                username: '%EMAILLOCALPART%'
            }
        },
        'fakeashost': {
            type: 'activesync',
            displayName: 'Test',
            incoming: {
                server: 'http://localhost:8880',
                username: '%EMAILADDRESS%'
            }
        },
        'saslocalhost': {
            type: 'activesync',
            displayName: 'Test',
            incoming: {
                server: 'https://localhost:443',
                username: '%EMAILADDRESS%'
            }
        },
        'nonesuch.nonesuch': {
            type: 'imap+smtp',
            imapHost: 'nonesuch.nonesuch',
            imapPort: 993,
            imapCrypto: true,
            smtpHost: 'nonesuch.nonesuch',
            smtpPort: 465,
            smtpCrypto: true,
            usernameIsFullEmail: false
        }
    };
    function recreateIdentities(universe, accountId, oldIdentities) {
        var identities = [];
        for (var iter in Iterator(oldIdentities)) {
            var oldIdentity = iter[1];
            identities.push({
                id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
                name: oldIdentity.name,
                address: oldIdentity.address,
                replyTo: oldIdentity.replyTo,
                signature: oldIdentity.signature,
                signatureEnabled: oldIdentity.signatureEnabled
            });
        }
        return identities;
    }
    exports.recreateIdentities = recreateIdentities;
    function fillConfigPlaceholders(userDetails, sourceConfigInfo) {
        var configInfo = JSON.parse(JSON.stringify(sourceConfigInfo));
        var details = userDetails.emailAddress.split('@');
        var emailLocalPart = details[0], emailDomainPart = details[1];
        var domain = emailDomainPart.toLowerCase();
        var placeholderFields = {
            incoming: [
                'username',
                'hostname',
                'server'
            ],
            outgoing: [
                'username',
                'hostname'
            ]
        };
        function fillPlaceholder(value) {
            return value.replace('%EMAILADDRESS%', userDetails.emailAddress).replace('%EMAILLOCALPART%', emailLocalPart).replace('%EMAILDOMAIN%', emailDomainPart).replace('%REALNAME%', userDetails.displayName);
        }
        for (var serverType in placeholderFields) {
            var fields = placeholderFields[serverType];
            var server = configInfo[serverType];
            if (!server) {
                continue;
            }
            for (var iField = 0; iField < fields.length; iField++) {
                var field = fields[iField];
                if (server.hasOwnProperty(field)) {
                    server[field] = fillPlaceholder(server[field]);
                }
            }
        }
        return configInfo;
    }
    exports.fillConfigPlaceholders = fillConfigPlaceholders;
    function Autoconfigurator() {
        this.timeout = AUTOCONFIG_TIMEOUT_MS;
        logic.defineScope(this, 'Autoconfigurator');
    }
    exports.Autoconfigurator = Autoconfigurator;
    Autoconfigurator.prototype = {
        _fatalErrors: [
            'bad-user-or-pass',
            'not-authorized'
        ],
        _isSuccessOrFatal: function (error) {
            return !error || this._fatalErrors.indexOf(error) !== -1;
        },
        _getXmlConfig: function getXmlConfig(url) {
            return new Promise(function (resolve, reject) {
                var scope = logic.subscope(this, {
                    method: 'GET',
                    url: url
                });
                logic(scope, 'xhr:start');
                var xhr = new XMLHttpRequest({ mozSystem: true });
                xhr.open('GET', url, true);
                xhr.timeout = this.timeout;
                xhr.onload = function () {
                    logic(scope, 'xhr:end', { status: xhr.status });
                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject('status' + xhr.status);
                        return;
                    }
                    self.postMessage({
                        uid: 0,
                        type: 'configparser',
                        cmd: 'accountcommon',
                        args: [xhr.responseText]
                    });
                    self.addEventListener('message', function onworkerresponse(evt) {
                        var data = evt.data;
                        if (data.type != 'configparser' || data.cmd != 'accountcommon') {
                            return;
                        }
                        self.removeEventListener(evt.type, onworkerresponse);
                        var args = data.args;
                        var config = args[0], status = args[1];
                        resolve(config);
                    });
                };
                xhr.ontimeout = function () {
                    logic(scope, 'xhr:end', { status: 'timeout' });
                    reject('timeout');
                };
                xhr.onerror = function () {
                    logic(scope, 'xhr:end', { status: 'error' });
                    reject('error');
                };
                try {
                    xhr.send();
                } catch (e) {
                    logic(scope, 'xhr:end', { status: 'sync-error' });
                    reject('status404');
                }
            }.bind(this));
        },
        _getConfigFromLocalFile: function getConfigFromLocalFile(domain) {
            return this._getXmlConfig('/autoconfig/' + encodeURIComponent(domain));
        },
        _checkAutodiscoverUrl: function (url) {
            return new Promise(function (resolve, reject) {
                var scope = logic.subscope(this, {
                    method: 'POST',
                    url: url
                });
                logic(scope, 'autodiscoverProbe:start');
                var xhr = new XMLHttpRequest({ mozSystem: true });
                xhr.open('POST', url, true);
                xhr.timeout = this.timeout;
                var victory = function () {
                    resolve({
                        type: 'activesync',
                        incoming: { autodiscoverEndpoint: url }
                    });
                }.bind(this);
                xhr.onload = function () {
                    logic(scope, 'autodiscoverProbe:end', { status: xhr.status });
                    if (xhr.status === 401) {
                        victory();
                        return;
                    }
                    reject('status' + xhr.status);
                };
                xhr.ontimeout = function () {
                    logic(scope, 'autodiscoverProbe:end', { status: 'timeout' });
                    reject('timeout');
                };
                xhr.onerror = function () {
                    logic(scope, 'autodiscoverProbe:end', { status: 'error' });
                    reject('error');
                };
                try {
                    xhr.send(null);
                } catch (e) {
                    logic(scope, 'autodiscoverProbe:end', { status: 'sync-error' });
                    reject('status404');
                }
            }.bind(this));
        },
        _probeForAutodiscover: function (domain) {
            var subdirUrl = 'https://' + domain + '/autodiscover/autodiscover.xml';
            var domainUrl = 'https://autodiscover.' + domain + '/autodiscover/autodiscover.xml';
            return latchedWithRejections({
                subdir: this._checkAutodiscoverUrl(subdirUrl),
                domain: this._checkAutodiscoverUrl(domainUrl)
            }).then(function (results) {
                if (results.subdir.resolved && results.subdir.value) {
                    return results.subdir.value;
                }
                if (results.domain.resolved && results.domain.value) {
                    return results.domain.value;
                }
                return null;
            }.bind(this));
        },
        _getConfigFromISPDB: function (domain) {
            return this._getXmlConfig(ISPDB_AUTOCONFIG_ROOT + encodeURIComponent(domain));
        },
        _getMX: function getMX(domain) {
            return new Promise(function (resolve, reject) {
                var scope = logic.subscope(this, { domain: domain });
                logic(scope, 'mxLookup:begin');
                var xhr = new XMLHttpRequest({ mozSystem: true });
                xhr.open('GET', 'https://live.mozillamessaging.com/dns/mx/' + encodeURIComponent(domain), true);
                xhr.timeout = this.timeout;
                xhr.onload = function () {
                    var reportDomain = null;
                    if (xhr.status === 200) {
                        var normStr = xhr.responseText.split('\n')[0];
                        if (normStr) {
                            normStr = normStr.toLowerCase();
                            var mxDomain = normStr.split('.').slice(-2).join('.');
                            if (mxDomain !== domain) {
                                reportDomain = mxDomain;
                            }
                        }
                    }
                    logic(scope, 'mxLookup:end', {
                        'raw': normStr,
                        normalized: mxDomain,
                        reporting: reportDomain
                    });
                    resolve(reportDomain);
                };
                xhr.ontimeout = function () {
                    logic(scope, 'mxLookup:end', { status: 'timeout' });
                    reject('timeout');
                };
                xhr.onerror = function () {
                    logic(scope, 'mxLookup:end', { status: 'error' });
                    reject('error');
                };
                xhr.send();
            }.bind(this));
        },
        _getHostedAndISPDBConfigs: function (domain, emailAddress) {
            var commonAutoconfigSuffix = '/mail/config-v1.1.xml?emailaddress=' + encodeURIComponent(emailAddress);
            var subdomainAutoconfigUrl = 'https://autoconfig.' + domain + commonAutoconfigSuffix;
            var wellKnownAutoconfigUrl = 'https://' + domain + '/.well-known/autoconfig' + commonAutoconfigSuffix;
            return latchedWithRejections({
                autoconfigSubdomain: this._getXmlConfig(subdomainAutoconfigUrl),
                autoconfigWellKnown: this._getXmlConfig(wellKnownAutoconfigUrl),
                ispdb: this._getConfigFromISPDB(domain),
                mxDomain: this._getMX(domain)
            }).then(function (results) {
                if (results.autoconfigSubdomain.resolved && results.autoconfigSubdomain.value) {
                    return {
                        type: 'config',
                        source: 'autoconfig-subdomain',
                        config: results.autoconfigSubdomain.value
                    };
                }
                if (results.autoconfigWellKnown.resolved && results.autoconfigWellKnown.value) {
                    return {
                        type: 'config',
                        source: 'autoconfig-wellknown',
                        config: results.autoconfigWellKnown.value
                    };
                }
                if (results.ispdb.resolved && results.ispdb.value) {
                    return {
                        type: 'config',
                        source: 'ispdb',
                        config: results.ispdb.value
                    };
                }
                if (results.mxDomain.resolved && results.mxDomain.value && results.mxDomain.value !== domain) {
                    return {
                        type: 'mx',
                        domain: results.mxDomain.value
                    };
                }
                return { type: null };
            }.bind(this));
        },
        _getConfigFromMX: function getConfigFromMX(domain, callback) {
            var self = this;
            this._getMX(domain, function (error, mxDomain, errorDetails) {
                if (error)
                    return callback(error, null, errorDetails);
                console.log('  Found MX for', mxDomain);
                if (domain === mxDomain)
                    return callback('no-config-info', null, { status: 'mxsame' });
                console.log('  Looking in local file store');
                self._getConfigFromLocalFile(mxDomain, function (error, config, errorDetails) {
                    if (!error) {
                        callback(error, config, errorDetails);
                        return;
                    }
                    console.log('  Looking in the Mozilla ISPDB');
                    self._getConfigFromDB(mxDomain, callback);
                });
            });
        },
        _checkGelamConfig: function (domain) {
            if (autoconfigByDomain.hasOwnProperty(domain)) {
                return autoconfigByDomain[domain];
            }
            return null;
        },
        learnAboutAccount: function (details) {
            return new Promise(function (resolve, reject) {
                var emailAddress = details.emailAddress;
                var emailParts = emailAddress.split('@');
                var emailLocalPart = emailParts[0], emailDomainPart = emailParts[1];
                var domain = emailDomainPart.toLowerCase();
                var scope = logic.subscope(this, { domain: domain });
                logic(scope, 'autoconfig:begin');
                var victory = function (sourceConfigInfo, source) {
                    var configInfo = null, result;
                    if (sourceConfigInfo) {
                        configInfo = fillConfigPlaceholders(details, sourceConfigInfo);
                        if (configInfo.incoming && configInfo.incoming.authentication === 'xoauth2') {
                            result = 'need-oauth2';
                        } else {
                            result = 'need-password';
                        }
                    } else {
                        result = 'no-config-info';
                    }
                    logic(scope, 'autoconfig:end', {
                        result: result,
                        source: source,
                        configInfo: configInfo
                    });
                    resolve({
                        result: result,
                        source: source,
                        configInfo: configInfo
                    });
                }.bind(this);
                var failsafeFailure = function (err) {
                    logic(this, 'autoconfig:end', {
                        err: {
                            message: err && err.message,
                            stack: err && err.stack
                        }
                    });
                    resolve({
                        result: 'no-config-info',
                        configInfo: null
                    });
                }.bind(this);
                var coerceRejectionToNull = function (err) {
                    logic(scope, 'autoconfig:coerceRejection', { err: err });
                    return null;
                }.bind(this);
                var hardcodedConfig = this._checkGelamConfig(domain);
                if (hardcodedConfig) {
                    victory(hardcodedConfig, 'hardcoded');
                    return;
                }
                var localConfigHandler = function (info) {
                    if (info) {
                        victory(info, 'local');
                        return null;
                    }
                    return this._getHostedAndISPDBConfigs(domain, emailAddress).then(selfHostedAndISPDBHandler);
                }.bind(this);
                var mxDomain;
                var selfHostedAndISPDBHandler = function (typedResult) {
                    if (typedResult.type === 'config') {
                        victory(typedResult.config, typedResult.source);
                        return null;
                    }
                    if (typedResult.type === 'mx') {
                        mxDomain = typedResult.domain;
                        return this._getConfigFromLocalFile(mxDomain).catch(coerceRejectionToNull).then(mxLocalHandler);
                    }
                    return this._probeForAutodiscover(domain).then(autodiscoverHandler);
                }.bind(this);
                var mxLocalHandler = function (info) {
                    if (info) {
                        victory(info, 'mx local');
                        return null;
                    }
                    return this._getConfigFromISPDB(mxDomain).catch(coerceRejectionToNull).then(mxISPDBHandler);
                }.bind(this);
                var mxISPDBHandler = function (info) {
                    if (info) {
                        victory(info, 'mx ispdb');
                        return null;
                    }
                    return this._probeForAutodiscover(domain).then(autodiscoverHandler);
                }.bind(this);
                var autodiscoverHandler = function (info) {
                    victory(info, info ? 'autodiscover' : null);
                    return null;
                }.bind(this);
                this._getConfigFromLocalFile(domain).catch(coerceRejectionToNull).then(localConfigHandler).catch(failsafeFailure);
            }.bind(this));
        },
        tryToCreateAccount: function (universe, userDetails, callback) {
            this.learnAboutAccount(userDetails).then(function success(results) {
                if (results.result === 'need-password') {
                    var config = results.configInfo;
                    requireConfigurator(config.type, function (mod) {
                        mod.configurator.tryToCreateAccount(universe, userDetails, config, callback);
                    });
                    return;
                }
                logic(this, 'legacyCreateFail', { result: results.result });
                callback('no-config-info');
            }.bind(this), function failure(err) {
                callback(err, null, null);
            }.bind(this));
        }
    };
    function recreateAccount(universe, oldVersion, accountInfo, callback) {
        requireConfigurator(accountInfo.def.type, function (mod) {
            mod.configurator.recreateAccount(universe, oldVersion, accountInfo, callback);
        });
    }
    exports.recreateAccount = recreateAccount;
    function tryToManuallyCreateAccount(universe, userDetails, domainInfo, callback) {
        requireConfigurator(domainInfo.type, function (mod) {
            mod.configurator.tryToCreateAccount(universe, userDetails, domainInfo, callback);
        });
    }
    exports.tryToManuallyCreateAccount = tryToManuallyCreateAccount;
});
;
define('mailuniverse', [
    'logic',
    './a64',
    './date',
    './syncbase',
    './worker-router',
    './maildb',
    './cronsync',
    './accountcommon',
    './allback',
    'module',
    'exports'
], function (logic, $a64, $date, $syncbase, $router, $maildb, $cronsync, $acctcommon, $allback, $module, exports) {
    var MAX_MUTATIONS_FOR_UNDO = 10;
    var MAX_LOG_BACKLOG_MS = 30000;
    function makeBridgeFn(bridgeMethod) {
        return function (a1, a2, a3) {
            for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
                var bridge = this._bridges[iBridge];
                bridge[bridgeMethod](a1, a2, a3);
            }
        };
    }
    function MailUniverse(callAfterBigBang, online, testOptions) {
        this.accounts = [];
        this._accountsById = {};
        this.identities = [];
        this._identitiesById = {};
        this._opsByAccount = {};
        this._opCompletionListenersByAccount = {};
        this._opCallbacks = {};
        this._bridges = [];
        this._testModeDisablingLocalOps = false;
        this._testModeFakeNavigator = testOptions && testOptions.fakeNavigator || null;
        this.online = true;
        this._onConnectionChange(online);
        this._mode = 'cron';
        this._deferredOpTimeout = null;
        this._boundQueueDeferredOps = this._queueDeferredOps.bind(this);
        this.config = null;
        this._logBacklog = [];
        this._db = new $maildb.MailDB(testOptions);
        this._cronSync = null;
        var self = this;
        this._db.getConfig(function (configObj, accountInfos, lazyCarryover) {
            function setupLogging(config) {
                function censorLogs() {
                    logic.isCensored = true;
                    function censorValue(value) {
                        if (value && (value.suid || value.srvid)) {
                            return {
                                date: value.date,
                                suid: value.suid,
                                srvid: value.srvid
                            };
                        } else if (value && typeof value === 'object') {
                            return value.toString();
                        } else {
                            return value;
                        }
                    }
                    logic.on('censorEvent', function (e) {
                        if (logic.isPlainObject(e.details)) {
                            for (var key in e.details) {
                                var value = e.details[key];
                                if (key[0] === '_') {
                                    delete e.details[key];
                                } else if (Array.isArray(value)) {
                                    e.details[key] = value.map(censorValue);
                                } else {
                                    e.details[key] = censorValue(value);
                                }
                            }
                        }
                    });
                }
                if (self.config.debugLogging) {
                    if (self.config.debugLogging === 'realtime-dangerous') {
                        console.warn('!!!');
                        console.warn('!!! REALTIME USER-DATA ENTRAINING LOGGING ENABLED !!!');
                        console.warn('!!!');
                        console.warn('You are about to see a lot of logs, as they happen!');
                        console.warn('They will also be circularly buffered for saving.');
                        console.warn('');
                        console.warn('These logs will contain SENSITIVE DATA.  The CONTENTS');
                        console.warn('OF EMAILS, maybe some PASSWORDS.  This was turned on');
                        console.warn('via the secret debug mode UI.  Use it to turn us off:');
                        console.warn('https://wiki.mozilla.org/Gaia/Email/SecretDebugMode');
                        logic.realtimeLogEverything = true;
                    } else if (self.config.debugLogging !== 'dangerous') {
                        console.warn('GENERAL LOGGING ENABLED!');
                        console.warn('(CIRCULAR EVENT LOGGING WITH NON-SENSITIVE DATA)');
                        censorLogs();
                    } else {
                        console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                        console.warn('DANGEROUS USER-DATA ENTRAINING LOGGING ENABLED !!!');
                        console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                        console.warn('This means contents of e-mails and passwords if you');
                        console.warn('set up a new account.  (The IMAP protocol sanitizes');
                        console.warn('passwords, but the bridge logger may not.)');
                        console.warn('');
                        console.warn('If you forget how to turn us off, see:');
                        console.warn('https://wiki.mozilla.org/Gaia/Email/SecretDebugMode');
                        console.warn('...................................................');
                    }
                } else if (!logic.underTest) {
                    censorLogs();
                    var NAMESPACES_TO_ALWAYS_LOG = [
                        'BrowserBox',
                        'SmtpClient',
                        'ActivesyncConfigurator',
                        'ImapFolderSync',
                        'Pop3Prober',
                        'Autoconfigurator',
                        'DisasterRecovery',
                        'ImapClient',
                        'ImapJobDriver',
                        'Oauth',
                        'Pop3FolderSyncer',
                        'SmtpProber'
                    ];
                    logic.on('preprocessEvent', function (e) {
                        var eventShouldBeLogged = NAMESPACES_TO_ALWAYS_LOG.indexOf(e.namespace) !== -1 || e.namespace === 'Account' && e.details && e.details.accountType === 'smtp' || e.type === 'allOpsCompleted' || e.type === 'mailslice:mutex-released';
                        if (!eventShouldBeLogged) {
                            e.preventDefault();
                        }
                    });
                    logic.on('event', function (e) {
                        var obj = e.toJSON();
                        dump('[' + obj.namespace + '] ' + obj.type + '  ' + JSON.stringify(obj.details) + '\n');
                    });
                }
            }
            var accountInfo, i;
            var doneCount = 0;
            var accountCount = accountInfos.length;
            if (configObj) {
                self.config = configObj;
                setupLogging();
                logic.defineScope(self, 'MailUniverse');
                if (self.config.debugLogging)
                    self._enableCircularLogging();
                logic(self, 'configLoaded', {
                    config: self.config,
                    accountInfos: accountInfos
                });
                function done() {
                    doneCount += 1;
                    if (doneCount === accountCount) {
                        self._initFromConfig();
                        callAfterBigBang();
                    }
                }
                if (accountCount) {
                    for (i = 0; i < accountCount; i++) {
                        accountInfo = accountInfos[i];
                        self._loadAccount(accountInfo.def, accountInfo.folderInfo, null, done);
                    }
                    return;
                }
            } else {
                self.config = {
                    id: 'config',
                    nextAccountNum: 0,
                    nextIdentityNum: 0,
                    debugLogging: lazyCarryover ? lazyCarryover.config.debugLogging : false
                };
                setupLogging();
                logic.defineScope(self, 'MailUniverse');
                if (self.config.debugLogging)
                    self._enableCircularLogging();
                self._db.saveConfig(self.config);
                if (lazyCarryover) {
                    logic(self, 'configMigrating_begin', { lazyCarryover: lazyCarryover });
                    var waitingCount = lazyCarryover.accountInfos.length;
                    var oldVersion = lazyCarryover.oldVersion;
                    var accountRecreated = function (accountInfo, err) {
                        logic(self, 'recreateAccount_end', {
                            type: accountInfo.type,
                            id: accountInfo.id,
                            error: err
                        });
                        if (--waitingCount === 0) {
                            logic(self, 'configMigrating_end');
                            this._initFromConfig();
                            callAfterBigBang();
                        }
                    };
                    for (i = 0; i < lazyCarryover.accountInfos.length; i++) {
                        var accountInfo = lazyCarryover.accountInfos[i];
                        logic(this, 'recreateAccount_begin', {
                            type: accountInfo.type,
                            id: accountInfo.id,
                            error: null
                        });
                        $acctcommon.recreateAccount(self, oldVersion, accountInfo, accountRecreated.bind(this, accountInfo));
                    }
                    return;
                } else {
                    logic(self, 'configCreated', { config: self.config });
                }
            }
            self._initFromConfig();
            callAfterBigBang();
        }.bind(this));
    }
    exports.MailUniverse = MailUniverse;
    MailUniverse.prototype = {
        _enableCircularLogging: function () {
            this._logBacklog = [];
            logic.on('event', event => {
                this._logBacklog.push(event.toJSON());
                var oldestTimeAllowed = Date.now() - MAX_LOG_BACKLOG_MS;
                while (this._logBacklog.length && this._logBacklog[0].time < oldestTimeAllowed) {
                    this._logBacklog.shift();
                }
            });
        },
        createLogBacklogRep: function () {
            return {
                type: 'logic',
                events: this._logBacklog
            };
        },
        dumpLogToDeviceStorage: function () {
            var sendMessage = $router.registerCallbackType('devicestorage');
            try {
                var blob = new Blob([JSON.stringify(this.createLogBacklogRep())], {
                    type: 'application/json',
                    endings: 'transparent'
                });
                var filename = 'gem-log-' + Date.now() + '.json';
                sendMessage('save', [
                    'sdcard',
                    blob,
                    filename
                ], function (success, err, savedFile) {
                    if (success)
                        console.log('saved log to "sdcard" devicestorage:', savedFile);
                    else
                        console.error('failed to save log to', filename);
                });
            } catch (ex) {
                console.error('Problem dumping log to device storage:', ex, '\n', ex.stack);
            }
        },
        _initFromConfig: function () {
            this._cronSync = new $cronsync.CronSync(this);
        },
        exposeConfigForClient: function () {
            return { debugLogging: this.config.debugLogging };
        },
        modifyConfig: function (changes) {
            for (var key in changes) {
                var val = changes[key];
                switch (key) {
                case 'debugLogging':
                    break;
                default:
                    continue;
                }
                this.config[key] = val;
            }
            this._db.saveConfig(this.config);
            this.__notifyConfig();
        },
        __notifyConfig: function () {
            var config = this.exposeConfigForClient();
            for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
                var bridge = this._bridges[iBridge];
                bridge.notifyConfig(config);
            }
        },
        setInteractive: function () {
            this._mode = 'interactive';
        },
        _onConnectionChange: function (isOnline) {
            var wasOnline = this.online;
            this.online = this._testModeFakeNavigator ? this._testModeFakeNavigator.onLine : isOnline;
            console.log('Email knows that it is:', this.online ? 'online' : 'offline', 'and previously was:', wasOnline ? 'online' : 'offline');
            this.minimizeNetworkUsage = true;
            this.networkCostsMoney = true;
            if (!wasOnline && this.online) {
                for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
                    this._resumeOpProcessingForAccount(this.accounts[iAcct]);
                }
            }
        },
        _dispatchLocalOpForAccount: function (account, op) {
            var queues = this._opsByAccount[account.id];
            queues.active = true;
            var mode;
            switch (op.lifecycle) {
            case 'do':
                mode = 'local_do';
                op.localStatus = 'doing';
                break;
            case 'undo':
                mode = 'local_undo';
                op.localStatus = 'undoing';
                break;
            default:
                throw new Error('Illegal lifecycle state for local op');
            }
            account.runOp(op, mode, this._localOpCompleted.bind(this, account, op));
        },
        _dispatchServerOpForAccount: function (account, op) {
            var queues = this._opsByAccount[account.id];
            queues.active = true;
            var mode = op.lifecycle;
            if (op.serverStatus === 'check')
                mode = 'check';
            op.serverStatus = mode + 'ing';
            account.runOp(op, mode, this._serverOpCompleted.bind(this, account, op));
        },
        _resumeOpProcessingForAccount: function (account) {
            var queues = this._opsByAccount[account.id];
            if (!account.enabled)
                return;
            if (!queues.local.length && queues.server.length && (queues.server[0].serverStatus !== 'doing' && queues.server[0].serverStatus !== 'undoing')) {
                var op = queues.server[0];
                this._dispatchServerOpForAccount(account, op);
            }
        },
        areServerJobsWaiting: function (account) {
            var queues = this._opsByAccount[account.id];
            if (!account.enabled) {
                return false;
            }
            return !!queues.server.length;
        },
        registerBridge: function (mailBridge) {
            this._bridges.push(mailBridge);
        },
        unregisterBridge: function (mailBridge) {
            var idx = this._bridges.indexOf(mailBridge);
            if (idx !== -1)
                this._bridges.splice(idx, 1);
        },
        learnAboutAccount: function (details) {
            var configurator = new $acctcommon.Autoconfigurator();
            return configurator.learnAboutAccount(details);
        },
        tryToCreateAccount: function mu_tryToCreateAccount(userDetails, domainInfo, callback) {
            if (!this.online) {
                callback('offline');
                return;
            }
            if (!userDetails.forceCreate) {
                for (var i = 0; i < this.accounts.length; i++) {
                    if (userDetails.emailAddress === this.accounts[i].identities[0].address) {
                        callback('user-account-exists');
                        return;
                    }
                }
            }
            if (domainInfo) {
                $acctcommon.tryToManuallyCreateAccount(this, userDetails, domainInfo, callback);
            } else {
                var configurator = new $acctcommon.Autoconfigurator();
                configurator.tryToCreateAccount(this, userDetails, callback);
            }
        },
        deleteAccount: function (accountId) {
            var savedEx = null;
            var account = this._accountsById[accountId];
            try {
                account.accountDeleted();
            } catch (ex) {
                savedEx = ex;
            }
            this._db.deleteAccount(accountId);
            delete this._accountsById[accountId];
            var idx = this.accounts.indexOf(account);
            this.accounts.splice(idx, 1);
            for (var i = 0; i < account.identities.length; i++) {
                var identity = account.identities[i];
                idx = this.identities.indexOf(identity);
                this.identities.splice(idx, 1);
                delete this._identitiesById[identity.id];
            }
            delete this._opsByAccount[accountId];
            delete this._opCompletionListenersByAccount[accountId];
            this.__notifyRemovedAccount(accountId);
            if (savedEx)
                throw savedEx;
        },
        saveAccountDef: function (accountDef, folderInfo, callback) {
            this._db.saveAccountDef(this.config, accountDef, folderInfo, callback);
            var account = this.getAccountForAccountId(accountDef.id);
            if (this._cronSync) {
                this._cronSync.ensureSync();
            }
            if (account)
                this.__notifyModifiedAccount(account);
        },
        _loadAccount: function mu__loadAccount(accountDef, folderInfo, receiveProtoConn, callback) {
            $acctcommon.accountTypeToClass(accountDef.type, function (constructor) {
                if (!constructor) {
                    logic(this, 'badAccountType', { type: accountDef.type });
                    return;
                }
                var account = new constructor(this, accountDef, folderInfo, this._db, receiveProtoConn);
                this.accounts.push(account);
                this._accountsById[account.id] = account;
                this._opsByAccount[account.id] = {
                    active: false,
                    local: [],
                    server: [],
                    deferred: []
                };
                this._opCompletionListenersByAccount[account.id] = null;
                for (var iIdent = 0; iIdent < accountDef.identities.length; iIdent++) {
                    var identity = accountDef.identities[iIdent];
                    this.identities.push(identity);
                    this._identitiesById[identity.id] = identity;
                }
                this.__notifyAddedAccount(account);
                var timeSinceLastFolderSync = Date.now() - account.meta.lastFolderSyncAt;
                if (timeSinceLastFolderSync >= $syncbase.SYNC_FOLDER_LIST_EVERY_MS)
                    this.syncFolderList(account);
                for (var i = 0; i < account.mutations.length; i++) {
                    var op = account.mutations[i];
                    if (op.lifecycle !== 'done' && op.lifecycle !== 'undone' && op.lifecycle !== 'moot') {
                        op.serverStatus = 'check';
                        this._queueAccountOp(account, op);
                    }
                }
                account.upgradeFolderStoragesIfNeeded();
                callback(account);
            }.bind(this));
        },
        __reportAccountProblem: function (account, problem, whichSide) {
            var suppress = false;
            if (account.problems.indexOf(problem) !== -1) {
                suppress = true;
            }
            logic(this, 'reportProblem', {
                problem: problem,
                suppress: suppress,
                accountId: account.id
            });
            if (suppress) {
                return;
            }
            account.problems.push(problem);
            account.enabled = false;
            this.__notifyModifiedAccount(account);
            switch (problem) {
            case 'bad-user-or-pass':
            case 'needs-oauth-reauth':
            case 'bad-address':
            case 'imap-disabled':
                this.__notifyBadLogin(account, problem, whichSide);
                break;
            }
        },
        __removeAccountProblem: function (account, problem) {
            var idx = account.problems.indexOf(problem);
            if (idx === -1)
                return;
            account.problems.splice(idx, 1);
            account.enabled = account.problems.length === 0;
            this.__notifyModifiedAccount(account);
            if (account.enabled)
                this._resumeOpProcessingForAccount(account);
        },
        clearAccountProblems: function (account) {
            logic(this, 'clearAccountProblems', { accountId: account.id });
            account.enabled = true;
            account.problems = [];
            this._resumeOpProcessingForAccount(account);
        },
        __notifyBadLogin: makeBridgeFn('notifyBadLogin'),
        __notifyAddedAccount: makeBridgeFn('notifyAccountAdded'),
        __notifyModifiedAccount: makeBridgeFn('notifyAccountModified'),
        __notifyRemovedAccount: makeBridgeFn('notifyAccountRemoved'),
        __notifyAddedFolder: makeBridgeFn('notifyFolderAdded'),
        __notifyModifiedFolder: makeBridgeFn('notifyFolderModified'),
        __notifyRemovedFolder: makeBridgeFn('notifyFolderRemoved'),
        __notifyModifiedBody: makeBridgeFn('notifyBodyModified'),
        __notifyStartedCronSync: makeBridgeFn('notifyCronSyncStart'),
        __notifyStoppedCronSync: makeBridgeFn('notifyCronSyncStop'),
        __notifyBackgroundSendStatus: makeBridgeFn('notifyBackgroundSendStatus'),
        saveUniverseState: function (callback) {
            var curTrans = null;
            var latch = $allback.latch();
            logic(this, 'saveUniverseState_begin');
            for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
                var account = this.accounts[iAcct];
                curTrans = account.saveAccountState(curTrans, latch.defer(account.id), 'saveUniverse');
            }
            latch.then(function () {
                logic(this, 'saveUniverseState_end');
                if (callback) {
                    callback();
                }
                ;
            }.bind(this));
        },
        shutdown: function (callback) {
            var waitCount = this.accounts.length;
            function accountShutdownCompleted() {
                if (--waitCount === 0)
                    callback();
            }
            for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
                var account = this.accounts[iAcct];
                account.shutdown(callback ? accountShutdownCompleted : null);
            }
            if (this._cronSync) {
                this._cronSync.shutdown();
            }
            this._db.close();
            if (!this.accounts.length)
                callback();
        },
        getAccountForAccountId: function mu_getAccountForAccountId(accountId) {
            return this._accountsById[accountId];
        },
        getAccountForFolderId: function mu_getAccountForFolderId(folderId) {
            var accountId = folderId.substring(0, folderId.indexOf('/')), account = this._accountsById[accountId];
            return account;
        },
        getAccountForMessageSuid: function mu_getAccountForMessageSuid(messageSuid) {
            var accountId = messageSuid.substring(0, messageSuid.indexOf('/')), account = this._accountsById[accountId];
            return account;
        },
        getFolderStorageForFolderId: function mu_getFolderStorageForFolderId(folderId) {
            var account = this.getAccountForFolderId(folderId);
            return account.getFolderStorageForFolderId(folderId);
        },
        getFolderStorageForMessageSuid: function mu_getFolderStorageForFolderId(messageSuid) {
            var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/')), account = this.getAccountForFolderId(folderId);
            return account.getFolderStorageForFolderId(folderId);
        },
        getAccountForSenderIdentityId: function mu_getAccountForSenderIdentityId(identityId) {
            var accountId = identityId.substring(0, identityId.indexOf('/')), account = this._accountsById[accountId];
            return account;
        },
        getIdentityForSenderIdentityId: function mu_getIdentityForSenderIdentityId(identityId) {
            return this._identitiesById[identityId];
        },
        _partitionMessagesByAccount: function (messageNamers, targetAccountId) {
            var results = [], acctToMsgs = {};
            for (var i = 0; i < messageNamers.length; i++) {
                var messageNamer = messageNamers[i], messageSuid = messageNamer.suid, accountId = messageSuid.substring(0, messageSuid.indexOf('/'));
                if (!acctToMsgs.hasOwnProperty(accountId)) {
                    var messages = [messageNamer];
                    results.push({
                        account: this._accountsById[accountId],
                        messages: messages,
                        crossAccount: targetAccountId && targetAccountId !== accountId
                    });
                    acctToMsgs[accountId] = messages;
                } else {
                    acctToMsgs[accountId].push(messageNamer);
                }
            }
            return results;
        },
        _deferOp: function (account, op) {
            this._opsByAccount[account.id].deferred.push(op.longtermId);
            if (this._deferredOpTimeout !== null)
                this._deferredOpTimeout = window.setTimeout(this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
        },
        _queueDeferredOps: function () {
            this._deferredOpTimeout = null;
            if (this._mode !== 'interactive') {
                console.log('delaying deferred op since mode is ' + this._mode);
                this._deferredOpTimeout = window.setTimeout(this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
                return;
            }
            for (var iAccount = 0; iAccount < this.accounts.length; iAccount++) {
                var account = this.accounts[iAccount], queues = this._opsByAccount[account.id];
                while (queues.deferred.length) {
                    var op = queues.deferred.shift();
                    if (queues.server.indexOf(op) === -1 && op.lifecycle !== 'undo')
                        this._queueAccountOp(account, op);
                }
            }
        },
        _localOpCompleted: function (account, op, err, resultIfAny, accountSaveSuggested) {
            var queues = this._opsByAccount[account.id], serverQueue = queues.server, localQueue = queues.local;
            var removeFromServerQueue = false, completeOp = false, wasMode = 'local_' + op.localStatus.slice(0, -3);
            if (err) {
                switch (err) {
                case 'defer':
                    if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
                        logic(this, 'opDeferred', {
                            type: op.type,
                            longtermId: op.longtermId
                        });
                        this._deferOp(account, op);
                        removeFromServerQueue = true;
                        break;
                    }
                default:
                    logic(this, 'opGaveUp', {
                        type: op.type,
                        longtermId: op.longtermId
                    });
                    op.lifecycle = 'moot';
                    op.localStatus = 'unknown';
                    op.serverStatus = 'moot';
                    removeFromServerQueue = true;
                    completeOp = true;
                    break;
                }
                accountSaveSuggested = false;
            } else {
                switch (op.localStatus) {
                case 'doing':
                    op.localStatus = 'done';
                    if (op.serverStatus === 'skip') {
                        removeFromServerQueue = true;
                        op.serverStatus = 'n/a';
                        accountSaveSuggested = true;
                    }
                    if (op.serverStatus === 'n/a') {
                        op.lifecycle = 'done';
                        completeOp = true;
                    }
                    break;
                case 'undoing':
                    op.localStatus = 'undone';
                    if (op.serverStatus === 'skip') {
                        removeFromServerQueue = true;
                        op.serverStatus = 'n/a';
                        accountSaveSuggested = true;
                    }
                    if (op.serverStatus === 'n/a') {
                        op.lifecycle = 'undone';
                        completeOp = true;
                    }
                    break;
                }
            }
            if (removeFromServerQueue) {
                var idx = serverQueue.indexOf(op);
                if (idx !== -1)
                    serverQueue.splice(idx, 1);
            }
            localQueue.shift();
            console.log('runOp_end(' + wasMode + ': ' + JSON.stringify(op).substring(0, 160) + ')\n');
            logic(account, 'runOp_end', {
                mode: wasMode,
                type: op.type,
                error: err,
                op: op
            });
            if (op._logicAsyncEvent) {
                if (err) {
                    op._logicAsyncEvent.reject(err);
                } else {
                    op._logicAsyncEvent.resolve();
                }
            }
            var callback;
            if (completeOp) {
                if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
                    callback = this._opCallbacks[op.longtermId];
                    delete this._opCallbacks[op.longtermId];
                }
            }
            if (accountSaveSuggested) {
                account.saveAccountState(null, this._startNextOp.bind(this, account, callback, op, err, resultIfAny), 'localOp:' + op.type);
                return;
            }
            this._startNextOp(account, callback, op, err, resultIfAny);
        },
        _serverOpCompleted: function (account, op, err, resultIfAny, accountSaveSuggested) {
            var queues = this._opsByAccount[account.id], serverQueue = queues.server, localQueue = queues.local;
            var scope = logic.subscope(this, {
                type: op.type,
                longtermId: op.longtermId
            });
            if (serverQueue[0] !== op)
                logic(scope, 'opInvariantFailure');
            var maybeRetry = false;
            var consumeOp = true;
            var completeOp = true;
            var wasMode = op.serverStatus.slice(0, -3);
            if (err) {
                switch (err) {
                case 'defer':
                    if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
                        if (op.serverStatus === 'doing' && op.lifecycle === 'do') {
                            logic(scope, 'opDeferred');
                            this._deferOp(account, op);
                        }
                        completeOp = false;
                    } else {
                        op.lifecycle = 'moot';
                        op.serverStatus = 'moot';
                    }
                    break;
                case 'aborted-retry':
                    op.tryCount++;
                    maybeRetry = true;
                    break;
                default:
                    op.tryCount += $syncbase.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT;
                    maybeRetry = true;
                    break;
                case 'failure-give-up':
                    logic(scope, 'opGaveUp');
                    op.lifecycle = 'moot';
                    op.serverStatus = 'moot';
                    break;
                case 'moot':
                    logic(scope, 'opMooted');
                    op.lifecycle = 'moot';
                    op.serverStatus = 'moot';
                    break;
                }
            } else {
                switch (op.serverStatus) {
                case 'checking':
                    switch (resultIfAny) {
                    case 'checked-notyet':
                    case 'coherent-notyet':
                        op.serverStatus = null;
                        break;
                    case 'idempotent':
                        if (op.lifecycle === 'do' || op.lifecycle === 'done')
                            op.serverStatus = null;
                        else
                            op.serverStatus = 'done';
                        break;
                    case 'happened':
                        op.serverStatus = 'done';
                        break;
                    case 'moot':
                        op.lifecycle = 'moot';
                        op.serverStatus = 'moot';
                        break;
                    case 'bailed':
                        logic(scope, 'opDeferred');
                        this._deferOp(account, op);
                        completeOp = false;
                        break;
                    }
                    break;
                case 'doing':
                    op.serverStatus = 'done';
                    if (op.lifecycle === 'do')
                        op.lifecycle = 'done';
                    break;
                case 'undoing':
                    op.serverStatus = 'undone';
                    if (op.lifecycle === 'undo')
                        op.lifecycle = 'undone';
                    break;
                }
                if (op.lifecycle === 'do' || op.lifecycle === 'undo')
                    consumeOp = false;
            }
            if (maybeRetry) {
                if (op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
                    op.serverStatus = 'check';
                    consumeOp = false;
                } else {
                    logic(scope, 'opTryLimitReached');
                    op.lifecycle = 'moot';
                    op.serverStatus = 'moot';
                }
            }
            if (consumeOp)
                serverQueue.shift();
            console.log('runOp_end(' + wasMode + ': ' + JSON.stringify(op).substring(0, 160) + ')\n');
            logic(account, 'runOp_end', {
                mode: wasMode,
                type: op.type,
                error: err,
                op: op
            });
            if (op._logicAsyncEvent) {
                if (err) {
                    op._logicAsyncEvent.reject(err);
                } else {
                    op._logicAsyncEvent.resolve();
                }
            }
            if (accountSaveSuggested)
                account._saveAccountIsImminent = true;
            var callback;
            if (completeOp) {
                if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
                    callback = this._opCallbacks[op.longtermId];
                    delete this._opCallbacks[op.longtermId];
                }
                if (accountSaveSuggested) {
                    account._saveAccountIsImminent = false;
                    account.saveAccountState(null, this._startNextOp.bind(this, account, callback, op, err, resultIfAny), 'serverOp:' + op.type);
                    return;
                }
            }
            this._startNextOp(account, callback, op, err, resultIfAny);
        },
        _startNextOp: function (account, callback, lastOp, err, result) {
            var queues = this._opsByAccount[account.id], serverQueue = queues.server, localQueue = queues.local;
            var op;
            if (callback) {
                try {
                    callback(err, result, account, lastOp);
                } catch (ex) {
                    console.log(ex.message, ex.stack);
                    logic(this, 'opCallbackErr', { type: lastOp.type });
                }
            }
            queues.active = false;
            if (localQueue.length) {
                op = localQueue[0];
                this._dispatchLocalOpForAccount(account, op);
            } else if (serverQueue.length && this.online && account.enabled) {
                op = serverQueue[0];
                this._dispatchServerOpForAccount(account, op);
            } else {
                if (this._opCompletionListenersByAccount[account.id]) {
                    this._opCompletionListenersByAccount[account.id](account);
                    this._opCompletionListenersByAccount[account.id] = null;
                }
                logic(this, 'allOpsCompleted', { accountId: account.id });
                account.allOperationsCompleted();
            }
        },
        _queueAccountOp: function (account, op, optionalCallback) {
            var queues = this._opsByAccount[account.id];
            console.log('queueOp', account.id, op.type, 'pre-queues:', 'local:', queues.local.length, 'server:', queues.server.length);
            if (op.longtermId === null) {
                op.longtermId = account.id + '/' + $a64.encodeInt(account.meta.nextMutationNum++);
                account.mutations.push(op);
                while (account.mutations.length > MAX_MUTATIONS_FOR_UNDO && account.mutations[0].lifecycle === 'done' || account.mutations[0].lifecycle === 'undone' || account.mutations[0].lifecycle === 'moot') {
                    account.mutations.shift();
                }
            } else if (op.longtermId === 'session') {
                op.longtermId = account.id + '/' + $a64.encodeInt(account.meta.nextMutationNum++);
            }
            if (optionalCallback)
                this._opCallbacks[op.longtermId] = optionalCallback;
            if (!this._testModeDisablingLocalOps && (op.lifecycle === 'do' && op.localStatus === null || op.lifecycle === 'undo' && op.localStatus !== 'undone' && op.localStatus !== 'unknown'))
                queues.local.push(op);
            if (op.serverStatus !== 'n/a' && op.serverStatus !== 'moot')
                queues.server.push(op);
            if (queues.active) {
            } else if (queues.local.length) {
                if (queues.local.length === 1 && queues.local[0] === op)
                    this._dispatchLocalOpForAccount(account, op);
            } else if (queues.server.length === 1 && queues.server[0] === op && this.online && account.enabled) {
                this._dispatchServerOpForAccount(account, op);
            }
            return op.longtermId;
        },
        waitForAccountOps: function (account, callback) {
            var queues = this._opsByAccount[account.id];
            if (!queues.active && queues.local.length === 0 && (queues.server.length === 0 || !this.online || !account.enabled))
                callback();
            else
                this._opCompletionListenersByAccount[account.id] = callback;
        },
        syncFolderList: function (account, callback) {
            this._queueAccountOp(account, {
                type: 'syncFolderList',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: 'done',
                serverStatus: null,
                tryCount: 0,
                humanOp: 'syncFolderList'
            }, callback);
        },
        purgeExcessMessages: function (account, folderId, callback) {
            this._queueAccountOp(account, {
                type: 'purgeExcessMessages',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'purgeExcessMessages',
                folderId: folderId
            }, callback);
        },
        downloadMessageBodyReps: function (suid, date, callback) {
            var account = this.getAccountForMessageSuid(suid);
            this._queueAccountOp(account, {
                type: 'downloadBodyReps',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: 'done',
                serverStatus: null,
                tryCount: 0,
                humanOp: 'downloadBodyReps',
                messageSuid: suid,
                messageDate: date
            }, callback);
        },
        downloadBodies: function (messages, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = null;
            }
            var self = this;
            var pending = 0;
            function next() {
                if (!--pending) {
                    callback();
                }
            }
            this._partitionMessagesByAccount(messages, null).forEach(function (x) {
                pending++;
                self._queueAccountOp(x.account, {
                    type: 'downloadBodies',
                    longtermId: 'session',
                    lifecycle: 'do',
                    localStatus: 'done',
                    serverStatus: null,
                    tryCount: 0,
                    humanOp: 'downloadBodies',
                    messages: x.messages,
                    options: options
                }, next);
            });
        },
        downloadMessageAttachments: function (messageSuid, messageDate, relPartIndices, attachmentIndices, registerAttachments, callback) {
            var account = this.getAccountForMessageSuid(messageSuid);
            var longtermId = this._queueAccountOp(account, {
                type: 'download',
                longtermId: null,
                lifecycle: 'do',
                localStatus: null,
                serverStatus: null,
                tryCount: 0,
                humanOp: 'download',
                messageSuid: messageSuid,
                messageDate: messageDate,
                relPartIndices: relPartIndices,
                attachmentIndices: attachmentIndices,
                registerAttachments: registerAttachments
            }, callback);
        },
        modifyMessageTags: function (humanOp, messageSuids, addTags, removeTags) {
            var self = this, longtermIds = [];
            this._partitionMessagesByAccount(messageSuids, null).forEach(function (x) {
                var longtermId = self._queueAccountOp(x.account, {
                    type: 'modtags',
                    longtermId: null,
                    lifecycle: 'do',
                    localStatus: null,
                    serverStatus: null,
                    tryCount: 0,
                    humanOp: humanOp,
                    messages: x.messages,
                    addTags: addTags,
                    removeTags: removeTags,
                    progress: 0
                });
                longtermIds.push(longtermId);
            });
            return longtermIds;
        },
        moveMessages: function (messageSuids, targetFolderId, callback) {
            var self = this, longtermIds = [], targetFolderAccount = this.getAccountForFolderId(targetFolderId);
            var latch = $allback.latch();
            this._partitionMessagesByAccount(messageSuids, null).forEach(function (x, i) {
                if (x.account !== targetFolderAccount)
                    throw new Error('cross-account moves not currently supported!');
                var targetStorage = targetFolderAccount.getFolderStorageForFolderId(targetFolderId);
                var isLocalOnly = targetStorage.isLocalOnly;
                for (var j = 0; j < x.messages.length && isLocalOnly; j++) {
                    var sourceStorage = self.getFolderStorageForMessageSuid(x.messages[j].suid);
                    if (!sourceStorage.isLocalOnly) {
                        isLocalOnly = false;
                    }
                }
                var longtermId = self._queueAccountOp(x.account, {
                    type: 'move',
                    longtermId: null,
                    lifecycle: 'do',
                    localStatus: null,
                    serverStatus: isLocalOnly ? 'n/a' : null,
                    tryCount: 0,
                    humanOp: 'move',
                    messages: x.messages,
                    targetFolder: targetFolderId
                }, latch.defer(i));
                longtermIds.push(longtermId);
            });
            latch.then(function (results) {
                var combinedMoveMap = {};
                for (var key in results) {
                    var moveMap = results[key][1];
                    for (var k in moveMap) {
                        combinedMoveMap[k] = moveMap[k];
                    }
                }
                callback && callback(null, combinedMoveMap);
            });
            return longtermIds;
        },
        deleteMessages: function (messageSuids) {
            var self = this, longtermIds = [];
            this._partitionMessagesByAccount(messageSuids, null).forEach(function (x) {
                var longtermId = self._queueAccountOp(x.account, {
                    type: 'delete',
                    longtermId: null,
                    lifecycle: 'do',
                    localStatus: null,
                    serverStatus: null,
                    tryCount: 0,
                    humanOp: 'delete',
                    messages: x.messages
                });
                longtermIds.push(longtermId);
            });
            return longtermIds;
        },
        appendMessages: function (folderId, messages, callback) {
            var account = this.getAccountForFolderId(folderId);
            var longtermId = this._queueAccountOp(account, {
                type: 'append',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: 'done',
                serverStatus: null,
                tryCount: 0,
                humanOp: 'append',
                messages: messages,
                folderId: folderId
            }, callback);
            return [longtermId];
        },
        saveSentDraft: function (folderId, sentSafeHeader, sentSafeBody, callback) {
            var account = this.getAccountForMessageSuid(sentSafeHeader.suid);
            var longtermId = this._queueAccountOp(account, {
                type: 'saveSentDraft',
                longtermId: null,
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'saveSentDraft',
                folderId: folderId,
                headerInfo: sentSafeHeader,
                bodyInfo: sentSafeBody
            }, callback);
            return [longtermId];
        },
        attachBlobToDraft: function (account, existingNamer, attachmentDef, callback) {
            this._queueAccountOp(account, {
                type: 'attachBlobToDraft',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'attachBlobToDraft',
                existingNamer: existingNamer,
                attachmentDef: attachmentDef
            }, callback);
        },
        detachAttachmentFromDraft: function (account, existingNamer, attachmentIndex, callback) {
            this._queueAccountOp(account, {
                type: 'detachAttachmentFromDraft',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'detachAttachmentFromDraft',
                existingNamer: existingNamer,
                attachmentIndex: attachmentIndex
            }, callback);
        },
        saveDraft: function (account, existingNamer, draftRep, callback) {
            var draftsFolderMeta = account.getFirstFolderWithType('localdrafts');
            var draftsFolderStorage = account.getFolderStorageForFolderId(draftsFolderMeta.id);
            var newId = draftsFolderStorage._issueNewHeaderId();
            var newDraftInfo = {
                id: newId,
                suid: draftsFolderStorage.folderId + '/' + newId,
                date: $date.NOW()
            };
            this._queueAccountOp(account, {
                type: 'saveDraft',
                longtermId: null,
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'saveDraft',
                existingNamer: existingNamer,
                newDraftInfo: newDraftInfo,
                draftRep: draftRep
            }, callback);
            return {
                suid: newDraftInfo.suid,
                date: newDraftInfo.date
            };
        },
        sendOutboxMessages: function (account, opts, callback) {
            opts = opts || {};
            console.log('outbox: sendOutboxMessages(', JSON.stringify(opts), ')');
            if (!this.online) {
                this.notifyOutboxSyncDone(account);
            }
            this._queueAccountOp(account, {
                type: 'sendOutboxMessages',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: 'n/a',
                serverStatus: null,
                tryCount: 0,
                beforeMessage: opts.beforeMessage,
                emitNotifications: opts.emitNotifications,
                humanOp: 'sendOutboxMessages'
            }, callback);
        },
        notifyOutboxSyncDone: function (account) {
            this.__notifyBackgroundSendStatus({
                accountId: account.id,
                state: 'syncDone'
            });
        },
        setOutboxSyncEnabled: function (account, enabled, callback) {
            this._queueAccountOp(account, {
                type: 'setOutboxSyncEnabled',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                outboxSyncEnabled: enabled,
                tryCount: 0,
                humanOp: 'setOutboxSyncEnabled'
            }, callback);
        },
        deleteDraft: function (account, messageNamer, callback) {
            this._queueAccountOp(account, {
                type: 'deleteDraft',
                longtermId: null,
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'deleteDraft',
                messageNamer: messageNamer
            }, callback);
        },
        createFolder: function (accountId, parentFolderId, folderName, folderType, containOtherFolders, callback) {
            var account = this.getAccountForAccountId(accountId);
            var longtermId = this._queueAccountOp(account, {
                type: 'createFolder',
                longtermId: null,
                lifecycle: 'do',
                localStatus: null,
                serverStatus: null,
                tryCount: 0,
                humanOp: 'createFolder',
                parentFolderId: parentFolderId,
                folderName: folderName,
                folderType: folderType,
                containOtherFolders: containOtherFolders
            }, callback);
            return [longtermId];
        },
        undoMutation: function (longtermIds) {
            for (var i = 0; i < longtermIds.length; i++) {
                var longtermId = longtermIds[i], account = this.getAccountForFolderId(longtermId), queues = this._opsByAccount[account.id];
                for (var iOp = 0; iOp < account.mutations.length; iOp++) {
                    var op = account.mutations[iOp];
                    if (op.longtermId === longtermId) {
                        if (op.lifecycle === 'undo' || op.lifecycle === 'undone') {
                            continue;
                        }
                        if (op.lifecycle === 'done') {
                            op.lifecycle = 'undo';
                            this._queueAccountOp(account, op);
                            continue;
                        }
                        var idx = queues.local.indexOf(op);
                        if (idx !== -1) {
                            op.lifecycle = 'undone';
                            queues.local.splice(idx, 1);
                            continue;
                        }
                        op.lifecycle = 'undo';
                        this._queueAccountOp(account, op);
                    }
                }
            }
        },
        performFolderUpgrade: function (folderId, callback) {
            var account = this.getAccountForFolderId(folderId);
            this._queueAccountOp(account, {
                type: 'upgradeDB',
                longtermId: 'session',
                lifecycle: 'do',
                localStatus: null,
                serverStatus: 'n/a',
                tryCount: 0,
                humanOp: 'append',
                folderId: folderId
            }, callback);
        }
    };
});
;
define('worker-setup', [
    './worker-router',
    './mailbridge',
    'logic',
    './mailuniverse',
    'exports'
], function ($router, $mailbridge, logic, $mailuniverse, exports) {
    'use strict';
    var routerBridgeMaker = $router.registerInstanceType('bridge');
    var bridgeUniqueIdentifier = 0;
    function createBridgePair(universe) {
        var uid = bridgeUniqueIdentifier++;
        var TMB = new $mailbridge.MailBridge(universe);
        var routerInfo = routerBridgeMaker.register(function (data) {
            TMB.__receiveMessage(data.msg);
        });
        var sendMessage = routerInfo.sendMessage;
        TMB.__sendMessage = function (msg) {
            logic(TMB, 'send', {
                type: msg.type,
                msg: msg
            });
            sendMessage(null, msg);
        };
        TMB.__sendMessage({
            type: 'hello',
            config: universe.exposeConfigForClient()
        });
    }
    var universe = null;
    function onUniverse() {
        createBridgePair(universe);
        console.log('Mail universe/bridge created and notified!');
    }
    var sendControl = $router.registerSimple('control', function (data) {
        var args = data.args;
        switch (data.cmd) {
        case 'hello':
            universe = new $mailuniverse.MailUniverse(onUniverse, args[0]);
            break;
        case 'online':
        case 'offline':
            universe._onConnectionChange(args[0]);
            break;
        }
    });
    sendControl('hello');
});
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('bleach/css-parser/tokenizer', ['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory(root);
    }
}(this, function (exports) {
    var between = function (num, first, last) {
        return num >= first && num <= last;
    };
    function digit(code) {
        return between(code, 48, 57);
    }
    function hexdigit(code) {
        return digit(code) || between(code, 65, 70) || between(code, 97, 102);
    }
    function uppercaseletter(code) {
        return between(code, 65, 90);
    }
    function lowercaseletter(code) {
        return between(code, 97, 122);
    }
    function letter(code) {
        return uppercaseletter(code) || lowercaseletter(code);
    }
    function nonascii(code) {
        return code >= 160;
    }
    function namestartchar(code) {
        return letter(code) || nonascii(code) || code == 95;
    }
    function namechar(code) {
        return namestartchar(code) || digit(code) || code == 45;
    }
    function nonprintable(code) {
        return between(code, 0, 8) || between(code, 14, 31) || between(code, 127, 159);
    }
    function newline(code) {
        return code == 10 || code == 12;
    }
    function whitespace(code) {
        return newline(code) || code == 9 || code == 32;
    }
    function badescape(code) {
        return newline(code) || isNaN(code);
    }
    var maximumallowedcodepoint = 1114111;
    function tokenize(str, options) {
        if (options == undefined)
            options = {
                transformFunctionWhitespace: false,
                scientificNotation: false
            };
        var i = -1;
        var tokens = [];
        var state = 'data';
        var code;
        var currtoken;
        var line = 0;
        var column = 0;
        var lastLineLength = 0;
        var incrLineno = function () {
            line += 1;
            lastLineLength = column;
            column = 0;
        };
        var locStart = {
            line: line,
            column: column
        };
        var next = function (num) {
            if (num === undefined)
                num = 1;
            return str.charCodeAt(i + num);
        };
        var consume = function (num) {
            if (num === undefined)
                num = 1;
            i += num;
            code = str.charCodeAt(i);
            if (newline(code))
                incrLineno();
            else
                column += num;
            return true;
        };
        var reconsume = function () {
            i -= 1;
            if (newline(code)) {
                line -= 1;
                column = lastLineLength;
            } else {
                column -= 1;
            }
            locStart.line = line;
            locStart.column = column;
            return true;
        };
        var eof = function () {
            return i >= str.length;
        };
        var donothing = function () {
        };
        var emit = function (token) {
            if (token) {
                token.finish();
            } else {
                token = currtoken.finish();
            }
            if (options.loc === true) {
                token.loc = {};
                token.loc.start = {
                    line: locStart.line,
                    column: locStart.column,
                    idx: locStart.idx
                };
                locStart = {
                    line: line,
                    column: column,
                    idx: i
                };
                token.loc.end = locStart;
            }
            tokens.push(token);
            currtoken = undefined;
            return true;
        };
        var create = function (token) {
            currtoken = token;
            return true;
        };
        var parseerror = function () {
            return true;
        };
        var catchfire = function (msg) {
            return true;
        };
        var switchto = function (newstate) {
            state = newstate;
            return true;
        };
        var consumeEscape = function () {
            consume();
            if (hexdigit(code)) {
                var digits = [];
                for (var total = 0; total < 6; total++) {
                    if (hexdigit(code)) {
                        digits.push(code);
                        consume();
                    } else {
                        break;
                    }
                }
                var value = parseInt(digits.map(String.fromCharCode).join(''), 16);
                if (value > maximumallowedcodepoint)
                    value = 65533;
                if (!whitespace(code))
                    reconsume();
                return value;
            } else {
                return code;
            }
        };
        for (;;) {
            if (i > str.length * 2)
                return 'I\'m infinite-looping!';
            consume();
            switch (state) {
            case 'data':
                if (whitespace(code)) {
                    emit(new WhitespaceToken());
                    while (whitespace(next()))
                        consume();
                } else if (code == 34)
                    switchto('double-quote-string');
                else if (code == 35)
                    switchto('hash');
                else if (code == 39)
                    switchto('single-quote-string');
                else if (code == 40)
                    emit(new OpenParenToken());
                else if (code == 41)
                    emit(new CloseParenToken());
                else if (code == 43) {
                    if (digit(next()) || next() == 46 && digit(next(2)))
                        switchto('number') && reconsume();
                    else
                        emit(new DelimToken(code));
                } else if (code == 45) {
                    if (next(1) == 45 && next(2) == 62)
                        consume(2) && emit(new CDCToken());
                    else if (digit(next()) || next(1) == 46 && digit(next(2)))
                        switchto('number') && reconsume();
                    else
                        switchto('ident') && reconsume();
                } else if (code == 46) {
                    if (digit(next()))
                        switchto('number') && reconsume();
                    else
                        emit(new DelimToken(code));
                } else if (code == 47) {
                    if (next() == 42)
                        consume() && switchto('comment');
                    else
                        emit(new DelimToken(code));
                } else if (code == 58)
                    emit(new ColonToken());
                else if (code == 59)
                    emit(new SemicolonToken());
                else if (code == 60) {
                    if (next(1) == 33 && next(2) == 45 && next(3) == 45)
                        consume(3) && emit(new CDOToken());
                    else
                        emit(new DelimToken(code));
                } else if (code == 64)
                    switchto('at-keyword');
                else if (code == 91)
                    emit(new OpenSquareToken());
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit(new DelimToken(code));
                    else
                        switchto('ident') && reconsume();
                } else if (code == 93)
                    emit(new CloseSquareToken());
                else if (code == 123)
                    emit(new OpenCurlyToken());
                else if (code == 125)
                    emit(new CloseCurlyToken());
                else if (digit(code))
                    switchto('number') && reconsume();
                else if (code == 85 || code == 117) {
                    if (next(1) == 43 && hexdigit(next(2)))
                        consume() && switchto('unicode-range');
                    else
                        switchto('ident') && reconsume();
                } else if (namestartchar(code))
                    switchto('ident') && reconsume();
                else if (eof()) {
                    emit(new EOFToken());
                    return tokens;
                } else
                    emit(new DelimToken(code));
                break;
            case 'double-quote-string':
                if (currtoken == undefined)
                    create(new StringToken());
                if (code == 34)
                    emit() && switchto('data');
                else if (eof())
                    parseerror() && emit() && switchto('data') && reconsume();
                else if (newline(code))
                    parseerror() && emit(new BadStringToken()) && switchto('data') && reconsume();
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit(new BadStringToken()) && switchto('data');
                    else if (newline(next()))
                        consume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    currtoken.append(code);
                break;
            case 'single-quote-string':
                if (currtoken == undefined)
                    create(new StringToken());
                if (code == 39)
                    emit() && switchto('data');
                else if (eof())
                    parseerror() && emit() && switchto('data');
                else if (newline(code))
                    parseerror() && emit(new BadStringToken()) && switchto('data') && reconsume();
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit(new BadStringToken()) && switchto('data');
                    else if (newline(next()))
                        consume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    currtoken.append(code);
                break;
            case 'hash':
                if (namechar(code))
                    create(new HashToken(code)) && switchto('hash-rest');
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit(new DelimToken(35)) && switchto('data') && reconsume();
                    else
                        create(new HashToken(consumeEscape())) && switchto('hash-rest');
                } else
                    emit(new DelimToken(35)) && switchto('data') && reconsume();
                break;
            case 'hash-rest':
                if (namechar(code))
                    currtoken.append(code);
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    emit() && switchto('data') && reconsume();
                break;
            case 'comment':
                if (code == 42) {
                    if (next() == 47)
                        consume() && switchto('data');
                    else
                        donothing();
                } else if (eof())
                    parseerror() && switchto('data') && reconsume();
                else
                    donothing();
                break;
            case 'at-keyword':
                if (code == 45) {
                    if (namestartchar(next()))
                        create(new AtKeywordToken(45)) && switchto('at-keyword-rest');
                    else if (next(1) == 92 && !badescape(next(2)))
                        create(new AtKeywordtoken(45)) && switchto('at-keyword-rest');
                    else
                        parseerror() && emit(new DelimToken(64)) && switchto('data') && reconsume();
                } else if (namestartchar(code))
                    create(new AtKeywordToken(code)) && switchto('at-keyword-rest');
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit(new DelimToken(35)) && switchto('data') && reconsume();
                    else
                        create(new AtKeywordToken(consumeEscape())) && switchto('at-keyword-rest');
                } else
                    emit(new DelimToken(64)) && switchto('data') && reconsume();
                break;
            case 'at-keyword-rest':
                if (namechar(code))
                    currtoken.append(code);
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    emit() && switchto('data') && reconsume();
                break;
            case 'ident':
                if (code == 45) {
                    if (namestartchar(next()))
                        create(new IdentifierToken(code)) && switchto('ident-rest');
                    else if (next(1) == 92 && !badescape(next(2)))
                        create(new IdentifierToken(code)) && switchto('ident-rest');
                    else
                        emit(new DelimToken(45)) && switchto('data');
                } else if (namestartchar(code))
                    create(new IdentifierToken(code)) && switchto('ident-rest');
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && switchto('data') && reconsume();
                    else
                        create(new IdentifierToken(consumeEscape())) && switchto('ident-rest');
                } else
                    catchfire('Hit the generic \'else\' clause in ident state.') && switchto('data') && reconsume();
                break;
            case 'ident-rest':
                if (namechar(code))
                    currtoken.append(code);
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else if (code == 40) {
                    if (currtoken.ASCIImatch('url'))
                        switchto('url');
                    else
                        emit(new FunctionToken(currtoken)) && switchto('data');
                } else if (whitespace(code) && options.transformFunctionWhitespace)
                    switchto('transform-function-whitespace') && reconsume();
                else
                    emit() && switchto('data') && reconsume();
                break;
            case 'transform-function-whitespace':
                if (whitespace(next()))
                    donothing();
                else if (code == 40)
                    emit(new FunctionToken(currtoken)) && switchto('data');
                else
                    emit() && switchto('data') && reconsume();
                break;
            case 'number':
                create(new NumberToken());
                if (code == 45) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            45,
                            code
                        ]) && switchto('number-rest');
                    else if (next(1) == 46 && digit(next(2)))
                        consume(2) && currtoken.append([
                            45,
                            46,
                            code
                        ]) && switchto('number-fraction');
                    else
                        switchto('data') && reconsume();
                } else if (code == 43) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            43,
                            code
                        ]) && switchto('number-rest');
                    else if (next(1) == 46 && digit(next(2)))
                        consume(2) && currtoken.append([
                            43,
                            46,
                            code
                        ]) && switchto('number-fraction');
                    else
                        switchto('data') && reconsume();
                } else if (digit(code))
                    currtoken.append(code) && switchto('number-rest');
                else if (code == 46) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            46,
                            code
                        ]) && switchto('number-fraction');
                    else
                        switchto('data') && reconsume();
                } else
                    switchto('data') && reconsume();
                break;
            case 'number-rest':
                if (digit(code))
                    currtoken.append(code);
                else if (code == 46) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            46,
                            code
                        ]) && switchto('number-fraction');
                    else
                        emit() && switchto('data') && reconsume();
                } else if (code == 37)
                    emit(new PercentageToken(currtoken)) && switchto('data');
                else if (code == 69 || code == 101) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            37,
                            code
                        ]) && switchto('sci-notation');
                    else if ((next(1) == 43 || next(1) == 45) && digit(next(2)))
                        currtoken.append([
                            37,
                            next(1),
                            next(2)
                        ]) && consume(2) && switchto('sci-notation');
                    else
                        create(new DimensionToken(currtoken, code)) && switchto('dimension');
                } else if (code == 45) {
                    if (namestartchar(next()))
                        consume() && create(new DimensionToken(currtoken, [
                            45,
                            code
                        ])) && switchto('dimension');
                    else if (next(1) == 92 && badescape(next(2)))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else if (next(1) == 92)
                        consume() && create(new DimensionToken(currtoken, [
                            45,
                            consumeEscape()
                        ])) && switchto('dimension');
                    else
                        emit() && switchto('data') && reconsume();
                } else if (namestartchar(code))
                    create(new DimensionToken(currtoken, code)) && switchto('dimension');
                else if (code == 92) {
                    if (badescape(next))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        create(new DimensionToken(currtoken, consumeEscape)) && switchto('dimension');
                } else
                    emit() && switchto('data') && reconsume();
                break;
            case 'number-fraction':
                currtoken.type = 'number';
                if (digit(code))
                    currtoken.append(code);
                else if (code == 37)
                    emit(new PercentageToken(currtoken)) && switchto('data');
                else if (code == 69 || code == 101) {
                    if (digit(next()))
                        consume() && currtoken.append([
                            101,
                            code
                        ]) && switchto('sci-notation');
                    else if ((next(1) == 43 || next(1) == 45) && digit(next(2)))
                        currtoken.append([
                            101,
                            next(1),
                            next(2)
                        ]) && consume(2) && switchto('sci-notation');
                    else
                        create(new DimensionToken(currtoken, code)) && switchto('dimension');
                } else if (code == 45) {
                    if (namestartchar(next()))
                        consume() && create(new DimensionToken(currtoken, [
                            45,
                            code
                        ])) && switchto('dimension');
                    else if (next(1) == 92 && badescape(next(2)))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else if (next(1) == 92)
                        consume() && create(new DimensionToken(currtoken, [
                            45,
                            consumeEscape()
                        ])) && switchto('dimension');
                    else
                        emit() && switchto('data') && reconsume();
                } else if (namestartchar(code))
                    create(new DimensionToken(currtoken, code)) && switchto('dimension');
                else if (code == 92) {
                    if (badescape(next))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        create(new DimensionToken(currtoken, consumeEscape())) && switchto('dimension');
                } else
                    emit() && switchto('data') && reconsume();
                break;
            case 'dimension':
                if (namechar(code))
                    currtoken.append(code);
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && emit() && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    emit() && switchto('data') && reconsume();
                break;
            case 'sci-notation':
                currtoken.type = 'number';
                if (digit(code))
                    currtoken.append(code);
                else
                    emit() && switchto('data') && reconsume();
                break;
            case 'url':
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (code == 34)
                    switchto('url-double-quote');
                else if (code == 39)
                    switchto('url-single-quote');
                else if (code == 41)
                    emit(new URLToken()) && switchto('data');
                else if (whitespace(code))
                    donothing();
                else
                    switchto('url-unquoted') && reconsume();
                break;
            case 'url-double-quote':
                if (!(currtoken instanceof URLToken))
                    create(new URLToken());
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (code == 34)
                    switchto('url-end');
                else if (newline(code))
                    parseerror() && switchto('bad-url');
                else if (code == 92) {
                    if (newline(next()))
                        consume();
                    else if (badescape(next()))
                        parseerror() && emit(new BadURLToken()) && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    currtoken.append(code);
                break;
            case 'url-single-quote':
                if (!(currtoken instanceof URLToken))
                    create(new URLToken());
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (code == 39)
                    switchto('url-end');
                else if (newline(code))
                    parseerror() && switchto('bad-url');
                else if (code == 92) {
                    if (newline(next()))
                        consume();
                    else if (badescape(next()))
                        parseerror() && emit(new BadURLToken()) && switchto('data') && reconsume();
                    else
                        currtoken.append(consumeEscape());
                } else
                    currtoken.append(code);
                break;
            case 'url-end':
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (whitespace(code))
                    donothing();
                else if (code == 41)
                    emit() && switchto('data');
                else
                    parseerror() && switchto('bad-url') && reconsume();
                break;
            case 'url-unquoted':
                if (!(currtoken instanceof URLToken))
                    create(new URLToken());
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (whitespace(code))
                    switchto('url-end');
                else if (code == 41)
                    emit() && switchto('data');
                else if (code == 34 || code == 39 || code == 40 || nonprintable(code))
                    parseerror() && switchto('bad-url');
                else if (code == 92) {
                    if (badescape(next()))
                        parseerror() && switchto('bad-url');
                    else
                        currtoken.append(consumeEscape());
                } else
                    currtoken.append(code);
                break;
            case 'bad-url':
                if (eof())
                    parseerror() && emit(new BadURLToken()) && switchto('data');
                else if (code == 41)
                    emit(new BadURLToken()) && switchto('data');
                else if (code == 92) {
                    if (badescape(next()))
                        donothing();
                    else
                        consumeEscape();
                } else
                    donothing();
                break;
            case 'unicode-range':
                var start = [code], end = [code];
                for (var total = 1; total < 6; total++) {
                    if (hexdigit(next())) {
                        consume();
                        start.push(code);
                        end.push(code);
                    } else
                        break;
                }
                if (next() == 63) {
                    for (; total < 6; total++) {
                        if (next() == 63) {
                            consume();
                            start.push('0'.charCodeAt(0));
                            end.push('f'.charCodeAt(0));
                        } else
                            break;
                    }
                    emit(new UnicodeRangeToken(start, end)) && switchto('data');
                } else if (next(1) == 45 && hexdigit(next(2))) {
                    consume();
                    consume();
                    end = [code];
                    for (var total = 1; total < 6; total++) {
                        if (hexdigit(next())) {
                            consume();
                            end.push(code);
                        } else
                            break;
                    }
                    emit(new UnicodeRangeToken(start, end)) && switchto('data');
                } else
                    emit(new UnicodeRangeToken(start)) && switchto('data');
                break;
            default:
                catchfire('Unknown state \'' + state + '\'');
            }
        }
    }
    function stringFromCodeArray(arr) {
        return String.fromCharCode.apply(null, arr.filter(function (e) {
            return e;
        }));
    }
    function CSSParserToken(options) {
        return this;
    }
    CSSParserToken.prototype.finish = function () {
        return this;
    };
    CSSParserToken.prototype.toString = function () {
        return this.tokenType;
    };
    CSSParserToken.prototype.toJSON = function () {
        return this.toString();
    };
    function BadStringToken() {
        return this;
    }
    BadStringToken.prototype = new CSSParserToken();
    BadStringToken.prototype.tokenType = 'BADSTRING';
    function BadURLToken() {
        return this;
    }
    BadURLToken.prototype = new CSSParserToken();
    BadURLToken.prototype.tokenType = 'BADURL';
    function WhitespaceToken() {
        return this;
    }
    WhitespaceToken.prototype = new CSSParserToken();
    WhitespaceToken.prototype.tokenType = 'WHITESPACE';
    WhitespaceToken.prototype.toString = function () {
        return 'WS';
    };
    function CDOToken() {
        return this;
    }
    CDOToken.prototype = new CSSParserToken();
    CDOToken.prototype.tokenType = 'CDO';
    function CDCToken() {
        return this;
    }
    CDCToken.prototype = new CSSParserToken();
    CDCToken.prototype.tokenType = 'CDC';
    function ColonToken() {
        return this;
    }
    ColonToken.prototype = new CSSParserToken();
    ColonToken.prototype.tokenType = ':';
    function SemicolonToken() {
        return this;
    }
    SemicolonToken.prototype = new CSSParserToken();
    SemicolonToken.prototype.tokenType = ';';
    function OpenCurlyToken() {
        return this;
    }
    OpenCurlyToken.prototype = new CSSParserToken();
    OpenCurlyToken.prototype.tokenType = '{';
    function CloseCurlyToken() {
        return this;
    }
    CloseCurlyToken.prototype = new CSSParserToken();
    CloseCurlyToken.prototype.tokenType = '}';
    function OpenSquareToken() {
        return this;
    }
    OpenSquareToken.prototype = new CSSParserToken();
    OpenSquareToken.prototype.tokenType = '[';
    function CloseSquareToken() {
        return this;
    }
    CloseSquareToken.prototype = new CSSParserToken();
    CloseSquareToken.prototype.tokenType = ']';
    function OpenParenToken() {
        return this;
    }
    OpenParenToken.prototype = new CSSParserToken();
    OpenParenToken.prototype.tokenType = '(';
    function CloseParenToken() {
        return this;
    }
    CloseParenToken.prototype = new CSSParserToken();
    CloseParenToken.prototype.tokenType = ')';
    function EOFToken() {
        return this;
    }
    EOFToken.prototype = new CSSParserToken();
    EOFToken.prototype.tokenType = 'EOF';
    function DelimToken(code) {
        this.value = String.fromCharCode(code);
        return this;
    }
    DelimToken.prototype = new CSSParserToken();
    DelimToken.prototype.tokenType = 'DELIM';
    DelimToken.prototype.toString = function () {
        return 'DELIM(' + this.value + ')';
    };
    function StringValuedToken() {
        return this;
    }
    StringValuedToken.prototype = new CSSParserToken();
    StringValuedToken.prototype.append = function (val) {
        if (val instanceof Array) {
            for (var i = 0; i < val.length; i++) {
                this.value.push(val[i]);
            }
        } else {
            this.value.push(val);
        }
        return true;
    };
    StringValuedToken.prototype.finish = function () {
        this.value = this.valueAsString();
        return this;
    };
    StringValuedToken.prototype.ASCIImatch = function (str) {
        return this.valueAsString().toLowerCase() == str.toLowerCase();
    };
    StringValuedToken.prototype.valueAsString = function () {
        if (typeof this.value == 'string')
            return this.value;
        return stringFromCodeArray(this.value);
    };
    StringValuedToken.prototype.valueAsCodes = function () {
        if (typeof this.value == 'string') {
            var ret = [];
            for (var i = 0; i < this.value.length; i++)
                ret.push(this.value.charCodeAt(i));
            return ret;
        }
        return this.value.filter(function (e) {
            return e;
        });
    };
    function IdentifierToken(val) {
        this.value = [];
        this.append(val);
    }
    IdentifierToken.prototype = new StringValuedToken();
    IdentifierToken.prototype.tokenType = 'IDENT';
    IdentifierToken.prototype.toString = function () {
        return 'IDENT(' + this.value + ')';
    };
    function FunctionToken(val) {
        this.value = val.finish().value;
    }
    FunctionToken.prototype = new StringValuedToken();
    FunctionToken.prototype.tokenType = 'FUNCTION';
    FunctionToken.prototype.toString = function () {
        return 'FUNCTION(' + this.value + ')';
    };
    function AtKeywordToken(val) {
        this.value = [];
        this.append(val);
    }
    AtKeywordToken.prototype = new StringValuedToken();
    AtKeywordToken.prototype.tokenType = 'AT-KEYWORD';
    AtKeywordToken.prototype.toString = function () {
        return 'AT(' + this.value + ')';
    };
    function HashToken(val) {
        this.value = [];
        this.append(val);
    }
    HashToken.prototype = new StringValuedToken();
    HashToken.prototype.tokenType = 'HASH';
    HashToken.prototype.toString = function () {
        return 'HASH(' + this.value + ')';
    };
    function StringToken(val) {
        this.value = [];
        this.append(val);
    }
    StringToken.prototype = new StringValuedToken();
    StringToken.prototype.tokenType = 'STRING';
    StringToken.prototype.toString = function () {
        return '"' + this.value + '"';
    };
    function URLToken(val) {
        this.value = [];
        this.append(val);
    }
    URLToken.prototype = new StringValuedToken();
    URLToken.prototype.tokenType = 'URL';
    URLToken.prototype.toString = function () {
        return 'URL(' + this.value + ')';
    };
    function NumberToken(val) {
        this.value = [];
        this.append(val);
        this.type = 'integer';
    }
    NumberToken.prototype = new StringValuedToken();
    NumberToken.prototype.tokenType = 'NUMBER';
    NumberToken.prototype.toString = function () {
        if (this.type == 'integer')
            return 'INT(' + this.value + ')';
        return 'NUMBER(' + this.value + ')';
    };
    NumberToken.prototype.finish = function () {
        this.repr = this.valueAsString();
        this.value = this.repr * 1;
        if (Math.abs(this.value) % 1 != 0)
            this.type = 'number';
        return this;
    };
    function PercentageToken(val) {
        val.finish();
        this.value = val.value;
        this.repr = val.repr;
    }
    PercentageToken.prototype = new CSSParserToken();
    PercentageToken.prototype.tokenType = 'PERCENTAGE';
    PercentageToken.prototype.toString = function () {
        return 'PERCENTAGE(' + this.value + ')';
    };
    function DimensionToken(val, unit) {
        val.finish();
        this.num = val.value;
        this.unit = [];
        this.repr = val.repr;
        this.append(unit);
    }
    DimensionToken.prototype = new CSSParserToken();
    DimensionToken.prototype.tokenType = 'DIMENSION';
    DimensionToken.prototype.toString = function () {
        return 'DIM(' + this.num + ',' + this.unit + ')';
    };
    DimensionToken.prototype.append = function (val) {
        if (val instanceof Array) {
            for (var i = 0; i < val.length; i++) {
                this.unit.push(val[i]);
            }
        } else {
            this.unit.push(val);
        }
        return true;
    };
    DimensionToken.prototype.finish = function () {
        this.unit = stringFromCodeArray(this.unit);
        this.repr += this.unit;
        return this;
    };
    function UnicodeRangeToken(start, end) {
        start = parseInt(stringFromCodeArray(start), 16);
        if (end === undefined)
            end = start + 1;
        else
            end = parseInt(stringFromCodeArray(end), 16);
        if (start > maximumallowedcodepoint)
            end = start;
        if (end < start)
            end = start;
        if (end > maximumallowedcodepoint)
            end = maximumallowedcodepoint;
        this.start = start;
        this.end = end;
        return this;
    }
    UnicodeRangeToken.prototype = new CSSParserToken();
    UnicodeRangeToken.prototype.tokenType = 'UNICODE-RANGE';
    UnicodeRangeToken.prototype.toString = function () {
        if (this.start + 1 == this.end)
            return 'UNICODE-RANGE(' + this.start.toString(16).toUpperCase() + ')';
        if (this.start < this.end)
            return 'UNICODE-RANGE(' + this.start.toString(16).toUpperCase() + '-' + this.end.toString(16).toUpperCase() + ')';
        return 'UNICODE-RANGE()';
    };
    UnicodeRangeToken.prototype.contains = function (code) {
        return code >= this.start && code < this.end;
    };
    exports.tokenize = tokenize;
    exports.EOFToken = EOFToken;
}));
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('bleach/css-parser/parser', [
            'require',
            'exports'
        ], factory);
    } else if (typeof exports !== 'undefined') {
        factory(require, exports);
    } else {
        factory(root);
    }
}(this, function (require, exports) {
    var tokenizer = require('./tokenizer');
    function parse(tokens, initialMode) {
        var mode = initialMode || 'top-level';
        var i = -1;
        var token;
        var stylesheet;
        switch (mode) {
        case 'top-level':
            stylesheet = new Stylesheet();
            break;
        case 'declaration':
            stylesheet = new StyleRule();
            break;
        }
        stylesheet.startTok = tokens[0];
        var stack = [stylesheet];
        var rule = stack[0];
        var consume = function (advance) {
            if (advance === undefined)
                advance = 1;
            i += advance;
            if (i < tokens.length)
                token = tokens[i];
            else
                token = new EOFToken();
            return true;
        };
        var reprocess = function () {
            i--;
            return true;
        };
        var next = function () {
            return tokens[i + 1];
        };
        var switchto = function (newmode) {
            if (newmode === undefined) {
                if (rule.fillType !== '')
                    mode = rule.fillType;
                else if (rule.type == 'STYLESHEET')
                    mode = 'top-level';
                else {
                }
            } else {
                mode = newmode;
            }
            return true;
        };
        var push = function (newRule) {
            rule = newRule;
            rule.startTok = token;
            stack.push(rule);
            return true;
        };
        var parseerror = function (msg) {
            return true;
        };
        var pop = function () {
            var oldrule = stack.pop();
            oldrule.endTok = token;
            rule = stack[stack.length - 1];
            rule.append(oldrule);
            return true;
        };
        var discard = function () {
            stack.pop();
            rule = stack[stack.length - 1];
            return true;
        };
        var finish = function () {
            while (stack.length > 1) {
                pop();
            }
            rule.endTok = token;
        };
        for (;;) {
            consume();
            switch (mode) {
            case 'top-level':
                switch (token.tokenType) {
                case 'CDO':
                case 'CDC':
                case 'WHITESPACE':
                    break;
                case 'AT-KEYWORD':
                    push(new AtRule(token.value)) && switchto('at-rule');
                    break;
                case '{':
                    parseerror('Attempt to open a curly-block at top-level.') && consumeAPrimitive();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    push(new StyleRule()) && switchto('selector') && reprocess();
                }
                break;
            case 'at-rule':
                switch (token.tokenType) {
                case ';':
                    pop() && switchto();
                    break;
                case '{':
                    if (rule.fillType !== '')
                        switchto(rule.fillType);
                    else
                        parseerror('Attempt to open a curly-block in a statement-type at-rule.') && discard() && switchto('next-block') && reprocess();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    rule.appendPrelude(consumeAPrimitive());
                }
                break;
            case 'rule':
                switch (token.tokenType) {
                case 'WHITESPACE':
                    break;
                case '}':
                    pop() && switchto();
                    break;
                case 'AT-KEYWORD':
                    push(new AtRule(token.value)) && switchto('at-rule');
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    push(new StyleRule()) && switchto('selector') && reprocess();
                }
                break;
            case 'selector':
                switch (token.tokenType) {
                case '{':
                    switchto('declaration');
                    break;
                case 'EOF':
                    discard() && finish();
                    return stylesheet;
                default:
                    rule.appendSelector(consumeAPrimitive());
                }
                break;
            case 'declaration':
                switch (token.tokenType) {
                case 'WHITESPACE':
                case ';':
                    break;
                case '}':
                    pop() && switchto();
                    break;
                case 'AT-RULE':
                    push(new AtRule(token.value)) && switchto('at-rule');
                    break;
                case 'IDENT':
                    push(new Declaration(token.value)) && switchto('after-declaration-name');
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    parseerror() && discard() && switchto('next-declaration');
                }
                break;
            case 'after-declaration-name':
                switch (token.tokenType) {
                case 'WHITESPACE':
                    break;
                case ':':
                    switchto('declaration-value');
                    break;
                case ';':
                    parseerror('Incomplete declaration - semicolon after property name.') && discard() && switchto();
                    break;
                case 'EOF':
                    discard() && finish();
                    return stylesheet;
                default:
                    parseerror('Invalid declaration - additional token after property name') && discard() && switchto('next-declaration');
                }
                break;
            case 'declaration-value':
                switch (token.tokenType) {
                case 'DELIM':
                    if (token.value == '!' && next().tokenType == 'IDENTIFIER' && next().value.toLowerCase() == 'important') {
                        consume();
                        rule.important = true;
                        switchto('declaration-end');
                    } else {
                        rule.append(token);
                    }
                    break;
                case ';':
                    pop() && switchto();
                    break;
                case '}':
                    pop() && pop() && switchto();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    rule.append(consumeAPrimitive());
                }
                break;
            case 'declaration-end':
                switch (token.tokenType) {
                case 'WHITESPACE':
                    break;
                case ';':
                    pop() && switchto();
                    break;
                case '}':
                    pop() && pop() && switchto();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    parseerror('Invalid declaration - additional token after !important.') && discard() && switchto('next-declaration');
                }
                break;
            case 'next-block':
                switch (token.tokenType) {
                case '{':
                    consumeAPrimitive() && switchto();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    consumeAPrimitive();
                    break;
                }
                break;
            case 'next-declaration':
                switch (token.tokenType) {
                case ';':
                    switchto('declaration');
                    break;
                case '}':
                    switchto('declaration') && reprocess();
                    break;
                case 'EOF':
                    finish();
                    return stylesheet;
                default:
                    consumeAPrimitive();
                    break;
                }
                break;
            default:
                return;
            }
        }
        function consumeAPrimitive() {
            switch (token.tokenType) {
            case '(':
            case '[':
            case '{':
                return consumeASimpleBlock();
            case 'FUNCTION':
                return consumeAFunc();
            default:
                return token;
            }
        }
        function consumeASimpleBlock() {
            var endingTokenType = {
                '(': ')',
                '[': ']',
                '{': '}'
            }[token.tokenType];
            var block = new SimpleBlock(token.tokenType);
            for (;;) {
                consume();
                switch (token.tokenType) {
                case 'EOF':
                case endingTokenType:
                    return block;
                default:
                    block.append(consumeAPrimitive());
                }
            }
        }
        function consumeAFunc() {
            var func = new Func(token.value);
            var arg = new FuncArg();
            for (;;) {
                consume();
                switch (token.tokenType) {
                case 'EOF':
                case ')':
                    func.append(arg);
                    return func;
                case 'DELIM':
                    if (token.value == ',') {
                        func.append(arg);
                        arg = new FuncArg();
                    } else {
                        arg.append(token);
                    }
                    break;
                default:
                    arg.append(consumeAPrimitive());
                }
            }
        }
    }
    function CSSParserRule() {
        return this;
    }
    CSSParserRule.prototype.fillType = '';
    CSSParserRule.prototype.toString = function (indent) {
        return JSON.stringify(this.toJSON(), null, indent);
    };
    CSSParserRule.prototype.append = function (val) {
        this.value.push(val);
        return this;
    };
    function Stylesheet() {
        this.value = [];
        return this;
    }
    Stylesheet.prototype = new CSSParserRule();
    Stylesheet.prototype.type = 'STYLESHEET';
    Stylesheet.prototype.toJSON = function () {
        return {
            type: 'stylesheet',
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    function AtRule(name) {
        this.name = name;
        this.prelude = [];
        this.value = [];
        if (name in AtRule.registry)
            this.fillType = AtRule.registry[name];
        return this;
    }
    AtRule.prototype = new CSSParserRule();
    AtRule.prototype.type = 'AT-RULE';
    AtRule.prototype.appendPrelude = function (val) {
        this.prelude.push(val);
        return this;
    };
    AtRule.prototype.toJSON = function () {
        return {
            type: 'at',
            name: this.name,
            prelude: this.prelude.map(function (e) {
                return e.toJSON();
            }),
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    AtRule.registry = {
        'import': '',
        'media': 'rule',
        'font-face': 'declaration',
        'page': 'declaration',
        'keyframes': 'rule',
        'namespace': '',
        'counter-style': 'declaration',
        'supports': 'rule',
        'document': 'rule',
        'font-feature-values': 'declaration',
        'viewport': '',
        'region-style': 'rule'
    };
    function StyleRule() {
        this.selector = [];
        this.value = [];
        return this;
    }
    StyleRule.prototype = new CSSParserRule();
    StyleRule.prototype.type = 'STYLE-RULE';
    StyleRule.prototype.fillType = 'declaration';
    StyleRule.prototype.appendSelector = function (val) {
        this.selector.push(val);
        return this;
    };
    StyleRule.prototype.toJSON = function () {
        return {
            type: 'selector',
            selector: this.selector.map(function (e) {
                return e.toJSON();
            }),
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    function Declaration(name) {
        this.name = name;
        this.value = [];
        return this;
    }
    Declaration.prototype = new CSSParserRule();
    Declaration.prototype.type = 'DECLARATION';
    Declaration.prototype.toJSON = function () {
        return {
            type: 'declaration',
            name: this.name,
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    function SimpleBlock(type) {
        this.name = type;
        this.value = [];
        return this;
    }
    SimpleBlock.prototype = new CSSParserRule();
    SimpleBlock.prototype.type = 'BLOCK';
    SimpleBlock.prototype.toJSON = function () {
        return {
            type: 'block',
            name: this.name,
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    function Func(name) {
        this.name = name;
        this.value = [];
        return this;
    }
    Func.prototype = new CSSParserRule();
    Func.prototype.type = 'FUNCTION';
    Func.prototype.toJSON = function () {
        return {
            type: 'func',
            name: this.name,
            value: this.value.map(function (e) {
                return e.toJSON();
            })
        };
    };
    function FuncArg() {
        this.value = [];
        return this;
    }
    FuncArg.prototype = new CSSParserRule();
    FuncArg.prototype.type = 'FUNCTION-ARG';
    FuncArg.prototype.toJSON = function () {
        return this.value.map(function (e) {
            return e.toJSON();
        });
    };
    exports.parse = parse;
}));
if (typeof exports === 'object' && typeof define !== 'function') {
    define = function (factory) {
        factory(require, exports, module);
    };
}
define('bleach', [
    'require',
    'exports',
    'module',
    './bleach/css-parser/tokenizer',
    './bleach/css-parser/parser'
], function (require, exports, module) {
    var tokenizer = require('./bleach/css-parser/tokenizer');
    var parser = require('./bleach/css-parser/parser');
    var ALLOWED_TAGS = [
        'a',
        'abbr',
        'acronym',
        'b',
        'blockquote',
        'code',
        'em',
        'i',
        'li',
        'ol',
        'strong',
        'ul'
    ];
    var ALLOWED_ATTRIBUTES = {
        'a': [
            'href',
            'title'
        ],
        'abbr': ['title'],
        'acronym': ['title']
    };
    var ALLOWED_STYLES = [];
    var Node = {
        ELEMENT_NODE: 1,
        ATTRIBUTE_NODE: 2,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        ENTITY_REFERENCE_NODE: 5,
        ENTITY_NODE: 6,
        PROCESSING_INSTRUCTION_NODE: 7,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9,
        DOCUMENT_TYPE_NODE: 10,
        DOCUMENT_FRAGMENT_NODE: 11,
        NOTATION_NODE: 12
    };
    var DEFAULTS = {
        tags: ALLOWED_TAGS,
        prune: [],
        attributes: ALLOWED_ATTRIBUTES,
        styles: ALLOWED_STYLES,
        strip: false,
        stripComments: true
    };
    exports.clean = function (html, opts) {
        if (!html)
            return '';
        html = html.replace(/<!DOCTYPE\s+[^>]*>/gi, '');
        return exports.cleanNode(html, opts);
    };
    exports.cleanNode = function (html, opts) {
        try {
            function debug(str) {
                console.log('Bleach: ' + str + '\n');
            }
            opts = opts || DEFAULTS;
            var attrsByTag = opts.hasOwnProperty('attributes') ? opts.attributes : DEFAULTS.attributes;
            var wildAttrs;
            if (Array.isArray(attrsByTag)) {
                wildAttrs = attrsByTag;
                attrsByTag = {};
            } else if (attrsByTag.hasOwnProperty('*')) {
                wildAttrs = attrsByTag['*'];
            } else {
                wildAttrs = [];
            }
            var sanitizeOptions = {
                ignoreComment: 'stripComments' in opts ? opts.stripComments : DEFAULTS.stripComments,
                allowedStyles: opts.styles || DEFAULTS.styles,
                allowedTags: opts.tags || DEFAULTS.tags,
                stripMode: 'strip' in opts ? opts.strip : DEFAULTS.strip,
                pruneTags: opts.prune || DEFAULTS.prune,
                allowedAttributesByTag: attrsByTag,
                wildAttributes: wildAttrs,
                callbackRegexp: opts.callbackRegexp || null,
                callback: opts.callbackRegexp && opts.callback || null,
                maxLength: opts.maxLength || 0
            };
            var sanitizer = new HTMLSanitizer(sanitizeOptions);
            HTMLParser.HTMLParser(html, sanitizer);
            return sanitizer.output;
        } catch (e) {
            console.error(e, '\n', e.stack);
            throw e;
        }
    };
    var RE_NORMALIZE_WHITESPACE = /\s+/g;
    var HTMLSanitizer = function (options) {
        this.output = '';
        this.ignoreComment = options.ignoreComment;
        this.allowedStyles = options.allowedStyles;
        this.allowedTags = options.allowedTags;
        this.stripMode = options.stripMode;
        this.pruneTags = options.pruneTags;
        this.allowedAttributesByTag = options.allowedAttributesByTag;
        this.wildAttributes = options.wildAttributes;
        this.callbackRegexp = options.callbackRegexp;
        this.callback = options.callback;
        this.isInsideStyleTag = false;
        this.isInsidePrunedTag = 0;
        this.isInsideStrippedTag = 0;
        this.maxLength = options.maxLength || 0;
        this.complete = false;
        this.ignoreFragments = this.maxLength > 0;
    };
    HTMLSanitizer.prototype = {
        start: function (tag, attrs, unary) {
            if (this.pruneTags.indexOf(tag) !== -1) {
                if (!unary)
                    this.isInsidePrunedTag++;
                return;
            } else if (this.isInsidePrunedTag) {
                return;
            }
            if (this.allowedTags.indexOf(tag) === -1) {
                if (this.stripMode) {
                    if (!unary) {
                        this.isInsideStrippedTag++;
                    }
                    return;
                }
                this.output += '&lt;' + (unary ? '/' : '') + tag + '&gt;';
                return;
            }
            this.isInsideStyleTag = tag == 'style' && !unary;
            var callbackRegexp = this.callbackRegexp;
            if (callbackRegexp && callbackRegexp.test(tag)) {
                attrs = this.callback(tag, attrs);
            }
            var whitelist = this.allowedAttributesByTag[tag];
            var wildAttrs = this.wildAttributes;
            var result = '<' + tag;
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i];
                var attrName = attr.name.toLowerCase();
                if (attr.safe || wildAttrs.indexOf(attrName) !== -1 || whitelist && whitelist.indexOf(attrName) !== -1) {
                    if (attrName == 'style') {
                        var attrValue = '';
                        try {
                            attrValue = CSSParser.parseAttribute(attr.escaped, this.allowedStyles);
                        } catch (e) {
                            console.log('CSSParser.parseAttribute failed for: "' + attr.escaped + '", skipping. Error: ' + e);
                        }
                        result += ' ' + attrName + '="' + attrValue + '"';
                    } else {
                        result += ' ' + attrName + '="' + attr.escaped + '"';
                    }
                }
            }
            result += (unary ? '/' : '') + '>';
            this.output += result;
        },
        end: function (tag) {
            if (this.pruneTags.indexOf(tag) !== -1) {
                this.isInsidePrunedTag--;
                return;
            } else if (this.isInsidePrunedTag) {
                return;
            }
            if (this.allowedTags.indexOf(tag) === -1) {
                if (this.isInsideStrippedTag) {
                    this.isInsideStrippedTag--;
                    return;
                }
                this.output += '&lt;/' + tag + '&gt;';
                return;
            }
            if (this.isInsideStyleTag) {
                this.isInsideStyleTag = false;
            }
            this.output += '</' + tag + '>';
        },
        chars: function (text) {
            if (this.isInsidePrunedTag || this.complete)
                return;
            if (this.isInsideStyleTag) {
                this.output += CSSParser.parseBody(text, this.allowedStyles);
                return;
            }
            if (this.maxLength) {
                if (this.insideTagForSnippet) {
                    if (text.indexOf('>') !== -1) {
                        this.insideTagForSnippet = false;
                    }
                    return;
                } else {
                    if (text.charAt(0) === '<') {
                        this.insideTagForSnippet = true;
                        return;
                    }
                }
                var normalizedText = text.replace(RE_NORMALIZE_WHITESPACE, ' ');
                var length = this.output.length;
                if (length && normalizedText[0] === ' ' && this.output[length - 1] === ' ') {
                    normalizedText = normalizedText.substring(1);
                }
                this.output += normalizedText;
                if (this.output.length >= this.maxLength) {
                    this.output = this.output.substring(0, this.maxLength);
                    this.complete = true;
                }
            } else {
                this.output += escapeHTMLTextKeepingExistingEntities(text);
            }
        },
        comment: function (comment) {
            if (this.isInsidePrunedTag)
                return;
            if (this.ignoreComment)
                return;
            this.output += '<!--' + comment + '-->';
        }
    };
    var HTMLParser = function () {
        var startTag = /^<(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)([^>]*)>/, endTag = /^<\/(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)[^>]*>/, attr = /(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|([^>\s]+)))?/g;
        var empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed');
        var block = makeMap('address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul');
        var inline = makeMap('abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var');
        var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr');
        var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');
        var special = makeMap('script,style');
        var HTMLParser = this.HTMLParser = function (html, handler) {
            var index, chars, match, stack = [], last = html;
            stack.last = function () {
                return this[this.length - 1];
            };
            while (html) {
                chars = true;
                if (!stack.last() || !special[stack.last()]) {
                    if (html.lastIndexOf('<!--', 0) == 0) {
                        index = html.indexOf('-->');
                        if (index >= 4) {
                            if (handler.comment)
                                handler.comment(html.substring(4, index));
                            html = html.substring(index + 3);
                            chars = false;
                        } else {
                            if (handler.comment)
                                handler.comment(html.substring(4, -1));
                            html = '';
                            chars = false;
                        }
                    } else if (html.lastIndexOf('</', 0) == 0) {
                        match = html.match(endTag);
                        if (match) {
                            html = html.substring(match[0].length);
                            match[0].replace(endTag, parseEndTag);
                            chars = false;
                        }
                    } else if (html.lastIndexOf('<', 0) == 0) {
                        match = html.match(startTag);
                        if (match) {
                            html = html.substring(match[0].length);
                            match[0].replace(startTag, parseStartTag);
                            chars = false;
                        }
                    }
                    if (chars) {
                        index = html.indexOf('<');
                        if (index === 0) {
                            var text = html.substring(0, 1);
                            html = html.substring(1);
                        } else {
                            var text = index < 0 ? html : html.substring(0, index);
                            html = index < 0 ? '' : html.substring(index);
                        }
                        if (handler.chars) {
                            handler.chars(text);
                            if (handler.complete)
                                return this;
                        }
                    }
                } else {
                    var skipWork = false;
                    html = html.replace(new RegExp('^([^]*?)</' + stack.last() + '[^>]*>', 'i'), function (all, text) {
                        if (!skipWork) {
                            text = text.replace(/<!--([^]*?)-->/g, '$1').replace(/<!\[CDATA\[([^]*?)]]>/g, '$1');
                            if (handler.chars) {
                                handler.chars(text);
                                skipWork = handler.complete;
                            }
                        }
                        return '';
                    });
                    if (handler.complete)
                        return this;
                    parseEndTag('', stack.last());
                }
                if (html == last) {
                    if (handler.ignoreFragments) {
                        return;
                    } else {
                        console.log(html);
                        console.log(last);
                        throw 'Parse Error: ' + html;
                    }
                }
                last = html;
            }
            parseEndTag();
            function parseStartTag(tag, tagName, rest) {
                tagName = tagName.toLowerCase();
                if (block[tagName]) {
                    while (stack.last() && inline[stack.last()]) {
                        parseEndTag('', stack.last());
                    }
                }
                if (closeSelf[tagName] && stack.last() == tagName) {
                    parseEndTag('', tagName);
                }
                var unary = empty[tagName];
                if (rest.length && rest[rest.length - 1] === '/') {
                    unary = true;
                    rest = rest.slice(0, -1);
                }
                if (!unary)
                    stack.push(tagName);
                if (handler.start) {
                    var attrs = [];
                    rest.replace(attr, function (match, name) {
                        var value = arguments[2] ? arguments[2] : arguments[3] ? arguments[3] : arguments[4] ? arguments[4] : fillAttrs[name] ? name : '';
                        attrs.push({
                            name: name,
                            value: value,
                            escaped: value.replace(/"/g, '&quot;'),
                            safe: false
                        });
                    });
                    if (handler.start)
                        handler.start(tagName, attrs, unary);
                }
            }
            function parseEndTag(tag, tagName) {
                if (!tagName)
                    var pos = 0;
                else {
                    tagName = tagName.toLowerCase();
                    for (var pos = stack.length - 1; pos >= 0; pos--)
                        if (stack[pos] == tagName)
                            break;
                }
                if (pos >= 0) {
                    for (var i = stack.length - 1; i >= pos; i--)
                        if (handler.end)
                            handler.end(stack[i]);
                    stack.length = pos;
                }
            }
        };
        function makeMap(str) {
            var obj = {}, items = str.split(',');
            for (var i = 0; i < items.length; i++)
                obj[items[i]] = true;
            return obj;
        }
        return this;
    }();
    var CSSParser = {
        parseAttribute: function (data, allowedStyles) {
            var tokens = tokenizer.tokenize(data, { loc: true });
            var rule = parser.parse(tokens, 'declaration');
            var keepText = [];
            this._filterDeclarations(null, rule.value, allowedStyles, data, keepText);
            var oot = keepText.join('');
            return oot;
        },
        _filterDeclarations: function (parent, decls, allowedStyles, fullText, textOut) {
            for (var i = 0; i < decls.length; i++) {
                var decl = decls[i];
                if (decl.type !== 'DECLARATION') {
                    continue;
                }
                if (allowedStyles.indexOf(decl.name) !== -1) {
                    textOut.push(fullText.substring(decl.startTok.loc.start.idx, parent && parent.endTok === decl.endTok ? decl.endTok.loc.start.idx : decl.endTok.loc.end.idx + 1));
                }
            }
        },
        parseBody: function (data, allowedStyles) {
            var body = '';
            var oot = '';
            try {
                var tokens = tokenizer.tokenize(data, { loc: true });
                var stylesheet = parser.parse(tokens);
                var keepText = [];
                for (var i = 0; i < stylesheet.value.length; i++) {
                    var sub = stylesheet.value[i];
                    if (sub.type === 'STYLE-RULE') {
                        keepText.push(data.substring(sub.startTok.loc.start.idx, sub.value.length ? sub.value[0].startTok.loc.start.idx : sub.endTok.loc.start.idx));
                        this._filterDeclarations(sub, sub.value, allowedStyles, data, keepText);
                        keepText.push(data.substring(sub.endTok.loc.start.idx, sub.endTok.loc.end.idx + 1));
                    }
                }
                oot = keepText.join('');
            } catch (e) {
                console.log('bleach CSS parsing failed, skipping. Error: ' + e);
                oot = '';
            }
            return oot;
        }
    };
    var entities = {
        34: 'quot',
        38: 'amp',
        39: 'apos',
        60: 'lt',
        62: 'gt',
        160: 'nbsp',
        161: 'iexcl',
        162: 'cent',
        163: 'pound',
        164: 'curren',
        165: 'yen',
        166: 'brvbar',
        167: 'sect',
        168: 'uml',
        169: 'copy',
        170: 'ordf',
        171: 'laquo',
        172: 'not',
        173: 'shy',
        174: 'reg',
        175: 'macr',
        176: 'deg',
        177: 'plusmn',
        178: 'sup2',
        179: 'sup3',
        180: 'acute',
        181: 'micro',
        182: 'para',
        183: 'middot',
        184: 'cedil',
        185: 'sup1',
        186: 'ordm',
        187: 'raquo',
        188: 'frac14',
        189: 'frac12',
        190: 'frac34',
        191: 'iquest',
        192: 'Agrave',
        193: 'Aacute',
        194: 'Acirc',
        195: 'Atilde',
        196: 'Auml',
        197: 'Aring',
        198: 'AElig',
        199: 'Ccedil',
        200: 'Egrave',
        201: 'Eacute',
        202: 'Ecirc',
        203: 'Euml',
        204: 'Igrave',
        205: 'Iacute',
        206: 'Icirc',
        207: 'Iuml',
        208: 'ETH',
        209: 'Ntilde',
        210: 'Ograve',
        211: 'Oacute',
        212: 'Ocirc',
        213: 'Otilde',
        214: 'Ouml',
        215: 'times',
        216: 'Oslash',
        217: 'Ugrave',
        218: 'Uacute',
        219: 'Ucirc',
        220: 'Uuml',
        221: 'Yacute',
        222: 'THORN',
        223: 'szlig',
        224: 'agrave',
        225: 'aacute',
        226: 'acirc',
        227: 'atilde',
        228: 'auml',
        229: 'aring',
        230: 'aelig',
        231: 'ccedil',
        232: 'egrave',
        233: 'eacute',
        234: 'ecirc',
        235: 'euml',
        236: 'igrave',
        237: 'iacute',
        238: 'icirc',
        239: 'iuml',
        240: 'eth',
        241: 'ntilde',
        242: 'ograve',
        243: 'oacute',
        244: 'ocirc',
        245: 'otilde',
        246: 'ouml',
        247: 'divide',
        248: 'oslash',
        249: 'ugrave',
        250: 'uacute',
        251: 'ucirc',
        252: 'uuml',
        253: 'yacute',
        254: 'thorn',
        255: 'yuml',
        402: 'fnof',
        913: 'Alpha',
        914: 'Beta',
        915: 'Gamma',
        916: 'Delta',
        917: 'Epsilon',
        918: 'Zeta',
        919: 'Eta',
        920: 'Theta',
        921: 'Iota',
        922: 'Kappa',
        923: 'Lambda',
        924: 'Mu',
        925: 'Nu',
        926: 'Xi',
        927: 'Omicron',
        928: 'Pi',
        929: 'Rho',
        931: 'Sigma',
        932: 'Tau',
        933: 'Upsilon',
        934: 'Phi',
        935: 'Chi',
        936: 'Psi',
        937: 'Omega',
        945: 'alpha',
        946: 'beta',
        947: 'gamma',
        948: 'delta',
        949: 'epsilon',
        950: 'zeta',
        951: 'eta',
        952: 'theta',
        953: 'iota',
        954: 'kappa',
        955: 'lambda',
        956: 'mu',
        957: 'nu',
        958: 'xi',
        959: 'omicron',
        960: 'pi',
        961: 'rho',
        962: 'sigmaf',
        963: 'sigma',
        964: 'tau',
        965: 'upsilon',
        966: 'phi',
        967: 'chi',
        968: 'psi',
        969: 'omega',
        977: 'thetasym',
        978: 'upsih',
        982: 'piv',
        8226: 'bull',
        8230: 'hellip',
        8242: 'prime',
        8243: 'Prime',
        8254: 'oline',
        8260: 'frasl',
        8472: 'weierp',
        8465: 'image',
        8476: 'real',
        8482: 'trade',
        8501: 'alefsym',
        8592: 'larr',
        8593: 'uarr',
        8594: 'rarr',
        8595: 'darr',
        8596: 'harr',
        8629: 'crarr',
        8656: 'lArr',
        8657: 'uArr',
        8658: 'rArr',
        8659: 'dArr',
        8660: 'hArr',
        8704: 'forall',
        8706: 'part',
        8707: 'exist',
        8709: 'empty',
        8711: 'nabla',
        8712: 'isin',
        8713: 'notin',
        8715: 'ni',
        8719: 'prod',
        8721: 'sum',
        8722: 'minus',
        8727: 'lowast',
        8730: 'radic',
        8733: 'prop',
        8734: 'infin',
        8736: 'ang',
        8743: 'and',
        8744: 'or',
        8745: 'cap',
        8746: 'cup',
        8747: 'int',
        8756: 'there4',
        8764: 'sim',
        8773: 'cong',
        8776: 'asymp',
        8800: 'ne',
        8801: 'equiv',
        8804: 'le',
        8805: 'ge',
        8834: 'sub',
        8835: 'sup',
        8836: 'nsub',
        8838: 'sube',
        8839: 'supe',
        8853: 'oplus',
        8855: 'otimes',
        8869: 'perp',
        8901: 'sdot',
        8968: 'lceil',
        8969: 'rceil',
        8970: 'lfloor',
        8971: 'rfloor',
        9001: 'lang',
        9002: 'rang',
        9674: 'loz',
        9824: 'spades',
        9827: 'clubs',
        9829: 'hearts',
        9830: 'diams',
        338: 'OElig',
        339: 'oelig',
        352: 'Scaron',
        353: 'scaron',
        376: 'Yuml',
        710: 'circ',
        732: 'tilde',
        8194: 'ensp',
        8195: 'emsp',
        8201: 'thinsp',
        8204: 'zwnj',
        8205: 'zwj',
        8206: 'lrm',
        8207: 'rlm',
        8211: 'ndash',
        8212: 'mdash',
        8216: 'lsquo',
        8217: 'rsquo',
        8218: 'sbquo',
        8220: 'ldquo',
        8221: 'rdquo',
        8222: 'bdquo',
        8224: 'dagger',
        8225: 'Dagger',
        8240: 'permil',
        8249: 'lsaquo',
        8250: 'rsaquo',
        8364: 'euro'
    };
    var reverseEntities;
    var entityRegExp = /\&([#a-zA-Z0-9]+);/g;
    function makeReverseEntities() {
        reverseEntities = {};
        Object.keys(entities).forEach(function (key) {
            reverseEntities[entities[key]] = key;
        });
    }
    function escapeHTMLTextKeepingExistingEntities(text) {
        return text.replace(/[<>"']|&(?![#a-zA-Z0-9]+;)/g, function (c) {
            return '&#' + c.charCodeAt(0) + ';';
        });
    }
    exports.unescapeHTMLEntities = function unescapeHTMLEntities(text) {
        return text.replace(entityRegExp, function (match, ref) {
            var converted = '';
            if (ref.charAt(0) === '#') {
                var secondChar = ref.charAt(1);
                if (secondChar === 'x' || secondChar === 'X') {
                    converted = String.fromCharCode(parseInt(ref.substring(2), 16));
                } else {
                    converted = String.fromCharCode(parseInt(ref.substring(1), 10));
                }
            } else {
                if (!reverseEntities)
                    makeReverseEntities();
                if (reverseEntities.hasOwnProperty(ref))
                    converted = String.fromCharCode(reverseEntities[ref]);
            }
            return converted;
        });
    };
    exports.escapePlaintextIntoElementContext = function (text) {
        return text.replace(/[&<>"'\/]/g, function (c) {
            var code = c.charCodeAt(0);
            return '&' + (entities[code] || '#' + code) + ';';
        });
    };
    exports.escapePlaintextIntoAttribute = function (text) {
        return text.replace(/[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u0100]/g, function (c) {
            var code = c.charCodeAt(0);
            return '&' + (entities[code] || '#' + code) + ';';
        });
    };
});
;
define('htmlchew', [
    'exports',
    'bleach'
], function (exports, $bleach) {
    var LEGAL_TAGS = [
        'a',
        'abbr',
        'acronym',
        'area',
        'article',
        'aside',
        'b',
        'bdi',
        'bdo',
        'big',
        'blockquote',
        'br',
        'caption',
        'center',
        'cite',
        'code',
        'col',
        'colgroup',
        'dd',
        'del',
        'details',
        'dfn',
        'dir',
        'div',
        'dl',
        'dt',
        'em',
        'figcaption',
        'figure',
        'font',
        'footer',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'i',
        'img',
        'ins',
        'kbd',
        'label',
        'legend',
        'li',
        'listing',
        'map',
        'mark',
        'nav',
        'nobr',
        'noscript',
        'ol',
        'output',
        'p',
        'pre',
        'q',
        'rp',
        'rt',
        'ruby',
        's',
        'samp',
        'section',
        'small',
        'span',
        'strike',
        'strong',
        'style',
        'sub',
        'summary',
        'sup',
        'table',
        'tbody',
        'td',
        'tfoot',
        'th',
        'thead',
        'time',
        'title',
        'tr',
        'tt',
        'u',
        'ul',
        'var',
        'wbr'
    ];
    var PRUNE_TAGS = [
        'button',
        'datalist',
        'script',
        'select',
        'svg',
        'title'
    ];
    var LEGAL_ATTR_MAP = {
        '*': [
            'abbr',
            'align',
            'alt',
            'axis',
            'bgcolor',
            'border',
            'cellpadding',
            'cellspacing',
            'charoff',
            'class',
            'clear',
            'color',
            'cols',
            'colspan',
            'compact',
            'coords',
            'datetime',
            'dir',
            'face',
            'frame',
            'headers',
            'height',
            'hspace',
            'id',
            'lang',
            'media',
            'nohref',
            'noshade',
            'nowrap',
            'open',
            'pointsize',
            'pubdate',
            'reversed',
            'rows',
            'rowspan',
            'rules',
            'size',
            'scope',
            'scoped',
            'shape',
            'span',
            'start',
            'summary',
            'style',
            'title',
            'valign',
            'value',
            'vspace',
            'width'
        ],
        'a': [
            'ext-href',
            'hreflang'
        ],
        'area': [
            'ext-href',
            'hreflang'
        ],
        'blockquote': [
            'cite',
            'type'
        ],
        'img': [
            'cid-src',
            'ext-src',
            'ismap',
            'usemap'
        ],
        'meta': ['charset'],
        'ol': ['type'],
        'style': ['type']
    };
    var LEGAL_STYLES = [
        'background-color',
        'border',
        'border-bottom',
        'border-bottom-color',
        'border-bottom-left-radius',
        'border-bottom-right-radius',
        'border-bottom-style',
        'border-bottom-width',
        'border-color',
        'border-left',
        'border-left-color',
        'border-left-style',
        'border-left-width',
        'border-radius',
        'border-right',
        'border-right-color',
        'border-right-style',
        'border-right-width',
        'border-style',
        'border-top',
        'border-top-color',
        'border-top-left-radius',
        'border-top-right-radius',
        'border-top-style',
        'border-top-width',
        'border-width',
        'clear',
        'color',
        'display',
        'float',
        'font-family',
        'font-size',
        'font-style',
        'font-weight',
        'height',
        'line-height',
        'list-style-position',
        'list-style-type',
        'margin',
        'margin-bottom',
        'margin-left',
        'margin-right',
        'margin-top',
        'padding',
        'padding-bottom',
        'padding-left',
        'padding-right',
        'padding-top',
        'text-align',
        'text-align-last',
        'text-decoration',
        'text-decoration-color',
        'text-decoration-line',
        'text-decoration-style',
        'text-indent',
        'vertical-align',
        'white-space',
        'width',
        'word-break',
        'word-spacing',
        'word-wrap'
    ];
    var RE_NODE_NEEDS_TRANSFORM = /^(?:a|area|img)$/;
    var RE_CID_URL = /^cid:/i;
    var RE_HTTP_URL = /^http(?:s)?/i;
    var RE_MAILTO_URL = /^mailto:/i;
    var RE_IMG_TAG = /^img$/;
    function getAttributeFromList(attrs, name) {
        var len = attrs.length;
        for (var i = 0; i < len; i++) {
            var attr = attrs[i];
            if (attr.name.toLowerCase() === name) {
                return attr;
            }
        }
        return null;
    }
    function stashLinks(lowerTag, attrs) {
        var classAttr;
        if (RE_IMG_TAG.test(lowerTag)) {
            attrs = attrs.filter(function (attr) {
                switch (attr.name.toLowerCase()) {
                case 'cid-src':
                case 'ext-src':
                    return false;
                case 'class':
                    classAttr = attr;
                default:
                    return true;
                }
            });
            var srcAttr = getAttributeFromList(attrs, 'src');
            if (srcAttr) {
                if (RE_CID_URL.test(srcAttr.escaped)) {
                    srcAttr.name = 'cid-src';
                    if (classAttr)
                        classAttr.escaped += ' moz-embedded-image';
                    else
                        attrs.push({
                            name: 'class',
                            escaped: 'moz-embedded-image'
                        });
                    srcAttr.escaped = srcAttr.escaped.substring(4);
                } else if (RE_HTTP_URL.test(srcAttr.escaped)) {
                    srcAttr.name = 'ext-src';
                    if (classAttr)
                        classAttr.escaped += ' moz-external-image';
                    else
                        attrs.push({
                            name: 'class',
                            escaped: 'moz-external-image'
                        });
                }
            }
        } else {
            attrs = attrs.filter(function (attr) {
                switch (attr.name.toLowerCase()) {
                case 'cid-src':
                case 'ext-src':
                    return false;
                case 'class':
                    classAttr = attr;
                default:
                    return true;
                }
            });
            var linkAttr = getAttributeFromList(attrs, 'href');
            if (linkAttr) {
                var link = linkAttr.escaped;
                if (RE_HTTP_URL.test(link) || RE_MAILTO_URL.test(link)) {
                    linkAttr.name = 'ext-href';
                    if (classAttr)
                        classAttr.escaped += ' moz-external-link';
                    else
                        attrs.push({
                            name: 'class',
                            escaped: 'moz-external-link'
                        });
                } else {
                    attrs.splice(attrs.indexOf(linkAttr), 1);
                }
            }
        }
        return attrs;
    }
    var BLEACH_SETTINGS = {
        tags: LEGAL_TAGS,
        strip: true,
        stripComments: true,
        prune: PRUNE_TAGS,
        attributes: LEGAL_ATTR_MAP,
        styles: LEGAL_STYLES,
        asNode: true,
        callbackRegexp: RE_NODE_NEEDS_TRANSFORM,
        callback: stashLinks
    };
    var BLEACH_SNIPPET_SETTINGS = {
        tags: [],
        strip: true,
        stripComments: true,
        prune: [
            'style',
            'button',
            'datalist',
            'script',
            'select',
            'svg',
            'title'
        ],
        asNode: true,
        maxLength: 100
    };
    exports.sanitizeAndNormalizeHtml = function sanitizeAndNormalize(htmlString) {
        return $bleach.clean(htmlString, BLEACH_SETTINGS);
    };
    exports.generateSnippet = function generateSnippet(htmlString) {
        return $bleach.unescapeHTMLEntities($bleach.clean(htmlString, BLEACH_SNIPPET_SETTINGS));
    };
    var BLEACH_SEARCHABLE_TEXT_WITH_QUOTES_SETTINGS = {
        tags: [],
        strip: true,
        stripComments: true,
        prune: [
            'style',
            'button',
            'datalist',
            'script',
            'select',
            'svg',
            'title'
        ],
        asNode: true
    };
    var BLEACH_SEARCHABLE_TEXT_WITHOUT_QUOTES_SETTINGS = {
        tags: [],
        strip: true,
        stripComments: true,
        prune: [
            'style',
            'button',
            'datalist',
            'script',
            'select',
            'svg',
            'title',
            'blockquote'
        ],
        asNode: true
    };
    exports.generateSearchableTextVersion = function (htmlString, includeQuotes) {
        var settings;
        if (includeQuotes) {
            settings = BLEACH_SEARCHABLE_TEXT_WITH_QUOTES_SETTINGS;
        } else {
            settings = BLEACH_SEARCHABLE_TEXT_WITHOUT_QUOTES_SETTINGS;
        }
        var cleaned = $bleach.clean(htmlString, settings);
        return $bleach.unescapeHTMLEntities(cleaned);
    };
    exports.wrapTextIntoSafeHTMLString = function (text, wrapTag, transformNewlines, attrs) {
        if (transformNewlines === undefined) {
            transformNewlines = true;
        }
        wrapTag = wrapTag || 'div';
        text = $bleach.escapePlaintextIntoElementContext(text);
        text = transformNewlines ? text.replace(/\n/g, '<br/>') : text;
        var attributes = '';
        if (attrs) {
            var len = attrs.length;
            for (var i = 0; i < len; i += 2) {
                attributes += ' ' + attrs[i] + '="' + $bleach.escapePlaintextIntoAttribute(attrs[i + 1]) + '"';
            }
        }
        return '<' + wrapTag + attributes + '>' + text + '</' + wrapTag + '>';
    };
    var RE_QUOTE_CHAR = /"/g;
    exports.escapeAttrValue = function (s) {
        return s.replace(RE_QUOTE_CHAR, '&quot;');
    };
});
;
define('searchfilter', [
    'logic',
    './util',
    './allback',
    './syncbase',
    './date',
    './htmlchew',
    'module',
    'exports'
], function (logic, $util, allback, $syncbase, $date, htmlchew, $module, exports) {
    var BEFORE = $date.BEFORE, ON_OR_BEFORE = $date.ON_OR_BEFORE, SINCE = $date.SINCE, STRICTLY_AFTER = $date.STRICTLY_AFTER;
    var bsearchMaybeExists = $util.bsearchMaybeExists, bsearchForInsert = $util.bsearchForInsert;
    function cmpMatchHeadersYoungToOld(aMatch, bMatch) {
        var a = aMatch.header, b = bMatch.header;
        var delta = b.date - a.date;
        if (delta)
            return delta;
        return b.id - a.id;
    }
    function matchRegexpOrString(phrase, input, fromIndex) {
        if (!input) {
            return null;
        }
        if (phrase instanceof RegExp) {
            return phrase.exec(fromIndex ? input.slice(fromIndex) : input);
        }
        var idx = input.indexOf(phrase, fromIndex);
        if (idx == -1) {
            return null;
        }
        var ret = [phrase];
        ret.index = idx - fromIndex;
        return ret;
    }
    function AuthorFilter(phrase) {
        this.phrase = phrase;
    }
    exports.AuthorFilter = AuthorFilter;
    AuthorFilter.prototype = {
        needsBody: false,
        testMessage: function (header, body, match) {
            var author = header.author, phrase = this.phrase, ret;
            if (ret = matchRegexpOrString(phrase, author.name, 0)) {
                match.author = {
                    text: author.name,
                    offset: 0,
                    matchRuns: [{
                            start: ret.index,
                            length: ret[0].length
                        }],
                    path: null
                };
                return true;
            }
            if (ret = matchRegexpOrString(phrase, author.address, 0)) {
                match.author = {
                    text: author.address,
                    offset: 0,
                    matchRuns: [{
                            start: ret.index,
                            length: ret[0].length
                        }],
                    path: null
                };
                return true;
            }
            match.author = null;
            return false;
        }
    };
    function RecipientFilter(phrase, stopAfterNMatches, checkTo, checkCc, checkBcc) {
        this.phrase = phrase;
        this.stopAfter = stopAfterNMatches;
        this.checkTo = checkTo;
        this.checkCc = checkCc;
        this.checkBcc = checkBcc;
    }
    exports.RecipientFilter = RecipientFilter;
    RecipientFilter.prototype = {
        needsBody: true,
        testMessage: function (header, body, match) {
            var phrase = this.phrase, stopAfter = this.stopAfter;
            var matches = [];
            function checkRecipList(list) {
                var ret;
                for (var i = 0; i < list.length; i++) {
                    var recip = list[i];
                    if (ret = matchRegexpOrString(phrase, recip.name, 0)) {
                        matches.push({
                            text: recip.name,
                            offset: 0,
                            matchRuns: [{
                                    start: ret.index,
                                    length: ret[0].length
                                }],
                            path: null
                        });
                        if (matches.length < stopAfter)
                            continue;
                        return;
                    }
                    if (ret = matchRegexpOrString(phrase, recip.address, 0)) {
                        matches.push({
                            text: recip.address,
                            offset: 0,
                            matchRuns: [{
                                    start: ret.index,
                                    length: ret[0].length
                                }],
                            path: null
                        });
                        if (matches.length >= stopAfter)
                            return;
                    }
                }
            }
            if (this.checkTo && header.to)
                checkRecipList(header.to);
            if (this.checkCc && header.cc && matches.length < stopAfter)
                checkRecipList(header.cc);
            if (this.checkBcc && header.bcc && matches.length < stopAfter)
                checkRecipList(header.bcc);
            if (matches.length) {
                match.recipients = matches;
                return true;
            } else {
                match.recipients = null;
                return false;
            }
        }
    };
    function snippetMatchHelper(str, start, length, contextBefore, contextAfter, path) {
        if (contextBefore > start)
            contextBefore = start;
        var offset = str.indexOf(' ', start - contextBefore);
        if (offset === -1 || offset >= start - 1) {
            offset = start - contextBefore;
        } else {
            offset++;
        }
        var endIdx;
        if (start + length + contextAfter >= str.length) {
            endIdx = str.length;
        } else {
            endIdx = str.lastIndexOf(' ', start + length + contextAfter - 1);
            if (endIdx <= start + length) {
                endIdx = start + length + contextAfter;
            }
        }
        var snippet = str.substring(offset, endIdx);
        return {
            text: snippet,
            offset: offset,
            matchRuns: [{
                    start: start - offset,
                    length: length
                }],
            path: path
        };
    }
    function SubjectFilter(phrase, stopAfterNMatches, contextBefore, contextAfter) {
        this.phrase = phrase;
        this.stopAfter = stopAfterNMatches;
        this.contextBefore = contextBefore;
        this.contextAfter = contextAfter;
    }
    exports.SubjectFilter = SubjectFilter;
    SubjectFilter.prototype = {
        needsBody: false,
        testMessage: function (header, body, match) {
            var subject = header.subject;
            if (!subject)
                return false;
            var phrase = this.phrase, slen = subject.length, stopAfter = this.stopAfter, contextBefore = this.contextBefore, contextAfter = this.contextAfter, matches = [], idx = 0;
            while (idx < slen && matches.length < stopAfter) {
                var ret = matchRegexpOrString(phrase, subject, idx);
                if (!ret)
                    break;
                matches.push(snippetMatchHelper(subject, idx + ret.index, ret[0].length, contextBefore, contextAfter, null));
                idx += ret.index + ret[0].length;
            }
            if (matches.length) {
                match.subject = matches;
                return true;
            } else {
                match.subject = null;
                return false;
            }
        }
    };
    var CT_AUTHORED_CONTENT = 1;
    var ELEMENT_NODE = 1, TEXT_NODE = 3;
    function BodyFilter(phrase, matchQuotes, stopAfterNMatches, contextBefore, contextAfter) {
        this.phrase = phrase;
        this.stopAfter = stopAfterNMatches;
        this.contextBefore = contextBefore;
        this.contextAfter = contextAfter;
        this.matchQuotes = matchQuotes;
    }
    exports.BodyFilter = BodyFilter;
    BodyFilter.prototype = {
        needsBody: true,
        testMessage: function (header, body, match) {
            var phrase = this.phrase, stopAfter = this.stopAfter, contextBefore = this.contextBefore, contextAfter = this.contextAfter, matches = [], matchQuotes = this.matchQuotes, idx, ret;
            for (var iBodyRep = 0; iBodyRep < body.bodyReps.length; iBodyRep++) {
                var bodyType = body.bodyReps[iBodyRep].type, bodyRep = body.bodyReps[iBodyRep].content;
                if (bodyType === 'plain') {
                    for (var iRep = 0; iRep < bodyRep.length && matches.length < stopAfter; iRep += 2) {
                        var etype = bodyRep[iRep] & 15, block = bodyRep[iRep + 1], repPath = null;
                        if (!matchQuotes && etype !== CT_AUTHORED_CONTENT)
                            continue;
                        for (idx = 0; idx < block.length && matches.length < stopAfter;) {
                            ret = matchRegexpOrString(phrase, block, idx);
                            if (!ret) {
                                break;
                            }
                            if (repPath === null) {
                                repPath = [
                                    iBodyRep,
                                    iRep
                                ];
                            }
                            matches.push(snippetMatchHelper(block, idx + ret.index, ret[0].length, contextBefore, contextAfter, repPath));
                            idx += ret.index + ret[0].length;
                        }
                    }
                } else if (bodyType === 'html') {
                    var searchableText = htmlchew.generateSearchableTextVersion(bodyRep, this.matchQuotes);
                    for (idx = 0; idx < bodyRep.length && matches.length < stopAfter;) {
                        ret = matchRegexpOrString(phrase, searchableText, idx);
                        if (!ret) {
                            break;
                        }
                        matches.push(snippetMatchHelper(searchableText, idx + ret.index, ret[0].length, contextBefore, contextAfter, null));
                        idx += ret.index + ret[0].length;
                    }
                }
            }
            if (matches.length) {
                match.body = matches;
                return true;
            } else {
                match.body = null;
                return false;
            }
        }
    };
    function MessageFilterer(filters) {
        this.filters = filters;
        this.bodiesNeeded = false;
        this.messagesChecked = 0;
        for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            if (filter.needsBody)
                this.bodiesNeeded = true;
        }
    }
    exports.MessageFilterer = MessageFilterer;
    MessageFilterer.prototype = {
        testMessage: function (header, body) {
            this.messagesChecked++;
            var matched = false, matchObj = {};
            var filters = this.filters;
            try {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.testMessage(header, body, matchObj))
                        matched = true;
                }
            } catch (ex) {
                console.error('filter exception', ex, '\n', ex.stack);
            }
            if (matched)
                return matchObj;
            else
                return false;
        }
    };
    var CONTEXT_CHARS_BEFORE = 16;
    var CONTEXT_CHARS_AFTER = 40;
    function SearchSlice(bridgeHandle, storage, phrase, whatToSearch) {
        console.log('sf: creating SearchSlice:', phrase);
        this._bridgeHandle = bridgeHandle;
        bridgeHandle.__listener = this;
        bridgeHandle.userCanGrowDownwards = false;
        this._storage = storage;
        logic.defineScope(this, 'SearchSlice');
        SearchSlice._TEST_latestInstance = this;
        this.startTS = null;
        this.startUID = null;
        this.endTS = null;
        this.endUID = null;
        var filters = [];
        if (phrase) {
            if (!(phrase instanceof RegExp)) {
                phrase = new RegExp(phrase.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), 'i');
            }
            if (whatToSearch.author)
                filters.push(new AuthorFilter(phrase));
            if (whatToSearch.recipients)
                filters.push(new RecipientFilter(phrase, 1, true, true, true));
            if (whatToSearch.subject)
                filters.push(new SubjectFilter(phrase, 1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));
            if (whatToSearch.body) {
                filters.push(new BodyFilter(phrase, whatToSearch.body === 'yes-quotes', 1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));
                this._pendingBodyLoadLatch = null;
            }
        }
        this.filterer = new MessageFilterer(filters);
        this._bound_gotOlderMessages = this._gotMessages.bind(this, 1);
        this._bound_gotNewerMessages = this._gotMessages.bind(this, -1);
        this.desiredHeaders = $syncbase.INITIAL_FILL_SIZE;
        this.reset();
    }
    exports.SearchSlice = SearchSlice;
    SearchSlice.prototype = {
        type: 'search',
        set atTop(val) {
            this._bridgeHandle.atTop = val;
        },
        get atBottom() {
            return this._bridgeHandle.atBottom;
        },
        set atBottom(val) {
            this._bridgeHandle.atBottom = val;
        },
        set headerCount(val) {
            if (this._bridgeHandle)
                this._bridgeHandle.headerCount = val;
            return val;
        },
        IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM: 1,
        reset: function () {
            this.headers = [];
            this.headerCount = 0;
            this._loading = true;
            this.startTS = null;
            this.startUID = null;
            this.endTS = null;
            this.endUID = null;
            this._storage.getMessagesInImapDateRange(0, null, this.desiredHeaders, this.desiredHeaders, this._gotMessages.bind(this, 1));
        },
        _gotMessages: function (dir, headers, moreMessagesComing) {
            if (!this._bridgeHandle) {
                return;
            }
            var logPrefix = moreMessagesComing ? 'sf: ' : 'sf:';
            console.log(logPrefix, 'gotMessages', headers.length, 'more coming?', moreMessagesComing);
            if (headers.length) {
                if (dir === -1) {
                    this.endTS = headers[0].date;
                    this.endUID = headers[0].id;
                } else {
                    var lastHeader = headers[headers.length - 1];
                    this.startTS = lastHeader.date;
                    this.startUID = lastHeader.id;
                    if (this.endTS === null) {
                        this.endTS = headers[0].date;
                        this.endUID = headers[0].id;
                    }
                }
            }
            var checkHandle = function checkHandle(headers, resolvedGetBodyCalls) {
                if (!this._bridgeHandle) {
                    return;
                }
                var matchPairs = [];
                for (i = 0; i < headers.length; i++) {
                    var header = headers[i], body = resolvedGetBodyCalls ? resolvedGetBodyCalls[header.id][0] : null;
                    this._headersChecked++;
                    var matchObj = this.filterer.testMessage(header, body);
                    if (matchObj)
                        matchPairs.push({
                            header: header,
                            matches: matchObj
                        });
                }
                var atTop = this.atTop = this._storage.headerIsYoungestKnown(this.endTS, this.endUID);
                var atBottom = this.atBottom = this._storage.headerIsOldestKnown(this.startTS, this.startUID);
                var canGetMore = dir === -1 ? !atTop : !atBottom;
                var willHave = this.headers.length + matchPairs.length, wantMore = !moreMessagesComing && willHave < this.desiredHeaders && canGetMore;
                if (matchPairs.length) {
                    console.log(logPrefix, 'willHave', willHave, 'of', this.desiredHeaders, 'want more?', wantMore);
                    var insertAt = dir === -1 ? 0 : this.headers.length;
                    logic(this, 'headersAppended', {
                        insertAt: insertAt,
                        matchPairs: matchPairs
                    });
                    this.headers.splice.apply(this.headers, [
                        insertAt,
                        0
                    ].concat(matchPairs));
                    this.headerCount = this.headers.length + (atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
                    this._bridgeHandle.sendSplice(insertAt, 0, matchPairs, true, moreMessagesComing || wantMore);
                    if (wantMore) {
                        console.log(logPrefix, 'requesting more because want more');
                        this.reqGrow(dir, false, true);
                    } else if (!moreMessagesComing) {
                        console.log(logPrefix, 'stopping (already reported), no want more.', 'can get more?', canGetMore);
                        this._loading = false;
                        this.desiredHeaders = this.headers.length;
                    }
                } else if (!moreMessagesComing) {
                    this.headerCount = this.headers.length + (atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
                    if (wantMore) {
                        console.log(logPrefix, 'requesting more because no matches but want more');
                        this._pendingBodyLoadLatch = null;
                        this.reqGrow(dir, false, true);
                    } else {
                        console.log(logPrefix, 'stopping, no matches, no want more.', 'can get more?', canGetMore);
                        this._bridgeHandle.sendStatus('synced', true, false);
                        this._loading = false;
                        this.desiredHeaders = this.headers.length;
                    }
                }
            }.bind(this);
            if (this.filterer.bodiesNeeded) {
                if (headers.length) {
                    var latch = this._pendingBodyLoadLatch = allback.latch();
                    for (var i = 0; i < headers.length; i++) {
                        var header = headers[i];
                        this._storage.getMessageBody(header.suid, header.date, latch.defer(header.id));
                    }
                    latch.then(checkHandle.bind(null, headers));
                } else {
                    var deferredCheck = checkHandle.bind(null, headers, null);
                    if (this._pendingBodyLoadLatch) {
                        this._pendingBodyLoadLatch.then(deferredCheck);
                    } else {
                        deferredCheck();
                    }
                }
            } else {
                checkHandle(headers, null);
            }
        },
        refresh: function () {
        },
        onHeaderAdded: function (header, body) {
            if (!this._bridgeHandle || this._loading) {
                return;
            }
            if (this.startTS === null || BEFORE(header.date, this.startTS)) {
                this.startTS = header.date;
                this.startUID = header.id;
            } else if (header.date === this.startTS && header.id < this.startUID) {
                this.startUID = header.id;
            }
            if (this.endTS === null || STRICTLY_AFTER(header.date, this.endTS)) {
                this.endTS = header.date;
                this.endUID = header.id;
            } else if (header.date === this.endTS && header.id > this.endUID) {
                this.endUID = header.id;
            }
            var matchObj = this.filterer.testMessage(header, body);
            if (!matchObj) {
                this.desiredHeaders = this.headers.length;
                return;
            }
            var wrappedHeader = {
                header: header,
                matches: matchObj
            };
            var idx = bsearchForInsert(this.headers, wrappedHeader, cmpMatchHeadersYoungToOld);
            this.desiredHeaders = this.headers.length;
            logic(this, 'headerAdded', {
                index: idx,
                header: wrappedHeader
            });
            this.headers.splice(idx, 0, wrappedHeader);
            this.headerCount = this.headers.length + (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
            this._bridgeHandle.sendSplice(idx, 0, [wrappedHeader], false, false);
        },
        onHeaderModified: function (header, body) {
            if (!this._bridgeHandle || this._loading) {
                return;
            }
            var wrappedHeader = {
                header: header,
                matches: null
            };
            var idx = bsearchMaybeExists(this.headers, wrappedHeader, cmpMatchHeadersYoungToOld);
            if (idx !== null) {
                var existingMatch = this.headers[idx];
                existingMatch.header = header;
                logic(this, 'headerModified', {
                    index: idx,
                    existingMatch: existingMatch
                });
                this._bridgeHandle.sendUpdate([
                    idx,
                    existingMatch
                ]);
                return;
            }
            if (!this.filterer.bodiesNeeded || !body) {
                return;
            }
            this.onHeaderAdded(header, body);
        },
        onHeaderRemoved: function (header) {
            if (!this._bridgeHandle) {
                return;
            }
            if (header.date === this.endTS && header.id === this.endUID) {
                if (!this.headers.length) {
                    this.endTS = null;
                    this.endUID = null;
                } else {
                    this.endTS = this.headers[0].header.date;
                    this.endUID = this.headers[0].header.id;
                }
            }
            if (header.date === this.startTS && header.id === this.startUID) {
                if (!this.headers.length) {
                    this.startTS = null;
                    this.startUID = null;
                } else {
                    var lastHeader = this.headers[this.headers.length - 1];
                    this.startTS = lastHeader.header.date;
                    this.startUID = lastHeader.header.id;
                }
            }
            var wrappedHeader = {
                header: header,
                matches: null
            };
            var idx = bsearchMaybeExists(this.headers, wrappedHeader, cmpMatchHeadersYoungToOld);
            if (idx !== null) {
                logic(this, 'headerRemoved', {
                    index: idx,
                    header: wrappedHeader
                });
                this.headers.splice(idx, 1);
                this.headerCount = this.headers.length + (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
                this._bridgeHandle.sendSplice(idx, 1, [], false, false);
            }
        },
        reqNoteRanges: function (firstIndex, firstSuid, lastIndex, lastSuid) {
            var i;
            if (firstIndex >= this.headers.length || this.headers[firstIndex].suid !== firstSuid) {
                firstIndex = 0;
                for (i = 0; i < this.headers.length; i++) {
                    if (this.headers[i].suid === firstSuid) {
                        firstIndex = i;
                        break;
                    }
                }
            }
            if (lastIndex >= this.headers.length || this.headers[lastIndex].suid !== lastSuid) {
                for (i = this.headers.length - 1; i >= 0; i--) {
                    if (this.headers[i].suid === lastSuid) {
                        lastIndex = i;
                        break;
                    }
                }
            }
            if (lastIndex + 1 < this.headers.length) {
                this.atBottom = false;
                this.userCanGrowDownwards = false;
                var delCount = this.headers.length - lastIndex - 1;
                this.desiredHeaders -= delCount;
                this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
                this.headerCount = this.headers.length + this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM;
                this._bridgeHandle.sendSplice(lastIndex + 1, delCount, [], true, firstIndex > 0);
                var lastHeader = this.headers[lastIndex].header;
                this.startTS = lastHeader.date;
                this.startUID = lastHeader.id;
            }
            if (firstIndex > 0) {
                this.atTop = false;
                this.desiredHeaders -= firstIndex;
                this.headers.splice(0, firstIndex);
                this.headerCount = this.headers.length + (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
                this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);
                var firstHeader = this.headers[0].header;
                this.endTS = firstHeader.date;
                this.endUID = firstHeader.id;
            }
        },
        reqGrow: function (dirMagnitude, userRequestsGrowth, autoDoNotDesireMore) {
            if (!autoDoNotDesireMore && this._loading) {
                return;
            }
            this._loading = true;
            var count;
            if (dirMagnitude < 0) {
                if (dirMagnitude === -1) {
                    count = $syncbase.INITIAL_FILL_SIZE;
                } else {
                    count = -dirMagnitude;
                }
                if (!autoDoNotDesireMore) {
                    this.desiredHeaders += count;
                }
                this._storage.getMessagesAfterMessage(this.endTS, this.endUID, count, this._gotMessages.bind(this, -1));
            } else {
                if (dirMagnitude <= 1) {
                    count = $syncbase.INITIAL_FILL_SIZE;
                } else {
                    count = dirMagnitude;
                }
                if (!autoDoNotDesireMore) {
                    this.desiredHeaders += count;
                }
                this._storage.getMessagesBeforeMessage(this.startTS, this.startUID, count, this._gotMessages.bind(this, 1));
            }
        },
        die: function () {
            this._storage.dyingSlice(this);
            this._bridgeHandle = null;
        }
    };
});
;
define('wakelocks', [
    'require',
    './worker-router'
], function (require) {
    'use strict';
    var $router = require('./worker-router');
    var sendMessage = $router.registerCallbackType('wakelocks');
    function SmartWakeLock(opts) {
        this.timeoutMs = opts.timeout || SmartWakeLock.DEFAULT_TIMEOUT_MS;
        var locks = this.locks = {};
        this._timeout = null;
        this._readyPromise = Promise.all(opts.locks.map(function (type) {
            return new Promise(function (resolve, reject) {
                sendMessage('requestWakeLock', [type], function (lockId) {
                    locks[type] = lockId;
                    resolve();
                });
            });
        })).then(function () {
            this._debug('Acquired', this, 'for', this.timeoutMs + 'ms');
            this.renew();
        }.bind(this));
    }
    SmartWakeLock.DEFAULT_TIMEOUT_MS = 45000;
    SmartWakeLock.prototype = {
        renew: function (reason, callback) {
            if (typeof reason === 'function') {
                callback = reason;
                reason = null;
            }
            this._readyPromise.then(function () {
                if (this._timeout) {
                    clearTimeout(this._timeout);
                    this._debug('Renewing', this, 'for another', this.timeoutMs + 'ms' + (reason ? ' (reason: ' + reason + ')' : '') + ',', 'would have expired in ' + (this.timeoutMs - (Date.now() - this._timeLastRenewed)) + 'ms if not renewed.');
                }
                this._timeLastRenewed = Date.now();
                this._timeout = setTimeout(function () {
                    this._debug('*** Unlocking', this, 'due to a TIMEOUT. Did you remember to unlock? ***');
                    this.unlock.bind(this);
                }.bind(this), this.timeoutMs);
                callback && callback();
            }.bind(this));
        },
        unlock: function (reason) {
            return this._readyPromise.then(function () {
                var desc = this.toString();
                var locks = this.locks;
                this.locks = {};
                clearTimeout(this._timeout);
                return Promise.all(Object.keys(locks).map(function (type) {
                    return new Promise(function (resolve, reject) {
                        sendMessage('unlock', [locks[type]], function (lockId) {
                            resolve();
                        });
                    });
                })).then(function () {
                    this._debug('Unlocked', desc + '.', reason ? 'Reason: ' + reason : '');
                }.bind(this));
            }.bind(this));
        },
        toString: function () {
            return Object.keys(this.locks).join('+') || '(no locks)';
        },
        _debug: function () {
            var args = Array.slice(arguments);
            console.log.apply(console, ['SmartWakeLock:'].concat(args));
        }
    };
    return { SmartWakeLock: SmartWakeLock };
});
define('headerCounter', [
    'module',
    'exports'
], function ($module, exports) {
    exports.countHeaders = function (storage, filter, options, callback) {
        var fetchClobber = null;
        if (typeof options === 'function') {
            callback = options;
        } else {
            fetchClobber = options.fetchSize;
        }
        var matched = 0;
        var fetchSize = fetchClobber || 100;
        var startTS = null;
        var startUID = null;
        function gotMessages(dir, callback, headers, moreMessagesComing) {
            var logPrefix = moreMessagesComing ? 'sf: ' : 'sf:';
            console.log(logPrefix, 'gotMessages', headers.length, 'more coming?', moreMessagesComing);
            if (headers.length) {
                var lastHeader = headers[headers.length - 1];
                startTS = lastHeader.date;
                startUID = lastHeader.id;
            }
            var checkHandle = function checkHandle(headers) {
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    var isMatch = filter(header);
                    if (isMatch) {
                        matched++;
                    }
                }
                var atBottom = storage.headerIsOldestKnown(startTS, startUID);
                var canGetMore = !atBottom, wantMore = !moreMessagesComing && canGetMore;
                if (wantMore) {
                    console.log(logPrefix, 'requesting more because want more');
                    getNewMessages(dir, false, true, callback);
                } else if (!moreMessagesComing) {
                    callback(matched);
                }
            };
            checkHandle(headers);
        }
        function getNewMessages(dirMagnitude, userRequestsGrowth, autoDoNotDesireMore, callback) {
            storage.flushExcessCachedBlocks('countHeaders');
            storage.getMessagesBeforeMessage(startTS, startUID, fetchSize, gotMessages.bind(null, 1, callback));
        }
        storage.getMessagesInImapDateRange(0, null, fetchSize, fetchSize, gotMessages.bind(null, 1, callback));
    };
});
;
define('jobmixins', [
    './worker-router',
    './util',
    './allback',
    './wakelocks',
    './date',
    './syncbase',
    './mailslice',
    './headerCounter',
    'logic',
    'exports',
    'require'
], function ($router, $util, $allback, $wakelocks, $date, $sync, $mailslice, $count, logic, exports, require) {
    var sendMessage = $router.registerCallbackType('devicestorage');
    exports.local_do_modtags = function (op, doneCallback, undo) {
        var self = this;
        var addTags = undo ? op.removeTags : op.addTags, removeTags = undo ? op.addTags : op.removeTags;
        var mutationsPerformed = 0;
        this._partitionAndAccessFoldersSequentially(op.messages, false, function perFolder(ignoredConn, storage, headers, namers, callWhenDone) {
            var waitingOn = headers.length;
            function next() {
                if (--waitingOn === 0)
                    callWhenDone();
            }
            for (var iHeader = 0; iHeader < headers.length; iHeader++) {
                var header = headers[iHeader];
                var iTag, tag, existing, modified = false;
                if (addTags) {
                    for (iTag = 0; iTag < addTags.length; iTag++) {
                        tag = addTags[iTag];
                        existing = header.flags.indexOf(tag);
                        if (existing !== -1)
                            continue;
                        header.flags.push(tag);
                        mutationsPerformed++;
                        if (tag === '\\Seen') {
                            storage.folderMeta.unreadCount--;
                        }
                        header.flags.sort();
                        modified = true;
                    }
                }
                if (removeTags) {
                    for (iTag = 0; iTag < removeTags.length; iTag++) {
                        tag = removeTags[iTag];
                        existing = header.flags.indexOf(tag);
                        if (existing === -1)
                            continue;
                        header.flags.splice(existing, 1);
                        mutationsPerformed++;
                        if (tag === '\\Seen') {
                            storage.folderMeta.unreadCount++;
                        }
                        modified = true;
                    }
                }
                storage.updateMessageHeader(header.date, header.id, false, header, null, next);
            }
        }, function () {
            if (mutationsPerformed === 0) {
                op.serverStatus = 'skip';
            }
            doneCallback(null, null, true);
        }, null, undo, 'modtags');
    };
    exports.local_undo_modtags = function (op, callback) {
        return this.local_do_modtags(op, callback, true);
    };
    exports.local_do_move = function (op, doneCallback, targetFolderId) {
        op.guids = {};
        var nukeServerIds = !this.resilientServerIds;
        var stateDelta = this._stateDelta, addWait = 0, self = this;
        if (!stateDelta.moveMap)
            stateDelta.moveMap = {};
        if (!stateDelta.serverIdMap)
            stateDelta.serverIdMap = {};
        if (!targetFolderId)
            targetFolderId = op.targetFolder;
        this._partitionAndAccessFoldersSequentially(op.messages, false, function perFolder(ignoredConn, sourceStorage, headers, namers, perFolderDone) {
            function targetOpened_nowProcess(ignoredConn, _targetStorage) {
                targetStorage = _targetStorage;
                processNext();
            }
            function processNext() {
                if (iNextHeader >= headers.length) {
                    perFolderDone();
                    return;
                }
                header = headers[iNextHeader++];
                sourceStorage.getMessageBody(header.suid, header.date, gotBody_nowDelete);
            }
            function gotBody_nowDelete(_body) {
                body = _body;
                if (header.srvid)
                    stateDelta.serverIdMap[header.suid] = header.srvid;
                if (sourceStorage === targetStorage || sourceStorage.folderMeta.type === 'localdrafts' && targetStorage.folderMeta.type !== 'outbox' || sourceStorage.folderMeta.type === 'outbox' && targetStorage.folderMeta.type !== 'localdrafts') {
                    if (op.type === 'move') {
                        processNext();
                    } else {
                        sourceStorage.deleteMessageHeaderAndBodyUsingHeader(header, processNext);
                    }
                } else {
                    sourceStorage.deleteMessageHeaderAndBodyUsingHeader(header, deleted_nowAdd);
                }
            }
            function deleted_nowAdd() {
                var sourceSuid = header.suid;
                header.id = targetStorage._issueNewHeaderId();
                header.suid = targetStorage.folderId + '/' + header.id;
                if (nukeServerIds)
                    header.srvid = null;
                stateDelta.moveMap[sourceSuid] = header.suid;
                addWait = 2;
                targetStorage.addMessageHeader(header, body, added);
                targetStorage.addMessageBody(header, body, added);
            }
            function added() {
                if (--addWait !== 0)
                    return;
                processNext();
            }
            var iNextHeader = 0, targetStorage = null, header = null, body = null, addWait = 0;
            if (sourceStorage.folderId === targetFolderId) {
                targetStorage = sourceStorage;
                processNext();
            } else {
                self._accessFolderForMutation(targetFolderId, false, targetOpened_nowProcess, null, 'local move target');
            }
        }, function () {
            doneCallback(null, stateDelta.moveMap, true);
        }, null, false, 'local move source');
    };
    exports.local_undo_move = function (op, doneCallback, targetFolderId) {
        doneCallback(null);
    };
    exports.local_do_delete = function (op, doneCallback) {
        var trashFolder = this.account.getFirstFolderWithType('trash');
        if (!trashFolder) {
            this.account.ensureEssentialOnlineFolders();
            doneCallback('defer');
            return;
        }
        this.local_do_move(op, doneCallback, trashFolder.id);
    };
    exports.local_undo_delete = function (op, doneCallback) {
        var trashFolder = this.account.getFirstFolderWithType('trash');
        if (!trashFolder) {
            doneCallback('unknown');
            return;
        }
        this.local_undo_move(op, doneCallback, trashFolder.id);
    };
    exports.do_download = function (op, callback) {
        var self = this;
        var idxLastSlash = op.messageSuid.lastIndexOf('/'), folderId = op.messageSuid.substring(0, idxLastSlash);
        var folderConn, folderStorage;
        var gotConn = function gotConn(_folderConn, _folderStorage) {
            folderConn = _folderConn;
            folderStorage = _folderStorage;
            folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
        };
        var deadConn = function deadConn() {
            callback('aborted-retry');
        };
        var partsToDownload = [], storePartsTo = [], registerDownload = [], header, bodyInfo, uid;
        var gotHeader = function gotHeader(_headerInfo) {
            header = _headerInfo;
            uid = header.srvid;
            folderStorage.getMessageBody(op.messageSuid, op.messageDate, gotBody);
        };
        var gotBody = function gotBody(_bodyInfo) {
            bodyInfo = _bodyInfo;
            var i, partInfo;
            for (i = 0; i < op.relPartIndices.length; i++) {
                partInfo = bodyInfo.relatedParts[op.relPartIndices[i]];
                if (partInfo.file)
                    continue;
                partsToDownload.push(partInfo);
                storePartsTo.push('idb');
                registerDownload.push(false);
            }
            for (i = 0; i < op.attachmentIndices.length; i++) {
                partInfo = bodyInfo.attachments[op.attachmentIndices[i]];
                if (partInfo.file)
                    continue;
                partsToDownload.push(partInfo);
                storePartsTo.push('sdcard');
                registerDownload.push(op.registerAttachments[i]);
            }
            folderConn.downloadMessageAttachments(uid, partsToDownload, gotParts);
        };
        var downloadErr = null;
        var gotParts = function gotParts(err, bodyBlobs) {
            if (bodyBlobs.length !== partsToDownload.length) {
                callback(err, null, false);
                return;
            }
            downloadErr = err;
            var pendingCbs = 1;
            function next() {
                if (!--pendingCbs) {
                    done();
                }
            }
            for (var i = 0; i < partsToDownload.length; i++) {
                var partInfo = partsToDownload[i], blob = bodyBlobs[i], storeTo = storePartsTo[i];
                if (blob) {
                    partInfo.sizeEstimate = blob.size;
                    partInfo.type = blob.type;
                    if (storeTo === 'idb') {
                        partInfo.file = blob;
                    } else {
                        pendingCbs++;
                        saveToDeviceStorage(self, blob, storeTo, registerDownload[i], partInfo.name, partInfo, next);
                    }
                }
            }
            next();
        };
        function done() {
            folderStorage.updateMessageBody(header, bodyInfo, { flushBecause: 'blobs' }, { changeDetails: { attachments: op.attachmentIndices } }, function () {
                callback(downloadErr, null, true);
            });
        }
        ;
        self._accessFolderForMutation(folderId, true, gotConn, deadConn, 'download');
    };
    var saveToDeviceStorage = exports.saveToDeviceStorage = function (scope, blob, storeTo, registerDownload, filename, partInfo, cb, isRetry) {
        var self = this;
        var callback = function (success, error, savedFilename, registered) {
            if (success) {
                logic(scope, 'savedAttachment', {
                    storeTo: storeTo,
                    type: blob.type,
                    size: blob.size
                });
                console.log('saved attachment to', storeTo, savedFilename, 'type:', blob.type, 'registered:', registered);
                partInfo.file = [
                    storeTo,
                    savedFilename
                ];
                cb();
            } else {
                logic(scope, 'saveFailure', {
                    storeTo: storeTo,
                    type: blob.type,
                    size: blob.size,
                    error: error,
                    filename: filename
                });
                console.warn('failed to save attachment to', storeTo, filename, 'type:', blob.type);
                if (isRetry) {
                    cb(error);
                    return;
                }
                var idxLastPeriod = filename.lastIndexOf('.');
                if (idxLastPeriod === -1)
                    idxLastPeriod = filename.length;
                filename = filename.substring(0, idxLastPeriod) + '-' + $date.NOW() + filename.substring(idxLastPeriod);
                saveToDeviceStorage(scope, blob, storeTo, registerDownload, filename, partInfo, cb, true);
            }
        };
        sendMessage('save', [
            storeTo,
            blob,
            filename,
            registerDownload
        ], callback);
    };
    exports.local_do_download = function (op, callback) {
        callback(null);
    };
    exports.check_download = function (op, callback) {
        callback(null, 'coherent-notyet');
    };
    exports.local_undo_download = function (op, callback) {
        callback(null);
    };
    exports.undo_download = function (op, callback) {
        callback(null);
    };
    exports.local_do_downloadBodies = function (op, callback) {
        callback(null);
    };
    exports.do_downloadBodies = function (op, callback) {
        var aggrErr = null, totalDownloaded = 0;
        this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, storage, headers, namers, callWhenDone) {
            folderConn.downloadBodies(headers, op.options, function (err, numDownloaded) {
                totalDownloaded += numDownloaded;
                if (err && !aggrErr) {
                    aggrErr = err;
                }
                callWhenDone();
            });
        }, function allDone() {
            callback(aggrErr, null, totalDownloaded > 0);
        }, function deadConn() {
            aggrErr = 'aborted-retry';
        }, false, 'downloadBodies', true);
    };
    exports.check_downloadBodies = function (op, callback) {
        callback(null, 'coherent-notyet');
    };
    exports.check_downloadBodyReps = function (op, callback) {
        callback(null, 'coherent-notyet');
    };
    exports.do_downloadBodyReps = function (op, callback) {
        var self = this;
        var idxLastSlash = op.messageSuid.lastIndexOf('/'), folderId = op.messageSuid.substring(0, idxLastSlash);
        var folderConn, folderStorage;
        var gotConn = function gotConn(_folderConn, _folderStorage) {
            folderConn = _folderConn;
            folderStorage = _folderStorage;
            folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
        };
        var deadConn = function deadConn() {
            callback('aborted-retry');
        };
        var gotHeader = function gotHeader(header) {
            if (!header) {
                callback();
                return;
            }
            folderStorage.getMessageBody(header.suid, header.date, function (body) {
                if (!folderStorage.messageBodyRepsDownloaded(body)) {
                    folderConn.downloadBodyReps(header, onDownloadReps);
                } else {
                    onDownloadReps(null, body, true);
                }
            });
        };
        var onDownloadReps = function onDownloadReps(err, bodyInfo, flushed) {
            if (err) {
                console.error('Error downloading reps', err);
                callback('unknown');
                return;
            }
            var save = !flushed;
            callback(null, bodyInfo, save);
        };
        self._accessFolderForMutation(folderId, true, gotConn, deadConn, 'downloadBodyReps');
    };
    exports.local_do_downloadBodyReps = function (op, callback) {
        callback(null);
    };
    exports.do_sendOutboxMessages = function (op, callback) {
        var account = this.account;
        var outboxFolder = account.getFirstFolderWithType('outbox');
        if (!outboxFolder) {
            callback('moot');
            return;
        }
        if (!account.outboxSyncEnabled) {
            console.log('outbox: Outbox syncing temporarily disabled; not syncing.');
            callback(null);
            return;
        }
        var outboxNeedsFreshSync = account.outboxNeedsFreshSync;
        if (outboxNeedsFreshSync) {
            console.log('outbox: This is the first outbox sync for this account.');
            account.outboxNeedsFreshSync = false;
        }
        var wakeLock = new $wakelocks.SmartWakeLock({
            locks: [
                'cpu',
                'wifi'
            ]
        });
        this._accessFolderForMutation(outboxFolder.id, false, function (nullFolderConn, folderStorage) {
            require(['jobs/outbox'], function ($outbox) {
                $outbox.sendNextAvailableOutboxMessage(account.compositeAccount || account, folderStorage, op.beforeMessage, op.emitNotifications, outboxNeedsFreshSync, wakeLock).then(function (result) {
                    var moreExpected = result.moreExpected;
                    var messageNamer = result.messageNamer;
                    wakeLock.unlock('send complete');
                    if (moreExpected) {
                        account.universe.sendOutboxMessages(account, { beforeMessage: messageNamer });
                    } else {
                        account.universe.notifyOutboxSyncDone(account);
                        folderStorage.markSyncRange($sync.OLDEST_SYNC_DATE, null, 'XXX', $date.NOW());
                    }
                    callback(null, null, true);
                }).catch(function (e) {
                    console.error('Exception while sending a message.', 'Send failure: ' + e, e.stack);
                    wakeLock.unlock(e);
                    callback('aborted-retry');
                });
            });
        }, null, 'sendOutboxMessages');
    };
    exports.check_sendOutboxMessages = function (op, callback) {
        callback(null, 'moot');
    };
    exports.local_undo_sendOutboxMessages = function (op, callback) {
        callback(null);
    };
    exports.local_do_setOutboxSyncEnabled = function (op, callback) {
        this.account.outboxSyncEnabled = op.outboxSyncEnabled;
        callback(null);
    };
    exports.postJobCleanup = function (error) {
        if (!error) {
            var deltaMap, fullMap;
            if (this._stateDelta.serverIdMap) {
                deltaMap = this._stateDelta.serverIdMap;
                fullMap = this._state.suidToServerId;
                for (var suid in deltaMap) {
                    var srvid = deltaMap[suid];
                    if (srvid === null)
                        delete fullMap[suid];
                    else
                        fullMap[suid] = srvid;
                }
            }
            if (this._stateDelta.moveMap) {
                deltaMap = this._stateDelta.moveMap;
                fullMap = this._state.moveMap;
                for (var oldSuid in deltaMap) {
                    var newSuid = deltaMap[oldSuid];
                    fullMap[oldSuid] = newSuid;
                }
            }
        }
        for (var i = 0; i < this._heldMutexReleasers.length; i++) {
            this._heldMutexReleasers[i](error);
        }
        this._heldMutexReleasers = [];
        this._stateDelta.serverIdMap = null;
        this._stateDelta.moveMap = null;
    };
    exports.allJobsDone = function () {
        this._state.suidToServerId = {};
        this._state.moveMap = {};
    };
    exports._partitionAndAccessFoldersSequentially = function (allMessageNamers, needConn, callInFolder, callWhenDone, callOnConnLoss, reverse, label, requireHeaders) {
        var partitions = $util.partitionMessagesByFolderId(allMessageNamers);
        var folderConn, storage, self = this, folderId = null, folderMessageNamers = null, serverIds = null, iNextPartition = 0, curPartition = null, modsToGo = 0, terminated = false;
        if (reverse)
            partitions.reverse();
        var openNextFolder = function openNextFolder() {
            if (terminated)
                return;
            if (iNextPartition >= partitions.length) {
                terminated = true;
                callWhenDone(null);
                return;
            }
            if (iNextPartition) {
                folderConn = null;
                var releaser = self._heldMutexReleasers.pop();
                if (releaser)
                    releaser();
                folderConn = null;
            }
            curPartition = partitions[iNextPartition++];
            folderMessageNamers = curPartition.messages;
            serverIds = null;
            if (curPartition.folderId !== folderId) {
                folderId = curPartition.folderId;
                self._accessFolderForMutation(folderId, needConn, gotFolderConn, connDied, label);
            }
        };
        var connDied = function connDied() {
            if (terminated)
                return;
            if (callOnConnLoss) {
                try {
                    callOnConnLoss();
                } catch (ex) {
                    self.log.error('callbackErr', { ex: ex });
                }
            }
            terminated = true;
            callWhenDone('connection-lost');
        };
        var gotFolderConn = function gotFolderConn(_folderConn, _storage) {
            if (terminated)
                return;
            folderConn = _folderConn;
            storage = _storage;
            if (needConn && !requireHeaders) {
                var neededHeaders = [], suidToServerId = self._state.suidToServerId;
                serverIds = [];
                for (var i = 0; i < folderMessageNamers.length; i++) {
                    var namer = folderMessageNamers[i];
                    var srvid = suidToServerId[namer.suid];
                    if (srvid) {
                        serverIds.push(srvid);
                    } else {
                        serverIds.push(null);
                        neededHeaders.push(namer);
                    }
                }
                if (!neededHeaders.length) {
                    try {
                        callInFolder(folderConn, storage, serverIds, folderMessageNamers, openNextFolder);
                    } catch (ex) {
                        console.error('PAAFS error:', ex, '\n', ex.stack);
                    }
                } else {
                    storage.getMessageHeaders(neededHeaders, gotNeededHeaders);
                }
            } else {
                storage.getMessageHeaders(folderMessageNamers, gotHeaders);
            }
        };
        var gotNeededHeaders = function gotNeededHeaders(headers) {
            if (terminated)
                return;
            var iNextServerId = serverIds.indexOf(null);
            for (var i = 0; i < headers.length; i++) {
                var header = headers[i];
                if (header) {
                    var srvid = header.srvid;
                    serverIds[iNextServerId] = srvid;
                    if (!srvid)
                        console.warn('Header', headers[i].suid, 'missing server id in job!');
                }
                iNextServerId = serverIds.indexOf(null, iNextServerId + 1);
            }
            if (!serverIds.length) {
                openNextFolder();
                return;
            }
            try {
                callInFolder(folderConn, storage, serverIds, folderMessageNamers, openNextFolder);
            } catch (ex) {
                console.error('PAAFS error:', ex, '\n', ex.stack);
            }
        };
        var gotHeaders = function gotHeaders(headers) {
            if (terminated)
                return;
            if (!headers.length) {
                openNextFolder();
                return;
            }
            headers.sort(function (a, b) {
                return a.date > b.date;
            });
            try {
                callInFolder(folderConn, storage, headers, folderMessageNamers, openNextFolder);
            } catch (ex) {
                console.error('PAAFS error:', ex, '\n', ex.stack);
            }
        };
        openNextFolder();
    };
    exports.local_do_upgradeDB = function (op, doneCallback) {
        var storage = this.account.getFolderStorageForFolderId(op.folderId);
        var filter = function (header) {
            return header.flags && header.flags.indexOf('\\Seen') === -1;
        };
        $count.countHeaders(storage, filter, function (num) {
            storage._dirty = true;
            storage.folderMeta.version = $mailslice.FOLDER_DB_VERSION;
            storage.folderMeta.unreadCount = num;
            doneCallback(null, null, true);
        });
    };
});
;
define('jobs/outbox', ['require'], function (require) {
    function sendNextAvailableOutboxMessage(account, storage, beforeMessage, emitNotifications, outboxNeedsFreshSync, wakeLock) {
        return getNextHeader(storage, beforeMessage).then(function (header) {
            if (!header) {
                return {
                    moreExpected: false,
                    messageNamer: null
                };
            }
            var moreExpected = !storage.headerIsOldestKnown(header.date, header.id);
            if (!header.sendStatus) {
                header.sendStatus = {};
            }
            if (header.sendStatus.state !== 'sending' || outboxNeedsFreshSync) {
                return constructComposer(account, storage, header, wakeLock).then(sendMessage.bind(null, account, storage, emitNotifications)).then(function (header) {
                    return {
                        moreExpected: moreExpected,
                        messageNamer: {
                            suid: header.suid,
                            date: header.date
                        }
                    };
                });
            } else {
                return sendNextAvailableOutboxMessage(account, storage, {
                    suid: header.suid,
                    date: header.date
                }, emitNotifications, outboxNeedsFreshSync, wakeLock);
            }
        });
    }
    function getNextHeader(storage, beforeMessage) {
        return new Promise(function (resolve) {
            if (beforeMessage) {
                var id = parseInt(beforeMessage.suid.substring(beforeMessage.suid.lastIndexOf('/') + 1));
                storage.getMessagesBeforeMessage(beforeMessage.date, id, 1, function (headers, moreExpected) {
                    resolve(headers[0] || null);
                });
            } else {
                storage.getMessagesInImapDateRange(0, null, 1, 1, function (headers, moreExpected) {
                    resolve(headers[0]);
                });
            }
        });
    }
    function constructComposer(account, storage, header, wakeLock) {
        return new Promise(function (resolve, reject) {
            storage.getMessage(header.suid, header.date, function (msg) {
                if (!msg || !msg.body) {
                    console.error('Failed to create composer; no body available.');
                    reject();
                    return;
                }
                require(['../drafts/composer'], function (cmp) {
                    var composer = new cmp.Composer(msg, account, account.identities[0]);
                    composer.setSmartWakeLock(wakeLock);
                    resolve(composer);
                });
            });
        });
    }
    function sendMessage(account, storage, emitNotifications, composer) {
        var header = composer.header;
        var progress = publishStatus.bind(null, account, storage, composer, header, emitNotifications);
        var oldestDate = storage.getOldestMessageTimestamp();
        var willSendMore = oldestDate > 0 && oldestDate < header.date.valueOf();
        progress({
            state: 'sending',
            err: null,
            badAddresses: null,
            sendFailures: header.sendStatus && header.sendStatus.sendFailures || 0
        });
        return new Promise(function (resolve) {
            account.sendMessage(composer, function (err, badAddresses) {
                if (err) {
                    console.log('Message failed to send (' + err + ')');
                    progress({
                        state: 'error',
                        err: err,
                        badAddresses: badAddresses,
                        sendFailures: (header.sendStatus.sendFailures || 0) + 1
                    });
                    resolve(composer.header);
                } else {
                    console.log('Message sent; deleting from outbox.');
                    progress({
                        state: 'success',
                        err: null,
                        badAddresses: null
                    });
                    storage.deleteMessageHeaderAndBodyUsingHeader(header, function () {
                        resolve(composer.header);
                    });
                }
            });
        });
    }
    function publishStatus(account, storage, composer, header, emitNotifications, status) {
        header.sendStatus = {
            state: status.state,
            err: status.err,
            badAddresses: status.badAddresses,
            sendFailures: status.sendFailures
        };
        account.universe.__notifyBackgroundSendStatus({
            state: status.state,
            err: status.err,
            badAddresses: status.badAddresses,
            sendFailures: status.sendFailures,
            accountId: account.id,
            suid: header.suid,
            emitNotifications: emitNotifications,
            messageId: composer.messageId,
            sentDate: composer.sentDate
        });
        storage.updateMessageHeader(header.date, header.id, false, header, null);
    }
    return { sendNextAvailableOutboxMessage: sendNextAvailableOutboxMessage };
});
define('db/mail_rep', [], function () {
    function makeHeaderInfo(raw) {
        if (!raw.author)
            throw new Error('No author?!');
        if (!raw.date)
            throw new Error('No date?!');
        return {
            id: raw.id,
            srvid: raw.srvid || null,
            suid: raw.suid || null,
            guid: raw.guid || null,
            author: raw.author,
            to: raw.to || null,
            cc: raw.cc || null,
            bcc: raw.bcc || null,
            replyTo: raw.replyTo || null,
            date: raw.date,
            flags: raw.flags || [],
            hasAttachments: raw.hasAttachments || false,
            subject: raw.subject != null ? raw.subject : null,
            snippet: raw.snippet != null ? raw.snippet : null,
            imapMissingInSyncRange: raw.imapMissingInSyncRange || null
        };
    }
    function makeBodyInfo(raw) {
        if (!raw.date)
            throw new Error('No date?!');
        if (!raw.attachments || !raw.bodyReps)
            throw new Error('No attachments / bodyReps?!');
        return {
            date: raw.date,
            size: raw.size || 0,
            attachments: raw.attachments,
            relatedParts: raw.relatedParts || null,
            references: raw.references || null,
            bodyReps: raw.bodyReps
        };
    }
    function makeBodyPart(raw) {
        if (raw.type !== 'plain' && raw.type !== 'html')
            throw new Error('Bad body type: ' + raw.type);
        if (raw.sizeEstimate === undefined)
            throw new Error('Need size estimate!');
        return {
            type: raw.type,
            part: raw.part || null,
            sizeEstimate: raw.sizeEstimate,
            amountDownloaded: raw.amountDownloaded || 0,
            isDownloaded: raw.isDownloaded || false,
            _partInfo: raw._partInfo || null,
            content: raw.content || ''
        };
    }
    function makeAttachmentPart(raw) {
        if (raw.sizeEstimate === undefined)
            throw new Error('Need size estimate!');
        return {
            name: raw.name != null ? raw.name : null,
            contentId: raw.contentId || null,
            type: raw.type || 'application/octet-stream',
            part: raw.part || null,
            encoding: raw.encoding || null,
            sizeEstimate: raw.sizeEstimate,
            file: raw.file || null,
            charset: raw.charset || null,
            textFormat: raw.textFormat || null
        };
    }
    return {
        makeHeaderInfo: makeHeaderInfo,
        makeBodyInfo: makeBodyInfo,
        makeBodyPart: makeBodyPart,
        makeAttachmentPart: makeAttachmentPart
    };
});
;
define('drafts/draft_rep', [
    'require',
    '../db/mail_rep'
], function (require) {
    var mailRep = require('../db/mail_rep');
    function mergeDraftStates(oldHeader, oldBody, newDraftRep, newDraftInfo, universe) {
        var identity = universe.getIdentityForSenderIdentityId(newDraftRep.senderId);
        var newHeader = mailRep.makeHeaderInfo({
            id: newDraftInfo.id,
            srvid: null,
            suid: newDraftInfo.suid,
            guid: oldHeader ? oldHeader.guid : null,
            author: {
                name: identity.name,
                address: identity.address
            },
            to: newDraftRep.to,
            cc: newDraftRep.cc,
            bcc: newDraftRep.bcc,
            replyTo: identity.replyTo,
            date: newDraftInfo.date,
            flags: [],
            hasAttachments: oldBody ? oldBody.attachments.length > 0 : false,
            subject: newDraftRep.subject,
            snippet: newDraftRep.body.text.substring(0, 100)
        });
        var newBody = mailRep.makeBodyInfo({
            date: newDraftInfo.date,
            size: 0,
            attachments: oldBody ? oldBody.attachments.concat() : [],
            relatedParts: oldBody ? oldBody.relatedParts.concat() : [],
            references: newDraftRep.referencesStr,
            bodyReps: []
        });
        newBody.bodyReps.push(mailRep.makeBodyPart({
            type: 'plain',
            part: null,
            sizeEstimate: newDraftRep.body.text.length,
            amountDownloaded: newDraftRep.body.text.length,
            isDownloaded: true,
            _partInfo: {},
            content: [
                1,
                newDraftRep.body.text
            ]
        }));
        if (newDraftRep.body.html) {
            newBody.bodyReps.push(mailRep.makeBodyPart({
                type: 'html',
                part: null,
                sizeEstimate: newDraftRep.body.html.length,
                amountDownloaded: newDraftRep.body.html.length,
                isDownloaded: true,
                _partInfo: {},
                content: newDraftRep.body.html
            }));
        }
        return {
            header: newHeader,
            body: newBody
        };
    }
    function convertHeaderAndBodyToDraftRep(account, header, body) {
        var composeBody = {
            text: '',
            html: null
        };
        if (body.bodyReps.length >= 1 && body.bodyReps[0].type === 'plain' && body.bodyReps[0].content.length === 2 && body.bodyReps[0].content[0] === 1) {
            composeBody.text = body.bodyReps[0].content[1];
        }
        if (body.bodyReps.length == 2 && body.bodyReps[1].type === 'html') {
            composeBody.html = body.bodyReps[1].content;
        }
        var attachments = [];
        body.attachments.forEach(function (att) {
            attachments.push({
                name: att.name,
                blob: att.file
            });
        });
        var draftRep = {
            identity: account.identities[0],
            subject: header.subject,
            body: composeBody,
            to: header.to,
            cc: header.cc,
            bcc: header.bcc,
            referencesStr: body.references,
            attachments: attachments
        };
    }
    function cloneDraftMessageForSentFolderWithoutAttachments(header, body, newInfo) {
        var newHeader = mailRep.makeHeaderInfo(header);
        newHeader.id = newInfo.id;
        newHeader.suid = newInfo.suid;
        newHeader.flags = ['\\Seen'];
        var newBody = mailRep.makeBodyInfo(body);
        if (newBody.attachments) {
            newBody.attachments = newBody.attachments.map(function (oldAtt) {
                var newAtt = mailRep.makeAttachmentPart(oldAtt);
                newAtt.type = 'application/x-gelam-no-download';
                newAtt.file = null;
                return newAtt;
            });
        }
        if (newBody.relatedParts) {
            newBody.relatedParts = [];
        }
        newBody.bodyReps = newBody.bodyReps.map(function (oldRep) {
            return mailRep.makeBodyPart(oldRep);
        });
        return {
            header: newHeader,
            body: newBody
        };
    }
    return {
        mergeDraftStates: mergeDraftStates,
        convertHeaderAndBodyToDraftRep: convertHeaderAndBodyToDraftRep,
        cloneDraftMessageForSentFolderWithoutAttachments: cloneDraftMessageForSentFolderWithoutAttachments
    };
});
;
define('safe-base64', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    exports.decode = function (s) {
        var bitsSoFar = 0, validBits = 0, iOut = 0, arr = new Uint8Array(Math.ceil(s.length * 3 / 4));
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i), bits;
            if (c >= 65 && c <= 90)
                bits = c - 65;
            else if (c >= 97 && c <= 122)
                bits = c - 97 + 26;
            else if (c >= 48 && c <= 57)
                bits = c - 48 + 52;
            else if (c === 43)
                bits = 62;
            else if (c === 47)
                bits = 63;
            else if (c === 61) {
                validBits = 0;
                continue;
            } else
                continue;
            bitsSoFar = bitsSoFar << 6 | bits;
            validBits += 6;
            if (validBits >= 8) {
                validBits -= 8;
                arr[iOut++] = bitsSoFar >> validBits;
                if (validBits === 2)
                    bitsSoFar &= 3;
                else if (validBits === 4)
                    bitsSoFar &= 15;
            }
        }
        if (iOut < arr.length)
            return arr.subarray(0, iOut);
        return arr;
    };
    exports.encode = function (view) {
        var sbits, i;
        sbits = new Array(view.length);
        for (i = 0; i < view.length; i++) {
            sbits[i] = String.fromCharCode(view[i]);
        }
        return window.btoa(sbits.join(''));
    };
    exports.mimeStyleBase64Encode = function (data) {
        var wholeLines = Math.floor(data.length / 57);
        var partialBytes = data.length - wholeLines * 57;
        var encodedLength = wholeLines * 78;
        if (partialBytes) {
            encodedLength += Math.ceil(partialBytes / 3) * 4 + 2;
        }
        var encoded = new Uint8Array(encodedLength);
        function encode6Bits(nibbly) {
            if (nibbly <= 25) {
                encoded[iWrite++] = 65 + nibbly;
            } else if (nibbly <= 51) {
                encoded[iWrite++] = 97 - 26 + nibbly;
            } else if (nibbly <= 61) {
                encoded[iWrite++] = 48 - 52 + nibbly;
            } else if (nibbly === 62) {
                encoded[iWrite++] = 43;
            } else {
                encoded[iWrite++] = 47;
            }
        }
        var iRead = 0, iWrite = 0, bytesToRead;
        for (bytesToRead = data.length; bytesToRead >= 3; bytesToRead -= 3) {
            var b1 = data[iRead++], b2 = data[iRead++], b3 = data[iRead++];
            encode6Bits(b1 >> 2);
            encode6Bits((b1 & 3) << 4 | b2 >> 4);
            encode6Bits((b2 & 15) << 2 | b3 >> 6);
            encode6Bits(b3 & 63);
            if (iRead % 57 === 0 || bytesToRead === 3) {
                encoded[iWrite++] = 13;
                encoded[iWrite++] = 10;
            }
        }
        switch (bytesToRead) {
        case 2:
            b1 = data[iRead++];
            b2 = data[iRead++];
            encode6Bits(b1 >> 2);
            encode6Bits((b1 & 3) << 4 | b2 >> 4);
            encode6Bits((b2 & 15) << 2 | 0);
            encoded[iWrite++] = 61;
            encoded[iWrite++] = 13;
            encoded[iWrite++] = 10;
            break;
        case 1:
            b1 = data[iRead++];
            encode6Bits(b1 >> 2);
            encode6Bits((b1 & 3) << 4 | 0);
            encoded[iWrite++] = 61;
            encoded[iWrite++] = 61;
            encoded[iWrite++] = 13;
            encoded[iWrite++] = 10;
            break;
        }
        return encoded;
    };
});
;
define('async_blob_fetcher', ['exports'], function (exports) {
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
define('drafts/jobs', [
    'require',
    'exports',
    'module',
    '../db/mail_rep',
    '../drafts/draft_rep',
    'safe-base64',
    '../async_blob_fetcher'
], function (require, exports) {
    var mailRep = require('../db/mail_rep');
    var draftRep = require('../drafts/draft_rep');
    var base64 = require('safe-base64');
    var asyncFetchBlobAsUint8Array = require('../async_blob_fetcher').asyncFetchBlobAsUint8Array;
    var draftsMixins = exports.draftsMixins = {};
    draftsMixins.BLOB_BASE64_BATCH_CONVERT_SIZE = 9198 * 57;
    draftsMixins.local_do_attachBlobToDraft = function (op, callback) {
        var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
        if (!localDraftsFolder) {
            callback('moot');
            return;
        }
        var self = this;
        this._accessFolderForMutation(localDraftsFolder.id, false, function (nullFolderConn, folderStorage) {
            var wholeBlob = op.attachmentDef.blob;
            var header, body;
            console.log('attachBlobToDraft: retrieving message');
            folderStorage.getMessage(op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
            function gotMessage(records) {
                header = records.header;
                body = records.body;
                if (!header || !body) {
                    callback('failure-give-up');
                    return;
                }
                body.attaching = mailRep.makeAttachmentPart({
                    name: op.attachmentDef.name,
                    type: wholeBlob.type,
                    sizeEstimate: wholeBlob.size,
                    file: []
                });
                convertNextChunk(body);
            }
            var blobOffset = 0;
            function convertNextChunk(refreshedBody) {
                body = refreshedBody;
                var nextOffset = Math.min(wholeBlob.size, blobOffset + self.BLOB_BASE64_BATCH_CONVERT_SIZE);
                console.log('attachBlobToDraft: fetching', blobOffset, 'to', nextOffset, 'of', wholeBlob.size);
                var slicedBlob = wholeBlob.slice(blobOffset, nextOffset);
                blobOffset = nextOffset;
                asyncFetchBlobAsUint8Array(slicedBlob, gotChunk);
            }
            function gotChunk(err, binaryDataU8) {
                console.log('attachBlobToDraft: fetched');
                if (err) {
                    callback('failure-give-up');
                    return;
                }
                var lastChunk = blobOffset >= wholeBlob.size;
                var encodedU8 = base64.mimeStyleBase64Encode(binaryDataU8);
                body.attaching.file.push(new Blob([encodedU8], { type: wholeBlob.type }));
                var eventDetails;
                if (lastChunk) {
                    var attachmentIndex = body.attachments.length;
                    body.attachments.push(body.attaching);
                    delete body.attaching;
                    eventDetails = { changeDetails: { attachments: [attachmentIndex] } };
                } else {
                    eventDetails = null;
                }
                console.log('attachBlobToDraft: flushing');
                folderStorage.updateMessageBody(header, body, { flushBecause: 'blobs' }, eventDetails, lastChunk ? bodyUpdatedAllDone : convertNextChunk);
                body = null;
            }
            function bodyUpdatedAllDone(newBodyInfo) {
                console.log('attachBlobToDraft: blob fully attached');
                callback(null);
            }
        }, null, 'attachBlobToDraft');
    };
    draftsMixins.do_attachBlobToDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.check_attachBlobToDraft = function (op, callback) {
        callback(null, 'moot');
    };
    draftsMixins.local_undo_attachBlobToDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.undo_attachBlobToDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.local_do_detachAttachmentFromDraft = function (op, callback) {
        var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
        if (!localDraftsFolder) {
            callback('moot');
            return;
        }
        var self = this;
        this._accessFolderForMutation(localDraftsFolder.id, false, function (nullFolderConn, folderStorage) {
            var header, body;
            console.log('detachAttachmentFromDraft: retrieving message');
            folderStorage.getMessage(op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
            function gotMessage(records) {
                header = records.header;
                body = records.body;
                if (!header || !body) {
                    callback('failure-give-up');
                    return;
                }
                body.attachments.splice(op.attachmentIndex, 1);
                console.log('detachAttachmentFromDraft: flushing');
                folderStorage.updateMessageBody(header, body, { flushBecause: 'blobs' }, { changeDetails: { detachedAttachments: [op.attachmentIndex] } }, bodyUpdatedAllDone);
            }
            function bodyUpdatedAllDone(newBodyInfo) {
                console.log('detachAttachmentFromDraft: blob fully detached');
                callback(null);
            }
        }, null, 'detachAttachmentFromDraft');
    };
    draftsMixins.do_detachAttachmentFromDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.check_detachAttachmentFromDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.local_undo_detachAttachmentFromDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.undo_detachAttachmentFromDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.local_do_saveDraft = function (op, callback) {
        var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
        if (!localDraftsFolder) {
            callback('moot');
            return;
        }
        var self = this;
        this._accessFolderForMutation(localDraftsFolder.id, false, function (nullFolderConn, folderStorage) {
            var waitingForDbMods = 2;
            function gotMessage(oldRecords) {
                var newRecords = draftRep.mergeDraftStates(oldRecords.header, oldRecords.body, op.draftRep, op.newDraftInfo, self.account.universe);
                if (op.existingNamer) {
                    waitingForDbMods++;
                    folderStorage.deleteMessageHeaderAndBody(op.existingNamer.suid, op.existingNamer.date, dbModCompleted);
                }
                folderStorage.addMessageHeader(newRecords.header, newRecords.body, dbModCompleted);
                folderStorage.addMessageBody(newRecords.header, newRecords.body, dbModCompleted);
                function dbModCompleted() {
                    if (--waitingForDbMods === 0) {
                        callback(null, newRecords, true);
                    }
                }
            }
            if (op.existingNamer) {
                folderStorage.getMessage(op.existingNamer.suid, op.existingNamer.date, null, gotMessage);
            } else {
                gotMessage({
                    header: null,
                    body: null
                });
            }
        }, null, 'saveDraft');
    };
    draftsMixins.do_saveDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.check_saveDraft = function (op, callback) {
        callback(null, 'moot');
    };
    draftsMixins.local_undo_saveDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.undo_saveDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.local_do_deleteDraft = function (op, callback) {
        var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
        if (!localDraftsFolder) {
            callback('moot');
            return;
        }
        var self = this;
        this._accessFolderForMutation(localDraftsFolder.id, false, function (nullFolderConn, folderStorage) {
            folderStorage.deleteMessageHeaderAndBody(op.messageNamer.suid, op.messageNamer.date, function () {
                callback(null, null, true);
            });
        }, null, 'deleteDraft');
    };
    draftsMixins.do_deleteDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.check_deleteDraft = function (op, callback) {
        callback(null, 'moot');
    };
    draftsMixins.local_undo_deleteDraft = function (op, callback) {
        callback(null);
    };
    draftsMixins.undo_deleteDraft = function (op, callback) {
        callback(null);
    };
});
;
define('disaster-recovery', [
    'require',
    './logic'
], function (require) {
    var logic = require('./logic');
    var socketToAccountMap = new WeakMap();
    var accountToOperationMap = new WeakMap();
    var scope = logic.scope('DisasterRecovery');
    var DisasterRecovery = {
        setCurrentAccountOp: function (account, op, jobCompletedCallback) {
            accountToOperationMap.set(account, {
                op: op,
                callback: jobCompletedCallback
            });
        },
        clearCurrentAccountOp: function (account) {
            accountToOperationMap.delete(account);
        },
        associateSocketWithAccount: function (socket, account) {
            socketToAccountMap.set(socket, account);
        },
        catchSocketExceptions: function (socket, fn) {
            try {
                fn();
            } catch (e) {
                var account = socketToAccountMap.get(socket);
                try {
                    socket.close();
                } catch (socketEx) {
                    console.error('Error attempting to close socket:', socketEx);
                }
                this.handleDisastrousError(e, account);
            }
        },
        handleDisastrousError: function (e, account) {
            var op, jobDoneCallback;
            if (account) {
                var opInfo = accountToOperationMap.get(account);
                if (opInfo) {
                    op = opInfo.op;
                    jobDoneCallback = opInfo.callback;
                }
            }
            logic(scope, 'exception', {
                accountId: account && account.id,
                op: op,
                error: e,
                errorName: e && e.name,
                errorMessage: e && e.message,
                stack: e.stack
            });
            console.error('*** Disastrous Error for email accountId', account && account.id, '-- attempting to recover...');
            if (account) {
                if (op) {
                    logic(scope, 'finished-job', { error: e });
                    console.warn('Force-completing in-progress op:', op);
                    jobDoneCallback('disastrous-error');
                } else {
                    console.warn('No job operation was currently running.');
                }
            } else {
                console.warn('No account associated with this error; nothing to abort.');
            }
        }
    };
    return DisasterRecovery;
});
define('accountmixins', [
    'require',
    'exports',
    'module',
    './disaster-recovery',
    'logic'
], function (require, exports) {
    var DisasterRecovery = require('./disaster-recovery');
    var logic = require('logic');
    function unimplementedJobOperation(op, callback) {
        window.setZeroTimeout(function () {
            callback(null, null);
        });
    }
    exports.accountConstructorMixin = function (receivePiece, sendPiece) {
        receivePiece.outboxNeedsFreshSync = true;
        receivePiece.outboxSyncEnabled = true;
    };
    exports.runOp = function runOp(op, mode, callback) {
        console.log('runOp(' + mode + ': ' + JSON.stringify(op).substring(0, 160) + ')');
        var methodName = mode + '_' + op.type;
        var method = this._jobDriver[methodName];
        if (!method) {
            console.warn('Unsupported op:', op.type, 'mode:', mode);
            method = unimplementedJobOperation;
        }
        var alreadyCompleted = false;
        var jobCompletedCallback = function (error, resultIfAny, accountSaveSuggested) {
            if (alreadyCompleted) {
                console.warn('Job already completed, ignoring secondary completion:', mode, JSON.stringify(op).substring(0, 160), error, resultIfAny);
                return;
            }
            alreadyCompleted = true;
            DisasterRecovery.clearCurrentAccountOp(this);
            this._jobDriver.postJobCleanup(error);
            window.setZeroTimeout(function () {
                callback(error, resultIfAny, accountSaveSuggested);
            });
        }.bind(this);
        DisasterRecovery.setCurrentAccountOp(this, op, jobCompletedCallback);
        logic(this, 'runOp_begin', {
            mode: mode,
            type: op.type,
            op: op
        });
        Object.defineProperty(op, '_logicAsyncEvent', {
            configurable: true,
            enumerable: false,
            value: logic.startAsync(this, 'runOp', {
                mode: mode,
                type: op.type,
                op: op
            })
        });
        try {
            method.call(this._jobDriver, op, jobCompletedCallback);
        } catch (ex) {
            DisasterRecovery.clearCurrentAccountOp(this);
            logic(this, 'opError', {
                mode: mode,
                type: op.type,
                ex: ex
            });
        }
    };
    exports.getFirstFolderWithType = function (type) {
        var folders = this.folders;
        for (var iFolder = 0; iFolder < folders.length; iFolder++) {
            if (folders[iFolder].type === type)
                return folders[iFolder];
        }
        return null;
    };
    exports.getFolderByPath = function (folderPath) {
        var folders = this.folders;
        for (var iFolder = 0; iFolder < folders.length; iFolder++) {
            if (folders[iFolder].path === folderPath)
                return folders[iFolder];
        }
        return null;
    };
    exports.normalizeFolderHierarchy = function () {
        var sibling = this.getFirstFolderWithType('drafts') || this.getFirstFolderWithType('sent');
        if (!sibling) {
            return;
        }
        var parent = this.getFolderMetaForFolderId(sibling.parentId);
        var foldersToMove = [
            this.getFirstFolderWithType('localdrafts'),
            this.getFirstFolderWithType('outbox')
        ];
        foldersToMove.forEach(function (folder) {
            if (!folder || folder.parentId === sibling.parentId) {
                return;
            }
            console.log('Moving folder', folder.name, 'underneath', parent && parent.name || '(root)');
            this.universe.__notifyRemovedFolder(this, folder);
            if (parent) {
                folder.path = parent.path + (parent.delim || '/') + folder.name;
                folder.delim = parent.delim || '/';
                folder.parentId = parent.id;
                folder.depth = parent.depth + 1;
            } else {
                folder.path = folder.name;
                folder.delim = '/';
                folder.parentId = null;
                folder.depth = 0;
            }
            this.universe.__notifyAddedFolder(this, folder);
        }, this);
    };
    exports.saveAccountState = function (reuseTrans, callback, reason) {
        if (!this._alive) {
            logic(this, 'accountDeleted', { reason: 'saveAccountState' });
            return null;
        }
        logic(this, 'saveAccountState_begin', {
            reason: reason,
            folderSaveCount: null
        });
        this._saveAccountStateActive = true;
        if (!this._deferredSaveAccountCalls) {
            this._deferredSaveAccountCalls = [];
        }
        if (callback)
            this.runAfterSaves(callback);
        var perFolderStuff = [], self = this;
        for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
            var folderPub = this.folders[iFolder], folderStorage = this._folderStorages[folderPub.id], folderStuff = folderStorage.generatePersistenceInfo();
            if (folderStuff)
                perFolderStuff.push(folderStuff);
        }
        var folderSaveCount = perFolderStuff.length;
        var trans = this._db.saveAccountFolderStates(this.id, this._folderInfos, perFolderStuff, this._deadFolderIds, function stateSaved() {
            this._saveAccountStateActive = false;
            logic(this, 'saveAccountState_end', {
                reason: reason,
                folderSaveCount: folderSaveCount
            });
            var callbacks = this._deferredSaveAccountCalls;
            this._deferredSaveAccountCalls = [];
            callbacks.forEach(function (callback) {
                callback();
            });
        }.bind(this), reuseTrans);
        perFolderStuff = null;
        this._deadFolderIds = null;
        return trans;
    };
    exports.runAfterSaves = function (callback) {
        if (this._saveAccountStateActive || this._saveAccountIsImminent) {
            this._deferredSaveAccountCalls.push(callback);
        } else {
            callback();
        }
    };
    exports.upgradeFolderStoragesIfNeeded = function () {
        for (var key in this._folderStorages) {
            var storage = this._folderStorages[key];
            storage.upgradeIfNeeded();
        }
    };
});
;
define('quotechew', ['exports'], function (exports) {
    var CT_AUTHORED_CONTENT = 1;
    var CT_AUTHORED_NICETIES = 17;
    var CT_SIGNATURE = 2;
    var CT_LEADIN_TO_QUOTE = 3;
    var CT_QUOTED_TYPE = 4;
    var CT_QUOTED_REPLY = 20;
    var CT_QUOTED_FORWARD = 36;
    var CT_QUOTED_IN_ENTIRETY = 64;
    var CT_QUOTED_GARDENED = 128;
    var CT_QUOTE_DEPTH_MASK = 65280;
    var CT_BOILERPLATE_DISCLAIMER = 5;
    var CT_BOILERPLATE_LIST_INFO = 6;
    var CT_BOILERPLATE_PRODUCT = 7;
    var CT_BOILERPLATE_ADS = 8;
    var CHARCODE_GT = '>'.charCodeAt(0), CHARCODE_SPACE = ' '.charCodeAt(0), CHARCODE_NBSP = '\xA0'.charCodeAt(0), CHARCODE_NEWLINE = '\n'.charCodeAt(0);
    var RE_ORIG_MESAGE_DELIM = /^-{5} Original Message -{5}$/;
    var RE_ALL_WS = /^\s+$/;
    var RE_SECTION_DELIM = /^[_-]{6,}$/;
    var RE_LIST_BOILER = /mailing list$/;
    var RE_WROTE_LINE = /wrote/;
    var RE_REPLY_LAST_LINE_IN_BLOCK_CONTAINS_WROTE = /wrote[^\n]+$/;
    var RE_SIGNATURE_LINE = /^-- $/;
    var MAX_BOILERPLATE_LINES = 20;
    var RE_PRODUCT_BOILER = /^(?:Sent from (?:Mobile|my .+))$/;
    var RE_LEGAL_BOILER_START = /^(?:This message|Este mensaje)/;
    function indexOfDefault(string, search, startIndex, defVal) {
        var idx = string.indexOf(search, startIndex);
        if (idx === -1)
            return defVal;
        return idx;
    }
    var NEWLINE = '\n', RE_NEWLINE = /\n/g;
    function countNewlinesInRegion(string, startIndex, endIndex) {
        var idx = startIndex - 1, count = 0;
        for (;;) {
            idx = string.indexOf(NEWLINE, idx + 1);
            if (idx === -1 || idx >= endIndex)
                return count;
            count++;
        }
        return null;
    }
    exports.quoteProcessTextBody = function quoteProcessTextBody(fullBodyText) {
        var contentRep = [];
        var line;
        function countQuoteDepthAndNormalize() {
            var count = 1;
            var lastStartOffset = 1, spaceOk = true;
            for (var i = 1; i < line.length; i++) {
                var c = line.charCodeAt(i);
                if (c === CHARCODE_GT) {
                    count++;
                    lastStartOffset++;
                    spaceOk = true;
                } else if (c === CHARCODE_SPACE) {
                    if (!spaceOk)
                        break;
                    lastStartOffset++;
                    spaceOk = false;
                } else {
                    break;
                }
            }
            if (lastStartOffset)
                line = line.substring(lastStartOffset);
            return count;
        }
        function lookBackwardsForBoilerplate(chunk) {
            var idxLineStart, idxLineEnd, line, idxRegionEnd = chunk.length, scanLinesLeft = MAX_BOILERPLATE_LINES, sawNonWhitespaceLine = false, lastContentLine = null, lastBoilerplateStart = null, sawProduct = false, insertAt = contentRep.length;
            function pushBoilerplate(contentType, merge) {
                var boilerChunk = chunk.substring(idxLineStart, idxRegionEnd);
                var idxChunkEnd = idxLineStart - 1;
                while (chunk.charCodeAt(idxChunkEnd - 1) === CHARCODE_NEWLINE) {
                    idxChunkEnd--;
                }
                var newChunk = chunk.substring(0, idxChunkEnd);
                var ate = countNewlinesInRegion(chunk, newChunk.length, idxLineStart - 1);
                chunk = newChunk;
                idxRegionEnd = chunk.length;
                if (!merge) {
                    contentRep.splice(insertAt, 0, (ate & 255) << 8 | contentType, boilerChunk);
                } else {
                    contentRep[insertAt] = (ate & 255) << 8 | contentRep[insertAt] & 255;
                    contentRep[insertAt + 1] = boilerChunk + '\n' + contentRep[insertAt + 1];
                }
                sawNonWhitespaceLine = false;
                scanLinesLeft = MAX_BOILERPLATE_LINES;
                lastContentLine = null;
                lastBoilerplateStart = idxLineStart;
            }
            for (idxLineStart = chunk.lastIndexOf('\n') + 1, idxLineEnd = chunk.length; idxLineEnd > 0 && scanLinesLeft; idxLineEnd = idxLineStart - 1, idxLineStart = chunk.lastIndexOf('\n', idxLineEnd - 1) + 1, scanLinesLeft--) {
                line = chunk.substring(idxLineStart, idxLineEnd);
                if (!line.length || line.length === 1 && line.charCodeAt(0) === CHARCODE_NBSP)
                    continue;
                if (RE_SIGNATURE_LINE.test(line)) {
                    if (idxLineEnd + 1 === lastBoilerplateStart) {
                        pushBoilerplate(null, true);
                    } else {
                        pushBoilerplate(CT_SIGNATURE);
                    }
                    continue;
                }
                if (RE_SECTION_DELIM.test(line)) {
                    if (lastContentLine) {
                        if (RE_LEGAL_BOILER_START.test(lastContentLine)) {
                            pushBoilerplate(CT_BOILERPLATE_DISCLAIMER);
                            continue;
                        }
                        if (RE_LIST_BOILER.test(lastContentLine)) {
                            pushBoilerplate(CT_BOILERPLATE_LIST_INFO);
                            continue;
                        }
                    }
                    return chunk;
                }
                if (!sawNonWhitespaceLine) {
                    if (!sawProduct && RE_PRODUCT_BOILER.test(line)) {
                        pushBoilerplate(CT_BOILERPLATE_PRODUCT);
                        sawProduct = true;
                        continue;
                    }
                    sawNonWhitespaceLine = true;
                }
                lastContentLine = line;
            }
            return chunk;
        }
        function pushContent(considerForBoilerplate, upToPoint, forcePostLine) {
            if (idxRegionStart === null) {
                if (atePreLines) {
                    if (contentRep.length)
                        atePreLines--;
                    contentRep.push((atePreLines & 255) << 8 | CT_AUTHORED_CONTENT);
                    contentRep.push('');
                }
            } else {
                if (upToPoint === undefined)
                    upToPoint = idxLineStart;
                var chunk = fullBodyText.substring(idxRegionStart, idxLastNonWhitespaceLineEnd);
                var atePostLines = forcePostLine ? 1 : 0;
                if (idxLastNonWhitespaceLineEnd + 1 !== upToPoint) {
                    atePostLines += countNewlinesInRegion(fullBodyText, idxLastNonWhitespaceLineEnd + 1, upToPoint);
                }
                contentRep.push((atePreLines & 255) << 8 | (atePostLines & 255) << 16 | CT_AUTHORED_CONTENT);
                var iChunk = contentRep.push(chunk) - 1;
                if (considerForBoilerplate) {
                    var newChunk = lookBackwardsForBoilerplate(chunk);
                    if (chunk.length !== newChunk.length) {
                        if (atePostLines) {
                            var iLastMeta = contentRep.length - 2;
                            contentRep[iLastMeta] = (atePostLines & 255) << 16 | contentRep[iLastMeta];
                            contentRep[iChunk - 1] = (atePreLines & 255) << 8 | CT_AUTHORED_CONTENT;
                        }
                        if (!newChunk.length) {
                            if (atePreLines) {
                                var bpAte = contentRep[iChunk + 1] >> 8 & 255;
                                bpAte += atePreLines;
                                contentRep[iChunk + 1] = (bpAte & 255) << 8 | contentRep[iChunk + 1] & 4294902015;
                            }
                            contentRep.splice(iChunk - 1, 2);
                        } else {
                            contentRep[iChunk] = newChunk;
                        }
                    }
                }
            }
            atePreLines = 0;
            idxRegionStart = null;
            lastNonWhitespaceLine = null;
            idxLastNonWhitespaceLineEnd = null;
            idxPrevLastNonWhitespaceLineEnd = null;
        }
        function pushQuote(newQuoteDepth) {
            var atePostLines = 0;
            while (quoteRunLines.length && !quoteRunLines[quoteRunLines.length - 1]) {
                quoteRunLines.pop();
                atePostLines++;
            }
            contentRep.push((atePostLines & 255) << 24 | (ateQuoteLines & 255) << 16 | inQuoteDepth - 1 << 8 | CT_QUOTED_REPLY);
            contentRep.push(quoteRunLines.join('\n'));
            inQuoteDepth = newQuoteDepth;
            if (inQuoteDepth)
                quoteRunLines = [];
            else
                quoteRunLines = null;
            ateQuoteLines = 0;
            generatedQuoteBlock = true;
        }
        var idxLineStart, idxLineEnd, bodyLength = fullBodyText.length, idxRegionStart = null, lastNonWhitespaceLine = null, idxLastNonWhitespaceLineEnd = null, idxPrevLastNonWhitespaceLineEnd = null, inQuoteDepth = 0, quoteRunLines = null, generatedQuoteBlock = false, atePreLines = 0, ateQuoteLines = 0;
        for (idxLineStart = 0, idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart, fullBodyText.length); idxLineStart < bodyLength; idxLineStart = idxLineEnd + 1, idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart, fullBodyText.length)) {
            line = fullBodyText.substring(idxLineStart, idxLineEnd);
            if (!line.length || line.length === 1 && line.charCodeAt(0) === CHARCODE_NBSP) {
                if (inQuoteDepth)
                    pushQuote(0);
                if (idxRegionStart === null)
                    atePreLines++;
                continue;
            }
            if (line.charCodeAt(0) === CHARCODE_GT) {
                var lineDepth = countQuoteDepthAndNormalize();
                if (!inQuoteDepth) {
                    if (lastNonWhitespaceLine && RE_WROTE_LINE.test(lastNonWhitespaceLine)) {
                        var upToPoint = idxLastNonWhitespaceLineEnd;
                        if (idxPrevLastNonWhitespaceLineEnd !== null) {
                            var considerIndex = idxPrevLastNonWhitespaceLineEnd + 1;
                            while (considerIndex < idxLastNonWhitespaceLineEnd) {
                                if (fullBodyText[considerIndex++] === '\n') {
                                    break;
                                }
                            }
                            if (considerIndex === idxLastNonWhitespaceLineEnd) {
                                upToPoint = fullBodyText.lastIndexOf('\n', idxPrevLastNonWhitespaceLineEnd - 1);
                                lastNonWhitespaceLine = fullBodyText.substring(upToPoint + 1, idxLastNonWhitespaceLineEnd).replace(/\s*\n\s*/, ' ');
                                idxPrevLastNonWhitespaceLineEnd = upToPoint - 1;
                                if (idxPrevLastNonWhitespaceLineEnd <= idxRegionStart) {
                                    idxRegionStart = null;
                                }
                            }
                        }
                        idxLastNonWhitespaceLineEnd = idxPrevLastNonWhitespaceLineEnd;
                        if (idxLastNonWhitespaceLineEnd === null)
                            idxRegionStart = null;
                        var leadin = lastNonWhitespaceLine;
                        pushContent(!generatedQuoteBlock, upToPoint);
                        var leadinNewlines = 0;
                        if (upToPoint + 1 !== idxLineStart)
                            leadinNewlines = countNewlinesInRegion(fullBodyText, upToPoint + 1, idxLineStart);
                        contentRep.push(leadinNewlines << 8 | CT_LEADIN_TO_QUOTE);
                        contentRep.push(leadin);
                    } else {
                        pushContent(!generatedQuoteBlock);
                    }
                    quoteRunLines = [];
                    inQuoteDepth = lineDepth;
                } else if (lineDepth !== inQuoteDepth) {
                    pushQuote(lineDepth);
                }
                if (quoteRunLines.length || line.length) {
                    quoteRunLines.push(line);
                } else {
                    ateQuoteLines++;
                }
            } else {
                if (inQuoteDepth) {
                    pushQuote(0);
                    idxLastNonWhitespaceLineEnd = null;
                }
                if (idxRegionStart === null)
                    idxRegionStart = idxLineStart;
                lastNonWhitespaceLine = line;
                idxPrevLastNonWhitespaceLineEnd = idxLastNonWhitespaceLineEnd;
                idxLastNonWhitespaceLineEnd = idxLineEnd;
            }
        }
        if (inQuoteDepth) {
            pushQuote(0);
        } else {
            pushContent(true, fullBodyText.length, fullBodyText.charCodeAt(fullBodyText.length - 1) === CHARCODE_NEWLINE);
        }
        return contentRep;
    };
    var MAX_WORD_SHRINK = 8;
    var RE_NORMALIZE_WHITESPACE = /\s+/g;
    exports.generateSnippet = function generateSnippet(rep, desiredLength) {
        for (var i = 0; i < rep.length; i += 2) {
            var etype = rep[i] & 15, block = rep[i + 1];
            switch (etype) {
            case CT_AUTHORED_CONTENT:
                if (!block.length)
                    break;
                if (block.length < desiredLength)
                    return block.trim().replace(RE_NORMALIZE_WHITESPACE, ' ');
                var idxPrevSpace = block.lastIndexOf(' ', desiredLength);
                if (desiredLength - idxPrevSpace < MAX_WORD_SHRINK)
                    return block.substring(0, idxPrevSpace).trim().replace(RE_NORMALIZE_WHITESPACE, ' ');
                return block.substring(0, desiredLength).trim().replace(RE_NORMALIZE_WHITESPACE, ' ');
            }
        }
        return '';
    };
    var MAX_QUOTE_REPEAT_DEPTH = 5;
    var replyQuotePrefixStrings = [
        '> ',
        '>> ',
        '>>> ',
        '>>>> ',
        '>>>>> ',
        '>>>>>> ',
        '>>>>>>> ',
        '>>>>>>>> ',
        '>>>>>>>>> '
    ];
    var replyQuotePrefixStringsNoSpace = [
        '>',
        '>>',
        '>>>',
        '>>>>',
        '>>>>>',
        '>>>>>>',
        '>>>>>>>',
        '>>>>>>>>',
        '>>>>>>>>>'
    ];
    var replyQuoteNewlineReplaceStrings = [
        '\n> ',
        '\n>> ',
        '\n>>> ',
        '\n>>>> ',
        '\n>>>>> ',
        '\n>>>>>> ',
        '\n>>>>>>> ',
        '\n>>>>>>>> '
    ];
    var replyQuoteNewlineReplaceStringsNoSpace = [
        '\n>',
        '\n>>',
        '\n>>>',
        '\n>>>>',
        '\n>>>>>',
        '\n>>>>>>',
        '\n>>>>>>>',
        '\n>>>>>>>>'
    ];
    var replyQuoteBlankLine = [
        '\n',
        '>\n',
        '>>\n',
        '>>>\n',
        '>>>>\n',
        '>>>>>\n',
        '>>>>>>\n',
        '>>>>>>>\n',
        '>>>>>>>>\n'
    ];
    var replyPrefix = '> ', replyNewlineReplace = '\n> ';
    function expandQuotedPrefix(s, depth) {
        if (s.charCodeAt(0) === CHARCODE_NEWLINE)
            return replyQuotePrefixStringsNoSpace[depth];
        return replyQuotePrefixStrings[depth];
    }
    function expandQuoted(s, depth) {
        var ws = replyQuoteNewlineReplaceStrings[depth], nows = replyQuoteNewlineReplaceStringsNoSpace[depth];
        return s.replace(RE_NEWLINE, function (m, idx) {
            if (s.charCodeAt(idx + 1) === CHARCODE_NEWLINE)
                return nows;
            else
                return ws;
        });
    }
    exports.generateReplyText = function generateReplyText(rep) {
        var strBits = [];
        var lastContentDepth = null;
        var suppressWhitespaceBlankLine = false;
        for (var i = 0; i < rep.length; i += 2) {
            var etype = rep[i] & 15, block = rep[i + 1];
            switch (etype) {
            default:
            case CT_AUTHORED_CONTENT:
            case CT_SIGNATURE:
            case CT_LEADIN_TO_QUOTE:
                if (block.length) {
                    if (lastContentDepth !== null) {
                        strBits.push(NEWLINE);
                        if (!suppressWhitespaceBlankLine) {
                            strBits.push(replyQuoteBlankLine[lastContentDepth]);
                        }
                    }
                    strBits.push(expandQuotedPrefix(block, 0));
                    strBits.push(expandQuoted(block, 0));
                    lastContentDepth = 1;
                    suppressWhitespaceBlankLine = etype === CT_LEADIN_TO_QUOTE;
                }
                break;
            case CT_QUOTED_TYPE:
                var depth = (rep[i] >> 8 & 255) + 1;
                if (depth < MAX_QUOTE_REPEAT_DEPTH) {
                    if (lastContentDepth !== null) {
                        strBits.push(NEWLINE);
                        if (!suppressWhitespaceBlankLine) {
                            strBits.push(replyQuoteBlankLine[lastContentDepth]);
                        }
                    }
                    strBits.push(expandQuotedPrefix(block, depth));
                    strBits.push(expandQuoted(block, depth));
                    lastContentDepth = depth;
                    suppressWhitespaceBlankLine = RE_REPLY_LAST_LINE_IN_BLOCK_CONTAINS_WROTE.test(block);
                }
                break;
            case CT_BOILERPLATE_DISCLAIMER:
            case CT_BOILERPLATE_LIST_INFO:
            case CT_BOILERPLATE_PRODUCT:
            case CT_BOILERPLATE_ADS:
                break;
            }
        }
        return strBits.join('');
    };
    exports.generateForwardBodyText = function generateForwardBodyText(rep) {
        var strBits = [], nl;
        for (var i = 0; i < rep.length; i += 2) {
            if (i) {
                strBits.push(NEWLINE);
            }
            var etype = rep[i] & 15, block = rep[i + 1];
            switch (etype) {
            default:
            case CT_AUTHORED_CONTENT:
                for (nl = rep[i] >> 8 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                }
                strBits.push(block);
                for (nl = rep[i] >> 16 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                }
                break;
            case CT_LEADIN_TO_QUOTE:
                strBits.push(block);
                for (nl = rep[i] >> 8 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                }
                break;
            case CT_SIGNATURE:
            case CT_BOILERPLATE_DISCLAIMER:
            case CT_BOILERPLATE_LIST_INFO:
            case CT_BOILERPLATE_PRODUCT:
            case CT_BOILERPLATE_ADS:
                for (nl = rep[i] >> 8 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                }
                strBits.push(block);
                for (nl = rep[i] >> 16 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                }
                break;
            case CT_QUOTED_TYPE:
                var depth = Math.min(rep[i] >> 8 & 255, 8);
                for (nl = rep[i] >> 16 & 255; nl; nl--) {
                    strBits.push(replyQuotePrefixStringsNoSpace[depth]);
                    strBits.push(NEWLINE);
                }
                strBits.push(expandQuotedPrefix(block, depth));
                strBits.push(expandQuoted(block, depth));
                for (nl = rep[i] >> 24 & 255; nl; nl--) {
                    strBits.push(NEWLINE);
                    strBits.push(replyQuotePrefixStringsNoSpace[depth]);
                }
                break;
            }
        }
        return strBits.join('');
    };
});
;
define('mailchew', [
    'exports',
    'logic',
    './util',
    './mailchew-strings',
    './quotechew',
    './htmlchew'
], function (exports, logic, $util, $mailchewStrings, $quotechew, $htmlchew) {
    var DESIRED_SNIPPET_LENGTH = 100;
    var scope = logic.scope('MailChew');
    exports.generateBaseComposeBody = function generateBaseComposeBody(identity) {
        if (identity.signatureEnabled && identity.signature && identity.signature.length > 0) {
            var body = '\n\n--\n' + identity.signature;
            return body;
        } else {
            return '';
        }
    };
    var RE_RE = /^[Rr][Ee]:/;
    exports.generateReplySubject = function generateReplySubject(origSubject) {
        var re = 'Re: ';
        if (origSubject) {
            if (RE_RE.test(origSubject))
                return origSubject;
            return re + origSubject;
        }
        return re;
    };
    var FWD_FWD = /^[Ff][Ww][Dd]:/;
    exports.generateForwardSubject = function generateForwardSubject(origSubject) {
        var fwd = 'Fwd: ';
        if (origSubject) {
            if (FWD_FWD.test(origSubject))
                return origSubject;
            return fwd + origSubject;
        }
        return fwd;
    };
    var l10n_wroteString = '{name} wrote', l10n_originalMessageString = 'Original Message';
    var l10n_forward_header_labels = {
        subject: 'Subject',
        date: 'Date',
        from: 'From',
        replyTo: 'Reply-To',
        to: 'To',
        cc: 'CC'
    };
    exports.setLocalizedStrings = function (strings) {
        l10n_wroteString = strings.wrote;
        l10n_originalMessageString = strings.originalMessage;
        l10n_forward_header_labels = strings.forwardHeaderLabels;
    };
    if ($mailchewStrings.strings) {
        exports.setLocalizedStrings($mailchewStrings.strings);
    }
    $mailchewStrings.events.on('strings', function (strings) {
        exports.setLocalizedStrings(strings);
    });
    exports.generateReplyBody = function generateReplyMessage(reps, authorPair, msgDate, identity, refGuid) {
        var useName = authorPair.name ? authorPair.name.trim() : authorPair.address;
        var textMsg = '\n\n' + l10n_wroteString.replace('{name}', useName) + ':\n', htmlMsg = null;
        for (var i = 0; i < reps.length; i++) {
            var repType = reps[i].type, rep = reps[i].content;
            if (repType === 'plain') {
                var replyText = $quotechew.generateReplyText(rep);
                if (htmlMsg) {
                    htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(replyText) + '\n';
                } else {
                    textMsg += replyText;
                }
            } else if (repType === 'html') {
                if (!htmlMsg) {
                    htmlMsg = '';
                    if (textMsg.slice(-1) === '\n') {
                        textMsg = textMsg.slice(0, -1);
                    }
                }
                htmlMsg += '<blockquote ';
                if (refGuid) {
                    htmlMsg += 'cite="mid:' + $htmlchew.escapeAttrValue(refGuid) + '" ';
                }
                htmlMsg += 'type="cite">' + rep + '</blockquote>';
            }
        }
        if (identity.signature && identity.signatureEnabled) {
            if (htmlMsg)
                htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(identity.signature, 'pre', false, [
                    'class',
                    'moz-signature',
                    'cols',
                    '72'
                ]);
            else
                textMsg += '\n\n-- \n' + identity.signature;
        }
        return {
            text: textMsg,
            html: htmlMsg
        };
    };
    exports.generateForwardMessage = function (author, date, subject, headerInfo, bodyInfo, identity) {
        var textMsg = '\n\n', htmlMsg = null;
        if (identity.signature && identity.signatureEnabled)
            textMsg += '-- \n' + identity.signature + '\n\n';
        textMsg += '-------- ' + l10n_originalMessageString + ' --------\n';
        textMsg += l10n_forward_header_labels['subject'] + ': ' + subject + '\n';
        textMsg += l10n_forward_header_labels['date'] + ': ' + new Date(date) + '\n';
        textMsg += l10n_forward_header_labels['from'] + ': ' + $util.formatAddresses([author]) + '\n';
        if (headerInfo.replyTo)
            textMsg += l10n_forward_header_labels['replyTo'] + ': ' + $util.formatAddresses([headerInfo.replyTo]) + '\n';
        if (headerInfo.to)
            textMsg += l10n_forward_header_labels['to'] + ': ' + $util.formatAddresses(headerInfo.to) + '\n';
        if (headerInfo.cc)
            textMsg += l10n_forward_header_labels['cc'] + ': ' + $util.formatAddresses(headerInfo.cc) + '\n';
        textMsg += '\n';
        var reps = bodyInfo.bodyReps;
        for (var i = 0; i < reps.length; i++) {
            var repType = reps[i].type, rep = reps[i].content;
            if (repType === 'plain') {
                var forwardText = $quotechew.generateForwardBodyText(rep);
                if (htmlMsg) {
                    htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(forwardText) + '\n';
                } else {
                    textMsg += forwardText;
                }
            } else if (repType === 'html') {
                if (!htmlMsg) {
                    htmlMsg = '';
                    if (textMsg.slice(-1) === '\n') {
                        textMsg = textMsg.slice(0, -1);
                    }
                }
                htmlMsg += rep;
            }
        }
        return {
            text: textMsg,
            html: htmlMsg
        };
    };
    var HTML_WRAP_TOP = '<html><body><body bgcolor="#FFFFFF" text="#000000">';
    var HTML_WRAP_BOTTOM = '</body></html>';
    exports.mergeUserTextWithHTML = function mergeReplyTextWithHTML(text, html) {
        return HTML_WRAP_TOP + $htmlchew.wrapTextIntoSafeHTMLString(text, 'div') + html + HTML_WRAP_BOTTOM;
    };
    exports.processMessageContent = function processMessageContent(content, type, isDownloaded, generateSnippet) {
        if (content.slice(-1) === '\n') {
            content = content.slice(0, -1);
        }
        var parsedContent, snippet;
        switch (type) {
        case 'plain':
            try {
                parsedContent = $quotechew.quoteProcessTextBody(content);
            } catch (ex) {
                logic(scope, 'textChewError', { ex: ex });
                parsedContent = [];
            }
            if (generateSnippet) {
                try {
                    snippet = $quotechew.generateSnippet(parsedContent, DESIRED_SNIPPET_LENGTH);
                } catch (ex) {
                    logic(scope, 'textSnippetError', { ex: ex });
                    snippet = '';
                }
            }
            break;
        case 'html':
            if (generateSnippet) {
                try {
                    snippet = $htmlchew.generateSnippet(content);
                } catch (ex) {
                    logic(scope, 'htmlSnippetError', { ex: ex });
                    snippet = '';
                }
            }
            if (isDownloaded) {
                try {
                    parsedContent = $htmlchew.sanitizeAndNormalizeHtml(content);
                } catch (ex) {
                    logic(scope, 'htmlParseError', { ex: ex });
                    parsedContent = '';
                }
            }
            break;
        }
        return {
            content: parsedContent,
            snippet: snippet
        };
    };
});
;
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('addressparser', factory);
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
define('tcp-socket', [
    'require',
    'exports',
    'module',
    'worker-router',
    'disaster-recovery'
], function (require, exports, module) {
    var router = require('worker-router');
    var routerMaker = router.registerInstanceType('netsocket');
    var DisasterRecovery = require('disaster-recovery');
    function TCPSocketProxy(host, port, options) {
        options = options || {};
        options.binaryType = 'arraybuffer';
        this.host = host;
        this.port = port;
        this.ssl = !!options.useSecureTransport;
        this.binaryType = options.binaryType;
        this.bufferedAmount = 0;
        this.readyState = 'connecting';
        var routerInfo = routerMaker.register(function (data) {
            var eventHandlerName = data.cmd;
            var internalHandler = this['_' + eventHandlerName];
            var externalHandler = this[eventHandlerName];
            internalHandler && internalHandler.call(this, data.args);
            DisasterRecovery.catchSocketExceptions(this, function () {
                externalHandler && externalHandler.call(this, { data: data.args });
            });
        }.bind(this));
        this._sendMessage = routerInfo.sendMessage;
        this._unregisterWithRouter = routerInfo.unregister;
        this._sendMessage('open', [
            host,
            port,
            options
        ]);
    }
    TCPSocketProxy.prototype = {
        _onopen: function () {
            this.readyState = 'open';
        },
        _onclose: function () {
            this._unregisterWithRouter();
            this.readyState = 'closed';
        },
        upgradeToSecure: function () {
            this._sendMessage('upgradeToSecure', []);
        },
        suspend: function () {
            throw new Error('tcp-socket.js does not support suspend().');
        },
        resume: function () {
            throw new Error('tcp-socket.js does not support resume().');
        },
        close: function () {
            if (this.readyState !== 'closed') {
                this._sendMessage('close');
            }
        },
        send: function (u8array) {
            if (u8array instanceof Blob) {
                this._sendMessage('write', [u8array]);
            } else if (u8array instanceof ArrayBuffer) {
                this._sendMessage('write', [
                    u8array,
                    0,
                    u8array.byteLength
                ]);
            } else if (u8array.byteOffset !== 0 || u8array.length !== u8array.buffer.byteLength) {
                var buf = u8array.buffer.slice(u8array.byteOffset, u8array.byteOffset + u8array.length);
                this._sendMessage('write', [
                    buf,
                    0,
                    buf.byteLength
                ], [buf]);
            } else {
                this._sendMessage('write', [
                    u8array.buffer,
                    u8array.byteOffset,
                    u8array.length
                ]);
            }
            return true;
        }
    };
    return {
        open: function (host, port, options) {
            return new TCPSocketProxy(host, port, options);
        }
    };
});
define('mix', [], function () {
    return function mix(target, source, override) {
        Object.keys(source).forEach(function (key) {
            if (!target.hasOwnProperty(key) || override)
                target[key] = source[key];
        });
        return target;
    };
});
define('axe-logger', [], function () {
    return {
        debug: function () {
        },
        log: function () {
        },
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };
});
define('axe', ['axe-logger'], function (axe) {
    return axe;
});
define('errorutils', ['exports'], function (exports) {
    var ALL_ERRORS = {
        'offline': {
            reachable: false,
            retry: true,
            report: false
        },
        'server-maintenance': {
            reachable: true,
            retry: true,
            report: false
        },
        'unresponsive-server': {
            reachable: false,
            retry: true,
            report: false
        },
        'port-not-listening': {
            reachable: false,
            retry: true,
            report: false
        },
        'bad-user-or-pass': {
            reachable: true,
            retry: false,
            report: true
        },
        'needs-oauth-reauth': {
            reachable: true,
            retry: false,
            report: true
        },
        'imap-disabled': {
            reachable: true,
            retry: false,
            report: true
        },
        'pop3-disabled': {
            reachable: true,
            retry: false,
            report: true
        },
        'not-authorized': {
            reachable: true,
            retry: false,
            report: true
        },
        'bad-security': {
            reachable: true,
            retry: false,
            report: true
        },
        'no-config-info': {
            reachable: false,
            retry: false,
            report: false
        },
        'user-account-exists': {
            reachable: false,
            retry: false,
            report: false
        },
        'pop-server-not-great': {
            reachable: true,
            retry: false,
            report: false
        },
        'no-dns-entry': {
            reachable: false,
            retry: false,
            report: false
        },
        'bad-address': {
            reachable: true,
            retry: false,
            report: false
        },
        'server-problem': {
            reachable: true,
            retry: false,
            report: false
        },
        'unknown': {
            reachable: false,
            retry: false,
            report: false
        }
    };
    exports.shouldReportProblem = function (err) {
        return (ALL_ERRORS[err] || ALL_ERRORS['unknown']).report;
    };
    exports.shouldRetry = function (err) {
        return (ALL_ERRORS[err] || ALL_ERRORS['unknown']).retry;
    };
    exports.wasErrorFromReachableState = function (err) {
        return (ALL_ERRORS[err] || ALL_ERRORS['unknown']).reachable;
    };
    exports.analyzeException = function (err) {
        if (err === 'Connection refused') {
            err = { name: 'ConnectionRefusedError' };
        } else if (typeof err === 'string') {
            return err;
        }
        if (!err.name) {
            return null;
        }
        if (/^Security/.test(err.name)) {
            return 'bad-security';
        } else if (/^ConnectionRefused/i.test(err.name)) {
            return 'unresponsive-server';
        } else {
            return null;
        }
    };
});
define('db/folder_info_rep', ['require'], function (require) {
    function makeFolderMeta(raw) {
        return {
            id: raw.id || null,
            serverId: raw.serverId || null,
            name: raw.name || null,
            type: raw.type || null,
            path: raw.path || null,
            parentId: raw.parentId || null,
            depth: raw.depth || 0,
            lastSyncedAt: raw.lastSyncedAt || 0,
            unreadCount: raw.unreadCount || 0,
            syncKey: raw.syncKey || null,
            version: raw.version || null
        };
    }
    ;
    return { makeFolderMeta: makeFolderMeta };
});
;
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('mimetypes', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.mimetypes = factory();
    }
}(this, function () {
    'use strict';
    function detectExtension(mimeType) {
        mimeType = (mimeType || '').toString().toLowerCase().replace(/\s/g, '');
        if (!(mimeType in mimetypesList)) {
            return 'bin';
        }
        if (typeof mimetypesList[mimeType] === 'string') {
            return mimetypesList[mimeType];
        }
        var mimeParts = mimeType.split('/');
        for (var i = 0, len = mimetypesList[mimeType].length; i < len; i++) {
            if (mimeParts[1] === mimetypesList[mimeType][i]) {
                return mimetypesList[mimeType][i];
            }
        }
        return mimetypesList[mimeType][0];
    }
    function detectMimeType(extension) {
        extension = (extension || '').toString().toLowerCase().replace(/\s/g, '').replace(/^\./g, '');
        if (!(extension in mimetypesExtensions)) {
            return 'application/octet-stream';
        }
        if (typeof mimetypesExtensions[extension] === 'string') {
            return mimetypesExtensions[extension];
        }
        var mimeParts;
        for (var i = 0, len = mimetypesExtensions[extension].length; i < len; i++) {
            mimeParts = mimetypesExtensions[extension][i].split('/');
            if (mimeParts[1] === extension) {
                return mimetypesExtensions[extension][i];
            }
        }
        return mimetypesExtensions[extension][0];
    }
    var mimetypesList = {
        'application/acad': 'dwg',
        'application/andrew-inset': '',
        'application/applixware': 'aw',
        'application/arj': 'arj',
        'application/atom+xml': 'xml',
        'application/atomcat+xml': 'atomcat',
        'application/atomsvc+xml': 'atomsvc',
        'application/base64': [
            'mm',
            'mme'
        ],
        'application/binhex': 'hqx',
        'application/binhex4': 'hqx',
        'application/book': [
            'boo',
            'book'
        ],
        'application/ccxml+xml,': 'ccxml',
        'application/cdf': 'cdf',
        'application/cdmi-capability': 'cdmia',
        'application/cdmi-container': 'cdmic',
        'application/cdmi-domain': 'cdmid',
        'application/cdmi-object': 'cdmio',
        'application/cdmi-queue': 'cdmiq',
        'application/clariscad': 'ccad',
        'application/commonground': 'dp',
        'application/cu-seeme': 'cu',
        'application/davmount+xml': 'davmount',
        'application/drafting': 'drw',
        'application/dsptype': 'tsp',
        'application/dssc+der': 'dssc',
        'application/dssc+xml': 'xdssc',
        'application/dxf': 'dxf',
        'application/ecmascript': [
            'js',
            'es'
        ],
        'application/emma+xml': 'emma',
        'application/envoy': 'evy',
        'application/epub+zip': 'epub',
        'application/excel': [
            'xl',
            'xla',
            'xlb',
            'xlc',
            'xld',
            'xlk',
            'xll',
            'xlm',
            'xls',
            'xlt',
            'xlv',
            'xlw'
        ],
        'application/exi': 'exi',
        'application/font-tdpfr': 'pfr',
        'application/fractals': 'fif',
        'application/freeloader': 'frl',
        'application/futuresplash': 'spl',
        'application/gnutar': 'tgz',
        'application/groupwise': 'vew',
        'application/hlp': 'hlp',
        'application/hta': 'hta',
        'application/hyperstudio': 'stk',
        'application/i-deas': 'unv',
        'application/iges': [
            'iges',
            'igs'
        ],
        'application/inf': 'inf',
        'application/internet-property-stream': 'acx',
        'application/ipfix': 'ipfix',
        'application/java': 'class',
        'application/java-archive': 'jar',
        'application/java-byte-code': 'class',
        'application/java-serialized-object': 'ser',
        'application/java-vm': 'class',
        'application/javascript': 'js',
        'application/json': 'json',
        'application/lha': 'lha',
        'application/lzx': 'lzx',
        'application/mac-binary': 'bin',
        'application/mac-binhex': 'hqx',
        'application/mac-binhex40': 'hqx',
        'application/mac-compactpro': 'cpt',
        'application/macbinary': 'bin',
        'application/mads+xml': 'mads',
        'application/marc': 'mrc',
        'application/marcxml+xml': 'mrcx',
        'application/mathematica': 'ma',
        'application/mathml+xml': 'mathml',
        'application/mbedlet': 'mbd',
        'application/mbox': 'mbox',
        'application/mcad': 'mcd',
        'application/mediaservercontrol+xml': 'mscml',
        'application/metalink4+xml': 'meta4',
        'application/mets+xml': 'mets',
        'application/mime': 'aps',
        'application/mods+xml': 'mods',
        'application/mp21': 'm21',
        'application/mp4': 'mp4',
        'application/mspowerpoint': [
            'pot',
            'pps',
            'ppt',
            'ppz'
        ],
        'application/msword': [
            'doc',
            'dot',
            'w6w',
            'wiz',
            'word'
        ],
        'application/mswrite': 'wri',
        'application/mxf': 'mxf',
        'application/netmc': 'mcp',
        'application/octet-stream': ['*'],
        'application/oda': 'oda',
        'application/oebps-package+xml': 'opf',
        'application/ogg': 'ogx',
        'application/olescript': 'axs',
        'application/onenote': 'onetoc',
        'application/patch-ops-error+xml': 'xer',
        'application/pdf': 'pdf',
        'application/pgp-encrypted': '',
        'application/pgp-signature': 'pgp',
        'application/pics-rules': 'prf',
        'application/pkcs-12': 'p12',
        'application/pkcs-crl': 'crl',
        'application/pkcs10': 'p10',
        'application/pkcs7-mime': [
            'p7c',
            'p7m'
        ],
        'application/pkcs7-signature': 'p7s',
        'application/pkcs8': 'p8',
        'application/pkix-attr-cert': 'ac',
        'application/pkix-cert': [
            'cer',
            'crt'
        ],
        'application/pkix-crl': 'crl',
        'application/pkix-pkipath': 'pkipath',
        'application/pkixcmp': 'pki',
        'application/plain': 'text',
        'application/pls+xml': 'pls',
        'application/postscript': [
            'ai',
            'eps',
            'ps'
        ],
        'application/powerpoint': 'ppt',
        'application/pro_eng': [
            'part',
            'prt'
        ],
        'application/prs.cww': 'cww',
        'application/pskc+xml': 'pskcxml',
        'application/rdf+xml': 'rdf',
        'application/reginfo+xml': 'rif',
        'application/relax-ng-compact-syntax': 'rnc',
        'application/resource-lists+xml': 'rl',
        'application/resource-lists-diff+xml': 'rld',
        'application/ringing-tones': 'rng',
        'application/rls-services+xml': 'rs',
        'application/rsd+xml': 'rsd',
        'application/rss+xml': 'xml',
        'application/rtf': [
            'rtf',
            'rtx'
        ],
        'application/sbml+xml': 'sbml',
        'application/scvp-cv-request': 'scq',
        'application/scvp-cv-response': 'scs',
        'application/scvp-vp-request': 'spq',
        'application/scvp-vp-response': 'spp',
        'application/sdp': 'sdp',
        'application/sea': 'sea',
        'application/set': 'set',
        'application/set-payment-initiation': 'setpay',
        'application/set-registration-initiation': 'setreg',
        'application/shf+xml': 'shf',
        'application/sla': 'stl',
        'application/smil': [
            'smi',
            'smil'
        ],
        'application/smil+xml': 'smi',
        'application/solids': 'sol',
        'application/sounder': 'sdr',
        'application/sparql-query': 'rq',
        'application/sparql-results+xml': 'srx',
        'application/srgs': 'gram',
        'application/srgs+xml': 'grxml',
        'application/sru+xml': 'sru',
        'application/ssml+xml': 'ssml',
        'application/step': [
            'step',
            'stp'
        ],
        'application/streamingmedia': 'ssm',
        'application/tei+xml': 'tei',
        'application/thraud+xml': 'tfi',
        'application/timestamped-data': 'tsd',
        'application/toolbook': 'tbk',
        'application/vda': 'vda',
        'application/vnd.3gpp.pic-bw-large': 'plb',
        'application/vnd.3gpp.pic-bw-small': 'psb',
        'application/vnd.3gpp.pic-bw-var': 'pvb',
        'application/vnd.3gpp2.tcap': 'tcap',
        'application/vnd.3m.post-it-notes': 'pwn',
        'application/vnd.accpac.simply.aso': 'aso',
        'application/vnd.accpac.simply.imp': 'imp',
        'application/vnd.acucobol': 'acu',
        'application/vnd.acucorp': 'atc',
        'application/vnd.adobe.air-application-installer-package+zip': 'air',
        'application/vnd.adobe.fxp': 'fxp',
        'application/vnd.adobe.xdp+xml': 'xdp',
        'application/vnd.adobe.xfdf': 'xfdf',
        'application/vnd.ahead.space': 'ahead',
        'application/vnd.airzip.filesecure.azf': 'azf',
        'application/vnd.airzip.filesecure.azs': 'azs',
        'application/vnd.amazon.ebook': 'azw',
        'application/vnd.americandynamics.acc': 'acc',
        'application/vnd.amiga.ami': 'ami',
        'application/vnd.android.package-archive': 'apk',
        'application/vnd.anser-web-certificate-issue-initiation': 'cii',
        'application/vnd.anser-web-funds-transfer-initiation': 'fti',
        'application/vnd.antix.game-component': 'atx',
        'application/vnd.apple.installer+xml': 'mpkg',
        'application/vnd.apple.mpegurl': 'm3u8',
        'application/vnd.aristanetworks.swi': 'swi',
        'application/vnd.audiograph': 'aep',
        'application/vnd.blueice.multipass': 'mpm',
        'application/vnd.bmi': 'bmi',
        'application/vnd.businessobjects': 'rep',
        'application/vnd.chemdraw+xml': 'cdxml',
        'application/vnd.chipnuts.karaoke-mmd': 'mmd',
        'application/vnd.cinderella': 'cdy',
        'application/vnd.claymore': 'cla',
        'application/vnd.cloanto.rp9': 'rp9',
        'application/vnd.clonk.c4group': 'c4g',
        'application/vnd.cluetrust.cartomobile-config': 'c11amc',
        'application/vnd.cluetrust.cartomobile-config-pkg': 'c11amz',
        'application/vnd.commonspace': 'csp',
        'application/vnd.contact.cmsg': 'cdbcmsg',
        'application/vnd.cosmocaller': 'cmc',
        'application/vnd.crick.clicker': 'clkx',
        'application/vnd.crick.clicker.keyboard': 'clkk',
        'application/vnd.crick.clicker.palette': 'clkp',
        'application/vnd.crick.clicker.template': 'clkt',
        'application/vnd.crick.clicker.wordbank': 'clkw',
        'application/vnd.criticaltools.wbs+xml': 'wbs',
        'application/vnd.ctc-posml': 'pml',
        'application/vnd.cups-ppd': 'ppd',
        'application/vnd.curl.car': 'car',
        'application/vnd.curl.pcurl': 'pcurl',
        'application/vnd.data-vision.rdz': 'rdz',
        'application/vnd.denovo.fcselayout-link': 'fe_launch',
        'application/vnd.dna': 'dna',
        'application/vnd.dolby.mlp': 'mlp',
        'application/vnd.dpgraph': 'dpg',
        'application/vnd.dreamfactory': 'dfac',
        'application/vnd.dvb.ait': 'ait',
        'application/vnd.dvb.service': 'svc',
        'application/vnd.dynageo': 'geo',
        'application/vnd.ecowin.chart': 'mag',
        'application/vnd.enliven': 'nml',
        'application/vnd.epson.esf': 'esf',
        'application/vnd.epson.msf': 'msf',
        'application/vnd.epson.quickanime': 'qam',
        'application/vnd.epson.salt': 'slt',
        'application/vnd.epson.ssf': 'ssf',
        'application/vnd.eszigno3+xml': 'es3',
        'application/vnd.ezpix-album': 'ez2',
        'application/vnd.ezpix-package': 'ez3',
        'application/vnd.fdf': 'fdf',
        'application/vnd.fdsn.seed': 'seed',
        'application/vnd.flographit': 'gph',
        'application/vnd.fluxtime.clip': 'ftc',
        'application/vnd.framemaker': 'fm',
        'application/vnd.frogans.fnc': 'fnc',
        'application/vnd.frogans.ltf': 'ltf',
        'application/vnd.fsc.weblaunch': 'fsc',
        'application/vnd.fujitsu.oasys': 'oas',
        'application/vnd.fujitsu.oasys2': 'oa2',
        'application/vnd.fujitsu.oasys3': 'oa3',
        'application/vnd.fujitsu.oasysgp': 'fg5',
        'application/vnd.fujitsu.oasysprs': 'bh2',
        'application/vnd.fujixerox.ddd': 'ddd',
        'application/vnd.fujixerox.docuworks': 'xdw',
        'application/vnd.fujixerox.docuworks.binder': 'xbd',
        'application/vnd.fuzzysheet': 'fzs',
        'application/vnd.genomatix.tuxedo': 'txd',
        'application/vnd.geogebra.file': 'ggb',
        'application/vnd.geogebra.tool': 'ggt',
        'application/vnd.geometry-explorer': 'gex',
        'application/vnd.geonext': 'gxt',
        'application/vnd.geoplan': 'g2w',
        'application/vnd.geospace': 'g3w',
        'application/vnd.gmx': 'gmx',
        'application/vnd.google-earth.kml+xml': 'kml',
        'application/vnd.google-earth.kmz': 'kmz',
        'application/vnd.grafeq': 'gqf',
        'application/vnd.groove-account': 'gac',
        'application/vnd.groove-help': 'ghf',
        'application/vnd.groove-identity-message': 'gim',
        'application/vnd.groove-injector': 'grv',
        'application/vnd.groove-tool-message': 'gtm',
        'application/vnd.groove-tool-template': 'tpl',
        'application/vnd.groove-vcard': 'vcg',
        'application/vnd.hal+xml': 'hal',
        'application/vnd.handheld-entertainment+xml': 'zmm',
        'application/vnd.hbci': 'hbci',
        'application/vnd.hhe.lesson-player': 'les',
        'application/vnd.hp-hpgl': [
            'hgl',
            'hpg',
            'hpgl'
        ],
        'application/vnd.hp-hpid': 'hpid',
        'application/vnd.hp-hps': 'hps',
        'application/vnd.hp-jlyt': 'jlt',
        'application/vnd.hp-pcl': 'pcl',
        'application/vnd.hp-pclxl': 'pclxl',
        'application/vnd.hydrostatix.sof-data': 'sfd-hdstx',
        'application/vnd.hzn-3d-crossword': 'x3d',
        'application/vnd.ibm.minipay': 'mpy',
        'application/vnd.ibm.modcap': 'afp',
        'application/vnd.ibm.rights-management': 'irm',
        'application/vnd.ibm.secure-container': 'sc',
        'application/vnd.iccprofile': 'icc',
        'application/vnd.igloader': 'igl',
        'application/vnd.immervision-ivp': 'ivp',
        'application/vnd.immervision-ivu': 'ivu',
        'application/vnd.insors.igm': 'igm',
        'application/vnd.intercon.formnet': 'xpw',
        'application/vnd.intergeo': 'i2g',
        'application/vnd.intu.qbo': 'qbo',
        'application/vnd.intu.qfx': 'qfx',
        'application/vnd.ipunplugged.rcprofile': 'rcprofile',
        'application/vnd.irepository.package+xml': 'irp',
        'application/vnd.is-xpr': 'xpr',
        'application/vnd.isac.fcs': 'fcs',
        'application/vnd.jam': 'jam',
        'application/vnd.jcp.javame.midlet-rms': 'rms',
        'application/vnd.jisp': 'jisp',
        'application/vnd.joost.joda-archive': 'joda',
        'application/vnd.kahootz': 'ktz',
        'application/vnd.kde.karbon': 'karbon',
        'application/vnd.kde.kchart': 'chrt',
        'application/vnd.kde.kformula': 'kfo',
        'application/vnd.kde.kivio': 'flw',
        'application/vnd.kde.kontour': 'kon',
        'application/vnd.kde.kpresenter': 'kpr',
        'application/vnd.kde.kspread': 'ksp',
        'application/vnd.kde.kword': 'kwd',
        'application/vnd.kenameaapp': 'htke',
        'application/vnd.kidspiration': 'kia',
        'application/vnd.kinar': 'kne',
        'application/vnd.koan': 'skp',
        'application/vnd.kodak-descriptor': 'sse',
        'application/vnd.las.las+xml': 'lasxml',
        'application/vnd.llamagraphics.life-balance.desktop': 'lbd',
        'application/vnd.llamagraphics.life-balance.exchange+xml': 'lbe',
        'application/vnd.lotus-1-2-3': '123',
        'application/vnd.lotus-approach': 'apr',
        'application/vnd.lotus-freelance': 'pre',
        'application/vnd.lotus-notes': 'nsf',
        'application/vnd.lotus-organizer': 'org',
        'application/vnd.lotus-screencam': 'scm',
        'application/vnd.lotus-wordpro': 'lwp',
        'application/vnd.macports.portpkg': 'portpkg',
        'application/vnd.mcd': 'mcd',
        'application/vnd.medcalcdata': 'mc1',
        'application/vnd.mediastation.cdkey': 'cdkey',
        'application/vnd.mfer': 'mwf',
        'application/vnd.mfmp': 'mfm',
        'application/vnd.micrografx.flo': 'flo',
        'application/vnd.micrografx.igx': 'igx',
        'application/vnd.mif': 'mif',
        'application/vnd.mobius.daf': 'daf',
        'application/vnd.mobius.dis': 'dis',
        'application/vnd.mobius.mbk': 'mbk',
        'application/vnd.mobius.mqy': 'mqy',
        'application/vnd.mobius.msl': 'msl',
        'application/vnd.mobius.plc': 'plc',
        'application/vnd.mobius.txf': 'txf',
        'application/vnd.mophun.application': 'mpn',
        'application/vnd.mophun.certificate': 'mpc',
        'application/vnd.mozilla.xul+xml': 'xul',
        'application/vnd.ms-artgalry': 'cil',
        'application/vnd.ms-cab-compressed': 'cab',
        'application/vnd.ms-excel': [
            'xla',
            'xlc',
            'xlm',
            'xls',
            'xlt',
            'xlw',
            'xlb',
            'xll'
        ],
        'application/vnd.ms-excel.addin.macroenabled.12': 'xlam',
        'application/vnd.ms-excel.sheet.binary.macroenabled.12': 'xlsb',
        'application/vnd.ms-excel.sheet.macroenabled.12': 'xlsm',
        'application/vnd.ms-excel.template.macroenabled.12': 'xltm',
        'application/vnd.ms-fontobject': 'eot',
        'application/vnd.ms-htmlhelp': 'chm',
        'application/vnd.ms-ims': 'ims',
        'application/vnd.ms-lrm': 'lrm',
        'application/vnd.ms-officetheme': 'thmx',
        'application/vnd.ms-outlook': 'msg',
        'application/vnd.ms-pki.certstore': 'sst',
        'application/vnd.ms-pki.pko': 'pko',
        'application/vnd.ms-pki.seccat': 'cat',
        'application/vnd.ms-pki.stl': 'stl',
        'application/vnd.ms-pkicertstore': 'sst',
        'application/vnd.ms-pkiseccat': 'cat',
        'application/vnd.ms-pkistl': 'stl',
        'application/vnd.ms-powerpoint': [
            'pot',
            'pps',
            'ppt',
            'ppa',
            'pwz'
        ],
        'application/vnd.ms-powerpoint.addin.macroenabled.12': 'ppam',
        'application/vnd.ms-powerpoint.presentation.macroenabled.12': 'pptm',
        'application/vnd.ms-powerpoint.slide.macroenabled.12': 'sldm',
        'application/vnd.ms-powerpoint.slideshow.macroenabled.12': 'ppsm',
        'application/vnd.ms-powerpoint.template.macroenabled.12': 'potm',
        'application/vnd.ms-project': 'mpp',
        'application/vnd.ms-word.document.macroenabled.12': 'docm',
        'application/vnd.ms-word.template.macroenabled.12': 'dotm',
        'application/vnd.ms-works': [
            'wcm',
            'wdb',
            'wks',
            'wps'
        ],
        'application/vnd.ms-wpl': 'wpl',
        'application/vnd.ms-xpsdocument': 'xps',
        'application/vnd.mseq': 'mseq',
        'application/vnd.musician': 'mus',
        'application/vnd.muvee.style': 'msty',
        'application/vnd.neurolanguage.nlu': 'nlu',
        'application/vnd.noblenet-directory': 'nnd',
        'application/vnd.noblenet-sealer': 'nns',
        'application/vnd.noblenet-web': 'nnw',
        'application/vnd.nokia.configuration-message': 'ncm',
        'application/vnd.nokia.n-gage.data': 'ngdat',
        'application/vnd.nokia.n-gage.symbian.install': 'n-gage',
        'application/vnd.nokia.radio-preset': 'rpst',
        'application/vnd.nokia.radio-presets': 'rpss',
        'application/vnd.nokia.ringing-tone': 'rng',
        'application/vnd.novadigm.edm': 'edm',
        'application/vnd.novadigm.edx': 'edx',
        'application/vnd.novadigm.ext': 'ext',
        'application/vnd.oasis.opendocument.chart': 'odc',
        'application/vnd.oasis.opendocument.chart-template': 'otc',
        'application/vnd.oasis.opendocument.database': 'odb',
        'application/vnd.oasis.opendocument.formula': 'odf',
        'application/vnd.oasis.opendocument.formula-template': 'odft',
        'application/vnd.oasis.opendocument.graphics': 'odg',
        'application/vnd.oasis.opendocument.graphics-template': 'otg',
        'application/vnd.oasis.opendocument.image': 'odi',
        'application/vnd.oasis.opendocument.image-template': 'oti',
        'application/vnd.oasis.opendocument.presentation': 'odp',
        'application/vnd.oasis.opendocument.presentation-template': 'otp',
        'application/vnd.oasis.opendocument.spreadsheet': 'ods',
        'application/vnd.oasis.opendocument.spreadsheet-template': 'ots',
        'application/vnd.oasis.opendocument.text': 'odt',
        'application/vnd.oasis.opendocument.text-master': 'odm',
        'application/vnd.oasis.opendocument.text-template': 'ott',
        'application/vnd.oasis.opendocument.text-web': 'oth',
        'application/vnd.olpc-sugar': 'xo',
        'application/vnd.oma.dd2+xml': 'dd2',
        'application/vnd.openofficeorg.extension': 'oxt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.slide': 'sldx',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow': 'ppsx',
        'application/vnd.openxmlformats-officedocument.presentationml.template': 'potx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'xltx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'dotx',
        'application/vnd.osgeo.mapguide.package': 'mgp',
        'application/vnd.osgi.dp': 'dp',
        'application/vnd.palm': 'pdb',
        'application/vnd.pawaafile': 'paw',
        'application/vnd.pg.format': 'str',
        'application/vnd.pg.osasli': 'ei6',
        'application/vnd.picsel': 'efif',
        'application/vnd.pmi.widget': 'wg',
        'application/vnd.pocketlearn': 'plf',
        'application/vnd.powerbuilder6': 'pbd',
        'application/vnd.previewsystems.box': 'box',
        'application/vnd.proteus.magazine': 'mgz',
        'application/vnd.publishare-delta-tree': 'qps',
        'application/vnd.pvi.ptid1': 'ptid',
        'application/vnd.quark.quarkxpress': 'qxd',
        'application/vnd.realvnc.bed': 'bed',
        'application/vnd.recordare.musicxml': 'mxl',
        'application/vnd.recordare.musicxml+xml': 'musicxml',
        'application/vnd.rig.cryptonote': 'cryptonote',
        'application/vnd.rim.cod': 'cod',
        'application/vnd.rn-realmedia': 'rm',
        'application/vnd.rn-realplayer': 'rnx',
        'application/vnd.route66.link66+xml': 'link66',
        'application/vnd.sailingtracker.track': 'st',
        'application/vnd.seemail': 'see',
        'application/vnd.sema': 'sema',
        'application/vnd.semd': 'semd',
        'application/vnd.semf': 'semf',
        'application/vnd.shana.informed.formdata': 'ifm',
        'application/vnd.shana.informed.formtemplate': 'itp',
        'application/vnd.shana.informed.interchange': 'iif',
        'application/vnd.shana.informed.package': 'ipk',
        'application/vnd.simtech-mindmapper': 'twd',
        'application/vnd.smaf': 'mmf',
        'application/vnd.smart.teacher': 'teacher',
        'application/vnd.solent.sdkm+xml': 'sdkm',
        'application/vnd.spotfire.dxp': 'dxp',
        'application/vnd.spotfire.sfs': 'sfs',
        'application/vnd.stardivision.calc': 'sdc',
        'application/vnd.stardivision.draw': 'sda',
        'application/vnd.stardivision.impress': 'sdd',
        'application/vnd.stardivision.math': 'smf',
        'application/vnd.stardivision.writer': 'sdw',
        'application/vnd.stardivision.writer-global': 'sgl',
        'application/vnd.stepmania.stepchart': 'sm',
        'application/vnd.sun.xml.calc': 'sxc',
        'application/vnd.sun.xml.calc.template': 'stc',
        'application/vnd.sun.xml.draw': 'sxd',
        'application/vnd.sun.xml.draw.template': 'std',
        'application/vnd.sun.xml.impress': 'sxi',
        'application/vnd.sun.xml.impress.template': 'sti',
        'application/vnd.sun.xml.math': 'sxm',
        'application/vnd.sun.xml.writer': 'sxw',
        'application/vnd.sun.xml.writer.global': 'sxg',
        'application/vnd.sun.xml.writer.template': 'stw',
        'application/vnd.sus-calendar': 'sus',
        'application/vnd.svd': 'svd',
        'application/vnd.symbian.install': 'sis',
        'application/vnd.syncml+xml': 'xsm',
        'application/vnd.syncml.dm+wbxml': 'bdm',
        'application/vnd.syncml.dm+xml': 'xdm',
        'application/vnd.tao.intent-module-archive': 'tao',
        'application/vnd.tmobile-livetv': 'tmo',
        'application/vnd.trid.tpt': 'tpt',
        'application/vnd.triscape.mxs': 'mxs',
        'application/vnd.trueapp': 'tra',
        'application/vnd.ufdl': 'ufd',
        'application/vnd.uiq.theme': 'utz',
        'application/vnd.umajin': 'umj',
        'application/vnd.unity': 'unityweb',
        'application/vnd.uoml+xml': 'uoml',
        'application/vnd.vcx': 'vcx',
        'application/vnd.visio': 'vsd',
        'application/vnd.visionary': 'vis',
        'application/vnd.vsf': 'vsf',
        'application/vnd.wap.wbxml': 'wbxml',
        'application/vnd.wap.wmlc': 'wmlc',
        'application/vnd.wap.wmlscriptc': 'wmlsc',
        'application/vnd.webturbo': 'wtb',
        'application/vnd.wolfram.player': 'nbp',
        'application/vnd.wordperfect': 'wpd',
        'application/vnd.wqd': 'wqd',
        'application/vnd.wt.stf': 'stf',
        'application/vnd.xara': [
            'web',
            'xar'
        ],
        'application/vnd.xfdl': 'xfdl',
        'application/vnd.yamaha.hv-dic': 'hvd',
        'application/vnd.yamaha.hv-script': 'hvs',
        'application/vnd.yamaha.hv-voice': 'hvp',
        'application/vnd.yamaha.openscoreformat': 'osf',
        'application/vnd.yamaha.openscoreformat.osfpvg+xml': 'osfpvg',
        'application/vnd.yamaha.smaf-audio': 'saf',
        'application/vnd.yamaha.smaf-phrase': 'spf',
        'application/vnd.yellowriver-custom-menu': 'cmp',
        'application/vnd.zul': 'zir',
        'application/vnd.zzazz.deck+xml': 'zaz',
        'application/vocaltec-media-desc': 'vmd',
        'application/vocaltec-media-file': 'vmf',
        'application/voicexml+xml': 'vxml',
        'application/widget': 'wgt',
        'application/winhlp': 'hlp',
        'application/wordperfect': [
            'wp',
            'wp5',
            'wp6',
            'wpd'
        ],
        'application/wordperfect6.0': [
            'w60',
            'wp5'
        ],
        'application/wordperfect6.1': 'w61',
        'application/wsdl+xml': 'wsdl',
        'application/wspolicy+xml': 'wspolicy',
        'application/x-123': 'wk1',
        'application/x-7z-compressed': '7z',
        'application/x-abiword': 'abw',
        'application/x-ace-compressed': 'ace',
        'application/x-aim': 'aim',
        'application/x-authorware-bin': 'aab',
        'application/x-authorware-map': 'aam',
        'application/x-authorware-seg': 'aas',
        'application/x-bcpio': 'bcpio',
        'application/x-binary': 'bin',
        'application/x-binhex40': 'hqx',
        'application/x-bittorrent': 'torrent',
        'application/x-bsh': [
            'bsh',
            'sh',
            'shar'
        ],
        'application/x-bytecode.elisp': 'elc',
        'applicaiton/x-bytecode.python': 'pyc',
        'application/x-bzip': 'bz',
        'application/x-bzip2': [
            'boz',
            'bz2'
        ],
        'application/x-cdf': 'cdf',
        'application/x-cdlink': 'vcd',
        'application/x-chat': [
            'cha',
            'chat'
        ],
        'application/x-chess-pgn': 'pgn',
        'application/x-cmu-raster': 'ras',
        'application/x-cocoa': 'cco',
        'application/x-compactpro': 'cpt',
        'application/x-compress': 'z',
        'application/x-compressed': [
            'tgz',
            'gz',
            'z',
            'zip'
        ],
        'application/x-conference': 'nsc',
        'application/x-cpio': 'cpio',
        'application/x-cpt': 'cpt',
        'application/x-csh': 'csh',
        'application/x-debian-package': 'deb',
        'application/x-deepv': 'deepv',
        'application/x-director': [
            'dcr',
            'dir',
            'dxr'
        ],
        'application/x-doom': 'wad',
        'application/x-dtbncx+xml': 'ncx',
        'application/x-dtbook+xml': 'dtb',
        'application/x-dtbresource+xml': 'res',
        'application/x-dvi': 'dvi',
        'application/x-elc': 'elc',
        'application/x-envoy': [
            'env',
            'evy'
        ],
        'application/x-esrehber': 'es',
        'application/x-excel': [
            'xla',
            'xlb',
            'xlc',
            'xld',
            'xlk',
            'xll',
            'xlm',
            'xls',
            'xlt',
            'xlv',
            'xlw'
        ],
        'application/x-font-bdf': 'bdf',
        'application/x-font-ghostscript': 'gsf',
        'application/x-font-linux-psf': 'psf',
        'application/x-font-otf': 'otf',
        'application/x-font-pcf': 'pcf',
        'application/x-font-snf': 'snf',
        'application/x-font-ttf': 'ttf',
        'application/x-font-type1': 'pfa',
        'application/x-font-woff': 'woff',
        'application/x-frame': 'mif',
        'application/x-freelance': 'pre',
        'application/x-futuresplash': 'spl',
        'application/x-gnumeric': 'gnumeric',
        'application/x-gsp': 'gsp',
        'application/x-gss': 'gss',
        'application/x-gtar': 'gtar',
        'application/x-gzip': [
            'gz',
            'gzip'
        ],
        'application/x-hdf': 'hdf',
        'application/x-helpfile': [
            'help',
            'hlp'
        ],
        'application/x-httpd-imap': 'imap',
        'application/x-ima': 'ima',
        'application/x-internet-signup': [
            'ins',
            'isp'
        ],
        'application/x-internett-signup': 'ins',
        'application/x-inventor': 'iv',
        'application/x-ip2': 'ip',
        'application/x-iphone': 'iii',
        'application/x-java-class': 'class',
        'application/x-java-commerce': 'jcm',
        'application/x-java-jnlp-file': 'jnlp',
        'application/x-javascript': 'js',
        'application/x-koan': [
            'skd',
            'skm',
            'skp',
            'skt'
        ],
        'application/x-ksh': 'ksh',
        'application/x-latex': [
            'latex',
            'ltx'
        ],
        'application/x-lha': 'lha',
        'application/x-lisp': 'lsp',
        'application/x-livescreen': 'ivy',
        'application/x-lotus': 'wq1',
        'application/x-lotusscreencam': 'scm',
        'application/x-lzh': 'lzh',
        'application/x-lzx': 'lzx',
        'application/x-mac-binhex40': 'hqx',
        'application/x-macbinary': 'bin',
        'application/x-magic-cap-package-1.0': 'mc$',
        'application/x-mathcad': 'mcd',
        'application/x-meme': 'mm',
        'application/x-midi': [
            'mid',
            'midi'
        ],
        'application/x-mif': 'mif',
        'application/x-mix-transfer': 'nix',
        'application/x-mobipocket-ebook': 'prc',
        'application/x-mplayer2': 'asx',
        'application/x-ms-application': 'application',
        'application/x-ms-wmd': 'wmd',
        'application/x-ms-wmz': 'wmz',
        'application/x-ms-xbap': 'xbap',
        'application/x-msaccess': 'mdb',
        'application/x-msbinder': 'obd',
        'application/x-mscardfile': 'crd',
        'application/x-msclip': 'clp',
        'application/x-msdownload': [
            'dll',
            'exe'
        ],
        'application/x-msexcel': [
            'xla',
            'xls',
            'xlw'
        ],
        'application/x-msmediaview': [
            'm13',
            'm14',
            'mvb'
        ],
        'application/x-msmetafile': 'wmf',
        'application/x-msmoney': 'mny',
        'application/x-mspowerpoint': 'ppt',
        'application/x-mspublisher': 'pub',
        'application/x-msschedule': 'scd',
        'application/x-msterminal': 'trm',
        'application/x-mswrite': 'wri',
        'application/x-navi-animation': 'ani',
        'application/x-navidoc': 'nvd',
        'application/x-navimap': 'map',
        'application/x-navistyle': 'stl',
        'application/x-netcdf': [
            'cdf',
            'nc'
        ],
        'application/x-newton-compatible-pkg': 'pkg',
        'application/x-nokia-9000-communicator-add-on-software': 'aos',
        'application/x-omc': 'omc',
        'application/x-omcdatamaker': 'omcd',
        'application/x-omcregerator': 'omcr',
        'application/x-pagemaker': [
            'pm4',
            'pm5'
        ],
        'application/x-pcl': 'pcl',
        'application/x-perfmon': [
            'pma',
            'pmc',
            'pml',
            'pmr',
            'pmw'
        ],
        'application/x-pixclscript': 'plx',
        'application/x-pkcs10': 'p10',
        'application/x-pkcs12': [
            'p12',
            'pfx'
        ],
        'application/x-pkcs7-certificates': [
            'p7b',
            'spc'
        ],
        'application/x-pkcs7-certreqresp': 'p7r',
        'application/x-pkcs7-mime': [
            'p7c',
            'p7m'
        ],
        'application/x-pkcs7-signature': [
            'p7s',
            'p7a'
        ],
        'application/x-pointplus': 'css',
        'application/x-portable-anymap': 'pnm',
        'application/x-project': [
            'mpc',
            'mpt',
            'mpv',
            'mpx'
        ],
        'application/x-qpro': 'wb1',
        'application/x-rar-compressed': 'rar',
        'application/x-rtf': 'rtf',
        'application/x-sdp': 'sdp',
        'application/x-sea': 'sea',
        'application/x-seelogo': 'sl',
        'application/x-sh': 'sh',
        'application/x-shar': [
            'shar',
            'sh'
        ],
        'application/x-shockwave-flash': 'swf',
        'application/x-silverlight-app': 'xap',
        'application/x-sit': 'sit',
        'application/x-sprite': [
            'spr',
            'sprite'
        ],
        'application/x-stuffit': 'sit',
        'application/x-stuffitx': 'sitx',
        'application/x-sv4cpio': 'sv4cpio',
        'application/x-sv4crc': 'sv4crc',
        'application/x-tar': 'tar',
        'application/x-tbook': [
            'sbk',
            'tbk'
        ],
        'application/x-tcl': 'tcl',
        'application/x-tex': 'tex',
        'application/x-tex-tfm': 'tfm',
        'application/x-texinfo': [
            'texi',
            'texinfo'
        ],
        'application/x-troff': [
            'roff',
            't',
            'tr'
        ],
        'application/x-troff-man': 'man',
        'application/x-troff-me': 'me',
        'application/x-troff-ms': 'ms',
        'application/x-troff-msvideo': 'avi',
        'application/x-ustar': 'ustar',
        'application/x-visio': [
            'vsd',
            'vst',
            'vsw'
        ],
        'application/x-vnd.audioexplosion.mzz': 'mzz',
        'application/x-vnd.ls-xpix': 'xpix',
        'application/x-vrml': 'vrml',
        'application/x-wais-source': [
            'src',
            'wsrc'
        ],
        'application/x-winhelp': 'hlp',
        'application/x-wintalk': 'wtk',
        'application/x-world': [
            'svr',
            'wrl'
        ],
        'application/x-wpwin': 'wpd',
        'application/x-wri': 'wri',
        'application/x-x509-ca-cert': [
            'cer',
            'crt',
            'der'
        ],
        'application/x-x509-user-cert': 'crt',
        'application/x-xfig': 'fig',
        'application/x-xpinstall': 'xpi',
        'application/x-zip-compressed': 'zip',
        'application/xcap-diff+xml': 'xdf',
        'application/xenc+xml': 'xenc',
        'application/xhtml+xml': 'xhtml',
        'application/xml': 'xml',
        'application/xml-dtd': 'dtd',
        'application/xop+xml': 'xop',
        'application/xslt+xml': 'xslt',
        'application/xspf+xml': 'xspf',
        'application/xv+xml': 'mxml',
        'application/yang': 'yang',
        'application/yin+xml': 'yin',
        'application/ynd.ms-pkipko': 'pko',
        'application/zip': 'zip',
        'audio/adpcm': 'adp',
        'audio/aiff': [
            'aif',
            'aifc',
            'aiff'
        ],
        'audio/basic': [
            'au',
            'snd'
        ],
        'audio/it': 'it',
        'audio/make': [
            'funk',
            'my',
            'pfunk'
        ],
        'audio/make.my.funk': 'pfunk',
        'audio/mid': [
            'mid',
            'rmi'
        ],
        'audio/midi': [
            'kar',
            'mid',
            'midi'
        ],
        'audio/mod': 'mod',
        'audio/mp4': 'mp4a',
        'audio/mpeg': [
            'mp3',
            'm2a',
            'mp2',
            'mpa',
            'mpg',
            'mpga'
        ],
        'audio/mpeg3': 'mp3',
        'audio/nspaudio': [
            'la',
            'lma'
        ],
        'audio/ogg': 'oga',
        'audio/s3m': 's3m',
        'audio/tsp-audio': 'tsi',
        'audio/tsplayer': 'tsp',
        'audio/vnd.dece.audio': 'uva',
        'audio/vnd.digital-winds': 'eol',
        'audio/vnd.dra': 'dra',
        'audio/vnd.dts': 'dts',
        'audio/vnd.dts.hd': 'dtshd',
        'audio/vnd.lucent.voice': 'lvp',
        'audio/vnd.ms-playready.media.pya': 'pya',
        'audio/vnd.nuera.ecelp4800': 'ecelp4800',
        'audio/vnd.nuera.ecelp7470': 'ecelp7470',
        'audio/vnd.nuera.ecelp9600': 'ecelp9600',
        'audio/vnd.qcelp': 'qcp',
        'audio/vnd.rip': 'rip',
        'audio/voc': 'voc',
        'audio/voxware': 'vox',
        'audio/wav': 'wav',
        'audio/webm': 'weba',
        'audio/x-aac': 'aac',
        'audio/x-adpcm': 'snd',
        'audio/x-aiff': [
            'aif',
            'aifc',
            'aiff'
        ],
        'audio/x-au': 'au',
        'audio/x-gsm': [
            'gsd',
            'gsm'
        ],
        'audio/x-jam': 'jam',
        'audio/x-liveaudio': 'lam',
        'audio/x-mid': [
            'mid',
            'midi'
        ],
        'audio/x-midi': [
            'mid',
            'midi'
        ],
        'audio/x-mod': 'mod',
        'audio/x-mpeg': 'mp2',
        'audio/x-mpeg-3': 'mp3',
        'audio/x-mpegurl': 'm3u',
        'audio/x-mpequrl': 'm3u',
        'audio/x-ms-wax': 'wax',
        'audio/x-ms-wma': 'wma',
        'audio/x-nspaudio': [
            'la',
            'lma'
        ],
        'audio/x-pn-realaudio': [
            'ra',
            'ram',
            'rm',
            'rmm',
            'rmp'
        ],
        'audio/x-pn-realaudio-plugin': [
            'ra',
            'rmp',
            'rpm'
        ],
        'audio/x-psid': 'sid',
        'audio/x-realaudio': 'ra',
        'audio/x-twinvq': 'vqf',
        'audio/x-twinvq-plugin': [
            'vqe',
            'vql'
        ],
        'audio/x-vnd.audioexplosion.mjuicemediafile': 'mjf',
        'audio/x-voc': 'voc',
        'audio/x-wav': 'wav',
        'audio/xm': 'xm',
        'chemical/x-cdx': 'cdx',
        'chemical/x-cif': 'cif',
        'chemical/x-cmdf': 'cmdf',
        'chemical/x-cml': 'cml',
        'chemical/x-csml': 'csml',
        'chemical/x-pdb': [
            'pdb',
            'xyz'
        ],
        'chemical/x-xyz': 'xyz',
        'drawing/x-dwf': 'dwf',
        'i-world/i-vrml': 'ivr',
        'image/bmp': [
            'bmp',
            'bm'
        ],
        'image/cgm': 'cgm',
        'image/cis-cod': 'cod',
        'image/cmu-raster': [
            'ras',
            'rast'
        ],
        'image/fif': 'fif',
        'image/florian': [
            'flo',
            'turbot'
        ],
        'image/g3fax': 'g3',
        'image/gif': 'gif',
        'image/ief': [
            'ief',
            'iefs'
        ],
        'image/jpeg': [
            'jpe',
            'jpeg',
            'jpg',
            'jfif',
            'jfif-tbnl'
        ],
        'image/jutvision': 'jut',
        'image/ktx': 'ktx',
        'image/naplps': [
            'nap',
            'naplps'
        ],
        'image/pict': [
            'pic',
            'pict'
        ],
        'image/pipeg': 'jfif',
        'image/pjpeg': [
            'jfif',
            'jpe',
            'jpeg',
            'jpg'
        ],
        'image/png': [
            'png',
            'x-png'
        ],
        'image/prs.btif': 'btif',
        'image/svg+xml': 'svg',
        'image/tiff': [
            'tif',
            'tiff'
        ],
        'image/vasa': 'mcf',
        'image/vnd.adobe.photoshop': 'psd',
        'image/vnd.dece.graphic': 'uvi',
        'image/vnd.djvu': 'djvu',
        'image/vnd.dvb.subtitle': 'sub',
        'image/vnd.dwg': [
            'dwg',
            'dxf',
            'svf'
        ],
        'image/vnd.dxf': 'dxf',
        'image/vnd.fastbidsheet': 'fbs',
        'image/vnd.fpx': 'fpx',
        'image/vnd.fst': 'fst',
        'image/vnd.fujixerox.edmics-mmr': 'mmr',
        'image/vnd.fujixerox.edmics-rlc': 'rlc',
        'image/vnd.ms-modi': 'mdi',
        'image/vnd.net-fpx': [
            'fpx',
            'npx'
        ],
        'image/vnd.rn-realflash': 'rf',
        'image/vnd.rn-realpix': 'rp',
        'image/vnd.wap.wbmp': 'wbmp',
        'image/vnd.xiff': 'xif',
        'image/webp': 'webp',
        'image/x-cmu-raster': 'ras',
        'image/x-cmx': 'cmx',
        'image/x-dwg': [
            'dwg',
            'dxf',
            'svf'
        ],
        'image/x-freehand': 'fh',
        'image/x-icon': 'ico',
        'image/x-jg': 'art',
        'image/x-jps': 'jps',
        'image/x-niff': [
            'nif',
            'niff'
        ],
        'image/x-pcx': 'pcx',
        'image/x-pict': [
            'pct',
            'pic'
        ],
        'image/x-portable-anymap': 'pnm',
        'image/x-portable-bitmap': 'pbm',
        'image/x-portable-graymap': 'pgm',
        'image/x-portable-greymap': 'pgm',
        'image/x-portable-pixmap': 'ppm',
        'image/x-quicktime': [
            'qif',
            'qti',
            'qtif'
        ],
        'image/x-rgb': 'rgb',
        'image/x-tiff': [
            'tif',
            'tiff'
        ],
        'image/x-windows-bmp': 'bmp',
        'image/x-xbitmap': 'xbm',
        'image/x-xbm': 'xbm',
        'image/x-xpixmap': [
            'xpm',
            'pm'
        ],
        'image/x-xwd': 'xwd',
        'image/x-xwindowdump': 'xwd',
        'image/xbm': 'xbm',
        'image/xpm': 'xpm',
        'message/rfc822': [
            'mht',
            'mhtml',
            'nws',
            'mime',
            'eml'
        ],
        'model/iges': [
            'iges',
            'igs'
        ],
        'model/mesh': 'msh',
        'model/vnd.collada+xml': 'dae',
        'model/vnd.dwf': 'dwf',
        'model/vnd.gdl': 'gdl',
        'model/vnd.gtw': 'gtw',
        'model/vnd.mts': 'mts',
        'model/vnd.vtu': 'vtu',
        'model/vrml': [
            'vrml',
            'wrl',
            'wrz'
        ],
        'model/x-pov': 'pov',
        'multipart/x-gzip': 'gzip',
        'multipart/x-ustar': 'ustar',
        'multipart/x-zip': 'zip',
        'music/crescendo': [
            'mid',
            'midi'
        ],
        'music/x-karaoke': 'kar',
        'paleovu/x-pv': 'pvu',
        'text/asp': 'asp',
        'text/calendar': 'ics',
        'text/css': 'css',
        'text/csv': 'csv',
        'text/ecmascript': 'js',
        'text/h323': '323',
        'text/html': [
            'htm',
            'html',
            'stm',
            'acgi',
            'htmls',
            'htx',
            'shtml'
        ],
        'text/iuls': 'uls',
        'text/javascript': 'js',
        'text/mcf': 'mcf',
        'text/n3': 'n3',
        'text/pascal': 'pas',
        'text/plain': [
            'bas',
            'c',
            'h',
            'txt',
            'c++',
            'cc',
            'com',
            'conf',
            'cxx',
            'def',
            'f',
            'f90',
            'for',
            'g',
            'hh',
            'idc',
            'jav',
            'java',
            'list',
            'log',
            'lst',
            'm',
            'mar',
            'pl',
            'sdml',
            'text'
        ],
        'text/plain-bas': 'par',
        'text/prs.lines.tag': 'dsc',
        'text/richtext': [
            'rtx',
            'rt',
            'rtf'
        ],
        'text/scriplet': 'wsc',
        'text/scriptlet': 'sct',
        'text/sgml': [
            'sgm',
            'sgml'
        ],
        'text/tab-separated-values': 'tsv',
        'text/troff': 't',
        'text/turtle': 'ttl',
        'text/uri-list': [
            'uni',
            'unis',
            'uri',
            'uris'
        ],
        'text/vnd.abc': 'abc',
        'text/vnd.curl': 'curl',
        'text/vnd.curl.dcurl': 'dcurl',
        'text/vnd.curl.mcurl': 'mcurl',
        'text/vnd.curl.scurl': 'scurl',
        'text/vnd.fly': 'fly',
        'text/vnd.fmi.flexstor': 'flx',
        'text/vnd.graphviz': 'gv',
        'text/vnd.in3d.3dml': '3dml',
        'text/vnd.in3d.spot': 'spot',
        'text/vnd.rn-realtext': 'rt',
        'text/vnd.sun.j2me.app-descriptor': 'jad',
        'text/vnd.wap.wml': 'wml',
        'text/vnd.wap.wmlscript': 'wmls',
        'text/webviewhtml': 'htt',
        'text/x-asm': [
            'asm',
            's'
        ],
        'text/x-audiosoft-intra': 'aip',
        'text/x-c': [
            'c',
            'cc',
            'cpp'
        ],
        'text/x-component': 'htc',
        'text/x-fortran': [
            'f',
            'f77',
            'f90',
            'for'
        ],
        'text/x-h': [
            'h',
            'hh'
        ],
        'text/x-java-source': [
            'jav',
            'java'
        ],
        'text/x-java-source,java': 'java',
        'text/x-la-asf': 'lsx',
        'text/x-m': 'm',
        'text/x-pascal': 'p',
        'text/x-script': 'hlb',
        'text/x-script.csh': 'csh',
        'text/x-script.elisp': 'el',
        'text/x-script.guile': 'scm',
        'text/x-script.ksh': 'ksh',
        'text/x-script.lisp': 'lsp',
        'text/x-script.perl': 'pl',
        'text/x-script.perl-module': 'pm',
        'text/x-script.phyton': 'py',
        'text/x-script.rexx': 'rexx',
        'text/x-script.scheme': 'scm',
        'text/x-script.sh': 'sh',
        'text/x-script.tcl': 'tcl',
        'text/x-script.tcsh': 'tcsh',
        'text/x-script.zsh': 'zsh',
        'text/x-server-parsed-html': [
            'shtml',
            'ssi'
        ],
        'text/x-setext': 'etx',
        'text/x-sgml': [
            'sgm',
            'sgml'
        ],
        'text/x-speech': [
            'spc',
            'talk'
        ],
        'text/x-uil': 'uil',
        'text/x-uuencode': [
            'uu',
            'uue'
        ],
        'text/x-vcalendar': 'vcs',
        'text/x-vcard': 'vcf',
        'text/xml': 'xml',
        'video/3gpp': '3gp',
        'video/3gpp2': '3g2',
        'video/animaflex': 'afl',
        'video/avi': 'avi',
        'video/avs-video': 'avs',
        'video/dl': 'dl',
        'video/fli': 'fli',
        'video/gl': 'gl',
        'video/h261': 'h261',
        'video/h263': 'h263',
        'video/h264': 'h264',
        'video/jpeg': 'jpgv',
        'video/jpm': 'jpm',
        'video/mj2': 'mj2',
        'video/mp4': 'mp4',
        'video/mpeg': [
            'mp2',
            'mpa',
            'mpe',
            'mpeg',
            'mpg',
            'mpv2',
            'm1v',
            'm2v',
            'mp3'
        ],
        'video/msvideo': 'avi',
        'video/ogg': 'ogv',
        'video/quicktime': [
            'mov',
            'qt',
            'moov'
        ],
        'video/vdo': 'vdo',
        'video/vivo': [
            'viv',
            'vivo'
        ],
        'video/vnd.dece.hd': 'uvh',
        'video/vnd.dece.mobile': 'uvm',
        'video/vnd.dece.pd': 'uvp',
        'video/vnd.dece.sd': 'uvs',
        'video/vnd.dece.video': 'uvv',
        'video/vnd.fvt': 'fvt',
        'video/vnd.mpegurl': 'mxu',
        'video/vnd.ms-playready.media.pyv': 'pyv',
        'video/vnd.rn-realvideo': 'rv',
        'video/vnd.uvvu.mp4': 'uvu',
        'video/vnd.vivo': [
            'viv',
            'vivo'
        ],
        'video/vosaic': 'vos',
        'video/webm': 'webm',
        'video/x-amt-demorun': 'xdr',
        'video/x-amt-showrun': 'xsr',
        'video/x-atomic3d-feature': 'fmf',
        'video/x-dl': 'dl',
        'video/x-dv': [
            'dif',
            'dv'
        ],
        'video/x-f4v': 'f4v',
        'video/x-fli': 'fli',
        'video/x-flv': 'flv',
        'video/x-gl': 'gl',
        'video/x-isvideo': 'isu',
        'video/x-la-asf': [
            'lsf',
            'lsx'
        ],
        'video/x-m4v': 'm4v',
        'video/x-motion-jpeg': 'mjpg',
        'video/x-mpeg': [
            'mp2',
            'mp3'
        ],
        'video/x-mpeq2a': 'mp2',
        'video/x-ms-asf': [
            'asf',
            'asr',
            'asx'
        ],
        'video/x-ms-asf-plugin': 'asx',
        'video/x-ms-wm': 'wm',
        'video/x-ms-wmv': 'wmv',
        'video/x-ms-wmx': 'wmx',
        'video/x-ms-wvx': 'wvx',
        'video/x-msvideo': 'avi',
        'video/x-qtc': 'qtc',
        'video/x-scm': 'scm',
        'video/x-sgi-movie': [
            'movie',
            'mv'
        ],
        'windows/metafile': 'wmf',
        'www/mime': 'mime',
        'x-conference/x-cooltalk': 'ice',
        'x-music/x-midi': [
            'mid',
            'midi'
        ],
        'x-world/x-3dmf': [
            '3dm',
            '3dmf',
            'qd3',
            'qd3d'
        ],
        'x-world/x-svr': 'svr',
        'x-world/x-vrml': [
            'flr',
            'vrml',
            'wrl',
            'wrz',
            'xaf',
            'xof'
        ],
        'x-world/x-vrt': 'vrt',
        'xgl/drawing': 'xgz',
        'xgl/movie': 'xmz'
    };
    var mimetypesExtensions = {
        '': [
            'application/andrew-inset',
            'application/pgp-encrypted'
        ],
        '*': 'application/octet-stream',
        '123': 'application/vnd.lotus-1-2-3',
        '323': 'text/h323',
        '3dm': 'x-world/x-3dmf',
        '3dmf': 'x-world/x-3dmf',
        '3dml': 'text/vnd.in3d.3dml',
        '3g2': 'video/3gpp2',
        '3gp': 'video/3gpp',
        '7z': 'application/x-7z-compressed',
        'a': 'application/octet-stream',
        'aab': 'application/x-authorware-bin',
        'aac': 'audio/x-aac',
        'aam': 'application/x-authorware-map',
        'aas': 'application/x-authorware-seg',
        'abc': 'text/vnd.abc',
        'abw': 'application/x-abiword',
        'ac': 'application/pkix-attr-cert',
        'acc': 'application/vnd.americandynamics.acc',
        'ace': 'application/x-ace-compressed',
        'acgi': 'text/html',
        'acu': 'application/vnd.acucobol',
        'acx': 'application/internet-property-stream',
        'adp': 'audio/adpcm',
        'aep': 'application/vnd.audiograph',
        'afl': 'video/animaflex',
        'afp': 'application/vnd.ibm.modcap',
        'ahead': 'application/vnd.ahead.space',
        'ai': 'application/postscript',
        'aif': [
            'audio/aiff',
            'audio/x-aiff'
        ],
        'aifc': [
            'audio/aiff',
            'audio/x-aiff'
        ],
        'aiff': [
            'audio/aiff',
            'audio/x-aiff'
        ],
        'aim': 'application/x-aim',
        'aip': 'text/x-audiosoft-intra',
        'air': 'application/vnd.adobe.air-application-installer-package+zip',
        'ait': 'application/vnd.dvb.ait',
        'ami': 'application/vnd.amiga.ami',
        'ani': 'application/x-navi-animation',
        'aos': 'application/x-nokia-9000-communicator-add-on-software',
        'apk': 'application/vnd.android.package-archive',
        'application': 'application/x-ms-application',
        'apr': 'application/vnd.lotus-approach',
        'aps': 'application/mime',
        'arc': 'application/octet-stream',
        'arj': [
            'application/arj',
            'application/octet-stream'
        ],
        'art': 'image/x-jg',
        'asf': 'video/x-ms-asf',
        'asm': 'text/x-asm',
        'aso': 'application/vnd.accpac.simply.aso',
        'asp': 'text/asp',
        'asr': 'video/x-ms-asf',
        'asx': [
            'video/x-ms-asf',
            'application/x-mplayer2',
            'video/x-ms-asf-plugin'
        ],
        'atc': 'application/vnd.acucorp',
        'atomcat': 'application/atomcat+xml',
        'atomsvc': 'application/atomsvc+xml',
        'atx': 'application/vnd.antix.game-component',
        'au': [
            'audio/basic',
            'audio/x-au'
        ],
        'avi': [
            'video/avi',
            'video/msvideo',
            'application/x-troff-msvideo',
            'video/x-msvideo'
        ],
        'avs': 'video/avs-video',
        'aw': 'application/applixware',
        'axs': 'application/olescript',
        'azf': 'application/vnd.airzip.filesecure.azf',
        'azs': 'application/vnd.airzip.filesecure.azs',
        'azw': 'application/vnd.amazon.ebook',
        'bas': 'text/plain',
        'bcpio': 'application/x-bcpio',
        'bdf': 'application/x-font-bdf',
        'bdm': 'application/vnd.syncml.dm+wbxml',
        'bed': 'application/vnd.realvnc.bed',
        'bh2': 'application/vnd.fujitsu.oasysprs',
        'bin': [
            'application/octet-stream',
            'application/mac-binary',
            'application/macbinary',
            'application/x-macbinary',
            'application/x-binary'
        ],
        'bm': 'image/bmp',
        'bmi': 'application/vnd.bmi',
        'bmp': [
            'image/bmp',
            'image/x-windows-bmp'
        ],
        'boo': 'application/book',
        'book': 'application/book',
        'box': 'application/vnd.previewsystems.box',
        'boz': 'application/x-bzip2',
        'bsh': 'application/x-bsh',
        'btif': 'image/prs.btif',
        'bz': 'application/x-bzip',
        'bz2': 'application/x-bzip2',
        'c': [
            'text/plain',
            'text/x-c'
        ],
        'c++': 'text/plain',
        'c11amc': 'application/vnd.cluetrust.cartomobile-config',
        'c11amz': 'application/vnd.cluetrust.cartomobile-config-pkg',
        'c4g': 'application/vnd.clonk.c4group',
        'cab': 'application/vnd.ms-cab-compressed',
        'car': 'application/vnd.curl.car',
        'cat': [
            'application/vnd.ms-pkiseccat',
            'application/vnd.ms-pki.seccat'
        ],
        'cc': [
            'text/plain',
            'text/x-c'
        ],
        'ccad': 'application/clariscad',
        'cco': 'application/x-cocoa',
        'ccxml': 'application/ccxml+xml,',
        'cdbcmsg': 'application/vnd.contact.cmsg',
        'cdf': [
            'application/cdf',
            'application/x-cdf',
            'application/x-netcdf'
        ],
        'cdkey': 'application/vnd.mediastation.cdkey',
        'cdmia': 'application/cdmi-capability',
        'cdmic': 'application/cdmi-container',
        'cdmid': 'application/cdmi-domain',
        'cdmio': 'application/cdmi-object',
        'cdmiq': 'application/cdmi-queue',
        'cdx': 'chemical/x-cdx',
        'cdxml': 'application/vnd.chemdraw+xml',
        'cdy': 'application/vnd.cinderella',
        'cer': [
            'application/pkix-cert',
            'application/x-x509-ca-cert'
        ],
        'cgm': 'image/cgm',
        'cha': 'application/x-chat',
        'chat': 'application/x-chat',
        'chm': 'application/vnd.ms-htmlhelp',
        'chrt': 'application/vnd.kde.kchart',
        'cif': 'chemical/x-cif',
        'cii': 'application/vnd.anser-web-certificate-issue-initiation',
        'cil': 'application/vnd.ms-artgalry',
        'cla': 'application/vnd.claymore',
        'class': [
            'application/octet-stream',
            'application/java',
            'application/java-byte-code',
            'application/java-vm',
            'application/x-java-class'
        ],
        'clkk': 'application/vnd.crick.clicker.keyboard',
        'clkp': 'application/vnd.crick.clicker.palette',
        'clkt': 'application/vnd.crick.clicker.template',
        'clkw': 'application/vnd.crick.clicker.wordbank',
        'clkx': 'application/vnd.crick.clicker',
        'clp': 'application/x-msclip',
        'cmc': 'application/vnd.cosmocaller',
        'cmdf': 'chemical/x-cmdf',
        'cml': 'chemical/x-cml',
        'cmp': 'application/vnd.yellowriver-custom-menu',
        'cmx': 'image/x-cmx',
        'cod': [
            'image/cis-cod',
            'application/vnd.rim.cod'
        ],
        'com': [
            'application/octet-stream',
            'text/plain'
        ],
        'conf': 'text/plain',
        'cpio': 'application/x-cpio',
        'cpp': 'text/x-c',
        'cpt': [
            'application/mac-compactpro',
            'application/x-compactpro',
            'application/x-cpt'
        ],
        'crd': 'application/x-mscardfile',
        'crl': [
            'application/pkix-crl',
            'application/pkcs-crl'
        ],
        'crt': [
            'application/pkix-cert',
            'application/x-x509-user-cert',
            'application/x-x509-ca-cert'
        ],
        'cryptonote': 'application/vnd.rig.cryptonote',
        'csh': [
            'text/x-script.csh',
            'application/x-csh'
        ],
        'csml': 'chemical/x-csml',
        'csp': 'application/vnd.commonspace',
        'css': [
            'text/css',
            'application/x-pointplus'
        ],
        'csv': 'text/csv',
        'cu': 'application/cu-seeme',
        'curl': 'text/vnd.curl',
        'cww': 'application/prs.cww',
        'cxx': 'text/plain',
        'dae': 'model/vnd.collada+xml',
        'daf': 'application/vnd.mobius.daf',
        'davmount': 'application/davmount+xml',
        'dcr': 'application/x-director',
        'dcurl': 'text/vnd.curl.dcurl',
        'dd2': 'application/vnd.oma.dd2+xml',
        'ddd': 'application/vnd.fujixerox.ddd',
        'deb': 'application/x-debian-package',
        'deepv': 'application/x-deepv',
        'def': 'text/plain',
        'der': 'application/x-x509-ca-cert',
        'dfac': 'application/vnd.dreamfactory',
        'dif': 'video/x-dv',
        'dir': 'application/x-director',
        'dis': 'application/vnd.mobius.dis',
        'djvu': 'image/vnd.djvu',
        'dl': [
            'video/dl',
            'video/x-dl'
        ],
        'dll': 'application/x-msdownload',
        'dms': 'application/octet-stream',
        'dna': 'application/vnd.dna',
        'doc': 'application/msword',
        'docm': 'application/vnd.ms-word.document.macroenabled.12',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'dot': 'application/msword',
        'dotm': 'application/vnd.ms-word.template.macroenabled.12',
        'dotx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        'dp': [
            'application/commonground',
            'application/vnd.osgi.dp'
        ],
        'dpg': 'application/vnd.dpgraph',
        'dra': 'audio/vnd.dra',
        'drw': 'application/drafting',
        'dsc': 'text/prs.lines.tag',
        'dssc': 'application/dssc+der',
        'dtb': 'application/x-dtbook+xml',
        'dtd': 'application/xml-dtd',
        'dts': 'audio/vnd.dts',
        'dtshd': 'audio/vnd.dts.hd',
        'dump': 'application/octet-stream',
        'dv': 'video/x-dv',
        'dvi': 'application/x-dvi',
        'dwf': [
            'model/vnd.dwf',
            'drawing/x-dwf'
        ],
        'dwg': [
            'application/acad',
            'image/vnd.dwg',
            'image/x-dwg'
        ],
        'dxf': [
            'application/dxf',
            'image/vnd.dwg',
            'image/vnd.dxf',
            'image/x-dwg'
        ],
        'dxp': 'application/vnd.spotfire.dxp',
        'dxr': 'application/x-director',
        'ecelp4800': 'audio/vnd.nuera.ecelp4800',
        'ecelp7470': 'audio/vnd.nuera.ecelp7470',
        'ecelp9600': 'audio/vnd.nuera.ecelp9600',
        'edm': 'application/vnd.novadigm.edm',
        'edx': 'application/vnd.novadigm.edx',
        'efif': 'application/vnd.picsel',
        'ei6': 'application/vnd.pg.osasli',
        'el': 'text/x-script.elisp',
        'elc': [
            'application/x-elc',
            'application/x-bytecode.elisp'
        ],
        'eml': 'message/rfc822',
        'emma': 'application/emma+xml',
        'env': 'application/x-envoy',
        'eol': 'audio/vnd.digital-winds',
        'eot': 'application/vnd.ms-fontobject',
        'eps': 'application/postscript',
        'epub': 'application/epub+zip',
        'es': [
            'application/ecmascript',
            'application/x-esrehber'
        ],
        'es3': 'application/vnd.eszigno3+xml',
        'esf': 'application/vnd.epson.esf',
        'etx': 'text/x-setext',
        'evy': [
            'application/envoy',
            'application/x-envoy'
        ],
        'exe': [
            'application/octet-stream',
            'application/x-msdownload'
        ],
        'exi': 'application/exi',
        'ext': 'application/vnd.novadigm.ext',
        'ez2': 'application/vnd.ezpix-album',
        'ez3': 'application/vnd.ezpix-package',
        'f': [
            'text/plain',
            'text/x-fortran'
        ],
        'f4v': 'video/x-f4v',
        'f77': 'text/x-fortran',
        'f90': [
            'text/plain',
            'text/x-fortran'
        ],
        'fbs': 'image/vnd.fastbidsheet',
        'fcs': 'application/vnd.isac.fcs',
        'fdf': 'application/vnd.fdf',
        'fe_launch': 'application/vnd.denovo.fcselayout-link',
        'fg5': 'application/vnd.fujitsu.oasysgp',
        'fh': 'image/x-freehand',
        'fif': [
            'application/fractals',
            'image/fif'
        ],
        'fig': 'application/x-xfig',
        'fli': [
            'video/fli',
            'video/x-fli'
        ],
        'flo': [
            'image/florian',
            'application/vnd.micrografx.flo'
        ],
        'flr': 'x-world/x-vrml',
        'flv': 'video/x-flv',
        'flw': 'application/vnd.kde.kivio',
        'flx': 'text/vnd.fmi.flexstor',
        'fly': 'text/vnd.fly',
        'fm': 'application/vnd.framemaker',
        'fmf': 'video/x-atomic3d-feature',
        'fnc': 'application/vnd.frogans.fnc',
        'for': [
            'text/plain',
            'text/x-fortran'
        ],
        'fpx': [
            'image/vnd.fpx',
            'image/vnd.net-fpx'
        ],
        'frl': 'application/freeloader',
        'fsc': 'application/vnd.fsc.weblaunch',
        'fst': 'image/vnd.fst',
        'ftc': 'application/vnd.fluxtime.clip',
        'fti': 'application/vnd.anser-web-funds-transfer-initiation',
        'funk': 'audio/make',
        'fvt': 'video/vnd.fvt',
        'fxp': 'application/vnd.adobe.fxp',
        'fzs': 'application/vnd.fuzzysheet',
        'g': 'text/plain',
        'g2w': 'application/vnd.geoplan',
        'g3': 'image/g3fax',
        'g3w': 'application/vnd.geospace',
        'gac': 'application/vnd.groove-account',
        'gdl': 'model/vnd.gdl',
        'geo': 'application/vnd.dynageo',
        'gex': 'application/vnd.geometry-explorer',
        'ggb': 'application/vnd.geogebra.file',
        'ggt': 'application/vnd.geogebra.tool',
        'ghf': 'application/vnd.groove-help',
        'gif': 'image/gif',
        'gim': 'application/vnd.groove-identity-message',
        'gl': [
            'video/gl',
            'video/x-gl'
        ],
        'gmx': 'application/vnd.gmx',
        'gnumeric': 'application/x-gnumeric',
        'gph': 'application/vnd.flographit',
        'gqf': 'application/vnd.grafeq',
        'gram': 'application/srgs',
        'grv': 'application/vnd.groove-injector',
        'grxml': 'application/srgs+xml',
        'gsd': 'audio/x-gsm',
        'gsf': 'application/x-font-ghostscript',
        'gsm': 'audio/x-gsm',
        'gsp': 'application/x-gsp',
        'gss': 'application/x-gss',
        'gtar': 'application/x-gtar',
        'gtm': 'application/vnd.groove-tool-message',
        'gtw': 'model/vnd.gtw',
        'gv': 'text/vnd.graphviz',
        'gxt': 'application/vnd.geonext',
        'gz': [
            'application/x-gzip',
            'application/x-compressed'
        ],
        'gzip': [
            'multipart/x-gzip',
            'application/x-gzip'
        ],
        'h': [
            'text/plain',
            'text/x-h'
        ],
        'h261': 'video/h261',
        'h263': 'video/h263',
        'h264': 'video/h264',
        'hal': 'application/vnd.hal+xml',
        'hbci': 'application/vnd.hbci',
        'hdf': 'application/x-hdf',
        'help': 'application/x-helpfile',
        'hgl': 'application/vnd.hp-hpgl',
        'hh': [
            'text/plain',
            'text/x-h'
        ],
        'hlb': 'text/x-script',
        'hlp': [
            'application/winhlp',
            'application/hlp',
            'application/x-helpfile',
            'application/x-winhelp'
        ],
        'hpg': 'application/vnd.hp-hpgl',
        'hpgl': 'application/vnd.hp-hpgl',
        'hpid': 'application/vnd.hp-hpid',
        'hps': 'application/vnd.hp-hps',
        'hqx': [
            'application/mac-binhex40',
            'application/binhex',
            'application/binhex4',
            'application/mac-binhex',
            'application/x-binhex40',
            'application/x-mac-binhex40'
        ],
        'hta': 'application/hta',
        'htc': 'text/x-component',
        'htke': 'application/vnd.kenameaapp',
        'htm': 'text/html',
        'html': 'text/html',
        'htmls': 'text/html',
        'htt': 'text/webviewhtml',
        'htx': 'text/html',
        'hvd': 'application/vnd.yamaha.hv-dic',
        'hvp': 'application/vnd.yamaha.hv-voice',
        'hvs': 'application/vnd.yamaha.hv-script',
        'i2g': 'application/vnd.intergeo',
        'icc': 'application/vnd.iccprofile',
        'ice': 'x-conference/x-cooltalk',
        'ico': 'image/x-icon',
        'ics': 'text/calendar',
        'idc': 'text/plain',
        'ief': 'image/ief',
        'iefs': 'image/ief',
        'ifm': 'application/vnd.shana.informed.formdata',
        'iges': [
            'application/iges',
            'model/iges'
        ],
        'igl': 'application/vnd.igloader',
        'igm': 'application/vnd.insors.igm',
        'igs': [
            'application/iges',
            'model/iges'
        ],
        'igx': 'application/vnd.micrografx.igx',
        'iif': 'application/vnd.shana.informed.interchange',
        'iii': 'application/x-iphone',
        'ima': 'application/x-ima',
        'imap': 'application/x-httpd-imap',
        'imp': 'application/vnd.accpac.simply.imp',
        'ims': 'application/vnd.ms-ims',
        'inf': 'application/inf',
        'ins': [
            'application/x-internet-signup',
            'application/x-internett-signup'
        ],
        'ip': 'application/x-ip2',
        'ipfix': 'application/ipfix',
        'ipk': 'application/vnd.shana.informed.package',
        'irm': 'application/vnd.ibm.rights-management',
        'irp': 'application/vnd.irepository.package+xml',
        'isp': 'application/x-internet-signup',
        'isu': 'video/x-isvideo',
        'it': 'audio/it',
        'itp': 'application/vnd.shana.informed.formtemplate',
        'iv': 'application/x-inventor',
        'ivp': 'application/vnd.immervision-ivp',
        'ivr': 'i-world/i-vrml',
        'ivu': 'application/vnd.immervision-ivu',
        'ivy': 'application/x-livescreen',
        'jad': 'text/vnd.sun.j2me.app-descriptor',
        'jam': [
            'application/vnd.jam',
            'audio/x-jam'
        ],
        'jar': 'application/java-archive',
        'jav': [
            'text/plain',
            'text/x-java-source'
        ],
        'java': [
            'text/plain',
            'text/x-java-source,java',
            'text/x-java-source'
        ],
        'jcm': 'application/x-java-commerce',
        'jfif': [
            'image/pipeg',
            'image/jpeg',
            'image/pjpeg'
        ],
        'jfif-tbnl': 'image/jpeg',
        'jisp': 'application/vnd.jisp',
        'jlt': 'application/vnd.hp-jlyt',
        'jnlp': 'application/x-java-jnlp-file',
        'joda': 'application/vnd.joost.joda-archive',
        'jpe': [
            'image/jpeg',
            'image/pjpeg'
        ],
        'jpeg': [
            'image/jpeg',
            'image/pjpeg'
        ],
        'jpg': [
            'image/jpeg',
            'image/pjpeg'
        ],
        'jpgv': 'video/jpeg',
        'jpm': 'video/jpm',
        'jps': 'image/x-jps',
        'js': [
            'application/javascript',
            'application/ecmascript',
            'text/javascript',
            'text/ecmascript',
            'application/x-javascript'
        ],
        'json': 'application/json',
        'jut': 'image/jutvision',
        'kar': [
            'audio/midi',
            'music/x-karaoke'
        ],
        'karbon': 'application/vnd.kde.karbon',
        'kfo': 'application/vnd.kde.kformula',
        'kia': 'application/vnd.kidspiration',
        'kml': 'application/vnd.google-earth.kml+xml',
        'kmz': 'application/vnd.google-earth.kmz',
        'kne': 'application/vnd.kinar',
        'kon': 'application/vnd.kde.kontour',
        'kpr': 'application/vnd.kde.kpresenter',
        'ksh': [
            'application/x-ksh',
            'text/x-script.ksh'
        ],
        'ksp': 'application/vnd.kde.kspread',
        'ktx': 'image/ktx',
        'ktz': 'application/vnd.kahootz',
        'kwd': 'application/vnd.kde.kword',
        'la': [
            'audio/nspaudio',
            'audio/x-nspaudio'
        ],
        'lam': 'audio/x-liveaudio',
        'lasxml': 'application/vnd.las.las+xml',
        'latex': 'application/x-latex',
        'lbd': 'application/vnd.llamagraphics.life-balance.desktop',
        'lbe': 'application/vnd.llamagraphics.life-balance.exchange+xml',
        'les': 'application/vnd.hhe.lesson-player',
        'lha': [
            'application/octet-stream',
            'application/lha',
            'application/x-lha'
        ],
        'lhx': 'application/octet-stream',
        'link66': 'application/vnd.route66.link66+xml',
        'list': 'text/plain',
        'lma': [
            'audio/nspaudio',
            'audio/x-nspaudio'
        ],
        'log': 'text/plain',
        'lrm': 'application/vnd.ms-lrm',
        'lsf': 'video/x-la-asf',
        'lsp': [
            'application/x-lisp',
            'text/x-script.lisp'
        ],
        'lst': 'text/plain',
        'lsx': [
            'video/x-la-asf',
            'text/x-la-asf'
        ],
        'ltf': 'application/vnd.frogans.ltf',
        'ltx': 'application/x-latex',
        'lvp': 'audio/vnd.lucent.voice',
        'lwp': 'application/vnd.lotus-wordpro',
        'lzh': [
            'application/octet-stream',
            'application/x-lzh'
        ],
        'lzx': [
            'application/lzx',
            'application/octet-stream',
            'application/x-lzx'
        ],
        'm': [
            'text/plain',
            'text/x-m'
        ],
        'm13': 'application/x-msmediaview',
        'm14': 'application/x-msmediaview',
        'm1v': 'video/mpeg',
        'm21': 'application/mp21',
        'm2a': 'audio/mpeg',
        'm2v': 'video/mpeg',
        'm3u': [
            'audio/x-mpegurl',
            'audio/x-mpequrl'
        ],
        'm3u8': 'application/vnd.apple.mpegurl',
        'm4v': 'video/x-m4v',
        'ma': 'application/mathematica',
        'mads': 'application/mads+xml',
        'mag': 'application/vnd.ecowin.chart',
        'man': 'application/x-troff-man',
        'map': 'application/x-navimap',
        'mar': 'text/plain',
        'mathml': 'application/mathml+xml',
        'mbd': 'application/mbedlet',
        'mbk': 'application/vnd.mobius.mbk',
        'mbox': 'application/mbox',
        'mc$': 'application/x-magic-cap-package-1.0',
        'mc1': 'application/vnd.medcalcdata',
        'mcd': [
            'application/mcad',
            'application/vnd.mcd',
            'application/x-mathcad'
        ],
        'mcf': [
            'image/vasa',
            'text/mcf'
        ],
        'mcp': 'application/netmc',
        'mcurl': 'text/vnd.curl.mcurl',
        'mdb': 'application/x-msaccess',
        'mdi': 'image/vnd.ms-modi',
        'me': 'application/x-troff-me',
        'meta4': 'application/metalink4+xml',
        'mets': 'application/mets+xml',
        'mfm': 'application/vnd.mfmp',
        'mgp': 'application/vnd.osgeo.mapguide.package',
        'mgz': 'application/vnd.proteus.magazine',
        'mht': 'message/rfc822',
        'mhtml': 'message/rfc822',
        'mid': [
            'audio/mid',
            'audio/midi',
            'music/crescendo',
            'x-music/x-midi',
            'audio/x-midi',
            'application/x-midi',
            'audio/x-mid'
        ],
        'midi': [
            'audio/midi',
            'music/crescendo',
            'x-music/x-midi',
            'audio/x-midi',
            'application/x-midi',
            'audio/x-mid'
        ],
        'mif': [
            'application/vnd.mif',
            'application/x-mif',
            'application/x-frame'
        ],
        'mime': [
            'message/rfc822',
            'www/mime'
        ],
        'mj2': 'video/mj2',
        'mjf': 'audio/x-vnd.audioexplosion.mjuicemediafile',
        'mjpg': 'video/x-motion-jpeg',
        'mlp': 'application/vnd.dolby.mlp',
        'mm': [
            'application/base64',
            'application/x-meme'
        ],
        'mmd': 'application/vnd.chipnuts.karaoke-mmd',
        'mme': 'application/base64',
        'mmf': 'application/vnd.smaf',
        'mmr': 'image/vnd.fujixerox.edmics-mmr',
        'mny': 'application/x-msmoney',
        'mod': [
            'audio/mod',
            'audio/x-mod'
        ],
        'mods': 'application/mods+xml',
        'moov': 'video/quicktime',
        'mov': 'video/quicktime',
        'movie': 'video/x-sgi-movie',
        'mp2': [
            'video/mpeg',
            'audio/mpeg',
            'video/x-mpeg',
            'audio/x-mpeg',
            'video/x-mpeq2a'
        ],
        'mp3': [
            'audio/mpeg',
            'audio/mpeg3',
            'video/mpeg',
            'audio/x-mpeg-3',
            'video/x-mpeg'
        ],
        'mp4': [
            'video/mp4',
            'application/mp4'
        ],
        'mp4a': 'audio/mp4',
        'mpa': [
            'video/mpeg',
            'audio/mpeg'
        ],
        'mpc': [
            'application/vnd.mophun.certificate',
            'application/x-project'
        ],
        'mpe': 'video/mpeg',
        'mpeg': 'video/mpeg',
        'mpg': [
            'video/mpeg',
            'audio/mpeg'
        ],
        'mpga': 'audio/mpeg',
        'mpkg': 'application/vnd.apple.installer+xml',
        'mpm': 'application/vnd.blueice.multipass',
        'mpn': 'application/vnd.mophun.application',
        'mpp': 'application/vnd.ms-project',
        'mpt': 'application/x-project',
        'mpv': 'application/x-project',
        'mpv2': 'video/mpeg',
        'mpx': 'application/x-project',
        'mpy': 'application/vnd.ibm.minipay',
        'mqy': 'application/vnd.mobius.mqy',
        'mrc': 'application/marc',
        'mrcx': 'application/marcxml+xml',
        'ms': 'application/x-troff-ms',
        'mscml': 'application/mediaservercontrol+xml',
        'mseq': 'application/vnd.mseq',
        'msf': 'application/vnd.epson.msf',
        'msg': 'application/vnd.ms-outlook',
        'msh': 'model/mesh',
        'msl': 'application/vnd.mobius.msl',
        'msty': 'application/vnd.muvee.style',
        'mts': 'model/vnd.mts',
        'mus': 'application/vnd.musician',
        'musicxml': 'application/vnd.recordare.musicxml+xml',
        'mv': 'video/x-sgi-movie',
        'mvb': 'application/x-msmediaview',
        'mwf': 'application/vnd.mfer',
        'mxf': 'application/mxf',
        'mxl': 'application/vnd.recordare.musicxml',
        'mxml': 'application/xv+xml',
        'mxs': 'application/vnd.triscape.mxs',
        'mxu': 'video/vnd.mpegurl',
        'my': 'audio/make',
        'mzz': 'application/x-vnd.audioexplosion.mzz',
        'n-gage': 'application/vnd.nokia.n-gage.symbian.install',
        'n3': 'text/n3',
        'nap': 'image/naplps',
        'naplps': 'image/naplps',
        'nbp': 'application/vnd.wolfram.player',
        'nc': 'application/x-netcdf',
        'ncm': 'application/vnd.nokia.configuration-message',
        'ncx': 'application/x-dtbncx+xml',
        'ngdat': 'application/vnd.nokia.n-gage.data',
        'nif': 'image/x-niff',
        'niff': 'image/x-niff',
        'nix': 'application/x-mix-transfer',
        'nlu': 'application/vnd.neurolanguage.nlu',
        'nml': 'application/vnd.enliven',
        'nnd': 'application/vnd.noblenet-directory',
        'nns': 'application/vnd.noblenet-sealer',
        'nnw': 'application/vnd.noblenet-web',
        'npx': 'image/vnd.net-fpx',
        'nsc': 'application/x-conference',
        'nsf': 'application/vnd.lotus-notes',
        'nvd': 'application/x-navidoc',
        'nws': 'message/rfc822',
        'o': 'application/octet-stream',
        'oa2': 'application/vnd.fujitsu.oasys2',
        'oa3': 'application/vnd.fujitsu.oasys3',
        'oas': 'application/vnd.fujitsu.oasys',
        'obd': 'application/x-msbinder',
        'oda': 'application/oda',
        'odb': 'application/vnd.oasis.opendocument.database',
        'odc': 'application/vnd.oasis.opendocument.chart',
        'odf': 'application/vnd.oasis.opendocument.formula',
        'odft': 'application/vnd.oasis.opendocument.formula-template',
        'odg': 'application/vnd.oasis.opendocument.graphics',
        'odi': 'application/vnd.oasis.opendocument.image',
        'odm': 'application/vnd.oasis.opendocument.text-master',
        'odp': 'application/vnd.oasis.opendocument.presentation',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        'odt': 'application/vnd.oasis.opendocument.text',
        'oga': 'audio/ogg',
        'ogv': 'video/ogg',
        'ogx': 'application/ogg',
        'omc': 'application/x-omc',
        'omcd': 'application/x-omcdatamaker',
        'omcr': 'application/x-omcregerator',
        'onetoc': 'application/onenote',
        'opf': 'application/oebps-package+xml',
        'org': 'application/vnd.lotus-organizer',
        'osf': 'application/vnd.yamaha.openscoreformat',
        'osfpvg': 'application/vnd.yamaha.openscoreformat.osfpvg+xml',
        'otc': 'application/vnd.oasis.opendocument.chart-template',
        'otf': 'application/x-font-otf',
        'otg': 'application/vnd.oasis.opendocument.graphics-template',
        'oth': 'application/vnd.oasis.opendocument.text-web',
        'oti': 'application/vnd.oasis.opendocument.image-template',
        'otp': 'application/vnd.oasis.opendocument.presentation-template',
        'ots': 'application/vnd.oasis.opendocument.spreadsheet-template',
        'ott': 'application/vnd.oasis.opendocument.text-template',
        'oxt': 'application/vnd.openofficeorg.extension',
        'p': 'text/x-pascal',
        'p10': [
            'application/pkcs10',
            'application/x-pkcs10'
        ],
        'p12': [
            'application/pkcs-12',
            'application/x-pkcs12'
        ],
        'p7a': 'application/x-pkcs7-signature',
        'p7b': 'application/x-pkcs7-certificates',
        'p7c': [
            'application/pkcs7-mime',
            'application/x-pkcs7-mime'
        ],
        'p7m': [
            'application/pkcs7-mime',
            'application/x-pkcs7-mime'
        ],
        'p7r': 'application/x-pkcs7-certreqresp',
        'p7s': [
            'application/pkcs7-signature',
            'application/x-pkcs7-signature'
        ],
        'p8': 'application/pkcs8',
        'par': 'text/plain-bas',
        'part': 'application/pro_eng',
        'pas': 'text/pascal',
        'paw': 'application/vnd.pawaafile',
        'pbd': 'application/vnd.powerbuilder6',
        'pbm': 'image/x-portable-bitmap',
        'pcf': 'application/x-font-pcf',
        'pcl': [
            'application/vnd.hp-pcl',
            'application/x-pcl'
        ],
        'pclxl': 'application/vnd.hp-pclxl',
        'pct': 'image/x-pict',
        'pcurl': 'application/vnd.curl.pcurl',
        'pcx': 'image/x-pcx',
        'pdb': [
            'application/vnd.palm',
            'chemical/x-pdb'
        ],
        'pdf': 'application/pdf',
        'pfa': 'application/x-font-type1',
        'pfr': 'application/font-tdpfr',
        'pfunk': [
            'audio/make',
            'audio/make.my.funk'
        ],
        'pfx': 'application/x-pkcs12',
        'pgm': [
            'image/x-portable-graymap',
            'image/x-portable-greymap'
        ],
        'pgn': 'application/x-chess-pgn',
        'pgp': 'application/pgp-signature',
        'pic': [
            'image/pict',
            'image/x-pict'
        ],
        'pict': 'image/pict',
        'pkg': 'application/x-newton-compatible-pkg',
        'pki': 'application/pkixcmp',
        'pkipath': 'application/pkix-pkipath',
        'pko': [
            'application/ynd.ms-pkipko',
            'application/vnd.ms-pki.pko'
        ],
        'pl': [
            'text/plain',
            'text/x-script.perl'
        ],
        'plb': 'application/vnd.3gpp.pic-bw-large',
        'plc': 'application/vnd.mobius.plc',
        'plf': 'application/vnd.pocketlearn',
        'pls': 'application/pls+xml',
        'plx': 'application/x-pixclscript',
        'pm': [
            'text/x-script.perl-module',
            'image/x-xpixmap'
        ],
        'pm4': 'application/x-pagemaker',
        'pm5': 'application/x-pagemaker',
        'pma': 'application/x-perfmon',
        'pmc': 'application/x-perfmon',
        'pml': [
            'application/vnd.ctc-posml',
            'application/x-perfmon'
        ],
        'pmr': 'application/x-perfmon',
        'pmw': 'application/x-perfmon',
        'png': 'image/png',
        'pnm': [
            'application/x-portable-anymap',
            'image/x-portable-anymap'
        ],
        'portpkg': 'application/vnd.macports.portpkg',
        'pot': [
            'application/vnd.ms-powerpoint',
            'application/mspowerpoint'
        ],
        'potm': 'application/vnd.ms-powerpoint.template.macroenabled.12',
        'potx': 'application/vnd.openxmlformats-officedocument.presentationml.template',
        'pov': 'model/x-pov',
        'ppa': 'application/vnd.ms-powerpoint',
        'ppam': 'application/vnd.ms-powerpoint.addin.macroenabled.12',
        'ppd': 'application/vnd.cups-ppd',
        'ppm': 'image/x-portable-pixmap',
        'pps': [
            'application/vnd.ms-powerpoint',
            'application/mspowerpoint'
        ],
        'ppsm': 'application/vnd.ms-powerpoint.slideshow.macroenabled.12',
        'ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
        'ppt': [
            'application/vnd.ms-powerpoint',
            'application/mspowerpoint',
            'application/powerpoint',
            'application/x-mspowerpoint'
        ],
        'pptm': 'application/vnd.ms-powerpoint.presentation.macroenabled.12',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppz': 'application/mspowerpoint',
        'prc': 'application/x-mobipocket-ebook',
        'pre': [
            'application/vnd.lotus-freelance',
            'application/x-freelance'
        ],
        'prf': 'application/pics-rules',
        'prt': 'application/pro_eng',
        'ps': 'application/postscript',
        'psb': 'application/vnd.3gpp.pic-bw-small',
        'psd': [
            'application/octet-stream',
            'image/vnd.adobe.photoshop'
        ],
        'psf': 'application/x-font-linux-psf',
        'pskcxml': 'application/pskc+xml',
        'ptid': 'application/vnd.pvi.ptid1',
        'pub': 'application/x-mspublisher',
        'pvb': 'application/vnd.3gpp.pic-bw-var',
        'pvu': 'paleovu/x-pv',
        'pwn': 'application/vnd.3m.post-it-notes',
        'pwz': 'application/vnd.ms-powerpoint',
        'py': 'text/x-script.phyton',
        'pya': 'audio/vnd.ms-playready.media.pya',
        'pyc': 'applicaiton/x-bytecode.python',
        'pyv': 'video/vnd.ms-playready.media.pyv',
        'qam': 'application/vnd.epson.quickanime',
        'qbo': 'application/vnd.intu.qbo',
        'qcp': 'audio/vnd.qcelp',
        'qd3': 'x-world/x-3dmf',
        'qd3d': 'x-world/x-3dmf',
        'qfx': 'application/vnd.intu.qfx',
        'qif': 'image/x-quicktime',
        'qps': 'application/vnd.publishare-delta-tree',
        'qt': 'video/quicktime',
        'qtc': 'video/x-qtc',
        'qti': 'image/x-quicktime',
        'qtif': 'image/x-quicktime',
        'qxd': 'application/vnd.quark.quarkxpress',
        'ra': [
            'audio/x-realaudio',
            'audio/x-pn-realaudio',
            'audio/x-pn-realaudio-plugin'
        ],
        'ram': 'audio/x-pn-realaudio',
        'rar': 'application/x-rar-compressed',
        'ras': [
            'image/cmu-raster',
            'application/x-cmu-raster',
            'image/x-cmu-raster'
        ],
        'rast': 'image/cmu-raster',
        'rcprofile': 'application/vnd.ipunplugged.rcprofile',
        'rdf': 'application/rdf+xml',
        'rdz': 'application/vnd.data-vision.rdz',
        'rep': 'application/vnd.businessobjects',
        'res': 'application/x-dtbresource+xml',
        'rexx': 'text/x-script.rexx',
        'rf': 'image/vnd.rn-realflash',
        'rgb': 'image/x-rgb',
        'rif': 'application/reginfo+xml',
        'rip': 'audio/vnd.rip',
        'rl': 'application/resource-lists+xml',
        'rlc': 'image/vnd.fujixerox.edmics-rlc',
        'rld': 'application/resource-lists-diff+xml',
        'rm': [
            'application/vnd.rn-realmedia',
            'audio/x-pn-realaudio'
        ],
        'rmi': 'audio/mid',
        'rmm': 'audio/x-pn-realaudio',
        'rmp': [
            'audio/x-pn-realaudio-plugin',
            'audio/x-pn-realaudio'
        ],
        'rms': 'application/vnd.jcp.javame.midlet-rms',
        'rnc': 'application/relax-ng-compact-syntax',
        'rng': [
            'application/ringing-tones',
            'application/vnd.nokia.ringing-tone'
        ],
        'rnx': 'application/vnd.rn-realplayer',
        'roff': 'application/x-troff',
        'rp': 'image/vnd.rn-realpix',
        'rp9': 'application/vnd.cloanto.rp9',
        'rpm': 'audio/x-pn-realaudio-plugin',
        'rpss': 'application/vnd.nokia.radio-presets',
        'rpst': 'application/vnd.nokia.radio-preset',
        'rq': 'application/sparql-query',
        'rs': 'application/rls-services+xml',
        'rsd': 'application/rsd+xml',
        'rt': [
            'text/richtext',
            'text/vnd.rn-realtext'
        ],
        'rtf': [
            'application/rtf',
            'text/richtext',
            'application/x-rtf'
        ],
        'rtx': [
            'text/richtext',
            'application/rtf'
        ],
        'rv': 'video/vnd.rn-realvideo',
        's': 'text/x-asm',
        's3m': 'audio/s3m',
        'saf': 'application/vnd.yamaha.smaf-audio',
        'saveme': 'application/octet-stream',
        'sbk': 'application/x-tbook',
        'sbml': 'application/sbml+xml',
        'sc': 'application/vnd.ibm.secure-container',
        'scd': 'application/x-msschedule',
        'scm': [
            'application/vnd.lotus-screencam',
            'video/x-scm',
            'text/x-script.guile',
            'application/x-lotusscreencam',
            'text/x-script.scheme'
        ],
        'scq': 'application/scvp-cv-request',
        'scs': 'application/scvp-cv-response',
        'sct': 'text/scriptlet',
        'scurl': 'text/vnd.curl.scurl',
        'sda': 'application/vnd.stardivision.draw',
        'sdc': 'application/vnd.stardivision.calc',
        'sdd': 'application/vnd.stardivision.impress',
        'sdkm': 'application/vnd.solent.sdkm+xml',
        'sdml': 'text/plain',
        'sdp': [
            'application/sdp',
            'application/x-sdp'
        ],
        'sdr': 'application/sounder',
        'sdw': 'application/vnd.stardivision.writer',
        'sea': [
            'application/sea',
            'application/x-sea'
        ],
        'see': 'application/vnd.seemail',
        'seed': 'application/vnd.fdsn.seed',
        'sema': 'application/vnd.sema',
        'semd': 'application/vnd.semd',
        'semf': 'application/vnd.semf',
        'ser': 'application/java-serialized-object',
        'set': 'application/set',
        'setpay': 'application/set-payment-initiation',
        'setreg': 'application/set-registration-initiation',
        'sfd-hdstx': 'application/vnd.hydrostatix.sof-data',
        'sfs': 'application/vnd.spotfire.sfs',
        'sgl': 'application/vnd.stardivision.writer-global',
        'sgm': [
            'text/sgml',
            'text/x-sgml'
        ],
        'sgml': [
            'text/sgml',
            'text/x-sgml'
        ],
        'sh': [
            'application/x-shar',
            'application/x-bsh',
            'application/x-sh',
            'text/x-script.sh'
        ],
        'shar': [
            'application/x-bsh',
            'application/x-shar'
        ],
        'shf': 'application/shf+xml',
        'shtml': [
            'text/html',
            'text/x-server-parsed-html'
        ],
        'sid': 'audio/x-psid',
        'sis': 'application/vnd.symbian.install',
        'sit': [
            'application/x-stuffit',
            'application/x-sit'
        ],
        'sitx': 'application/x-stuffitx',
        'skd': 'application/x-koan',
        'skm': 'application/x-koan',
        'skp': [
            'application/vnd.koan',
            'application/x-koan'
        ],
        'skt': 'application/x-koan',
        'sl': 'application/x-seelogo',
        'sldm': 'application/vnd.ms-powerpoint.slide.macroenabled.12',
        'sldx': 'application/vnd.openxmlformats-officedocument.presentationml.slide',
        'slt': 'application/vnd.epson.salt',
        'sm': 'application/vnd.stepmania.stepchart',
        'smf': 'application/vnd.stardivision.math',
        'smi': [
            'application/smil',
            'application/smil+xml'
        ],
        'smil': 'application/smil',
        'snd': [
            'audio/basic',
            'audio/x-adpcm'
        ],
        'snf': 'application/x-font-snf',
        'sol': 'application/solids',
        'spc': [
            'text/x-speech',
            'application/x-pkcs7-certificates'
        ],
        'spf': 'application/vnd.yamaha.smaf-phrase',
        'spl': [
            'application/futuresplash',
            'application/x-futuresplash'
        ],
        'spot': 'text/vnd.in3d.spot',
        'spp': 'application/scvp-vp-response',
        'spq': 'application/scvp-vp-request',
        'spr': 'application/x-sprite',
        'sprite': 'application/x-sprite',
        'src': 'application/x-wais-source',
        'sru': 'application/sru+xml',
        'srx': 'application/sparql-results+xml',
        'sse': 'application/vnd.kodak-descriptor',
        'ssf': 'application/vnd.epson.ssf',
        'ssi': 'text/x-server-parsed-html',
        'ssm': 'application/streamingmedia',
        'ssml': 'application/ssml+xml',
        'sst': [
            'application/vnd.ms-pkicertstore',
            'application/vnd.ms-pki.certstore'
        ],
        'st': 'application/vnd.sailingtracker.track',
        'stc': 'application/vnd.sun.xml.calc.template',
        'std': 'application/vnd.sun.xml.draw.template',
        'step': 'application/step',
        'stf': 'application/vnd.wt.stf',
        'sti': 'application/vnd.sun.xml.impress.template',
        'stk': 'application/hyperstudio',
        'stl': [
            'application/vnd.ms-pkistl',
            'application/sla',
            'application/vnd.ms-pki.stl',
            'application/x-navistyle'
        ],
        'stm': 'text/html',
        'stp': 'application/step',
        'str': 'application/vnd.pg.format',
        'stw': 'application/vnd.sun.xml.writer.template',
        'sub': 'image/vnd.dvb.subtitle',
        'sus': 'application/vnd.sus-calendar',
        'sv4cpio': 'application/x-sv4cpio',
        'sv4crc': 'application/x-sv4crc',
        'svc': 'application/vnd.dvb.service',
        'svd': 'application/vnd.svd',
        'svf': [
            'image/vnd.dwg',
            'image/x-dwg'
        ],
        'svg': 'image/svg+xml',
        'svr': [
            'x-world/x-svr',
            'application/x-world'
        ],
        'swf': 'application/x-shockwave-flash',
        'swi': 'application/vnd.aristanetworks.swi',
        'sxc': 'application/vnd.sun.xml.calc',
        'sxd': 'application/vnd.sun.xml.draw',
        'sxg': 'application/vnd.sun.xml.writer.global',
        'sxi': 'application/vnd.sun.xml.impress',
        'sxm': 'application/vnd.sun.xml.math',
        'sxw': 'application/vnd.sun.xml.writer',
        't': [
            'text/troff',
            'application/x-troff'
        ],
        'talk': 'text/x-speech',
        'tao': 'application/vnd.tao.intent-module-archive',
        'tar': 'application/x-tar',
        'tbk': [
            'application/toolbook',
            'application/x-tbook'
        ],
        'tcap': 'application/vnd.3gpp2.tcap',
        'tcl': [
            'text/x-script.tcl',
            'application/x-tcl'
        ],
        'tcsh': 'text/x-script.tcsh',
        'teacher': 'application/vnd.smart.teacher',
        'tei': 'application/tei+xml',
        'tex': 'application/x-tex',
        'texi': 'application/x-texinfo',
        'texinfo': 'application/x-texinfo',
        'text': [
            'application/plain',
            'text/plain'
        ],
        'tfi': 'application/thraud+xml',
        'tfm': 'application/x-tex-tfm',
        'tgz': [
            'application/gnutar',
            'application/x-compressed'
        ],
        'thmx': 'application/vnd.ms-officetheme',
        'tif': [
            'image/tiff',
            'image/x-tiff'
        ],
        'tiff': [
            'image/tiff',
            'image/x-tiff'
        ],
        'tmo': 'application/vnd.tmobile-livetv',
        'torrent': 'application/x-bittorrent',
        'tpl': 'application/vnd.groove-tool-template',
        'tpt': 'application/vnd.trid.tpt',
        'tr': 'application/x-troff',
        'tra': 'application/vnd.trueapp',
        'trm': 'application/x-msterminal',
        'tsd': 'application/timestamped-data',
        'tsi': 'audio/tsp-audio',
        'tsp': [
            'application/dsptype',
            'audio/tsplayer'
        ],
        'tsv': 'text/tab-separated-values',
        'ttf': 'application/x-font-ttf',
        'ttl': 'text/turtle',
        'turbot': 'image/florian',
        'twd': 'application/vnd.simtech-mindmapper',
        'txd': 'application/vnd.genomatix.tuxedo',
        'txf': 'application/vnd.mobius.txf',
        'txt': 'text/plain',
        'ufd': 'application/vnd.ufdl',
        'uil': 'text/x-uil',
        'uls': 'text/iuls',
        'umj': 'application/vnd.umajin',
        'uni': 'text/uri-list',
        'unis': 'text/uri-list',
        'unityweb': 'application/vnd.unity',
        'unv': 'application/i-deas',
        'uoml': 'application/vnd.uoml+xml',
        'uri': 'text/uri-list',
        'uris': 'text/uri-list',
        'ustar': [
            'application/x-ustar',
            'multipart/x-ustar'
        ],
        'utz': 'application/vnd.uiq.theme',
        'uu': [
            'application/octet-stream',
            'text/x-uuencode'
        ],
        'uue': 'text/x-uuencode',
        'uva': 'audio/vnd.dece.audio',
        'uvh': 'video/vnd.dece.hd',
        'uvi': 'image/vnd.dece.graphic',
        'uvm': 'video/vnd.dece.mobile',
        'uvp': 'video/vnd.dece.pd',
        'uvs': 'video/vnd.dece.sd',
        'uvu': 'video/vnd.uvvu.mp4',
        'uvv': 'video/vnd.dece.video',
        'vcd': 'application/x-cdlink',
        'vcf': 'text/x-vcard',
        'vcg': 'application/vnd.groove-vcard',
        'vcs': 'text/x-vcalendar',
        'vcx': 'application/vnd.vcx',
        'vda': 'application/vda',
        'vdo': 'video/vdo',
        'vew': 'application/groupwise',
        'vis': 'application/vnd.visionary',
        'viv': [
            'video/vivo',
            'video/vnd.vivo'
        ],
        'vivo': [
            'video/vivo',
            'video/vnd.vivo'
        ],
        'vmd': 'application/vocaltec-media-desc',
        'vmf': 'application/vocaltec-media-file',
        'voc': [
            'audio/voc',
            'audio/x-voc'
        ],
        'vos': 'video/vosaic',
        'vox': 'audio/voxware',
        'vqe': 'audio/x-twinvq-plugin',
        'vqf': 'audio/x-twinvq',
        'vql': 'audio/x-twinvq-plugin',
        'vrml': [
            'model/vrml',
            'x-world/x-vrml',
            'application/x-vrml'
        ],
        'vrt': 'x-world/x-vrt',
        'vsd': [
            'application/vnd.visio',
            'application/x-visio'
        ],
        'vsf': 'application/vnd.vsf',
        'vst': 'application/x-visio',
        'vsw': 'application/x-visio',
        'vtu': 'model/vnd.vtu',
        'vxml': 'application/voicexml+xml',
        'w60': 'application/wordperfect6.0',
        'w61': 'application/wordperfect6.1',
        'w6w': 'application/msword',
        'wad': 'application/x-doom',
        'wav': [
            'audio/wav',
            'audio/x-wav'
        ],
        'wax': 'audio/x-ms-wax',
        'wb1': 'application/x-qpro',
        'wbmp': 'image/vnd.wap.wbmp',
        'wbs': 'application/vnd.criticaltools.wbs+xml',
        'wbxml': 'application/vnd.wap.wbxml',
        'wcm': 'application/vnd.ms-works',
        'wdb': 'application/vnd.ms-works',
        'web': 'application/vnd.xara',
        'weba': 'audio/webm',
        'webm': 'video/webm',
        'webp': 'image/webp',
        'wg': 'application/vnd.pmi.widget',
        'wgt': 'application/widget',
        'wiz': 'application/msword',
        'wk1': 'application/x-123',
        'wks': 'application/vnd.ms-works',
        'wm': 'video/x-ms-wm',
        'wma': 'audio/x-ms-wma',
        'wmd': 'application/x-ms-wmd',
        'wmf': [
            'windows/metafile',
            'application/x-msmetafile'
        ],
        'wml': 'text/vnd.wap.wml',
        'wmlc': 'application/vnd.wap.wmlc',
        'wmls': 'text/vnd.wap.wmlscript',
        'wmlsc': 'application/vnd.wap.wmlscriptc',
        'wmv': 'video/x-ms-wmv',
        'wmx': 'video/x-ms-wmx',
        'wmz': 'application/x-ms-wmz',
        'woff': 'application/x-font-woff',
        'word': 'application/msword',
        'wp': 'application/wordperfect',
        'wp5': [
            'application/wordperfect',
            'application/wordperfect6.0'
        ],
        'wp6': 'application/wordperfect',
        'wpd': [
            'application/wordperfect',
            'application/vnd.wordperfect',
            'application/x-wpwin'
        ],
        'wpl': 'application/vnd.ms-wpl',
        'wps': 'application/vnd.ms-works',
        'wq1': 'application/x-lotus',
        'wqd': 'application/vnd.wqd',
        'wri': [
            'application/mswrite',
            'application/x-wri',
            'application/x-mswrite'
        ],
        'wrl': [
            'model/vrml',
            'x-world/x-vrml',
            'application/x-world'
        ],
        'wrz': [
            'model/vrml',
            'x-world/x-vrml'
        ],
        'wsc': 'text/scriplet',
        'wsdl': 'application/wsdl+xml',
        'wspolicy': 'application/wspolicy+xml',
        'wsrc': 'application/x-wais-source',
        'wtb': 'application/vnd.webturbo',
        'wtk': 'application/x-wintalk',
        'wvx': 'video/x-ms-wvx',
        'x-png': 'image/png',
        'x3d': 'application/vnd.hzn-3d-crossword',
        'xaf': 'x-world/x-vrml',
        'xap': 'application/x-silverlight-app',
        'xar': 'application/vnd.xara',
        'xbap': 'application/x-ms-xbap',
        'xbd': 'application/vnd.fujixerox.docuworks.binder',
        'xbm': [
            'image/xbm',
            'image/x-xbm',
            'image/x-xbitmap'
        ],
        'xdf': 'application/xcap-diff+xml',
        'xdm': 'application/vnd.syncml.dm+xml',
        'xdp': 'application/vnd.adobe.xdp+xml',
        'xdr': 'video/x-amt-demorun',
        'xdssc': 'application/dssc+xml',
        'xdw': 'application/vnd.fujixerox.docuworks',
        'xenc': 'application/xenc+xml',
        'xer': 'application/patch-ops-error+xml',
        'xfdf': 'application/vnd.adobe.xfdf',
        'xfdl': 'application/vnd.xfdl',
        'xgz': 'xgl/drawing',
        'xhtml': 'application/xhtml+xml',
        'xif': 'image/vnd.xiff',
        'xl': 'application/excel',
        'xla': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-msexcel',
            'application/x-excel'
        ],
        'xlam': 'application/vnd.ms-excel.addin.macroenabled.12',
        'xlb': [
            'application/excel',
            'application/vnd.ms-excel',
            'application/x-excel'
        ],
        'xlc': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-excel'
        ],
        'xld': [
            'application/excel',
            'application/x-excel'
        ],
        'xlk': [
            'application/excel',
            'application/x-excel'
        ],
        'xll': [
            'application/excel',
            'application/vnd.ms-excel',
            'application/x-excel'
        ],
        'xlm': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-excel'
        ],
        'xls': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-msexcel',
            'application/x-excel'
        ],
        'xlsb': 'application/vnd.ms-excel.sheet.binary.macroenabled.12',
        'xlsm': 'application/vnd.ms-excel.sheet.macroenabled.12',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xlt': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-excel'
        ],
        'xltm': 'application/vnd.ms-excel.template.macroenabled.12',
        'xltx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
        'xlv': [
            'application/excel',
            'application/x-excel'
        ],
        'xlw': [
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-msexcel',
            'application/x-excel'
        ],
        'xm': 'audio/xm',
        'xml': [
            'application/xml',
            'text/xml',
            'application/atom+xml',
            'application/rss+xml'
        ],
        'xmz': 'xgl/movie',
        'xo': 'application/vnd.olpc-sugar',
        'xof': 'x-world/x-vrml',
        'xop': 'application/xop+xml',
        'xpi': 'application/x-xpinstall',
        'xpix': 'application/x-vnd.ls-xpix',
        'xpm': [
            'image/xpm',
            'image/x-xpixmap'
        ],
        'xpr': 'application/vnd.is-xpr',
        'xps': 'application/vnd.ms-xpsdocument',
        'xpw': 'application/vnd.intercon.formnet',
        'xslt': 'application/xslt+xml',
        'xsm': 'application/vnd.syncml+xml',
        'xspf': 'application/xspf+xml',
        'xsr': 'video/x-amt-showrun',
        'xul': 'application/vnd.mozilla.xul+xml',
        'xwd': [
            'image/x-xwd',
            'image/x-xwindowdump'
        ],
        'xyz': [
            'chemical/x-xyz',
            'chemical/x-pdb'
        ],
        'yang': 'application/yang',
        'yin': 'application/yin+xml',
        'z': [
            'application/x-compressed',
            'application/x-compress'
        ],
        'zaz': 'application/vnd.zzazz.deck+xml',
        'zip': [
            'application/zip',
            'multipart/x-zip',
            'application/x-zip-compressed',
            'application/x-compressed'
        ],
        'zir': 'application/vnd.zul',
        'zmm': 'application/vnd.handheld-entertainment+xml',
        'zoo': 'application/octet-stream',
        'zsh': 'text/x-script.zsh'
    };
    return {
        detectExtension: detectExtension,
        detectMimeType: detectMimeType
    };
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('utf7', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.utf7 = factory();
    }
}(this, function () {
    'use strict';
    function encode(str) {
        var b = new Uint8Array(str.length * 2), octets = '', i, bi, len, c, encoded;
        for (i = 0, bi = 0, len = str.length; i < len; i++) {
            c = str.charCodeAt(i);
            b[bi++] = c >> 8;
            b[bi++] = c & 255;
        }
        for (i = 0, len = b.length; i < len; i++) {
            octets += String.fromCharCode(b[i]);
        }
        encoded = '';
        if (typeof window !== 'undefined' && btoa) {
            encoded = btoa(octets);
        } else {
            encoded = new Buffer(octets, 'binary').toString('base64');
        }
        return encoded.replace(/=+$/, '');
    }
    function base64toTypedArray(base64Str) {
        var bitsSoFar = 0;
        var validBits = 0;
        var iOut = 0;
        var arr = new Uint8Array(Math.ceil(base64Str.length * 3 / 4));
        var c;
        var bits;
        for (var i = 0, len = base64Str.length; i < len; i++) {
            c = base64Str.charCodeAt(i);
            if (c >= 65 && c <= 90) {
                bits = c - 65;
            } else if (c >= 97 && c <= 122) {
                bits = c - 97 + 26;
            } else if (c >= 48 && c <= 57) {
                bits = c - 48 + 52;
            } else if (c === 43) {
                bits = 62;
            } else if (c === 47) {
                bits = 63;
            } else if (c === 61) {
                validBits = 0;
                continue;
            } else {
                continue;
            }
            bitsSoFar = bitsSoFar << 6 | bits;
            validBits += 6;
            if (validBits >= 8) {
                validBits -= 8;
                arr[iOut++] = bitsSoFar >> validBits;
                if (validBits === 2) {
                    bitsSoFar &= 3;
                } else if (validBits === 4) {
                    bitsSoFar &= 15;
                }
            }
        }
        if (iOut < arr.length) {
            return arr.subarray(0, iOut);
        }
        return arr;
    }
    function decode(str) {
        var octets = base64toTypedArray(str), r = [];
        for (var i = 0, len = octets.length; i < len;) {
            r.push(String.fromCharCode(octets[i++] << 8 | octets[i++]));
        }
        return r.join('');
    }
    function escape(chars) {
        return chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    var setD = 'A-Za-z0-9' + escape('\'(),-./:?'), setO = escape('!"#$%&*;<=>@[]^_\'{|}'), setW = escape(' \r\n\t'), regexes = {}, regexAll = new RegExp('[^' + setW + setD + setO + ']+', 'g');
    return {
        encode: function (str, mask) {
            if (!mask) {
                mask = '';
            }
            if (!regexes[mask]) {
                regexes[mask] = new RegExp('[^' + setD + escape(mask) + ']+', 'g');
            }
            return str.replace(regexes[mask], function (chunk) {
                return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
            });
        },
        encodeAll: function (str) {
            return str.replace(regexAll, function (chunk) {
                return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
            });
        },
        decode: function (str) {
            return str.replace(/\+([A-Za-z0-9\/]*)-?/gi, function (_, chunk) {
                if (chunk === '') {
                    return '+';
                }
                return decode(chunk);
            });
        },
        imap: {
            encode: function (str) {
                return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, function (chunk) {
                    chunk = (chunk === '&' ? '' : encode(chunk)).replace(/\//g, ',');
                    return '&' + chunk + '-';
                });
            },
            decode: function (str) {
                return str.replace(/&([^-]*)-/g, function (_, chunk) {
                    if (chunk === '') {
                        return '&';
                    }
                    return decode(chunk.replace(/,/g, '/'));
                });
            }
        }
    };
}));
define('stringencoding', [
    'require',
    'utf7',
    'mimefuncs'
], function (require) {
    var utf7 = require('utf7');
    return {
        TextEncoder: function (encoding) {
            var encoder = new TextEncoder(encoding);
            this.encode = encoder.encode.bind(encoder);
        },
        TextDecoder: function (encoding) {
            encoding = encoding && encoding.toLowerCase();
            if (encoding === 'utf-7' || encoding === 'utf7') {
                this.decode = function (buf) {
                    var mimefuncs = require('mimefuncs');
                    return utf7.decode(mimefuncs.fromTypedArray(buf));
                };
            } else {
                var decoder = new TextDecoder(encoding);
                this.decode = decoder.decode.bind(decoder);
            }
        }
    };
});
(function (root, factory) {
    'use strict';
    var encoding;
    if (typeof define === 'function' && define.amd) {
        define('mimefuncs', ['stringencoding'], function (encoding) {
            return factory(encoding.TextEncoder, encoding.TextDecoder, root.btoa);
        });
    } else if (typeof exports === 'object' && typeof navigator !== 'undefined') {
        encoding = require('wo-stringencoding');
        module.exports = factory(encoding.TextEncoder, encoding.TextDecoder, root.btoa);
    } else if (typeof exports === 'object') {
        encoding = require('wo-stringencoding');
        module.exports = factory(encoding.TextEncoder, encoding.TextDecoder, function (str) {
            var NodeBuffer = require('buffer').Buffer;
            return new NodeBuffer(str, 'binary').toString('base64');
        });
    } else {
        root.mimefuncs = factory(root.TextEncoder, root.TextDecoder, root.btoa);
    }
}(this, function (TextEncoder, TextDecoder, btoa) {
    'use strict';
    btoa = btoa || base64Encode;
    var mimefuncs = {
        mimeEncode: function (data, fromCharset) {
            fromCharset = fromCharset || 'UTF-8';
            var buffer = mimefuncs.charset.convert(data || '', fromCharset), ranges = [
                    [9],
                    [10],
                    [13],
                    [32],
                    [33],
                    [
                        35,
                        60
                    ],
                    [62],
                    [
                        64,
                        94
                    ],
                    [
                        96,
                        126
                    ]
                ], result = '', ord;
            for (var i = 0, len = buffer.length; i < len; i++) {
                ord = buffer[i];
                if (mimefuncs._checkRanges(ord, ranges) && !((ord === 32 || ord === 9) && (i === len - 1 || buffer[i + 1] === 10 || buffer[i + 1] === 13))) {
                    result += String.fromCharCode(ord);
                    continue;
                }
                result += '=' + (ord < 16 ? '0' : '') + ord.toString(16).toUpperCase();
            }
            return result;
        },
        mimeDecode: function (str, fromCharset) {
            str = (str || '').toString();
            fromCharset = fromCharset || 'UTF-8';
            var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length, bufferLength = str.length - encodedBytesCount * 2, chr, hex, buffer = new Uint8Array(bufferLength), bufferPos = 0;
            for (var i = 0, len = str.length; i < len; i++) {
                chr = str.charAt(i);
                if (chr === '=' && (hex = str.substr(i + 1, 2)) && /[\da-fA-F]{2}/.test(hex)) {
                    buffer[bufferPos++] = parseInt(hex, 16);
                    i += 2;
                    continue;
                }
                buffer[bufferPos++] = chr.charCodeAt(0);
            }
            return mimefuncs.charset.decode(buffer, fromCharset);
        },
        base64Encode: function (data, fromCharset) {
            var buf, b64;
            if (fromCharset !== 'binary' && typeof data !== 'string') {
                buf = mimefuncs.charset.convert(data || '', fromCharset);
            } else {
                buf = data;
            }
            b64 = mimefuncs.base64.encode(buf);
            return mimefuncs._addSoftLinebreaks(b64, 'base64');
        },
        base64Decode: function (str, fromCharset) {
            var buf = mimefuncs.base64.decode(str || '', 'buffer');
            return mimefuncs.charset.decode(buf, fromCharset);
        },
        quotedPrintableEncode: function (data, fromCharset) {
            var mimeEncodedStr = mimefuncs.mimeEncode(data, fromCharset);
            mimeEncodedStr = mimeEncodedStr.replace(/\r?\n|\r/g, '\r\n').replace(/[\t ]+$/gm, function (spaces) {
                return spaces.replace(/ /g, '=20').replace(/\t/g, '=09');
            });
            return mimefuncs._addSoftLinebreaks(mimeEncodedStr, 'qp');
        },
        quotedPrintableDecode: function (str, fromCharset) {
            str = (str || '').toString();
            str = str.replace(/[\t ]+$/gm, '').replace(/\=(?:\r?\n|$)/g, '');
            return mimefuncs.mimeDecode(str, fromCharset);
        },
        mimeWordEncode: function (data, mimeWordEncoding, maxLength, fromCharset) {
            mimeWordEncoding = (mimeWordEncoding || 'Q').toString().toUpperCase().trim().charAt(0);
            if (!fromCharset && typeof maxLength === 'string' && !maxLength.match(/^[0-9]+$/)) {
                fromCharset = maxLength;
                maxLength = undefined;
            }
            maxLength = maxLength || 0;
            var encodedStr, toCharset = 'UTF-8', i, len, parts;
            if (maxLength && maxLength > 7 + toCharset.length) {
                maxLength -= 7 + toCharset.length;
            }
            if (mimeWordEncoding === 'Q') {
                encodedStr = mimefuncs.mimeEncode(data, fromCharset);
                encodedStr = encodedStr.replace(/[\r\n\t_]/g, function (chr) {
                    var code = chr.charCodeAt(0);
                    return '=' + (code < 16 ? '0' : '') + code.toString(16).toUpperCase();
                }).replace(/\s/g, '_');
            } else if (mimeWordEncoding === 'B') {
                encodedStr = typeof data === 'string' ? data : mimefuncs.decode(data, fromCharset);
                maxLength = Math.max(3, (maxLength - maxLength % 4) / 4 * 3);
            }
            if (maxLength && encodedStr.length > maxLength) {
                if (mimeWordEncoding === 'Q') {
                    encodedStr = mimefuncs._splitMimeEncodedString(encodedStr, maxLength).join('?= =?' + toCharset + '?' + mimeWordEncoding + '?');
                } else {
                    parts = [];
                    for (i = 0, len = encodedStr.length; i < len; i += maxLength) {
                        parts.push(mimefuncs.base64.encode(encodedStr.substr(i, maxLength)));
                    }
                    if (parts.length > 1) {
                        return '=?' + toCharset + '?' + mimeWordEncoding + '?' + parts.join('?= =?' + toCharset + '?' + mimeWordEncoding + '?') + '?=';
                    } else {
                        encodedStr = parts.join('');
                    }
                }
            } else if (mimeWordEncoding === 'B') {
                encodedStr = mimefuncs.base64.encode(encodedStr);
            }
            return '=?' + toCharset + '?' + mimeWordEncoding + '?' + encodedStr + (encodedStr.substr(-2) === '?=' ? '' : '?=');
        },
        mimeWordsEncode: function (data, mimeWordEncoding, maxLength, fromCharset) {
            if (!fromCharset && typeof maxLength === 'string' && !maxLength.match(/^[0-9]+$/)) {
                fromCharset = maxLength;
                maxLength = undefined;
            }
            maxLength = maxLength || 0;
            var decodedValue = mimefuncs.charset.decode(mimefuncs.charset.convert(data || '', fromCharset)), encodedValue;
            encodedValue = decodedValue.replace(/([^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*(?:\s+[^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*\s*)?)+/g, function (match) {
                return match.length ? mimefuncs.mimeWordEncode(match, mimeWordEncoding || 'Q', maxLength) : '';
            });
            return encodedValue;
        },
        mimeWordDecode: function (str) {
            str = (str || '').toString().trim();
            var fromCharset, encoding, match;
            match = str.match(/^\=\?([\w_\-\*]+)\?([QqBb])\?([^\?]+)\?\=$/i);
            if (!match) {
                return str;
            }
            fromCharset = match[1].split('*').shift();
            encoding = (match[2] || 'Q').toString().toUpperCase();
            str = (match[3] || '').replace(/_/g, ' ');
            if (encoding === 'B') {
                return mimefuncs.base64Decode(str, fromCharset);
            } else if (encoding === 'Q') {
                return mimefuncs.mimeDecode(str, fromCharset);
            } else {
                return str;
            }
        },
        mimeWordsDecode: function (str) {
            str = (str || '').toString();
            str = str.replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, '$1').replace(/\=\?([\w_\-\*]+)\?([QqBb])\?[^\?]+\?\=/g, function (mimeWord) {
                return mimefuncs.mimeWordDecode(mimeWord);
            });
            return str;
        },
        foldLines: function (str, lineLengthMax, afterSpace) {
            str = (str || '').toString();
            lineLengthMax = lineLengthMax || 76;
            var pos = 0, len = str.length, result = '', line, match;
            while (pos < len) {
                line = str.substr(pos, lineLengthMax);
                if (line.length < lineLengthMax) {
                    result += line;
                    break;
                }
                if (match = line.match(/^[^\n\r]*(\r?\n|\r)/)) {
                    line = match[0];
                    result += line;
                    pos += line.length;
                    continue;
                } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || '').length : 0) < line.length) {
                    line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || '').length : 0)));
                } else if (match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/)) {
                    line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || '').length : 0));
                }
                result += line;
                pos += line.length;
                if (pos < len) {
                    result += '\r\n';
                }
            }
            return result;
        },
        headerLineEncode: function (key, value, fromCharset) {
            var encodedValue = mimefuncs.mimeWordsEncode(value, 'Q', 52, fromCharset);
            return mimefuncs.foldLines(key + ': ' + encodedValue, 76);
        },
        headerLineDecode: function (headerLine) {
            var line = (headerLine || '').toString().replace(/(?:\r?\n|\r)[ \t]*/g, ' ').trim(), match = line.match(/^\s*([^:]+):(.*)$/), key = (match && match[1] || '').trim(), value = (match && match[2] || '').trim();
            return {
                key: key,
                value: value
            };
        },
        headerLinesDecode: function (headers) {
            var lines = headers.split(/\r?\n|\r/), headersObj = {}, key, value, header, i, len;
            for (i = lines.length - 1; i >= 0; i--) {
                if (i && lines[i].match(/^\s/)) {
                    lines[i - 1] += '\r\n' + lines[i];
                    lines.splice(i, 1);
                }
            }
            for (i = 0, len = lines.length; i < len; i++) {
                header = mimefuncs.headerLineDecode(lines[i]);
                key = (header.key || '').toString().toLowerCase().trim();
                value = header.value || '';
                if (!headersObj[key]) {
                    headersObj[key] = value;
                } else {
                    headersObj[key] = [].concat(headersObj[key], value);
                }
            }
            return headersObj;
        },
        toTypedArray: function (binaryString) {
            var buf = new Uint8Array(binaryString.length);
            for (var i = 0, len = binaryString.length; i < len; i++) {
                buf[i] = binaryString.charCodeAt(i);
            }
            return buf;
        },
        fromTypedArray: function (buf) {
            var i, l;
            if (!buf.buffer) {
                buf = new Uint8Array(buf);
            }
            var sbits = new Array(buf.length);
            for (i = 0, l = buf.length; i < l; i++) {
                sbits[i] = String.fromCharCode(buf[i]);
            }
            return sbits.join('');
        },
        parseHeaderValue: function (str) {
            var response = {
                    value: false,
                    params: {}
                }, key = false, value = '', type = 'value', quote = false, escaped = false, chr;
            for (var i = 0, len = str.length; i < len; i++) {
                chr = str.charAt(i);
                if (type === 'key') {
                    if (chr === '=') {
                        key = value.trim().toLowerCase();
                        type = 'value';
                        value = '';
                        continue;
                    }
                    value += chr;
                } else {
                    if (escaped) {
                        value += chr;
                    } else if (chr === '\\') {
                        escaped = true;
                        continue;
                    } else if (quote && chr === quote) {
                        quote = false;
                    } else if (!quote && chr === '"') {
                        quote = chr;
                    } else if (!quote && chr === ';') {
                        if (key === false) {
                            response.value = value.trim();
                        } else {
                            response.params[key] = value.trim();
                        }
                        type = 'key';
                        value = '';
                    } else {
                        value += chr;
                    }
                    escaped = false;
                }
            }
            if (type === 'value') {
                if (key === false) {
                    response.value = value.trim();
                } else {
                    response.params[key] = value.trim();
                }
            } else if (value.trim()) {
                response.params[value.trim().toLowerCase()] = '';
            }
            Object.keys(response.params).forEach(function (key) {
                var actualKey, nr, match, value;
                if (match = key.match(/(\*(\d+)|\*(\d+)\*|\*)$/)) {
                    actualKey = key.substr(0, match.index);
                    nr = Number(match[2] || match[3]) || 0;
                    if (!response.params[actualKey] || typeof response.params[actualKey] !== 'object') {
                        response.params[actualKey] = {
                            charset: false,
                            values: []
                        };
                    }
                    value = response.params[key];
                    if (nr === 0 && match[0].substr(-1) === '*' && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
                        response.params[actualKey].charset = match[1] || 'iso-8859-1';
                        value = match[2];
                    }
                    response.params[actualKey].values[nr] = value;
                    delete response.params[key];
                }
            });
            Object.keys(response.params).forEach(function (key) {
                var value;
                if (response.params[key] && Array.isArray(response.params[key].values)) {
                    value = response.params[key].values.map(function (val) {
                        return val || '';
                    }).join('');
                    if (response.params[key].charset) {
                        response.params[key] = '=?' + response.params[key].charset + '?Q?' + value.replace(/[=\?_\s]/g, function (s) {
                            var c = s.charCodeAt(0).toString(16);
                            if (s === ' ') {
                                return '_';
                            } else {
                                return '%' + (c.length < 2 ? '0' : '') + c;
                            }
                        }).replace(/%/g, '=') + '?=';
                    } else {
                        response.params[key] = value;
                    }
                }
            }.bind(this));
            return response;
        },
        continuationEncode: function (key, data, maxLength, fromCharset) {
            var list = [];
            var encodedStr = typeof data === 'string' ? data : mimefuncs.decode(data, fromCharset);
            var chr;
            var line;
            var startPos = 0;
            var isEncoded = false;
            maxLength = maxLength || 50;
            if (/^[\w.\- ]*$/.test(data)) {
                if (encodedStr.length <= maxLength) {
                    return [{
                            key: key,
                            value: /[\s";=]/.test(encodedStr) ? '"' + encodedStr + '"' : encodedStr
                        }];
                }
                encodedStr = encodedStr.replace(new RegExp('.{' + maxLength + '}', 'g'), function (str) {
                    list.push({ line: str });
                    return '';
                });
                if (encodedStr) {
                    list.push({ line: encodedStr });
                }
            } else {
                line = 'utf-8\'\'';
                isEncoded = true;
                startPos = 0;
                for (var i = 0, len = encodedStr.length; i < len; i++) {
                    chr = encodedStr[i];
                    if (isEncoded) {
                        chr = encodeURIComponent(chr);
                    } else {
                        chr = chr === ' ' ? chr : encodeURIComponent(chr);
                        if (chr !== encodedStr[i]) {
                            if ((encodeURIComponent(line) + chr).length >= maxLength) {
                                list.push({
                                    line: line,
                                    encoded: isEncoded
                                });
                                line = '';
                                startPos = i - 1;
                            } else {
                                isEncoded = true;
                                i = startPos;
                                line = '';
                                continue;
                            }
                        }
                    }
                    if ((line + chr).length >= maxLength) {
                        list.push({
                            line: line,
                            encoded: isEncoded
                        });
                        line = chr = encodedStr[i] === ' ' ? ' ' : encodeURIComponent(encodedStr[i]);
                        if (chr === encodedStr[i]) {
                            isEncoded = false;
                            startPos = i - 1;
                        } else {
                            isEncoded = true;
                        }
                    } else {
                        line += chr;
                    }
                }
                if (line) {
                    list.push({
                        line: line,
                        encoded: isEncoded
                    });
                }
            }
            return list.map(function (item, i) {
                return {
                    key: key + '*' + i + (item.encoded ? '*' : ''),
                    value: /[\s";=]/.test(item.line) ? '"' + item.line + '"' : item.line
                };
            });
        },
        _splitMimeEncodedString: function (str, maxlen) {
            var curLine, match, chr, done, lines = [];
            maxlen = Math.max(maxlen || 0, 12);
            while (str.length) {
                curLine = str.substr(0, maxlen);
                if (match = curLine.match(/\=[0-9A-F]?$/i)) {
                    curLine = curLine.substr(0, match.index);
                }
                done = false;
                while (!done) {
                    done = true;
                    if (match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i)) {
                        chr = parseInt(match[1], 16);
                        if (chr < 194 && chr > 127) {
                            curLine = curLine.substr(0, curLine.length - 3);
                            done = false;
                        }
                    }
                }
                if (curLine.length) {
                    lines.push(curLine);
                }
                str = str.substr(curLine.length);
            }
            return lines;
        },
        _addSoftLinebreaks: function (str, encoding) {
            var lineLengthMax = 76;
            encoding = (encoding || 'base64').toString().toLowerCase().trim();
            if (encoding === 'qp') {
                return mimefuncs._addQPSoftLinebreaks(str, lineLengthMax);
            } else {
                return mimefuncs._addBase64SoftLinebreaks(str, lineLengthMax);
            }
        },
        _addBase64SoftLinebreaks: function (base64EncodedStr, lineLengthMax) {
            base64EncodedStr = (base64EncodedStr || '').toString().trim();
            return base64EncodedStr.replace(new RegExp('.{' + lineLengthMax + '}', 'g'), '$&\r\n').trim();
        },
        _addQPSoftLinebreaks: function (qpEncodedStr, lineLengthMax) {
            qpEncodedStr = (qpEncodedStr || '').toString();
            lineLengthMax = lineLengthMax || 76;
            var pos = 0, len = qpEncodedStr.length, match, code, line, lineMargin = Math.floor(lineLengthMax / 3), result = '';
            while (pos < len) {
                line = qpEncodedStr.substr(pos, lineLengthMax);
                if (match = line.match(/\r\n/)) {
                    line = line.substr(0, match.index + match[0].length);
                    result += line;
                    pos += line.length;
                    continue;
                }
                if (line.substr(-1) === '\n') {
                    result += line;
                    pos += line.length;
                    continue;
                } else if (match = line.substr(-lineMargin).match(/\n.*?$/)) {
                    line = line.substr(0, line.length - (match[0].length - 1));
                    result += line;
                    pos += line.length;
                    continue;
                } else if (line.length > lineLengthMax - lineMargin && (match = line.substr(-lineMargin).match(/[ \t\.,!\?][^ \t\.,!\?]*$/))) {
                    line = line.substr(0, line.length - (match[0].length - 1));
                } else if (line.substr(-1) === '\r') {
                    line = line.substr(0, line.length - 1);
                } else {
                    if (line.match(/\=[\da-f]{0,2}$/i)) {
                        if (match = line.match(/\=[\da-f]{0,1}$/i)) {
                            line = line.substr(0, line.length - match[0].length);
                        }
                        while (line.length > 3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/\=[\da-f]{2}$/gi))) {
                            code = parseInt(match[0].substr(1, 2), 16);
                            if (code < 128) {
                                break;
                            }
                            line = line.substr(0, line.length - 3);
                            if (code >= 192) {
                                break;
                            }
                        }
                    }
                }
                if (pos + line.length < len && line.substr(-1) !== '\n') {
                    if (line.length === lineLengthMax && line.match(/\=[\da-f]{2}$/i)) {
                        line = line.substr(0, line.length - 3);
                    } else if (line.length === lineLengthMax) {
                        line = line.substr(0, line.length - 1);
                    }
                    pos += line.length;
                    line += '=\r\n';
                } else {
                    pos += line.length;
                }
                result += line;
            }
            return result;
        },
        _checkRanges: function (nr, ranges) {
            for (var i = ranges.length - 1; i >= 0; i--) {
                if (!ranges[i].length) {
                    continue;
                }
                if (ranges[i].length === 1 && nr === ranges[i][0]) {
                    return true;
                }
                if (ranges[i].length === 2 && nr >= ranges[i][0] && nr <= ranges[i][1]) {
                    return true;
                }
            }
            return false;
        }
    };
    mimefuncs.charset = {
        encode: function (str) {
            return new TextEncoder('UTF-8').encode(str);
        },
        decode: function (buf, fromCharset) {
            fromCharset = mimefuncs.charset.normalizeCharset(fromCharset || 'UTF-8');
            if (!buf.buffer) {
                buf = new Uint8Array(buf);
            }
            try {
                return new TextDecoder(fromCharset).decode(buf);
            } catch (E) {
                try {
                    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
                } catch (E) {
                    try {
                        return new TextDecoder('iso-8859-15').decode(buf);
                    } catch (E) {
                        return mimefuncs.fromTypedArray(buf);
                    }
                }
            }
        },
        convert: function (data, fromCharset) {
            fromCharset = mimefuncs.charset.normalizeCharset(fromCharset || 'UTF-8');
            var bufString;
            if (typeof data !== 'string') {
                if (fromCharset.match(/^utf[\-_]?8$/)) {
                    return data;
                }
                bufString = mimefuncs.charset.decode(data, fromCharset);
                return mimefuncs.charset.encode(bufString);
            }
            return mimefuncs.charset.encode(data);
        },
        normalizeCharset: function (charset) {
            var match;
            if (match = charset.match(/^utf[\-_]?(\d+)$/i)) {
                return 'UTF-' + match[1];
            }
            if (match = charset.match(/^win[\-_]?(\d+)$/i)) {
                return 'WINDOWS-' + match[1];
            }
            if (match = charset.match(/^latin[\-_]?(\d+)$/i)) {
                return 'ISO-8859-' + match[1];
            }
            return charset;
        }
    };
    mimefuncs.base64 = {
        encode: function (data) {
            if (!data) {
                return '';
            }
            if (typeof data === 'string') {
                return btoa(unescape(encodeURIComponent(data)));
            }
            var len = data.byteLength, binStr = '';
            if (!data.buffer) {
                data.buffer = new Uint8Array(data);
            }
            for (var i = 0; i < len; i++) {
                binStr += String.fromCharCode(data[i]);
            }
            return btoa(binStr);
        },
        decode: function (data, outputEncoding) {
            outputEncoding = (outputEncoding || 'buffer').toLowerCase().trim();
            var buf = mimefuncs.base64.toTypedArray(data);
            if (outputEncoding === 'string') {
                return mimefuncs.charset.decode(buf);
            } else {
                return buf;
            }
        },
        toTypedArray: function (base64Str) {
            var bitsSoFar = 0;
            var validBits = 0;
            var iOut = 0;
            var arr = new Uint8Array(Math.ceil(base64Str.length * 3 / 4));
            var c;
            var bits;
            for (var i = 0, len = base64Str.length; i < len; i++) {
                c = base64Str.charCodeAt(i);
                if (c >= 65 && c <= 90) {
                    bits = c - 65;
                } else if (c >= 97 && c <= 122) {
                    bits = c - 97 + 26;
                } else if (c >= 48 && c <= 57) {
                    bits = c - 48 + 52;
                } else if (c === 43) {
                    bits = 62;
                } else if (c === 47) {
                    bits = 63;
                } else if (c === 61) {
                    validBits = 0;
                    continue;
                } else {
                    continue;
                }
                bitsSoFar = bitsSoFar << 6 | bits;
                validBits += 6;
                if (validBits >= 8) {
                    validBits -= 8;
                    arr[iOut++] = bitsSoFar >> validBits;
                    if (validBits === 2) {
                        bitsSoFar &= 3;
                    } else if (validBits === 4) {
                        bitsSoFar &= 15;
                    }
                }
            }
            if (iOut < arr.length) {
                return arr.subarray(0, iOut);
            }
            return arr;
        }
    };
    function base64Encode(input) {
        var str = String(input);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        for (var block, charCode, idx = 0, map = chars, output = ''; str.charAt(idx | 0) || (map = '=', idx % 1); output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
            charCode = str.charCodeAt(idx += 3 / 4);
            if (charCode > 255) {
                throw new Error('\'btoa\' failed: The string to be encoded contains characters outside of the Latin1 range.');
            }
            block = block << 8 | charCode;
        }
        return output;
    }
    return mimefuncs;
}));