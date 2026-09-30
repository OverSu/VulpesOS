var requirejs, require, define;
(function (global, undef) {
    var topReq, dataMain, src, subPath, bootstrapConfig = requirejs || require, hasOwn = Object.prototype.hasOwnProperty, contexts = {}, queue = [], currDirRegExp = /^\.\//, urlRegExp = /^\/|\:|\?|\.js$/, commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, jsSuffixRegExp = /\.js$/;
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
        var nextMicroTaskPass;
        (function () {
            'use strict';
            var waitingResolving, waiting = [];
            function callWaiting() {
                waitingResolving = null;
                var w = waiting;
                waiting = [];
                while (w.length) {
                    w.shift()();
                }
            }
            nextMicroTaskPass = function (fn) {
                waiting.push(fn);
                if (!waitingResolving) {
                    waitingResolving = new Promise(function (resolve, reject) {
                        resolve();
                    }).then(callWaiting).catch(delayedError);
                }
            };
        }());
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
                nextMicroTaskPass(function () {
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
            d.promise = new Promise(function (resolve, reject) {
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
                    setTimeout(function () {
                        checkingLater = false;
                        check();
                    }, 70);
                }
            }
        }
        function delayedError(e) {
            setTimeout(function () {
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
            var shim = config.shim, objs = {
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
(function () {
    function consoleHelper() {
        var msg = arguments[0] + ':';
        for (var i = 1; i < arguments.length; i++) {
            msg += ' ' + arguments[i];
        }
        msg += '\x1B[0m\n';
        dump(msg);
    }
    if ('mozTCPSocket' in window.navigator) {
        window.console = {
            log: consoleHelper.bind(null, '\x1B[32mLOG'),
            error: consoleHelper.bind(null, '\x1B[31mERR'),
            info: consoleHelper.bind(null, '\x1B[36mINF'),
            warn: consoleHelper.bind(null, '\x1B[33mWAR')
        };
    }
    window.onerror = function errHandler(msg, url, line) {
        console.error('onerror reporting:', msg, '@', url, ':', line);
        return false;
    };
}());
define('console_hook', function () {
});
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
                if (fired) {
                    return;
                }
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
            if (this[id] && !this._pendingEvents[id]) {
                fn(this[id]);
            } else {
                this.once(id, fn);
            }
        },
        removeListener: function (id, fn) {
            var i, listeners = this._events[id];
            if (listeners) {
                i = listeners.indexOf(fn);
                if (i !== -1) {
                    listeners.splice(i, 1);
                }
                if (listeners.length === 0) {
                    delete this._events[id];
                }
            }
        },
        emitWhenListener: function (id) {
            var listeners = this._events[id];
            if (listeners) {
                this.emit.apply(this, arguments);
            } else {
                if (!this._pendingEvents[id]) {
                    this._pendingEvents[id] = [];
                }
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
define('app_self', [
    'require',
    'exports',
    'module',
    'evt'
], function (require, exports, module) {
    var evt = require('evt');
    var appSelf = evt.mix({}), mozApps = navigator.mozApps, oldLatest = appSelf.latest, loaded = false;
    if (!mozApps) {
        appSelf.self = {};
        loaded = true;
    }
    function loadSelf() {
        mozApps.getSelf().onsuccess = function (event) {
            loaded = true;
            var app = event.target.result;
            appSelf.self = app;
            appSelf.emit('self', appSelf.self);
        };
    }
    appSelf.latest = function (id) {
        if (!loaded) {
            loadSelf();
        }
        if (id !== 'self') {
            throw new Error(module.id + ' only supports "self" property');
        }
        return oldLatest.apply(this, arguments);
    };
    return appSelf;
});
define('l10n', {
    load: function (id, require, onload, config) {
        if (config.isBuild) {
            return onload();
        }
        require(['l10nbase'], function () {
            navigator.mozL10n.once(function () {
                var dir = navigator.mozL10n.language.direction, htmlNode = document.querySelector('html');
                if (htmlNode.getAttribute('dir') !== dir) {
                    console.log('email l10n updating html dir to ' + dir);
                    htmlNode.setAttribute('dir', dir);
                }
                onload(navigator.mozL10n);
            });
        });
    }
});
(function (window) {
    'use strict';
    window.NotificationHelper = {
        getIconURI: function nh_getIconURI(app, entryPoint) {
            var icons = app.manifest.icons;
            if (entryPoint) {
                icons = app.manifest.entry_points[entryPoint].icons;
            }
            if (!icons) {
                return null;
            }
            var sizes = Object.keys(icons).map(function parse(str) {
                return parseInt(str, 10);
            });
            sizes.sort(function (x, y) {
                return y - x;
            });
            var HVGA = document.documentElement.clientWidth < 480;
            var index = sizes[HVGA ? sizes.length - 1 : 0];
            return app.installOrigin + icons[index];
        },
        send: function nh_send(titleL10n, options) {
            return Promise.all([
                titleL10n,
                options.bodyL10n
            ].map(getL10n)).then(([title, body]) => {
                if (body) {
                    options.body = body;
                }
                options.lang = document.documentElement.getAttribute('lang');
                var notification = new window.Notification(title, options);
                if (options.closeOnClick !== false) {
                    notification.addEventListener('click', function nh_click() {
                        notification.removeEventListener('click', nh_click);
                        notification.close();
                    });
                }
                return notification;
            });
        }
    };
    function getL10n(l10nAttrs) {
        if (!l10nAttrs) {
            return;
        }
        if (typeof l10nAttrs === 'string') {
            return document.l10n.formatValue(l10nAttrs);
        }
        if (typeof l10nAttrs.raw === "string") {
            return l10nAttrs.raw;
        }
        return document.l10n.formatValue(l10nAttrs.id, l10nAttrs.args);
    }
}(this));
define('shared/js/notification_helper', function (global) {
    return function () {
        var ret, fn;
        return ret || global.NotificationHelper;
    };
}(this));
define('sync', [
    'require',
    'app_self',
    'evt',
    'l10n!',
    'shared/js/notification_helper'
], function (require) {
    var cronSyncStartTime, appSelf = require('app_self'), evt = require('evt'), mozL10n = require('l10n!'), notificationHelper = require('shared/js/notification_helper');
    var notificationDataVersion = '1';
    return function syncInit(model, api) {
        var hasBeenVisible = !document.hidden, waitingOnCron = {};
        if (hasBeenVisible) {
            api.setInteractive();
        }
        document.addEventListener('visibilitychange', function onVisibilityChange() {
            if (!document.hidden) {
                hasBeenVisible = true;
                api.setInteractive();
            }
        }, false);
        function makeAccountKey(accountIds) {
            return 'id' + accountIds.join(' ');
        }
        var sendNotification;
        if (typeof Notification !== 'function') {
            console.log('email: notifications not available');
            sendNotification = function () {
            };
        } else {
            sendNotification = function (notificationId, titleL10n, bodyL10n, iconUrl, data, behavior) {
                console.log('Notification sent for ' + notificationId);
                if (Notification.permission !== 'granted') {
                    console.log('email: notification skipped, permission: ' + Notification.permission);
                    return;
                }
                data = data || {};
                var notificationOptions = {
                    bodyL10n: bodyL10n,
                    icon: iconUrl,
                    tag: notificationId,
                    data: data,
                    mozbehavior: { noscreen: true },
                    closeOnClick: false
                };
                if (behavior) {
                    Object.keys(behavior).forEach(function (key) {
                        notificationOptions.mozbehavior[key] = behavior[key];
                    });
                }
                notificationHelper.send(titleL10n, notificationOptions).then(function (notification) {
                    notification.onclick = function () {
                        evt.emit('notification', {
                            clicked: true,
                            imageURL: iconUrl,
                            tag: notificationId,
                            data: data
                        });
                    };
                });
            };
        }
        api.oncronsyncstart = function (accountIds) {
            console.log('email oncronsyncstart: ' + accountIds);
            cronSyncStartTime = Date.now();
            var accountKey = makeAccountKey(accountIds);
            waitingOnCron[accountKey] = true;
        };
        function fetchNotificationsData(ntype) {
            if (typeof Notification !== 'function' || !Notification.get) {
                return Promise.resolve({});
            }
            return Notification.get().then(function (notifications) {
                var result = {};
                notifications.forEach(function (notification) {
                    var data = notification.data;
                    if (!data.v || data.v !== notificationDataVersion) {
                        notification.close();
                    } else if (data.ntype === ntype) {
                        data.notification = notification;
                        result[data.accountId] = data;
                    }
                });
                return result;
            }, function (err) {
                console.error('email notification.get call failed: ' + err);
                return {};
            });
        }
        function getSyncEnv(fn) {
            appSelf.latest('self', function (app) {
                model.latestOnce('account', function (currentAccount) {
                    fetchNotificationsData('sync').then(function (existingNotificationsData) {
                        mozL10n.formatValue('senders-separation-sign').then(function (separator) {
                            var localized = { separator };
                            mozL10n.formatValue('notification-no-subject').then(function (noSubject) {
                                localized.noSubject = noSubject;
                                fn(app, currentAccount, existingNotificationsData, localized);
                            });
                        });
                    });
                });
            });
        }
        function topUniqueFromNames(latestInfos, oldFromNames) {
            var names = [], maxCount = 3;
            latestInfos.sort(function (a, b) {
                return b.date - a.date;
            });
            latestInfos.some(function (info) {
                if (names.length > maxCount) {
                    return true;
                }
                if (names.indexOf(info.from) === -1) {
                    names.push(info.from);
                }
            });
            oldFromNames.some(function (name) {
                if (names.length > maxCount) {
                    return true;
                }
                if (names.indexOf(name) === -1) {
                    names.push(name);
                }
            });
            return names;
        }
        api.oncronsyncstop = function (accountsResults) {
            console.log('email oncronsyncstop: ' + accountsResults.accountIds);
            function finishSync() {
                evt.emit('cronSyncStop', accountsResults.accountIds);
                var accountKey = makeAccountKey(accountsResults.accountIds);
                waitingOnCron[accountKey] = false;
                var stillWaiting = Object.keys(waitingOnCron).some(function (key) {
                    return !!waitingOnCron[key];
                });
                if (!hasBeenVisible && !stillWaiting) {
                    console.log('sync completed in ' + (Date.now() - cronSyncStartTime) / 1000 + ' seconds, closing mail app');
                    window.close();
                }
            }
            if (!accountsResults.updates) {
                finishSync();
                return;
            }
            getSyncEnv(function (app, currentAccount, existingNotificationsData, localized) {
                var iconUrl = notificationHelper.getIconURI(app);
                accountsResults.updates.forEach(function (result) {
                    if (currentAccount.id === result.id && !document.hidden) {
                        model.notifyInboxMessages(result);
                        return;
                    }
                    if (!model.getAccount(result.id).notifyOnNew || typeof Notification !== 'function') {
                        return;
                    }
                    var dataObject, subjectL10n, bodyL10n, behavior, count = result.count, oldFromNames = [];
                    var existingData = existingNotificationsData[result.id];
                    if (existingData) {
                        if (existingData.count) {
                            count += parseInt(existingData.count, 10);
                        }
                        if (existingData.fromNames) {
                            oldFromNames = existingData.fromNames;
                        }
                    }
                    if (count > 1) {
                        var newFromNames = topUniqueFromNames(result.latestMessageInfos, oldFromNames);
                        dataObject = {
                            v: notificationDataVersion,
                            ntype: 'sync',
                            type: 'message_list',
                            accountId: result.id,
                            count: count,
                            fromNames: newFromNames
                        };
                        if (existingData && existingData.count) {
                            behavior = {
                                soundFile: 'does-not-exist-to-simulate-silent',
                                vibrationPattern: [1]
                            };
                        }
                        if (model.getAccountCount() === 1) {
                            subjectL10n = {
                                id: 'new-emails-notify-one-account',
                                args: { n: count }
                            };
                        } else {
                            subjectL10n = {
                                id: 'new-emails-notify-multiple-accounts',
                                args: {
                                    n: count,
                                    accountName: result.address
                                }
                            };
                        }
                        bodyL10n = { raw: newFromNames.join(localized.separator) };
                    } else {
                        var info = result.latestMessageInfos[0];
                        dataObject = {
                            v: notificationDataVersion,
                            ntype: 'sync',
                            type: 'message_reader',
                            accountId: info.accountId,
                            messageSuid: info.messageSuid,
                            count: 1,
                            fromNames: [info.from]
                        };
                        var rawSubject = info.subject || localized.noSubject;
                        if (model.getAccountCount() === 1) {
                            subjectL10n = { raw: rawSubject };
                            bodyL10n = { raw: info.from };
                        } else {
                            subjectL10n = {
                                id: 'new-emails-notify-multiple-accounts',
                                args: {
                                    n: count,
                                    accountName: result.address
                                }
                            };
                            bodyL10n = {
                                id: 'new-emails-notify-multiple-accounts-body',
                                args: {
                                    from: info.from,
                                    subject: rawSubject
                                }
                            };
                        }
                    }
                    sendNotification(result.id, subjectL10n, bodyL10n, iconUrl, dataObject, behavior);
                });
                finishSync();
            });
        };
        var BACKGROUND_SEND_NOTIFICATION_ID = 'backgroundSendFailed';
        var sentAudio = null;
        api.onbackgroundsendstatus = function (data) {
            console.log('outbox: Message', data.suid, 'status =', JSON.stringify({
                state: data.state,
                err: data.err,
                sendFailures: data.sendFailures,
                emitNotifications: data.emitNotifications
            }));
            var descId;
            switch (data.state) {
            case 'pending':
                descId = 'background-send-pending';
                break;
            case 'sending':
                descId = 'background-send-sending';
                break;
            case 'success':
                descId = 'background-send-success';
                break;
            case 'error':
                if (data.badAddresses && data.badAddresses.length || data.err === 'bad-recipient') {
                    descId = 'background-send-error-recipients';
                } else {
                    descId = 'background-send-error';
                }
                break;
            case 'syncDone':
                break;
            default:
                console.error('No state description for background send state "' + data.state + '"');
                return;
            }
            if (data.state === 'success') {
                model.latestOnce('acctsSlice', function () {
                    var account = model.getAccount(data.accountId);
                    if (!account) {
                        console.error('Invalid account ID', data.accountId, 'for a background send notification.');
                        return;
                    }
                    if (account.playSoundOnSend) {
                        if (!sentAudio) {
                            sentAudio = new Audio('/sounds/firefox_sent.opus');
                            sentAudio.mozAudioChannelType = 'notification';
                        }
                        sentAudio.play();
                    }
                }.bind(this));
            }
            if (!document.hidden) {
                mozL10n.formatValue(descId).then(function (localizedDescription) {
                    data.localizedDescription = localizedDescription;
                    model.notifyBackgroundSendStatus(data);
                });
            } else if (data.state === 'error' && data.emitNotifications) {
                appSelf.latest('self', function (app) {
                    var iconUrl = notificationHelper.getIconURI(app);
                    var dataObject = {
                        v: notificationDataVersion,
                        ntype: 'outbox',
                        type: 'message_reader',
                        folderType: 'outbox',
                        accountId: data.accountId,
                        messageSuid: data.suid
                    };
                    sendNotification(BACKGROUND_SEND_NOTIFICATION_ID, 'background-send-error-title', descId, iconUrl, dataObject);
                });
            }
        };
        evt.on('inboxShown', function (accountId) {
            fetchNotificationsData('sync').then(function (notificationsData) {
                if (notificationsData.hasOwnProperty(accountId)) {
                    notificationsData[accountId].notification.close();
                }
            });
        });
    };
});
define('model_init', [
    'require',
    'sync',
    'evt',
    'l10n!'
], function (require) {
    return function modelInit(model, api) {
        require('sync')(model, api);
        var evt = require('evt'), mozL10n = require('l10n!');
        api.onbadlogin = function (account, problem, whichSide) {
            evt.emitWhenListener('apiBadLogin', account, problem, whichSide);
        };
        api.useLocalizedStrings({
            wrote: mozL10n.get('reply-quoting-wrote'),
            originalMessage: mozL10n.get('forward-original-message'),
            forwardHeaderLabels: {
                subject: mozL10n.get('forward-header-subject'),
                date: mozL10n.get('forward-header-date'),
                from: mozL10n.get('forward-header-from'),
                replyTo: mozL10n.get('forward-header-reply-to'),
                to: mozL10n.get('forward-header-to'),
                cc: mozL10n.get('forward-header-cc')
            },
            folderNames: {
                inbox: mozL10n.get('folder-inbox'),
                outbox: mozL10n.get('folder-outbox'),
                sent: mozL10n.get('folder-sent'),
                drafts: mozL10n.get('folder-drafts'),
                trash: mozL10n.get('folder-trash'),
                queue: mozL10n.get('folder-queue'),
                junk: mozL10n.get('folder-junk'),
                archives: mozL10n.get('folder-archives'),
                localdrafts: mozL10n.get('folder-localdrafts')
            }
        });
    };
});
define('model_create', [
    'require',
    'evt',
    'model_init'
], function (require) {
    var evt = require('evt'), modelInit = require('model_init');
    function dieOnFatalError(msg) {
        console.error('FATAL:', msg);
        throw new Error(msg);
    }
    function saveHasAccount(acctsSlice) {
        localStorage.setItem('data_has_account', acctsSlice.items.length ? 'yes' : 'no');
        console.log('WRITING LOCAL STORAGE ITEM: ' + 'data_has_account', acctsSlice.items.length ? 'yes' : 'no');
    }
    function Model() {
        evt.Emitter.call(this);
    }
    Model.prototype = {
        acctsSlice: null,
        account: null,
        foldersSlice: null,
        folder: null,
        _callEmit: function (id) {
            this.emit(id, this[id]);
        },
        inited: false,
        hasAccount: function () {
            return this.getAccountCount() > 0;
        },
        getAccount: function (id) {
            if (!this.acctsSlice || !this.acctsSlice.items) {
                throw new Error('No acctsSlice available');
            }
            var targetAccount;
            this.acctsSlice.items.some(function (account) {
                if (account.id === id) {
                    return !!(targetAccount = account);
                }
            });
            return targetAccount;
        },
        getAccountCount: function () {
            var count = 0;
            if (this.acctsSlice && this.acctsSlice.items && this.acctsSlice.items.length) {
                count = this.acctsSlice.items.length;
            }
            return count;
        },
        init: function (showLatest, callback) {
            require(['api'], function (api) {
                if (this === modelCreate.defaultModel) {
                    modelInit(this, api);
                }
                this.api = api;
                this.die();
                var acctsSlice = api.viewAccounts(false);
                acctsSlice.oncomplete = function () {
                    this.acctsSlice = acctsSlice;
                    saveHasAccount(acctsSlice);
                    if (acctsSlice.items.length) {
                        var account = showLatest ? acctsSlice.items.slice(-1)[0] : acctsSlice.defaultAccount;
                        this.changeAccount(account, callback);
                    } else if (callback) {
                        callback();
                    }
                    this.inited = true;
                    this._callEmit('acctsSlice');
                    if (this === modelCreate.defaultModel) {
                        evt.emitWhenListener('metrics:apiDone');
                    }
                }.bind(this);
                acctsSlice.onchange = function () {
                    saveHasAccount(acctsSlice);
                }.bind(this);
            }.bind(this));
        },
        changeAccount: function (account, callback) {
            if (this.account && this.account.id === account.id) {
                if (callback) {
                    callback();
                }
                return;
            }
            this._dieFolders();
            this.account = account;
            this._callEmit('account');
            var foldersSlice = this.api.viewFolders('account', account);
            foldersSlice.oncomplete = function () {
                this.foldersSlice = foldersSlice;
                this.foldersSlice.onchange = this.notifyFoldersSliceOnChange.bind(this);
                this.selectInbox(callback);
                this._callEmit('foldersSlice');
            }.bind(this);
        },
        changeAccountFromId: function (accountId, callback) {
            if (!this.acctsSlice || !this.acctsSlice.items.length) {
                throw new Error('No accounts available');
            }
            this.acctsSlice.items.some(function (account) {
                if (account.id === accountId) {
                    this.changeAccount(account, callback);
                    return true;
                }
            }.bind(this));
        },
        changeFolder: function (folder) {
            if (folder && (!this.folder || folder.id !== this.folder.id)) {
                this.folder = folder;
                this._callEmit('folder');
            }
        },
        selectInbox: function (callback) {
            this.selectFirstFolderWithType('inbox', callback);
        },
        selectFirstFolderWithType: function (folderType, callback) {
            if (!this.foldersSlice) {
                throw new Error('No foldersSlice available');
            }
            var folder = this.foldersSlice.getFirstFolderWithType(folderType);
            if (!folder) {
                dieOnFatalError('We have an account without a folderType ' + folderType + '!', this.foldersSlice.items);
            }
            if (this.folder && this.folder.id === folder.id) {
                if (callback) {
                    callback();
                }
            } else {
                if (callback) {
                    this.once('folder', callback);
                }
                this.changeFolder(folder);
            }
        },
        notifyInboxMessages: function (accountUpdate) {
            if (accountUpdate.id === this.account.id) {
                this.emit('newInboxMessages', accountUpdate.count);
            }
        },
        notifyFoldersSliceOnChange: function (folder) {
            this.emit('foldersSliceOnChange', folder);
        },
        notifyBackgroundSendStatus: function (data) {
            this.emit('backgroundSendStatus', data);
        },
        _dieFolders: function () {
            if (this.foldersSlice) {
                this.foldersSlice.die();
            }
            this.foldersSlice = null;
            this.folder = null;
        },
        die: function () {
            if (this.acctsSlice) {
                this.acctsSlice.die();
            }
            this.acctsSlice = null;
            this.account = null;
            this._dieFolders();
        }
    };
    evt.mix(Model.prototype);
    function modelCreate() {
        return new Model();
    }
    modelCreate.defaultModel = new Model();
    return modelCreate;
});
var MimeMapper = {
    _typeToExtensionMap: {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'audio/3gpp': '3gp',
        'audio/amr': 'amr',
        'video/mp4': 'mp4',
        'video/mpeg': 'mpg',
        'video/ogg': 'ogg',
        'video/webm': 'webm',
        'video/3gpp': '3gp',
        'video/3gpp2': '3g2',
        'application/pdf': 'pdf',
        'application/vcard': 'vcf',
        'text/vcard': 'vcf',
        'text/x-vcard': 'vcf'
    },
    _extensionToTypeMap: {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'jpe': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'mp3': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'm4b': 'audio/mp4',
        'm4p': 'audio/mp4',
        'm4r': 'audio/mp4',
        'aac': 'audio/aac',
        'opus': 'audio/ogg',
        'amr': 'audio/amr',
        'mp4': 'video/mp4',
        'mpeg': 'video/mpeg',
        'mpg': 'video/mpeg',
        'ogv': 'video/ogg',
        'ogx': 'video/ogg',
        'webm': 'video/webm',
        '3gp': 'video/3gpp',
        '3g2': 'video/3gpp2',
        'ogg': 'video/ogg',
        'pdf': 'application/pdf',
        'vcf': 'text/vcard'
    },
    _parseExtension: function (filename) {
        var array = filename.split('.');
        return array.length > 1 ? array.pop() : '';
    },
    isSupportedType: function (mimetype) {
        return mimetype in this._typeToExtensionMap;
    },
    isSupportedExtension: function (extension) {
        return extension in this._extensionToTypeMap;
    },
    isFilenameMatchesType: function (filename, mimetype) {
        var extension = this._parseExtension(filename);
        var guessedType = this.guessTypeFromExtension(extension);
        return guessedType == mimetype;
    },
    guessExtensionFromType: function (mimetype) {
        return this._typeToExtensionMap[mimetype];
    },
    guessTypeFromExtension: function (extension) {
        return this._extensionToTypeMap[extension];
    },
    guessTypeFromFileProperties: function (filename, mimetype) {
        var extension = this._parseExtension(filename);
        var type = this.isSupportedType(mimetype) ? mimetype : this.guessTypeFromExtension(extension);
        return type || '';
    },
    ensureFilenameMatchesType: function (filename, mimetype) {
        if (!this.isFilenameMatchesType(filename, mimetype)) {
            var guessedExt = this.guessExtensionFromType(mimetype);
            if (guessedExt) {
                filename += '.' + guessedExt;
            }
        }
        return filename;
    }
};
define('shared/js/mime_mapper', function (global) {
    return function () {
        var ret, fn;
        return ret || global.MimeMapper;
    };
}(this));
define('attachment_name', [
    'require',
    'l10n!',
    'shared/js/mime_mapper'
], function (require) {
    var mozL10n = require('l10n!'), mapper = require('shared/js/mime_mapper');
    var attachmentName = {
        ensureName: function (blob, name, count) {
            if (!name) {
                count = count || 1;
                var suffix = mapper.guessExtensionFromType(blob.type);
                name = mozL10n.get('default-attachment-filename', { n: count }) + (suffix ? '.' + suffix : '');
            }
            return name;
        },
        ensureNameList: function (blobs, names) {
            for (var i = 0; i < blobs.length; i++) {
                names[i] = attachmentName.ensureName(blobs[i], names[i], i + 1);
            }
        }
    };
    return attachmentName;
});
define('query_uri', [], function () {
    'use strict';
    function decode(value) {
        try {
            return decodeURIComponent(value);
        } catch (err) {
            console.error('Skipping "' + value + '", decodeURIComponent error: ' + err);
            return '';
        }
    }
    function queryURI(uri) {
        function addressesToArray(addresses) {
            if (!addresses) {
                return [];
            }
            addresses = addresses.split(/[,;]/);
            var addressesArray = addresses.filter(function notEmpty(addr) {
                return addr.trim() !== '';
            });
            return addressesArray;
        }
        var mailtoReg = /^mailto:(.*)/i;
        var obj = {};
        if (uri && uri.match(mailtoReg)) {
            uri = uri.match(mailtoReg)[1];
            var parts = uri.split('?');
            var subjectReg = /(?:^|&)subject=([^\&]*)/i, bodyReg = /(?:^|&)body=([^\&]*)/i, ccReg = /(?:^|&)cc=([^\&]*)/i, bccReg = /(?:^|&)bcc=([^\&]*)/i;
            obj.to = parts[0] ? addressesToArray(decode(parts[0])) : [];
            if (parts.length == 2) {
                var data = parts[1];
                if (data.match(subjectReg)) {
                    obj.subject = decode(data.match(subjectReg)[1]);
                }
                if (data.match(bodyReg)) {
                    obj.body = decode(data.match(bodyReg)[1]);
                }
                if (data.match(ccReg)) {
                    obj.cc = addressesToArray(decode(data.match(ccReg)[1]));
                }
                if (parts[1].match(bccReg)) {
                    obj.bcc = addressesToArray(decode(data.match(bccReg)[1]));
                }
            }
        }
        return obj;
    }
    return queryURI;
});
define('activity_composer_data', [
    'require',
    'exports',
    'module',
    'attachment_name',
    'query_uri'
], function (require, exports, module) {
    var attachmentName = require('attachment_name'), queryUri = require('query_uri');
    return function activityComposeR(rawActivity) {
        var source = rawActivity.source;
        var data = source.data;
        var activityName = source.name;
        var dataType = data.type;
        var url = data.url || data.URI;
        var attachData;
        if (dataType === 'url' && activityName === 'share') {
            attachData = { body: url };
        } else {
            attachData = queryUri(url);
            attachData.attachmentBlobs = data.blobs || [];
            attachData.attachmentNames = data.filenames || [];
            attachmentName.ensureNameList(attachData.attachmentBlobs, attachData.attachmentNames);
        }
        return {
            onComposer: function (composer, composeCard) {
                var attachmentBlobs = attachData.attachmentBlobs;
                if (attachData.to) {
                    composer.to = attachData.to;
                }
                if (attachData.subject) {
                    composer.subject = attachData.subject;
                }
                if (attachData.body) {
                    composer.body = { text: attachData.body + composer.body.text };
                }
                if (attachData.cc) {
                    composer.cc = attachData.cc;
                }
                if (attachData.bcc) {
                    composer.bcc = attachData.bcc;
                }
                if (attachmentBlobs) {
                    var attachmentsToAdd = [];
                    for (var iBlob = 0; iBlob < attachmentBlobs.length; iBlob++) {
                        attachmentsToAdd.push({
                            name: attachData.attachmentNames[iBlob],
                            blob: attachmentBlobs[iBlob]
                        });
                    }
                    composeCard.addAttachmentsSubjectToSizeLimits(attachmentsToAdd);
                }
            }
        };
    };
});
define('cards_init', ['require'], function (require) {
    return function cardsInit(cards) {
        cards.pushDefaultCard = function (onPushed) {
            require(['model_create'], function (modelCreate) {
                cards.pushCard('message_list', 'none', {
                    model: modelCreate.defaultModel,
                    onPushed: onPushed
                }, 'left');
            });
        };
    };
});
define('html_cache', [
    'require',
    'exports',
    'module',
    'l10n!'
], function (require, exports) {
    var mozL10n = require('l10n!');
    exports.cloneAsInertNodeAvoidingCustomElementHorrors = function (node) {
        var templateNode = document.createElement('template');
        var cacheDoc = templateNode.content.ownerDocument;
        return cacheDoc.importNode(node, true);
    };
    exports.save = function htmlCacheSave(moduleId, html) {
        var id = exports.moduleIdToKey(moduleId);
        var langDir = document.querySelector('html').getAttribute('dir');
        html = window.HTML_CACHE_VERSION + (langDir ? ',' + langDir : '') + ':' + html;
        localStorage.setItem('html_cache_' + id, html);
        console.log('htmlCache.save ' + id + ': ' + html.length + ', lang dir: ' + langDir);
    };
    exports.reset = function () {
        localStorage.clear();
        var expiry = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000;
        expiry = new Date(expiry).toUTCString();
        for (var i = 0; i < 40; i++) {
            document.cookie = 'htmlc' + i + '=; expires=' + expiry;
        }
        console.log('htmlCache reset');
    };
    window.addEventListener('languagechange', exports.reset);
    exports.moduleIdToKey = function moduleIdToKey(moduleId) {
        return moduleId.replace(/^cards\//, '').replace(/-/g, '_');
    };
    exports.nodeToKey = function nodeToKey(node) {
        return node.nodeName.toLowerCase().replace(/^cards-/, '').replace(/-/g, '_');
    };
    exports.cloneAndSave = function cloneAndSave(moduleId, node) {
        var cachedNode = exports.cloneAsInertNodeAvoidingCustomElementHorrors(node);
        mozL10n.translateFragment(cachedNode);
        cachedNode.dataset.cached = 'cached';
        exports.delayedSaveFromNode(moduleId, cachedNode);
    };
    exports.saveFromNode = function saveFromNode(moduleId, node) {
        var cl = node.classList;
        cl.remove('before');
        cl.remove('after');
        cl.add('center');
        var nodes = node.querySelectorAll('.email-ce');
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].dataset.cached = 'cached';
        }
        if (node.classList.contains('email-ce')) {
            node.dataset.cached = 'cached';
        }
        var html = node.outerHTML;
        exports.save(moduleId, html);
    };
    var delayedSaveId = 0;
    var delayedNode = '';
    exports.delayedSaveFromNode = function delayedSaveFromNode(moduleId, node) {
        delayedNode = node;
        if (!delayedSaveId) {
            delayedSaveId = setTimeout(function () {
                delayedSaveId = 0;
                exports.saveFromNode(moduleId, delayedNode);
                delayedNode = null;
            }, 500);
        }
    };
});
define('tmpl', ['l10n!'], function (mozL10n) {
    var tmpl = {
        pluginBuilder: './tmpl_builder',
        toDom: function (text) {
            var temp = document.createElement('div');
            temp.innerHTML = text;
            var node = temp.children[0];
            mozL10n.translateFragment(node);
            return node;
        },
        load: function (id, require, onload, config) {
            require(['text!' + id], function (text) {
                var node = tmpl.toDom(text);
                onload(node);
            });
        }
    };
    return tmpl;
});
define('tmpl!cards/toaster.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<section role="status" class="toaster collapsed">\n  <p class="toaster-text"></p>\n  <div class="toaster-action-target"><button class="toaster-action"></button></div>\n</section>\n');
});
define('transition_end', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    return function transitionEnd(node, fn, capturing) {
        function asyncFn(event) {
            Promise.resolve().then(function () {
                fn(event);
            }).catch(function (error) {
                console.error(error);
            });
        }
        node.addEventListener('transitionend', asyncFn, capturing);
        return asyncFn;
    };
});
define('toaster', [
    'require',
    'l10n!',
    'tmpl!./cards/toaster.html',
    'transition_end'
], function (require) {
    var mozL10n = require('l10n!');
    var toasterNode = require('tmpl!./cards/toaster.html');
    var transitionEnd = require('transition_end');
    var toaster = {
        defaultTimeout: 5000,
        _previousActionClass: undefined,
        init: function (parentEl) {
            this.el = toasterNode;
            parentEl.appendChild(this.el);
            this.text = this.el.querySelector('.toaster-text');
            this.actionButton = this.el.querySelector('.toaster-action');
            this.el.addEventListener('click', this.hide.bind(this));
            transitionEnd(this.el, this.hide.bind(this));
            this.el.querySelector('.toaster-action-target').addEventListener('click', this.onAction.bind(this));
            this.currentToast = null;
        },
        toastOperation: function (op) {
            if (!op || !op.affectedCount) {
                return;
            }
            var type = op.operation;
            var canUndo = op.undo && type !== 'move' && type !== 'delete';
            this.toast({
                text: mozL10n.get('toaster-message-' + type, { n: op.affectedCount }),
                actionLabel: mozL10n.get('toaster-undo'),
                actionClass: 'undo',
                action: canUndo && op.undo.bind(op)
            });
        },
        onAction: function () {
            var actionFunction = this.currentToast && this.currentToast.action;
            this.hide();
            if (actionFunction) {
                actionFunction();
            }
        },
        toast: function (opts) {
            opts = opts || {};
            console.log('Showing toast:', JSON.stringify(opts));
            this.hide();
            this.currentToast = opts;
            this.text.textContent = opts.text;
            this.actionButton.textContent = opts.actionLabel;
            if (this._previousActionClass) {
                this.actionButton.classList.remove(this._previousActionClass);
                this._previousActionClass = undefined;
            }
            if (opts.actionClass) {
                this._previousActionClass = opts.actionClass;
                this.actionButton.classList.add(this._previousActionClass);
            }
            this.el.classList.toggle('actionable', !opts.action);
            this.actionButton.disabled = !opts.action;
            this.el.classList.remove('collapsed');
            this._fadeTimeout = setTimeout(function () {
                this.el.classList.add('fadeout');
            }.bind(this), opts.timeout || this.defaultTimeout);
        },
        isShowing: function () {
            return !this.el.classList.contains('collapsed');
        },
        hide: function () {
            this.currentToast = null;
            this.el.classList.add('collapsed');
            this.el.classList.remove('fadeout');
            window.clearTimeout(this._fadeTimeout);
            this._fadeTimeout = null;
        }
    };
    return toaster;
});
define('input_areas', [
    'require',
    'exports',
    'module'
], function (require, exports) {
    var slice = Array.prototype.slice;
    return function hookupInputAreaResetButtons(e) {
        var selector = 'form p input + button[type="reset"],' + 'form p textarea + button[type="reset"]';
        var resetButtons = slice.call(e.querySelectorAll(selector));
        resetButtons.forEach(function (resetButton) {
            resetButton.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });
            resetButton.addEventListener('click', function (e) {
                e.target.previousElementSibling.value = '';
                e.preventDefault();
            });
        });
    };
});
define('cards', [
    'require',
    'exports',
    'module',
    'cards_init',
    'html_cache',
    'l10n!',
    'evt',
    'toaster',
    'transition_end',
    'input_areas'
], function (require, exports, module) {
    var cardsInit = require('cards_init'), htmlCache = require('html_cache'), mozL10n = require('l10n!'), evt = require('evt'), toaster = require('toaster'), transitionEnd = require('transition_end'), hookupInputAreaResetButtons = require('input_areas');
    function addClass(domNode, name) {
        if (domNode) {
            domNode.classList.add(name);
        }
    }
    function removeClass(domNode, name) {
        if (domNode) {
            domNode.classList.remove(name);
        }
    }
    var cards = {
        _cardDefs: {},
        _cardStack: [],
        activeCardIndex: -1,
        _pendingPush: null,
        _zIndex: 0,
        _rootNode: null,
        _containerNode: null,
        _cardsNode: null,
        _animatingDeadDomNodes: [],
        _transitionCount: 0,
        _startupEventsEmitted: false,
        _popupActive: null,
        _eatingEventsUntilNextCard: false,
        init: function () {
            this._rootNode = document.body;
            this._containerNode = document.getElementById('cardContainer');
            this._cardsNode = document.getElementById('cards');
            this._statusColorMeta = document.querySelector('meta[name="theme-color"]');
            toaster.init(this._containerNode);
            this._containerNode.addEventListener('click', this._onMaybeIntercept.bind(this), true);
            transitionEnd(this._cardsNode, this._onTransitionEnd.bind(this), false);
            document.addEventListener('visibilitychange', function (evt) {
                var card = this._cardStack[this.activeCardIndex];
                if (card && card.onCurrentCardDocumentVisibilityChange) {
                    card.onCurrentCardDocumentVisibilityChange(document.hidden);
                }
            }.bind(this));
            cardsInit(this);
        },
        _onMaybeIntercept: function (event) {
            if (this._eatingEventsUntilNextCard) {
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            if (this._popupActive) {
                event.stopPropagation();
                event.preventDefault();
                this._popupActive.close();
                return;
            }
            var cardNode = event.target;
            for (cardNode = event.target; cardNode; cardNode = cardNode.parentElement) {
                if (cardNode.classList.contains('card')) {
                    break;
                }
            }
        },
        pushCard: function (type, showMethod, args, placement) {
            var cardDef = this._cardDefs[type];
            args = args || {};
            if (!cardDef) {
                var cbArgs = Array.slice(arguments);
                this._pendingPush = [type];
                if (showMethod !== 'none') {
                    this.eatEventsUntilNextCard();
                }
                require(['element!cards/' + type], function (Ctor) {
                    this._cardDefs[type] = Ctor;
                    this.pushCard.apply(this, cbArgs);
                }.bind(this));
                return;
            }
            this._pendingPush = null;
            console.log('pushCard for type: ' + type);
            var domNode = args.cachedNode || new cardDef();
            if (args && domNode.onArgs) {
                domNode.onArgs(args);
            }
            var cardIndex, insertBuddy;
            if (!placement) {
                cardIndex = this._cardStack.length;
                insertBuddy = null;
                domNode.classList.add(cardIndex === 0 ? 'before' : 'after');
            } else if (placement === 'left') {
                cardIndex = this.activeCardIndex++;
                insertBuddy = this._cardsNode.children[cardIndex];
                domNode.classList.add('before');
            } else if (placement === 'right') {
                cardIndex = this.activeCardIndex + 1;
                if (cardIndex >= this._cardStack.length) {
                    insertBuddy = null;
                } else {
                    insertBuddy = this._cardsNode.children[cardIndex];
                }
                domNode.classList.add('after');
            }
            this._cardStack.splice(cardIndex, 0, domNode);
            if (!args.cachedNode) {
                this._cardsNode.insertBefore(domNode, insertBuddy);
            }
            hookupInputAreaResetButtons(domNode);
            if (!domNode.callHeaderFontSize) {
                window.dispatchEvent(new CustomEvent('lazyload', { detail: domNode }));
            }
            if ('postInsert' in domNode) {
                domNode.postInsert();
            }
            if (showMethod !== 'none') {
                if (!args.cachedNode) {
                    domNode.clientWidth;
                }
                this._showCard(cardIndex, showMethod, 'forward');
            }
            if (args.onPushed) {
                args.onPushed(domNode);
            }
        },
        pushOrTellCard: function (type, showMethod, args, placement) {
            var query = type;
            if (this.hasCard(query)) {
                this.tellCard(query, args);
                return false;
            } else {
                this.pushCard.apply(this, Array.slice(arguments));
                return true;
            }
        },
        setStatusColor: function (element) {
            var color;
            if (!element) {
                element = this._cardStack[this.activeCardIndex];
            }
            var statusElement = element.dataset.statuscolor ? element : element.querySelector('[data-statuscolor]');
            if (statusElement) {
                color = statusElement.dataset.statuscolor;
                if (color === 'default') {
                    color = null;
                } else if (color === 'background') {
                    color = getComputedStyle(statusElement).backgroundColor;
                }
            } else {
                color = getComputedStyle(element).backgroundColor;
            }
            if (color && color.indexOf('rgb') !== 0 && color.indexOf('#') !== 0) {
                color = null;
            }
            color = color || this._statusColorMeta.dataset.statuscolor;
            var existingColor = this._statusColorMeta.getAttribute('content');
            if (color !== existingColor) {
                this._statusColorMeta.setAttribute('content', color);
            }
        },
        _findCardUsingType: function (type) {
            for (var i = 0; i < this._cardStack.length; i++) {
                var domNode = this._cardStack[i];
                if (htmlCache.nodeToKey(domNode) === type) {
                    return i;
                }
            }
        },
        _findCard: function (query, skipFail) {
            var result;
            if (typeof query === 'string') {
                result = this._findCardUsingType(query, skipFail);
            } else if (typeof query === 'number') {
                result = query;
            } else {
                result = this._cardStack.indexOf(query);
            }
            if (result > -1) {
                return result;
            } else if (!skipFail) {
                throw new Error('Unable to find card with query:', query);
            } else {
                return undefined;
            }
        },
        hasCard: function (query) {
            if (this._pendingPush && this._pendingPush === query) {
                return true;
            }
            return this._findCard(query, true) > -1;
        },
        isVisible: function (domNode) {
            return !!(domNode && domNode.classList.contains('center'));
        },
        findCardObject: function (query) {
            return this._cardStack[this._findCard(query)];
        },
        getCurrentCardType: function () {
            var result = null, card = this._cardStack[this.activeCardIndex];
            if (this._pendingPush) {
                result = this._pendingPush;
            } else if (card) {
                result = htmlCache.nodeToKey(card);
            }
            return result;
        },
        folderSelector: function (model, callback, filter) {
            var self = this;
            require(['value_selector'], function (ValueSelector) {
                if (!self.folderPrompt) {
                    var selectorTitle = mozL10n.get('messages-folder-select');
                    self.folderPrompt = new ValueSelector(selectorTitle);
                }
                model.latestOnce('foldersSlice', function (foldersSlice) {
                    var folders = foldersSlice.items;
                    folders.forEach(function (folder) {
                        var isMatch = !filter || filter(folder);
                        if (folder.neededForHierarchy || isMatch) {
                            self.folderPrompt.addToList(folder.name, folder.depth, isMatch, function (folder) {
                                return function () {
                                    self.folderPrompt.hide();
                                    callback(folder);
                                };
                            }(folder));
                        }
                    });
                    self.folderPrompt.show();
                });
            });
        },
        moveToCard: function (query, showMethod) {
            this._showCard(this._findCard(query), showMethod || 'animate');
        },
        tellCard: function (query, what) {
            var cardIndex = this._findCard(query), domNode = this._cardStack[cardIndex];
            if (!('told' in domNode)) {
                console.warn('Tried to tell a card that\'s not listening!', query, what);
            } else {
                domNode.told(what);
            }
        },
        removeCardAndSuccessors: function (cardDomNode, showMethod, numCards, nextCardSpec, skipDefault) {
            if (!this._cardStack.length) {
                return;
            }
            if (cardDomNode && this._cardStack.length === 1 && !skipDefault) {
                return cards.pushDefaultCard(function () {
                    this.removeCardAndSuccessors(cardDomNode, showMethod, numCards, nextCardSpec);
                }.bind(this));
            }
            var firstIndex, iCard, domNode;
            if (cardDomNode === undefined) {
                throw new Error('undefined is not a valid card spec!');
            } else if (cardDomNode === null) {
                firstIndex = 0;
                this._zIndex = 0;
            } else {
                for (iCard = this._cardStack.length - 1; iCard >= 0; iCard--) {
                    domNode = this._cardStack[iCard];
                    if (domNode === cardDomNode) {
                        firstIndex = iCard;
                        break;
                    }
                }
                if (firstIndex === undefined) {
                    throw new Error('No card represented by that DOM node');
                }
            }
            if (!numCards) {
                numCards = this._cardStack.length - firstIndex;
            }
            if (showMethod === 'none') {
                if (cardDomNode && cardDomNode.classList.contains('anim-overlay')) {
                    this._zIndex -= 10;
                }
            } else {
                var nextCardIndex = -1;
                if (nextCardSpec) {
                    nextCardIndex = this._findCard(nextCardSpec);
                } else if (this._cardStack.length) {
                    nextCardIndex = Math.min(firstIndex - 1, this._cardStack.length - 1);
                }
                if (nextCardIndex > -1) {
                    this._showCard(nextCardIndex, showMethod, 'back');
                }
            }
            if (firstIndex <= this.activeCardIndex) {
                this.activeCardIndex -= numCards;
                if (this.activeCardIndex < -1) {
                    this.activeCardIndex = -1;
                }
            }
            var deadDomNodes = this._cardStack.splice(firstIndex, numCards);
            for (iCard = 0; iCard < deadDomNodes.length; iCard++) {
                domNode = deadDomNodes[iCard];
                try {
                    domNode.die();
                } catch (ex) {
                    console.warn('Problem cleaning up card:', ex, '\n', ex.stack);
                }
                switch (showMethod) {
                case 'animate':
                case 'immediate':
                    this._animatingDeadDomNodes.push(domNode);
                    break;
                case 'none':
                    domNode.parentNode.removeChild(domNode);
                    break;
                }
            }
            this._setScreenReaderVisibility();
        },
        removeAllCards: function () {
            return this.removeCardAndSuccessors(null, 'none');
        },
        _showCard: function (cardIndex, showMethod, navDirection) {
            if (cardIndex === this.activeCardIndex) {
                return;
            }
            var activeElement = document.activeElement;
            if (activeElement && activeElement.blur) {
                activeElement.blur();
            }
            if (cardIndex > this._cardStack.length - 1) {
                cardIndex = this._cardStack.length - 1;
            }
            if (this.activeCardIndex > this._cardStack.length - 1) {
                this.activeCardIndex = -1;
            }
            if (this.activeCardIndex === -1) {
                this.activeCardIndex = cardIndex === 0 ? cardIndex : cardIndex - 1;
            }
            var domNode = cardIndex !== null ? this._cardStack[cardIndex] : null;
            var beginNode = this._cardStack[this.activeCardIndex];
            var endNode = this._cardStack[cardIndex];
            var isForward = navDirection === 'forward';
            if (this._cardStack.length === 1) {
                this._zIndex = 0;
            }
            if (isForward && endNode.classList.contains('anim-overlay')) {
                beginNode = null;
                this._zIndex += 10;
            }
            if (beginNode && beginNode.classList.contains('anim-overlay')) {
                if (isForward) {
                    if (showMethod !== 'immediate') {
                        if (beginNode.classList.contains('anim-vertical')) {
                            removeClass(beginNode, 'anim-vertical');
                            addClass(beginNode, 'disabled-anim-vertical');
                        } else if (beginNode.classList.contains('anim-fade')) {
                            removeClass(beginNode, 'anim-fade');
                            addClass(beginNode, 'disabled-anim-fade');
                        }
                    }
                } else {
                    this.setStatusColor(endNode);
                    endNode = null;
                    this._zIndex -= 10;
                }
            }
            if (endNode && isForward && this._zIndex) {
                endNode.style.zIndex = this._zIndex;
            }
            var cardsNode = this._cardsNode;
            if (endNode) {
                this.setStatusColor(endNode);
            }
            if (showMethod === 'immediate') {
                addClass(beginNode, 'no-anim');
                addClass(endNode, 'no-anim');
                cardsNode.clientWidth;
                this._eatingEventsUntilNextCard = false;
            } else if (showMethod === 'none') {
            } else {
                this._transitionCount = beginNode && endNode ? 2 : 1;
                this._eatingEventsUntilNextCard = true;
            }
            if (this.activeCardIndex === cardIndex) {
                removeClass(beginNode, 'before');
                removeClass(beginNode, 'after');
                addClass(beginNode, 'center');
            } else if (this.activeCardIndex > cardIndex) {
                removeClass(beginNode, 'center');
                addClass(beginNode, 'after');
                removeClass(endNode, 'before');
                addClass(endNode, 'center');
            } else {
                removeClass(beginNode, 'center');
                addClass(beginNode, 'before');
                removeClass(endNode, 'after');
                addClass(endNode, 'center');
            }
            if (showMethod === 'immediate') {
                cardsNode.clientWidth;
                removeClass(beginNode, 'no-anim');
                removeClass(endNode, 'no-anim');
                this._onCardVisible(domNode);
            }
            toaster.hide();
            this.activeCardIndex = cardIndex;
            this._setScreenReaderVisibility();
        },
        _setScreenReaderVisibility: function () {
            this._cardStack.forEach(function (card, index) {
                card.setAttribute('aria-hidden', index !== this.activeCardIndex);
            }, this);
        },
        _onTransitionEnd: function (event) {
            if (!event.target.classList.contains('card')) {
                return;
            }
            var activeCard = this._cardStack[this.activeCardIndex];
            if (!activeCard) {
                return;
            }
            if (this._transitionCount > 0) {
                this._transitionCount -= 1;
            }
            if (this._transitionCount === 0) {
                if (this._eatingEventsUntilNextCard) {
                    this._eatingEventsUntilNextCard = false;
                }
                if (this._animatingDeadDomNodes.length) {
                    setTimeout(function () {
                        this._animatingDeadDomNodes.forEach(function (domNode) {
                            if (domNode.parentNode) {
                                domNode.parentNode.removeChild(domNode);
                            }
                        });
                        this._animatingDeadDomNodes = [];
                    }.bind(this), 100);
                }
                var endNode = activeCard;
                if (endNode.classList.contains('disabled-anim-vertical')) {
                    removeClass(endNode, 'disabled-anim-vertical');
                    addClass(endNode, 'anim-vertical');
                } else if (endNode.classList.contains('disabled-anim-fade')) {
                    removeClass(endNode, 'disabled-anim-fade');
                    addClass(endNode, 'anim-fade');
                }
                if (this._afterTransitionAction) {
                    var afterTransitionAction = this._afterTransitionAction;
                    this._afterTransitionAction = null;
                    afterTransitionAction();
                }
                this._onCardVisible(activeCard);
                var nextCards = activeCard.nextCards;
                if (nextCards) {
                    console.log('Preloading cards: ' + nextCards);
                    require(nextCards.map(function (id) {
                        return 'cards/' + id;
                    }));
                }
            }
        },
        _onCardVisible: function (domNode) {
            if (domNode.onCardVisible) {
                domNode.onCardVisible();
            }
            this._emitStartupEvents(domNode.skipEmitContentEvents);
        },
        _emitStartupEvents: function (skipEmitContentEvents) {
            if (!this._startupEventsEmitted) {
                if (window.startupCacheEventsSent) {
                    window.performance.mark('contentInteractive');
                } else {
                    window.performance.mark('navigationLoaded');
                }
                window.performance.mark('navigationInteractive');
                if (!skipEmitContentEvents) {
                    evt.emit('metrics:contentDone');
                }
                this._startupEventsEmitted = true;
            }
        },
        eatEventsUntilNextCard: function () {
            this._eatingEventsUntilNextCard = true;
        },
        stopEatingEvents: function () {
            this._eatingEventsUntilNextCard = false;
        },
        assertNoCards: function () {
            if (this._cardStack.length) {
                throw new Error('There are ' + this._cardStack.length + ' cards but' + ' there should be ZERO');
            }
        }
    };
    return cards;
});
define('array', ['require'], function (require) {
    var array = {
        indexOfGeneric: function (array, callback, thisObject) {
            var result = -1;
            array.some(function (value, index) {
                if (callback.call(thisObject, value)) {
                    result = index;
                    return true;
                }
            });
            return result;
        }
    };
    return array;
});
define('header_cursor', [
    'require',
    'array',
    'evt'
], function (require) {
    var array = require('array'), evt = require('evt');
    function makeListener(type, obj) {
        return function () {
            var args = Array.slice(arguments);
            this.emit.apply(this, ['messages_' + type].concat(args));
        }.bind(obj);
    }
    function HeaderCursor(model) {
        evt.Emitter.call(this);
        this.model = model;
        this.onLatestFolder = this.onLatestFolder.bind(this);
        this.searchMode = 'nonsearch';
    }
    HeaderCursor.prototype = evt.mix({
        currentMessage: null,
        messagesSlice: null,
        expectingMessageSuid: null,
        sliceEvents: [
            'splice',
            'change',
            'status',
            'remove',
            'complete'
        ],
        _inited: false,
        init: function () {
            this._inited = true;
            this.on('messages_splice', this.onMessagesSplice.bind(this));
            this.on('messages_remove', this.onMessagesSpliceRemove.bind(this));
            this.on('messages_complete', function () {
                if (this.messagesSlice) {
                    this.messagesSlice.oncomplete = makeListener('complete', this);
                }
            }.bind(this));
            this.model.latest('folder', this.onLatestFolder);
        },
        advance: function (direction) {
            var index = this.indexOfMessageById(this.currentMessage.header.id);
            switch (direction) {
            case 'previous':
                index -= 1;
                break;
            case 'next':
                index += 1;
                break;
            }
            var messages = this.messagesSlice.items;
            if (index < 0 || index >= messages.length) {
                return;
            }
            this.setCurrentMessageByIndex(index);
        },
        setCurrentMessageBySuid: function (messageSuid) {
            this.expectingMessageSuid = messageSuid;
            this.checkExpectingMessageSuid();
        },
        checkExpectingMessageSuid: function (eventIfNotFound) {
            var messageSuid = this.expectingMessageSuid;
            var model = this.model;
            if (!messageSuid || !model.folder || model.folder.type !== 'inbox') {
                return;
            }
            var index = this.indexOfMessageById(messageSuid);
            if (index > -1) {
                this.expectingMessageSuid = null;
                return this.setCurrentMessageByIndex(index);
            }
            if (eventIfNotFound) {
                console.error('header_cursor could not find messageSuid ' + messageSuid + ', emitting messageSuidNotFound');
                this.emit('messageSuidNotFound', messageSuid);
            }
        },
        setCurrentMessage: function (header) {
            if (!header) {
                return;
            }
            this.setCurrentMessageByIndex(this.indexOfMessageById(header.id));
        },
        setCurrentMessageByIndex: function (index) {
            var messages = this.messagesSlice.items;
            if (index === -1 || index > messages.length - 1) {
                return;
            }
            var header = messages[index];
            if ('header' in header) {
                header = header.header;
            }
            var currentMessage = new CurrentMessage(header, {
                hasPrevious: index !== 0,
                hasNext: index !== messages.length - 1
            });
            this.emit('currentMessage', currentMessage, index);
            this.currentMessage = currentMessage;
        },
        indexOfMessageById: function (id) {
            var messages = this.messagesSlice && this.messagesSlice.items || [];
            return array.indexOfGeneric(messages, function (message) {
                var other = 'header' in message ? message.header.id : message.id;
                return other === id;
            });
        },
        onLatestFolder: function (folder) {
            if (!this.model.foldersSlice) {
                return;
            }
            this.freshMessagesSlice();
        },
        startSearch: function (phrase, whatToSearch) {
            this.searchMode = 'search';
            this.bindToSlice(this.model.api.searchFolderMessages(this.model.folder, phrase, whatToSearch));
        },
        endSearch: function () {
            this.resetMessageSlice();
            this.searchMode = 'nonsearch';
            this.freshMessagesSlice();
        },
        freshMessagesSlice: function () {
            this.bindToSlice(this.model.api.viewFolderMessages(this.model.folder));
        },
        bindToSlice: function (messagesSlice) {
            this.resetMessageSlice();
            this.messagesSlice = messagesSlice;
            this.sliceEvents.forEach(function (type) {
                messagesSlice['on' + type] = makeListener(type, this);
            }.bind(this));
        },
        onMessagesSplice: function (index, howMany, addedItems, requested, moreExpected) {
            if (!this.messagesSlice) {
                return;
            }
            if (this.messagesSlice.atTop && this.expectingMessageSuid && this.messagesSlice.items && this.messagesSlice.items.length) {
                this.checkExpectingMessageSuid(true);
            }
        },
        onMessagesSpliceRemove: function (removedHeader, removedFromIndex) {
            if (this.currentMessage !== removedHeader) {
                return this.setCurrentMessage(this.currentMessage);
            }
            var messages = this.messagesSlice.items;
            if (messages.length === 0) {
                return this.currentMessage = null;
            }
            var index = Math.min(removedFromIndex, messages.length - 1);
            var message = this.messagesSlice.items[index];
            this.setCurrentMessage(message);
        },
        resetMessageSlice: function () {
            if (this.messagesSlice) {
                this.messagesSlice.die();
                this.messagesSlice = null;
            }
            this.currentMessage = null;
        },
        die: function () {
            this.model.removeListener('folder', this.onLatestFolder);
            this.resetMessageSlice();
        }
    });
    var oldOn = HeaderCursor.prototype.on;
    HeaderCursor.prototype.on = function () {
        if (!this._inited) {
            this.init();
        }
        return oldOn.apply(this, arguments);
    };
    function CurrentMessage(header, siblings) {
        this.header = header;
        this.siblings = siblings;
    }
    CurrentMessage.prototype = {
        header: null,
        siblings: null
    };
    HeaderCursor.CurrentMessage = CurrentMessage;
    return HeaderCursor;
});
(function (exports) {
    'use strict';
    const HEADER_SIZES = [
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23
    ];
    var FontSizeUtils = {
        _cachedContexts: {},
        _getCachedContext: function (fontSize, fontFamily, fontStyle) {
            fontStyle = fontStyle || 'italic';
            var cache = this._cachedContexts;
            var ctx = cache[fontSize] && cache[fontSize][fontFamily] ? cache[fontSize][fontFamily][fontStyle] : null;
            if (!ctx) {
                var canvas = document.createElement('canvas');
                canvas.setAttribute('moz-opaque', 'true');
                canvas.setAttribute('width', '1');
                canvas.setAttribute('height', '1');
                ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.font = fontStyle + ' ' + fontSize + 'px ' + fontFamily;
                if (!cache[fontSize]) {
                    cache[fontSize] = {};
                }
                if (!cache[fontSize][fontFamily]) {
                    cache[fontSize][fontFamily] = {};
                }
                cache[fontSize][fontFamily][fontStyle] = ctx;
            }
            return ctx;
        },
        resetCache: function () {
            this._cachedContexts = {};
        },
        _textChangeObserver: null,
        _handleTextChanges: function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                this._reformatHeaderText(mutations[i].target);
            }
        },
        _getTextChangeObserver: function () {
            if (!this._textChangeObserver) {
                this._textChangeObserver = new MutationObserver(this._handleTextChanges.bind(this));
            }
            return this._textChangeObserver;
        },
        _observeHeaderChanges: function (element) {
            var observer = this._getTextChangeObserver();
            observer.observe(element, { childList: true });
        },
        _reformatHeaderText: function (header) {
            if (header.textContent.trim() === '') {
                return;
            }
            this.resetCentering(header);
            var style = this.getStyleProperties(header);
            style.textWidth = this.autoResizeElement(header, style);
            this.centerTextToScreen(header, style);
        },
        _registerHeadersInSubtree: function (domNode) {
            if (!domNode) {
                return;
            }
            var headers = domNode.querySelectorAll('header > h1');
            for (var i = 0; i < headers.length; i++) {
                window.requestAnimationFrame(function (header) {
                    this._reformatHeaderText(header);
                    this._observeHeaderChanges(header);
                }.bind(this, headers[i]));
            }
        },
        getFontWidth: function (string, fontSize, fontFamily, fontStyle) {
            var ctx = this._getCachedContext(fontSize, fontFamily, fontStyle);
            return ctx.measureText(string).width;
        },
        getMaxFontSizeInfo: function (string, allowedSizes, fontFamily, maxWidth) {
            var fontSize;
            var resultWidth;
            var i = allowedSizes.length - 1;
            do {
                fontSize = allowedSizes[i];
                resultWidth = this.getFontWidth(string, fontSize, fontFamily);
                i--;
            } while (resultWidth > maxWidth && i >= 0);
            return {
                fontSize: fontSize,
                overflow: resultWidth > maxWidth,
                textWidth: resultWidth
            };
        },
        _overflowCountCache: -1,
        getOverflowCount: function (string, fontSize, fontFamily, maxWidth) {
            var substring;
            var resultWidth;
            var overflowCount = -1;
            if (string.length > this._overflowCountCache) {
                substring = string.substr(0, string.length - this._overflowCountCache);
                resultWidth = this.getFontWidth(substring, fontSize, fontFamily);
                if (resultWidth > maxWidth) {
                    overflowCount = this._overflowCountCache;
                }
            }
            do {
                overflowCount++;
                substring = string.substr(0, string.length - overflowCount);
                resultWidth = this.getFontWidth(substring, fontSize, fontFamily);
            } while (substring.length > 0 && resultWidth > maxWidth);
            this._overflowCountCache = overflowCount;
            return overflowCount;
        },
        getAllowedSizes: function (element) {
            if (element.tagName === 'H1' && element.parentNode.tagName === 'HEADER') {
                return HEADER_SIZES;
            }
            return [];
        },
        getContentWidth: function (style) {
            var width = parseInt(style.width, 10);
            if (style.boxSizing === 'border-box') {
                width -= parseInt(style.paddingRight, 10) + parseInt(style.paddingLeft, 10);
            }
            return width;
        },
        getStyleProperties: function (element) {
            var style = window.getComputedStyle(element);
            var contentWidth = this.getContentWidth(style);
            if (isNaN(contentWidth)) {
                contentWidth = 0;
            }
            return {
                fontFamily: style.fontFamily,
                contentWidth: contentWidth,
                paddingRight: parseInt(style.paddingRight, 10),
                paddingLeft: parseInt(style.paddingLeft, 10),
                offsetLeft: element.offsetLeft
            };
        },
        autoResizeElement: function (element, styleOptions) {
            var allowedSizes = this.getAllowedSizes(element);
            if (allowedSizes.length === 0) {
                return 0;
            }
            var contentWidth = styleOptions.contentWidth || this.getContentWidth(element);
            var fontFamily = styleOptions.fontFamily || getComputedStyle(element).fontFamily;
            var info = this.getMaxFontSizeInfo(element.textContent.trim(), allowedSizes, fontFamily, contentWidth);
            element.style.fontSize = info.fontSize + 'px';
            return info.textWidth;
        },
        resetCentering: function (element) {
            element.style.marginLeft = element.style.marginRight = '0';
        },
        centerTextToScreen: function (element, styleOptions) {
            var minHeaderWidth = styleOptions.textWidth + styleOptions.paddingRight + styleOptions.paddingLeft;
            var sideSpaceLeft = styleOptions.offsetLeft;
            var sideSpaceRight = this.getWindowWidth() - sideSpaceLeft - styleOptions.contentWidth - styleOptions.paddingRight - styleOptions.paddingLeft;
            if (sideSpaceLeft === sideSpaceRight) {
                return;
            }
            var margin = Math.max(sideSpaceLeft, sideSpaceRight);
            if (minHeaderWidth + margin * 2 < this.getWindowWidth() - 1) {
                element.style.marginLeft = element.style.marginRight = margin + 'px';
            }
        },
        _initHeaderFormatting: function () {
            if (navigator.mozL10n) {
                navigator.mozL10n.once(function () {
                    this._registerHeadersInSubtree(document.body);
                }.bind(this));
            } else {
                this._registerHeadersInSubtree(document.body);
            }
        },
        init: function () {
            window.addEventListener('lazyload', function (evt) {
                this._registerHeadersInSubtree(evt.detail);
            }.bind(this));
            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', function () {
                    this._initHeaderFormatting();
                }.bind(this));
            } else {
                this._initHeaderFormatting();
            }
        },
        getWindowWidth: function () {
            return window.innerWidth;
        }
    };
    FontSizeUtils.init();
    exports.FontSizeUtils = FontSizeUtils;
}(this));
define('font_size_utils', function () {
});
define('metrics', [
    'require',
    'evt'
], function (require) {
    var evt = require('evt'), apiDone = false, contentDone = false;
    function checkAppLoaded() {
        if (apiDone && contentDone) {
            window.performance.mark('fullyLoaded');
        }
    }
    evt.once('metrics:apiDone', function onApiDone() {
        apiDone = true;
        checkAppLoaded();
    });
    evt.once('metrics:contentDone', function () {
        contentDone = true;
        if (!window.startupCacheEventsSent) {
            window.performance.mark('visuallyLoaded');
            window.performance.mark('contentInteractive');
        }
        checkAppLoaded();
    });
});
define('wake_locks', [
    'require',
    'evt'
], function (require) {
    'use strict';
    var lockTimeouts = {}, evt = require('evt'), allLocks = {}, dataOps = {}, dataOpsTimeoutId = 0, maxLockInterval = 45000, dataOpsTimeout = 5000;
    function close() {
        dataOps = {};
        dataOpsTimeoutId = 0;
        if (document.hidden) {
            console.log('email: cronsync wake locks expired, force closing app');
            window.close();
        } else {
            console.log('email: cronsync wake locks expired, but app visible, ' + 'not force closing');
            Object.keys(allLocks).forEach(function (accountKey) {
                clearLocks(accountKey);
            });
        }
    }
    function closeIfNoDataOps() {
        var dataOpsKeys = Object.keys(dataOps);
        if (!dataOpsKeys.length) {
            return close();
        }
        console.log('email: cronsync wake lock force shutdown waiting on email ' + 'data operations: ' + dataOpsKeys.join(', '));
        dataOpsTimeoutId = setTimeout(close, dataOpsTimeout);
    }
    evt.on('uiDataOperationStart', function (dataId) {
        dataOps[dataId] = true;
    });
    evt.on('uiDataOperationStop', function (dataId) {
        delete dataOps[dataId];
        if (dataOpsTimeoutId && !Object.keys(dataOps).length) {
            clearTimeout(dataOpsTimeoutId);
            close();
        }
    });
    function clearLocks(accountKey) {
        console.log('email: clearing wake locks for "' + accountKey + '"');
        var lockTimeoutId = lockTimeouts[accountKey];
        if (lockTimeoutId) {
            clearTimeout(lockTimeoutId);
        }
        lockTimeouts[accountKey] = 0;
        var locks = allLocks[accountKey];
        allLocks[accountKey] = null;
        if (locks) {
            locks.forEach(function (lock) {
                lock.unlock();
            });
        }
    }
    function makeAccountKey(accountIds) {
        return 'id' + accountIds.join(' ');
    }
    function onCronStop(accountIds) {
        clearLocks(makeAccountKey(accountIds));
    }
    evt.on('cronSyncWakeLocks', function (accountKey, locks) {
        if (lockTimeouts[accountKey]) {
            clearLocks(accountKey);
        }
        allLocks[accountKey] = locks;
        lockTimeouts[accountKey] = setTimeout(closeIfNoDataOps, maxLockInterval);
    });
    evt.on('cronSyncStop', onCronStop);
});
define('mail_app', [
    'require',
    'exports',
    'module',
    'l10n!',
    'activity_composer_data',
    'cards',
    'evt',
    'model_create',
    'header_cursor',
    'html_cache',
    'font_size_utils',
    'metrics',
    'wake_locks'
], function (require, exports, module) {
    var mozL10n = require('l10n!'), activityComposerData = require('activity_composer_data'), cards = require('cards'), evt = require('evt'), model = require('model_create').defaultModel, HeaderCursor = require('header_cursor'), htmlCache = require('html_cache'), waitingRawActivity, activityCallback;
    require('font_size_utils');
    require('metrics');
    require('wake_locks');
    var started = false;
    function pushStartCard(id, addedArgs) {
        var args = { model: model };
        if (addedArgs) {
            Object.keys(addedArgs).forEach(function (key) {
                args[key] = addedArgs[key];
            });
        }
        if (!started) {
            var cachedNode = cards._cardsNode.children[0];
            if (cachedNode && id === htmlCache.nodeToKey(cachedNode)) {
                mozL10n.translateFragment(cachedNode);
                args.cachedNode = cachedNode;
            }
            document.body.classList.add('content-visible');
        }
        cards.pushCard(id, 'immediate', args);
        started = true;
    }
    document.addEventListener('visibilitychange', function onVisibilityChange() {
        if (!document.hidden && !started && startupData && startupData.entry === 'alarm') {
            pushStartCard('message_list');
        }
    }, false);
    function isCurrentCardMessageList() {
        var cardType = cards.getCurrentCardType();
        return cardType && cardType === 'message_list';
    }
    evt.on('addAccount', function () {
        cards.removeAllCards();
        pushStartCard('setup_account_info', { allowBack: true });
    });
    function resetApp() {
        activityCallback = waitingRawActivity = undefined;
        cards.removeAllCards();
        model.init(false, function () {
            var cardId = model.hasAccount() ? 'message_list' : 'setup_account_info';
            pushStartCard(cardId);
        });
    }
    evt.on('accountDeleted', resetApp);
    evt.on('resetApp', resetApp);
    evt.on('setupAccountCanceled', function (fromCard) {
        if (waitingRawActivity) {
            waitingRawActivity.postError('cancelled');
        }
        if (!model.foldersSlice) {
            evt.emit('resetApp');
        } else {
            cards.removeCardAndSuccessors(fromCard, 'animate', 1);
        }
    });
    evt.on('showLatestAccount', function () {
        cards.removeAllCards();
        model.latestOnce('acctsSlice', function (acctsSlice) {
            var account = acctsSlice.items[acctsSlice.items.length - 1];
            model.changeAccount(account, function () {
                pushStartCard('message_list', {
                    onPushed: function () {
                        if (activityCallback) {
                            var activityCb = activityCallback;
                            activityCallback = null;
                            activityCb();
                            return true;
                        }
                        return false;
                    }
                });
            });
        });
    });
    evt.on('apiBadLogin', function (account, problem, whichSide) {
        switch (problem) {
        case 'bad-user-or-pass':
            cards.pushCard('setup_fix_password', 'animate', {
                account: account,
                whichSide: whichSide,
                restoreCard: cards.activeCardIndex
            }, 'right');
            break;
        case 'imap-disabled':
        case 'pop3-disabled':
            cards.pushCard('setup_fix_gmail', 'animate', {
                account: account,
                restoreCard: cards.activeCardIndex
            }, 'right');
            break;
        case 'needs-app-pass':
            cards.pushCard('setup_fix_gmail_twofactor', 'animate', {
                account: account,
                restoreCard: cards.activeCardIndex
            }, 'right');
            break;
        case 'needs-oauth-reauth':
            cards.pushCard('setup_fix_oauth2', 'animate', {
                account: account,
                restoreCard: cards.activeCardIndex
            }, 'right');
            break;
        }
    });
    cards.init();
    if (!model.inited) {
        model.init();
    }
    var startupData = globalOnAppMessage({
        activity: function (rawActivity) {
            if (!isCurrentCardMessageList()) {
                cards.removeAllCards();
            }
            function activityCompose() {
                var cardArgs = {
                    activity: rawActivity,
                    composerData: activityComposerData(rawActivity)
                };
                pushStartCard('compose', cardArgs);
            }
            if (globalOnAppMessage.hasAccount()) {
                activityCompose();
            } else {
                activityCallback = activityCompose;
                waitingRawActivity = rawActivity;
                pushStartCard('setup_account_info', {
                    allowBack: true,
                    launchedFromActivity: true
                });
            }
        },
        notification: function (data) {
            data = data || {};
            var type = data.type || '';
            var folderType = data.folderType || 'inbox';
            model.latestOnce('foldersSlice', function latestFolderSlice() {
                function onCorrectFolder() {
                    if (!isCurrentCardMessageList()) {
                        cards.removeAllCards();
                    }
                    if (type === 'message_list') {
                        pushStartCard('message_list', {});
                    } else if (type === 'message_reader') {
                        var headerCursor = new HeaderCursor(model);
                        headerCursor.setCurrentMessageBySuid(data.messageSuid);
                        pushStartCard(type, {
                            messageSuid: data.messageSuid,
                            headerCursor: headerCursor
                        });
                    } else {
                        console.error('unhandled notification type: ' + type);
                    }
                }
                var acctsSlice = model.acctsSlice, accountId = data.accountId;
                if (model.account.id === accountId) {
                    return model.selectFirstFolderWithType(folderType, onCorrectFolder);
                } else {
                    var newAccount;
                    acctsSlice.items.some(function (account) {
                        if (account.id === accountId) {
                            newAccount = account;
                            return true;
                        }
                    });
                    if (newAccount) {
                        model.changeAccount(newAccount, function () {
                            model.selectFirstFolderWithType(folderType, onCorrectFolder);
                        });
                    }
                }
            });
        }
    });
    console.log('startupData: ' + JSON.stringify(startupData, null, '  '));
    if (startupData.entry === 'default' || startupData.entry === 'alarm' && !document.hidden) {
        pushStartCard(startupData.view);
    }
});
if (typeof TestUrlResolver === 'undefined') {
    requirejs.config({
        waitSeconds: 0,
        baseUrl: 'js',
        paths: {
            l10nbase: '../shared/js/l10n',
            moz_intl: '../shared/js/moz_intl',
            style: '../style',
            shared: '../shared'
        },
        map: { '*': { 'api': 'ext/main-frame-setup' } },
        shim: {
            moz_intl: {
                deps: ['l10nbase'],
                exports: 'mozIntl'
            },
            'shared/js/mime_mapper': { exports: 'MimeMapper' },
            'shared/js/notification_helper': { exports: 'NotificationHelper' },
            'shared/js/accessibility_helper': { exports: 'AccessibilityHelper' },
            'shared/js/gesture_detector': { exports: 'GestureDetector' }
        },
        config: {
            template: {
                tagToId: function (tag) {
                    return tag.replace(/^cards-/, 'cards/').replace(/^lst-/, 'cards/lst/').replace(/^msg-/, 'cards/msg/').replace(/^cmp-/, 'cards/cmp/').replace(/-/g, '_');
                }
            },
            element: {
                idToTag: function (id) {
                    return id.toLowerCase().replace(/^cards\/lst\//, 'lst-').replace(/^cards\/msg\//, 'msg-').replace(/^cards\/cmp\//, 'cmp-').replace(/[^a-z]/g, '-');
                }
            }
        },
        definePrim: 'prim'
    });
}
if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
}
if (window.startupOnModelLoaded) {
    requirejs([
        'console_hook',
        'model_create'
    ], function (hook, modelCreate) {
        var model = modelCreate.defaultModel;
        model.init();
        window.startupOnModelLoaded(model, function () {
            require(['mail_app']);
        });
    });
} else {
    requirejs([
        'console_hook',
        'mail_app'
    ]);
}
;
define('config', function () {
});
(function (window, undefined) {
    'use strict';
    function L10nError(message, id, loc) {
        this.name = 'L10nError';
        this.message = message;
        this.id = id;
        this.loc = loc;
    }
    L10nError.prototype = Object.create(Error.prototype);
    L10nError.prototype.constructor = L10nError;
    var io = {
        _load: function (type, url, callback, sync) {
            var xhr = new XMLHttpRequest();
            var needParse;
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType(type);
            }
            xhr.open('GET', url, !sync);
            if (type === 'application/json') {
                if (sync) {
                    needParse = true;
                } else {
                    xhr.responseType = 'json';
                }
            }
            xhr.addEventListener('load', function io_onload(e) {
                if (e.target.status === 200 || e.target.status === 0) {
                    var res = e.target.response || e.target.responseText;
                    callback(null, needParse ? JSON.parse(res) : res);
                } else {
                    callback(new L10nError('Not found: ' + url));
                }
            });
            xhr.addEventListener('error', callback);
            xhr.addEventListener('timeout', callback);
            try {
                xhr.send(null);
            } catch (e) {
                if (e.name === 'NS_ERROR_FILE_NOT_FOUND') {
                    callback(new L10nError('Not found: ' + url));
                } else {
                    throw e;
                }
            }
        },
        load: function (url, callback, sync) {
            return io._load('text/plain', url, callback, sync);
        },
        loadJSON: function (url, callback, sync) {
            return io._load('application/json', url, callback, sync);
        }
    };
    function EventEmitter() {
    }
    EventEmitter.prototype.emit = function ee_emit() {
        if (!this._listeners) {
            return;
        }
        var args = Array.prototype.slice.call(arguments);
        var type = args.shift();
        if (!this._listeners[type]) {
            return;
        }
        var typeListeners = this._listeners[type].slice();
        for (var i = 0; i < typeListeners.length; i++) {
            typeListeners[i].apply(this, args);
        }
    };
    EventEmitter.prototype.addEventListener = function ee_add(type, listener) {
        if (!this._listeners) {
            this._listeners = {};
        }
        if (!(type in this._listeners)) {
            this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
    };
    EventEmitter.prototype.removeEventListener = function ee_rm(type, listener) {
        if (!this._listeners) {
            return;
        }
        var typeListeners = this._listeners[type];
        var pos = typeListeners.indexOf(listener);
        if (pos === -1) {
            return;
        }
        typeListeners.splice(pos, 1);
    };
    function getPluralRule(lang) {
        var locales2rules = {
            'af': 3,
            'ak': 4,
            'am': 4,
            'ar': 1,
            'asa': 3,
            'az': 0,
            'be': 11,
            'bem': 3,
            'bez': 3,
            'bg': 3,
            'bh': 4,
            'bm': 0,
            'bn': 3,
            'bo': 0,
            'br': 20,
            'brx': 3,
            'bs': 11,
            'ca': 3,
            'cgg': 3,
            'chr': 3,
            'cs': 12,
            'cy': 17,
            'da': 3,
            'de': 3,
            'dv': 3,
            'dz': 0,
            'ee': 3,
            'el': 3,
            'en': 3,
            'eo': 3,
            'es': 3,
            'et': 3,
            'eu': 3,
            'fa': 0,
            'ff': 5,
            'fi': 3,
            'fil': 4,
            'fo': 3,
            'fr': 5,
            'fur': 3,
            'fy': 3,
            'ga': 8,
            'gd': 24,
            'gl': 3,
            'gsw': 3,
            'gu': 3,
            'guw': 4,
            'gv': 23,
            'ha': 3,
            'haw': 3,
            'he': 2,
            'hi': 4,
            'hr': 11,
            'hu': 0,
            'id': 0,
            'ig': 0,
            'ii': 0,
            'is': 3,
            'it': 3,
            'iu': 7,
            'ja': 0,
            'jmc': 3,
            'jv': 0,
            'ka': 0,
            'kab': 5,
            'kaj': 3,
            'kcg': 3,
            'kde': 0,
            'kea': 0,
            'kk': 3,
            'kl': 3,
            'km': 0,
            'kn': 0,
            'ko': 0,
            'ksb': 3,
            'ksh': 21,
            'ku': 3,
            'kw': 7,
            'lag': 18,
            'lb': 3,
            'lg': 3,
            'ln': 4,
            'lo': 0,
            'lt': 10,
            'lv': 6,
            'mas': 3,
            'mg': 4,
            'mk': 16,
            'ml': 3,
            'mn': 3,
            'mo': 9,
            'mr': 3,
            'ms': 0,
            'mt': 15,
            'my': 0,
            'nah': 3,
            'naq': 7,
            'nb': 3,
            'nd': 3,
            'ne': 3,
            'nl': 3,
            'nn': 3,
            'no': 3,
            'nr': 3,
            'nso': 4,
            'ny': 3,
            'nyn': 3,
            'om': 3,
            'or': 3,
            'pa': 3,
            'pap': 3,
            'pl': 13,
            'ps': 3,
            'pt': 3,
            'rm': 3,
            'ro': 9,
            'rof': 3,
            'ru': 11,
            'rwk': 3,
            'sah': 0,
            'saq': 3,
            'se': 7,
            'seh': 3,
            'ses': 0,
            'sg': 0,
            'sh': 11,
            'shi': 19,
            'sk': 12,
            'sl': 14,
            'sma': 7,
            'smi': 7,
            'smj': 7,
            'smn': 7,
            'sms': 7,
            'sn': 3,
            'so': 3,
            'sq': 3,
            'sr': 11,
            'ss': 3,
            'ssy': 3,
            'st': 3,
            'sv': 3,
            'sw': 3,
            'syr': 3,
            'ta': 3,
            'te': 3,
            'teo': 3,
            'th': 0,
            'ti': 4,
            'tig': 3,
            'tk': 3,
            'tl': 4,
            'tn': 3,
            'to': 0,
            'tr': 0,
            'ts': 3,
            'tzm': 22,
            'uk': 11,
            'ur': 3,
            've': 3,
            'vi': 0,
            'vun': 3,
            'wa': 4,
            'wae': 3,
            'wo': 0,
            'xh': 3,
            'xog': 3,
            'yo': 0,
            'zh': 0,
            'zu': 3
        };
        function isIn(n, list) {
            return list.indexOf(n) !== -1;
        }
        function isBetween(n, start, end) {
            return typeof n === typeof start && start <= n && n <= end;
        }
        var pluralRules = {
            '0': function () {
                return 'other';
            },
            '1': function (n) {
                if (isBetween(n % 100, 3, 10)) {
                    return 'few';
                }
                if (n === 0) {
                    return 'zero';
                }
                if (isBetween(n % 100, 11, 99)) {
                    return 'many';
                }
                if (n === 2) {
                    return 'two';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '2': function (n) {
                if (n !== 0 && n % 10 === 0) {
                    return 'many';
                }
                if (n === 2) {
                    return 'two';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '3': function (n) {
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '4': function (n) {
                if (isBetween(n, 0, 1)) {
                    return 'one';
                }
                return 'other';
            },
            '5': function (n) {
                if (isBetween(n, 0, 2) && n !== 2) {
                    return 'one';
                }
                return 'other';
            },
            '6': function (n) {
                if (n === 0) {
                    return 'zero';
                }
                if (n % 10 === 1 && n % 100 !== 11) {
                    return 'one';
                }
                return 'other';
            },
            '7': function (n) {
                if (n === 2) {
                    return 'two';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '8': function (n) {
                if (isBetween(n, 3, 6)) {
                    return 'few';
                }
                if (isBetween(n, 7, 10)) {
                    return 'many';
                }
                if (n === 2) {
                    return 'two';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '9': function (n) {
                if (n === 0 || n !== 1 && isBetween(n % 100, 1, 19)) {
                    return 'few';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '10': function (n) {
                if (isBetween(n % 10, 2, 9) && !isBetween(n % 100, 11, 19)) {
                    return 'few';
                }
                if (n % 10 === 1 && !isBetween(n % 100, 11, 19)) {
                    return 'one';
                }
                return 'other';
            },
            '11': function (n) {
                if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
                    return 'few';
                }
                if (n % 10 === 0 || isBetween(n % 10, 5, 9) || isBetween(n % 100, 11, 14)) {
                    return 'many';
                }
                if (n % 10 === 1 && n % 100 !== 11) {
                    return 'one';
                }
                return 'other';
            },
            '12': function (n) {
                if (isBetween(n, 2, 4)) {
                    return 'few';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '13': function (n) {
                if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
                    return 'few';
                }
                if (n !== 1 && isBetween(n % 10, 0, 1) || isBetween(n % 10, 5, 9) || isBetween(n % 100, 12, 14)) {
                    return 'many';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '14': function (n) {
                if (isBetween(n % 100, 3, 4)) {
                    return 'few';
                }
                if (n % 100 === 2) {
                    return 'two';
                }
                if (n % 100 === 1) {
                    return 'one';
                }
                return 'other';
            },
            '15': function (n) {
                if (n === 0 || isBetween(n % 100, 2, 10)) {
                    return 'few';
                }
                if (isBetween(n % 100, 11, 19)) {
                    return 'many';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '16': function (n) {
                if (n % 10 === 1 && n !== 11) {
                    return 'one';
                }
                return 'other';
            },
            '17': function (n) {
                if (n === 3) {
                    return 'few';
                }
                if (n === 0) {
                    return 'zero';
                }
                if (n === 6) {
                    return 'many';
                }
                if (n === 2) {
                    return 'two';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '18': function (n) {
                if (n === 0) {
                    return 'zero';
                }
                if (isBetween(n, 0, 2) && n !== 0 && n !== 2) {
                    return 'one';
                }
                return 'other';
            },
            '19': function (n) {
                if (isBetween(n, 2, 10)) {
                    return 'few';
                }
                if (isBetween(n, 0, 1)) {
                    return 'one';
                }
                return 'other';
            },
            '20': function (n) {
                if ((isBetween(n % 10, 3, 4) || n % 10 === 9) && !(isBetween(n % 100, 10, 19) || isBetween(n % 100, 70, 79) || isBetween(n % 100, 90, 99))) {
                    return 'few';
                }
                if (n % 1000000 === 0 && n !== 0) {
                    return 'many';
                }
                if (n % 10 === 2 && !isIn(n % 100, [
                        12,
                        72,
                        92
                    ])) {
                    return 'two';
                }
                if (n % 10 === 1 && !isIn(n % 100, [
                        11,
                        71,
                        91
                    ])) {
                    return 'one';
                }
                return 'other';
            },
            '21': function (n) {
                if (n === 0) {
                    return 'zero';
                }
                if (n === 1) {
                    return 'one';
                }
                return 'other';
            },
            '22': function (n) {
                if (isBetween(n, 0, 1) || isBetween(n, 11, 99)) {
                    return 'one';
                }
                return 'other';
            },
            '23': function (n) {
                if (isBetween(n % 10, 1, 2) || n % 20 === 0) {
                    return 'one';
                }
                return 'other';
            },
            '24': function (n) {
                if (isBetween(n, 3, 10) || isBetween(n, 13, 19)) {
                    return 'few';
                }
                if (isIn(n, [
                        2,
                        12
                    ])) {
                    return 'two';
                }
                if (isIn(n, [
                        1,
                        11
                    ])) {
                    return 'one';
                }
                return 'other';
            }
        };
        var index = locales2rules[lang.replace(/-.*$/, '')];
        if (!(index in pluralRules)) {
            return function () {
                return 'other';
            };
        }
        return pluralRules[index];
    }
    var MAX_PLACEABLES = 100;
    var PropertiesParser = {
        patterns: null,
        entryIds: null,
        init: function () {
            this.patterns = {
                comment: /^\s*#|^\s*$/,
                entity: /^([^=\s]+)\s*=\s*(.*)$/,
                multiline: /[^\\]\\$/,
                index: /\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,
                unicode: /\\u([0-9a-fA-F]{1,4})/g,
                entries: /[^\r\n]+/g,
                controlChars: /\\([\\\n\r\t\b\f\{\}\"\'])/g,
                placeables: /\{\{\s*([^\s]*?)\s*\}\}/
            };
        },
        parse: function (ctx, source) {
            if (!this.patterns) {
                this.init();
            }
            var ast = [];
            this.entryIds = Object.create(null);
            var entries = source.match(this.patterns.entries);
            if (!entries) {
                return ast;
            }
            for (var i = 0; i < entries.length; i++) {
                var line = entries[i];
                if (this.patterns.comment.test(line)) {
                    continue;
                }
                while (this.patterns.multiline.test(line) && i < entries.length) {
                    line = line.slice(0, -1) + entries[++i].trim();
                }
                var entityMatch = line.match(this.patterns.entity);
                if (entityMatch) {
                    try {
                        this.parseEntity(entityMatch[1], entityMatch[2], ast);
                    } catch (e) {
                        if (ctx) {
                            ctx._emitter.emit('parseerror', e);
                        } else {
                            throw e;
                        }
                    }
                }
            }
            return ast;
        },
        parseEntity: function (id, value, ast) {
            var name, key;
            var pos = id.indexOf('[');
            if (pos !== -1) {
                name = id.substr(0, pos);
                key = id.substring(pos + 1, id.length - 1);
            } else {
                name = id;
                key = null;
            }
            var nameElements = name.split('.');
            if (nameElements.length > 2) {
                throw new L10nError('Error in ID: "' + name + '".' + ' Nested attributes are not supported.');
            }
            var attr;
            if (nameElements.length > 1) {
                name = nameElements[0];
                attr = nameElements[1];
                if (attr[0] === '$') {
                    throw new L10nError('Attribute can\'t start with "$"', id);
                }
            } else {
                attr = null;
            }
            this.setEntityValue(name, attr, key, this.unescapeString(value), ast);
        },
        setEntityValue: function (id, attr, key, rawValue, ast) {
            var pos, v;
            var value = rawValue.indexOf('{{') > -1 ? this.parseString(rawValue) : rawValue;
            if (attr) {
                pos = this.entryIds[id];
                if (pos === undefined) {
                    v = { $i: id };
                    if (key) {
                        v[attr] = {};
                        v[attr][key] = value;
                    } else {
                        v[attr] = value;
                    }
                    ast.push(v);
                    this.entryIds[id] = ast.length - 1;
                    return;
                }
                if (key) {
                    if (typeof ast[pos][attr] === 'string') {
                        ast[pos][attr] = {
                            $x: this.parseIndex(ast[pos][attr]),
                            $v: {}
                        };
                    }
                    ast[pos][attr].$v[key] = value;
                    return;
                }
                ast[pos][attr] = value;
                return;
            }
            if (key) {
                pos = this.entryIds[id];
                if (pos === undefined) {
                    v = {};
                    v[key] = value;
                    ast.push({
                        $i: id,
                        $v: v
                    });
                    this.entryIds[id] = ast.length - 1;
                    return;
                }
                if (typeof ast[pos].$v === 'string') {
                    ast[pos].$x = this.parseIndex(ast[pos].$v);
                    ast[pos].$v = {};
                }
                ast[pos].$v[key] = value;
                return;
            }
            ast.push({
                $i: id,
                $v: value
            });
            this.entryIds[id] = ast.length - 1;
        },
        parseString: function (str) {
            var chunks = str.split(this.patterns.placeables);
            var complexStr = [];
            var len = chunks.length;
            var placeablesCount = (len - 1) / 2;
            if (placeablesCount >= MAX_PLACEABLES) {
                throw new L10nError('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES + ')');
            }
            for (var i = 0; i < chunks.length; i++) {
                if (chunks[i].length === 0) {
                    continue;
                }
                if (i % 2 === 1) {
                    complexStr.push({
                        t: 'idOrVar',
                        v: chunks[i]
                    });
                } else {
                    complexStr.push(chunks[i]);
                }
            }
            return complexStr;
        },
        unescapeString: function (str) {
            if (str.lastIndexOf('\\') !== -1) {
                str = str.replace(this.patterns.controlChars, '$1');
            }
            return str.replace(this.patterns.unicode, function (match, token) {
                return unescape('%u' + '0000'.slice(token.length) + token);
            });
        },
        parseIndex: function (str) {
            var match = str.match(this.patterns.index);
            if (!match) {
                throw new L10nError('Malformed index');
            }
            if (match[2]) {
                return [
                    {
                        t: 'idOrVar',
                        v: match[1]
                    },
                    match[2]
                ];
            } else {
                return [{
                        t: 'idOrVar',
                        v: match[1]
                    }];
            }
        }
    };
    var KNOWN_MACROS = ['plural'];
    var MAX_PLACEABLE_LENGTH = 2500;
    var rePlaceables = /\{\{\s*(.+?)\s*\}\}/g;
    var nonLatin1 = /[^\x01-\xFF]/;
    var FSI = '\u2068';
    var PDI = '\u2069';
    function createEntry(node, env) {
        var keys = Object.keys(node);
        if (typeof node.$v === 'string' && keys.length === 2) {
            return node.$v;
        }
        var attrs;
        for (var i = 0, key; key = keys[i]; i++) {
            if (key[0] === '$') {
                continue;
            }
            if (!attrs) {
                attrs = Object.create(null);
            }
            attrs[key] = createAttribute(node[key], env, node.$i + '.' + key);
        }
        return {
            id: node.$i,
            value: node.$v !== undefined ? node.$v : null,
            index: node.$x || null,
            attrs: attrs || null,
            env: env,
            dirty: false
        };
    }
    function createAttribute(node, env, id) {
        if (typeof node === 'string') {
            return node;
        }
        return {
            id: id,
            value: node.$v || (node !== undefined ? node : null),
            index: node.$x || null,
            env: env,
            dirty: false
        };
    }
    function format(args, entity) {
        if (typeof entity === 'string') {
            return [
                {},
                entity
            ];
        }
        if (entity.dirty) {
            throw new L10nError('Cyclic reference detected: ' + entity.id);
        }
        entity.dirty = true;
        var rv;
        try {
            rv = resolveValue({}, args, entity.env, entity.value, entity.index);
        } finally {
            entity.dirty = false;
        }
        return rv;
    }
    function resolveIdentifier(args, env, id) {
        if (KNOWN_MACROS.indexOf(id) > -1) {
            return [
                {},
                env['__' + id]
            ];
        }
        if (args && args.hasOwnProperty(id)) {
            if (typeof args[id] === 'string' || typeof args[id] === 'number' && !isNaN(args[id])) {
                return [
                    {},
                    args[id]
                ];
            } else {
                throw new L10nError('Arg must be a string or a number: ' + id);
            }
        }
        if (id in env && id !== '__proto__') {
            return format(args, env[id]);
        }
        throw new L10nError('Unknown reference: ' + id);
    }
    function subPlaceable(locals, args, env, id) {
        var res;
        try {
            res = resolveIdentifier(args, env, id);
        } catch (err) {
            return [
                { error: err },
                '{{ ' + id + ' }}'
            ];
        }
        var value = res[1];
        if (typeof value === 'number') {
            return res;
        }
        if (typeof value === 'string') {
            if (value.length >= MAX_PLACEABLE_LENGTH) {
                throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH + ')');
            }
            if (locals.contextIsNonLatin1 || value.match(nonLatin1)) {
                res[1] = FSI + value + PDI;
            }
            return res;
        }
        return [
            {},
            '{{ ' + id + ' }}'
        ];
    }
    function interpolate(locals, args, env, arr) {
        return arr.reduce(function (prev, cur) {
            if (typeof cur === 'string') {
                return [
                    prev[0],
                    prev[1] + cur
                ];
            } else if (cur.t === 'idOrVar') {
                var placeable = subPlaceable(locals, args, env, cur.v);
                return [
                    prev[0],
                    prev[1] + placeable[1]
                ];
            }
        }, [
            locals,
            ''
        ]);
    }
    function resolveSelector(args, env, expr, index) {
        var selectorName = index[0].v;
        var selector = resolveIdentifier(args, env, selectorName)[1];
        if (typeof selector !== 'function') {
            return selector;
        }
        var argValue = index[1] ? resolveIdentifier(args, env, index[1])[1] : undefined;
        if (selector === env.__plural) {
            if (argValue === 0 && 'zero' in expr) {
                return 'zero';
            }
            if (argValue === 1 && 'one' in expr) {
                return 'one';
            }
            if (argValue === 2 && 'two' in expr) {
                return 'two';
            }
        }
        return selector(argValue);
    }
    function resolveValue(locals, args, env, expr, index) {
        if (!expr) {
            return [
                locals,
                expr
            ];
        }
        if (typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
            return [
                locals,
                expr
            ];
        }
        if (Array.isArray(expr)) {
            locals.contextIsNonLatin1 = expr.some(function ($_) {
                return typeof $_ === 'string' && $_.match(nonLatin1);
            });
            return interpolate(locals, args, env, expr);
        }
        if (index) {
            var selector = resolveSelector(args, env, expr, index);
            if (expr.hasOwnProperty(selector)) {
                return resolveValue(locals, args, env, expr[selector]);
            }
        }
        if ('other' in expr) {
            return resolveValue(locals, args, env, expr.other);
        }
        throw new L10nError('Unresolvable value');
    }
    var Resolver = {
        createEntry: createEntry,
        format: format,
        rePlaceables: rePlaceables
    };
    function walkContent(node, fn) {
        if (typeof node === 'string') {
            return fn(node);
        }
        if (node.t === 'idOrVar') {
            return node;
        }
        var rv = Array.isArray(node) ? [] : {};
        var keys = Object.keys(node);
        for (var i = 0, key; key = keys[i]; i++) {
            if (key === '$i' || key === '$x') {
                rv[key] = node[key];
            } else {
                rv[key] = walkContent(node[key], fn);
            }
        }
        return rv;
    }
    var reAlphas = /[a-zA-Z]/g;
    var reVowels = /[aeiouAEIOU]/g;
    var ACCENTED_MAP = 'ȦƁƇḒḖƑƓĦĪ' + 'ĴĶĿḾȠǾƤɊŘ' + 'ŞŦŬṼẆẊẎẐ' + '[\\]^_`' + 'ȧƀƈḓḗƒɠħī' + 'ĵķŀḿƞǿƥɋř' + 'şŧŭṽẇẋẏẑ';
    var FLIPPED_MAP = '\u2200ԐↃpƎɟפHIſ' + 'Ӽ\u02E5WNOԀÒᴚS\u22A5\u2229Ʌ' + 'ＭXʎZ' + '[\\]ᵥ_,' + 'ɐqɔpǝɟƃɥıɾ' + 'ʞʅɯuodbɹsʇnʌʍxʎz';
    function makeLonger(val) {
        return val.replace(reVowels, function (match) {
            return match + match.toLowerCase();
        });
    }
    function replaceChars(map, val) {
        return val.replace(reAlphas, function (match) {
            return map.charAt(match.charCodeAt(0) - 65);
        });
    }
    var reWords = /[^\W0-9_]+/g;
    function makeRTL(val) {
        return val.replace(reWords, function (match) {
            return '\u202E' + match + '\u202C';
        });
    }
    var reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;
    function mapContent(fn, val) {
        if (!val) {
            return val;
        }
        var parts = val.split(reExcluded);
        var modified = parts.map(function (part) {
            if (reExcluded.test(part)) {
                return part;
            }
            return fn(part);
        });
        return modified.join('');
    }
    function Pseudo(id, name, charMap, modFn) {
        this.id = id;
        this.translate = mapContent.bind(null, function (val) {
            return replaceChars(charMap, modFn(val));
        });
        this.name = this.translate(name);
    }
    var PSEUDO = {
        'fr-x-psaccent': new Pseudo('fr-x-psaccent', 'Runtime Accented', ACCENTED_MAP, makeLonger),
        'ar-x-psbidi': new Pseudo('ar-x-psbidi', 'Runtime Bidi', FLIPPED_MAP, makeRTL)
    };
    function Locale(id, ctx) {
        this.id = id;
        this.ctx = ctx;
        this.isReady = false;
        this.entries = Object.create(null);
        this.entries.__plural = getPluralRule(this.isPseudo() ? this.ctx.defaultLocale : id);
    }
    Locale.prototype.isPseudo = function () {
        return this.ctx.qps.indexOf(this.id) !== -1;
    };
    var bindingsIO = {
        extra: function (id, ver, path, type, callback, errback) {
            if (type === 'properties') {
                type = 'text';
            }
            navigator.mozApps.getLocalizationResource(id, ver, path, type).then(callback.bind(null, null), errback);
        },
        app: function (id, ver, path, type, callback, errback, sync) {
            switch (type) {
            case 'properties':
                io.load(path, callback, sync);
                break;
            case 'json':
                io.loadJSON(path, callback, sync);
                break;
            }
        }
    };
    Locale.prototype.build = function L_build(callback) {
        var sync = !callback;
        var ctx = this.ctx;
        var self = this;
        var l10nLoads = ctx.resLinks.length;
        function onL10nLoaded(err) {
            if (err) {
                ctx._emitter.emit('fetcherror', err);
            }
            if (--l10nLoads <= 0) {
                self.isReady = true;
                if (callback) {
                    callback();
                }
            }
        }
        if (l10nLoads === 0) {
            onL10nLoaded();
            return;
        }
        function onJSONLoaded(err, json) {
            if (!err && json) {
                self.addAST(json);
            }
            onL10nLoaded(err);
        }
        function onPropLoaded(err, source) {
            if (!err && source) {
                var ast = PropertiesParser.parse(ctx, source);
                self.addAST(ast);
            }
            onL10nLoaded(err);
        }
        var idToFetch = this.isPseudo() ? ctx.defaultLocale : this.id;
        var appVersion = null;
        var source = 'app';
        if (typeof navigator !== 'undefined') {
            source = navigator.mozL10n._config.localeSources[this.id] || 'app';
            appVersion = navigator.mozL10n._config.appVersion;
        }
        for (var i = 0; i < ctx.resLinks.length; i++) {
            var resLink = decodeURI(ctx.resLinks[i]);
            var path = resLink.replace('{locale}', idToFetch);
            var type = path.substr(path.lastIndexOf('.') + 1);
            var cb;
            switch (type) {
            case 'json':
                cb = onJSONLoaded;
                break;
            case 'properties':
                cb = onPropLoaded;
                break;
            }
            bindingsIO[source](this.id, appVersion, path, type, cb, onL10nLoaded, sync);
        }
    };
    function createPseudoEntry(node, entries) {
        return Resolver.createEntry(walkContent(node, PSEUDO[this.id].translate), entries);
    }
    Locale.prototype.addAST = function (ast) {
        var createEntry = this.isPseudo() ? createPseudoEntry.bind(this) : Resolver.createEntry;
        for (var i = 0; i < ast.length; i++) {
            this.entries[ast[i].$i] = createEntry(ast[i], this.entries);
        }
    };
    function Context(id) {
        this.id = id;
        this.isReady = false;
        this.isLoading = false;
        this.defaultLocale = 'en-US';
        this.availableLocales = [];
        this.supportedLocales = [];
        this.qps = [];
        this.resLinks = [];
        this.locales = {};
        this._emitter = new EventEmitter();
        this._ready = new Promise(this.once.bind(this));
    }
    function reportMissing(id, err) {
        this._emitter.emit('notfounderror', err);
        return id;
    }
    function getWithFallback(id) {
        var cur = 0;
        var loc;
        var locale;
        while (loc = this.supportedLocales[cur]) {
            locale = this.getLocale(loc);
            if (!locale.isReady) {
                locale.build(null);
            }
            var entry = locale.entries[id];
            if (entry === undefined) {
                cur++;
                reportMissing.call(this, id, new L10nError('"' + id + '"' + ' not found in ' + loc + ' in ' + this.id, id, loc));
                continue;
            }
            return entry;
        }
        throw new L10nError('"' + id + '"' + ' missing from all supported locales in ' + this.id, id);
    }
    function formatTuple(args, entity) {
        try {
            return Resolver.format(args, entity);
        } catch (err) {
            this._emitter.emit('resolveerror', err);
            var locals = { error: err };
            return [
                locals,
                entity.id
            ];
        }
    }
    function formatValue(args, entity) {
        if (typeof entity === 'string') {
            return entity;
        }
        return formatTuple.call(this, args, entity)[1];
    }
    function formatEntity(args, entity) {
        var entityTuple = formatTuple.call(this, args, entity);
        var value = entityTuple[1];
        var formatted = {
            value: value,
            attrs: null
        };
        if (entity.attrs) {
            formatted.attrs = Object.create(null);
        }
        for (var key in entity.attrs) {
            var attrTuple = formatTuple.call(this, args, entity.attrs[key]);
            formatted.attrs[key] = attrTuple[1];
        }
        return formatted;
    }
    function formatAsync(fn, id, args) {
        return this._ready.then(getWithFallback.bind(this, id)).then(fn.bind(this, args), reportMissing.bind(this, id));
    }
    Context.prototype.formatValue = function (id, args) {
        return formatAsync.call(this, formatValue, id, args);
    };
    Context.prototype.formatEntity = function (id, args) {
        return formatAsync.call(this, formatEntity, id, args);
    };
    function legacyGet(fn, id, args) {
        if (!this.isReady) {
            throw new L10nError('Context not ready');
        }
        var entry;
        try {
            entry = getWithFallback.call(this, id);
        } catch (err) {
            if (err.loc) {
                throw err;
            }
            reportMissing.call(this, id, err);
            return '';
        }
        return fn.call(this, args, entry);
    }
    Context.prototype.get = function (id, args) {
        return legacyGet.call(this, formatValue, id, args);
    };
    Context.prototype.getEntity = function (id, args) {
        return legacyGet.call(this, formatEntity, id, args);
    };
    Context.prototype.getLocale = function getLocale(code) {
        var locales = this.locales;
        if (locales[code]) {
            return locales[code];
        }
        return locales[code] = new Locale(code, this);
    };
    function negotiate(available, requested, defaultLocale) {
        var supportedLocale;
        for (var i = 0; i < requested.length; i++) {
            var locale = requested[i];
            if (available.indexOf(locale) !== -1) {
                supportedLocale = locale;
                break;
            }
        }
        if (!supportedLocale || supportedLocale === defaultLocale) {
            return [defaultLocale];
        }
        return [
            supportedLocale,
            defaultLocale
        ];
    }
    function freeze(supported) {
        var locale = this.getLocale(supported[0]);
        if (locale.isReady) {
            setReady.call(this, supported);
        } else {
            locale.build(setReady.bind(this, supported));
        }
    }
    function setReady(supported) {
        this.supportedLocales = supported;
        this.isReady = true;
        this._emitter.emit('ready');
    }
    Context.prototype.registerLocales = function (defLocale, available) {
        if (defLocale) {
            this.defaultLocale = defLocale;
        }
        this.availableLocales = [this.defaultLocale];
        this.qps = Object.keys(PSEUDO);
        if (available) {
            for (var i = 0, loc; loc = available[i]; i++) {
                if (this.availableLocales.indexOf(loc) === -1) {
                    this.availableLocales.push(loc);
                    var pos = this.qps.indexOf(loc);
                    if (pos !== -1) {
                        this.qps.splice(pos, 1);
                    }
                }
            }
        }
    };
    Context.prototype.requestLocales = function requestLocales() {
        if (this.isLoading && !this.isReady) {
            throw new L10nError('Context not ready');
        }
        this.isLoading = true;
        var requested = Array.prototype.slice.call(arguments);
        if (requested.length === 0) {
            throw new L10nError('No locales requested');
        }
        var supported = negotiate(this.availableLocales.concat(this.qps), requested, this.defaultLocale);
        if (this.supportedLocales[0] !== supported[0]) {
            freeze.call(this, supported);
        }
    };
    Context.prototype.addEventListener = function (type, listener) {
        this._emitter.addEventListener(type, listener);
    };
    Context.prototype.removeEventListener = function (type, listener) {
        this._emitter.removeEventListener(type, listener);
    };
    Context.prototype.ready = function (callback) {
        if (this.isReady) {
            setTimeout(callback);
        }
        this.addEventListener('ready', callback);
    };
    Context.prototype.once = function (callback) {
        if (this.isReady) {
            setTimeout(callback);
            return;
        }
        var callAndRemove = function () {
            this.removeEventListener('ready', callAndRemove);
            callback();
        }.bind(this);
        this.addEventListener('ready', callAndRemove);
    };
    var allowed = {
        elements: [
            'a',
            'em',
            'strong',
            'small',
            's',
            'cite',
            'q',
            'dfn',
            'abbr',
            'data',
            'time',
            'code',
            'var',
            'samp',
            'kbd',
            'sub',
            'sup',
            'i',
            'b',
            'u',
            'mark',
            'ruby',
            'rt',
            'rp',
            'bdi',
            'bdo',
            'span',
            'br',
            'wbr'
        ],
        attributes: {
            global: [
                'title',
                'aria-label',
                'aria-valuetext',
                'aria-moz-hint'
            ],
            a: ['download'],
            area: [
                'download',
                'alt'
            ],
            input: [
                'alt',
                'placeholder'
            ],
            menuitem: ['label'],
            menu: ['label'],
            optgroup: ['label'],
            option: ['label'],
            track: ['label'],
            img: ['alt'],
            textarea: ['placeholder'],
            th: ['abbr']
        }
    };
    var rtlList = [
        'ar',
        'he',
        'fa',
        'ps',
        'ar-x-psbidi',
        'ur'
    ];
    var nodeObserver = null;
    var pendingElements = null;
    var moConfig = {
        attributes: true,
        characterData: false,
        childList: true,
        subtree: true,
        attributeFilter: [
            'data-l10n-id',
            'data-l10n-args'
        ]
    };
    navigator.mozL10n = {
        ctx: null,
        get: function get(id, ctxdata) {
            return navigator.mozL10n.ctx.get(id, ctxdata);
        },
        formatValue: function (id, ctxdata) {
            return navigator.mozL10n.ctx.formatValue(id, ctxdata);
        },
        formatEntity: function (id, ctxdata) {
            return navigator.mozL10n.ctx.formatEntity(id, ctxdata);
        },
        translateFragment: function (fragment) {
            return translateFragment.call(navigator.mozL10n, fragment);
        },
        setAttributes: setL10nAttributes,
        getAttributes: getL10nAttributes,
        ready: function ready(callback) {
            return navigator.mozL10n.ctx.ready(callback);
        },
        once: function once(callback) {
            return navigator.mozL10n.ctx.once(callback);
        },
        get readyState() {
            return navigator.mozL10n.ctx.isReady ? 'complete' : 'loading';
        },
        language: {
            set code(lang) {
                navigator.mozL10n.ctx.requestLocales(lang);
            },
            get code() {
                return navigator.mozL10n.ctx.supportedLocales[0];
            },
            get direction() {
                return getDirection(navigator.mozL10n.ctx.supportedLocales[0]);
            }
        },
        qps: PSEUDO,
        _config: {
            appVersion: null,
            localeSources: Object.create(null),
            isPretranslated: false
        },
        _getInternalAPI: function () {
            return {
                Error: L10nError,
                Context: Context,
                Locale: Locale,
                Resolver: Resolver,
                getPluralRule: getPluralRule,
                rePlaceables: rePlaceables,
                translateDocument: translateDocument,
                onMetaInjected: onMetaInjected,
                PropertiesParser: PropertiesParser,
                walkContent: walkContent,
                buildLocaleList: buildLocaleList
            };
        }
    };
    function getDirection(lang) {
        return rtlList.indexOf(lang) >= 0 ? 'rtl' : 'ltr';
    }
    var readyStates = {
        loading: 0,
        interactive: 1,
        complete: 2
    };
    function whenInteractive(callback) {
        if (readyStates[document.readyState] >= readyStates.interactive) {
            callback();
            return;
        }
        document.addEventListener('readystatechange', function l10n_onrsc() {
            if (readyStates[document.readyState] >= readyStates.interactive) {
                document.removeEventListener('readystatechange', l10n_onrsc);
                callback();
            }
        });
    }
    function initObserver() {
        nodeObserver = new MutationObserver(onMutations.bind(navigator.mozL10n));
        nodeObserver.observe(document, moConfig);
    }
    function init(pretranslate) {
        if (!pretranslate) {
            initObserver();
        }
        initResources.call(navigator.mozL10n);
    }
    function initResources() {
        var meta = {};
        var nodes = document.head.querySelectorAll('link[rel="localization"],' + 'meta[name="availableLanguages"],' + 'meta[name="defaultLanguage"],' + 'meta[name="appVersion"],' + 'script[type="application/l10n"]');
        for (var i = 0, node; node = nodes[i]; i++) {
            var type = node.getAttribute('rel') || node.nodeName.toLowerCase();
            switch (type) {
            case 'localization':
                this.ctx.resLinks.push(node.getAttribute('href'));
                break;
            case 'meta':
                onMetaInjected.call(this, node, meta);
                break;
            case 'script':
                onScriptInjected.call(this, node);
                break;
            }
        }
        var additionalLanguagesPromise;
        if (navigator.mozApps && navigator.mozApps.getAdditionalLanguages) {
            additionalLanguagesPromise = navigator.mozApps.getAdditionalLanguages().catch(function (e) {
                console.error('Error while loading getAdditionalLanguages', e);
            });
            document.addEventListener('additionallanguageschange', function (evt) {
                registerLocales.call(this, meta, evt.detail);
                this.ctx.requestLocales.apply(this.ctx, navigator.languages || [navigator.language]);
            }.bind(this));
        } else {
            additionalLanguagesPromise = Promise.resolve();
        }
        additionalLanguagesPromise.then(function (extraLangs) {
            registerLocales.call(this, meta, extraLangs);
            initLocale.call(this);
        }.bind(this));
    }
    function registerLocales(meta, extraLangs) {
        var locales = buildLocaleList.call(this, meta, extraLangs);
        navigator.mozL10n._config.localeSources = locales[1];
        this.ctx.registerLocales(locales[0], Object.keys(locales[1]));
    }
    function getMatchingLangpack(appVersion, langpacks) {
        for (var i = 0, langpack; langpack = langpacks[i]; i++) {
            if (langpack.target === appVersion) {
                return langpack;
            }
        }
        return null;
    }
    function buildLocaleList(meta, extraLangs) {
        var loc, lp;
        var localeSources = Object.create(null);
        var defaultLocale = meta.defaultLanguage || this.ctx.defaultLocale;
        if (meta.availableLanguages) {
            for (loc in meta.availableLanguages) {
                localeSources[loc] = 'app';
            }
        }
        if (extraLangs) {
            for (loc in extraLangs) {
                lp = getMatchingLangpack(this._config.appVersion, extraLangs[loc]);
                if (!lp) {
                    continue;
                }
                if (!(loc in localeSources) || !meta.availableLanguages[loc] || parseInt(lp.revision) > meta.availableLanguages[loc]) {
                    localeSources[loc] = 'extra';
                }
            }
        }
        if (!(defaultLocale in localeSources)) {
            localeSources[defaultLocale] = 'app';
        }
        return [
            defaultLocale,
            localeSources
        ];
    }
    function splitAvailableLanguagesString(str) {
        var langs = {};
        str.split(',').forEach(function (lang) {
            lang = lang.trim().split(':');
            langs[lang[0]] = parseInt(lang[1]);
        });
        return langs;
    }
    function onMetaInjected(node, meta) {
        switch (node.getAttribute('name')) {
        case 'availableLanguages':
            meta.availableLanguages = splitAvailableLanguagesString(node.getAttribute('content'));
            break;
        case 'defaultLanguage':
            meta.defaultLanguage = node.getAttribute('content');
            break;
        case 'appVersion':
            navigator.mozL10n._config.appVersion = node.getAttribute('content');
            break;
        }
    }
    function onScriptInjected(node) {
        var lang = node.getAttribute('lang');
        var locale = this.ctx.getLocale(lang);
        locale.addAST(JSON.parse(node.textContent));
    }
    function initLocale() {
        this.ctx.requestLocales.apply(this.ctx, navigator.languages || [navigator.language]);
        window.addEventListener('languagechange', function l10n_langchange() {
            this.ctx.requestLocales.apply(this.ctx, navigator.languages || [navigator.language]);
        }.bind(this));
    }
    function localizeMutations(mutations) {
        var mutation;
        var targets = new Set();
        for (var i = 0; i < mutations.length; i++) {
            mutation = mutations[i];
            if (mutation.type === 'childList') {
                var addedNode;
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    addedNode = mutation.addedNodes[j];
                    if (addedNode.nodeType !== Node.ELEMENT_NODE) {
                        continue;
                    }
                    targets.add(addedNode);
                }
            }
            if (mutation.type === 'attributes') {
                targets.add(mutation.target);
            }
        }
        targets.forEach(function (target) {
            if (target.childElementCount) {
                translateFragment.call(this, target);
            } else if (target.hasAttribute('data-l10n-id')) {
                translateElement.call(this, target);
            }
        }, this);
    }
    function onMutations(mutations, self) {
        self.disconnect();
        localizeMutations.call(this, mutations);
        self.observe(document, moConfig);
    }
    function onReady() {
        if (!navigator.mozL10n._config.isPretranslated) {
            translateDocument.call(this);
        }
        navigator.mozL10n._config.isPretranslated = false;
        if (pendingElements) {
            for (var i = 0, element; element = pendingElements[i]; i++) {
                translateElement.call(this, element);
            }
            pendingElements = null;
        }
        if (!nodeObserver) {
            initObserver();
        }
        fireLocalizedEvent.call(this);
    }
    function fireLocalizedEvent() {
        var event = new CustomEvent('localized', {
            'bubbles': false,
            'cancelable': false,
            'detail': { 'language': this.ctx.supportedLocales[0] }
        });
        window.dispatchEvent(event);
    }
    var reOverlay = /<|&#?\w+;/;
    var reHtml = /[&<>]/g;
    var htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    function translateDocument() {
        document.documentElement.lang = this.language.code;
        document.documentElement.dir = this.language.direction;
        translateFragment.call(this, document.documentElement);
    }
    function translateFragment(element) {
        if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-l10n-id')) {
            translateElement.call(this, element);
        }
        var nodes = getTranslatableChildren(element);
        for (var i = 0; i < nodes.length; i++) {
            translateElement.call(this, nodes[i]);
        }
    }
    function setL10nAttributes(element, id, args) {
        element.setAttribute('data-l10n-id', id);
        if (args) {
            element.setAttribute('data-l10n-args', JSON.stringify(args));
        }
    }
    function getL10nAttributes(element) {
        return {
            id: element.getAttribute('data-l10n-id'),
            args: JSON.parse(element.getAttribute('data-l10n-args'))
        };
    }
    function getTranslatableChildren(element) {
        return element ? element.querySelectorAll('*[data-l10n-id]') : [];
    }
    function camelCaseToDashed(string) {
        if (string === 'ariaValueText') {
            return 'aria-valuetext';
        }
        return string.replace(/[A-Z]/g, function (match) {
            return '-' + match.toLowerCase();
        }).replace(/^-/, '');
    }
    function escapeL10nArgs(match) {
        return htmlEntities[match];
    }
    function translateElement(element) {
        if (!this.ctx.isReady) {
            if (!pendingElements) {
                pendingElements = [];
            }
            pendingElements.push(element);
            return;
        }
        var l10nId = element.getAttribute('data-l10n-id');
        if (!l10nId) {
            return false;
        }
        var l10nArgs = element.getAttribute('data-l10n-args');
        var entity = this.ctx.getEntity(l10nId, l10nArgs ? JSON.parse(l10nArgs.replace(reHtml, escapeL10nArgs)) : undefined);
        var value = entity.value;
        if (typeof value === 'string') {
            if (!reOverlay.test(value)) {
                element.textContent = value;
            } else {
                var translation = element.ownerDocument.createElement('template');
                translation.innerHTML = value;
                overlayElement(element, translation.content);
            }
        }
        for (var key in entity.attrs) {
            var attrName = camelCaseToDashed(key);
            if (isAttrAllowed({ name: attrName }, element)) {
                element.setAttribute(attrName, entity.attrs[key]);
            }
        }
    }
    function overlayElement(sourceElement, translationElement) {
        var result = translationElement.ownerDocument.createDocumentFragment();
        var k, attr;
        var childElement;
        while (childElement = translationElement.childNodes[0]) {
            translationElement.removeChild(childElement);
            if (childElement.nodeType === Node.TEXT_NODE) {
                result.appendChild(childElement);
                continue;
            }
            var index = getIndexOfType(childElement);
            var sourceChild = getNthElementOfType(sourceElement, childElement, index);
            if (sourceChild) {
                overlayElement(sourceChild, childElement);
                result.appendChild(sourceChild);
                continue;
            }
            if (isElementAllowed(childElement)) {
                var sanitizedChild = childElement.ownerDocument.createElement(childElement.nodeName);
                overlayElement(sanitizedChild, childElement);
                result.appendChild(sanitizedChild);
                continue;
            }
            result.appendChild(document.createTextNode(childElement.textContent));
        }
        sourceElement.textContent = '';
        sourceElement.appendChild(result);
        if (translationElement.attributes) {
            for (k = 0, attr; attr = translationElement.attributes[k]; k++) {
                if (isAttrAllowed(attr, sourceElement)) {
                    sourceElement.setAttribute(attr.name, attr.value);
                }
            }
        }
    }
    function isElementAllowed(element) {
        return allowed.elements.indexOf(element.tagName.toLowerCase()) !== -1;
    }
    function isAttrAllowed(attr, element) {
        var attrName = attr.name.toLowerCase();
        var tagName = element.tagName.toLowerCase();
        if (allowed.attributes.global.indexOf(attrName) !== -1) {
            return true;
        }
        if (!allowed.attributes[tagName]) {
            return false;
        }
        if (allowed.attributes[tagName].indexOf(attrName) !== -1) {
            return true;
        }
        if (tagName === 'input' && attrName === 'value') {
            var type = element.type.toLowerCase();
            if (type === 'submit' || type === 'button' || type === 'reset') {
                return true;
            }
        }
        return false;
    }
    function getNthElementOfType(context, element, index) {
        var nthOfType = 0;
        for (var i = 0, child; child = context.children[i]; i++) {
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName === element.tagName) {
                if (nthOfType === index) {
                    return child;
                }
                nthOfType++;
            }
        }
        return null;
    }
    function getIndexOfType(element) {
        var index = 0;
        var child;
        while (child = element.previousElementSibling) {
            if (child.tagName === element.tagName) {
                index++;
            }
        }
        return index;
    }
    var DEBUG = false;
    navigator.mozL10n.ctx = new Context(window.document ? document.URL : null);
    navigator.mozL10n.ctx.ready(onReady.bind(navigator.mozL10n));
    navigator.mozL10n.ctx.addEventListener('notfounderror', function reportMissingEntity(e) {
        if (DEBUG || e.loc === 'en-US') {
            console.warn(e.toString());
        }
    });
    if (DEBUG) {
        navigator.mozL10n.ctx.addEventListener('fetcherror', console.error.bind(console));
        navigator.mozL10n.ctx.addEventListener('parseerror', console.error.bind(console));
        navigator.mozL10n.ctx.addEventListener('resolveerror', console.error.bind(console));
    }
    if (window.document) {
        navigator.mozL10n._config.isPretranslated = document.documentElement.lang === navigator.language;
        var forcePretranslate = !navigator.mozL10n._config.isPretranslated;
        whenInteractive(init.bind(navigator.mozL10n, forcePretranslate));
    }
    document.l10n = {
        setAttributes: navigator.mozL10n.setAttributes,
        getAttributes: navigator.mozL10n.getAttributes,
        formatValue: function (id, args) {
            return navigator.mozL10n.formatValue(id, args);
        },
        translateFragment: function (frag) {
            return Promise.resolve(navigator.mozL10n.translateFragment(frag));
        },
        ready: new Promise(function (resolve) {
            navigator.mozL10n.once(resolve);
        }),
        formatValues: function () {
            var keys = arguments;
            var resp = keys.map(function (key) {
                if (Array.isArray(key)) {
                    return navigator.mozL10n.formatValue(key[0], key[1]);
                }
                return navigator.mozL10n.formatValue(key);
            });
            return Promise.all(resp);
        },
        requestLanguages: function (langs) {
            navigator.mozL10n.ctx.requestLocales.apply(navigator.mozL10n.ctx, langs);
        },
        pseudo: {
            'fr-x-psaccent': {
                getName: function () {
                    return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].name);
                },
                processString: function (s) {
                    return Promise.resolve(navigator.mozL10n.qps['fr-x-psaccent'].translate(s));
                }
            },
            'ar-x-psbidi': {
                getName: function () {
                    return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].name);
                },
                processString: function (s) {
                    return Promise.resolve(navigator.mozL10n.qps['ar-x-psbidi'].translate(s));
                }
            }
        }
    };
    navigator.mozL10n.ready(function () {
        document.documentElement.setAttribute('langs', navigator.mozL10n.ctx.supportedLocales.join(' '));
    });
    navigator.mozL10n.once(function () {
        window.addEventListener('localized', function () {
            document.dispatchEvent(new CustomEvent('DOMRetranslated', {
                bubbles: false,
                cancelable: false
            }));
        });
    });
}(this));
define('l10nbase', function () {
});
(function (global) {
    'use strict';
    global.mozIntl = {
        formatList: function (list) {
            return navigator.mozL10n.formatValue('listSeparator_middle').then(sep => list.join(sep));
        },
        DateTimeFormat: function (locales, options) {
            const resolvedOptions = Object.assign({}, options);
            if (resolvedOptions.dayperiod) {
                if (resolvedOptions.hour === undefined) {
                    resolvedOptions.hour = 'numeric';
                }
            }
            if (resolvedOptions.hour !== undefined && resolvedOptions.hour12 === undefined) {
                resolvedOptions.hour12 = navigator.mozHour12;
            }
            if (resolvedOptions.dayperiod === undefined && resolvedOptions.hour12 === true) {
                resolvedOptions.dayperiod = true;
            }
            var intlFormat = new Intl.DateTimeFormat(locales, resolvedOptions);
            resolvedOptions.locale = intlFormat.resolvedOptions().locale;
            resolvedOptions.hour12 = intlFormat.resolvedOptions().hour12;
            var hourFormatter;
            if (resolvedOptions.dayperiod !== undefined && resolvedOptions.hour12 === true) {
                hourFormatter = Intl.DateTimeFormat(locales, {
                    hour: 'numeric',
                    hour12: false
                });
            }
            return {
                resolvedOptions() {
                    return resolvedOptions;
                },
                format: function (date, tokenFormats) {
                    var dayPeriod;
                    var string = intlFormat.format(date);
                    if (resolvedOptions.dayperiod === false && resolvedOptions.hour12 === true) {
                        dayPeriod = getDayPeriodTokenForDate(date, hourFormatter);
                        string = string.replace(dayPeriod, '').trim();
                    } else if (resolvedOptions.dayperiod === true && options.hour === undefined) {
                        dayPeriod = getDayPeriodTokenForDate(date, hourFormatter);
                        const hour = date.toLocaleString(navigator.languages, {
                            hour12: true,
                            hour: 'numeric'
                        }).replace(dayPeriod, '').trim();
                        string = string.replace(hour, '').trim();
                    }
                    for (var token in tokenFormats) {
                        if (token === 'dayperiod' && resolvedOptions.hour12 === false) {
                            continue;
                        }
                        const localOptions = { [token]: resolvedOptions[token] };
                        var formatter = global.mozIntl.DateTimeFormat(navigator.languages, localOptions);
                        var tokenString = formatter.format(date);
                        string = string.replace(tokenString, tokenFormats[token]);
                    }
                    return string;
                }
            };
        },
        calendarInfo: function (token) {
            switch (token) {
            case 'firstDayOfTheWeek':
                return navigator.mozL10n.formatValue('firstDayOfTheWeek').then(firstDayOfTheWeek => parseInt(firstDayOfTheWeek) % 7);
            default:
                throw new Error('Unknown token: ' + token);
            }
        },
        DurationFormat: function (locales = navigator.languages, options = {}) {
            const resolvedOptions = Object.assign({
                locale: locales[0],
                maxUnit: 'hour',
                minUnit: 'second'
            }, options);
            const numFormatter = Intl.NumberFormat(locales, {
                style: 'decimal',
                useGrouping: false,
                minimumIntegerDigits: 2
            });
            const maxUnitIdx = getDurationUnitIdx(resolvedOptions.maxUnit, 0);
            const minUnitIdx = getDurationUnitIdx(resolvedOptions.minUnit, durationFormatOrder.length - 1);
            return navigator.mozL10n.formatValue('durationPattern').then(fmt => ({
                resolvedOptions: function () {
                    return resolvedOptions;
                },
                format: function (input) {
                    const minValue = durationFormatElements[resolvedOptions.minUnit].value;
                    input = Math.round(input / minValue) * minValue;
                    const duration = splitIntoTimeUnits(input, maxUnitIdx, minUnitIdx);
                    var string = trimDurationPattern(fmt, resolvedOptions.maxUnit, resolvedOptions.minUnit);
                    for (var unit in duration) {
                        const token = durationFormatElements[unit].token;
                        string = string.replace(token, numFormatter.format(duration[unit]));
                    }
                    if (input < 0) {
                        return '-' + string;
                    }
                    return string;
                }
            }));
        },
        RelativeTimeFormat: function (locales, options) {
            return {
                resolvedOptions: function () {
                    return options;
                },
                format: function (x) {
                    const {unit, value} = relativeTimeFormatId(x, options);
                    return navigator.mozL10n.formatValue(unit, { value });
                }
            };
        },
        UnitFormat: function (locales, options) {
            const unitGroup = getUnitFormatGroupName(options.unit);
            if (unitGroup === undefined) {
                throw new RangeError(`invalid value ${ options.unit } for option unit`);
            }
            if (!unitFormatGroups[unitGroup].styles.includes(options.style)) {
                throw new RangeError(`invalid value ${ options.style } for option style`);
            }
            const unit = `${ unitGroup }-${ options.unit }-${ options.style }`;
            return {
                format: function (x) {
                    return document.l10n.formatValue(unit, { value: x });
                }
            };
        },
        _gaia: {
            relativePart: function (milliseconds) {
                const units = computeTimeUnits(milliseconds);
                const unit = getBestMatchUnit(units);
                return {
                    unit: unit + 's',
                    value: Math.abs(units[unit])
                };
            },
            RelativeDate: function (locales, options) {
                const style = options && options.style || 'long';
                const maxFormatter = Intl.DateTimeFormat(locales, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                });
                const relativeFmtOptions = {
                    unit: 'bestFit',
                    style: style,
                    minUnit: 'minute'
                };
                return {
                    format: function (time, maxDiff) {
                        maxDiff = maxDiff || 86400 * 10;
                        const secDiff = (Date.now() - time) / 1000;
                        if (isNaN(secDiff)) {
                            return navigator.mozL10n.formatValue('incorrectDate');
                        }
                        if (secDiff > maxDiff) {
                            return Promise.resolve(maxFormatter.format(time));
                        }
                        const {unit, value} = relativeTimeFormatId(time, relativeFmtOptions);
                        return navigator.mozL10n.formatValue(unit, { value });
                    },
                    formatElement: function (element, time, maxDiff) {
                        maxDiff = maxDiff || 86400 * 10;
                        const secDiff = (Date.now() - time) / 1000;
                        if (isNaN(secDiff)) {
                            element.setAttribute('data-l10n-id', 'incorrectDate');
                        }
                        element.removeAttribute('data-l10n-id');
                        if (secDiff > maxDiff) {
                            element.textContent = maxFormatter.format(time);
                        }
                        const {unit, value} = relativeTimeFormatId(time, relativeFmtOptions);
                        navigator.mozL10n.setAttributes(element, unit, { value });
                    }
                };
            },
            getFormattedUnit: function (type, style, v) {
                if (!unitFormatData.hasOwnProperty(type)) {
                    throw new RangeError(`invalid type ${ type }`);
                }
                if (!unitFormatGroups[type].styles.includes(style)) {
                    throw new RangeError(`invalid style ${ style } for type ${ type }`);
                }
                var units = unitFormatData[type];
                var scale = 0;
                for (let i = 1; i < units.length; i++) {
                    if (v < units[i].value * unitFormatGroups[type].rounding) {
                        scale = i - 1;
                        break;
                    } else if (i === units.length - 1) {
                        scale = i;
                    }
                }
                var value = Math.round(v / units[scale].value * 100) / 100;
                return global.mozIntl.UnitFormat(navigator.languages, {
                    unit: units[scale].name,
                    style: style
                }).format(value);
            }
        }
    };
    const durationFormatOrder = [
        'hour',
        'minute',
        'second',
        'millisecond'
    ];
    const durationFormatElements = {
        'hour': {
            value: 3600000,
            token: 'hh'
        },
        'minute': {
            value: 60000,
            token: 'mm'
        },
        'second': {
            value: 1000,
            token: 'ss'
        },
        'millisecond': {
            value: 10,
            token: 'SS'
        }
    };
    const unitFormatData = {
        'duration': [
            {
                'name': 'second',
                'value': 1
            },
            {
                'name': 'minute',
                'value': 60
            },
            {
                'name': 'hour',
                'value': 60 * 60
            },
            {
                'name': 'day',
                'value': 24 * 60 * 60
            },
            {
                'name': 'month',
                'value': 30 * 24 * 60 * 60
            }
        ],
        'digital': [
            {
                'name': 'byte',
                'value': 1
            },
            {
                'name': 'kilobyte',
                'value': 1024
            },
            {
                'name': 'megabyte',
                'value': 1024 * 1024
            },
            {
                'name': 'gigabyte',
                'value': 1024 * 1024 * 1024
            },
            {
                'name': 'terabyte',
                'value': 1024 * 1024 * 1024 * 1024
            }
        ]
    };
    const unitFormatGroups = {
        'duration': {
            'units': [
                'second',
                'minute',
                'hour',
                'day',
                'month'
            ],
            'styles': ['narrow'],
            'rounding': 1
        },
        'digital': {
            'units': [
                'byte',
                'kilobyte',
                'megabyte',
                'gigabyte',
                'terabyte'
            ],
            'styles': ['short'],
            'rounding': 0.8
        }
    };
    function getDurationUnitIdx(name, defaultValue) {
        if (!name) {
            return defaultValue;
        }
        const pos = durationFormatOrder.indexOf(name);
        if (pos === -1) {
            throw new Error('Unknown unit type: ' + name);
        }
        return pos;
    }
    function splitIntoTimeUnits(v, maxUnitIdx, minUnitIdx) {
        const units = {};
        var input = Math.abs(v);
        for (var i = maxUnitIdx; i <= minUnitIdx; i++) {
            const key = durationFormatOrder[i];
            const {value} = durationFormatElements[key];
            units[key] = i == minUnitIdx ? Math.round(input / value) : Math.floor(input / value);
            input -= units[key] * value;
        }
        return units;
    }
    function trimDurationPattern(string, maxUnit, minUnit) {
        const maxToken = durationFormatElements[maxUnit].token;
        const minToken = durationFormatElements[minUnit].token;
        string = string.substring(string.indexOf(maxToken), string.indexOf(minToken) + minToken.length);
        return string;
    }
    function getDayPeriodTokenForDate(date, hourFormatter) {
        const hourToken = hourFormatter.format(date);
        const newDate = new Date(date);
        newDate.setHours(parseInt(hourToken));
        return new Intl.DateTimeFormat(navigator.language, {hour:'numeric', hour12:true}).formatToParts(newDate).find(part => part.type === 'dayPeriod').value;
    }
    function computeTimeUnits(v) {
        const units = {};
        const millisecond = Math.round(v);
        const second = Math.round(millisecond / 1000);
        const minute = Math.round(second / 60);
        const hour = Math.round(minute / 60);
        const day = Math.round(hour / 24);
        const rawYear = day * 400 / 146097;
        units.millisecond = millisecond;
        units.second = second;
        units.minute = minute;
        units.hour = hour;
        units.day = day;
        units.week = Math.round(day / 7);
        units.month = Math.round(rawYear * 12);
        units.quarter = Math.round(rawYear * 4);
        units.year = Math.round(rawYear);
        return units;
    }
    function getBestMatchUnit(units) {
        if (Math.abs(units.minute) < 45) {
            return 'minute';
        }
        if (Math.abs(units.hour) < 22) {
            return 'hour';
        }
        if (Math.abs(units.day) < 7) {
            return 'day';
        }
        if (Math.abs(units.week) < 4) {
            return 'week';
        }
        if (Math.abs(units.month) < 11) {
            return 'month';
        }
        return 'year';
    }
    function relativeTimeFormatId(x, options) {
        const ms = x - Date.now();
        const units = computeTimeUnits(ms);
        const unit = options.unit === 'bestFit' ? getBestMatchUnit(units) : options.unit;
        const v = units[unit];
        const tl = v < 0 ? '-ago' : '-until';
        const style = options.style || 'long';
        const entry = unit + 's' + tl + '-' + style;
        return {
            unit: entry,
            value: Math.abs(v)
        };
    }
    function getUnitFormatGroupName(unitName) {
        for (let groupName in unitFormatGroups) {
            if (unitFormatGroups[groupName].units.includes(unitName)) {
                return groupName;
            }
        }
        return undefined;
    }
}(this));
define('moz_intl', ['l10nbase'], function (global) {
    return function () {
        var ret, fn;
        return ret || global.mozIntl;
    };
}(this));
define('text', {
    load: function (name, req, onload, config) {
        var url = req.toUrl(name), xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function (evt) {
            var status, err;
            if (xhr.readyState === 4) {
                status = xhr.status;
                if (status > 399 && status < 600) {
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
define('folder_depth_classes', [], function () {
    return [
        'fld-folder-depth0',
        'fld-folder-depth1',
        'fld-folder-depth2',
        'fld-folder-depth3',
        'fld-folder-depth4',
        'fld-folder-depth5',
        'fld-folder-depthmax'
    ];
});
define('tmpl!cards/value_selector.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form class="email-value-selector collapsed" role="dialog" data-type="value-selector">\n  <section class="scrollable">\n    <h1></h1>\n    <ol role="listbox">\n    </ol>\n  </section>\n  <menu>\n    <button class="full"\n            data-l10n-id="message-multiedit-cancel"></button>\n  </menu>\n</form>');
});
define('tmpl!cards/vsl/item.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<li role="option"><label role="presentation"> <span></span></label></li>');
});
define('value_selector', [
    'require',
    'cards',
    'folder_depth_classes',
    'tmpl!cards/value_selector.html',
    'tmpl!cards/vsl/item.html'
], function (require) {
    'use strict';
    var cards = require('cards'), FOLDER_DEPTH_CLASSES = require('folder_depth_classes'), formNode = require('tmpl!cards/value_selector.html'), itemTemplateNode = require('tmpl!cards/vsl/item.html');
    function noop() {
    }
    function ValueSelector(title, list) {
        var init, show, hide, render, setTitle, emptyList, addToList, data;
        init = function () {
            data = {
                title: 'No Title',
                list: [{
                        label: 'Dummy element',
                        callback: function () {
                            alert('Define an action here!');
                        }
                    }]
            };
            document.body.appendChild(formNode);
            var btnCancel = formNode.querySelector('button');
            btnCancel.addEventListener('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                hide();
            });
            emptyList();
            if (typeof title === 'string') {
                setTitle(title);
            }
            if (Array.isArray(list)) {
                data.list = list;
            }
        };
        show = function () {
            render();
            cards.setStatusColor(formNode);
            formNode.classList.remove('collapsed');
        };
        hide = function () {
            cards.setStatusColor();
            formNode.classList.add('collapsed');
            emptyList();
        };
        render = function () {
            var title = formNode.querySelector('h1'), list = formNode.querySelector('ol');
            title.textContent = data.title;
            list.innerHTML = '';
            data.list.forEach(function (listItem) {
                var node = itemTemplateNode.cloneNode(true);
                node.querySelector('span').textContent = listItem.label;
                var depthIdx = listItem.depth;
                depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, depthIdx);
                node.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);
                var callback = listItem.selectable ? listItem.callback : noop;
                node.addEventListener('click', callback, false);
                list.appendChild(node);
            });
        };
        setTitle = function (str) {
            data.title = str;
        };
        emptyList = function () {
            data.list = [];
        };
        addToList = function (label, depth, selectable, callback) {
            data.list.push({
                label: label,
                depth: depth,
                selectable: selectable,
                callback: callback
            });
        };
        init();
        return {
            init: init,
            show: show,
            hide: hide,
            setTitle: setTitle,
            addToList: addToList,
            List: list
        };
    }
    return ValueSelector;
});
var GestureDetector = function () {
    function GD(e, options) {
        this.element = e;
        this.options = options || {};
        this.options.panThreshold = this.options.panThreshold || GD.PAN_THRESHOLD;
        this.state = initialState;
        this.timers = {};
    }
    GD.prototype.startDetecting = function () {
        var self = this;
        eventtypes.forEach(function (t) {
            self.element.addEventListener(t, self);
        });
    };
    GD.prototype.stopDetecting = function () {
        var self = this;
        eventtypes.forEach(function (t) {
            self.element.removeEventListener(t, self);
        });
    };
    GD.prototype.handleEvent = function (e) {
        var handler = this.state[e.type];
        if (!handler) {
            return;
        }
        if (e.changedTouches) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                handler(this, e, e.changedTouches[i]);
                handler = this.state[e.type];
                if (!handler) {
                    return;
                }
            }
        } else {
            handler(this, e);
        }
    };
    GD.prototype.startTimer = function (type, time) {
        this.clearTimer(type);
        var self = this;
        this.timers[type] = setTimeout(function () {
            self.timers[type] = null;
            var handler = self.state[type];
            if (handler) {
                handler(self, type);
            }
        }, time);
    };
    GD.prototype.clearTimer = function (type) {
        if (this.timers[type]) {
            clearTimeout(this.timers[type]);
            this.timers[type] = null;
        }
    };
    GD.prototype.switchTo = function (state, event, touch) {
        this.state = state;
        if (state.init) {
            state.init(this, event, touch);
        }
    };
    GD.prototype.emitEvent = function (type, detail) {
        if (!this.target) {
            console.error('Attempt to emit event with no target');
            return;
        }
        var event = this.element.ownerDocument.createEvent('CustomEvent');
        event.initCustomEvent(type, true, true, detail);
        this.target.dispatchEvent(event);
    };
    GD.HOLD_INTERVAL = 1000;
    GD.PAN_THRESHOLD = 20;
    GD.DOUBLE_TAP_DISTANCE = 50;
    GD.DOUBLE_TAP_TIME = 500;
    GD.VELOCITY_SMOOTHING = 0.5;
    GD.SCALE_THRESHOLD = 20;
    GD.ROTATE_THRESHOLD = 22.5;
    GD.THRESHOLD_SMOOTHING = 0.9;
    var abs = Math.abs, floor = Math.floor, sqrt = Math.sqrt, atan2 = Math.atan2;
    var PI = Math.PI;
    var eventtypes = [
        'touchstart',
        'touchmove',
        'touchend'
    ];
    function eventTime(e) {
        var ts = e.timeStamp;
        if (ts > 2 * Date.now()) {
            return Math.floor(ts / 1000);
        } else {
            return ts;
        }
    }
    function coordinates(e, t) {
        return Object.freeze({
            screenX: t.screenX,
            screenY: t.screenY,
            clientX: t.clientX,
            clientY: t.clientY,
            timeStamp: eventTime(e)
        });
    }
    function midpoints(e, t1, t2) {
        return Object.freeze({
            screenX: floor((t1.screenX + t2.screenX) / 2),
            screenY: floor((t1.screenY + t2.screenY) / 2),
            clientX: floor((t1.clientX + t2.clientX) / 2),
            clientY: floor((t1.clientY + t2.clientY) / 2),
            timeStamp: eventTime(e)
        });
    }
    function between(c1, c2) {
        var r = GD.THRESHOLD_SMOOTHING;
        return Object.freeze({
            screenX: floor(c1.screenX + r * (c2.screenX - c1.screenX)),
            screenY: floor(c1.screenY + r * (c2.screenY - c1.screenY)),
            clientX: floor(c1.clientX + r * (c2.clientX - c1.clientX)),
            clientY: floor(c1.clientY + r * (c2.clientY - c1.clientY)),
            timeStamp: floor(c1.timeStamp + r * (c2.timeStamp - c1.timeStamp))
        });
    }
    function touchDistance(t1, t2) {
        var dx = t2.screenX - t1.screenX;
        var dy = t2.screenY - t1.screenY;
        return sqrt(dx * dx + dy * dy);
    }
    function touchDirection(t1, t2) {
        return atan2(t2.screenY - t1.screenY, t2.screenX - t1.screenX) * 180 / PI;
    }
    function touchRotation(d1, d2) {
        var angle = d2 - d1;
        if (angle > 180) {
            angle -= 360;
        } else if (angle <= -180) {
            angle += 360;
        }
        return angle;
    }
    function isDoubleTap(lastTap, thisTap) {
        var dx = abs(thisTap.screenX - lastTap.screenX);
        var dy = abs(thisTap.screenY - lastTap.screenY);
        var dt = thisTap.timeStamp - lastTap.timeStamp;
        return dx < GD.DOUBLE_TAP_DISTANCE && dy < GD.DOUBLE_TAP_DISTANCE && dt < GD.DOUBLE_TAP_TIME;
    }
    var initialState = {
        name: 'initialState',
        init: function (d, e, t) {
            d.target = null;
            d.start = d.last = null;
            d.touch1 = d.touch2 = null;
            d.vx = d.vy = null;
            d.startDistance = d.lastDistance = null;
            d.startDirection = d.lastDirection = null;
            d.lastMidpoint = null;
            d.scaled = d.rotated = null;
            if (e && t && e.type === 'touchstart') {
                initialState.touchstart(d, e, t);
            }
        },
        touchstart: function (d, e, t) {
            d.switchTo(touchStartedState, e, t);
        }
    };
    var touchStartedState = {
        name: 'touchStartedState',
        init: function (d, e, t) {
            d.target = e.target;
            d.touch1 = t.identifier;
            d.start = d.last = coordinates(e, t);
            if (d.options.holdEvents) {
                d.startTimer('holdtimeout', GD.HOLD_INTERVAL);
            }
        },
        touchstart: function (d, e, t) {
            d.clearTimer('holdtimeout');
            if (e.touches.length > 1) {
                d.switchTo(transformState, e, t);
            } else {
                console.warn('Ignoring missing touchend event. See bug 1162771.');
                d.switchTo(initialState, e, t);
            }
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            if (abs(t.screenX - d.start.screenX) > d.options.panThreshold || abs(t.screenY - d.start.screenY) > d.options.panThreshold) {
                d.clearTimer('holdtimeout');
                d.switchTo(panStartedState, e, t);
            }
        },
        touchend: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            if (d.lastTap && isDoubleTap(d.lastTap, d.start)) {
                d.emitEvent('tap', d.start);
                d.emitEvent('dbltap', d.start);
                d.lastTap = null;
            } else {
                d.emitEvent('tap', d.start);
                d.lastTap = coordinates(e, t);
            }
            d.clearTimer('holdtimeout');
            d.switchTo(initialState);
        },
        holdtimeout: function (d) {
            d.switchTo(holdState);
        }
    };
    var panStartedState = {
        name: 'panStartedState',
        init: function (d, e, t) {
            d.start = d.last = between(d.start, coordinates(e, t));
            if (e.type === 'touchmove') {
                panStartedState.touchmove(d, e, t);
            }
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            var current = coordinates(e, t);
            d.emitEvent('pan', {
                absolute: {
                    dx: current.screenX - d.start.screenX,
                    dy: current.screenY - d.start.screenY
                },
                relative: {
                    dx: current.screenX - d.last.screenX,
                    dy: current.screenY - d.last.screenY
                },
                position: current
            });
            var dt = current.timeStamp - d.last.timeStamp;
            var vx = (current.screenX - d.last.screenX) / dt;
            var vy = (current.screenY - d.last.screenY) / dt;
            if (d.vx == null) {
                d.vx = vx;
                d.vy = vy;
            } else {
                d.vx = d.vx * GD.VELOCITY_SMOOTHING + vx * (1 - GD.VELOCITY_SMOOTHING);
                d.vy = d.vy * GD.VELOCITY_SMOOTHING + vy * (1 - GD.VELOCITY_SMOOTHING);
            }
            d.last = current;
        },
        touchend: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            var current = coordinates(e, t);
            var dx = current.screenX - d.start.screenX;
            var dy = current.screenY - d.start.screenY;
            var angle = atan2(dy, dx) * 180 / PI;
            if (angle < 0) {
                angle += 360;
            }
            var direction;
            if (angle >= 315 || angle < 45) {
                direction = 'right';
            } else if (angle >= 45 && angle < 135) {
                direction = 'down';
            } else if (angle >= 135 && angle < 225) {
                direction = 'left';
            } else if (angle >= 225 && angle < 315) {
                direction = 'up';
            }
            d.emitEvent('swipe', {
                start: d.start,
                end: current,
                dx: dx,
                dy: dy,
                dt: e.timeStamp - d.start.timeStamp,
                vx: d.vx,
                vy: d.vy,
                direction: direction,
                angle: angle
            });
            d.switchTo(initialState);
        }
    };
    var holdState = {
        name: 'holdState',
        init: function (d) {
            d.emitEvent('holdstart', d.start);
        },
        touchmove: function (d, e, t) {
            var current = coordinates(e, t);
            d.emitEvent('holdmove', {
                absolute: {
                    dx: current.screenX - d.start.screenX,
                    dy: current.screenY - d.start.screenY
                },
                relative: {
                    dx: current.screenX - d.last.screenX,
                    dy: current.screenY - d.last.screenY
                },
                position: current
            });
            d.last = current;
        },
        touchend: function (d, e, t) {
            var current = coordinates(e, t);
            d.emitEvent('holdend', {
                start: d.start,
                end: current,
                dx: current.screenX - d.start.screenX,
                dy: current.screenY - d.start.screenY
            });
            d.switchTo(initialState);
        }
    };
    var transformState = {
        name: 'transformState',
        init: function (d, e, t) {
            d.touch2 = t.identifier;
            var t1 = e.touches.identifiedTouch(d.touch1);
            var t2 = e.touches.identifiedTouch(d.touch2);
            d.startDistance = d.lastDistance = touchDistance(t1, t2);
            d.startDirection = d.lastDirection = touchDirection(t1, t2);
            d.scaled = d.rotated = false;
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1 && t.identifier !== d.touch2) {
                return;
            }
            var t1 = e.touches.identifiedTouch(d.touch1);
            var t2 = e.touches.identifiedTouch(d.touch2);
            var midpoint = midpoints(e, t1, t2);
            var distance = touchDistance(t1, t2);
            var direction = touchDirection(t1, t2);
            var rotation = touchRotation(d.startDirection, direction);
            if (!d.scaled) {
                if (abs(distance - d.startDistance) > GD.SCALE_THRESHOLD) {
                    d.scaled = true;
                    d.startDistance = d.lastDistance = floor(d.startDistance + GD.THRESHOLD_SMOOTHING * (distance - d.startDistance));
                } else {
                    distance = d.startDistance;
                }
            }
            if (!d.rotated) {
                if (abs(rotation) > GD.ROTATE_THRESHOLD) {
                    d.rotated = true;
                } else {
                    direction = d.startDirection;
                }
            }
            if (d.scaled || d.rotated) {
                d.emitEvent('transform', {
                    absolute: {
                        scale: distance / d.startDistance,
                        rotate: touchRotation(d.startDirection, direction)
                    },
                    relative: {
                        scale: distance / d.lastDistance,
                        rotate: touchRotation(d.lastDirection, direction)
                    },
                    midpoint: midpoint
                });
                d.lastDistance = distance;
                d.lastDirection = direction;
                d.lastMidpoint = midpoint;
            }
        },
        touchend: function (d, e, t) {
            if (t.identifier === d.touch2) {
                d.touch2 = null;
            } else if (t.identifier === d.touch1) {
                d.touch1 = d.touch2;
                d.touch2 = null;
            } else {
                return;
            }
            if (d.scaled || d.rotated) {
                d.emitEvent('transformend', {
                    absolute: {
                        scale: d.lastDistance / d.startDistance,
                        rotate: touchRotation(d.startDirection, d.lastDirection)
                    },
                    relative: {
                        scale: 1,
                        rotate: 0
                    },
                    midpoint: d.lastMidpoint
                });
            }
            d.switchTo(afterTransformState);
        }
    };
    var afterTransformState = {
        name: 'afterTransformState',
        touchstart: function (d, e, t) {
            d.switchTo(transformState, e, t);
        },
        touchend: function (d, e, t) {
            if (t.identifier === d.touch1) {
                d.switchTo(initialState);
            }
        }
    };
    return GD;
}();
define('shared/js/gesture_detector', function (global) {
    return function () {
        var ret, fn;
        return ret || global.GestureDetector;
    };
}(this));
define('iframe_shims', ['shared/js/gesture_detector'], function (GestureDetector) {
    var DEFAULT_STYLE_TAG = '<style type="text/css">\n' + 'blockquote {' + 'margin: 0; ' + '-moz-border-start: 0.2rem solid gray;' + 'padding: 0; -moz-padding-start: 0.5rem; ' + '}\n' + 'html, body { max-width: 120rem; word-wrap: break-word;' + ' overflow: hidden; padding: 0; margin: 0; }\n' + 'pre { white-space: pre-wrap; word-wrap: break-word; }\n' + '.moz-external-link { color: #00aac5; cursor: pointer; }\n' + '</style>';
    var iframeShimsOpts = {
        zoomDelayMS: 200,
        initialScale: null,
        resizeLimit: 4,
        initialResizePollIntervalMS: 200,
        noResizePollIntervalMS: 250,
        didResizePollIntervalMS: 300,
        pictureDelayPollIntervalMS: 200
    };
    function createAndInsertIframeForContent(htmlStr, scrollContainer, parentNode, beforeNode, interactiveMode, clickHandler) {
        var scrollPad = 0;
        var viewportWidth = parentNode.offsetWidth - scrollPad;
        var viewport = document.createElement('div');
        viewport.setAttribute('style', 'padding: 0; border-width: 0; margin: 0; ' + 'overflow: hidden;');
        viewport.style.width = viewportWidth + 'px';
        var iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin');
        iframe.setAttribute('style', 'padding: 0; border-width: 0; margin: 0; ' + 'overflow: hidden; ' + 'transform-origin: top ' + (document.documentElement.dir === 'rtl' ? 'right' : 'left') + '; ' + 'pointer-events: none;');
        if (iframeShimsOpts.tapTransform) {
            iframe.style.transform = 'scale(1)';
        }
        iframe.style.width = viewportWidth + 'px';
        viewport.appendChild(iframe);
        parentNode.insertBefore(viewport, beforeNode);
        iframe.contentDocument.open();
        iframe.contentDocument.write('<!doctype html><html><head>');
        iframe.contentDocument.write(DEFAULT_STYLE_TAG);
        iframe.contentDocument.write('</head><body>');
        iframe.contentDocument.write(htmlStr);
        iframe.contentDocument.write('</body>');
        iframe.contentDocument.close();
        var iframeBody = iframe.contentDocument.body;
        var scrollWidth = iframeBody.scrollWidth;
        var scrollHeight = iframeBody.scrollHeight;
        var baseScale = Math.min(1, viewportWidth / scrollWidth), lastRequestedScale = iframeShimsOpts.initialScale || baseScale, scale = lastRequestedScale, lastDoubleTapScale = scale, scaleMode = 0;
        viewport.style.width = Math.ceil(scrollWidth * scale) + 'px';
        viewport.style.height = Math.ceil(scrollHeight * scale) + 'px';
        iframe.style.width = scrollWidth + 'px';
        var resizeFrame = function (why) {
            if (why === 'initial' || why === 'poll') {
                scrollWidth = iframeBody.scrollWidth;
                scrollHeight = iframeBody.scrollHeight;
                var oldBaseScale = baseScale;
                baseScale = Math.min(1, viewportWidth / scrollWidth);
                if (scale === oldBaseScale) {
                    scale = baseScale;
                }
                iframe.style.width = scrollWidth + 'px';
                console.log('iframe_shims: recalculating height / width because', why, 'sw', scrollWidth, 'sh', scrollHeight, 'bs', baseScale);
            }
            console.log('iframe_shims: scale:', scale);
            iframe.style.transform = 'scale(' + scale + ')';
            iframe.style.height = scrollHeight * Math.max(1, scale) + scrollPad + 'px';
            viewport.style.width = Math.ceil(scrollWidth * scale) + 'px';
            viewport.style.height = Math.ceil(scrollHeight * scale) + scrollPad + 'px';
        };
        resizeFrame('initial');
        var activeZoom = false, lastCenterX, lastCenterY;
        var zoomFrame = function (newScale, centerX, centerY) {
            if (newScale === scale) {
                return;
            }
            lastRequestedScale = newScale;
            lastCenterX = centerX;
            lastCenterY = centerY;
            if (activeZoom) {
                return;
            }
            activeZoom = true;
            var iframeScrolledTop = scrollContainer.scrollTop - extraHeight, iframeScrolledLeft = scrollContainer.scrollLeft;
            var ix = centerX + iframeScrolledLeft, iy = centerY + iframeScrolledTop;
            var scaleDelta = newScale / scale;
            var vertScrollDelta = Math.ceil(iy * scaleDelta), horizScrollDelta = Math.ceil(ix * scaleDelta);
            scale = newScale;
            resizeFrame('zoom');
            scrollContainer.scrollTop = vertScrollDelta + extraHeight - centerY;
            scrollContainer.scrollLeft = horizScrollDelta - centerX;
            window.setTimeout(clearActiveZoom, iframeShimsOpts.zoomDelayMS);
        };
        var clearActiveZoom = function () {
            activeZoom = false;
            if (scale !== lastRequestedScale) {
                window.requestAnimationFrame(function () {
                    console.log('delayed zoomFrame timeout, probably causing a mem-spike');
                    zoomFrame(lastRequestedScale, lastCenterX, lastCenterY);
                });
            }
        };
        var resizePollerTimeout = null;
        var resizePollCount = 0;
        var pollResize = function () {
            var opts = iframeShimsOpts;
            var desiredScrollWidth = iframeBody.scrollWidth;
            var desiredScrollHeight = iframeBody.scrollHeight;
            var resized = false;
            if (desiredScrollWidth > scrollWidth || desiredScrollHeight > scrollHeight) {
                resizeFrame('poll');
                resized = true;
            }
            if (++resizePollCount < opts.resizeLimit) {
                resizePollerTimeout = window.setTimeout(pollResize, resized ? opts.didResizePollIntervalMS : opts.noResizePollIntervalMS);
            } else {
                resizePollerTimeout = null;
            }
        };
        resizePollerTimeout = window.setTimeout(pollResize, iframeShimsOpts.initialResizePollIntervalMS);
        var iframeShims = {
            iframe: iframe,
            resizeHandler: function () {
                resizePollCount = 0;
                if (resizePollerTimeout) {
                    window.clearTimeout(resizePollerTimeout);
                }
                resizePollerTimeout = window.setTimeout(pollResize, iframeShimsOpts.pictureDelayPollIntervalMS);
            }
        };
        if (interactiveMode !== 'interactive') {
            return iframeShims;
        }
        var detectorTarget = viewport;
        var detector = new GestureDetector(detectorTarget);
        detector.startDetecting();
        if (clickHandler) {
            viewport.removeEventListener('click', clickHandler);
            bindSanitizedClickHandler(viewport, clickHandler, null, iframe);
        }
        var title = document.getElementsByClassName('msg-reader-header')[0];
        var header = document.getElementsByClassName('msg-envelope-bar')[0];
        var extraHeight = title.clientHeight + header.clientHeight;
        detectorTarget.addEventListener('dbltap', function (e) {
            var newScale = scale;
            if (lastDoubleTapScale === lastRequestedScale) {
                scaleMode = (scaleMode + 1) % 3;
                switch (scaleMode) {
                case 0:
                    newScale = baseScale;
                    break;
                case 1:
                    newScale = 1;
                    break;
                case 2:
                    newScale = 2;
                    break;
                }
                console.log('already in double-tap, deciding on new scale', newScale);
            } else {
                if (lastRequestedScale > 1) {
                    newScale = lastDoubleTapScale;
                    scaleMode = 0;
                } else {
                    newScale = 2;
                    scaleMode = 2;
                }
                console.log('user was not in double-tap switching to double-tap with', newScale);
            }
            lastDoubleTapScale = newScale;
            try {
                zoomFrame(newScale, e.detail.clientX, e.detail.clientY);
            } catch (ex) {
                console.error('zoom bug!', ex, '\n', ex.stack);
            }
        });
        var transformDone = false;
        detectorTarget.addEventListener('transformend', function (e) {
            transformDone = false;
        });
        detectorTarget.addEventListener('transform', function (e) {
            if (transformDone) {
                return;
            }
            var scaleFactor = e.detail.absolute.scale;
            var newScale = lastRequestedScale;
            if (scaleFactor > 1.15) {
                transformDone = true;
                if (lastRequestedScale < 1) {
                    newScale = 1;
                } else if (lastRequestedScale < 1.5) {
                    newScale = 1.5;
                } else if (lastRequestedScale < 2) {
                    newScale = 2;
                } else {
                    return;
                }
            } else if (scaleFactor < 0.9) {
                transformDone = true;
                if (lastRequestedScale > 1.5) {
                    newScale = 1.5;
                } else if (lastRequestedScale > 1) {
                    newScale = 1;
                } else if (lastRequestedScale > baseScale) {
                    newScale = baseScale;
                } else {
                    return;
                }
            } else {
                return;
            }
            zoomFrame(newScale, e.detail.midpoint.clientX, e.detail.midpoint.clientY);
        });
        return iframeShims;
    }
    function bindSanitizedClickHandler(target, clickHandler, topNode, iframe) {
        var eventType, node;
        var root, title, header, attachmentsContainer, msgBodyContainer, titleHeight, headerHeight, attachmentsHeight, msgBodyMarginTop, msgBodyMarginLeft, attachmentsMarginTop, iframeDoc, inputStyle, loadBar, loadBarHeight;
        if (iframe) {
            root = document.getElementsByClassName('scrollregion-horizontal-too')[0];
            title = document.getElementsByClassName('msg-reader-header')[0];
            header = document.getElementsByClassName('msg-envelope-bar')[0];
            attachmentsContainer = document.getElementsByClassName('msg-attachments-container')[0];
            loadBar = document.getElementsByClassName('msg-reader-load-infobar')[0];
            msgBodyContainer = document.getElementsByClassName('msg-body-container')[0];
            inputStyle = window.getComputedStyle(msgBodyContainer);
            msgBodyMarginTop = parseInt(inputStyle.marginTop);
            msgBodyMarginLeft = parseInt(inputStyle.marginLeft);
            titleHeight = title.clientHeight;
            headerHeight = header.clientHeight;
            eventType = 'tap';
            iframeDoc = iframe.contentDocument;
        } else {
            eventType = 'click';
        }
        target.addEventListener(eventType, function clicked(event) {
            if (iframe) {
                loadBarHeight = loadBar.clientHeight;
                attachmentsHeight = attachmentsContainer.clientHeight;
                inputStyle = window.getComputedStyle(attachmentsContainer);
                attachmentsMarginTop = attachmentsHeight ? parseInt(inputStyle.marginTop) : 0;
                var dx, dy;
                var transform = iframe.style.transform || 'scale(1)';
                var scale = transform.match(/(\d|\.)+/g)[0];
                if (document.dir === 'rtl') {
                    dx = event.detail.clientX - msgBodyMarginLeft + root.scrollWidth + root.scrollLeft - root.clientWidth;
                } else {
                    dx = event.detail.clientX + root.scrollLeft - msgBodyMarginLeft;
                }
                dy = event.detail.clientY + root.scrollTop - titleHeight - headerHeight - loadBarHeight - attachmentsHeight - attachmentsMarginTop - msgBodyMarginTop;
                node = iframeDoc.elementFromPoint(dx / scale, dy / scale);
            } else {
                node = event.originalTarget;
            }
            while (node !== topNode) {
                if (node.nodeName === 'A') {
                    if (node.hasAttribute('ext-href')) {
                        clickHandler(event, node, node.getAttribute('ext-href'), node.textContent);
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
                node = node.parentNode;
            }
        });
    }
    return {
        createAndInsertIframeForContent: createAndInsertIframeForContent,
        bindSanitizedClickHandler: bindSanitizedClickHandler,
        iframeShimsOpts: iframeShimsOpts
    };
});
define('cards/editor_mixins', ['require'], function (require) {
    return {
        _bindEditor: function (textNode) {
            this._editorNode = textNode;
            textNode.addEventListener('paste', function (event) {
                event.preventDefault();
                var text = event.clipboardData.getData('text/plain');
                if (text) {
                    document.execCommand('insertText', false, text);
                }
            });
        },
        populateEditor: function (value) {
            var lines = value.split('\n');
            var frag = document.createDocumentFragment();
            for (var i = 0, len = lines.length; i < len; i++) {
                if (i) {
                    frag.appendChild(document.createElement('br'));
                }
                if (lines[i]) {
                    frag.appendChild(document.createTextNode(lines[i]));
                }
            }
            if (!frag.childNodes.length) {
                frag.appendChild(document.createTextNode(''));
            }
            this._editorNode.appendChild(frag);
        },
        fromEditor: function (value) {
            var content = '';
            var len = this._editorNode.childNodes.length;
            for (var i = 0; i < len; i++) {
                var node = this._editorNode.childNodes[i];
                if (node.nodeName === 'BR' && node.getAttribute('type') !== '_moz') {
                    content += '\n';
                } else {
                    content += node.textContent;
                }
            }
            return content;
        }
    };
});
define('date', [
    'require',
    'moz_intl'
], function (require) {
    const mozIntl = require('moz_intl');
    var shortRelativeDateFmt, longRelativeDateFmt;
    function setRelativeDateFormatters() {
        shortRelativeDateFmt = mozIntl._gaia.RelativeDate(navigator.languages, { style: 'short' });
        longRelativeDateFmt = mozIntl._gaia.RelativeDate(navigator.languages, { style: 'long' });
    }
    setRelativeDateFormatters();
    window.addEventListener('languagechange', setRelativeDateFormatters);
    var date = {
        relativeDateElement: function (element, time, useCompactFormat) {
            if (time) {
                var f = useCompactFormat ? shortRelativeDateFmt : longRelativeDateFmt;
                f.formatElement(element, time);
            } else {
                element.textContent = '';
            }
        },
        setPrettyNodeDate: function (node, timestamp) {
            if (timestamp) {
                node.dataset.time = timestamp.valueOf();
                node.dataset.compactFormat = true;
                date.relativeDateElement(node, timestamp, true);
            } else {
                node.textContent = '';
                node.removeAttribute('data-time');
            }
        }
    };
    return date;
});
define('cards/lst/default_vscroll_data', {
    'isPlaceholderData': true,
    'id': 'INVALID',
    'author': {
        'name': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583',
        'address': '',
        'contactId': null
    },
    'to': [{
            'name': ' ',
            'address': ' ',
            'contactId': null
        }],
    'cc': null,
    'bcc': null,
    'date': '0',
    'hasAttachments': false,
    'snippet': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' + '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' + '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583',
    'isRead': true,
    'isStarred': false,
    'sendStatus': {},
    'subject': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' + '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' + '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583'
});
define('message_list_topbar', [
    'require',
    'exports',
    'module',
    'l10n!',
    'transition_end'
], function (require, exports, module) {
    var mozL10n = require('l10n!'), transitionEnd = require('transition_end');
    var proto = {
        domNode: null,
        _scrollContainer: null,
        _vScroll: null,
        _delayedState: null,
        _newEmailCount: 0,
        _scrollTop: 0,
        _thresholdMultiplier: 2,
        visibleOffset: 0,
        createdCallback: function () {
            this.domNode.addEventListener('click', this._onClick.bind(this));
            transitionEnd(this.domNode, this._onTransitionEnd.bind(this));
        },
        resetNodeForCache: function (node) {
            node.classList.remove('closing');
            node.textContent = '';
            node.dataset.state = '';
            this.domNode.style.left = '';
        },
        bindToElements: function (scrollContainer, vScroll) {
            this._scrollContainer = scrollContainer;
            this._scrollContainer.addEventListener('scroll', this._onScroll.bind(this));
            this._scrollTop = this._scrollContainer.scrollTop;
            this._vScroll = vScroll;
        },
        showNewEmailCount: function (newEmailCount) {
            if (this._scrollTop <= this.visibleOffset) {
                return;
            }
            this._newEmailCount = newEmailCount;
            this._showState('message');
        },
        _getState: function () {
            return this.domNode.dataset.state;
        },
        _showState: function (state) {
            var nodeState = this._getState();
            if (nodeState === state) {
                return;
            } else if (!nodeState || !state) {
                this._animateState(state);
            } else if (nodeState !== state && (nodeState !== 'message' || state !== 'top')) {
                this._delayedState = state;
                if (!this._animating) {
                    this._animateState('');
                }
            }
        },
        _animateState: function (state) {
            this._animating = true;
            if (!state && this._getState()) {
                this.domNode.classList.add('closing');
            } else {
                this.domNode.classList.add('no-anim');
                this.domNode.classList.toggle('horiz-message', state === 'message');
                this.domNode.classList.toggle('horiz-top', state === 'top');
                this.domNode.clientWidth;
                if (state === 'message') {
                    mozL10n.setAttributes(this.domNode, 'new-messages', { n: this._newEmailCount });
                } else if (state === 'top') {
                    mozL10n.setAttributes(this.domNode, 'message-list-top-action');
                }
                this.domNode.classList.remove('no-anim');
                this.domNode.clientWidth;
                this.domNode.dataset.state = state;
            }
        },
        _onTransitionEnd: function (evt) {
            this._animating = false;
            if (this.domNode.classList.contains('closing')) {
                this.domNode.classList.remove('closing');
                this.domNode.dataset.state = '';
                this.domNode.style.left = '';
            }
            if (this._delayedState) {
                this._animateState(this._delayedState);
                this._delayedState = null;
            }
        },
        _onScroll: function (evt) {
            if (!this._topThreshold) {
                var rect = this._scrollContainer.getBoundingClientRect();
                this._topThreshold = rect.height * this._thresholdMultiplier;
                this.domNode.style.top = rect.top + 'px';
            }
            if (this._vScroll.lastScrollTopSetTime && this._vScroll.lastScrollTopSetTime + 500 > Date.now()) {
                return;
            }
            var scrollTop = this._scrollContainer.scrollTop, scrollingDown = scrollTop > this._scrollTop, nodeState = this._getState();
            if (scrollTop !== this._scrollTop) {
                if (scrollTop <= this.visibleOffset) {
                    this._showState('');
                } else if (scrollingDown) {
                    this._showState('');
                } else if (nodeState !== 'top' && scrollTop > this._topThreshold) {
                    this._showState('top');
                }
            }
            this._scrollTop = scrollTop;
        },
        _onClick: function (evt) {
            if (this._vScroll) {
                this._vScroll.jumpToIndex(0);
                this._showState('');
            }
        }
    };
    function MessageListTopBar(domNode) {
        this.domNode = domNode;
        this.createdCallback();
    }
    MessageListTopBar.prototype = proto;
    return MessageListTopBar;
});
define('message_display', [
    'require',
    'l10n!'
], function (require) {
    var mozL10n = require('l10n!');
    return {
        subject: function (subjectNode, message) {
            var subject = message.subject && message.subject.trim();
            if (subject) {
                subjectNode.textContent = subject;
                subjectNode.classList.remove('msg-no-subject');
                subjectNode.removeAttribute('data-l10n-id');
            } else {
                mozL10n.setAttributes(subjectNode, 'message-no-subject');
                subjectNode.classList.add('msg-no-subject');
            }
        }
    };
});
define('cards/lst/peep_dom', [], function () {
    return {
        update: function (peep) {
            peep.element.textContent = peep.name || peep.address;
        }
    };
});
define('vscroll', [
    'require',
    'exports',
    'module',
    'evt'
], function (require, exports, module) {
    var evt = require('evt'), slice = Array.prototype.slice, useTransform = false;
    function setTop(node, value) {
        if (useTransform) {
            node.style.transform = 'translateY(' + value + 'px)';
        } else {
            node.style.top = value + 'px';
        }
    }
    function VScroll(container, scrollingContainer, template, defaultData) {
        evt.Emitter.call(this);
        this.container = container;
        this.scrollingContainer = scrollingContainer;
        this.template = template;
        this.defaultData = defaultData;
        this._inited = false;
        this._capturedScreenMetrics = false;
        this.firstRenderedIndex = 0;
        this._limited = false;
        this.nodes = [];
        this.nodesDataIndices = {};
        this.nodesIndex = -1;
        this.scrollTop = 0;
        this.visibleOffset = 0;
        this.oldListSize = 0;
        this._lastEventTime = 0;
        this.onEvent = this.onEvent.bind(this);
        this.onChange = this.onChange.bind(this);
        this._scrollTimeoutPoll = this._scrollTimeoutPoll.bind(this);
    }
    VScroll.nodeClassName = 'vscroll-node';
    VScroll.trimMessagesForCache = function (container, itemLimit) {
        var nodes = slice.call(container.querySelectorAll('.' + VScroll.nodeClassName));
        nodes.forEach(function (node) {
            var index = parseInt(node.dataset.index, 10);
            delete node.dataset.index;
            if (index > itemLimit - 1) {
                container.removeChild(node);
            }
        });
    };
    VScroll.prototype = {
        eventRateLimitMillis: 0,
        itemsPerScreen: undefined,
        prerenderScreens: 3,
        prefetchScreens: 2,
        retainExtraRenderedScreens: 3,
        recalculatePaddingScreens: 1.5,
        lastScrollTopSetTime: 0,
        prerenderItemCount: undefined,
        prefetchItemCount: undefined,
        recalculatePaddingItemCount: undefined,
        itemDefaultDataClass: 'default-data',
        prepareData: function (highAbsoluteIndex) {
        },
        bindData: function (model, node) {
        },
        setData: function (list) {
            this.list = list;
            if (this._inited) {
                if (!this.waitingForRecalculate) {
                    this._recalculate(0);
                }
                this.emit('dataChanged');
            } else {
                this._init();
                this.renderCurrentPosition();
            }
        },
        updateDataBind: function (index, dataList, removedCount) {
            if (!this._inited) {
                return;
            }
            if (this.oldListSize !== this.list.size() || removedCount) {
                if (!this.waitingForRecalculate) {
                    this.waitingForRecalculate = true;
                    this.once('scrollStopped', function () {
                        this._recalculate(index);
                    }.bind(this));
                }
                return;
            }
            for (var i = 0; i < dataList.length; i++) {
                var absoluteIndex = index + i;
                var node = this._getNodeFromDataIndex(absoluteIndex);
                if (node) {
                    this.bindData(dataList[i], node);
                }
            }
        },
        onEvent: function () {
            this._lastEventTime = Date.now();
            if (!this.eventRateLimitMillis) {
                this.onChange();
                return;
            }
            if (this._limited) {
                return;
            }
            this._limited = true;
            setTimeout(this.onChange, this.eventRateLimitMillis);
        },
        onChange: function () {
            this._limited = false;
            if (!this._inited) {
                return;
            }
            if (this.lastScrollTopSetTime) {
                if (this.lastScrollTopSetTime + 1000 < Date.now()) {
                    this.lastScrollTopSetTime = 0;
                }
            }
            var startIndex, endIndex, scrollTop = this.scrollingContainer.scrollTop, scrollingDown = scrollTop >= this.scrollTop;
            this.scrollTop = scrollTop;
            var visibleRange = this.getVisibleIndexRange();
            if (scrollingDown) {
                startIndex = visibleRange[0];
                endIndex = visibleRange[1] + this.prerenderItemCount;
                this.prepareData(endIndex + this.prefetchItemCount);
            } else {
                startIndex = visibleRange[0] - this.prerenderItemCount;
                endIndex = visibleRange[1];
            }
            this._render(startIndex, endIndex);
            this._startScrollStopPolling();
        },
        nowVisible: function () {
            if (!this._inited && this.list) {
                this._init();
                this.onChange();
            }
        },
        renderCurrentPosition: function () {
            if (!this._inited) {
                return;
            }
            var scrollTop = this.scrollingContainer.scrollTop;
            this.scrollTop = scrollTop;
            var visibleRange = this.getVisibleIndexRange();
            var startIndex = visibleRange[0] - this.recalculatePaddingItemCount;
            var endIndex = visibleRange[1] + this.recalculatePaddingItemCount;
            this._render(startIndex, endIndex);
            this.prepareData(endIndex);
        },
        indexAtScrollPosition: function (position) {
            var top = position - this.visibleOffset;
            if (top < 0) {
                top = 0;
            }
            return this.itemHeight ? Math.floor(top / this.itemHeight) : 0;
        },
        getVisibleIndexRange: function () {
            if (this.itemHeight === undefined) {
                return undefined;
            }
            var top = this.scrollTop;
            return [
                this.indexAtScrollPosition(top),
                this.indexAtScrollPosition(top + this.innerHeight)
            ];
        },
        jumpToIndex: function (index) {
            this._setContainerScrollTop(index * this.itemHeight + this.visibleOffset);
        },
        clearDisplay: function () {
            this.container.innerHTML = '';
            this.container.style.height = '0px';
            this.oldListSize = 0;
        },
        destroy: function () {
            this.scrollingContainer.removeEventListener('scroll', this.onEvent);
            if (this._scrollTimeoutPoll) {
                clearTimeout(this._scrollTimeoutPoll);
                this._scrollTimeoutPoll = 0;
            }
        },
        _setContainerScrollTop: function (value) {
            this.scrollingContainer.scrollTop = value;
            this.lastScrollTopSetTime = Date.now();
        },
        _render: function (startIndex, endIndex) {
            var i, listSize = this.list.size();
            if (startIndex < 0) {
                startIndex = 0;
            }
            if (endIndex >= listSize) {
                endIndex = listSize - 1;
            }
            this.firstRenderedIndex = startIndex;
            if (!this._inited) {
                this._init();
            }
            for (i = startIndex; i <= endIndex; i++) {
                if (this._getNodeFromDataIndex(i)) {
                    continue;
                }
                var node = this._nextAvailableNode(startIndex, endIndex), data = this.list(i);
                if (!data) {
                    data = this.defaultData;
                }
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
                setTop(node, i * this.itemHeight);
                this._setNodeDataIndex(this.nodesIndex, i);
                this.bindData(data, node);
                this.container.appendChild(node);
            }
        },
        _setNodeDataIndex: function (nodesIndex, dataIndex) {
            var oldDataIndex = this.nodes[nodesIndex].vScrollDataIndex;
            if (oldDataIndex > -1) {
                this.nodesDataIndices[oldDataIndex] = -1;
            }
            var node = this.nodes[nodesIndex];
            node.vScrollDataIndex = dataIndex;
            node.dataset.index = dataIndex;
            this.nodesDataIndices[dataIndex] = nodesIndex;
        },
        _getNodeFromDataIndex: function (dataIndex) {
            var index = this.nodesDataIndices[dataIndex];
            if (index === undefined) {
                index = -1;
            }
            return index === -1 ? null : this.nodes[index];
        },
        captureScreenMetrics: function () {
            if (this._capturedScreenMetrics) {
                return;
            }
            this.innerHeight = this.scrollingContainer.getBoundingClientRect().height;
            if (this.innerHeight > 0) {
                this._capturedScreenMetrics = true;
            }
        },
        _init: function () {
            if (this._inited) {
                return;
            }
            this.container.innerHTML = '';
            var node = this.template.cloneNode(true);
            this.container.appendChild(node);
            this.itemHeight = node.clientHeight;
            this.container.removeChild(node);
            this.captureScreenMetrics();
            if (!this.itemHeight || !this.innerHeight) {
                return;
            }
            this.scrollingContainer.addEventListener('scroll', this.onEvent);
            this.itemsPerScreen = Math.ceil(this.innerHeight / this.itemHeight);
            this.prerenderItemCount = Math.ceil(this.itemsPerScreen * this.prerenderScreens);
            this.prefetchItemCount = Math.ceil(this.itemsPerScreen * this.prefetchScreens);
            this.recalculatePaddingItemCount = Math.ceil(this.itemsPerScreen * this.recalculatePaddingScreens);
            this.nodeCount = this.itemsPerScreen + this.prerenderItemCount + Math.ceil(this.retainExtraRenderedScreens * this.itemsPerScreen);
            for (var i = 0; i < this.nodeCount; i++) {
                node = this.template.cloneNode(true);
                node.classList.add(VScroll.nodeClassName);
                setTop(node, -1 * this.itemHeight);
                this.nodes.push(node);
                this._setNodeDataIndex(i, -1);
            }
            this._calculateTotalHeight();
            this._inited = true;
            this.emit('inited');
        },
        _nextAvailableNode: function (beginIndex, endIndex) {
            var i, node, vScrollDataIndex, count = 0;
            for (i = this.nodesIndex + 1; count < this.nodes.length; count++, i++) {
                if (i > this.nodes.length - 1) {
                    i = 0;
                }
                node = this.nodes[i];
                vScrollDataIndex = node.vScrollDataIndex;
                if (vScrollDataIndex < beginIndex || vScrollDataIndex > endIndex) {
                    this.nodesIndex = i;
                    break;
                }
            }
            return node;
        },
        _recalculate: function (refIndex) {
            if (!this._inited) {
                return;
            }
            var node, index = this.indexAtScrollPosition(this.scrollTop), remainder = this.scrollTop % this.itemHeight, sizeDiff = this.list.size() - this.oldListSize;
            if (refIndex && refIndex < index && sizeDiff > 0 && this.oldListSize !== 0 && index !== 0) {
                index += sizeDiff;
            }
            console.log('VSCROLL scrollTop: ' + this.scrollTop + ', RECALCULATE: ' + index + ', ' + remainder);
            this._calculateTotalHeight();
            for (var i = 0; i < this.nodeCount; i++) {
                node = this.nodes[i];
                setTop(node, -1 * this.itemHeight);
                this._setNodeDataIndex(i, -1);
            }
            this.waitingForRecalculate = false;
            this._setContainerScrollTop(this.itemHeight * index + remainder);
            this.renderCurrentPosition();
            this.emit('recalculated', index === 0, refIndex);
        },
        _calculateTotalHeight: function () {
            var newListSize = this.list.size();
            if (this.oldListSize !== newListSize || parseInt(this.container.style.height, 10) === 0) {
                this.totalHeight = this.itemHeight * newListSize;
                this.container.style.height = this.totalHeight + 'px';
                this.oldListSize = newListSize;
            }
        },
        _scrollTimeoutPoll: function () {
            this._scrollStopTimeout = 0;
            if (Date.now() > this._lastEventTime + 300) {
                this.emit('scrollStopped');
            } else {
                this._scrollStopTimeout = setTimeout(this._scrollTimeoutPoll, 300);
            }
        },
        _startScrollStopPolling: function () {
            if (!this._scrollStopTimeout) {
                this._scrollStopTimeout = setTimeout(this._scrollTimeoutPoll, 300);
            }
        }
    };
    evt.mix(VScroll.prototype);
    var originalOn = VScroll.prototype.on;
    VScroll.prototype.on = function (id, fn) {
        if (id === 'scrollStopped') {
            this._startScrollStopPolling();
        }
        return originalOn.apply(this, slice.call(arguments));
    };
    return VScroll;
});
define('cards/mixins/data-prop', [], function () {
    return {
        templateInsertedCallback: function () {
            var node, parent, nodes = this.querySelectorAll('[data-prop]'), length = nodes.length;
            for (var i = 0; i < length; i++) {
                node = nodes[i];
                parent = node;
                while (parent = parent.parentNode) {
                    if (parent.nodeName.indexOf('-') !== -1) {
                        if (parent !== this) {
                            node = null;
                        }
                        break;
                    }
                }
                if (node && parent) {
                    this[node.dataset.prop] = nodes[i];
                }
            }
        }
    };
});
define('cards/mixins/data-event', [], function () {
    var slice = Array.prototype.slice;
    return {
        templateInsertedCallback: function () {
            slice.call(this.querySelectorAll('[data-event]')).forEach(function (node) {
                var parent = node;
                while (parent = parent.parentNode) {
                    if (parent.nodeName.indexOf('-') !== -1) {
                        if (parent !== this) {
                            return;
                        }
                        break;
                    }
                }
                if (!parent) {
                    return;
                }
                node.dataset.event.split(',').forEach(function (pair) {
                    var evtName, method, parts = pair.split(':');
                    if (!parts[1]) {
                        parts[1] = parts[0];
                    }
                    evtName = parts[0].trim();
                    method = parts[1].trim();
                    if (typeof this[method] !== 'function') {
                        throw new Error('"' + method + '" is not a function, cannot bind with data-event');
                    }
                    node.addEventListener(evtName, function (evt) {
                        evt.stopPropagation();
                        return this[method](evt);
                    }.bind(this), false);
                }.bind(this));
            }.bind(this));
        }
    };
});
define('cards/base', [
    'require',
    'evt',
    './mixins/data-prop',
    './mixins/data-event'
], function (require) {
    var Emitter = require('evt').Emitter;
    return function base(templateMixins) {
        return [
            templateMixins ? templateMixins : {},
            require('./mixins/data-prop'),
            require('./mixins/data-event'),
            Emitter.prototype,
            {
                createdCallback: function () {
                    this.classList.add('email-ce');
                    Emitter.call(this);
                },
                emitDomEvent: function (eventName, detail) {
                    this.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
                }
            }
        ];
    };
});
define('cards/base_card', [
    'require',
    'date',
    'l10n!',
    './base'
], function (require) {
    var date = require('date'), mozL10n = require('l10n!'), base = require('./base');
    (function () {
        var updatePrettyDate = function updatePrettyDate() {
            var labels = [...document.querySelectorAll('[data-time]')];
            labels.forEach(label => {
                date.relativeDateElement(label, label.dataset.time);
            });
        };
        var timer = setInterval(updatePrettyDate, 60 * 1000);
        function updatePrettyDateOnEvent() {
            clearInterval(timer);
            updatePrettyDate();
            timer = setInterval(updatePrettyDate, 60 * 1000);
        }
        mozL10n.ready(updatePrettyDateOnEvent);
        document.addEventListener('visibilitychange', function () {
            if (document && !document.hidden) {
                updatePrettyDateOnEvent();
            } else {
                clearInterval(timer);
            }
        });
    }());
    return function baseCard(templateMixins) {
        return [
            base(templateMixins),
            {
                createdCallback: function () {
                    if (this.extraClasses) {
                        this.classList.add.apply(this.classList, this.extraClasses);
                    }
                    this.classList.add('card');
                },
                batchAddClass: function (searchClass, classToAdd) {
                    var nodes = this.getElementsByClassName(searchClass);
                    for (var i = 0; i < nodes.length; i++) {
                        nodes[i].classList.add(classToAdd);
                    }
                }
            }
        ];
    };
});
define('element', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    var slice = Array.prototype.slice, callbackSuffix = 'Callback', callbackSuffixLength = callbackSuffix.length, charRegExp = /[^a-z]/g, idToTag = function (id) {
            return id.toLowerCase().replace(charRegExp, '-');
        }, moduleConfig = module.config();
    if (moduleConfig.hasOwnProperty('idToTag')) {
        idToTag = moduleConfig.idToTag;
    }
    function makePropName(attrName) {
        var parts = attrName.split('-');
        for (var i = 1; i < parts.length; i++) {
            parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
        }
        return parts.join('');
    }
    function setPropFromAttr(instance, attrName, attrValue) {
        var proto = Object.getPrototypeOf(instance), propName = makePropName(attrName), descriptor = Object.getOwnPropertyDescriptor(proto, propName);
        if (descriptor && descriptor.set) {
            instance[propName] = attrValue;
        }
    }
    function makePropFn(prop) {
        return function () {
            var i, ret, args = slice.call(arguments), fns = this._element.props[prop];
            for (i = 0; i < fns.length; i++) {
                ret = fns[i].apply(this, args);
            }
            return ret;
        };
    }
    function mixFnProp(proto, prop, value, operation) {
        if (proto.hasOwnProperty(prop)) {
            var existing = proto._element.props[prop];
            if (!existing) {
                existing = proto._element.props[prop] = [proto[prop]];
                proto[prop] = makePropFn(prop);
            }
            operation = operation || 'push';
            existing[operation](value);
        } else {
            proto[prop] = value;
        }
    }
    function mix(proto, mixin) {
        if (Array.isArray(mixin)) {
            mixin.forEach(function (mixin) {
                mix(proto, mixin);
            });
            return;
        }
        Object.keys(mixin).forEach(function (key) {
            var suffixIndex, descriptor = Object.getOwnPropertyDescriptor(mixin, key);
            suffixIndex = key.indexOf(callbackSuffix);
            if (suffixIndex > 0 && suffixIndex === key.length - callbackSuffixLength) {
                mixFnProp(proto, key, descriptor.value);
            } else {
                Object.defineProperty(proto, key, descriptor);
            }
        });
    }
    var element = {
        load: function (id, req, onload, config) {
            req([id], function (mod) {
                if (config.isBuild || !mod || typeof mod === 'function') {
                    return onload();
                }
                var proto = Object.create(HTMLElement.prototype);
                Object.defineProperty(proto, '_element', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: {}
                });
                proto._element.props = {};
                mix(proto, mod);
                mixFnProp(proto, 'createdCallback', function attrCreated() {
                    var i, item, attrs = this.attributes;
                    for (i = 0; i < attrs.length; i++) {
                        item = attrs.item(i);
                        setPropFromAttr(this, item.nodeName, item.value);
                    }
                }, 'unshift');
                mixFnProp(proto, 'attributeChangedCallback', function attrChanged(name, oldValue, newValue) {
                    setPropFromAttr(this, name, newValue);
                }, 'unshift');
                var tagId = idToTag(id);
                onload(document.registerElement(tagId, { prototype: proto }));
            });
        }
    };
    return element;
});
define('template', [
    'require',
    'exports',
    'module',
    'element'
], function (require, exports, module) {
    var template, fetchText, isReady = false, readyQueue = [], tagRegExp = /<(\w+-[\w-]+)(\s|>)/g, commentRegExp = /<!--*.?-->/g, attrIdRegExp = /\s(hrefid|srcid)="([^"]+)"/g, buildProtocol = 'build:', moduleConfig = module.config(), depPrefix = 'element!', buildMap = {}, tagToId = function (tag) {
            return tag;
        };
    require('element');
    if (moduleConfig.hasOwnProperty('depPrefix')) {
        depPrefix = moduleConfig.depPrefix;
    }
    if (moduleConfig.hasOwnProperty('tagToId')) {
        tagToId = moduleConfig.tagToId;
    }
    function onReady() {
        isReady = true;
        var bodyTemplate = document.querySelector('template#body');
        if (bodyTemplate) {
            bodyTemplate.parentNode.removeChild(bodyTemplate);
            document.body.innerHTML = bodyTemplate.innerHTML;
        }
        readyQueue.forEach(function (fn) {
            fn();
        });
        readyQueue = [];
    }
    function makeFullId(id, refId) {
        if (id.indexOf('.') === 0 && refId) {
            var parts = refId.split('/');
            parts.pop();
            refId = parts.join('/');
            id = (refId ? refId + '/' : '') + id;
        }
        return id;
    }
    function templateCreatedCallback() {
        if (this.dataset.cached === 'cached' || this.template) {
            if (this.dataset.cached !== 'cached' && this.template) {
                this.innerHTML = '';
                this.appendChild(this.template());
            }
            if (this.templateInsertedCallback) {
                this.templateInsertedCallback();
            }
        }
    }
    if (typeof XMLHttpRequest !== 'undefined') {
        fetchText = function (url, onload, onerror) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                var status, err;
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        onerror(err);
                    } else {
                        onload(xhr.responseText);
                    }
                }
            };
            xhr.responseType = 'text';
            xhr.send(null);
        };
    } else {
        fetchText = function (url, onload) {
            onload(requirejs._readFile(url));
        };
    }
    template = {
        fetchText: fetchText,
        ready: function (fn) {
            if (isReady) {
                setTimeout(fn);
            } else {
                readyQueue.push(fn);
            }
        },
        makeFullId: makeFullId,
        makeTemplateFn: function (text) {
            return function () {
                var e, frag = document.createDocumentFragment(), templateDiv = document.createElement('div');
                templateDiv.innerHTML = text;
                while (e = templateDiv.firstChild) {
                    frag.appendChild(e);
                }
                return frag;
            };
        },
        idsToUrls: function (text, refId) {
            text = text.replace(attrIdRegExp, function (match, type, id) {
                id = makeFullId(id, refId);
                var attr = type === 'hrefid' ? 'href' : 'src';
                return ' ' + attr + '="' + require.toUrl(id) + '"';
            });
            return text;
        },
        depsFromText: function (text) {
            var match, noCommentText, deps = [];
            noCommentText = text.replace(commentRegExp, '');
            tagRegExp.lastIndex = 0;
            while (match = tagRegExp.exec(noCommentText)) {
                deps.push(depPrefix + tagToId(match[1]));
            }
            return deps;
        },
        textToTemplate: function (text, id, skipTranslateIds) {
            var obj, deps = template.depsFromText(text);
            obj = {
                id: id,
                deps: deps,
                text: text
            };
            if (!skipTranslateIds) {
                obj.text = template.idsToUrls(text, id);
                obj.fn = template.makeTemplateFn(obj.text);
            }
            return obj;
        },
        objToFn: function (obj) {
            var text = template.idsToUrls(obj.text, obj.id);
            return template.makeTemplateFn(text);
        },
        templateCreatedCallback: templateCreatedCallback,
        load: function (id, req, onload, config) {
            var isBuild = config.isBuild;
            if (id.indexOf(buildProtocol) === 0 && isBuild) {
                id = id.substring(buildProtocol.length);
                var idList = id.split(','), count = 0, buildIdDone = function () {
                        count += 1;
                        if (count === idList.length) {
                            onload();
                        }
                    };
                buildIdDone.__requireJsBuild = true;
                id.split(',').forEach(function (moduleId) {
                    var path = req.toUrl(moduleId);
                    require(template.depsFromText(requirejs._readFile(path)), buildIdDone);
                });
            } else {
                fetchText(req.toUrl(id), function (text) {
                    var templateObj = template.textToTemplate(text, id, isBuild);
                    req(templateObj.deps, function () {
                        if (isBuild) {
                            buildMap[id] = templateObj;
                        }
                        onload({
                            createdCallback: templateCreatedCallback,
                            template: templateObj.fn
                        });
                    });
                }, onload.error);
            }
        },
        write: function (pluginName, id, write) {
            if (buildMap.hasOwnProperty(id)) {
                var obj = buildMap[id], depString = JSON.stringify(obj.deps);
                depString = depString.replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
                if (depString) {
                    depString = ', ' + depString;
                }
                write.asModule(pluginName + '!' + id, 'define([\'' + module.id + '\'' + depString + '], function(template) { return {\n' + 'createdCallback: template.templateCreatedCallback,\n' + 'template: template.objToFn(' + JSON.stringify(buildMap[id]) + ')}; });\n');
            }
        }
    };
    if (typeof document !== 'undefined') {
        var onDom, onDomDone = false;
        onDom = function () {
            if (onDomDone) {
                return;
            }
            onDomDone = true;
            var converted = template.textToTemplate(document.body.innerHTML);
            require(converted.deps, onReady);
        };
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            onDom();
        } else {
            window.addEventListener('DOMContentLoaded', onDom);
        }
    }
    return template;
});
define('template!cards/lst/edit_header.html', ['template'], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/lst/edit_header.html',
            'deps': [],
            'text': '<section role="region">\n  <header>\n    <a href="#"\n       data-event="click:domEvt"\n       data-domevt-name="editHeaderClose"\n       role="button"\n       data-l10n-id="close-button">\n      <span class="icon icon-close"></span>\n    </a>\n    <h1 data-prop="headerNode"></h1>\n  </header>\n</section>\n'
        })
    };
});
define('cards/mixins/dom_evt', [], function () {
    return {
        domEvt: function (event) {
            var target = event.currentTarget, eventName = target.dataset.domevtName, eventData = {}, eventDetail = target.dataset.domevtDetail;
            event.preventDefault();
            event.stopPropagation();
            if (!eventName) {
                throw new Error('No data-domevt-name on element <' + target.nodeName + ' class="' + target.className + '">');
            }
            if (eventDetail) {
                eventData.detail = eventDetail;
            }
            this.dispatchEvent(new CustomEvent(eventName, eventData));
        }
    };
});
define('cards/lst/edit_header', [
    'require',
    'exports',
    'module',
    'l10n!',
    '../base',
    'template!./edit_header.html',
    '../mixins/dom_evt'
], function (require, exports) {
    var mozL10n = require('l10n!');
    return [
        require('../base')(require('template!./edit_header.html')),
        require('../mixins/dom_evt'),
        {
            updateDomHeaderCount: function (count) {
                mozL10n.setAttributes(this.headerNode, 'message-multiedit-header', { n: count });
            }
        }
    ];
});
define('container_listen', [], function () {
    return function containerListen(containerNode, eventName, func) {
        containerNode.addEventListener(eventName, function (event) {
            var node = event.target;
            if (node === containerNode) {
                return;
            }
            while (node && node.parentNode !== containerNode) {
                node = node.parentNode;
            }
            if (node) {
                func(node, event);
            }
        }, false);
    };
});
define('tmpl!cards/msg/header_item.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<a class="msg-header-item" role="option" tabindex="0">\n  <label class="pack-checkbox negative" aria-hidden="true">\n    <input type="checkbox"><span></span>\n  </label>\n  <div class="msg-header-details-section">\n    <span dir="auto" class="msg-header-author"></span>\n    <span dir="auto" class="msg-header-subject"></span>\n    <span dir="auto" class="msg-header-date"></span>\n    <span dir="auto" class="msg-header-snippet"></span>\n  </div>\n  <div class="msg-header-syncing-section"></div>\n  <div class="msg-header-unread-section"\n       data-l10n-id="message-header-unread"></div>\n  <div class="msg-header-icons-section">\n    <span class="msg-header-star" data-l10n-id="message-header-starred"></span>\n    <span class="msg-header-attachments"\n          data-l10n-id="message-header-attachments"></span>\n  </div><div class="msg-header-avatar-section" aria-hidden="true">\n  </div></a>\n');
});
define('template!cards/lst/msg_vscroll.html', ['template'], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/lst/msg_vscroll.html',
            'deps': [],
            'text': '<div data-prop="vScrollContainer" class="msg-vscroll-container"></div>\n<!-- maintain vertical space for the syncing/sync more div\'s\n     regardless of their displayed status so we don\'t scroll them\n     out of the way -->\n<div class="msg-messages-sync-container">\n  <p data-prop="syncingNode" class="msg-messages-syncing collapsed"\n     role="progressbar" data-l10n-id="messages-syncing-progressbar">\n    <span data-l10n-id="messages-syncing"></span>\n  </p>\n  <p data-prop="syncMoreNode"\n     data-event="click:onGetMoreMessages"\n     class="msg-messages-sync-more collapsed"\n     role="button">\n    <span data-l10n-id="messages-load-more"></span>\n  </p>\n</div>\n<div data-prop="messageEmptyContainer"\n     class="msg-list-empty-container collapsed">\n  <p data-prop="messageEmptyText"\n     class="msg-list-empty-message-text"\n     data-l10n-id="messages-folder-empty"></p>\n</div>'
        })
    };
});
define('cards/lst/msg_vscroll', [
    'require',
    'exports',
    'module',
    'cards',
    'container_listen',
    'l10n!',
    'tmpl!../msg/header_item.html',
    'toaster',
    'vscroll',
    '../base',
    'template!./msg_vscroll.html'
], function (require, exports) {
    var cards = require('cards'), containerListen = require('container_listen'), mozL10n = require('l10n!'), msgHeaderItemNode = require('tmpl!../msg/header_item.html'), toaster = require('toaster'), VScroll = require('vscroll');
    var sliceEvents = [
        'splice',
        'change',
        'status',
        'complete'
    ];
    var MINIMUM_ITEMS_FOR_SCROLL_CALC = 10;
    var MAXIMUM_MS_BETWEEN_SNIPPET_REQUEST = 6000;
    var MAXIMUM_BYTES_PER_MESSAGE_DURING_SCROLL = 4 * 1024;
    return [
        require('../base')(require('template!./msg_vscroll.html')),
        {
            createdCallback: function () {
                this.setAttribute('role', 'listbox');
                this.setAttribute('aria-multiselectable', 'true');
                mozL10n.setAttributes(this.messageEmptyText, this.dataset.emptyL10nId);
                containerListen(this.vScrollContainer, 'click', this.onClickMessage.bind(this));
            },
            init: function (scrollContainer, bindData, defaultVScrollData) {
                this.scrollContainer = scrollContainer;
                var listFunc = function (index) {
                    return this.headerCursor.messagesSlice.items[index];
                }.bind(this);
                listFunc.size = function () {
                    var slice = this.headerCursor.messagesSlice;
                    return Math.max(slice.headerCount || 0, slice.items.length);
                }.bind(this);
                this.listFunc = listFunc;
                this.waitingOnChunk = true;
                this.desiredHighAbsoluteIndex = 0;
                this._needVScrollData = false;
                this.vScroll = new VScroll(this.vScrollContainer, this.scrollContainer, msgHeaderItemNode, defaultVScrollData);
                this.vScroll.bindData = bindData;
                this.vScroll.prepareData = function (highAbsoluteIndex) {
                    var items = this.headerCursor.messagesSlice && this.headerCursor.messagesSlice.items, headerCount = this.headerCursor.messagesSlice.headerCount;
                    if (!items || !headerCount) {
                        return;
                    }
                    if (highAbsoluteIndex > headerCount - 1) {
                        highAbsoluteIndex = headerCount - 1;
                    }
                    if (highAbsoluteIndex < items.length) {
                        return;
                    }
                    this.loadNextChunk(highAbsoluteIndex);
                }.bind(this);
            },
            setHeaderCursor: function (headerCursor) {
                if (this.headerCursor) {
                    throw new Error('headerCursor already set');
                }
                this.headerCursor = headerCursor;
                sliceEvents.forEach(function (type) {
                    var name = 'messages_' + type;
                    this[name] = this[name].bind(this);
                    headerCursor.on(name, this[name]);
                }.bind(this));
                this.onCurrentMessage = this.onCurrentMessage.bind(this);
                headerCursor.on('currentMessage', this.onCurrentMessage);
                var parent = this;
                while (parent = parent.parentNode) {
                    if (parent.classList.contains('card')) {
                        break;
                    }
                }
                this.cardParent = parent;
                this._onVScrollStopped = this._onVScrollStopped.bind(this);
                this.vScroll.on('scrollStopped', this._onVScrollStopped);
            },
            removeMessagesHtml: function () {
                this.vScrollContainer.innerHTML = '';
            },
            onClickMessage: function (node, event) {
                this.emitDomEvent('messageClick', node);
            },
            _onVScrollStopped: function () {
                if (!this.headerCursor.messagesSlice || this.headerCursor.messagesSlice.pendingRequestCount) {
                    return;
                }
                if (cards.isVisible(this.cardParent) && !this._hasSnippetRequest()) {
                    this._requestSnippets();
                }
            },
            onGetMoreMessages: function () {
                if (!this.headerCursor.messagesSlice) {
                    return;
                }
                this.vScroll.once('recalculated', function (calledFromTop, refIndex) {
                    this.vScrollContainer.querySelector('[data-index="' + refIndex + '"]').focus();
                }.bind(this));
                this.headerCursor.messagesSlice.requestGrowth(1, true);
            },
            isEmpty: function () {
                return this.headerCursor.messagesSlice.items.length === 0;
            },
            showEmptyLayout: function () {
                this.messageEmptyContainer.classList.remove('collapsed');
                this.emit('emptyLayoutShown');
            },
            hideEmptyLayout: function () {
                this.messageEmptyContainer.classList.add('collapsed');
                this.emit('emptyLayoutHidden');
            },
            messages_status: function (newStatus) {
                var syncInProgress = true;
                if (newStatus === 'synchronizing' || newStatus === 'syncblocked') {
                    this.syncingNode.classList.remove('collapsed');
                    this.syncMoreNode.classList.add('collapsed');
                    this.hideEmptyLayout();
                } else if (newStatus === 'syncfailed' || newStatus === 'synced') {
                    syncInProgress = false;
                    if (newStatus === 'syncfailed') {
                        toaster.toast({ text: mozL10n.get('toaster-retryable-syncfailed') });
                    }
                    this.syncingNode.classList.add('collapsed');
                }
                this.emit('syncInProgress', syncInProgress);
            },
            messages_complete: function (newEmailCount) {
                var headerCursor = this.headerCursor;
                console.log('message_list complete:', headerCursor.messagesSlice.items.length, 'items of', headerCursor.messagesSlice.headerCount, 'alleged known headers. canGrow:', headerCursor.messagesSlice.userCanGrowDownwards);
                if (headerCursor.messagesSlice.userCanGrowDownwards && headerCursor.messagesSlice.headerCount) {
                    this.syncMoreNode.classList.remove('collapsed');
                } else {
                    this.syncMoreNode.classList.add('collapsed');
                }
                if (headerCursor.messagesSlice.items.length === 0) {
                    this.showEmptyLayout();
                }
                this.waitingOnChunk = false;
                if (this.desiredHighAbsoluteIndex) {
                    this.loadNextChunk(this.desiredHighAbsoluteIndex);
                    this.desiredHighAbsoluteIndex = 0;
                }
                this.vScroll.updateDataBind(0, [], 0);
                this.emit('messagesComplete', newEmailCount);
            },
            messages_splice: function (index, howMany, addedItems, requested, moreExpected) {
                var headerCursor = this.headerCursor;
                if (index === 0 && howMany === 0 && !addedItems.length) {
                    return;
                }
                this.emit('messagesSpliceStart', index, howMany, addedItems, requested, moreExpected);
                if (this._needVScrollData) {
                    this.vScroll.setData(this.listFunc);
                    this._needVScrollData = false;
                }
                this.vScroll.updateDataBind(index, addedItems, howMany);
                if (addedItems.length > 0) {
                    this.hideEmptyLayout();
                }
                if (!headerCursor.messagesSlice.headerCount) {
                    this.vScroll.once('scrollStopped', function () {
                        if (!headerCursor.messagesSlice.headerCount) {
                            this.showEmptyLayout();
                        }
                    }.bind(this));
                }
                this.emit('messagesSpliceEnd', index, howMany, addedItems, requested, moreExpected);
            },
            messages_change: function (message, index) {
                this.emit('messagesChange', message, index);
            },
            loadNextChunk: function (desiredHighAbsoluteIndex) {
                if (this.vScroll.waitingForRecalculate) {
                    return;
                }
                if (this.waitingOnChunk) {
                    this.desiredHighAbsoluteIndex = desiredHighAbsoluteIndex;
                    return;
                }
                var headerCursor = this.headerCursor;
                if (desiredHighAbsoluteIndex >= headerCursor.messagesSlice.headerCount) {
                    desiredHighAbsoluteIndex = headerCursor.messagesSlice.headerCount - 1;
                }
                var items = headerCursor.messagesSlice.items;
                var curHighAbsoluteIndex = items.length - 1;
                var amount = desiredHighAbsoluteIndex - curHighAbsoluteIndex;
                if (amount > 0) {
                    console.log('message_list loadNextChunk growing', amount, amount === 1 ? '(will get boosted to 15!) to' : 'to', desiredHighAbsoluteIndex + 1, 'items out of', headerCursor.messagesSlice.headerCount, 'alleged known');
                    headerCursor.messagesSlice.requestGrowth(amount, false);
                    this.waitingOnChunk = true;
                }
            },
            onCurrentMessage: function (currentMessage, index) {
                if (!currentMessage) {
                    return;
                }
                var visibleIndices = this.vScroll.getVisibleIndexRange();
                if (visibleIndices && (index < visibleIndices[0] || index > visibleIndices[1])) {
                    this.vScroll.jumpToIndex(index);
                }
            },
            _hasSnippetRequest: function () {
                var max = MAXIMUM_MS_BETWEEN_SNIPPET_REQUEST;
                var now = Date.now();
                var beforeTimeout = this._lastSnippetRequest + max > now;
                if (this._snippetRequestPending && beforeTimeout) {
                    return true;
                }
                return false;
            },
            _pendingSnippetRequest: function () {
                this._snippetRequestPending = true;
                this._lastSnippetRequest = Date.now();
            },
            _clearSnippetRequest: function () {
                this._snippetRequestPending = false;
            },
            _requestSnippets: function () {
                var headerCursor = this.headerCursor;
                var items = headerCursor.messagesSlice.items;
                var len = items.length;
                if (!len) {
                    return;
                }
                var clearSnippets = this._clearSnippetRequest.bind(this);
                var options = { maximumBytesToFetch: MAXIMUM_BYTES_PER_MESSAGE_DURING_SCROLL };
                if (len < MINIMUM_ITEMS_FOR_SCROLL_CALC) {
                    this._pendingSnippetRequest();
                    headerCursor.messagesSlice.maybeRequestBodies(0, MINIMUM_ITEMS_FOR_SCROLL_CALC - 1, options, clearSnippets);
                    return;
                }
                var visibleIndices = this.vScroll.getVisibleIndexRange();
                if (visibleIndices) {
                    this._pendingSnippetRequest();
                    headerCursor.messagesSlice.maybeRequestBodies(visibleIndices[0], visibleIndices[1], options, clearSnippets);
                }
            },
            die: function () {
                sliceEvents.forEach(function (type) {
                    var name = 'messages_' + type;
                    this.headerCursor.removeListener(name, this[name]);
                }.bind(this));
                this.headerCursor.removeListener('currentMessage', this.onCurrentMessage);
                this.vScroll.destroy();
            }
        }
    ];
});
define('template!cards/lst/edit_toolbar.html', ['template'], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/lst/edit_toolbar.html',
            'deps': [],
            'text': '<!-- Toolbar for multi-edit state -->\n<ul class="bb-tablist" role="toolbar">\n  <li role="presentation">\n    <button data-prop="deleteBtn"\n            data-event="click:domEvt"\n            data-domevt-name="onDeleteMessages"\n            class="icon msg-delete-btn"\n            data-l10n-id="message-delete-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="starBtn"\n            data-event="click:domEvt"\n            data-domevt-name="onStarMessages"\n            class="icon msg-star-btn"\n            data-l10n-id="message-star-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="readBtn"\n            data-event="click:domEvt"\n            data-domevt-name="onMarkMessagesRead"\n            class="icon msg-mark-read-btn"\n            data-l10n-id="message-mark-read-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="moveBtn"\n            data-event="click:domEvt"\n            data-domevt-name="onMoveMessages"\n            class="icon msg-move-btn"\n            data-l10n-id="message-move-button"></button>\n  </li>\n</ul>'
        })
    };
});
define('cards/lst/edit_toolbar', [
    'require',
    'exports',
    'module',
    'l10n!',
    '../base',
    'template!./edit_toolbar.html',
    '../mixins/dom_evt'
], function (require, exports) {
    var mozL10n = require('l10n!'), toolbarEditButtonNames = [
            'starBtn',
            'readBtn',
            'deleteBtn',
            'moveBtn'
        ];
    return [
        require('../base')(require('template!./edit_toolbar.html')),
        require('../mixins/dom_evt'),
        {
            updateDomFolderType: function (folderType) {
                this.moveBtn.classList.toggle('collapsed', folderType === 'localdrafts' || folderType === 'outbox');
                this.starBtn.classList.toggle('collapsed', folderType === 'outbox');
                this.readBtn.classList.toggle('collapsed', folderType === 'outbox');
            },
            updateDomStartButton: function (isStarred) {
                mozL10n.setAttributes(this.starBtn, isStarred ? 'message-star-button' : 'message-unstar-button');
            },
            updateDomReadButton: function (hasUnread) {
                this.readBtn.classList.toggle('unread', hasUnread);
                mozL10n.setAttributes(this.readBtn, hasUnread ? 'message-mark-unread-button' : 'message-mark-read-button');
            },
            updateDomEditButtons: function (hasMessages) {
                toolbarEditButtonNames.forEach(function (key) {
                    this[key].disabled = !hasMessages;
                }.bind(this));
            }
        }
    ];
});
define('template!cards/message_list.html', [
    'template',
    'element!cards/lst/edit_header',
    'element!cards/lst/msg_vscroll',
    'element!cards/lst/edit_toolbar'
], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/message_list.html',
            'deps': [
                'element!cards/lst/edit_header',
                'element!cards/lst/msg_vscroll',
                'element!cards/lst/edit_toolbar'
            ],
            'text': '<!-- Non-search header -->\n<section data-prop="normalHeader"\n         class="msg-list-header msg-nonsearch-only"\n         data-statuscolor="default"\n         role="region">\n  <header>\n    <!-- Unlike a generic back button that navigates to a different screen,\n       folder list header button triggers the folders and settings overlay. Thus\n       the screen reader user requires more context as to what activating the\n       button would do. -->\n    <a href="#" class="msg-folder-list-btn" data-event="click:onShowFolders"\n       aria-expanded="false" aria-controls="cards-folder-picker"\n       role="button" data-l10n-id="message-list-menu">\n      <span class="icon icon-menu"></span>\n    </a>\n    <menu data-prop="headerMenuNode" type="toolbar" class="anim-opacity">\n      <a href="#" class="msg-compose-btn" data-event="click:onCompose"\n         data-l10n-id="message-list-compose">\n        <span class="icon icon-compose"></span>\n      </a>\n    </menu>\n    <h1 data-prop="folderLabel"\n        class="msg-list-header-folder-label header-label">\n      <span data-prop="folderNameNode"\n            dir="auto"\n            class="msg-list-header-folder-name"></span>\n      <span data-prop="folderUnread"\n            class="msg-list-header-folder-unread collapsed"></span>\n    </h1>\n  </header>\n</section>\n\n<!-- Multi-edit state header -->\n<lst-edit-header data-prop="editHeader"\n                       data-event="editHeaderClose"></lst-edit-header>\n<!-- Scroll region -->\n<div data-prop="scrollContainer" class="msg-list-scrollouter">\n  <!-- exists so we can force a minimum height -->\n  <div class="msg-list-scrollinner">\n    <!-- The search textbox hides under the lip of the messages.\n         As soon as any typing happens in it, we push the search\n         controls card. -->\n    <form role="search" data-prop="searchBar"\n          class="msg-search-tease-bar msg-nonsearch-only">\n      <p>\n        <input data-event="focus:onSearchButton"\n               data-prop="searchTextTease"\n               class="msg-search-text-tease" type="text"\n               dir="auto"\n               data-l10n-id="message-search-input" />\n      </p>\n    </form>\n    <lst-msg-vscroll data-prop="msgVScroll"\n                     data-event="messageClick:onClickMessage"\n                     data-empty-l10n-id="messages-folder-empty">\n    </lst-msg-vscroll>\n  </div>\n</div>\n\n<!-- New email notification bar -->\n<div class="message-list-topbar"></div>\n\n<!-- Toolbar for non-multi-edit state -->\n<ul data-prop="normalToolbar" class="bb-tablist msg-list-action-toolbar"\n    role="toolbar">\n  <li role="presentation" class="msg-nonsearch-only">\n    <button data-prop="refreshBtn" data-event="click:onRefresh"\n            class="icon msg-refresh-btn" data-state="synchronized"\n            data-l10n-id="messages-refresh-button">\n    </button>\n  </li>\n  <li role="status" class="msg-nonsearch-only msg-last-sync">\n    <span data-prop="lastSyncedLabel"\n          class="msg-last-synced-label"\n          data-l10n-id="folder-last-synced-label"></span>\n    <span data-prop="lastSyncedAtNode"\n          class="msg-last-synced-value"></span>\n  </li>\n  <li role="presentation">\n    <button data-prop="editBtn" data-event="click:setEditModeStart"\n            class="icon msg-edit-btn" data-l10n-id="edit-button"></button>\n  </li>\n</ul>\n\n<lst-edit-toolbar data-prop="editToolbar"\n                  data-event="onDeleteMessages,onStarMessages,\n                              onMarkMessagesRead,onMoveMessages">\n</lst-edit-toolbar>\n\n'
        })
    };
});
define('template!cards/confirm_dialog.html', ['template'], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/confirm_dialog.html',
            'deps': [],
            'text': '<div class="card-confirm-dialog card">\n  <form data-statuscolor="background"\n        role="dialog" data-type="confirm" class="collapsed confirm-dialog-form">\n    <section>\n      <h1 data-l10n-id="confirm-dialog-title"></h1>\n      <p class="confirm-dialog-message"></p>\n    </section>\n    <menu>\n      <button class="confirm-dialog-cancel" data-l10n-id="message-multiedit-cancel"></button>\n      <button class="confirm-dialog-ok recommend" data-l10n-id="dialog-button-ok"></button>\n    </menu>\n  </form>\n</div>\n'
        })
    };
});
define('cards/confirm_dialog', [
    'require',
    'cards',
    './base_card',
    'template!./confirm_dialog.html'
], function (require) {
    var cards = require('cards');
    return [
        require('./base_card')(require('template!./confirm_dialog.html')),
        {
            onArgs: function (args) {
                var dialogBodyNode = args.dialogBodyNode, confirm = args.confirm, cancel = args.cancel, callback = args.callback;
                if (dialogBodyNode) {
                    this.appendChild(dialogBodyNode);
                } else {
                    dialogBodyNode = this.querySelector('.confirm-dialog-form');
                    dialogBodyNode.querySelector('.confirm-dialog-message').textContent = args.message;
                    dialogBodyNode.classList.remove('collapsed');
                    confirm = {
                        handler: function () {
                            callback(true);
                        }
                    };
                    cancel = {
                        handler: function () {
                            callback(false);
                        }
                    };
                }
                dialogBodyNode.addEventListener('submit', function (evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.hide();
                    var target = evt.explicitOriginalTarget, targetId = target.id, isOk = target.classList.contains('confirm-dialog-ok'), isCancel = target.classList.contains('confirm-dialog-cancel');
                    if ((isOk || targetId === confirm.id) && confirm.handler) {
                        confirm.handler();
                    } else if ((isCancel || targetId === cancel.id) && cancel.handler) {
                        cancel.handler();
                    }
                }.bind(this));
            },
            hide: function () {
                cards.removeCardAndSuccessors(this, 'immediate', 1, null, true);
            },
            die: function () {
            }
        }
    ];
});
define('confirm_dialog', [
    'require',
    'exports',
    'module',
    'cards',
    'element!cards/confirm_dialog'
], function (require, exports) {
    var cards = require('cards'), ConfirmDialog = require('element!cards/confirm_dialog');
    ConfirmDialog.show = function (message, callback, cancel) {
        var dialogBodyNode;
        if (typeof message !== 'string') {
            dialogBodyNode = message;
            message = null;
        }
        cards.pushCard('confirm_dialog', 'immediate', {
            dialogBodyNode: dialogBodyNode,
            message: message,
            confirm: callback,
            callback: callback,
            cancel: cancel
        }, 'right');
    };
    return ConfirmDialog;
});
define('tmpl!cards/msg/delete_confirm.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-delete-confirm" data-type="confirm">\n  <section>\n    <h1 data-l10n-id="confirm-dialog-title"></h1>\n    <p></p>\n  </section>\n  <menu>\n    <button id="msg-delete-cancel" data-l10n-id="message-multiedit-cancel"></button>\n    <button id="msg-delete-ok" class="danger" data-l10n-id="message-edit-menu-delete"></button>\n  </menu>\n</form>');
});
define('cards/lst/edit_controller', [
    'require',
    'exports',
    'module',
    'cards',
    'confirm_dialog',
    'tmpl!../msg/delete_confirm.html',
    'l10n!',
    'toaster'
], function (require, exports) {
    var cards = require('cards'), ConfirmDialog = require('confirm_dialog'), deleteConfirmMsgNode = require('tmpl!../msg/delete_confirm.html'), mozL10n = require('l10n!'), toaster = require('toaster');
    return {
        createdCallback: function () {
            this.editMode = false;
            this.selectedMessages = null;
            this.editModeEnabled = false;
        },
        setEditMode: function (editMode) {
            if (!this.editModeEnabled) {
                return;
            }
            this._setEditMode(editMode);
        },
        _setEditMode: function (editMode) {
            var i;
            this.editMode = editMode;
            if (editMode) {
                this.classList.add('show-edit');
                this.selectedMessages = [];
                this.updateDomEditControls();
            } else {
                this.classList.remove('show-edit');
                this.selectedMessages = null;
            }
            var msgNodes = this.msgVScroll.querySelectorAll('.msg-header-item');
            for (i = 0; i < msgNodes.length; i++) {
                this.updateDomMessageChecked(msgNodes[i], false);
            }
            if (this.editModeChanged) {
                this.editModeChanged(editMode);
            }
        },
        setEditModeStart: function () {
            this.setEditMode(true);
        },
        editHeaderClose: function () {
            this.setEditMode(false);
        },
        toggleSelection: function (msgNode) {
            var header = msgNode.message;
            var idx = this.selectedMessages.indexOf(header);
            if (idx !== -1) {
                this.selectedMessages.splice(idx, 1);
            } else {
                this.selectedMessages.push(header);
            }
            this.updateDomMessageChecked(msgNode, idx === -1);
            this.updateDomEditControls();
        },
        updateDomSelectState: function (msgNode, message) {
            if (this.editMode) {
                this.updateDomMessageChecked(msgNode, this.selectedMessages.indexOf(message) !== -1);
            } else {
                msgNode.removeAttribute('aria-selected');
            }
        },
        updateDomMessageChecked: function (msgNode, checked) {
            var checkbox = msgNode.querySelector('input[type=checkbox]');
            checkbox.checked = checked;
            msgNode.setAttribute('aria-selected', checked);
        },
        updateDomEditControls: function () {
            this.editHeader.updateDomHeaderCount(this.selectedMessages.length);
            this.editToolbar.updateDomEditButtons(this.selectedMessages.length > 0);
            var numStarred = 0, numRead = 0;
            for (var i = 0; i < this.selectedMessages.length; i++) {
                var msg = this.selectedMessages[i];
                if (msg.isStarred) {
                    numStarred++;
                }
                if (msg.isRead) {
                    numRead++;
                }
            }
            this.setAsStarred = !(numStarred && numStarred === this.selectedMessages.length);
            this.editToolbar.updateDomStartButton(this.setAsStarred);
            this.setAsRead = !!this.selectedMessages.length && numRead === 0;
            this.editToolbar.updateDomReadButton(numRead > 0);
        },
        onDeleteMessages: function () {
            if (this.selectedMessages.length === 0) {
                return this.setEditMode(false);
            }
            var dialog = deleteConfirmMsgNode.cloneNode(true);
            var content = dialog.getElementsByTagName('p')[0];
            mozL10n.setAttributes(content, 'message-multiedit-delete-confirm', { n: this.selectedMessages.length });
            ConfirmDialog.show(dialog, {
                id: 'msg-delete-ok',
                handler: function () {
                    var op = this.model.api.deleteMessages(this.selectedMessages);
                    toaster.toastOperation(op);
                    this.setEditMode(false);
                }.bind(this)
            }, {
                id: 'msg-delete-cancel',
                handler: null
            });
        },
        onStarMessages: function () {
            var op = this.model.api.markMessagesStarred(this.selectedMessages, this.setAsStarred);
            this.setEditMode(false);
            toaster.toastOperation(op);
        },
        onMarkMessagesRead: function () {
            var op = this.model.api.markMessagesRead(this.selectedMessages, this.setAsRead);
            this.setEditMode(false);
            toaster.toastOperation(op);
        },
        onMoveMessages: function () {
            cards.folderSelector(this.model, function (folder) {
                var op = this.model.api.moveMessages(this.selectedMessages, folder);
                toaster.toastOperation(op);
                this.setEditMode(false);
            }.bind(this), function (folder) {
                return folder.isValidMoveTarget;
            });
        }
    };
});
define('tmpl!cards/msg/large_message_confirm.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-large-message-confirm" data-type="confirm">\n  <section>\n    <h1 data-l10n-id="confirm-dialog-title"></h1>\n    <p><span data-l10n-id="message-large-message-confirm"></span></p>\n  </section>\n  <menu>\n    <button id="msg-large-message-cancel" data-l10n-id="message-large-message-cancel"></button>\n    <button id="msg-large-message-ok" data-l10n-id="message-large-message-ok"></button>\n  </menu>\n</form>\n');
});
define('cards/lst/msg_click', [
    'require',
    'exports',
    'module',
    'cards',
    'confirm_dialog',
    'tmpl!../msg/large_message_confirm.html'
], function (require, exports) {
    var cards = require('cards'), ConfirmDialog = require('confirm_dialog'), largeMsgConfirmMsgNode = require('tmpl!../msg/large_message_confirm.html');
    function showLargeMessageWarning(size, cb) {
        var dialog = largeMsgConfirmMsgNode.cloneNode(true);
        ConfirmDialog.show(dialog, {
            id: 'msg-large-message-ok',
            handler: function () {
                cb(true);
            }
        }, {
            id: 'msg-large-message-cancel',
            handler: function () {
                cb(false);
            }
        });
    }
    return {
        onClickMessage: function (event) {
            var messageNode = event.detail;
            if (this.curFolder && this.curFolder.type === 'outbox' && this.outboxSyncInProgress) {
                return;
            }
            var header = messageNode.message;
            if (header && header.isPlaceholderData) {
                return;
            }
            if (this.editMode) {
                this.toggleSelection(messageNode);
                return;
            }
            if (this.curFolder && this.curFolder.type === 'localdrafts') {
                var composer = header.editAsDraft(() => {
                    cards.pushCard('compose', 'animate', {
                        model: this.model,
                        composer
                    });
                });
                return;
            }
            if (this.curFolder && this.curFolder.type === 'outbox') {
                if (header.sendStatus.state === 'sending') {
                    return;
                }
                var draftsFolder = this.model.foldersSlice.getFirstFolderWithType('localdrafts');
                console.log('outbox: Moving message to localdrafts.');
                this.model.api.moveMessages([header], draftsFolder, moveMap => {
                    header.id = moveMap[header.id];
                    console.log('outbox: Editing message in localdrafts.');
                    var composer = header.editAsDraft(() => {
                        cards.pushCard('compose', 'animate', {
                            model: this.model,
                            composer
                        });
                    });
                });
                return;
            }
            var model = this.model, headerCursor = this.headerCursor;
            function pushMessageCard() {
                cards.pushCard('message_reader', 'animate', {
                    model,
                    headerCursor,
                    header,
                    messageSuid: messageNode.dataset.id
                });
            }
            if (header) {
                this.headerCursor.setCurrentMessage(header);
            } else if (messageNode.dataset.id) {
                this.headerCursor.setCurrentMessageBySuid(messageNode.dataset.id);
            } else {
                return;
            }
            var LARGE_MESSAGE_SIZE = 1 * 1024 * 1024;
            if (header && header.bytesToDownloadForBodyDisplay > LARGE_MESSAGE_SIZE) {
                showLargeMessageWarning(header.bytesToDownloadForBodyDisplay, function (result) {
                    if (result) {
                        pushMessageCard();
                    } else {
                    }
                });
            } else {
                pushMessageCard();
            }
        }
    };
});
define('cards/message_list', [
    'require',
    'exports',
    'module',
    'cards',
    'date',
    './lst/default_vscroll_data',
    'evt',
    'toaster',
    'header_cursor',
    'html_cache',
    'l10n!',
    'message_list_topbar',
    'message_display',
    './lst/peep_dom',
    'vscroll',
    './base_card',
    'template!./message_list.html',
    './lst/edit_controller',
    './lst/msg_click'
], function (require, exports, module) {
    var cards = require('cards'), date = require('date'), defaultVScrollData = require('./lst/default_vscroll_data'), evt = require('evt'), toaster = require('toaster'), HeaderCursor = require('header_cursor'), htmlCache = require('html_cache'), mozL10n = require('l10n!'), MessageListTopBar = require('message_list_topbar'), messageDisplay = require('message_display'), updatePeepDom = require('./lst/peep_dom').update, VScroll = require('vscroll');
    return [
        require('./base_card')(require('template!./message_list.html')),
        require('./lst/edit_controller'),
        require('./lst/msg_click'),
        {
            createdCallback: function () {
                this._needsSizeLastSync = true;
                this.updateLastSynced();
                this.curFolder = null;
                this.isIncomingFolder = true;
                this._hideSearchBoxByScrolling = this._hideSearchBoxByScrolling.bind(this);
                this._folderChanged = this._folderChanged.bind(this);
                this.onNewMail = this.onNewMail.bind(this);
                this.onFoldersSliceChange = this.onFoldersSliceChange.bind(this);
                this.usingCachedNode = this.dataset.cached === 'cached';
                this.msgVScroll.on('messagesSpliceStart', function (index, howMany, addedItems, requested, moreExpected) {
                    this._clearCachedMessages();
                }.bind(this));
                this.msgVScroll.on('messagesSpliceEnd', function (index, howMany, addedItems, requested, moreExpected) {
                    if (addedItems.length || howMany) {
                        this._considerCacheDom(index);
                    }
                }.bind(this));
                this.msgVScroll.on('messagesChange', function (message, index) {
                    this.onMessagesChange(message, index);
                }.bind(this));
                this._emittedContentEvents = false;
                this.msgVScroll.on('messagesComplete', function (newEmailCount) {
                    this.onNewMail(newEmailCount);
                    if (!this._emittedContentEvents) {
                        evt.emit('metrics:contentDone');
                        this._emittedContentEvents = true;
                    }
                }.bind(this));
                var oldMessagesStatus = this.msgVScroll.messages_status;
                this.msgVScroll.messages_status = function (newStatus) {
                    if (!this.curFolder || this.curFolder.type === 'outbox') {
                        return;
                    }
                    return oldMessagesStatus.call(this.msgVScroll, newStatus);
                }.bind(this);
                this.msgVScroll.on('emptyLayoutShown', function () {
                    this._clearCachedMessages();
                    if (this.curFolder.type === 'outbox') {
                        this.refreshBtn.disabled = true;
                    }
                    this.editBtn.disabled = true;
                    this._hideSearchBoxByScrolling();
                }.bind(this));
                this.msgVScroll.on('emptyLayoutHidden', function () {
                    this.editBtn.disabled = false;
                    this.refreshBtn.disabled = false;
                }.bind(this));
                this.msgVScroll.on('syncInProgress', function (syncInProgress) {
                    if (syncInProgress) {
                        this.setRefreshState(true);
                    } else {
                        this.setRefreshState(false);
                        this._manuallyTriggeredSync = false;
                    }
                }.bind(this));
                var vScrollBindData = function bindNonSearch(model, node) {
                    model.element = node;
                    node.message = model;
                    this.updateMessageDom(model);
                }.bind(this);
                this.msgVScroll.init(this.scrollContainer, vScrollBindData, defaultVScrollData);
                this.msgVScroll.vScroll.on('inited', this._hideSearchBoxByScrolling);
                this.msgVScroll.vScroll.on('dataChanged', this._hideSearchBoxByScrolling);
                this.msgVScroll.vScroll.on('recalculated', function (calledFromTop) {
                    if (calledFromTop) {
                        this._hideSearchBoxByScrolling();
                    }
                }.bind(this));
                this._topBar = new MessageListTopBar(this.querySelector('.message-list-topbar'));
                this._topBar.bindToElements(this.scrollContainer, this.msgVScroll.vScroll);
                this.onFolderPickerClosing = this.onFolderPickerClosing.bind(this);
                evt.on('folderPickerClosing', this.onFolderPickerClosing);
            },
            onArgs: function (args) {
                var model = this.model = args.model;
                var headerCursor = this.headerCursor = args.headerCursor || new HeaderCursor(model);
                this.msgVScroll.setHeaderCursor(headerCursor);
                model.latest('folder', this._folderChanged);
                model.on('newInboxMessages', this.onNewMail);
                model.on('backgroundSendStatus', this.onBackgroundSendStatus.bind(this));
                model.on('foldersSliceOnChange', this.onFoldersSliceChange);
                if (this.curFolder) {
                    var items = headerCursor.messagesSlice && headerCursor.messagesSlice.items;
                    if (items && items.length) {
                        this.msgVScroll.messages_splice(0, 0, items);
                        this.msgVScroll.messages_complete(0);
                    }
                }
            },
            skipEmitContentEvents: true,
            postInsert: function () {
                this._hideSearchBoxByScrolling();
                this.msgVScroll.vScroll.visibleOffset = this.searchBar.getBoundingClientRect().height;
                this._topBar.visibleOffset = this.msgVScroll.vScroll.visibleOffset;
                this.msgVScroll.vScroll.captureScreenMetrics();
            },
            onSearchButton: function () {
                if (!this.curFolder) {
                    return;
                }
                cards.pushCard('message_list_search', 'animate', {
                    model: this.model,
                    folder: this.curFolder
                });
            },
            _hideSearchBoxByScrolling: function () {
                var searchBar = this.searchBar, scrollContainer = this.scrollContainer;
                if (searchBar.classList.contains('collapsed')) {
                    searchBar.classList.remove('collapsed');
                    scrollContainer.scrollTop += searchBar.offsetHeight;
                }
                if (scrollContainer.scrollTop === 0) {
                    scrollContainer.scrollTop = searchBar.offsetHeight;
                }
            },
            onShowFolders: function () {
                cards.pushCard('folder_picker', 'immediate', {
                    model: this.model,
                    onPushed: function () {
                        this.headerMenuNode.classList.add('transparent');
                    }.bind(this)
                });
            },
            onCompose: function () {
                cards.pushCard('compose', 'animate', { model: this.model });
            },
            sizeLastSync: function () {
                if (this._needsSizeLastSync && this.lastSyncedLabel.scrollWidth) {
                    var label = this.lastSyncedLabel;
                    var overHalf = label.scrollWidth > label.parentNode.clientWidth / 2;
                    label.parentNode.classList[overHalf ? 'add' : 'remove']('long');
                    this._needsSizeLastSync = false;
                }
            },
            updateLastSynced: function (value) {
                var method = value ? 'remove' : 'add';
                this.lastSyncedLabel.classList[method]('collapsed');
                date.setPrettyNodeDate(this.lastSyncedAtNode, value);
                this.sizeLastSync();
            },
            updateUnread: function (num) {
                var content = '';
                if (num > 0) {
                    content = num > 999 ? mozL10n.get('messages-folder-unread-max') : num;
                }
                this.folderUnread.textContent = content;
                this.folderUnread.classList.toggle('collapsed', !content);
                this.callHeaderFontSize();
            },
            onFoldersSliceChange: function (folder) {
                if (folder === this.curFolder) {
                    this.updateUnread(folder.unread);
                    this.updateLastSynced(folder.lastSyncedAt);
                }
            },
            callHeaderFontSize: function (node) {
                requestAnimationFrame(function () {
                    FontSizeUtils._reformatHeaderText(this.folderLabel);
                }.bind(this));
            },
            showFolder: function (folder, forceNewSlice) {
                if (folder === this.curFolder && !forceNewSlice) {
                    return false;
                }
                if (!this.usingCachedNode) {
                    this.msgVScroll.vScroll.clearDisplay();
                }
                this.msgVScroll._needVScrollData = true;
                this.curFolder = folder;
                this.editModeEnabled = true;
                switch (folder.type) {
                case 'drafts':
                case 'localdrafts':
                case 'outbox':
                case 'sent':
                    this.isIncomingFolder = false;
                    break;
                default:
                    this.isIncomingFolder = true;
                    break;
                }
                this.folderNameNode.textContent = folder.name;
                this.updateUnread(folder.unread);
                this.msgVScroll.setAttribute('aria-label', folder.name);
                this.msgVScroll.hideEmptyLayout();
                this.refreshBtn.classList.toggle('collapsed', folder.type === 'localdrafts');
                this.editToolbar.updateDomFolderType(folder.type);
                this.updateLastSynced(folder.lastSyncedAt);
                if (forceNewSlice) {
                    this.msgVScroll._snippetRequestPending = false;
                    this.headerCursor.freshMessagesSlice();
                }
                this.onFolderShown();
                return true;
            },
            setEditMode: function (editMode) {
                if (!this.editModeEnabled) {
                    return;
                }
                if (this.curFolder.type === 'outbox') {
                    if (editMode && this.outboxSyncInProgress) {
                        return;
                    }
                    var model = this.model;
                    model.api.setOutboxSyncEnabled(model.account, !editMode, function () {
                        this._setEditMode(editMode);
                    }.bind(this));
                } else {
                    this._setEditMode(editMode);
                }
            },
            setRefreshState: function (syncing) {
                if (syncing) {
                    this.refreshBtn.dataset.state = 'synchronizing';
                    this.refreshBtn.setAttribute('role', 'progressbar');
                    mozL10n.setAttributes(this.refreshBtn, 'messages-refresh-progress');
                } else {
                    this.refreshBtn.dataset.state = 'synchronized';
                    this.refreshBtn.removeAttribute('role');
                    mozL10n.setAttributes(this.refreshBtn, 'messages-refresh-button');
                }
            },
            onNewMail: function (newEmailCount) {
                var inboxFolder = this.model.foldersSlice.getFirstFolderWithType('inbox');
                if (inboxFolder.id === this.curFolder.id && newEmailCount && newEmailCount > 0) {
                    if (!cards.isVisible(this)) {
                        this._whenVisible = this.onNewMail.bind(this, newEmailCount);
                        return;
                    }
                    if (this._manuallyTriggeredSync) {
                        this.msgVScroll.vScroll.jumpToIndex(0);
                    } else {
                        this._topBar.showNewEmailCount(newEmailCount);
                    }
                }
            },
            onBackgroundSendStatus: function (data) {
                if (this.curFolder.type === 'outbox') {
                    if (data.state === 'sending') {
                        this.toggleOutboxSyncingDisplay(true);
                    } else if (data.state === 'syncDone') {
                        this.toggleOutboxSyncingDisplay(false);
                    }
                }
                if (data.emitNotifications) {
                    toaster.toast({ text: data.localizedDescription });
                }
            },
            _cacheListLimit: 7,
            _cacheDomTimeoutId: 0,
            _isCacheableCardState: function () {
                return this.cacheableFolderId === this.curFolder.id && !this.editMode;
            },
            _cacheDom: function () {
                this._cacheDomTimeoutId = 0;
                if (!this._isCacheableCardState()) {
                    return;
                }
                var cacheNode = htmlCache.cloneAsInertNodeAvoidingCustomElementHorrors(this);
                cacheNode.querySelector('menu[type="toolbar"]').classList.remove('transparent');
                var removableCacheNode = cacheNode.querySelector('.msg-search-tease-bar');
                if (removableCacheNode) {
                    removableCacheNode.classList.add('collapsed');
                }
                removableCacheNode = cacheNode.querySelector('.message-list-topbar');
                if (removableCacheNode) {
                    this._topBar.resetNodeForCache(removableCacheNode);
                }
                var tempNode = cacheNode.querySelector('.msg-last-synced-label');
                if (tempNode) {
                    tempNode.classList.add('collapsed');
                }
                tempNode = cacheNode.querySelector('.msg-last-synced-value');
                if (tempNode) {
                    tempNode.innerHTML = '';
                }
                VScroll.trimMessagesForCache(cacheNode.querySelector('.msg-vscroll-container'), this._cacheListLimit);
                htmlCache.saveFromNode(module.id, cacheNode);
            },
            _considerCacheDom: function (index) {
                if (!this._cacheDomTimeoutId && this._isCacheableCardState() && this.msgVScroll.vScroll.firstRenderedIndex === 0 && (index || index === 0) && index < this._cacheListLimit) {
                    this._cacheDomTimeoutId = setTimeout(this._cacheDom.bind(this), 600);
                }
            },
            _clearCachedMessages: function () {
                if (this.usingCachedNode) {
                    this.msgVScroll.removeMessagesHtml();
                    this.usingCachedNode = false;
                }
            },
            onMessagesChange: function (message, index) {
                this.updateMessageDom(message);
                this._considerCacheDom(index);
            },
            updateMessageDom: function (message) {
                var msgNode = message.element;
                if (!msgNode) {
                    return;
                }
                var classAction = message.isPlaceholderData ? 'add' : 'remove';
                var defaultDataClass = this.msgVScroll.vScroll.itemDefaultDataClass;
                msgNode.classList[classAction](defaultDataClass);
                msgNode.dataset.id = message.id;
                var dateNode = msgNode.querySelector('.msg-header-date');
                var subjectNode = msgNode.querySelector('.msg-header-subject');
                var snippetNode = msgNode.querySelector('.msg-header-snippet');
                var listPerson;
                if (this.isIncomingFolder) {
                    listPerson = message.author;
                } else if (message.to && message.to.length) {
                    listPerson = message.to[0];
                } else if (message.cc && message.cc.length) {
                    listPerson = message.cc[0];
                } else if (message.bcc && message.bcc.length) {
                    listPerson = message.bcc[0];
                } else {
                    listPerson = message.author;
                }
                listPerson.element = msgNode.querySelector('.msg-header-author');
                listPerson.onchange = updatePeepDom;
                listPerson.onchange(listPerson);
                var dateTime = dateNode.dataset.time = message.date.valueOf();
                date.relativeDateElement(dateNode, dateTime);
                messageDisplay.subject(msgNode.querySelector('.msg-header-subject'), message);
                var attachmentsNode = msgNode.querySelector('.msg-header-attachments');
                attachmentsNode.classList.toggle('msg-header-attachments-yes', message.hasAttachments);
                snippetNode.classList.toggle('icon-short', message.hasAttachments);
                snippetNode.textContent = message.snippet;
                msgNode.classList.toggle('unread', !message.isRead);
                var starNode = msgNode.querySelector('.msg-header-star');
                starNode.classList.toggle('msg-header-star-starred', message.isStarred);
                subjectNode.classList.toggle('icon-short', message.isStarred);
                var syncNode = msgNode.querySelector('.msg-header-syncing-section');
                var sendState = message.sendStatus && message.sendStatus.state;
                syncNode.classList.toggle('msg-header-syncing-section-syncing', sendState === 'sending');
                syncNode.classList.toggle('msg-header-syncing-section-error', sendState === 'error');
                if (sendState) {
                    mozL10n.setAttributes(syncNode, 'message-header-state-' + sendState);
                } else {
                    syncNode.removeAttribute('data-l10n-id');
                }
                this.updateDomSelectState(msgNode, message);
            },
            onFolderPickerClosing: function () {
                this.headerMenuNode.classList.remove('transparent');
            },
            onFolderShown: function () {
                var model = this.model, account = model.account, foldersSlice = model.foldersSlice;
                if (!document.hidden && account && foldersSlice && this.curFolder) {
                    var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');
                    if (inboxFolder === this.curFolder) {
                        evt.emit('inboxShown', account.id);
                    }
                    if (document.activeElement === this.searchTextTease) {
                        this.onSearchButton();
                    }
                }
            },
            onCurrentCardDocumentVisibilityChange: function () {
                this.onFolderShown();
            },
            onCardVisible: function () {
                if (this._whenVisible) {
                    var fn = this._whenVisible;
                    this._whenVisible = null;
                    fn();
                }
                this.msgVScroll.vScroll.nowVisible();
                this.sizeLastSync();
            },
            toggleOutboxSyncingDisplay: function (syncing) {
                if (syncing === this._outboxSyncing) {
                    return;
                }
                this._outboxSyncing = syncing;
                var i;
                var items = this.msgVScroll.getElementsByClassName('msg-header-syncing-section');
                if (syncing) {
                    for (i = 0; i < items.length; i++) {
                        items[i].classList.add('msg-header-syncing-section-syncing');
                        items[i].classList.remove('msg-header-syncing-section-error');
                    }
                    this.editBtn.disabled = true;
                } else {
                    this.editBtn.disabled = this.msgVScroll.isEmpty();
                    for (i = 0; i < items.length; i++) {
                        items[i].classList.remove('msg-header-syncing-section-syncing');
                    }
                }
                this.setRefreshState(syncing);
            },
            onRefresh: function () {
                var headerCursor = this.headerCursor;
                if (!headerCursor.messagesSlice) {
                    return;
                }
                if (this.curFolder.type === 'outbox') {
                    this.toggleOutboxSyncingDisplay(true);
                } else {
                    switch (headerCursor.messagesSlice.status) {
                    case 'new':
                    case 'synchronizing':
                        break;
                    case 'synced':
                        this._manuallyTriggeredSync = true;
                        headerCursor.messagesSlice.refresh();
                        break;
                    case 'syncfailed':
                        if (headerCursor.messagesSlice.items.length) {
                            headerCursor.messagesSlice.refresh();
                        } else {
                            this.showFolder(this.curFolder, true);
                        }
                        break;
                    }
                }
                this.model.api.sendOutboxMessages(this.model.account);
            },
            _folderChanged: function (folder) {
                if (!this.model.foldersSlice) {
                    return;
                }
                var model = this.model;
                var inboxFolder = model.foldersSlice.getFirstFolderWithType('inbox');
                this.cacheableFolderId = model.account === model.acctsSlice.defaultAccount ? inboxFolder.id : null;
                if (this.showFolder(folder)) {
                    this._hideSearchBoxByScrolling();
                }
            },
            die: function () {
                this.msgVScroll.die();
                evt.removeListener('folderPickerClosing', this.onFolderPickerClosing);
                if (this.headerCursor) {
                    this.headerCursor.die();
                }
                var model = this.model;
                model.removeListener('folder', this._folderChanged);
                model.removeListener('newInboxMessages', this.onNewMail);
                model.removeListener('foldersSliceOnChange', this.onFoldersSliceChange);
            }
        }
    ];
});