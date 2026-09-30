var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src, interactiveScript, currentlyAddingScript, mainScript, subPath, version = '2.1.14', commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, jsSuffixRegExp = /\.js$/, currDirRegExp = /^\.\//, op = Object.prototype, ostring = op.toString, hasOwn = op.hasOwnProperty, ap = Array.prototype, apsp = ap.splice, isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document), isWebWorker = !isBrowser && typeof importScripts !== 'undefined', readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ? /^complete$/ : /^(complete|loaded)$/, defContextName = '_', isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]', contexts = {}, cfg = {}, globalDefQueue = [], useInteractive = false;
    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }
    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }
    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }
    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
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
                    if (deepStringMixin && typeof value === 'object' && value && !isArray(value) && !isFunction(value) && !(value instanceof RegExp)) {
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
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }
    function scripts() {
        return document.getElementsByTagName('script');
    }
    function defaultOnError(err) {
        throw err;
    }
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }
    if (typeof define !== 'undefined') {
        return;
    }
    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }
    if (typeof require !== 'undefined' && !isFunction(require)) {
        cfg = require;
        require = undefined;
    }
    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers, checkLoadedTimeoutId, config = {
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            }, registry = {}, enabledRegistry = {}, undefEvents = {}, defQueue = [], defined = {}, urlFetched = {}, bundlesMap = {}, requireCounter = 1, unnormalizedCounter = 1;
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 0 || i == 1 && ary[2] === '..' || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex, foundMap, foundI, foundStarMap, starI, normalizedBaseParts, baseParts = baseName && baseName.split('/'), map = config.map, starMap = map && map['*'];
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }
                if (name[0].charAt(0) === '.' && baseParts) {
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }
                trimDots(name);
                name = name.join('/');
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
        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name && scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }
        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                pathConfig.shift();
                context.require.undef(id);
                context.makeRequire(null, { skipMap: true })([id]);
                return true;
            }
        }
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
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts, prefix = null, parentName = parentModuleMap ? parentModuleMap.name : null, originalName = name, isDefine = true, normalizedName = '';
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }
            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];
            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = name.indexOf('!') === -1 ? normalize(name, parentName, applyMap) : name;
                    }
                } else {
                    normalizedName = normalize(name, parentName, applyMap);
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;
                    url = context.nameToUrl(normalizedName);
                }
            }
            suffix = prefix && !pluginModule && !isNormalized ? '_unnormalized' + (unnormalizedCounter += 1) : '';
            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ? prefix + '!' + normalizedName : normalizedName) + suffix
            };
        }
        function getModule(depMap) {
            var id = depMap.id, mod = getOwn(registry, id);
            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }
            return mod;
        }
        function on(depMap, name, fn) {
            var id = depMap.id, mod = getOwn(registry, id);
            if (hasProp(defined, id) && (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }
        function onError(err, errback) {
            var ids = err.requireModules, notified = false;
            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });
                if (!notified) {
                    req.onError(err);
                }
            }
        }
        function takeGlobalQueue() {
            if (globalDefQueue.length) {
                apsp.apply(defQueue, [
                    defQueue.length,
                    0
                ].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }
        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return mod.require = context.makeRequire(mod.map);
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return defined[mod.map.id] = mod.exports;
                    } else {
                        return mod.exports = defined[mod.map.id] = {};
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    };
                }
            }
        };
        function cleanRegistry(id) {
            delete registry[id];
            delete enabledRegistry[id];
        }
        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;
            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id, dep = getOwn(registry, depId);
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check();
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }
        function checkLoaded() {
            var err, usingPathFallback, waitInterval = config.waitSeconds * 1000, expired = waitInterval && context.startTime + waitInterval < new Date().getTime(), noLoads = [], reqCalls = [], stillLoading = false, needCycleCheck = true;
            if (inCheckLoaded) {
                return;
            }
            inCheckLoaded = true;
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map, modId = map.id;
                if (!mod.enabled) {
                    return;
                }
                if (!map.isDefine) {
                    reqCalls.push(mod);
                }
                if (!mod.error) {
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            return needCycleCheck = false;
                        }
                    }
                }
            });
            if (expired && noLoads.length) {
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }
            if ((!expired || usingPathFallback) && stillLoading) {
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }
            inCheckLoaded = false;
        }
        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;
        };
        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};
                if (this.inited) {
                    return;
                }
                this.factory = factory;
                if (errback) {
                    this.on('error', errback);
                } else if (this.events.error) {
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }
                this.depMaps = depMaps && depMaps.slice(0);
                this.errback = errback;
                this.inited = true;
                this.ignore = options.ignore;
                if (options.enabled || this.enabled) {
                    this.enable();
                } else {
                    this.check();
                }
            },
            defineDep: function (i, depExports) {
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },
            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;
                context.startTime = new Date().getTime();
                var map = this.map;
                if (this.shim) {
                    context.makeRequire(this.map, { enableBuildCallback: true })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },
            load: function () {
                var url = this.map.url;
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }
                var err, cjsModule, id = this.map.id, depExports = this.depExports, exports = this.exports, factory = this.factory;
                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    this.defining = true;
                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            if (this.events.error && this.map.isDefine || req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    exports = this.exports;
                                }
                            }
                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError(this.error = err);
                            }
                        } else {
                            exports = factory;
                        }
                        this.exports = exports;
                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;
                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }
                        cleanRegistry(id);
                        this.defined = true;
                    }
                    this.defining = false;
                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }
                }
            },
            callPlugin: function () {
                var map = this.map, id = map.id, pluginMap = makeModuleMap(map.prefix);
                this.depMaps.push(pluginMap);
                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod, bundleId = getOwn(bundlesMap, this.map.id), name = this.map.name, parentName = this.map.parentMap ? this.map.parentMap.name : null, localRequire = context.makeRequire(map.parentMap, { enableBuildCallback: true });
                    if (this.map.unnormalized) {
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }
                        normalizedMap = makeModuleMap(map.prefix + '!' + name, this.map.parentMap);
                        on(normalizedMap, 'defined', bind(this, function (value) {
                            this.init([], function () {
                                return value;
                            }, null, {
                                enabled: true,
                                ignore: true
                            });
                        }));
                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            this.depMaps.push(normalizedMap);
                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }
                        return;
                    }
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }
                    load = bind(this, function (value) {
                        this.init([], function () {
                            return value;
                        }, null, { enabled: true });
                    });
                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });
                        onError(err);
                    });
                    load.fromText = bind(this, function (text, textAlt) {
                        var moduleName = map.name, moduleMap = makeModuleMap(moduleName), hasInteractive = useInteractive;
                        if (textAlt) {
                            text = textAlt;
                        }
                        if (hasInteractive) {
                            useInteractive = false;
                        }
                        getModule(moduleMap);
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }
                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval', 'fromText eval for ' + id + ' failed: ' + e, e, [id]));
                        }
                        if (hasInteractive) {
                            useInteractive = true;
                        }
                        this.depMaps.push(moduleMap);
                        context.completeLoad(moduleName);
                        localRequire([moduleName], load);
                    });
                    plugin.load(map.name, localRequire, load, config);
                }));
                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },
            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;
                this.enabling = true;
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;
                    if (typeof depMap === 'string') {
                        depMap = makeModuleMap(depMap, this.map.isDefine ? this.map : this.map.parentMap, false, !this.skipMap);
                        this.depMaps[i] = depMap;
                        handler = getOwn(handlers, depMap.id);
                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }
                        this.depCount += 1;
                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));
                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }
                    id = depMap.id;
                    mod = registry[id];
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));
                this.enabling = false;
                this.check();
            },
            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },
            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    delete this.events[name];
                }
            }
        };
        function callGetModule(args) {
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }
        function removeListener(node, func, name, ieName) {
            if (node.detachEvent && !isOpera) {
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }
        function getScriptData(evt) {
            var node = evt.currentTarget || evt.srcElement;
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');
            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }
        function intakeDefines() {
            var args;
            takeGlobalQueue();
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    callGetModule(args);
                }
            }
        }
        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,
            configure: function (cfg) {
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
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        if (isArray(value)) {
                            value = { deps: value };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
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
                eachProp(registry, function (mod, id) {
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },
            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || value.exports && getGlobal(value.exports);
                }
                return fn;
            },
            makeRequire: function (relMap, options) {
                options = options || {};
                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;
                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }
                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;
                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' + id + '" has not been loaded yet for context: ' + contextName + (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }
                    intakeDefines();
                    context.nextTick(function () {
                        intakeDefines();
                        requireMod = getModule(makeModuleMap(null, relMap));
                        requireMod.skipMap = options.skipMap;
                        requireMod.init(deps, callback, errback, { enabled: true });
                        checkLoaded();
                    });
                    return localRequire;
                }
                mixin(localRequire, {
                    isBrowser: isBrowser,
                    toUrl: function (moduleNamePlusExt) {
                        var ext, index = moduleNamePlusExt.lastIndexOf('.'), segment = moduleNamePlusExt.split('/')[0], isRelative = segment === '.' || segment === '..';
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }
                        return context.nameToUrl(normalize(moduleNamePlusExt, relMap && relMap.id, true), ext, true);
                    },
                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },
                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });
                if (!relMap) {
                    localRequire.undef = function (id) {
                        takeGlobalQueue();
                        var map = makeModuleMap(id, relMap, true), mod = getOwn(registry, id);
                        removeScript(id);
                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];
                        eachReverse(defQueue, function (args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        if (mod) {
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }
                            cleanRegistry(id);
                        }
                    };
                }
                return localRequire;
            },
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },
            completeLoad: function (moduleName) {
                var found, args, mod, shim = getOwn(config.shim, moduleName) || {}, shExports = shim.exports;
                takeGlobalQueue();
                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        found = true;
                    }
                    callGetModule(args);
                }
                mod = getOwn(registry, moduleName);
                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine', 'No define call for ' + moduleName, null, [moduleName]));
                        }
                    } else {
                        callGetModule([
                            moduleName,
                            shim.deps || [],
                            shim.exportsFn
                        ]);
                    }
                }
                checkLoaded();
            },
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url, parentPath, bundleId, pkgMain = getOwn(config.pkgs, moduleName);
                if (pkgMain) {
                    moduleName = pkgMain;
                }
                bundleId = getOwn(bundlesMap, moduleName);
                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }
                if (req.jsExtRegExp.test(moduleName)) {
                    url = moduleName + (ext || '');
                } else {
                    paths = config.paths;
                    syms = moduleName.split('/');
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            if (isArray(parentPath)) {
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
            },
            load: function (id, url) {
                req.load(context, id, url);
            },
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },
            onScriptLoad: function (evt) {
                if (evt.type === 'load' || readyRegExp.test((evt.currentTarget || evt.srcElement).readyState)) {
                    interactiveScript = null;
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };
        context.require = context.makeRequire();
        return context;
    }
    req = requirejs = function (deps, callback, errback, optional) {
        var context, config, contextName = defContextName;
        if (!isArray(deps) && typeof deps !== 'string') {
            config = deps;
            if (isArray(callback)) {
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }
        if (config && config.context) {
            contextName = config.context;
        }
        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }
        if (config) {
            context.configure(config);
        }
        return context.require(deps, callback, errback);
    };
    req.config = function (config) {
        return req(config);
    };
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) {
        fn();
    };
    if (!require) {
        require = req;
    }
    req.version = version;
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };
    req({});
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });
    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }
    req.onError = defaultOnError;
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ? document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') : document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };
    req.load = function (context, moduleName, url) {
        var config = context && context.config || {}, node;
        if (isBrowser) {
            node = req.createNode(config, moduleName, url);
            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);
            if (node.attachEvent && !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) && !isOpera) {
                useInteractive = true;
                node.attachEvent('onreadystatechange', context.onScriptLoad);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;
            return node;
        } else if (isWebWorker) {
            try {
                importScripts(url);
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts', 'importScripts failed for ' + moduleName + ' at ' + url, e, [moduleName]));
            }
        }
    };
    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }
        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return interactiveScript = script;
            }
        });
        return interactiveScript;
    }
    if (isBrowser && !cfg.skipDataMain) {
        eachReverse(scripts(), function (script) {
            if (!head) {
                head = script.parentNode;
            }
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                mainScript = dataMain;
                if (!cfg.baseUrl) {
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/') + '/' : './';
                    cfg.baseUrl = subPath;
                }
                mainScript = mainScript.replace(jsSuffixRegExp, '');
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];
                return true;
            }
        });
    }
    define = function (name, deps, callback) {
        var node, context;
        if (typeof name !== 'string') {
            callback = deps;
            deps = name;
            name = null;
        }
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }
        if (!deps && isFunction(callback)) {
            deps = [];
            if (callback.length) {
                callback.toString().replace(commentRegExp, '').replace(cjsRequireRegExp, function (match, dep) {
                    deps.push(dep);
                });
                deps = (callback.length === 1 ? ['require'] : [
                    'require',
                    'exports',
                    'module'
                ]).concat(deps);
            }
        }
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }
        (context ? context.defQueue : globalDefQueue).push([
            name,
            deps,
            callback
        ]);
    };
    define.amd = { jQuery: true };
    req.exec = function (text) {
        return eval(text);
    };
    req(cfg);
}(this));
define('../bower_components/requirejs/index', function () {
});
!function (e) {
    if ('object' == typeof exports && 'undefined' != typeof module)
        module.exports = e();
    else if ('function' == typeof define && define.amd)
        define('debug', [], e);
    else {
        var f;
        'undefined' != typeof window ? f = window : 'undefined' != typeof global ? f = global : 'undefined' != typeof self && (f = self), f.debug = e();
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
                    throw new Error('Cannot find module \'' + o + '\'');
                }
                var f = n[o] = { exports: {} };
                t[o][0].call(f.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e);
                }, f, f.exports, e, t, n, r);
            }
            return n[o].exports;
        }
        var i = typeof require == 'function' && require;
        for (var o = 0; o < r.length; o++)
            s(r[o]);
        return s;
    }({
        1: [
            function (_dereq_, module, exports) {
                exports = module.exports = _dereq_('./debug');
                exports.log = log;
                exports.formatArgs = formatArgs;
                exports.save = save;
                exports.load = load;
                exports.useColors = useColors;
                exports.colors = [
                    'lightseagreen',
                    'forestgreen',
                    'goldenrod',
                    'dodgerblue',
                    'darkorchid',
                    'crimson'
                ];
                function useColors() {
                    return 'WebkitAppearance' in document.documentElement.style || window.console && (console.firebug || console.exception && console.table);
                }
                exports.formatters.j = function (v) {
                    return JSON.stringify(v);
                };
                function formatArgs() {
                    var args = arguments;
                    var useColors = this.useColors;
                    args[0] = (useColors ? '%c' : '') + this.namespace + (useColors ? '%c ' : ' ') + args[0] + (useColors ? '%c ' : ' ') + '+' + exports.humanize(this.diff);
                    if (!useColors)
                        return args;
                    var c = 'color: ' + this.color;
                    args = [
                        args[0],
                        c,
                        ''
                    ].concat(Array.prototype.slice.call(args, 1));
                    var index = 0;
                    var lastC = 0;
                    args[0].replace(/%[a-z%]/g, function (match) {
                        if ('%%' === match)
                            return;
                        index++;
                        if ('%c' === match) {
                            lastC = index;
                        }
                    });
                    args.splice(lastC, 0, c);
                    return args;
                }
                function log() {
                    return 'object' == typeof console && 'function' == typeof console.log && Function.prototype.apply.call(console.log, console, arguments);
                }
                function save(namespaces) {
                    try {
                        if (null == namespaces) {
                            localStorage.removeItem('debug');
                        } else {
                            localStorage.debug = namespaces;
                        }
                    } catch (e) {
                    }
                }
                function load() {
                    var r;
                    try {
                        r = localStorage.debug;
                    } catch (e) {
                    }
                    return r;
                }
                exports.enable(load());
            },
            { './debug': 2 }
        ],
        2: [
            function (_dereq_, module, exports) {
                exports = module.exports = debug;
                exports.coerce = coerce;
                exports.disable = disable;
                exports.enable = enable;
                exports.enabled = enabled;
                exports.humanize = _dereq_('ms');
                exports.names = [];
                exports.skips = [];
                exports.formatters = {};
                var prevColor = 0;
                var prevTime;
                function selectColor() {
                    return exports.colors[prevColor++ % exports.colors.length];
                }
                function debug(namespace) {
                    function disabled() {
                    }
                    disabled.enabled = false;
                    function enabled() {
                        var self = enabled;
                        var curr = +new Date();
                        var ms = curr - (prevTime || curr);
                        self.diff = ms;
                        self.prev = prevTime;
                        self.curr = curr;
                        prevTime = curr;
                        if (null == self.useColors)
                            self.useColors = exports.useColors();
                        if (null == self.color && self.useColors)
                            self.color = selectColor();
                        var args = Array.prototype.slice.call(arguments);
                        args[0] = exports.coerce(args[0]);
                        if ('string' !== typeof args[0]) {
                            args = ['%o'].concat(args);
                        }
                        var index = 0;
                        args[0] = args[0].replace(/%([a-z%])/g, function (match, format) {
                            if (match === '%%')
                                return match;
                            index++;
                            var formatter = exports.formatters[format];
                            if ('function' === typeof formatter) {
                                var val = args[index];
                                match = formatter.call(self, val);
                                args.splice(index, 1);
                                index--;
                            }
                            return match;
                        });
                        if ('function' === typeof exports.formatArgs) {
                            args = exports.formatArgs.apply(self, args);
                        }
                        var logFn = exports.log || enabled.log || console.log.bind(console);
                        logFn.apply(self, args);
                    }
                    enabled.enabled = true;
                    var fn = exports.enabled(namespace) ? enabled : disabled;
                    fn.namespace = namespace;
                    return fn;
                }
                function enable(namespaces) {
                    exports.save(namespaces);
                    var split = (namespaces || '').split(/[\s,]+/);
                    var len = split.length;
                    for (var i = 0; i < len; i++) {
                        if (!split[i])
                            continue;
                        namespaces = split[i].replace('*', '.*?');
                        if (namespaces[0] === '-') {
                            exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
                        } else {
                            exports.names.push(new RegExp('^' + namespaces + '$'));
                        }
                    }
                }
                function disable() {
                    exports.enable('');
                }
                function enabled(name) {
                    var i, len;
                    for (i = 0, len = exports.skips.length; i < len; i++) {
                        if (exports.skips[i].test(name)) {
                            return false;
                        }
                    }
                    for (i = 0, len = exports.names.length; i < len; i++) {
                        if (exports.names[i].test(name)) {
                            return true;
                        }
                    }
                    return false;
                }
                function coerce(val) {
                    if (val instanceof Error)
                        return val.stack || val.message;
                    return val;
                }
            },
            { 'ms': 3 }
        ],
        3: [
            function (_dereq_, module, exports) {
                var s = 1000;
                var m = s * 60;
                var h = m * 60;
                var d = h * 24;
                var y = d * 365.25;
                module.exports = function (val, options) {
                    options = options || {};
                    if ('string' == typeof val)
                        return parse(val);
                    return options.long ? long(val) : short(val);
                };
                function parse(str) {
                    var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
                    if (!match)
                        return;
                    var n = parseFloat(match[1]);
                    var type = (match[2] || 'ms').toLowerCase();
                    switch (type) {
                    case 'years':
                    case 'year':
                    case 'y':
                        return n * y;
                    case 'days':
                    case 'day':
                    case 'd':
                        return n * d;
                    case 'hours':
                    case 'hour':
                    case 'h':
                        return n * h;
                    case 'minutes':
                    case 'minute':
                    case 'm':
                        return n * m;
                    case 'seconds':
                    case 'second':
                    case 's':
                        return n * s;
                    case 'ms':
                        return n;
                    }
                }
                function short(ms) {
                    if (ms >= d)
                        return Math.round(ms / d) + 'd';
                    if (ms >= h)
                        return Math.round(ms / h) + 'h';
                    if (ms >= m)
                        return Math.round(ms / m) + 'm';
                    if (ms >= s)
                        return Math.round(ms / s) + 's';
                    return ms + 'ms';
                }
                function long(ms) {
                    return plural(ms, d, 'day') || plural(ms, h, 'hour') || plural(ms, m, 'minute') || plural(ms, s, 'second') || ms + ' ms';
                }
                function plural(ms, n, name) {
                    if (ms < n)
                        return;
                    if (ms < n * 1.5)
                        return Math.floor(ms / n) + ' ' + name;
                    return Math.ceil(ms / n) + ' ' + name + 's';
                }
            },
            {}
        ]
    }, {}, [1])(1);
});
define('lib/setting-alias', [
    'require',
    'exports',
    'module',
    'debug'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('setting-alias');
    var forwardMethods = [
        'filterOptions',
        'resetOptions',
        'supported',
        'selected',
        'select',
        'next',
        'get',
        'set'
    ];
    module.exports = SettingAlias;
    function SettingAlias(options) {
        debug('initialize');
        this.key = options.key;
        this.settings = options.settings;
        this.current = options.get.bind(this);
        forwardMethods.forEach(this.forward, this);
        debug('initialized');
    }
    SettingAlias.prototype.each = function (fn) {
        for (var key in this.settings) {
            fn(this.settings[key]);
        }
    };
    SettingAlias.prototype.is = function (key) {
        return this.get('key') === key;
    };
    SettingAlias.prototype.forward = function (method) {
        this[method] = function () {
            var setting = this.current();
            return setting[method].apply(setting, arguments);
        };
    };
    SettingAlias.prototype.on = function (name, fn) {
        var alias = this;
        var wrapped = function () {
            if (!alias.is(this.key)) {
                return;
            }
            fn.apply(this, arguments);
        };
        this.each(function (setting) {
            setting.on(name, wrapped);
        });
        fn._settingAliasCallback = wrapped;
    };
    SettingAlias.prototype.off = function (name, fn) {
        var wrapped = fn._settingAliasCallback;
        this.each(function (setting) {
            setting.off(name, wrapped);
        });
        delete fn._settingAliasCallback;
    };
});
;
(function () {
    var proto = Events.prototype;
    var slice = [].slice;
    function Events(obj) {
        if (!(this instanceof Events))
            return new Events(obj);
        if (obj)
            return mixin(obj, proto);
    }
    proto.on = function (name, cb) {
        this._cbs = this._cbs || {};
        (this._cbs[name] || (this._cbs[name] = [])).push(cb);
        return this;
    };
    proto.once = function (name, cb) {
        this.on(name, one);
        function one() {
            cb.apply(this, arguments);
            this.off(name, one);
        }
    };
    proto.off = function (name, cb) {
        this._cbs = this._cbs || {};
        if (!name) {
            this._cbs = {};
            return;
        }
        if (!cb) {
            return delete this._cbs[name];
        }
        var cbs = this._cbs[name] || [];
        var i;
        while (cbs && ~(i = cbs.indexOf(cb))) {
            cbs.splice(i, 1);
        }
        return this;
    };
    proto.fire = proto.emit = function (options) {
        var cbs = this._cbs = this._cbs || {};
        var name = options.name || options;
        var batch = (cbs[name] || []).concat(cbs['*'] || []);
        var ctx = options.ctx || this;
        if (batch.length) {
            this._fireArgs = arguments;
            var args = slice.call(arguments, 1);
            while (batch.length) {
                batch.shift().apply(ctx, args);
            }
        }
        return this;
    };
    proto.firer = function (name) {
        var self = this;
        return function () {
            var args = slice.call(arguments);
            args.unshift(name);
            self.fire.apply(self, args);
        };
    };
    function mixin(a, b) {
        for (var key in b)
            a[key] = b[key];
        return a;
    }
    if (typeof exports === 'object') {
        module.exports = Events;
    } else if (typeof define === 'function' && define.amd) {
        define('evt', [], function () {
            return Events;
        });
    } else {
        window.evt = Events;
    }
}());
(function (define) {
    define('model', [
        'require',
        'exports',
        'module',
        'evt'
    ], function (require, exports, module) {
        'use strict';
        var events = require('evt');
        module.exports = Model;
        function Model(obj) {
            if (!(this instanceof Model)) {
                return mix(obj, Model.prototype);
            }
            this.reset(obj, { silent: true });
            this.id = obj.id || obj.key;
        }
        Model.prototype = events({
            get: function (key) {
                var data = this._getData();
                return arguments.length ? data[key] : mix({}, data);
            },
            set: function (key, value, options) {
                options = typeof key === 'object' ? value : options;
                var silent = options && options.silent;
                var data = this._getData();
                var keys;
                switch (typeof key) {
                case 'string':
                    data[key] = value;
                    if (!silent) {
                        this.onKeyChange(key);
                        this.emit('change', [key]);
                    }
                    return;
                case 'object':
                    mix(data, key);
                    if (!silent) {
                        keys = Object.keys(key);
                        keys.forEach(this.onKeyChange, this);
                        this.emit('change', keys);
                    }
                    return;
                }
            },
            setter: function (key, value1) {
                return function (value2) {
                    this.set(key, value1 || value2);
                }.bind(this);
            },
            reset: function (data, options) {
                if (!data) {
                    return;
                }
                var silent = options && options.silent;
                var isArray = data instanceof Array;
                this._data = !isArray ? mix({}, data) : data;
                if (!silent) {
                    this.emit('reset');
                }
            },
            onKeyChange: function (key) {
                var data = this._getData();
                this.emit('change:' + key, data[key]);
            },
            _getData: function () {
                this._data = this._data || {};
                return this._data;
            }
        });
        function mix(a, b) {
            for (var key in b) {
                a[key] = b[key];
            }
            return a;
        }
    });
}(function (n, w) {
    return typeof define == 'function' && define.amd ? define : typeof module == 'object' ? function (c) {
        c(require, exports, module);
    } : function (c) {
        var m = { exports: {} }, r = function (n) {
                return w[n];
            };
        w[n] = c(r, m.exports, m) || m.exports;
    };
}('model', this)));
define('lib/setting', [
    'require',
    'exports',
    'module',
    'debug',
    'model'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('setting');
    var model = require('model');
    module.exports = Setting;
    model(Setting.prototype);
    function Setting(data) {
        this.key = data.key;
        this.storage = data.storage || localStorage;
        this.reset(data, { silent: true });
        this.select = this.select.bind(this);
        this.next = this.next.bind(this);
        this.configure(data);
        if (data.persistent) {
            this.on('change:selected', this.save);
        }
    }
    Setting.prototype.configure = function (data) {
        var optionsDefined = !!(data.options && data.options.length);
        this.options = { defined: optionsDefined };
        this.resetOptions(data.options);
    };
    Setting.prototype.resetOptions = function (list) {
        list = list || [];
        var hash = this.optionsToHash(list);
        this.options.all = hash;
        this.options.available = hash;
        this.set('options', list, { silent: true });
        this.updateSelected({ silent: true });
    };
    Setting.prototype.filterOptions = function (keys, options) {
        var available = this.options.available = {};
        var hash = this.options.all;
        var filtered = [];
        (keys || []).forEach(function (key) {
            var option = hash[key];
            if (option !== undefined) {
                filtered.push(option);
                available[key] = option;
            }
        });
        this.sortByIndex(filtered);
        this.set('options', filtered, options);
        this.updateSelected({ silent: true });
    };
    Setting.prototype.optionsToHash = function (options) {
        var hash = {};
        options.forEach(function (option, index) {
            option.index = index;
            hash[option.key] = option;
        });
        return hash;
    };
    Setting.prototype.selected = function (key) {
        var hash = this.options.available;
        var option = hash[this.get('selected')];
        return key ? option && option[key] : option;
    };
    Setting.prototype.select = function (key, options) {
        var isIndex = typeof key === 'number';
        var list = this.get('options');
        var available = this.options.available;
        var selected = isIndex ? list[key] : available[key];
        if (!list.length) {
            return;
        }
        if (!selected) {
            return this.select(0, options);
        }
        this.set('selected', selected.key, options);
    };
    Setting.prototype.sortByIndex = function (list) {
        return list.sort(function (a, b) {
            return a.index - b.index;
        });
    };
    Setting.prototype.updateSelected = function (options) {
        this.select(this.get('selected') || this.fetched, options);
    };
    Setting.prototype.next = function () {
        var options = this.get('options');
        var selected = this.selected();
        var index = options.indexOf(selected);
        var newIndex = (index + 1) % options.length;
        this.select(newIndex);
        debug('set \'%s\' to index: %s', this.key, newIndex);
    };
    Setting.prototype.save = function () {
        var selected = this.get('selected');
        debug('saving key: %s, selected: %s', this.key, selected);
        this.storage.setItem('setting:' + this.key, selected);
        debug('saved key: %s', selected);
    };
    Setting.prototype.fetch = function () {
        if (!this.get('persistent')) {
            return;
        }
        debug('fetch value key: %s', this.key);
        this.fetched = this.storage.getItem('setting:' + this.key);
        debug('fetched %s value: %s', this.key, this.fetched);
        if (this.fetched) {
            this.select(this.fetched, { silent: true });
        }
    };
    Setting.prototype.supported = function () {
        return this.enabled() && !!this.get('options').length;
    };
    Setting.prototype.enabled = function () {
        return !this.get('disabled');
    };
});
define('lib/settings', [
    'require',
    'exports',
    'module',
    './setting-alias',
    'debug',
    './setting'
], function (require, exports, module) {
    'use strict';
    var SettingAlias = require('./setting-alias');
    var debug = require('debug')('settings');
    var Setting = require('./setting');
    module.exports = Settings;
    function Settings(items) {
        this.ids = {};
        this.items = [];
        this.aliases = {};
        this.SettingAlias = SettingAlias;
        this.dontSave = this.dontSave.bind(this);
        this.addEach(items);
    }
    Settings.prototype.addEach = function (items) {
        if (!items) {
            return;
        }
        var item;
        var key;
        for (key in items) {
            item = items[key];
            item.key = item.key || key;
            this.add(items[key]);
        }
    };
    Settings.prototype.add = function (data) {
        var setting = new Setting(data);
        this.items.push(setting);
        this.ids[setting.key] = this[setting.key] = setting;
        debug('added setting: %s', setting.key);
    };
    Settings.prototype.fetch = function () {
        this.items.forEach(function (setting) {
            setting.fetch();
        });
    };
    Settings.prototype.dontSave = function () {
        this.items.forEach(function (setting) {
            setting.off('change:selected', setting.save);
        });
    };
    Settings.prototype.alias = function (options) {
        var alias = new this.SettingAlias(options);
        this.aliases[options.key] = alias;
        this[options.key] = alias;
    };
    Settings.prototype.removeAlias = function (key) {
    };
});
define('lib/geo-location', [
    'require',
    'exports',
    'module',
    'debug'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('geolocation');
    module.exports = GeoLocation;
    function GeoLocation() {
        this.watcher = null;
        this.position = null;
        this.setPosition = this.setPosition.bind(this);
        this.watch = this.watch.bind(this);
    }
    GeoLocation.prototype.watch = function () {
        if (!this.watcher) {
            this.watcher = navigator.geolocation.watchPosition(this.setPosition);
            debug('started watching');
        }
    };
    GeoLocation.prototype.stopWatching = function () {
        navigator.geolocation.clearWatch(this.watcher);
        this.watcher = null;
        debug('stopped watching');
    };
    GeoLocation.prototype.setPosition = function (position) {
        this.position = {
            timestamp: position.timestamp,
            altitude: position.coords.altitude,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
    };
});
define('config/config', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = {
        globals: {
            CONFIG_MAX_IMAGE_PIXEL_SIZE: 24 * 1024 * 1024,
            CONFIG_MAX_SNAPSHOT_PIXEL_SIZE: 24 * 1024 * 1024,
            CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH: 0,
            CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT: 0
        },
        zoom: {
            disabled: false,
            useZoomPreviewAdjustment: false
        },
        focus: {
            continuousAutoFocus: true,
            touchFocus: true,
            faceDetection: true
        },
        previewGallery: {
            thumbnailWidth: 54,
            thumbnailHeight: 54
        },
        viewfinder: {
            scaleType: 'fill',
            zoomGestureSensitivity: 0.425
        },
        battery: {
            levels: {
                low: 15,
                verylow: 10,
                critical: 6,
                shutdown: 5,
                healthy: 100
            }
        },
        sounds: {
            list: [
                {
                    name: 'shutter',
                    url: './resources/sounds/shutter.opus',
                    setting: 'camera.sound.enabled'
                },
                {
                    name: 'countdown',
                    url: './resources/sounds/countdown.opus',
                    setting: 'camera.sound.enabled'
                },
                {
                    name: 'recordingStart',
                    url: './resources/sounds/camcorder_start.opus',
                    setting: 'camera.sound.enabled'
                },
                {
                    name: 'recordingEnd',
                    url: './resources/sounds/camcorder_end.opus',
                    setting: 'camera.sound.enabled'
                }
            ]
        },
        keyDownEvents: {
            camera: 'capture',
            volumeup: 'capture',
            volumedown: 'capture',
            mozcamerafocusadjust: 'focus'
        },
        activity: {
            maxPixelSizeScaleFactor: 2.5,
            maxPickPixelSize: 0,
            maxSharePixelSize: 0
        },
        spinnerTimeouts: {
            takingPicture: 1650,
            requestingCamera: 850,
            loadingVideo: 100,
            resizingImage: 100,
            lazyLoading: 300
        },
        mode: {
            options: [
                { key: 'picture' },
                { key: 'video' }
            ],
            persistent: false
        },
        isoModes: {
            disabled: false,
            options: [{ key: 'auto' }],
            selected: 'auto'
        },
        whiteBalance: {
            disabled: false,
            options: [{ key: 'auto' }],
            selected: 'auto'
        },
        cameras: {
            options: [
                {
                    key: 'back',
                    icon: 'toggle-camera-rear',
                    title: 'toggle-camera-rear'
                },
                {
                    key: 'front',
                    icon: 'toggle-camera-front',
                    title: 'toggle-camera-front'
                }
            ],
            persistent: false
        },
        pictureSizesFront: {
            title: 'camera-resolution',
            header: 'camera-resolution-header',
            icon: 'picture-size',
            options: [],
            include: { aspects: ['4:3'] },
            persistent: true,
            optionsLocalizable: false
        },
        pictureSizesBack: {
            title: 'camera-resolution',
            header: 'camera-resolution-header',
            icon: 'picture-size',
            options: [],
            include: { aspects: ['4:3'] },
            persistent: true,
            optionsLocalizable: false
        },
        recorderProfilesBack: {
            title: 'video-resolution',
            header: 'video-resolution-header',
            icon: 'video-size',
            exclude: [
                'low',
                'high',
                'default'
            ],
            options: [],
            persistent: true,
            optionsLocalizable: false
        },
        recorderProfilesFront: {
            title: 'video-resolution',
            header: 'video-resolution-header',
            icon: 'video-size',
            exclude: [
                'low',
                'high',
                'default'
            ],
            options: [],
            persistent: true,
            optionsLocalizable: false
        },
        flashModesPicture: {
            title: 'flash',
            options: [
                {
                    key: 'auto',
                    icon: 'flash-auto',
                    title: 'flash-auto'
                },
                {
                    key: 'on',
                    icon: 'flash-on',
                    title: 'flash-on'
                },
                {
                    key: 'off',
                    icon: 'flash-off',
                    title: 'flash-off'
                }
            ],
            persistent: true
        },
        flashModesVideo: {
            title: 'flash',
            options: [
                {
                    key: 'off',
                    icon: 'flash-off',
                    title: 'flash-off'
                },
                {
                    key: 'torch',
                    icon: 'flash-on',
                    title: 'flash-on'
                }
            ],
            persistent: true
        },
        countdown: {
            title: 'self-timer',
            header: 'self-timer-header',
            icon: 'self-timer',
            options: [
                {
                    key: 'off',
                    title: 'self-timer-off',
                    value: 0
                },
                {
                    key: 'secs2',
                    value: 2,
                    title: 'self-timer-2-seconds'
                },
                {
                    key: 'secs5',
                    value: 5,
                    title: 'self-timer-5-seconds'
                },
                {
                    key: 'secs10',
                    value: 10,
                    title: 'self-timer-10-seconds'
                }
            ],
            persistent: false
        },
        hdr: {
            title: 'hdr',
            header: 'hdr-header',
            icon: 'hdr-boxed',
            disabled: false,
            options: [
                {
                    key: 'off',
                    title: 'hdr-off'
                },
                {
                    key: 'on',
                    title: 'hdr-on'
                }
            ],
            persistent: true
        },
        scene: {
            title: 'scene-mode',
            header: 'scene-mode-header',
            icon: 'scene',
            options: [
                {
                    key: 'normal',
                    title: 'scene-mode-normal'
                },
                {
                    key: 'pano',
                    title: 'scene-mode-panorama'
                },
                {
                    key: 'beauty',
                    title: 'scene-mode-beauty'
                }
            ],
            persistent: true
        },
        grid: {
            title: 'grid',
            header: 'grid-header',
            icon: 'grid-circular',
            options: [
                {
                    key: 'off',
                    title: 'grid-off'
                },
                {
                    key: 'on',
                    title: 'grid-on'
                }
            ],
            selected: 'off',
            persistent: true,
            notifications: false
        },
        settingsMenu: {
            items: [
                { key: 'hdr' },
                { key: 'countdown' },
                { key: 'pictureSizes' },
                { key: 'recorderProfiles' },
                { key: 'grid' }
            ]
        }
    };
});
define('lib/camera-utils', ['require'], function (require) {
    'use strict';
    var CameraUtils = {};
    CameraUtils.scaleSizeToFitViewport = function (viewportSize, imageSize) {
        var sw = viewportSize.width / imageSize.width, sh = viewportSize.height / imageSize.height, scale;
        scale = Math.min(sw, sh);
        return {
            width: imageSize.width * scale,
            height: imageSize.height * scale
        };
    };
    CameraUtils.scaleSizeToFillViewport = function (viewportSize, imageSize) {
        var sw = viewportSize.width / imageSize.width, sh = viewportSize.height / imageSize.height, scale;
        scale = Math.max(sw, sh);
        return {
            width: imageSize.width * scale,
            height: imageSize.height * scale
        };
    };
    CameraUtils.getMaximumPreviewSize = function (previewSizes, aspectRatio) {
        const ASPECT_TOLERANCE = 0.001;
        var maximumArea = 0;
        var maximumPreviewSize = null;
        previewSizes.forEach(function (previewSize) {
            var area = previewSize.width * previewSize.height;
            if (aspectRatio) {
                var ratio = previewSize.width / previewSize.height;
                if (Math.abs(ratio - aspectRatio) > ASPECT_TOLERANCE) {
                    return;
                }
            }
            if (area > maximumArea) {
                maximumArea = area;
                maximumPreviewSize = previewSize;
            }
        });
        return maximumPreviewSize;
    };
    return CameraUtils;
});
(function (define) {
    define('device-orientation', [
        'require',
        'exports',
        'module'
    ], function (require, exports, module) {
        'use strict';
        const ORIENTATION_CHANGE_INTERVAL = 300;
        const MAX_MOTION_FILTER_TIME = 1000;
        const MOTION_FILTER_TIME_CONSTANT = 200;
        var lastMotionFilteredTime = 0;
        var lastMotionData = {
            x: 0,
            y: 0,
            z: 0,
            t: 0
        };
        var pendingOrientation = null;
        var orientationChangeTimer = 0;
        var eventListeners = { 'orientation': [] };
        function applyFilter(x, y, z) {
            var now = new Date().getTime();
            var filterReset = false;
            if (now > lastMotionData.t + MAX_MOTION_FILTER_TIME) {
                lastMotionData.x = 0;
                lastMotionData.y = 0;
                lastMotionData.z = 0;
                filterReset = true;
            }
            if (lastMotionData.x || lastMotionData.y || lastMotionData.z) {
                var diff = now - lastMotionFilteredTime;
                var alpha = diff / (MOTION_FILTER_TIME_CONSTANT + diff);
                x = alpha * (x - lastMotionData.x) + lastMotionData.x;
                y = alpha * (y - lastMotionData.y) + lastMotionData.y;
                z = alpha * (z - lastMotionData.z) + lastMotionData.z;
            }
            lastMotionData.x = x;
            lastMotionData.y = y;
            lastMotionData.z = z;
            lastMotionData.t = now;
            return filterReset;
        }
        function calcOrientation(x, y) {
            var orientationAngle = Math.atan2(-x, y) * 180 / Math.PI;
            if (orientationAngle < 0) {
                orientationAngle += 360;
            }
            var orientation = ((orientationAngle + 45) / 90 >> 0) % 4 * 90;
            return orientation;
        }
        function handleMotionEvent(e) {
            if (!e.accelerationIncludingGravity) {
                return;
            }
            var filterReset = applyFilter(e.accelerationIncludingGravity.x, e.accelerationIncludingGravity.y, e.accelerationIncludingGravity.z);
            if (filterReset) {
                return;
            }
            var x = lastMotionData.x;
            var y = lastMotionData.y;
            var z = lastMotionData.z;
            if (x * x + y * y + z * z > 110) {
                return;
            }
            if (z > 9.2 || z < -9.2) {
                return;
            }
            var orientation = calcOrientation(x, y);
            if (orientation === pendingOrientation) {
                return;
            }
            if (orientationChangeTimer) {
                window.clearTimeout(orientationChangeTimer);
            }
            if (pendingOrientation === null) {
                pendingOrientation = orientation;
                fireOrientationChangeEvent(pendingOrientation);
            } else {
                pendingOrientation = orientation;
                orientationChangeTimer = window.setTimeout(function doOrient() {
                    fireOrientationChangeEvent(pendingOrientation);
                    orientationChangeTimer = 0;
                }, ORIENTATION_CHANGE_INTERVAL);
            }
        }
        function start() {
            pendingOrientation = null;
            window.addEventListener('devicemotion', handleMotionEvent);
        }
        function stop() {
            window.removeEventListener('devicemotion', handleMotionEvent);
            if (orientationChangeTimer) {
                clearTimeout(orientationChangeTimer);
                orientationChangeTimer = 0;
            }
        }
        function addEventListener(type, listener) {
            if (eventListeners[type] && listener) {
                eventListeners[type].push(listener);
            }
        }
        function removeEventListener(type, listener) {
            if (!eventListeners[type]) {
                return;
            }
            var idx = eventListeners[type].indexOf(listener);
            if (idx > -1) {
                eventListeners.slice(idx, 1);
            }
        }
        function fireOrientationChangeEvent(orientation) {
            eventListeners.orientation.forEach(function (listener) {
                if (listener.handleEvent) {
                    listener.handleEvent(orientation);
                } else if (typeof listener === 'function') {
                    listener(orientation);
                }
            });
        }
        module.exports = {
            start: start,
            stop: stop,
            on: addEventListener,
            off: removeEventListener
        };
    });
}(function (n, w) {
    return typeof define == 'function' && define.amd ? define : typeof module == 'object' ? function (c) {
        c(require, exports, module);
    } : function (c) {
        var m = { exports: {} }, r = function (n) {
                return w[n];
            };
        w[n] = c(r, m.exports, m) || m.exports;
    };
}('device-orientation', this)));
define('lib/orientation', [
    'require',
    'exports',
    'module',
    'device-orientation'
], function (require, exports, module) {
    'use strict';
    var listener = require('device-orientation');
    var classes = document.body.classList;
    var current = 0;
    listener.on('orientation', onOrientationChange);
    listener.start();
    function onOrientationChange(degrees) {
        classes.remove('deg' + current);
        classes.add('deg' + degrees);
        current = degrees;
    }
    function unlock() {
        screen.mozUnlockOrientation();
        listener.stop();
    }
    function lock() {
        screen.mozLockOrientation('default');
        listener.start();
    }
    function rationalize(sensorAngle, angle) {
        if (typeof angle === 'undefined') {
            angle = current;
        }
        var r = angle + sensorAngle;
        if (r >= 0) {
            r += 45;
        } else {
            r -= 45;
        }
        r /= 90;
        if (r >= 0) {
            r = Math.floor(r);
        } else {
            r = Math.ceil(r);
        }
        r %= 4;
        r *= 90;
        if (r < 0) {
            r += 360;
        }
        return r;
    }
    module.exports = {
        on: listener.on,
        off: listener.off,
        start: listener.start,
        stop: listener.stop,
        unlock: unlock,
        lock: lock,
        rationalize: rationalize,
        get: function () {
            return current;
        }
    };
});
define('lib/bind-all', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = function (object) {
        var key;
        var fn;
        for (key in object) {
            fn = object[key];
            if (typeof fn === 'function') {
                object[key] = fn.bind(object);
            }
        }
    };
});
define('lib/camera/focus', [
    'require',
    'exports',
    'module',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var bindAll = require('lib/bind-all');
    module.exports = Focus;
    function Focus(options) {
        bindAll(this);
        this.userPreferences = options || {};
        this.detectedFaces = [];
    }
    Focus.prototype.configure = function (mozCamera, mode) {
        var focusModes = mozCamera.capabilities.focusModes;
        var focusMode;
        this.mozCamera = mozCamera;
        this.configureFocusModes(mode);
        if (this.continuousAutoFocus) {
            if (mode === 'picture') {
                focusMode = 'continuous-picture';
            } else if (mode === 'video') {
                focusMode = 'continuous-video';
            }
        }
        focusMode = focusMode || 'auto';
        if (focusModes.indexOf(focusMode) === -1) {
            focusMode = focusModes[0];
        }
        this.suspendedMode = focusMode;
        mozCamera.focusMode = focusMode;
        this.reboot();
    };
    Focus.prototype.getMode = function () {
        var mozCamera = this.mozCamera;
        return this.suspendedMode || mozCamera.focusMode;
    };
    Focus.prototype.configureFocusModes = function (mode) {
        var userPreferences = this.userPreferences;
        var continuousAutoFocusUserEnabled = userPreferences.continuousAutoFocus !== false;
        var touchFocusUserEnabled = userPreferences.touchFocus;
        var touchFocusSupported = this.isTouchFocusSupported();
        var faceDetectionUserEnabled = userPreferences.faceDetection;
        var faceDetectionSupported = this.isFaceDetectionSupported();
        this.continuousAutoFocus = continuousAutoFocusUserEnabled;
        this.touchFocus = touchFocusUserEnabled && touchFocusSupported;
        this.faceDetection = faceDetectionUserEnabled && faceDetectionSupported && mode === 'picture';
        this.mozCamera.addEventListener('focus', this.onAutoFocusStateChange);
    };
    Focus.prototype.startFaceDetection = function () {
        if (!this.faceDetection) {
            return;
        }
        this.mozCamera.addEventListener('facesdetected', this.handleFaceDetectionEvent);
        this.mozCamera.startFaceDetection();
    };
    Focus.prototype.stopFaceDetection = function () {
        clearTimeout(this.faceDetectionSuspended);
        clearTimeout(this.faceDetectionSuspensionTimer);
        if (this.mozCamera.stopFaceDetection) {
            this.mozCamera.removeEventListener('facesdetected', this.handleFaceDetectionEvent);
            this.mozCamera.stopFaceDetection();
        }
        this.clearFaceDetection();
    };
    Focus.prototype.handleFaceDetectionEvent = function (e) {
        this.focusOnLargestFace(e.faces);
    };
    Focus.prototype.clearFaceDetection = function () {
        this.focusOnLargestFace([]);
    };
    Focus.prototype.suspendFaceDetection = function (ms, delay) {
        if (!this.faceDetection) {
            return;
        }
        var self = this;
        delay = delay || 0;
        clearTimeout(this.faceDetectionSuspended);
        clearTimeout(this.faceDetectionSuspensionTimer);
        this.faceDetectionSuspensionTimer = setTimeout(suspendFaceDetection, delay);
        function suspendFaceDetection() {
            self.faceDetectionSuspended = setTimeout(clearTimer, ms);
        }
        function clearTimer() {
            self.faceFocused = false;
            self.faceDetectionSuspended = undefined;
        }
    };
    Focus.prototype.stopContinuousFocus = function () {
        var focusMode = this.mozCamera.focusMode;
        clearTimeout(this.continuousModeTimer);
        if (focusMode === 'continuous-picture' || focusMode === 'continuous-video') {
            this.suspendedMode = this.mozCamera.focusMode;
            this.mozCamera.focusMode = 'auto';
        }
    };
    Focus.prototype.resumeContinuousFocus = function () {
        this.mozCamera.focusMode = this.suspendedMode;
        this.suspendedMode = null;
        this.resetFocusAreas();
        this.mozCamera.resumeContinuousFocus();
    };
    Focus.prototype.suspendContinuousFocus = function (ms) {
        clearTimeout(this.continuousModeTimer);
        this.stopContinuousFocus();
        this.continuousModeTimer = setTimeout(this.resumeContinuousFocus, ms);
    };
    Focus.prototype.updateFocusState = function (state) {
        if (this.focusState !== state && (this.focusState === 'focusing' || state === 'focusing')) {
            this.focusState = state;
            this.onAutoFocusChanged(state);
        }
    };
    Focus.prototype.onAutoFocusStateChange = function (e) {
        var state = e.newState;
        if (state === 'unfocused') {
            state = 'fail';
        }
        this.updateFocusState(state);
    };
    Focus.prototype.onAutoFocusChanged = function (state) {
    };
    Focus.prototype.onFacesDetected = function (faces) {
    };
    Focus.prototype.focusOnLargestFace = function (faces) {
        if (this.faceDetectionSuspended) {
            this.onFacesDetected([]);
            return;
        }
        this.detectedFaces = faces;
        this.onFacesDetected(this.detectedFaces);
    };
    Focus.prototype.focus = function (done) {
        if (!this.mozCamera) {
            return;
        }
        done = done || function () {
        };
        var self = this;
        this.suspendContinuousFocus(10000);
        if (this.mozCamera.focusMode !== 'auto') {
            done();
            return;
        }
        this.updateFocusState('focusing');
        this.mozCamera.autoFocus().then(onSuccess, onError);
        function onError(err) {
            self.focused = false;
            if (err.name === 'NS_ERROR_IN_PROGRESS') {
                done('interrupted');
            } else {
                done('error');
            }
        }
        function onSuccess(success) {
            if (success) {
                self.focused = true;
                done('focused');
            } else {
                self.focused = false;
                done('failed');
            }
        }
    };
    Focus.prototype.resetFocusAreas = function () {
        if (!this.touchFocus) {
            return;
        }
        this.mozCamera.setFocusAreas([]);
        this.mozCamera.setMeteringAreas([]);
    };
    Focus.prototype.pause = function () {
        if (this.paused) {
            return;
        }
        this.stopContinuousFocus();
        this.stopFaceDetection();
        this.paused = true;
        delete this.focusState;
    };
    Focus.prototype.resume = function () {
        if (!this.paused) {
            return;
        }
        this.resumeContinuousFocus();
        this.startFaceDetection();
        this.paused = false;
    };
    Focus.prototype.reboot = function () {
        this.pause();
        this.resume();
    };
    Focus.prototype.isTouchFocusSupported = function () {
        var maxFocusAreas = this.mozCamera.capabilities.maxFocusAreas;
        return maxFocusAreas > 0;
    };
    Focus.prototype.isFaceDetectionSupported = function () {
        var cameraDetectsFaces = this.mozCamera.capabilities.maxDetectedFaces > 0;
        var apiAvailable = !!this.mozCamera.startFaceDetection;
        this.maxDetectedFaces = this.mozCamera.capabilities.maxDetectedFaces;
        return cameraDetectsFaces && apiAvailable;
    };
    Focus.prototype.updateFocusArea = function (rect, done) {
        done = done || function () {
        };
        if (!this.touchFocus) {
            done('touchToFocusNotAvailable');
            return;
        }
        this.updateFocusState('focusing');
        this.stopContinuousFocus();
        this.suspendFaceDetection(10000);
        this.mozCamera.setFocusAreas([rect]);
        this.mozCamera.setMeteringAreas([rect]);
        this.focus(done);
    };
});
define('lib/debounce', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    };
});
define('lib/mixin', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = function (a, b) {
        for (var key in b) {
            a[key] = b[key];
        }
        return a;
    };
});
define('lib/camera/camera', [
    'require',
    'exports',
    'module',
    'lib/camera-utils',
    'lib/orientation',
    'lib/camera/focus',
    'debug',
    'lib/debounce',
    'lib/bind-all',
    'lib/mixin',
    'model'
], function (require, exports, module) {
    'use strict';
    var CameraUtils = require('lib/camera-utils');
    var orientation = require('lib/orientation');
    var Focus = require('lib/camera/focus');
    var debug = require('debug')('camera');
    var debounce = require('lib/debounce');
    var bindAll = require('lib/bind-all');
    var mix = require('lib/mixin');
    var model = require('model');
    model(Camera.prototype);
    module.exports = Camera;
    function Camera(options) {
        debug('initializing');
        bindAll(this);
        options = options || {};
        this.cacheConfig = options.cacheConfig !== false;
        this.minRecordingTime = options.minRecordingTime || 1500;
        this.recordSpacePadding = options.recordSpacePadding || 1024 * 1024 * 1;
        this.recordSpaceMin = options.recordSpaceMin || 1024 * 1024 * 2;
        this.requestAttempts = options.requestAttempts || 3;
        this.orientation = options.orientation || orientation;
        this.configStorage = options.configStorage || localStorage;
        this.cameraList = navigator.mozCameras.getListOfCameras();
        this.mozCamera = null;
        this.storage = options.storage || {};
        this.video = {
            filepath: null,
            minSpace: this.recordSpaceMin,
            spacePadding: this.recordSpacePadding,
            poster: { filepath: null }
        };
        this.focus = new Focus(options.focus);
        this.suspendedFlashCount = 0;
        this.mode = 'picture';
        this.selectedCamera = 'back';
        this.configure = debounce(this.configure);
        debug('initialized');
    }
    Camera.prototype.load = function () {
        debug('load camera');
        var loadingNewCamera = this.selectedCamera !== this.lastLoadedCamera;
        var self = this;
        if (this.releasing) {
            debug('wait for camera release');
            this.once('released', function () {
                self.load();
            });
            return;
        }
        if (this.mozCamera && !loadingNewCamera) {
            debug('camera not changed');
            this.ready();
            return;
        }
        if (this.mozCamera) {
            this.release(ready);
        } else {
            ready();
        }
        function ready() {
            self.requestCamera(self.selectedCamera);
            self.lastLoadedCamera = self.selectedCamera;
        }
    };
    Camera.prototype.requestCamera = function (camera, config) {
        if (!config) {
            config = { mode: this.mode };
        }
        debug('request camera', camera, config);
        if (this.isBusy) {
            return;
        }
        var attempts = this.requestAttempts;
        var self = this;
        this.configured = false;
        this.busy('requestingCamera');
        request();
        function request() {
            navigator.mozCameras.getCamera(camera, config).then(onSuccess, onError);
            self.emit('requesting');
            debug('camera requested', camera, config);
            attempts--;
        }
        function onSuccess(result) {
            debug('successfully got mozCamera', result);
            if (document.hidden) {
                self.mozCamera = result.camera;
                self.release();
                return;
            }
            self.updateConfig(result.configuration);
            self.setupNewCamera(result.camera);
            self.configureFocus();
            self.emit('focusconfigured', {
                mode: self.mozCamera.focusMode,
                touchFocus: self.focus.touchFocus,
                faceDetection: self.focus.faceDetection,
                maxDetectedFaces: self.focus.maxDetectedFaces
            });
            if (self.configured) {
                self.emit('configured');
                self.onPreviewStateChange({ newState: 'started' });
            }
            self.ready();
        }
        function onError(err) {
            debug('error requesting camera', err);
            if (err.name === 'NS_ERROR_NOT_INITIALIZED' && attempts) {
                self.cameraRequestTimeout = setTimeout(request, 1000);
                return;
            }
            self.emit('error', 'request-fail');
            self.ready();
        }
    };
    Camera.prototype.updateConfig = function (config) {
        this.givenPreviewSize = config.previewSize;
        this.pictureSize = config.pictureSize;
        this.recorderProfile = config.recorderProfile;
        this.configured = true;
    };
    Camera.prototype.setupNewCamera = function (mozCamera) {
        debug('configuring camera');
        var capabilities = mozCamera.capabilities;
        this.mozCamera = mozCamera;
        this.mozCamera.addEventListener('shutter', this.onShutter);
        this.mozCamera.addEventListener('close', this.onClosed);
        this.mozCamera.addEventListener('previewstatechange', this.onPreviewStateChange);
        this.mozCamera.addEventListener('recorderstatechange', this.onRecorderStateChange);
        this.mozCamera.addEventListener('poster', this.onPoster);
        this.capabilities = this.formatCapabilities(capabilities);
        this.emit('newcamera', {
            capabilities: this.capabilities,
            pictureSize: this.pictureSize,
            recorderProfile: this.recorderProfile
        });
        debug('configured new camera');
    };
    Camera.prototype.formatCapabilities = function (capabilities) {
        var hasHDR = capabilities.sceneModes.indexOf('hdr') > -1;
        var hdr = hasHDR ? [
            'on',
            'off'
        ] : undefined;
        return mix({ hdr: hdr }, capabilities);
    };
    Camera.prototype.configure = function () {
        debug('configuring hardware...');
        var self = this;
        this.configured = false;
        if (this.isBusy) {
            debug('defering configuration');
            this.once('ready', this.configure);
            return;
        }
        if (!this.mozCamera) {
            debug('no mozCamera');
            return;
        }
        this.stopRecording();
        this.busy();
        var mozCameraConfig = {
            mode: this.mode,
            pictureSize: this.pictureSize,
            recorderProfile: this.recorderProfile
        };
        this.mozCamera.setConfiguration(mozCameraConfig).then(onSuccess, onError);
        debug('mozCamera configuring', mozCameraConfig);
        function onSuccess(config) {
            debug('configuration success');
            if (!self.mozCamera) {
                return;
            }
            self.updateConfig(config);
            self.configureFocus();
            self.emit('configured');
            self.ready();
        }
        function onError(err) {
            debug('Error configuring camera');
            self.configured = true;
            self.ready();
        }
    };
    Camera.prototype.configureFocus = function () {
        this.focus.configure(this.mozCamera, this.mode);
        this.focus.onFacesDetected = this.onFacesDetected;
        this.focus.onAutoFocusChanged = this.onAutoFocusChanged;
    };
    Camera.prototype.shutdown = function () {
        this.stopRecording();
        this.set('previewActive', false);
        this.set('focus', 'none');
        this.release();
    };
    Camera.prototype.onAutoFocusChanged = function (state) {
        this.set('focus', state);
    };
    Camera.prototype.onFacesDetected = function (faces) {
        this.emit('facesdetected', faces);
    };
    Camera.prototype.loadStreamInto = function (videoElement) {
        debug('loading stream into element');
        if (!this.mozCamera) {
            debug('error - `mozCamera` is undefined or null');
            return;
        }
        if (!videoElement) {
            debug('error - `videoElement` is undefined or null');
            return;
        }
        var isCurrent = videoElement.mozSrcObject === this.mozCamera;
        if (isCurrent) {
            return debug('camera didn\'t change');
        }
        videoElement.mozSrcObject = this.mozCamera;
        videoElement.play();
        debug('stream loaded into video');
    };
    Camera.prototype.previewSizes = function () {
        if (!this.mozCamera) {
            return;
        }
        return this.mozCamera.capabilities.previewSizes;
    };
    Camera.prototype.previewSize = function () {
        return this.givenPreviewSize;
    };
    Camera.prototype.resolution = function () {
        switch (this.mode) {
        case 'picture':
            return this.pictureSize;
        case 'video':
            return this.getRecorderProfile().video;
        }
    };
    Camera.prototype.setPictureSize = function (size, options) {
        debug('set picture size', size);
        if (!size) {
            return;
        }
        var configure = !(options && options.configure === false);
        if (this.isPictureSize(size)) {
            debug('pictureSize didn\'t change');
            return;
        }
        this.pictureSize = size;
        if (configure) {
            this.configure();
        } else {
            this.mozCamera.setPictureSize(size);
        }
        this.setThumbnailSize();
        debug('pictureSize changed');
        return this;
    };
    Camera.prototype.isPictureSize = function (size) {
        if (!this.pictureSize) {
            return false;
        }
        var sameWidth = size.width === this.pictureSize.width;
        var sameHeight = size.height === this.pictureSize.height;
        return sameWidth && sameHeight;
    };
    Camera.prototype.setRecorderProfile = function (key, options) {
        debug('set recorderProfile: %s', key);
        if (!key) {
            return;
        }
        var configure = !(options && options.configure === false);
        if (this.isRecorderProfile(key)) {
            debug('recorderProfile didn\'t change');
            return;
        }
        this.recorderProfile = key;
        if (configure) {
            this.configure();
        }
        debug('recorderProfile changed: %s', key);
        return this;
    };
    Camera.prototype.isRecorderProfile = function (key) {
        return key === this.recorderProfile;
    };
    Camera.prototype.getRecorderProfile = function () {
        var key = this.recorderProfile;
        return this.mozCamera.capabilities.recorderProfiles[key];
    };
    Camera.prototype.setThumbnailSize = function () {
        var sizes = this.mozCamera.capabilities.thumbnailSizes;
        var pictureSize = this.mozCamera.getPictureSize();
        var picked = this.pickThumbnailSize(sizes, pictureSize);
        if (picked) {
            this.mozCamera.setThumbnailSize(picked);
        }
    };
    Camera.prototype.setFlashMode = function (key) {
        if (this.mozCamera) {
            key = key || 'off';
            if (this.suspendedFlashCount > 0) {
                this.suspendedFlashMode = key;
                debug('flash mode set while suspended: %s', key);
            } else {
                this.mozCamera.flashMode = key;
                debug('flash mode set: %s', key);
            }
        }
        return this;
    };
    Camera.prototype.release = function (done) {
        debug('release');
        done = done || function () {
        };
        var self = this;
        clearTimeout(this.cameraRequestTimeout);
        if (!this.mozCamera) {
            done();
            return;
        }
        this.busy();
        this.stopRecording();
        this.set('focus', 'none');
        this.mozCamera.release().then(onSuccess, onError);
        this.releasing = true;
        this.mozCamera = null;
        delete this.pictureSize;
        delete this.recorderProfile;
        delete this.givenPreviewSize;
        function onSuccess() {
            debug('successfully released');
            self.ready();
            self.releasing = false;
            self.emit('released');
            done();
        }
        function onError(err) {
            debug('failed to release hardware');
            self.ready();
            self.releasing = false;
            done(err);
        }
    };
    Camera.prototype.pickThumbnailSize = function (thumbnailSizes, pictureSize) {
        var screenWidth = window.innerWidth * window.devicePixelRatio;
        var screenHeight = window.innerHeight * window.devicePixelRatio;
        var pictureAspectRatio = pictureSize.width / pictureSize.height;
        var currentThumbnailSize;
        var i;
        thumbnailSizes = thumbnailSizes.slice(0);
        if (!thumbnailSizes || !pictureSize) {
            return;
        }
        function imageSizeFillsScreen(pixelsWidth, pixelsHeight) {
            return (pixelsWidth >= screenWidth || pixelsHeight >= screenHeight) && (pixelsWidth >= screenHeight || pixelsHeight >= screenWidth);
        }
        thumbnailSizes = thumbnailSizes.filter(function (thumbnailSize) {
            var thumbnailAspectRatio = thumbnailSize.width / thumbnailSize.height;
            return Math.abs(thumbnailAspectRatio - pictureAspectRatio) < 0.05;
        });
        if (thumbnailSizes.length === 0) {
            console.error('Error while selecting thumbnail size. ' + 'There are no thumbnail sizes that match the ratio of ' + 'the selected picture size: ' + JSON.stringify(pictureSize));
            return;
        }
        thumbnailSizes.sort(function (a, b) {
            return a.width * a.height - b.width * b.height;
        });
        for (i = 0; i < thumbnailSizes.length; ++i) {
            currentThumbnailSize = thumbnailSizes[i];
            if (imageSizeFillsScreen(currentThumbnailSize.width, currentThumbnailSize.height)) {
                return currentThumbnailSize;
            }
        }
        return thumbnailSizes[thumbnailSizes.length - 1];
    };
    Camera.prototype.capture = function (options) {
        if (!this.mozCamera) {
            return false;
        }
        switch (this.mode) {
        case 'picture':
            this.takePicture(options);
            break;
        case 'video':
            this.toggleRecording(options);
            break;
        }
    };
    Camera.prototype.takePicture = function (options) {
        debug('take picture', options);
        this.busy();
        var rotation = this.orientation.get();
        var selectedCamera = this.selectedCamera;
        var self = this;
        var position = options && options.position;
        var config = {
            dateTime: Date.now() / 1000,
            pictureSize: self.pictureSize,
            fileFormat: 'jpeg'
        };
        if (position) {
            config.position = position;
        }
        config.rotation = selectedCamera === 'front' ? -rotation : rotation;
        if (this.focus.getMode() === 'auto') {
            this.focus.focus(onFocused);
        } else {
            takePicture();
        }
        function onFocused(state) {
            takePicture();
        }
        function takePicture() {
            self.busy('takingPicture');
            self.mozCamera.takePicture(config).then(onSuccess, onError);
        }
        function onError(error) {
            if (error.name === 'NS_ERROR_IN_PROGRESS') {
                complete();
            } else {
                document.l10n.formatValue('error-saving').then(value => {
                    alert(value);
                    complete();
                });
            }
        }
        function onSuccess(blob) {
            var image = { blob: blob };
            self.resumePreview();
            self.set('focus', 'none');
            self.emit('newimage', image);
            debug('success taking picture');
            complete();
        }
        function complete() {
            self.set('focus', 'none');
            self.ready();
        }
    };
    Camera.prototype.updateFocusArea = function (rect, done) {
        this.focus.updateFocusArea(rect, focusDone);
        function focusDone(state) {
            if (done) {
                done(state);
            }
        }
    };
    Camera.prototype.toggleRecording = function (options) {
        var state = this.get('recording');
        if (state && state !== 'stopped') {
            this.stopRecording();
        } else {
            this.startRecording(options);
        }
    };
    Camera.prototype.setStorage = function (storage) {
        this.storage.video = storage.video;
    };
    Camera.prototype.startRecording = function (options) {
        debug('start recording');
        var frontCamera = this.selectedCamera === 'front';
        var rotation = this.orientation.get();
        var storage = this.storage.video;
        var video = this.video;
        var self = this;
        if (frontCamera) {
            rotation = -rotation;
        }
        this.set('recording', 'starting');
        this.busy();
        this.orientation.stop();
        var profile = this.resolution();
        video.width = profile.width;
        video.height = profile.height;
        video.rotation = this.orientation.rationalize(this.getSensorAngle(), rotation);
        var previewSize = this.previewSize();
        video.poster.width = previewSize.width;
        video.poster.height = previewSize.height;
        video.poster.rotation = video.rotation;
        this.getFreeVideoStorageSpace(gotStorageSpace);
        function gotStorageSpace(err, freeBytes) {
            if (self.get('recording') === 'stopping') {
                debug('start recording interrupted (getFreeVideoStorageSpace)');
                return self.stoppedRecording();
            }
            if (err) {
                return self.onStartRecordingError();
            }
            var notEnoughSpace = freeBytes < self.video.minSpace;
            var remaining = freeBytes - self.video.spacePadding;
            var targetFileSize = self.get('maxFileSizeBytes');
            var maxFileSizeBytes = targetFileSize || remaining;
            if (notEnoughSpace) {
                self.onStartRecordingError('nospace2');
                return;
            }
            var config = {
                rotation: rotation,
                maxFileSizeBytes: maxFileSizeBytes,
                createPoster: true
            };
            self.createVideoFilepath(createVideoFilepathDone);
            function createVideoFilepathDone(errorMsg, filepath) {
                if (self.get('recording') === 'stopping') {
                    debug('start recording interrupted (createVideoFilepath)');
                    return self.stoppedRecording();
                }
                if (typeof filepath === 'undefined') {
                    debug(errorMsg);
                    return self.onStartRecordingError('error-video-file-path');
                }
                video.filepath = filepath;
                self.emit('willrecord');
                self.mozCamera.startRecording(config, storage, filepath).then(onSuccess, onError);
            }
        }
        function onError(err) {
            storage.delete(video.filepath);
            if (err.name === 'NS_ERROR_IN_PROGRESS') {
                debug('start recording error (in progress)');
                return;
            }
            if (err.name === 'NS_ERROR_ABORT') {
                debug('start recording error (abort)');
                return self.stoppedRecording();
            }
            self.onStartRecordingError();
        }
        function onSuccess() {
            self.ready();
            if (document.hidden) {
                self.stopRecording();
            }
        }
    };
    Camera.prototype.startedRecording = function () {
        debug('started recording');
        this.startVideoTimer();
        this.set('recording', 'started');
    };
    Camera.prototype.stopRecording = function () {
        debug('stop recording');
        var state = this.get('recording');
        if (!state || state === 'stopping' || state === 'stopped' || state === 'error') {
            debug('not recording or stop pending');
            return;
        }
        this.set('recording', 'stopping');
        this.busy();
        this.mozCamera.stopRecording();
    };
    Camera.prototype.stoppedRecording = function (recorded) {
        debug('stopped recording');
        this.stopVideoTimer();
        if (!recorded) {
            this.set('recording', 'error');
        }
        this.set('recording', 'stopped');
        this.orientation.start();
        var self = this;
        var video;
        if (recorded) {
            video = mix({}, this.video);
            video.poster = mix({}, video.poster);
            this.storage.video.get(video.filepath).then(function (blob) {
                video.blob = blob;
                self.emit('newvideo', video);
                self.ready();
            }, function () {
                if (self) {
                    self.onStopRecordingError(video);
                    self = null;
                }
            });
        }
    };
    Camera.prototype.onRecordingError = function (id) {
        if (id) {
            document.l10n.formatValue(id).then(value => {
                alert(value);
            });
        }
        this.ready();
    };
    Camera.prototype.onStartRecordingError = function (id) {
        debug('start record error');
        this.stoppedRecording();
        this.onRecordingError(id);
    };
    Camera.prototype.onStopRecordingError = function (video) {
        debug('stop record error');
        this.storage.video.delete(video.filepath);
        var elapsedTime = this.get('videoElapsed');
        if (elapsedTime < this.minRecordingTime) {
            this.ready();
        } else {
            this.onRecordingError();
        }
    };
    Camera.prototype.onShutter = function () {
        this.emit('shutter');
    };
    Camera.prototype.onClosed = function (e) {
        this.shutdown();
        this.emit('closed', e.reason);
    };
    Camera.prototype.onPreviewStateChange = function (e) {
        var state = e.newState;
        debug('preview state change: %s', state);
        if (state === this.previewState) {
            return;
        }
        this.previewState = state;
        this.emit('preview:' + state);
    };
    Camera.prototype.onRecorderStateChange = function (e) {
        var msg = e.newState;
        debug('recorder state change: %s', msg);
        if (msg === 'FileSizeLimitReached') {
            this.emit('filesizelimitreached');
        } else if (msg === 'Started') {
            this.startedRecording();
        } else if (msg === 'Stopped') {
            if (this.stopRecordError) {
                this.onStopRecordingError(this.video);
            }
            this.stoppedRecording(!this.stopRecordError);
            this.stopRecordError = false;
        } else if (msg === 'PosterFailed' || msg === 'TrackFailed' || msg === 'MediaRecorderFailed' || msg === 'MediaServerFailed') {
            this.stopRecordError = true;
            this.stopRecording();
        }
    };
    Camera.prototype.onPoster = function (e) {
        debug('poster created');
        this.video.poster.blob = e.data;
    };
    Camera.prototype.getFreeVideoStorageSpace = function (done) {
        debug('get free storage space');
        var storage = this.storage.video;
        var req = storage.freeSpace();
        req.onerror = onError;
        req.onsuccess = onSuccess;
        function onSuccess() {
            var freeBytes = req.result;
            debug('%d free space found', freeBytes);
            done(null, freeBytes);
        }
        function onError() {
            done('error');
        }
    };
    Camera.prototype.createVideoFilepath = function (done) {
        done(null, Date.now() + '_tmp.3gp');
    };
    Camera.prototype.resumePreview = function () {
        this.mozCamera.resumePreview();
        this.focus.startFaceDetection();
        this.emit('previewresumed');
    };
    Camera.prototype.setCamera = function (camera) {
        debug('set camera: %s', camera);
        if (this.selectedCamera === camera) {
            return;
        }
        this.selectedCamera = camera;
        this.load();
    };
    Camera.prototype.setMode = function (mode) {
        debug('setting mode to: %s', mode);
        if (this.isMode(mode)) {
            return;
        }
        this.mode = mode;
        this.configure();
        return this;
    };
    Camera.prototype.isMode = function (mode) {
        return this.mode === mode;
    };
    Camera.prototype.startVideoTimer = function () {
        this.set('videoStart', new Date().getTime());
        this.videoTimer = setInterval(this.updateVideoElapsed, 1000);
        this.updateVideoElapsed();
    };
    Camera.prototype.stopVideoTimer = function () {
        clearInterval(this.videoTimer);
        this.videoTimer = null;
        this.updateVideoElapsed();
    };
    Camera.prototype.updateVideoElapsed = function () {
        var now = new Date().getTime();
        var start = this.get('videoStart');
        this.set('videoElapsed', now - start);
    };
    Camera.prototype.setISOMode = function (value) {
        var isoModes = this.mozCamera.capabilities.isoModes;
        if (isoModes && isoModes.indexOf(value) > -1) {
            this.mozCamera.isoMode = value;
        }
    };
    Camera.prototype.setWhiteBalance = function (value) {
        var capabilities = this.mozCamera.capabilities;
        var modes = capabilities.whiteBalanceModes;
        if (modes && modes.indexOf(value) > -1) {
            this.mozCamera.whiteBalanceMode = value;
        }
    };
    Camera.prototype.setHDR = function (value) {
        debug('set hdr: %s', value);
        if (!value) {
            return;
        }
        var scene = value === 'on' ? 'hdr' : 'auto';
        this.setSceneMode(scene);
    };
    Camera.prototype.setSceneMode = function (value) {
        var modes = this.mozCamera.capabilities.sceneModes;
        if (modes.indexOf(value) > -1) {
            this.mozCamera.sceneMode = value;
        }
    };
    Camera.prototype.isZoomSupported = function () {
        if (!this.mozCamera) {
            return false;
        }
        return this.mozCamera.capabilities.zoomRatios.length > 1;
    };
    Camera.prototype.configureZoom = function () {
        var previewSize = this.previewSize();
        var maxPreviewSize = CameraUtils.getMaximumPreviewSize(this.previewSizes());
        var maxHardwareZoom = maxPreviewSize.width / previewSize.width;
        this.set('maxHardwareZoom', maxHardwareZoom);
        this.setZoom(this.getMinimumZoom());
        this.emit('zoomconfigured', this.getZoom());
        return this;
    };
    Camera.prototype.getMinimumZoom = function () {
        var zoomRatios = this.mozCamera.capabilities.zoomRatios;
        if (zoomRatios.length === 0) {
            return 1;
        }
        return zoomRatios[0];
    };
    Camera.prototype.getMaximumZoom = function () {
        var zoomRatios = this.mozCamera.capabilities.zoomRatios;
        if (zoomRatios.length === 0) {
            return 1;
        }
        return zoomRatios[zoomRatios.length - 1];
    };
    Camera.prototype.getZoom = function () {
        return this.mozCamera.zoom;
    };
    Camera.prototype.setZoom = function (zoom) {
        this.zoom = zoom;
        this.emit('zoomchanged', this.zoom);
        if (this.zoomChangeTimeout) {
            return;
        }
        var self = this;
        this.zoomChangeTimeout = window.setTimeout(function () {
            self.zoomChangeTimeout = null;
            self.mozCamera.zoom = self.zoom;
        }, 150);
    };
    Camera.prototype.getZoomPreviewAdjustment = function () {
        var zoom = this.mozCamera.zoom;
        var maxHardwareZoom = this.get('maxHardwareZoom');
        if (zoom <= maxHardwareZoom) {
            return 1;
        }
        return zoom / maxHardwareZoom;
    };
    Camera.prototype.getSensorAngle = function () {
        return this.mozCamera && this.mozCamera.sensorAngle;
    };
    Camera.prototype.busy = function (type) {
        debug('busy %s', type || '');
        this.isBusy = true;
        this.emit('busy', type);
        clearTimeout(this.readyTimeout);
    };
    Camera.prototype.ready = function () {
        var self = this;
        this.isBusy = false;
        clearTimeout(this.readyTimeout);
        this.readyTimeout = setTimeout(function () {
            debug('ready');
            self.emit('ready');
        }, 150);
    };
});
(function (exports) {
    'use strict';
    const stopRecordingKey = 'private.broadcast.stop_recording';
    const attentionScreenKey = 'private.broadcast.attention_screen_opening';
    function start() {
        if (!document.hidden) {
            listen();
        }
        window.addEventListener('visibilitychange', visibilityChangeHandler);
    }
    function stop() {
        window.removeEventListener('visibilitychange', visibilityChangeHandler);
        unlisten();
    }
    function visibilityChangeHandler() {
        if (document.hidden) {
            unlisten();
        } else {
            listen();
        }
    }
    function listen() {
        navigator.mozSettings.addObserver(stopRecordingKey, stopRecordingObserver);
        navigator.mozSettings.addObserver(attentionScreenKey, stopRecordingObserver);
    }
    function unlisten() {
        navigator.mozSettings.removeObserver(stopRecordingKey, stopRecordingObserver);
        navigator.mozSettings.removeObserver(attentionScreenKey, stopRecordingObserver);
    }
    function stopRecordingObserver(event) {
        if (event.settingValue) {
            window.dispatchEvent(new CustomEvent('stoprecording'));
        }
    }
    exports.StopRecordingEvent = {
        start: start,
        stop: stop
    };
}(window));
define('stop-recording-event', function (global) {
    return function () {
        var ret, fn;
        return ret || global.StopRecordingEvent;
    };
}(this));
(function (define) {
    define('view', [
        'require',
        'exports',
        'module',
        'evt'
    ], function (require, exports, module) {
        'use strict';
        var events = require('evt');
        var counter = 1;
        var noop = function () {
        };
        module.exports = View;
        function View(options) {
            options = options || {};
            this.el = options.el || this.el || document.createElement(this.tag);
            this.el.id = this.el.id || 'view' + counter++;
            this.name = options.name || this.name;
            this.els = {};
            if (!this.el.className) {
                if (this.name)
                    this.el.className = this.name;
                if (this.className)
                    this.el.className += ' ' + this.className;
            }
            bindAll(this);
            this.initialize.apply(this, arguments);
        }
        events(View.prototype);
        View.prototype.fire = View.prototype.fire || View.prototype.emit;
        View.prototype.tag = 'div';
        View.prototype.name = 'noname';
        View.prototype.appendTo = function (parent) {
            if (!parent)
                return this;
            parent.appendChild(this.el);
            this.fire('inserted');
            return this;
        };
        View.prototype.prependTo = function (parent) {
            if (!parent)
                return this;
            var first = parent.firstChild;
            if (first)
                parent.insertBefore(this.el, first);
            else
                this.appendTo(parent);
            this.fire('inserted');
            return this;
        };
        View.prototype.find = function (query) {
            return this.el.querySelector(query);
        };
        View.prototype.remove = function (options) {
            var silent = options && options.silent;
            var parent = this.el.parentNode;
            if (!parent)
                return this;
            parent.removeChild(this.el);
            if (!silent)
                this.fire('remove');
            return this;
        };
        View.prototype.set = function (key, value) {
            value = value === undefined ? '' : value;
            this.el.setAttribute(toDashed(key), value);
        };
        View.prototype.get = function (key) {
            return this.el.getAttribute(key);
        };
        View.prototype.setter = function (key, forced) {
            var self = this;
            return function (passed) {
                var value = forced !== undefined ? forced : passed;
                self.set(key, value);
            };
        };
        View.prototype.enable = function (key, value) {
            switch (arguments.length) {
            case 0:
                value = true;
                key = 'enabled';
                break;
            case 1:
                if (typeof key === 'boolean') {
                    value = key;
                    key = 'enabled';
                } else {
                    value = true;
                    key = key ? key + '-enabled' : 'enabled';
                }
                break;
            default:
                key = key ? key + '-enabled' : 'enabled';
            }
            this.set(key, !!value);
        };
        View.prototype.disable = function (key) {
            this.enable(key, false);
        };
        View.prototype.enabler = function (key) {
            return function (value) {
                this.enable(key, value);
            }.bind(this);
        };
        View.prototype.hide = function (key) {
            this.toggle(key, false);
        };
        View.prototype.show = function (key) {
            this.toggle(key, true);
        };
        View.prototype.toggle = function (key, value) {
            if (arguments.length === 1 && typeof key === 'boolean') {
                value = key;
                key = '';
            } else {
                key = key ? key + '-' : '';
            }
            this.el.classList.toggle(key + 'hidden', !value);
            this.el.classList.toggle(key + 'visible', value);
        };
        View.prototype.destroy = function (options) {
            var noRemove = options && options.noRemove;
            if (!noRemove)
                this.remove();
            this.fire('destroy');
            this.el = null;
        };
        View.prototype.toString = function () {
            return '[object View]';
        };
        View.prototype.initialize = noop;
        View.prototype.template = function () {
            return '';
        };
        View.extend = function (props) {
            var Parent = this;
            var Child = function () {
                Parent.apply(this, arguments);
            };
            Child.prototype = Object.create(Parent.prototype);
            Child.extend = View.extend;
            mixin(Child.prototype, props);
            return Child;
        };
        function toDashed(s) {
            return s.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        }
        function mixin(a, b) {
            for (var key in b) {
                a[key] = b[key];
            }
            return a;
        }
        function bindAll(object) {
            var key;
            var fn;
            for (key in object) {
                fn = object[key];
                if (typeof fn === 'function') {
                    object[key] = fn.bind(object);
                }
            }
        }
    });
}(function (n, w) {
    return typeof define == 'function' && define.amd ? define : typeof module == 'object' ? function (c) {
        c(require, exports, module);
    } : function (c) {
        var m = { exports: {} }, r = function (n) {
                return w[n];
            };
        w[n] = c(r, m.exports, m) || m.exports;
    };
}('view', this)));
define('views/notification', [
    'require',
    'exports',
    'module',
    'lib/mixin',
    'view'
], function (require, exports, module) {
    var mix = require('lib/mixin');
    var View = require('view');
    module.exports = View.extend({
        name: 'notification',
        tag: 'ul',
        time: 3000,
        initialize: function () {
            this.counter = 0;
            this.hash = {};
            this.el.setAttribute('role', 'presentation');
        },
        display: function (options) {
            var item = mix({}, options);
            var id = ++this.counter;
            var self = this;
            item.el = document.createElement('li');
            item.el.className = options.className || '';
            var span = document.createElement('span');
            if (typeof options.text === 'string') {
                span.setAttribute('data-l10n-id', options.text);
            } else {
                if (options.text.html) {
                    span.innerHTML = options.text.html;
                }
            }
            item.el.appendChild(span);
            if (options.attrs) {
                this.setAttributes(item.el, options.attrs);
            }
            item.el.setAttribute('role', 'status');
            item.el.setAttribute('aria-live', 'assertive');
            this.el.appendChild(item.el);
            this.clear(this.temporary);
            if (!item.persistent) {
                this.temporary = id;
                this.hide(this.persistent);
                item.clearTimeout = setTimeout(function () {
                    self.clear(id);
                }, this.time);
            }
            if (item.persistent) {
                this.clear(this.persistent);
                this.persistent = id;
            }
            this.hash[id] = item;
            return id;
        },
        setAttributes: function (el, attrs) {
            for (var key in attrs) {
                el.setAttribute(key, attrs[key]);
            }
        },
        clear: function (id) {
            var item = this.hash[id];
            if (!item || item.cleared) {
                return;
            }
            this.el.removeChild(item.el);
            clearTimeout(item.clearTimeout);
            item.cleared = true;
            if (item === this.temporary) {
                this.temporary = null;
            }
            if (item === this.persistent) {
                this.persistent = null;
            }
            delete this.hash[id];
            this.show(this.persistent);
        },
        hide: function (id) {
            var item = this.hash[id];
            if (!item) {
                return;
            }
            item.el.classList.add('hidden');
        },
        show: function (id) {
            var item = this.hash[id];
            if (!item) {
                return;
            }
            item.el.classList.remove('hidden');
        }
    });
});
define('views/loading-screen', [
    'require',
    'exports',
    'module',
    'debug',
    'view'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('view:loading-screen');
    var View = require('view');
    module.exports = View.extend({
        name: 'loading-screen',
        fadeTime: 300,
        initialize: function () {
            this.render();
        },
        render: function () {
            this.el.innerHTML = this.template;
            delete this.template;
            debug('rendered');
            return this;
        },
        show: function (done) {
            this.reflow = this.el.offsetTop;
            View.prototype.show.call(this);
        },
        hide: function (done) {
            View.prototype.hide.call(this);
            if (done) {
                setTimeout(done, this.fadeTime);
            }
        },
        template: '<progress></progress>'
    });
});
define('lib/bind', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    exports = module.exports = bind;
    function bind(el, name, fn, capture) {
        el.addEventListener(name, fn, capture || false);
    }
    exports.unbind = function (el, name, fn, capture) {
        el.removeEventListener(name, fn, capture || false);
    };
});
define('lib/pinch', [
    'require',
    'exports',
    'module',
    'lib/bind',
    'lib/bind-all',
    'lib/bind',
    'evt'
], function (require, exports, module) {
    'use strict';
    var unbind = require('lib/bind').unbind;
    var bindAll = require('lib/bind-all');
    var bind = require('lib/bind');
    var events = require('evt');
    events(Pinch.prototype);
    module.exports = Pinch;
    function Pinch(el) {
        bindAll(this);
        this.attach(el);
    }
    Pinch.prototype.attach = function (el) {
        this.el = el;
        bind(this.el, 'touchstart', this.onTouchStart);
        bind(window, 'touchmove', this.onTouchMove);
        bind(window, 'touchend', this.onTouchEnd);
    };
    Pinch.prototype.detach = function () {
        unbind(this.el, 'touchstart', this.onTouchStart);
        unbind(window, 'touchmove', this.onTouchMove);
        unbind(window, 'touchend', this.onTouchEnd);
        this.el = null;
    };
    Pinch.prototype.enable = function () {
        this.disabled = false;
    };
    Pinch.prototype.disable = function () {
        this.disabled = true;
    };
    Pinch.prototype.onTouchStart = function (evt) {
        if (evt.touches.length !== 2 || this.disabled) {
            return;
        }
        this.lastTouchA = evt.touches[0];
        this.lastTouchB = evt.touches[1];
        this.isPinching = true;
        this.emit('started');
    };
    Pinch.prototype.onTouchMove = function (evt) {
        if (!this.isPinching || this.disabled) {
            return;
        }
        var touchA = getNewTouchA(this, evt.touches);
        var touchB = getNewTouchB(this, evt.touches);
        var deltaPinch = getDeltaPinch(this, touchA, touchB);
        this.emit('changed', deltaPinch);
        this.lastTouchA = touchA;
        this.lastTouchB = touchB;
    };
    Pinch.prototype.onTouchEnd = function (evt) {
        if (!this.isPinching || this.disabled) {
            return;
        }
        if (evt.touches.length < 2) {
            this.isPinching = false;
            this.emit('ended');
        }
    };
    function getNewTouchA(pinch, touches) {
        if (!pinch.lastTouchA) {
            return null;
        }
        for (var i = 0, length = touches.length, touch; i < length; i++) {
            touch = touches[i];
            if (touch.identifier === pinch.lastTouchA.identifier) {
                return touch;
            }
        }
        return null;
    }
    function getNewTouchB(pinch, touches) {
        if (!pinch.lastTouchB) {
            return null;
        }
        for (var i = 0, length = touches.length, touch; i < length; i++) {
            touch = touches[i];
            if (touch.identifier === pinch.lastTouchB.identifier) {
                return touch;
            }
        }
        return null;
    }
    function getDeltaPinch(pinch, touchA, touchB) {
        var lastTouchA = pinch.lastTouchA;
        var lastTouchB = pinch.lastTouchB;
        if (!touchA || !lastTouchA || !touchB || !lastTouchB) {
            return 0;
        }
        var oldDistance = Math.sqrt(Math.pow(lastTouchB.pageX - lastTouchA.pageX, 2) + Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
        var newDistance = Math.sqrt(Math.pow(touchB.pageX - touchA.pageX, 2) + Math.pow(touchB.pageY - touchA.pageY, 2));
        return newDistance - oldDistance;
    }
});
define('app', [
    'require',
    'exports',
    'module',
    'stop-recording-event',
    'views/notification',
    'views/loading-screen',
    'lib/orientation',
    'lib/bind-all',
    'debug',
    'lib/pinch',
    'lib/bind',
    'model'
], function (require, exports, module) {
    'use strict';
    var stopRecordingEvent = require('stop-recording-event');
    var NotificationView = require('views/notification');
    var LoadingView = require('views/loading-screen');
    var orientation = require('lib/orientation');
    var bindAll = require('lib/bind-all');
    var debug = require('debug')('app');
    var Pinch = require('lib/pinch');
    var bind = require('lib/bind');
    var model = require('model');
    module.exports = App;
    model(App.prototype);
    function App(options) {
        debug('initialize');
        bindAll(this);
        this.views = {};
        this.dynamicLazy = {};
        this.el = options.el;
        this.win = options.win;
        this.doc = options.doc;
        this.perf = options.perf || {};
        this.pinch = options.pinch || new Pinch(this.el);
        this.require = options.require || window.requirejs;
        this.LoadingView = options.LoadingView || LoadingView;
        this.orientation = options.orientation || orientation;
        this.inSecureMode = this.win.location.hash === '#secure';
        this.controllers = options.controllers;
        this.geolocation = options.geolocation;
        this.settings = options.settings;
        this.camera = options.camera;
        this.activity = {};
        this.sounds = options.sounds;
        debug('initialized');
    }
    App.prototype.boot = function () {
        debug('boot');
        if (this.booted) {
            return;
        }
        this.showSpinner('requestingCamera');
        this.bindEvents();
        this.initializeViews();
        this.runControllers();
        window.performance.mark('navigationLoaded');
        window.performance.mark('navigationInteractive');
        this.injectViews();
        this.booted = true;
        debug('booted');
    };
    App.prototype.dispatchEvent = function (name) {
        this.win.dispatchEvent(new CustomEvent(name));
    };
    App.prototype.runControllers = function () {
        debug('run controllers');
        this.controllers.overlay(this);
        this.controllers.battery(this);
        this.controllers.settings(this);
        this.controllers.activity(this);
        this.controllers.camera(this);
        this.controllers.viewfinder(this);
        this.controllers.hud(this);
        this.controllers.controls(this);
        this.controllers.storage(this);
        debug('controllers run');
    };
    App.prototype.loadLazyController = function (controller) {
        if (!this.criticalPathDone) {
            this.controllers.lazy.push(controller);
            return;
        }
        if (!this.dynamicLazy[controller]) {
            this.dynamicLazy[controller] = this.loadLazyControllers([controller]);
        }
        return this.dynamicLazy[controller];
    };
    App.prototype.loadLazyControllers = function (controllers) {
        debug('load lazy controllers');
        var self = this;
        return new Promise(function (resolve, reject) {
            self.require(controllers, function () {
                [].forEach.call(arguments, function (controller) {
                    controller(self);
                });
                debug('controllers loaded');
                self.emit('lazyloaded');
                resolve();
            });
        });
    };
    App.prototype.initializeViews = function () {
        debug('initializing views');
        this.views.notification = new NotificationView();
        debug('views initialized');
    };
    App.prototype.injectViews = function () {
        debug('injecting views');
        this.views.notification.appendTo(this.el);
        debug('views injected');
    };
    App.prototype.bindEvents = function () {
        debug('binding events');
        this.once('storage:checked:healthy', this.geolocationWatch);
        this.once('viewfinder:visible', this.onCriticalPathDone);
        this.once('camera:error', this.onCriticalPathDone);
        this.once('activity', this.onActivity);
        this.once('newthumbnail', this.onNewThumbnail);
        this.once('preview', this.onPreview);
        this.once('camera:willchange', this.onWillChange);
        this.on('camera:willchange', this.firer('busy'));
        this.on('ready', this.clearSpinner);
        this.on('visible', this.onVisible);
        this.on('hidden', this.onHidden);
        this.on('reboot', this.onReboot);
        this.on('busy', this.onBusy);
        if (this.settings.countdown.selected('key') !== 'off') {
            this.onCountdown();
        } else {
            this.settings.countdown.once('change:selected', this.onCountdown);
        }
        this.pinch.on('changed', this.firer('pinch:changed'));
        this.on('previewgallery:opened', this.pinch.disable);
        this.on('previewgallery:closed', this.pinch.enable);
        this.on('settings:opened', this.pinch.disable);
        this.on('settings:closed', this.pinch.enable);
        bind(this.doc, 'visibilitychange', this.onVisibilityChange);
        bind(this.doc, 'DOMRetranslated', this.firer('localized'));
        bind(this.win, 'beforeunload', this.onBeforeUnload);
        bind(this.win, 'keydown', this.onKeyDown);
        bind(this.el, 'click', this.onClick);
        debug('events bound');
    };
    App.prototype.onVisible = function () {
        this.geolocationWatch();
        this.orientation.start();
        this.orientation.lock();
        debug('visible');
    };
    App.prototype.onHidden = function () {
        this.geolocation.stopWatching();
        this.orientation.stop();
        debug('hidden');
    };
    App.prototype.onReboot = function () {
        debug('reboot');
        window.location.reload();
    };
    App.prototype.onClick = function () {
        debug('click');
        this.emit('click');
    };
    App.prototype.onCriticalPathDone = function () {
        if (this.criticalPathDone) {
            return;
        }
        debug('critical path done');
        window.performance.mark('visuallyLoaded');
        this.listenForStopRecordingEvent();
        this.loadLazyModules();
        this.perf.criticalPath = Date.now();
        this.criticalPathDone = true;
        this.emit('criticalpathdone');
    };
    App.prototype.onActivity = function () {
        this.loadLazyController('controllers/confirm');
    };
    App.prototype.onCountdown = function () {
        this.loadLazyController('controllers/countdown');
    };
    App.prototype.onNewThumbnail = function () {
        this.loadLazyController('controllers/preview-gallery');
    };
    App.prototype.onPreview = function () {
        var self = this;
        this.emit('busy', 'lazyLoading');
        this.loadLazyController('controllers/preview-gallery').then(function () {
            self.emit('preview');
            self.emit('ready');
        });
    };
    App.prototype.onWillChange = function () {
        this.loadLazyController('controllers/recording-timer');
    };
    App.prototype.loadLazyModules = function () {
        debug('load lazy modules');
        var self = this;
        var load = this.loadLazyControllers(this.controllers.lazy);
        var storage = new Promise(function (resolve, reject) {
            self.once('storage:checked', resolve);
        });
        Promise.all([
            load,
            storage
        ]).then(function () {
            debug('app fully loaded');
            window.performance.mark('contentInteractive');
            self.loaded = true;
            self.emit('loaded');
            self.perf.loaded = Date.now();
            self.logPerf();
            window.performance.mark('fullyLoaded');
        });
    };
    App.prototype.logPerf = function () {
        var timing = window.performance.timing;
        console.log('first module: %s', this.perf.firstModule - this.perf.jsStarted + 'ms');
        console.log('critical-path: %s', this.perf.criticalPath - timing.domLoading + 'ms');
        console.log('app-fully-loaded: %s', this.perf.loaded - timing.domLoading + 'ms');
    };
    App.prototype.geolocationWatch = function () {
        var shouldWatch = !this.activity.pick && !this.hidden;
        if (shouldWatch) {
            this.geolocation.watch();
        }
    };
    App.prototype.onVisibilityChange = function () {
        this.hidden = this.doc.hidden;
        this.emit(this.hidden ? 'hidden' : 'visible');
    };
    App.prototype.onBeforeUnload = function () {
        this.emit('beforeunload');
        debug('beforeunload');
    };
    App.prototype.showSpinner = function (key) {
        debug('show loading type: %s', key);
        this.busy = true;
        var view = this.views.loading;
        if (view) {
            return;
        }
        var ms = this.settings.spinnerTimeouts.get(key) || 0;
        var self = this;
        clearTimeout(this.spinnerTimeout);
        this.spinnerTimeout = setTimeout(function () {
            self.views.loading = new self.LoadingView();
            self.views.loading.appendTo(self.el).show();
            debug('loading shown');
        }, ms);
    };
    App.prototype.clearSpinner = function () {
        debug('clear loading');
        this.busy = false;
        var view = this.views.loading;
        clearTimeout(this.spinnerTimeout);
        if (!view) {
            return;
        }
        view.hide(view.destroy);
        this.views.loading = null;
    };
    App.prototype.onBusy = function (type) {
        debug('camera busy, type: %s', type);
        this.busy = true;
        var delay = this.settings.spinnerTimeouts.get(type);
        if (delay) {
            this.showSpinner(type);
        }
    };
    App.prototype.listenForStopRecordingEvent = function () {
        debug('listen for stop recording events');
        stopRecordingEvent.start();
        addEventListener('stoprecording', this.firer('stoprecording'));
    };
    App.prototype.onKeyDown = function (e) {
        var key = e.key.toLowerCase();
        var type = this.settings.keyDownEvents.get(key);
        if (type) {
            this.emit('keydown:' + type, e);
        }
    };
});
define('controllers/overlay', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:overlay');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new OverlayController(app);
    };
    module.exports.OverlayController = OverlayController;
    function OverlayController(app) {
        bindAll(this);
        this.overlays = {};
        this.app = app;
        this.require = app.require;
        this.activity = app.activity;
        this.bindEvents();
        debug('initialized');
    }
    OverlayController.prototype.bindEvents = function () {
        this.app.on('storage:changed', this.onStorageChanged);
        this.app.on('change:batteryStatus', this.onBatteryChanged);
        this.app.on('camera:requesting', this.onCameraRequesting);
        this.app.on('camera:error', this.onCameraError);
    };
    OverlayController.prototype.onStorageChanged = function (state) {
        this.updateOverlay('storage', state !== 'available', state);
    };
    OverlayController.prototype.onBatteryChanged = function (state) {
        this.updateOverlay('battery', state === 'shutdown', state);
    };
    OverlayController.prototype.onCameraRequesting = function () {
        this.updateOverlay('cameraError', false);
    };
    OverlayController.prototype.onCameraError = function (type) {
        this.updateOverlay('cameraError', true, type);
    };
    OverlayController.prototype.updateOverlay = function (type, enabled, reason) {
        debug('\'%s/%s\' overlay %s', type, reason, enabled);
        var overlay = this.overlays[type];
        if (!overlay) {
            overlay = this.overlays[type] = { id: 0 };
        }
        if (overlay.view) {
            overlay.view.destroy();
            delete overlay.view;
        }
        var id = ++overlay.id;
        if (!enabled) {
            return;
        }
        var self = this;
        this.require(['views/overlay'], function (OverlayView) {
            if (id !== overlay.id) {
                return;
            }
            var closable = self.activity.pick && type !== 'request-fail';
            var view = new OverlayView({
                type: reason,
                closable: closable
            });
            if (!view.rendered()) {
                return;
            }
            overlay.view = view.appendTo(document.body).on('click:close-btn', function () {
                self.app.emit('activitycanceled');
            });
            debug('inserted \'%s/%s\' overlay', type, reason);
        });
    };
});
define('controllers/battery', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all',
    'lib/bind'
], function (require, exports, module) {
    var debug = require('debug')('controller:battery');
    var bindAll = require('lib/bind-all');
    var bind = require('lib/bind');
    module.exports = function (app) {
        return new BatteryController(app);
    };
    module.exports.BatteryController = BatteryController;
    function BatteryController(app) {
        bindAll(this);
        this.app = app;
        this.battery = app.battery || navigator.battery || navigator.mozBattery;
        this.levels = app.settings.battery.get('levels');
        this.notification = app.views.notification;
        this.bindEvents();
        this.updateStatus();
        debug('initialized');
    }
    BatteryController.prototype.bindEvents = function () {
        bind(this.battery, 'levelchange', this.updateStatus);
        bind(this.battery, 'chargingchange', this.updateStatus);
        this.app.on('change:batteryStatus', this.onStatusChange);
        this.app.on('change:recording', this.updatePowerSave);
        var mozSettings = navigator.mozSettings;
        mozSettings.addObserver('powersave.enabled', this.onPowerSaveChange);
        mozSettings.createLock().get('powersave.enabled').then(this.onPowerSaveChange);
    };
    BatteryController.prototype.onPowerSaveChange = function (values) {
        var value;
        if (values.settingValue !== undefined) {
            value = values.settingValue;
        } else {
            value = values['powersave.enabled'];
        }
        this.powerSaveEnabled = value;
        this.updatePowerSave();
    };
    BatteryController.prototype.updatePowerSave = function () {
        var state = this.powerSaveEnabled && !this.app.get('recording');
        if (this.powerSave === state) {
            return;
        }
        this.powerSave = state;
        debug('power save: ' + state);
        this.app.emit('battery:powersave', state);
    };
    BatteryController.prototype.notifications = {
        low: {
            text: 'battery-low-text',
            attrs: {
                'data-icon': 'battery-3',
                'data-l10n-id': 'battery-low-indicator'
            }
        },
        verylow: {
            text: 'battery-verylow-text',
            attrs: {
                'data-icon': 'battery-1',
                'data-l10n-id': 'battery-verylow-indicator'
            }
        },
        critical: {
            text: 'battery-critical-text',
            attrs: {
                'data-icon': 'battery-1',
                'data-l10n-id': 'battery-critical-indicator'
            },
            persistent: true
        }
    };
    BatteryController.prototype.updateStatus = function () {
        var previous = this.app.get('batteryStatus');
        var current = this.getStatus(this.battery);
        if (current !== previous) {
            this.app.set('batteryStatus', current);
        }
    };
    BatteryController.prototype.getStatus = function (battery) {
        var level = Math.round(battery.level * 100);
        var levels = this.levels;
        if (battery.charging) {
            return 'charging';
        } else if (level <= levels.shutdown) {
            return 'shutdown';
        } else if (level <= levels.critical) {
            return 'critical';
        } else if (level <= levels.verylow) {
            return 'verylow';
        } else if (level <= levels.low) {
            return 'low';
        } else {
            return 'healthy';
        }
    };
    BatteryController.prototype.onStatusChange = function (status) {
        this.clearLastNotification();
        this.displayNotification(status);
    };
    BatteryController.prototype.displayNotification = function (status) {
        var notification = this.notifications[status];
        if (!notification) {
            return;
        }
        this.lastNotification = this.notification.display({
            text: notification.text,
            className: notification.className,
            attrs: notification.attrs,
            persistent: notification.persistent
        });
    };
    BatteryController.prototype.clearLastNotification = function () {
        this.notification.clear(this.lastNotification);
    };
});
define('views/hud', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind',
    'view'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('view:hud');
    var bind = require('lib/bind');
    var View = require('view');
    module.exports = View.extend({
        name: 'hud',
        initialize: function () {
            this.render();
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.els.flash = this.find('.js-flash');
            this.els.camera = this.find('.js-camera');
            this.els.settings = this.find('.js-settings');
            delete this.template;
            debug('rendered');
            return this.bindEvents();
        },
        bindEvents: function () {
            bind(this.els.flash, 'click', this.onFlashClick);
            bind(this.els.camera, 'click', this.onCameraClick);
            bind(this.els.settings, 'click', this.onSettingsClick, true);
            return this;
        },
        _setLabel: function (element, mode) {
            if (mode) {
                this.els[element].setAttribute('data-l10n-id', mode.title + '-button');
            } else {
                this.els[element].removeAttribute('data-l10n-id');
                this.els[element].removeAttribute('aria-label');
            }
        },
        setFlashModeLabel: function (mode) {
            this._setLabel('flash', mode);
        },
        setFlashMode: function (mode) {
            if (!mode) {
                return;
            }
            this.els.flash.dataset.icon = mode.icon;
            this.setFlashModeLabel(mode);
        },
        setCameraLabel: function (camera) {
            this._setLabel('camera', camera);
        },
        setCamera: function (camera) {
            if (!camera) {
                return;
            }
            this.els.camera.dataset.icon = camera.icon;
            this.setCameraLabel(camera);
        },
        setMenuLabel: function () {
            this._setLabel('settings', { title: 'menu' });
        },
        onFlashClick: function (event) {
            event.stopPropagation();
            this.emit('click:flash');
        },
        onCameraClick: function (event) {
            event.stopPropagation();
            this.emit('click:camera');
        },
        onSettingsClick: function (event) {
            event.stopPropagation();
            this.emit('click:settings');
        },
        template: function () {
            return '<div role="button" class="hud_btn hud_camera rotates ' + 'test-camera-toggle js-camera"></div>' + '<div role="button" class="hud_btn hud_flash rotates test-flash-button ' + 'js-flash"></div>' + '<div role="button" class="hud_btn hud_settings rotates ' + 'test-settings-toggle js-settings" data-icon="menu" ' + 'data-l10n-id="menu-button"></div>';
        }
    });
});
define('controllers/hud', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/debounce',
    'lib/bind-all',
    'views/hud'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:hud');
    var debounce = require('lib/debounce');
    var bindAll = require('lib/bind-all');
    var HudView = require('views/hud');
    module.exports = function (app) {
        return new HudController(app);
    };
    module.exports.HudController = HudController;
    function HudController(app) {
        bindAll(this);
        this.app = app;
        this.settings = app.settings;
        this.notification = app.views.notification;
        this.createView();
        this.bindEvents();
        debug('initialized');
    }
    HudController.prototype.createView = function () {
        var hasDualCamera = this.settings.cameras.get('options').length > 1;
        this.view = this.app.views.hud || new HudView();
        this.view.enable('camera', hasDualCamera);
        this.view.disable('flash');
        this.view.hide();
        this.updateCamera();
        this.view.appendTo(this.app.el);
    };
    HudController.prototype.bindEvents = function () {
        this.app.on('change:recording', this.view.setter('recording'));
        this.app.on('ready', this.view.setter('camera', 'ready'));
        this.app.on('busy', this.view.setter('camera', 'busy'));
        this.app.on('localized', this.localize);
        this.app.once('settings:configured', this.view.show);
        this.app.on('settings:configured', this.updateFlashSupport);
        this.app.settings.flashModes.on('change:selected', this.updateFlashMode);
        this.app.settings.mode.on('change:selected', this.updateFlashMode);
        this.app.settings.cameras.on('change:selected', this.updateCamera);
        this.view.on('click:camera', debounce(this.onCameraClick, 500, true));
        this.view.on('click:settings', this.app.firer('settings:toggle'));
        this.view.on('click:flash', this.onFlashClick);
        this.app.on('countdown:started', this.view.setter('countdown', 'active'));
        this.app.on('countdown:ended', this.view.setter('countdown', 'inactive'));
        this.app.on('settings:opened', this.view.hide);
        this.app.on('settings:closed', this.view.show);
        this.app.on('previewgallery:opened', this.view.hide);
        this.app.on('previewgallery:closed', this.view.show);
    };
    HudController.prototype.onCameraClick = function () {
        debug('camera clicked');
        this.clearNotifications();
        this.app.settings.cameras.next();
    };
    HudController.prototype.clearNotifications = function () {
        this.notification.clear(this.flashNotification);
    };
    HudController.prototype.onFlashClick = function () {
        var setting = this.settings.flashModes;
        var ishdrOn = this.settings.hdr.selected('key') === 'on';
        setting.next();
        this.view.set('flashMode', setting.selected('key'));
        this.notify(setting, ishdrOn);
    };
    HudController.prototype.notify = function (setting, hdrDeactivated) {
        var optionTitle = '<span data-l10n-id="' + setting.selected('title') + '"></span>';
        var title = '<span data-l10n-id="' + setting.get('title') + '"></span>';
        var html;
        if (hdrDeactivated) {
            html = title + ' ' + optionTitle + '<br/>' + '<span data-l10n-id="hdr-deactivated"></span>';
        } else {
            html = title + '<br/>' + optionTitle;
        }
        this.flashNotification = this.notification.display({ text: { html: html } });
    };
    HudController.prototype.localize = function () {
        this.view.setFlashModeLabel(this.settings.flashModes.selected());
        this.view.setCameraLabel(this.settings.cameras.selected());
        this.view.setMenuLabel();
    };
    HudController.prototype.updateFlashMode = function () {
        var selected = this.settings.flashModes.selected();
        if (!selected) {
            return;
        }
        this.view.setFlashMode(selected);
        debug('updated flash mode: %s', selected.key);
    };
    HudController.prototype.updateFlashSupport = function () {
        var supported = this.settings.flashModes.supported();
        this.view.enable('flash', supported);
        this.updateFlashMode();
        debug('flash supported: %s', supported);
    };
    HudController.prototype.updateCamera = function () {
        var selected = this.settings.cameras.selected();
        if (!selected) {
            return;
        }
        this.view.setCamera(selected);
        debug('updated camera: %s', selected.key);
    };
});
(function (define) {
    'use strict';
    define('drag', [
        'require',
        'exports',
        'module',
        'evt'
    ], function (require, exports, module) {
        var events = require('evt');
        module.exports = Drag;
        events(Drag.prototype);
        var pointer = [
            {
                down: 'touchstart',
                up: 'touchend',
                move: 'touchmove'
            },
            {
                down: 'mousedown',
                up: 'mouseup',
                move: 'mousemove'
            }
        ]['ontouchstart' in window ? 0 : 1];
        function Drag(options) {
            this.container = { el: options.container };
            this.handle = { el: options.handle };
            this.onTouchStart = this.onTouchStart.bind(this);
            this.onTouchMove = this.onTouchMove.bind(this);
            this.onTouchEnd = this.onTouchEnd.bind(this);
            this.slideDuration = options.slideDuration || 140;
            this.tapTime = options.tapTime || 180;
            this.bindEvents();
        }
        Drag.prototype.bindEvents = function () {
            this.container.el.addEventListener(pointer.down, this.onTouchStart);
        };
        Drag.prototype.onTouchStart = function (e) {
            this.updateDimensions();
            this.touch = ~e.type.indexOf('mouse') ? e : e.touches[0];
            this.firstTouch = this.touch;
            this.startTime = e.timeStamp;
            addEventListener(pointer.move, this.onTouchMove);
            addEventListener(pointer.up, this.onTouchEnd);
        };
        Drag.prototype.onTouchMove = function (e) {
            e.preventDefault();
            e = ~e.type.indexOf('mouse') ? e : e.touches[0];
            var delta = {
                x: e.clientX - this.touch.clientX,
                y: e.clientY - this.touch.clientY
            };
            this.dragging = true;
            this.move(delta);
            this.touch = e;
        };
        Drag.prototype.onTouchEnd = function (e) {
            var tapped = e.timeStamp - this.startTime < this.tapTime;
            this.dragging = false;
            removeEventListener(pointer.move, this.onTouchMove);
            removeEventListener(pointer.up, this.onTouchEnd);
            if (tapped) {
                this.emit('tapped', e);
            } else {
                this.emit('ended', e);
            }
        };
        Drag.prototype.move = function (delta) {
            this.translate({
                x: this.handle.position.x + delta.x,
                y: this.handle.position.y + delta.y
            });
        };
        Drag.prototype.set = function (pos) {
            if (!this.edges) {
                this.pendingSet = pos;
                return;
            }
            var x = typeof pos.x === 'string' ? this.edges[pos.x] : pos.x || 0;
            var y = typeof pos.y === 'string' ? this.edges[pos.y] : pos.y || 0;
            this.translate({
                x: x,
                y: y
            });
        };
        Drag.prototype.snapToClosestEdge = function () {
            var edges = this.getClosestEdges();
            this.translate({
                x: this.edges[edges.x],
                y: this.edges[edges.y]
            });
            this.emit('snapped', edges);
        };
        Drag.prototype.translate = function (options) {
            var position = this.clamp(options);
            var translate = 'translate(' + position.x + 'px,' + position.y + 'px)';
            var ratio = {
                x: position.x / this.max.x || 0,
                y: position.y / this.max.y || 0
            };
            this.setTransition(position);
            this.handle.el.style.transform = translate;
            this.handle.position = position;
            this.emit('translate', {
                position: {
                    px: position,
                    ratio: ratio
                }
            });
        };
        Drag.prototype.clamp = function (position) {
            return {
                x: Math.max(this.min.x, Math.min(this.max.x, position.x)),
                y: Math.max(this.min.y, Math.min(this.max.y, position.y))
            };
        };
        Drag.prototype.setTransition = function (position) {
            var duration = !this.dragging ? this.transitionDuration(position) : 0;
            this.handle.el.style.transitionDuration = duration + 'ms';
        };
        Drag.prototype.transitionDuration = function (position) {
            var current = this.handle.position;
            var distanceX = Math.abs(current.x - position.x);
            var distanceY = Math.abs(current.y - position.y);
            var distance = Math.max(distanceX, distanceY);
            var axis = distanceY > distanceX ? 'y' : 'x';
            var ratio = distance / this.max[axis];
            return this.slideDuration * ratio;
        };
        Drag.prototype.getClosestEdges = function () {
            return {
                x: this.handle.position.x <= this.max.x / 2 ? 'left' : 'right',
                y: this.handle.position.y <= this.max.y / 2 ? 'top' : 'bottom'
            };
        };
        Drag.prototype.updateDimensions = function () {
            var container = this.container.el.getBoundingClientRect();
            var handle = this.handle.el.getBoundingClientRect();
            this.min = {
                x: 0,
                y: 0
            };
            this.max = {
                x: container.width - handle.width,
                y: container.height - handle.height
            };
            this.edges = {
                top: this.min.y,
                right: this.max.x,
                bottom: this.max.y,
                left: this.min.x
            };
            this.handle.position = {
                x: handle.left - container.left,
                y: handle.top - container.top
            };
            this.clearPendingSet();
        };
        Drag.prototype.clearPendingSet = function () {
            if (!this.pendingSet) {
                return;
            }
            this.set(this.pendingSet);
            delete this.pendingSet;
        };
    });
}(function (n, w) {
    'use strict';
    return typeof define == 'function' && define.amd ? define : typeof module == 'object' ? function (c) {
        c(require, exports, module);
    } : function (c) {
        var m = { exports: {} }, r = function (n) {
                return w[n];
            };
        w[n] = c(r, m.exports, m) || m.exports;
    };
}('drag', this)));
define('views/controls', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/debounce',
    'lib/bind',
    'view',
    'drag'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('view:controls');
    var debounce = require('lib/debounce');
    var bind = require('lib/bind');
    var View = require('view');
    var Drag = require('drag');
    module.exports = View.extend({
        name: 'controls',
        className: 'test-controls',
        initialize: function (options) {
            this.drag = options && options.drag;
            this.once('inserted', this.setupSwitch);
            this.render();
        },
        switchPositions: {
            left: 'picture',
            right: 'video',
            picture: 'left',
            video: 'right'
        },
        elsL10n: {
            cancel: 'controls-button-close',
            thumbnail: 'preview-button',
            capture: 'capture-button'
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.els.switchHandle = this.find('.js-switch-handle');
            this.els.thumbnail = this.find('.js-thumbnail');
            this.els.capture = this.find('.js-capture');
            this.els.cancel = this.find('.js-cancel');
            this.els.switch = this.find('.js-switch');
            this.els.icons = {
                camera: this.find('.js-icon-camera'),
                video: this.find('.js-icon-video')
            };
            delete this.template;
            debug('rendered');
            return this.bindEvents();
        },
        bindEvents: function () {
            this.onButtonClick = debounce(this.onButtonClick, 300, true);
            bind(this.els.thumbnail, 'click', this.onButtonClick);
            bind(this.els.capture, 'click', this.onButtonClick);
            bind(this.els.cancel, 'click', this.onButtonClick);
            return this;
        },
        setupSwitch: function () {
            debug('setup dragger');
            if (document.readyState !== 'complete') {
                window.addEventListener('load', this.setupSwitch);
                debug('deferred switch setup till after load');
                return;
            }
            this.drag = this.drag || new Drag({
                handle: this.els.switchHandle,
                container: this.els.switch
            });
            this.drag.on('tapped', debounce(this.onSwitchTapped, 300, true));
            this.drag.on('ended', this.drag.snapToClosestEdge);
            this.drag.on('translate', this.onSwitchTranslate);
            this.drag.on('snapped', this.onSwitchSnapped);
            this.drag.updateDimensions();
            this.updateSwitchPosition();
            window.removeEventListener('load', this.setupSwitch);
        },
        setCaptureLabel: function (recording) {
            this.els.capture.setAttribute('data-l10n-id', recording ? 'stop-capture-button' : 'capture-button');
        },
        onSwitchSnapped: function (edges) {
            var mode = this.switchPositions[edges.x];
            var changed = mode !== this.get('mode');
            if (changed) {
                this.onSwitchChanged();
            }
        },
        onSwitchChanged: function () {
            this.emit('modechanged');
        },
        onSwitchTapped: function (e) {
            e.preventDefault();
            e.stopPropagation();
            debug('switch tapped');
            this.onSwitchChanged();
        },
        onSwitchTranslate: function (e) {
            this.setSwitchIcon(e.position.ratio.x);
        },
        setSwitchIcon: function (ratio) {
            var skew = 2;
            var ratioSkewed = ratio * skew;
            var camera = Math.max(0, 1 - ratioSkewed);
            var video = Math.max(0, -1 + ratioSkewed);
            this.els.icons.camera.style.opacity = camera;
            this.els.icons.video.style.opacity = video;
            debug('set switch icon camera: %s, video: %s', camera, video);
        },
        setScreenReaderVisible: function (visible) {
            this.el.setAttribute('aria-hidden', !visible);
        },
        onButtonClick: function (e) {
            e.stopPropagation();
            debug('button click');
            var name = e.currentTarget.getAttribute('name');
            this.emit('click:' + name, e);
        },
        suspendModeSwitch: function (suspended) {
            if (suspended) {
                this.set('switch-toggle-disabled');
            } else {
                this.unset('switch-toggle-disabled');
            }
        },
        setMode: function (mode) {
            debug('set mode: %s', mode);
            this.set('mode', mode);
            this.switchPosition = this.switchPositions[mode];
            var ratio = {
                left: 0,
                right: 1
            }[this.switchPosition];
            this.updateSwitchPosition();
            this.setSwitchIcon(ratio);
            this.els.switch.setAttribute('data-l10n-id', mode + '-mode-button');
            debug('mode set pos: %s', this.switchPosition);
        },
        updateSwitchPosition: function () {
            debug('updateSwitchPosition');
            if (!this.drag) {
                return;
            }
            this.drag.set({ x: this.switchPosition });
            debug('updated switch position: %s', this.switchPosition);
        },
        setThumbnail: function (blob) {
            if (!this.els.image) {
                this.els.image = new Image();
                this.els.image.classList.add('test-thumbnail');
                this.els.thumbnail.appendChild(this.els.image);
                this.set('thumbnail', true);
            } else {
                window.URL.revokeObjectURL(this.els.image.src);
            }
            this.els.image.src = window.URL.createObjectURL(blob);
            debug('thumbnail set');
        },
        removeThumbnail: function () {
            if (this.els.image) {
                this.els.thumbnail.removeChild(this.els.image);
                window.URL.revokeObjectURL(this.els.image.src);
                this.els.image = null;
            }
            this.set('thumbnail', false);
        },
        set: function (key, value) {
            if (typeof key !== 'string') {
                return;
            }
            if (arguments.length === 1) {
                value = true;
            }
            if (!value) {
                return this.unset(key);
            }
            var attr = 'data-' + key;
            var oldValue = this.el.getAttribute(attr);
            var oldClass = oldValue && classFrom(key, oldValue);
            var newClass = classFrom(key, value);
            if (oldClass) {
                this.el.classList.remove(oldClass);
            }
            if (newClass) {
                this.el.classList.add(newClass);
            }
            this.el.setAttribute(attr, value);
            debug('remove: %s, add: %s', oldClass, newClass);
            debug('attr key: %s, value: %s', attr, value);
        },
        get: function (key) {
            var attr = 'data-' + key;
            return this.el.getAttribute(attr);
        },
        unset: function (key) {
            var attr = 'data-' + key;
            var value = this.el.getAttribute(attr);
            this.el.classList.remove(classFrom(key, value));
            this.el.removeAttribute(attr);
        },
        enable: function (key) {
            this.set(key ? key + '-enabled' : 'enabled');
            this.unset(key ? key + '-disabled' : 'disabled');
        },
        disable: function (key) {
            this.set(key ? key + '-disabled' : 'disabled');
            this.unset(key ? key + '-enabled' : 'enabled');
        },
        localize: function () {
            var mode = this.get('mode') || 'picture';
            this.els.switch.setAttribute('data-l10n-id', mode + '-mode-button');
        },
        template: function () {
            return '<div class="controls-left">' + '<div class="controls-button controls-thumbnail-button test-thumbnail js-thumbnail rotates" ' + 'name="thumbnail" role="button" data-l10n-id="preview-button"></div>' + '<div class="controls-button controls-cancel-pick-button test-cancel-pick rotates js-cancel" ' + 'name="cancel" data-icon="close" role="button" data-l10n-id="controls-button-close"></div>' + '</div>' + '<div class="controls-middle">' + '<div class="capture-button test-capture rotates js-capture" name="capture" ' + 'data-l10n-id="capture-button" role="button">' + '<div class="circle outer-circle"></div>' + '<div class="circle inner-circle"></div>' + '<div class="center" data-icon="camera" aria-hidden="true"></div>' + '</div>' + '</div>' + '<div class="controls-right">' + '<div class="mode-switch test-switch" name="switch">' + '<div class="inner js-switch" role="button">' + '<div class="mode-switch_bg-icon rotates" data-icon="camera" aria-hidden="true"></div>' + '<div class="mode-switch_bg-icon rotates" data-icon="video" aria-hidden="true"></div>' + '<div class="mode-switch_handle js-switch-handle" aria-hidden="true">' + '<div class="mode-switch_current-icon camera rotates js-icon-camera" data-icon="camera" aria-hidden="true"></div>' + '<div class="mode-switch_current-icon video rotates js-icon-video" data-icon="video" aria-hidden="true"></div>' + '</div>' + '</div>' + '</div>' + '</div>';
        }
    });
    function classFrom(key, value) {
        value = detectBooleans(value);
        if (typeof value === 'boolean') {
            return value ? key : '';
        } else if (value) {
            return key + '-' + value;
        } else {
            return key;
        }
    }
    function detectBooleans(value) {
        if (typeof value === 'boolean') {
            return value;
        } else if (value === 'true') {
            return true;
        } else if (value === 'false') {
            return false;
        } else {
            return value;
        }
    }
});
define('controllers/controls', [
    'require',
    'exports',
    'module',
    'debug',
    'views/controls',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:controls');
    var ControlsView = require('views/controls');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new ControlsController(app);
    };
    module.exports.ControlsController = ControlsController;
    function ControlsController(app) {
        bindAll(this);
        this.app = app;
        this.activity = app.activity;
        this.createView();
        this.bindEvents();
        debug('initialized');
    }
    ControlsController.prototype.bindEvents = function () {
        this.app.settings.mode.on('change:selected', this.view.setMode);
        this.app.settings.mode.on('change:options', this.configureMode);
        this.app.on('change:recording', this.onRecordingChange);
        this.app.on('camera:shutter', this.captureHighlightOff);
        this.app.on('camera:willchange', this.onCameraWillChange);
        this.app.on('camera:configured', this.onCameraConfigured);
        this.app.on('newthumbnail', this.onNewThumbnail);
        this.app.once('loaded', this.onceAppLoaded);
        this.app.on('busy', this.onCameraBusy);
        this.app.on('localized', this.view.localize);
        this.view.on('modechanged', this.onViewModeChanged);
        this.view.on('click:thumbnail', this.app.firer('preview'));
        this.view.on('click:cancel', this.onCancelButtonClick);
        this.view.on('click:capture', this.onCaptureClick);
        this.app.on('countdown:started', this.onCountdownStarted);
        this.app.on('countdown:ended', this.onCountdownStopped);
        this.app.on('settings:opened', this.onSettingsOpened);
        this.app.on('settings:closed', this.onSettingsClosed);
        this.app.on('previewgallery:opened', this.view.hide);
        this.app.on('previewgallery:closed', this.view.show);
        debug('events bound');
    };
    ControlsController.prototype.createView = function () {
        var initialMode = this.app.settings.mode.selected('key');
        var cancellable = !!this.app.activity.pick;
        this.view = this.app.views.controls || new ControlsView();
        this.view.set('cancel', cancellable);
        this.view.setMode(initialMode);
        this.view.disable();
        this.view.appendTo(this.app.el);
        debug('cancelable: %s', cancellable);
        debug('mode: %s', initialMode);
    };
    ControlsController.prototype.configureMode = function () {
        var switchable = this.app.settings.mode.get('options').length > 1;
        if (!switchable) {
            this.view.disable('switch');
        }
    };
    ControlsController.prototype.onceAppLoaded = function () {
        this.app.on('ready', this.restore);
        this.view.enable();
    };
    ControlsController.prototype.onCaptureClick = function () {
        this.captureHighlightOn();
        this.app.emit('capture');
    };
    ControlsController.prototype.onCameraWillChange = function () {
        this.view.suspendModeSwitch(true);
    };
    ControlsController.prototype.onCameraConfigured = function () {
        this.view.suspendModeSwitch(false);
    };
    ControlsController.prototype.onRecordingChange = function (recording) {
        this.view.set('recording', recording);
        if (!recording) {
            this.onRecordingEnd();
        }
        this.view.setCaptureLabel(recording);
    };
    ControlsController.prototype.onRecordingEnd = function () {
        this.captureHighlightOff();
    };
    ControlsController.prototype.onNewThumbnail = function (thumbnailBlob) {
        if (thumbnailBlob) {
            this.view.setThumbnail(thumbnailBlob);
        } else {
            this.view.removeThumbnail();
        }
    };
    ControlsController.prototype.onCountdownStarted = function () {
        this.captureHighlightOn();
        this.view.set('countdown', 'active');
    };
    ControlsController.prototype.onCountdownStopped = function () {
        this.captureHighlightOff();
        this.view.set('countdown', 'inactive');
    };
    ControlsController.prototype.onSettingsOpened = function () {
        this.view.setScreenReaderVisible(false);
    };
    ControlsController.prototype.onSettingsClosed = function () {
        this.view.setScreenReaderVisible(true);
    };
    ControlsController.prototype.onCameraBusy = function () {
        this.view.disable();
    };
    ControlsController.prototype.restore = function () {
        debug('restore');
        this.captureHighlightOff();
        this.view.enable();
    };
    ControlsController.prototype.captureHighlightOn = function () {
        this.view.set('capture-active');
    };
    ControlsController.prototype.captureHighlightOff = function () {
        this.view.unset('capture-active');
    };
    ControlsController.prototype.onViewModeChanged = function () {
        debug('view mode changed');
        this.app.settings.mode.next();
    };
    ControlsController.prototype.onCancelButtonClick = function () {
        this.app.emit('activitycanceled');
    };
    ControlsController.prototype.onGalleryButtonClick = function (event) {
        event.stopPropagation();
        var MozActivity = window.MozActivity;
        if (this.app.inSecureMode) {
            return;
        }
        this.mozActivity = new MozActivity({
            name: 'browse',
            data: { type: 'photos' }
        });
        this.view.disable();
        setTimeout(this.view.enable, 2000);
    };
});
define('lib/camera-coordinates', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    function toPixels(x, y, viewportWidth, viewportHeight) {
        var cameraCoordinatesRange = 2000;
        var pixelsPerCameraUnitWidth = viewportWidth / cameraCoordinatesRange;
        var pixelsPerCameraUnitHeight = viewportHeight / cameraCoordinatesRange;
        var xCameraCoordinates = x + 1000;
        var yCameraCoordinates = y + 1000;
        var xPixelCoordinates = xCameraCoordinates * pixelsPerCameraUnitWidth;
        var yPixelCoordinates = yCameraCoordinates * pixelsPerCameraUnitHeight;
        return {
            x: Math.round(xPixelCoordinates),
            y: Math.round(yPixelCoordinates)
        };
    }
    function toCamera(x, y, viewportWidth, viewportHeight) {
        var cameraCoordinatesRange = 2000;
        var cameraUnitsPerPixelWidth = cameraCoordinatesRange / viewportWidth;
        var cameraUnitsPerPixelHeight = cameraCoordinatesRange / viewportHeight;
        return {
            x: Math.round(x * cameraUnitsPerPixelWidth) - 1000,
            y: Math.round(y * cameraUnitsPerPixelHeight) - 1000
        };
    }
    function rotatePoint(x, y, angle) {
        angle = Math.round(angle % 360 / 90) % 4 * 90;
        switch (angle) {
        case 0:
            return {
                x: x,
                y: y
            };
        case 90:
        case -270:
            return {
                x: -y,
                y: x
            };
        case 180:
        case -180:
            return {
                x: -x,
                y: -y
            };
        case 270:
        case -90:
            return {
                x: y,
                y: -x
            };
        default:
            console.error('wrong angle value');
        }
    }
    function rotateArea(area, sensorOrientation) {
        var topLeft = rotatePoint(area.left, area.top, sensorOrientation);
        var bottomRight = rotatePoint(area.right, area.bottom, sensorOrientation);
        return {
            top: Math.min(topLeft.y, bottomRight.y),
            left: Math.min(topLeft.x, bottomRight.x),
            bottom: Math.max(topLeft.y, bottomRight.y),
            right: Math.max(topLeft.x, bottomRight.x),
            width: Math.abs(topLeft.x - bottomRight.x),
            height: Math.abs(topLeft.y - bottomRight.y)
        };
    }
    function mirrorAreaCamera(area) {
        return {
            top: area.top,
            left: -area.right,
            bottom: area.bottom,
            right: -area.left,
            width: area.width,
            height: area.height
        };
    }
    function mirrorAreaPixels(area, viewportWidth) {
        return {
            top: area.top,
            left: viewportWidth - area.right,
            bottom: area.bottom,
            right: viewportWidth - area.left,
            width: area.width,
            height: area.height
        };
    }
    function sizeToCamera(width, height, viewportWidth, viewportHeight) {
        var cameraCoordinatesRange = 2000;
        var cameraUnitsPerPixelWidth = cameraCoordinatesRange / viewportWidth;
        var cameraUnitsPerPixelHeight = cameraCoordinatesRange / viewportHeight;
        return {
            width: Math.round(width * cameraUnitsPerPixelWidth),
            height: Math.round(height * cameraUnitsPerPixelHeight)
        };
    }
    function sizeToPixels(width, height, viewportWidth, viewportHeight) {
        var cameraCoordinatesRange = 2000;
        var pixelsPerCameraUnitWidth = viewportWidth / cameraCoordinatesRange;
        var pixelsPerCameraUnitHeight = viewportHeight / cameraCoordinatesRange;
        return {
            width: Math.round(width * pixelsPerCameraUnitWidth),
            height: Math.round(height * pixelsPerCameraUnitHeight)
        };
    }
    function areaToPixels(area, viewportWidth, viewportHeight) {
        var areaPixels = toPixels(area.left, area.top, viewportWidth, viewportHeight);
        var areaPixelSize = sizeToPixels(area.width, area.height, viewportWidth, viewportHeight);
        var width = areaPixelSize.width;
        var height = areaPixelSize.height;
        return {
            top: areaPixels.y,
            left: areaPixels.x,
            bottom: areaPixels.y + height,
            right: areaPixels.x + width,
            width: width,
            height: height
        };
    }
    function areaToCamera(area, viewportWidth, viewportHeight) {
        var topLeft = toCamera(area.left, area.top, viewportWidth, viewportHeight);
        var areaCameraUnits = sizeToCamera(area.width, area.height, viewportWidth, viewportHeight);
        var width = areaCameraUnits.width;
        var height = areaCameraUnits.height;
        var areaCamera = {
            top: topLeft.y,
            left: topLeft.x,
            bottom: topLeft.y + height,
            right: topLeft.x + width,
            height: height,
            width: width
        };
        return areaCamera;
    }
    function faceToCamera(face, viewportWidth, viewportHeight, sensorOrientation, mirrored) {
        if (mirrored) {
            face = mirrorAreaPixels(face, viewportWidth);
        }
        face = areaToCamera(face, viewportWidth, viewportHeight);
        if (sensorOrientation) {
            face = rotateArea(face, -sensorOrientation);
        }
        return face;
    }
    function faceToPixels(face, viewportWidth, viewportHeight, sensorOrientation, mirrored) {
        if (sensorOrientation) {
            face = rotateArea(face, sensorOrientation);
        }
        if (mirrored) {
            face = mirrorAreaCamera(face);
        }
        return areaToPixels(face, viewportWidth, viewportHeight);
    }
    return {
        faceToCamera: faceToCamera,
        faceToPixels: faceToPixels,
        private: {
            areaToCamera: areaToCamera,
            areaToPixels: areaToPixels,
            mirrorAreaCamera: mirrorAreaCamera,
            mirrorAreaPixels: mirrorAreaPixels,
            rotateArea: rotateArea,
            sizeToCamera: sizeToCamera,
            sizeToPixels: sizeToPixels,
            toCamera: toCamera,
            toPixels: toPixels,
            rotatePoint: rotatePoint
        }
    };
});
define('views/viewfinder', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind',
    'lib/camera-utils',
    'view'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('view:viewfinder');
    var bind = require('lib/bind');
    var CameraUtils = require('lib/camera-utils');
    var View = require('view');
    var isZoomEnabled = false;
    var scaleSizeTo = {
        fill: CameraUtils.scaleSizeToFillViewport,
        fit: CameraUtils.scaleSizeToFitViewport
    };
    var clamp = function (value, minimum, maximum) {
        return Math.min(Math.max(value, minimum), maximum);
    };
    module.exports = View.extend({
        name: 'viewfinder',
        className: 'js-viewfinder',
        fadeTime: 360,
        initialize: function () {
            this.render();
            this.getSize();
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.els.frame = this.find('.js-frame');
            this.els.video = this.find('.js-video');
            this.els.videoContainer = this.find('.js-video-container');
            delete this.template;
            debug('rendered');
            return this.bindEvents();
        },
        bindEvents: function () {
            bind(this.el, 'click', this.onClick);
            bind(this.el, 'animationend', this.onShutterEnd);
            return this;
        },
        getSize: function () {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            return {
                width: this.width,
                height: this.height
            };
        },
        onClick: function (e) {
            this.emit('click', e);
        },
        enableZoom: function (minimumZoom, maximumZoom) {
            if (minimumZoom) {
                this._minimumZoom = minimumZoom;
            }
            if (maximumZoom) {
                this._maximumZoom = maximumZoom;
            }
            isZoomEnabled = true;
        },
        disableZoom: function () {
            this._minimumZoom = 1;
            this._maximumZoom = 1;
            this.setZoom(1);
            isZoomEnabled = false;
        },
        _minimumZoom: 1,
        setMinimumZoom: function (minimumZoom) {
            this._minimumZoom = minimumZoom;
        },
        _maximumZoom: 1,
        setMaximumZoom: function (maximumZoom) {
            this._maximumZoom = maximumZoom;
        },
        _zoom: 1,
        setZoom: function (zoom) {
            if (!isZoomEnabled) {
                return;
            }
            this._zoom = clamp(zoom, this._minimumZoom, this._maximumZoom);
        },
        _useZoomPreviewAdjustment: false,
        enableZoomPreviewAdjustment: function () {
            this._useZoomPreviewAdjustment = true;
        },
        disableZoomPreviewAdjustment: function () {
            this._useZoomPreviewAdjustment = false;
        },
        setZoomPreviewAdjustment: function (zoomPreviewAdjustment) {
            if (this._useZoomPreviewAdjustment) {
                this.els.video.style.transform = 'scale(' + zoomPreviewAdjustment + ')';
            }
        },
        stopStream: function () {
            this.els.video.mozSrcObject = null;
        },
        fadeOut: function () {
            debug('fade-out');
            var self = this;
            this.hide();
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = setTimeout(function () {
                self.emit('fadedout');
            }, this.fadeTime);
        },
        fadeIn: function (firstRun) {
            debug('fade-in');
            this.show();
            if (firstRun) {
                this.emit('fadedin');
                requestAnimationFrame(() => {
                    this.el.style.transitionDuration = this.fadeTime + 'ms';
                });
            } else {
                this.fadeTimeout = setTimeout(this.firer('fadedin'), this.fadeTime);
            }
        },
        shutter: function () {
            this.el.classList.add('shutter');
        },
        onShutterEnd: function () {
            this.reflow = this.el.offsetTop;
            this.el.classList.remove('shutter');
        },
        updatePreview: function (preview, sensorAngle, mirrored) {
            if (!preview) {
                return;
            }
            var aspect;
            if (sensorAngle % 180 === 0) {
                this.container = {
                    width: this.width,
                    height: this.height,
                    aspect: this.width / this.height
                };
                aspect = preview.height / preview.width;
            } else {
                this.container = {
                    width: this.height,
                    height: this.width,
                    aspect: this.height / this.width
                };
                aspect = preview.width / preview.height;
            }
            var shouldFill = aspect > this.container.aspect;
            var scaleType = this.scaleType || (shouldFill ? 'fill' : 'fit');
            this.updatePreviewMetrics(preview, sensorAngle, mirrored, scaleType);
        },
        updatePreviewMetrics: function (preview, sensorAngle, mirrored, scaleType) {
            debug('update preview scaleType: %s', scaleType, preview);
            var landscape = scaleSizeTo[scaleType](this.container, preview);
            var portrait = {
                width: landscape.height,
                height: landscape.width
            };
            this.els.frame.style.width = portrait.width + 'px';
            this.els.frame.style.height = portrait.height + 'px';
            var transform = '';
            if (mirrored) {
                transform += 'scale(-1, 1) ';
            }
            transform += 'rotate(' + sensorAngle + 'deg)';
            this.els.videoContainer.style.width = landscape.width + 'px';
            this.els.videoContainer.style.height = landscape.height + 'px';
            this.els.videoContainer.style.transform = transform;
            this.set('scaleType', scaleType);
            debug('updated preview size/position', landscape);
        },
        template: function () {
            return '<div class="viewfinder-frame js-frame">' + '<div class="viewfinder-video-container js-video-container" ' + 'aria-hidden="true">' + '<video class="viewfinder-video js-video"></video>' + '</div>' + '<div class="viewfinder-grid">' + '<div class="row"></div>' + '<div class="row middle"></div>' + '<div class="row"></div>' + '<div class="column left">' + '<div class="cell top"></div>' + '<div class="cell middle"></div>' + '<div class="cell bottom"></div>' + '</div>' + '<div class="column middle">' + '<div class="cell top"></div>' + '<div class="cell middle"></div>' + '<div class="cell bottom"></div>' + '</div>' + '<div class="column right">' + '<div class="cell top"></div>' + '<div class="cell middle"></div>' + '<div class="cell bottom"></div>' + '</div>' + '</div>' + '</div>' + '</div>';
        }
    });
});
define('views/focus', [
    'require',
    'exports',
    'module',
    'debug',
    'view'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('view:focus');
    var View = require('view');
    module.exports = View.extend({
        name: 'focus',
        fadeTime: 500,
        initialize: function () {
            this.render();
            this.setFocusState('none');
        },
        render: function () {
            this.el.innerHTML = this.template();
            delete this.template;
            debug('rendered');
            return this;
        },
        setFocusState: function (state) {
            this.set('state', state);
            if (state !== 'focusing') {
                this.fadeOut();
            }
        },
        setFocusMode: function (mode) {
            this.reset();
            this.set('mode', mode);
        },
        setPosition: function (x, y) {
            if (this.fadeOutTimer) {
                clearTimeout(this.fadeOutTimer);
            }
            this.el.style.left = x + 'px';
            this.el.style.top = y + 'px';
        },
        reset: function () {
            this.el.style.left = '50%';
            this.el.style.top = '50%';
            this.set('state', 'none');
        },
        fadeOut: function () {
            var self = this;
            this.fadeOutTimer = setTimeout(hide, this.fadeTime);
            function hide() {
                self.reset();
            }
        },
        template: function () {
            return '<div class="focus_locking" data-icon="focus-locking" ' + 'aria-hidden="true"></div>' + '<div class="focus_locked" data-icon="focus-locked" aria-hidden="true">' + '</div>';
        }
    });
});
define('views/face', [
    'require',
    'exports',
    'module',
    'view'
], function (require, exports, module) {
    'use strict';
    var View = require('view');
    module.exports = View.extend({
        name: 'face',
        initialize: function () {
            this.render();
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.el.classList.add('js-face');
        },
        setPosition: function (x, y) {
            this.el.style.left = x + 'px';
            this.el.style.top = y + 'px';
        },
        setDiameter: function (diameter) {
            this.el.style.width = diameter + 'px';
            this.el.style.height = diameter + 'px';
        }
    });
});
define('views/faces', [
    'require',
    'exports',
    'module',
    'views/face',
    'view'
], function (require, exports, module) {
    'use strict';
    var FaceView = require('views/face');
    var View = require('view');
    module.exports = View.extend({
        name: 'faces',
        faces: [],
        initialize: function (options) {
            options = options || {};
            this.el.innerHTML = this.template();
            this.FaceView = options.FaceView || FaceView;
        },
        createFaces: function (maxNumberFaces) {
            var faceView;
            var i;
            for (i = 0; i < maxNumberFaces; ++i) {
                faceView = new this.FaceView();
                faceView.hide();
                this.faces.push(faceView);
                faceView.appendTo(this.el);
            }
        },
        render: function (faces) {
            var self = this;
            this.hideFaces();
            if (faces.length > this.faces.length) {
                this.createFaces(faces.length - this.faces.length);
            }
            faces.forEach(function (face, index) {
                var faceView = self.faces[index];
                self.renderFace(face, faceView);
            });
        },
        renderFace: function (face, faceView) {
            var diameter = Math.min(300, face.diameter);
            faceView.setPosition(face.x, face.y);
            faceView.setDiameter(diameter);
            faceView.show();
        },
        hideFaces: function () {
            this.faces.forEach(function (faceView) {
                faceView.hide();
            });
        },
        clear: function () {
            var self = this;
            this.faces.forEach(function (faceView) {
                self.el.removeChild(faceView.el);
            });
            this.faces = [];
        }
    });
});
define('controllers/viewfinder', [
    'require',
    'exports',
    'module',
    'lib/camera-coordinates',
    'debug',
    'views/viewfinder',
    'views/focus',
    'views/faces',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var cameraCoordinates = require('lib/camera-coordinates');
    var debug = require('debug')('controller:viewfinder');
    var ViewfinderView = require('views/viewfinder');
    var FocusView = require('views/focus');
    var FacesView = require('views/faces');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new ViewfinderController(app);
    };
    module.exports.ViewfinderController = ViewfinderController;
    function ViewfinderController(app) {
        bindAll(this);
        this.app = app;
        this.camera = app.camera;
        this.activity = app.activity;
        this.settings = app.settings;
        this.createViews();
        this.bindEvents();
        this.configure();
        debug('initialized');
    }
    ViewfinderController.prototype.createViews = function () {
        this.views = {};
        this.views.viewfinder = this.app.views.viewfinder || new ViewfinderView();
        this.views.focus = this.app.views.focus || new FocusView();
        this.views.faces = this.app.views.faces || new FacesView();
        this.views.focus.appendTo(this.views.viewfinder.el);
        this.views.faces.appendTo(this.views.viewfinder.el);
        this.views.viewfinder.appendTo(this.app.el);
    };
    ViewfinderController.prototype.configure = function () {
        var settings = this.app.settings;
        var zoomSensitivity = settings.viewfinder.get('zoomGestureSensitivity');
        this.sensitivity = zoomSensitivity * window.innerWidth;
        this.configureScaleType();
        this.configureGrid();
    };
    ViewfinderController.prototype.configureScaleType = function () {
        var scaleType = this.app.settings.viewfinder.get('scaleType');
        this.views.viewfinder.scaleType = scaleType;
        debug('set scale type: %s', scaleType);
    };
    ViewfinderController.prototype.configureGrid = function () {
        var grid = this.app.settings.grid.selected('key');
        this.views.viewfinder.set('grid', grid);
    };
    ViewfinderController.prototype.hideGrid = function () {
        this.views.viewfinder.set('grid', 'off');
    };
    ViewfinderController.prototype.bindEvents = function () {
        this.views.viewfinder.on('fadedin', this.app.firer('viewfinder:visible'));
        this.views.viewfinder.on('fadedout', this.app.firer('viewfinder:hidden'));
        this.views.viewfinder.on('click', this.app.firer('viewfinder:click'));
        this.views.viewfinder.on('click', this.onViewfinderClicked);
        this.camera.on('zoomconfigured', this.onZoomConfigured);
        this.camera.on('zoomchanged', this.onZoomChanged);
        this.camera.on('preview:started', this.show);
        this.app.on('camera:autofocuschanged', this.views.focus.showAutoFocusRing);
        this.app.on('camera:focusstatechanged', this.views.focus.setFocusState);
        this.app.on('camera:focusconfigured', this.onFocusConfigured);
        this.app.on('camera:shutter', this.views.viewfinder.shutter);
        this.app.on('camera:facesdetected', this.onFacesDetected);
        this.app.on('camera:configured', this.onCameraConfigured);
        this.app.on('camera:previewactive', this.onPreviewActive);
        this.app.on('busy', this.views.viewfinder.disable);
        this.app.on('ready', this.views.viewfinder.enable);
        this.app.on('camera:willchange', this.hide);
        this.app.on('previewgallery:opened', this.onGalleryOpened);
        this.app.on('previewgallery:closed', this.onGalleryClosed);
        this.app.on('settings:closed', this.onSettingsClosed);
        this.app.on('settings:opened', this.onSettingsOpened);
        this.app.settings.grid.on('change:selected', this.views.viewfinder.setter('grid'));
        this.app.on('battery:powersave', this.onPowerSave);
        this.app.on('pinch:changed', this.onPinchChanged);
        this.app.on('hidden', this.stopStream);
    };
    ViewfinderController.prototype.onCameraConfigured = function () {
        debug('configuring');
        this.loadStream();
        this.configurePreview();
    };
    ViewfinderController.prototype.show = function () {
        debug('show');
        if (!this.app.criticalPathDone) {
            this.views.viewfinder.fadeIn(true);
            return;
        }
        clearTimeout(this.showTimeout);
        this.showTimeout = setTimeout(this.views.viewfinder.fadeIn, 280);
        debug('schedule delayed fade-in');
    };
    ViewfinderController.prototype.hide = function () {
        debug('hide');
        clearTimeout(this.showTimeout);
        this.views.viewfinder.fadeOut();
    };
    ViewfinderController.prototype.onFocusConfigured = function (config) {
        this.views.focus.setFocusMode(config.mode);
        this.touchFocusEnabled = config.touchFocus;
        this.views.faces.clear();
    };
    ViewfinderController.prototype.onFacesDetected = function (faces) {
        var self = this;
        var faceCircles = [];
        var viewfinderSize = this.views.viewfinder.getSize();
        var viewportHeight = viewfinderSize.height;
        var viewportWidth = viewfinderSize.width;
        var sensorAngle = this.camera.getSensorAngle();
        var camera = this.app.settings.cameras.selected('key');
        var isFrontCamera = camera === 'front';
        faces.forEach(function (face, index) {
            var faceInPixels = cameraCoordinates.faceToPixels(face.bounds, viewportWidth, viewportHeight, sensorAngle, isFrontCamera);
            var faceCircle = self.calculateFaceCircle(faceInPixels);
            faceCircles.push(faceCircle);
        });
        this.views.faces.show();
        this.views.faces.render(faceCircles);
    };
    ViewfinderController.prototype.calculateFaceCircle = function (face) {
        var diameter = Math.max(face.width, face.height);
        var radius = diameter / 2;
        return {
            x: Math.round(face.left + face.width / 2 - radius),
            y: Math.round(face.top + face.height / 2 - radius),
            diameter: diameter
        };
    };
    ViewfinderController.prototype.loadStream = function () {
        this.camera.loadStreamInto(this.views.viewfinder.els.video);
        debug('stream started');
    };
    ViewfinderController.prototype.stopStream = function () {
        this.views.viewfinder.stopStream();
        debug('stream stopped');
    };
    ViewfinderController.prototype.onPowerSave = function (powerSave) {
        this.views.viewfinder.els.video.mozUseScreenWakeLock = !powerSave;
    };
    ViewfinderController.prototype.configurePreview = function () {
        var camera = this.app.settings.cameras.selected('key');
        var isFrontCamera = camera === 'front';
        var sensorAngle = this.camera.getSensorAngle();
        var previewSize = this.camera.previewSize();
        this.views.viewfinder.updatePreview(previewSize, sensorAngle, isFrontCamera);
    };
    ViewfinderController.prototype.onZoomConfigured = function () {
        var zoomSupported = this.camera.isZoomSupported();
        var zoomEnabled = this.app.settings.zoom.enabled();
        var enableZoom = zoomSupported && zoomEnabled;
        if (!enableZoom) {
            this.views.viewfinder.disableZoom();
            return;
        }
        if (this.app.settings.zoom.get('useZoomPreviewAdjustment')) {
            this.views.viewfinder.enableZoomPreviewAdjustment();
        } else {
            this.views.viewfinder.disableZoomPreviewAdjustment();
        }
        var minimumZoom = this.camera.getMinimumZoom();
        var maximumZoom = this.camera.getMaximumZoom();
        this.views.viewfinder.enableZoom(minimumZoom, maximumZoom);
    };
    ViewfinderController.prototype.onPinchChanged = function (deltaPinch) {
        var zoom = this.views.viewfinder._zoom * (1 + deltaPinch / this.sensitivity);
        this.views.viewfinder.setZoom(zoom);
        this.camera.setZoom(zoom);
    };
    ViewfinderController.prototype.onZoomChanged = function (zoom) {
        var zoomPreviewAdjustment = this.camera.getZoomPreviewAdjustment();
        this.views.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
        this.views.viewfinder.setZoom(zoom);
    };
    ViewfinderController.prototype.onViewfinderClicked = function (e) {
        if (!this.touchFocusEnabled) {
            return;
        }
        this.views.faces.hide();
        this.changeFocusPoint(e.pageX, e.pageY);
    };
    ViewfinderController.prototype.changeFocusPoint = function (x, y) {
        var viewfinderSize = this.views.viewfinder.getSize();
        var viewportHeight = viewfinderSize.height;
        var viewportWidth = viewfinderSize.width;
        var sensorAngle = this.camera.getSensorAngle();
        var focusAreaSize = 10;
        var focusAreaHalfSide = Math.round(focusAreaSize / 2);
        var focusAreaPixels = {
            left: x - focusAreaHalfSide,
            top: y - focusAreaHalfSide,
            right: x + focusAreaHalfSide,
            bottom: y + focusAreaHalfSide,
            width: focusAreaSize,
            height: focusAreaSize
        };
        var camera = this.app.settings.cameras.selected('key');
        var isFrontCamera = camera === 'front';
        var focusArea = cameraCoordinates.faceToCamera(focusAreaPixels, viewportWidth, viewportHeight, sensorAngle, isFrontCamera);
        var focusPoint = {
            x: x,
            y: y,
            area: focusArea
        };
        this.views.focus.setPosition(x, y);
        this.app.emit('viewfinder:focuspointchanged', focusPoint);
    };
    ViewfinderController.prototype.onSettingsOpened = function () {
        this.hideGrid();
        this.views.viewfinder.set('ariaHidden', true);
    };
    ViewfinderController.prototype.onSettingsClosed = function () {
        this.configureGrid();
        this.views.viewfinder.set('ariaHidden', false);
    };
    ViewfinderController.prototype.onGalleryOpened = function () {
        this.views.viewfinder.disable();
        this.views.viewfinder.set('ariaHidden', true);
    };
    ViewfinderController.prototype.onGalleryClosed = function () {
        this.views.viewfinder.enable();
        this.views.viewfinder.set('ariaHidden', false);
    };
    ViewfinderController.prototype.onPreviewActive = function (active) {
        if (!active) {
            this.stopStream();
        }
    };
});
define('lib/get-aspect', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = function (w, h) {
        var gcd = function (a, b) {
            return b === 0 ? a : gcd(b, a % b);
        };
        var divisor = gcd(w, h);
        return w / divisor + ':' + h / divisor;
    };
});
define('lib/format-recorder-profiles', [
    'require',
    'exports',
    'module',
    './get-aspect'
], function (require, exports, module) {
    'use strict';
    var getAspect = require('./get-aspect');
    module.exports = function (profiles, options) {
        var exclude = options && options.exclude || [];
        var items = [];
        var hash = {};
        for (var key in profiles) {
            if (!profiles.hasOwnProperty(key)) {
                continue;
            }
            var profile = profiles[key];
            var video = profile.video;
            var sizeKey = video.width + 'x' + video.height;
            if (hash[sizeKey]) {
                continue;
            }
            if (exclude.indexOf(key) > -1) {
                continue;
            }
            var pixelSize = video.width * video.height;
            var aspect = getAspect(video.width, video.height);
            hash[sizeKey] = key;
            items.push({
                key: key,
                title: key + ' ' + sizeKey + ' ' + aspect,
                pixelSize: pixelSize,
                raw: profile
            });
        }
        items.sort(function (a, b) {
            return b.pixelSize - a.pixelSize;
        });
        return items;
    };
});
define('lib/format-picture-sizes', [
    'require',
    'exports',
    'module',
    './get-aspect'
], function (require, exports, module) {
    'use strict';
    var getAspect = require('./get-aspect');
    module.exports = function (sizes, options) {
        var maxPixelSize = options && options.maxPixelSize;
        var exclude = options && options.exclude || {};
        var include = options && options.include;
        var formatted = [];
        var hash = {};
        exclude.aspects = exclude.aspects || [];
        exclude.keys = exclude.keys || [];
        sizes.forEach(function (size) {
            var w = size.width;
            var h = size.height;
            var key = w + 'x' + h;
            var pixelSize = w * h;
            if (hash[key]) {
                return;
            }
            size.aspect = getAspect(w, h);
            if (maxPixelSize && pixelSize > maxPixelSize) {
                return;
            }
            if (include) {
                if (include.keys && !~include.keys.indexOf(key)) {
                    return;
                }
                if (include.aspects && !~include.aspects.indexOf(size.aspect)) {
                    return;
                }
            }
            if (exclude.keys.indexOf(key) > -1) {
                return;
            }
            if (exclude.aspects.indexOf(size.aspect) > -1) {
                return;
            }
            size.mp = getMP(w, h);
            hash[key] = true;
            formatted.push({
                key: key,
                pixelSize: pixelSize,
                data: size
            });
        });
        formatted.sort(function (a, b) {
            return b.pixelSize - a.pixelSize;
        });
        return formatted;
    };
    function getMP(w, h) {
        return Math.round(w * h / 1000000);
    }
});
define('controllers/settings', [
    'require',
    'exports',
    'module',
    'lib/format-recorder-profiles',
    'lib/format-picture-sizes',
    'debug',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var formatRecorderProfiles = require('lib/format-recorder-profiles');
    var formatPictureSizes = require('lib/format-picture-sizes');
    var debug = require('debug')('controller:settings');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new SettingsController(app);
    };
    module.exports.SettingsController = SettingsController;
    function SettingsController(app) {
        bindAll(this);
        this.app = app;
        this.require = app.require;
        this.settings = app.settings;
        this.activity = app.activity;
        this.notification = app.views.notification;
        this.nav = app.nav || navigator;
        this.SettingsView = app.SettingsView;
        this.formatPictureSizes = app.formatPictureSizes || formatPictureSizes;
        this.formatRecorderProfiles = app.formatRecorderProfiles || formatRecorderProfiles;
        this.configure();
        this.bindEvents();
        debug('initialized');
    }
    SettingsController.prototype.configure = function () {
        this.setupRecorderProfilesAlias();
        this.setupPictureSizesAlias();
        this.setupFlashModesAlias();
    };
    SettingsController.prototype.setupRecorderProfilesAlias = function () {
        var settings = this.settings;
        this.settings.alias({
            key: 'recorderProfiles',
            settings: {
                back: this.settings.recorderProfilesBack,
                front: this.settings.recorderProfilesFront
            },
            get: function () {
                var camera = settings.cameras.selected('key');
                return this.settings[camera];
            }
        });
    };
    SettingsController.prototype.setupPictureSizesAlias = function () {
        var settings = this.settings;
        this.settings.alias({
            key: 'pictureSizes',
            settings: {
                back: this.settings.pictureSizesBack,
                front: this.settings.pictureSizesFront
            },
            get: function () {
                var camera = settings.cameras.selected('key');
                return this.settings[camera];
            }
        });
    };
    SettingsController.prototype.setupFlashModesAlias = function () {
        var settings = this.settings;
        this.settings.alias({
            key: 'flashModes',
            settings: {
                picture: this.settings.flashModesPicture,
                video: this.settings.flashModesVideo
            },
            get: function () {
                var mode = settings.mode.selected('key');
                return this.settings[mode];
            }
        });
    };
    SettingsController.prototype.bindEvents = function () {
        this.app.on('localized', this.formatPictureSizeTitles);
        this.app.on('settings:toggle', this.toggleSettings);
        this.app.on('camera:newcamera', this.onNewCamera);
        this.app.on('activity:pick', this.onPickActivity);
    };
    SettingsController.prototype.toggleSettings = function () {
        if (this.view) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    };
    SettingsController.prototype.openSettings = function () {
        debug('open settings');
        var self = this;
        this.app.emit('busy', 'lazyLoading');
        this.require(['views/settings'], function (SettingsView) {
            self.app.emit('ready');
            if (!self.SettingsView) {
                self.SettingsView = SettingsView;
            }
            if (self.view) {
                return;
            }
            var items = self.menuItems();
            self.view = new self.SettingsView({ items: items }).render().appendTo(self.app.el).on('click:close', self.closeSettings).on('click:option', self.onOptionTap);
            self.view.hide();
            self.view.fadeIn();
            self.app.emit('settings:opened');
            debug('settings opened');
        });
    };
    SettingsController.prototype.closeSettings = function (done) {
        debug('close settings');
        if (!this.view) {
            return;
        }
        var self = this;
        this.view.fadeOut(function () {
            self.view.destroy();
            self.view = null;
            self.app.emit('settings:closed');
            debug('settings closed');
            if (typeof done === 'function') {
                done();
            }
        });
    };
    SettingsController.prototype.onOptionTap = function (key, setting) {
        var flashMode = this.settings.flashModesPicture.selected('key');
        var ishdrOn = setting.key === 'hdr' && key === 'on';
        var flashDeactivated = flashMode !== 'off' && ishdrOn;
        var self = this;
        self.closeSettings(function () {
            setting.select(key);
            self.notify(setting, flashDeactivated);
        });
    };
    SettingsController.prototype.onPickActivity = function (data) {
        debug('pick activity', data);
        var setting;
        var options;
        var updated = false;
        var maxFileSize = data.maxFileSizeBytes;
        var maxPixelSize = data.maxPixelSize;
        this.settings.dontSave();
        if (maxPixelSize) {
            setting = this.settings.pictureSizes;
            var lastMaxPixelSize = setting.get('maxPixelSize');
            this.settings.pictureSizesFront.set('maxPixelSize', maxPixelSize);
            this.settings.pictureSizesBack.set('maxPixelSize', maxPixelSize);
            debug('set maxPixelSize: %s', maxPixelSize);
            if (lastMaxPixelSize !== maxPixelSize) {
                options = setting.get('options');
                var restricted = [];
                if (options && options.length > 0) {
                    options.forEach(function (option) {
                        if (option.pixelSize <= maxPixelSize) {
                            restricted.push(option);
                        }
                    });
                    setting.resetOptions(restricted);
                    updated = true;
                }
            }
        }
        if (maxFileSize) {
            setting = this.settings.recorderProfiles;
            var lastMaxFileSize = setting.get('maxFileSizeBytes');
            this.settings.recorderProfilesFront.set('maxFileSizeBytes', maxFileSize);
            this.settings.recorderProfilesBack.set('maxFileSizeBytes', maxFileSize);
            debug('set maxFileSize: %s', maxFileSize);
            if (lastMaxFileSize !== maxFileSize) {
                options = setting.get('options');
                if (options && options.length > 1) {
                    setting.resetOptions([options[options.length - 1]]);
                    updated = true;
                }
            }
        }
        if (updated) {
            this.app.emit('settings:configured');
        }
    };
    SettingsController.prototype.notify = function (setting, flashDeactivated) {
        var dontNotify = setting.get('notifications') === false;
        if (dontNotify) {
            return;
        }
        var localizable = setting.get('optionsLocalizable') !== false;
        var title = '<span data-l10n-id="' + setting.get('title') + '"></span>';
        var html;
        var optionTitle = localizable ? '<span data-l10n-id="' + setting.selected('title') + '"></span>' : '<span>' + setting.selected('title') + '</span>';
        if (flashDeactivated) {
            html = title + ' ' + optionTitle + '<br/>' + '<span data-l10n-id="flash-deactivated"></span>';
        } else {
            html = title + '<br/>' + optionTitle;
        }
        this.notification.display({ text: { html: html } });
    };
    SettingsController.prototype.onNewCamera = function (camera) {
        debug('new capabilities');
        var capabilities = camera.capabilities;
        this.settings.hdr.filterOptions(capabilities.hdr);
        this.settings.flashModesPicture.filterOptions(capabilities.flashModes);
        this.settings.flashModesVideo.filterOptions(capabilities.flashModes);
        this.configurePictureSizes(camera);
        this.configureRecorderProfiles(camera);
        this.app.emit('settings:configured');
        debug('settings configured to new capabilities');
    };
    SettingsController.prototype.configurePictureSizes = function (camera) {
        debug('configuring picture sizes');
        var maxPixelSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
        var sizes = camera.capabilities.pictureSizes;
        var setting = this.settings.pictureSizes;
        var currentSize = camera.pictureSize;
        var currentSizeKey = currentSize.width + 'x' + currentSize.height;
        var options = {
            exclude: setting.get('exclude'),
            include: setting.get('include'),
            maxPixelSize: maxPixelSize
        };
        var formatted = this.formatPictureSizes(sizes, options);
        setting.resetOptions(formatted);
        if (!setting.current().fetched) {
            setting.select(currentSizeKey, { silent: true });
        }
        this.formatPictureSizeTitles();
        debug('configured pictureSizes', setting.selected('key'));
    };
    SettingsController.prototype.configureRecorderProfiles = function (camera) {
        var sizes = camera.capabilities.recorderProfiles;
        var currentProfile = camera.recorderProfile;
        var setting = this.settings.recorderProfiles;
        var maxFileSize = setting.get('maxFileSizeBytes');
        var exclude = setting.get('exclude');
        var options = { exclude: exclude };
        var items = this.formatRecorderProfiles(sizes, options);
        if (maxFileSize) {
            items = [items[items.length - 1]];
        }
        setting.resetOptions(items);
        if (!maxFileSize && !setting.current().fetched) {
            setting.select(currentProfile, { silent: true });
        }
    };
    SettingsController.prototype.formatPictureSizeTitles = function () {
        return document.l10n.formatValue('mp').then(value => {
            var options = this.settings.pictureSizes.get('options');
            options.forEach(function (size) {
                var data = size.data;
                var mp = data.mp ? data.mp + value + ' ' : '';
                size.title = mp + size.key;
            });
            debug('picture size titles formatted');
        });
    };
    SettingsController.prototype.menuItems = function () {
        var items = this.settings.settingsMenu.get('items');
        return items.filter(this.validMenuItem, this).map(function (item) {
            return this.settings[item.key];
        }, this);
    };
    SettingsController.prototype.validMenuItem = function (item) {
        var setting = this.settings[item.key];
        return !!setting && setting.supported();
    };
});
define('lib/bytes-to-pixels', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = function (bytes) {
        var bytesPerPixel = 3;
        var avgJpegCompression = window.CONFIG_AVG_JPEG_COMPRESSION_RATIO || 8;
        var uncompressedBytes = bytes * avgJpegCompression;
        return Math.round(uncompressedBytes / bytesPerPixel);
    };
});
define('controllers/activity', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bytes-to-pixels',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:activity');
    var bytesToPixels = require('lib/bytes-to-pixels');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new ActivityController(app);
    };
    module.exports.ActivityController = ActivityController;
    function ActivityController(app) {
        bindAll(this);
        this.app = app;
        this.win = app.win;
        this.settings = app.settings;
        this.configure();
        this.bindEvents();
        debug('initialized');
    }
    ActivityController.prototype.types = {
        pick: 'pick',
        record: 'record'
    };
    ActivityController.prototype.configure = function () {
        this.name = this.getName();
        this.app.activity[this.name] = true;
    };
    ActivityController.prototype.bindEvents = function () {
        this.app.on('activitycanceled', this.onActivityCanceled);
        this.app.on('confirm:selected', this.onActivityConfirmed);
        if (this.name) {
            this.setupListener();
        } else {
            this.app.once('criticalpathdone', this.setupListener);
        }
    };
    ActivityController.prototype.setupListener = function () {
        debug('setup listener');
        navigator.mozSetMessageHandler('activity', this.onMessage);
        debug('listener setup');
    };
    ActivityController.prototype.getName = function () {
        var hash = this.win.location.hash;
        var name = hash && hash.substr(1);
        return this.types[name];
    };
    ActivityController.prototype.onMessage = function (activity) {
        debug('incoming activity', activity);
        var name = activity.source.name;
        var supported = this.types[name];
        if (!supported) {
            return;
        }
        var data = {
            name: name,
            maxPixelSize: this.getMaxPixelSize(activity),
            maxFileSizeBytes: activity.source.data.maxFileSizeBytes
        };
        this.activity = activity;
        this.configureMode(activity);
        this.app.emit('activity', data);
        this.app.emit('activity:' + name, data);
    };
    ActivityController.prototype.configureMode = function (activity) {
        var type = activity.source.data.type;
        var name = activity.source.name;
        var modes = name === 'pick' ? this.getModesForPick(type) : this.getModesForRecord(type);
        this.settings.mode.filterOptions(modes);
        this.settings.mode.select(modes[0]);
        debug('configured mode', modes);
    };
    ActivityController.prototype.getMaxPixelSize = function (activity) {
        var data = activity.source.data;
        var bytes = data.maxFileSizeBytes;
        var maxPickPixelSize = this.settings.activity.get('maxPickPixelSize') || 0;
        var maxPixelSize;
        if (bytes) {
            maxPixelSize = bytesToPixels(bytes);
        } else if (data.width || data.height) {
            maxPixelSize = this.getMaxPixelsFromSize(data);
        } else {
            maxPixelSize = maxPickPixelSize;
        }
        if (maxPickPixelSize > 0) {
            maxPixelSize = Math.min(maxPixelSize, maxPickPixelSize);
        }
        debug('maxPixelsSize: %s', maxPixelSize);
        return maxPixelSize;
    };
    ActivityController.prototype.getMaxPixelsFromSize = function (size) {
        var scale = this.settings.activity.get('maxPixelSizeScaleFactor');
        var aspect = 4 / 3;
        var width = size.width || size.height * aspect;
        var height = size.height || size.width * aspect;
        var pixels = width * height;
        return pixels * scale;
    };
    ActivityController.prototype.getModesForPick = function (types) {
        types = [].concat(types || []);
        var modes = [];
        types.forEach(function (item) {
            var type = item.split('/')[0];
            var mode = type === 'image' ? 'picture' : type;
            if (modes.indexOf(mode) === -1) {
                modes.push(mode);
            }
        });
        if (modes.length === 0) {
            modes = [
                'picture',
                'video'
            ];
        }
        return modes;
    };
    ActivityController.prototype.getModesForRecord = function (type) {
        return type === 'videos' ? [
            'video',
            'picture'
        ] : [
            'picture',
            'video'
        ];
    };
    ActivityController.prototype.onActivityCanceled = function () {
        if (!this.activity) {
            return;
        }
        this.activity.postError('pick cancelled');
    };
    ActivityController.prototype.onActivityConfirmed = function (newMedia) {
        var self = this;
        var activity = this.activity;
        var media = { blob: newMedia.blob };
        this.app.showSpinner();
        if (newMedia.isVideo) {
            media.type = 'video/3gpp';
            media.poster = newMedia.poster.blob;
            activity.postResult(media);
            this.app.clearSpinner();
        } else {
            media.type = 'image/jpeg';
            require(['lib/resize-image-and-save'], function (resizeImageAndSave) {
                resizeImageAndSave({
                    blob: newMedia.blob,
                    width: activity.source.data.width,
                    height: activity.source.data.height
                }, function onImageResized(resizedBlob) {
                    media.blob = resizedBlob;
                    activity.postResult(media);
                    self.app.clearSpinner();
                });
            });
        }
    };
});
define('controllers/camera', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:camera');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new CameraController(app);
    };
    module.exports.CameraController = CameraController;
    function CameraController(app) {
        bindAll(this);
        this.app = app;
        this.camera = app.camera;
        this.settings = app.settings;
        this.activity = app.activity;
        this.hdrDisabled = this.settings.hdr.get('disabled');
        this.notification = app.views.notification;
        this.lowBattery = this.app.get('batteryStatus') === 'shutdown';
        this.configure();
        this.bindEvents();
        debug('initialized');
    }
    CameraController.prototype.bindEvents = function () {
        var settings = this.settings;
        var camera = this.camera;
        var app = this.app;
        camera.on('change:previewActive', this.app.firer('camera:previewactive'));
        camera.on('change:videoElapsed', app.firer('camera:recorderTimeUpdate'));
        camera.on('autofocuschanged', app.firer('camera:autofocuschanged'));
        camera.on('focusconfigured', app.firer('camera:focusconfigured'));
        camera.on('change:focus', app.firer('camera:focusstatechanged'));
        camera.on('filesizelimitreached', this.onFileSizeLimitReached);
        camera.on('facesdetected', app.firer('camera:facesdetected'));
        camera.on('willrecord', app.firer('camera:willrecord'));
        camera.on('configured', app.firer('camera:configured'));
        camera.on('requesting', app.firer('camera:requesting'));
        camera.on('change:recording', this.onRecordingChange);
        camera.on('newcamera', app.firer('camera:newcamera'));
        camera.on('newimage', app.firer('camera:newimage'));
        camera.on('newvideo', app.firer('camera:newvideo'));
        camera.on('shutter', app.firer('camera:shutter'));
        camera.on('loaded', app.firer('camera:loaded'));
        camera.on('closed', this.onCameraClosed);
        camera.on('error', app.firer('camera:error'));
        camera.on('ready', app.firer('ready'));
        camera.on('busy', app.firer('busy'));
        app.on('viewfinder:focuspointchanged', this.onFocusPointChanged);
        app.on('change:batteryStatus', this.onBatteryStatusChange);
        app.on('settings:configured', this.onSettingsConfigured);
        app.on('previewgallery:opened', this.onGalleryOpened);
        app.on('previewgallery:closed', this.onGalleryClosed);
        app.on('stoprecording', this.camera.stopRecording);
        app.on('storage:volumechanged', this.onStorageVolumeChanged);
        app.on('storage:changed', this.onStorageChanged);
        app.on('activity:pick', this.onPickActivity);
        app.on('keydown:capture', this.onCaptureKey);
        app.on('keydown:focus', this.onFocusKey);
        app.on('hidden', this.shutdownCamera);
        app.on('click', this.clearCountdown);
        app.on('visible', this.loadCamera);
        app.on('capture', this.capture);
        settings.recorderProfiles.on('change:selected', this.updateRecorderProfile);
        settings.pictureSizes.on('change:selected', this.updatePictureSize);
        settings.flashModes.on('change:selected', this.onFlashModeChange);
        settings.flashModes.on('change:selected', this.setFlashMode);
        settings.cameras.on('change:selected', this.setCamera);
        settings.mode.on('change:selected', this.setMode);
        settings.hdr.on('change:selected', this.setHDR);
        settings.hdr.on('change:selected', this.onHDRChange);
        debug('events bound');
    };
    CameraController.prototype.onRecordingChange = function (recording) {
        var active;
        if (recording === 'started') {
            active = true;
        } else if (recording === 'stopped') {
            active = false;
        } else {
            return;
        }
        this.app.set('recording', active);
    };
    CameraController.prototype.onCaptureKey = function (e) {
        debug('on capture key', e);
        if (this.capture() !== false) {
            e.preventDefault();
        }
    };
    CameraController.prototype.onFocusKey = function (e) {
        debug('on focus key', e);
        if (!this.shouldCapture()) {
            return;
        }
        this.camera.focus.focus();
    };
    CameraController.prototype.configure = function () {
        this.settings.cameras.filterOptions(this.camera.cameraList);
        debug('configured');
    };
    CameraController.prototype.onSettingsConfigured = function () {
        var recorderProfile = this.settings.recorderProfiles.selected('key');
        var pictureSize = this.settings.pictureSizes.selected('data');
        this.setWhiteBalance();
        this.setFlashMode();
        this.setISO();
        this.setHDR();
        this.camera.setRecorderProfile(recorderProfile);
        this.camera.setPictureSize(pictureSize);
        this.camera.configureZoom();
        setTimeout(this.updateZoomForMako);
        debug('camera configured with final settings');
    };
    CameraController.prototype.onPickActivity = function (data) {
        this.camera.set('maxFileSizeBytes', data.maxFileSizeBytes);
        this.camera.cacheConfig = false;
    };
    CameraController.prototype.capture = function (options = {}) {
        var force = options.force;
        if (!this.shouldCapture()) {
            return false;
        }
        if (!force && this.shouldCountdown()) {
            return this.startCountdown();
        }
        if (this.countdown) {
            return this.clearCountdown();
        }
        var position = this.app.geolocation.position;
        return this.camera.capture({ position: position });
    };
    CameraController.prototype.shouldCapture = function () {
        return !this.app.get('confirmViewVisible') && !this.app.hidden && !this.app.busy && !this.galleryOpen && !this.lowBattery;
    };
    CameraController.prototype.shouldCountdown = function () {
        var countdownSet = this.settings.countdown.selected('value');
        var recording = this.app.get('recording');
        return countdownSet && !this.countdown && !recording;
    };
    CameraController.prototype.startCountdown = function () {
        if (this.countdown) {
            return;
        }
        var seconds = this.settings.countdown.selected('value');
        var self = this;
        if (!seconds) {
            return;
        }
        this.app.emit('countdown:started', seconds);
        (function scheduleTick() {
            self.countdown = setTimeout(() => {
                if (--seconds <= 0) {
                    self.clearCountdown();
                    self.capture({ force: true });
                    return;
                }
                self.app.emit('countdown:tick', seconds);
                scheduleTick();
            }, 1000);
        }());
    };
    CameraController.prototype.clearCountdown = function () {
        if (!this.countdown) {
            return;
        }
        clearTimeout(this.countdown);
        this.countdown = null;
        this.app.emit('countdown:ended');
    };
    CameraController.prototype.onFileSizeLimitReached = function () {
        this.camera.stopRecording();
        this.showSizeLimitAlert();
    };
    CameraController.prototype.showSizeLimitAlert = function () {
        if (this.sizeLimitAlertActive) {
            return;
        }
        this.sizeLimitAlertActive = true;
        var alertL10nId = this.activity.pick ? 'activity-size-limit-reached' : 'storage-size-limit-reached';
        document.l10n.formatValue(alertL10nId).then(alert);
        this.sizeLimitAlertActive = false;
    };
    CameraController.prototype.setMode = function (mode) {
        debug('set mode: %s', mode);
        var self = this;
        if (this.camera.isMode(mode)) {
            debug('mode didn\'t change');
            return;
        }
        var l10nId = mode == 'video' ? 'Video-Mode' : 'Photo-Mode';
        this.notification.display({ text: l10nId });
        this.setFlashMode();
        this.app.emit('camera:willchange');
        this.app.once('viewfinder:hidden', function () {
            self.camera.setMode(mode);
        });
    };
    CameraController.prototype.updatePictureSize = function () {
        debug('update picture-size');
        var pictureMode = this.settings.mode.selected('key') === 'picture';
        var value = this.settings.pictureSizes.selected('data');
        var self = this;
        if (this.camera.isPictureSize(value)) {
            return;
        }
        if (!pictureMode) {
            this.camera.setPictureSize(value, { configure: false });
            return;
        }
        this.app.emit('camera:willchange');
        this.app.once('viewfinder:hidden', function () {
            self.camera.setPictureSize(value);
        });
    };
    CameraController.prototype.updateRecorderProfile = function () {
        debug('update recorder-profile');
        var videoMode = this.settings.mode.selected('key') === 'video';
        var key = this.settings.recorderProfiles.selected('key');
        var self = this;
        if (this.camera.isRecorderProfile(key)) {
            return;
        }
        if (!videoMode) {
            this.camera.setRecorderProfile(key, { configure: false });
            return;
        }
        this.app.emit('camera:willchange');
        this.app.once('viewfinder:hidden', function () {
            self.camera.setRecorderProfile(key);
        });
    };
    CameraController.prototype.setCamera = function (camera) {
        debug('set camera: %s', camera);
        var self = this;
        this.app.emit('camera:willchange');
        this.app.once('viewfinder:hidden', function () {
            self.camera.setCamera(camera);
        });
    };
    CameraController.prototype.setFlashMode = function () {
        var flashSetting = this.settings.flashModes;
        this.camera.setFlashMode(flashSetting.selected('key'));
    };
    CameraController.prototype.setISO = function () {
        if (!this.settings.isoModes.get('disabled')) {
            this.camera.setISOMode(this.settings.isoModes.selected('key'));
        }
    };
    CameraController.prototype.setWhiteBalance = function () {
        if (!this.settings.whiteBalance.get('disabled')) {
            this.camera.setWhiteBalance(this.settings.whiteBalance.selected('key'));
        }
    };
    CameraController.prototype.setHDR = function () {
        if (this.hdrDisabled) {
            return;
        }
        this.camera.setHDR(this.settings.hdr.selected('key'));
    };
    CameraController.prototype.onFlashModeChange = function (flashModes) {
        if (this.hdrDisabled) {
            return;
        }
        var ishdrOn = this.settings.hdr.selected('key') === 'on';
        if (ishdrOn && flashModes !== 'off') {
            this.settings.hdr.select('off');
        }
    };
    CameraController.prototype.onHDRChange = function (hdr) {
        var flashMode = this.settings.flashModesPicture.selected('key');
        var ishdrOn = hdr === 'on';
        if (ishdrOn && flashMode !== 'off') {
            this.settings.flashModesPicture.select('off');
        }
    };
    CameraController.prototype.onBatteryStatusChange = function (status) {
        this.lowBattery = status === 'shutdown';
        if (this.lowBattery) {
            this.shutdownCamera();
        } else {
            this.loadCamera();
        }
    };
    CameraController.prototype.onStorageChanged = function (state) {
        if (state !== 'available') {
            this.camera.stopRecording();
        }
    };
    CameraController.prototype.onStorageVolumeChanged = function (storage) {
        this.camera.setStorage(storage);
    };
    CameraController.prototype.onFocusPointChanged = function (focusPoint) {
        if (this.countdown) {
            return;
        }
        this.camera.updateFocusArea(focusPoint.area);
    };
    CameraController.prototype.loadCamera = function (showSpinner) {
        if (this.lowBattery || this.galleryOpen || this.app.hidden) {
            return;
        }
        if (showSpinner) {
            this.app.showSpinner();
        }
        this.camera.load();
    };
    CameraController.prototype.shutdownCamera = function () {
        this.clearCountdown();
        this.camera.shutdown();
    };
    CameraController.prototype.onCameraClosed = function (reason) {
        reason = reason || 'SystemFailure';
        if (reason === 'SystemFailure') {
            this.app.emit('reboot');
        }
    };
    CameraController.prototype.onGalleryOpened = function () {
        this.galleryOpen = true;
        this.shutdownCamera();
    };
    CameraController.prototype.onGalleryClosed = function (reason) {
        this.galleryOpen = false;
        if (this.app.hidden) {
            return;
        }
        this.loadCamera(true);
    };
    CameraController.prototype.updateZoomForMako = function () {
        debug('update zoom for mako');
        var self = this;
        navigator.mozSettings.createLock().get('deviceinfo.hardware').onsuccess = onSuccess;
        debug('settings request made');
        function onSuccess(e) {
            var device = e.target.result['deviceinfo.hardware'];
            if (device !== 'mako') {
                return;
            }
            var frontCamera = self.camera.selectedCamera === 'front';
            var maxHardwareZoom = frontCamera ? 1 : 1.25;
            self.settings.zoom.set('useZoomPreviewAdjustment', true);
            self.camera.set('maxHardwareZoom', maxHardwareZoom);
            self.camera.emit('zoomconfigured', self.camera.getZoom());
            debug('zoom reconfigured for mako');
        }
    };
});
define('lib/storage', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all',
    'evt'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('storage');
    var bindAll = require('lib/bind-all');
    var events = require('evt');
    var storageSingleton;
    module.exports = Storage;
    events(Storage.prototype);
    function Storage(options) {
        if (storageSingleton) {
            return storageSingleton;
        }
        storageSingleton = this;
        bindAll(this);
        this.maxFileSize = 0;
        options = options || {};
        this.dcf = options.dcf;
        if (this.dcf) {
            this.dcf.init();
        }
        this.require = options.require || require;
        navigator.mozSettings.addObserver('device.storage.writable.name', this.onStorageVolumeChanged);
        this.configure();
        debug('initialized');
    }
    Storage.prototype.createFilename = function (storage, type, done) {
        var self = this;
        this.require([
            'asyncStorage',
            'lib/dcf'
        ], function (as, dcf) {
            if (!self.dcf) {
                self.dcf = dcf;
                self.dcf.init();
            }
            self.dcf.createDCFFilename(storage, type, done);
        });
    };
    Storage.prototype.addPicture = function (blob, options, done) {
        if (typeof options === 'function') {
            done = options;
            options = {};
        }
        done = done || function () {
        };
        var filepath = options && options.filepath;
        var self = this;
        debug('add picture', filepath);
        if (!filepath) {
            debug('creating filename');
            this.createFilename(this.picture, 'image', onCreated);
        } else {
            onCreated(filepath);
        }
        function onCreated(filepath) {
            var req = self.picture.addNamed(blob, filepath);
            req.onerror = function () {
                self.emit('error');
            };
            req.onsuccess = function (e) {
                debug('image stored', filepath);
                var absolutePath = e.target.result;
                refetchFile(filepath, absolutePath);
            };
        }
        function refetchFile(filepath, absolutePath) {
            var req = self.picture.get(filepath);
            req.onerror = function () {
                self.emit('error');
                done('Error adding picture to storage');
            };
            req.onsuccess = function (e) {
                debug('image file blob handle retrieved');
                var fileBlob = e.target.result;
                done(null, filepath, absolutePath, fileBlob);
            };
        }
    };
    Storage.prototype.createVideoFilepath = function (done) {
        var videoStorage = this.video;
        var self = this;
        this.createFilename(this.video, 'video', function (filepath) {
            var dummyFilepath = getDir(filepath) + '.tmp.3gp';
            var blob = new Blob([''], { type: 'video/3gpp' });
            var req = videoStorage.addNamed(blob, dummyFilepath);
            req.onerror = function (e) {
                debug('Failed to add ' + filepath + ' to DeviceStorage', e);
                var req = videoStorage.delete(dummyFilepath);
                req.onerror = function () {
                    done('Error creating video file path');
                };
                req.onsuccess = function () {
                    self.createVideoFilepath(done);
                };
            };
            req.onsuccess = function (e) {
                videoStorage.delete(e.target.result);
                done(null, filepath);
            };
        });
    };
    Storage.prototype.onStorageChange = function (e) {
        debug('state change: %s', e.reason);
        var value = e.reason;
        switch (value) {
        case 'deleted':
            var filepath = this.checkFilepath(e.path);
            this.emit('itemdeleted', { path: filepath });
            break;
        case 'available':
        case 'shared':
        case 'unavailable':
            this.setState(value);
            break;
        }
        this.check();
    };
    Storage.prototype.configure = function (storageVolumeName) {
        var i;
        var videosStorages;
        var picturesStorages;
        if (this.picture) {
            this.picture.removeEventListener('change', this.onStorageChange);
        }
        if (!storageVolumeName) {
            this.video = navigator.getDeviceStorage('videos');
            this.picture = navigator.getDeviceStorage('pictures');
        } else {
            videosStorages = navigator.getDeviceStorages('videos');
            this.video = videosStorages[0];
            for (i = 0; i < videosStorages.length; ++i) {
                if (videosStorages[i].storageName === storageVolumeName) {
                    this.video = videosStorages[i];
                    break;
                }
            }
            picturesStorages = navigator.getDeviceStorages('pictures');
            this.picture = picturesStorages[0];
            for (i = 0; i < picturesStorages.length; ++i) {
                if (picturesStorages[i].storageName === storageVolumeName) {
                    this.picture = picturesStorages[i];
                    break;
                }
            }
        }
        if (!this.picture) {
            this.setState('unavailable');
            return;
        }
        this.picture.addEventListener('change', this.onStorageChange);
        this.emit('volumechanged', {
            video: this.video,
            picture: this.picture
        });
    };
    Storage.prototype.onStorageVolumeChanged = function (setting) {
        debug('default storage volume change: %s', setting.settingValue);
        this.configure(setting.settingValue);
    };
    Storage.prototype.checkFilepath = function (filepath) {
        var startString = filepath.indexOf('DCIM/');
        if (startString < -1) {
            return;
        } else if (startString > 0) {
            filepath = filepath.substr(startString);
        }
        if (filepath.indexOf('VID') != -1 && filepath.lastIndexOf('.jpg') === filepath.length - 4) {
            filepath = filepath.replace('.jpg', '.3gp');
        }
        return filepath;
    };
    Storage.prototype.setState = function (value) {
        this.state = value;
        debug('set state: %s', value);
        this.emit('changed', value);
    };
    Storage.prototype.setMaxFileSize = function (maxFileSize) {
        this.maxFileSize = maxFileSize;
        this.check();
        debug('max file size set: %d', maxFileSize);
    };
    Storage.prototype.check = function (done) {
        debug('check');
        var self = this;
        done = done || function () {
        };
        this.getState(function (result) {
            self.setState(result);
            if (!self.available()) {
                onComplete('unhealthy');
                return;
            }
            if (self.dcf) {
                self.dcf.checkFileCounter();
            }
            self.isSpace(function (result) {
                if (!result) {
                    self.setState('nospace');
                }
                onComplete('healthy');
            });
        });
        function onComplete(state) {
            self.emit('checked', state);
        }
    };
    Storage.prototype.isSpace = function (done) {
        var maxFileSize = this.maxFileSize;
        this.picture.freeSpace().onsuccess = function (e) {
            var freeSpace = e.target.result;
            var result = freeSpace > maxFileSize;
            debug('is space: %s', result, freeSpace, maxFileSize);
            done(result);
        };
    };
    Storage.prototype.getState = function (done) {
        if (!this.picture) {
            setTimeout(function () {
                done('unavailable');
            });
            return;
        }
        this.picture.available().onsuccess = function (e) {
            done(e.target.result);
        };
    };
    Storage.prototype.available = function () {
        return this.state === 'available';
    };
    Storage.prototype.deletePicture = function (filepath, done) {
        var req = this.picture.delete(filepath);
        req.onerror = function (e) {
            var message = 'Failed to delete ' + filepath + ' from DeviceStorage:' + e.target.error;
            console.warn(message);
            done(message);
        };
        if (done) {
            req.onsuccess = function () {
                done(null);
            };
        }
    };
    Storage.prototype.deleteVideo = function (filepath) {
        var poster = filepath.replace('.3gp', '.jpg');
        this.video.delete(filepath).onerror = function (e) {
            console.warn('Failed to delete', filepath, 'from DeviceStorage:', e.target.error);
        };
        this.picture.delete(poster).onerror = function (e) {
            console.warn('Failed to delete poster image', poster, 'for video', filepath, 'from DeviceStorage:', e.target.error);
        };
    };
    function getDir(filepath) {
        var index = filepath.lastIndexOf('/') + 1;
        return index ? filepath.substring(0, index) : '';
    }
});
define('controllers/storage', [
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all',
    'lib/storage'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:storage');
    var bindAll = require('lib/bind-all');
    var Storage = require('lib/storage');
    module.exports = function (app) {
        return new StorageController(app);
    };
    module.exports.StorageController = StorageController;
    function StorageController(app) {
        bindAll(this);
        this.app = app;
        this.camera = app.camera;
        this.settings = app.settings;
        this.storage = app.storage || new Storage();
        this.bindEvents();
        this.configure();
        debug('initialized');
    }
    StorageController.prototype.configure = function () {
        this.storage.configure();
        this.camera.createVideoFilepath = this.storage.createVideoFilepath;
        this.updateMaxFileSize();
    };
    StorageController.prototype.bindEvents = function () {
        debug('bind events');
        this.settings.pictureSizes.on('change:selected', this.updateMaxFileSize);
        this.app.on('previewgallery:deletepicture', this.storage.deletePicture);
        this.app.on('previewgallery:deletevideo', this.storage.deleteVideo);
        this.app.on('settings:configured', this.updateMaxFileSize);
        this.app.on('camera:newimage', this.storePicture);
        this.app.on('camera:newvideo', this.storeVideo);
        this.app.on('visible', this.storage.check);
        this.storage.on('volumechanged', this.app.firer('storage:volumechanged'));
        this.storage.on('itemdeleted', this.app.firer('storage:itemdeleted'));
        this.storage.on('changed', this.onChanged);
        this.storage.on('checked', this.onChecked);
        debug('events bound');
    };
    StorageController.prototype.onChanged = function (state) {
        debug('changed: %s', state);
        this.app.emit('storage:changed', state);
    };
    StorageController.prototype.onChecked = function (value) {
        debug('checked: %s', value);
        this.app.emit('storage:checked', value);
        this.app.emit('storage:checked:' + value);
    };
    StorageController.prototype.storePicture = function (picture) {
        var memoryBlob = picture.blob;
        var self = this;
        this.storage.addPicture(memoryBlob, function (error, filepath, abspath, fileBlob) {
            picture.blob = fileBlob;
            picture.filepath = filepath;
            debug('stored picture', picture);
            self.app.emit('newmedia', picture);
        });
    };
    StorageController.prototype.storeVideo = function (video) {
        debug('new video', video);
        var poster = video.poster;
        var self = this;
        poster.filepath = video.filepath.replace('.3gp', '.jpg');
        video.isVideo = true;
        this.storage.addPicture(poster.blob, { filepath: poster.filepath }, function (error, path, absolutePath, fileBlob) {
            poster.blob = fileBlob;
            debug('new video', video);
            self.app.emit('newmedia', video);
        });
    };
    StorageController.prototype.updateMaxFileSize = function () {
        var pictureSize = this.settings.pictureSizes.selected('data');
        if (pictureSize) {
            var bytes = pictureSize.width * pictureSize.height / 2 + 25000;
            this.storage.setMaxFileSize(bytes);
            debug('maxFileSize updated %s', bytes);
        }
    };
});
window.jsStarted = Date.now();
define('main', [
    'require',
    'lib/settings',
    'lib/geo-location',
    'config/config',
    'lib/camera/camera',
    'app',
    'controllers/overlay',
    'controllers/battery',
    'controllers/hud',
    'controllers/controls',
    'controllers/viewfinder',
    'controllers/settings',
    'controllers/activity',
    'controllers/camera',
    'controllers/storage'
], function (require) {
    var perf = {
        jsStarted: window.jsStarted,
        firstModule: Date.now()
    };
    var Settings = require('lib/settings');
    var GeoLocation = require('lib/geo-location');
    var settingsData = require('config/config');
    var settings = new Settings(settingsData);
    var Camera = require('lib/camera/camera');
    var App = require('app');
    var key;
    if (settingsData.globals) {
        for (key in settingsData.globals) {
            window[key] = settingsData.globals[key];
        }
    }
    var app = window.app = new App({
        settings: settings,
        geolocation: new GeoLocation(),
        el: document.body,
        doc: document,
        win: window,
        perf: perf,
        camera: new Camera({ focus: settingsData.focus }),
        controllers: {
            overlay: require('controllers/overlay'),
            battery: require('controllers/battery'),
            hud: require('controllers/hud'),
            controls: require('controllers/controls'),
            viewfinder: require('controllers/viewfinder'),
            settings: require('controllers/settings'),
            activity: require('controllers/activity'),
            camera: require('controllers/camera'),
            storage: require('controllers/storage'),
            lazy: [
                'controllers/zoom-bar',
                'controllers/indicators',
                'controllers/media',
                'controllers/sounds'
            ]
        }
    });
    app.camera.load();
    app.settings.fetch();
    app.boot();
    for (key in settingsData) {
        delete settingsData[key];
    }
});
requirejs.config({
    baseUrl: '/js',
    paths: {
        'asyncStorage': '../shared/js/async_storage',
        'getVideoRotation': '../shared/js/media/get_video_rotation',
        'jpegMetaDataParser': '../shared/js/media/jpeg_metadata_parser',
        'downsample': '../shared/js/media/downsample',
        'getImageSize': '../shared/js/media/image_size',
        'cropResizeRotate': '../shared/js/media/crop_resize_rotate',
        'format': '../shared/js/format',
        'GestureDetector': '../shared/js/gesture_detector',
        'VideoPlayer': '../shared/js/media/video_player',
        'MediaFrame': '../shared/js/media/media_frame',
        'BlobView': '../shared/js/blobview',
        'CustomDialog': '../shared/js/custom_dialog',
        'debug': '../bower_components/debug/index',
        'attach': '../bower_components/attach/index',
        'model': '../bower_components/model/index',
        'view': '../bower_components/view/index',
        'evt': '../bower_components/evt/index',
        'drag': '../bower_components/drag/index',
        'device-orientation': '../bower_components/device-orientation/device-orientation',
        'stop-recording-event': '../shared/js/stop_recording_event'
    },
    packages: [
        {
            name: 'gaia-header',
            location: '../bower_components/gaia-header',
            main: 'gaia-header'
        },
        {
            name: 'gaia-icons',
            location: '../bower_components/gaia-icons',
            main: 'gaia-icons'
        },
        {
            name: 'gaia-component',
            location: '../bower_components/gaia-component',
            main: 'gaia-component'
        },
        {
            name: 'font-fit',
            location: '../bower_components/font-fit',
            main: 'font-fit'
        }
    ],
    shim: {
        'format': { exports: 'Format' },
        'getVideoRotation': {
            deps: ['BlobView'],
            exports: 'getVideoRotation'
        },
        'MediaFrame': {
            deps: [
                'format',
                'VideoPlayer',
                'downsample'
            ],
            exports: 'MediaFrame'
        },
        'BlobView': { exports: 'BlobView' },
        'asyncStorage': { exports: 'asyncStorage' },
        'jpegMetaDataParser': {
            deps: ['BlobView'],
            exports: 'parseJPEGMetadata'
        },
        'getImageSize': {
            deps: [
                'BlobView',
                'jpegMetaDataParser'
            ],
            exports: 'getImageSize'
        },
        'cropResizeRotate': {
            deps: [
                'BlobView',
                'getImageSize',
                'jpegMetaDataParser',
                'downsample'
            ],
            exports: 'cropResizeRotate'
        },
        'GestureDetector': { exports: 'GestureDetector' },
        'CustomDialog': { exports: 'CustomDialog' },
        'stop-recording-event': { exports: 'StopRecordingEvent' }
    }
});
define('config/require', function () {
});
if (!window.VulpesCompat || navigator.mozCameras) require(['main']);