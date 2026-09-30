var _xstart = performance.timing.fetchStart - performance.timing.navigationStart;
window.plog = function (msg) {
    console.log(msg + ' ' + (performance.now() - _xstart));
};
window.startupCacheEventsSent = false;
window.HTML_CACHE_VERSION = '08ac69e7f1630385d66b5067bdfeec7435642672';
window.startupOnModelLoaded = null;
window.appDispatchedMessage = false;
(function () {
    var pendingUiMessageType = null;
    var startingUp = true;
    var startupData = {};
    function localOnModelLoaded(model, callback) {
        model.latestOnce('acctsSlice', function (acctsSlice) {
            console.log('localOnModelLoaded called, hasAccount: ' + localStorage.getItem('data_has_account'));
            setDefaultView();
            hydrateHtml(startupData.view);
            window.startupOnModelLoaded = null;
            callback();
        });
    }
    if (!localStorage.getItem('data_has_account')) {
        console.log('data_has_account unknown, asking for model load first');
        window.startupOnModelLoaded = localOnModelLoaded;
    }
    function hasAccount() {
        var has = localStorage.getItem('data_has_account') === 'yes';
        return has;
    }
    function setDefaultView() {
        if (hasAccount()) {
            if (!startupData.view) {
                startupData.view = 'message_list';
            }
        } else {
            startupData.view = 'setup_account_info';
        }
    }
    if (!window.startupOnModelLoaded) {
        setDefaultView();
    }
    startupData.entry = 'default';
    var lastEntryTime = 0;
    function isUiMessageTypeAllowedEntry(type) {
        if (pendingUiMessageType && pendingUiMessageType !== type) {
            console.log('Ignoring message of type: ' + type);
            return false;
        }
        var entryTime = Date.now();
        if (pendingUiMessageType) {
            pendingUiMessageType = null;
        } else {
            if (entryTime < lastEntryTime + 1000) {
                console.log('email entry gate blocked fast repeated action: ' + type);
                return false;
            }
        }
        lastEntryTime = entryTime;
        return true;
    }
    function retrieve(id) {
        var value = localStorage.getItem('html_cache_' + id) || '';
        var index, version, langDir;
        index = value.indexOf(':');
        if (index === -1) {
            value = '';
        } else {
            version = value.substring(0, index);
            value = value.substring(index + 1);
            var versionParts = version.split(',');
            version = versionParts[0];
            langDir = versionParts[1];
        }
        if (version !== window.HTML_CACHE_VERSION) {
            console.log('Skipping html cache for ' + id + ', out of date. Expected ' + window.HTML_CACHE_VERSION + ' but found ' + version);
            value = '';
        }
        return {
            langDir: langDir,
            contents: value
        };
    }
    var evt;
    var handlers = {};
    var handlerQueues = {
        notification: [],
        activity: []
    };
    window.globalOnAppMessage = function (listener) {
        Object.keys(listener).forEach(function (key) {
            var fn = handlers[key] = listener[key];
            var queue = handlerQueues[key];
            if (queue.length) {
                handlerQueues[key] = [];
                queue.forEach(function (argsArray) {
                    fn.apply(undefined, argsArray);
                });
            }
        });
        if (!evt) {
            require(['evt'], function (ev) {
                evt = ev;
                evt.on('notification', onNotification);
            });
        }
        return startupData;
    };
    window.globalOnAppMessage.hasAccount = hasAccount;
    function dispatch(type, args) {
        window.appDispatchedMessage = true;
        if (handlers[type]) {
            return handlers[type].apply(undefined, args);
        } else {
            handlerQueues[type].push(args);
        }
        finishStartup();
    }
    function onActivityRequest(req) {
        console.log('mozSetMessageHandler: received an activity');
        if (!isUiMessageTypeAllowedEntry('activity')) {
            return req.postError('cancelled');
        }
        if (startingUp) {
            startupData.view = 'compose';
            hydrateHtml(startupData.view);
        }
        dispatch('activity', [req]);
    }
    function onNotification(msg) {
        console.log('mozSetMessageHandler: received a notification');
        if (!msg.clicked) {
            if (startupData.entry === 'notification' && !window.appDispatchedMessage) {
                console.log('App only started for notification close, closing app.');
                window.close();
            }
            return;
        }
        if (!isUiMessageTypeAllowedEntry('notification')) {
            return;
        }
        if (typeof Notification !== 'undefined' && Notification.get) {
            Notification.get().then(function (notifications) {
                if (notifications) {
                    notifications.some(function (notification) {
                        if (notification.tag === msg.tag && notification.close) {
                            notification.close();
                            return true;
                        }
                    });
                }
            });
        }
        var view = msg.data && msg.data.type;
        if (startingUp && view) {
            startupData.view = view;
            hydrateHtml(view);
        }
        setTimeout(function () {
            if (document.hidden && navigator.mozApps) {
                console.log('document was hidden, showing app via mozApps.getSelf');
                navigator.mozApps.getSelf().onsuccess = function (event) {
                    var app = event.target.result;
                    app.launch();
                };
            }
        }, 300);
        dispatch('notification', [msg.data]);
    }
    var selfNode = document.querySelector('[data-loadsrc]');
    function hydrateHtml(id) {
        var parsedResults = retrieve(id);
        if (parsedResults.langDir) {
            document.querySelector('html').setAttribute('dir', parsedResults.langDir);
        }
        var contents = parsedResults.contents;
        var cardsNode = document.getElementById(selfNode.dataset.targetid);
        cardsNode.innerHTML = contents;
        window.startupCacheEventsSent = !!contents;
        if (contents) {
            console.log('Using HTML cache for ' + id);
        }
        if (window.startupCacheEventsSent) {
            window.performance.mark('navigationLoaded');
            window.performance.mark('visuallyLoaded');
        }
    }
    function finishStartup() {
        if (!startingUp) {
            return;
        }
        var scriptNode = document.createElement('script'), loader = selfNode.dataset.loader, loadSrc = selfNode.dataset.loadsrc;
        if (loader) {
            scriptNode.setAttribute('data-main', loadSrc);
            scriptNode.src = loader;
        } else {
            scriptNode.src = loadSrc;
        }
        document.head.appendChild(scriptNode);
        startingUp = false;
    }
    if (navigator.mozHasPendingMessage) {
        if (navigator.mozHasPendingMessage('activity')) {
            pendingUiMessageType = 'activity';
        } else if (navigator.mozHasPendingMessage('notification')) {
            pendingUiMessageType = 'notification';
        }
        if (pendingUiMessageType) {
            startupData.entry = pendingUiMessageType;
        } else if (navigator.mozHasPendingMessage('alarm')) {
            startupData.entry = 'alarm';
        } else if (navigator.mozHasPendingMessage('request-sync')) {
            if (navigator.mozSetMessageHandler) {
                navigator.mozSetMessageHandler('request-sync', function (e) {
                    console.log('Received legacy request-sync message, ignoring.');
                });
            }
            var navSync = navigator.sync;
            if (navSync) {
                navSync.registrations().then(function (regs) {
                    regs.forEach(function (reg) {
                        console.log('Unregistering legacy request sync...');
                        navSync.unregister(reg.task);
                        console.log('Unregister done!');
                    });
                }, function (err) {
                    console.error('navigator.sync.registrations failed: ', err);
                });
            }
        }
    }
    if ('mozSetMessageHandler' in navigator) {
        navigator.mozSetMessageHandler('notification', onNotification);
        navigator.mozSetMessageHandler('activity', onActivityRequest);
    } else {
        console.warn('mozSetMessageHandler not available. No notifications, ' + 'activities or syncs.');
    }
    if (window.startupOnModelLoaded) {
        finishStartup();
    } else if (startupData.entry === 'default' || startupData.entry === 'alarm') {
        hydrateHtml(startupData.view);
        finishStartup();
    }
}());